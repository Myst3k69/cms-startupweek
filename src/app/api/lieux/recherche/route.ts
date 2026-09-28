/**
 * POST /api/lieux/recherche — assistant IA de sourcing de lieux (Vercel AI Gateway, recherche web).
 *
 * Accès : membre connecté ayant le droit d'écriture sur « sessions » (src/lib/server/venue-access.ts) ;
 * en mode démo, uniquement en développement local (l'interface affiche alors des exemples fictifs).
 * Modèle : celui choisi dans l'assistant s'il figure parmi les modèles compatibles du catalogue
 * AI Gateway, sinon le modèle par défaut (src/lib/server/venue-models.ts).
 * Limite : 10 recherches par heure et par membre (par instance serveur).
 * Réponse : VenueSearchResponse (src/features/programmes/lib/venue-search.ts).
 */
import { criteriaSchema, type VenueSearchResponse } from "@/features/programmes/lib/venue-search";
import { createRateLimiter, readBodyWithLimit } from "@/lib/server/security";
import { authorizeSessionsWriter } from "@/lib/server/venue-access";
import { resolveVenueModel } from "@/lib/server/venue-models";
import { isVenueSearchConfigured, searchVenues } from "@/lib/server/venue-search";

export const runtime = "nodejs";
// Recherche web approfondie (au moins 8 requêtes), puis au besoin une seconde recherche élargie :
// compter une à trois minutes, jusqu'à cinq quand la recherche est élargie.
export const maxDuration = 300;

const limiter = createRateLimiter({ capacity: 10, windowMs: 60 * 60_000 });

const json = (body: VenueSearchResponse, status: number, headers?: Record<string, string>) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(req: Request): Promise<Response> {
  if (!isVenueSearchConfigured()) {
    return json({ ok: false, error: "not_configured", message: "Assistant IA non configuré : en local, ajoutez AI_GATEWAY_API_KEY (sur Vercel, l'authentification AI Gateway passe par l'OIDC du projet)." }, 503);
  }
  const auth = await authorizeSessionsWriter(req);
  if (!auth.ok) return json({ ok: false, error: auth.error, message: auth.message }, auth.status);

  const rate = limiter.take(auth.key);
  if (!rate.ok) return json({ ok: false, error: "rate_limited", message: `Limite de 10 recherches par heure atteinte. Réessayez dans ${Math.ceil(rate.retryAfterSec / 60)} min.` }, 429, { "Retry-After": String(rate.retryAfterSec) });

  const body = await readBodyWithLimit(req, 16 * 1024);
  if (!body.ok) return json({ ok: false, error: "invalid", message: "Requête illisible ou trop volumineuse." }, 400);
  let payload: unknown;
  try {
    payload = JSON.parse(body.text);
  } catch {
    return json({ ok: false, error: "invalid", message: "Requête illisible (JSON attendu)." }, 400);
  }
  const parsed = criteriaSchema.safeParse(payload);
  if (!parsed.success) return json({ ok: false, error: "invalid", message: parsed.error.issues[0]?.message ?? "Critères invalides." }, 400);

  try {
    const { id, search } = await resolveVenueModel(parsed.data.model);
    const result = await searchVenues(parsed.data, { model: id, search });
    return json(result, result.ok ? 200 : result.error === "rate_limited" ? 429 : result.error === "not_configured" ? 503 : 502);
  } catch (err) {
    console.error("[lieux/recherche] échec", err);
    return json({ ok: false, error: "upstream", message: "La recherche a échoué. Réessayez dans un instant." }, 502);
  }
}
