"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Copy, Eye, MessageSquare, Plus, Trash2 } from "lucide-react";
import { formatDuration } from "@/lib/domain/academy";
import { LESSON_BLOCK_TYPES, PERSONAS, labelOf } from "@/lib/domain/constants";
import type { CourseComment, CourseModule, ID, LessonBlock, LessonBlockType, Persona } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { BLOCK_ICON, cloneBlock, newBlock } from "@/features/academy/components/block-editors";
import { PlainEditable } from "./editable";
import { InPlaceBlock } from "./block-canvas";
import type { LessonDraft } from "../lib/use-lesson-draft";

export type SeeAs = "tous" | Persona;

const TYPE_HINT: Record<LessonBlockType, string> = {
  texte: "Paragraphes, titres, listes, tableaux, encadrés",
  video: "Vidéo YouTube et plan de tournage",
  quiz: "Questions à choix, notées ou non",
  exercice: "Consigne, critères, livrable corrigé",
  ressource: "Fichier de la bibliothèque",
  prompt: "Gabarit à copier par l'apprenant",
  checklist: "Étapes à cocher",
};

/** « + » entre deux blocs : choix du type de bloc à insérer. */
function Inserter({ onInsert, alwaysVisible }: { onInsert: (t: LessonBlockType) => void; alwaysVisible?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className={cn("group/ins relative flex h-5 items-center justify-center", alwaysVisible && "h-10")}>
      <span className={cn("absolute inset-x-0 top-1/2 border-t border-dashed border-border-strong transition-opacity", open || alwaysVisible ? "opacity-100" : "opacity-0 group-hover/ins:opacity-100")} aria-hidden="true" />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Ajouter un bloc ici"
        className={cn(
          "relative z-10 inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface text-accent-text shadow-sm transition-opacity focus-visible:opacity-100",
          alwaysVisible ? "px-3 py-1 text-xs font-medium opacity-100" : "size-6 justify-center opacity-0 group-hover/ins:opacity-100",
          open && "opacity-100",
        )}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {alwaysVisible ? "Ajouter un bloc" : null}
      </button>
      {open ? (
        <div role="menu" className="absolute top-full z-40 mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border-strong bg-surface p-1.5 shadow-lg">
          {LESSON_BLOCK_TYPES.map((t) => {
            const Icon = BLOCK_ICON[t.value];
            return (
              <button
                key={t.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  onInsert(t.value);
                  setOpen(false);
                }}
                className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-x-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
              >
                <Icon className="row-span-2 size-4 text-accent-text" aria-hidden="true" />
                <span className="text-sm font-medium">{t.label}</span>
                <span className="text-xs text-muted-foreground">{TYPE_HINT[t.value]}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function LessonCanvas({
  draft,
  setDraft,
  module,
  moduleIndex,
  lessonIndex,
  lessonCount,
  selectedBlockId,
  onSelectBlock,
  seeAs,
  comments,
  editable,
}: {
  draft: LessonDraft;
  setDraft: (fn: (d: LessonDraft) => LessonDraft) => void;
  module?: CourseModule;
  moduleIndex: number;
  lessonIndex: number;
  lessonCount: number;
  selectedBlockId?: ID;
  onSelectBlock: (id: ID | undefined, focusComments?: boolean) => void;
  seeAs: SeeAs;
  comments: CourseComment[];
  editable: boolean;
}) {
  const setBlock = (b: LessonBlock) => setDraft((d) => ({ ...d, blocks: d.blocks.map((x) => (x.id === b.id ? b : x)) }));
  const insert = (at: number, type: LessonBlockType) => {
    const b = newBlock(type);
    setDraft((d) => ({ ...d, blocks: [...d.blocks.slice(0, at), b, ...d.blocks.slice(at)] }));
    onSelectBlock(b.id);
    // Place le curseur dans le premier champ du nouveau bloc.
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-block="${b.id}"] [contenteditable="true"], [data-block="${b.id}"] [contenteditable="plaintext-only"]`);
      el?.focus();
    }, 30);
  };
  const act = (id: ID, what: "up" | "down" | "dup" | "del") =>
    setDraft((d) => {
      const i = d.blocks.findIndex((b) => b.id === id);
      const blocks = [...d.blocks];
      if (what === "up" && i > 0) [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]];
      if (what === "down" && i < blocks.length - 1) [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]];
      if (what === "dup") blocks.splice(i + 1, 0, cloneBlock(blocks[i]));
      if (what === "del") blocks.splice(i, 1);
      return { ...d, blocks };
    });
  const hidden = seeAs === "tous" ? 0 : draft.blocks.filter((b) => b.personas?.length && !b.personas.includes(seeAs)).length;

  return (
    <article
      className="mx-auto w-full max-w-[46rem] rounded-2xl border border-border bg-surface px-5 py-7 shadow-sm sm:px-10 sm:py-9"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelectBlock(undefined);
      }}
    >
      <p className="eyebrow mb-2 text-accent-text">
        Module {String(moduleIndex).padStart(2, "0")}
        {module ? ` · ${module.title}` : ""}
      </p>
      <h1 className="font-display text-[1.9rem] font-bold leading-tight tracking-tight">
        <PlainEditable value={draft.title} onChange={(title) => setDraft((d) => ({ ...d, title }))} placeholder="Titre de la leçon" label="Titre de la leçon" disabled={!editable} className="block" />
      </h1>
      <div className="mt-2 text-[15px] text-muted-foreground">
        <PlainEditable value={draft.summary} onChange={(summary) => setDraft((d) => ({ ...d, summary }))} placeholder="Résumé affiché dans le sommaire (facultatif)" label="Résumé de la leçon" disabled={!editable} multiline className="block" />
      </div>
      <p className="mb-6 mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border pb-5 text-xs text-muted-foreground">
        <span>{formatDuration(draft.estimatedMinutes)}</span>
        <span>
          Leçon {lessonIndex + 1} / {lessonCount}
        </span>
        <span>
          {draft.blocks.length} bloc{draft.blocks.length > 1 ? "s" : ""}
        </span>
        {draft.isPreview ? (
          <span className="inline-flex items-center gap-1 text-accent-text">
            <Eye className="size-3.5" aria-hidden="true" /> Accès libre depuis le catalogue
          </span>
        ) : null}
        {hidden ? <span>{hidden} bloc(s) masqué(s) pour ce profil</span> : null}
      </p>

      {editable ? <Inserter onInsert={(t) => insert(0, t)} alwaysVisible={!draft.blocks.length} /> : null}
      {draft.blocks.map((b, i) => {
        const open = comments.filter((c) => c.blockId === b.id && !c.resolvedAt).length;
        const dimmed = seeAs !== "tous" && Boolean(b.personas?.length) && !b.personas!.includes(seeAs);
        const selected = selectedBlockId === b.id;
        const Icon = BLOCK_ICON[b.type];
        return (
          <React.Fragment key={b.id}>
            <div
              data-block={b.id}
              onClickCapture={() => !selected && onSelectBlock(b.id)}
              onFocusCapture={() => !selected && onSelectBlock(b.id)}
              className={cn(
                "group/blk relative -mx-3 rounded-xl border px-3 py-2 transition-colors sm:-mx-4 sm:px-4",
                selected ? "border-ring bg-accent-soft/40" : "border-transparent hover:border-border-strong",
                dimmed && "opacity-30",
              )}
            >
              <span className={cn("absolute -top-2.5 left-3 z-10 items-center gap-1 rounded-full border border-border-strong bg-surface px-2 py-px text-[10.5px] font-medium text-muted-foreground", selected ? "inline-flex" : "hidden group-hover/blk:inline-flex")}>
                <Icon className="size-3" aria-hidden="true" /> {labelOf(LESSON_BLOCK_TYPES, b.type)}
              </span>
              {editable && selected ? (
                <span className="absolute -top-3.5 right-2 z-10 inline-flex gap-0.5 rounded-lg border border-border-strong bg-surface p-0.5 shadow-sm">
                  {(
                    [
                      ["up", ArrowUp, "Monter le bloc", i === 0],
                      ["down", ArrowDown, "Descendre le bloc", i === draft.blocks.length - 1],
                      ["dup", Copy, "Dupliquer le bloc", false],
                      ["del", Trash2, "Supprimer le bloc", false],
                    ] as const
                  ).map(([k, I, label, dis]) => (
                    <button
                      key={k}
                      type="button"
                      disabled={dis}
                      title={label}
                      aria-label={label}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (k === "del" && !window.confirm("Supprimer ce bloc ?")) return;
                        act(b.id, k);
                        if (k === "del") onSelectBlock(undefined);
                      }}
                      className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
                    >
                      <I className="size-3.5" />
                    </button>
                  ))}
                </span>
              ) : null}
              {open ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBlock(b.id, true);
                  }}
                  title={`${open} commentaire(s) de relecture`}
                  className="absolute -right-2 top-1 z-10 inline-flex items-center gap-0.5 rounded-md bg-warning-soft px-1.5 py-0.5 text-[11px] font-semibold text-warning-text sm:-right-9"
                >
                  <MessageSquare className="size-3" aria-hidden="true" /> {open}
                </button>
              ) : null}
              {b.personas?.length ? (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {b.personas.map((p) => (
                    <span key={p} className="rounded-full bg-violet-soft px-2 py-px text-[10.5px] font-semibold text-violet">
                      {labelOf(PERSONAS, p)}
                    </span>
                  ))}
                </div>
              ) : null}
              <InPlaceBlock block={b} onChange={setBlock} disabled={!editable} />
            </div>
            {editable ? <Inserter onInsert={(t) => insert(i + 1, t)} /> : <div className="h-4" />}
          </React.Fragment>
        );
      })}
    </article>
  );
}
