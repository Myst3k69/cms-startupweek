"use client";

import * as React from "react";
import { Check, Copy, ExternalLink, Plus, X } from "lucide-react";
import { useEntity } from "@/lib/hooks";
import { DELIVERABLE_KINDS, labelOf } from "@/lib/domain/constants";
import { youtubeEmbedUrl } from "@/lib/domain/academy";
import type { ChecklistBlock, ExerciseBlock, LessonBlock, PromptBlock, QuizBlock, QuizQuestion, ResourceBlock, VideoBlock } from "@/lib/domain/types";
import { cn, uid } from "@/lib/utils";
import { BLOCK_ICON } from "@/features/academy/components/block-editors";
import { PlainEditable, RichEditable } from "./editable";

type Props<B extends LessonBlock> = { block: B; onChange: (b: B) => void; disabled: boolean };

/** En-tête discret des blocs « carte » (vidéo, quiz, exercice…), comme dans Mon espace. */
function CardHead({ type, children, extra }: { type: LessonBlock["type"]; children: React.ReactNode; extra?: React.ReactNode }) {
  const Icon = BLOCK_ICON[type];
  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-accent-text">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="eyebrow text-accent-text">{children}</span>
      {extra ? <span className="ml-auto flex items-center gap-2">{extra}</span> : null}
    </div>
  );
}

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cn("overflow-hidden rounded-xl border border-border bg-surface", className)}>{children}</div>;

const Warn = ({ children }: { children: React.ReactNode }) => <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-warning-text">{children}</span>;

/* ───────────────────────────── Types de blocs ───────────────────────────── */

function VideoInPlace({ block, onChange, disabled }: Props<VideoBlock>) {
  const embed = youtubeEmbedUrl(block.url);
  return (
    <Card>
      <CardHead type="video" extra={!block.url.trim() ? <Warn>Lien à ajouter</Warn> : !embed ? <Warn>Lien non reconnu</Warn> : null}>
        Vidéo · {block.durationMinutes} min
      </CardHead>
      <div className="space-y-3 p-4">
        <PlainEditable value={block.title} onChange={(title) => onChange({ ...block, title })} placeholder="Titre de la vidéo" label="Titre de la vidéo" disabled={disabled} className="block text-base font-semibold" />
        {embed ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            <iframe src={embed} title={block.title || "Vidéo"} className="absolute inset-0 size-full" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
          </div>
        ) : (
          <div className="grid aspect-video w-full place-items-center rounded-lg bg-[repeating-linear-gradient(135deg,var(--surface-2)_0_12px,var(--surface-3)_12px_24px)] p-4 text-center text-sm text-muted-foreground">
            <div className="max-w-md">
              <p className="font-medium text-foreground">Vidéo à tourner</p>
              <p>Collez le lien YouTube dans les réglages à droite. D&apos;ici là, ce bloc est masqué pour les apprenants.</p>
            </div>
          </div>
        )}
        {block.script?.trim() ? (
          <details className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Plan de tournage (visible par l&apos;équipe)</summary>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{block.script}</p>
          </details>
        ) : null}
      </div>
    </Card>
  );
}

function QuizInPlace({ block, onChange, disabled }: Props<QuizBlock>) {
  const setQ = (i: number, q: QuizQuestion) => onChange({ ...block, questions: block.questions.map((x, j) => (j === i ? q : x)) });
  const toggleCorrect = (q: QuizQuestion, qi: number, oi: number) =>
    setQ(qi, { ...q, options: q.options.map((o, k) => (q.kind === "unique" ? { ...o, correct: k === oi } : k === oi ? { ...o, correct: !o.correct } : o)) });
  return (
    <Card>
      <CardHead type="quiz" extra={<span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground">{block.questions.length} question{block.questions.length > 1 ? "s" : ""}</span>}>
        {block.graded ? "Évaluation notée" : "Quiz d'auto-évaluation"}
      </CardHead>
      <div className="space-y-5 p-4">
        <PlainEditable value={block.title} onChange={(title) => onChange({ ...block, title })} placeholder="Titre du quiz" label="Titre du quiz" disabled={disabled} className="block font-semibold" />
        {block.questions.map((q, qi) => (
          <fieldset key={q.id} className="group/q space-y-2">
            <legend className="flex w-full items-start gap-2">
              <span className="tabular mt-px shrink-0 text-sm font-semibold text-muted-foreground">{qi + 1}.</span>
              <PlainEditable value={q.prompt} onChange={(prompt) => setQ(qi, { ...q, prompt })} placeholder="Énoncé de la question" label={`Énoncé de la question ${qi + 1}`} disabled={disabled} multiline className="block flex-1 font-medium" />
              {!disabled && block.questions.length > 1 ? (
                <button type="button" onClick={() => onChange({ ...block, questions: block.questions.filter((_, j) => j !== qi) })} className="invisible rounded p-0.5 text-faint hover:text-danger-text group-hover/q:visible" aria-label={`Supprimer la question ${qi + 1}`}>
                  <X className="size-4" />
                </button>
              ) : null}
            </legend>
            <ul className="space-y-1.5">
              {q.options.map((o, oi) => (
                <li key={o.id} className={cn("group/o flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm", o.correct ? "border-success/40 bg-success-soft" : "border-border")}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleCorrect(q, qi, oi)}
                    aria-pressed={o.correct}
                    aria-label={o.correct ? "Bonne réponse (cliquer pour changer)" : "Marquer comme bonne réponse"}
                    title={o.correct ? "Bonne réponse" : "Marquer comme bonne réponse"}
                    className={cn("grid size-4 shrink-0 place-items-center border-[1.5px] text-surface", q.kind === "unique" ? "rounded-full" : "rounded", o.correct ? "border-success bg-success" : "border-border-strong hover:border-success")}
                  >
                    {o.correct ? <Check className="size-3" strokeWidth={3} /> : null}
                  </button>
                  <PlainEditable value={o.label} onChange={(label) => setQ(qi, { ...q, options: q.options.map((x, k) => (k === oi ? { ...x, label } : x)) })} placeholder="Réponse" label={`Réponse ${oi + 1} de la question ${qi + 1}`} disabled={disabled} className="block min-w-0 flex-1" onEnter={() => setQ(qi, { ...q, options: [...q.options, { id: uid("o"), label: "", correct: false }] })} />
                  {!disabled && q.options.length > 2 ? (
                    <button type="button" onClick={() => setQ(qi, { ...q, options: q.options.filter((_, k) => k !== oi) })} className="invisible rounded p-0.5 text-faint hover:text-danger-text group-hover/o:visible" aria-label={`Supprimer la réponse ${oi + 1}`}>
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3 pl-1">
              {!disabled ? (
                <button type="button" onClick={() => setQ(qi, { ...q, options: [...q.options, { id: uid("o"), label: "", correct: false }] })} className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">
                  <Plus className="size-3.5" /> Réponse
                </button>
              ) : null}
            </div>
            <div className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted-foreground">
              <span className="mr-1 text-xs font-medium">Explication :</span>
              <PlainEditable value={q.explanation ?? ""} onChange={(explanation) => setQ(qi, { ...q, explanation: explanation || undefined })} placeholder="affichée après la réponse (facultatif)" label={`Explication de la question ${qi + 1}`} disabled={disabled} multiline />
            </div>
          </fieldset>
        ))}
        {!disabled ? (
          <button
            type="button"
            onClick={() => onChange({ ...block, questions: [...block.questions, { id: uid("q"), prompt: "", kind: "unique", options: [{ id: uid("o"), label: "", correct: true }, { id: uid("o"), label: "", correct: false }] }] })}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent-text hover:underline"
          >
            <Plus className="size-4" /> Ajouter une question
          </button>
        ) : null}
      </div>
    </Card>
  );
}

function ExerciseInPlace({ block, onChange, disabled }: Props<ExerciseBlock>) {
  return (
    <Card>
      <CardHead type="exercice" extra={<span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground">{block.estimatedMinutes} min · {labelOf(DELIVERABLE_KINDS, block.deliverable)}</span>}>
        Exercice{block.review === "formateur" && block.deliverable !== "aucun" ? " · corrigé par un formateur" : ""}
      </CardHead>
      <div className="space-y-3 p-4">
        <PlainEditable value={block.title} onChange={(title) => onChange({ ...block, title })} placeholder="Titre de l'exercice" label="Titre de l'exercice" disabled={disabled} className="block text-base font-semibold" />
        <RichEditable markdown={block.instructions} onChange={(instructions) => onChange({ ...block, instructions })} placeholder="Consigne : ce que l'apprenant doit produire, étape par étape." label="Consigne de l'exercice" disabled={disabled} />
        <div className="rounded-lg bg-surface-2 p-3 text-sm">
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Critères de réussite</p>
          <ul className="space-y-1">
            {block.rubric.map((r, i) => (
              <li key={i} className="group/r flex items-start gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-faint" aria-hidden="true" />
                <PlainEditable value={r} onChange={(v) => onChange({ ...block, rubric: block.rubric.map((x, k) => (k === i ? v : x)) })} placeholder="Critère" label={`Critère ${i + 1}`} disabled={disabled} className="block min-w-0 flex-1" onEnter={() => onChange({ ...block, rubric: [...block.rubric, ""] })} />
                {!disabled ? (
                  <button type="button" onClick={() => onChange({ ...block, rubric: block.rubric.filter((_, k) => k !== i) })} className="invisible rounded p-0.5 text-faint hover:text-danger-text group-hover/r:visible" aria-label={`Supprimer le critère ${i + 1}`}>
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {!disabled ? (
            <button type="button" onClick={() => onChange({ ...block, rubric: [...block.rubric, ""] })} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">
              <Plus className="size-3.5" /> Critère
            </button>
          ) : null}
        </div>
        {block.deliverable !== "aucun" ? <div className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-sm text-faint">Zone de réponse de l&apos;apprenant ({labelOf(DELIVERABLE_KINDS, block.deliverable).toLowerCase()})</div> : null}
      </div>
    </Card>
  );
}

function ResourceInPlace({ block }: Props<ResourceBlock>) {
  const res = useEntity("resources", block.resourceId || undefined);
  return (
    <Card>
      <CardHead type="ressource" extra={!res ? <Warn>Ressource à choisir</Warn> : null}>
        Ressource
      </CardHead>
      <div className="flex items-center gap-3 p-4 text-sm">
        {res ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{res.title}</p>
              <p className="line-clamp-2 text-muted-foreground">{block.note || res.description}</p>
            </div>
            <a href={res.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-accent-text hover:underline">
              Ouvrir <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </>
        ) : (
          <p className="text-muted-foreground">Choisissez un fichier de la bibliothèque Ressources dans les réglages à droite.</p>
        )}
      </div>
    </Card>
  );
}

function PromptInPlace({ block, onChange, disabled }: Props<PromptBlock>) {
  return (
    <Card>
      <CardHead type="prompt" extra={<span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground">{block.tool}</span>}>
        Prompt à copier
      </CardHead>
      <div className="space-y-3 p-4">
        <PlainEditable value={block.title} onChange={(title) => onChange({ ...block, title })} placeholder="Titre du prompt" label="Titre du prompt" disabled={disabled} className="block font-semibold" />
        <div className="relative rounded-lg bg-surface-2 p-3 pr-20 font-mono text-[12.5px] leading-relaxed">
          <PlainEditable value={block.prompt} onChange={(prompt) => onChange({ ...block, prompt })} placeholder="Rôle : … · Contexte : … · Tâche : …" label="Texte du prompt" disabled={disabled} multiline className="block" />
          <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 font-sans text-[11px] text-muted-foreground">
            <Copy className="size-3" aria-hidden="true" /> Copier
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="mr-1 text-xs font-medium">Conseil :</span>
          <PlainEditable value={block.tips ?? ""} onChange={(tips) => onChange({ ...block, tips: tips || undefined })} placeholder="comment adapter ce prompt (facultatif)" label="Conseil d'utilisation" disabled={disabled} multiline />
        </div>
      </div>
    </Card>
  );
}

function ChecklistInPlace({ block, onChange, disabled }: Props<ChecklistBlock>) {
  const add = () => onChange({ ...block, items: [...block.items, { id: uid("itm"), label: "" }] });
  return (
    <Card>
      <CardHead type="checklist">Checklist</CardHead>
      <div className="space-y-2 p-4">
        <PlainEditable value={block.title} onChange={(title) => onChange({ ...block, title })} placeholder="Titre de la checklist" label="Titre de la checklist" disabled={disabled} className="block font-semibold" />
        <ul className="space-y-1">
          {block.items.map((it, i) => (
            <li key={it.id} className="group/i flex items-start gap-2.5 text-sm">
              <span className="mt-1 size-4 shrink-0 rounded border-[1.5px] border-border-strong" aria-hidden="true" />
              <PlainEditable value={it.label} onChange={(label) => onChange({ ...block, items: block.items.map((x, k) => (k === i ? { ...x, label } : x)) })} placeholder="Étape" label={`Étape ${i + 1}`} disabled={disabled} className="block min-w-0 flex-1" onEnter={add} />
              {!disabled && block.items.length > 1 ? (
                <button type="button" onClick={() => onChange({ ...block, items: block.items.filter((_, k) => k !== i) })} className="invisible rounded p-0.5 text-faint hover:text-danger-text group-hover/i:visible" aria-label={`Supprimer l'étape ${i + 1}`}>
                  <X className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {!disabled ? (
          <button type="button" onClick={add} className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">
            <Plus className="size-3.5" /> Étape
          </button>
        ) : null}
      </div>
    </Card>
  );
}

/** Un bloc tel que l'apprenant le verra, éditable sur place. */
export function InPlaceBlock({ block, onChange, disabled }: { block: LessonBlock; onChange: (b: LessonBlock) => void; disabled: boolean }) {
  switch (block.type) {
    case "texte":
      return <RichEditable markdown={block.markdown} onChange={(markdown) => onChange({ ...block, markdown })} placeholder="Écrivez ici. Sélectionnez un mot pour le mettre en forme." label="Texte de la leçon" disabled={disabled} />;
    case "video":
      return <VideoInPlace block={block} onChange={onChange} disabled={disabled} />;
    case "quiz":
      return <QuizInPlace block={block} onChange={onChange} disabled={disabled} />;
    case "exercice":
      return <ExerciseInPlace block={block} onChange={onChange} disabled={disabled} />;
    case "ressource":
      return <ResourceInPlace block={block} onChange={onChange} disabled={disabled} />;
    case "prompt":
      return <PromptInPlace block={block} onChange={onChange} disabled={disabled} />;
    case "checklist":
      return <ChecklistInPlace block={block} onChange={onChange} disabled={disabled} />;
  }
}
