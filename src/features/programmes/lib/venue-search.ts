/**
 * Assistant IA de sourcing de lieux — contrat partagé navigateur / serveur
 * (critères de recherche, suggestions renvoyées, validation).
 * L'appel au modèle vit côté serveur : src/lib/server/venue-search.ts (POST /api/lieux/recherche).
 */
import { z } from "zod";
import type { Region, VenueKind } from "@/lib/domain/types";

export const VENUE_KIND_VALUES = ["villa", "chateau", "chalet", "domaine", "riad", "hotel", "gite", "tiers_lieu", "autre"] as const satisfies readonly VenueKind[];
export const REGION_VALUES = ["France", "Europe", "Hors Europe"] as const satisfies readonly Region[];

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date au format AAAA-MM-JJ");

export const criteriaSchema = z
  .object({
    destination: z.string().trim().min(2, "Indiquez une destination (ville, région, côte…)").max(160),
    region: z.enum(REGION_VALUES).optional(),
    startDate: ymd.optional(),
    endDate: ymd.optional(),
    people: z.number().int().min(2, "Au moins 2 personnes").max(80),
    bedroomsMin: z.number().int().min(1).max(40).optional(),
    budgetPerNightEur: z.number().min(0).max(100_000).optional(),
    kinds: z.array(z.enum(VENUE_KIND_VALUES)).max(9).default([]),
    mustHaves: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
    notes: z.string().trim().max(800).optional(),
    exclude: z.array(z.string().trim().max(120)).max(80).default([]),
  })
  .refine((c) => !c.startDate || !c.endDate || c.endDate >= c.startDate, { message: "La date de fin précède la date de début", path: ["endDate"] });

export type VenueSearchCriteria = z.input<typeof criteriaSchema>;

const optNum = z.preprocess((v) => (v === null || v === "" ? undefined : typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : v), z.number().finite().nonnegative().optional());
const optInt = z.preprocess((v) => (v === null || v === "" ? undefined : typeof v === "string" ? Number.parseInt(v, 10) : v), z.number().int().nonnegative().optional());
const optStr = z.preprocess((v) => (v === null ? undefined : typeof v === "string" ? v.trim().slice(0, 600) : v), z.string().optional());
const urlStr = z.string().trim().max(500).refine((v) => /^https?:\/\/\S+$/i.test(v));
const isUrl = (v: unknown): v is string => typeof v === "string" && v.trim().length <= 500 && /^https?:\/\/\S+$/i.test(v.trim());
/** Texte tronqué plutôt que rejeté : un champ trop long ne doit pas faire écarter tout le lieu. */
const clipped = (max: number) => z.preprocess((v) => (typeof v === "string" ? v.trim().slice(0, max) : v), z.string());
/** Liste de textes courts, tronquée au besoin (même raison). */
const textList = (maxItems: number) =>
  z.preprocess((v) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").slice(0, maxItems).map((x) => x.trim().slice(0, 240)) : []), z.array(z.string()));

export const suggestionSchema = z.object({
  name: z.string().trim().min(2).max(160),
  kind: z.preprocess((v) => (VENUE_KIND_VALUES as readonly string[]).includes(String(v)) ? v : "autre", z.enum(VENUE_KIND_VALUES)),
  city: z.string().trim().max(120).default(""),
  country: z.string().trim().max(80).default(""),
  region: z.preprocess((v) => (REGION_VALUES as readonly string[]).includes(String(v)) ? v : "Europe", z.enum(REGION_VALUES)),
  description: clipped(800).default(""),
  beds: optInt,
  bedrooms: optInt,
  workspace: optStr,
  pricePerNightEur: optNum,
  totalEstimateEur: optNum,
  priceBasis: optStr,
  availability: optStr,
  matchReasons: textList(8),
  watchOuts: textList(8),
  /** Écarts aux critères de départ (lieux issus de la recherche élargie). */
  criteriaGaps: textList(6),
  accessInfo: optStr,
  /** Site où le lieu est proposé (Airbnb, Booking.com, Spacebase, site officiel…). */
  foundOn: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : undefined), z.string().optional()),
  url: z.preprocess((v) => (isUrl(v) ? v : undefined), urlStr.optional()),
  sourceUrls: z.preprocess((v) => (Array.isArray(v) ? v.filter(isUrl).slice(0, 8) : []), z.array(urlStr)),
  confidence: z.preprocess((v) => (v === "haute" || v === "moyenne" || v === "faible" ? v : "faible"), z.enum(["haute", "moyenne", "faible"])),
  /** Trouvé par la seconde recherche, élargie faute d'au moins 3 lieux conformes. */
  widened: z.boolean().default(false),
});

export type VenueSuggestion = z.infer<typeof suggestionSchema>;

export type VenueSearchResponse =
  | { ok: true; summary: string; suggestions: VenueSuggestion[]; searches: number; model: string; widened?: boolean; demo?: boolean }
  | { ok: false; error: "not_configured" | "unauthorized" | "forbidden" | "demo_mode" | "rate_limited" | "invalid" | "refused" | "no_result" | "upstream"; message: string };

/**
 * Exemples FICTIFS pour le mode démo (aucun appel au modèle) : montrent le rendu des résultats.
 * Clairement étiquetés comme tels dans l'interface.
 */
export function demoSuggestions(c: { destination: string; people: number }): VenueSuggestion[] {
  const where = c.destination.trim() || "votre destination";
  return [
    {
      name: "Villa Exemple Horizon (fictive)",
      kind: "villa",
      city: where,
      country: "",
      region: "Europe",
      description: "Exemple fictif : villa entière avec grand séjour transformable en salle de travail, piscine et terrasse.",
      beds: Math.max(12, c.people + 2),
      bedrooms: Math.ceil((c.people + 2) / 2),
      workspace: "Séjour de 60 m² avec grande table (14 places)",
      pricePerNightEur: 1100,
      totalEstimateEur: 8800,
      priceBasis: "Exemple — tarif fictif",
      availability: "À vérifier auprès du propriétaire",
      matchReasons: ["Capacité suffisante", "Espace de travail commun", "Wifi fibre annoncé"],
      watchOuts: ["Résultat fictif : lancez une vraie recherche une fois l'assistant configuré"],
      criteriaGaps: [],
      accessInfo: "Aéroport à 35 min (exemple)",
      foundOn: "Plateforme de location (exemple)",
      sourceUrls: [],
      confidence: "faible",
      widened: false,
    },
    {
      name: "Domaine Exemple des Oliviers (fictif)",
      kind: "domaine",
      city: where,
      country: "",
      region: "Europe",
      description: "Exemple fictif : domaine rural avec salle de séminaire et chef sur demande.",
      beds: Math.max(16, c.people + 4),
      bedrooms: 8,
      workspace: "Salle de séminaire de 20 places",
      pricePerNightEur: 950,
      totalEstimateEur: 7600,
      priceBasis: "Exemple — tarif fictif",
      availability: "À vérifier",
      matchReasons: ["Salle de séminaire dédiée", "Prix par participant bas"],
      watchOuts: ["Isolé : prévoir des navettes", "Résultat fictif"],
      criteriaGaps: [],
      accessInfo: "Gare à 25 min (exemple)",
      foundOn: "Site de lieux de séminaire (exemple)",
      sourceUrls: [],
      confidence: "faible",
      widened: false,
    },
    {
      name: "Maison de groupe Exemple du Vallon (fictive)",
      kind: "gite",
      city: `Près de ${where}`,
      country: "",
      region: "Europe",
      description: "Exemple fictif : grande maison de groupe trouvée par la recherche élargie, un peu plus loin que demandé.",
      beds: Math.max(14, c.people + 2),
      bedrooms: 7,
      workspace: "Grande salle commune (exemple)",
      pricePerNightEur: 780,
      totalEstimateEur: 6240,
      priceBasis: "Exemple — tarif fictif",
      availability: "À vérifier",
      matchReasons: ["Capacité suffisante", "Prix bas"],
      watchOuts: ["Résultat fictif"],
      criteriaGaps: ["1 h 05 du centre au lieu de 45 min (exemple)"],
      accessInfo: "Aéroport à 1 h 10 (exemple)",
      foundOn: "Recherche générale (exemple)",
      sourceUrls: [],
      confidence: "faible",
      widened: true,
    },
  ];
}
