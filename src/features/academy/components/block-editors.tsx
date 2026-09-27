"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  Library,
  ListChecks,
  MessageSquareCode,
  Plus,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { Badge, Button, Checkbox, FormField, Input, Select, Switch, Textarea } from "@/components/ui";
import { MarkdownEditor } from "@/features/site/components/markdown-editor";
import { useCollection } from "@/lib/hooks";
import { DELIVERABLE_KINDS, LESSON_BLOCK_TYPES, PERSONAS, labelOf } from "@/lib/domain/constants";
import { youtubeId } from "@/lib/domain/academy";
import type { DeliverableKind, LessonBlock, LessonBlockType, Persona, QuizBlock, QuizQuestion } from "@/lib/domain/types";
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
function PersonaChips({ value, onChange, disabled }: { value: Persona[] | undefined; onChange: (v: Persona[] | undefined) => void; disabled?: boolean }) {
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

function linesToList(v: string): string[] {
  return v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/* ───────────────────────────── Éditeurs par type ───────────────────────────── */

function QuizEditor({ block, onChange, disabled }: { block: QuizBlock; onChange: (b: QuizBlock) => void; disabled?: boolean }) {
  const setQ = (i: number, q: QuizQuestion) => onChange({ ...block, questions: block.questions.map((x, j) => (j === i ? q : x)) });
  return (
    <div className="space-y-3">
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
        <FormField label="Titre du quiz">
          <Input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} disabled={disabled} />
        </FormField>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Switch checked={block.graded} onChange={(v) => onChange({ ...block, graded: v })} disabled={disabled} label="Quiz évalué" />
          Évalué (acquis)
        </label>
      </div>
      {block.questions.map((q, i) => (
        <div key={q.id} className="space-y-2 rounded-md border border-border bg-surface-2 p-3">
          <div className="flex items-start gap-2">
            <span className="tabular mt-2 text-xs font-semibold text-muted-foreground">Q{i + 1}</span>
            <Textarea value={q.prompt} onChange={(e) => setQ(i, { ...q, prompt: e.target.value })} className="min-h-12 flex-1" placeholder="Énoncé de la question" disabled={disabled} aria-label={`Énoncé question ${i + 1}`} />
            <Button size="icon-xs" variant="ghost" aria-label="Supprimer la question" disabled={disabled || block.questions.length === 1} onClick={() => onChange({ ...block, questions: block.questions.filter((_, j) => j !== i) })}>
              <Trash2 />
            </Button>
          </div>
          <div className="space-y-1.5 pl-6">
            {q.options.map((o, oi) => (
              <div key={o.id} className="flex items-center gap-2">
                <Checkbox
                  checked={o.correct}
                  disabled={disabled}
                  aria-label="Bonne réponse"
                  title="Bonne réponse"
                  onChange={(e) => {
                    const options = q.options.map((x, k) => (k === oi ? { ...x, correct: e.target.checked } : q.kind === "unique" && e.target.checked ? { ...x, correct: false } : x));
                    setQ(i, { ...q, options });
                  }}
                />
                <Input value={o.label} onChange={(e) => setQ(i, { ...q, options: q.options.map((x, k) => (k === oi ? { ...x, label: e.target.value } : x)) })} className="h-8 flex-1" placeholder={`Réponse ${oi + 1}`} disabled={disabled} aria-label={`Réponse ${oi + 1}`} />
                <Button size="icon-xs" variant="ghost" aria-label="Supprimer la réponse" disabled={disabled || q.options.length <= 2} onClick={() => setQ(i, { ...q, options: q.options.filter((_, k) => k !== oi) })}>
                  <X />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs" variant="ghost" disabled={disabled} onClick={() => setQ(i, { ...q, options: [...q.options, { id: uid("o"), label: "", correct: false }] })}>
                <Plus /> Réponse
              </Button>
              <Select
                aria-label="Type de question"
                className="w-44"
                value={q.kind}
                disabled={disabled}
                onChange={(e) => setQ(i, { ...q, kind: e.target.value as QuizQuestion["kind"] })}
                options={[
                  { value: "unique", label: "Une seule bonne réponse" },
                  { value: "multiple", label: "Plusieurs bonnes réponses" },
                ]}
              />
              {!q.options.some((o) => o.correct) ? <Badge tone="danger">Aucune bonne réponse</Badge> : null}
            </div>
            <Input value={q.explanation ?? ""} onChange={(e) => setQ(i, { ...q, explanation: e.target.value || undefined })} placeholder="Explication affichée après la réponse" disabled={disabled} aria-label="Explication" />
          </div>
        </div>
      ))}
      <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onChange({ ...block, questions: [...block.questions, newQuestion()] })}>
        <Plus /> Question
      </Button>
    </div>
  );
}

function BlockBody({ block, onChange, disabled }: { block: LessonBlock; onChange: (b: LessonBlock) => void; disabled?: boolean }) {
  const resources = useCollection("resources");
  switch (block.type) {
    case "texte":
      return <MarkdownEditor value={block.markdown} onChange={(markdown) => onChange({ ...block, markdown })} disabled={disabled} />;
    case "video": {
      const valid = !block.url || Boolean(youtubeId(block.url));
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <FormField label="Titre">
              <Input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} disabled={disabled} />
            </FormField>
            <FormField label="Durée (min)">
              <Input type="number" min={1} value={block.durationMinutes} onChange={(e) => onChange({ ...block, durationMinutes: Math.max(1, Number(e.target.value) || 1) })} disabled={disabled} />
            </FormField>
          </div>
          <FormField label="Lien YouTube (vidéo non répertoriée)" error={valid ? undefined : "Lien YouTube non reconnu."} hint={block.url ? undefined : "Tant qu'il n'y a pas de lien, la vidéo est masquée pour les apprenants."}>
            <Input value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value.trim() })} placeholder="https://www.youtube.com/watch?v=…" disabled={disabled} />
          </FormField>
          <FormField label="Transcription (accessibilité)">
            <Textarea value={block.transcript ?? ""} onChange={(e) => onChange({ ...block, transcript: e.target.value || undefined })} className="min-h-16" disabled={disabled} />
          </FormField>
          <FormField label="Script de tournage (interne)" hint="Non visible par les apprenants.">
            <Textarea value={block.script ?? ""} onChange={(e) => onChange({ ...block, script: e.target.value || undefined })} className="min-h-20 font-mono text-xs" disabled={disabled} />
          </FormField>
        </div>
      );
    }
    case "quiz":
      return <QuizEditor block={block} onChange={onChange} disabled={disabled} />;
    case "exercice":
      return (
        <div className="space-y-3">
          <FormField label="Titre">
            <Input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} disabled={disabled} />
          </FormField>
          <FormField label="Consigne">
            <MarkdownEditor value={block.instructions} onChange={(instructions) => onChange({ ...block, instructions })} disabled={disabled} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Livrable">
              <Select value={block.deliverable} onChange={(e) => onChange({ ...block, deliverable: e.target.value as DeliverableKind })} options={DELIVERABLE_KINDS} disabled={disabled} />
            </FormField>
            <FormField label="Correction">
              <Select
                value={block.review}
                onChange={(e) => onChange({ ...block, review: e.target.value as "formateur" | "auto" })}
                options={[
                  { value: "formateur", label: "Par un formateur" },
                  { value: "auto", label: "Validé à la remise" },
                ]}
                disabled={disabled}
              />
            </FormField>
            <FormField label="Durée estimée (min)">
              <Input type="number" min={1} value={block.estimatedMinutes} onChange={(e) => onChange({ ...block, estimatedMinutes: Math.max(1, Number(e.target.value) || 1) })} disabled={disabled} />
            </FormField>
          </div>
          <FormField label="Critères de réussite (un par ligne)">
            <Textarea key={block.rubric.join("|")} defaultValue={block.rubric.join("\n")} onBlur={(e) => onChange({ ...block, rubric: linesToList(e.target.value) })} className="min-h-20" disabled={disabled} />
          </FormField>
        </div>
      );
    case "ressource": {
      const r = resources.find((x) => x.id === block.resourceId);
      return (
        <div className="space-y-3">
          <FormField label="Ressource de la bibliothèque" error={block.resourceId && !r ? "Ressource introuvable (supprimée ?)." : undefined}>
            <Select value={block.resourceId} onChange={(e) => onChange({ ...block, resourceId: e.target.value })} placeholder="Choisir…" options={resources.map((x) => ({ value: x.id, label: `${x.title} (${x.format})` }))} disabled={disabled} />
          </FormField>
          {r && r.visibility === "interne" ? <p className="text-xs text-warning-text">Cette ressource est « interne » : passez-la en « participants » dans la bibliothèque pour la rendre téléchargeable.</p> : null}
          <FormField label="Note pour l'apprenant">
            <Input value={block.note ?? ""} onChange={(e) => onChange({ ...block, note: e.target.value || undefined })} disabled={disabled} />
          </FormField>
        </div>
      );
    }
    case "prompt":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <FormField label="Titre">
              <Input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} disabled={disabled} />
            </FormField>
            <FormField label="Outil">
              <Input list="academy-prompt-tools" value={block.tool} onChange={(e) => onChange({ ...block, tool: e.target.value })} disabled={disabled} />
              <datalist id="academy-prompt-tools">
                {PROMPT_TOOLS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </FormField>
          </div>
          <FormField label="Prompt (copié tel quel par l'apprenant)">
            <Textarea value={block.prompt} onChange={(e) => onChange({ ...block, prompt: e.target.value })} className="min-h-32 font-mono text-xs" disabled={disabled} />
          </FormField>
          <FormField label="Conseils d'utilisation">
            <Textarea value={block.tips ?? ""} onChange={(e) => onChange({ ...block, tips: e.target.value || undefined })} className="min-h-12" disabled={disabled} />
          </FormField>
        </div>
      );
    case "checklist":
      return (
        <div className="space-y-3">
          <FormField label="Titre">
            <Input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} disabled={disabled} />
          </FormField>
          <div className="space-y-1.5">
            {block.items.map((it, i) => (
              <div key={it.id} className="flex items-center gap-2">
                <ListChecks className="size-4 text-faint" aria-hidden="true" />
                <Input value={it.label} onChange={(e) => onChange({ ...block, items: block.items.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} className="h-8" disabled={disabled} aria-label={`Élément ${i + 1}`} />
                <Button size="icon-xs" variant="ghost" aria-label="Supprimer l'élément" disabled={disabled || block.items.length <= 1} onClick={() => onChange({ ...block, items: block.items.filter((_, k) => k !== i) })}>
                  <X />
                </Button>
              </div>
            ))}
            <Button size="xs" variant="ghost" disabled={disabled} onClick={() => onChange({ ...block, items: [...block.items, { id: uid("itm"), label: "" }] })}>
              <Plus /> Élément
            </Button>
          </div>
        </div>
      );
  }
}

/** Résumé d'un bloc replié. */
function blockSummary(b: LessonBlock): string {
  switch (b.type) {
    case "texte":
      return b.markdown.replace(/[#>*`_[\]()-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 110) || "Texte vide";
    case "video":
      return `${b.title || "Sans titre"} · ${b.durationMinutes} min${b.url ? "" : " · à tourner"}`;
    case "quiz":
      return `${b.title} · ${b.questions.length} question${b.questions.length > 1 ? "s" : ""}${b.graded ? " · évalué" : ""}`;
    case "exercice":
      return `${b.title || "Sans titre"} · ${b.estimatedMinutes} min · ${labelOf(DELIVERABLE_KINDS, b.deliverable)}`;
    case "ressource":
      return b.note ?? "Ressource de la bibliothèque";
    case "prompt":
      return `${b.title || "Sans titre"} · ${b.tool}`;
    case "checklist":
      return `${b.title || "Sans titre"} · ${b.items.length} éléments`;
  }
}

/** Carte d'un bloc dans l'éditeur de leçon. */
export function BlockCard({
  block,
  index,
  count,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
  disabled,
  defaultOpen,
}: {
  block: LessonBlock;
  index: number;
  count: number;
  onChange: (b: LessonBlock) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  disabled?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(Boolean(defaultOpen));
  const Icon = BLOCK_ICON[block.type];
  return (
    <div className={cn("rounded-lg border bg-surface shadow-sm", block.personas?.length ? "border-violet/40" : "border-border")}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={open}>
          {open ? <ChevronDown className="size-4 shrink-0 text-faint" aria-hidden="true" /> : <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden="true" />}
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground">
            <Icon className="size-4" />
          </span>
          <span className="shrink-0 text-sm font-medium">{labelOf(LESSON_BLOCK_TYPES, block.type)}</span>
          {!open ? <span className="min-w-0 truncate text-xs text-muted-foreground">{blockSummary(block)}</span> : null}
        </button>
        {block.personas?.length ? (
          <span className="flex gap-1">
            {block.personas.map((p) => (
              <Badge key={p} tone="violet" className="text-[10px]">
                {labelOf(PERSONAS, p)}
              </Badge>
            ))}
          </span>
        ) : null}
        <div className="flex shrink-0 items-center">
          <Button size="icon-xs" variant="ghost" aria-label="Monter le bloc" disabled={disabled || index === 0} onClick={() => onMove(-1)}>
            <ArrowUp />
          </Button>
          <Button size="icon-xs" variant="ghost" aria-label="Descendre le bloc" disabled={disabled || index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown />
          </Button>
          <Button size="icon-xs" variant="ghost" aria-label="Dupliquer le bloc (variante)" disabled={disabled} onClick={onDuplicate}>
            <Copy />
          </Button>
          <Button size="icon-xs" variant="ghost" aria-label="Supprimer le bloc" disabled={disabled} onClick={onRemove}>
            <Trash2 />
          </Button>
        </div>
      </div>
      {open ? (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <PersonaChips value={block.personas} onChange={(personas) => onChange({ ...block, personas })} disabled={disabled} />
          <BlockBody block={block} onChange={onChange} disabled={disabled} />
        </div>
      ) : null}
    </div>
  );
}

/** Copie d'un bloc avec de nouveaux identifiants (variante pour un autre profil). */
export function cloneBlock(b: LessonBlock): LessonBlock {
  const copy = JSON.parse(JSON.stringify(b)) as LessonBlock;
  copy.id = uid("blk");
  if (copy.type === "quiz") copy.questions = copy.questions.map((q) => ({ ...q, id: uid("q"), options: q.options.map((o) => ({ ...o, id: uid("o") })) }));
  if (copy.type === "checklist") copy.items = copy.items.map((i) => ({ ...i, id: uid("itm") }));
  return copy;
}

export { PersonaChips };
