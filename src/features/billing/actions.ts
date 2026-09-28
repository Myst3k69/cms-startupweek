/**
 * Actions métier du module Facturation (brouillons, émission, avoirs, devis, relances, catalogue).
 *
 * Elles s'appuient sur les actions transverses de `@/lib/domain/actions` (createInvoice,
 * nextNumber, sendEmail, createTask) et journalisent chaque étape dans la timeline.
 * Les relances reprennent l'effet de sendInvoiceReminder avec un modèle par niveau (voir sendReminderEmail).
 * En production, la même logique vit côté serveur (numérotation : crm.next_document_number()).
 */
import { crm, findById } from "@/lib/store";
import { createInvoice, createTask, nextNumber, paymentText, sendEmail } from "@/lib/domain/actions";
import { contactName, invoiceBalance, invoiceTotal } from "@/lib/domain/selectors";
import { date, money } from "@/lib/format";
import { uid } from "@/lib/utils";
import type { ID, Invoice, InvoiceKind, LineItem, Offer, PaymentMethod, Quote } from "@/lib/domain/types";
import { displayNumber, isCollectible, quoteTotal } from "./lib";

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const nowMs = () => Date.now();

function stripeLink() {
  return `https://buy.stripe.com/test_${uid("pl").slice(3)}`;
}

function recipientOf(doc: { contactId?: ID; orgId?: ID }) {
  const contact = findById("contacts", doc.contactId);
  const org = findById("organizations", doc.orgId);
  return { contact, org, to: org?.billingEmail ?? contact?.email };
}

function cloneLines(lines: LineItem[]): LineItem[] {
  return lines.map((l) => ({ ...l, id: uid("li") }));
}

/* ───────────────────────────── Factures ───────────────────────────── */

export interface InvoiceInput {
  kind: Exclude<InvoiceKind, "avoir">;
  contactId?: ID;
  orgId?: ID;
  applicationId?: ID;
  eventId?: ID;
  quoteId?: ID;
  dueAt: string;
  lines: LineItem[];
  preferredMethod: PaymentMethod;
  funder?: Invoice["funder"];
  notes?: string;
  withStripeLink: boolean;
}

function invoiceFields(input: InvoiceInput) {
  return {
    kind: input.kind,
    contactId: input.contactId,
    orgId: input.orgId,
    applicationId: input.applicationId,
    eventId: input.eventId,
    quoteId: input.quoteId,
    dueAt: input.dueAt,
    lines: input.lines,
    preferredMethod: input.preferredMethod,
    funder: input.funder,
    notes: input.notes,
  };
}

/** Enregistre (création ou mise à jour) un brouillon — aucun numéro légal n'est consommé. */
export function saveInvoiceDraft(input: InvoiceInput, id?: ID): Invoice {
  const s = crm();
  const existing = id ? findById("invoices", id) : undefined;
  if (existing) {
    if (existing.status !== "brouillon") throw new Error("Seul un brouillon peut être modifié.");
    s.update("invoices", existing.id, { ...invoiceFields(input), stripePaymentLink: input.withStripeLink ? existing.stripePaymentLink : undefined }, { log: "Brouillon modifié" });
    return findById("invoices", existing.id)!;
  }
  return s.create(
    "invoices",
    { ...invoiceFields(input), number: "", status: "brouillon", issuedAt: iso(nowMs()), paidCents: 0, remindersSent: 0 },
    { log: "Brouillon de facture créé", kind: "creation" },
  );
}

function linkApplication(inv: Invoice) {
  if (!inv.applicationId) return;
  const app = findById("applications", inv.applicationId);
  if (app && !app.invoiceId) crm().update("applications", app.id, { invoiceId: inv.id });
}

/** Émet une facture saisie dans l'éditeur (numéro attribué maintenant, séquentiel et sans trou). */
export function createAndIssueInvoice(input: InvoiceInput): Invoice {
  const now = nowMs();
  const inv = createInvoice({
    ...invoiceFields(input),
    status: "emise",
    issuedAt: iso(now),
    dueAt: new Date(input.dueAt).getTime() < now ? iso(now) : input.dueAt,
    stripePaymentLink: input.withStripeLink ? stripeLink() : undefined,
  });
  linkApplication(inv);
  if (input.quoteId) crm().update("quotes", input.quoteId, { invoiceId: inv.id });
  return inv;
}

/** Brouillon → émise : attribution du numéro légal à l'émission uniquement. */
export function issueInvoice(id: ID): Invoice | undefined {
  const s = crm();
  const inv = findById("invoices", id);
  if (!inv || inv.status !== "brouillon") return inv;
  const now = nowMs();
  const number = nextNumber("invoice");
  const dueAt = new Date(inv.dueAt).getTime() < now ? iso(now + s.settings.paymentTermsDays * DAY) : inv.dueAt;
  s.update("invoices", inv.id, {
    number,
    status: "emise",
    issuedAt: iso(now),
    dueAt,
    stripePaymentLink: inv.stripePaymentLink ?? (inv.preferredMethod === "stripe" ? stripeLink() : undefined),
  });
  const issued = findById("invoices", inv.id)!;
  s.log({ kind: "document", entity: "invoices", entityId: inv.id, actorId: s.sessionUserId, summary: `Facture ${number} émise — ${money(invoiceTotal(issued).ttc)}` });
  if (inv.applicationId) s.log({ kind: "document", entity: "applications", entityId: inv.applicationId, actorId: s.sessionUserId, summary: `Facture ${number} émise (${money(invoiceTotal(issued).ttc)})` });
  linkApplication(issued);
  if (inv.quoteId) s.update("quotes", inv.quoteId, { invoiceId: inv.id });
  return issued;
}

/** Annulation d'un brouillon (une facture émise ne se supprime jamais : avoir). */
export function cancelDraftInvoice(id: ID) {
  const inv = findById("invoices", id);
  if (!inv || inv.status !== "brouillon") return false;
  crm().update("invoices", id, { status: "annulee" }, { log: "Brouillon annulé", kind: "statut" });
  return true;
}

/** Copie en brouillon (sans numéro, sans paiement ni candidature liée). */
export function duplicateInvoice(id: ID): Invoice | undefined {
  const inv = findById("invoices", id);
  if (!inv) return undefined;
  const s = crm();
  const copy = s.create(
    "invoices",
    {
      number: "",
      kind: inv.kind === "avoir" ? "facture" : inv.kind,
      status: "brouillon",
      contactId: inv.contactId,
      orgId: inv.orgId,
      eventId: inv.eventId,
      issuedAt: iso(nowMs()),
      dueAt: iso(nowMs() + s.settings.paymentTermsDays * DAY),
      lines: cloneLines(inv.lines),
      paidCents: 0,
      preferredMethod: inv.preferredMethod,
      funder: inv.funder,
      remindersSent: 0,
      notes: inv.notes,
    },
    { log: `Brouillon créé par duplication de ${displayNumber(inv)}` },
  );
  return copy;
}

/**
 * Avoir total (même séquence de numérotation) : lignes identiques, montants négatifs.
 * La facture d'origine passe « annulée » (plus rien à encaisser) ; si elle avait déjà été réglée,
 * même partiellement, une tâche de remboursement est créée.
 */
export function createCreditNote(id: ID, reason?: string): Invoice | undefined {
  const s = crm();
  const inv = findById("invoices", id);
  if (!inv || inv.kind === "avoir" || inv.status === "brouillon" || !inv.number) return undefined;
  const now = nowMs();
  const credit = createInvoice({
    kind: "avoir",
    status: "emise",
    contactId: inv.contactId,
    orgId: inv.orgId,
    applicationId: inv.applicationId,
    eventId: inv.eventId,
    creditedInvoiceId: inv.id,
    issuedAt: iso(now),
    dueAt: iso(now),
    lines: cloneLines(inv.lines),
    preferredMethod: inv.preferredMethod,
    funder: inv.funder,
    notes: reason ? `Motif : ${reason}` : undefined,
  });
  s.update("invoices", inv.id, { status: "annulee" }, { log: `Facture annulée par l'avoir ${credit.number}`, kind: "statut" });
  if (inv.paidCents > 0) {
    s.log({ kind: "document", entity: "invoices", entityId: inv.id, actorId: s.sessionUserId, summary: `Remboursement de ${money(inv.paidCents)} à effectuer (avoir ${credit.number})` });
    createTask({
      title: `Rembourser ${money(inv.paidCents)} — avoir ${credit.number} (${inv.number})`,
      kind: "paiement",
      priority: "haute",
      dueInDays: 3,
      related: { entity: "invoices", id: credit.id },
      automated: true,
    });
  }
  return credit;
}

/** Modèle d'email « facturation » dont le nom ou l'objet correspond (sans repli sur un autre modèle). */
function billingTemplate(match: RegExp, exclude?: RegExp) {
  return crm().emailTemplates.find((t) => t.category === "facturation" && match.test(`${t.name} ${t.subject}`) && !(exclude && exclude.test(t.name)));
}

/**
 * Variables d'email d'une facture. Les deux conventions coexistent : `numero`/`echeance`
 * (actions transverses) et `numero_facture`/`date_echeance` (modèles d'emails du seed).
 */
function invoiceVars(inv: Invoice, amountCents: number) {
  const { contact } = recipientOf(inv);
  const ev = findById("events", inv.eventId);
  const numero = inv.number;
  const echeance = date(inv.dueAt, "d MMMM yyyy");
  return {
    prenom: contact?.firstName ?? "",
    numero,
    numero_facture: numero,
    montant: money(amountCents, true),
    echeance,
    date_echeance: echeance,
    lien_paiement: paymentText(inv),
    session: ev?.name ?? "",
  };
}

/** Envoi de la facture par email (lien vers la facture + règlement). Modèle « Facture d'acompte » pour un acompte. */
export function sendInvoiceEmail(id: ID) {
  const inv = findById("invoices", id);
  if (!inv || !inv.number) return false;
  const { to } = recipientOf(inv);
  if (!to) return false;
  const tpl =
    inv.kind === "acompte" && inv.eventId
      ? billingTemplate(/acompte/i, /relance|rappel/i)
      : billingTemplate(inv.kind === "avoir" ? /envoi d'avoir/i : /envoi de facture/i);
  const label = inv.kind === "avoir" ? "l'avoir" : inv.kind === "acompte" ? "la facture d'acompte" : inv.kind === "solde" ? "la facture de solde" : "la facture";
  sendEmail({
    to,
    template: tpl,
    subject: tpl ? undefined : `${inv.kind === "avoir" ? "Avoir" : "Facture"} {{numero}} — StartupWeek`,
    body: tpl
      ? undefined
      : `Bonjour {{prenom}},\n\nVoici ${label} {{numero}} d'un montant de {{montant}}${inv.kind === "avoir" ? "" : ", à régler avant le {{echeance}}"} : {{lien_document}}\n${inv.kind === "avoir" ? "" : "Règlement : {{lien_paiement}}\n"}\nMerci pour votre confiance,\nL'équipe StartupWeek`,
    vars: invoiceVars(inv, Math.abs(invoiceTotal(inv).ttc)),
    related: { entity: "invoices", id: inv.id },
  });
  return true;
}

/** Rappel préventif avant échéance (ne fait pas monter le niveau de relance). */
export function sendDueSoonNotice(id: ID) {
  const inv = findById("invoices", id);
  if (!inv || !inv.number) return false;
  const { to } = recipientOf(inv);
  if (!to) return false;
  const tpl = billingTemplate(/avant échéance/i);
  sendEmail({
    to,
    template: tpl,
    subject: tpl ? undefined : "Rappel : facture {{numero}} à régler avant le {{echeance}}",
    body: tpl ? undefined : "Bonjour {{prenom}},\n\nPetit rappel : la facture {{numero}} ({{montant}}) arrive à échéance le {{echeance}}.\nFacture : {{lien_document}}\nRèglement : {{lien_paiement}}\n\nL'équipe StartupWeek",
    vars: invoiceVars(inv, invoiceBalance(inv)),
    related: { entity: "invoices", id: inv.id },
  });
  crm().update("invoices", inv.id, { lastReminderAt: iso(nowMs()) });
  return true;
}

/**
 * Email de relance d'impayé, modèle choisi selon le niveau (J+3, J+10, mise en demeure).
 * Même effet que sendInvoiceReminder (remindersSent + 1, lastReminderAt) mais avec le bon modèle
 * par niveau et les variables attendues par les modèles du seed ({{numero_facture}}, {{date_echeance}}).
 */
function sendReminderEmail(inv: Invoice, level: number, to: string) {
  const tpl = level === 1 ? billingTemplate(/j\+3\b/i) : level === 2 ? billingTemplate(/j\+10\b/i) : billingTemplate(/mise en demeure/i);
  const formal = level >= 3;
  sendEmail({
    to,
    template: tpl,
    subject: tpl ? undefined : formal ? "Mise en demeure — facture {{numero}} impayée" : "Rappel — facture {{numero}}",
    body: tpl
      ? undefined
      : formal
        ? `Bonjour,\n\nMalgré nos relances, la facture {{numero}} d'un montant de {{montant}}, échue le {{echeance}}, reste impayée.\nNous vous mettons en demeure de la régler sous 8 jours : {{lien_paiement}}.\nÀ défaut, des pénalités de retard seront appliquées conformément à nos CGV${inv.orgId ? ", ainsi que l'indemnité forfaitaire de 40 € pour frais de recouvrement" : ""}.\n\nL'équipe StartupWeek`
        : "Bonjour {{prenom}},\n\nSauf erreur de notre part, la facture {{numero}} d'un montant de {{montant}} arrivée à échéance le {{echeance}} reste à régler.\nRèglement : {{lien_paiement}}\n\nL'équipe StartupWeek",
    vars: invoiceVars(inv, invoiceBalance(inv)),
    related: { entity: "invoices", id: inv.id },
  });
  crm().update("invoices", inv.id, { remindersSent: inv.remindersSent + 1, lastReminderAt: iso(nowMs()) });
}

/**
 * Étape suivante de la séquence de relance :
 * niveau 1 (J+3) email · niveau 2 (J+10) email + tâche d'appel · niveau 3 (J+30) mise en demeure (tâche LRAR).
 */
export function runReminderStep(id: ID): { ok: boolean; level: number; reason?: string } {
  const inv = findById("invoices", id);
  if (!inv || !isCollectible(inv)) return { ok: false, level: inv?.remindersSent ?? 0, reason: "Facture soldée ou non émise" };
  const { contact, org, to } = recipientOf(inv);
  if (!to) return { ok: false, level: inv.remindersSent, reason: "Aucun email de facturation" };
  const level = inv.remindersSent + 1;
  sendReminderEmail(inv, level, to);
  const who = org?.name ?? contactName(contact);
  if (level === 2) {
    createTask({ title: `Appeler ${who} — facture ${inv.number} impayée (${money(invoiceBalance(inv))})`, kind: "appel", priority: "haute", dueInDays: 1, related: { entity: "invoices", id: inv.id }, automated: true });
  }
  if (level >= 3) {
    createTask({
      title: `Mise en demeure (LRAR) — ${inv.number} · ${who}`,
      kind: "paiement",
      priority: "urgente",
      dueInDays: 2,
      related: { entity: "invoices", id: inv.id },
      automated: true,
      notes: "Rappeler les pénalités de retard (3 × taux légal) et l'indemnité forfaitaire de 40 € (clients professionnels).",
    });
    crm().log({ kind: "systeme", entity: "invoices", entityId: inv.id, summary: `Mise en demeure à envoyer (relance n° ${level})` });
  }
  return { ok: true, level };
}

/* ───────────────────────────── Devis ───────────────────────────── */

export interface QuoteInput {
  contactId?: ID;
  orgId?: ID;
  dealId?: ID;
  eventId?: ID;
  validUntil: string;
  lines: LineItem[];
  notes?: string;
}

/** Création (numéro D-AAAA-NNNN attribué dès la création) ou mise à jour d'un devis brouillon. */
export function saveQuote(input: QuoteInput, id?: ID): Quote {
  const s = crm();
  const existing = id ? findById("quotes", id) : undefined;
  if (existing) {
    s.update("quotes", existing.id, { ...input }, { log: "Devis modifié" });
    return findById("quotes", existing.id)!;
  }
  const q = s.create("quotes", { ...input, number: nextNumber("quote"), status: "brouillon", issuedAt: iso(nowMs()) }, { log: false });
  s.log({ kind: "document", entity: "quotes", entityId: q.id, actorId: s.sessionUserId, summary: `Devis ${q.number} créé — ${money(quoteTotal(q).ht)} HT` });
  if (q.dealId) {
    const deal = findById("deals", q.dealId);
    if (deal && !deal.quoteId) s.update("deals", deal.id, { quoteId: q.id });
    s.log({ kind: "document", entity: "deals", entityId: q.dealId, actorId: s.sessionUserId, summary: `Devis ${q.number} préparé (${money(quoteTotal(q).ht)} HT)` });
  }
  return q;
}

/** Envoi du devis : email + statut « envoyé » ; l'opportunité liée passe en « proposition ». */
export function sendQuote(id: ID) {
  const s = crm();
  const q = findById("quotes", id);
  if (!q) return false;
  const { contact, to } = recipientOf(q);
  if (!to) return false;
  const tpl = billingTemplate(/envoi de devis/i);
  sendEmail({
    to,
    template: tpl,
    subject: tpl ? undefined : "Votre devis StartupWeek {{numero}}",
    body: tpl
      ? undefined
      : "Bonjour {{prenom}},\n\nComme convenu, voici notre proposition {{numero}} d'un montant de {{montant}} HT, valable jusqu'au {{validite}} : {{lien_document}}\nUn simple « bon pour accord » en réponse suffit pour lancer l'organisation.\n\nBien à vous,\nL'équipe StartupWeek",
    vars: { prenom: contact?.firstName ?? "", numero: q.number, montant: money(quoteTotal(q).ht, true), validite: date(q.validUntil) },
    related: { entity: "quotes", id: q.id },
  });
  s.update("quotes", q.id, { status: q.status === "brouillon" || q.status === "expire" ? "envoye" : q.status, sentAt: iso(nowMs()) }, { log: `Devis ${q.number} envoyé à ${to}`, kind: "statut" });
  if (q.dealId) {
    const deal = findById("deals", q.dealId);
    if (deal && ["nouveau", "qualification", "rdv"].includes(deal.stage)) {
      s.update("deals", deal.id, { stage: "proposition", probability: Math.max(deal.probability, 55), quoteId: deal.quoteId ?? q.id }, { log: `Proposition envoyée (devis ${q.number})`, kind: "statut" });
    }
  }
  return true;
}

export function setQuoteStatus(id: ID, status: "accepte" | "refuse") {
  const s = crm();
  const q = findById("quotes", id);
  if (!q) return;
  s.update("quotes", q.id, { status, acceptedAt: status === "accepte" ? iso(nowMs()) : q.acceptedAt }, { log: status === "accepte" ? `Devis ${q.number} accepté` : `Devis ${q.number} refusé`, kind: "statut" });
  if (q.dealId) {
    const deal = findById("deals", q.dealId);
    if (deal && status === "accepte" && deal.stage !== "gagne") {
      s.update("deals", deal.id, { stage: "gagne", probability: 100, closedAt: iso(nowMs()), amountCents: deal.amountCents || quoteTotal(q).ht }, { log: `Gagné — devis ${q.number} accepté`, kind: "statut" });
    }
    if (deal && status === "refuse") s.log({ kind: "statut", entity: "deals", entityId: deal.id, actorId: s.sessionUserId, summary: `Devis ${q.number} refusé par le client` });
  }
}

/** Devis accepté → brouillon de facture prérempli (lignes, client, session) à vérifier puis émettre. */
export function convertQuoteToInvoice(id: ID): Invoice | undefined {
  const s = crm();
  const q = findById("quotes", id);
  if (!q) return undefined;
  if (q.invoiceId) return findById("invoices", q.invoiceId);
  const now = nowMs();
  const inv = s.create(
    "invoices",
    {
      number: "",
      kind: "facture",
      status: "brouillon",
      contactId: q.contactId,
      orgId: q.orgId,
      eventId: q.eventId,
      quoteId: q.id,
      issuedAt: iso(now),
      dueAt: iso(now + s.settings.paymentTermsDays * DAY),
      lines: cloneLines(q.lines),
      paidCents: 0,
      preferredMethod: "virement",
      remindersSent: 0,
      notes: q.notes,
    },
    { log: `Brouillon créé depuis le devis ${q.number}` },
  );
  s.update("quotes", q.id, { invoiceId: inv.id, status: q.status === "accepte" ? q.status : "accepte", acceptedAt: q.acceptedAt ?? iso(now) }, { log: "Converti en facture (brouillon)", kind: "statut" });
  return inv;
}

export function duplicateQuote(id: ID): Quote | undefined {
  const q = findById("quotes", id);
  if (!q) return undefined;
  return saveQuote({ contactId: q.contactId, orgId: q.orgId, dealId: q.dealId, eventId: q.eventId, validUntil: iso(nowMs() + 30 * DAY), lines: cloneLines(q.lines), notes: q.notes });
}

/* ───────────────────────────── Catalogue ───────────────────────────── */

export type OfferInput = Omit<Offer, "id" | "createdAt" | "updatedAt">;

export function saveOffer(input: OfferInput, id?: ID): Offer {
  const s = crm();
  if (id && findById("offers", id)) {
    s.update("offers", id, input, { log: `Offre « ${input.name} » modifiée` });
    return findById("offers", id)!;
  }
  return s.create("offers", input, { log: `Offre « ${input.name} » ajoutée au catalogue` });
}

export function setOfferActive(id: ID, active: boolean) {
  const o = findById("offers", id);
  if (!o) return;
  crm().update("offers", id, { active }, { log: `Offre « ${o.name} » ${active ? "activée" : "désactivée"}`, kind: "statut" });
}
