"use client";

/**
 * Facture / devis consultable par le client via un lien personnel (/documents/<jeton>),
 * sans compte : même rendu que l'impression du back-office, bouton « Imprimer / PDF ».
 */
import * as React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui";
import type { Contact, Deal, EventSession, Invoice, Organization, Quote, Settings } from "@/lib/domain/types";
import { buildInvoiceModel, buildQuoteModel } from "../document-models";
import { DocumentSheet } from "./print/document-sheet";

export type PublicDocumentData =
  | { kind: "invoice"; invoice: Invoice; invoices: Invoice[]; settings: Settings; contact?: Contact; org?: Organization; ev?: EventSession }
  | { kind: "quote"; quote: Quote; settings: Settings; contact?: Contact; org?: Organization; ev?: EventSession; deal?: Deal };

export function PublicDocument({ data }: { data: PublicDocumentData }) {
  const model = React.useMemo(
    () =>
      data.kind === "invoice"
        ? buildInvoiceModel(data.invoice, { settings: data.settings, contact: data.contact, org: data.org, ev: data.ev, invoices: data.invoices })
        : buildQuoteModel(data.quote, { settings: data.settings, contact: data.contact, org: data.org, ev: data.ev, deal: data.deal }),
    [data],
  );

  React.useEffect(() => {
    const html = document.documentElement;
    const prev = html.dataset.theme;
    html.dataset.theme = "light";
    document.title = `${model.title} ${model.number} — ${data.settings.brand || "StartupWeek"}`;
    return () => {
      if (prev) html.dataset.theme = prev;
    };
  }, [model, data.settings.brand]);

  return (
    <div className="min-h-dvh bg-surface-3 text-foreground print:bg-transparent">
      <style>{`
        @page { size: A4; margin: 12mm 12mm 14mm; }
        @media print { html, body { background: var(--surface) !important; } a { color: inherit !important; text-decoration: none !important; } }
      `}</style>
      <div className="no-print sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-3 px-4 py-2.5">
          <p className="min-w-0 truncate text-sm text-muted-foreground">
            {model.title} {model.number} · {data.settings.brand || "StartupWeek"}
          </p>
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> Imprimer / PDF
          </Button>
        </div>
      </div>
      <main className="px-2 py-6 sm:px-6 print:p-0">
        <div className="mx-auto max-w-[210mm] overflow-x-auto rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-10 print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <DocumentSheet model={model} settings={data.settings} />
        </div>
        {data.kind === "invoice" && data.invoice.stripePaymentLink && data.invoice.status !== "payee" && data.invoice.kind !== "avoir" ? (
          <p className="no-print mx-auto mt-4 max-w-[210mm] text-center text-sm">
            <a href={data.invoice.stripePaymentLink} className="font-medium text-accent-text underline-offset-2 hover:underline">
              Régler en ligne par carte bancaire →
            </a>
          </p>
        ) : null}
      </main>
    </div>
  );
}
