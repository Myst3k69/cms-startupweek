/**
 * Côté client : métadonnées des points d'entrée `/api/intake/<form>`, payloads d'exemple
 * (mêmes clés que les formulaires actuels de startupweek.tech) et normalisation locale
 * utilisée par le « Testeur de formulaire » pour simuler une réception en mode démo.
 *
 * La normalisation serveur de référence est `src/lib/server/intake.ts` (zod, idempotence,
 * fusion de contact) — celle-ci en reprend les règles essentielles sans dépendance Node.
 */
import type { Consent, Submission, SubmissionType, Utm } from "@/lib/domain/types";

export type IntakeForm = "candidature" | "contact" | "entreprise" | "partenaire" | "reclamation" | "accompagnement" | "newsletter" | "starter-kit";

export interface IntakeFormMeta {
  form: IntakeForm;
  type: SubmissionType;
  label: string;
  /** Route actuelle du site qui appelle le webhook n8n (à rebrancher). */
  siteRoute: string;
  /** Workflow n8n remplacé. */
  n8n: string;
  /** Ce que crée le CRM à la réception. */
  creates: string;
  sample: Record<string, unknown>;
}

const consent = { consentRGPD: true, consentNewsletter: false };
const tracking = { origin: "https://www.startupweek.tech", utm_source: "linkedin", utm_medium: "social", utm_campaign: "rentree-2026" };

export const INTAKE_FORMS: IntakeFormMeta[] = [
  {
    form: "candidature",
    type: "candidature",
    label: "Candidature",
    siteRoute: "/api/submit-candidature",
    n8n: "Candidature event",
    creates: "Demande · contact (fusionné) · candidature rattachée à la session · tâche de qualification · accusé de réception",
    sample: {
      leadId: "lead_7f3a9c21",
      leadStage: "qualification",
      intent: "candidature",
      qualified: true,
      firstName: "Camille",
      lastName: "Martin",
      email: "camille.martin@example.fr",
      phone: "+33 6 12 34 56 78",
      session: { eventCode: "SW-0012", format: "presentiel" },
      offer: "StartupWeek Présentiel",
      projectName: "Kolok",
      projectDescription: "Application de colocation intergénérationnelle entre seniors et étudiants.",
      projectStage: "idee",
      motivation: "Passer de l'idée à un MVP testé avant de quitter mon poste.",
      technicalLevel: "debutant",
      entrepreneurialExperience: "premiere",
      availability: "Disponible sur la semaine complète",
      budget: "2 000 - 3 000 €",
      hearAboutUs: "LinkedIn",
      ...consent,
      ...tracking,
    },
  },
  {
    form: "contact",
    type: "contact",
    label: "Contact",
    siteRoute: "/api/submit-contact",
    n8n: "Contact",
    creates: "Demande · contact · tâche « Répondre sous 48 h » · accusé de réception",
    sample: { firstName: "Julien", lastName: "Robert", email: "julien.robert@example.fr", subject: "Financement OPCO", message: "Bonjour, la StartupWeek est-elle finançable par mon OPCO ?", ...consent, ...tracking },
  },
  {
    form: "entreprise",
    type: "entreprise",
    label: "Entreprise / école",
    siteRoute: "/api/submit-entreprise",
    n8n: "Entreprise",
    creates: "Demande · contact · organisation (dédoublonnée) · opportunité B2B · tâche de rappel · accusé",
    sample: {
      companyName: "Groupe Horizon",
      contactFirstName: "Sophie",
      contactLastName: "Leroy",
      email: "sophie.leroy@horizon.example",
      position: "DRH",
      sector: "Assurance",
      companySize: "201-500",
      format: "Innovation Sprint",
      participantsNumber: "25",
      budget: "15 000 €",
      message: "Nous cherchons un format intrapreneurial pour 25 managers au T1.",
      ...consent,
      ...tracking,
    },
  },
  {
    form: "partenaire",
    type: "partenariat",
    label: "Partenariat",
    siteRoute: "/api/submit-partenariat",
    n8n: "Partenariats",
    creates: "Demande · contact · organisation · opportunité partenariat / sponsoring · accusé",
    sample: {
      organizationName: "Villa Azur",
      contactFirstName: "Marc",
      contactLastName: "Giraud",
      email: "marc@villa-azur.example",
      partnershipType: "Lieu d'accueil",
      audience: "lieu",
      venueCity: "Biarritz",
      venueCapacity: "30",
      message: "Nous accueillons des séminaires, disponibilités en mars.",
      ...consent,
      ...tracking,
    },
  },
  {
    form: "reclamation",
    type: "reclamation",
    label: "Réclamation",
    siteRoute: "/api/submit-reclamation",
    n8n: "Reclamation",
    creates: "Demande · réclamation REC-AAAA-NNN · accusé de réception sous 48 h ouvrées (Qualiopi ind. 31)",
    sample: { prenom: "Nadia", nom: "Benali", email: "nadia.benali@example.fr", telephone: "+33 7 00 00 00 00", typeReclamation: "organisation", numeroCommande: "F-2026-0042", description: "Les horaires du J3 ont changé sans prévenir.", ...consent },
  },
  {
    form: "accompagnement",
    type: "accompagnement",
    label: "Accompagnement",
    siteRoute: "/api/submit-accompagnement",
    n8n: "Accompagnements",
    creates: "Demande · contact · opportunité accompagnement · tâche de rappel · accusé",
    sample: { firstName: "Thomas", lastName: "Petit", email: "thomas.petit@example.fr", accompagnementType: "startup_ready", serviceName: "Startup Ready", projectName: "Greenbox", projectStage: "cadrage", hasReservedBooking: true, ...consent, ...tracking },
  },
  {
    form: "newsletter",
    type: "newsletter",
    label: "Newsletter",
    siteRoute: "/api/submit-newsletter",
    n8n: "Consent Newsletter",
    creates: "Contact tagué « newsletter » — refusé sans consentement explicite (jamais forcé à true)",
    sample: { email: "lea.dupont@example.fr", consentRGPD: true, consentNewsletter: true, consentNewsletterDate: "2026-09-26T08:30:00.000Z", source: "footer" },
  },
  {
    form: "starter-kit",
    type: "digital_starter_kit",
    label: "Digital Starter Kit",
    siteRoute: "/api/submit-starter-kit",
    n8n: "Digital Starter Kit",
    creates: "Contact tagué « Digital Starter Kit » · séquence de nurturing (si consentement)",
    sample: { prenom: "Inès", email: "ines.moreau@example.fr", stade: "idee", consent: true, ...tracking },
  },
];

export const FORM_META: Record<IntakeForm, IntakeFormMeta> = Object.fromEntries(INTAKE_FORMS.map((f) => [f.form, f])) as Record<IntakeForm, IntakeFormMeta>;

export const SIGNATURE_HEADER = "x-sw-signature";
export const SIGNING_SECRET_ENV = "INTAKE_SIGNING_SECRET";

/** Signature HMAC-SHA256 du corps brut (Web Crypto) : `sha256=<hex>`, identique à signIntakeBody() côté serveur. */
export async function signBody(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return `sha256=${Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Exemple de route du site (Next.js) qui relaie le formulaire vers le CRM avec signature. */
export function siteSnippet(form: IntakeForm, endpoint: string): string {
  return `// app${FORM_META[form].siteRoute}/route.ts — startupweek.tech
import { createHmac } from "node:crypto";

export async function POST(req: Request) {
  const payload = await req.json();
  const body = JSON.stringify({
    ...payload,
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0],
    userAgent: req.headers.get("user-agent"),
    submittedAt: new Date().toISOString(),
  });
  const signature = "sha256=" + createHmac("sha256", process.env.CRM_INTAKE_SECRET!).update(body).digest("hex");
  const res = await fetch("${endpoint}", {
    method: "POST",
    headers: { "content-type": "application/json", "${SIGNATURE_HEADER}": signature },
    body,
  });
  return new Response(await res.text(), { status: res.status, headers: { "content-type": "application/json" } });
}`;
}

/* ───────────── Normalisation locale (simulation) ───────────── */

const str = (v: unknown): string | undefined => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.filter((x) => typeof x !== "object").map(String).join(", ") || undefined;
  return undefined;
};
const bool = (v: unknown): boolean => v === true || v === 1 || (typeof v === "string" && ["true", "on", "1", "oui", "yes"].includes(v.trim().toLowerCase()));

const BASE_KEYS = new Set(["email", "phone", "telephone", "consentRGPD", "consentNewsletter", "consentRGPDDate", "consentNewsletterDate", "consent", "utm", "utm_source", "utm_medium", "utm_campaign", "referrer", "origin", "ipAddress", "userAgent", "submittedAt"]);
const HONEYPOT = ["_hp", "_gotcha", "honeypot", "hp_field", "botField", "bot_field", "fax_number"];

function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function flatten(obj: Record<string, unknown>, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    if (!prefix && (BASE_KEYS.has(k) || HONEYPOT.includes(k))) continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v as Record<string, unknown>, key, out);
    else {
      const s = str(v);
      if (s) out[key] = s.slice(0, 2000);
    }
  }
  return out;
}

export type LocalIntake =
  | { ok: true; submission: Omit<Submission, "id" | "createdAt" | "updatedAt">; eventCode?: string; honeypot: false }
  | { ok: false; error: "VALIDATION_ERROR" | "CONSENT_REQUIRED" | "SPAM"; issues: string[] };

/** Normalise un payload du site en Submission (mêmes règles que le serveur pour les champs clés). */
export function normalizeLocal(form: IntakeForm, raw: unknown, opts: { now: number; slaHours: number; ackHours: number }): LocalIntake {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "VALIDATION_ERROR", issues: ["Le corps doit être un objet JSON."] };
  const p = raw as Record<string, unknown>;
  if (HONEYPOT.some((k) => str(p[k]))) return { ok: false, error: "SPAM", issues: ["Champ piège (honeypot) rempli : ignoré silencieusement côté serveur."] };
  const email = str(p.email)?.toLowerCase();
  if (!email) return { ok: false, error: "VALIDATION_ERROR", issues: ["email : Email requis"] };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "VALIDATION_ERROR", issues: ["email : Adresse email invalide"] };
  if (form === "newsletter" && !bool(p.consentNewsletter)) return { ok: false, error: "CONSENT_REQUIRED", issues: ["consentNewsletter : Consentement newsletter explicite requis"] };

  const receivedAt = new Date(opts.now).toISOString();
  const first = str(p.firstName) ?? str(p.prenom) ?? str(p.contactFirstName);
  const last = str(p.lastName) ?? str(p.nom) ?? str(p.contactLastName);
  const name = [first, last].filter(Boolean).join(" ") || email;
  const company = str(p.companyName) ?? str(p.organizationName);
  const session = (p.session && typeof p.session === "object" ? p.session : {}) as Record<string, unknown>;
  const eventCode = (str(p.event_id) ?? str(session.eventCode))?.toUpperCase();

  const gdpr = form === "starter-kit" ? bool(p.consent) || bool(p.consentRGPD) : bool(p.consentRGPD);
  const marketing = form === "starter-kit" ? bool(p.consent) || bool(p.consentNewsletter) : bool(p.consentNewsletter);
  const c: Consent = { gdpr, marketing };
  if (marketing) c.marketingAt = str(p.consentNewsletterDate) ?? receivedAt;
  if (gdpr || marketing) c.source = `formulaire:${form}${str(p.origin) ? ` (${str(p.origin)})` : ""} @ ${receivedAt}`;

  const utmObj = (p.utm && typeof p.utm === "object" ? p.utm : {}) as Record<string, unknown>;
  const utm: Utm = {
    source: str(utmObj.source) ?? str(p.utm_source),
    medium: str(utmObj.medium) ?? str(p.utm_medium),
    campaign: str(utmObj.campaign) ?? str(p.utm_campaign),
    referrer: str(utmObj.referrer) ?? str(p.referrer),
  };
  const hasUtm = Object.values(utm).some(Boolean);

  const subject: Record<IntakeForm, string> = {
    candidature: `Candidature${eventCode ? ` ${eventCode}` : ""}`,
    contact: str(p.subject) ?? "Demande de contact",
    entreprise: `Demande entreprise${company ? ` — ${company}` : ""}${str(p.format) ? ` (${str(p.format)})` : ""}`,
    partenaire: `Partenariat${str(p.partnershipType) ? ` ${str(p.partnershipType)}` : ""}${company ? ` — ${company}` : ""}`,
    reclamation: `Réclamation — ${str(p.typeReclamation) ?? "autre"}`,
    accompagnement: `Accompagnement — ${str(p.serviceName) ?? str(p.accompagnementType) ?? "à préciser"}`,
    newsletter: "Inscription newsletter",
    "starter-kit": "Téléchargement Digital Starter Kit",
  };
  const message = str(p.message) ?? str(p.description) ?? str(p.projectDescription) ?? str(p.motivation) ?? str(p.partnershipGoals) ?? str(p.objectives);
  const noSla = form === "newsletter" || form === "starter-kit";
  const slaHours = form === "reclamation" ? opts.ackHours : opts.slaHours;
  const idem = str(p.leadId) ?? `${form}:${fnv(`${email}|${JSON.stringify(p)}`)}`;

  return {
    ok: true,
    honeypot: false,
    eventCode,
    submission: {
      type: FORM_META[form].type,
      status: noSla ? "convertie" : "nouvelle",
      receivedAt,
      name,
      email,
      phone: str(p.phone) ?? str(p.telephone),
      company,
      subject: subject[form],
      message,
      fields: flatten(p),
      slaDueAt: noSla ? undefined : new Date(opts.now + slaHours * 3_600_000).toISOString(),
      idempotencyKey: idem,
      utm: hasUtm ? utm : undefined,
      consent: c,
    },
  };
}
