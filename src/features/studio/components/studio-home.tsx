"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Archive, MessageSquare, Plus } from "lucide-react";
import { Button, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { useCollection, useNow, useSession } from "@/lib/hooks";
import { COURSE_STATUSES } from "@/lib/domain/constants";
import { formatDuration, totalMinutes } from "@/lib/domain/academy";
import type { Course, CourseStatus } from "@/lib/domain/types";
import { relative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NewCourseModal } from "@/features/academy/components/new-course-modal";
import { studioChecks } from "../lib/checks";

const COLUMNS: { status: CourseStatus; hint: string }[] = [
  { status: "brouillon", hint: "Écriture en cours" },
  { status: "relecture", hint: "En attente du relecteur" },
  { status: "validee", hint: "Prêtes à publier" },
  { status: "publiee", hint: "Visibles des apprenants" },
];

/** Accueil du Studio : les formations par étape du circuit de publication. */
export function StudioHome() {
  const courses = useCollection("courses");
  const modules = useCollection("courseModules");
  const lessons = useCollection("lessons");
  const comments = useCollection("courseComments");
  const resources = useCollection("resources");
  const users = useCollection("users");
  const now = useNow();
  const { canEdit } = useSession();
  const [creating, setCreating] = React.useState(false);
  const [archived, setArchived] = React.useState(false);

  const info = React.useMemo(() => {
    const ids = new Set(resources.map((r) => r.id));
    return new Map(
      courses.map((c) => {
        const ms = modules.filter((m) => m.courseId === c.id);
        const ls = lessons.filter((l) => l.courseId === c.id);
        const checks = studioChecks(c, ms, ls, ids);
        return [c.id, { modules: ms.length, lessons: ls.length, minutes: totalMinutes(ls), blocking: checks.filter((x) => x.level === "bloquant").length, open: comments.filter((x) => x.courseId === c.id && !x.resolvedAt).length }];
      }),
    );
  }, [courses, modules, lessons, comments, resources]);

  const card = (c: Course) => {
    const i = info.get(c.id)!;
    const reviewer = users.find((u) => u.id === c.reviewerId);
    return (
      <li key={c.id}>
        <Link href={`/studio/${c.id}`} className="block rounded-xl border border-border bg-surface p-3.5 shadow-sm transition-colors hover:border-border-strong">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{c.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {i.modules} modules · {i.lessons} leçons · {formatDuration(i.minutes)}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            {i.open ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 font-medium text-warning-text">
                <MessageSquare className="size-3" aria-hidden="true" /> {i.open} commentaire{i.open > 1 ? "s" : ""}
              </span>
            ) : null}
            {i.blocking ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 font-medium text-danger-text">
                <AlertTriangle className="size-3" aria-hidden="true" /> {i.blocking} bloquant{i.blocking > 1 ? "s" : ""}
              </span>
            ) : null}
            {c.inCatalog ? <span className="rounded-full bg-success-soft px-2 py-0.5 font-medium text-success-text">Au catalogue</span> : null}
          </div>
          <p className="mt-2 text-[11px] text-faint">
            {c.status === "relecture" && reviewer ? `Relecteur : ${reviewer.name} · ` : ""}modifiée {relative(c.updatedAt, now)}
          </p>
        </Link>
      </li>
    );
  };

  const archivedCourses = courses.filter((c) => c.status === "archivee");
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="StartupWeek Academy"
        title="Studio"
        description="Créez et faites évoluer le contenu des formations : édition sur place, vue stagiaire, fiche catalogue, relecture puis publication. Les inscriptions et le suivi des apprenants restent dans Academy."
        actions={
          canEdit("academy") ? (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Nouvelle formation
            </Button>
          ) : null
        }
      />
      {courses.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const list = courses.filter((c) => c.status === col.status).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
            return (
              <section key={col.status} aria-label={col.hint} className="min-w-0 rounded-2xl bg-surface-2 p-3">
                <header className="mb-3 flex items-center justify-between gap-2 px-1">
                  <StatusBadge options={COURSE_STATUSES} value={col.status} />
                  <span className="tabular text-xs text-muted-foreground">{list.length}</span>
                </header>
                <p className="-mt-2 mb-3 px-1 text-[11px] text-muted-foreground">{col.hint}</p>
                <ul className={cn("space-y-2.5", !list.length && "hidden")}>{list.map(card)}</ul>
                {!list.length ? <p className="px-1 pb-2 text-xs text-faint">Aucune formation.</p> : null}
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Aucune formation" description="Créez votre première formation : plan, leçons, puis relecture et publication." />
      )}
      {archivedCourses.length ? (
        <div>
          <Button size="sm" variant="ghost" onClick={() => setArchived((v) => !v)} aria-expanded={archived}>
            <Archive /> {archived ? "Masquer" : "Afficher"} les formations archivées ({archivedCourses.length})
          </Button>
          {archived ? <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">{archivedCourses.map(card)}</ul> : null}
        </div>
      ) : null}
      <NewCourseModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
