/**
 * Intake des formulaires du site (remplace les 8 webhooks n8n « /api/submit-* »).
 *
 * 1. Validation zod TOLÉRANTE : accepte les payloads actuels du site tels quels
 *    (champs optionnels, clés inconnues conservées, nombres/booléens en chaîne acceptés).
 * 2. Normalisation PURE (testable sans base) vers une `Submission` + brouillons
 *    Contact / Organisation / objet métier / tâche SLA.
 * 3. Persistance (`persistIntake`) via le client service_role :
 *    - contact dédoublonné sur l'email normalisé (trim + minuscules), FUSION des
 *      tags / cycle de vie / consentements (jamais d'écrasement, jamais de rétrogradation) ;
 *    - consentement RÉEL (jamais forcé à true), horodaté ;
 *    - idempotence : leadId du tunnel (candidature) ou empreinte du payload / en-tête Idempotency-Key ;
 *    - objet métier : candidature, réclamation (REC-AAAA-NNN), opportunité (+ organisation
 *      dédoublonnée sur le nom normalisé), séquence Digital Starter Kit ;
 *    - tâche « Répondre sous 48 h » (slaDueAt) et accusé de réception (HTML échappé).
 *
 * supabase-js n'offrant pas de transaction, chaque étape est idempotente et une
 * soumission rejouée reprend là où elle s'était arrêtée.
 */
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import type {
  Application,
  ApplicationStatus,
  Complaint,
  ComplaintType,
  Consent,
  Contact,
  ContactLifecycle,
  Deal,
  DealType,
  EntityRef,
  ID,
  ISODate,
  LeadSource,
  LeadStage,
  Organization,
  OrgType,
  Persona,
  Project,
  ProjectStage,
  SequenceStep,
  Submission,
  SubmissionType,
  Task,
  Utm,
} from "@/lib/domain/types";
import { DEAL_STAGE_PROBABILITY } from "@/lib/domain/constants";
import type { CrmAdminClient } from "./supabase-admin";

/* ═════════════════════════════ Formulaires ═════════════════════════════ */

export const INTAKE_FORMS = [
  "candidature",
  "contact",
  "entreprise",
  "partenaire",
  "reclamation",
  "accompagnement",
  "newsletter",
  "starter-kit",
] as const;
export type IntakeForm = (typeof INTAKE_FORMS)[number];

export function isIntakeForm(value: string): value is IntakeForm {
  return (INTAKE_FORMS as readonly string[]).includes(value);
}

export const FORM_SUBMISSION_TYPE: Record<IntakeForm, SubmissionType> = {
  candidature: "candidature",
  contact: "contact",
  entreprise: "entreprise",
  partenaire: "partenariat",
  reclamation: "reclamation",
  accompagnement: "accompagnement",
  newsletter: "newsletter",
  "starter-kit": "digital_starter_kit",
};

const FORM_SOURCE: Record<IntakeForm, LeadSource> = {
  candidature: "site_candidature",
  contact: "site_contact",
  entreprise: "site_entreprise",
  partenaire: "site_partenariat",
  reclamation: "site_contact",
  accompagnement: "site_accompagnement",
  newsletter: "newsletter",
  "starter-kit": "digital_starter_kit",
};

const FORM_LIFECYCLE: Record<IntakeForm, ContactLifecycle> = {
  candidature: "candidat",
  contact: "lead",
  entreprise: "prospect",
  partenaire: "prospect",
  reclamation: "lead",
  accompagnement: "prospect",
  newsletter: "lead",
  "starter-kit": "lead",
};

const FORM_TAG: Record<IntakeForm, string> = {
  candidature: "candidature",
  contact: "contact",
  entreprise: "entreprise",
  partenaire: "partenaire",
  reclamation: "reclamation",
  accompagnement: "accompagnement",
  newsletter: "newsletter",
  "starter-kit": "digital-starter-kit",
};

/* ═════════════════════════════ Schémas zod (tolérants) ═════════════════════════════ */

/** Chaîne optionnelle : trim, vide → undefined, nombres/booléens convertis, listes jointes, tronquée à `max`. */
const optText = (max = 2_000) =>
  z.preprocess((v) => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (Array.isArray(v)) {
      const joined = v.filter((x) => x !== null && x !== undefined && typeof x !== "object").map(String).join(", ").trim();
      return joined ? joined.slice(0, max) : undefined;
    }
    if (typeof v === "string") {
      const t = v.trim();
      return t ? t.slice(0, max) : undefined;
    }
    return v; // objet → erreur de type explicite
  }, z.string().optional());

/** Booléen optionnel : accepte true/false, "true"/"on"/"oui"/"1", 1/0. */
const optBool = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "on", "1", "yes", "oui"].includes(s)) return true;
    if (["false", "off", "0", "no", "non"].includes(s)) return false;
  }
  if (v === 1) return true;
  if (v === 0) return false;
  return v;
}, z.boolean().optional());

/** Entier optionnel (âge…) : chaîne numérique acceptée, valeur invalide ignorée plutôt que rejetée. */
const optInt = (min: number, max: number) =>
  z.preprocess((v) => {
    if (v === null || v === undefined || v === "") return undefined;
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.trim()) : Number.NaN;
    return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
  }, z.number().int().optional());

/** Liste de chaînes : tableau ou chaîne séparée par des virgules. */
const optList = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string" || typeof x === "number").map((x) => String(x).trim()).filter(Boolean);
  return v;
}, z.array(z.string().max(200)).max(50).optional());

const optObject = <T extends z.core.$ZodLooseShape>(shape: T) =>
  z.preprocess((v) => (v === null ? undefined : v), z.looseObject(shape).optional());

const emailField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.email({ error: (iss) => (iss.input === undefined ? "Email requis" : "Adresse email invalide") }).max(254),
);

/** Champs communs à tous les formulaires (+ métadonnées ajoutées par le site). */
const baseShape = {
  email: emailField,
  phone: optText(40),
  consentRGPD: optBool,
  consentNewsletter: optBool,
  consentRGPDDate: optText(64),
  consentNewsletterDate: optText(64),
  submittedAt: optText(64),
  origin: optText(500),
  ipAddress: optText(64),
  userAgent: optText(500),
  referrer: optText(500),
  utm_source: optText(200),
  utm_medium: optText(200),
  utm_campaign: optText(200),
  utm: optObject({ source: optText(200), medium: optText(200), campaign: optText(200), referrer: optText(500) }),
};

export const candidatureSchema = z.looseObject({
  ...baseShape,
  leadId: optText(100),
  leadStage: optText(40),
  intent: optText(40),
  offer: optText(200),
  qualified: optBool,
  firstName: optText(100),
  lastName: optText(100),
  projectDescription: optText(5_000),
  event_id: optText(40),
  session: optObject({
    id: optText(100),
    eventCode: optText(40),
    type: optText(40),
    date: optText(100),
    location: optText(200),
    format: optText(40),
  }),
  projectStage: optText(40),
  budget: optText(200),
  bookingConfirmed: optBool,
  bookingConfirmedAt: optText(64),
  motivation: optText(5_000),
  objectives: optText(5_000),
  preferredFormat: optList,
  availability: optText(500),
  availabilityOther: optText(500),
  hearAboutUs: optText(200),
  additionalInfo: optText(5_000),
  // champs historiques
  age: optInt(10, 120),
  location: optText(200),
  projectName: optText(200),
  targetMarket: optText(500),
  technicalLevel: optText(100),
  entrepreneurialExperience: optText(200),
  previousProjects: optText(2_000),
});

export const contactSchema = z.looseObject({
  ...baseShape,
  firstName: optText(100),
  lastName: optText(100),
  subject: optText(300),
  message: optText(10_000),
  type: optText(60),
});

export const entrepriseSchema = z.looseObject({
  ...baseShape,
  companyName: optText(200),
  contactFirstName: optText(100),
  contactLastName: optText(100),
  position: optText(200),
  sector: optText(200),
  companySize: optText(60),
  format: optText(200),
  participantsNumber: optText(60),
  preferredDates: optText(500),
  objectives: optText(5_000),
  budget: optText(200),
  message: optText(10_000),
});

export const partenaireSchema = z.looseObject({
  ...baseShape,
  organizationName: optText(200),
  contactFirstName: optText(100),
  contactLastName: optText(100),
  position: optText(200),
  website: optText(500),
  partnershipType: optText(200),
  partnershipGoals: optText(5_000),
  message: optText(10_000),
  audience: optText(60),
  audienceLabel: optText(200),
  organizationType: optText(200),
  venueCity: optText(200),
  venueType: optText(200),
  venueCapacity: optText(60),
  expertise: optText(2_000),
});

export const reclamationSchema = z.looseObject({
  ...baseShape,
  nom: optText(100),
  prenom: optText(100),
  telephone: optText(40),
  numeroCommande: optText(100),
  typeReclamation: optText(60),
  description: optText(10_000),
});

export const accompagnementSchema = z.looseObject({
  ...baseShape,
  firstName: optText(100),
  lastName: optText(100),
  accompagnementType: optText(60),
  serviceName: optText(200),
  projectName: optText(200),
  projectDescription: optText(5_000),
  projectStage: optText(60),
  objectives: optText(5_000),
  availability: optText(500),
  additionalInfo: optText(5_000),
  hasReservedBooking: optBool,
});

export const newsletterSchema = z.looseObject({
  ...baseShape,
  source: optText(200),
});

export const starterKitSchema = z.looseObject({
  ...baseShape,
  prenom: optText(100),
  firstName: optText(100),
  consent: optBool,
  stade: optText(60),
});

export type CandidaturePayload = z.infer<typeof candidatureSchema>;
export type ContactPayload = z.infer<typeof contactSchema>;
export type EntreprisePayload = z.infer<typeof entrepriseSchema>;
export type PartenairePayload = z.infer<typeof partenaireSchema>;
export type ReclamationPayload = z.infer<typeof reclamationSchema>;
export type AccompagnementPayload = z.infer<typeof accompagnementSchema>;
export type NewsletterPayload = z.infer<typeof newsletterSchema>;
export type StarterKitPayload = z.infer<typeof starterKitSchema>;
type BasePayload = z.infer<z.ZodObject<typeof baseShape, z.core.$loose>>;

/* ═════════════════════════════ Types normalisés ═════════════════════════════ */

export type ContactDraft = Pick<Contact, "email" | "firstName" | "lastName" | "lifecycle" | "source" | "tags" | "consent"> &
  Partial<Pick<Contact, "phone" | "city" | "age" | "jobTitle" | "utm">>;

export type OrganizationDraft = Pick<Organization, "name" | "type"> &
  Partial<Pick<Organization, "sector" | "size" | "city" | "website">> & { nameKey: string };

export type SubmissionDraft = Pick<Submission, "type" | "status" | "receivedAt" | "name" | "email" | "fields" | "consent"> &
  Partial<Pick<Submission, "phone" | "company" | "subject" | "message" | "idempotencyKey" | "utm" | "slaDueAt">>;

export type ProjectDraft = Pick<Project, "name" | "description" | "stage" | "targetMarket">;

export type ApplicationDraft = Pick<
  Application,
  | "status"
  | "leadStage"
  | "intent"
  | "persona"
  | "submittedAt"
  | "motivation"
  | "entrepreneurialXp"
  | "technicalXp"
  | "availability"
  | "budget"
> &
  Partial<Pick<Application, "heardFrom" | "idempotencyKey" | "utm">> & {
    /** Code session (SW-0011) : rattachement à crm.sessions.code. */
    eventCode?: string;
    /** Offre demandée (nom ou code catalogue). */
    offer?: string;
    project?: ProjectDraft;
  };

export type ComplaintDraft = Pick<Complaint, "type" | "severity" | "channel" | "subject" | "description" | "receivedAt">;

export type DealDraft = Pick<Deal, "title" | "type" | "stage" | "amountCents" | "probability"> & Partial<Pick<Deal, "nextStep" | "source">>;

export type IntakeAction =
  | { kind: "application"; application: ApplicationDraft }
  | { kind: "complaint"; complaint: ComplaintDraft }
  | { kind: "deal"; deal: DealDraft }
  | { kind: "starter_kit"; stade: string; enroll: boolean }
  | { kind: "newsletter" }
  | { kind: "none" };

export type TaskDraft = Pick<Task, "title" | "kind" | "priority"> & { notes?: string };

/** Délai de réponse promis : heures calendaires (demandes) ou jours ouvrés (réclamations). */
export type SlaRule = { hours: number; businessDays: boolean };

export type AckKind = "candidature" | "contact" | "entreprise" | "partenaire" | "accompagnement" | "reclamation";

export interface IntakeMeta {
  origin?: string;
  ipAddress?: string;
  userAgent?: string;
  submittedAt?: string;
  referrer?: string;
}

export interface NormalizedIntake {
  form: IntakeForm;
  receivedAt: ISODate;
  submission: SubmissionDraft;
  contact: ContactDraft;
  organization?: OrganizationDraft;
  action: IntakeAction;
  task?: TaskDraft;
  sla: SlaRule | null;
  ack: AckKind | null;
  meta: IntakeMeta;
  /** Payload reçu (sans honeypot) — conservé en base pour preuve / rejeu. */
  raw: Record<string, unknown>;
}

export interface IntakeIssue {
  path: string;
  message: string;
}

export type IntakeResult =
  | { ok: true; value: NormalizedIntake }
  | { ok: false; error: "VALIDATION_ERROR" | "CONSENT_REQUIRED"; issues: IntakeIssue[] };

/* ═════════════════════════════ Fonctions pures ═════════════════════════════ */

/** Email normalisé : clé unique de dédoublonnage des contacts. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const ACCENTS_FROM = "àáâãäåçèéêëìíîïñòóôõöùúûüýÿ";
const ACCENTS_TO = "aaaaaaceeeeiiiinooooouuuuyy";

/**
 * Clé de dédoublonnage d'une organisation — MIROIR EXACT de crm.normalize_name()
 * (migration 1) : minuscules, accents, ponctuation et forme juridique retirés.
 */
export function normalizeOrgName(name: string): string {
  const lowered = name.toLowerCase().replaceAll("œ", "oe").replaceAll("æ", "ae");
  let out = "";
  for (const ch of lowered) {
    const i = ACCENTS_FROM.indexOf(ch);
    out += i >= 0 ? ACCENTS_TO[i] : ch;
  }
  return out
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(sas|sasu|sarl|eurl|sa|sci|scop|inc|ltd|llc|gmbh)\b/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

/** Union de tags sans doublon (insensible à la casse), ordre conservé. */
export function mergeTags(current: readonly string[] | null | undefined, incoming: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const tag of [...(current ?? []), ...incoming]) {
    const t = tag.trim();
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Rang de maturité : un formulaire ne fait jamais reculer un contact (alumni ≠> lead). */
export const LIFECYCLE_RANK: Record<ContactLifecycle, number> = {
  lead: 0,
  prospect: 1,
  candidat: 2,
  client: 3,
  partenaire: 3,
  participant: 4,
  alumni: 5,
};

export function mergeLifecycle(current: ContactLifecycle | null | undefined, incoming: ContactLifecycle): ContactLifecycle {
  if (!current) return incoming;
  return LIFECYCLE_RANK[incoming] > LIFECYCLE_RANK[current] ? incoming : current;
}

/**
 * Fusion des consentements : un formulaire peut DONNER un consentement (horodaté),
 * jamais le retirer implicitement (le désabonnement est une action explicite).
 * Un nouvel opt-in marketing après désabonnement vaut ré-abonnement.
 */
export function mergeConsent(current: Consent | null | undefined, incoming: Consent): Consent {
  const base: Consent = current ?? { gdpr: false, marketing: false };
  const out: Consent = {
    gdpr: base.gdpr || incoming.gdpr,
    marketing: base.marketing || incoming.marketing,
  };
  const marketingAt = incoming.marketing ? incoming.marketingAt ?? base.marketingAt : base.marketingAt;
  if (marketingAt) out.marketingAt = marketingAt;
  if (base.unsubscribedAt && !incoming.marketing) {
    out.unsubscribedAt = base.unsubscribedAt;
    out.marketing = false;
  }
  const source = incoming.gdpr || incoming.marketing ? incoming.source ?? base.source : base.source;
  if (source) out.source = source;
  return out;
}

export type ContactMergeResult =
  | { kind: "insert"; contact: ContactDraft & { orgId?: ID; score: number } }
  | { kind: "update"; patch: Partial<Contact> }
  | { kind: "noop" };

/**
 * Fusionne un contact existant avec les données d'un formulaire :
 * complète les champs vides, fusionne tags / cycle de vie / consentement,
 * conserve la source et les UTM du premier contact (attribution first-touch).
 */
export function mergeContact(existing: Contact | null, draft: ContactDraft, orgId?: ID): ContactMergeResult {
  if (!existing) return { kind: "insert", contact: { ...draft, orgId, score: 0 } };
  const patch: Partial<Contact> = {};
  const fill = <K extends "firstName" | "lastName" | "phone" | "city" | "jobTitle">(key: K) => {
    const incoming = draft[key];
    if (incoming && !existing[key]) patch[key] = incoming;
  };
  fill("firstName");
  fill("lastName");
  fill("phone");
  fill("city");
  fill("jobTitle");
  if (draft.age !== undefined && existing.age == null) patch.age = draft.age;
  if (orgId && !existing.orgId) patch.orgId = orgId;
  if (draft.utm && !existing.utm) patch.utm = draft.utm;

  const lifecycle = mergeLifecycle(existing.lifecycle, draft.lifecycle);
  if (lifecycle !== existing.lifecycle) patch.lifecycle = lifecycle;

  const tags = mergeTags(existing.tags, draft.tags);
  if (tags.length !== (existing.tags ?? []).length) patch.tags = tags;

  const consent = mergeConsent(existing.consent, draft.consent);
  if (JSON.stringify(consent) !== JSON.stringify(existing.consent ?? null)) patch.consent = consent;

  return Object.keys(patch).length ? { kind: "update", patch } : { kind: "noop" };
}

/** Sérialisation JSON à clés triées (empreinte stable). */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

/** Clés variables d'un envoi à l'autre, exclues de l'empreinte d'idempotence. */
const VOLATILE_KEYS = new Set(["submittedAt", "ipAddress", "userAgent", "origin", "consentRGPDDate", "consentNewsletterDate", "referrer"]);

/**
 * Clé d'idempotence : leadId du tunnel (candidature), en-tête Idempotency-Key, sinon
 * empreinte SHA-256 du contenu (même formulaire, même contenu, même jour → même clé :
 * absorbe les doubles clics et les rejeux réseau).
 */
export function computeIdempotencyKey(form: IntakeForm, payload: Record<string, unknown>, receivedAt: ISODate, headerKey?: string | null): string {
  const leadId = typeof payload.leadId === "string" ? payload.leadId.trim() : "";
  if (form === "candidature" && leadId) return leadId;
  if (headerKey && headerKey.trim()) return `k:${headerKey.trim().slice(0, 200)}`;
  const stable = Object.fromEntries(Object.entries(payload).filter(([k]) => !VOLATILE_KEYS.has(k)));
  const digest = createHash("sha256").update(`${form}|${receivedAt.slice(0, 10)}|${stableStringify(stable)}`).digest("hex");
  return `h:${digest.slice(0, 40)}`;
}

/** Clés déjà mappées sur des colonnes (non recopiées dans `fields`). */
const CORE_KEYS = new Set([
  "email", "firstName", "lastName", "prenom", "nom", "contactFirstName", "contactLastName", "phone", "telephone",
  "message", "subject", "consentRGPD", "consentNewsletter", "consentRGPDDate", "consentNewsletterDate", "consent",
  "submittedAt", "origin", "ipAddress", "userAgent", "referrer", "utm", "utm_source", "utm_medium", "utm_campaign",
  "leadId",
]);

/** Champs spécifiques du formulaire → Record<string, string> (objets aplatis sur un niveau). */
export function buildFields(payload: Record<string, unknown>, extra: Record<string, string | undefined> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    if (Object.keys(out).length >= 80) return;
    let str: string;
    if (Array.isArray(value)) str = value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
    else if (typeof value === "object") str = JSON.stringify(value);
    else str = String(value);
    if (str.trim()) out[key.slice(0, 80)] = str.slice(0, 5_000);
  };
  for (const [key, value] of Object.entries(payload)) {
    if (CORE_KEYS.has(key)) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [sub, v] of Object.entries(value as Record<string, unknown>)) put(`${key}.${sub}`, v);
    } else {
      put(key, value);
    }
  }
  for (const [key, value] of Object.entries(extra)) put(key, value);
  return out;
}

/** Date ISO valide ou undefined. */
function isoOrUndefined(value: string | undefined): ISODate | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function addHours(iso: ISODate, hours: number): ISODate {
  return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();
}

/** + N jours ouvrés (samedi/dimanche exclus ; jours fériés non gérés). */
export function addBusinessDays(iso: ISODate, days: number): ISODate {
  const d = new Date(iso);
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return d.toISOString();
}

export function computeSlaDueAt(receivedAt: ISODate, sla: SlaRule): ISODate {
  return sla.businessDays ? addBusinessDays(receivedAt, Math.max(1, Math.ceil(sla.hours / 24))) : addHours(receivedAt, sla.hours);
}

/**
 * Budget libre → centimes (borne basse, prudente) : « 5 000 € », « 5k-10k », « 10 000 à 20 000 € ».
 * Retourne 0 si aucun montant exploitable.
 */
export function parseBudgetCents(budget: string | undefined): number {
  if (!budget) return 0;
  const cleaned = budget.toLowerCase().replace(/(\d)[\s\u00a0\u202f.](?=\d{3}\b)/g, "$1");
  const match = /(\d+(?:[.,]\d+)?)\s*(k|m)?/.exec(cleaned);
  if (!match) return 0;
  const value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value)) return 0;
  const factor = match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;
  const euros = value * factor;
  return euros > 0 && euros < 10_000_000 ? Math.round(euros * 100) : 0;
}

function mapLeadStage(value: string | undefined): LeadStage {
  const v = (value ?? "").toLowerCase().replace(/-/g, "_");
  const allowed: LeadStage[] = ["capture", "qualification", "out_of_scope", "booking", "enrichment"];
  return (allowed as string[]).includes(v) ? (v as LeadStage) : "capture";
}

function mapProjectStage(value: string | undefined): ProjectStage {
  switch ((value ?? "").toLowerCase()) {
    case "cadrage":
      return "cadrage";
    case "prototype":
      return "prototype";
    case "mvp":
    case "mvp-en-cours":
      return "mvp";
    case "produit-lance":
    case "lance":
      return "lance";
    case "traction":
      return "traction";
    default:
      return "idee"; // idee | exploration | inconnu
  }
}

function mapTechnicalXp(value: string | undefined): Application["technicalXp"] {
  const v = (value ?? "").toLowerCase();
  if (/expert/.test(v)) return "expert";
  if (/avanc|confirm|advanced|senior|d[ée]velopp/.test(v)) return "avance";
  if (/interm/.test(v)) return "intermediaire";
  if (/basi|notion|beginner-plus/.test(v)) return "basique";
  return "debutant";
}

function mapEntrepreneurialXp(value: string | undefined): Application["entrepreneurialXp"] {
  const v = (value ?? "").toLowerCase();
  if (/serial|plusieurs entreprises/.test(v)) return "serial";
  if (/exp[ée]riment|oui|yes/.test(v)) return "experimente";
  if (/quelques|some|plusieurs/.test(v)) return "quelques";
  if (/premi|first/.test(v)) return "premiere";
  return "aucune";
}

function mapPersona(technicalXp: Application["technicalXp"], ...texts: (string | undefined)[]): Persona {
  if (texts.some((t) => t && /reconversion/i.test(t))) return "reconversion";
  return technicalXp === "avance" || technicalXp === "expert" || technicalXp === "intermediaire" ? "tech" : "non_tech";
}

function mapComplaintType(value: string | undefined): ComplaintType {
  const allowed: ComplaintType[] = ["qualite", "organisation", "paiement", "remboursement", "annulation", "accessibilite", "autre"];
  const v = (value ?? "").toLowerCase();
  return (allowed as string[]).includes(v) ? (v as ComplaintType) : "autre";
}

const COMPLAINT_TYPE_LABEL: Record<ComplaintType, string> = {
  qualite: "qualité pédagogique",
  organisation: "organisation / logistique",
  paiement: "paiement",
  remboursement: "remboursement",
  annulation: "annulation",
  accessibilite: "accessibilité",
  autre: "autre",
};

function mapCompanySize(value: string | undefined): Organization["size"] | undefined {
  if (!value) return undefined;
  const allowed: NonNullable<Organization["size"]>[] = ["1-10", "11-50", "51-200", "201-500", "500+"];
  const v = value.replace(/\s/g, "");
  if ((allowed as string[]).includes(v)) return v as Organization["size"];
  // « plus de 500 » / « >500 » : au-delà de la borne annoncée
  const above = /^(plusde|>)/i.test(v);
  const n = parseInt(above ? v.replace(/\D/g, "") : v, 10) + (above ? 1 : 0);
  if (!Number.isFinite(n)) return undefined;
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 200) return "51-200";
  if (n <= 500) return "201-500";
  return "500+";
}

function isSchoolLike(...values: (string | undefined)[]): boolean {
  return values.some((v) => v && /[ée]cole|universit|enseignement|[ée]ducation|campus|business school/i.test(v));
}

function mapPartnerOrgType(audience: string | undefined, organizationType: string | undefined): OrgType {
  switch ((audience ?? "").toLowerCase()) {
    case "ecole":
      return "ecole";
    case "entreprise":
      return "entreprise";
    case "incubateur":
      return "incubateur";
    case "lieu":
      return "lieu";
  }
  const t = (organizationType ?? "").toLowerCase();
  if (isSchoolLike(t)) return "ecole";
  if (/incubat|acc[ée]l[ée]rat/.test(t)) return "incubateur";
  if (/collectivit|mairie|r[ée]gion|d[ée]partement|m[ée]tropole/.test(t)) return "collectivite";
  if (/fonds|invest|vc|business angel/.test(t)) return "investisseur";
  if (/m[ée]dia|presse|journal/.test(t)) return "media";
  if (/opco|financeur/.test(t)) return "financeur";
  if (/lieu|villa|tiers-lieu|coworking/.test(t)) return "lieu";
  if (/entreprise|soci[ée]t[ée]|startup|groupe/.test(t)) return "entreprise";
  return "autre";
}

function fullName(first?: string, last?: string, fallback = ""): string {
  return [first, last].filter(Boolean).join(" ").trim() || fallback;
}

function extractUtm(p: BasePayload): Utm | undefined {
  const utm: Utm = {
    source: p.utm?.source ?? p.utm_source,
    medium: p.utm?.medium ?? p.utm_medium,
    campaign: p.utm?.campaign ?? p.utm_campaign,
    referrer: p.utm?.referrer ?? p.referrer,
  };
  const clean = Object.fromEntries(Object.entries(utm).filter(([, v]) => v)) as Utm;
  return Object.keys(clean).length ? clean : undefined;
}

/** Consentement tel que DONNÉ par l'internaute (jamais forcé à true). */
function buildConsent(form: IntakeForm, gdpr: boolean, marketing: boolean, marketingAt: string | undefined, receivedAt: ISODate, origin?: string): Consent {
  const consent: Consent = { gdpr, marketing };
  if (marketing) consent.marketingAt = isoOrUndefined(marketingAt) ?? receivedAt;
  if (gdpr || marketing) consent.source = `formulaire:${form}${origin ? ` (${origin})` : ""} @ ${receivedAt}`;
  return consent;
}

const DEFAULT_SLA: SlaRule = { hours: 48, businessDays: false };
const COMPLAINT_SLA: SlaRule = { hours: 48, businessDays: true };

/* ═════════════════════════════ Normalisation par formulaire ═════════════════════════════ */

interface NormalizeContext {
  now: Date;
  /** En-tête Idempotency-Key éventuel. */
  idempotencyHeader?: string | null;
}

type Common = {
  receivedAt: ISODate;
  meta: IntakeMeta;
  utm?: Utm;
  raw: Record<string, unknown>;
  idempotencyKey: string;
};

function common(form: IntakeForm, p: BasePayload & Record<string, unknown>, ctx: NormalizeContext): Common {
  const receivedAt = ctx.now.toISOString();
  return {
    receivedAt,
    meta: {
      origin: p.origin,
      ipAddress: p.ipAddress,
      userAgent: p.userAgent,
      submittedAt: isoOrUndefined(p.submittedAt),
      referrer: p.referrer,
    },
    utm: extractUtm(p),
    raw: p,
    idempotencyKey: computeIdempotencyKey(form, p, receivedAt, ctx.idempotencyHeader),
  };
}

function finalize(
  form: IntakeForm,
  c: Common,
  parts: Omit<NormalizedIntake, "form" | "receivedAt" | "meta" | "raw" | "submission"> & {
    submission: Omit<SubmissionDraft, "type" | "receivedAt" | "idempotencyKey" | "utm" | "slaDueAt">;
  },
): NormalizedIntake {
  const submission: SubmissionDraft = {
    ...parts.submission,
    type: FORM_SUBMISSION_TYPE[form],
    receivedAt: c.receivedAt,
    idempotencyKey: c.idempotencyKey,
    utm: c.utm,
    slaDueAt: parts.sla ? computeSlaDueAt(c.receivedAt, parts.sla) : undefined,
  };
  return { form, receivedAt: c.receivedAt, meta: c.meta, raw: c.raw, ...parts, submission };
}

function normalizeCandidature(p: CandidaturePayload, ctx: NormalizeContext): NormalizedIntake {
  const c = common("candidature", p, ctx);
  const name = fullName(p.firstName, p.lastName, p.email);
  const leadStage = mapLeadStage(p.leadStage);
  const technicalXp = mapTechnicalXp(p.technicalLevel);
  const status: ApplicationStatus =
    leadStage === "out_of_scope" ? "hors_cible" : p.bookingConfirmed ? "entretien" : p.qualified ? "qualifiee" : "nouvelle";
  const eventCode = (p.event_id ?? p.session?.eventCode)?.toUpperCase();
  const availability =
    p.availability && p.availability.toLowerCase() === "autre" && p.availabilityOther
      ? p.availabilityOther
      : [p.availability, p.availabilityOther].filter(Boolean).join(" — ");
  const consent = buildConsent("candidature", p.consentRGPD === true, p.consentNewsletter === true, p.consentNewsletterDate, c.receivedAt, p.origin);

  const project: ProjectDraft | undefined =
    p.projectName || p.projectDescription
      ? {
          name: p.projectName ?? `Projet de ${fullName(p.firstName, p.lastName, p.email)}`,
          description: p.projectDescription ?? "",
          stage: mapProjectStage(p.projectStage),
          targetMarket: p.targetMarket ?? "",
        }
      : undefined;

  return finalize("candidature", c, {
    submission: {
      status: "nouvelle",
      name,
      email: p.email,
      phone: p.phone,
      subject: `Candidature${eventCode ? ` ${eventCode}` : ""}${p.intent === "diagnostic" ? " (diagnostic)" : ""}`,
      message: p.projectDescription ?? p.motivation,
      fields: buildFields(p, { leadStage }),
      consent,
    },
    contact: {
      email: p.email,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      phone: p.phone,
      city: p.location,
      age: p.age,
      lifecycle: FORM_LIFECYCLE.candidature,
      source: FORM_SOURCE.candidature,
      tags: [FORM_TAG.candidature, ...(eventCode ? [eventCode] : [])],
      consent,
      utm: c.utm,
    },
    action: {
      kind: "application",
      application: {
        status,
        leadStage,
        intent: p.intent === "diagnostic" ? "diagnostic" : "candidature",
        persona: mapPersona(technicalXp, p.motivation, p.objectives, p.additionalInfo),
        submittedAt: c.meta.submittedAt ?? c.receivedAt,
        motivation: p.motivation ?? p.objectives ?? "",
        entrepreneurialXp: mapEntrepreneurialXp(p.entrepreneurialExperience),
        technicalXp,
        availability,
        budget: p.budget ?? "",
        heardFrom: p.hearAboutUs,
        idempotencyKey: p.leadId,
        utm: c.utm,
        eventCode,
        offer: p.offer,
        project,
      },
    },
    task: {
      title: `Qualifier la candidature de ${name}${eventCode ? ` (${eventCode})` : ""}`,
      kind: "appel",
      priority: status === "hors_cible" ? "basse" : "normale",
    },
    sla: DEFAULT_SLA,
    ack: "candidature",
  });
}

function normalizeContact(p: ContactPayload, ctx: NormalizeContext): NormalizedIntake {
  const c = common("contact", p, ctx);
  const name = fullName(p.firstName, p.lastName, p.email);
  const consent = buildConsent("contact", p.consentRGPD === true, p.consentNewsletter === true, p.consentNewsletterDate, c.receivedAt, p.origin);
  return finalize("contact", c, {
    submission: { status: "nouvelle", name, email: p.email, phone: p.phone, subject: p.subject, message: p.message, fields: buildFields(p), consent },
    contact: {
      email: p.email,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      phone: p.phone,
      lifecycle: FORM_LIFECYCLE.contact,
      source: FORM_SOURCE.contact,
      tags: [FORM_TAG.contact],
      consent,
      utm: c.utm,
    },
    action: { kind: "none" },
    task: { title: `Répondre à ${name}${p.subject ? ` — ${p.subject}` : ""}`, kind: "email", priority: "normale" },
    sla: DEFAULT_SLA,
    ack: "contact",
  });
}

function normalizeEntreprise(p: EntreprisePayload, ctx: NormalizeContext): NormalizedIntake {
  const c = common("entreprise", p, ctx);
  const name = fullName(p.contactFirstName, p.contactLastName, p.email);
  const company = p.companyName;
  const school = isSchoolLike(p.sector, company);
  const consent = buildConsent("entreprise", p.consentRGPD === true, p.consentNewsletter === true, p.consentNewsletterDate, c.receivedAt, p.origin);
  const dealType: DealType = school ? "ecole" : "entreprise";
  return finalize("entreprise", c, {
    submission: {
      status: "nouvelle",
      name,
      email: p.email,
      phone: p.phone,
      company,
      subject: `Demande ${school ? "école" : "entreprise"}${company ? ` — ${company}` : ""}${p.format ? ` (${p.format})` : ""}`,
      message: p.message ?? p.objectives,
      fields: buildFields(p),
      consent,
    },
    contact: {
      email: p.email,
      firstName: p.contactFirstName ?? "",
      lastName: p.contactLastName ?? "",
      phone: p.phone,
      jobTitle: p.position,
      lifecycle: FORM_LIFECYCLE.entreprise,
      source: FORM_SOURCE.entreprise,
      tags: [FORM_TAG.entreprise],
      consent,
      utm: c.utm,
    },
    organization: company
      ? { name: company, nameKey: normalizeOrgName(company), type: school ? "ecole" : "entreprise", sector: p.sector, size: mapCompanySize(p.companySize) }
      : undefined,
    action: {
      kind: "deal",
      deal: {
        title: `${company ?? name} — ${p.format ?? (school ? "Startup Village" : "Programme entreprise")}`,
        type: dealType,
        stage: "nouveau",
        amountCents: parseBudgetCents(p.budget),
        probability: DEAL_STAGE_PROBABILITY.nouveau,
        nextStep: "Rappeler sous 48 h",
        source: FORM_SOURCE.entreprise,
      },
    },
    task: { title: `Rappeler ${company ?? name}${company ? ` (${name})` : ""}`, kind: "appel", priority: "haute" },
    sla: DEFAULT_SLA,
    ack: "entreprise",
  });
}

function normalizePartenaire(p: PartenairePayload, ctx: NormalizeContext): NormalizedIntake {
  const c = common("partenaire", p, ctx);
  const name = fullName(p.contactFirstName, p.contactLastName, p.email);
  const orgName = p.organizationName;
  const consent = buildConsent("partenaire", p.consentRGPD === true, p.consentNewsletter === true, p.consentNewsletterDate, c.receivedAt, p.origin);
  const label = p.audienceLabel ?? p.partnershipType ?? p.audience;
  const dealType: DealType = /sponsor/i.test(p.partnershipType ?? "") ? "sponsoring" : "partenariat";
  return finalize("partenaire", c, {
    submission: {
      status: "nouvelle",
      name,
      email: p.email,
      phone: p.phone,
      company: orgName,
      subject: `Partenariat${label ? ` ${label}` : ""}${orgName ? ` — ${orgName}` : ""}`,
      message: p.message ?? p.partnershipGoals,
      fields: buildFields(p),
      consent,
    },
    contact: {
      email: p.email,
      firstName: p.contactFirstName ?? "",
      lastName: p.contactLastName ?? "",
      phone: p.phone,
      jobTitle: p.position,
      city: p.venueCity,
      lifecycle: FORM_LIFECYCLE.partenaire,
      source: FORM_SOURCE.partenaire,
      tags: mergeTags([FORM_TAG.partenaire], p.audience ? [`audience:${p.audience}`] : []),
      consent,
      utm: c.utm,
    },
    organization: orgName
      ? {
          name: orgName,
          nameKey: normalizeOrgName(orgName),
          type: mapPartnerOrgType(p.audience, p.organizationType),
          website: p.website,
          city: p.venueCity,
        }
      : undefined,
    action: {
      kind: "deal",
      deal: {
        title: `Partenariat${label ? ` ${label}` : ""} — ${orgName ?? name}`,
        type: dealType,
        stage: "nouveau",
        amountCents: 0,
        probability: DEAL_STAGE_PROBABILITY.nouveau,
        nextStep: "Qualifier le partenariat",
        source: FORM_SOURCE.partenaire,
      },
    },
    task: { title: `Répondre à la proposition de partenariat — ${orgName ?? name}`, kind: "email", priority: "normale" },
    sla: DEFAULT_SLA,
    ack: "partenaire",
  });
}

function normalizeReclamation(p: ReclamationPayload, ctx: NormalizeContext): NormalizedIntake {
  const c = common("reclamation", p, ctx);
  const name = fullName(p.prenom, p.nom, p.email);
  const type = mapComplaintType(p.typeReclamation);
  const consent = buildConsent("reclamation", p.consentRGPD === true, p.consentNewsletter === true, p.consentNewsletterDate, c.receivedAt, p.origin);
  const description = [p.description ?? "", p.numeroCommande ? `N° de commande : ${p.numeroCommande}` : ""].filter(Boolean).join("\n\n");
  return finalize("reclamation", c, {
    submission: {
      status: "nouvelle",
      name,
      email: p.email,
      phone: p.phone ?? p.telephone,
      subject: `Réclamation — ${COMPLAINT_TYPE_LABEL[type]}`,
      message: description,
      fields: buildFields(p),
      consent,
    },
    contact: {
      email: p.email,
      firstName: p.prenom ?? "",
      lastName: p.nom ?? "",
      phone: p.telephone ?? p.phone,
      lifecycle: FORM_LIFECYCLE.reclamation,
      source: FORM_SOURCE.reclamation,
      tags: [FORM_TAG.reclamation],
      consent,
      utm: c.utm,
    },
    action: {
      kind: "complaint",
      complaint: {
        type,
        severity: "mineure", // tri par l'équipe qualité
        channel: "formulaire",
        subject: `Réclamation ${COMPLAINT_TYPE_LABEL[type]}${p.numeroCommande ? ` — commande ${p.numeroCommande}` : ""}`,
        description,
        receivedAt: c.receivedAt,
      },
    },
    task: { title: `Accuser réception et traiter la réclamation de ${name}`, kind: "qualiopi", priority: "haute" },
    sla: COMPLAINT_SLA,
    ack: "reclamation",
  });
}

function normalizeAccompagnement(p: AccompagnementPayload, ctx: NormalizeContext): NormalizedIntake {
  const c = common("accompagnement", p, ctx);
  const name = fullName(p.firstName, p.lastName, p.email);
  const consent = buildConsent("accompagnement", p.consentRGPD === true, p.consentNewsletter === true, p.consentNewsletterDate, c.receivedAt, p.origin);
  const service = p.serviceName ?? (p.accompagnementType ? `accompagnement ${p.accompagnementType}` : "accompagnement");
  const stage = p.hasReservedBooking ? "rdv" : "nouveau";
  return finalize("accompagnement", c, {
    submission: {
      status: "nouvelle",
      name,
      email: p.email,
      phone: p.phone,
      subject: `Accompagnement — ${service}`,
      message: p.projectDescription ?? p.additionalInfo ?? p.objectives,
      fields: buildFields(p),
      consent,
    },
    contact: {
      email: p.email,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      phone: p.phone,
      lifecycle: FORM_LIFECYCLE.accompagnement,
      source: FORM_SOURCE.accompagnement,
      tags: mergeTags([FORM_TAG.accompagnement], p.accompagnementType ? [p.accompagnementType] : []),
      consent,
      utm: c.utm,
    },
    action: {
      kind: "deal",
      deal: {
        title: `${service.charAt(0).toUpperCase()}${service.slice(1)} — ${name}`,
        type: "accompagnement",
        stage,
        amountCents: 0,
        probability: DEAL_STAGE_PROBABILITY[stage],
        nextStep: p.hasReservedBooking ? "Préparer le rendez-vous réservé" : "Rappeler sous 48 h",
        source: FORM_SOURCE.accompagnement,
      },
    },
    task: { title: `Rappeler ${name} — ${service}`, kind: "appel", priority: p.hasReservedBooking ? "haute" : "normale" },
    sla: DEFAULT_SLA,
    ack: "accompagnement",
  });
}

function normalizeNewsletter(p: NewsletterPayload, ctx: NormalizeContext): NormalizedIntake {
  const c = common("newsletter", p, ctx);
  const consent = buildConsent("newsletter", p.consentRGPD === true, p.consentNewsletter === true, p.consentNewsletterDate, c.receivedAt, p.origin ?? p.source);
  return finalize("newsletter", c, {
    submission: { status: "convertie", name: p.email, email: p.email, subject: "Inscription newsletter", fields: buildFields(p), consent },
    contact: {
      email: p.email,
      firstName: "",
      lastName: "",
      lifecycle: FORM_LIFECYCLE.newsletter,
      source: FORM_SOURCE.newsletter,
      tags: [FORM_TAG.newsletter],
      consent,
      utm: c.utm,
    },
    action: { kind: "newsletter" },
    sla: null,
    ack: null,
  });
}

function normalizeStarterKit(p: StarterKitPayload, ctx: NormalizeContext): NormalizedIntake {
  const c = common("starter-kit", p, ctx);
  const prenom = p.prenom ?? p.firstName;
  const stade = (p.stade ?? "incertain").toLowerCase();
  // Case unique du formulaire Starter Kit : vaut acceptation de la politique de confidentialité
  // ET de l'envoi du kit / des emails associés — uniquement si cochée.
  const accepted = p.consent === true || p.consentNewsletter === true;
  const consent = buildConsent("starter-kit", accepted || p.consentRGPD === true, accepted, p.consentNewsletterDate, c.receivedAt, p.origin);
  return finalize("starter-kit", c, {
    submission: {
      status: "convertie",
      name: prenom ?? p.email,
      email: p.email,
      subject: "Téléchargement Digital Starter Kit",
      fields: buildFields(p),
      consent,
    },
    contact: {
      email: p.email,
      firstName: prenom ?? "",
      lastName: "",
      lifecycle: FORM_LIFECYCLE["starter-kit"],
      source: FORM_SOURCE["starter-kit"],
      tags: [FORM_TAG["starter-kit"], `stade:${stade}`],
      consent,
      utm: c.utm,
    },
    action: { kind: "starter_kit", stade, enroll: accepted },
    sla: null,
    ack: null,
  });
}

function issuesOf(error: z.ZodError): IntakeIssue[] {
  return error.issues.map((i) => ({ path: i.path.map(String).join(".") || "(racine)", message: i.message }));
}

/**
 * Valide + normalise un payload du site (fonction pure : aucune E/S).
 * `now` est injectable pour les tests.
 */
export function normalizeIntake(
  form: IntakeForm,
  payload: unknown,
  opts: { now?: Date; idempotencyHeader?: string | null } = {},
): IntakeResult {
  const ctx: NormalizeContext = { now: opts.now ?? new Date(), idempotencyHeader: opts.idempotencyHeader };
  switch (form) {
    case "candidature": {
      const r = candidatureSchema.safeParse(payload);
      return r.success ? { ok: true, value: normalizeCandidature(r.data, ctx) } : { ok: false, error: "VALIDATION_ERROR", issues: issuesOf(r.error) };
    }
    case "contact": {
      const r = contactSchema.safeParse(payload);
      return r.success ? { ok: true, value: normalizeContact(r.data, ctx) } : { ok: false, error: "VALIDATION_ERROR", issues: issuesOf(r.error) };
    }
    case "entreprise": {
      const r = entrepriseSchema.safeParse(payload);
      return r.success ? { ok: true, value: normalizeEntreprise(r.data, ctx) } : { ok: false, error: "VALIDATION_ERROR", issues: issuesOf(r.error) };
    }
    case "partenaire": {
      const r = partenaireSchema.safeParse(payload);
      return r.success ? { ok: true, value: normalizePartenaire(r.data, ctx) } : { ok: false, error: "VALIDATION_ERROR", issues: issuesOf(r.error) };
    }
    case "reclamation": {
      const r = reclamationSchema.safeParse(payload);
      return r.success ? { ok: true, value: normalizeReclamation(r.data, ctx) } : { ok: false, error: "VALIDATION_ERROR", issues: issuesOf(r.error) };
    }
    case "accompagnement": {
      const r = accompagnementSchema.safeParse(payload);
      return r.success ? { ok: true, value: normalizeAccompagnement(r.data, ctx) } : { ok: false, error: "VALIDATION_ERROR", issues: issuesOf(r.error) };
    }
    case "newsletter": {
      const r = newsletterSchema.safeParse(payload);
      if (!r.success) return { ok: false, error: "VALIDATION_ERROR", issues: issuesOf(r.error) };
      // Pas d'inscription sans consentement explicite (RGPD / LCEN) — jamais présumé.
      if (r.data.consentNewsletter !== true) {
        return { ok: false, error: "CONSENT_REQUIRED", issues: [{ path: "consentNewsletter", message: "Consentement newsletter explicite requis" }] };
      }
      return { ok: true, value: normalizeNewsletter(r.data, ctx) };
    }
    case "starter-kit": {
      const r = starterKitSchema.safeParse(payload);
      return r.success ? { ok: true, value: normalizeStarterKit(r.data, ctx) } : { ok: false, error: "VALIDATION_ERROR", issues: issuesOf(r.error) };
    }
  }
}

/* ═════════════════════════════ Accusés de réception ═════════════════════════════ */

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

export type EmailSendResult = { ok: true; id?: string } | { ok: false; error: string };
export type EmailSender = (message: OutgoingEmail) => Promise<EmailSendResult>;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);

/** Remplace {{variable}} ; les valeurs sont échappées si `escape` (corrige l'injection HTML des emails n8n). */
export function fillTemplate(template: string, vars: Record<string, string | number | undefined>, escape: boolean): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    if (v === undefined || v === null) return "";
    return escape ? escapeHtml(String(v)) : String(v);
  });
}

const ACK_TEMPLATES: Record<AckKind, { subject: string; body: string }> = {
  candidature: {
    subject: "{{marque}} — nous avons bien reçu votre candidature",
    body: "Bonjour {{prenom}},\n\nMerci pour votre candidature{{session}}. Notre équipe l'étudie et revient vers vous sous 48 h (jours ouvrés) pour la suite.\n\nÀ très vite,\nL'équipe {{marque}}",
  },
  contact: {
    subject: "{{marque}} — nous avons bien reçu votre message",
    body: "Bonjour {{prenom}},\n\nMerci pour votre message{{objet}}. Nous vous répondons sous 48 h (jours ouvrés).\n\nL'équipe {{marque}}",
  },
  entreprise: {
    subject: "{{marque}} — votre demande{{entreprise}} est bien reçue",
    body: "Bonjour {{prenom}},\n\nMerci pour votre intérêt pour nos programmes. Un membre de l'équipe vous recontacte sous 48 h (jours ouvrés) pour échanger sur vos besoins.\n\nL'équipe {{marque}}",
  },
  partenaire: {
    subject: "{{marque}} — merci pour votre proposition de partenariat",
    body: "Bonjour {{prenom}},\n\nMerci pour votre proposition de partenariat{{entreprise}}. Nous l'étudions et revenons vers vous sous 48 h (jours ouvrés).\n\nL'équipe {{marque}}",
  },
  accompagnement: {
    subject: "{{marque}} — votre demande d'accompagnement est bien reçue",
    body: "Bonjour {{prenom}},\n\nMerci pour votre demande d'accompagnement. Nous revenons vers vous sous 48 h (jours ouvrés) pour organiser la suite.\n\nL'équipe {{marque}}",
  },
  reclamation: {
    subject: "{{marque}} — accusé de réception de votre réclamation {{numero}}",
    body: "Bonjour {{prenom}},\n\nNous accusons réception de votre réclamation, enregistrée sous la référence {{numero}}. Elle est transmise à notre responsable qualité, qui l'analysera et vous apportera une réponse dans les meilleurs délais.\n\nL'équipe {{marque}}",
  },
};

/** Construit l'accusé de réception (texte + HTML échappé). */
export function buildAckEmail(kind: AckKind, to: string, vars: Record<string, string | undefined>): OutgoingEmail {
  const tpl = ACK_TEMPLATES[kind];
  const text = fillTemplate(tpl.body, vars, false);
  const htmlBody = fillTemplate(tpl.body, vars, true)
    .split("\n\n")
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
  return {
    to,
    subject: fillTemplate(tpl.subject, vars, false).replace(/\s+/g, " ").trim(),
    text,
    html: `<!doctype html><html lang="fr"><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#111">${htmlBody}</body></html>`,
  };
}

/** Expéditeur Resend (API HTTP, sans SDK). */
export function createResendSender(apiKey: string, from: string, replyTo?: string): EmailSender {
  return async (message) => {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
          ...(message.replyTo ?? replyTo ? { reply_to: message.replyTo ?? replyTo } : {}),
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) return { ok: false, error: `Resend HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
      const data = (await res.json()) as { id?: string };
      return { ok: true, id: data.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  };
}

/* ═════════════════════════════ Persistance ═════════════════════════════ */

export class IntakePersistError extends Error {
  readonly step: string;
  readonly code?: string;
  constructor(step: string, cause: PostgrestError | Error) {
    super(`[intake:${step}] ${cause.message}`);
    this.name = "IntakePersistError";
    this.step = step;
    this.code = "code" in cause && typeof cause.code === "string" ? cause.code : undefined;
  }
}

export interface PersistOptions {
  now?: Date;
  /** Expéditeur des accusés de réception (absent → pas d'envoi). */
  sendEmail?: EmailSender;
}

export interface PersistResult {
  submissionId: ID;
  contactId: ID;
  contactCreated: boolean;
  organizationId?: ID;
  dealId?: ID;
  applicationId?: ID;
  applicationNumber?: number;
  sessionId?: ID;
  complaintId?: ID;
  complaintNumber?: string;
  taskId?: ID;
  /** Soumission déjà reçue (rejeu / double clic) : rien n'a été recréé. */
  duplicate: boolean;
  /** Candidature sur une session complète / close : demande conservée, pas de candidature créée. */
  sessionClosed: boolean;
  ack: "envoye" | "erreur" | "non_configure" | "non_applicable" | "deja_traite";
  sequenceSteps?: number;
}

type Row = Record<string, unknown>;

const toSnake = (k: string) => k.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());

/** Objet domaine (camelCase, types.ts) → ligne SQL (snake_case), valeurs undefined retirées. */
function toRow(obj: object): Row {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [toSnake(k), v]),
  );
}

/** Ligne SQL → objet domaine (cast : le schéma crm n'a pas encore de types générés). */
function fromRow<T>(row: Row): T {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [toCamel(k), v])) as T;
}

const newId = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "")}`;

function fail(step: string, error: PostgrestError | null): asserts error is null {
  if (error) throw new IntakePersistError(step, error);
}

const isUniqueViolation = (error: PostgrestError | null) => error?.code === "23505";

interface SettingsSnapshot {
  brand: string;
  slaHours: number;
  complaintAckHours: number;
  replyTo?: string;
}

async function loadSettings(db: CrmAdminClient): Promise<SettingsSnapshot> {
  const { data } = await db.from("settings").select("brand, sla_hours, complaint_ack_hours, email").limit(1).maybeSingle();
  const row = (data ?? {}) as Row;
  return {
    brand: typeof row.brand === "string" && row.brand ? row.brand : "StartupWeek",
    slaHours: typeof row.sla_hours === "number" ? row.sla_hours : 48,
    complaintAckHours: typeof row.complaint_ack_hours === "number" ? row.complaint_ack_hours : 48,
    replyTo: typeof row.email === "string" && row.email ? row.email : undefined,
  };
}

async function findOrCreateOrganization(db: CrmAdminClient, draft: OrganizationDraft): Promise<ID | undefined> {
  if (!draft.nameKey) return undefined;
  const { data: existing, error } = await db.from("organizations").select("id, sector, website, city, size").eq("name_key", draft.nameKey).limit(1).maybeSingle();
  fail("organization.select", error);
  if (existing) {
    const current = existing as Row;
    const patch: Row = {};
    if (draft.sector && !current.sector) patch.sector = draft.sector;
    if (draft.website && !current.website) patch.website = draft.website;
    if (draft.city && !current.city) patch.city = draft.city;
    if (draft.size && !current.size) patch.size = draft.size;
    if (Object.keys(patch).length) {
      const { error: upErr } = await db.from("organizations").update(patch).eq("id", current.id as string);
      fail("organization.update", upErr);
    }
    return current.id as ID;
  }
  const org: Partial<Organization> = {
    id: newId("org"),
    name: draft.name,
    type: draft.type,
    status: "prospect",
    sector: draft.sector,
    size: draft.size,
    city: draft.city,
    website: draft.website,
    tags: ["site"],
  };
  const { data, error: insErr } = await db.from("organizations").insert(toRow(org)).select("id").single();
  fail("organization.insert", insErr);
  return (data as Row).id as ID;
}

async function upsertContact(db: CrmAdminClient, draft: ContactDraft, orgId: ID | undefined, attempt = 0): Promise<{ contact: Contact; created: boolean }> {
  const { data: existingRow, error } = await db.from("contacts").select("*").eq("email", normalizeEmail(draft.email)).maybeSingle();
  fail("contact.select", error);
  const existing = existingRow ? fromRow<Contact>(existingRow as Row) : null;
  const merge = mergeContact(existing, draft, orgId);

  if (merge.kind === "insert") {
    const contact = { ...merge.contact, id: newId("ct"), email: normalizeEmail(draft.email) };
    const { data, error: insErr } = await db.from("contacts").insert(toRow(contact)).select("*").single();
    if (isUniqueViolation(insErr) && attempt === 0) return upsertContact(db, draft, orgId, 1); // course : créé entre-temps
    fail("contact.insert", insErr);
    return { contact: fromRow<Contact>(data as Row), created: true };
  }
  if (merge.kind === "update" && existing) {
    const { error: upErr } = await db.from("contacts").update(toRow(merge.patch)).eq("id", existing.id);
    fail("contact.update", upErr);
    return { contact: { ...existing, ...merge.patch }, created: false };
  }
  return { contact: existing as Contact, created: false };
}

interface SessionInfo {
  id: ID;
  code: string;
  status: string;
  registrationDeadline?: string;
  priceCents: number;
  name: string;
}

async function findSession(db: CrmAdminClient, code: string | undefined): Promise<SessionInfo | undefined> {
  if (!code) return undefined;
  const { data, error } = await db
    .from("sessions")
    .select("id, code, status, registration_deadline, price_cents, name")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  fail("session.select", error);
  if (!data) return undefined;
  const r = data as Row;
  return {
    id: r.id as ID,
    code: r.code as string,
    status: r.status as string,
    registrationDeadline: (r.registration_deadline as string | null) ?? undefined,
    priceCents: typeof r.price_cents === "number" ? r.price_cents : 0,
    name: (r.name as string) ?? "",
  };
}

/** Session fermée aux nouvelles candidatures : complète, annulée, en cours / terminée, ou date limite passée. */
export function isSessionClosed(session: { status: string; registrationDeadline?: string }, now: Date): boolean {
  if (["complet", "annule", "termine", "en_cours"].includes(session.status)) return true;
  if (session.registrationDeadline) {
    const deadline = new Date(session.registrationDeadline).getTime();
    if (Number.isFinite(deadline) && deadline < now.getTime()) return true;
  }
  return false;
}

/** Statuts qu'un formulaire peut faire progresser (les décisions de l'équipe ne sont jamais écrasées). */
const APPLICATION_AUTO_STATUSES: ApplicationStatus[] = ["nouvelle", "qualifiee", "entretien"];
const APPLICATION_STATUS_RANK: Partial<Record<ApplicationStatus, number>> = { nouvelle: 0, qualifiee: 1, entretien: 2, hors_cible: 3 };

async function upsertApplication(
  db: CrmAdminClient,
  draft: ApplicationDraft,
  contactId: ID,
  session: SessionInfo | undefined,
): Promise<{ id: ID; number?: number; created: boolean }> {
  // 1) Idempotence sur le leadId, sinon même contact + même session (hors sorties).
  let existing: Row | null = null;
  if (draft.idempotencyKey) {
    const { data, error } = await db.from("applications").select("*").eq("idempotency_key", draft.idempotencyKey).maybeSingle();
    fail("application.select", error);
    existing = (data as Row | null) ?? null;
  } else if (session) {
    const { data, error } = await db
      .from("applications")
      .select("*")
      .eq("contact_id", contactId)
      .eq("event_id", session.id)
      .not("status", "in", "(refusee,hors_cible,desistee)")
      .limit(1)
      .maybeSingle();
    fail("application.select", error);
    existing = (data as Row | null) ?? null;
  }

  if (existing) {
    const current = fromRow<Application>(existing);
    const patch: Partial<Application> = { leadStage: draft.leadStage };
    if (!current.eventId && session) {
      patch.eventId = session.id;
      if (!current.amountDueCents) patch.amountDueCents = session.priceCents;
    }
    // Progression automatique uniquement depuis les statuts « tunnel ».
    if (
      APPLICATION_AUTO_STATUSES.includes(current.status) &&
      (APPLICATION_STATUS_RANK[draft.status] ?? 0) > (APPLICATION_STATUS_RANK[current.status] ?? 0)
    ) {
      patch.status = draft.status;
    }
    if (draft.motivation && !current.motivation) patch.motivation = draft.motivation;
    if (draft.availability && !current.availability) patch.availability = draft.availability;
    if (draft.budget && !current.budget) patch.budget = draft.budget;
    if (draft.heardFrom && !current.heardFrom) patch.heardFrom = draft.heardFrom;
    if (draft.technicalXp !== "debutant" && current.technicalXp === "debutant") patch.technicalXp = draft.technicalXp;
    if (draft.entrepreneurialXp !== "aucune" && current.entrepreneurialXp === "aucune") patch.entrepreneurialXp = draft.entrepreneurialXp;
    if (draft.intent === "candidature" && current.intent === "diagnostic") patch.intent = "candidature";
    const { error } = await db.from("applications").update(toRow(patch)).eq("id", current.id);
    fail("application.update", error);
    if (draft.project && !current.projectId) {
      const projectId = await createProject(db, draft.project, contactId, session?.id);
      const { error: linkErr } = await db.from("applications").update({ project_id: projectId }).eq("id", current.id);
      fail("application.project", linkErr);
    } else if (draft.project && current.projectId) {
      await completeProject(db, current.projectId, draft.project);
    }
    return { id: current.id, number: current.number, created: false };
  }

  // 2) Offre catalogue (code ou nom exact), facultative.
  let offerId: ID | undefined;
  if (draft.offer) {
    const { data } = await db.from("offers").select("id, code, name").or(`code.ilike.${escapeFilter(draft.offer)},name.ilike.${escapeFilter(draft.offer)}`).limit(1).maybeSingle();
    offerId = ((data as Row | null)?.id as ID | undefined) ?? undefined;
  }
  const projectId = draft.project ? await createProject(db, draft.project, contactId, session?.id) : undefined;

  const application: Partial<Application> = {
    id: newId("app"),
    eventId: session?.id,
    contactId,
    projectId,
    offerId,
    status: draft.status,
    leadStage: draft.leadStage,
    intent: draft.intent,
    persona: draft.persona,
    submittedAt: draft.submittedAt,
    motivation: draft.motivation,
    entrepreneurialXp: draft.entrepreneurialXp,
    technicalXp: draft.technicalXp,
    availability: draft.availability,
    budget: draft.budget,
    heardFrom: draft.heardFrom,
    funding: "personnel",
    amountDueCents: session?.priceCents ?? 0,
    amountPaidCents: 0,
    idempotencyKey: draft.idempotencyKey,
    utm: draft.utm,
  };
  const { data, error } = await db.from("applications").insert(toRow(application)).select("id, number").single();
  if (isUniqueViolation(error) && draft.idempotencyKey) {
    // Deux envois simultanés du même leadId : on relit la candidature gagnante.
    const { data: again, error: againErr } = await db.from("applications").select("id, number").eq("idempotency_key", draft.idempotencyKey).single();
    fail("application.reselect", againErr);
    return { id: (again as Row).id as ID, number: (again as Row).number as number, created: false };
  }
  fail("application.insert", error);
  return { id: (data as Row).id as ID, number: (data as Row).number as number, created: true };
}

/** Échappe une valeur pour un filtre PostgREST `.or()` (virgules / parenthèses). */
function escapeFilter(value: string): string {
  return `"${value.replace(/["\\]/g, "\\$&")}"`;
}

async function createProject(db: CrmAdminClient, draft: ProjectDraft, contactId: ID, sessionId?: ID): Promise<ID> {
  const project: Partial<Project> = {
    id: newId("prj"),
    name: draft.name,
    tagline: "",
    description: draft.description,
    stage: draft.stage,
    sector: "",
    targetMarket: draft.targetMarket,
    founderIds: [contactId],
    eventIds: sessionId ? [sessionId] : [],
    mentorIds: [],
    sixMonthGoals: "",
    milestones: [],
    metrics: {},
    health: "on_track",
    lastUpdateAt: new Date().toISOString(),
    awards: [],
  };
  const { data, error } = await db.from("projects").insert(toRow(project)).select("id").single();
  fail("project.insert", error);
  return (data as Row).id as ID;
}

/**
 * Étapes suivantes du tunnel (même leadId) : complète le projet créé à la première étape
 * sans écraser ce que l'équipe a pu saisir (nom par défaut, champs vides, stade « idee »).
 */
async function completeProject(db: CrmAdminClient, projectId: ID, draft: ProjectDraft): Promise<void> {
  const { data, error } = await db.from("projects").select("name, description, stage, target_market").eq("id", projectId).maybeSingle();
  fail("project.select", error);
  if (!data) return;
  const current = data as Row;
  const patch: Record<string, unknown> = {};
  if (draft.stage !== "idee" && current.stage === "idee") patch.stage = draft.stage;
  if (!draft.name.startsWith("Projet de ") && String(current.name ?? "").startsWith("Projet de ")) patch.name = draft.name;
  if (draft.description && !current.description) patch.description = draft.description;
  if (draft.targetMarket && !current.target_market) patch.target_market = draft.targetMarket;
  if (Object.keys(patch).length === 0) return;
  const { error: upErr } = await db.from("projects").update(patch).eq("id", projectId);
  fail("project.update", upErr);
}

async function createComplaint(db: CrmAdminClient, draft: ComplaintDraft, contactId: ID): Promise<{ id: ID; number: string }> {
  const complaint: Partial<Complaint> = {
    id: newId("rec"),
    number: "", // attribué par le trigger crm.tg_complaints_numbering (REC-AAAA-NNN)
    receivedAt: draft.receivedAt,
    channel: draft.channel,
    type: draft.type,
    severity: draft.severity,
    status: "recue",
    contactId,
    subject: draft.subject,
    description: draft.description,
  };
  const { data, error } = await db.from("complaints").insert(toRow(complaint)).select("id, number").single();
  fail("complaint.insert", error);
  return { id: (data as Row).id as ID, number: (data as Row).number as string };
}

async function createDeal(db: CrmAdminClient, draft: DealDraft, links: { contactId: ID; orgId?: ID; submissionId: ID }): Promise<ID> {
  const deal: Partial<Deal> = {
    id: newId("deal"),
    title: draft.title,
    type: draft.type,
    stage: draft.stage,
    amountCents: draft.amountCents,
    probability: draft.probability,
    orgId: links.orgId,
    contactId: links.contactId,
    nextStep: draft.nextStep,
    source: draft.source,
    submissionId: links.submissionId,
  };
  const { data, error } = await db.from("deals").insert(toRow(deal)).select("id").single();
  fail("deal.insert", error);
  return (data as Row).id as ID;
}

async function ensureTask(db: CrmAdminClient, draft: TaskDraft, related: EntityRef, dueAt: ISODate, assigneeId?: ID): Promise<ID> {
  const { data: existing, error } = await db
    .from("tasks")
    .select("id")
    .eq("related->>entity", related.entity)
    .eq("related->>id", related.id)
    .eq("automated", true)
    .limit(1)
    .maybeSingle();
  fail("task.select", error);
  if (existing) return (existing as Row).id as ID;
  const task: Partial<Task> = {
    id: newId("tsk"),
    title: draft.title,
    kind: draft.kind,
    priority: draft.priority,
    dueAt,
    assigneeId,
    related,
    automated: true,
    notes: draft.notes,
  };
  const { data, error: insErr } = await db.from("tasks").insert(toRow(task)).select("id").single();
  fail("task.insert", insErr);
  return (data as Row).id as ID;
}

/** Inscription à la séquence « Digital Starter Kit » active : emails programmés + tâches. */
async function enrollStarterKit(db: CrmAdminClient, contact: Contact, vars: Record<string, string | undefined>, now: Date): Promise<number> {
  const { data: seqRow, error } = await db.from("sequences").select("*").eq("trigger", "digital_starter_kit").eq("active", true).limit(1).maybeSingle();
  fail("sequence.select", error);
  if (!seqRow) return 0;
  const seq = seqRow as Row;
  const seqId = seq.id as ID;

  // Déjà inscrit ? (une seule inscription par contact et par séquence)
  const { count } = await db.from("email_messages").select("id", { count: "exact", head: true }).eq("sequence_id", seqId).eq("related->>id", contact.id);
  const { count: taskCount } = await db.from("tasks").select("id", { count: "exact", head: true }).eq("sequence_id", seqId).eq("related->>id", contact.id);
  if ((count ?? 0) + (taskCount ?? 0) > 0) return 0;

  const steps = Array.isArray(seq.steps) ? (seq.steps as SequenceStep[]) : [];
  const related: EntityRef = { entity: "contacts", id: contact.id };
  let scheduled = 0;
  for (const step of steps) {
    const at = addHours(now.toISOString(), Math.max(0, step.delayDays) * 24);
    if (step.channel === "email") {
      let subject = step.label;
      let body = "";
      if (step.templateId) {
        const { data: tpl } = await db.from("email_templates").select("subject, body").eq("id", step.templateId).maybeSingle();
        if (tpl) {
          subject = fillTemplate(String((tpl as Row).subject ?? step.label), vars, false);
          body = fillTemplate(String((tpl as Row).body ?? ""), vars, false); // texte brut : échappé à l'envoi
        }
      }
      const { error: e } = await db.from("email_messages").insert({
        id: newId("mail"),
        to: contact.email,
        subject,
        body,
        template_id: step.templateId ?? null,
        status: "programme",
        scheduled_at: at,
        related,
        sequence_id: seqId,
      });
      fail("sequence.email", e);
    } else {
      const { error: e } = await db.from("tasks").insert({
        id: newId("tsk"),
        title: step.label,
        kind: "relance",
        priority: "normale",
        due_at: at,
        related,
        sequence_id: seqId,
        automated: true,
      });
      fail("sequence.task", e);
    }
    scheduled += 1;
  }
  const enrolled = typeof seq.enrolled === "number" ? seq.enrolled : 0;
  await db.from("sequences").update({ enrolled: enrolled + 1 }).eq("id", seqId);
  return scheduled;
}

/**
 * Persiste une soumission normalisée dans le schéma crm (client service_role).
 * Idempotent : un rejeu retourne `duplicate: true` (ou complète une soumission
 * interrompue), une candidature rejouée (même leadId) met à jour l'existant.
 */
export async function persistIntake(db: CrmAdminClient, n: NormalizedIntake, opts: PersistOptions = {}): Promise<PersistResult> {
  const now = opts.now ?? new Date();
  const settings = await loadSettings(db);
  const sla: SlaRule | null = n.sla ? { ...n.sla, hours: n.form === "reclamation" ? settings.complaintAckHours : settings.slaHours } : null;
  const slaDueAt = sla ? computeSlaDueAt(n.receivedAt, sla) : undefined;

  // ── 1. Soumission déjà connue ? ──
  let existingSub: Row | null = null;
  if (n.submission.idempotencyKey) {
    const { data, error } = await db
      .from("submissions")
      .select("id, contact_id, org_id, deal_id, application_id, complaint_id, fields")
      .eq("type", n.submission.type)
      .eq("idempotency_key", n.submission.idempotencyKey)
      .maybeSingle();
    fail("submission.select", error);
    existingSub = (data as Row | null) ?? null;
  }
  const missingBusinessLink =
    existingSub !== null &&
    ((n.action.kind === "deal" && !existingSub.deal_id) || (n.action.kind === "complaint" && !existingSub.complaint_id));
  if (existingSub && n.form !== "candidature" && !missingBusinessLink && existingSub.contact_id) {
    return {
      submissionId: existingSub.id as ID,
      contactId: existingSub.contact_id as ID,
      contactCreated: false,
      organizationId: (existingSub.org_id as ID | null) ?? undefined,
      dealId: (existingSub.deal_id as ID | null) ?? undefined,
      complaintId: (existingSub.complaint_id as ID | null) ?? undefined,
      duplicate: true,
      sessionClosed: false,
      ack: "deja_traite",
    };
  }
  const isNewSubmission = existingSub === null;

  // ── 2. Session visée (candidature) ──
  let session: SessionInfo | undefined;
  let sessionClosed = false;
  if (n.action.kind === "application") {
    session = await findSession(db, n.action.application.eventCode);
    if (session && isSessionClosed(session, now)) {
      // Fermée aux NOUVELLES candidatures ; un leadId déjà connu continue d'être mis à jour.
      let known = false;
      if (n.action.application.idempotencyKey) {
        const { data } = await db.from("applications").select("id").eq("idempotency_key", n.action.application.idempotencyKey).maybeSingle();
        known = Boolean(data);
      }
      sessionClosed = !known;
    }
  }

  // ── 3. Organisation puis contact ──
  const orgId = n.organization ? await findOrCreateOrganization(db, n.organization) : undefined;
  const contactDraft: ContactDraft = sessionClosed ? { ...n.contact, tags: mergeTags(n.contact.tags, ["session-complete"]) } : n.contact;
  const { contact, created: contactCreated } = await upsertContact(db, contactDraft, orgId);

  // ── 4. Soumission ──
  const fields: Record<string, string> = {
    ...((existingSub?.fields as Record<string, string> | undefined) ?? {}),
    ...n.submission.fields,
    ...(sessionClosed && session ? { sessionClosed: `${session.code} (${session.status})` } : {}),
  };
  let submissionId: ID;
  if (existingSub) {
    submissionId = existingSub.id as ID;
    const patch: Row = { fields, contact_id: contact.id };
    if (orgId) patch.org_id = orgId;
    if (n.submission.message) patch.message = n.submission.message;
    const { error } = await db.from("submissions").update(patch).eq("id", submissionId);
    fail("submission.update", error);
  } else {
    const submission: Partial<Submission> & { meta: IntakeMeta; raw: Record<string, unknown> } = {
      ...n.submission,
      id: newId("sub"),
      fields,
      slaDueAt,
      contactId: contact.id,
      orgId,
      meta: n.meta,
      raw: n.raw,
    };
    const { data, error } = await db.from("submissions").insert(toRow(submission)).select("id").single();
    if (isUniqueViolation(error)) {
      // Même soumission reçue en parallèle : l'autre requête la traite.
      const { data: again } = await db.from("submissions").select("id").eq("type", n.submission.type).eq("idempotency_key", n.submission.idempotencyKey ?? "").maybeSingle();
      return {
        submissionId: ((again as Row | null)?.id as ID) ?? "",
        contactId: contact.id,
        contactCreated,
        duplicate: true,
        sessionClosed: false,
        ack: "deja_traite",
      };
    }
    fail("submission.insert", error);
    submissionId = (data as Row).id as ID;
  }

  const result: PersistResult = {
    submissionId,
    contactId: contact.id,
    contactCreated,
    organizationId: orgId,
    duplicate: false,
    sessionClosed,
    sessionId: session?.id,
    ack: n.ack ? "non_configure" : "non_applicable",
  };

  // ── 5. Objet métier ──
  const subPatch: Row = {};
  let taskRelated: EntityRef = { entity: "submissions", id: submissionId };
  let taskDraft = n.task;
  switch (n.action.kind) {
    case "application": {
      if (sessionClosed && session) {
        taskDraft = {
          title: `Candidature sur une session close (${session.code}) — proposer une autre date à ${n.submission.name}`,
          kind: "appel",
          priority: "haute",
        };
        break;
      }
      const app = await upsertApplication(db, n.action.application, contact.id, session);
      result.applicationId = app.id;
      result.applicationNumber = app.number;
      if (!existingSub?.application_id) subPatch.application_id = app.id;
      if (n.action.application.eventCode && !session) {
        subPatch.fields = { ...fields, sessionInconnue: n.action.application.eventCode };
      }
      break;
    }
    case "complaint": {
      const complaint = existingSub?.complaint_id
        ? { id: existingSub.complaint_id as ID, number: "" }
        : await createComplaint(db, n.action.complaint, contact.id);
      result.complaintId = complaint.id;
      result.complaintNumber = complaint.number || undefined;
      subPatch.complaint_id = complaint.id;
      taskRelated = { entity: "complaints", id: complaint.id };
      if (taskDraft && complaint.number) taskDraft = { ...taskDraft, title: `Réclamation ${complaint.number} — accuser réception et traiter (48 h ouvrées)` };
      break;
    }
    case "deal": {
      const dealId = (existingSub?.deal_id as ID | undefined) ?? (await createDeal(db, n.action.deal, { contactId: contact.id, orgId, submissionId }));
      result.dealId = dealId;
      subPatch.deal_id = dealId;
      break;
    }
    case "starter_kit": {
      if (n.action.enroll && isNewSubmission) {
        result.sequenceSteps = await enrollStarterKit(db, contact, { prenom: contact.firstName || n.contact.firstName, email: contact.email, stade: n.action.stade }, now);
      }
      break;
    }
    case "newsletter":
    case "none":
      break;
  }
  if (Object.keys(subPatch).length) {
    const { error } = await db.from("submissions").update(subPatch).eq("id", submissionId);
    fail("submission.link", error);
  }

  // ── 6. Tâche « Répondre sous 48 h » ──
  if (taskDraft && slaDueAt && (isNewSubmission || missingBusinessLink)) {
    result.taskId = await ensureTask(db, taskDraft, taskRelated, slaDueAt, contact.ownerId);
  }

  // ── 7. Accusé de réception (une seule fois par soumission) ──
  if (n.ack && isNewSubmission && opts.sendEmail) {
    const email = buildAckEmail(n.ack, contact.email, {
      marque: settings.brand,
      prenom: contact.firstName || n.contact.firstName || "",
      numero: result.complaintNumber ?? "",
      session: session && !sessionClosed ? ` pour la session ${session.name || session.code}` : "",
      objet: n.submission.subject ? ` (« ${n.submission.subject} »)` : "",
      entreprise: n.submission.company ? ` pour ${n.submission.company}` : "",
    });
    email.replyTo = settings.replyTo;
    const sent = await opts.sendEmail(email);
    result.ack = sent.ok ? "envoye" : "erreur";
    await db.from("email_messages").insert({
      id: newId("mail"),
      to: email.to,
      subject: email.subject,
      body: email.text,
      status: sent.ok ? "envoye" : "erreur",
      sent_at: sent.ok ? now.toISOString() : null,
      related: { entity: "submissions", id: submissionId } satisfies EntityRef,
    });
    if (sent.ok && result.complaintId) {
      // Qualiopi ind. 31 : accusé de réception tracé sur la réclamation.
      await db.from("complaints").update({ ack_at: now.toISOString(), status: "accusee" }).eq("id", result.complaintId).eq("status", "recue");
    }
    if (!sent.ok) console.error(`[intake] accusé de réception non envoyé (${n.form}) : ${sent.error}`);
  }

  return result;
}
