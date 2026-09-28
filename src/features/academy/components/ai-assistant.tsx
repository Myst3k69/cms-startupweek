"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Badge, Button, FormField, Modal, Select, Textarea } from "@/components/ui";
import { LESSON_BLOCK_TYPES, PERSONAS, labelOf } from "@/lib/domain/constants";
import type { Course, CourseModule, Lesson, LessonBlock, Persona } from "@/lib/domain/types";
import { BLOCK_ICON } from "./block-editors";
import { requestDraft, type AiMode } from "../lib/ai-client";

export type Draft = Pick<Lesson, "title" | "summary" | "estimatedMinutes" | "isPreview" | "blocks">;

/** Texte brut de la leçon (contexte envoyé à l'IA pour un quiz). */
function lessonText(blocks: LessonBlock[]): string {
  return blocks
    .map((b) => (b.type === "texte" ? b.markdown : b.type === "exercice" ? `Exercice « ${b.title} » : ${b.instructions}` : b.type === "checklist" ? `${b.title} : ${b.items.map((i) => i.label).join(" ; ")}` : ""))
    .filter(Boolean)
    .join("\n\n");
}

export function AiModal({ course, module, draft, onClose, onInsert }: { course: Course; module?: CourseModule; draft: Draft; onClose: () => void; onInsert: (blocks: LessonBlock[], replaceId?: string) => void }) {
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
