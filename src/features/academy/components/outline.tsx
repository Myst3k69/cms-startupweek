"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Check, Eye, Pencil, Plus, Trash2, Users2 } from "lucide-react";
import { Button, Input, useToast } from "@/components/ui";
import { useActions } from "@/lib/hooks";
import { formatDuration, totalMinutes } from "@/lib/domain/academy";
import type { Course, CourseModule, ID, Lesson } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** Plan de la formation : modules et leçons (ajout, renommage, ordre, suppression). */
export function Outline({
  course,
  modules,
  byModule,
  selectedId,
  onSelect,
  editable,
}: {
  course: Course;
  modules: CourseModule[];
  byModule: Map<ID, Lesson[]>;
  selectedId?: ID;
  onSelect: (id: ID) => void;
  editable: boolean;
}) {
  const { create, update, remove } = useActions();
  const toast = useToast();
  const [renaming, setRenaming] = React.useState<{ id: ID; title: string } | null>(null);

  const addModule = () => {
    const m = create("courseModules", { courseId: course.id, position: modules.reduce((mx, x) => Math.max(mx, x.position + 1), 0), title: `Module ${modules.length + 1}`, summary: "", objectives: [] }, { log: false });
    setRenaming({ id: m.id, title: m.title });
  };
  const addLesson = (m: CourseModule) => {
    const list = byModule.get(m.id) ?? [];
    const l = create("lessons", { courseId: course.id, moduleId: m.id, position: list.reduce((mx, x) => Math.max(mx, x.position + 1), 0), title: "Nouvelle leçon", summary: "", estimatedMinutes: 20, isPreview: false, blocks: [{ id: `blk_${Date.now().toString(36)}`, type: "texte", markdown: "" }] }, { log: false });
    onSelect(l.id);
  };
  /** Réordonne puis renumérote 0…n-1 (robuste aux trous et doublons de position). */
  const reorder = <T extends { id: ID; position: number }>(list: T[], i: number, dir: -1 | 1): T[] | null => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return null;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };
  const moveModule = (i: number, dir: -1 | 1) => {
    reorder(modules, i, dir)?.forEach((m, k) => m.position !== k && update("courseModules", m.id, { position: k }));
  };
  const moveLesson = (list: Lesson[], i: number, dir: -1 | 1) => {
    reorder(list, i, dir)?.forEach((l, k) => l.position !== k && update("lessons", l.id, { position: k }));
  };
  const deleteModule = (m: CourseModule) => {
    const list = byModule.get(m.id) ?? [];
    if (!window.confirm(list.length ? `Supprimer le module « ${m.title} » et ses ${list.length} leçon(s) ? La progression des apprenants sur ces leçons sera perdue.` : `Supprimer le module « ${m.title} » ?`)) return;
    list.forEach((l) => remove("lessons", l.id));
    remove("courseModules", m.id, { log: `Module « ${m.title} » supprimé` });
    toast({ title: "Module supprimé", tone: "info" });
  };
  const saveRename = () => {
    if (renaming && renaming.title.trim()) update("courseModules", renaming.id, { title: renaming.title.trim() });
    setRenaming(null);
  };

  return (
    <nav aria-label="Programme de la formation" className="space-y-3">
      {modules.map((m, mi) => {
        const list = byModule.get(m.id) ?? [];
        return (
          <section key={m.id} className="rounded-lg border border-border bg-surface">
            <header className="flex items-center gap-1 border-b border-border px-2 py-1.5">
              <span className="tabular w-7 shrink-0 text-center font-mono text-[11px] text-muted-foreground">{String(mi).padStart(2, "0")}</span>
              {renaming?.id === m.id ? (
                <form
                  className="flex flex-1 items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveRename();
                  }}
                >
                  <Input value={renaming.title} onChange={(e) => setRenaming({ id: m.id, title: e.target.value })} className="h-7 text-xs" autoFocus aria-label="Titre du module" onBlur={saveRename} />
                  <Button size="icon-xs" variant="ghost" type="submit" aria-label="Valider">
                    <Check />
                  </Button>
                </form>
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-foreground" title={m.title}>
                    {m.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {list.length} leçon{list.length > 1 ? "s" : ""} · {formatDuration(totalMinutes(list))}
                  </div>
                </div>
              )}
              {editable && renaming?.id !== m.id ? (
                <span className="flex shrink-0">
                  <Button size="icon-xs" variant="ghost" aria-label="Renommer le module" onClick={() => setRenaming({ id: m.id, title: m.title })}>
                    <Pencil />
                  </Button>
                  <Button size="icon-xs" variant="ghost" aria-label="Monter le module" disabled={mi === 0} onClick={() => moveModule(mi, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button size="icon-xs" variant="ghost" aria-label="Descendre le module" disabled={mi === modules.length - 1} onClick={() => moveModule(mi, 1)}>
                    <ArrowDown />
                  </Button>
                  <Button size="icon-xs" variant="ghost" aria-label="Supprimer le module" onClick={() => deleteModule(m)}>
                    <Trash2 />
                  </Button>
                </span>
              ) : null}
            </header>
            <ol className="py-1">
              {list.map((l, li) => {
                const active = l.id === selectedId;
                const variants = l.blocks.some((b) => b.personas?.length);
                return (
                  <li key={l.id} className="group flex items-center">
                    <button
                      type="button"
                      onClick={() => onSelect(l.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors",
                        active ? "bg-accent-soft font-medium text-accent-text" : "text-foreground hover:bg-surface-2",
                      )}
                    >
                      <span className="tabular w-5 shrink-0 text-[10px] text-faint">{li + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{l.title}</span>
                      {l.isPreview ? <Eye className="size-3 shrink-0 text-faint" aria-label="Accès libre" /> : null}
                      {variants ? <Users2 className="size-3 shrink-0 text-violet" aria-label="Variantes par profil" /> : null}
                      <span className="tabular shrink-0 text-[10px] text-muted-foreground">{l.estimatedMinutes}′</span>
                    </button>
                    {editable ? (
                      <span className="hidden shrink-0 pr-1 group-focus-within:flex group-hover:flex">
                        <Button size="icon-xs" variant="ghost" aria-label="Monter la leçon" disabled={li === 0} onClick={() => moveLesson(list, li, -1)}>
                          <ArrowUp />
                        </Button>
                        <Button size="icon-xs" variant="ghost" aria-label="Descendre la leçon" disabled={li === list.length - 1} onClick={() => moveLesson(list, li, 1)}>
                          <ArrowDown />
                        </Button>
                      </span>
                    ) : null}
                  </li>
                );
              })}
              {editable ? (
                <li>
                  <button type="button" onClick={() => addLesson(m)} className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground">
                    <Plus className="size-3.5" aria-hidden="true" /> Ajouter une leçon
                  </button>
                </li>
              ) : null}
            </ol>
          </section>
        );
      })}
      {editable ? (
        <Button size="sm" variant="secondary" className="w-full" onClick={addModule}>
          <Plus /> Ajouter un module
        </Button>
      ) : null}
    </nav>
  );
}
