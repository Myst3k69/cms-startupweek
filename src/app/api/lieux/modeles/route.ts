/**
 * GET /api/lieux/modeles — modèles proposés dans l'assistant de sourcing : catalogue AI Gateway
 * limité aux modèles compatibles (outils + sortie structurée), avec leurs prix et l'outil de
 * recherche web utilisé. Même accès que la recherche (src/lib/server/venue-access.ts).
 * Réponse : VenueModelsResponse (src/features/programmes/lib/venue-search.ts).
 */
import type { VenueModelsResponse } from "@/features/programmes/lib/venue-search";
import { authorizeSessionsWriter } from "@/lib/server/venue-access";
import { listVenueModels } from "@/lib/server/venue-models";
import { isVenueSearchConfigured, VENUE_SEARCH_MODEL } from "@/lib/server/venue-search";

export const runtime = "nodejs";

const json = (body: VenueModelsResponse, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: Request): Promise<Response> {
  if (!isVenueSearchConfigured()) return json({ ok: false, error: "not_configured", message: "Assistant IA non configuré." }, 503);
  const auth = await authorizeSessionsWriter(req);
  if (!auth.ok) return json({ ok: false, error: auth.error, message: auth.message }, auth.status);
  try {
    return json({ ok: true, models: await listVenueModels(), defaultModel: VENUE_SEARCH_MODEL }, 200);
  } catch (err) {
    console.warn("[lieux/modeles] catalogue AI Gateway indisponible", err);
    return json({ ok: false, error: "upstream", message: "Liste des modèles AI Gateway indisponible : la recherche utilisera le modèle par défaut." }, 502);
  }
}
