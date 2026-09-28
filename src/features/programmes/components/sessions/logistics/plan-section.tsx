"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarCheck2, ListChecks, Plus, RotateCcw } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, EmptyState, FormField, Input, Progress, useToast } from "@/components/ui";
import { UserChip } from "@/components/shared/entity-links";
import { LOGISTICS_PLAYBOOK } from "@/lib/domain/constants";
import { createTask, generateLogisticsPlan } from "@/lib/domain/actions";
import type { EventSession } from "@/lib/domain/types";
import { date } from "@/lib/format";
import { useActions, useCollection, useNow } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { PLAYBOOK_NOTE, isEventTask, taskProgress } from "../../../lib/logistics";
import { fromDateInput } from "../../../lib/sessions";

const DAY = 86_400_000;

export function PlanSection({ ev, canEdit }: { ev: EventSession; canEdit: boolean }) {
  const all = useCollection("tasks");
  const { update } = useActions();
  const toast = useToast();
  const now = useNow();
  const tasks = React.useMemo(() => all.filter((t) => isEventTask(t, ev.id)).sort((a, b) => Number(Boolean(a.doneAt)) - Number(Boolean(b.doneAt)) || a.dueAt.localeCompare(b.dueAt)), [all, ev.id]);
  const progress = taskProgress(tasks, now);
  const playbookDone = tasks.filter((t) => t.notes?.startsWith(PLAYBOOK_NOTE)).length;
  const [title, setTitle] = React.useState("");
  const [due, setDue] = React.useState("");
  const start = Date.parse(ev.startAt);

  const generate = () => {
    const n = generateLogisticsPlan(ev.id, LOGISTICS_PLAYBOOK, PLAYBOOK_NOTE);
    toast(n ? { title: `${n} tâche${n > 1 ? "s" : ""} ajoutée${n > 1 ? "s" : ""} au rétroplanning`, description: "Visibles aussi dans « Relances & tâches »." } : { title: "Rétroplanning déjà complet", tone: "info" });
  };

  const add = () => {
    if (title.trim().length < 3) return;
    createTask({ title: `${title.trim()} — ${ev.code}`, kind: "admin", dueAt: fromDateInput(due, 12) ?? new Date(Date.now() + 7 * DAY).toISOString(), related: { entity: "events", id: ev.id }, notes: "Logistique" });
    toast({ title: "Tâche ajoutée", description: title.trim() });
    setTitle("");
    setDue("");
  };

  return (
    <Card>
      <CardHeader className="flex-wrap gap-3">
        <div>
          <CardTitle>Rétroplanning logistique</CardTitle>
          <CardDescription>
            Tâches datées à partir du {date(ev.startAt, "d MMMM")} (J0), rattachées à la session et suivies dans « Relances & tâches ».
          </CardDescription>
        </div>
        {canEdit && playbookDone < LOGISTICS_PLAYBOOK.length ? (
          <Button size="sm" onClick={generate}>
            <ListChecks /> {playbookDone ? "Compléter le rétroplanning type" : "Générer le rétroplanning type"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {tasks.length ? (
          <div className="space-y-1.5">
            <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} tone={progress.overdue ? "warning" : "success"} label={`${progress.done}/${progress.total} tâches faites`} />
            <p className="text-xs text-muted-foreground">
              {progress.done}/{progress.total} tâches faites
              {progress.overdue ? <span className="font-medium text-danger-text"> · {progress.overdue} en retard</span> : null}
            </p>
          </div>
        ) : null}

        {tasks.length === 0 ? (
          <EmptyState
            icon={CalendarCheck2}
            title="Aucune tâche logistique"
            description={`Générez le rétroplanning type (${LOGISTICS_PLAYBOOK.length} étapes de J-120 à J-1 : réservation du lieu, acomptes, intervenants, livret, navettes…) puis ajustez-le.`}
          />
        ) : (
          <ol className="space-y-1.5">
            {tasks.map((t) => {
              const dueTs = Date.parse(t.dueAt);
              const late = !t.doneAt && dueTs < now;
              const rel = Math.round((dueTs - start) / DAY);
              return (
                <li key={t.id} className={cn("flex items-center gap-3 rounded-md border px-3 py-2", late ? "border-danger/40 bg-danger-soft/40" : "border-border", t.doneAt && "opacity-70")}>
                  <Checkbox
                    checked={Boolean(t.doneAt)}
                    disabled={!canEdit}
                    aria-label={t.doneAt ? `Rouvrir « ${t.title} »` : `Marquer « ${t.title} » comme faite`}
                    onChange={(e) => update("tasks", t.id, { doneAt: e.target.checked ? new Date().toISOString() : undefined }, { log: e.target.checked ? `Tâche terminée : ${t.title}` : `Tâche rouverte : ${t.title}` })}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm", t.doneAt ? "text-muted-foreground line-through" : "text-foreground")}>{t.title.replace(` — ${ev.code}`, "")}</p>
                    <p className="text-xs text-muted-foreground">
                      {date(t.dueAt, "EEE d MMM")} · {rel === 0 ? "J0" : rel > 0 ? `J+${rel}` : `J${rel}`}
                    </p>
                  </div>
                  {late ? <Badge tone="danger">En retard</Badge> : t.priority === "haute" || t.priority === "urgente" ? <Badge tone="warning">Prioritaire</Badge> : null}
                  <UserChip id={t.assigneeId} showName={false} />
                </li>
              );
            })}
          </ol>
        )}

        {canEdit ? (
          <form
            className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <FormField label="Nouvelle tâche" htmlFor={`plan-${ev.id}-title`} className="flex-1">
              <Input id={`plan-${ev.id}-title`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Louer un second routeur 4G" />
            </FormField>
            <FormField label="Échéance" htmlFor={`plan-${ev.id}-due`}>
              <Input id={`plan-${ev.id}-due`} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </FormField>
            <Button type="submit" variant="secondary" disabled={title.trim().length < 3}>
              <Plus /> Ajouter
            </Button>
          </form>
        ) : null}
        <p className="flex items-center gap-1.5 text-xs text-faint">
          <RotateCcw className="size-3" aria-hidden="true" /> Toutes les tâches de l'équipe :{" "}
          <Link href="/relances" className="text-accent-text hover:underline">
            Relances & tâches
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
