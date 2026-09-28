/**
 * Recherche de lieux assistée par IA (serveur uniquement) : Vercel AI Gateway + GPT-6 Luna.
 *
 * - AI SDK (`generateText`) : modèle `openai/gpt-6-luna` routé par AI Gateway, outil de
 *   recherche web natif d'OpenAI (`openai.tools.webSearch`, exécuté côté fournisseur),
 *   sortie structurée (`Output.object`) validée par zod puis nettoyée entrée par entrée.
 * - Authentification AI Gateway : sur Vercel, jeton OIDC du projet (aucune clé à gérer) ;
 *   ailleurs (développement local), variable AI_GATEWAY_API_KEY.
 * - Modèle modifiable sans déploiement de code : VENUE_SEARCH_MODEL (ex. openai/gpt-6-sol).
 *
 * Les prix et disponibilités trouvés en ligne sont des indications : l'interface le rappelle,
 * et chaque suggestion est ajoutée au répertoire au statut « Repéré ».
 */
import { generateText, isStepCount, NoObjectGeneratedError, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { REGION_VALUES, VENUE_KIND_VALUES, suggestionSchema, type criteriaSchema, type VenueSearchResponse, type VenueSuggestion } from "@/features/programmes/lib/venue-search";

type Criteria = z.output<typeof criteriaSchema>;

export const VENUE_SEARCH_MODEL = process.env.VENUE_SEARCH_MODEL || "openai/gpt-6-luna";
const MAX_VENUES = 6;

/** AI Gateway joignable : clé explicite, ou déploiement Vercel (OIDC fourni à l'exécution). */
export function isVenueSearchConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL === "1");
}

// Sortie structurée : tous les champs présents (null si inconnu) — compatible avec le mode strict d'OpenAI.
const reportSchema = z.object({
  summary: z.string().describe("Synthèse en 2-3 phrases : ce qui a été trouvé, fourchette de prix, points d'attention."),
  venues: z
    .array(
      z.object({
        name: z.string().describe("Nom exact du lieu tel qu'affiché sur son site ou son annonce."),
        kind: z.enum(VENUE_KIND_VALUES),
        city: z.string(),
        country: z.string(),
        region: z.enum(REGION_VALUES),
        description: z.string().describe("2 phrases factuelles sur le lieu."),
        beds: z.number().int().nullable().describe("Couchages annoncés, null si inconnu."),
        bedrooms: z.number().int().nullable().describe("Chambres annoncées, null si inconnu."),
        workspace: z.string().nullable().describe("Espace pour travailler à 10-15 personnes, null si rien d'indiqué."),
        pricePerNightEur: z.number().nullable().describe("Prix par nuit du lieu entier en euros, seulement s'il est affiché."),
        totalEstimateEur: z.number().nullable().describe("Coût total estimé pour les dates demandées, null si impossible."),
        priceBasis: z.string().nullable().describe("Origine du prix : « prix affiché pour ces dates », « à partir de … basse saison », « estimation »."),
        availability: z.string().nullable().describe("Disponibilité constatée pour les dates, sinon « à vérifier »."),
        matchReasons: z.array(z.string()).describe("Pourquoi ce lieu correspond aux critères (3 max)."),
        watchOuts: z.array(z.string()).describe("Points de vigilance (accès, saison, capacité, conditions…)."),
        accessInfo: z.string().nullable().describe("Aéroport / gare le plus proche et temps de trajet."),
        url: z.string().nullable().describe("Page officielle ou annonce du lieu, réellement trouvée."),
        sourceUrls: z.array(z.string()).describe("Pages consultées qui justifient les informations."),
        confidence: z.enum(["haute", "moyenne", "faible"]).describe("Fiabilité des informations (prix, capacité, disponibilité)."),
      }),
    )
    .describe(`Au plus ${MAX_VENUES} lieux réels, du plus pertinent au moins pertinent.`),
});

const SYSTEM = `Tu es l'assistant de sourcing de lieux de StartupWeek, organisme de formation qui organise des bootcamps entrepreneuriaux de 7 jours (« StartupWeek ») pour 10 à 12 porteurs de projet, plus 2 à 4 personnes d'encadrement, dans des lieux privatisés : villas, domaines, riads, chalets, châteaux.

Besoins habituels d'une session :
- location du lieu entier (pas de chambres d'hôtel dispersées), assez de couchages ;
- un espace pour travailler ensemble toute la journée (salle, grand séjour, grande table), un wifi fiable ;
- accès simple depuis un aéroport ou une gare (idéalement moins d'1 h), cadre calme et inspirant ;
- un bon rapport qualité/prix : on compare le coût total et le coût par participant.

Méthode :
1. Utilise la recherche web pour trouver des lieux RÉELS, actuellement proposés à la location (site officiel, agence ou plateforme de location), qui correspondent aux critères.
2. Ne propose jamais un lieu, un prix, une capacité ou une URL que tu n'as pas vus dans les résultats. Si une information manque, mets null et signale-le dans les points de vigilance.
3. Les disponibilités sont rarement vérifiables en ligne : écris « à vérifier » sauf si un calendrier ou une page les confirme.
4. Écarte les lieux listés comme déjà connus de l'équipe.
5. Rends au plus ${MAX_VENUES} lieux, du plus pertinent au moins pertinent (liste vide si rien de fiable). Rédige en français.`;

function describe(c: Criteria): string {
  const lines = [
    `Destination : ${c.destination}${c.region ? ` (zone : ${c.region})` : ""}`,
    c.startDate || c.endDate ? `Dates : ${c.startDate ?? "?"} → ${c.endDate ?? "?"} (arrivée la veille du premier jour)` : "Dates : flexibles",
    `Personnes à loger : ${c.people}`,
    c.bedroomsMin ? `Chambres minimum : ${c.bedroomsMin}` : null,
    c.budgetPerNightEur ? `Budget indicatif : ${c.budgetPerNightEur} € par nuit pour le lieu entier` : null,
    c.kinds.length ? `Types de lieux souhaités : ${c.kinds.join(", ")}` : null,
    c.mustHaves.length ? `Indispensables : ${c.mustHaves.join(", ")}` : null,
    c.notes ? `Précisions de l'équipe : ${c.notes}` : null,
    c.exclude.length ? `Lieux déjà connus (à ne pas proposer) : ${c.exclude.join(" ; ")}` : null,
  ];
  return `Trouve des lieux pour une prochaine session StartupWeek.\n\n${lines.filter(Boolean).join("\n")}`;
}

/** Erreurs AI Gateway / fournisseur → réponse lisible (sans détail technique ni secret). */
function mapError(err: unknown): VenueSearchResponse | undefined {
  if (NoObjectGeneratedError.isInstance(err)) {
    return err.finishReason === "content-filter"
      ? { ok: false, error: "refused", message: "La recherche a été refusée par le modèle. Reformulez les critères." }
      : { ok: false, error: "no_result", message: "L'assistant n'a pas rendu de sélection exploitable. Réessayez avec des critères plus larges." };
  }
  const e = err as { name?: string; statusCode?: number };
  if (e?.name === "GatewayAuthenticationError" || e?.statusCode === 401) {
    return { ok: false, error: "not_configured", message: "AI Gateway refuse l'authentification : vérifiez AI_GATEWAY_API_KEY (ou l'OIDC du projet Vercel)." };
  }
  if (e?.name === "GatewayRateLimitError" || e?.statusCode === 429) return { ok: false, error: "rate_limited", message: "Trop de recherches en cours côté AI Gateway : réessayez dans une minute." };
  if (e?.name === "GatewayModelNotFoundError") return { ok: false, error: "upstream", message: `Modèle « ${VENUE_SEARCH_MODEL} » indisponible sur AI Gateway.` };
  if (e?.name === "TimeoutError" || e?.name === "AbortError") return { ok: false, error: "upstream", message: "La recherche a pris trop de temps. Réessayez avec une destination plus précise." };
  if (e?.name?.startsWith("Gateway") || e?.name?.startsWith("AI_")) return { ok: false, error: "upstream", message: `Le service d'IA a répondu une erreur${e.statusCode ? ` (${e.statusCode})` : ""}. Réessayez.` };
  return undefined;
}

export async function searchVenues(criteria: Criteria): Promise<VenueSearchResponse> {
  let result;
  try {
    result = await generateText({
      model: VENUE_SEARCH_MODEL,
      system: SYSTEM,
      prompt: describe(criteria),
      tools: { web_search: openai.tools.webSearch({ searchContextSize: "medium" }) },
      output: Output.object({ schema: reportSchema }),
      // Recherche web exécutée côté fournisseur + étape de sortie structurée.
      stopWhen: isStepCount(4),
      abortSignal: AbortSignal.timeout(280_000),
    });
  } catch (err) {
    const mapped = mapError(err);
    if (mapped) return mapped;
    throw err;
  }

  const searches = result.steps.flatMap((s) => s.content).filter((p) => p.type === "tool-call" && p.toolName === "web_search").length;
  const suggestions: VenueSuggestion[] = [];
  for (const v of result.output.venues.slice(0, MAX_VENUES)) {
    const parsed = suggestionSchema.safeParse(v);
    if (parsed.success) suggestions.push(parsed.data);
  }
  const summary = result.output.summary.slice(0, 1200);
  if (!suggestions.length) return { ok: false, error: "no_result", message: summary || "Aucun lieu fiable trouvé pour ces critères." };
  return { ok: true, summary, suggestions, searches, model: VENUE_SEARCH_MODEL };
}
