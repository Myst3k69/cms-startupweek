"use client";

import { Bot, Calendar } from "lucide-react";
import { useCrm } from "@/lib/store";
import { completeTask } from "@/lib/domain/actions";
import { labelOf, PRIORITIES, TASK_KINDS } from "@/lib/domain/constants";
import { isTaskOverdue } from "@/lib/domain/selectors";
import type { Task } from "@/lib/domain/types";
import { dateTime, relative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge, StatusBadge, useToast } from "@/components/ui";
import { UserChip } from "@/components/shared/entity-links";
import { EntityRefLink } from "./entity-ref-link";

/** Ligne de tâche : case de complétion, type / priorité, entité liée, assigné, échéance relative, badge « auto ». */
export function TaskItem({ task, now, editable, showRelated = true, showAssignee = true }: { task: Task; now: number; editable: boolean; showRelated?: boolean; showAssignee?: boolean }) {
  const update = useCrm((s) => s.update);
  const toast = useToast();
  const done = Boolean(task.doneAt);
  const late = isTaskOverdue(task, now);

  const toggle = () => {
    if (done) {
      update("tasks", task.id, { doneAt: undefined }, { log: "Tâche rouverte" });
      toast({ title: "Tâche rouverte", description: task.title, tone: "info" });
    } else {
      completeTask(task.id);
      toast({ title: "Tâche terminée", description: task.title });
    }
  };

  return (
    <li className={cn("flex gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2/60", done && "opacity-70")}>
      <input
        type="checkbox"
        checked={done}
        disabled={!editable}
        onChange={toggle}
        aria-label={done ? `Rouvrir « ${task.title} »` : `Marquer « ${task.title} » comme terminée`}
        className="mt-0.5 size-4 shrink-0 accent-[var(--sw-teal)]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("text-sm text-foreground", done && "text-muted-foreground line-through")}>{task.title}</span>
          <Badge>{labelOf(TASK_KINDS, task.kind)}</Badge>
          {task.priority !== "normale" ? <StatusBadge options={PRIORITIES} value={task.priority} /> : null}
          {task.automated ? (
            <Badge tone="violet" title={task.sequenceId ? "Créée par une séquence de relance" : "Créée par une automatisation"}>
              <Bot className="size-3" aria-hidden="true" /> auto
            </Badge>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {showRelated && task.related ? <EntityRefLink value={task.related} className="max-w-full" /> : null}
          {task.notes ? <span className="truncate text-xs text-muted-foreground">{task.notes}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-right sm:flex-row sm:items-center sm:gap-3">
        {showAssignee ? <UserChip id={task.assigneeId} /> : null}
        <span
          className={cn("inline-flex items-center gap-1 whitespace-nowrap text-xs tabular", late ? "font-medium text-danger-text" : "text-muted-foreground")}
          title={`Échéance : ${dateTime(task.dueAt)}`}
        >
          <Calendar className="size-3.5" aria-hidden="true" />
          {done ? `faite ${relative(task.doneAt, now)}` : late ? `en retard · ${relative(task.dueAt, now).replace("il y a ", "")}` : relative(task.dueAt, now)}
        </span>
      </div>
    </li>
  );
}
