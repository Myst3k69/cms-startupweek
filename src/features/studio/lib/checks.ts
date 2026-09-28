/**
 * Vérifications automatiques du Studio, recalculées à chaque modification.
 *
 * - bloquant : empêche la publication (contenu cassé ou incomplet pour l'apprenant) ;
 * - à vérifier : n'empêche rien, mais doit être vu avant publication (qualité, Qualiopi).
 *
 * Chaque point indique où corriger (leçon / bloc, ou onglet de la fiche).
 */
import { parseMarkdown, plainText } from "@/features/site/lib/markdown";
import { orderedLessons, youtubeId } from "@/lib/domain/academy";
import type { Course, CourseModule, ID, Lesson, LessonBlock } from "@/lib/domain/types";

export type CheckLevel = "bloquant" | "a_verifier";
export type CheckTarget = { view: "edition"; lessonId: ID; blockId?: ID } | { view: "catalogue" } | { view: "fiche" };

export interface StudioCheck {
  id: string;
  level: CheckLevel;
  label: string;
  detail?: string;
  target?: CheckTarget;
  count?: number;
}

const empty = (s: string | undefined) => !s || !s.trim();

/** Problèmes d'un bloc (null = rien à signaler). */
export function blockProblem(b: LessonBlock, resourceIds: Set<ID>): { level: CheckLevel; label: string } | null {
  switch (b.type) {
    case "texte":
      return !plainText(b.markdown).trim() ? { level: "a_verifier", label: "Bloc de texte vide" } : null;
    case "video":
      if (empty(b.url)) return { level: "a_verifier", label: "Vidéo sans lien (masquée pour les apprenants)" };
      return youtubeId(b.url) ? null : { level: "bloquant", label: "Lien vidéo non reconnu (YouTube attendu)" };
    case "quiz": {
      if (!b.questions.length) return { level: "bloquant", label: "Quiz sans question" };
      if (b.questions.some((q) => empty(q.prompt))) return { level: "bloquant", label: "Question de quiz sans énoncé" };
      if (b.questions.some((q) => q.options.filter((o) => !empty(o.label)).length < 2)) return { level: "bloquant", label: "Question avec moins de deux réponses" };
      if (b.questions.some((q) => !q.options.some((o) => o.correct))) return { level: "bloquant", label: "Question sans bonne réponse" };
      return null;
    }
    case "exercice":
      if (empty(b.title) || !plainText(b.instructions).trim()) return { level: "bloquant", label: "Exercice sans titre ou sans consigne" };
      return b.review === "formateur" && !b.rubric.length ? { level: "a_verifier", label: "Exercice corrigé sans critères de réussite" } : null;
    case "ressource":
      return !b.resourceId || !resourceIds.has(b.resourceId) ? { level: "a_verifier", label: "Ressource non choisie ou supprimée (non affichée)" } : null;
    case "prompt":
      return empty(b.prompt) ? { level: "bloquant", label: "Prompt vide" } : null;
    case "checklist":
      return !b.items.some((i) => !empty(i.label)) ? { level: "bloquant", label: "Checklist sans étape" } : b.items.some((i) => empty(i.label)) ? { level: "a_verifier", label: "Étape de checklist vide" } : null;
  }
}

export function studioChecks(course: Course, modules: CourseModule[], lessons: Lesson[], resourceIds: Set<ID>): StudioCheck[] {
  const out: StudioCheck[] = [];
  const ordered = orderedLessons(course.id, modules, lessons);
  if (!modules.length || !ordered.length) out.push({ id: "structure", level: "bloquant", label: "Au moins un module et une leçon" });

  // Problèmes de contenu regroupés par intitulé (un seul point « 20 vidéos sans lien » plutôt que 20).
  const grouped = new Map<string, StudioCheck>();
  for (const l of ordered) {
    if (!l.blocks.length) out.push({ id: `vide-${l.id}`, level: "bloquant", label: `Leçon sans contenu : « ${l.title} »`, target: { view: "edition", lessonId: l.id } });
    if (empty(l.title)) out.push({ id: `titre-${l.id}`, level: "bloquant", label: "Leçon sans titre", target: { view: "edition", lessonId: l.id } });
    for (const b of l.blocks) {
      const p = blockProblem(b, resourceIds);
      if (!p) continue;
      const g = grouped.get(p.label);
      if (g) g.count = (g.count ?? 1) + 1;
      else grouped.set(p.label, { id: `bloc-${p.label}`, level: p.level, label: p.label, count: 1, target: { view: "edition", lessonId: l.id, blockId: b.id } });
    }
  }
  out.push(...grouped.values());

  // Fiche catalogue (information du public — Qualiopi ind. 1) et vente.
  if (empty(course.subtitle)) out.push({ id: "accroche", level: "a_verifier", label: "Accroche de la fiche catalogue", target: { view: "catalogue" } });
  if (!parseMarkdown(course.description).length) out.push({ id: "description", level: "a_verifier", label: "Description de la fiche catalogue", target: { view: "catalogue" } });
  if (course.objectives.length < 2) out.push({ id: "objectifs", level: "a_verifier", label: "Objectifs opérationnels (indicateur 5)", target: { view: "catalogue" } });
  if (empty(course.prerequisites)) out.push({ id: "prerequis", level: "a_verifier", label: "Prérequis (indicateur 1)", target: { view: "catalogue" } });
  if (course.inCatalog && !course.priceCents) out.push({ id: "prix", level: "bloquant", label: "Prix manquant pour la vente en ligne", target: { view: "catalogue" } });
  if (!course.inCatalog) out.push({ id: "catalogue", level: "a_verifier", label: "Non proposée à l'achat sur le site (accès par session, cohorte ou manuel uniquement)", target: { view: "catalogue" } });

  // Mentions FOAD / Qualiopi (fiche Academy).
  if (course.isTraining) {
    if (empty(course.evaluationMethods)) out.push({ id: "evaluation", level: "a_verifier", label: "Modalités d'évaluation (indicateur 11)", target: { view: "fiche" } });
    if (empty(course.assistance)) out.push({ id: "assistance", level: "a_verifier", label: "Assistance technique et pédagogique (FOAD)", target: { view: "fiche" } });
    if (empty(course.accessibility)) out.push({ id: "accessibilite", level: "a_verifier", label: "Accessibilité (indicateur 26)", target: { view: "fiche" } });
  }
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === "bloquant" ? -1 : 1));
}
