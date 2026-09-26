/**
 * Format d'écriture des formations livrées avec le CRM (seed de démo + insertion en base).
 *
 * Les rédacteurs écrivent des modules « à plat » (sans identifiants) ; `buildCourse()`
 * attribue des identifiants déterministes (module, leçon, bloc, question, option, item)
 * dérivés des clés : la même formation produit toujours les mêmes ids, en démo comme
 * en base (réinsertion idempotente, progression des apprenants conservée).
 */
import type {
  Course,
  CourseModule,
  DeliverableKind,
  ID,
  Lesson,
  LessonBlock,
  Persona,
} from "../../domain/types";

type Personas = { personas?: Persona[] };

export interface SeedQuizQuestion {
  prompt: string;
  /** « unique » par défaut ; « multiple » si plusieurs bonnes réponses. */
  kind?: "unique" | "multiple";
  options: { label: string; correct?: boolean }[];
  explanation?: string;
}

export type SeedBlock =
  | ({ type: "texte"; markdown: string } & Personas)
  | ({ type: "video"; title: string; durationMinutes: number; script: string; url?: string } & Personas)
  | ({ type: "quiz"; title: string; graded?: boolean; questions: SeedQuizQuestion[] } & Personas)
  | ({
      type: "exercice";
      title: string;
      instructions: string;
      deliverable: DeliverableKind;
      estimatedMinutes: number;
      review: "formateur" | "auto";
      rubric: string[];
    } & Personas)
  | ({ type: "ressource"; resourceId: ID; note?: string } & Personas)
  | ({ type: "prompt"; title: string; tool: string; prompt: string; tips?: string } & Personas)
  | ({ type: "checklist"; title: string; items: string[] } & Personas);

export interface SeedLesson {
  /** Clé stable, unique dans la formation (ex. « m02-l03 »). */
  key: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  isPreview?: boolean;
  blocks: SeedBlock[];
}

export interface SeedModule {
  /** Clé stable (ex. « m02 »). */
  key: string;
  title: string;
  summary: string;
  objectives: string[];
  lessons: SeedLesson[];
}

export type SeedCourse = Omit<Course, "createdAt" | "updatedAt">;

export interface BuiltCourse {
  course: SeedCourse;
  modules: Omit<CourseModule, "createdAt" | "updatedAt">[];
  lessons: Omit<Lesson, "createdAt" | "updatedAt">[];
}

/** Identifiant stable : préfixe + clé normalisée. */
const key = (...parts: (string | number)[]) =>
  parts
    .join("_")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_");

function buildBlock(lessonId: ID, b: SeedBlock, i: number): LessonBlock {
  const id = key(lessonId, "b", i + 1);
  const personas = b.personas?.length ? { personas: b.personas } : {};
  switch (b.type) {
    case "texte":
      return { id, type: "texte", markdown: b.markdown.trim(), ...personas };
    case "video":
      return { id, type: "video", title: b.title, url: b.url ?? "", durationMinutes: b.durationMinutes, script: b.script.trim(), ...personas };
    case "quiz":
      return {
        id,
        type: "quiz",
        title: b.title,
        graded: b.graded ?? false,
        questions: b.questions.map((q, qi) => {
          const qid = key(id, "q", qi + 1);
          const correct = q.options.filter((o) => o.correct).length;
          return {
            id: qid,
            prompt: q.prompt,
            kind: q.kind ?? (correct > 1 ? "multiple" : "unique"),
            options: q.options.map((o, oi) => ({ id: key(qid, "o", oi + 1), label: o.label, correct: Boolean(o.correct) })),
            explanation: q.explanation,
          };
        }),
        ...personas,
      };
    case "exercice":
      return {
        id,
        type: "exercice",
        title: b.title,
        instructions: b.instructions.trim(),
        deliverable: b.deliverable,
        estimatedMinutes: b.estimatedMinutes,
        review: b.review,
        rubric: b.rubric,
        ...personas,
      };
    case "ressource":
      return { id, type: "ressource", resourceId: b.resourceId, note: b.note, ...personas };
    case "prompt":
      return { id, type: "prompt", title: b.title, tool: b.tool, prompt: b.prompt.trim(), tips: b.tips, ...personas };
    case "checklist":
      return { id, type: "checklist", title: b.title, items: b.items.map((label, ii) => ({ id: key(id, "i", ii + 1), label })), ...personas };
  }
}

/** Formation complète (ids déterministes) à partir de ses métadonnées et de ses modules. */
export function buildCourse(course: SeedCourse, modules: SeedModule[]): BuiltCourse {
  const outModules: BuiltCourse["modules"] = [];
  const outLessons: BuiltCourse["lessons"] = [];
  modules.forEach((m, mi) => {
    const moduleId = key(course.id, m.key);
    outModules.push({ id: moduleId, courseId: course.id, position: mi, title: m.title, summary: m.summary, objectives: m.objectives });
    m.lessons.forEach((l, li) => {
      const lessonId = key(course.id, l.key);
      outLessons.push({
        id: lessonId,
        courseId: course.id,
        moduleId,
        position: li,
        title: l.title,
        summary: l.summary,
        estimatedMinutes: l.estimatedMinutes,
        isPreview: l.isPreview ?? false,
        blocks: l.blocks.map((b, bi) => buildBlock(lessonId, b, bi)),
      });
    });
  });
  return { course, modules: outModules, lessons: outLessons };
}
