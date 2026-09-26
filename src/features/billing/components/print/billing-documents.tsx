"use client";

import * as React from "react";
import type { Contact, EventSession, Invoice, Organization, Quote, Settings } from "@/lib/domain/types";
import { useCollection, useEntity, useSettings } from "@/lib/hooks";
import { date, dateRange, money } from "@/lib/format";
import { invoiceTotal } from "@/lib/domain/selectors";
import { INVOICE_KINDS, labelOf } from "@/lib/domain/constants";
import { displayNumber, legalIdentity, NO_DISCOUNT_TEXT, quoteTotal, VAT_EXEMPTION_TEXT } from "../../lib";
import { DocumentSheet, type DocModel, type DocParty } from "./document-sheet";

function clientParty(org: Organization | undefined, contact: Contact | undefined, funder?: Invoice["funder"]): DocParty {
  const lines: string[] = [];
  if (org) {
    if (org.address) lines.push(org.address);
    else if (org.city) lines.push([org.city, org.country].filter(Boolean).join(", "));
    if (org.siret) lines.push(`SIRET ${org.siret}`);
    if (org.vatNumber) lines.push(`TVA ${org.vatNumber}`);
    if (contact) lines.push(`À l'attention de ${contact.firstName} ${contact.lastName}`);
    if (org.billingEmail) lines.push(org.billingEmail);
    if (funder?.subrogation) lines.push(`Subrogation de paiement${funder.agreementRef ? ` — accord n° ${funder.agreementRef}` : ""}`);
    return { name: org.name, lines };
  }
  if (contact) {
    const place = [contact.city, contact.country].filter(Boolean).join(", ");
    if (place) lines.push(place);
    lines.push(contact.email);
    if (contact.phone) lines.push(contact.phone);
    return { name: `${contact.firstName} ${contact.lastName}`, lines };
  }
  return { name: "Client à renseigner", lines: [] };
}

function sessionSubject(ev: EventSession | undefined) {
  if (!ev) return [];
  const out = [`${ev.name} (${ev.code})`, `Du ${dateRange(ev.startAt, ev.endAt)} — ${ev.mode === "distanciel" ? "en ligne" : ev.city}`];
  if (ev.isTraining && ev.durationHours) out.push(`Action de formation — durée ${ev.durationHours} h`);
  return out;
}

function legalMentions(settings: Settings, lines: { vatRate: number }[], opts: { quote?: boolean } = {}) {
  const id = legalIdentity(settings);
  const out: string[] = [];
  if (lines.some((l) => l.vatRate === 0)) out.push(VAT_EXEMPTION_TEXT);
  if (!opts.quote) {
    out.push(settings.latePenaltyText);
    if (!/escompte/i.test(settings.latePenaltyText)) out.push(NO_DISCOUNT_TEXT);
  } else {
    out.push("Devis gratuit. Les prix s'entendent en euros. Toute commande implique l'acceptation des conditions générales de vente StartupWeek.");
  }
  if (id.nda) out.push(`Déclaration d'activité enregistrée sous le n° ${id.nda} auprès du préfet de région. Cet enregistrement ne vaut pas agrément de l'État.`);
  return out;
}

const METHOD_TEXT = {
  stripe: "Carte bancaire via le lien de paiement sécurisé (Stripe)",
  virement: "Virement bancaire (Qonto)",
  opco: "Règlement direct par l'OPCO (subrogation)",
  cb_terminal: "Carte bancaire sur place",
  cheque: `Chèque à l'ordre de la société émettrice`,
} as const;

/** Modèle d'impression d'une facture / d'un avoir. */
export function useInvoiceModel(inv: Invoice): DocModel {
  const settings = useSettings();
  const contact = useEntity("contacts", inv.contactId);
  const org = useEntity("organizations", inv.orgId);
  const ev = useEntity("events", inv.eventId);
  const invoices = useCollection("invoices");

  return React.useMemo(() => {
    const draft = inv.status === "brouillon" || !inv.number;
    const credited = inv.creditedInvoiceId ? invoices.find((i) => i.id === inv.creditedInvoiceId) : undefined;
    const deposits = inv.kind === "solde" && inv.applicationId ? invoices.filter((i) => i.applicationId === inv.applicationId && i.kind === "acompte" && i.number && i.status !== "annulee") : [];
    const title = inv.kind === "avoir" ? "Avoir" : inv.kind === "facture" ? "Facture" : labelOf(INVOICE_KINDS, inv.kind);

    const subject = [...sessionSubject(ev)];
    if (credited) subject.unshift(`Avoir se rapportant à la facture n° ${credited.number} du ${date(credited.issuedAt, "d MMMM yyyy")}`);
    if (inv.funder) subject.push(`Financeur : ${inv.funder.name}${inv.funder.subrogation ? " (subrogation de paiement)" : ""}${inv.funder.agreementRef ? ` — accord n° ${inv.funder.agreementRef}` : ""}`);
    if (inv.funder?.subrogation && contact) subject.push(`Stagiaire : ${contact.firstName} ${contact.lastName}`);

    const terms: string[] = [];
    if (inv.kind === "avoir") {
      terms.push(`Montant de ${money(Math.abs(invoiceTotal(inv).ttc), true)} TTC à déduire de la facture ${credited?.number ?? "d'origine"}${credited && credited.paidCents > 0 ? " ou à rembourser" : ""}.`);
    } else {
      terms.push(`Échéance : ${date(inv.dueAt, "d MMMM yyyy")}.`);
      if (inv.kind === "acompte") terms.push(`Acompte de ${settings.depositPercent} % exigible à l'inscription (CGV) ; le solde est dû à J-${settings.balanceDaysBefore} avant le début de la session.`);
      else if (inv.kind === "solde") terms.push(`Solde de ${100 - settings.depositPercent} % exigible à J-${settings.balanceDaysBefore} avant le début de la session (CGV).`);
      else terms.push(`Paiement à ${settings.paymentTermsDays} jours à compter de la date d'émission.`);
      deposits.forEach((d) => terms.push(`Acompte déjà facturé : ${d.number} du ${date(d.issuedAt)} (${money(invoiceTotal(d).ttc, true)} TTC${d.status === "payee" ? ", réglé" : ""}).`));
    }

    return {
      title,
      number: draft ? "— (brouillon)" : inv.number,
      draft,
      meta: [
        { label: "Date d'émission", value: date(inv.issuedAt, "d MMMM yyyy") },
        ...(inv.kind !== "avoir" ? [{ label: "Date d'échéance", value: date(inv.dueAt, "d MMMM yyyy") }] : []),
        ...(ev ? [{ label: "Date de la prestation", value: dateRange(ev.startAt, ev.endAt) }] : []),
      ],
      client: clientParty(org, contact, inv.funder),
      subject,
      lines: inv.lines,
      sign: inv.kind === "avoir" ? -1 : 1,
      paidCents: inv.paidCents,
      showBalance: inv.kind !== "avoir",
      terms,
      payment:
        inv.kind === "avoir"
          ? undefined
          : {
              iban: settings.iban,
              reference: draft ? "communiquée à l'émission" : inv.number,
              link: inv.stripePaymentLink,
              methods: [METHOD_TEXT[inv.preferredMethod]],
            },
      mentions: legalMentions(settings, inv.lines),
      notes: inv.notes,
    } satisfies DocModel;
  }, [inv, invoices, settings, contact, org, ev]);
}

/** Modèle d'impression d'un devis. */
export function useQuoteModel(q: Quote): DocModel {
  const settings = useSettings();
  const contact = useEntity("contacts", q.contactId);
  const org = useEntity("organizations", q.orgId);
  const ev = useEntity("events", q.eventId);
  const deal = useEntity("deals", q.dealId);

  return React.useMemo(() => {
    const subject = [...(deal ? [deal.title] : []), ...sessionSubject(ev)];
    return {
      title: "Devis",
      number: q.number || "— (brouillon)",
      draft: false,
      meta: [
        { label: "Date", value: date(q.issuedAt, "d MMMM yyyy") },
        { label: "Valable jusqu'au", value: date(q.validUntil, "d MMMM yyyy") },
      ],
      client: clientParty(org, contact),
      subject,
      lines: q.lines,
      sign: 1,
      terms: [
        `Proposition valable jusqu'au ${date(q.validUntil, "d MMMM yyyy")}.`,
        `Modalités : acompte de ${settings.depositPercent} % à la commande, solde à J-${settings.balanceDaysBefore} avant le démarrage.`,
        `Montant total : ${money(quoteTotal(q).ht, true)} HT soit ${money(quoteTotal(q).ttc, true)} TTC.`,
      ],
      payment: { iban: settings.iban, reference: q.number || displayNumber(q), methods: ["Virement bancaire (Qonto) ou carte bancaire (Stripe)", "Prise en charge OPCO possible (subrogation)"] },
      mentions: legalMentions(settings, q.lines, { quote: true }),
      notes: q.notes,
      signatureBox: true,
    } satisfies DocModel;
  }, [q, settings, contact, org, ev, deal]);
}

export function InvoiceDocument({ invoice, className }: { invoice: Invoice; className?: string }) {
  const settings = useSettings();
  const model = useInvoiceModel(invoice);
  return <DocumentSheet model={model} settings={settings} className={className} />;
}

export function QuoteDocument({ quote, className }: { quote: Quote; className?: string }) {
  const settings = useSettings();
  const model = useQuoteModel(quote);
  return <DocumentSheet model={model} settings={settings} className={className} />;
}
