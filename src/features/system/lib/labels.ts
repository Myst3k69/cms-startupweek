import type { ActivityKind, AutomationTrigger, EntityName } from "@/lib/domain/types";

export const AUTOMATION_TRIGGER_LABEL: Record<AutomationTrigger, string> = {
  formulaire_recu: "Formulaire du site reçu",
  candidature_statut: "Changement de statut d'une candidature",
  devis_statut: "Changement de statut d'un devis",
  facture_echeance: "Échéance de facture",
  paiement_recu: "Paiement reçu (Stripe / Qonto)",
  session_date: "Date relative à une session (J-x / J+x)",
  reclamation_recue: "Réclamation reçue",
  evaluation_recue: "Évaluation reçue",
  planifie: "Planifié (cron)",
};

export const ENTITY_LABEL: Record<EntityName, string> = {
  users: "Équipe",
  organizations: "Organisation",
  contacts: "Contact",
  submissions: "Demande",
  deals: "Opportunité",
  tasks: "Tâche",
  sequences: "Séquence",
  emailTemplates: "Template email",
  emails: "Email",
  events: "Session",
  speakers: "Intervenant",
  applications: "Candidature",
  projects: "Projet",
  attendances: "Émargement",
  evaluations: "Évaluation",
  complaints: "Réclamation",
  indicators: "Indicateur Qualiopi",
  evidences: "Preuve Qualiopi",
  improvementActions: "Action d'amélioration",
  watchItems: "Veille",
  quotes: "Devis",
  invoices: "Facture",
  payments: "Paiement",
  bankTransactions: "Transaction bancaire",
  resources: "Ressource",
  contents: "Contenu",
  automations: "Automatisation",
  offers: "Offre",
  venues: "Lieu",
  venueOptions: "Lieu envisagé",
  expenses: "Dépense fournisseur",
  outings: "Activité",
  stays: "Séjour",
  courses: "Formation Academy",
  courseModules: "Module Academy",
  lessons: "Leçon Academy",
  academyPaths: "Parcours Academy",
  enrollments: "Inscription Academy",
  lessonProgress: "Progression Academy",
  assignments: "Livrable Academy",
  learnerConnections: "Connexion Academy",
  cohorts: "Cohorte Academy",
  courseComments: "Commentaire de relecture",
};

export const ACTIVITY_KIND_LABEL: Record<ActivityKind, string> = {
  creation: "Création",
  modification: "Modification",
  statut: "Statut",
  note: "Note",
  email: "Email",
  appel: "Appel",
  paiement: "Paiement",
  document: "Document",
  systeme: "Système",
};

/** Lien vers l'écran le plus pertinent pour une entité. */
export function entityHref(entity: EntityName, id: string): string | undefined {
  switch (entity) {
    case "contacts":
      return `/contacts/${id}`;
    case "organizations":
      return `/organisations/${id}`;
    case "events":
      return `/sessions/${id}`;
    case "contents":
      return `/contenus/${id}`;
    case "courses":
      return `/academy/formations/${id}`;
    case "enrollments":
      return `/academy/apprenants/${id}`;
    case "assignments":
      return "/academy?onglet=livrables";
    case "cohorts":
      return "/academy?onglet=cohortes";
    case "courseComments":
      return "/studio";
    case "academyPaths":
      return "/academy?onglet=parcours";
    case "courseModules":
    case "lessons":
    case "lessonProgress":
    case "learnerConnections":
      return "/academy";
    case "submissions":
      return "/demandes";
    case "deals":
      return "/pipeline";
    case "tasks":
    case "sequences":
      return "/relances";
    case "emails":
    case "emailTemplates":
      return "/emails";
    case "applications":
      return `/candidatures/${id}`;
    case "projects":
      return "/projets";
    case "speakers":
      return "/intervenants";
    case "complaints":
      return "/qualiopi/reclamations";
    case "improvementActions":
      return "/qualiopi/amelioration";
    case "watchItems":
      return "/qualiopi/veille";
    case "evaluations":
      return "/qualiopi/satisfaction";
    case "indicators":
    case "evidences":
    case "attendances":
      return "/qualiopi";
    case "quotes":
      return `/facturation/devis/${id}`;
    case "invoices":
      return `/facturation/factures/${id}`;
    case "payments":
    case "bankTransactions":
      return "/facturation";
    case "resources":
      return "/ressources";
    case "automations":
      return "/automatisations";
    default:
      return undefined;
  }
}
