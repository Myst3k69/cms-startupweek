"use client";

import * as React from "react";
import { useActions } from "@/lib/hooks";
import type { Lesson } from "@/lib/domain/types";

export type LessonDraft = Pick<Lesson, "title" | "summary" | "estimatedMinutes" | "isPreview" | "blocks">;
export type SaveState = "enregistre" | "en_attente";

const pick = (l: Lesson): LessonDraft => ({ title: l.title, summary: l.summary, estimatedMinutes: l.estimatedMinutes, isPreview: l.isPreview, blocks: l.blocks });

/** Délai après la dernière modification avant l'enregistrement (écriture Supabase). */
const SAVE_DELAY_MS = 800;

/**
 * Brouillon local d'une leçon, enregistré automatiquement (pas de bouton « Enregistrer ») :
 * chaque modification est écrite 0,8 s après la dernière frappe, et immédiatement quand on
 * quitte la leçon. Une modification venue d'ailleurs (autre onglet, IA, autre membre) remplace
 * le brouillon s'il n'y a rien en attente. À utiliser avec `key={lesson.id}`.
 */
export function useLessonDraft(lesson: Lesson, editable: boolean) {
  const { update } = useActions();
  const [draft, setDraftState] = React.useState<LessonDraft>(() => pick(lesson));
  const [dirty, setDirty] = React.useState(false);
  const [base, setBase] = React.useState(lesson.updatedAt);

  // Changement extérieur : état dérivé pendant le rendu (pas d'effet).
  if (lesson.updatedAt !== base && !dirty) {
    setBase(lesson.updatedAt);
    setDraftState(pick(lesson));
  }

  const latest = React.useRef({ draft, dirty, id: lesson.id });
  React.useEffect(() => {
    latest.current = { draft, dirty, id: lesson.id };
  }, [draft, dirty, lesson.id]);

  const save = React.useCallback(() => {
    const { draft: d, dirty: isDirty, id } = latest.current;
    if (!isDirty) return;
    update("lessons", id, { ...d, title: d.title.trim() || "Leçon sans titre" }, { log: false });
    latest.current = { ...latest.current, dirty: false };
    setDirty(false);
  }, [update]);

  React.useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(save, SAVE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [dirty, draft, save]);

  // En quittant la leçon (ou la page) : rien ne se perd.
  React.useEffect(() => {
    const onLeave = () => save();
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      save();
    };
  }, [save]);

  const setDraft = React.useCallback(
    (fn: (d: LessonDraft) => LessonDraft) => {
      if (!editable) return;
      setDraftState(fn);
      setDirty(true);
    },
    [editable],
  );

  return { draft, setDraft, saveState: (dirty ? "en_attente" : "enregistre") as SaveState, saveNow: save };
}
