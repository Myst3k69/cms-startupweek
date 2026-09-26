"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, EyeOff, FileUp, Landmark, Link2, RefreshCw, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { useCollection, useLookup, useNow, useSession, useSettings } from "@/lib/hooks";
import { BANK_TX_STATUSES, labelOf } from "@/lib/domain/constants";
import { invoiceBalance } from "@/lib/domain/selectors";
import type { BankTransaction, Invoice } from "@/lib/domain/types";
import { date, money, relative } from "@/lib/format";
import { Badge, Button, Card, DataTable, EmptyState, FormField, Modal, Segmented, Select, Textarea, useToast, type Column } from "@/components/ui";
import { cn } from "@/lib/utils";
import { displayNumber, isCollectible, parseBankCsv, partyName, suggestMatches, type BillingLookups, type MatchSuggestion } from "../lib";
import { importBankTransactions, markPayoutReconciled, reconcileTransaction, setTransactionIgnored } from "../actions";
import { ConfidenceBadge, InfoNote, useBillingLookups } from "./shared";

const SOURCE_LABEL: Record<BankTransaction["source"], string> = { qonto: "Qonto", stripe_payout: "Versement Stripe", import_csv: "Import CSV" };

type View = "a_rapprocher" | "rapproche" | "ignore";

function SuggestionRow({ s, lk, onMatch, disabled }: { s: MatchSuggestion; lk: BillingLookups; onMatch: () => void; disabled: boolean }) {
  const balance = invoiceBalance(s.invoice);
  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-2 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/facturation/factures/${s.invoice.id}`} className="font-mono text-xs font-semibold text-accent-text hover:underline">
            {s.invoice.number}
          </Link>
          <span className="truncate text-sm">{partyName(s.invoice, lk)}</span>
          <span className="text-xs text-muted-foreground">reste {money(balance, true)}</span>
          <ConfidenceBadge confidence={s.confidence} score={s.score} />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{s.reasons.join(" · ")}</p>
      </div>
      <Button size="xs" variant={s.confidence === "elevee" ? "primary" : "secondary"} onClick={onMatch} disabled={disabled}>
        <Link2 aria-hidden="true" /> Rapprocher
      </Button>
    </li>
  );
}

function TransactionCard({
  tx,
  suggestions,
  openInvoices,
  lk,
  now,
  editable,
  onReconcile,
}: {
  tx: BankTransaction;
  suggestions: MatchSuggestion[];
  openInvoices: Invoice[];
  lk: BillingLookups;
  now: number;
  editable: boolean;
  onReconcile: (tx: BankTransaction, invoiceId: string) => void;
}) {
  const toast = useToast();
  const [manual, setManual] = React.useState("");
  const credit = tx.amountCents > 0;
  const payout = tx.source === "stripe_payout";
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className={cn("mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full", credit ? "bg-success-soft text-success-text" : "bg-surface-2 text-muted-foreground")} aria-hidden="true">
            {credit ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
          </span>
          <div className="min-w-0">
            <p className="break-words text-sm font-medium">{tx.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tx.counterparty} · {date(tx.bookedAt)} ({relative(tx.bookedAt, now)}) · {SOURCE_LABEL[tx.source]}
              {tx.reference ? (
                <>
                  {" "}
                  · réf. <span className="font-mono">{tx.reference}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <span className={cn("tabular text-base font-semibold", credit ? "text-success-text" : "text-foreground")}>
            {credit ? "+" : ""}
            {money(tx.amountCents, true)}
          </span>
          <span className="text-xs text-muted-foreground">{credit ? "Crédit" : "Débit"}</span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {!credit ? (
          <p className="text-xs text-muted-foreground">Débit : hors facturation clients (dépense, remboursement…). À ignorer ici ; la comptabilité fournisseurs est tenue par l'expert-comptable.</p>
        ) : payout ? (
          <p className="text-xs text-muted-foreground">Versement Stripe : il regroupe des paiements carte déjà enregistrés automatiquement (webhook). Le rapprocher suffit, sans créer de paiement.</p>
        ) : suggestions.length ? (
          <ul className="space-y-1.5" aria-label="Suggestions de rapprochement">
            {suggestions.map((s) => (
              <SuggestionRow key={s.invoice.id} s={s} lk={lk} disabled={!editable} onMatch={() => onReconcile(tx, s.invoice.id)} />
            ))}
          </ul>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" aria-hidden="true" /> Aucune correspondance automatique : choisissez la facture manuellement.
          </p>
        )}

        {editable ? (
          <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center">
            {credit && !payout ? (
              <>
                <Select
                  aria-label="Choisir une autre facture"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="Autre facture…"
                  options={openInvoices.map((i) => ({ value: i.id, label: `${i.number} — ${partyName(i, lk)} — reste ${money(invoiceBalance(i), true)}` }))}
                  className="min-w-0 sm:max-w-md sm:flex-1"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!manual}
                  onClick={() => {
                    onReconcile(tx, manual);
                    setManual("");
                  }}
                >
                  <Link2 aria-hidden="true" /> Rapprocher
                </Button>
              </>
            ) : null}
            {payout ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  markPayoutReconciled(tx.id);
                  toast({ title: "Versement Stripe rapproché", description: money(tx.amountCents, true) });
                }}
              >
                <Link2 aria-hidden="true" /> Rapprocher le versement
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              className="sm:ml-auto"
              onClick={() => {
                setTransactionIgnored(tx.id, true);
                toast({ title: "Transaction ignorée", description: tx.label, tone: "info" });
              }}
            >
              <EyeOff aria-hidden="true" /> Ignorer
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [text, setText] = React.useState("");
  const parsed = React.useMemo(() => parseBankCsv(text), [text]);
  const close = () => {
    setText("");
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Importer un relevé Qonto (CSV)"
      description="Format : date;libellé;montant[;référence] — une transaction par ligne. Les doublons sont ignorés."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button
            disabled={!parsed.rows.length}
            onClick={() => {
              const r = importBankTransactions(parsed.rows);
              toast({ title: `${r.created} transaction${r.created > 1 ? "s" : ""} importée${r.created > 1 ? "s" : ""}`, description: r.duplicates ? `${r.duplicates} doublon(s) ignoré(s)` : "Suggestions de rapprochement calculées." });
              close();
            }}
          >
            <FileUp aria-hidden="true" /> Importer {parsed.rows.length || ""}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Fichier CSV" htmlFor="qonto-file" hint="Export Qonto → Transactions → CSV (colonnes date, libellé, montant).">
          <input
            id="qonto-file"
            type="file"
            accept=".csv,.txt,text/csv"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-surface-2"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setText(await f.text());
            }}
          />
        </FormField>
        <FormField label="…ou collez les lignes" htmlFor="qonto-text">
          <Textarea
            id="qonto-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-40 font-mono text-xs"
            placeholder={"date;libellé;montant;référence\n2026-09-24;VIR SEPA CAMILLE MARTIN - F-2026-0042;870,00;F-2026-0042\n25/09/2026;VIREMENT EPITECH FACTURE ;11700,00;"}
          />
        </FormField>
        {text.trim() ? (
          <div className="rounded-md border border-border bg-surface-2/60 px-3 py-2 text-xs">
            <p className="font-medium text-foreground">
              {parsed.rows.length} transaction{parsed.rows.length > 1 ? "s" : ""} reconnue{parsed.rows.length > 1 ? "s" : ""} · {money(parsed.rows.reduce((s, r) => s + r.amountCents, 0), true)}
            </p>
            {parsed.errors.length ? (
              <ul className="mt-1 space-y-0.5 text-danger-text">
                {parsed.errors.slice(0, 5).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export function ReconciliationTab() {
  const txs = useCollection("bankTransactions");
  const invoices = useCollection("invoices");
  const invoiceById = useLookup("invoices");
  const settings = useSettings();
  const lk = useBillingLookups();
  const now = useNow();
  const toast = useToast();
  const { canEdit } = useSession();
  const editable = canEdit("facturation");
  const [view, setView] = React.useState<View>("a_rapprocher");
  const [importOpen, setImportOpen] = React.useState(false);

  const pending = React.useMemo(() => txs.filter((t) => t.status === "a_rapprocher").sort((a, b) => b.bookedAt.localeCompare(a.bookedAt)), [txs]);
  const suggestions = React.useMemo(() => new Map(pending.map((tx) => [tx.id, suggestMatches(tx, invoices, lk, settings.invoicePrefix)])), [pending, invoices, lk, settings.invoicePrefix]);
  const openInvoices = React.useMemo(() => invoices.filter(isCollectible).sort((a, b) => b.number.localeCompare(a.number)), [invoices]);
  const confident = pending.filter((tx) => suggestions.get(tx.id)?.[0]?.confidence === "elevee");

  const stats = React.useMemo(() => {
    const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
    const credits = pending.filter((t) => t.amountCents > 0);
    const done = txs.filter((t) => t.status === "rapproche" && new Date(t.updatedAt).getTime() >= monthStart);
    const lastSync = txs.filter((t) => t.source === "qonto").reduce((m, t) => (t.createdAt > m ? t.createdAt : m), "");
    return { count: pending.length, amount: credits.reduce((s, t) => s + t.amountCents, 0), doneMonth: done.length, lastSync };
  }, [pending, txs, now]);

  const reconcile = (tx: BankTransaction, invoiceId: string) => {
    const inv = invoiceById.get(invoiceId);
    const pay = reconcileTransaction(tx.id, invoiceId);
    if (!pay || !inv) {
      toast({ title: "Rapprochement impossible", description: "Transaction déjà traitée ou facture introuvable.", tone: "danger" });
      return;
    }
    const balance = invoiceBalance(inv) - tx.amountCents;
    toast({
      title: `Rapproché avec ${inv.number}`,
      description: balance > 0 ? `Paiement partiel — reste ${money(balance, true)}` : balance < 0 ? `Trop-perçu de ${money(-balance, true)} à régulariser` : "Facture soldée",
    });
  };

  const reconcileConfident = () => {
    const used = new Set<string>();
    let n = 0;
    for (const tx of confident) {
      const s = suggestions.get(tx.id)?.[0];
      if (!s || used.has(s.invoice.id)) continue;
      used.add(s.invoice.id);
      if (reconcileTransaction(tx.id, s.invoice.id)) n++;
    }
    toast({ title: `${n} transaction${n > 1 ? "s" : ""} rapprochée${n > 1 ? "s" : ""}`, description: "Uniquement les correspondances à confiance élevée (numéro + montant, ou montant + nom)." });
  };

  const done = React.useMemo(() => txs.filter((t) => t.status === view).sort((a, b) => b.bookedAt.localeCompare(a.bookedAt)), [txs, view]);

  const doneColumns = React.useMemo<Column<BankTransaction>[]>(
    () => [
      { key: "date", header: "Date", render: (t) => <span className="tabular whitespace-nowrap text-xs">{date(t.bookedAt)}</span>, sort: (t) => t.bookedAt },
      {
        key: "label",
        header: "Libellé",
        render: (t) => (
          <span className="block min-w-0">
            <span className="block truncate text-sm">{t.label}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {t.counterparty} · {SOURCE_LABEL[t.source]}
            </span>
          </span>
        ),
        sort: (t) => t.label,
        className: "max-w-80",
      },
      { key: "amount", header: "Montant", align: "right", render: (t) => <span className="whitespace-nowrap font-medium">{money(t.amountCents, true)}</span>, sort: (t) => t.amountCents },
      {
        key: "invoice",
        header: "Facture",
        render: (t) => {
          const inv = t.matchedInvoiceId ? invoiceById.get(t.matchedInvoiceId) : undefined;
          return inv ? (
            <Link href={`/facturation/factures/${inv.id}`} className="font-mono text-xs text-accent-text hover:underline">
              {displayNumber(inv)}
            </Link>
          ) : (
            <span className="text-xs text-faint">{t.status === "rapproche" ? "Versement Stripe" : "—"}</span>
          );
        },
        hideBelow: "sm",
      },
      { key: "status", header: "Statut", render: (t) => <Badge tone={t.status === "rapproche" ? "success" : "neutral"} dot>{labelOf(BANK_TX_STATUSES, t.status)}</Badge> },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (t) =>
          t.status === "ignore" && editable ? (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setTransactionIgnored(t.id, false);
                toast({ title: "Transaction remise à rapprocher", tone: "info" });
              }}
            >
              <RotateCcw aria-hidden="true" /> Restaurer
            </Button>
          ) : null,
      },
    ],
    [invoiceById, editable, toast],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:flex sm:flex-wrap">
          <div>
            <dt className="text-xs text-muted-foreground">À rapprocher</dt>
            <dd className="font-medium">
              {stats.count} · {money(stats.amount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Suggestions sûres</dt>
            <dd className="font-medium">{confident.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rapprochées ce mois</dt>
            <dd className="font-medium">{stats.doneMonth}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Dernière synchro Qonto</dt>
            <dd className="font-medium">{stats.lastSync ? relative(stats.lastSync, now) : settings.qontoConnected ? "—" : "Non connecté"}</dd>
          </div>
        </dl>
        {editable ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
              <FileUp aria-hidden="true" /> Importer un CSV
            </Button>
            <Button size="sm" disabled={!confident.length} onClick={reconcileConfident}>
              <Wand2 aria-hidden="true" /> Rapprocher les suggestions sûres ({confident.length})
            </Button>
          </div>
        ) : null}
      </div>

      <InfoNote icon={RefreshCw} title="Synchronisation automatique en production">
        Les transactions Qonto arrivent seules (webhook Qonto + appel horaire de <code className="font-mono text-xs">/api/qonto/sync</code>) ; le serveur calcule les mêmes suggestions et rapproche automatiquement
        les correspondances certaines (numéro de facture + montant exact). L'import CSV ci-dessus sert en démo ou en secours.
      </InfoNote>

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: "a_rapprocher", label: "À rapprocher", count: pending.length },
          { value: "rapproche", label: "Rapprochées", count: txs.filter((t) => t.status === "rapproche").length },
          { value: "ignore", label: "Ignorées", count: txs.filter((t) => t.status === "ignore").length },
        ]}
      />

      {view === "a_rapprocher" ? (
        pending.length ? (
          <div className="space-y-3">
            {pending.map((tx) => (
              <TransactionCard key={tx.id} tx={tx} suggestions={suggestions.get(tx.id) ?? []} openInvoices={openInvoices} lk={lk} now={now} editable={editable} onReconcile={reconcile} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Landmark} title="Tout est rapproché" description="Aucune transaction bancaire en attente. Les nouveaux virements Qonto apparaîtront ici avec leurs suggestions." />
        )
      ) : (
        <DataTable rows={done} columns={doneColumns} rowKey={(t) => t.id} searchable={(t) => `${t.label} ${t.counterparty} ${t.reference ?? ""}`} emptyTitle={view === "rapproche" ? "Aucune transaction rapprochée" : "Aucune transaction ignorée"} />
      )}

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
