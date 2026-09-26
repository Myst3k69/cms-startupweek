"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { useCollection, useLookup, useNow, useSession } from "@/lib/hooks";
import { QUOTE_STATUSES, labelOf } from "@/lib/domain/constants";
import type { Quote, QuoteStatus } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { DataTable, LinkButton, type Column, type FilterDef } from "@/components/ui";
import { accountingAmount, DAY, displayNumber, effectiveQuoteStatus, partyName, quoteTotal } from "../lib";
import { PartyCell, QuoteStatusBadge, useBillingLookups } from "./shared";

export function QuotesTab() {
  const quotes = useCollection("quotes");
  const deals = useLookup("deals");
  const invoices = useLookup("invoices");
  const lk = useBillingLookups();
  const now = useNow();
  const router = useRouter();
  const { canEdit } = useSession();

  const rows = React.useMemo(() => [...quotes].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)), [quotes]);

  const summary = React.useMemo(() => {
    const open = quotes.filter((q) => effectiveQuoteStatus(q, now) === "envoye");
    const accepted = quotes.filter((q) => q.status === "accepte");
    const decided = quotes.filter((q) => q.status === "accepte" || q.status === "refuse" || effectiveQuoteStatus(q, now) === "expire");
    return {
      openCount: open.length,
      openHt: open.reduce((s, q) => s + quoteTotal(q).ht, 0),
      acceptedHt: accepted.reduce((s, q) => s + quoteTotal(q).ht, 0),
      rate: decided.length ? Math.round((accepted.length / decided.length) * 100) : null,
      toInvoice: accepted.filter((q) => !q.invoiceId).length,
    };
  }, [quotes, now]);

  const columns = React.useMemo<Column<Quote>[]>(
    () => [
      { key: "number", header: "Numéro", render: (q) => <span className="font-mono text-xs font-medium">{displayNumber(q)}</span>, sort: (q) => q.number },
      { key: "client", header: "Client", render: (q) => <PartyCell doc={q} />, sort: (q) => partyName(q, lk), className: "max-w-56" },
      {
        key: "deal",
        header: "Opportunité",
        render: (q) => {
          const d = q.dealId ? deals.get(q.dealId) : undefined;
          return d ? <span className="line-clamp-2 text-xs text-muted-foreground">{d.title}</span> : <span className="text-faint">—</span>;
        },
        csv: (q) => (q.dealId ? deals.get(q.dealId)?.title ?? "" : ""),
        hideBelow: "lg",
      },
      {
        key: "amount",
        header: "Montant HT",
        align: "right",
        render: (q) => (
          <span className="whitespace-nowrap">
            <span className="font-medium">{money(quoteTotal(q).ht, true)}</span>
            <span className="block text-xs text-muted-foreground">{money(quoteTotal(q).ttc)} TTC</span>
          </span>
        ),
        sort: (q) => quoteTotal(q).ht,
        csv: (q) => accountingAmount(quoteTotal(q).ht),
      },
      { key: "issued", header: "Émis le", render: (q) => <span className="tabular text-xs">{date(q.issuedAt)}</span>, sort: (q) => q.issuedAt, csv: (q) => date(q.issuedAt, "dd/MM/yyyy"), hideBelow: "md" },
      {
        key: "valid",
        header: "Validité",
        render: (q) => {
          const days = Math.floor((new Date(q.validUntil).getTime() - now) / DAY);
          const pending = q.status === "brouillon" || q.status === "envoye";
          return (
            <span className="whitespace-nowrap text-xs">
              <span className="tabular">{date(q.validUntil)}</span>
              {pending ? <span className={days < 0 ? "block text-danger-text" : days <= 7 ? "block text-warning-text" : "block text-muted-foreground"}>{days < 0 ? `expiré depuis ${-days} j` : `encore ${days} j`}</span> : null}
            </span>
          );
        },
        sort: (q) => q.validUntil,
        csv: (q) => date(q.validUntil, "dd/MM/yyyy"),
        hideBelow: "sm",
      },
      { key: "status", header: "Statut", render: (q) => <QuoteStatusBadge quote={q} now={now} />, sort: (q) => effectiveQuoteStatus(q, now), csv: (q) => labelOf(QUOTE_STATUSES, effectiveQuoteStatus(q, now)) },
      {
        key: "invoice",
        header: "Facture",
        render: (q) => {
          const inv = q.invoiceId ? invoices.get(q.invoiceId) : undefined;
          return inv ? (
            <Link href={`/facturation/factures/${inv.id}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs text-accent-text hover:underline">
              {displayNumber(inv)}
            </Link>
          ) : (
            <span className="text-faint">—</span>
          );
        },
        csv: (q) => (q.invoiceId ? invoices.get(q.invoiceId)?.number ?? "" : ""),
        hideBelow: "md",
      },
    ],
    [lk, deals, invoices, now],
  );

  const filters = React.useMemo<FilterDef<Quote>[]>(
    () => [{ key: "status", label: "Statut", options: QUOTE_STATUSES, predicate: (q, v) => effectiveQuoteStatus(q, now) === (v as QuoteStatus) }],
    [now],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:flex sm:flex-wrap">
          <div>
            <dt className="text-xs text-muted-foreground">En attente de réponse</dt>
            <dd className="font-medium">
              {summary.openCount} · {money(summary.openHt)} HT
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Signés</dt>
            <dd className="font-medium">{money(summary.acceptedHt)} HT</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Taux de signature</dt>
            <dd className="font-medium">{summary.rate === null ? "—" : `${summary.rate} %`}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Acceptés à facturer</dt>
            <dd className={summary.toInvoice ? "font-medium text-warning-text" : "font-medium"}>{summary.toInvoice}</dd>
          </div>
        </dl>
        {canEdit("facturation") ? (
          <LinkButton href="/facturation/devis/nouveau" size="sm">
            <FilePlus2 aria-hidden="true" /> Nouveau devis
          </LinkButton>
        ) : null}
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(q) => q.id}
        searchable={(q) => `${q.number} ${partyName(q, lk)} ${q.dealId ? deals.get(q.dealId)?.title ?? "" : ""}`}
        searchPlaceholder="Numéro, client, opportunité…"
        filters={filters}
        onRowClick={(q) => router.push(`/facturation/devis/${q.id}`)}
        exportName={`devis-startupweek-${date(new Date(now).toISOString(), "yyyy-MM-dd")}`}
        emptyTitle="Aucun devis"
        emptyDescription="Les devis B2B (écoles, entreprises, accompagnements) se préparent ici puis se convertissent en facture une fois acceptés."
      />
    </div>
  );
}
