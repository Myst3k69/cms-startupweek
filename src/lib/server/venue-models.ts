/**
 * Modèles proposés dans l'assistant de sourcing : catalogue public d'AI Gateway
 * (https://ai-gateway.vercel.sh/v1/models), limité aux modèles de langage qui savent
 * appeler des outils ET rendre une sortie structurée (étiquettes « tool-use » et
 * « structured-output »). Catalogue gardé 1 h en mémoire par instance serveur.
 *
 * Recherche web : outil natif d'OpenAI pour les modèles OpenAI qui le proposent
 * (étiquette « web-search ») ; pour tous les autres, Perplexity Search exécuté par AI Gateway.
 */
import { MODEL_ID_RE, type VenueModel, type VenueSearchTool } from "@/features/programmes/lib/venue-search";
import { VENUE_SEARCH_MODEL } from "@/lib/server/venue-search";

const CATALOG_URL = "https://ai-gateway.vercel.sh/v1/models";
const TTL_MS = 60 * 60_000;

let cache: { at: number; models: VenueModel[] } | null = null;

type CatalogEntry = { id?: unknown; name?: unknown; owned_by?: unknown; type?: unknown; tags?: unknown; pricing?: { input?: unknown; output?: unknown } | null };

/** Prix par jeton (chaîne du catalogue) → dollars par million de jetons. */
function perMillion(v: unknown): number | undefined {
  const n = typeof v === "string" || typeof v === "number" ? Number(v) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 1e9) / 1e3 : undefined;
}

/** Outil de recherche d'un modèle hors catalogue (modèle par défaut quand le catalogue est injoignable). */
const searchFor = (id: string): VenueSearchTool => (id.startsWith("openai/") ? "openai" : "perplexity");

export async function listVenueModels(): Promise<VenueModel[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.models;
  const res = await fetch(CATALOG_URL, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!res.ok) throw new Error(`catalogue AI Gateway : HTTP ${res.status}`);
  const body = (await res.json()) as { data?: CatalogEntry[] };
  const models: VenueModel[] = [];
  for (const m of body.data ?? []) {
    const tags = Array.isArray(m.tags) ? m.tags : [];
    if (m.type !== "language" || typeof m.id !== "string" || !MODEL_ID_RE.test(m.id)) continue;
    if (!tags.includes("tool-use") || !tags.includes("structured-output")) continue;
    const provider = typeof m.owned_by === "string" && m.owned_by ? m.owned_by : m.id.split("/")[0];
    models.push({
      id: m.id,
      name: typeof m.name === "string" && m.name ? m.name : m.id,
      provider,
      inputPerM: perMillion(m.pricing?.input),
      outputPerM: perMillion(m.pricing?.output),
      search: provider === "openai" && tags.includes("web-search") ? "openai" : "perplexity",
    });
  }
  if (!models.length) throw new Error("catalogue AI Gateway : aucun modèle compatible");
  models.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name, "fr", { numeric: true }));
  cache = { at: Date.now(), models };
  return models;
}

/**
 * Modèle réellement utilisé pour une recherche : celui demandé s'il figure parmi les modèles
 * compatibles, sinon le modèle par défaut (VENUE_SEARCH_MODEL). La réponse indique le modèle retenu.
 */
export async function resolveVenueModel(requested?: string): Promise<{ id: string; search: VenueSearchTool }> {
  try {
    const models = await listVenueModels();
    const found = models.find((m) => m.id === (requested || VENUE_SEARCH_MODEL)) ?? models.find((m) => m.id === VENUE_SEARCH_MODEL);
    if (found) return { id: found.id, search: found.search };
  } catch (err) {
    console.warn("[lieux/recherche] catalogue des modèles indisponible : modèle par défaut", err);
  }
  return { id: VENUE_SEARCH_MODEL, search: searchFor(VENUE_SEARCH_MODEL) };
}
