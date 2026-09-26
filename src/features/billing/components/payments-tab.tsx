"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import { useCollection, useLookup, useNow } from "@/lib/hooks";
import { PAYMENT_METHODS, PAYMENT_STATUSES, labelOf } from "@/lib/domain/constants";
import type { Payment } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { DataTable, StatusBadge, type Column, type FilterDef } from "@/components/ui";
import { accountingAmount, DAY, displayNumber, partyName } from "../lib";
import { METHOD_SHORT, PartyCell, useBillingLookups } from "./shared";

export function PaymentsTab() {
  const payments = useCollection("payments");
  const invoices = useLookup("invoices");
  const lk = useBillingLookups();
  const now = useNow();
  const router = useRouter();

  const rows = React.useMemo(() => [...payments].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)), [payments]);

  const summary = React.useMemo(() => {
    const from = now - 30 * DAY;
    const recent = payments.filter((p) => p.status === "reussi" && new Date(p.receivedAt).getTime() >= from);
    const gross = recent.reduce((s, p) => s + p.amountCents, 0);
    const fees = recent.reduce((s, p) => s + (p.feeCents ?? 0), 0);
    return { count: recent.length, gross, fees, net: gross - fees, pending: payments.filter((p) => p.status === "en_attente").length, failed: payments.filter((p) => p.status === "echoue").length };
  }, [payments, now]);

  const columns = React.useMemo<Column<Payment>[]>(
    () => [
      { key: "date", header: "Date", render: (p) => <span className="tabular whitespace-nowrap text-xs">{date(p.receivedAt)}</span>, sort: (p) => p.receivedAt, csv: (p) => date(p.receivedAt, "dd/MM/yyyy") },
      {
        key: "invoice",
        header: "Facture",
        render: (p) => {
          const inv = invoices.get(p.invoiceId);
          return inv ? (
            <Link href={`/facturation/factures/${inv.id}`} onClick={(e) => e.stopPropagation()} className="whitespace-nowrap font-mono text-xs font-medium text-accent-text hover:underline">
              {displayNumber(inv)}
            </Link>
          ) : (
            <span className="text-faint">—</span>
          );
        },
        sort: (p) => invoices.get(p.invoiceId)?.number ?? "",
      },
      {
        key: "client",
        header: "Client",
        render: (p) => {
          const inv = invoices.get(p.invoiceId);
          return inv ? <PartyCell doc={inv} compact className="max-w-44" /> : <span className="text-faint">—</span>;
        },
        sort: (p) => {
          const inv = invoices.get(p.invoiceId);
          return inv ? partyName(inv, lk) : "";
        },
        hideBelow: "md",
      },
      { key: "amount", header: "Montant", align: "right", render: (p) => <span className="whitespace-nowrap font-medium">{money(p.amountCents, true)}</span>, sort: (p) => p.amountCents, csv: (p) => accountingAmount(p.amountCents) },
      { key: "method", header: "Moyen", render: (p) => <span className="whitespace-nowrap text-xs" title={labelOf(PAYMENT_METHODS, p.method)}>{METHOD_SHORT[p.method]}</span>, sort: (p) => METHOD_SHORT[p.method], csv: (p) => labelOf(PAYMENT_METHODS, p.method) },
      {
        key: "ref",
        header: "Référence",
        render: (p) => (
          <span className="inline-flex max-w-44 items-center gap-1 truncate font-mono text-[11px] text-muted-foreground" title={p.reference}>
            {p.bankTransactionId ? <Landmark className="size-3 shrink-0 text-accent-text" aria-label="Rapproché avec une transaction Qonto" /> : null}
            <span className="truncate">{p.reference || "—"}</span>
          </span>
        ),
        sort: (p) => p.reference,
        hideBelow: "lg",
      },
      { key: "fee", header: "Frais", align: "right", render: (p) => <span className="whitespace-nowrap text-xs text-muted-foreground">{p.feeCents ? money(p.feeCents, true) : "—"}</span>, sort: (p) => p.feeCents ?? 0, csv: (p) => accountingAmount(p.feeCents ?? 0), hideBelow: "sm" },
      { key: "net", header: "Net", align: "right", render: (p) => <span className="whitespace-nowrap text-xs">{money(p.amountCents - (p.feeCents ?? 0), true)}</span>, sort: (p) => p.amountCents - (p.feeCents ?? 0), csv: (p) => accountingAmount(p.amountCents - (p.feeCents ?? 0)), hideBelow: "xl" },
      { key: "status", header: "Statut", render: (p) => <StatusBadge options={PAYMENT_STATUSES} value={p.status} />, sort: (p) => p.status, csv: (p) => labelOf(PAYMENT_STATUSES, p.status) },
    ],
    [invoices, lk],
  );

  const filters = React.useMemo<FilterDef<Payment>[]>(
    () => [
      { key: "method", label: "Moyen", options: PAYMENT_METHODS, predicate: (p, v) => p.method === v },
      { key: "status", label: "Statut", options: PAYMENT_STATUSES, predicate: (p, v) => p.status === v },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:flex sm:flex-wrap">
        <div>
          <dt className="text-xs text-muted-foreground">Encaissé brut (30 j)</dt>
          <dd className="font-medium">
            {money(summary.gross)} · {summary.count} paiement{summary.count > 1 ? "s" : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Frais (30 j)</dt>
          <dd className="font-medium">{money(summary.fees, true)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Net encaissé (30 j)</dt>
          <dd className="font-medium">{money(summary.net)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">En attente · échoués</dt>
          <dd className={summary.failed ? "font-medium text-danger-text" : "font-medium"}>
            {summary.pending} · {summary.failed}
          </dd>
        </div>
      </dl>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(p) => p.id}
        searchable={(p) => {
          const inv = invoices.get(p.invoiceId);
          return `${p.reference} ${inv?.number ?? ""} ${inv ? partyName(inv, lk) : ""}`;
        }}
        searchPlaceholder="Référence, facture, client…"
        filters={filters}
        onRowClick={(p) => router.push(`/facturation/factures/${p.invoiceId}`)}
        exportName={`paiements-startupweek-${date(new Date(now).toISOString(), "yyyy-MM-dd")}`}
        emptyTitle="Aucun paiement"
        emptyDescription="Les paiements Stripe arrivent par webhook ; les virements Qonto via le rapprochement bancaire."
      />
    </div>
  );
}
