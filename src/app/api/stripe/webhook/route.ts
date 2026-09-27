/**
 * POST /api/stripe/webhook — encaissements Stripe → crm.payments.
 *
 * Événements traités :
 *   - checkout.session.completed (+ checkout.session.async_payment_succeeded) : paiement d'un
 *     Payment Link / Checkout ; facture retrouvée via metadata.invoice_id ou client_reference_id ;
 *   - payment_intent.succeeded : paiement direct portant metadata.invoice_id ;
 *   - charge.refunded : remboursement (ligne négative, statut « rembourse »).
 *
 * StartupWeek Academy : une session Checkout portant metadata.academy_course_id (créée par
 * /api/academy/checkout) est un achat de formation en ligne → contact, facture, paiement et
 * accès (recordAcademyPurchase), même idempotence sur la référence pi_….
 *
 * Idempotent : la référence Stripe (pi_… / cs_… / refund:ch_…:montant) est unique
 * dans crm.payments ; checkout.session.completed et payment_intent.succeeded d'un
 * même paiement partagent la référence pi_… et ne créent qu'une ligne.
 *
 * Le recalcul de invoices.paid_cents / status (payee | partielle) et de
 * applications.amount_paid_cents est fait par le trigger SQL crm.payments_refresh_invoice
 * (source de vérité unique, aussi pour les paiements Qonto et manuels).
 */
import { MAX_WEBHOOK_BODY_BYTES, readBodyWithLimit, verifyStripeSignature } from "@/lib/server/security";
import { getSupabaseAdmin, type CrmAdminClient } from "@/lib/server/supabase-admin";
import { SupabaseRepo } from "@/lib/server/academy/repo";
import { recordAcademyPurchase, type PurchaseOutcome } from "@/lib/server/academy/purchase";
import type { Persona } from "@/lib/domain/types";

export const runtime = "nodejs";

type Json = Record<string, unknown>;

interface StripeEvent {
  id: string;
  type: string;
  created: number;
  livemode?: boolean;
  data: { object: Json };
}

type Outcome =
  | PurchaseOutcome
  | { status: "recorded"; paymentId: string; invoiceId: string; invoiceStatus?: string; paidCents?: number }
  | { status: "duplicate"; reference: string }
  | { status: "ignored"; reason: string };

/* ───────────── Lecture défensive des objets Stripe (pas de SDK) ───────────── */

const str = (o: Json | undefined, key: string): string | undefined => {
  const v = o?.[key];
  return typeof v === "string" && v ? v : undefined;
};
const int = (o: Json | undefined, key: string): number | undefined => {
  const v = o?.[key];
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined;
};
const obj = (o: Json | undefined, key: string): Json | undefined => {
  const v = o?.[key];
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : undefined;
};
/** Champ pouvant être un id (string) ou un objet « expandé ». */
const idOf = (o: Json | undefined, key: string): string | undefined => str(o, key) ?? str(obj(o, key), "id");

function isStripeEvent(value: unknown): value is StripeEvent {
  if (!value || typeof value !== "object") return false;
  const v = value as Json;
  return typeof v.id === "string" && typeof v.type === "string" && typeof v.created === "number" && !!obj(v, "data") && !!obj(obj(v, "data"), "object");
}

const euros = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(cents / 100);

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;

/** Frais Stripe (best effort) via l'API si STRIPE_SECRET_KEY est défini. */
async function fetchStripeFee(paymentIntentId: string | undefined): Promise<number | undefined> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !paymentIntentId) return undefined;
  try {
    const url = `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}?expand[]=latest_charge.balance_transaction`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return undefined;
    const pi = (await res.json()) as Json;
    return int(obj(obj(pi, "latest_charge"), "balance_transaction"), "fee");
  } catch {
    return undefined;
  }
}

async function logActivity(db: CrmAdminClient, entity: "invoices" | "payments", entityId: string, summary: string, meta: Record<string, string | number | boolean>, kind: "paiement" | "systeme" = "paiement") {
  const { error } = await db.from("activities").insert({ kind, entity, entity_id: entityId, summary, meta });
  if (error) console.error("[stripe] journal d'activité", error.message);
}

/** Enregistre un encaissement (ou remboursement si montant négatif) de façon idempotente. */
async function recordPayment(
  db: CrmAdminClient,
  p: { invoiceId: string | undefined; amountCents: number; reference: string; receivedAt: string; feeCents?: number; refund?: boolean; eventId: string },
): Promise<Outcome> {
  if (!p.amountCents) return { status: "ignored", reason: "amount_zero" };

  const { data: dup, error: dupErr } = await db.from("payments").select("id").eq("reference", p.reference).maybeSingle();
  if (dupErr) throw new Error(dupErr.message);
  if (dup) return { status: "duplicate", reference: p.reference };

  if (!p.invoiceId) {
    await logActivity(db, "payments", p.reference, "Paiement Stripe reçu sans facture rattachée (metadata.invoice_id absent)", { reference: p.reference, amountCents: p.amountCents, event: p.eventId }, "systeme");
    return { status: "ignored", reason: "invoice_id_missing" };
  }
  const { data: invoice, error: invErr } = await db.from("invoices").select("id, number").eq("id", p.invoiceId).maybeSingle();
  if (invErr) throw new Error(invErr.message);
  if (!invoice) {
    await logActivity(db, "payments", p.reference, `Paiement Stripe pour une facture inconnue (${p.invoiceId})`, { reference: p.reference, amountCents: p.amountCents, event: p.eventId }, "systeme");
    return { status: "ignored", reason: "invoice_not_found" };
  }

  const paymentId = newId("pay");
  const { error: insErr } = await db.from("payments").insert({
    id: paymentId,
    invoice_id: p.invoiceId,
    amount_cents: p.amountCents,
    received_at: p.receivedAt,
    method: "stripe",
    status: p.refund ? "rembourse" : "reussi",
    reference: p.reference,
    fee_cents: p.feeCents ?? null,
  });
  if (insErr) {
    if (insErr.code === "23505") return { status: "duplicate", reference: p.reference }; // livraison concurrente
    throw new Error(insErr.message);
  }

  // Le trigger SQL a recalculé paid_cents / status : on relit pour le journal et la réponse.
  const { data: after } = await db.from("invoices").select("number, status, paid_cents").eq("id", p.invoiceId).maybeSingle();
  const row = (after ?? {}) as Json;
  const number = str(row, "number") ?? str(invoice as Json, "number") ?? p.invoiceId;
  await logActivity(
    db,
    "invoices",
    p.invoiceId,
    p.refund ? `Remboursement Stripe : ${euros(-p.amountCents)} (facture ${number})` : `Paiement Stripe reçu : ${euros(p.amountCents)} (facture ${number})`,
    { reference: p.reference, amountCents: p.amountCents, event: p.eventId },
  );
  return { status: "recorded", paymentId, invoiceId: p.invoiceId, invoiceStatus: str(row, "status"), paidCents: int(row, "paid_cents") };
}

async function handleCheckout(db: CrmAdminClient, event: StripeEvent): Promise<Outcome> {
  const session = event.data.object;
  if (str(session, "payment_status") !== "paid") return { status: "ignored", reason: "not_paid_yet" };
  const paymentIntent = idOf(session, "payment_intent");
  const meta = obj(session, "metadata");
  const academyCourseId = str(meta, "academy_course_id");
  if (academyCourseId) {
    const persona = str(meta, "persona");
    return recordAcademyPurchase(new SupabaseRepo(db), {
      courseId: academyCourseId,
      email: str(meta, "email") ?? str(obj(session, "customer_details"), "email") ?? str(session, "customer_email") ?? "",
      firstName: str(meta, "first_name"),
      lastName: str(meta, "last_name"),
      persona: persona === "tech" || persona === "non_tech" || persona === "reconversion" ? (persona as Persona) : undefined,
      amountCents: int(session, "amount_total") ?? 0,
      reference: paymentIntent ?? str(session, "id") ?? event.id,
      receivedAt: new Date(event.created * 1000).toISOString(),
      feeCents: await fetchStripeFee(paymentIntent),
      stripeEventId: event.id,
    });
  }
  const invoiceId = str(obj(session, "metadata"), "invoice_id") ?? str(session, "client_reference_id");
  return recordPayment(db, {
    invoiceId,
    amountCents: int(session, "amount_total") ?? 0,
    reference: paymentIntent ?? str(session, "id") ?? event.id,
    receivedAt: new Date(event.created * 1000).toISOString(),
    feeCents: await fetchStripeFee(paymentIntent),
    eventId: event.id,
  });
}

async function handlePaymentIntent(db: CrmAdminClient, event: StripeEvent): Promise<Outcome> {
  const pi = event.data.object;
  const invoiceId = str(obj(pi, "metadata"), "invoice_id");
  // Sans metadata (cas des Payment Links), c'est checkout.session.completed qui enregistre le paiement.
  if (!invoiceId) return { status: "ignored", reason: "no_invoice_metadata" };
  const id = str(pi, "id") ?? event.id;
  return recordPayment(db, {
    invoiceId,
    amountCents: int(pi, "amount_received") ?? int(pi, "amount") ?? 0,
    reference: id,
    receivedAt: new Date(event.created * 1000).toISOString(),
    feeCents: await fetchStripeFee(id),
    eventId: event.id,
  });
}

async function handleRefund(db: CrmAdminClient, event: StripeEvent): Promise<Outcome> {
  const charge = event.data.object;
  const chargeId = str(charge, "id");
  const refundedTotal = int(charge, "amount_refunded") ?? 0;
  if (!chargeId || refundedTotal <= 0) return { status: "ignored", reason: "nothing_refunded" };

  // Facture : metadata de la charge, sinon paiement d'origine (référence pi_… ou ch_…).
  let invoiceId = str(obj(charge, "metadata"), "invoice_id");
  if (!invoiceId) {
    const refs = [idOf(charge, "payment_intent"), chargeId].filter((r): r is string => Boolean(r));
    const { data } = await db.from("payments").select("invoice_id").in("reference", refs).limit(1).maybeSingle();
    invoiceId = str((data ?? undefined) as Json | undefined, "invoice_id");
  }

  // amount_refunded est cumulatif : on n'enregistre que le delta non encore journalisé.
  const { data: previous, error } = await db.from("payments").select("amount_cents").like("reference", `refund:${chargeId}:%`);
  if (error) throw new Error(error.message);
  const alreadyRefunded = (previous ?? []).reduce((sum, r) => sum - (int(r as Json, "amount_cents") ?? 0), 0);
  const delta = refundedTotal - alreadyRefunded;
  if (delta <= 0) return { status: "duplicate", reference: `refund:${chargeId}:${refundedTotal}` };

  return recordPayment(db, {
    invoiceId,
    amountCents: -delta,
    reference: `refund:${chargeId}:${refundedTotal}`,
    receivedAt: new Date(event.created * 1000).toISOString(),
    refund: true,
    eventId: event.id,
  });
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: "STRIPE_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = await readBodyWithLimit(request, MAX_WEBHOOK_BODY_BYTES);
  if (!body.ok) return Response.json({ ok: false, error: body.reason === "too_large" ? "PAYLOAD_TOO_LARGE" : "UNREADABLE_BODY" }, { status: 400 });

  const signature = verifyStripeSignature(body.bytes, request.headers.get("stripe-signature"), secret);
  if (!signature.ok) {
    return Response.json({ ok: false, error: "INVALID_SIGNATURE", reason: signature.reason }, { status: 400 });
  }

  let event: unknown;
  try {
    event = JSON.parse(body.text);
  } catch {
    return Response.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }
  if (!isStripeEvent(event)) return Response.json({ ok: false, error: "INVALID_EVENT" }, { status: 400 });

  const db = getSupabaseAdmin();
  if (!db) return Response.json({ ok: true, dryRun: true, type: event.type, id: event.id });

  try {
    let outcome: Outcome;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        outcome = await handleCheckout(db, event);
        break;
      case "payment_intent.succeeded":
        outcome = await handlePaymentIntent(db, event);
        break;
      case "charge.refunded":
        outcome = await handleRefund(db, event);
        break;
      default:
        outcome = { status: "ignored", reason: "unhandled_event_type" };
    }
    // 200 même si ignoré : Stripe ne doit pas rejouer un événement que l'on a volontairement écarté.
    return Response.json({ ok: true, type: event.type, id: event.id, ...outcome });
  } catch (error) {
    // 500 → Stripe rejouera l'événement (idempotence garantie par la référence).
    console.error(`[stripe] ${event.type} ${event.id}`, error);
    return Response.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
