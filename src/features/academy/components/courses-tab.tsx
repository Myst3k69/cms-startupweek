"use client";

import * as React from "react";
import { BookOpenCheck, Plus } from "lucide-react";
import { Button, EmptyState, Segmented } from "@/components/ui";
import { useCollection } from "@/lib/hooks";
import type { CourseStatus } from "@/lib/domain/types";
import { DaScope } from "./da";
import { CourseCard } from "./course-card";
import { useCourseStats } from "../lib/use-academy";
import type { AcademyDa } from "../lib/da";

type Filter = "toutes" | CourseStatus;

export function CoursesTab({ da, onCreate }: { da: AcademyDa; onCreate?: () => void }) {
  const courses = useCollection("courses");
  const stats = useCourseStats();
  const [filter, setFilter] = React.useState<Filter>("toutes");

  const rows = React.useMemo(
    () => courses.filter((c) => filter === "toutes" || c.status === filter).sort((a, b) => a.title.localeCompare(b.title, "fr")),
    [courses, filter],
  );
  const count = (s: CourseStatus) => courses.filter((c) => c.status === s).length;

  return (
    <div className="space-y-4">
      <div className="-mx-1 max-w-full overflow-x-auto px-1 scrollbar-thin">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "toutes", label: "Toutes", count: courses.length },
            { value: "publiee", label: "Publiées", count: count("publiee") },
            { value: "relecture", label: "En relecture", count: count("relecture") },
            { value: "brouillon", label: "Brouillons", count: count("brouillon") },
            { value: "archivee", label: "Archivées", count: count("archivee") },
          ]}
        />
      </div>
      {rows.length ? (
        <DaScope da={da} className="rounded-xl p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((c, i) => (
              <CourseCard key={c.id} course={c} stats={stats.get(c.id)} da={da} index={i} />
            ))}
          </div>
        </DaScope>
      ) : (
        <EmptyState
          icon={BookOpenCheck}
          title="Aucune formation"
          description="Créez une formation, structurez-la en modules et leçons, puis liez-la à vos sessions ou proposez-la à la vente."
          action={
            onCreate ? (
              <Button onClick={onCreate}>
                <Plus /> Nouvelle formation
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
