"use client";

import * as React from "react";
import { useCollection, useNow } from "@/lib/hooks";
import { effectiveStatus, orderedLessons, totalMinutes } from "@/lib/domain/academy";
import type { Course, CourseModule, Enrollment, ID, Lesson } from "@/lib/domain/types";

export interface CourseStats {
  modules: number;
  lessons: number;
  minutes: number;
  enrolled: number;
  active: number;
  completed: number;
  avgProgress: number; // % moyen des inscriptions ouvertes
  toReview: number; // livrables à corriger
}

/** Leçons ordonnées d'une formation (mémoïsé sur les collections). */
export function useCourseOutline(courseId: ID | undefined): { modules: CourseModule[]; lessons: Lesson[]; byModule: Map<ID, Lesson[]> } {
  const modules = useCollection("courseModules");
  const lessons = useCollection("lessons");
  return React.useMemo(() => {
    if (!courseId) return { modules: [], lessons: [], byModule: new Map() };
    const mods = modules.filter((m) => m.courseId === courseId).sort((a, b) => a.position - b.position);
    const ordered = orderedLessons(courseId, modules, lessons);
    const byModule = new Map<ID, Lesson[]>(mods.map((m) => [m.id, []]));
    for (const l of ordered) byModule.get(l.moduleId)?.push(l);
    return { modules: mods, lessons: ordered, byModule };
  }, [courseId, modules, lessons]);
}

/** Statistiques par formation (catalogue, tableau de bord). */
export function useCourseStats(): Map<ID, CourseStats> {
  const courses = useCollection("courses");
  const modules = useCollection("courseModules");
  const lessons = useCollection("lessons");
  const enrollments = useCollection("enrollments");
  const assignments = useCollection("assignments");
  const now = useNow();
  return React.useMemo(() => {
    const out = new Map<ID, CourseStats>();
    for (const c of courses) {
      const ls = lessons.filter((l) => l.courseId === c.id);
      const es = enrollments.filter((e) => e.courseId === c.id);
      const open = es.filter((e) => effectiveStatus(e, now) === "active");
      out.set(c.id, {
        modules: modules.filter((m) => m.courseId === c.id).length,
        lessons: ls.length,
        minutes: totalMinutes(ls),
        enrolled: es.length,
        active: open.length,
        completed: es.filter((e) => e.status === "terminee").length,
        avgProgress: es.length ? Math.round(es.reduce((s, e) => s + e.progressPercent, 0) / es.length) : 0,
        toReview: assignments.filter((a) => a.courseId === c.id && a.status === "soumis").length,
      });
    }
    return out;
  }, [courses, modules, lessons, enrollments, assignments, now]);
}

/** Libellé court de l'origine d'un accès. */
export function accessOrigin(e: Enrollment, lookups: { eventCode?: (id: ID) => string | undefined; cohortName?: (id: ID) => string | undefined }): string {
  if (e.source === "session") return e.eventId ? `Session ${lookups.eventCode?.(e.eventId) ?? ""}`.trim() : "Session";
  if (e.source === "cohorte") return e.cohortId ? (lookups.cohortName?.(e.cohortId) ?? "Cohorte") : "Cohorte";
  if (e.source === "achat") return "Achat en ligne";
  return "Accès manuel";
}

/** Prix affiché (TTC) ou « non vendue seule ». */
export function priceLabel(c: Pick<Course, "priceCents" | "inCatalog">, money: (c: number) => string): string {
  if (!c.priceCents) return "Prix à définir";
  return `${money(c.priceCents)} TTC${c.inCatalog ? "" : " · hors catalogue"}`;
}
