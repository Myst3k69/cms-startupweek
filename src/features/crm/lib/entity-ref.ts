/**
 * Liens croisés génériques vers n'importe quelle entité (EntityRef) :
 * tâches, emails, activité… pointent vers la bonne fiche du bon module.
 */
import type { CrmState } from "@/lib/store";
import type { EntityName, EntityRef } from "@/lib/domain/types";
import { contactName } from "@/lib/domain/selectors";

export const ENTITY_KIND_LABEL: Partial<Record<EntityName, string>> = {
  contacts: "Contact",
  organizations: "Organisation",
  deals: "Opportunité",
  submissions: "Demande",
  applications: "Candidature",
  invoices: "Facture",
  quotes: "Devis",
  events: "Session",
  projects: "Projet",
  complaints: "Réclamation",
  tasks: "Tâche",
  emails: "Email",
  speakers: "Intervenant",
  payments: "Paiement",
  sequences: "Séquence",
  improvementActions: "Action d'amélioration",
  evaluations: "Évaluation",
  resources: "Ressource",
  contents: "Contenu",
  venues: "Lieu",
};

export function entityHref(ref: EntityRef): string | undefined {
  const id = encodeURIComponent(ref.id);
  switch (ref.entity) {
    case "contacts":
      return `/contacts/${id}`;
    case "organizations":
      return `/organisations/${id}`;
    case "deals":
      return `/pipeline?deal=${id}`;
    case "submissions":
      return `/demandes?id=${id}`;
    case "applications":
      return `/candidatures/${id}`;
    case "invoices":
      return `/facturation/factures/${id}`;
    case "quotes":
      return `/facturation/devis/${id}`;
    case "events":
      return `/sessions/${id}`;
    case "projects":
      return `/projets/${id}`;
    case "complaints":
      return `/qualiopi/reclamations?id=${id}`;
    case "emails":
      return `/emails?onglet=journal&id=${id}`;
    case "tasks":
      return `/relances`;
    case "sequences":
      return `/relances?onglet=sequences`;
    case "speakers":
      return `/intervenants`;
    case "improvementActions":
    case "evaluations":
    case "indicators":
      return `/qualiopi`;
    case "resources":
      return `/ressources`;
    case "contents":
      return `/contenus`;
    case "venues":
      return `/lieux?lieu=${id}`;
    default:
      return undefined;
  }
}

type Lookup = Pick<CrmState, "contacts" | "organizations" | "deals" | "submissions" | "applications" | "invoices" | "quotes" | "events" | "projects" | "complaints">;

/** Libellé humain d'une référence (résolu sur les collections fournies). */
export function entityLabel(ref: EntityRef, s: Lookup): string {
  const kind = ENTITY_KIND_LABEL[ref.entity] ?? "Élément";
  switch (ref.entity) {
    case "contacts": {
      const c = s.contacts.find((x) => x.id === ref.id);
      return c ? contactName(c) : `${kind} supprimé`;
    }
    case "organizations":
      return s.organizations.find((x) => x.id === ref.id)?.name ?? `${kind} supprimée`;
    case "deals":
      return s.deals.find((x) => x.id === ref.id)?.title ?? `${kind} supprimée`;
    case "submissions": {
      const x = s.submissions.find((y) => y.id === ref.id);
      return x ? `Demande — ${x.name}` : `${kind} supprimée`;
    }
    case "applications": {
      const a = s.applications.find((x) => x.id === ref.id);
      if (!a) return `${kind} supprimée`;
      const c = s.contacts.find((x) => x.id === a.contactId);
      return `Candidature #${a.number}${c ? ` — ${contactName(c)}` : ""}`;
    }
    case "invoices": {
      const i = s.invoices.find((x) => x.id === ref.id);
      return i ? `Facture ${i.number}` : `${kind} supprimée`;
    }
    case "quotes": {
      const q = s.quotes.find((x) => x.id === ref.id);
      return q ? `Devis ${q.number}` : `${kind} supprimé`;
    }
    case "events": {
      const e = s.events.find((x) => x.id === ref.id);
      return e ? `${e.code} · ${e.city}` : `${kind} supprimée`;
    }
    case "projects":
      return s.projects.find((x) => x.id === ref.id)?.name ?? `${kind} supprimé`;
    case "complaints": {
      const c = s.complaints.find((x) => x.id === ref.id);
      return c ? `Réclamation ${c.number}` : `${kind} supprimée`;
    }
    default:
      return kind;
  }
}

/** Entités que l'on peut rattacher à une tâche depuis le CRM. */
export const LINKABLE_ENTITIES: { value: Extract<EntityName, "contacts" | "organizations" | "deals" | "applications" | "invoices" | "submissions">; label: string }[] = [
  { value: "contacts", label: "Contact" },
  { value: "organizations", label: "Organisation" },
  { value: "deals", label: "Opportunité" },
  { value: "applications", label: "Candidature" },
  { value: "invoices", label: "Facture" },
  { value: "submissions", label: "Demande" },
];
