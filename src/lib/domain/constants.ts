import type {
  ActionStatus,
  ApplicationStatus,
  AttendanceStatus,
  BankTxStatus,
  Channel,
  ComplaintStatus,
  ComplaintType,
  ContactLifecycle,
  ContentStatus,
  ContentType,
  DealStage,
  DealType,
  EmailStatus,
  EvaluationKind,
  EventKind,
  EventMode,
  EventStatus,
  FundingSource,
  IndicatorStatus,
  InvoiceKind,
  InvoiceStatus,
  LeadSource,
  OrgStatus,
  OrgType,
  PaymentMethod,
  PaymentStatus,
  Persona,
  Priority,
  ProjectStage,
  QuoteStatus,
  ResourceCategory,
  ResourceFormat,
  Role,
  SequenceTrigger,
  SpeakerKind,
  SubmissionStatus,
  SubmissionType,
  TaskKind,
  TemplateCategory,
  Visibility,
  WatchKind,
} from "./types";

/** Tonalité visuelle d'un statut (Badge / pastilles). Jamais la couleur seule : toujours avec un libellé. */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent" | "violet";

export interface Option<V extends string = string> {
  value: V;
  label: string;
  tone?: Tone;
}

function opts<V extends string>(map: Record<V, string | [string, Tone]>): Option<V>[] {
  return (Object.keys(map) as V[]).map((value): Option<V> => {
    const v: string | [string, Tone] = map[value];
    return typeof v === "string" ? { value, label: v } : { value, label: v[0], tone: v[1] };
  });
}

export function labelOf<V extends string>(options: Option<V>[], value: V | undefined | null): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

export function toneOf<V extends string>(options: Option<V>[], value: V | undefined | null): Tone {
  return options.find((o) => o.value === value)?.tone ?? "neutral";
}

export const ROLES = opts<Role>({
  admin: ["Admin", "accent"],
  commercial: ["Commercial", "info"],
  pedagogie: ["Pédagogie & qualité", "violet"],
  formateur: ["Formateur / mentor", "success"],
  lecture: ["Lecture seule", "neutral"],
});

export const ORG_TYPES = opts<OrgType>({
  ecole: "École / Université",
  entreprise: "Entreprise / Groupe",
  incubateur: "Incubateur / Accélérateur",
  collectivite: "Collectivité / Territoire",
  investisseur: "Investisseur / Fonds",
  media: "Média / Presse",
  financeur: "Financeur (OPCO…)",
  lieu: "Lieu / Villa",
  autre: "Autre",
});

export const ORG_STATUSES = opts<OrgStatus>({
  prospect: ["Prospect", "info"],
  client: ["Client", "success"],
  partenaire: ["Partenaire", "violet"],
  inactif: ["Inactif", "neutral"],
});

export const LIFECYCLES = opts<ContactLifecycle>({
  lead: ["Lead", "neutral"],
  prospect: ["Prospect", "info"],
  candidat: ["Candidat", "accent"],
  participant: ["Participant", "success"],
  alumni: ["Alumni", "violet"],
  client: ["Client B2B", "success"],
  partenaire: ["Partenaire", "violet"],
});

export const LEAD_SOURCES = opts<LeadSource>({
  site_candidature: "Site · candidature",
  site_contact: "Site · contact",
  site_entreprise: "Site · entreprise",
  site_accompagnement: "Site · accompagnement",
  site_partenariat: "Site · partenariat",
  digital_starter_kit: "Digital Starter Kit",
  newsletter: "Newsletter",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  recommandation: "Recommandation",
  evenement: "Événement",
  ecole: "École partenaire",
  import_airtable: "Import Airtable",
  autre: "Autre",
});

export const SUBMISSION_TYPES = opts<SubmissionType>({
  candidature: ["Candidature", "accent"],
  contact: ["Contact", "neutral"],
  entreprise: ["Entreprise", "info"],
  accompagnement: ["Accompagnement", "success"],
  partenariat: ["Partenariat", "violet"],
  digital_starter_kit: ["Digital Starter Kit", "warning"],
  reclamation: ["Réclamation", "danger"],
  newsletter: ["Newsletter", "neutral"],
});

export const SUBMISSION_STATUSES = opts<SubmissionStatus>({
  nouvelle: ["Nouvelle", "accent"],
  en_cours: ["En cours", "info"],
  qualifiee: ["Qualifiée", "violet"],
  convertie: ["Convertie", "success"],
  archivee: ["Archivée", "neutral"],
  spam: ["Spam", "danger"],
});

export const DEAL_TYPES = opts<DealType>({
  entreprise: "Entreprise",
  ecole: "École",
  partenariat: "Partenariat",
  accompagnement: "Accompagnement",
  sponsoring: "Sponsoring",
  session: "Session B2C",
});

export const DEAL_STAGES = opts<DealStage>({
  nouveau: ["Nouveau", "neutral"],
  qualification: ["Qualification", "info"],
  rdv: ["RDV / découverte", "info"],
  proposition: ["Proposition envoyée", "violet"],
  negociation: ["Négociation", "warning"],
  gagne: ["Gagné", "success"],
  perdu: ["Perdu", "danger"],
});

export const DEAL_STAGE_PROBABILITY: Record<DealStage, number> = {
  nouveau: 10,
  qualification: 20,
  rdv: 35,
  proposition: 55,
  negociation: 75,
  gagne: 100,
  perdu: 0,
};

export const TASK_KINDS = opts<TaskKind>({
  appel: "Appel",
  email: "Email",
  relance: "Relance",
  rdv: "Rendez-vous",
  admin: "Admin",
  qualiopi: "Qualiopi",
  paiement: "Paiement",
});

export const PRIORITIES = opts<Priority>({
  basse: ["Basse", "neutral"],
  normale: ["Normale", "info"],
  haute: ["Haute", "warning"],
  urgente: ["Urgente", "danger"],
});

export const SEQUENCE_TRIGGERS = opts<SequenceTrigger>({
  demande_sans_reponse: "Demande sans réponse (SLA 48h)",
  devis_envoye: "Devis envoyé",
  facture_echue: "Facture échue",
  candidature_incomplete: "Candidature incomplète",
  candidature_acceptee: "Candidature acceptée",
  session_j_moins_7: "J-7 avant session",
  session_j_plus_1: "J+1 après session",
  evaluation_froid: "Évaluation à froid (J+60)",
  digital_starter_kit: "Téléchargement Digital Starter Kit",
  relance_alumni: "Alumni (upsell)",
});

export const TEMPLATE_CATEGORIES = opts<TemplateCategory>({
  accuse_reception: "Accusé de réception",
  candidature: "Candidature",
  relance: "Relance",
  facturation: "Facturation",
  qualiopi: "Qualiopi",
  nurturing: "Nurturing",
  interne: "Interne",
});

export const EMAIL_STATUSES = opts<EmailStatus>({
  brouillon: ["Brouillon", "neutral"],
  programme: ["Programmé", "info"],
  envoye: ["Envoyé", "accent"],
  ouvert: ["Ouvert", "success"],
  clique: ["Cliqué", "success"],
  erreur: ["Erreur", "danger"],
});

export const EVENT_KINDS = opts<EventKind>({
  startup_week: "StartupWeek (bootcamp 7 j)",
  startup_village: "Startup Village (écoles)",
  atelier: "Atelier",
  masterclass: "Masterclass",
  webinaire: "Webinaire",
  demo_day: "Demo Day",
  evenement_entreprise: "Événement entreprise",
});

export const EVENT_MODES = opts<EventMode>({
  presentiel: "Présentiel",
  distanciel: "Distanciel",
  hybride: "Hybride",
});

export const EVENT_STATUSES = opts<EventStatus>({
  brouillon: ["Brouillon", "neutral"],
  prevu: ["Prévu", "info"],
  inscriptions_ouvertes: ["Inscriptions ouvertes", "accent"],
  complet: ["Complet", "warning"],
  en_cours: ["En cours", "violet"],
  termine: ["Terminé", "success"],
  annule: ["Annulé", "danger"],
});

export const SPEAKER_KINDS = opts<SpeakerKind>({
  formateur: "Formateur",
  mentor: "Mentor",
  jury: "Jury",
  coach: "Coach",
  expert: "Expert",
});

export const APPLICATION_STATUSES = opts<ApplicationStatus>({
  nouvelle: ["Nouvelle", "accent"],
  qualifiee: ["Qualifiée", "info"],
  entretien: ["Entretien planifié", "violet"],
  acceptee: ["Acceptée", "success"],
  inscrite: ["Inscrite (payée)", "success"],
  liste_attente: ["Liste d'attente", "warning"],
  refusee: ["Refusée", "danger"],
  hors_cible: ["Hors cible", "neutral"],
  desistee: ["Désistée", "neutral"],
});

/** Colonnes du pipeline candidatures (les sorties sont regroupées à part). */
export const APPLICATION_PIPELINE: ApplicationStatus[] = ["nouvelle", "qualifiee", "entretien", "acceptee", "inscrite"];
export const APPLICATION_EXITS: ApplicationStatus[] = ["liste_attente", "refusee", "hors_cible", "desistee"];

export const PERSONAS = opts<Persona>({
  tech: ["Profil tech", "accent"],
  non_tech: ["Profil non-tech", "warning"],
  reconversion: ["Reconversion", "violet"],
});

export const PROJECT_STAGES = opts<ProjectStage>({
  idee: ["Idée", "neutral"],
  cadrage: ["Cadrage", "info"],
  prototype: ["Prototype", "violet"],
  mvp: ["MVP", "accent"],
  lance: ["Lancé", "success"],
  traction: ["Traction", "success"],
});

export const FUNDING_SOURCES = opts<FundingSource>({
  personnel: "Fonds personnels",
  entreprise: "Entreprise",
  opco: "OPCO",
  france_travail: "France Travail",
  cpf: "CPF (après certification)",
  ecole: "École",
  region: "Région",
  gratuit: "Gratuit / offert",
});

export const ATTENDANCE_STATUSES = opts<AttendanceStatus>({
  present: ["Présent", "success"],
  retard: ["Retard", "warning"],
  excuse: ["Absent excusé", "info"],
  absent: ["Absent", "danger"],
});

export const EVALUATION_KINDS = opts<EvaluationKind>({
  positionnement: "Positionnement (entrée)",
  acquis: "Évaluation des acquis",
  a_chaud: "Satisfaction à chaud",
  a_froid: "Satisfaction à froid",
  financeur: "Financeur",
  intervenant: "Intervenant",
  entreprise: "Entreprise / école",
});

export const COMPLAINT_STATUSES = opts<ComplaintStatus>({
  recue: ["Reçue", "danger"],
  accusee: ["Accusé envoyé", "warning"],
  analyse: ["En analyse", "info"],
  action: ["Action corrective", "violet"],
  cloturee: ["Clôturée", "success"],
});

export const COMPLAINT_TYPES = opts<ComplaintType>({
  qualite: "Qualité pédagogique",
  organisation: "Organisation / logistique",
  paiement: "Paiement",
  remboursement: "Remboursement",
  annulation: "Annulation",
  accessibilite: "Accessibilité / handicap",
  autre: "Autre",
});

export const INDICATOR_STATUSES = opts<IndicatorStatus>({
  conforme: ["Conforme", "success"],
  partiel: ["Partiel", "warning"],
  non_conforme: ["Non conforme", "danger"],
  a_faire: ["À faire", "neutral"],
  non_applicable: ["Non applicable", "neutral"],
});

export const ACTION_STATUSES = opts<ActionStatus>({
  a_faire: ["À faire", "neutral"],
  en_cours: ["En cours", "info"],
  fait: ["Fait", "success"],
  abandonne: ["Abandonné", "neutral"],
});

export const WATCH_KINDS = opts<WatchKind>({
  legale: "Légale & réglementaire (ind. 23)",
  metiers: "Compétences & métiers (ind. 24)",
  pedagogique: "Pédagogique & techno (ind. 25)",
  handicap: "Handicap (ind. 26)",
});

export const QUOTE_STATUSES = opts<QuoteStatus>({
  brouillon: ["Brouillon", "neutral"],
  envoye: ["Envoyé", "info"],
  accepte: ["Accepté", "success"],
  refuse: ["Refusé", "danger"],
  expire: ["Expiré", "warning"],
});

export const INVOICE_KINDS = opts<InvoiceKind>({
  facture: "Facture",
  acompte: "Facture d'acompte",
  solde: "Facture de solde",
  avoir: "Avoir",
});

export const INVOICE_STATUSES = opts<InvoiceStatus>({
  brouillon: ["Brouillon", "neutral"],
  emise: ["Émise", "info"],
  partielle: ["Partiellement payée", "warning"],
  payee: ["Payée", "success"],
  en_retard: ["En retard", "danger"],
  annulee: ["Annulée", "neutral"],
});

export const PAYMENT_METHODS = opts<PaymentMethod>({
  stripe: "Stripe (CB)",
  virement: "Virement (Qonto)",
  opco: "OPCO (subrogation)",
  cb_terminal: "CB terminal",
  cheque: "Chèque",
});

export const PAYMENT_STATUSES = opts<PaymentStatus>({
  reussi: ["Réussi", "success"],
  en_attente: ["En attente", "warning"],
  echoue: ["Échoué", "danger"],
  rembourse: ["Remboursé", "neutral"],
});

export const BANK_TX_STATUSES = opts<BankTxStatus>({
  a_rapprocher: ["À rapprocher", "warning"],
  rapproche: ["Rapproché", "success"],
  ignore: ["Ignoré", "neutral"],
});

export const RESOURCE_CATEGORIES = opts<ResourceCategory>({
  business_plan: "Business plan",
  pitch_deck: "Pitch deck",
  maquette: "Maquette",
  financier: "Financier",
  administratif: "Administratif",
  digital: "Digital / outils",
  pedagogique: "Pédagogique",
  qualiopi: "Qualiopi",
  juridique: "Juridique",
  autre: "Autre",
});

export const RESOURCE_FORMATS = opts<ResourceFormat>({
  pdf: "PDF",
  docx: "Word",
  xlsx: "Excel",
  figma: "Figma",
  notion: "Notion",
  video: "Vidéo",
  lien: "Lien",
  zip: "Archive",
});

export const VISIBILITIES = opts<Visibility>({
  public: ["Public", "success"],
  participants: ["Participants", "info"],
  premium: ["Premium", "violet"],
  interne: ["Interne", "neutral"],
});

export const CONTENT_TYPES = opts<ContentType>({
  article: "Article de blog",
  page_session: "Page session",
  temoignage: "Témoignage",
  faq: "FAQ",
  newsletter: "Newsletter",
  post_linkedin: "Post LinkedIn",
  post_instagram: "Post Instagram",
  etude_de_cas: "Étude de cas",
  page: "Page du site",
});

export const CONTENT_STATUSES = opts<ContentStatus>({
  idee: ["Idée", "neutral"],
  redaction: ["Rédaction", "info"],
  relecture: ["Relecture", "violet"],
  planifie: ["Planifié", "warning"],
  publie: ["Publié", "success"],
  archive: ["Archivé", "neutral"],
});

export const CHANNELS = opts<Channel>({
  site: "Site",
  blog: "Blog",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  newsletter: "Newsletter",
});

/** Catégories de la page FAQ du site (clé stockée dans `contents.category`, libellé et icône côté site). */
export const FAQ_CATEGORIES: { value: string; label: string }[] = [
  { value: "general", label: "Questions générales" },
  { value: "formations", label: "Programme & formats" },
  { value: "sessions", label: "Sessions & réservations" },
  { value: "pratique", label: "Aspects pratiques" },
  { value: "resultats", label: "Résultats & garanties" },
  { value: "technique", label: "Aspects techniques" },
  { value: "accessibilite", label: "Accessibilité & inclusion" },
];

/** Rubriques déjà utilisées par le blog (suggestions ; saisie libre possible). */
export const BLOG_CATEGORIES = [
  "Méthodologie", "Méthode", "Stratégie", "Bootcamp", "Formation", "Formation IA", "MVP IA", "Outils", "Développement",
  "Budget", "Financement", "Concepts", "Comparatif", "Guide", "Case Study", "Analytics", "Communication",
  "Automatisation IA", "Actualité IA", "Métier", "Reconversion",
];

/** Les 7 critères du Référentiel National Qualité (Qualiopi). */
export const QUALIOPI_CRITERIA: { code: number; title: string; short: string }[] = [
  { code: 1, short: "Information du public", title: "Conditions d'information du public sur les prestations, les délais d'accès et les résultats obtenus" },
  { code: 2, short: "Objectifs & conception", title: "Identification précise des objectifs des prestations et adaptation aux publics lors de la conception" },
  { code: 3, short: "Accueil & suivi", title: "Adaptation aux publics des modalités d'accueil, d'accompagnement, de suivi et d'évaluation" },
  { code: 4, short: "Moyens", title: "Adéquation des moyens pédagogiques, techniques et d'encadrement" },
  { code: 5, short: "Compétences des intervenants", title: "Qualification et développement des connaissances et compétences des personnels" },
  { code: 6, short: "Environnement professionnel", title: "Inscription et investissement du prestataire dans son environnement professionnel" },
  { code: 7, short: "Appréciations & réclamations", title: "Recueil et prise en compte des appréciations et des réclamations des parties prenantes" },
];
