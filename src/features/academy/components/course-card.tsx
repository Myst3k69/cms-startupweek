"use client";

import Link from "next/link";
import { BookOpen, Clock, Layers, Users } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { COURSE_STATUSES } from "@/lib/domain/constants";
import { formatDuration } from "@/lib/domain/academy";
import type { Course } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import type { AcademyDa } from "../lib/da";
import type { CourseStats } from "../lib/use-academy";

const STOP = new Set(["avec", "pour", "son", "sa", "ses", "les", "des", "une", "dans", "sur", "par", "faire", "the", "and"]);

/** Visuel de couverture généré (pas d'image : motif propre à chaque direction artistique). */
function Cover({ da, title, index }: { da: AcademyDa; title: string; index: number }) {
  const initials = title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (da === "campus") {
    return (
      <div className="relative flex h-28 items-end border-b border-da-line bg-da-card-2 px-5 pb-3">
        <span className="font-da-title text-5xl italic leading-none text-da-accent/80">{String(index + 1).padStart(2, "0")}</span>
        <span className="eyebrow ml-3 pb-1 text-da-muted">Formation</span>
      </div>
    );
  }
  if (da === "atelier") {
    return (
      <div className="flex h-16 items-center gap-3 border-b border-da-line bg-da-card-2 px-4">
        <span className="inline-flex size-9 items-center justify-center rounded-md bg-da-accent-soft font-mono text-sm font-semibold text-da-accent">{initials || "SW"}</span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-da-muted">course/{index + 1}</span>
      </div>
    );
  }
  return (
    <div className="grid-bg relative h-32 overflow-hidden border-b border-da-line">
      <div className="absolute -right-6 -top-10 size-40 rounded-full bg-da-accent/20 blur-2xl" aria-hidden="true" />
      <span className="absolute bottom-3 left-4 font-da-title text-4xl font-bold tracking-tight text-da-accent drop-shadow-[0_0_18px_var(--da-accent)]">{initials || "SW"}</span>
    </div>
  );
}

export function CourseCard({ course, stats, da, index }: { course: Course; stats?: CourseStats; da: AcademyDa; index: number }) {
  return (
    <Link
      href={`/academy/formations/${course.id}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-da border border-da-line bg-da-card transition-[border-color,box-shadow,transform]",
        da === "neon" && "hover:-translate-y-0.5 hover:border-da-accent/60 hover:shadow-[0_0_32px_-12px_var(--da-accent)]",
        da === "campus" && "hover:border-da-accent/50",
        da === "atelier" && "hover:border-da-accent/60",
      )}
    >
      <Cover da={da} title={course.title} index={index} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge options={COURSE_STATUSES} value={course.status} className="text-[11px]" />
          {course.inCatalog ? <span className="text-[11px] font-medium text-da-accent">Au catalogue</span> : null}
        </div>
        <h3 className={cn("text-balance text-da-ink", da === "campus" ? "font-da-title text-xl leading-snug" : "font-da-title text-base font-semibold")}>{course.title}</h3>
        {course.subtitle ? <p className="line-clamp-2 text-sm text-da-muted">{course.subtitle}</p> : null}
        <div className={cn("mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-2 text-xs text-da-muted", da === "atelier" && "font-mono text-[11px]")}>
          <span className="inline-flex items-center gap-1">
            <Layers className="size-3.5" aria-hidden="true" /> {stats?.modules ?? 0} modules
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5" aria-hidden="true" /> {stats?.lessons ?? 0} leçons
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" /> {formatDuration(stats?.minutes ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" aria-hidden="true" /> {stats?.enrolled ?? 0} apprenant{(stats?.enrolled ?? 0) > 1 ? "s" : ""}
          </span>
        </div>
        {stats?.enrolled ? (
          <div className="pt-1">
            <div className="mb-1 flex justify-between text-[11px] text-da-muted">
              <span>Progression moyenne</span>
              <span className="tabular">{stats.avgProgress} %</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-da-card-2" role="progressbar" aria-valuenow={stats.avgProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Progression moyenne">
              <div className="h-full rounded-full bg-da-accent" style={{ width: `${stats.avgProgress}%` }} />
            </div>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
