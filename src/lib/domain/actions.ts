/**
 * Actions métier transverses = le « moteur d'automatisations » du CRM.
 *
 * En mode démo elles s'exécutent dans le navigateur sur le store ; en production,
 * la même logique vit côté serveur (route handlers + triggers SQL) et le store
 * reçoit les lignes via la synchro. Chaque action journalise dans la timeline.
 *
 * Elles remplacent les workflows n8n (accusés de réception, statuts candidature)
 * et comblent les manques identifiés : acompte/solde, relances, convocations,
 * questionnaires, accusé de réception des réclamations.
 */
import { crm, findById } from "@/lib/store";
import type {
  Application,
  ApplicationStatus,
  AssignmentStatus,
  Enrollment,
  EnrollmentSource,
  Persona,
  Contact,
  EmailTemplate,
  EntityRef,
  ID,
  Invoice,
  InvoiceKind,
  LineItem,
  Organization,
  PaymentMethod,
  Priority,
  Submission,
  TaskKind,
  TemplateCategory,
} from "./types";
import { contactName, invoiceBalance, invoiceTotal } from "./selectors";
import { date, money } from "@/lib/format";
import { labelOf, APPLICATION_STATUSES } from "./constants";
import { normalizeEmail, uid } from "@/lib/utils";
import { fillEmailTemplate } from "@/lib/email-template";
import { remoteSync } from "@/lib/data/sync";

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const nowMs = () => Date.now();

/* ───────────────────────────── Emails ───────────────────────────── */

/**
 * Modèle d'email d'une catégorie. Avec un mot-clé, la recherche est stricte (aucun modèle
 * ⇒ undefined, l'appelant fournit alors un sujet/corps par défaut) : jamais le mauvais email.
 */
export function findTemplate(category: TemplateCategory, keyword?: string): EmailTemplate | undefined {
  const list = crm().emailTemplates.filter((t) => t.category === category);
  if (!keyword) return list[0];
  const k = keyword.toLowerCase();
  return list.find((t) => `${t.name} ${t.subject}`.toLowerCase().includes(k));
}

/** Règlement à indiquer dans un email : lien de paiement Stripe, sinon virement (IBAN + référence). */
export function paymentText(inv: { stripePaymentLink?: string; number?: string } | undefined): string {
  if (inv?.stripePaymentLink) return inv.stripePaymentLink;
  const iban = crm().settings.iban;
  return iban ? `par virement sur le compte ${iban}${inv?.number ? ` (référence ${inv.number})` : ""}` : "";
}

/**
 * Envoie un email à partir d'un modèle + variables (texte brut, échappé à l'envoi).
 * Base connectée : l'email part dans la file d'envoi (statut « programme », heure =
 * maintenant ou plus tard) ; le serveur l'envoie, puis note « envoyé » / « erreur »
 * et journalise sur l'élément lié. Mode démo : marqué envoyé et journalisé aussitôt.
 */
export function sendEmail(opts: {
  to: string;
  templateId?: ID;
  template?: EmailTemplate;
  subject?: string;
  body?: string;
  vars?: Record<string, string | number | undefined>;
  related?: EntityRef;
  scheduledAt?: string;
}) {
  const tpl = opts.template ?? (opts.templateId ? findById("emailTemplates", opts.templateId) : undefined);
  const vars = opts.vars ?? {};
  const subject = fillEmailTemplate(opts.subject ?? tpl?.subject ?? "(sans objet)", vars).replace(/\s+/g, " ").trim();
  const body = fillEmailTemplate(opts.body ?? tpl?.body ?? "", vars);
  const scheduled = Boolean(opts.scheduledAt && new Date(opts.scheduledAt).getTime() > nowMs());
  const live = remoteSync.active;
  const msg = crm().create(
    "emails",
    {
      to: normalizeEmail(opts.to),
      subject,
      body,
      templateId: tpl?.id,
      status: live || scheduled ? "programme" : "envoye",
      scheduledAt: scheduled ? opts.scheduledAt : live ? iso(nowMs()) : undefined,
      sentAt: live || scheduled ? undefined : iso(nowMs()),
      related: opts.related,
    },
    { log: false },
  );
  // Base connectée : le serveur journalise l'envoi réel (ou l'échec) sur l'élément lié.
  if (opts.related && (!live || scheduled)) {
    crm().log({ kind: "email", entity: opts.related.entity, entityId: opts.related.id, actorId: crm().sessionUserId, summary: `${scheduled ? "Email programmé" : "Email envoyé"} : « ${subject} »` });
  }
  return msg;
}

/* ───────────────────────────── Tâches ───────────────────────────── */

export function createTask(opts: { title: string; kind: TaskKind; dueInDays?: number; dueAt?: string; priority?: Priority; assigneeId?: ID; related?: EntityRef; automated?: boolean; notes?: string }) {
  return crm().create(
    "tasks",
    {
      title: opts.title,
      kind: opts.kind,
      priority: opts.priority ?? "normale",
      dueAt: opts.dueAt ?? iso(nowMs() + (opts.dueInDays ?? 1) * DAY),
      assigneeId: opts.assigneeId ?? crm().sessionUserId,
      related: opts.related,
      automated: opts.automated ?? false,
      notes: opts.notes,
    },
    { log: false },
  );
}

export function completeTask(id: ID) {
  crm().update("tasks", id, { doneAt: iso(nowMs()) });
}

/* ───────────────────────────── Facturation ───────────────────────────── */

/** Numérotation légale séquentielle, sans trou, par année (F-2026-0042). En base : crm.next_document_number(). */
export function nextNumber(kind: "invoice" | "quote"): string {
  const s = crm();
  const year = new Date(nowMs()).getFullYear();
  const prefix = kind === "invoice" ? s.settings.invoicePrefix : s.settings.quotePrefix;
  const list = kind === "invoice" ? s.invoices.map((i) => i.number) : s.quotes.map((q) => q.number);
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const max = list.reduce((m, n) => {
    const r = re.exec(n);
    return r ? Math.max(m, Number(r[1])) : m;
  }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}

/** TTC → ligne HT (prix B2C affichés TTC ; exonération possible si organisme exonéré). */
export function lineFromTtc(label: string, ttcCents: number, quantity = 1): LineItem {
  const vatRate = crm().settings.vatExempt ? 0 : 20;
  const unit = vatRate ? Math.round(ttcCents / (1 + vatRate / 100)) : ttcCents;
  return { id: uid("li"), label, quantity, unitPriceCents: unit, vatRate };
}

export function createInvoice(data: Omit<Invoice, "id" | "createdAt" | "updatedAt" | "number" | "paidCents" | "remindersSent"> & { number?: string }) {
  const inv = crm().create("invoices", { ...data, number: data.number ?? nextNumber("invoice"), paidCents: 0, remindersSent: 0 }, { log: false });
  crm().log({ kind: "document", entity: "invoices", entityId: inv.id, actorId: crm().sessionUserId, summary: `${inv.kind === "avoir" ? "Avoir" : "Facture"} ${inv.number} émise — ${money(invoiceTotal(inv).ttc)}` });
  if (inv.applicationId) crm().log({ kind: "document", entity: "applications", entityId: inv.applicationId, actorId: crm().sessionUserId, summary: `Facture ${inv.number} émise (${money(invoiceTotal(inv).ttc)})` });
  return inv;
}

/** Facture d'acompte (CGV : 30 %) ou de solde (70 %, exigible à J-30) pour une candidature. */
export function createApplicationInvoice(applicationId: ID, kind: Extract<InvoiceKind, "acompte" | "solde">) {
  const s = crm();
  const app = findById("applications", applicationId);
  if (!app) return undefined;
  const ev = findById("events", app.eventId);
  if (!ev) return undefined;
  const already = s.invoices.find((i) => i.applicationId === app.id && i.kind === kind && i.status !== "annulee");
  if (already) return already;
  const pct = kind === "acompte" ? s.settings.depositPercent : 100 - s.settings.depositPercent;
  const ttc = Math.round((ev.priceCents * pct) / 100);
  const now = nowMs();
  const due = kind === "acompte" ? now + 7 * DAY : Math.max(now + 7 * DAY, new Date(ev.startAt).getTime() - s.settings.balanceDaysBefore * DAY);
  const inv = createInvoice({
    kind,
    status: "emise",
    contactId: app.contactId,
    applicationId: app.id,
    eventId: ev.id,
    issuedAt: iso(now),
    dueAt: iso(due),
    lines: [lineFromTtc(`${kind === "acompte" ? `Acompte ${pct} %` : `Solde ${pct} %`} — ${ev.name} (${ev.code})`, ttc)],
    preferredMethod: "stripe",
    stripePaymentLink: `https://buy.stripe.com/test_${uid("pl").slice(3)}`,
  });
  s.update("applications", app.id, { amountDueCents: ev.priceCents, invoiceId: app.invoiceId ?? inv.id });
  return inv;
}

/** Enregistre un paiement et met à jour la facture + la candidature liée. */
export function recordPayment(invoiceId: ID, amountCents: number, method: PaymentMethod, reference: string, opts?: { receivedAt?: string }) {
  const s = crm();
  const inv = findById("invoices", invoiceId);
  if (!inv) return undefined;
  const pay = s.create(
    "payments",
    {
      invoiceId,
      amountCents,
      receivedAt: opts?.receivedAt ?? iso(nowMs()),
      method,
      status: "reussi",
      reference,
      feeCents: method === "stripe" ? Math.round(amountCents * 0.015 + 25) : 0,
    },
    { log: false },
  );
  const paid = inv.paidCents + amountCents;
  const total = invoiceTotal(inv).ttc;
  s.update("invoices", inv.id, { paidCents: paid, status: paid >= total ? "payee" : "partielle" });
  s.log({ kind: "paiement", entity: "invoices", entityId: inv.id, actorId: s.sessionUserId, summary: `Paiement reçu ${money(amountCents)} (${method}) — ${inv.number}` });
  if (inv.applicationId) {
    const app = findById("applications", inv.applicationId);
    if (app) {
      const newPaid = app.amountPaidCents + amountCents;
      s.update("applications", app.id, { amountPaidCents: newPaid });
      s.log({ kind: "paiement", entity: "applications", entityId: app.id, actorId: s.sessionUserId, summary: `Paiement ${money(amountCents)} reçu (${inv.kind})` });
      // Acompte réglé ⇒ inscription confirmée (statut « Inscrite (payée) »).
      if (inv.kind === "acompte" && paid >= total && app.status === "acceptee") changeApplicationStatus(app.id, "inscrite");
    }
  }
  return pay;
}

/** Relance d'impayé (J+3 / J+10 / mise en demeure). */
export function sendInvoiceReminder(invoiceId: ID) {
  const s = crm();
  const inv = findById("invoices", invoiceId);
  if (!inv) return;
  const contact = findById("contacts", inv.contactId);
  const org = findById("organizations", inv.orgId);
  const to = contact?.email ?? org?.billingEmail;
  if (!to) return;
  const tpl = findTemplate("facturation", "relance");
  sendEmail({
    to,
    template: tpl,
    subject: tpl ? undefined : "Rappel — facture {{numero_facture}}",
    body: tpl ? undefined : `Bonjour,\n\nSauf erreur de notre part, la facture {{numero_facture}} d'un montant de {{montant}} arrivée à échéance le {{date_echeance}} reste à régler.\nLien de paiement : {{lien_paiement}}\n\nL'équipe StartupWeek`,
    vars: {
      prenom: contact?.firstName ?? "",
      numero: inv.number,
      numero_facture: inv.number,
      montant: money(invoiceBalance(inv), true),
      echeance: date(inv.dueAt, "d MMMM yyyy"),
      date_echeance: date(inv.dueAt, "d MMMM yyyy"),
      lien_paiement: paymentText(inv),
    },
    related: { entity: "invoices", id: inv.id },
  });
  s.update("invoices", inv.id, { remindersSent: inv.remindersSent + 1, lastReminderAt: iso(nowMs()) });
}

/* ───────────────────────────── Candidatures ───────────────────────────── */

/**
 * Changement de statut d'une candidature + automatisations associées :
 * - acceptée → facture d'acompte + email d'acceptation (présentiel / distanciel) + tâche de suivi ;
 * - inscrite → contact « participant », facture de solde, tâche convocation ;
 * - refusée / hors cible → email de refus bienveillant (manquait dans n8n) ;
 * - entretien → tâche de préparation.
 */
export function changeApplicationStatus(applicationId: ID, status: ApplicationStatus): boolean {
  const s = crm();
  const app = findById("applications", applicationId);
  if (!app || app.status === status) return false;
  const contact = findById("contacts", app.contactId);
  const ev = findById("events", app.eventId);
  const now = nowMs();
  // « Alerte capacité » (reprise d'Airtable) : jamais plus d'inscrits que de places, quel que soit le déclencheur
  // (glisser-déposer, paiement Stripe ou virement reçu…). En base : trigger équivalent sur crm.applications.
  if (status === "inscrite" && ev) {
    const enrolled = s.applications.filter((a) => a.eventId === ev.id && a.status === "inscrite" && a.id !== app.id).length;
    if (enrolled >= ev.capacity) {
      s.log({ kind: "systeme", entity: "applications", entityId: app.id, summary: `Inscription bloquée : ${ev.code} est complète (${enrolled}/${ev.capacity}) — à arbitrer (liste d'attente ou autre session)` });
      createTask({ title: `Session complète — arbitrer l'inscription de ${contactName(contact)} (${ev.code})`, kind: "admin", priority: "haute", dueInDays: 1, related: { entity: "applications", id: app.id }, automated: true });
      return false;
    }
  }
  const patch: Partial<Application> = { status };
  if (["acceptee", "refusee", "hors_cible"].includes(status)) patch.decisionAt = iso(now);
  if (status === "hors_cible") patch.leadStage = "out_of_scope";
  s.update("applications", app.id, patch, { log: `Statut : ${labelOf(APPLICATION_STATUSES, app.status)} → ${labelOf(APPLICATION_STATUSES, status)}`, kind: "statut" });
  const vars = {
    prenom: contact?.firstName,
    nom: contact?.lastName,
    session: ev?.name,
    code_session: ev?.code,
    date_debut: ev ? date(ev.startAt, "d MMMM yyyy") : "",
    date_fin: ev ? date(ev.endAt, "d MMMM yyyy") : "",
    duree: ev ? `${ev.durationHours} h` : "",
    lieu: ev?.city,
    montant_acompte: ev ? money(Math.round((ev.priceCents * s.settings.depositPercent) / 100)) : "",
  };
  const related = { entity: "applications" as const, id: app.id };

  if (status === "acceptee") {
    const inv = createApplicationInvoice(app.id, "acompte");
    if (contact) {
      const tpl = findTemplate("candidature", ev?.mode === "distanciel" ? "distanciel" : "présentiel") ?? findTemplate("candidature", "accept");
      sendEmail({ to: contact.email, template: tpl, vars: { ...vars, lien_paiement: paymentText(inv) }, related });
    }
    createTask({ title: `Vérifier le paiement de l'acompte — ${contactName(contact)}`, kind: "paiement", dueInDays: 5, related, automated: true });
  }
  if (status === "inscrite") {
    if (contact) s.update("contacts", contact.id, { lifecycle: "participant" });
    createApplicationInvoice(app.id, "solde");
    // StartupWeek Academy : accès automatique aux formations liées à la session.
    enrollFromApplication(app.id);
    if (ev) {
      const d = new Date(ev.startAt).getTime() - 7 * DAY;
      createTask({ title: `Envoyer la convocation — ${contactName(contact)} (${ev.code})`, kind: "qualiopi", dueAt: iso(Math.max(now + DAY, d)), related, automated: true });
    }
  }
  if ((status === "refusee" || status === "hors_cible") && contact) {
    const tpl = findTemplate("candidature", "refus");
    if (tpl) sendEmail({ to: contact.email, template: tpl, vars, related });
  }
  if (status === "entretien") {
    createTask({ title: `Préparer l'entretien — ${contactName(contact)}`, kind: "rdv", dueInDays: 2, related, automated: true });
  }
  if (status === "desistee" && ev) {
    s.log({ kind: "systeme", entity: "events", entityId: ev.id, summary: `Place libérée (désistement de ${contactName(contact)})` });
  }
  if (status === "desistee") suspendApplicationEnrollments(app.id);
  return true;
}

/** Convocation (indicateur Qualiopi 9) : email + horodatage. */
export function sendConvocation(applicationId: ID) {
  const s = crm();
  const app = findById("applications", applicationId);
  const contact = app && findById("contacts", app.contactId);
  const ev = app && findById("events", app.eventId);
  if (!app || !contact || !ev) return;
  sendEmail({
    to: contact.email,
    template: findTemplate("qualiopi", "convocation"),
    subject: findTemplate("qualiopi", "convocation") ? undefined : `Convocation — ${ev.name}`,
    body: findTemplate("qualiopi", "convocation") ? undefined : "Bonjour {{prenom}},\n\nVous êtes convoqué(e) à la session {{session}} qui débute le {{date_debut}} ({{lieu}}).\nProgramme, horaires, accès et règlement intérieur en pièce jointe.\n\nL'équipe StartupWeek",
    vars: { prenom: contact.firstName, session: ev.name, date_debut: date(ev.startAt, "d MMMM yyyy"), date_fin: date(ev.endAt, "d MMMM yyyy"), duree: `${ev.durationHours} h`, lieu: ev.city, code_session: ev.code },
    related: { entity: "applications", id: app.id },
  });
  s.update("applications", app.id, { convocationSentAt: iso(nowMs()) });
}

/* ───────────────────────────── Demandes entrantes ───────────────────────────── */

/** Rattache une demande à un contact existant (email normalisé) ou en crée un — sans écraser tags ni cycle de vie. */
export function ensureContactFromSubmission(sub: Submission): ID {
  const s = crm();
  const email = normalizeEmail(sub.email);
  const existing = s.contacts.find((c) => normalizeEmail(c.email) === email);
  if (existing) {
    const tags = Array.from(new Set([...existing.tags, ...(sub.type === "digital_starter_kit" ? ["Digital Starter Kit"] : []), ...(sub.type === "newsletter" ? ["Newsletter"] : [])]));
    s.update("contacts", existing.id, { tags, lastContactAt: sub.receivedAt, consent: { ...existing.consent, marketing: existing.consent.marketing || sub.consent.marketing, marketingAt: sub.consent.marketing ? sub.receivedAt : existing.consent.marketingAt } });
    return existing.id;
  }
  const [firstName, ...rest] = sub.name.split(" ");
  const c = s.create(
    "contacts",
    {
      firstName: firstName ?? sub.name,
      lastName: rest.join(" "),
      email,
      phone: sub.phone,
      lifecycle: "lead",
      source: SOURCE_BY_TYPE[sub.type],
      utm: sub.utm,
      tags: sub.type === "digital_starter_kit" ? ["Digital Starter Kit"] : sub.type === "newsletter" ? ["Newsletter"] : [],
      consent: sub.consent,
      score: 20,
      lastContactAt: sub.receivedAt,
    },
    { log: `Contact créé depuis le formulaire « ${sub.type} »` },
  );
  return c.id;
}

const SOURCE_BY_TYPE: Record<Submission["type"], Contact["source"]> = {
  candidature: "site_candidature",
  contact: "site_contact",
  entreprise: "site_entreprise",
  accompagnement: "site_accompagnement",
  partenariat: "site_partenariat",
  digital_starter_kit: "digital_starter_kit",
  reclamation: "site_contact",
  newsletter: "newsletter",
};

const orgKey = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(sas|sasu|sarl|eurl|sa)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Retrouve une organisation par nom normalisé (« ACME SAS » = « Acmé ») ou la crée. */
export function ensureOrganization(name: string, type: Organization["type"]): ID {
  const s = crm();
  const key = orgKey(name);
  const existing = s.organizations.find((o) => orgKey(o.name) === key);
  if (existing) return existing.id;
  return s.create("organizations", { name: name.trim(), type, status: "prospect", tags: [], ownerId: s.sessionUserId }, { log: "Organisation créée depuis une demande entrante" }).id;
}

/** Qualifie une demande : contact + opportunité (entreprise / partenariat / accompagnement), organisation rattachée. */
export function convertSubmission(subId: ID, to: "contact" | "deal") {
  const s = crm();
  const sub = findById("submissions", subId);
  if (!sub) return;
  const contactId = sub.contactId ?? ensureContactFromSubmission(sub);
  const orgId = sub.orgId ?? (sub.company ? ensureOrganization(sub.company, sub.type === "partenariat" ? "autre" : "entreprise") : undefined);
  if (orgId) {
    const c = findById("contacts", contactId);
    if (c && !c.orgId) s.update("contacts", c.id, { orgId });
  }
  const patch: Partial<Submission> = { contactId, orgId, status: "convertie", answeredAt: sub.answeredAt ?? iso(nowMs()) };
  if (to === "deal" && !sub.dealId) {
    const type = sub.type === "partenariat" ? "partenariat" : sub.type === "accompagnement" ? "accompagnement" : "entreprise";
    const deal = s.create(
      "deals",
      {
        title: `${sub.company ?? sub.name} — ${sub.fields.serviceName ?? sub.fields.format ?? sub.type}`,
        type,
        stage: "qualification",
        amountCents: 0,
        probability: 20,
        contactId,
        orgId,
        ownerId: sub.assigneeId ?? s.sessionUserId,
        source: SOURCE_BY_TYPE[sub.type],
        submissionId: sub.id,
        nextStep: "Appel de découverte",
      },
      { log: "Opportunité créée depuis une demande entrante" },
    );
    patch.dealId = deal.id;
  }
  s.update("submissions", sub.id, patch, { log: to === "deal" ? "Demande convertie en opportunité" : "Demande qualifiée en contact", kind: "statut" });
}

/* ───────────────────────────── Réclamations ───────────────────────────── */

/** Accusé de réception (engagement 48h ouvrées — indicateur 31). */
export function acknowledgeComplaint(id: ID) {
  const s = crm();
  const c = findById("complaints", id);
  if (!c) return;
  const contact = findById("contacts", c.contactId);
  if (contact) {
    sendEmail({
      to: contact.email,
      template: findTemplate("qualiopi", "réclamation") ?? findTemplate("accuse_reception", "réclamation"),
      subject: findTemplate("qualiopi", "réclamation") ?? findTemplate("accuse_reception", "réclamation") ? undefined : "Votre réclamation {{numero_reclamation}} : accusé de réception",
      body:
        findTemplate("qualiopi", "réclamation") ?? findTemplate("accuse_reception", "réclamation")
          ? undefined
          : "Bonjour {{prenom}},\n\nNous accusons réception de votre réclamation {{numero_reclamation}} du {{date_reception}}. Elle est en cours d'analyse ; nous revenons vers vous rapidement.\n\nL'équipe StartupWeek",
      vars: { prenom: contact.firstName, numero_reclamation: c.number, date_reception: date(c.receivedAt) },
      related: { entity: "complaints", id: c.id },
    });
  }
  s.update("complaints", c.id, { ackAt: iso(nowMs()), status: c.status === "recue" ? "accusee" : c.status }, { log: `Accusé de réception envoyé (${c.number})`, kind: "statut" });
}

export function nextComplaintNumber(): string {
  const year = new Date(nowMs()).getFullYear();
  const max = crm().complaints.reduce((m, c) => {
    const r = new RegExp(`^REC-${year}-(\\d+)$`).exec(c.number);
    return r ? Math.max(m, Number(r[1])) : m;
  }, 0);
  return `REC-${year}-${String(max + 1).padStart(3, "0")}`;
}


/* ───────────────────────────── StartupWeek Academy ───────────────────────────── */

/**
 * Ouvre l'accès d'un contact à une formation. Idempotent : une inscription existante
 * (même formation, même contact) est réactivée et son accès prolongé si besoin.
 * En base : contrainte unique (course_id, contact_id).
 */
export function enrollInCourse(opts: {
  courseId: ID;
  contactId: ID;
  source: EnrollmentSource;
  persona?: Persona;
  eventId?: ID;
  applicationId?: ID;
  cohortId?: ID;
  pathId?: ID;
  invoiceId?: ID;
  /** Début du décompte d'accès (défaut : maintenant). */
  accessFrom?: string;
  /** Fin d'accès imposée (cohorte) ; sinon début + durée d'accès de la formation. */
  expiresAt?: string;
  silent?: boolean;
}): { enrollment: Enrollment; created: boolean } | undefined {
  const s = crm();
  const course = findById("courses", opts.courseId);
  const contact = findById("contacts", opts.contactId);
  if (!course || !contact) return undefined;
  const now = nowMs();
  const from = Math.max(now, opts.accessFrom ? new Date(opts.accessFrom).getTime() : now);
  const expiresAt = opts.expiresAt ?? iso(from + course.accessDays * DAY);
  const existing = s.enrollments.find((e) => e.courseId === course.id && e.contactId === contact.id);
  if (existing) {
    const later = new Date(expiresAt).getTime() > new Date(existing.expiresAt).getTime();
    const reopen = existing.status === "expiree" || existing.status === "suspendue";
    if (!later && !reopen) return { enrollment: existing, created: false };
    s.update(
      "enrollments",
      existing.id,
      {
        status: existing.completedAt ? "terminee" : "active",
        expiresAt: later ? expiresAt : existing.expiresAt,
        eventId: existing.eventId ?? opts.eventId,
        applicationId: existing.applicationId ?? opts.applicationId,
        cohortId: existing.cohortId ?? opts.cohortId,
        invoiceId: existing.invoiceId ?? opts.invoiceId,
      },
      { log: `Accès prolongé jusqu'au ${date(later ? expiresAt : existing.expiresAt)}`, kind: "statut" },
    );
    return { enrollment: findById("enrollments", existing.id)!, created: false };
  }
  const app = opts.applicationId ? findById("applications", opts.applicationId) : undefined;
  const enrollment = s.create(
    "enrollments",
    {
      courseId: course.id,
      contactId: contact.id,
      source: opts.source,
      status: "active",
      persona: opts.persona ?? app?.persona ?? "non_tech",
      eventId: opts.eventId,
      applicationId: opts.applicationId,
      cohortId: opts.cohortId,
      pathId: opts.pathId,
      invoiceId: opts.invoiceId,
      grantedAt: iso(now),
      expiresAt,
      progressPercent: 0,
      timeSpentMinutes: 0,
    },
    { log: `Accès ouvert à « ${course.title} »` },
  );
  s.log({ kind: "systeme", entity: "contacts", entityId: contact.id, actorId: s.sessionUserId, summary: `Accès StartupWeek Academy : « ${course.title} » jusqu'au ${date(expiresAt)}` });
  if (!opts.silent) {
    sendEmail({
      to: contact.email,
      subject: "Votre accès à StartupWeek Academy : {{formation}}",
      body:
        "Bonjour {{prenom}},\n\nVotre accès à la formation « {{formation}} » est ouvert jusqu'au {{date_fin}}.\nRetrouvez-la dans votre espace : {{lien_espace}}\n\nLes leçons se débloquent au fil de votre progression. Une question ? Répondez simplement à cet email.\n\nL'équipe StartupWeek",
      vars: { prenom: contact.firstName, formation: course.title, date_fin: date(expiresAt, "d MMMM yyyy"), lien_espace: "https://www.startupweek.tech/mon-espace" },
      related: { entity: "enrollments", id: enrollment.id },
    });
  }
  return { enrollment, created: true };
}

/** Candidature « inscrite » : accès aux formations liées à sa session (6 mois après la fin de la session). */
export function enrollFromApplication(applicationId: ID): number {
  const s = crm();
  const app = findById("applications", applicationId);
  if (!app) return 0;
  const ev = findById("events", app.eventId);
  let created = 0;
  for (const course of s.courses) {
    if (course.status === "archivee" || !course.eventIds.includes(app.eventId)) continue;
    const r = enrollInCourse({ courseId: course.id, contactId: app.contactId, source: "session", persona: app.persona, eventId: app.eventId, applicationId: app.id, accessFrom: ev?.endAt });
    if (r?.created) created++;
  }
  return created;
}

/** Rattrapage : donne l'accès à tous les inscrits des sessions liées à une formation. */
export function syncCourseEnrollments(courseId: ID): number {
  const s = crm();
  const course = findById("courses", courseId);
  if (!course) return 0;
  const apps = s.applications.filter((a) => a.status === "inscrite" && course.eventIds.includes(a.eventId));
  let created = 0;
  for (const app of apps) {
    const ev = findById("events", app.eventId);
    const r = enrollInCourse({ courseId, contactId: app.contactId, source: "session", persona: app.persona, eventId: app.eventId, applicationId: app.id, accessFrom: ev?.endAt });
    if (r?.created) created++;
  }
  return created;
}

/** Désistement : les accès obtenus par cette candidature sont suspendus. */
export function suspendApplicationEnrollments(applicationId: ID) {
  const s = crm();
  for (const e of s.enrollments.filter((x) => x.applicationId === applicationId && x.source === "session" && x.status === "active")) {
    s.update("enrollments", e.id, { status: "suspendue" }, { log: "Accès suspendu (désistement)", kind: "statut" });
  }
}

/** Cohorte école / entreprise : accès de chaque membre à chaque formation, jusqu'à la fin de la cohorte. */
export function enrollCohort(cohortId: ID): number {
  const s = crm();
  const cohort = findById("cohorts", cohortId);
  if (!cohort) return 0;
  let created = 0;
  for (const courseId of cohort.courseIds) {
    for (const contactId of cohort.contactIds) {
      const r = enrollInCourse({ courseId, contactId, source: "cohorte", cohortId: cohort.id, eventId: cohort.eventId, expiresAt: cohort.endsAt, accessFrom: cohort.startsAt });
      if (r?.created) created++;
    }
  }
  if (created) s.log({ kind: "systeme", entity: "cohorts", entityId: cohort.id, actorId: s.sessionUserId, summary: `${created} accès ouverts pour la cohorte « ${cohort.name} »` });
  return created;
}

/** Correction d'un livrable par un formateur. */
export function reviewAssignment(id: ID, review: { status: AssignmentStatus; feedback: string; grade?: number }) {
  const s = crm();
  const a = findById("assignments", id);
  if (!a) return;
  s.update(
    "assignments",
    id,
    { status: review.status, feedback: review.feedback, grade: review.grade, reviewerId: s.sessionUserId, reviewedAt: iso(nowMs()) },
    { log: review.status === "valide" ? "Livrable validé" : "Livrable à reprendre", kind: "statut" },
  );
}

/** Certificat de réalisation (FOAD) émis pour une inscription. */
export function issueCertificate(enrollmentId: ID) {
  const s = crm();
  const e = findById("enrollments", enrollmentId);
  if (!e) return;
  s.update("enrollments", e.id, { certificateIssuedAt: iso(nowMs()) }, { log: "Certificat de réalisation émis", kind: "document" });
}
