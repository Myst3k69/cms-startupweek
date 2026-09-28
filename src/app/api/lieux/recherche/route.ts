/**
 * POST /api/lieux/recherche — assistant IA de sourcing de lieux (Vercel AI Gateway + GPT-6 Luna, recherche web).
 *
 * Accès :
 *  - mode supabase : jeton Supabase Auth du membre connecté (Authorization: Bearer …),
 *    vérifié auprès de Supabase, avec le droit d'écriture sur la section « sessions »
 *    (crm.has_access, même matrice que l'interface) ;
 *  - mode démo : uniquement en développement local (une démo publique ne consomme
 *    jamais la clé API) ; l'interface affiche alors des exemples fictifs.
 * Limite : 10 recherches par heure et par membre (par instance serveur).
 * Réponse : VenueSearchResponse (src/features/programmes/lib/venue-search.ts).
 */
import { createClient } from "@supabase/supabase-js";
import { criteriaSchema, type VenueSearchResponse } from "@/features/programmes/lib/venue-search";
import { DATA_MODE, isValidSupabaseUrl } from "@/lib/data/supabase";
import { clientIp, createRateLimiter, readBodyWithLimit } from "@/lib/server/security";
import { isVenueSearchConfigured, searchVenues } from "@/lib/server/venue-search";

export const runtime = "nodejs";
// Recherche web approfondie (au moins 8 requêtes), puis au besoin une seconde recherche élargie :
// compter une à trois minutes, jusqu'à cinq quand la recherche est élargie.
export const maxDuration = 300;

const limiter = createRateLimiter({ capacity: 10, windowMs: 60 * 60_000 });

const json = (body: VenueSearchResponse, status: number, headers?: Record<string, string>) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

async function authorize(req: Request): Promise<{ ok: true; key: string } | { ok: false; res: Response }> {
  if (DATA_MODE !== "supabase") {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, res: json({ ok: false, error: "demo_mode", message: "Mode démo : l'assistant IA n'est actif qu'une fois l'équipe connectée à Supabase." }, 403) };
    }
    return { ok: true, key: `dev:${clientIp(req.headers)}` };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!token || !isValidSupabaseUrl(url) || !key) return { ok: false, res: json({ ok: false, error: "unauthorized", message: "Session expirée : reconnectez-vous." }, 401) };

  const sb = createClient(url!, key, {
    db: { schema: "crm" },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: auth, error } = await sb.auth.getUser(token);
  if (error || !auth.user) return { ok: false, res: json({ ok: false, error: "unauthorized", message: "Session expirée : reconnectez-vous." }, 401) };
  const { data: allowed, error: rpcError } = await sb.rpc("has_access", { section: "sessions", level: "write" });
  if (rpcError || allowed !== true) return { ok: false, res: json({ ok: false, error: "forbidden", message: "Droit d'écriture sur les sessions requis." }, 403) };
  return { ok: true, key: `user:${auth.user.id}` };
}

export async function POST(req: Request): Promise<Response> {
  if (!isVenueSearchConfigured()) {
    return json({ ok: false, error: "not_configured", message: "Assistant IA non configuré : en local, ajoutez AI_GATEWAY_API_KEY (sur Vercel, l'authentification AI Gateway passe par l'OIDC du projet)." }, 503);
  }
  const auth = await authorize(req);
  if (!auth.ok) return auth.res;

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
    const result = await searchVenues(parsed.data);
    return json(result, result.ok ? 200 : result.error === "rate_limited" ? 429 : result.error === "not_configured" ? 503 : 502);
  } catch (err) {
    console.error("[lieux/recherche] échec", err);
    return json({ ok: false, error: "upstream", message: "La recherche a échoué. Réessayez dans un instant." }, 502);
  }
}
