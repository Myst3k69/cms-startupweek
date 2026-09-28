"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Clock, FileSearch, Lock, PlayCircle, RotateCcw, Unlock } from "lucide-react";
import { Button, EmptyState, LinkButton, Segmented } from "@/components/ui";
import { useEntity } from "@/lib/hooks";
import { blocksFor, formatDuration, lessonStates, type LessonState } from "@/lib/domain/academy";
import { PERSONAS } from "@/lib/domain/constants";
import type { Course, ID, Lesson, LessonProgress, Persona } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { useCourseOutline } from "../lib/use-academy";
import { FocusModeButton } from "@/components/layout/focus-mode";
import { DaScope, DaSwitcher, useAcademyDa } from "./da";
import { BlockView } from "./block-view";
import type { AcademyDa } from "../lib/da";

const STATE_LABEL: Record<LessonState, string> = { terminee: "Terminée", en_cours: "En cours", disponible: "Disponible", verrouillee: "Verrouillée" };

function StateIcon({ state, className }: { state: LessonState; className?: string }) {
  const Icon = state === "terminee" ? CheckCircle2 : state === "en_cours" ? PlayCircle : state === "verrouillee" ? Lock : Circle;
  return <Icon className={cn("size-4 shrink-0", state === "terminee" && "text-success-text", state === "en_cours" && "text-da-accent", state === "verrouillee" && "text-da-muted/60", state === "disponible" && "text-da-muted", className)} aria-label={STATE_LABEL[state]} />;
}

function Ring({ value, da }: { value: number; da: AcademyDa }) {
  const size = da === "neon" ? 76 : 56;
  const stroke = da === "neon" ? 7 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--da-line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--da-accent)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} className={cn("transition-[stroke-dashoffset] duration-700", da === "neon" && "drop-shadow-[0_0_6px_var(--da-accent)]")} />
      </svg>
      <span className="tabular absolute text-sm font-semibold text-da-ink">{value}%</span>
    </div>
  );
}

/** Aperçu apprenant ; `embedded` : dans l'onglet « Vue stagiaire » du Studio (sans lien de retour ni plein écran). */
export function CoursePreview({ id, embedded }: { id: ID; embedded?: boolean }) {
  const course = useEntity("courses", id);
  if (!course) return <EmptyState icon={FileSearch} title="Formation introuvable" action={<LinkButton href="/academy">Retour</LinkButton>} className="mt-10" />;
  return <PreviewInner course={course} embedded={embedded} />;
}

function PreviewInner({ course, embedded }: { course: Course; embedded?: boolean }) {
  const params = useSearchParams();
  const [da, setDa] = useAcademyDa();
  const { modules, lessons } = useCourseOutline(course.id);
  const [persona, setPersona] = React.useState<Persona>("non_tech");
  const [unlockAll, setUnlockAll] = React.useState(false);
  const [progress, setProgress] = React.useState<Pick<LessonProgress, "lessonId" | "status">[]>([]);
  const [checks, setChecks] = React.useState<Record<string, string[]>>({});
  const [current, setCurrent] = React.useState<ID | undefined>(() => params.get("lecon") ?? undefined);
  const [notice, setNotice] = React.useState<string>();

  const states = React.useMemo(() => lessonStates(lessons, progress, course.sequential && !unlockAll), [lessons, progress, course.sequential, unlockAll]);
  const lesson = lessons.find((l) => l.id === current) ?? lessons.find((l) => states.get(l.id) !== "terminee") ?? lessons[0];
  const index = lesson ? lessons.indexOf(lesson) : -1;
  const done = progress.filter((p) => p.status === "terminee").length;
  const percent = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  const mod = modules.find((m) => m.id === lesson?.moduleId);
  const blocks = lesson ? blocksFor(lesson, persona) : [];
  const hiddenForProfile = lesson ? lesson.blocks.filter((b) => b.personas?.length && !b.personas.includes(persona)).length : 0;

  const open = (l: Lesson) => {
    const st = states.get(l.id);
    if (st === "verrouillee") {
      setNotice(`« ${l.title} » se débloque quand la leçon précédente est terminée.`);
      return;
    }
    setNotice(undefined);
    setCurrent(l.id);
    if (st === "disponible") setProgress((p) => [...p.filter((x) => x.lessonId !== l.id), { lessonId: l.id, status: "en_cours" }]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const complete = () => {
    if (!lesson) return;
    const next = lessons[index + 1];
    setProgress((p) => [...p.filter((x) => x.lessonId !== lesson.id && x.lessonId !== next?.id), { lessonId: lesson.id, status: "terminee" }, ...(next ? [{ lessonId: next.id, status: "en_cours" as const }] : [])]);
    if (next) {
      setCurrent(next.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const sommaire = (
    <nav aria-label="Sommaire de la formation" className="space-y-3">
      {modules.map((m, mi) => {
        const ls = lessons.filter((l) => l.moduleId === m.id);
        const mDone = ls.filter((l) => states.get(l.id) === "terminee").length;
        return (
          <div key={m.id} className={cn(da === "neon" && "rounded-da border border-da-line bg-da-card/60 p-2", da === "atelier" && "border-l-2 border-da-line pl-2")}>
            <p className={cn("mb-1 flex items-baseline gap-2 text-da-ink", da === "campus" ? "font-da-title text-base" : "text-xs font-semibold")}>
              <span className={cn("tabular text-da-accent", da === "atelier" ? "font-mono text-[10px]" : da === "campus" ? "font-da-title italic" : "text-[11px]")}>{da === "campus" ? `${mi}.` : String(mi).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">{m.title}</span>
              <span className="tabular text-[10px] font-normal text-da-muted">
                {mDone}/{ls.length}
              </span>
            </p>
            <ol>
              {ls.map((l) => {
                const st = states.get(l.id) ?? "verrouillee";
                const active = l.id === lesson?.id;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => open(l)}
                      aria-current={active ? "true" : undefined}
                      aria-disabled={st === "verrouillee"}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                        active ? "bg-da-accent-soft font-medium text-da-ink" : "text-da-ink hover:bg-da-card-2",
                        st === "verrouillee" && "cursor-not-allowed text-da-muted",
                      )}
                    >
                      <StateIcon state={st} />
                      <span className="min-w-0 flex-1 truncate">{l.title}</span>
                      <span className="tabular text-[10px] text-da-muted">{l.estimatedMinutes}′</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {embedded ? null : (
            <LinkButton href={`/studio/${course.id}${lesson ? `?lecon=${lesson.id}` : ""}`} variant="ghost" size="sm">
              <ArrowLeft /> Retour au Studio
            </LinkButton>
          )}
          <span className="text-xs text-muted-foreground">Aperçu apprenant (Mon espace) — la progression est simulée, rien n&apos;est enregistré.</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Persona> value={persona} onChange={setPersona} options={PERSONAS.map((p) => ({ value: p.value, label: p.label }))} size="xs" />
          <Button size="xs" variant={unlockAll ? "subtle" : "ghost"} onClick={() => setUnlockAll((v) => !v)} aria-pressed={unlockAll}>
            <Unlock /> Tout débloquer
          </Button>
          <Button size="xs" variant="ghost" onClick={() => (setProgress([]), setChecks({}), setCurrent(lessons[0]?.id))}>
            <RotateCcw /> Réinitialiser
          </Button>
          {embedded ? null : <FocusModeButton scope={`/academy/formations/${course.id}`} size="xs" />}
        </div>
      </div>

      <DaScope da={da} className={cn("-mx-4 min-h-[70dvh] px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8", da === "neon" && "grid-bg", da === "campus" && "border-y border-da-line")}>
        <div className={cn("mx-auto grid max-w-6xl grid-cols-1 gap-6", da === "campus" ? "lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12" : "lg:grid-cols-[18rem_minmax(0,1fr)]")}>
          {/* ── Sommaire ── */}
          <aside className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto">
            <div className={cn("mb-4 flex items-center gap-3", da === "campus" && "flex-col items-start")}>
              <Ring value={percent} da={da} />
              <div className="min-w-0">
                <p className={cn("eyebrow text-da-accent", da === "atelier" && "font-mono")}>StartupWeek Academy</p>
                <p className={cn("text-da-ink", da === "campus" ? "font-da-title text-2xl leading-tight" : "font-da-title text-base font-semibold leading-snug")}>{course.title}</p>
                <p className="text-xs text-da-muted">
                  {done}/{lessons.length} leçons · {formatDuration(lessons.reduce((s, l) => s + l.estimatedMinutes, 0))}
                </p>
              </div>
            </div>
            <div className="hidden lg:block">{sommaire}</div>
            <details className="rounded-da border border-da-line p-2 lg:hidden">
              <summary className="cursor-pointer text-sm font-medium text-da-ink">Sommaire ({done}/{lessons.length} leçons)</summary>
              <div className="mt-3">{sommaire}</div>
            </details>
          </aside>

          {/* ── Leçon ── */}
          <main className={cn("min-w-0", da === "campus" && "max-w-[68ch]")}>
            {notice ? <p className="mb-4 flex items-center gap-2 rounded-md bg-warning-soft p-3 text-sm text-warning-text"><Lock className="size-4" aria-hidden="true" /> {notice}</p> : null}
            {!notice && lesson && states.get(lesson.id) === "verrouillee" ? (
              <p className="mb-4 flex items-center gap-2 rounded-md bg-info-soft p-3 text-sm text-info-text">
                <Lock className="size-4 shrink-0" aria-hidden="true" /> Aperçu auteur : pour un apprenant qui commence la formation, cette leçon est encore verrouillée.
              </p>
            ) : null}
            {lesson ? (
              <article className="space-y-6">
                <header className={cn(da === "neon" && "rounded-da border border-da-line bg-da-card/80 p-5", da === "campus" && "border-b border-da-line pb-6", da === "atelier" && "border-b border-da-line pb-3")}>
                  <p className={cn("text-da-accent", da === "atelier" ? "font-mono text-[11px] uppercase tracking-wider" : "eyebrow")}>
                    {da === "campus" ? `Chapitre ${modules.indexOf(mod!)} — ${mod?.title}` : `Module ${String(modules.indexOf(mod!)).padStart(2, "0")} · ${mod?.title}`}
                  </p>
                  <h1 className={cn("mt-2 text-balance text-da-ink", da === "campus" ? "font-da-title text-4xl leading-tight" : da === "neon" ? "font-da-title text-3xl font-bold tracking-tight" : "text-xl font-semibold")}>{lesson.title}</h1>
                  {lesson.summary ? <p className={cn("mt-2 text-da-muted", da === "campus" ? "font-da-title text-lg italic" : "text-sm")}>{lesson.summary}</p> : null}
                  <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-da-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" aria-hidden="true" /> {formatDuration(lesson.estimatedMinutes)}
                    </span>
                    <span>
                      Leçon {index + 1} / {lessons.length}
                    </span>
                    {hiddenForProfile ? <span>{hiddenForProfile} bloc(s) réservé(s) à d&apos;autres profils</span> : null}
                  </p>
                </header>

                {blocks.map((b) => (
                  <BlockView
                    key={b.id}
                    block={b}
                    da={da}
                    checklist={checks[b.id]}
                    onChecklist={(itemId) => setChecks((c) => ({ ...c, [b.id]: (c[b.id] ?? []).includes(itemId) ? (c[b.id] ?? []).filter((x) => x !== itemId) : [...(c[b.id] ?? []), itemId] }))}
                  />
                ))}

                <footer className={cn("flex flex-wrap items-center justify-between gap-3 pt-2", da === "campus" && "border-t border-da-line pt-6")}>
                  <Button variant="ghost" size="sm" disabled={index <= 0} onClick={() => lessons[index - 1] && open(lessons[index - 1])}>
                    <ArrowLeft /> Précédente
                  </Button>
                  {states.get(lesson.id) === "terminee" ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-success-text">
                      <CheckCircle2 className="size-4" aria-hidden="true" /> Leçon terminée
                    </span>
                  ) : (
                    <Button onClick={complete} className={cn("bg-da-accent text-da-accent-ink hover:bg-da-accent/90", da === "neon" && "shadow-[0_0_24px_-6px_var(--da-accent)]")}>
                      {index < lessons.length - 1 ? (
                        <>
                          Terminer et continuer <ArrowRight />
                        </>
                      ) : (
                        "Terminer la formation"
                      )}
                    </Button>
                  )}
                </footer>
              </article>
            ) : (
              <EmptyState icon={FileSearch} title="Aucune leçon" description="Ajoutez des leçons dans l'éditeur." />
            )}
            <p className="mt-8 text-xs text-da-muted">
              Assistance : {course.assistance || "à renseigner dans les informations de la formation."}{" "}
              <Link href={`/academy/formations/${course.id}?onglet=informations`} className="underline underline-offset-2">
                Modifier
              </Link>
            </p>
          </main>
        </div>
      </DaScope>
      <DaSwitcher value={da} onChange={setDa} />
    </>
  );
}
