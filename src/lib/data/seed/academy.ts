/**
 * StartupWeek Academy (démo) : la formation type « Construire son MVP avec l'IA »
 * (liée aux sessions StartupWeek), une formation en cours de rédaction, un parcours,
 * les inscriptions des participants (session), quelques achats en ligne, une cohorte
 * école, et la progression simulée (leçons, quiz, connexions, livrables).
 */
import type { Assignment, Contact, Enrollment, EnrollmentSource, ID, Lesson, LessonProgress, LearnerConnection, Persona, QuizBlock } from "../../domain/types";
import { summarizeProgress } from "../../domain/academy";
import type { BuiltCourse } from "../academy/authoring";
import { MVP_IA_COURSE_ID, mvpIaCourse } from "../academy/mvp-ia";
import { iterationLabDraft } from "../academy/iteration-lab";
import { type SeedContext, stamps } from "./context";
import { DAY, HOUR, MIN, type Rng } from "./helpers";
import { ORG } from "./organizations";
import { U } from "./team";
import { SPK, evId } from "./events";

const ACCESS_DAYS = 183;

function addCourse(ctx: SeedContext, built: BuiltCourse, createdTs: number) {
  const st = stamps(ctx, createdTs, ctx.clock.rel(-2));
  ctx.data.courses.push({ ...built.course, ...st });
  built.modules.forEach((m) => ctx.data.courseModules.push({ ...m, ...st }));
  built.lessons.forEach((l) => ctx.data.lessons.push({ ...l, ...st }));
}

/** Contenu fictif d'un livrable (démo). */
function deliverableText(title: string, r: Rng): string {
  const opener = r.pick([
    "Voici ma proposition",
    "Première version ci-dessous",
    "Version retravaillée après les entretiens",
    "Livrable complété",
  ]);
  return `${opener} pour « ${title} ». Hypothèses, choix et points sur lesquels j'aimerais un retour détaillés dans le document partagé.`;
}

const FEEDBACK_OK = [
  "Très clair et bien argumenté. Pensez à relier chaque choix à une hypothèse à valider.",
  "Bon travail : périmètre réaliste. Ajoutez un critère d'acceptation mesurable sur le parcours clé.",
  "Solide. Le hors-périmètre est bien posé ; gardez cette discipline pendant le build.",
];
const FEEDBACK_REDO = [
  "Le livrable reste trop générique : reprenez-le avec les mots de vos entretiens utilisateurs.",
  "Il manque les critères d'acceptation : sans eux, impossible de savoir quand c'est « fini ».",
];

interface Plan {
  contactId: ID;
  source: EnrollmentSource;
  persona: Persona;
  eventId?: ID;
  applicationId?: ID;
  cohortId?: ID;
  grantedTs: number;
  expiresTs: number;
  /** Part de la formation terminée visée (0-1). */
  target: number;
}

export function buildAcademy(ctx: SeedContext): void {
  const { clock, data } = ctx;
  const r = ctx.rng.fork("academy");

  /* ── Formations & parcours ── */
  const mvp = mvpIaCourse();
  const swEvents = data.events.filter((e) => e.kind === "startup_week");
  mvp.course = {
    ...mvp.course,
    eventIds: swEvents.map((e) => e.id),
    authorIds: [U.aurelien, U.claire, U.karim],
    speakerIds: [SPK.karim, SPK.hannah, SPK.julie],
    publishedAt: clock.iso(clock.rel(-45)),
  };
  addCourse(ctx, mvp, clock.rel(-70));
  addCourse(ctx, iterationLabDraft(), clock.rel(-12));

  data.academyPaths.push({
    id: "pth_fondateur_ia",
    title: "Parcours Fondateur IA",
    slug: "parcours-fondateur-ia",
    description: "Construire son MVP avec l'IA, puis le faire grandir pendant les 90 jours qui suivent le lancement.",
    status: "brouillon",
    personas: [],
    courseIds: [MVP_IA_COURSE_ID, "crs_iteration_lab"],
    priceCents: 0,
    inCatalog: false,
    ...stamps(ctx, clock.rel(-10)),
  });

  /* ── Cohorte école : étudiants Ynov (Startup Village de janvier) ── */
  const village = data.events.find((e) => e.id === evId("SV-0002"));
  const students: Contact[] = [
    ["Inès", "Marchand"],
    ["Hugo", "Leclerc"],
    ["Camille", "Vidal"],
    ["Rayan", "Benali"],
    ["Léna", "Garnier"],
    ["Tom", "Perrin"],
  ].map(([first, last], i) => ({
    id: `ct_ynov_${i + 1}`,
    firstName: first,
    lastName: last,
    email: `${first.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${last.toLowerCase()}@etudiant.example.fr`,
    lifecycle: "participant",
    source: "ecole",
    orgId: ORG.ynov,
    tags: ["Startup Village", "Cohorte Ynov"],
    consent: { gdpr: true, marketing: false, source: "Convention école" },
    score: 40,
    ...stamps(ctx, clock.rel(-14)),
  }));
  data.contacts.push(...students);
  const cohortStart = clock.rel(-12);
  const cohortEnd = (village ? new Date(village.endAt).getTime() : clock.rel(120)) + ACCESS_DAYS * DAY;
  data.cohorts.push({
    id: "coh_ynov_2027",
    name: "Ynov Campus — préparation Startup Village janvier 2027",
    orgId: ORG.ynov,
    eventId: village?.id,
    courseIds: [MVP_IA_COURSE_ID],
    contactIds: students.map((s) => s.id),
    seats: 60,
    startsAt: clock.iso(cohortStart),
    endsAt: clock.iso(cohortEnd),
    notes: "Liste complète des étudiants à importer après les inscriptions internes de l'école (60 places).",
    ...stamps(ctx, cohortStart),
  });

  /* ── Qui suit la formation ? ── */
  const plans: Plan[] = [];
  const now = clock.now;
  const inscrites = data.applications.filter((a) => a.status === "inscrite" && swEvents.some((e) => e.id === a.eventId));
  // Les sessions les plus récentes d'abord (les apprenants actifs), plafonné pour garder un jeu de démo léger.
  const byRecency = [...inscrites].sort((a, b) => {
    const ea = data.events.find((e) => e.id === a.eventId)!;
    const eb = data.events.find((e) => e.id === b.eventId)!;
    return new Date(eb.startAt).getTime() - new Date(ea.startAt).getTime();
  });
  for (const app of byRecency.slice(0, 22)) {
    const ev = data.events.find((e) => e.id === app.eventId)!;
    const start = new Date(ev.startAt).getTime();
    const end = new Date(ev.endAt).getTime();
    const granted = Math.min(clock.past(app.decisionAt ? new Date(app.decisionAt).getTime() + 3 * DAY : start - 14 * DAY), now - 2 * DAY);
    const expires = Math.max(granted, end) + ACCESS_DAYS * DAY;
    const daysSince = (now - granted) / DAY;
    // Avant la session : préparation (modules 0-2) ; après : progression variable, certains ont terminé.
    const target = end > now ? r.float(0.03, 0.3) : Math.min(1, (daysSince / 60) * r.float(0.5, 1.2));
    plans.push({ contactId: app.contactId, source: "session", persona: app.persona, eventId: ev.id, applicationId: app.id, grantedTs: granted, expiresTs: expires, target });
  }
  // Achats en ligne (e-learning seul).
  const buyers = data.contacts.filter((c) => (c.lifecycle === "lead" || c.lifecycle === "prospect") && !data.applications.some((a) => a.contactId === c.id));
  r.pickN(buyers, 3).forEach((c, i) => {
    const granted = clock.rel(-[48, 21, 6][i]);
    plans.push({ contactId: c.id, source: "achat", persona: r.pick<Persona>(["non_tech", "reconversion", "tech"]), grantedTs: granted, expiresTs: granted + ACCESS_DAYS * DAY, target: [0.55, 0.22, 0.05][i] });
  });
  students.forEach((s) => plans.push({ contactId: s.id, source: "cohorte", persona: r.pick<Persona>(["tech", "non_tech"]), cohortId: "coh_ynov_2027", eventId: village?.id, grantedTs: cohortStart, expiresTs: cohortEnd, target: r.float(0, 0.12) }));

  /* ── Progression simulée ── */
  const lessons = mvp.lessons as Lesson[];
  const formateurExercises = new Map<ID, { blockId: ID; title: string; deliverable: string }[]>();
  lessons.forEach((l) =>
    formateurExercises.set(
      l.id,
      l.blocks.flatMap((b) => (b.type === "exercice" && b.review === "formateur" && !b.personas?.length ? [{ blockId: b.id, title: b.title, deliverable: b.deliverable }] : [])),
    ),
  );

  plans.forEach((p, pi) => {
    const enrollmentId = `enr_${String(pi + 1).padStart(3, "0")}`;
    const doneCount = Math.min(lessons.length, Math.round(p.target * lessons.length));
    const inProgress = doneCount < lessons.length && p.target > 0.01;
    const touched = lessons.slice(0, doneCount + (inProgress ? 1 : 0));
    const lastTs = clock.past(Math.min(now - r.between(2, 60) * HOUR, p.grantedTs + Math.max(1, touched.length) * r.float(0.6, 1.4) * DAY));
    const span = Math.max(HOUR, lastTs - p.grantedTs - HOUR);
    const progress: LessonProgress[] = [];
    touched.forEach((l, li) => {
      const t0 = p.grantedTs + HOUR + (span * li) / Math.max(1, touched.length);
      const done = li < doneCount;
      const quizScores: Record<string, number> = {};
      const checklist: Record<string, string[]> = {};
      if (done) {
        for (const b of l.blocks) {
          if (b.type === "quiz") quizScores[b.id] = (b as QuizBlock).graded ? r.between(60, 100) : r.between(50, 100);
          if (b.type === "checklist") checklist[b.id] = b.items.map((it) => it.id);
        }
      }
      const seconds = Math.round(l.estimatedMinutes * 60 * (done ? r.float(0.6, 1.3) : r.float(0.1, 0.5)));
      progress.push({
        id: `lpr_${enrollmentId.slice(4)}_${li + 1}`,
        enrollmentId,
        lessonId: l.id,
        courseId: MVP_IA_COURSE_ID,
        contactId: p.contactId,
        status: done ? "terminee" : "en_cours",
        startedAt: clock.iso(clock.past(t0)),
        completedAt: done ? clock.iso(clock.past(t0 + seconds * 1000)) : undefined,
        timeSpentSeconds: seconds,
        quizScores,
        quizAttempts: Object.keys(quizScores).length,
        checklist,
        ...stamps(ctx, t0, t0 + seconds * 1000),
      });
    });
    data.lessonProgress.push(...progress);

    // Connexions : 1 à 3 leçons par connexion.
    const connections: LearnerConnection[] = [];
    for (let i = 0; i < progress.length; ) {
      const n = Math.min(progress.length - i, r.between(1, 3));
      const group = progress.slice(i, i + n);
      const startTs = new Date(group[0].startedAt).getTime() - r.between(1, 8) * MIN;
      const seconds = group.reduce((s, g) => s + g.timeSpentSeconds, 0) + r.between(60, 600);
      const endTs = clock.past(startTs + seconds * 1000);
      connections.push({
        id: `cnx_${enrollmentId.slice(4)}_${connections.length + 1}`,
        enrollmentId,
        contactId: p.contactId,
        courseId: MVP_IA_COURSE_ID,
        startedAt: clock.iso(startTs),
        endedAt: clock.iso(endTs),
        durationSeconds: Math.max(60, Math.round((endTs - startTs) / 1000)),
        lessonIds: group.map((g) => g.lessonId),
        device: r.pick(["Ordinateur · Chrome", "Ordinateur · Safari", "Ordinateur · Firefox", "Tablette · Safari"]),
        ...stamps(ctx, startTs, endTs),
      });
      i += n;
    }
    data.learnerConnections.push(...connections);

    // Livrables des exercices corrigés par un formateur (les 8 plus récents : jeu de démo léger pour le stockage du navigateur).
    const assignments: Assignment[] = [];
    progress
      .filter((g) => g.status === "terminee")
      .filter((g, gi, done) => done.slice(gi).reduce((n, x) => n + (formateurExercises.get(x.lessonId)?.length ?? 0), 0) <= 8)
      .forEach((g) => {
        for (const ex of formateurExercises.get(g.lessonId) ?? []) {
          const submitted = new Date(g.completedAt!).getTime() - 5 * MIN;
          const age = (now - submitted) / DAY;
          const status = age < 3 ? "soumis" : r.chance(0.12) ? "a_reprendre" : "valide";
          const reviewedTs = status === "soumis" ? undefined : clock.past(submitted + r.between(10, 70) * HOUR);
          assignments.push({
            id: `liv_${enrollmentId.slice(4)}_${assignments.length + 1}`,
            enrollmentId,
            lessonId: g.lessonId,
            blockId: ex.blockId,
            courseId: MVP_IA_COURSE_ID,
            contactId: p.contactId,
            submittedAt: clock.iso(submitted),
            content: deliverableText(ex.title, r),
            url: ex.deliverable === "lien" || ex.deliverable === "fichier" ? `https://docs.example.com/${enrollmentId}/${assignments.length + 1}` : undefined,
            status,
            feedback: status === "valide" ? r.pick(FEEDBACK_OK) : status === "a_reprendre" ? r.pick(FEEDBACK_REDO) : undefined,
            grade: status === "valide" ? r.between(12, 19) : status === "a_reprendre" ? r.between(6, 9) : undefined,
            reviewerId: status === "soumis" ? undefined : r.pick([U.karim, U.claire]),
            reviewedAt: reviewedTs ? clock.iso(reviewedTs) : undefined,
            ...stamps(ctx, submitted, reviewedTs ?? submitted),
          });
        }
      });
    data.assignments.push(...assignments);

    const summary = summarizeProgress(lessons, progress);
    const completed = summary.done === lessons.length;
    const completedAt = completed ? progress[progress.length - 1].completedAt : undefined;
    const enrollment: Enrollment = {
      id: enrollmentId,
      courseId: MVP_IA_COURSE_ID,
      contactId: p.contactId,
      source: p.source,
      status: completed ? "terminee" : p.expiresTs < now ? "expiree" : "active",
      persona: p.persona,
      eventId: p.eventId,
      applicationId: p.applicationId,
      cohortId: p.cohortId,
      grantedAt: clock.iso(p.grantedTs),
      expiresAt: clock.iso(p.expiresTs),
      startedAt: progress[0]?.startedAt,
      lastActivityAt: connections.length ? connections[connections.length - 1].endedAt : undefined,
      completedAt,
      progressPercent: summary.percent,
      timeSpentMinutes: summary.timeSpentMinutes,
      quizAverage: summary.quizAverage,
      certificateIssuedAt: completed && completedAt ? clock.iso(clock.past(new Date(completedAt).getTime() + 2 * DAY)) : undefined,
      ...stamps(ctx, p.grantedTs, lastTs),
    };
    data.enrollments.push(enrollment);
  });
}
