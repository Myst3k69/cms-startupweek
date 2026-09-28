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
const optStr = z.preprocess((v) => (v === null ? undefined : v), z.string().trim().max(600).optional());
const urlStr = z.string().trim().max(500).refine((v) => /^https?:\/\/\S+$/i.test(v));

export const suggestionSchema = z.object({
  name: z.string().trim().min(2).max(160),
  kind: z.preprocess((v) => (VENUE_KIND_VALUES as readonly string[]).includes(String(v)) ? v : "autre", z.enum(VENUE_KIND_VALUES)),
  city: z.string().trim().max(120).default(""),
  country: z.string().trim().max(80).default(""),
  region: z.preprocess((v) => (REGION_VALUES as readonly string[]).includes(String(v)) ? v : "Europe", z.enum(REGION_VALUES)),
  description: z.string().trim().max(800).default(""),
  beds: optInt,
  bedrooms: optInt,
  workspace: optStr,
  pricePerNightEur: optNum,
  totalEstimateEur: optNum,
  priceBasis: optStr,
  availability: optStr,
  matchReasons: z.array(z.string().trim().max(240)).max(8).default([]),
  watchOuts: z.array(z.string().trim().max(240)).max(8).default([]),
  accessInfo: optStr,
  url: z.preprocess((v) => (typeof v === "string" && /^https?:\/\//i.test(v.trim()) ? v : undefined), urlStr.optional()),
  sourceUrls: z.preprocess((v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && /^https?:\/\//i.test(x.trim())) : []), z.array(urlStr).max(8)),
  confidence: z.preprocess((v) => (v === "haute" || v === "moyenne" || v === "faible" ? v : "faible"), z.enum(["haute", "moyenne", "faible"])),
});

export type VenueSuggestion = z.infer<typeof suggestionSchema>;

export type VenueSearchResponse =
  | { ok: true; summary: string; suggestions: VenueSuggestion[]; searches: number; model: string; demo?: boolean }
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
      accessInfo: "Aéroport à 35 min (exemple)",
      sourceUrls: [],
      confidence: "faible",
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
      accessInfo: "Gare à 25 min (exemple)",
      sourceUrls: [],
      confidence: "faible",
    },
  ];
}
