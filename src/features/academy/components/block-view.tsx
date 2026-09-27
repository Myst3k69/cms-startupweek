"use client";

import * as React from "react";
import { Check, CheckCircle2, ClipboardCopy, Download, ExternalLink, Info, MessageSquareCode, Send, Video, XCircle } from "lucide-react";
import { Button, Input, Textarea } from "@/components/ui";
import { MarkdownPreview } from "@/features/site/components/markdown-preview";
import { useEntity } from "@/lib/hooks";
import { gradeQuiz, youtubeEmbedUrl, type QuizResult } from "@/lib/domain/academy";
import { DELIVERABLE_KINDS, labelOf } from "@/lib/domain/constants";
import type { ChecklistBlock, ExerciseBlock, LessonBlock, PromptBlock, QuizBlock, ResourceBlock, VideoBlock } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import type { AcademyDa } from "../lib/da";

/** Carte d'activité selon la direction artistique. */
function Panel({ da, className, children, label }: { da: AcademyDa; className?: string; children: React.ReactNode; label?: string }) {
  return (
    <section
      aria-label={label}
      className={cn(
        "rounded-da",
        da === "neon" && "border border-da-line bg-da-card p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.2)] sm:p-5",
        da === "campus" && "border-y border-da-line py-5",
        da === "atelier" && "border border-da-line bg-da-card p-3 sm:p-4",
        className,
      )}
    >
      {children}
    </section>
  );
}

function Kicker({ da, icon: Icon, children }: { da: AcademyDa; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className={cn("mb-2 flex items-center gap-1.5 text-da-accent", da === "atelier" ? "font-mono text-[11px] uppercase tracking-wider" : "eyebrow")}>
      <Icon className="size-3.5" aria-hidden="true" />
      {children}
    </div>
  );
}

function VideoView({ block, da, preview }: { block: VideoBlock; da: AcademyDa; preview: boolean }) {
  const src = youtubeEmbedUrl(block.url);
  if (!src) {
    return preview ? (
      <Panel da={da} label="Vidéo">
        <Kicker da={da} icon={Video}>
          Vidéo · {block.durationMinutes} min
        </Kicker>
        <p className="font-medium text-da-ink">{block.title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-da-muted">
          <Info className="size-3.5" aria-hidden="true" /> Pas encore de lien YouTube : ce bloc est masqué pour les apprenants.
        </p>
      </Panel>
    ) : null;
  }
  return (
    <Panel da={da} label="Vidéo" className={da === "campus" ? "" : "p-0 sm:p-0 overflow-hidden"}>
      <div className="aspect-video w-full bg-black">
        <iframe src={src} title={block.title} className="size-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
      </div>
      <div className={cn(da !== "campus" && "p-3")}>
        <p className="text-sm font-medium text-da-ink">{block.title}</p>
        {block.transcript ? (
          <details className="mt-1 text-sm text-da-muted">
            <summary className="cursor-pointer text-xs">Transcription</summary>
            <p className="mt-2 whitespace-pre-wrap">{block.transcript}</p>
          </details>
        ) : null}
      </div>
    </Panel>
  );
}

function QuizView({ block, da, onScore }: { block: QuizBlock; da: AcademyDa; onScore?: (score: number) => void }) {
  const [answers, setAnswers] = React.useState<Record<string, string[]>>({});
  const [result, setResult] = React.useState<QuizResult | null>(null);
  const pick = (qid: string, oid: string, multiple: boolean) => {
    if (result) return;
    setAnswers((a) => {
      const cur = a[qid] ?? [];
      return { ...a, [qid]: multiple ? (cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid]) : [oid] };
    });
  };
  const complete = block.questions.every((q) => (answers[q.id] ?? []).length > 0);
  return (
    <Panel da={da} label={block.title}>
      <Kicker da={da} icon={CheckCircle2}>
        {block.graded ? "Évaluation" : "Quiz"} · {block.questions.length} question{block.questions.length > 1 ? "s" : ""}
      </Kicker>
      <h3 className={cn("mb-4 text-da-ink", da === "campus" ? "font-da-title text-xl" : "font-da-title text-base font-semibold")}>{block.title}</h3>
      <ol className="space-y-5">
        {block.questions.map((q, i) => {
          const detail = result?.details.find((d) => d.questionId === q.id);
          return (
            <li key={q.id}>
              <p className="mb-2 text-sm font-medium text-da-ink">
                {i + 1}. {q.prompt}
                {q.kind === "multiple" ? <span className="ml-1 text-xs font-normal text-da-muted">(plusieurs réponses)</span> : null}
              </p>
              <div className="grid gap-1.5" role={q.kind === "multiple" ? "group" : "radiogroup"} aria-label={`Question ${i + 1}`}>
                {q.options.map((o) => {
                  const chosen = (answers[q.id] ?? []).includes(o.id);
                  const expected = detail?.expected.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role={q.kind === "multiple" ? "checkbox" : "radio"}
                      aria-checked={chosen}
                      onClick={() => pick(q.id, o.id, q.kind === "multiple")}
                      className={cn(
                        "flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-left text-sm transition-colors",
                        !result && chosen && "border-da-accent bg-da-accent-soft text-da-ink",
                        !result && !chosen && "border-da-line text-da-ink hover:bg-da-card-2",
                        result && expected && "border-success bg-success-soft text-da-ink",
                        result && chosen && !expected && "border-danger bg-danger-soft text-da-ink",
                        result && !chosen && !expected && "border-da-line text-da-muted",
                      )}
                    >
                      <span className={cn("inline-flex size-4 shrink-0 items-center justify-center border", q.kind === "multiple" ? "rounded" : "rounded-full", chosen ? "border-da-accent bg-da-accent text-da-accent-ink" : "border-da-line")}>
                        {chosen ? <Check className="size-3" aria-hidden="true" /> : null}
                      </span>
                      {o.label}
                      {result && expected ? <span className="sr-only"> (bonne réponse)</span> : null}
                    </button>
                  );
                })}
              </div>
              {detail ? (
                <p className={cn("mt-2 flex items-start gap-1.5 text-xs", detail.correct ? "text-success-text" : "text-danger-text")}>
                  {detail.correct ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> : <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />}
                  <span>
                    {detail.correct ? "Bonne réponse." : "Réponse incorrecte."} {q.explanation ? <span className="text-da-muted">{q.explanation}</span> : null}
                  </span>
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {result ? (
          <>
            <span className="tabular text-sm font-semibold text-da-ink">
              Score : {result.score} % ({result.correct}/{result.total})
            </span>
            <Button size="sm" variant="ghost" onClick={() => (setResult(null), setAnswers({}))}>
              Recommencer
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            disabled={!complete}
            className="bg-da-accent text-da-accent-ink hover:bg-da-accent/90"
            onClick={() => {
              const r = gradeQuiz(block, answers);
              setResult(r);
              onScore?.(r.score);
            }}
          >
            Valider mes réponses
          </Button>
        )}
      </div>
    </Panel>
  );
}

function ExerciseView({ block, da, preview }: { block: ExerciseBlock; da: AcademyDa; preview: boolean }) {
  const [text, setText] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [sent, setSent] = React.useState(false);
  return (
    <Panel da={da} label={block.title}>
      <Kicker da={da} icon={Send}>
        Mise en pratique · {block.estimatedMinutes} min · {labelOf(DELIVERABLE_KINDS, block.deliverable)}
      </Kicker>
      <h3 className={cn("mb-3 text-da-ink", da === "campus" ? "font-da-title text-xl" : "font-da-title text-base font-semibold")}>{block.title}</h3>
      <MarkdownPreview source={block.instructions} />
      {block.rubric.length ? (
        <div className="mt-3 rounded-md bg-da-card-2 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold text-da-muted">Critères de réussite</p>
          <ul className="list-disc space-y-0.5 pl-5 text-da-ink">
            {block.rubric.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {block.deliverable !== "aucun" ? (
        sent ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-success-text">
            <CheckCircle2 className="size-4" aria-hidden="true" /> {block.review === "formateur" ? "Livrable remis : votre formateur vous répond sous 48 h ouvrées." : "Livrable remis."}
            {preview ? <span className="text-da-muted"> (aperçu : rien n&apos;est enregistré)</span> : null}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {block.deliverable === "texte" ? <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre réponse…" aria-label="Votre réponse" className="min-h-24" /> : null}
            {block.deliverable === "lien" || block.deliverable === "fichier" ? (
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={block.deliverable === "lien" ? "https://…" : "Lien de partage du fichier (Drive, Notion…)"} aria-label="Lien du livrable" />
            ) : null}
            <Button size="sm" disabled={!text.trim() && !url.trim()} onClick={() => setSent(true)} className="bg-da-accent text-da-accent-ink hover:bg-da-accent/90">
              <Send /> Remettre
            </Button>
          </div>
        )
      ) : null}
    </Panel>
  );
}

function ResourceView({ block, da }: { block: ResourceBlock; da: AcademyDa }) {
  const r = useEntity("resources", block.resourceId);
  if (!r) return null;
  return (
    <Panel da={da} label={r.title}>
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-da-accent-soft font-mono text-[10px] font-semibold uppercase text-da-accent">{r.format}</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-da-ink">{r.title}</p>
          <p className="text-sm text-da-muted">{block.note ?? r.description}</p>
        </div>
        <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-md border border-da-line px-2.5 py-1.5 text-xs font-medium text-da-ink hover:bg-da-card-2">
          {r.format === "lien" || r.format === "notion" || r.format === "figma" ? <ExternalLink className="size-3.5" aria-hidden="true" /> : <Download className="size-3.5" aria-hidden="true" />}
          Ouvrir
        </a>
      </div>
    </Panel>
  );
}

function PromptView({ block, da }: { block: PromptBlock; da: AcademyDa }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Panel da={da} label={block.title}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Kicker da={da} icon={MessageSquareCode}>
          Prompt · {block.tool}
        </Kicker>
        <Button
          size="xs"
          variant="ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(block.prompt);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            } catch {
              /* presse-papiers indisponible */
            }
          }}
        >
          {copied ? <Check /> : <ClipboardCopy />} {copied ? "Copié" : "Copier"}
        </Button>
      </div>
      <p className="mb-2 font-medium text-da-ink">{block.title}</p>
      <pre className={cn("whitespace-pre-wrap break-words rounded-md p-3 font-mono text-xs leading-relaxed", da === "neon" ? "bg-black/60 text-da-accent" : "bg-da-card-2 text-da-ink")}>{block.prompt}</pre>
      {block.tips ? <p className="mt-2 text-xs text-da-muted">{block.tips}</p> : null}
    </Panel>
  );
}

function ChecklistView({ block, da, checked, onToggle }: { block: ChecklistBlock; da: AcademyDa; checked: string[]; onToggle: (id: string) => void }) {
  const done = block.items.filter((i) => checked.includes(i.id)).length;
  return (
    <Panel da={da} label={block.title}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-medium text-da-ink">{block.title}</p>
        <span className="tabular text-xs text-da-muted">
          {done}/{block.items.length}
        </span>
      </div>
      <ul className="space-y-1">
        {block.items.map((it) => (
          <li key={it.id}>
            <label className="flex min-h-8 cursor-pointer items-start gap-2 text-sm text-da-ink">
              <input type="checkbox" checked={checked.includes(it.id)} onChange={() => onToggle(it.id)} className="mt-0.5 size-4 accent-[var(--da-accent)]" />
              <span className={cn(checked.includes(it.id) && "text-da-muted line-through")}>{it.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Rendu d'un bloc tel que le voit l'apprenant. */
export function BlockView({ block, da, preview = true, checklist, onChecklist, onQuizScore }: { block: LessonBlock; da: AcademyDa; preview?: boolean; checklist?: string[]; onChecklist?: (itemId: string) => void; onQuizScore?: (score: number) => void }) {
  switch (block.type) {
    case "texte":
      return (
        <MarkdownPreview
          source={block.markdown}
          className={cn(
            "text-[15px] leading-7 text-da-ink",
            da === "campus" && "[&_h2]:font-da-title [&_h2]:text-2xl [&_h2]:font-normal [&_h3]:font-da-title [&_h3]:text-xl [&_h3]:font-normal",
            da === "neon" && "[&_h2]:font-da-title [&_h2]:text-da-accent",
            da === "atelier" && "text-sm leading-6 [&_h2]:text-base",
          )}
        />
      );
    case "video":
      return <VideoView block={block} da={da} preview={preview} />;
    case "quiz":
      return <QuizView block={block} da={da} onScore={onQuizScore} />;
    case "exercice":
      return <ExerciseView block={block} da={da} preview={preview} />;
    case "ressource":
      return <ResourceView block={block} da={da} />;
    case "prompt":
      return <PromptView block={block} da={da} />;
    case "checklist":
      return <ChecklistView block={block} da={da} checked={checklist ?? []} onToggle={(id) => onChecklist?.(id)} />;
  }
}
