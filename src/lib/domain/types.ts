/**
 * Modèle de données StartupWeek OS.
 *
 * Conventions :
 * - identifiants texte préfixés (ct_, org_, ev_…) — en base : uuid, le préfixe n'est qu'un confort de démo ;
 * - dates en ISO 8601 (string) — sérialisables tels quels (localStorage, Supabase, JSON) ;
 * - montants en centimes d'euro (entiers) — jamais de flottants pour de l'argent ;
 * - chaque entité porte createdAt / updatedAt.
 *
 * Ce fichier est le contrat partagé par tous les modules : le schéma SQL
 * (supabase/migrations) en est la traduction 1-pour-1 (camelCase ↔ snake_case).
 */

export type ID = string;
export type ISODate = string;
export type Cents = number;

export interface BaseEntity {
  id: ID;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* ───────────────────────────── Équipe & rôles ───────────────────────────── */

export type Role = "admin" | "commercial" | "pedagogie" | "formateur" | "lecture";

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: Role;
  title: string;
  color: string; // pastille avatar
  active: boolean;
}

/* ─────────────────────────────── CRM ─────────────────────────────── */

export type OrgType = "ecole" | "entreprise" | "incubateur" | "collectivite" | "investisseur" | "media" | "financeur" | "lieu" | "autre";
export type OrgStatus = "prospect" | "client" | "partenaire" | "inactif";

export interface Organization extends BaseEntity {
  name: string;
  type: OrgType;
  status: OrgStatus;
  sector?: string;
  size?: "1-10" | "11-50" | "51-200" | "201-500" | "500+";
  city?: string;
  country?: string;
  website?: string;
  siret?: string;
  vatNumber?: string;
  billingEmail?: string;
  address?: string;
  ownerId?: ID;
  tags: string[];
  notes?: string;
}

export type ContactLifecycle = "lead" | "prospect" | "candidat" | "participant" | "alumni" | "client" | "partenaire";
export type LeadSource =
  | "site_candidature"
  | "site_contact"
  | "site_entreprise"
  | "site_accompagnement"
  | "site_partenariat"
  | "digital_starter_kit"
  | "newsletter"
  | "linkedin"
  | "instagram"
  | "recommandation"
  | "evenement"
  | "ecole"
  | "import_airtable"
  | "autre";

export interface Consent {
  gdpr: boolean;
  marketing: boolean;
  marketingAt?: ISODate;
  unsubscribedAt?: ISODate;
  source?: string; // formulaire / preuve
}

export interface Utm {
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
}

export interface Contact extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string; // normalisé en minuscules, unique
  phone?: string;
  city?: string;
  country?: string;
  age?: number;
  jobTitle?: string;
  orgId?: ID;
  linkedin?: string;
  lifecycle: ContactLifecycle;
  source: LeadSource;
  utm?: Utm;
  tags: string[];
  ownerId?: ID;
  consent: Consent;
  score: number; // 0-100, calculé (engagement + fit)
  lastContactAt?: ISODate;
  notes?: string;
  /** Jeton du lien de désinscription des emails marketing (attribué par la base). */
  unsubscribeToken?: string;
}

/** Demande entrante = toute soumission de formulaire du site (remplace Form Submissions + tables métier). */
export type SubmissionType =
  | "candidature"
  | "contact"
  | "entreprise"
  | "accompagnement"
  | "partenariat"
  | "digital_starter_kit"
  | "reclamation"
  | "newsletter";
export type SubmissionStatus = "nouvelle" | "en_cours" | "qualifiee" | "convertie" | "archivee" | "spam";

export interface Submission extends BaseEntity {
  type: SubmissionType;
  status: SubmissionStatus;
  receivedAt: ISODate;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message?: string;
  fields: Record<string, string>; // champs spécifiques au formulaire (budget, format, packs…)
  contactId?: ID;
  orgId?: ID;
  dealId?: ID;
  applicationId?: ID;
  complaintId?: ID;
  assigneeId?: ID;
  slaDueAt?: ISODate; // promesse « réponse sous 24-48h »
  answeredAt?: ISODate;
  idempotencyKey?: string; // leadId du tunnel
  utm?: Utm;
  consent: Consent;
}

export type DealType = "entreprise" | "ecole" | "partenariat" | "accompagnement" | "sponsoring" | "session";
export type DealStage = "nouveau" | "qualification" | "rdv" | "proposition" | "negociation" | "gagne" | "perdu";

export interface Deal extends BaseEntity {
  title: string;
  type: DealType;
  stage: DealStage;
  amountCents: Cents;
  probability: number; // 0-100
  orgId?: ID;
  contactId?: ID;
  ownerId?: ID;
  eventId?: ID;
  quoteId?: ID;
  expectedCloseAt?: ISODate;
  closedAt?: ISODate;
  lostReason?: string;
  nextStep?: string;
  source?: LeadSource;
  submissionId?: ID;
}

/* ───────────────────────────── Relances ───────────────────────────── */

export type TaskKind = "appel" | "email" | "relance" | "rdv" | "admin" | "qualiopi" | "paiement";
export type Priority = "basse" | "normale" | "haute" | "urgente";

export interface EntityRef {
  entity: EntityName;
  id: ID;
}

export interface Task extends BaseEntity {
  title: string;
  kind: TaskKind;
  priority: Priority;
  dueAt: ISODate;
  doneAt?: ISODate;
  assigneeId?: ID;
  related?: EntityRef;
  sequenceId?: ID;
  automated: boolean;
  notes?: string;
}

export type SequenceTrigger =
  | "demande_sans_reponse"
  | "devis_envoye"
  | "facture_echue"
  | "candidature_incomplete"
  | "candidature_acceptee"
  | "session_j_moins_7"
  | "session_j_plus_1"
  | "evaluation_froid"
  | "digital_starter_kit"
  | "relance_alumni";

export interface SequenceStep {
  id: ID;
  delayDays: number;
  channel: "email" | "tache";
  templateId?: ID;
  label: string;
}

export interface Sequence extends BaseEntity {
  name: string;
  description: string;
  trigger: SequenceTrigger;
  active: boolean;
  steps: SequenceStep[];
  enrolled: number;
  completed: number;
  replied: number;
}

export type TemplateCategory = "accuse_reception" | "candidature" | "relance" | "facturation" | "qualiopi" | "nurturing" | "interne";

export interface EmailTemplate extends BaseEntity {
  name: string;
  category: TemplateCategory;
  subject: string;
  body: string; // texte avec variables {{prenom}}, {{session}}…
  variables: string[];
  replacesN8n?: string; // workflow n8n remplacé
}

export type EmailStatus = "brouillon" | "programme" | "envoye" | "ouvert" | "clique" | "erreur";

export interface EmailMessage extends BaseEntity {
  to: string;
  subject: string;
  body: string;
  templateId?: ID;
  /** « programme » = en file : envoyé par le serveur à scheduledAt (maintenant ou plus tard). */
  status: EmailStatus;
  scheduledAt?: ISODate;
  sentAt?: ISODate;
  openedAt?: ISODate;
  related?: EntityRef;
  sequenceId?: ID;
  /** Tentatives d'envoi (3 au plus). */
  attempts?: number;
  /** Réservé par un envoi en cours depuis cet instant. */
  sendingAt?: ISODate;
  /** Dernière erreur d'envoi, ou raison du non-envoi (variable non remplie, consentement…). */
  error?: string;
  /** Identifiant du message chez le fournisseur (Message-ID SMTP). */
  providerId?: string;
}

/* ───────────────────────────── Sessions & événements ───────────────────────────── */

export type EventKind = "startup_week" | "startup_village" | "atelier" | "masterclass" | "webinaire" | "demo_day" | "evenement_entreprise";
export type EventMode = "presentiel" | "distanciel" | "hybride";
export type EventStatus = "brouillon" | "prevu" | "inscriptions_ouvertes" | "complet" | "en_cours" | "termine" | "annule";
export type Region = "France" | "Europe" | "Hors Europe";

export interface ProgramSlot {
  id: ID;
  day: number; // J1…J7
  start: string; // "09:30"
  end: string;
  title: string;
  speakerId?: ID;
}

export interface EventSession extends BaseEntity {
  code: string; // SW-0011 (clé commune avec le site / Supabase event.event_code)
  name: string;
  kind: EventKind;
  mode: EventMode;
  format: "semaine" | "week_end" | "journee" | "mois";
  status: EventStatus;
  region: Region;
  city: string;
  venue?: string;
  startAt: ISODate;
  endAt: ISODate;
  registrationDeadline: ISODate;
  capacity: number;
  minCapacity: number;
  priceCents: Cents;
  publicPriceCents?: Cents; // prix barré
  founderEdition: boolean;
  earlyBird: boolean;
  highlights: string[];
  description: string;
  imageUrl?: string;
  // Qualiopi : action de formation
  isTraining: boolean;
  durationHours: number;
  objectives: string[];
  prerequisites: string;
  evaluationMethods: string;
  accessibility: string;
  program: ProgramSlot[];
  speakerIds: ID[];
  resourceIds: ID[];
  orgId?: ID; // client B2B (école / entreprise)
  budgetCents?: Cents; // coûts prévisionnels
  publishedOnSite: boolean;
}

export type SpeakerKind = "formateur" | "mentor" | "jury" | "coach" | "expert";

export interface Speaker extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  kind: SpeakerKind;
  expertise: string[];
  bio: string;
  dailyRateCents?: Cents;
  cvOnFile: boolean; // Qualiopi ind. 21
  lastTrainingAt?: ISODate; // Qualiopi ind. 22 (développement des compétences)
  qualifications: string[];
  rating?: number; // moyenne évaluations intervenant /5
  contractType: "salarie" | "freelance" | "benevole";
  city?: string;
}

/* ───────────────────────────── Candidatures & projets ───────────────────────────── */

export type ApplicationStatus =
  | "nouvelle"
  | "qualifiee"
  | "entretien"
  | "acceptee"
  | "inscrite"
  | "liste_attente"
  | "refusee"
  | "hors_cible"
  | "desistee";
export type LeadStage = "capture" | "qualification" | "out_of_scope" | "booking" | "enrichment";
export type Persona = "tech" | "non_tech" | "reconversion";
export type ProjectStage = "idee" | "cadrage" | "prototype" | "mvp" | "lance" | "traction";
export type FundingSource = "personnel" | "entreprise" | "opco" | "france_travail" | "cpf" | "ecole" | "region" | "gratuit";

export interface Application extends BaseEntity {
  number: number; // Id Candidature (#74…)
  eventId: ID;
  contactId: ID;
  projectId?: ID;
  offerId?: ID; // Startup Ready, Signature, Residency…
  status: ApplicationStatus;
  leadStage: LeadStage;
  intent: "candidature" | "diagnostic";
  persona: Persona;
  submittedAt: ISODate;
  reviewerId?: ID;
  score: number; // 0-100
  scoreDetail: { motivation: number; projet: number; disponibilite: number; adequation: number };
  motivation: string;
  entrepreneurialXp: "aucune" | "premiere" | "quelques" | "experimente" | "serial";
  technicalXp: "debutant" | "basique" | "intermediaire" | "avance" | "expert";
  availability: string;
  budget: string;
  heardFrom?: string;
  interviewAt?: ISODate;
  decisionAt?: ISODate;
  funding: FundingSource;
  funderName?: string; // OPCO Atlas, AKTO…
  // Qualiopi
  needsAnalysisDone: boolean; // ind. 4 — analyse du besoin
  positioningScore?: number; // ind. 8 — positionnement d'entrée /10
  prerequisitesOk: boolean; // ind. 8
  accessibilityNeeds?: string; // ind. 26 — situation de handicap déclarée
  accommodations?: string;
  convocationSentAt?: ISODate; // ind. 9
  agreementSignedAt?: ISODate; // convention / contrat
  certificateIssuedAt?: ISODate; // certificat de réalisation
  // paiement (dérivé des factures, dénormalisé pour les listes)
  amountDueCents: Cents;
  amountPaidCents: Cents;
  invoiceId?: ID;
  idempotencyKey?: string; // Lead ID du tunnel
  utm?: Utm;
}

export interface ProjectMilestone {
  id: ID;
  label: string;
  dueAt?: ISODate;
  doneAt?: ISODate;
}

export interface Project extends BaseEntity {
  name: string;
  tagline: string;
  description: string;
  stage: ProjectStage;
  sector: string;
  targetMarket: string;
  founderIds: ID[]; // contacts
  eventIds: ID[];
  mentorIds: ID[]; // speakers
  sixMonthGoals: string;
  mvpUrl?: string;
  deckUrl?: string;
  milestones: ProjectMilestone[];
  metrics: { users?: number; mrrCents?: Cents; waitlist?: number; fundingCents?: Cents };
  health: "on_track" | "a_risque" | "bloque" | "en_pause";
  lastUpdateAt: ISODate;
  lastUpdateNote?: string;
  awards: string[];
  followUpAt?: ISODate; // suivi post-formation (J+30/J+90)
}

/* ───────────────────────────── Qualiopi ───────────────────────────── */

export type AttendanceStatus = "present" | "absent" | "retard" | "excuse";

export interface Attendance extends BaseEntity {
  eventId: ID;
  contactId: ID;
  date: ISODate; // jour (YYYY-MM-DD)
  halfDay: "matin" | "apres_midi";
  status: AttendanceStatus;
  signedAt?: ISODate;
  method: "numerique" | "papier";
}

export type EvaluationKind = "positionnement" | "acquis" | "a_chaud" | "a_froid" | "financeur" | "intervenant" | "entreprise";

export interface Evaluation extends BaseEntity {
  eventId: ID;
  contactId?: ID;
  speakerId?: ID;
  kind: EvaluationKind;
  submittedAt: ISODate;
  nps?: number; // 0-10
  satisfaction?: number; // 1-5
  objectivesReached?: number; // 1-5 (auto-évaluation) ou score test
  scores: Record<string, number>;
  comment?: string;
}

export type ComplaintStatus = "recue" | "accusee" | "analyse" | "action" | "cloturee";
export type ComplaintType = "qualite" | "organisation" | "paiement" | "remboursement" | "annulation" | "accessibilite" | "autre";

export interface Complaint extends BaseEntity {
  number: string; // REC-2026-004
  receivedAt: ISODate;
  channel: "formulaire" | "email" | "telephone" | "oral" | "evaluation";
  type: ComplaintType;
  severity: "mineure" | "majeure";
  status: ComplaintStatus;
  contactId?: ID;
  eventId?: ID;
  subject: string;
  description: string;
  ackAt?: ISODate; // accusé de réception (engagement 48h ouvrées)
  analysis?: string;
  response?: string;
  correctiveAction?: string;
  improvementActionId?: ID;
  closedAt?: ISODate;
  ownerId?: ID;
  satisfiedWithResponse?: boolean;
}

export type IndicatorStatus = "conforme" | "partiel" | "non_conforme" | "a_faire" | "non_applicable";

export interface QualiopiIndicator extends BaseEntity {
  code: number; // 1…32
  criterion: number; // 1…7
  title: string;
  expectation: string; // niveau attendu (résumé)
  evidenceHints: string[]; // éléments de preuve typiques
  status: IndicatorStatus;
  ownerId?: ID;
  notes?: string;
  lastReviewedAt?: ISODate;
  newcomerDeferred: boolean; // nouvel entrant : mise en œuvre auditée à la surveillance
  autoSource?: AutoEvidenceSource; // preuve calculée automatiquement par le CRM
}

export type AutoEvidenceSource =
  | "resultats_publies"
  | "analyse_besoin"
  | "positionnement"
  | "convocations"
  | "emargements"
  | "evaluations_acquis"
  | "ressources"
  | "intervenants_cv"
  | "intervenants_formation"
  | "veille"
  | "handicap"
  | "satisfaction"
  | "reclamations"
  | "amelioration";

export interface Evidence extends BaseEntity {
  indicatorCode: number;
  title: string;
  kind: "document" | "lien" | "procedure" | "enregistrement";
  resourceId?: ID;
  url?: string;
  ownerId?: ID;
  validUntil?: ISODate;
  note?: string;
}

export type ActionOrigin = "reclamation" | "evaluation" | "audit_blanc" | "veille" | "interne" | "intervenant";
export type ActionStatus = "a_faire" | "en_cours" | "fait" | "abandonne";

export interface ImprovementAction extends BaseEntity {
  title: string;
  description: string;
  origin: ActionOrigin;
  originRef?: EntityRef;
  indicatorCodes: number[];
  ownerId?: ID;
  dueAt?: ISODate;
  doneAt?: ISODate;
  status: ActionStatus;
  impact?: string;
}

export type WatchKind = "legale" | "metiers" | "pedagogique" | "handicap";

export interface WatchItem extends BaseEntity {
  kind: WatchKind; // ind. 23 / 24 / 25 / 26
  title: string;
  source: string;
  url?: string;
  publishedAt: ISODate;
  summary: string;
  impact: "aucun" | "faible" | "moyen" | "fort";
  actionId?: ID;
}

/* ───────────────────────────── Facturation ───────────────────────────── */

export interface LineItem {
  id: ID;
  label: string;
  quantity: number;
  unitPriceCents: Cents; // HT
  vatRate: number; // 0 (exonération formation art. 261-4-4° CGI) ou 20
}

export type QuoteStatus = "brouillon" | "envoye" | "accepte" | "refuse" | "expire";

export interface Quote extends BaseEntity {
  number: string; // D-2026-0012
  status: QuoteStatus;
  orgId?: ID;
  contactId?: ID;
  dealId?: ID;
  eventId?: ID;
  issuedAt: ISODate;
  validUntil: ISODate;
  lines: LineItem[];
  notes?: string;
  sentAt?: ISODate;
  acceptedAt?: ISODate;
  invoiceId?: ID;
  /** Jeton du lien public vers le devis (/documents/<jeton>), attribué par la base. */
  publicToken?: string;
}

/** CGV StartupWeek : acompte de 30 % à l'inscription, solde à J-30. */
export type InvoiceKind = "facture" | "acompte" | "solde" | "avoir";
export type InvoiceStatus = "brouillon" | "emise" | "partielle" | "payee" | "en_retard" | "annulee";
export type PaymentMethod = "stripe" | "virement" | "opco" | "cb_terminal" | "cheque";

export interface Invoice extends BaseEntity {
  number: string; // F-2026-0042 — séquentiel, sans trou (numérotation légale)
  kind: InvoiceKind;
  status: InvoiceStatus;
  orgId?: ID;
  contactId?: ID;
  applicationId?: ID;
  eventId?: ID;
  quoteId?: ID;
  creditedInvoiceId?: ID; // pour un avoir
  issuedAt: ISODate;
  dueAt: ISODate;
  lines: LineItem[];
  paidCents: Cents;
  preferredMethod: PaymentMethod;
  stripePaymentLink?: string;
  /** Jeton du lien public vers la facture (/documents/<jeton>), attribué par la base. */
  publicToken?: string;
  funder?: { name: string; subrogation: boolean; agreementRef?: string };
  remindersSent: number;
  lastReminderAt?: ISODate;
  notes?: string;
}

export type PaymentStatus = "reussi" | "en_attente" | "echoue" | "rembourse";

export interface Payment extends BaseEntity {
  invoiceId: ID;
  amountCents: Cents;
  receivedAt: ISODate;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string; // pi_… (Stripe) / id transaction Qonto / n° accord OPCO
  feeCents?: Cents;
  bankTransactionId?: ID;
}

export type BankTxStatus = "a_rapprocher" | "rapproche" | "ignore";

export interface BankTransaction extends BaseEntity {
  bookedAt: ISODate;
  label: string;
  counterparty: string;
  amountCents: Cents; // positif = crédit
  reference?: string;
  source: "qonto" | "stripe_payout" | "import_csv";
  status: BankTxStatus;
  matchedInvoiceId?: ID;
  paymentId?: ID;
}

/* ───────────────────────────── Ressources & contenus ───────────────────────────── */

export type ResourceCategory = "business_plan" | "pitch_deck" | "maquette" | "financier" | "administratif" | "digital" | "pedagogique" | "qualiopi" | "juridique" | "autre";
export type ResourceFormat = "pdf" | "docx" | "xlsx" | "figma" | "notion" | "video" | "lien" | "zip" | "texte";
export type Visibility = "public" | "participants" | "premium" | "interne";

export interface Resource extends BaseEntity {
  title: string;
  description: string;
  category: ResourceCategory;
  format: ResourceFormat;
  visibility: Visibility;
  url: string; // Supabase Storage (URL stable, pas d'URL Airtable expirante)
  sizeKb?: number;
  version: string;
  eventIds: ID[];
  indicatorCodes: number[]; // preuve Qualiopi
  downloads: number;
  ownerId?: ID;
}

export type ContentType = "article" | "page_session" | "temoignage" | "faq" | "newsletter" | "post_linkedin" | "post_instagram" | "etude_de_cas" | "page";
export type ContentStatus = "idee" | "redaction" | "relecture" | "planifie" | "publie" | "archive";
export type Channel = "site" | "blog" | "linkedin" | "instagram" | "newsletter";

export interface ContentItem extends BaseEntity {
  title: string;
  slug: string;
  type: ContentType;
  status: ContentStatus;
  channel: Channel;
  authorId?: ID;
  excerpt: string;
  body: string; // Markdown
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  coverUrl?: string;
  eventId?: ID;
  scheduledAt?: ISODate;
  publishedAt?: ISODate;
  metrics: { views: number; clicks: number; leads: number };
  /** Blog : rubrique affichée (« Méthodologie »…). FAQ : clé de catégorie (FAQ_CATEGORIES). */
  category?: string;
  /** Ordre d'affichage (FAQ : dans sa catégorie ; blog : départage à date égale). */
  sortOrder?: number;
  /** Champs propres aux articles du blog (colonne jsonb `meta`). */
  meta?: ContentMeta;
}

export interface BlogAuthor {
  name: string;
  role: string;
  image: string;
  bio: string;
}

export interface BlogCta {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

/** Données d'un article du blog lues par le site (public.blog_post.meta). */
export interface ContentMeta {
  readTime?: string;
  author?: BlogAuthor;
  keyPoints?: string[];
  faq?: { question: string; answer: string }[];
  cta?: BlogCta;
  relatedPosts?: string[];
  /** Sommaire explicite (sinon déduit des titres ##). */
  toc?: { id: string; title: string; level: number }[];
  mobileImage?: string;
}

/* ───────────────────────────── Analytics & automatisations ───────────────────────────── */

export interface TrafficDay {
  id: ID;
  date: ISODate; // YYYY-MM-DD
  visitors: number;
  pageviews: number;
  sources: Record<"direct" | "google" | "linkedin" | "instagram" | "meta_ads" | "newsletter" | "partenaires", number>;
  formStarts: number;
  formSubmits: number;
}

export type AutomationTrigger =
  | "formulaire_recu"
  | "candidature_statut"
  | "devis_statut"
  | "facture_echeance"
  | "paiement_recu"
  | "session_date"
  | "reclamation_recue"
  | "evaluation_recue"
  | "planifie";

export interface AutomationRule extends BaseEntity {
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: string;
  actions: string[];
  active: boolean;
  replacesN8n?: string[]; // workflows n8n remplacés
  runs: number;
  lastRunAt?: ISODate;
  errors: number;
}

export type ActivityKind = "creation" | "modification" | "statut" | "note" | "email" | "appel" | "paiement" | "document" | "systeme";

export interface Activity {
  id: ID;
  at: ISODate;
  actorId?: ID; // absent = système / automatisation
  kind: ActivityKind;
  entity: EntityName;
  entityId: ID;
  summary: string;
  meta?: Record<string, string | number | boolean>;
}

export interface Offer extends BaseEntity {
  name: string;
  kind: "session" | "accompagnement" | "mentorat" | "ecole" | "entreprise" | "kit";
  code?: string; // code catalogue (PRC-, BLD-, IA-…)
  priceCents: Cents;
  vatRate: number;
  description: string;
  durationHours?: number;
  active: boolean;
}

/* ───────────────────────────── Paramètres ───────────────────────────── */

export interface Settings {
  legalName: string;
  brand: string;
  siret: string;
  nda: string; // numéro de déclaration d'activité (organisme de formation)
  address: string;
  email: string;
  phone: string;
  website: string;
  iban: string;
  vatExempt: boolean; // exonération TVA formation professionnelle continue
  invoicePrefix: string;
  quotePrefix: string;
  paymentTermsDays: number;
  latePenaltyText: string;
  qualityLeadId?: ID; // référent qualité
  disabilityLeadId?: ID; // référent handicap (ind. 26)
  auditDate?: ISODate;
  auditBody?: string; // organisme certificateur
  newcomer: boolean; // nouvel entrant Qualiopi
  complaintAckHours: number; // engagement accusé de réception
  slaHours: number; // délai de réponse aux demandes
  stripeConnected: boolean;
  qontoConnected: boolean;
  emailProvider: "resend" | "smtp" | "brevo";
  /** Accusés de réception et Digital Starter Kit des formulaires du site envoyés par le CRM (désactivé tant que n8n les envoie). */
  siteFormEmails: boolean;
  /** Lien du questionnaire de satisfaction à chaud (Tally, Google Forms…), envoyé en fin de session. */
  satisfactionFormUrl: string;
  depositPercent: number; // acompte à l'inscription (CGV : 30 %)
  balanceDaysBefore: number; // solde exigible à J-x (CGV : 30)
  dataMode: "demo" | "supabase";
}

/* ───────────────────────────── Registre des collections ───────────────────────────── */

export interface EntityMap {
  users: User;
  organizations: Organization;
  contacts: Contact;
  submissions: Submission;
  deals: Deal;
  tasks: Task;
  sequences: Sequence;
  emailTemplates: EmailTemplate;
  emails: EmailMessage;
  events: EventSession;
  speakers: Speaker;
  applications: Application;
  projects: Project;
  attendances: Attendance;
  evaluations: Evaluation;
  complaints: Complaint;
  indicators: QualiopiIndicator;
  evidences: Evidence;
  improvementActions: ImprovementAction;
  watchItems: WatchItem;
  quotes: Quote;
  invoices: Invoice;
  payments: Payment;
  bankTransactions: BankTransaction;
  resources: Resource;
  contents: ContentItem;
  automations: AutomationRule;
  offers: Offer;
}

export type EntityName = keyof EntityMap;
export type Collections = { [K in EntityName]: EntityMap[K][] };
