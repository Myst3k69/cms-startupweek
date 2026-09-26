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
  EmailTemplate,
  EntityRef,
  ID,
  Invoice,
  InvoiceKind,
  LineItem,
  PaymentMethod,
  Priority,
  Submission,
  TaskKind,
  TemplateCategory,
} from "./types";
import { contactName, invoiceBalance, invoiceTotal } from "./selectors";
import { date, money } from "@/lib/format";
import { labelOf, APPLICATION_STATUSES } from "./constants";
import { normalizeEmail, renderTemplate, uid } from "@/lib/utils";

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const nowMs = () => Date.now();

/* ───────────────────────────── Emails ───────────────────────────── */

export function findTemplate(category: TemplateCategory, keyword?: string): EmailTemplate | undefined {
  const k = keyword?.toLowerCase();
  const list = crm().emailTemplates.filter((t) => t.category === category);
  return (k ? list.find((t) => `${t.name} ${t.subject}`.toLowerCase().includes(k)) : undefined) ?? list[0];
}

/** Envoie (démo : journalise) un email à partir d'un template + variables échappées. */
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
  const subject = renderTemplate(opts.subject ?? tpl?.subject ?? "(sans objet)", vars);
  const body = renderTemplate(opts.body ?? tpl?.body ?? "", vars);
  const scheduled = opts.scheduledAt && new Date(opts.scheduledAt).getTime() > nowMs();
  const msg = crm().create(
    "emails",
    {
      to: opts.to,
      subject,
      body,
      templateId: tpl?.id,
      status: scheduled ? "programme" : "envoye",
      scheduledAt: opts.scheduledAt,
      sentAt: scheduled ? undefined : iso(nowMs()),
      related: opts.related,
    },
    { log: false },
  );
  if (opts.related) {
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
export function recordPayment(invoiceId: ID, amountCents: number, method: PaymentMethod, reference: string, opts?: { bankTransactionId?: ID; receivedAt?: string }) {
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
      bankTransactionId: opts?.bankTransactionId,
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
    subject: tpl ? undefined : `Rappel — facture ${inv.number}`,
    body: tpl ? undefined : `Bonjour,\n\nSauf erreur de notre part, la facture {{numero}} d'un montant de {{montant}} arrivée à échéance le {{echeance}} reste à régler.\nLien de paiement : {{lien_paiement}}\n\nL'équipe StartupWeek`,
    vars: { prenom: contact?.firstName ?? "", numero: inv.number, montant: money(invoiceBalance(inv), true), echeance: date(inv.dueAt), lien_paiement: inv.stripePaymentLink ?? "" },
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
export function changeApplicationStatus(applicationId: ID, status: ApplicationStatus) {
  const s = crm();
  const app = findById("applications", applicationId);
  if (!app || app.status === status) return;
  const contact = findById("contacts", app.contactId);
  const ev = findById("events", app.eventId);
  const now = nowMs();
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
    lieu: ev?.city,
    montant_acompte: ev ? money(Math.round((ev.priceCents * s.settings.depositPercent) / 100)) : "",
  };
  const related = { entity: "applications" as const, id: app.id };

  if (status === "acceptee") {
    const inv = createApplicationInvoice(app.id, "acompte");
    if (contact) {
      const tpl = findTemplate("candidature", ev?.mode === "distanciel" ? "distanciel" : "présentiel") ?? findTemplate("candidature", "accept");
      sendEmail({ to: contact.email, template: tpl, vars: { ...vars, lien_paiement: inv?.stripePaymentLink }, related });
    }
    createTask({ title: `Vérifier le paiement de l'acompte — ${contactName(contact)}`, kind: "paiement", dueInDays: 5, related, automated: true });
  }
  if (status === "inscrite") {
    if (contact) s.update("contacts", contact.id, { lifecycle: "participant" });
    createApplicationInvoice(app.id, "solde");
    if (ev) {
      const d = new Date(ev.startAt).getTime() - 7 * DAY;
      createTask({ title: `Envoyer la convocation — ${contactName(contact)} (${ev.code})`, kind: "qualiopi", dueAt: iso(Math.max(now + DAY, d)), related, automated: true });
    }
  }
  if ((status === "refusee" || status === "hors_cible") && contact) {
    sendEmail({ to: contact.email, template: findTemplate("candidature", "refus"), vars, related });
  }
  if (status === "entretien") {
    createTask({ title: `Préparer l'entretien — ${contactName(contact)}`, kind: "rdv", dueInDays: 2, related, automated: true });
  }
  if (status === "desistee" && ev) {
    s.log({ kind: "systeme", entity: "events", entityId: ev.id, summary: `Place libérée (désistement de ${contactName(contact)})` });
  }
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
    vars: { prenom: contact.firstName, session: ev.name, date_debut: date(ev.startAt, "d MMMM yyyy"), lieu: ev.city, code_session: ev.code },
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
      source: (({ candidature: "site_candidature", contact: "site_contact", entreprise: "site_entreprise", accompagnement: "site_accompagnement", partenariat: "site_partenariat", digital_starter_kit: "digital_starter_kit", reclamation: "site_contact", newsletter: "newsletter" }) as const)[sub.type],
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

/** Qualifie une demande : contact + opportunité (entreprise / partenariat / accompagnement). */
export function convertSubmission(subId: ID, to: "contact" | "deal") {
  const s = crm();
  const sub = findById("submissions", subId);
  if (!sub) return;
  const contactId = sub.contactId ?? ensureContactFromSubmission(sub);
  const patch: Partial<Submission> = { contactId, status: "convertie", answeredAt: sub.answeredAt ?? iso(nowMs()) };
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
        ownerId: s.sessionUserId,
        source: "site_entreprise",
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
      vars: { prenom: contact.firstName, numero: c.number },
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

