/**
 * POST /api/academy/checkout — ouvre un paiement Stripe Checkout pour une formation du catalogue.
 *
 * Appelé par le site (serveur à serveur, signé comme /api/academy/learner) :
 *   { ts, courseSlug | courseId, email, firstName?, lastName?, persona?, successUrl, cancelUrl }
 * → 200 { ok, url } (rediriger l'internaute vers `url`). L'accès est ouvert par le webhook
 * Stripe (checkout.session.completed), jamais par cette route.
 */
import { z } from "zod";
import { checkSignedCall, getAcademyRepo } from "@/lib/server/academy";
import { createCheckoutSession } from "@/lib/server/academy/purchase";
import { allowedOrigins, readBodyWithLimit } from "@/lib/server/security";

export const runtime = "nodejs";

const Schema = z.object({
  ts: z.number(),
  courseSlug: z.string().max(120).optional(),
  courseId: z.string().max(80).optional(),
  email: z.string().trim().toLowerCase().email().max(254),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  persona: z.enum(["tech", "non_tech", "reconversion"]).optional(),
  successUrl: z.string().url().max(2000),
  cancelUrl: z.string().url().max(2000),
});

/** Les URL de retour doivent appartenir au site (ALLOWED_ORIGINS) : pas de redirection ouverte. */
function sameSite(url: string): boolean {
  const origins = allowedOrigins();
  if (!origins.length) return process.env.NODE_ENV !== "production";
  try {
    return origins.includes(new URL(url).origin);
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  const body = await readBodyWithLimit(request, 16 * 1024);
  if (!body.ok) return Response.json({ ok: false, error: "UNREADABLE_BODY" }, { status: 400 });
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(body.text) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }
  const signed = checkSignedCall(body.text, request.headers.get("x-sw-signature"), json.ts);
  if (!signed.ok) return Response.json({ ok: false, error: signed.error }, { status: signed.status });
  const parsed = Schema.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, error: "VALIDATION_ERROR", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
  const d = parsed.data;
  if (!sameSite(d.successUrl) || !sameSite(d.cancelUrl)) return Response.json({ ok: false, error: "INVALID_RETURN_URL" }, { status: 400 });

  const repo = getAcademyRepo();
  const course = d.courseId ? await repo.course(d.courseId) : d.courseSlug ? await repo.courseBySlug(d.courseSlug) : null;
  if (!course || course.status !== "publiee" || !course.inCatalog || course.priceCents <= 0) {
    return Response.json({ ok: false, error: "COURSE_NOT_FOR_SALE" }, { status: 404 });
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return Response.json({ ok: true, dryRun: true, course: { id: course.id, priceCents: course.priceCents } });
  const result = await createCheckoutSession({ course, email: d.email, firstName: d.firstName, lastName: d.lastName, persona: d.persona, successUrl: d.successUrl, cancelUrl: d.cancelUrl }, key);
  if (!result.ok) return Response.json(result, { status: result.status });
  return Response.json({ ok: true, url: result.url, sessionId: result.id });
}
