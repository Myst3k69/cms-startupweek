import type { Role } from "@/lib/domain/types";

/** Sections du back-office (une section = une entrée de navigation). */
export type Section =
  | "dashboard"
  | "demandes"
  | "contacts"
  | "organisations"
  | "pipeline"
  | "relances"
  | "emails"
  | "candidatures"
  | "projets"
  | "sessions"
  | "intervenants"
  | "qualiopi"
  | "facturation"
  | "ressources"
  | "contenus"
  | "analytics"
  | "automatisations"
  | "parametres";

export type Access = "none" | "read" | "write";

const ALL: Section[] = [
  "dashboard", "demandes", "contacts", "organisations", "pipeline", "relances", "emails", "candidatures", "projets",
  "sessions", "intervenants", "qualiopi", "facturation", "ressources", "contenus", "analytics", "automatisations", "parametres",
];

function matrix(write: Section[], read: Section[]): Record<Section, Access> {
  return Object.fromEntries(ALL.map((s) => [s, write.includes(s) ? "write" : read.includes(s) ? "read" : "none"])) as Record<Section, Access>;
}

/**
 * Matrice des droits par rôle. Même logique côté base : voir les policies RLS
 * de supabase/migrations/0002_rls.sql (fonction crm.has_access).
 */
export const PERMISSIONS: Record<Role, Record<Section, Access>> = {
  admin: matrix(ALL, []),
  commercial: matrix(
    ["dashboard", "demandes", "contacts", "organisations", "pipeline", "relances", "emails", "candidatures", "facturation"],
    ["projets", "sessions", "intervenants", "qualiopi", "ressources", "contenus", "analytics", "automatisations"],
  ),
  pedagogie: matrix(
    ["dashboard", "relances", "emails", "candidatures", "projets", "sessions", "intervenants", "qualiopi", "ressources", "contenus"],
    ["demandes", "contacts", "organisations", "pipeline", "facturation", "analytics", "automatisations"],
  ),
  formateur: matrix(["dashboard", "relances", "projets", "sessions"], ["candidatures", "ressources", "intervenants"]),
  lecture: matrix(["dashboard"], ALL.filter((s) => s !== "parametres")),
};

export function access(role: Role | undefined, section: Section): Access {
  if (!role) return "none";
  return PERMISSIONS[role][section];
}

export function canRead(role: Role | undefined, section: Section) {
  return access(role, section) !== "none";
}

export function canWrite(role: Role | undefined, section: Section) {
  return access(role, section) === "write";
}
