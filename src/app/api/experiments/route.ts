/**
 * A/B tests des pages du site startupweek.tech.
 *
 * GET  /api/experiments — tests « site » en cours : { experiments: [{ key, pageUrl, variants: [{ key, weight }] }] }.
 *      Public (aucune donnée personnelle, ni hypothèse ni résultat), mis en cache 60 s.
 * POST /api/experiments — { experiment, variant, visitorId, event: "exposure" | "conversion" }.
 *      Une exposition et une conversion au plus par visiteur et par test (crm.track_experiment) ;
 *      la conversion est comptée sur la variante réellement vue par le visiteur.
 *
 * Le site tire la variante lui-même (hachage stable de visitorId, pondéré par `weight`) : aucun
 * appel bloquant avant l'affichage. Protection : origines autorisées (ALLOWED_ORIGINS), corps
 * ≤ 2 Ko, 60 événements / minute par IP, identifiants validés, test « en cours » uniquement.
 * Limite connue : un appel forgé depuis un serveur tiers reste possible (dédoublonnage par
 * visiteur, mais pas d'authentification du navigateur) — l'écart d'échantillon (SRM) affiché
 * dans le CRM signale une répartition anormale.
 */
import { z } from "zod";
import { allowedOrigins, clientIp, corsHeaders, createRateLimiter, isOriginAllowed, readBodyWithLimit } from "@/lib/server/security";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const limiter = createRateLimiter({ capacity: 60, windowMs: 60_000 });

const Event = z.object({
  experiment: z.string().regex(/^[a-z0-9][a-z0-9_-]{1,62}$/),
  variant: z.string().min(1).max(20),
  visitorId: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),
  event: z.enum(["exposure", "conversion"]),
});

function headersFor(request: Request): Record<string, string> {
  return { ...corsHeaders(request.headers.get("origin"), allowedOrigins()), "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
}

export async function OPTIONS(request: Request): Promise<Response> {
  if (!isOriginAllowed(request.headers.get("origin"))) return new Response(null, { status: 403, headers: { Vary: "Origin" } });
  return new Response(null, { status: 204, headers: headersFor(request) });
}

export async function GET(request: Request): Promise<Response> {
  const headers = headersFor(request);
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ experiments: [], dryRun: true }, { headers: { ...headers, "Cache-Control": "no-store" } });
  const { data, error } = await db.from("experiments").select("key, page_url, variants").eq("channel", "site").eq("status", "en_cours");
  if (error) {
    console.error("[experiments] lecture", error.message);
    return Response.json({ experiments: [] }, { status: 500, headers });
  }
  const experiments = ((data ?? []) as { key: string; page_url: string | null; variants: { key: string; weight?: number }[] }[]).map((e) => ({
    key: e.key,
    pageUrl: e.page_url,
    variants: (e.variants ?? []).map((v) => ({ key: v.key, weight: typeof v.weight === "number" ? v.weight : 0 })),
  }));
  return Response.json({ experiments }, { headers: { ...headers, "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}

export async function POST(request: Request): Promise<Response> {
  const headers = { ...headersFor(request), "Cache-Control": "no-store" };
  if (!isOriginAllowed(request.headers.get("origin"))) return Response.json({ ok: false, error: "FORBIDDEN_ORIGIN" }, { status: 403, headers });

  const rl = limiter.take(clientIp(request.headers));
  if (!rl.ok) return Response.json({ ok: false, error: "RATE_LIMITED" }, { status: 429, headers: { ...headers, "Retry-After": String(rl.retryAfterSec) } });

  const body = await readBodyWithLimit(request, 2048);
  if (!body.ok) return Response.json({ ok: false, error: body.reason === "too_large" ? "PAYLOAD_TOO_LARGE" : "UNREADABLE" }, { status: body.reason === "too_large" ? 413 : 400, headers });
  let json: unknown;
  try {
    json = JSON.parse(body.text);
  } catch {
    return Response.json({ ok: false, error: "INVALID_JSON" }, { status: 400, headers });
  }
  const parsed = Event.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, error: "VALIDATION" }, { status: 400, headers });

  const db = getSupabaseAdmin();
  if (!db) return Response.json({ ok: true, dryRun: true, counted: false }, { headers });

  const e = parsed.data;
  const { data, error } = await db.rpc("track_experiment", { p_key: e.experiment, p_visitor: e.visitorId, p_variant: e.variant, p_event: e.event });
  if (error) {
    console.error("[experiments] suivi", error.message);
    return Response.json({ ok: false, error: "SERVER_ERROR" }, { status: 500, headers });
  }
  const result = (data ?? {}) as { ok?: boolean; counted?: boolean; reason?: string };
  return Response.json({ ok: result.ok !== false, counted: Boolean(result.counted), reason: result.reason }, { status: result.ok === false ? 404 : 200, headers });
}
