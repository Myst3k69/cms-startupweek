/**
 * POST /api/intake/<form> — point d'entrée des 8 formulaires du site
 * (candidature, contact, entreprise, partenaire, reclamation, accompagnement,
 * newsletter, starter-kit). Remplace les webhooks n8n publics.
 *
 * Chaîne de traitement :
 *   CORS → rate-limit (IP de transport) → taille du corps → signature HMAC
 *   (obligatoire si INTAKE_SIGNING_SECRET est défini) → JSON → honeypot →
 *   rate-limit (IP de l'internaute) → validation zod + normalisation →
 *   persistance Supabase (202) ou mode démo (200, dryRun).
 *
 * Codes : 400 validation / JSON, 401 signature, 403 origine, 404 formulaire inconnu,
 * 409 SESSION_CLOSED, 413 corps trop gros, 429 rate-limit, 500 erreur serveur.
 */
import {
  allowedOrigins,
  clientIp,
  corsHeaders,
  honeypotTriggered,
  intakeTransportLimiter,
  intakeUserLimiter,
  isOriginAllowed,
  MAX_INTAKE_BODY_BYTES,
  readBodyWithLimit,
  stripHoneypot,
  verifyIntakeSignature,
} from "@/lib/server/security";
import { createResendSender, isIntakeForm, normalizeIntake, persistIntake, IntakePersistError } from "@/lib/server/intake";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ form: string }> };

function reply(status: number, body: Record<string, unknown>, headers: Record<string, string>, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...headers, ...extra, "Cache-Control": "no-store" } });
}

/** Pré-vol CORS (appel direct depuis le navigateur ; le site passe normalement par ses routes serveur). */
export async function OPTIONS(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  const allowed = allowedOrigins();
  if (!isOriginAllowed(origin, allowed)) return new Response(null, { status: 403, headers: { Vary: "Origin" } });
  return new Response(null, { status: 204, headers: corsHeaders(origin, allowed) });
}

export async function POST(request: Request, { params }: Ctx): Promise<Response> {
  const { form } = await params;
  const origin = request.headers.get("origin");
  const allowed = allowedOrigins();
  const cors = corsHeaders(origin, allowed);

  if (!isIntakeForm(form)) return reply(404, { ok: false, error: "UNKNOWN_FORM" }, cors);
  if (!isOriginAllowed(origin, allowed)) return reply(403, { ok: false, error: "ORIGIN_NOT_ALLOWED" }, cors);

  // 1. Filet anti-flood par IP de transport (serveur du site ou navigateur)
  const transportIp = clientIp(request.headers);
  const transport = intakeTransportLimiter.take(`t:${transportIp}`);
  if (!transport.ok) {
    return reply(429, { ok: false, error: "RATE_LIMITED" }, cors, { "Retry-After": String(transport.retryAfterSec) });
  }

  // 2. Corps brut borné (la signature porte sur les octets exacts)
  const body = await readBodyWithLimit(request, MAX_INTAKE_BODY_BYTES);
  if (!body.ok) {
    return body.reason === "too_large"
      ? reply(413, { ok: false, error: "PAYLOAD_TOO_LARGE", maxBytes: MAX_INTAKE_BODY_BYTES }, cors)
      : reply(400, { ok: false, error: "UNREADABLE_BODY" }, cors);
  }

  // 3. Signature HMAC (obligatoire dès que le secret est configuré)
  const secret = process.env.INTAKE_SIGNING_SECRET;
  const signed = Boolean(secret);
  if (secret && !verifyIntakeSignature(body.bytes, request.headers.get("x-sw-signature"), secret)) {
    return reply(401, { ok: false, error: "INVALID_SIGNATURE" }, cors);
  }

  // 4. JSON
  let payload: unknown;
  try {
    payload = JSON.parse(body.text);
  } catch {
    return reply(400, { ok: false, error: "INVALID_JSON" }, cors);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return reply(400, { ok: false, error: "INVALID_JSON", message: "Objet JSON attendu" }, cors);
  }
  const data = payload as Record<string, unknown>;

  // 5. Honeypot : réponse de succès factice, rien n'est enregistré (ne pas renseigner le robot).
  if (honeypotTriggered(data)) {
    console.warn(`[intake:${form}] honeypot déclenché (ip ${transportIp})`);
    return reply(202, { ok: true }, cors);
  }

  // 6. Rate-limit par internaute. Requête signée : l'IP réelle transmise par le site fait foi.
  const userIp =
    (signed && typeof data.ipAddress === "string" && data.ipAddress.trim()) ||
    (signed && request.headers.get("x-sw-client-ip")?.trim()) ||
    transportIp;
  const user = intakeUserLimiter.take(`u:${userIp}`);
  if (!user.ok) {
    return reply(429, { ok: false, error: "RATE_LIMITED" }, cors, { "Retry-After": String(user.retryAfterSec) });
  }

  // 7. Validation + normalisation (pure)
  const normalized = normalizeIntake(form, stripHoneypot(data), { idempotencyHeader: request.headers.get("idempotency-key") });
  if (!normalized.ok) {
    return reply(400, { ok: false, error: normalized.error, issues: normalized.issues }, cors);
  }

  // 8. Persistance — ou mode démo si Supabase n'est pas configuré
  const db = getSupabaseAdmin();
  if (!db) {
    return reply(200, { ok: true, dryRun: true, form, normalized: normalized.value }, cors);
  }

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const sendEmail = resendKey && from ? createResendSender(resendKey, from) : undefined;

  try {
    const result = await persistIntake(db, normalized.value, { sendEmail });
    if (result.sessionClosed) {
      return reply(
        409,
        {
          ok: false,
          error: "SESSION_CLOSED",
          message: "La session demandée n'accepte plus de candidatures (complète ou date limite passée). La demande a été transmise à l'équipe.",
          submissionId: result.submissionId,
          contactId: result.contactId,
        },
        cors,
      );
    }
    return reply(202, { ok: true, form, ...result }, cors);
  } catch (error) {
    const step = error instanceof IntakePersistError ? error.step : "inconnue";
    console.error(`[intake:${form}] échec de persistance (étape ${step})`, error);
    return reply(500, { ok: false, error: "INTERNAL_ERROR" }, cors);
  }
}
