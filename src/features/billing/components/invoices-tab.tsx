"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BellRing, BookOpenCheck, CheckCircle2, FilePlus2, TriangleAlert } from "lucide-react";
import { useCollection, useNow, useSession, useSettings } from "@/lib/hooks";
import { effectiveInvoiceStatus, invoiceBalance, invoiceTotal } from "@/lib/domain/selectors";
import { INVOICE_KINDS, INVOICE_STATUSES, PAYMENT_METHODS, labelOf } from "@/lib/domain/constants";
import type { Invoice, InvoiceStatus } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { Button, DataTable, LinkButton, Segmented, useToast, type Column, type FilterDef } from "@/components/ui";
import { SessionLink } from "@/components/shared/entity-links";
import { accountingAmount, displayNumber, downloadCsv, isCollectible, isNumbered, numberingAudit, partyName } from "../lib";
import { runReminderStep } from "../actions";
import { DueHint, InvoiceStatusBadge, PartyCell, useBillingLookups } from "./shared";

export type InvoiceStatusFilter = InvoiceStatus | "tous";

const STATUS_ORDER: InvoiceStatus[] = ["brouillon", "emise", "partielle", "en_retard", "payee", "annulee"];

export function isInvoiceStatusFilter(v: string | null | undefined): v is InvoiceStatusFilter {
  return v === "tous" || STATUS_ORDER.includes(v as InvoiceStatus);
}

export function InvoicesTab({ status, onStatusChange }: { status: InvoiceStatusFilter; onStatusChange: (s: InvoiceStatusFilter) => void }) {
  const invoices = useCollection("invoices");
  const events = useCollection("events");
  const settings = useSettings();
  const lk = useBillingLookups();
  const now = useNow();
  const router = useRouter();
  const toast = useToast();
  const { canEdit } = useSession();
  const editable = canEdit("facturation");

  const all = React.useMemo(
    () =>
      invoices
        // Brouillons annulés : sans numéro ni valeur comptable, masqués hors filtre « Annulée ».
        .filter((i) => !(i.status === "annulee" && !i.number))
        .sort((a, b) => (a.status === "brouillon" ? -1 : 0) - (b.status === "brouillon" ? -1 : 0) || b.issuedAt.localeCompare(a.issuedAt) || b.number.localeCompare(a.number)),
    [invoices],
  );

  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of invoices) {
      const s = effectiveInvoiceStatus(i, now);
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [invoices, now]);

  const rows = React.useMemo(
    () => (status === "tous" ? all : invoices.filter((i) => effectiveInvoiceStatus(i, now) === status).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))),
    [all, invoices, status, now],
  );

  const audit = React.useMemo(() => numberingAudit(invoices, settings.invoicePrefix), [invoices, settings.invoicePrefix]);
  const currentAudit = audit[0];

  const columns = React.useMemo<Column<Invoice>[]>(
    () => [
      {
        key: "number",
        header: "Numéro",
        render: (i) => <span className={i.number ? "font-mono text-xs font-medium" : "text-xs italic text-muted-foreground"}>{displayNumber(i)}</span>,
        sort: (i) => i.number || "~",
      },
      { key: "kind", header: "Type", render: (i) => <span className="text-xs text-muted-foreground">{labelOf(INVOICE_KINDS, i.kind)}</span>, sort: (i) => labelOf(INVOICE_KINDS, i.kind), hideBelow: "md" },
      { key: "client", header: "Client", render: (i) => <PartyCell doc={i} />, sort: (i) => partyName(i, lk), className: "max-w-56" },
      { key: "session", header: "Session", render: (i) => (i.eventId ? <SessionLink id={i.eventId} short /> : <span className="text-faint">—</span>), csv: (i) => (i.eventId ? lk.events.get(i.eventId)?.code ?? "" : ""), hideBelow: "lg" },
      { key: "issued", header: "Émise le", render: (i) => <span className="tabular whitespace-nowrap text-xs">{i.number ? date(i.issuedAt) : "—"}</span>, sort: (i) => i.issuedAt, csv: (i) => (i.number ? date(i.issuedAt, "dd/MM/yyyy") : ""), hideBelow: "sm" },
      {
        key: "due",
        header: "Échéance",
        render: (i) => (
          <span className="whitespace-nowrap text-xs">
            <span className="tabular">{date(i.dueAt)}</span>
            {i.kind !== "avoir" && isCollectible(i) ? <DueHint dueAt={i.dueAt} now={now} /> : null}
          </span>
        ),
        sort: (i) => i.dueAt,
        csv: (i) => date(i.dueAt, "dd/MM/yyyy"),
        hideBelow: "md",
      },
      { key: "ttc", header: "Total TTC", align: "right", render: (i) => <span className="whitespace-nowrap font-medium">{money(invoiceTotal(i).ttc, true)}</span>, sort: (i) => invoiceTotal(i).ttc, csv: (i) => accountingAmount(invoiceTotal(i).ttc) },
      { key: "paid", header: "Payé", align: "right", render: (i) => <span className="whitespace-nowrap text-muted-foreground">{money(i.paidCents, true)}</span>, sort: (i) => i.paidCents, csv: (i) => accountingAmount(i.paidCents), hideBelow: "xl" },
      {
        key: "balance",
        header: "Reste",
        align: "right",
        render: (i) => {
          const b = i.kind === "avoir" || i.status === "annulee" ? 0 : Math.max(0, invoiceBalance(i));
          return <span className={b > 0 ? "whitespace-nowrap font-medium" : "text-faint"}>{b > 0 ? money(b, true) : "—"}</span>;
        },
        sort: (i) => (i.kind === "avoir" || i.status === "annulee" ? 0 : invoiceBalance(i)),
        csv: (i) => accountingAmount(i.kind === "avoir" || i.status === "annulee" ? 0 : Math.max(0, invoiceBalance(i))),
      },
      { key: "status", header: "Statut", render: (i) => <InvoiceStatusBadge inv={i} now={now} />, sort: (i) => STATUS_ORDER.indexOf(effectiveInvoiceStatus(i, now)), csv: (i) => labelOf(INVOICE_STATUSES, effectiveInvoiceStatus(i, now)) },
      { key: "method", header: "Moyen", render: (i) => <span className="text-xs text-muted-foreground">{labelOf(PAYMENT_METHODS, i.preferredMethod)}</span>, sort: (i) => labelOf(PAYMENT_METHODS, i.preferredMethod), hideBelow: "xl" },
    ],
    [lk, now],
  );

  const filters = React.useMemo<FilterDef<Invoice>[]>(() => {
    const used = new Set(invoices.map((i) => i.eventId).filter(Boolean));
    return [
      { key: "kind", label: "Type", options: INVOICE_KINDS, predicate: (i, v) => i.kind === v },
      { key: "method", label: "Moyen", options: PAYMENT_METHODS, predicate: (i, v) => i.preferredMethod === v },
      {
        key: "session",
        label: "Session",
        options: [{ value: "_none", label: "Hors session" }, ...events.filter((e) => used.has(e.id)).sort((a, b) => b.startAt.localeCompare(a.startAt)).map((e) => ({ value: e.id, label: `${e.code} · ${e.city}` }))],
        predicate: (i, v) => (v === "_none" ? !i.eventId : i.eventId === v),
      },
    ];
  }, [invoices, events]);

  const exportJournal = () => {
    const header = ["Journal", "Date", "Pièce", "Compte", "Compte auxiliaire", "Libellé", "Débit", "Crédit"];
    const out: (string | number)[][] = [];
    for (const i of rows.filter(isNumbered).sort((a, b) => a.number.localeCompare(b.number))) {
      const t = invoiceTotal(i);
      const client = partyName(i, lk);
      const label = `${labelOf(INVOICE_KINDS, i.kind)} ${i.number} — ${client}`;
      const d = date(i.issuedAt, "dd/MM/yyyy");
      const dc = (v: number): [string, string] => (v >= 0 ? [accountingAmount(v), ""] : ["", accountingAmount(-v)]);
      out.push(["VT", d, i.number, "411000", client, label, ...dc(t.ttc)]);
      out.push(["VT", d, i.number, "706000", "", label, ...dc(-t.ht)]);
      if (t.vat) out.push(["VT", d, i.number, "445710", "", label, ...dc(-t.vat)]);
    }
    downloadCsv(`journal-ventes-${date(new Date(now).toISOString(), "yyyy-MM-dd")}.csv`, header, out);
    toast({ title: "Journal des ventes exporté", description: `${out.length} écritures (411 / 706 / 44571) — format CSV point-virgule` });
  };

  const segments: { value: InvoiceStatusFilter; label: string; count?: number }[] = [
    { value: "tous", label: "Toutes" },
    ...STATUS_ORDER.map((s) => ({ value: s, label: labelOf(INVOICE_STATUSES, s), count: counts[s] ?? 0 })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="scrollbar-thin -mx-1 overflow-x-auto px-1">
          <Segmented value={status} onChange={onStatusChange} options={segments} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentAudit ? (
            currentAudit.missing.length === 0 && currentAudit.duplicates === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" title="Contrôle de la numérotation légale (séquentielle, sans trou)">
                <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
                Séquence {settings.invoicePrefix}-{currentAudit.year} continue ({currentAudit.max} pièces)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger-text">
                <TriangleAlert className="size-3.5" aria-hidden="true" />
                Rupture de séquence {currentAudit.year} : {currentAudit.missing.slice(0, 4).map((n) => String(n).padStart(4, "0")).join(", ")}
                {currentAudit.missing.length > 4 ? "…" : ""}
              </span>
            )
          ) : null}
          {editable ? (
            <LinkButton href="/facturation/factures/nouvelle" size="sm">
              <FilePlus2 aria-hidden="true" /> Nouvelle facture
            </LinkButton>
          ) : null}
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(i) => i.id}
        searchable={(i) => `${i.number} ${partyName(i, lk)} ${i.eventId ? lk.events.get(i.eventId)?.code ?? "" : ""} ${i.lines.map((l) => l.label).join(" ")}`}
        searchPlaceholder="Numéro, client, session…"
        filters={filters}
        onRowClick={(i) => router.push(`/facturation/factures/${i.id}`)}
        exportName={`factures-startupweek-${date(new Date(now).toISOString(), "yyyy-MM-dd")}`}
        emptyTitle={status === "tous" ? "Aucune facture" : `Aucune facture « ${labelOf(INVOICE_STATUSES, status as InvoiceStatus)} »`}
        emptyDescription="Les factures d'acompte et de solde sont créées automatiquement quand une candidature est acceptée puis inscrite."
        rowClassName={(i) => (effectiveInvoiceStatus(i, now) === "en_retard" ? "bg-danger-soft/40" : undefined)}
        toolbar={
          <Button variant="secondary" size="sm" onClick={exportJournal} title="Écritures comptables 411 / 706 / 44571 pour l'expert-comptable">
            <BookOpenCheck aria-hidden="true" /> <span className="hidden sm:inline">Journal des ventes</span>
          </Button>
        }
        bulkActions={
          editable
            ? (selected, clear) => {
                const eligible = selected.filter(isCollectible);
                return (
                  <Button
                    size="xs"
                    variant="secondary"
                    disabled={!eligible.length}
                    onClick={() => {
                      let sent = 0;
                      const failed: string[] = [];
                      for (const i of eligible) {
                        const r = runReminderStep(i.id);
                        if (r.ok) sent++;
                        else failed.push(i.number);
                      }
                      clear();
                      toast({
                        title: `${sent} relance${sent > 1 ? "s" : ""} envoyée${sent > 1 ? "s" : ""}`,
                        description: failed.length ? `Sans email de facturation : ${failed.join(", ")}` : "Emails envoyés avec le lien de paiement ; tâches créées selon le niveau.",
                        tone: failed.length ? "info" : "success",
                      });
                    }}
                  >
                    <BellRing aria-hidden="true" /> Envoyer une relance ({eligible.length})
                  </Button>
                );
              }
            : undefined
        }
      />
    </div>
  );
}
