"use client";

/**
 * Pages imprimables facture / devis. Rendues sous src/app/print/layout.tsx (RequireSession + PrintShell :
 * thème clair forcé, barre « Imprimer / PDF », @page A4) ; la feuille est le PrintPage partagé.
 */
import * as React from "react";
import { FileX2, Lock } from "lucide-react";
import { useEntity, useSession } from "@/lib/hooks";
import { EmptyState, LinkButton } from "@/components/ui";
import { PrintPage } from "@/features/documents/components/print-kit";
import { INVOICE_KINDS, labelOf } from "@/lib/domain/constants";
import { displayNumber } from "../../lib";
import { InvoiceDocument, QuoteDocument } from "./billing-documents";

/** Titre de l'onglet = nom de fichier proposé par « Enregistrer en PDF ». */
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

function Restricted() {
  return (
    <div className="mx-auto max-w-lg p-8">
      <EmptyState icon={Lock} title="Accès restreint" description="Ce document est réservé aux profils ayant accès à la facturation." action={<LinkButton href="/" size="sm" variant="secondary">Retour au tableau de bord</LinkButton>} />
    </div>
  );
}

function NotFound({ what, backHref }: { what: string; backHref: string }) {
  return (
    <div className="mx-auto max-w-lg p-8">
      <EmptyState icon={FileX2} title={`${what} introuvable`} description="Le document a peut-être été supprimé ou le lien est incorrect." action={<LinkButton href={backHref} size="sm" variant="secondary">Retour à la facturation</LinkButton>} />
    </div>
  );
}

export function InvoicePrintView({ id }: { id: string }) {
  const inv = useEntity("invoices", id);
  const { can } = useSession();
  const label = inv ? `${inv.kind === "avoir" ? "Avoir" : labelOf(INVOICE_KINDS, inv.kind)} ${displayNumber(inv)}` : undefined;
  useDocumentTitle(label ? `${label} — StartupWeek` : undefined);
  if (!can("facturation")) return <Restricted />;
  if (!inv) return <NotFound what="Facture" backHref="/facturation" />;
  return (
    <PrintPage>
      <InvoiceDocument invoice={inv} />
    </PrintPage>
  );
}

export function QuotePrintView({ id }: { id: string }) {
  const q = useEntity("quotes", id);
  const { can } = useSession();
  const label = q ? `Devis ${displayNumber(q)}` : undefined;
  useDocumentTitle(label ? `${label} — StartupWeek` : undefined);
  if (!can("facturation")) return <Restricted />;
  if (!q) return <NotFound what="Devis" backHref="/facturation?onglet=devis" />;
  return (
    <PrintPage>
      <QuoteDocument quote={q} />
    </PrintPage>
  );
}
