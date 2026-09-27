"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, Loader2, Plus, Save, Sparkles, Trash2, Undo2 } from "lucide-react";
import { Badge, Button, FormField, Input, Menu, Modal, Select, Switch, Textarea, useToast } from "@/components/ui";
import { useActions } from "@/lib/hooks";
import { LESSON_BLOCK_TYPES, PERSONAS, labelOf } from "@/lib/domain/constants";
import type { Course, CourseModule, Lesson, LessonBlock, LessonBlockType, Persona } from "@/lib/domain/types";
import { BLOCK_ICON, BlockCard, cloneBlock, newBlock } from "./block-editors";
import { requestDraft, type AiMode } from "../lib/ai-client";

type Draft = Pick<Lesson, "title" | "summary" | "estimatedMinutes" | "isPreview" | "blocks">;
const toDraft = (l: Lesson): Draft => ({ title: l.title, summary: l.summary, estimatedMinutes: l.estimatedMinutes, isPreview: l.isPreview, blocks: l.blocks });

/** Texte brut de la leçon (contexte envoyé à l'IA pour un quiz). */
function lessonText(blocks: LessonBlock[]): string {
  return blocks
    .map((b) => (b.type === "texte" ? b.markdown : b.type === "exercice" ? `Exercice « ${b.title} » : ${b.instructions}` : b.type === "checklist" ? `${b.title} : ${b.items.map((i) => i.label).join(" ; ")}` : ""))
    .filter(Boolean)
    .join("\n\n");
}

function AiModal({ course, module, draft, onClose, onInsert }: { course: Course; module?: CourseModule; draft: Draft; onClose: () => void; onInsert: (blocks: LessonBlock[], replaceId?: string) => void }) {
  const texts = draft.blocks.filter((b): b is Extract<LessonBlock, { type: "texte" }> => b.type === "texte");
  const [mode, setMode] = React.useState<AiMode>(texts.length ? "quiz" : "lecon");
  const [persona, setPersona] = React.useState<Persona>("non_tech");
  const [source, setSource] = React.useState(texts[0]?.id ?? "");
  const [instructions, setInstructions] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<LessonBlock[] | null>(null);
  const [error, setError] = React.useState<string>();
  const needsSource = mode === "variante" || mode === "ameliorer";

  const run = async () => {
    setLoading(true);
    setError(undefined);
    setResult(null);
    const src = texts.find((t) => t.id === source)?.markdown;
    const r = await requestDraft({
      mode,
      course: { title: course.title, subtitle: course.subtitle, audience: course.audience, level: course.level, objectives: course.objectives },
      module: module ? { title: module.title, summary: module.summary } : undefined,
      lesson: { title: draft.title, summary: draft.summary, estimatedMinutes: draft.estimatedMinutes, text: lessonText(draft.blocks) },
      persona: mode === "variante" ? persona : undefined,
      sourceText: needsSource ? src : undefined,
      instructions: instructions.trim() || undefined,
    });
    setLoading(false);
    if (r.ok) setResult(r.blocks);
    else setError(r.message);
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Aide à la rédaction (Claude)"
      description="Le résultat est un brouillon : relisez-le, puis enregistrez la leçon. Rien n'est publié automatiquement."
      footer={
        result ? (
          <>
            <Button variant="ghost" onClick={() => setResult(null)}>
              Recommencer
            </Button>
            <Button
              onClick={() => {
                onInsert(result, mode === "ameliorer" ? source : undefined);
                onClose();
              }}
            >
              {mode === "ameliorer" ? "Remplacer le bloc" : `Insérer ${result.length} bloc${result.length > 1 ? "s" : ""}`}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={run} loading={loading} disabled={needsSource && !source}>
              <Sparkles /> Générer
            </Button>
          </>
        )
      }
    >
      {result ? (
        <ul className="space-y-2">
          {result.map((b) => {
            const Icon = BLOCK_ICON[b.type];
            return (
              <li key={b.id} className="flex items-start gap-2 rounded-md border border-border p-2 text-sm">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="font-medium">
                    {labelOf(LESSON_BLOCK_TYPES, b.type)}
                    {b.personas?.length ? <Badge tone="violet" className="ml-2 text-[10px]">{labelOf(PERSONAS, b.personas[0])}</Badge> : null}
                  </div>
                  <p className="line-clamp-3 text-xs text-muted-foreground">
                    {b.type === "texte" ? b.markdown : b.type === "quiz" ? b.questions.map((q) => q.prompt).join(" · ") : b.type === "exercice" ? b.instructions : b.type === "prompt" ? b.prompt : b.type === "checklist" ? b.items.map((i) => i.label).join(" · ") : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="space-y-4">
          <FormField label="Que voulez-vous produire ?" htmlFor="ai-mode">
            <Select
              id="ai-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as AiMode)}
              options={[
                { value: "lecon", label: "Le premier jet complet de la leçon" },
                { value: "quiz", label: "Un quiz à partir du contenu de la leçon" },
                { value: "variante", label: "Une variante d'un bloc pour un profil" },
                { value: "ameliorer", label: "Une relecture améliorée d'un bloc" },
              ]}
            />
          </FormField>
          {needsSource ? (
            <FormField label="Bloc de texte source" htmlFor="ai-src">
              <Select id="ai-src" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Choisir…" options={texts.map((t, i) => ({ value: t.id, label: `Texte ${i + 1} — ${t.markdown.replace(/[#>*`]/g, "").trim().slice(0, 60)}` }))} />
            </FormField>
          ) : null}
          {mode === "variante" ? (
            <FormField label="Profil visé" htmlFor="ai-persona">
              <Select id="ai-persona" value={persona} onChange={(e) => setPersona(e.target.value as Persona)} options={PERSONAS} />
            </FormField>
          ) : null}
          <FormField label="Consignes (facultatif)" htmlFor="ai-instr" hint="Ex. insister sur la sécurité des clés d'API ; prendre l'exemple d'une marketplace.">
            <Textarea id="ai-instr" value={instructions} onChange={(e) => setInstructions(e.target.value)} className="min-h-20" />
          </FormField>
          {error ? <p className="rounded-md bg-danger-soft p-2 text-sm text-danger-text">{error}</p> : null}
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Rédaction en cours (jusqu&apos;à une minute)…
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

export function LessonEditor({
  lesson,
  course,
  module,
  editable,
  onDirtyChange,
  onDelete,
}: {
  lesson: Lesson;
  course: Course;
  module?: CourseModule;
  editable: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onDelete?: () => void;
}) {
  const { update } = useActions();
  const toast = useToast();
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(lesson));
  const [ai, setAi] = React.useState(false);
  const [fresh, setFresh] = React.useState<string | null>(null);
  const dirty = React.useMemo(() => JSON.stringify(draft) !== JSON.stringify(toDraft(lesson)), [draft, lesson]);
  React.useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setBlock = (i: number, b: LessonBlock) => set("blocks", draft.blocks.map((x, j) => (j === i ? b : x)));
  const move = (i: number, dir: -1 | 1) => {
    const blocks = [...draft.blocks];
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    set("blocks", blocks);
  };
  const add = (type: LessonBlockType) => {
    const b = newBlock(type);
    set("blocks", [...draft.blocks, b]);
    setFresh(b.id);
  };

  const save = () => {
    if (!draft.title.trim()) return toast({ title: "Donnez un titre à la leçon", tone: "danger" });
    const invalidQuiz = draft.blocks.some((b) => b.type === "quiz" && b.questions.some((q) => !q.prompt.trim() || !q.options.some((o) => o.correct)));
    if (invalidQuiz) return toast({ title: "Quiz incomplet", description: "Chaque question doit avoir un énoncé et au moins une bonne réponse.", tone: "danger" });
    update("lessons", lesson.id, { ...draft, title: draft.title.trim() }, { log: `Leçon « ${draft.title.trim()} » modifiée` });
    toast({ title: "Leçon enregistrée" });
  };

  const activityMinutes = draft.blocks.reduce((s, b) => s + (b.type === "exercice" && !b.personas?.length ? b.estimatedMinutes : b.type === "video" && b.url ? b.durationMinutes : 0), 0);
  const variants = draft.blocks.filter((b) => b.personas?.length).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{draft.blocks.length} blocs</span>
          <span aria-hidden="true">·</span>
          <span>{variants} variante{variants > 1 ? "s" : ""} par profil</span>
          <span aria-hidden="true">·</span>
          <span className={activityMinutes > draft.estimatedMinutes ? "text-danger-text" : undefined}>
            activités {activityMinutes} min / {draft.estimatedMinutes} min
          </span>
          {dirty ? <Badge tone="warning">Modifications non enregistrées</Badge> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDraft(toDraft(lesson))} disabled={!dirty}>
            <Undo2 /> Annuler
          </Button>
          {editable ? (
            <Button size="sm" onClick={save} disabled={!dirty}>
              <Save /> Enregistrer
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <FormField label="Titre de la leçon" htmlFor="les-title">
          <Input id="les-title" value={draft.title} onChange={(e) => set("title", e.target.value)} disabled={!editable} />
        </FormField>
        <FormField label="Durée (min)" htmlFor="les-min">
          <Input id="les-min" type="number" min={1} value={draft.estimatedMinutes} onChange={(e) => set("estimatedMinutes", Math.max(1, Number(e.target.value) || 1))} disabled={!editable} />
        </FormField>
      </div>
      <FormField label="Résumé (affiché dans le programme)" htmlFor="les-sum">
        <Input id="les-sum" value={draft.summary} onChange={(e) => set("summary", e.target.value)} disabled={!editable} />
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={draft.isPreview} onChange={(v) => set("isPreview", v)} disabled={!editable} label="Leçon en accès libre" />
        Accès libre depuis le catalogue (aperçu sans inscription)
      </label>

      <div className="space-y-2">
        {draft.blocks.map((b, i) => (
          <BlockCard
            key={b.id}
            block={b}
            index={i}
            count={draft.blocks.length}
            defaultOpen={b.id === fresh || draft.blocks.length <= 2}
            disabled={!editable}
            onChange={(nb) => setBlock(i, nb)}
            onMove={(dir) => move(i, dir)}
            onDuplicate={() => {
              const c = cloneBlock(b);
              set("blocks", [...draft.blocks.slice(0, i + 1), c, ...draft.blocks.slice(i + 1)]);
              setFresh(c.id);
            }}
            onRemove={() => window.confirm("Supprimer ce bloc ?") && set("blocks", draft.blocks.filter((x) => x.id !== b.id))}
          />
        ))}
      </div>

      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Menu
            align="start"
            trigger={(p) => (
              <Button size="sm" variant="secondary" {...p}>
                <Plus /> Ajouter un bloc
              </Button>
            )}
            items={LESSON_BLOCK_TYPES.map((t) => ({ label: t.label, icon: BLOCK_ICON[t.value], onSelect: () => add(t.value) }))}
          />
          <Button size="sm" variant="subtle" onClick={() => setAi(true)}>
            <Sparkles /> Rédiger avec l&apos;IA
          </Button>
          <Link href={`/academy/formations/${course.id}/apercu?lecon=${lesson.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-foreground hover:bg-surface-2">
            <Eye className="size-4" /> Aperçu apprenant
          </Link>
          {onDelete ? (
            <Button size="sm" variant="ghost" className="ml-auto text-danger-text" onClick={onDelete}>
              <Trash2 /> Supprimer la leçon
            </Button>
          ) : null}
        </div>
      ) : null}

      {ai ? (
        <AiModal
          course={course}
          module={module}
          draft={draft}
          onClose={() => setAi(false)}
          onInsert={(blocks, replaceId) => {
            if (replaceId) {
              const i = draft.blocks.findIndex((b) => b.id === replaceId);
              const keep = draft.blocks[i];
              const nb = blocks[0] ? { ...blocks[0], personas: keep?.personas } : undefined;
              if (i >= 0 && nb) set("blocks", draft.blocks.map((b, j) => (j === i ? nb : b)));
            } else {
              set("blocks", [...draft.blocks, ...blocks]);
            }
            toast({ title: "Brouillon inséré", description: "Relisez-le puis enregistrez la leçon." });
          }}
        />
      ) : null}
    </div>
  );
}
