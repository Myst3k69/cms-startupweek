"use client";

import * as React from "react";
import { AlarmClock, Bot, CalendarCheck2, CalendarDays, CheckCheck, ListTodo, Plus } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useNow, useSession } from "@/lib/hooks";
import { TASK_KINDS } from "@/lib/domain/constants";
import { isTaskOverdue } from "@/lib/domain/selectors";
import type { Task } from "@/lib/domain/types";
import { date } from "@/lib/format";
import { Button, Card, EmptyState, Segmented, Select, StatCard } from "@/components/ui";
import { TaskFormModal } from "../shared/task-form-modal";
import { TaskItem } from "../shared/task-item";
import { DAY, startOfDay } from "../../lib/format";

export type TaskView = "retard" | "aujourdhui" | "semaine" | "avenir" | "terminees";
export const TASK_VIEWS: TaskView[] = ["retard", "aujourdhui", "semaine", "avenir", "terminees"];

function dayLabel(ts: number, today0: number) {
  const diff = Math.round((startOfDay(ts) - today0) / DAY);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff === -1) return "Hier";
  const label = date(new Date(ts).toISOString(), "EEEE d MMMM");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function TasksView({ initialView, initialScope }: { initialView?: TaskView; initialScope?: "moi" | "equipe" }) {
  const tasks = useCrm((s) => s.tasks);
  const now = useNow();
  const { user, canEdit } = useSession();
  const editable = canEdit("relances");
  const [view, setView] = React.useState<TaskView>(initialView ?? "aujourdhui");
  const [scope, setScope] = React.useState<"moi" | "equipe">(initialScope ?? "moi");
  const [kind, setKind] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const today0 = startOfDay(now);
  const endToday = today0 + DAY;
  const endWeek = endToday + 7 * DAY;

  const scoped = React.useMemo(() => tasks.filter((t) => (scope === "equipe" || t.assigneeId === user?.id) && (!kind || t.kind === kind)), [tasks, scope, kind, user?.id]);

  const buckets = React.useMemo(() => {
    const b: Record<TaskView, Task[]> = { retard: [], aujourdhui: [], semaine: [], avenir: [], terminees: [] };
    for (const t of scoped) {
      if (t.doneAt) {
        b.terminees.push(t);
        continue;
      }
      const due = new Date(t.dueAt).getTime();
      if (isTaskOverdue(t, now)) b.retard.push(t);
      else if (due < endToday) b.aujourdhui.push(t);
      else if (due < endWeek) b.semaine.push(t);
      else b.avenir.push(t);
    }
    const byDue = (a: Task, c: Task) => a.dueAt.localeCompare(c.dueAt);
    b.retard.sort(byDue);
    b.aujourdhui.sort(byDue);
    b.semaine.sort(byDue);
    b.avenir.sort(byDue);
    b.terminees.sort((a, c) => (c.doneAt ?? "").localeCompare(a.doneAt ?? ""));
    return b;
  }, [scoped, now, endToday, endWeek]);

  const stats = React.useMemo(() => {
    const doneWeek = scoped.filter((t) => t.doneAt && now - new Date(t.doneAt).getTime() < 7 * DAY);
    const openAuto = scoped.filter((t) => !t.doneAt && t.automated).length;
    const open = scoped.filter((t) => !t.doneAt).length;
    return { doneWeek: doneWeek.length, openAuto, open };
  }, [scoped, now]);

  const list = view === "terminees" ? buckets.terminees.slice(0, 120) : buckets[view];
  const groups = React.useMemo(() => {
    const out: { key: string; label: string; items: Task[] }[] = [];
    for (const t of list) {
      const ts = new Date(view === "terminees" ? t.doneAt! : t.dueAt).getTime();
      const key = String(startOfDay(ts));
      let g = out.find((x) => x.key === key);
      if (!g) {
        g = { key, label: dayLabel(ts, today0), items: [] };
        out.push(g);
      }
      g.items.push(t);
    }
    return out;
  }, [list, view, today0]);

  const empty: Record<TaskView, { title: string; description: string }> = {
    retard: { title: "Aucune relance en retard", description: "Tout est à jour. Les séquences automatiques créeront les prochaines tâches." },
    aujourdhui: { title: "Rien de prévu aujourd'hui", description: "Profitez-en pour traiter les demandes entrantes ou planifier des relances." },
    semaine: { title: "Semaine calme", description: "Aucune échéance sur les 7 prochains jours." },
    avenir: { title: "Aucune tâche planifiée au-delà", description: "Les relances J-7 / J+60 apparaîtront ici dès l'inscription de participants." },
    terminees: { title: "Aucune tâche terminée", description: "Cochez une tâche pour la marquer comme faite." },
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="En retard" value={<span className={buckets.retard.length ? "text-danger-text" : undefined}>{buckets.retard.length}</span>} icon={AlarmClock} hint={scope === "moi" ? "Mes tâches" : "Toute l'équipe"} />
        <StatCard label="Aujourd'hui" value={buckets.aujourdhui.length} icon={CalendarCheck2} hint={`${buckets.semaine.length} sur les 7 prochains jours`} />
        <StatCard label="Automatiques ouvertes" value={stats.openAuto} icon={Bot} hint={`sur ${stats.open} tâches ouvertes — créées par les séquences`} />
        <StatCard label="Terminées (7 j)" value={stats.doneWeek} icon={CheckCheck} hint="Relances effectuées cette semaine" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="-mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-auto sm:px-0">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "retard", label: "En retard", count: buckets.retard.length },
              { value: "aujourdhui", label: "Aujourd'hui", count: buckets.aujourdhui.length },
              { value: "semaine", label: "Cette semaine", count: buckets.semaine.length },
              { value: "avenir", label: "À venir", count: buckets.avenir.length },
              { value: "terminees", label: "Terminées", count: buckets.terminees.length },
            ]}
          />
        </div>
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            { value: "moi", label: "Mes tâches" },
            { value: "equipe", label: "Toute l'équipe" },
          ]}
        />
        <Select aria-label="Type de tâche" value={kind} onChange={(e) => setKind(e.target.value)} options={TASK_KINDS} placeholder="Tous types" className="w-40" />
        {editable ? (
          <Button size="sm" className="ml-auto" onClick={() => setCreating(true)}>
            <Plus /> Nouvelle tâche
          </Button>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={view === "terminees" ? CheckCheck : view === "retard" ? AlarmClock : ListTodo} title={empty[view].title} description={empty[view].description} />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.key} aria-label={g.label}>
              <h3 className="mb-1.5 flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {g.label}
                <span className="tabular rounded-full bg-surface-2 px-1.5 text-[11px] font-medium">{g.items.length}</span>
              </h3>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-border">
                  {g.items.map((t) => (
                    <TaskItem key={t.id} task={t} now={now} editable={editable} showAssignee={scope === "equipe"} />
                  ))}
                </ul>
              </Card>
            </section>
          ))}
          {view === "terminees" && buckets.terminees.length > 120 ? <p className="text-center text-xs text-muted-foreground">120 dernières tâches terminées affichées.</p> : null}
        </div>
      )}

      <TaskFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
