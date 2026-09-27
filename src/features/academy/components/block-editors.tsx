"use client";

/** Types de blocs de leçon : icônes, création, copie et choix des profils (utilisés par le Studio). */
import * as React from "react";
import { CheckSquare, ClipboardList, FileText, Library, ListChecks, MessageSquareCode, Video } from "lucide-react";
import { PERSONAS } from "@/lib/domain/constants";
import type { LessonBlock, LessonBlockType, Persona, QuizQuestion } from "@/lib/domain/types";
import { cn, uid } from "@/lib/utils";

export const BLOCK_ICON: Record<LessonBlockType, React.ComponentType<{ className?: string }>> = {
  texte: FileText,
  video: Video,
  quiz: CheckSquare,
  exercice: ClipboardList,
  ressource: Library,
  prompt: MessageSquareCode,
  checklist: ListChecks,
};

export const PROMPT_TOOLS = ["Tout assistant IA", "Claude", "ChatGPT", "Claude Code", "Codex", "Cursor", "Bolt.new", "Claude Cowork", "Gamma"];

/** Nouveau bloc vide d'un type donné. */
export function newBlock(type: LessonBlockType): LessonBlock {
  const id = uid("blk");
  switch (type) {
    case "texte":
      return { id, type, markdown: "" };
    case "video":
      return { id, type, title: "", url: "", durationMinutes: 5 };
    case "quiz":
      return { id, type, title: "Vérifiez vos acquis", graded: false, questions: [newQuestion()] };
    case "exercice":
      return { id, type, title: "", instructions: "", deliverable: "texte", estimatedMinutes: 30, review: "formateur", rubric: [] };
    case "ressource":
      return { id, type, resourceId: "" };
    case "prompt":
      return { id, type, title: "", tool: "Claude", prompt: "" };
    case "checklist":
      return { id, type, title: "", items: [{ id: uid("itm"), label: "" }] };
  }
}

function newQuestion(): QuizQuestion {
  return { id: uid("q"), prompt: "", kind: "unique", options: [{ id: uid("o"), label: "", correct: true }, { id: uid("o"), label: "", correct: false }] };
}

/** Choix des profils qui voient le bloc (hyper-personnalisation). */
export function PersonaChips({ value, onChange, disabled }: { value: Persona[] | undefined; onChange: (v: Persona[] | undefined) => void; disabled?: boolean }) {
  const current = value ?? [];
  const toggle = (p: Persona) => {
    const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
    onChange(next.length ? next : undefined);
  };
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Profils qui voient ce bloc">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(undefined)}
        className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", !current.length ? "border-primary bg-accent-soft text-accent-text" : "border-border text-muted-foreground hover:text-foreground")}
        aria-pressed={!current.length}
      >
        Tous les profils
      </button>
      {PERSONAS.map((p) => (
        <button
          key={p.value}
          type="button"
          disabled={disabled}
          onClick={() => toggle(p.value)}
          aria-pressed={current.includes(p.value)}
          className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", current.includes(p.value) ? "border-violet bg-violet-soft text-violet" : "border-border text-muted-foreground hover:text-foreground")}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function cloneBlock(b: LessonBlock): LessonBlock {
  const copy = JSON.parse(JSON.stringify(b)) as LessonBlock;
  copy.id = uid("blk");
  if (copy.type === "quiz") copy.questions = copy.questions.map((q) => ({ ...q, id: uid("q"), options: q.options.map((o) => ({ ...o, id: uid("o") })) }));
  if (copy.type === "checklist") copy.items = copy.items.map((i) => ({ ...i, id: uid("itm") }));
  return copy;
}

