"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { BookOpenCheck, ClipboardCheck, GraduationCap, Plus, Route, School, Users } from "lucide-react";
import { Button, Tabs } from "@/components/ui";
import { useCollection, useNow, useSession } from "@/lib/hooks";
import { effectiveStatus, formatDuration } from "@/lib/domain/academy";
import { number } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DaScope, DaSwitcher, useAcademyDa } from "./da";
import { CoursesTab } from "./courses-tab";
import { PathsTab } from "./paths-tab";
import { LearnersTab } from "./learners-tab";
import { AssignmentsTab } from "./assignments-tab";
import { CohortsTab } from "./cohorts-tab";
import { NewCourseModal } from "./new-course-modal";
import type { AcademyDa } from "../lib/da";

const TABS = ["formations", "parcours", "apprenants", "livrables", "cohortes"] as const;
type Tab = (typeof TABS)[number];
const isTab = (v: string | null): v is Tab => !!v && (TABS as readonly string[]).includes(v);

function setTabQuery(tab: Tab) {
  const params = new URLSearchParams(window.location.search);
  params.set("onglet", tab);
  window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
}

function Kpi({ da, label, value, hint }: { da: AcademyDa; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className={cn("min-w-0 border-da-line", da === "campus" ? "border-l pl-4" : "rounded-da border bg-da-card/70 p-3")}>
      <div className={cn("text-xs text-da-muted", da === "atelier" && "font-mono uppercase tracking-wider text-[10px]")}>{label}</div>
      <div className={cn("tabular mt-1 truncate text-da-ink", da === "campus" ? "font-da-title text-3xl" : "font-da-title text-2xl font-semibold")}>{value}</div>
      {hint ? <div className="mt-0.5 truncate text-xs text-da-muted">{hint}</div> : null}
    </div>
  );
}

export function AcademyPage() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("onglet");
  const [tab, setTab] = React.useState<Tab>(isTab(raw) ? raw : "formations");
  const [da, setDa] = useAcademyDa();
  const [creating, setCreating] = React.useState(false);
  const { canEdit } = useSession();
  const editable = canEdit("academy");

  const courses = useCollection("courses");
  const paths = useCollection("academyPaths");
  const enrollments = useCollection("enrollments");
  const assignments = useCollection("assignments");
  const cohorts = useCollection("cohorts");
  const lessons = useCollection("lessons");
  const now = useNow();

  const kpi = React.useMemo(() => {
    const active = enrollments.filter((e) => effectiveStatus(e, now) === "active");
    const minutes = enrollments.reduce((s, e) => s + e.timeSpentMinutes, 0);
    const published = courses.filter((c) => c.status === "publiee");
    const withQuiz = enrollments.filter((e) => e.quizAverage !== undefined);
    return {
      published: published.length,
      contentMinutes: lessons.filter((l) => published.some((c) => c.id === l.courseId)).reduce((s, l) => s + l.estimatedMinutes, 0),
      active: active.length,
      avgProgress: active.length ? Math.round(active.reduce((s, e) => s + e.progressPercent, 0) / active.length) : 0,
      hours: Math.round(minutes / 60),
      toReview: assignments.filter((a) => a.status === "soumis").length,
      quiz: withQuiz.length ? Math.round(withQuiz.reduce((s, e) => s + (e.quizAverage ?? 0), 0) / withQuiz.length) : undefined,
      certificates: enrollments.filter((e) => e.certificateIssuedAt).length,
    };
  }, [courses, enrollments, assignments, lessons, now]);

  const change = (t: Tab) => {
    setTab(t);
    setTabQuery(t);
  };

  return (
    <div className="pb-16">
      <DaScope da={da} className={cn("-mx-4 -mt-6 mb-6 overflow-hidden px-4 pb-6 pt-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8", da === "neon" && "grid-bg", da !== "neon" && "border-b border-da-line")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className={cn("eyebrow mb-2 inline-flex items-center gap-1.5 text-da-accent", da === "atelier" && "font-mono")}>
              <GraduationCap className="size-3.5" aria-hidden="true" /> StartupWeek Academy
            </div>
            <h1 className={cn("text-balance text-da-ink", da === "campus" ? "font-da-title text-3xl sm:text-4xl" : da === "neon" ? "font-da-title text-2xl font-bold tracking-tight sm:text-3xl" : "text-xl font-semibold sm:text-2xl")}>
              {da === "campus" ? (
                <>
                  Créer, publier et suivre <em>vos formations en ligne</em>
                </>
              ) : da === "neon" ? (
                <>
                  Vos formations en ligne, <span className="text-da-accent">de l&apos;idée au certificat</span>
                </>
              ) : (
                "Formations en ligne"
              )}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-da-muted">
              Contenus réservés aux participants des sessions et vendus en e-learning : parcours, formations, leçons adaptées à chaque profil, suivi de la progression et preuves de réalisation (FOAD).
            </p>
          </div>
          {editable ? (
            <Button onClick={() => setCreating(true)} className={cn(da !== "atelier" && "bg-da-accent text-da-accent-ink hover:bg-da-accent/90", da === "atelier" && "bg-da-accent text-da-accent-ink hover:opacity-90")}>
              <Plus /> Nouvelle formation
            </Button>
          ) : null}
        </div>
        <div className={cn("mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4", da === "campus" && "gap-6")}>
          <Kpi da={da} label="Formations publiées" value={number(kpi.published)} hint={`${formatDuration(kpi.contentMinutes)} de contenu`} />
          <Kpi da={da} label="Apprenants actifs" value={number(kpi.active)} hint={`Progression moyenne ${kpi.avgProgress} %`} />
          <Kpi da={da} label="Temps d'apprentissage" value={`${number(kpi.hours)} h`} hint={kpi.quiz !== undefined ? `Quiz évalués : ${kpi.quiz} % de moyenne` : "Aucun quiz évalué"} />
          <Kpi da={da} label="Livrables à corriger" value={number(kpi.toReview)} hint={`${number(kpi.certificates)} certificat${kpi.certificates > 1 ? "s" : ""} délivré${kpi.certificates > 1 ? "s" : ""}`} />
        </div>
      </DaScope>

      <Tabs<Tab>
        value={tab}
        onChange={change}
        className="mb-5"
        tabs={[
          { value: "formations", label: "Formations", icon: BookOpenCheck, count: courses.length },
          { value: "parcours", label: "Parcours", icon: Route, count: paths.length },
          { value: "apprenants", label: "Apprenants", icon: Users, count: enrollments.length },
          { value: "livrables", label: "Livrables", icon: ClipboardCheck, count: kpi.toReview },
          { value: "cohortes", label: "Cohortes", icon: School, count: cohorts.length },
        ]}
      />

      <div key={tab} className="page-enter">
        {tab === "formations" ? <CoursesTab da={da} onCreate={editable ? () => setCreating(true) : undefined} /> : null}
        {tab === "parcours" ? <PathsTab da={da} /> : null}
        {tab === "apprenants" ? <LearnersTab /> : null}
        {tab === "livrables" ? <AssignmentsTab /> : null}
        {tab === "cohortes" ? <CohortsTab /> : null}
      </div>

      <NewCourseModal open={creating} onClose={() => setCreating(false)} />
      <DaSwitcher value={da} onChange={setDa} />
    </div>
  );
}
