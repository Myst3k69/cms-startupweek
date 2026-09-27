/**
 * POST /api/academy/learner — API apprenant de « Mon espace » (site), serveur à serveur.
 *
 * Corps JSON signé (x-sw-signature: sha256=HMAC(ACADEMY_API_SECRET, corps)) avec `ts` (ms) :
 *   { ts, action: "catalog" }
 *   { ts, action: "overview", email }
 *   { ts, action: "lesson", email, enrollmentId, lessonId }
 *   { ts, action: "track", email, enrollmentId, event: { type: "heartbeat" | "complete_lesson" | "quiz" | "checklist" | "submit", … } }
 * `email` = email VÉRIFIÉ de l'utilisateur connecté au site (Supabase Auth du site).
 * Contrat détaillé : docs/ACADEMY.md.
 */
import { LearnerRequestSchema, handleLearner } from "@/lib/server/academy/learner";
import { checkSignedCall, getAcademyRepo } from "@/lib/server/academy";
import { createRateLimiter, readBodyWithLimit } from "@/lib/server/security";

export const runtime = "nodejs";

// Par apprenant : 240 appels / 10 min (heartbeats toutes les 60 s + navigation).
const limiter = createRateLimiter({ capacity: 240, windowMs: 10 * 60_000 });

export async function POST(request: Request): Promise<Response> {
  const body = await readBodyWithLimit(request, 64 * 1024);
  if (!body.ok) return Response.json({ ok: false, error: body.reason === "too_large" ? "PAYLOAD_TOO_LARGE" : "UNREADABLE_BODY" }, { status: body.reason === "too_large" ? 413 : 400 });
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(body.text) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }
  const signed = checkSignedCall(body.text, request.headers.get("x-sw-signature"), json.ts);
  if (!signed.ok) return Response.json({ ok: false, error: signed.error }, { status: signed.status });

  const parsed = LearnerRequestSchema.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, error: "VALIDATION_ERROR", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
  const key = "email" in parsed.data ? parsed.data.email : "catalog";
  const rate = limiter.take(key);
  if (!rate.ok) return Response.json({ ok: false, error: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } });

  try {
    const result = await handleLearner(getAcademyRepo(), parsed.data);
    return Response.json(result.body, { status: result.status });
  } catch (error) {
    console.error("[academy/learner]", error);
    return Response.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
