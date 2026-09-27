/**
 * POST /api/academy/ai — aide à la rédaction des leçons (Claude).
 *
 * Réservé aux membres de l'équipe ayant l'écriture sur la section « academy »
 * (jeton Supabase du back-office). Le résultat est un brouillon de blocs que
 * l'auteur relit dans l'éditeur ; rien n'est enregistré par cette route.
 *
 * Codes : 400 requête invalide, 401/403 accès, 413 corps trop gros, 422 refus du modèle,
 * 429 limite de débit, 502 réponse inexploitable, 503 non configuré (ANTHROPIC_API_KEY / Supabase).
 */
import { AiRequestSchema, draftWithClaude, getAnthropic } from "@/lib/server/academy/ai";
import { createRateLimiter, readBodyWithLimit } from "@/lib/server/security";
import { authenticateTeamMember } from "@/lib/server/team-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

// 20 générations / 10 min par membre (garde-fou de coût, par instance).
const limiter = createRateLimiter({ capacity: 20, windowMs: 10 * 60_000 });

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticateTeamMember(request, "academy", "write");
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

  const client = getAnthropic();
  if (!client) return Response.json({ ok: false, error: "AI_NOT_CONFIGURED", message: "Ajoutez ANTHROPIC_API_KEY aux variables d'environnement du serveur." }, { status: 503 });

  const rate = limiter.take(auth.memberId ?? "demo");
  if (!rate.ok) return Response.json({ ok: false, error: "RATE_LIMITED", message: "Limite atteinte (20 générations / 10 min)." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } });

  const body = await readBodyWithLimit(request, 256 * 1024);
  if (!body.ok) return Response.json({ ok: false, error: body.reason === "too_large" ? "PAYLOAD_TOO_LARGE" : "UNREADABLE_BODY" }, { status: body.reason === "too_large" ? 413 : 400 });
  let json: unknown;
  try {
    json = JSON.parse(body.text);
  } catch {
    return Response.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = AiRequestSchema.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, error: "VALIDATION_ERROR", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
  if ((parsed.data.mode === "variante" || parsed.data.mode === "ameliorer") && !parsed.data.sourceText?.trim()) {
    return Response.json({ ok: false, error: "VALIDATION_ERROR", issues: ["sourceText: requis pour ce mode"] }, { status: 400 });
  }

  try {
    const result = await draftWithClaude(client, parsed.data);
    if (!result.ok) return Response.json(result, { status: result.status });
    return Response.json(result);
  } catch (error) {
    console.error("[academy/ai]", error);
    return Response.json({ ok: false, error: "INTERNAL_ERROR", message: "Erreur inattendue pendant la génération." }, { status: 500 });
  }
}
