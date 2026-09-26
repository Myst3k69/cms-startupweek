/**
 * API apprenant (consommée par « Mon espace » du site, serveur à serveur) :
 * sommaire des formations, contenu d'une leçon, suivi (connexions, quiz,
 * checklists, livrables, fin de leçon), catalogue.
 *
 * Toutes les règles d'accès sont appliquées ici (le site ne fait que relayer
 * l'email vérifié de l'utilisateur connecté) :
 *   inscription au contact + ouverte (non expirée / non suspendue) + formation publiée
 *   + leçon débloquée (progression séquentielle) + contenu filtré par profil,
 *   réponses des quiz jamais envoyées avant correction.
 */
import { z } from "zod";
import {
  blocksFor,
  enrollmentOpen,
  gradeQuiz,
  lessonStates,
  orderedLessons,
  orderedModules,
  summarizeProgress,
  withoutAnswers,
  type LessonState,
} from "@/lib/domain/academy";
import type { Assignment, Course, Enrollment, ExerciseBlock, Lesson, LessonProgress, QuizBlock } from "@/lib/domain/types";
import { newId, type AcademyRepo } from "./repo";

const Email = z.string().trim().toLowerCase().email().max(254);

export const LearnerRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("catalog") }),
  z.object({ action: z.literal("overview"), email: Email }),
  z.object({ action: z.literal("lesson"), email: Email, enrollmentId: z.string().min(1).max(80), lessonId: z.string().min(1).max(160) }),
  z.object({
    action: z.literal("track"),
    email: Email,
    enrollmentId: z.string().min(1).max(80),
    event: z.discriminatedUnion("type", [
      z.object({ type: z.literal("heartbeat"), lessonId: z.string().max(160).optional(), seconds: z.number().int().min(1).max(300), device: z.string().max(120).optional() }),
      z.object({ type: z.literal("complete_lesson"), lessonId: z.string().max(160) }),
      z.object({ type: z.literal("quiz"), lessonId: z.string().max(160), blockId: z.string().max(200), answers: z.record(z.string().max(200), z.array(z.string().max(200)).max(20)) }),
      z.object({ type: z.literal("checklist"), lessonId: z.string().max(160), blockId: z.string().max(200), itemIds: z.array(z.string().max(200)).max(50) }),
      z.object({ type: z.literal("submit"), lessonId: z.string().max(160), blockId: z.string().max(200), content: z.string().max(20_000).default(""), url: z.string().url().max(2000).optional() }),
    ]),
  }),
]);
export type LearnerRequest = z.infer<typeof LearnerRequestSchema>;

export type LearnerResult = { status: number; body: Record<string, unknown> };

const fail = (status: number, error: string, message: string): LearnerResult => ({ status, body: { ok: false, error, message } });

/** Nouvelle connexion si la précédente est terminée depuis plus de 15 min. */
const SESSION_GAP_MS = 15 * 60_000;

interface Ctx {
  enrollment: Enrollment;
  course: Course;
  ordered: Lesson[];
  modules: ReturnType<typeof orderedModules>;
  progress: LessonProgress[];
  states: Map<string, LessonState>;
}

async function loadContext(repo: AcademyRepo, email: string, enrollmentId: string, nowMs: number): Promise<Ctx | LearnerResult> {
  const contact = await repo.contactByEmail(email);
  const enrollment = await repo.enrollment(enrollmentId);
  if (!contact || !enrollment || enrollment.contactId !== contact.id) return fail(404, "ENROLLMENT_NOT_FOUND", "Inscription introuvable pour ce compte.");
  if (!enrollmentOpen(enrollment, nowMs)) return fail(403, "ACCESS_CLOSED", enrollment.status === "suspendue" ? "Accès suspendu." : "Accès expiré.");
  const course = await repo.course(enrollment.courseId);
  if (!course || course.status !== "publiee") return fail(403, "COURSE_UNAVAILABLE", "Formation momentanément indisponible.");
  const { modules, lessons } = await repo.outline(course.id);
  const ordered = orderedLessons(course.id, modules, lessons);
  const progress = await repo.progressOf(enrollment.id);
  return { enrollment, course, ordered, modules: orderedModules(course.id, modules), progress, states: lessonStates(ordered, progress, course.sequential) };
}

function lessonOr404(ctx: Ctx, lessonId: string): Lesson | LearnerResult {
  const lesson = ctx.ordered.find((l) => l.id === lessonId);
  if (!lesson) return fail(404, "LESSON_NOT_FOUND", "Leçon introuvable.");
  if (ctx.states.get(lesson.id) === "verrouillee") return fail(423, "LESSON_LOCKED", "Terminez la leçon précédente pour débloquer celle-ci.");
  return lesson;
}

const isResult = (v: unknown): v is LearnerResult => Boolean(v && typeof v === "object" && "status" in v && "body" in v);

/** Recalcule les champs dénormalisés de l'inscription après une activité. */
async function refreshEnrollment(repo: AcademyRepo, ctx: Ctx, nowIso: string, progress: LessonProgress[]) {
  const s = summarizeProgress(ctx.ordered, progress);
  const completed = s.total > 0 && s.done === s.total;
  const patch: Partial<Enrollment> = {
    progressPercent: s.percent,
    timeSpentMinutes: s.timeSpentMinutes,
    quizAverage: s.quizAverage,
    lastActivityAt: nowIso,
    startedAt: ctx.enrollment.startedAt ?? nowIso,
  };
  if (completed && !ctx.enrollment.completedAt) {
    patch.completedAt = nowIso;
    patch.status = "terminee";
    await repo.log("enrollments", ctx.enrollment.id, `Formation terminée : « ${ctx.course.title} »`);
  }
  await repo.updateEnrollment(ctx.enrollment.id, patch);
  return { ...s, completed };
}

function upsertProgressRow(ctx: Ctx, lesson: Lesson, nowIso: string): { row: LessonProgress; isNew: boolean } {
  const existing = ctx.progress.find((p) => p.lessonId === lesson.id);
  if (existing) return { row: { ...existing }, isNew: false };
  return {
    isNew: true,
    row: {
      id: newId("lpr"),
      enrollmentId: ctx.enrollment.id,
      lessonId: lesson.id,
      courseId: ctx.course.id,
      contactId: ctx.enrollment.contactId,
      status: "en_cours",
      startedAt: nowIso,
      timeSpentSeconds: 0,
      quizScores: {},
      quizAttempts: 0,
      checklist: {},
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  };
}

function outlineOf(ctx: Ctx) {
  return ctx.modules.map((m) => ({
    id: m.id,
    title: m.title,
    summary: m.summary,
    lessons: ctx.ordered
      .filter((l) => l.moduleId === m.id)
      .map((l) => ({ id: l.id, title: l.title, summary: l.summary, estimatedMinutes: l.estimatedMinutes, state: ctx.states.get(l.id) })),
  }));
}

const publicCourse = (c: Course) => ({
  id: c.id,
  slug: c.slug,
  title: c.title,
  subtitle: c.subtitle,
  description: c.description,
  level: c.level,
  audience: c.audience,
  objectives: c.objectives,
  prerequisites: c.prerequisites,
  durationHours: c.durationHours,
  priceCents: c.priceCents,
  accessDays: c.accessDays,
  evaluationMethods: c.evaluationMethods,
  assistance: c.assistance,
  accessibility: c.accessibility,
  coverUrl: c.coverUrl,
});

export async function handleLearner(repo: AcademyRepo, req: LearnerRequest, nowMs = Date.now()): Promise<LearnerResult> {
  const nowIso = new Date(nowMs).toISOString();

  if (req.action === "catalog") {
    const courses = await repo.catalog();
    const out = [];
    for (const c of courses) {
      const { modules, lessons } = await repo.outline(c.id);
      const ordered = orderedLessons(c.id, modules, lessons);
      out.push({
        ...publicCourse(c),
        modules: orderedModules(c.id, modules).map((m) => ({ title: m.title, summary: m.summary, lessons: ordered.filter((l) => l.moduleId === m.id).map((l) => ({ id: l.id, title: l.title, estimatedMinutes: l.estimatedMinutes, isPreview: l.isPreview })) })),
      });
    }
    return { status: 200, body: { ok: true, dryRun: repo.dryRun, courses: out } };
  }

  if (req.action === "overview") {
    const contact = await repo.contactByEmail(req.email);
    if (!contact) return { status: 200, body: { ok: true, dryRun: repo.dryRun, enrollments: [] } };
    const enrollments = await repo.enrollmentsOf(contact.id);
    const out = [];
    for (const e of enrollments) {
      const ctx = await loadContext(repo, req.email, e.id, nowMs);
      if (isResult(ctx)) {
        // Inscription fermée ou formation non publiée : visible dans l'historique, sans contenu.
        const c = await repo.course(e.courseId);
        out.push({ enrollmentId: e.id, open: false, reason: ctx.body.error, course: c ? { id: c.id, title: c.title, slug: c.slug } : null, expiresAt: e.expiresAt, progressPercent: e.progressPercent });
        continue;
      }
      const next = ctx.ordered.find((l) => ctx.states.get(l.id) === "en_cours") ?? ctx.ordered.find((l) => ctx.states.get(l.id) === "disponible");
      out.push({
        enrollmentId: e.id,
        open: true,
        course: publicCourse(ctx.course),
        persona: e.persona,
        status: e.status,
        expiresAt: e.expiresAt,
        progressPercent: e.progressPercent,
        timeSpentMinutes: e.timeSpentMinutes,
        quizAverage: e.quizAverage,
        certificateIssuedAt: e.certificateIssuedAt,
        nextLessonId: next?.id,
        modules: outlineOf(ctx),
      });
    }
    return { status: 200, body: { ok: true, dryRun: repo.dryRun, learner: { firstName: contact.firstName, lastName: contact.lastName }, enrollments: out } };
  }

  const ctx = await loadContext(repo, req.email, req.enrollmentId, nowMs);
  if (isResult(ctx)) return ctx;

  if (req.action === "lesson") {
    const lesson = lessonOr404(ctx, req.lessonId);
    if (isResult(lesson)) return lesson;
    const { row, isNew } = upsertProgressRow(ctx, lesson, nowIso);
    if (isNew) {
      await repo.saveProgress(row, true);
      await refreshEnrollment(repo, ctx, nowIso, [...ctx.progress, row]);
    }
    const assignments = (await repo.assignmentsOf(ctx.enrollment.id)).filter((a) => a.lessonId === lesson.id);
    const index = ctx.ordered.indexOf(lesson);
    return {
      status: 200,
      body: {
        ok: true,
        dryRun: repo.dryRun,
        lesson: {
          id: lesson.id,
          title: lesson.title,
          summary: lesson.summary,
          estimatedMinutes: lesson.estimatedMinutes,
          moduleId: lesson.moduleId,
          blocks: blocksFor(lesson, ctx.enrollment.persona).map(withoutAnswers),
        },
        progress: { status: row.status, quizScores: row.quizScores, checklist: row.checklist, timeSpentSeconds: row.timeSpentSeconds },
        assignments: assignments.map((a) => ({ blockId: a.blockId, status: a.status, submittedAt: a.submittedAt, content: a.content, url: a.url, feedback: a.feedback, grade: a.grade, reviewedAt: a.reviewedAt })),
        previousLessonId: ctx.ordered[index - 1]?.id,
        nextLessonId: ctx.ordered[index + 1]?.id,
      },
    };
  }

  // ── track ──
  const ev = req.event;

  if (ev.type === "heartbeat") {
    const last = await repo.lastConnection(ctx.enrollment.id);
    const lesson = ev.lessonId ? ctx.ordered.find((l) => l.id === ev.lessonId && ctx.states.get(l.id) !== "verrouillee") : undefined;
    if (last && nowMs - new Date(last.endedAt).getTime() <= SESSION_GAP_MS) {
      await repo.saveConnection(
        { ...last, endedAt: nowIso, durationSeconds: last.durationSeconds + ev.seconds, lessonIds: lesson && !last.lessonIds.includes(lesson.id) ? [...last.lessonIds, lesson.id] : last.lessonIds },
        false,
      );
    } else {
      await repo.saveConnection(
        { id: newId("cnx"), enrollmentId: ctx.enrollment.id, contactId: ctx.enrollment.contactId, courseId: ctx.course.id, startedAt: new Date(nowMs - ev.seconds * 1000).toISOString(), endedAt: nowIso, durationSeconds: ev.seconds, lessonIds: lesson ? [lesson.id] : [], device: ev.device },
        true,
      );
    }
    let progress = ctx.progress;
    if (lesson) {
      const { row, isNew } = upsertProgressRow(ctx, lesson, nowIso);
      row.timeSpentSeconds += ev.seconds;
      await repo.saveProgress(row, isNew);
      progress = [...ctx.progress.filter((p) => p.id !== row.id), row];
    }
    await refreshEnrollment(repo, ctx, nowIso, progress);
    return { status: 200, body: { ok: true, dryRun: repo.dryRun } };
  }

  const lesson = lessonOr404(ctx, ev.lessonId);
  if (isResult(lesson)) return lesson;
  const visible = blocksFor(lesson, ctx.enrollment.persona);
  const { row, isNew } = upsertProgressRow(ctx, lesson, nowIso);

  if (ev.type === "quiz") {
    const block = visible.find((b): b is QuizBlock => b.id === ev.blockId && b.type === "quiz");
    if (!block) return fail(404, "BLOCK_NOT_FOUND", "Quiz introuvable.");
    const result = gradeQuiz(block, ev.answers);
    row.quizScores = { ...row.quizScores, [block.id]: Math.max(row.quizScores[block.id] ?? 0, result.score) };
    row.quizAttempts += 1;
    await repo.saveProgress(row, isNew);
    const summary = await refreshEnrollment(repo, ctx, nowIso, [...ctx.progress.filter((p) => p.id !== row.id), row]);
    return {
      status: 200,
      body: {
        ok: true,
        dryRun: repo.dryRun,
        score: result.score,
        bestScore: row.quizScores[block.id],
        passed: !block.graded || result.score >= ctx.course.passingScore,
        passingScore: ctx.course.passingScore,
        questions: block.questions.map((q) => {
          const d = result.details.find((x) => x.questionId === q.id)!;
          return { id: q.id, correct: d.correct, expected: d.expected, explanation: q.explanation };
        }),
        quizAverage: summary.quizAverage,
      },
    };
  }

  if (ev.type === "checklist") {
    const block = visible.find((b) => b.id === ev.blockId && b.type === "checklist");
    if (!block || block.type !== "checklist") return fail(404, "BLOCK_NOT_FOUND", "Checklist introuvable.");
    const valid = new Set(block.items.map((i) => i.id));
    row.checklist = { ...row.checklist, [block.id]: [...new Set(ev.itemIds.filter((id) => valid.has(id)))] };
    await repo.saveProgress(row, isNew);
    return { status: 200, body: { ok: true, dryRun: repo.dryRun, checked: row.checklist[block.id] } };
  }

  if (ev.type === "submit") {
    const block = visible.find((b): b is ExerciseBlock => b.id === ev.blockId && b.type === "exercice");
    if (!block || block.deliverable === "aucun") return fail(404, "BLOCK_NOT_FOUND", "Exercice introuvable.");
    if (!ev.content.trim() && !ev.url) return fail(400, "EMPTY_SUBMISSION", "Livrable vide.");
    const existing = (await repo.assignmentsOf(ctx.enrollment.id)).find((a) => a.lessonId === lesson.id && a.blockId === block.id);
    if (existing?.status === "valide") return fail(409, "ALREADY_VALIDATED", "Ce livrable est déjà validé.");
    const assignment: Omit<Assignment, "createdAt" | "updatedAt"> = {
      id: existing?.id ?? newId("liv"),
      enrollmentId: ctx.enrollment.id,
      lessonId: lesson.id,
      blockId: block.id,
      courseId: ctx.course.id,
      contactId: ctx.enrollment.contactId,
      submittedAt: nowIso,
      content: ev.content.trim(),
      url: ev.url,
      status: block.review === "auto" ? "valide" : "soumis",
      feedback: existing?.feedback,
      grade: undefined,
      reviewerId: undefined,
      reviewedAt: block.review === "auto" ? nowIso : undefined,
    };
    await repo.saveAssignment(assignment, !existing);
    if (isNew) await repo.saveProgress(row, true);
    await repo.log("assignments", assignment.id, `Livrable remis : « ${block.title} »`);
    await refreshEnrollment(repo, ctx, nowIso, isNew ? [...ctx.progress, row] : ctx.progress);
    return { status: 200, body: { ok: true, dryRun: repo.dryRun, status: assignment.status } };
  }

  // complete_lesson : quiz évalués tentés et livrables corrigés par un formateur remis.
  const assignments = await repo.assignmentsOf(ctx.enrollment.id);
  const missing: string[] = [];
  for (const b of visible) {
    if (b.type === "quiz" && b.graded && row.quizScores[b.id] === undefined) missing.push(`Quiz « ${b.title} »`);
    if (b.type === "exercice" && b.review === "formateur" && b.deliverable !== "aucun" && !assignments.some((a) => a.lessonId === lesson.id && a.blockId === b.id)) missing.push(`Livrable « ${b.title} »`);
  }
  if (missing.length) return { status: 409, body: { ok: false, error: "LESSON_INCOMPLETE", message: "Terminez les activités évaluées de la leçon.", missing } };
  if (row.status !== "terminee") {
    row.status = "terminee";
    row.completedAt = nowIso;
    await repo.saveProgress(row, isNew);
  }
  const progress = [...ctx.progress.filter((p) => p.id !== row.id), row];
  const summary = await refreshEnrollment(repo, ctx, nowIso, progress);
  const states = lessonStates(ctx.ordered, progress, ctx.course.sequential);
  const index = ctx.ordered.indexOf(lesson);
  const next = ctx.ordered[index + 1];
  return { status: 200, body: { ok: true, dryRun: repo.dryRun, progressPercent: summary.percent, completed: summary.completed, nextLessonId: next?.id, nextLessonState: next ? states.get(next.id) : undefined } };
}
