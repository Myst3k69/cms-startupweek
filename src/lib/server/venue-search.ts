/**
 * Recherche de lieux assistée par IA (serveur uniquement) : Vercel AI Gateway + GPT-6 Luna.
 *
 * - AI SDK (`generateText`) : modèle `openai/gpt-6-luna` routé par AI Gateway, outil de
 *   recherche web natif d'OpenAI (`openai.tools.webSearch`, exécuté côté fournisseur),
 *   sortie structurée (`Output.object`) validée par zod puis nettoyée entrée par entrée.
 * - Recherche large : plateformes de location (Airbnb, Booking.com, Vrbo…), plateformes de
 *   lieux de séminaire, recherches générales dans la langue du pays, puis site du lieu.
 * - Au moins 3 lieux visés : si la première recherche en trouve moins, une seconde recherche
 *   élargit la zone, les types de lieux puis le budget ; ces lieux sont marqués « élargis »
 *   avec leurs écarts aux critères de départ.
 * - Authentification AI Gateway : sur Vercel, jeton OIDC du projet (aucune clé à gérer) ;
 *   ailleurs (développement local), variable AI_GATEWAY_API_KEY.
 * - Modèle : choisi dans l'assistant parmi les modèles compatibles du catalogue AI Gateway
 *   (src/lib/server/venue-models.ts) ; par défaut VENUE_SEARCH_MODEL (openai/gpt-6-luna).
 *   Recherche web native d'OpenAI pour les modèles OpenAI, Perplexity Search (AI Gateway) sinon.
 *
 * Les prix et disponibilités trouvés en ligne sont des indications : l'interface le rappelle,
 * et chaque suggestion est ajoutée au répertoire au statut « Repéré ».
 */
import { gateway, generateText, isStepCount, NoObjectGeneratedError, Output, type LanguageModel, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { REGION_VALUES, VENUE_KIND_VALUES, suggestionSchema, type criteriaSchema, type VenueSearchResponse, type VenueSearchTool, type VenueSuggestion } from "@/features/programmes/lib/venue-search";

type Criteria = z.output<typeof criteriaSchema>;

export const VENUE_SEARCH_MODEL = process.env.VENUE_SEARCH_MODEL || "openai/gpt-6-luna";
const MAX_VENUES = 6;
const MIN_VENUES = 3;
/** Budget total (la route a maxDuration = 300 s) : première recherche, puis seconde si le temps restant le permet. */
const DEADLINE_MS = 280_000;
const FIRST_PASS_MS = 200_000;
const MIN_SECOND_PASS_MS = 60_000;

/** AI Gateway joignable : clé explicite, ou déploiement Vercel (OIDC fourni à l'exécution). */
export function isVenueSearchConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL === "1");
}

// Sortie structurée : tous les champs présents (null si inconnu) — compatible avec le mode strict d'OpenAI.
const reportSchema = z.object({
  summary: z.string().describe("Synthèse en 2-3 phrases : ce qui a été trouvé, où, fourchette de prix, points d'attention."),
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
        watchOuts: z.array(z.string()).describe("Points de vigilance (accès, saison, capacité, informations à vérifier…)."),
        criteriaGaps: z.array(z.string()).describe("Écarts avérés aux critères de départ (zone, type, budget, indispensable absent). Liste vide si aucun."),
        accessInfo: z.string().nullable().describe("Aéroport / gare le plus proche et temps de trajet."),
        foundOn: z.string().nullable().describe("Site où le lieu est proposé : « Airbnb », « Booking.com », « Spacebase », « site officiel »…"),
        url: z.string().nullable().describe("Page officielle ou annonce du lieu, réellement trouvée."),
        sourceUrls: z.array(z.string()).describe("Pages consultées qui justifient les informations."),
        confidence: z.enum(["haute", "moyenne", "faible"]).describe("Fiabilité des informations (prix, capacité, disponibilité)."),
      }),
    )
    .describe(`De ${MIN_VENUES} à ${MAX_VENUES} lieux réels, du plus pertinent au moins pertinent.`),
});
type Report = z.output<typeof reportSchema>;

const SYSTEM = `Tu es l'assistant de sourcing de lieux de StartupWeek, organisme de formation qui organise des bootcamps entrepreneuriaux de 7 jours (« StartupWeek ») pour 10 à 12 porteurs de projet, plus 2 à 4 personnes d'encadrement, dans des lieux privatisés : villas, domaines, riads, chalets, châteaux, maisons de groupe.

Besoins habituels d'une session :
- location du lieu entier (pas de chambres d'hôtel dispersées), assez de couchages ;
- un espace pour travailler ensemble toute la journée (salle, grand séjour, grande table), un wifi fiable ;
- accès simple depuis un aéroport ou une gare (idéalement moins d'1 h), cadre calme et inspirant ;
- un bon rapport qualité/prix : on compare le coût total et le coût par participant.

Méthode : fais au moins 8 recherches web distinctes, réparties entre ces familles de sources.
1. Plateformes de location de logements entiers : Airbnb, Booking.com (villas, maisons de vacances), Vrbo / Abritel, et les plateformes locales du pays (par exemple Escapada Rural ou Clubrural en Espagne, Gîtes de France, agriturismo.it en Italie).
2. Lieux de séminaire, d'offsite et de retraite d'équipe : Spacebase, Tagvenue, Kactus, Bird Office, et les domaines ou hôtels qui se privatisent pour des groupes.
3. Recherches générales, comme sur Google, en français, en anglais ET dans la langue du pays (par exemple « casa rural para grupos 14 personas cerca de Madrid », « villa for 14 guests team retreat near Madrid », « domaine séminaire résidentiel 12 personnes »).
4. Pour chaque lieu retenu, sa page officielle ou son annonce, pour confirmer capacité, espace de travail, prix et accès.
Un même lieu trouvé sur plusieurs sites = une seule entrée, avec toutes ses sources.

Règles :
- Ne propose jamais un lieu, un prix, une capacité ou une URL que tu n'as pas vus dans les résultats. Si une information manque, mets null et signale-la dans les points de vigilance.
- Une information introuvable en ligne (fibre, prix pour ces dates, disponibilité) n'élimine pas un lieu : note-la « à vérifier ». Écarte seulement les lieux qui contredisent un critère (capacité insuffisante, trop loin, pas de location du lieu entier).
- Les disponibilités sont rarement vérifiables en ligne : écris « à vérifier » sauf si un calendrier ou une page les confirme.
- N'inclus jamais les lieux listés comme déjà connus de l'équipe.
- Rends de ${MIN_VENUES} à ${MAX_VENUES} lieux, du plus pertinent au moins pertinent, en indiquant pour chacun le site où il est proposé. Rédige en français.`;

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

/** Seconde recherche : mêmes critères, élargis dans un ordre fixe, sans reproposer les lieux déjà trouvés. */
function describeWidened(c: Criteria, found: VenueSuggestion[]): string {
  const already = found.length ? ` : ${found.map((f) => `${f.name} (${f.city})`).join(" ; ")}. Ne les repropose pas` : "";
  return [
    describe(c),
    "",
    `SECONDE RECHERCHE, ÉLARGIE. La première recherche n'a trouvé que ${found.length} lieu${found.length > 1 ? "x" : ""} pour ces critères${already}.`,
    `Trouve au moins ${MIN_VENUES - found.length} autre${MIN_VENUES - found.length > 1 ? "s" : ""} lieu${MIN_VENUES - found.length > 1 ? "x" : ""}, idéalement ${MAX_VENUES - found.length}, en élargissant dans cet ordre, seulement autant que nécessaire :`,
    "1. la zone : jusqu'à environ 1,5 fois la distance ou le temps de trajet demandés, villes et régions voisines comprises ;",
    "2. les types de lieux : tout lieu louable en entier par un groupe (domaine, hôtel privatisable, gîte de groupe, casa rural, masseria, quinta…) ;",
    "3. le budget : jusqu'à 30 % au-dessus.",
    "Garde le nombre de personnes et les dates. Pour chaque lieu, liste dans criteriaGaps ce qui s'écarte des critères de départ (par exemple « 1 h 05 du centre au lieu de 45 min »).",
  ].join("\n");
}

/** Erreurs AI Gateway / fournisseur → réponse lisible (sans détail technique ni secret). */
function mapError(err: unknown, modelId: string): Extract<VenueSearchResponse, { ok: false }> | undefined {
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
  if (e?.name === "GatewayModelNotFoundError") return { ok: false, error: "upstream", message: `Modèle « ${modelId} » indisponible sur AI Gateway : choisissez-en un autre.` };
  if (e?.name === "TimeoutError" || e?.name === "AbortError") return { ok: false, error: "upstream", message: "La recherche a pris trop de temps. Réessayez avec une destination plus précise." };
  if (e?.name?.startsWith("Gateway") || e?.name?.startsWith("AI_")) return { ok: false, error: "upstream", message: `Le service d'IA a répondu une erreur${e.statusCode ? ` (${e.statusCode})` : ""}. Réessayez.` };
  return undefined;
}

function searchTools(search: VenueSearchTool): ToolSet {
  return search === "openai"
    ? { web_search: openai.tools.webSearch({ searchContextSize: "high" }) }
    : { web_search: gateway.tools.perplexitySearch({ maxResults: 10 }) };
}

async function runPass(model: LanguageModel, search: VenueSearchTool, prompt: string, timeoutMs: number): Promise<{ report: Report; searches: number }> {
  const result = await generateText({
    model,
    system: SYSTEM,
    prompt,
    tools: searchTools(search),
    output: Output.object({ schema: reportSchema }),
    // Recherche web exécutée côté fournisseur + étape de sortie structurée.
    stopWhen: isStepCount(4),
    abortSignal: AbortSignal.timeout(timeoutMs),
  });
  const searches = result.steps.flatMap((s) => s.content).filter((p) => p.type === "tool-call" && p.toolName === "web_search").length;
  return { report: result.output, searches };
}

const nameKey = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Suggestions valides, sans doublon (même nom), dans la limite donnée. */
function collect(report: Report, widened: boolean, seen: Set<string>, limit: number): VenueSuggestion[] {
  const out: VenueSuggestion[] = [];
  for (const v of report.venues) {
    if (out.length >= limit) break;
    const parsed = suggestionSchema.safeParse({ ...v, widened });
    if (!parsed.success) continue;
    const key = nameKey(parsed.data.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed.data);
  }
  return out;
}

/** `model` / `search` : modèle retenu par resolveVenueModel (ou un modèle simulé en test). */
export async function searchVenues(criteria: Criteria, opts: { model?: LanguageModel; search?: VenueSearchTool } = {}): Promise<VenueSearchResponse> {
  const model = opts.model ?? VENUE_SEARCH_MODEL;
  const modelId = typeof model === "string" ? model : model.modelId;
  const search = opts.search ?? "openai";
  const started = Date.now();
  const seen = new Set<string>();
  const suggestions: VenueSuggestion[] = [];
  const summaries: string[] = [];
  let searches = 0;

  try {
    const first = await runPass(model, search, describe(criteria), FIRST_PASS_MS);
    searches += first.searches;
    suggestions.push(...collect(first.report, false, seen, MAX_VENUES));
    if (first.report.summary.trim()) summaries.push(first.report.summary.trim().slice(0, 1200));
  } catch (err) {
    const mapped = mapError(err, modelId);
    // Sélection inexploitable : la recherche élargie peut encore aboutir. Toute autre erreur est rendue telle quelle.
    if (mapped?.error !== "no_result") {
      if (mapped) return mapped;
      throw err;
    }
  }

  let widened = false;
  const remaining = DEADLINE_MS - (Date.now() - started);
  if (suggestions.length < MIN_VENUES && remaining >= MIN_SECOND_PASS_MS) {
    try {
      const second = await runPass(model, search, describeWidened(criteria, suggestions), remaining);
      searches += second.searches;
      const extra = collect(second.report, true, seen, MAX_VENUES - suggestions.length);
      if (extra.length) {
        widened = true;
        suggestions.push(...extra);
        if (second.report.summary.trim()) summaries.push(`Recherche élargie : ${second.report.summary.trim().slice(0, 1000)}`);
      }
    } catch (err) {
      // Les lieux de la première recherche restent affichés ; sans eux, l'erreur est rendue.
      console.warn("[lieux/recherche] recherche élargie en échec", err);
      if (!suggestions.length) {
        const mapped = mapError(err, modelId);
        if (mapped) return mapped;
        throw err;
      }
    }
  }

  const summary = summaries.join("\n\n");
  if (!suggestions.length) return { ok: false, error: "no_result", message: summary || "Aucun lieu fiable trouvé pour ces critères, même en élargissant la recherche." };
  return { ok: true, summary, suggestions, searches, model: modelId, widened };
}
