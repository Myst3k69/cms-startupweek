"use client";

import * as React from "react";
import type { Invoice, Quote } from "@/lib/domain/types";
import { useCollection, useEntity, useSettings } from "@/lib/hooks";
import { buildInvoiceModel, buildQuoteModel } from "../../document-models";
import { DocumentSheet, type DocModel } from "./document-sheet";

/** Modèle d'impression d'une facture / d'un avoir. */
export function useInvoiceModel(inv: Invoice): DocModel {
  const settings = useSettings();
  const contact = useEntity("contacts", inv.contactId);
  const org = useEntity("organizations", inv.orgId);
  const ev = useEntity("events", inv.eventId);
  const invoices = useCollection("invoices");
  return React.useMemo(() => buildInvoiceModel(inv, { settings, contact, org, ev, invoices }), [inv, invoices, settings, contact, org, ev]);
}

/** Modèle d'impression d'un devis. */
export function useQuoteModel(q: Quote): DocModel {
  const settings = useSettings();
  const contact = useEntity("contacts", q.contactId);
  const org = useEntity("organizations", q.orgId);
  const ev = useEntity("events", q.eventId);
  const deal = useEntity("deals", q.dealId);
  return React.useMemo(() => buildQuoteModel(q, { settings, contact, org, ev, deal }), [q, settings, contact, org, ev, deal]);
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
