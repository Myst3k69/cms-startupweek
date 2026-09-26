"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { BellRing, Boxes, CreditCard, FilePlus2, FileSignature, Landmark, Receipt, ShieldCheck } from "lucide-react";
import { useCollection, useNow, useSession, useSettings } from "@/lib/hooks";
import { LinkButton, PageHeader, Tabs } from "@/components/ui";
import { DAY, isCollectible } from "../lib";
import { BillingOverview } from "./overview";
import { InvoicesTab, isInvoiceStatusFilter, type InvoiceStatusFilter } from "./invoices-tab";
import { QuotesTab } from "./quotes-tab";
import { PaymentsTab } from "./payments-tab";
import { ReconciliationTab } from "./reconciliation-tab";
import { RemindersTab } from "./reminders-tab";
import { CatalogTab } from "./catalog-tab";
import { useBillingLookups } from "./shared";

const TABS = ["factures", "devis", "paiements", "rapprochement", "relances", "catalogue"] as const;
type Tab = (typeof TABS)[number];
const isTab = (v: string | null): v is Tab => !!v && (TABS as readonly string[]).includes(v);

/** Met à jour la query string sans aller-retour serveur (intégré au routeur Next : useSearchParams suit). */
function setQuery(current: URLSearchParams, patch: Record<string, string | null>, push = false) {
  const params = new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) params.delete(k);
    else params.set(k, v);
  }
  const qs = params.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
  if (push) window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

export function BillingPage() {
  const searchParams = useSearchParams();
  const rawStatus = searchParams.get("statut");
  const status: InvoiceStatusFilter = isInvoiceStatusFilter(rawStatus) ? rawStatus : "tous";
  const rawTab = searchParams.get("onglet");
  const tab: Tab = isTab(rawTab) ? rawTab : "factures";

  const invoices = useCollection("invoices");
  const quotes = useCollection("quotes");
  const payments = useCollection("payments");
  const txs = useCollection("bankTransactions");
  const offers = useCollection("offers");
  const settings = useSettings();
  const lookups = useBillingLookups();
  const now = useNow();
  const { canEdit } = useSession();

  const counts = React.useMemo(
    () => ({
      factures: invoices.filter((i) => !(i.status === "annulee" && !i.number)).length,
      devis: quotes.length,
      paiements: payments.length,
      rapprochement: txs.filter((t) => t.status === "a_rapprocher").length,
      relances: invoices.filter((i) => isCollectible(i) && new Date(i.dueAt).getTime() - now < 7 * DAY).length,
      catalogue: offers.filter((o) => o.active).length,
    }),
    [invoices, quotes, payments, txs, offers, now],
  );

  const onTab = (t: Tab) => setQuery(searchParams, { onglet: t === "factures" ? null : t, statut: t === "factures" ? searchParams.get("statut") : null }, true);
  const onStatus = (s: InvoiceStatusFilter) => setQuery(searchParams, { statut: s === "tous" ? null : s });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Qualité & finance"
        title="Facturation & paiements"
        description={
          <>
            {settings.legalName} · CGV : acompte {settings.depositPercent} % à l'inscription, solde à J-{settings.balanceDaysBefore} · Stripe {settings.stripeConnected ? "connecté" : "non connecté"} · Qonto {settings.qontoConnected ? "connecté" : "non connecté"}
            {settings.vatExempt ? " · Exonération TVA formation active" : " · TVA 20 %"}
          </>
        }
        actions={
          canEdit("facturation") ? (
            <>
              <LinkButton href="/facturation/devis/nouveau" variant="secondary" size="sm">
                <FileSignature aria-hidden="true" /> Nouveau devis
              </LinkButton>
              <LinkButton href="/facturation/factures/nouvelle" size="sm">
                <FilePlus2 aria-hidden="true" /> Nouvelle facture
              </LinkButton>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden="true" /> Consultation seule
            </span>
          )
        }
        className="mb-0"
      />

      <BillingOverview invoices={invoices} payments={payments} offers={offers} lookups={lookups} now={now} />

      <section aria-label="Détail de la facturation" className="space-y-4">
        <Tabs<Tab>
          value={tab}
          onChange={onTab}
          tabs={[
            { value: "factures", label: "Factures", count: counts.factures, icon: Receipt },
            { value: "devis", label: "Devis", count: counts.devis, icon: FileSignature },
            { value: "paiements", label: "Paiements", count: counts.paiements, icon: CreditCard },
            { value: "rapprochement", label: "Rapprochement", count: counts.rapprochement, icon: Landmark },
            { value: "relances", label: "Relances", count: counts.relances, icon: BellRing },
            { value: "catalogue", label: "Catalogue", count: counts.catalogue, icon: Boxes },
          ]}
        />
        {tab === "factures" ? <InvoicesTab status={status} onStatusChange={onStatus} /> : null}
        {tab === "devis" ? <QuotesTab /> : null}
        {tab === "paiements" ? <PaymentsTab /> : null}
        {tab === "rapprochement" ? <ReconciliationTab /> : null}
        {tab === "relances" ? <RemindersTab /> : null}
        {tab === "catalogue" ? <CatalogTab /> : null}
      </section>
    </div>
  );
}
