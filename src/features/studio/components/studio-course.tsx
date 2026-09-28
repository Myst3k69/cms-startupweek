"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ClipboardCheck, Eye, FileSearch, Globe, ListTree, Loader2, PenLine } from "lucide-react";
import { Button, EmptyState, LinkButton, Segmented, StatusBadge, Tabs } from "@/components/ui";
import { useActions, useCollection, useEntity, useSession } from "@/lib/hooks";
import { COURSE_STATUSES, PERSONAS } from "@/lib/domain/constants";
import { orderedLessons } from "@/lib/domain/academy";
import type { Course, ID } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { FocusModeButton } from "@/components/layout/focus-mode";
import { Outline } from "@/features/academy/components/outline";
import { CoursePreview } from "@/features/academy/components/course-preview";
import { useCourseOutline } from "@/features/academy/lib/use-academy";
import { useLessonDraft, type SaveState } from "../lib/use-lesson-draft";
import { studioChecks } from "../lib/checks";
import { FormatToolbar } from "./editable";
import { LessonCanvas, type SeeAs } from "./lesson-canvas";
import { Inspector } from "./inspector";
import { CatalogView } from "./catalog-view";
import { ReviewView, SendToReviewButton } from "./review-view";

export type StudioView = "edition" | "stagiaire" | "catalogue" | "relecture";
const VIEWS: StudioView[] = ["edition", "stagiaire", "catalogue", "relecture"];

function setQuery(patch: Record<string, string | null>) {
  const url = new URL(window.location.href);
  Object.entries(patch).forEach(([k, v]) => (v === null ? url.searchParams.delete(k) : url.searchParams.set(k, v)));
  window.history.replaceState(null, "", url.toString());
}

export function StudioCourse({ id }: { id: ID }) {
  const course = useEntity("courses", id);
  if (!course) return <EmptyState icon={FileSearch} title="Formation introuvable" description="Elle a peut-être été supprimée, ou le lien est erroné." action={<LinkButton href="/studio">Retour au Studio</LinkButton>} className="mt-10" />;
  return <StudioCourseInner course={course} />;
}

function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
      {state === "en_attente" ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-3.5 text-success-text" aria-hidden="true" />}
      {state === "en_attente" ? "Enregistrement…" : "Enregistré"}
    </span>
  );
}

function StudioCourseInner({ course }: { course: Course }) {
  const params = useSearchParams();
  const router = useRouter();
  const { canEdit } = useSession();
  const editable = canEdit("academy");
  const { modules, lessons, byModule } = useCourseOutline(course.id);
  const resources = useCollection("resources");
  const allComments = useCollection("courseComments");
  const comments = React.useMemo(() => allComments.filter((c) => c.courseId === course.id), [allComments, course.id]);
  const ordered = React.useMemo(() => orderedLessons(course.id, modules, lessons), [course.id, modules, lessons]);
  const raw = params.get("vue") as StudioView | null;
  const [view, setView] = React.useState<StudioView>(raw && VIEWS.includes(raw) ? raw : "edition");
  const [lessonId, setLessonId] = React.useState<ID | undefined>(() => params.get("lecon") ?? undefined);
  const [target, setTarget] = React.useState<{ blockId?: ID; comments?: boolean }>({});
  const [saveState, setSaveState] = React.useState<SaveState>("enregistre");
  const lesson = ordered.find((l) => l.id === lessonId) ?? ordered[0];
  const checks = React.useMemo(() => studioChecks(course, modules, lessons, new Set(resources.map((r) => r.id))), [course, modules, lessons, resources]);
  const blocking = checks.filter((c) => c.level === "bloquant").length;
  const openComments = comments.filter((c) => !c.resolvedAt).length;

  const go = (v: StudioView, opts?: { lessonId?: ID; blockId?: ID }) => {
    setView(v);
    if (opts?.lessonId) setLessonId(opts.lessonId);
    setTarget({ blockId: opts?.blockId });
    setQuery({ vue: v === "edition" ? null : v, lecon: opts?.lessonId ?? lessonId ?? null });
  };
  const selectLesson = (id: ID) => {
    setLessonId(id);
    setTarget({});
    setQuery({ lecon: id });
  };

  return (
    <div className="space-y-4 pb-10">
      <header className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground">
            <Link href="/studio" className="hover:text-foreground">
              Studio
            </Link>{" "}
            › <span className="text-foreground">Formations</span>
          </nav>
          <h1 className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-xl font-semibold tracking-tight">
            <span className="min-w-0 truncate">{course.title}</span>
            <StatusBadge options={COURSE_STATUSES} value={course.status} className="text-xs" />
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {view === "edition" ? <SaveIndicator state={saveState} /> : null}
          <FocusModeButton scope={`/studio/${course.id}`} />
          <LinkButton href={`/academy/formations/${course.id}`} variant="ghost" size="sm">
            Fiche Academy
          </LinkButton>
          {editable && course.status === "brouillon" ? <SendToReviewButton course={course} /> : null}
          {view !== "relecture" && (course.status === "relecture" || course.status === "validee") ? (
            <Button size="sm" onClick={() => go("relecture")}>
              <ClipboardCheck /> {course.status === "validee" ? "Publier" : "Voir la relecture"}
            </Button>
          ) : null}
        </div>
      </header>

      <Tabs<StudioView>
        value={view}
        onChange={(v) => go(v)}
        tabs={[
          { value: "edition", label: "Édition", icon: PenLine },
          { value: "stagiaire", label: "Vue stagiaire", icon: Eye },
          { value: "catalogue", label: "Fiche catalogue", icon: Globe },
          { value: "relecture", label: "Relecture", icon: ClipboardCheck, count: openComments + blocking || undefined },
        ]}
      />

      {view === "edition" ? (
        <>
          {course.status === "publiee" ? (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-text">Formation publiée : vos modifications sont enregistrées automatiquement et visibles immédiatement par les apprenants.</p>
          ) : null}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
            <aside className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
              <Outline course={course} modules={modules} byModule={byModule} selectedId={lesson?.id} onSelect={selectLesson} editable={editable} />
            </aside>
            {lesson ? (
              <LessonWorkspace
                key={lesson.id}
                course={course}
                lessonId={lesson.id}
                editable={editable}
                target={target}
                onSaveState={setSaveState}
                onDeleted={() => {
                  const next = ordered.find((l) => l.id !== lesson.id);
                  setLessonId(next?.id);
                }}
              />
            ) : (
              <EmptyState icon={ListTree} title="Aucune leçon" description="Ajoutez un module puis une leçon dans le programme, à gauche." />
            )}
          </div>
          <FormatToolbar />
        </>
      ) : null}
      {view === "stagiaire" ? <CoursePreview id={course.id} embedded /> : null}
      {view === "catalogue" ? <CatalogView course={course} editable={editable} /> : null}
      {view === "relecture" ? (
        <ReviewView
          course={course}
          checks={checks}
          comments={comments}
          lessons={ordered}
          editable={editable}
          onGo={(t) => {
            if (t.view === "edition") go("edition", { lessonId: t.lessonId, blockId: t.blockId });
            else if (t.view === "catalogue") go("catalogue");
            else router.push(`/academy/formations/${course.id}?onglet=informations`);
          }}
        />
      ) : null}
    </div>
  );
}

/** Colonne centrale (leçon) + panneau de réglages, qui partagent le brouillon de la leçon. */
function LessonWorkspace({
  course,
  lessonId,
  editable,
  target,
  onSaveState,
  onDeleted,
}: {
  course: Course;
  lessonId: ID;
  editable: boolean;
  target: { blockId?: ID; comments?: boolean };
  onSaveState: (s: SaveState) => void;
  onDeleted: () => void;
}) {
  const lesson = useEntity("lessons", lessonId)!;
  const { modules, lessons } = useCourseOutline(course.id);
  const allComments = useCollection("courseComments");
  const { remove } = useActions();
  const { draft, setDraft, saveState, saveNow } = useLessonDraft(lesson, editable);
  const [selected, setSelected] = React.useState<{ id?: ID; comments?: boolean }>({ id: target.blockId, comments: target.comments });
  const [seeAs, setSeeAs] = React.useState<SeeAs>("tous");
  const comments = React.useMemo(() => allComments.filter((c) => c.lessonId === lessonId), [allComments, lessonId]);
  const ordered = orderedLessons(course.id, modules, lessons);
  const moduleIndex = [...modules].sort((a, b) => a.position - b.position).findIndex((m) => m.id === lesson.moduleId);

  React.useEffect(() => onSaveState(saveState), [saveState, onSaveState]);
  React.useEffect(() => {
    if (!target.blockId) return;
    document.querySelector(`[data-block="${target.blockId}"]`)?.scrollIntoView({ block: "center" });
  }, [target.blockId]);

  const deleteLesson = () => {
    if (!window.confirm(`Supprimer la leçon « ${lesson.title} » ? La progression des apprenants sur cette leçon sera perdue.`)) return;
    saveNow();
    remove("lessons", lesson.id, { log: `Leçon « ${lesson.title} » supprimée` });
    onDeleted();
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 space-y-3">
        <div className="mx-auto flex w-full max-w-[46rem] flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Voir comme</span>
          <div className="-mx-1 max-w-full overflow-x-auto px-1">
            <Segmented<SeeAs> size="xs" value={seeAs} onChange={setSeeAs} options={[{ value: "tous", label: "Tous les blocs" }, ...PERSONAS.map((p) => ({ value: p.value as SeeAs, label: p.label }))]} />
          </div>
        </div>
        <LessonCanvas
          draft={draft}
          setDraft={setDraft}
          module={modules.find((m) => m.id === lesson.moduleId)}
          moduleIndex={Math.max(0, moduleIndex)}
          lessonIndex={Math.max(0, ordered.findIndex((l) => l.id === lesson.id))}
          lessonCount={ordered.length}
          selectedBlockId={selected.id}
          onSelectBlock={(id, focusComments) => setSelected({ id, comments: focusComments })}
          seeAs={seeAs}
          comments={comments}
          editable={editable}
        />
      </div>
      <aside className={cn("min-w-0 rounded-xl border border-border bg-surface p-4 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:self-start xl:overflow-y-auto")} aria-label="Réglages">
        <Inspector
          course={course}
          module={modules.find((m) => m.id === lesson.moduleId)}
          lessonId={lesson.id}
          draft={draft}
          setDraft={setDraft}
          selectedBlockId={selected.id}
          comments={comments}
          focusComments={selected.comments}
          editable={editable}
          onDeleteLesson={deleteLesson}
        />
      </aside>
    </div>
  );
}

