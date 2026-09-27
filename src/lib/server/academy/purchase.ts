/**
 * Vente en ligne des formations Academy (Stripe Checkout, sans SDK).
 *
 * 1. Le site appelle POST /api/academy/checkout (signé) → createCheckoutSession() :
 *    session Stripe Checkout avec metadata { academy_course_id, email, first_name, last_name }.
 * 2. Stripe notifie POST /api/stripe/webhook (checkout.session.completed) →
 *    recordAcademyPurchase() : contact (créé si besoin), facture émise (numéro légal
 *    attribué par la base), paiement (idempotent sur la référence pi_…, la facture
 *    passe « payée » par trigger), accès à la formation (prolongé s'il existait).
 */
import { ACADEMY_ACCESS_DAYS } from "@/lib/domain/constants";
import type { Course, Persona } from "@/lib/domain/types";
import type { AcademyRepo } from "./repo";

const DAY = 86_400_000;

export interface CheckoutInput {
  course: Course;
  email: string;
  firstName?: string;
  lastName?: string;
  /** Profil choisi par l'acheteur (variante des contenus). */
  persona?: Persona;
  successUrl: string;
  cancelUrl: string;
}

export type CheckoutResult = { ok: true; url: string; id: string } | { ok: false; status: number; error: string; message: string };

/** Crée la session Stripe Checkout (API REST, application/x-www-form-urlencoded). */
export async function createCheckoutSession(input: CheckoutInput, secretKey: string): Promise<CheckoutResult> {
  const { course } = input;
  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", input.successUrl);
  form.set("cancel_url", input.cancelUrl);
  form.set("customer_email", input.email);
  form.set("locale", "fr");
  form.set("client_reference_id", course.id);
  if (course.stripePriceId) {
    form.set("line_items[0][price]", course.stripePriceId);
  } else {
    form.set("line_items[0][price_data][currency]", "eur");
    form.set("line_items[0][price_data][unit_amount]", String(course.priceCents));
    form.set("line_items[0][price_data][product_data][name]", `${course.title} — StartupWeek Academy`);
    form.set("line_items[0][price_data][product_data][description]", `Formation en ligne, accès ${course.accessDays} jours`);
  }
  form.set("line_items[0][quantity]", "1");
  const meta: Record<string, string> = { academy_course_id: course.id, email: input.email, first_name: input.firstName ?? "", last_name: input.lastName ?? "", persona: input.persona ?? "" };
  for (const [k, v] of Object.entries(meta)) {
    form.set(`metadata[${k}]`, v);
    form.set(`payment_intent_data[metadata][${k}]`, v);
  }
  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !json.url || !json.id) return { ok: false, status: 502, error: "STRIPE_ERROR", message: json.error?.message ?? `Stripe a répondu ${res.status}` };
    return { ok: true, url: json.url, id: json.id };
  } catch {
    return { ok: false, status: 502, error: "STRIPE_UNREACHABLE", message: "Stripe injoignable, réessayez." };
  }
}

export interface PurchaseInput {
  courseId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  persona?: Persona;
  amountCents: number;
  reference: string; // pi_… (idempotence)
  receivedAt: string;
  feeCents?: number;
  stripeEventId: string;
}

export type PurchaseOutcome =
  | { status: "recorded"; enrollmentId: string; invoiceId: string; invoiceNumber: string; contactId: string; created: boolean }
  | { status: "duplicate"; reference: string }
  | { status: "ignored"; reason: string };

/** TTC → HT selon le taux (arrondi au centime, comme lineFromTtc côté interface). */
function lineFromTtc(label: string, ttc: number, vatRate: number) {
  const unit = vatRate ? Math.round(ttc / (1 + vatRate / 100)) : ttc;
  return { id: `li_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`, label, quantity: 1, unitPriceCents: unit, vatRate };
}

export async function recordAcademyPurchase(repo: AcademyRepo, p: PurchaseInput): Promise<PurchaseOutcome> {
  if (await repo.paymentExists(p.reference)) return { status: "duplicate", reference: p.reference };
  const course = await repo.course(p.courseId);
  if (!course) {
    await repo.log("payments", p.reference, `Paiement Stripe Academy pour une formation inconnue (${p.courseId})`, { reference: p.reference, amountCents: p.amountCents, event: p.stripeEventId });
    return { status: "ignored", reason: "course_not_found" };
  }
  const email = p.email.trim().toLowerCase();
  if (!email) return { status: "ignored", reason: "email_missing" };

  let contact = await repo.contactByEmail(email);
  if (!contact) {
    contact = await repo.createContact({
      firstName: p.firstName?.trim() || email.split("@")[0],
      lastName: p.lastName?.trim() ?? "",
      email,
      lifecycle: "participant",
      source: "autre",
      tags: ["Academy"],
      consent: { gdpr: true, marketing: false, source: `Achat en ligne Stripe (${p.reference})` },
      score: 40,
    });
  }

  const invoice = await repo.insertInvoice({
    kind: "facture",
    status: "emise",
    contactId: contact.id,
    issuedAt: p.receivedAt,
    dueAt: p.receivedAt,
    lines: [lineFromTtc(`${course.title} — formation en ligne StartupWeek Academy (accès ${course.accessDays} jours)`, p.amountCents, course.vatRate)],
    paidCents: 0,
    preferredMethod: "stripe",
    remindersSent: 0,
    notes: `Achat en ligne (Stripe ${p.reference})`,
  });
  const paid = await repo.insertPayment({ invoiceId: invoice.id, amountCents: p.amountCents, receivedAt: p.receivedAt, reference: p.reference, feeCents: p.feeCents });
  if (paid === "duplicate") return { status: "duplicate", reference: p.reference };

  const accessDays = course.accessDays || ACADEMY_ACCESS_DAYS;
  const expiresAt = new Date(new Date(p.receivedAt).getTime() + accessDays * DAY).toISOString();
  const existing = await repo.enrollmentFor(course.id, contact.id);
  let enrollmentId: string;
  if (existing) {
    enrollmentId = existing.id;
    const later = new Date(expiresAt).getTime() > new Date(existing.expiresAt).getTime();
    await repo.updateEnrollment(existing.id, { status: existing.completedAt ? "terminee" : "active", expiresAt: later ? expiresAt : existing.expiresAt, invoiceId: invoice.id });
  } else {
    const e = await repo.insertEnrollment({
      courseId: course.id,
      contactId: contact.id,
      source: "achat",
      status: "active",
      persona: p.persona ?? "non_tech",
      invoiceId: invoice.id,
      grantedAt: p.receivedAt,
      expiresAt,
      progressPercent: 0,
      timeSpentMinutes: 0,
    });
    enrollmentId = e.id;
  }
  await repo.log("enrollments", enrollmentId, `Achat en ligne : accès à « ${course.title} » jusqu'au ${expiresAt.slice(0, 10)} (facture ${invoice.number})`, { reference: p.reference, amountCents: p.amountCents });
  return { status: "recorded", enrollmentId, invoiceId: invoice.id, invoiceNumber: invoice.number, contactId: contact.id, created: !existing };
}
