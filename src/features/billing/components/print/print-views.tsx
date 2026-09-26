"use client";

import * as React from "react";
import { ArrowLeft, FileX2, Lock, Printer } from "lucide-react";
import { useEntity, useHydrated, useSession } from "@/lib/hooks";
import { Button, EmptyState, LinkButton, Skeleton } from "@/components/ui";
import { displayNumber } from "../../lib";
import { InvoiceDocument, QuoteDocument } from "./billing-documents";
import { INVOICE_KINDS, labelOf } from "@/lib/domain/constants";

/** Un document imprimé est toujours « papier » : thème clair forcé tant que la page est ouverte. */
function useForceLightTheme() {
  React.useEffect(() => {
    const el = document.documentElement;
    const prev = el.dataset.theme;
    el.dataset.theme = "light";
    return () => {
      if (prev) el.dataset.theme = prev;
    };
  }, []);
}

function useDocumentTitle(title: string | undefined) {
  React.useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

function PrintFrame({ backHref, label, children }: { backHref: string; label: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-2 print:bg-transparent">
      <style>{"@page { size: A4; margin: 12mm; }"}</style>
      <div className="no-print sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[210mm] items-center justify-between gap-2 px-4 py-2">
          <LinkButton href={backHref} variant="ghost" size="sm">
            <ArrowLeft aria-hidden="true" /> Retour
          </LinkButton>
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">{label}</span>
          <Button size="sm" onClick={() => window.print()}>
            <Printer aria-hidden="true" /> Imprimer / PDF
          </Button>
        </div>
      </div>
      <main className="mx-auto w-full max-w-[210mm] bg-surface px-4 py-6 shadow-md sm:my-6 sm:rounded-sm sm:p-[14mm] print:m-0 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        {children}
      </main>
    </div>
  );
}

function PrintGate({ children, next }: { children: React.ReactNode; next: string }) {
  const hydrated = useHydrated();
  const { can, user } = useSession();
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-[210mm] space-y-4 p-8" aria-busy="true" aria-label="Chargement du document">
        <Skeleton className="h-16" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!user || !can("facturation")) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <EmptyState
          icon={Lock}
          title="Accès restreint"
          description="Ce document est réservé aux profils ayant accès à la facturation."
          action={
            <LinkButton href={`/connexion?next=${encodeURIComponent(next)}`} size="sm">
              Se connecter
            </LinkButton>
          }
        />
      </div>
    );
  }
  return <>{children}</>;
}

function NotFound({ what, backHref }: { what: string; backHref: string }) {
  return (
    <div className="mx-auto max-w-lg p-8">
      <EmptyState icon={FileX2} title={`${what} introuvable`} description="Le document a peut-être été supprimé ou le lien est incorrect." action={<LinkButton href={backHref} size="sm" variant="secondary">Retour à la facturation</LinkButton>} />
    </div>
  );
}

function InvoicePrint({ id }: { id: string }) {
  const inv = useEntity("invoices", id);
  const label = inv ? `${inv.kind === "avoir" ? "Avoir" : labelOf(INVOICE_KINDS, inv.kind)} ${displayNumber(inv)}` : undefined;
  useDocumentTitle(label ? `${label} — StartupWeek` : undefined);
  if (!inv) return <NotFound what="Facture" backHref="/facturation" />;
  return (
    <PrintFrame backHref={`/facturation/factures/${inv.id}`} label={label ?? ""}>
      <InvoiceDocument invoice={inv} />
    </PrintFrame>
  );
}

function QuotePrint({ id }: { id: string }) {
  const q = useEntity("quotes", id);
  const label = q ? `Devis ${displayNumber(q)}` : undefined;
  useDocumentTitle(label ? `${label} — StartupWeek` : undefined);
  if (!q) return <NotFound what="Devis" backHref="/facturation?onglet=devis" />;
  return (
    <PrintFrame backHref={`/facturation/devis/${q.id}`} label={label ?? ""}>
      <QuoteDocument quote={q} />
    </PrintFrame>
  );
}

export function InvoicePrintView({ id }: { id: string }) {
  useForceLightTheme();
  return (
    <PrintGate next={`/print/facture/${id}`}>
      <InvoicePrint id={id} />
    </PrintGate>
  );
}

export function QuotePrintView({ id }: { id: string }) {
  useForceLightTheme();
  return (
    <PrintGate next={`/print/devis/${id}`}>
      <QuotePrint id={id} />
    </PrintGate>
  );
}
