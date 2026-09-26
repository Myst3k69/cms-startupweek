/** Libellés propres au module Qualiopi (complètent lib/domain/constants). */
import type { ActionOrigin, Complaint, Evidence, WatchItem } from "@/lib/domain/types";
import type { Option } from "@/lib/domain/constants";

export const ACTION_ORIGINS: Option<ActionOrigin>[] = [
  { value: "reclamation", label: "Réclamation", tone: "danger" },
  { value: "evaluation", label: "Évaluation / satisfaction", tone: "info" },
  { value: "audit_blanc", label: "Audit blanc", tone: "violet" },
  { value: "veille", label: "Veille", tone: "accent" },
  { value: "interne", label: "Revue interne", tone: "neutral" },
  { value: "intervenant", label: "Retour intervenant", tone: "success" },
];

export const COMPLAINT_CHANNELS: Option<Complaint["channel"]>[] = [
  { value: "formulaire", label: "Formulaire du site" },
  { value: "email", label: "Email" },
  { value: "telephone", label: "Téléphone" },
  { value: "oral", label: "Oral (sur place)" },
  { value: "evaluation", label: "Questionnaire d'évaluation" },
];

export const SEVERITIES: Option<Complaint["severity"]>[] = [
  { value: "mineure", label: "Mineure", tone: "neutral" },
  { value: "majeure", label: "Majeure", tone: "danger" },
];

export const WATCH_IMPACTS: Option<WatchItem["impact"]>[] = [
  { value: "aucun", label: "Aucun impact", tone: "neutral" },
  { value: "faible", label: "Impact faible", tone: "info" },
  { value: "moyen", label: "Impact moyen", tone: "warning" },
  { value: "fort", label: "Impact fort", tone: "danger" },
];

export const EVIDENCE_KINDS: Option<Evidence["kind"]>[] = [
  { value: "document", label: "Document" },
  { value: "lien", label: "Lien" },
  { value: "procedure", label: "Procédure" },
  { value: "enregistrement", label: "Enregistrement" },
];

/** Indicateur Qualiopi de chaque type de veille. */
export const WATCH_INDICATOR: Record<WatchItem["kind"], number> = { legale: 23, metiers: 24, pedagogique: 25, handicap: 26 };
