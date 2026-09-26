"use client";

import * as React from "react";
import Link from "next/link";
import { Calculator, Euro, PiggyBank, Wallet } from "lucide-react";
import { BarList, seriesColor } from "@/components/charts";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataTable, FormField, Input, StatCard, StatusBadge, useToast, type Column } from "@/components/ui";
import { ContactLink, OrgLink } from "@/components/shared/entity-links";
import { INVOICE_KINDS, INVOICE_STATUSES, labelOf } from "@/lib/domain/constants";
import { effectiveInvoiceStatus, invoiceBalance, invoiceTotal } from "@/lib/domain/selectors";
import type { EventSession, Invoice } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { useActions, useNow } from "@/lib/hooks";
import { pct } from "@/lib/utils";
import type { SessionData } from "./use-session-data";

export function FinancesTab({ ev, data, canEdit }: { ev: EventSession; data: SessionData; canEdit: boolean }) {
  const now = useNow();
  const { update } = useActions();
  const toast = useToast();
  const [budget, setBudget] = React.useState(ev.budgetCents !== undefined ? String(ev.budgetCents / 100) : "");
  const { expected, collected, remaining } = data.finance;
  const costs = ev.budgetCents ?? 0;
  const margin = expected - costs;
  const breakEven = ev.priceCents > 0 && costs > 0 ? Math.ceil(costs / ev.priceCents) : undefined;
  const potential = data.pipeline.filter((a) => a.status === "acceptee").length * ev.priceCents;

  const columns = React.useMemo<Column<Invoice>[]>(
    () => [
      {
        key: "number",
        header: "N°",
        render: (i) => (
          <Link href={`/facturation/factures/${i.id}`} className="font-mono text-xs font-medium text-foreground hover:text-accent-text" onClick={(e) => e.stopPropagation()}>
            {i.number}
          </Link>
        ),
        sort: (i) => i.number,
      },
      { key: "kind", header: "Type", render: (i) => <span className="text-xs text-muted-foreground">{labelOf(INVOICE_KINDS, i.kind)}</span>, sort: (i) => i.kind, csv: (i) => labelOf(INVOICE_KINDS, i.kind) },
      { key: "client", header: "Client", render: (i) => (i.contactId ? <ContactLink id={i.contactId} /> : <OrgLink id={i.orgId} />), csv: (i) => i.contactId ?? i.orgId ?? "" },
      {
        key: "status",
        header: "Statut",
        render: (i) => <StatusBadge options={INVOICE_STATUSES} value={effectiveInvoiceStatus(i, now)} />,
        sort: (i) => effectiveInvoiceStatus(i, now),
        csv: (i) => labelOf(INVOICE_STATUSES, effectiveInvoiceStatus(i, now)),
      },
      { key: "total", header: "Total TTC", render: (i) => money(invoiceTotal(i).ttc), sort: (i) => invoiceTotal(i).ttc, csv: (i) => (invoiceTotal(i).ttc / 100).toFixed(2), align: "right" },
      { key: "paid", header: "Réglé", render: (i) => money(i.paidCents), sort: (i) => i.paidCents, csv: (i) => (i.paidCents / 100).toFixed(2), align: "right", hideBelow: "md" },
      {
        key: "balance",
        header: "Reste",
        render: (i) => {
          const b = invoiceBalance(i);
          return <span className={b > 0 ? "font-medium text-foreground" : "text-muted-foreground"}>{money(Math.max(0, b))}</span>;
        },
        sort: (i) => invoiceBalance(i),
        csv: (i) => (invoiceBalance(i) / 100).toFixed(2),
        align: "right",
      },
      { key: "due", header: "Échéance", render: (i) => <span className="text-xs text-muted-foreground">{date(i.dueAt)}</span>, sort: (i) => i.dueAt, csv: (i) => date(i.dueAt, "yyyy-MM-dd"), hideBelow: "sm" },
    ],
    [now],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="CA attendu" value={money(expected)} icon={Euro} hint={potential ? `+ ${money(potential)} potentiels (acceptées)` : `${data.enrolled.length} inscrit${data.enrolled.length > 1 ? "s" : ""}`} />
        <StatCard label="Encaissé" value={money(collected)} icon={Wallet} hint={`${pct(collected, expected)} % du CA attendu`} />
        <StatCard label="Restant à encaisser" value={money(remaining)} icon={PiggyBank} hint="Acomptes et soldes ouverts" />
        <StatCard
          label="Marge estimée"
          value={costs ? money(margin) : "—"}
          icon={Calculator}
          hint={costs ? `${expected ? Math.round((margin / expected) * 100) : 0} % du CA · coûts ${money(costs)}` : "Renseignez les coûts prévus"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Budget de la session</CardTitle>
              <CardDescription>Villa, repas, intervenants, déplacements.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = Number(budget.replace(",", "."));
                if (Number.isNaN(v) || v < 0) return;
                update("events", ev.id, { budgetCents: Math.round(v * 100) }, { log: `Coûts prévus : ${money(Math.round(v * 100))}` });
                toast({ title: "Coûts prévus enregistrés", description: `Marge estimée : ${money(expected - Math.round(v * 100))}` });
              }}
            >
              <FormField label="Coûts prévus (€)" htmlFor={`budget-${ev.id}`} className="flex-1">
                <Input id={`budget-${ev.id}`} type="number" min={0} step={100} value={budget} onChange={(e) => setBudget(e.target.value)} disabled={!canEdit} />
              </FormField>
              {canEdit ? (
                <Button type="submit" variant="secondary">
                  Enregistrer
                </Button>
              ) : null}
            </form>
            <BarList
              items={[
                { key: "ca", label: "CA attendu", value: expected, color: seriesColor(0) },
                { key: "enc", label: "Encaissé", value: collected, color: seriesColor(2) },
                { key: "cout", label: "Coûts prévus", value: costs, color: seriesColor(1) },
              ]}
              format={(v) => money(v)}
            />
            <dl className="space-y-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Prix unitaire TTC</dt>
                <dd className="tabular text-foreground">{money(ev.priceCents)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Point mort</dt>
                <dd className="tabular text-foreground">{breakEven ? `${breakEven} participant${breakEven > 1 ? "s" : ""}` : "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">CA à pleine capacité</dt>
                <dd className="tabular text-foreground">{money(ev.priceCents * ev.capacity)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Factures de la session</CardTitle>
                <CardDescription>Acomptes, soldes et factures B2B liés à {ev.code}.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                rows={data.sessionInvoices}
                columns={columns}
                rowKey={(i) => i.id}
                exportName={`factures-${ev.code}`}
                initialSort={{ key: "number", dir: "desc" }}
                pageSize={10}
                dense
                emptyTitle="Aucune facture"
                emptyDescription="Les factures d'acompte sont créées automatiquement à l'acceptation des candidatures."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
