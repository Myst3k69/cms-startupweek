/**
 * Libellés propres au module Programmes (candidatures, sessions, projets, intervenants)
 * qui ne figurent pas dans les constantes partagées.
 */
import type { Option, Tone } from "@/lib/domain/constants";
import type { Application, EventSession, LeadStage, Project, Region, Speaker } from "@/lib/domain/types";

export const ENTREPRENEURIAL_XP: Option<Application["entrepreneurialXp"]>[] = [
  { value: "aucune", label: "Aucune expérience" },
  { value: "premiere", label: "Premier projet" },
  { value: "quelques", label: "Quelques projets menés" },
  { value: "experimente", label: "Entrepreneur expérimenté" },
  { value: "serial", label: "Serial entrepreneur" },
];

export const TECHNICAL_XP: Option<Application["technicalXp"]>[] = [
  { value: "debutant", label: "Débutant" },
  { value: "basique", label: "Notions de base" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "avance", label: "Avancé" },
  { value: "expert", label: "Expert" },
];

/** Étapes du tunnel de candidature du site (leadStage) dans l'ordre. */
export const LEAD_FUNNEL: { value: Exclude<LeadStage, "out_of_scope">; label: string; hint: string }[] = [
  { value: "capture", label: "Capture", hint: "Email + intention laissés sur le site" },
  { value: "qualification", label: "Qualification", hint: "Questionnaire projet complété" },
  { value: "booking", label: "Booking", hint: "Créneau d'appel / diagnostic réservé" },
  { value: "enrichment", label: "Enrichissement", hint: "Dossier complet (motivation, budget, disponibilités)" },
];

export const INTENTS: Option<Application["intent"]>[] = [
  { value: "candidature", label: "Candidature" },
  { value: "diagnostic", label: "Diagnostic MVP" },
];

export const PROJECT_HEALTH: Option<Project["health"]>[] = [
  { value: "on_track", label: "Sur les rails", tone: "success" },
  { value: "a_risque", label: "À risque", tone: "warning" },
  { value: "bloque", label: "Bloqué", tone: "danger" },
  { value: "en_pause", label: "En pause", tone: "neutral" },
];

export const CONTRACT_TYPES: Option<Speaker["contractType"]>[] = [
  { value: "salarie", label: "Salarié" },
  { value: "freelance", label: "Freelance" },
  { value: "benevole", label: "Bénévole" },
];

export const EVENT_FORMATS: Option<EventSession["format"]>[] = [
  { value: "semaine", label: "Semaine (7 jours)" },
  { value: "week_end", label: "Week-end" },
  { value: "journee", label: "Journée" },
  { value: "mois", label: "Mois" },
];

export const REGIONS: Option<Region>[] = [
  { value: "France", label: "France" },
  { value: "Europe", label: "Europe" },
  { value: "Hors Europe", label: "Hors Europe" },
];

export const HALF_DAYS: { value: "matin" | "apres_midi"; label: string; short: string }[] = [
  { value: "matin", label: "Matin", short: "AM" },
  { value: "apres_midi", label: "Après-midi", short: "PM" },
];

/** Pastille de score (0-100) : tonalité + libellé. */
export function scoreTone(score: number): Tone {
  if (score >= 75) return "success";
  if (score >= 55) return "info";
  if (score >= 35) return "warning";
  return "danger";
}

const eurInt = (n: string) => Number(n).toLocaleString("fr-FR");

/**
 * Budget déclaré dans le tunnel du site → libellé FR.
 * Valeurs rencontrées : « moins-990 », « 990-1500 », « 1500-2500 », « plus-2500 », « finance », « employeur »…
 */
export function budgetLabel(value?: string | null): string {
  if (!value) return "Non renseigné";
  const v = value.trim().toLowerCase();
  const known: Record<string, string> = {
    financement: "Financement externe (OPCO, France Travail…)",
    finance: "Financement externe (OPCO, France Travail…)",
    opco: "Prise en charge OPCO",
    employeur: "Pris en charge par l'employeur",
    entreprise: "Pris en charge par l'entreprise",
    "a-definir": "À définir",
    "ne-sait-pas": "Ne sait pas encore",
    nsp: "Ne sait pas encore",
  };
  if (known[v]) return known[v];
  let m = /^moins-(?:de-)?(\d+)$/.exec(v);
  if (m) return `Moins de ${eurInt(m[1])} €`;
  m = /^(?:plus|\+)-?(?:de-)?(\d+)$/.exec(v);
  if (m) return `Plus de ${eurInt(m[1])} €`;
  m = /^(\d+)-(\d+)$/.exec(v);
  if (m) return `De ${eurInt(m[1])} à ${eurInt(m[2])} €`;
  if (/^\d+$/.test(v)) return `${eurInt(v)} €`;
  return value;
}

/** Préfixe de code session selon le type d'événement. */
export function codePrefix(kind: EventSession["kind"]): string {
  switch (kind) {
    case "startup_week":
      return "SW";
    case "startup_village":
      return "SV";
    case "evenement_entreprise":
      return "IS";
    case "webinaire":
      return "WEB";
    case "demo_day":
      return "DD";
    default:
      return "EV";
  }
}
