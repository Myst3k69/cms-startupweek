/**
 * Actions métier du module Facturation (brouillons, émission, avoirs, devis, relances, rapprochement Qonto, catalogue).
 *
 * Elles s'appuient sur les actions transverses de `@/lib/domain/actions` (createInvoice, recordPayment,
 * sendInvoiceReminder, nextNumber, sendEmail, createTask) et journalisent chaque étape dans la timeline.
 * En production, la même logique vit côté serveur (numérotation : crm.next_document_number()).
 */
import { crm, findById } from "@/lib/store";
import { createInvoice, createTask, findTemplate, nextNumber, recordPayment, sendEmail, sendInvoiceReminder } from "@/lib/domain/actions";
import { contactName, invoiceBalance, invoiceTotal } from "@/lib/domain/selectors";
import { date, money } from "@/lib/format";
import { uid } from "@/lib/utils";
import type { ID, Invoice, InvoiceKind, LineItem, Offer, PaymentMethod, Quote } from "@/lib/domain/types";
import { displayNumber, guessCounterparty, isCollectible, quoteTotal, type ParsedBankRow } from "./lib";

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
 * Facture d'origine non réglée → annulée ; déjà réglée (même partiellement) → tâche de remboursement.
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
  if (inv.paidCents > 0) {
    s.log({ kind: "document", entity: "invoices", entityId: inv.id, actorId: s.sessionUserId, summary: `Avoir ${credit.number} émis — remboursement de ${money(inv.paidCents)} à effectuer` });
    createTask({
      title: `Rembourser ${money(inv.paidCents)} — avoir ${credit.number} (${inv.number})`,
      kind: "paiement",
      priority: "haute",
      dueInDays: 3,
      related: { entity: "invoices", id: credit.id },
      automated: true,
    });
  } else {
    s.update("invoices", inv.id, { status: "annulee" }, { log: `Facture annulée par l'avoir ${credit.number}`, kind: "statut" });
  }
  return credit;
}

/** Envoi de la facture par email (PDF + lien de paiement). */
export function sendInvoiceEmail(id: ID) {
  const inv = findById("invoices", id);
  if (!inv || !inv.number) return false;
  const { contact, to } = recipientOf(inv);
  if (!to) return false;
  const tpl = findTemplate("facturation", "facture");
  const useTpl = tpl && !/relance|rappel/i.test(`${tpl.name} ${tpl.subject}`);
  sendEmail({
    to,
    template: useTpl ? tpl : undefined,
    subject: useTpl ? undefined : `${inv.kind === "avoir" ? "Avoir" : "Facture"} {{numero}} — StartupWeek`,
    body: useTpl
      ? undefined
      : `Bonjour {{prenom}},\n\nVeuillez trouver ci-joint la ${inv.kind === "avoir" ? "note d'avoir" : "facture"} {{numero}} d'un montant de {{montant}}, payable avant le {{echeance}}.\n${inv.stripePaymentLink ? "Paiement sécurisé par carte : {{lien_paiement}}\n" : ""}Virement : IBAN ${crm().settings.iban}, en indiquant la référence {{numero}}.\n\nMerci pour votre confiance,\nL'équipe StartupWeek`,
    vars: { prenom: contact?.firstName ?? "", numero: inv.number, montant: money(invoiceTotal(inv).ttc, true), echeance: date(inv.dueAt), lien_paiement: inv.stripePaymentLink ?? "" },
    related: { entity: "invoices", id: inv.id },
  });
  return true;
}

/** Rappel préventif avant échéance (ne fait pas monter le niveau de relance). */
export function sendDueSoonNotice(id: ID) {
  const inv = findById("invoices", id);
  if (!inv || !inv.number) return false;
  const { contact, to } = recipientOf(inv);
  if (!to) return false;
  sendEmail({
    to,
    subject: "Rappel : facture {{numero}} à régler avant le {{echeance}}",
    body: "Bonjour {{prenom}},\n\nPetit rappel : la facture {{numero}} ({{montant}}) arrive à échéance le {{echeance}}.\nLien de paiement : {{lien_paiement}}\n\nL'équipe StartupWeek",
    vars: { prenom: contact?.firstName ?? "", numero: inv.number, montant: money(invoiceBalance(inv), true), echeance: date(inv.dueAt), lien_paiement: inv.stripePaymentLink ?? "" },
    related: { entity: "invoices", id: inv.id },
  });
  crm().update("invoices", inv.id, { lastReminderAt: iso(nowMs()) });
  return true;
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
  sendInvoiceReminder(inv.id);
  const level = inv.remindersSent + 1;
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

/* ───────────────────────────── Rapprochement bancaire ───────────────────────────── */

/** Rapproche un crédit Qonto d'une facture : paiement « virement » + transaction marquée rapprochée. */
export function reconcileTransaction(txId: ID, invoiceId: ID) {
  const s = crm();
  const tx = findById("bankTransactions", txId);
  const inv = findById("invoices", invoiceId);
  if (!tx || !inv || tx.status === "rapproche" || tx.amountCents <= 0) return undefined;
  const pay = recordPayment(invoiceId, tx.amountCents, "virement", tx.reference ? `${tx.id} · ${tx.reference}` : tx.id, { bankTransactionId: tx.id, receivedAt: tx.bookedAt });
  if (!pay) return undefined;
  s.update("bankTransactions", tx.id, { status: "rapproche", matchedInvoiceId: inv.id, paymentId: pay.id }, { log: `Rapprochée avec ${inv.number}`, kind: "statut" });
  return pay;
}

/** Virement de versement Stripe (payout) : les paiements sont déjà enregistrés côté Stripe. */
export function markPayoutReconciled(txId: ID) {
  crm().update("bankTransactions", txId, { status: "rapproche" }, { log: "Versement Stripe rapproché (paiements déjà enregistrés)", kind: "statut" });
}

export function setTransactionIgnored(txId: ID, ignored: boolean) {
  crm().update("bankTransactions", txId, { status: ignored ? "ignore" : "a_rapprocher" }, { log: ignored ? "Transaction ignorée" : "Transaction remise à rapprocher", kind: "statut" });
}

/** Import CSV (démo) : crée les transactions, ignore les doublons (même date, montant et libellé). */
export function importBankTransactions(rows: ParsedBankRow[]) {
  const s = crm();
  const key = (d: string, amount: number, label: string) => `${d.slice(0, 10)}|${amount}|${label.trim().toLowerCase()}`;
  const existing = new Set(s.bankTransactions.map((t) => key(t.bookedAt, t.amountCents, t.label)));
  let created = 0;
  let duplicates = 0;
  for (const r of rows) {
    const k = key(r.bookedAt, r.amountCents, r.label);
    if (existing.has(k)) {
      duplicates++;
      continue;
    }
    existing.add(k);
    s.create(
      "bankTransactions",
      { bookedAt: r.bookedAt, label: r.label, counterparty: r.counterparty || guessCounterparty(r.label), amountCents: r.amountCents, reference: r.reference, source: "import_csv", status: "a_rapprocher" },
      { log: "Transaction importée (CSV Qonto)" },
    );
    created++;
  }
  return { created, duplicates };
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
  sendEmail({
    to,
    subject: "Votre devis StartupWeek {{numero}}",
    body: "Bonjour {{prenom}},\n\nComme convenu, vous trouverez ci-joint notre proposition {{numero}} d'un montant de {{montant}} HT, valable jusqu'au {{validite}}.\nUn simple « bon pour accord » en réponse suffit pour lancer l'organisation.\n\nBien à vous,\nL'équipe StartupWeek",
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
