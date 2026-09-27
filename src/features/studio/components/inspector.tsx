"use client";

import * as React from "react";
import { CheckCircle2, MessageSquare, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { Avatar, Button, FormField, Input, Select, Switch, Textarea } from "@/components/ui";
import { useCollection, useSession } from "@/lib/hooks";
import { DELIVERABLE_KINDS, LESSON_BLOCK_TYPES, labelOf } from "@/lib/domain/constants";
import { youtubeId } from "@/lib/domain/academy";
import { addCourseComment, setCommentResolved } from "@/lib/domain/actions";
import type { Course, CourseComment, CourseModule, ID, LessonBlock, QuizBlock } from "@/lib/domain/types";
import { relative } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { BLOCK_ICON, PROMPT_TOOLS, PersonaChips } from "@/features/academy/components/block-editors";
import { AiModal } from "@/features/academy/components/ai-assistant";
import { blockProblem } from "../lib/checks";
import type { LessonDraft } from "../lib/use-lesson-draft";

/* ───────────────────────────── Commentaires de relecture ───────────────────────────── */

export function CommentThread({ comments, courseId, lessonId, blockId, autoFocus }: { comments: CourseComment[]; courseId: ID; lessonId?: ID; blockId?: ID; autoFocus?: boolean }) {
  const users = useCollection("users");
  const { canEdit } = useSession();
  const now = useNow();
  const [text, setText] = React.useState("");
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    if (autoFocus) ref.current?.scrollIntoView({ block: "nearest" });
  }, [autoFocus]);
  const sorted = [...comments].sort((a, b) => Number(Boolean(a.resolvedAt)) - Number(Boolean(b.resolvedAt)) || a.createdAt.localeCompare(b.createdAt));
  return (
    <div className="space-y-2">
      {sorted.length ? (
        sorted.map((c) => {
          const author = users.find((u) => u.id === c.authorId);
          return (
            <div key={c.id} className={cn("rounded-lg border border-border bg-surface-2 p-2.5 text-sm", c.resolvedAt && "opacity-60")}>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {author ? <Avatar name={author.name} color={author.color} size="sm" /> : null}
                <span className="font-medium text-foreground">{author?.name ?? "Équipe"}</span>
                <span>· {relative(c.createdAt, now)}</span>
                {c.resolvedAt ? <span className="ml-auto inline-flex items-center gap-0.5 text-success-text"><CheckCircle2 className="size-3" aria-hidden="true" /> Résolu</span> : null}
              </div>
              <p className="whitespace-pre-wrap">{c.body}</p>
              {canEdit("academy") ? (
                <button type="button" onClick={() => setCommentResolved(c.id, !c.resolvedAt)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">
                  {c.resolvedAt ? <RotateCcw className="size-3" aria-hidden="true" /> : <CheckCircle2 className="size-3" aria-hidden="true" />}
                  {c.resolvedAt ? "Rouvrir" : "Marquer comme résolu"}
                </button>
              ) : null}
            </div>
          );
        })
      ) : (
        <p className="text-xs text-muted-foreground">Aucun commentaire.</p>
      )}
      {canEdit("academy") ? (
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            addCourseComment({ courseId, lessonId, blockId, body: text });
            setText("");
          }}
        >
          <Textarea ref={ref} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ajouter un commentaire de relecture…" aria-label="Nouveau commentaire" className="min-h-16 text-sm" autoFocus={autoFocus} />
          <Button size="sm" variant="secondary" type="submit" disabled={!text.trim()}>
            <MessageSquare /> Commenter
          </Button>
        </form>
      ) : null}
    </div>
  );
}

/* ───────────────────────────── Réglages par type de bloc ───────────────────────────── */

function BlockSettings({ block, onChange, disabled }: { block: LessonBlock; onChange: (b: LessonBlock) => void; disabled: boolean }) {
  const resources = useCollection("resources");
  switch (block.type) {
    case "texte":
      return <p className="text-xs text-muted-foreground">Écrivez directement dans la leçon. Sélectionnez un mot pour le mettre en gras, en titre, en liste ou en encadré. Un texte Markdown collé est converti automatiquement.</p>;
    case "video":
      return (
        <>
          <FormField label="Lien YouTube" htmlFor="st-url" hint="Vidéo « non répertoriée » conseillée." error={block.url.trim() && !youtubeId(block.url) ? "Lien non reconnu" : undefined}>
            <Input id="st-url" value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="https://youtu.be/…" disabled={disabled} />
          </FormField>
          <FormField label="Durée (min)" htmlFor="st-vdur">
            <Input id="st-vdur" type="number" min={1} value={block.durationMinutes} onChange={(e) => onChange({ ...block, durationMinutes: Math.max(1, Number(e.target.value) || 1) })} disabled={disabled} className="w-28" />
          </FormField>
          <FormField label="Plan de tournage (équipe uniquement)" htmlFor="st-script">
            <Textarea id="st-script" value={block.script ?? ""} onChange={(e) => onChange({ ...block, script: e.target.value || undefined })} className="min-h-24 text-sm" disabled={disabled} />
          </FormField>
          <FormField label="Transcription (accessibilité)" htmlFor="st-tr">
            <Textarea id="st-tr" value={block.transcript ?? ""} onChange={(e) => onChange({ ...block, transcript: e.target.value || undefined })} className="min-h-20 text-sm" disabled={disabled} />
          </FormField>
        </>
      );
    case "quiz":
      return (
        <>
          <label className="flex items-center justify-between gap-2 text-sm">
            Évaluation notée
            <Switch checked={block.graded} onChange={(v) => onChange({ ...block, graded: v })} disabled={disabled} label="Évaluation notée" />
          </label>
          <p className="text-xs text-muted-foreground">Une évaluation notée compte pour le certificat et doit être passée pour terminer la leçon.</p>
          <FormField label="Type de réponse par question">
            <div className="space-y-1.5">
              {block.questions.map((q, i) => (
                <div key={q.id} className="flex items-center gap-2 text-xs">
                  <span className="tabular w-5 text-muted-foreground">{i + 1}.</span>
                  <Select
                    aria-label={`Type de la question ${i + 1}`}
                    value={q.kind}
                    onChange={(e) => {
                      const kind = e.target.value as QuizBlock["questions"][number]["kind"];
                      // Passage en réponse unique : une seule bonne réponse conservée.
                      const firstGood = q.options.findIndex((o) => o.correct);
                      onChange({ ...block, questions: block.questions.map((x, k) => (k === i ? { ...q, kind, options: kind === "unique" ? q.options.map((o, j) => ({ ...o, correct: j === Math.max(0, firstGood) })) : q.options } : x)) });
                    }}
                    options={[
                      { value: "unique", label: "Une seule bonne réponse" },
                      { value: "multiple", label: "Plusieurs bonnes réponses" },
                    ]}
                    disabled={disabled}
                    className="h-8 flex-1 text-xs"
                  />
                </div>
              ))}
            </div>
          </FormField>
          <p className="text-xs text-muted-foreground">Cliquez sur le rond d&apos;une réponse, dans la leçon, pour la marquer comme bonne réponse.</p>
        </>
      );
    case "exercice":
      return (
        <>
          <FormField label="Livrable" htmlFor="st-deliv">
            <Select id="st-deliv" value={block.deliverable} onChange={(e) => onChange({ ...block, deliverable: e.target.value as typeof block.deliverable })} options={DELIVERABLE_KINDS} disabled={disabled} />
          </FormField>
          <FormField label="Correction" htmlFor="st-review">
            <Select
              id="st-review"
              value={block.review}
              onChange={(e) => onChange({ ...block, review: e.target.value as typeof block.review })}
              options={[
                { value: "formateur", label: "Corrigé par un formateur" },
                { value: "auto", label: "Validé à la remise" },
              ]}
              disabled={disabled || block.deliverable === "aucun"}
            />
          </FormField>
          <FormField label="Durée estimée (min)" htmlFor="st-edur">
            <Input id="st-edur" type="number" min={1} value={block.estimatedMinutes} onChange={(e) => onChange({ ...block, estimatedMinutes: Math.max(1, Number(e.target.value) || 1) })} disabled={disabled} className="w-28" />
          </FormField>
        </>
      );
    case "ressource":
      return (
        <>
          <FormField label="Fichier de la bibliothèque" htmlFor="st-res">
            <Select
              id="st-res"
              value={block.resourceId}
              placeholder="Choisir une ressource…"
              onChange={(e) => onChange({ ...block, resourceId: e.target.value })}
              options={resources.filter((r) => r.visibility !== "interne").map((r) => ({ value: r.id, label: r.title }))}
              disabled={disabled}
            />
          </FormField>
          <FormField label="Note pour l'apprenant" htmlFor="st-rnote">
            <Textarea id="st-rnote" value={block.note ?? ""} onChange={(e) => onChange({ ...block, note: e.target.value || undefined })} className="min-h-16 text-sm" disabled={disabled} />
          </FormField>
        </>
      );
    case "prompt":
      return (
        <FormField label="Outil conseillé" htmlFor="st-tool">
          <Select id="st-tool" value={block.tool} onChange={(e) => onChange({ ...block, tool: e.target.value })} options={PROMPT_TOOLS.map((t) => ({ value: t, label: t }))} disabled={disabled} />
        </FormField>
      );
    case "checklist":
      return <p className="text-xs text-muted-foreground">Écrivez les étapes dans la leçon ; Entrée ajoute l&apos;étape suivante. Les cases cochées par l&apos;apprenant sont enregistrées.</p>;
  }
}

/* ───────────────────────────── Panneau ───────────────────────────── */

export function Inspector({
  course,
  module,
  lessonId,
  draft,
  setDraft,
  selectedBlockId,
  comments,
  focusComments,
  editable,
  onDeleteLesson,
}: {
  course: Course;
  module?: CourseModule;
  lessonId: ID;
  draft: LessonDraft;
  setDraft: (fn: (d: LessonDraft) => LessonDraft) => void;
  selectedBlockId?: ID;
  comments: CourseComment[];
  focusComments?: boolean;
  editable: boolean;
  onDeleteLesson?: () => void;
}) {
  const resources = useCollection("resources");
  const [ai, setAi] = React.useState(false);
  const block = draft.blocks.find((b) => b.id === selectedBlockId);
  const setBlock = (b: LessonBlock) => setDraft((d) => ({ ...d, blocks: d.blocks.map((x) => (x.id === b.id ? b : x)) }));

  if (block) {
    const Icon = BLOCK_ICON[block.type];
    const problem = blockProblem(block, new Set(resources.map((r) => r.id)));
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent-text">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">{labelOf(LESSON_BLOCK_TYPES, block.type)}</p>
            <p className="text-xs text-muted-foreground">Réglages du bloc sélectionné</p>
          </div>
        </div>
        {problem ? <p className={cn("rounded-md p-2 text-xs", problem.level === "bloquant" ? "bg-danger-soft text-danger-text" : "bg-warning-soft text-warning-text")}>{problem.label}</p> : null}
        <FormField label="Visible pour" hint="Hyper-personnalisation : réservez ce bloc à un ou plusieurs profils.">
          <PersonaChips value={block.personas} onChange={(personas) => setBlock({ ...block, personas } as LessonBlock)} disabled={!editable} />
        </FormField>
        <BlockSettings block={block} onChange={setBlock} disabled={!editable} />
        <div className="border-t border-border pt-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Commentaires de relecture</p>
          <CommentThread comments={comments.filter((c) => c.blockId === block.id)} courseId={course.id} lessonId={lessonId} blockId={block.id} autoFocus={focusComments} />
        </div>
      </div>
    );
  }

  const lessonComments = comments.filter((c) => !c.blockId);
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">Leçon</p>
        <p className="text-xs text-muted-foreground">Cliquez sur un bloc pour afficher ses réglages.</p>
      </div>
      <FormField label="Durée estimée (min)" htmlFor="st-lmin" hint="Lecture et activités ; sert au calcul de la durée réalisée (FOAD).">
        <Input id="st-lmin" type="number" min={1} value={draft.estimatedMinutes} onChange={(e) => setDraft((d) => ({ ...d, estimatedMinutes: Math.max(1, Number(e.target.value) || 1) }))} disabled={!editable} className="w-28" />
      </FormField>
      <label className="flex items-center justify-between gap-2 text-sm">
        Accès libre depuis le catalogue
        <Switch checked={draft.isPreview} onChange={(v) => setDraft((d) => ({ ...d, isPreview: v }))} disabled={!editable} label="Accès libre depuis le catalogue" />
      </label>
      {editable ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border-strong p-3">
          <p className="text-sm font-medium">Rédiger avec l&apos;IA</p>
          <p className="text-xs text-muted-foreground">Premier jet, quiz tiré du contenu, variante pour un profil ou relecture d&apos;un bloc. Le résultat est inséré comme brouillon.</p>
          <Button size="sm" variant="secondary" onClick={() => setAi(true)}>
            <Sparkles /> Ouvrir l&apos;assistant
          </Button>
        </div>
      ) : null}
      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Commentaires sur la leçon</p>
        <CommentThread comments={lessonComments} courseId={course.id} lessonId={lessonId} autoFocus={focusComments} />
      </div>
      {editable && onDeleteLesson ? (
        <Button size="sm" variant="ghost" className="text-danger-text" onClick={onDeleteLesson}>
          <Trash2 /> Supprimer la leçon
        </Button>
      ) : null}
      {ai ? (
        <AiModal
          course={course}
          module={module}
          draft={draft}
          onClose={() => setAi(false)}
          onInsert={(blocks, replaceId) =>
            setDraft((d) => ({ ...d, blocks: replaceId ? d.blocks.flatMap((b) => (b.id === replaceId ? blocks : [b])) : [...d.blocks, ...blocks] }))
          }
        />
      ) : null}
    </div>
  );
}
