"use client";

import * as React from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ExternalLink, FileText, Plus, Receipt, Trash2, Wallet } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Drawer,
  FormField,
  Input,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
  useToast,
  type Column,
} from "@/components/ui";
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES, SUPPLIER_PAYMENT_METHODS, labelOf } from "@/lib/domain/constants";
import type { EventSession, ExpenseCategory, ExpenseInstallment, ExpenseStatus, SessionExpense, SupplierPaymentMethod } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { useActions, useCollection, useNow } from "@/lib/hooks";
import { cn, uid } from "@/lib/utils";
import { centsToInput, inputToCents } from "@/features/crm/lib/format";
import { defaultSchedule, expensePaid, expenseRemaining, expenseUnscheduled, installmentState, nextInstallment, summarizeExpenses } from "../../../lib/logistics";
import { fromDateInput, toDateInput } from "../../../lib/sessions";

export type ExpensePreset = Partial<Pick<SessionExpense, "category" | "label" | "supplier" | "amountCents" | "speakerId" | "activityId" | "venueId" | "status">>;

export function ExpensesSection({ ev, canEdit, preset, onPresetConsumed }: { ev: EventSession; canEdit: boolean; preset?: ExpensePreset; onPresetConsumed?: () => void }) {
  const all = useCollection("expenses");
  const now = useNow();
  const expenses = React.useMemo(() => all.filter((e) => e.eventId === ev.id), [all, ev.id]);
  const summary = React.useMemo(() => summarizeExpenses(expenses, now), [expenses, now]);
  const [openId, setOpenId] = React.useState<string | null>(null);
  // Ouverture pré-remplie depuis une autre rubrique (honoraires d'un intervenant, coût d'une activité) :
  // la section est montée à ce moment-là, le préremplissage sert d'état initial.
  const [creating, setCreating] = React.useState<ExpensePreset | null>(preset ?? null);
  const opened = expenses.find((e) => e.id === openId);
  const closeCreating = () => {
    setCreating(null);
    onPresetConsumed?.();
  };

  const columns = React.useMemo<Column<SessionExpense>[]>(
    () => [
      {
        key: "label",
        header: "Poste",
        sort: (e) => e.label.toLowerCase(),
        csv: (e) => e.label,
        render: (e) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{e.label}</p>
            <p className="truncate text-xs text-muted-foreground">{e.supplier || "Fournisseur non renseigné"}</p>
          </div>
        ),
      },
      { key: "category", header: "Catégorie", hideBelow: "lg", sort: (e) => e.category, csv: (e) => labelOf(EXPENSE_CATEGORIES, e.category), render: (e) => <span className="text-xs text-muted-foreground">{labelOf(EXPENSE_CATEGORIES, e.category)}</span> },
      { key: "status", header: "Statut", sort: (e) => e.status, csv: (e) => labelOf(EXPENSE_STATUSES, e.status), render: (e) => <StatusBadge options={EXPENSE_STATUSES} value={e.status} /> },
      { key: "amount", header: "Montant", align: "right", sort: (e) => e.amountCents, csv: (e) => (e.amountCents / 100).toFixed(2), render: (e) => (e.amountCents ? money(e.amountCents) : <span className="text-faint">—</span>) },
      { key: "paid", header: "Payé", align: "right", hideBelow: "md", sort: (e) => expensePaid(e), csv: (e) => (expensePaid(e) / 100).toFixed(2), render: (e) => <span className="text-muted-foreground">{money(expensePaid(e))}</span> },
      {
        key: "remaining",
        header: "Reste",
        align: "right",
        sort: (e) => expenseRemaining(e),
        csv: (e) => (expenseRemaining(e) / 100).toFixed(2),
        render: (e) => {
          const r = expenseRemaining(e);
          return <span className={r > 0 ? "font-medium text-foreground" : "text-muted-foreground"}>{e.status === "accepte" ? money(r) : "—"}</span>;
        },
      },
      {
        key: "next",
        header: "Prochaine échéance",
        hideBelow: "sm",
        sort: (e) => nextInstallment(e)?.dueAt ?? "9999",
        csv: (e) => date(nextInstallment(e)?.dueAt, "yyyy-MM-dd"),
        render: (e) => {
          const n = e.status === "accepte" ? nextInstallment(e) : undefined;
          if (!n) return e.status === "accepte" && expenseUnscheduled(e) > 0 ? <Badge tone="warning">Échéancier à compléter</Badge> : <span className="text-faint">—</span>;
          const late = installmentState(n, now) === "en_retard";
          return (
            <span className={cn("whitespace-nowrap text-xs", late ? "font-medium text-danger-text" : "text-muted-foreground")}>
              {date(n.dueAt)} · {money(n.amountCents)}
              {late ? " · en retard" : ""}
            </span>
          );
        },
      },
    ],
    [now],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Engagé" value={money(summary.committed)} icon={Receipt} hint="Devis acceptés" />
        <StatCard label="Payé" value={money(summary.paid)} icon={CheckCircle2} hint={summary.committed ? `${Math.round((summary.paid / summary.committed) * 100)} % de l'engagé` : "—"} />
        <StatCard
          label="Reste à payer"
          value={money(summary.remaining)}
          icon={Wallet}
          hint={summary.overdueCount ? <span className="font-medium text-danger-text">{summary.overdueCount} échéance{summary.overdueCount > 1 ? "s" : ""} en retard ({money(summary.overdueAmount)})</span> : "Aucune échéance en retard"}
        />
        <StatCard
          label="Prochaine échéance"
          value={summary.next ? date(summary.next.installment.dueAt, "d MMM") : "—"}
          icon={CalendarClock}
          hint={summary.next ? `${money(summary.next.installment.amountCents)} · ${summary.next.expense.supplier || summary.next.expense.label}` : "Rien à payer"}
        />
      </div>

      {summary.pendingCount ? (
        <p className="flex items-start gap-2 rounded-md border border-border bg-surface-2 p-3 text-sm text-muted-foreground">
          <FileText className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
          {summary.pendingCount} devis en attente de décision ({money(summary.pendingAmount)}) : ils ne comptent pas dans l'engagé tant qu'ils ne sont pas acceptés.
        </p>
      ) : null}

      <Card>
        <CardHeader className="flex-wrap gap-3">
          <div>
            <CardTitle>Devis & dépenses fournisseurs</CardTitle>
            <CardDescription>Lieu, traiteur, activités, transport, intervenants : ce que StartupWeek doit payer pour {ev.code}.</CardDescription>
          </div>
          {canEdit ? (
            <Button size="sm" onClick={() => setCreating({})}>
              <Plus /> Nouveau devis
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <DataTable
            rows={expenses}
            columns={columns}
            rowKey={(e) => e.id}
            onRowClick={(e) => setOpenId(e.id)}
            exportName={`depenses-${ev.code}`}
            initialSort={{ key: "next", dir: "asc" }}
            dense
            emptyTitle="Aucun devis"
            emptyDescription="Ajoutez les devis du lieu, du traiteur, des activités… Ils alimentent la marge de la session."
          />
        </CardContent>
      </Card>

      {creating ? <ExpenseDrawer ev={ev} canEdit={canEdit} preset={creating} onClose={closeCreating} /> : null}
      {opened ? <ExpenseDrawer ev={ev} canEdit={canEdit} expense={opened} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

/* ───────────────────────────── Fiche devis / dépense ───────────────────────────── */

interface InstDraft {
  id: string;
  label: string;
  amount: string;
  dueAt: string;
  paidAt: string;
  method: SupplierPaymentMethod | "";
  reference: string;
}

const toInstDraft = (i: ExpenseInstallment): InstDraft => ({
  id: i.id,
  label: i.label,
  amount: centsToInput(i.amountCents),
  dueAt: toDateInput(i.dueAt),
  paidAt: toDateInput(i.paidAt),
  method: i.method ?? "",
  reference: i.reference ?? "",
});

function ExpenseDrawer({ ev, canEdit, expense, preset, onClose }: { ev: EventSession; canEdit: boolean; expense?: SessionExpense; preset?: ExpensePreset; onClose: () => void }) {
  const { create, update, remove } = useActions();
  const toast = useToast();
  const now = useNow();
  const base = expense ?? preset ?? {};
  const [category, setCategory] = React.useState<ExpenseCategory>(base.category ?? "lieu");
  const [label, setLabel] = React.useState(base.label ?? "");
  const [supplier, setSupplier] = React.useState(base.supplier ?? "");
  const [status, setStatus] = React.useState<ExpenseStatus>(base.status ?? "recu");
  const [amount, setAmount] = React.useState(centsToInput(base.amountCents));
  const [quoteRef, setQuoteRef] = React.useState(expense?.quoteRef ?? "");
  const [quoteUrl, setQuoteUrl] = React.useState(expense?.quoteUrl ?? "");
  const [validUntil, setValidUntil] = React.useState(toDateInput(expense?.validUntil));
  const [notes, setNotes] = React.useState(expense?.notes ?? "");
  const [insts, setInsts] = React.useState<InstDraft[]>(() => (expense?.installments ?? []).map(toInstDraft));
  const [error, setError] = React.useState<string | null>(null);
  const id = (k: string) => `exp-${expense?.id ?? "new"}-${k}`;

  const amountCents = amount.trim() ? inputToCents(amount) : 0;
  const scheduled = insts.reduce((s, i) => s + inputToCents(i.amount || "0"), 0);
  const setInst = (iid: string, patch: Partial<InstDraft>) => setInsts((xs) => xs.map((x) => (x.id === iid ? { ...x, ...patch } : x)));

  const save = () => {
    if (label.trim().length < 2) return setError("Donnez un intitulé au poste (ex : « Location villa 8 nuits »).");
    if (amount.trim() && !/^\d[\d\s]*([.,]\d{1,2})?$/.test(amount.trim())) return setError("Montant invalide (ex : 2 400).");
    const badInst = insts.find((i) => !i.label.trim() || !i.dueAt || !/^\d[\d\s]*([.,]\d{1,2})?$/.test(i.amount.trim()));
    if (badInst) return setError("Chaque échéance doit avoir un libellé, un montant et une date.");
    if (scheduled > amountCents && amountCents > 0) return setError(`L'échéancier (${money(scheduled)}) dépasse le montant du devis (${money(amountCents)}).`);
    setError(null);
    const installments: ExpenseInstallment[] = insts.map((i) => ({
      id: i.id,
      label: i.label.trim(),
      amountCents: inputToCents(i.amount),
      dueAt: fromDateInput(i.dueAt, 12)!,
      paidAt: i.paidAt ? fromDateInput(i.paidAt, 12) : undefined,
      method: i.paidAt && i.method ? i.method : undefined,
      reference: i.reference.trim() || undefined,
    }));
    const data = {
      category,
      label: label.trim(),
      supplier: supplier.trim(),
      status,
      amountCents,
      quoteRef: quoteRef.trim() || undefined,
      quoteUrl: quoteUrl.trim() || undefined,
      validUntil: fromDateInput(validUntil, 18),
      installments,
      notes: notes.trim(),
    };
    if (expense) {
      const paidBefore = expense.installments.filter((i) => i.paidAt).length;
      const paidNow = installments.filter((i) => i.paidAt).length;
      update("expenses", expense.id, data, { log: paidNow > paidBefore ? `Paiement fournisseur enregistré — ${data.label}` : `Devis mis à jour — ${data.label}`, kind: paidNow > paidBefore ? "paiement" : undefined });
      toast({ title: "Devis enregistré", description: data.label });
    } else {
      create(
        "expenses",
        { ...data, eventId: ev.id, venueId: preset?.venueId, speakerId: preset?.speakerId, activityId: preset?.activityId, receivedAt: status === "recu" || status === "accepte" ? new Date().toISOString() : undefined },
        { log: `Devis ajouté — ${data.label}` },
      );
      toast({ title: "Devis ajouté", description: `${data.label} · ${money(amountCents)}` });
    }
    onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="xl"
      title={expense ? expense.label : "Nouveau devis"}
      description={`${ev.code} · ${expense ? labelOf(EXPENSE_CATEGORIES, expense.category) : "Dépense fournisseur"}`}
      footer={
        canEdit ? (
          <>
            {expense ? (
              <Button
                variant="ghost"
                className="mr-auto text-danger-text"
                onClick={() => {
                  remove("expenses", expense.id, { log: `Devis supprimé — ${expense.label}` });
                  toast({ title: "Devis supprimé", description: expense.label, tone: "info" });
                  onClose();
                }}
              >
                <Trash2 /> Supprimer
              </Button>
            ) : null}
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={save}>{expense ? "Enregistrer" : "Ajouter"}</Button>
          </>
        ) : null
      }
    >
      <fieldset disabled={!canEdit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Intitulé" htmlFor={id("label")} className="sm:col-span-2">
            <Input id={id("label")} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Location villa — 8 nuits" autoFocus={!expense} />
          </FormField>
          <FormField label="Fournisseur" htmlFor={id("supplier")}>
            <Input id={id("supplier")} value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </FormField>
          <FormField label="Catégorie" htmlFor={id("cat")}>
            <Select id={id("cat")} value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} options={EXPENSE_CATEGORIES} />
          </FormField>
          <FormField label="Statut du devis" htmlFor={id("status")} hint="Seuls les devis acceptés comptent dans l'engagé">
            <Select id={id("status")} value={status} onChange={(e) => setStatus(e.target.value as ExpenseStatus)} options={EXPENSE_STATUSES} />
          </FormField>
          <FormField label="Montant TTC (€)" htmlFor={id("amount")}>
            <Input id={id("amount")} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2 400" />
          </FormField>
          <FormField label="Référence du devis" htmlFor={id("ref")}>
            <Input id={id("ref")} value={quoteRef} onChange={(e) => setQuoteRef(e.target.value)} />
          </FormField>
          <FormField label="Valable jusqu'au" htmlFor={id("valid")}>
            <Input id={id("valid")} type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </FormField>
          <FormField label="Lien vers le devis" htmlFor={id("url")} hint="PDF partagé, email…" className="sm:col-span-2">
            <div className="flex gap-2">
              <Input id={id("url")} value={quoteUrl} onChange={(e) => setQuoteUrl(e.target.value)} placeholder="https://" />
              {/^https?:\/\//.test(quoteUrl) ? (
                <a href={quoteUrl} target="_blank" rel="noreferrer noopener" className="inline-flex shrink-0 items-center gap-1 px-2 text-sm font-medium text-accent-text hover:underline">
                  Ouvrir <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </FormField>
        </div>

        <section aria-label="Échéancier de paiement" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Échéancier de paiement</h3>
              <p className="text-xs text-muted-foreground">
                Planifié {money(scheduled)} sur {money(amountCents)}
                {amountCents > scheduled ? ` · ${money(amountCents - scheduled)} non planifiés` : ""}
              </p>
            </div>
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                {amountCents > 0 && insts.length === 0 ? (
                  <Button size="xs" variant="subtle" onClick={() => setInsts(defaultSchedule(amountCents, ev, now).map(toInstDraft))}>
                    Acompte 30 % + solde J-30
                  </Button>
                ) : null}
                <Button size="xs" variant="secondary" onClick={() => setInsts((xs) => [...xs, { id: uid("inst"), label: xs.length ? "Solde" : "Acompte", amount: centsToInput(Math.max(0, amountCents - scheduled)), dueAt: toDateInput(new Date(now + 7 * 86_400_000).toISOString()), paidAt: "", method: "", reference: "" }])}>
                  <Plus /> Échéance
                </Button>
              </div>
            ) : null}
          </div>
          {insts.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">Aucune échéance planifiée.</p>
          ) : (
            <ul className="space-y-2">
              {insts.map((i) => {
                const state = i.paidAt ? "payee" : i.dueAt && fromDateInput(i.dueAt, 23, 59)! < new Date(now).toISOString() ? "en_retard" : "a_venir";
                return (
                  <li key={i.id} className={cn("grid grid-cols-2 gap-2 rounded-md border p-2.5 sm:grid-cols-12 sm:items-end", state === "en_retard" ? "border-danger/40 bg-danger-soft/40" : "border-border")}>
                    <FormField label="Libellé" htmlFor={`${i.id}-label`} className="col-span-2 sm:col-span-3">
                      <Input id={`${i.id}-label`} value={i.label} onChange={(e) => setInst(i.id, { label: e.target.value })} />
                    </FormField>
                    <FormField label="Montant (€)" htmlFor={`${i.id}-amount`} className="sm:col-span-2">
                      <Input id={`${i.id}-amount`} inputMode="decimal" value={i.amount} onChange={(e) => setInst(i.id, { amount: e.target.value })} />
                    </FormField>
                    <FormField label="Échéance" htmlFor={`${i.id}-due`} className="sm:col-span-2">
                      <Input id={`${i.id}-due`} type="date" value={i.dueAt} onChange={(e) => setInst(i.id, { dueAt: e.target.value })} />
                    </FormField>
                    <FormField label="Payé le" htmlFor={`${i.id}-paid`} className="sm:col-span-2">
                      <Input id={`${i.id}-paid`} type="date" value={i.paidAt} onChange={(e) => setInst(i.id, { paidAt: e.target.value })} />
                    </FormField>
                    <FormField label="Moyen" htmlFor={`${i.id}-method`} className="sm:col-span-2">
                      <Select id={`${i.id}-method`} value={i.method} onChange={(e) => setInst(i.id, { method: e.target.value as SupplierPaymentMethod })} options={SUPPLIER_PAYMENT_METHODS} placeholder="—" />
                    </FormField>
                    <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-1">
                      {canEdit && !i.paidAt ? (
                        <Button size="icon-xs" variant="ghost" aria-label={`Marquer « ${i.label} » payée aujourd'hui`} title="Payée aujourd'hui" onClick={() => setInst(i.id, { paidAt: toDateInput(new Date().toISOString()), method: i.method || "virement" })}>
                          <CheckCircle2 />
                        </Button>
                      ) : null}
                      {canEdit ? (
                        <Button size="icon-xs" variant="ghost" aria-label={`Supprimer l'échéance « ${i.label} »`} onClick={() => setInsts((xs) => xs.filter((x) => x.id !== i.id))}>
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                    <p className="col-span-2 text-xs sm:col-span-12">
                      {state === "payee" ? <Badge tone="success" dot>Payée</Badge> : state === "en_retard" ? <Badge tone="danger" dot>En retard</Badge> : <Badge tone="info" dot>À venir</Badge>}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          {status !== "accepte" && insts.length ? (
            <p className="flex items-center gap-1.5 text-xs text-warning-text">
              <AlertTriangle className="size-3.5" aria-hidden="true" /> Le devis n'est pas accepté : son échéancier n'entre pas dans l'engagé.
            </p>
          ) : null}
        </section>

        <FormField label="Notes" htmlFor={id("notes")}>
          <Textarea id={id("notes")} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Caution, conditions d'annulation, contact…" />
        </FormField>
        {error ? <p className="text-sm font-medium text-danger-text">{error}</p> : null}
      </fieldset>
    </Drawer>
  );
}
