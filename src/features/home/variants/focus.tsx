"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Check, FileText, Inbox, Mail, Megaphone, MessageSquareWarning, Receipt, Send, Users } from "lucide-react";
import type { AgendaItem, DashboardData, PriorityItem } from "../use-dashboard-data";
import { Button, useToast } from "@/components/ui";
import { acknowledgeComplaint, completeTask, sendInvoiceReminder } from "@/lib/domain/actions";
import { useSession } from "@/lib/hooks";
import { date, moneyCompact, relative } from "@/lib/format";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<PriorityItem["kind"], typeof Inbox> = {
  tache: Check,
  demande: Inbox,
  reclamation: MessageSquareWarning,
  facture: Receipt,
  convocation: Send,
  candidature: FileText,
};

const AGENDA_ICON: Record<AgendaItem["kind"], typeof Inbox> = {
  session: CalendarDays,
  entretien: Users,
  tache: Check,
  contenu: Megaphone,
  echeance: Receipt,
};

/** Design 2 — « Focus » : la journée, priorisée. Une seule liste, des actions en un clic. */
export function FocusHome({ data }: { data: DashboardData }) {
  const { now, kpis } = data;
  const toast = useToast();
  const { canEdit } = useSession();
  const firstName = data.user?.name.split(" ")[0] ?? "";
  const urgent = data.priorities.filter((p) => p.tone === "danger");
  const today = data.priorities.filter((p) => p.tone !== "danger");
  const nextUp = data.upcoming[0];
  const hour = new Date(now).getHours();
  const hello = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const act = (p: PriorityItem) => {
    if (p.kind === "tache" && p.taskId) {
      completeTask(p.taskId);
      toast({ title: "Tâche terminée", description: p.title });
    } else if (p.kind === "reclamation" && p.complaintId) {
      acknowledgeComplaint(p.complaintId);
      toast({ title: "Accusé de réception envoyé", description: "Délai d'engagement respecté (indicateur 31)." });
    } else if (p.kind === "facture" && p.invoiceId) {
      sendInvoiceReminder(p.invoiceId);
      toast({ title: "Relance envoyée", description: p.title.replace("Relancer la ", "") });
    }
  };
  const inlineLabel = (p: PriorityItem) =>
    p.kind === "tache" ? "Terminer" : p.kind === "reclamation" && p.title.startsWith("Accuser") ? "Accuser réception" : p.kind === "facture" ? "Relancer" : null;
  const canAct = (p: PriorityItem) => (p.kind === "tache" ? canEdit("relances") : p.kind === "reclamation" ? canEdit("qualiopi") : p.kind === "facture" ? canEdit("facturation") : false);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="pb-8 pt-4 sm:pt-8">
        <p className="text-sm text-muted-foreground first-letter:uppercase">{date(new Date(now).toISOString(), "EEEE d MMMM yyyy")}</p>
        <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {hello} {firstName}.
        </h1>
        <p className="mt-3 max-w-2xl text-balance text-lg text-muted-foreground">
          {data.priorities.length === 0 ? (
            "Rien d'urgent aujourd'hui — profitez-en pour avancer sur le fond."
          ) : (
            <>
              <span className="font-medium text-foreground">{data.priorities.length} priorité{data.priorities.length > 1 ? "s" : ""}</span>
              {urgent.length ? (
                <>
                  , dont <span className="font-medium text-danger-text">{urgent.length} urgente{urgent.length > 1 ? "s" : ""}</span>
                </>
              ) : null}
              {data.agenda.length ? `, et ${data.agenda.length} rendez-vous cette semaine` : ""}.
            </>
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-8">
          {urgent.length ? (
            <section>
              <h2 className="eyebrow mb-2 px-3 text-danger-text">Urgent</h2>
              <ul className="space-y-0.5">
                {urgent.map((p) => (
                  <PriorityRow key={p.id} p={p} now={now} label={inlineLabel(p)} canAct={canAct(p)} onAct={act} />
                ))}
              </ul>
            </section>
          ) : null}
          <section>
            <h2 className="eyebrow mb-2 px-3 text-muted-foreground">Aujourd'hui</h2>
            {today.length ? (
              <ul className="space-y-0.5">
                {today.slice(0, 12).map((p) => (
                  <PriorityRow key={p.id} p={p} now={now} label={inlineLabel(p)} canAct={canAct(p)} onAct={act} />
                ))}
              </ul>
            ) : (
              <p className="px-3 text-sm text-muted-foreground">Tout est à jour. ✨</p>
            )}
          </section>
          {data.myTasks.filter((t) => new Date(t.dueAt).getTime() >= now + 86_400_000 && new Date(t.dueAt).getTime() < now + 7 * 86_400_000).length ? (
            <section>
              <h2 className="eyebrow mb-2 px-3 text-muted-foreground">Plus tard cette semaine</h2>
              <ul className="space-y-1 px-3">
                {data.myTasks
                  .filter((t) => new Date(t.dueAt).getTime() >= now + 86_400_000 && new Date(t.dueAt).getTime() < now + 7 * 86_400_000)
                  .slice(0, 6)
                  .map((t) => (
                    <li key={t.id} className="flex items-baseline justify-between gap-4 text-sm">
                      <span className="truncate text-foreground">{t.title}</span>
                      <span className="shrink-0 text-xs text-faint">{relative(t.dueAt, now)}</span>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-8">
          <section>
            <h2 className="eyebrow mb-3 text-muted-foreground">En trois chiffres</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-muted-foreground">Encaissé ces 30 jours</dt>
                <dd className="text-3xl font-semibold tracking-tight text-foreground">{moneyCompact(kpis.cash30)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Candidatures cette semaine</dt>
                <dd className="text-3xl font-semibold tracking-tight text-foreground">{kpis.apps7}</dd>
              </div>
              {nextUp ? (
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Places restantes · {nextUp.code} (J-{nextUp.daysLeft})
                  </dt>
                  <dd className="text-3xl font-semibold tracking-tight text-foreground">
                    {nextUp.stats.remaining}
                    <span className="text-base font-normal text-faint"> / {nextUp.capacity}</span>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section>
            <h2 className="eyebrow mb-3 text-muted-foreground">Agenda · 7 jours</h2>
            {data.agenda.length === 0 ? <p className="text-sm text-muted-foreground">Aucun rendez-vous.</p> : null}
            <ol className="space-y-3">
              {data.agenda.slice(0, 8).map((a) => {
                const Icon = AGENDA_ICON[a.kind];
                return (
                  <li key={a.id}>
                    <Link href={a.href} className="flex gap-3 rounded-lg p-1 -m-1 hover:bg-surface">
                      <span className="w-12 shrink-0 text-right">
                        <span className="block text-xs font-medium uppercase text-foreground">{date(a.at, "EEE")}</span>
                        <span className="block text-[11px] text-faint">{date(a.at, "d MMM")}</span>
                      </span>
                      <span className="min-w-0 border-l border-border pl-3">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Icon className="size-3.5 text-faint" />
                          <span className="truncate">{a.title}</span>
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{a.detail}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="rounded-xl border border-border p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Mail className="size-4 text-accent-text" /> Relances automatiques actives
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Accusés de réception, SLA 48 h, soldes J-30, convocations J-7 et questionnaires tournent seuls. Vous ne voyez ici que ce qui demande un humain.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PriorityRow({ p, now, label, canAct, onAct }: { p: PriorityItem; now: number; label: string | null; canAct: boolean; onAct: (p: PriorityItem) => void }) {
  const Icon = KIND_ICON[p.kind];
  const late = p.due ? new Date(p.due).getTime() < now : false;
  return (
    <li className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-surface">
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
          p.tone === "danger" ? "bg-danger-soft text-danger-text" : p.tone === "warning" ? "bg-warning-soft text-warning-text" : "bg-info-soft text-info-text",
        )}
      >
        <Icon className="size-4" />
      </span>
      <Link href={p.href} className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-foreground">{p.title}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {p.detail}
          {p.due ? (
            <span className={cn("ml-2", late ? "text-danger-text" : "text-faint")}>
              · {late ? "échu " : "échéance "}
              {relative(p.due, now)}
            </span>
          ) : null}
        </span>
      </Link>
      {label && canAct ? (
        <Button size="sm" variant={p.tone === "danger" ? "primary" : "secondary"} onClick={() => onAct(p)} className="shrink-0">
          {label}
        </Button>
      ) : (
        <Link href={p.href} className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-faint transition-colors group-hover:bg-surface-2 group-hover:text-foreground" aria-label="Ouvrir">
          <ArrowRight className="size-4" />
        </Link>
      )}
    </li>
  );
}
