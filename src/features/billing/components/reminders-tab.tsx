"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BellRing, CalendarClock, Gavel, Mail, PhoneCall, Send } from "lucide-react";
import { useCollection, useNow, useSession } from "@/lib/hooks";
import { invoiceBalance } from "@/lib/domain/selectors";
import type { Invoice } from "@/lib/domain/types";
import { date, money, relative } from "@/lib/format";
import { Badge, Button, Card, DataTable, EmptyState, useToast, type Column } from "@/components/ui";
import { cn } from "@/lib/utils";
import { DAY, isCollectible, partyName, REMINDER_LEVEL_LABELS, REMINDER_STEPS, reminderInfo } from "../lib";
import { runReminderStep, sendDueSoonNotice } from "../actions";
import { PartyCell, useBillingLookups } from "./shared";

const STEP_ICONS = [Mail, PhoneCall, Gavel];
const LEVEL_SHORT = ["", "J+3", "J+10", "Mise en demeure"];

function SequenceTimeline({ counts }: { counts: number[] }) {
  const steps = [{ title: "Échéance", detail: "Rappel préventif possible dès J-7", day: "J0", icon: CalendarClock }, ...REMINDER_STEPS.map((s, i) => ({ title: s.title, detail: s.detail, day: `J+${s.day}`, icon: STEP_ICONS[i] }))];
  return (
    <Card className="p-4">
      <p className="mb-3 text-sm font-semibold">Séquence de relance des impayés</p>
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="relative flex gap-3 sm:flex-col sm:gap-2">
            <div className="flex items-center gap-2 sm:w-full">
              <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full border", i === 0 ? "border-border bg-surface-2 text-muted-foreground" : i === 3 ? "border-danger/30 bg-danger-soft text-danger-text" : "border-warning/40 bg-warning-soft text-warning-text")}>
                <s.icon className="size-4" aria-hidden="true" />
              </span>
              {i < steps.length - 1 ? <span className="hidden h-px flex-1 bg-border-strong sm:block" aria-hidden="true" /> : null}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-accent-text">{s.day}</p>
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.detail}</p>
              <p className="mt-1 text-xs tabular text-muted-foreground">
                {counts[i]} facture{counts[i] > 1 ? "s" : ""} {i === 0 ? "sans relance" : "à ce niveau"}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function RemindersTab() {
  const invoices = useCollection("invoices");
  const lk = useBillingLookups();
  const now = useNow();
  const toast = useToast();
  const router = useRouter();
  const { canEdit } = useSession();
  const editable = canEdit("facturation");

  const rows = React.useMemo(
    () =>
      invoices
        .filter((i) => isCollectible(i) && new Date(i.dueAt).getTime() - now < 7 * DAY)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    [invoices, now],
  );
  const overdue = rows.filter((i) => new Date(i.dueAt).getTime() < now);
  const dueNow = overdue.filter((i) => reminderInfo(i, now).nextDue);
  const counts = [0, 1, 2, 3].map((lvl) => overdue.filter((i) => Math.min(i.remindersSent, 3) === lvl).length);

  const remind = React.useCallback((inv: Invoice) => {
    const late = new Date(inv.dueAt).getTime() < now;
    if (!late) {
      const ok = sendDueSoonNotice(inv.id);
      toast(ok ? { title: "Rappel avant échéance envoyé", description: `${inv.number} · ${partyName(inv, lk)}` } : { title: "Envoi impossible", description: "Aucun email de facturation pour ce client.", tone: "danger" });
      return;
    }
    const r = runReminderStep(inv.id);
    toast(
      r.ok
        ? { title: `${REMINDER_LEVEL_LABELS[Math.min(r.level, 3)]} envoyée`, description: `${inv.number} · ${partyName(inv, lk)}${r.level === 2 ? " — tâche d'appel créée" : r.level >= 3 ? " — tâche de mise en demeure créée" : ""}` }
        : { title: "Relance impossible", description: r.reason, tone: "danger" },
    );
  }, [now, lk, toast]);

  const remindAll = () => {
    let ok = 0;
    const failed: string[] = [];
    for (const inv of dueNow) {
      const r = runReminderStep(inv.id);
      if (r.ok) ok++;
      else failed.push(inv.number);
    }
    toast({ title: `${ok} relance${ok > 1 ? "s" : ""} envoyée${ok > 1 ? "s" : ""}`, description: failed.length ? `Échec (pas d'email) : ${failed.join(", ")}` : "Étape suivante de la séquence envoyée à chaque facture concernée.", tone: failed.length ? "info" : "success" });
  };

  const columns = React.useMemo<Column<Invoice>[]>(
    () => [
      { key: "number", header: "Facture", render: (i) => <span className="whitespace-nowrap font-mono text-xs font-medium">{i.number}</span>, sort: (i) => i.number },
      { key: "client", header: "Client", render: (i) => <PartyCell doc={i} compact className="max-w-40 xl:max-w-52" />, sort: (i) => partyName(i, lk) },
      {
        key: "due",
        header: "Échéance",
        render: (i) => {
          const { daysLate } = reminderInfo(i, now);
          return (
            <span className="whitespace-nowrap text-xs">
              <span className="tabular">{date(i.dueAt)}</span>
              <span className={cn("block font-medium", daysLate > 0 ? "text-danger-text" : "text-warning-text")}>{daysLate > 0 ? `retard ${daysLate} j` : daysLate === 0 ? "aujourd'hui" : `dans ${-daysLate} j`}</span>
            </span>
          );
        },
        sort: (i) => i.dueAt,
      },
      { key: "balance", header: "Reste dû", align: "right", render: (i) => <span className="whitespace-nowrap font-medium">{money(invoiceBalance(i), true)}</span>, sort: (i) => invoiceBalance(i) },
      {
        key: "level",
        header: "Niveau",
        render: (i) => {
          const lvl = Math.min(i.remindersSent, 3);
          return (
            <Badge tone={lvl === 0 ? "neutral" : lvl === 3 ? "danger" : "warning"} dot title={REMINDER_LEVEL_LABELS[lvl]}>
              {lvl === 0 ? "Aucune" : `${lvl}/3 · ${LEVEL_SHORT[lvl]}`}
            </Badge>
          );
        },
        sort: (i) => i.remindersSent,
        hideBelow: "md",
      },
      { key: "last", header: "Dernière relance", render: (i) => <span className="text-xs text-muted-foreground">{i.lastReminderAt ? relative(i.lastReminderAt, now) : "—"}</span>, sort: (i) => i.lastReminderAt ?? "", hideBelow: "lg" },
      {
        key: "next",
        header: "Prochaine étape",
        render: (i) => {
          const info = reminderInfo(i, now);
          if (info.daysLate < 0) return <span className="text-xs text-muted-foreground">Rappel préventif</span>;
          if (!info.next) return <span className="text-xs text-danger-text">Recouvrement / contentieux</span>;
          return (
            <span className={cn("text-xs", info.nextDue ? "font-medium text-danger-text" : "text-muted-foreground")}>
              {info.next.title} {info.nextDue ? "— à envoyer" : `le ${date(new Date(info.nextAt!).toISOString())}`}
            </span>
          );
        },
        hideBelow: "lg",
      },
      {
        key: "action",
        header: "",
        align: "right",
        render: (i) =>
          editable ? (
            <Button
              size="xs"
              variant={reminderInfo(i, now).nextDue ? "primary" : "secondary"}
              onClick={(e) => {
                e.stopPropagation();
                remind(i);
              }}
            >
              <Send aria-hidden="true" /> {new Date(i.dueAt).getTime() < now ? "Relancer" : "Rappeler"}
            </Button>
          ) : null,
      },
    ],
    [lk, now, editable, remind],
  );

  return (
    <div className="space-y-4">
      <SequenceTimeline counts={counts} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{overdue.length}</span> facture{overdue.length > 1 ? "s" : ""} échue{overdue.length > 1 ? "s" : ""} ({money(overdue.reduce((s, i) => s + invoiceBalance(i), 0))}) ·{" "}
          <span className="font-medium text-foreground">{rows.length - overdue.length}</span> à échéance sous 7 jours
        </p>
        {editable ? (
          <Button size="sm" disabled={!dueNow.length} onClick={remindAll} title="Envoie l'étape suivante de la séquence à chaque facture dont le délai de relance est atteint">
            <BellRing aria-hidden="true" /> Relancer tout ({dueNow.length})
          </Button>
        ) : null}
      </div>
      {rows.length ? (
        <DataTable rows={rows} columns={columns} rowKey={(i) => i.id} onRowClick={(i) => router.push(`/facturation/factures/${i.id}`)} rowClassName={(i) => (reminderInfo(i, now).nextDue ? "bg-danger-soft/40" : undefined)} pageSize={50} />
      ) : (
        <EmptyState icon={BellRing} title="Aucun impayé à relancer" description="Aucune facture échue ni à échéance dans les 7 prochains jours." />
      )}
    </div>
  );
}
