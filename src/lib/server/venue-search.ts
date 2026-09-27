/**
 * Recherche de lieux assistée par IA (serveur uniquement) : Claude + recherche web.
 *
 * - Modèle : claude-opus-5, réflexion adaptative, outil serveur `web_search_20260209`
 *   (recherches bornées par `max_uses`) puis outil client `report_venues` qui rend
 *   les résultats dans un format exploitable (validé par zod, entrée par entrée).
 * - Refus du modèle : repli serveur automatique (`fallbacks: "default"`).
 * - `pause_turn` (tour long de l'outil de recherche) : relance en renvoyant le tour.
 * - Clé : ANTHROPIC_API_KEY (jamais exposée au navigateur). Absente ⇒ « not_configured ».
 *
 * Les prix et disponibilités trouvés en ligne sont des indications : l'interface
 * le rappelle, et chaque suggestion est ajoutée au répertoire au statut « Repéré ».
 */
import Anthropic from "@anthropic-ai/sdk";
import type { BetaContentBlock, BetaMessageParam, BetaTool } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { suggestionSchema, type VenueSearchResponse, type VenueSuggestion } from "@/features/programmes/lib/venue-search";
import type { z } from "zod";
import type { criteriaSchema } from "@/features/programmes/lib/venue-search";

type Criteria = z.output<typeof criteriaSchema>;

export const VENUE_SEARCH_MODEL = "claude-opus-5";
const MAX_SEARCHES = 8;
const MAX_CONTINUATIONS = 3;

export function isVenueSearchConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const REPORT_TOOL: BetaTool = {
  name: "report_venues",
  description:
    "Rend la sélection finale de lieux à l'équipe StartupWeek. À appeler une seule fois, après les recherches web, avec au plus 6 lieux réels trouvés en ligne. Ne jamais inventer un lieu, un prix ou une URL.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "Synthèse en 2-3 phrases : ce qui a été trouvé, fourchette de prix, points d'attention (disponibilités à confirmer…)." },
      venues: {
        type: "array",
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nom exact du lieu tel qu'affiché sur son site ou son annonce." },
            kind: { type: "string", enum: ["villa", "chateau", "chalet", "domaine", "riad", "hotel", "gite", "tiers_lieu", "autre"] },
            city: { type: "string" },
            country: { type: "string" },
            region: { type: "string", enum: ["France", "Europe", "Hors Europe"] },
            description: { type: "string", description: "2 phrases factuelles sur le lieu." },
            beds: { type: ["integer", "null"], description: "Nombre de couchages annoncé, null si inconnu." },
            bedrooms: { type: ["integer", "null"], description: "Nombre de chambres annoncé, null si inconnu." },
            workspace: { type: ["string", "null"], description: "Espace pour travailler à 10-15 (salle, grand séjour, table…), null si rien d'indiqué." },
            pricePerNightEur: { type: ["number", "null"], description: "Prix par nuit du lieu entier en euros, uniquement s'il est affiché ; null sinon." },
            totalEstimateEur: { type: ["number", "null"], description: "Coût total estimé pour les dates demandées (hors options), null si impossible à estimer." },
            priceBasis: { type: ["string", "null"], description: "D'où vient le prix : « prix affiché pour ces dates », « à partir de … basse saison », « estimation »…" },
            availability: { type: ["string", "null"], description: "Disponibilité constatée pour les dates, sinon « à vérifier »." },
            matchReasons: { type: "array", items: { type: "string" }, description: "Pourquoi ce lieu correspond aux critères (3 max)." },
            watchOuts: { type: "array", items: { type: "string" }, description: "Points de vigilance (accès, saison, capacité, conditions…)." },
            accessInfo: { type: ["string", "null"], description: "Aéroport / gare le plus proche et temps de trajet." },
            url: { type: ["string", "null"], description: "Page officielle ou annonce du lieu (URL réellement trouvée)." },
            sourceUrls: { type: "array", items: { type: "string" }, description: "Pages consultées qui justifient les informations." },
            confidence: { type: "string", enum: ["haute", "moyenne", "faible"], description: "Fiabilité des informations (prix, capacité, disponibilité)." },
          },
          required: ["name", "kind", "city", "country", "region", "description", "matchReasons", "watchOuts", "sourceUrls", "confidence"],
        },
      },
    },
    required: ["summary", "venues"],
  },
};

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
5. Termine en appelant l'outil report_venues une seule fois, avec au plus 6 lieux classés du plus pertinent au moins pertinent. Rédige en français.`;

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

function toolInput(content: BetaContentBlock[]): unknown {
  for (const b of content) if (b.type === "tool_use" && b.name === REPORT_TOOL.name) return b.input;
  return undefined;
}

export async function searchVenues(criteria: Criteria): Promise<VenueSearchResponse> {
  const client = new Anthropic();
  const messages: BetaMessageParam[] = [{ role: "user", content: describe(criteria) }];
  let searches = 0;
  let nudged = false;

  for (let turn = 0; turn <= MAX_CONTINUATIONS + 1; turn++) {
    let message;
    try {
      message = await client.beta.messages
        .stream({
          model: VENUE_SEARCH_MODEL,
          max_tokens: 32000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          thinking: { type: "adaptive" },
          system: SYSTEM,
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES }, REPORT_TOOL],
          tool_choice: { type: "auto" },
          messages,
        })
        .finalMessage();
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) return { ok: false, error: "not_configured", message: "Clé API Anthropic invalide : vérifiez ANTHROPIC_API_KEY." };
      if (err instanceof Anthropic.RateLimitError) return { ok: false, error: "rate_limited", message: "Trop de recherches en cours côté Anthropic : réessayez dans une minute." };
      if (err instanceof Anthropic.APIError) return { ok: false, error: "upstream", message: `Le service d'IA a répondu une erreur (${err.status ?? "réseau"}). Réessayez.` };
      throw err;
    }
    searches += message.usage.server_tool_use?.web_search_requests ?? 0;

    if (message.stop_reason === "refusal") return { ok: false, error: "refused", message: "La recherche a été refusée par le modèle. Reformulez les critères." };

    const input = toolInput(message.content);
    if (input !== undefined) return parseReport(input, searches);

    if (message.stop_reason === "pause_turn") {
      // Tour long de l'outil de recherche : on renvoie le tour pour qu'il continue.
      messages.push({ role: "assistant", content: message.content });
      continue;
    }
    if (message.stop_reason === "max_tokens") return { ok: false, error: "upstream", message: "Réponse trop longue : restreignez la recherche (destination plus précise)." };
    if (!nudged) {
      // Fin de tour sans appel à report_venues : un seul rappel.
      nudged = true;
      messages.push({ role: "assistant", content: message.content });
      messages.push({ role: "user", content: "Appelle maintenant l'outil report_venues avec ta sélection (liste vide si rien de fiable)." });
      continue;
    }
    break;
  }
  return { ok: false, error: "no_result", message: "L'assistant n'a pas rendu de sélection. Réessayez avec des critères plus larges." };
}

function parseReport(input: unknown, searches: number): VenueSearchResponse {
  const raw = (input ?? {}) as { summary?: unknown; venues?: unknown };
  const suggestions: VenueSuggestion[] = [];
  for (const v of Array.isArray(raw.venues) ? raw.venues : []) {
    const parsed = suggestionSchema.safeParse(v);
    if (parsed.success) suggestions.push(parsed.data);
  }
  const summary = typeof raw.summary === "string" ? raw.summary.slice(0, 1200) : "";
  if (!suggestions.length) return { ok: false, error: "no_result", message: summary || "Aucun lieu fiable trouvé pour ces critères." };
  return { ok: true, summary, suggestions, searches, model: VENUE_SEARCH_MODEL };
}
