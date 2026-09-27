/**
 * StartupWeek Academy — règles pures partagées par le back-office (navigateur) et
 * l'API apprenant (serveur) : ordre des leçons, personnalisation par profil,
 * déblocage séquentiel, correction des quiz, progression, certificat.
 *
 * Aucune dépendance au store : ce module est importé par les routes /api/academy/*.
 */
import type {
  Course,
  CourseModule,
  Enrollment,
  ID,
  Lesson,
  LessonBlock,
  LessonProgress,
  Persona,
  QuizBlock,
} from "./types";

const DAY = 86_400_000;

/** Leçons d'une formation dans l'ordre du programme (module puis position). */
export function orderedLessons(courseId: ID, modules: CourseModule[], lessons: Lesson[]): Lesson[] {
  const modPos = new Map(modules.filter((m) => m.courseId === courseId).map((m) => [m.id, m.position]));
  return lessons
    .filter((l) => l.courseId === courseId && modPos.has(l.moduleId))
    .sort((a, b) => (modPos.get(a.moduleId)! - modPos.get(b.moduleId)!) || a.position - b.position);
}

/** Modules d'une formation, triés. */
export function orderedModules(courseId: ID, modules: CourseModule[]): CourseModule[] {
  return modules.filter((m) => m.courseId === courseId).sort((a, b) => a.position - b.position);
}

/** Un bloc est-il montré à ce profil ? (sans restriction = tous les profils) */
export function blockVisibleFor(block: Pick<LessonBlock, "personas">, persona: Persona | undefined): boolean {
  if (!block.personas?.length) return true;
  return persona ? block.personas.includes(persona) : false;
}

/** Blocs d'une leçon tels que les voit un apprenant de ce profil. */
export function blocksFor(lesson: Pick<Lesson, "blocks">, persona: Persona | undefined): LessonBlock[] {
  return lesson.blocks.filter((b) => blockVisibleFor(b, persona) && !(b.type === "video" && !b.url.trim()));
}

/** Durée totale estimée (minutes). */
export function totalMinutes(lessons: Pick<Lesson, "estimatedMinutes">[]): number {
  return lessons.reduce((s, l) => s + (l.estimatedMinutes || 0), 0);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/* ───────────────────────────── Vidéo ───────────────────────────── */

/** Identifiant YouTube d'une URL (watch, youtu.be, embed, shorts) — undefined si l'URL n'est pas YouTube. */
export function youtubeId(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const m =
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url.trim());
  return m?.[1];
}

/** URL d'intégration sans cookie publicitaire (youtube-nocookie). */
export function youtubeEmbedUrl(url: string | undefined): string | undefined {
  const id = youtubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : undefined;
}

/* ───────────────────────────── Quiz ───────────────────────────── */

export type QuizAnswers = Record<ID, ID[]>; // question → options cochées

export interface QuizResult {
  score: number; // 0-100
  correct: number;
  total: number;
  details: { questionId: ID; correct: boolean; expected: ID[] }[];
}

/** Correction : une question est juste si l'ensemble des options cochées = l'ensemble des bonnes options. */
export function gradeQuiz(block: QuizBlock, answers: QuizAnswers): QuizResult {
  const details = block.questions.map((q) => {
    const expected = q.options.filter((o) => o.correct).map((o) => o.id).sort();
    const given = [...new Set(answers[q.id] ?? [])].sort();
    return { questionId: q.id, correct: expected.length === given.length && expected.every((id, i) => id === given[i]), expected };
  });
  const correct = details.filter((d) => d.correct).length;
  const total = block.questions.length;
  return { score: total ? Math.round((correct / total) * 100) : 0, correct, total, details };
}

/** Version d'un bloc sans les réponses (envoyée au navigateur de l'apprenant avant correction). */
export function withoutAnswers(block: LessonBlock): LessonBlock {
  if (block.type === "quiz") {
    return { ...block, questions: block.questions.map((q) => ({ ...q, explanation: undefined, options: q.options.map((o) => ({ ...o, correct: false })) })) };
  }
  if (block.type === "video") return { ...block, script: undefined };
  return block;
}

/* ───────────────────────────── Progression ───────────────────────────── */

export type LessonState = "terminee" | "en_cours" | "disponible" | "verrouillee";

/**
 * État de chaque leçon pour un apprenant. En mode séquentiel, une leçon n'est
 * disponible que si la précédente est terminée (la première l'est toujours).
 */
export function lessonStates(ordered: Pick<Lesson, "id">[], progress: Pick<LessonProgress, "lessonId" | "status">[], sequential: boolean): Map<ID, LessonState> {
  const byLesson = new Map(progress.map((p) => [p.lessonId, p.status]));
  const out = new Map<ID, LessonState>();
  let previousDone = true;
  for (const l of ordered) {
    const st = byLesson.get(l.id);
    if (st === "terminee") out.set(l.id, "terminee");
    else if (st === "en_cours") out.set(l.id, "en_cours");
    else out.set(l.id, !sequential || previousDone ? "disponible" : "verrouillee");
    previousDone = st === "terminee";
  }
  return out;
}

export interface ProgressSummary {
  done: number;
  total: number;
  percent: number;
  timeSpentMinutes: number;
  quizAverage?: number; // % moyen des quiz évalués tentés
  gradedQuizzes: number; // nombre de quiz évalués de la formation
  gradedTaken: number;
}

/** Synthèse de la progression d'un apprenant sur une formation. */
export function summarizeProgress(ordered: Lesson[], progress: LessonProgress[]): ProgressSummary {
  const ids = new Set(ordered.map((l) => l.id));
  const rows = progress.filter((p) => ids.has(p.lessonId));
  const done = rows.filter((p) => p.status === "terminee").length;
  const graded = ordered.flatMap((l) => l.blocks.filter((b): b is QuizBlock => b.type === "quiz" && b.graded));
  const scores: number[] = [];
  for (const q of graded) {
    const row = rows.find((p) => p.quizScores[q.id] !== undefined);
    if (row) scores.push(row.quizScores[q.id]);
  }
  return {
    done,
    total: ordered.length,
    percent: ordered.length ? Math.round((done / ordered.length) * 100) : 0,
    timeSpentMinutes: Math.round(rows.reduce((s, p) => s + p.timeSpentSeconds, 0) / 60),
    quizAverage: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined,
    gradedQuizzes: graded.length,
    gradedTaken: scores.length,
  };
}

/** Inscription en cours de validité (active et non expirée). */
export function enrollmentOpen(e: Pick<Enrollment, "status" | "expiresAt">, nowMs: number): boolean {
  return (e.status === "active" || e.status === "terminee") && new Date(e.expiresAt).getTime() > nowMs;
}

/** Statut affiché : une inscription active dont la date est passée est « expirée ». */
export function effectiveStatus(e: Pick<Enrollment, "status" | "expiresAt">, nowMs: number): Enrollment["status"] {
  if (e.status === "active" && new Date(e.expiresAt).getTime() <= nowMs) return "expiree";
  return e.status;
}

export function addDaysIso(fromIso: string, days: number): string {
  return new Date(new Date(fromIso).getTime() + days * DAY).toISOString();
}

export interface CertificateCheck {
  eligible: boolean;
  reasons: string[];
}

/** Conditions du certificat de réalisation (FOAD) : progression minimale et quiz évalués réussis. */
export function certificateCheck(course: Pick<Course, "certificateMinProgress" | "passingScore">, summary: ProgressSummary): CertificateCheck {
  const reasons: string[] = [];
  if (summary.percent < course.certificateMinProgress) reasons.push(`Progression ${summary.percent} % (minimum ${course.certificateMinProgress} %)`);
  if (summary.gradedQuizzes && summary.quizAverage !== undefined && summary.quizAverage < course.passingScore) {
    reasons.push(`Moyenne aux quiz évalués ${summary.quizAverage} % (seuil ${course.passingScore} %)`);
  }
  if (summary.gradedQuizzes && summary.gradedTaken === 0) reasons.push("Aucun quiz évalué passé");
  return { eligible: reasons.length === 0, reasons };
}

/** Slug d'URL (minuscules, sans accents). */
export function slugify(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
