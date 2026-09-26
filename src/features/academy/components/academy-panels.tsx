"use client";

import * as React from "react";
import Link from "next/link";
import { GraduationCap, KeyRound, Link2 } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Progress, StatusBadge, useToast } from "@/components/ui";
import { useActions, useCollection, useNow, useSession } from "@/lib/hooks";
import { ENROLLMENT_STATUSES } from "@/lib/domain/constants";
import { effectiveStatus } from "@/lib/domain/academy";
import { syncCourseEnrollments } from "@/lib/domain/actions";
import type { EventSession, ID } from "@/lib/domain/types";
import { date, relative } from "@/lib/format";
import { EnrollmentTable } from "./learners-tab";

/** Carte « StartupWeek Academy » d'un contact (fiche contact, fiche candidature). */
export function ContactAcademyCard({ contactId }: { contactId: ID }) {
  const enrollments = useCollection("enrollments");
  const courses = useCollection("courses");
  const now = useNow();
  const { can } = useSession();
  const mine = React.useMemo(() => enrollments.filter((e) => e.contactId === contactId), [enrollments, contactId]);
  if (!can("academy")) return null;
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="size-4" aria-hidden="true" /> StartupWeek Academy
          </CardTitle>
          <CardDescription>{mine.length ? "Formations en ligne accessibles dans Mon espace." : "Aucun accès e-learning."}</CardDescription>
        </div>
      </CardHeader>
      {mine.length ? (
        <CardContent className="space-y-3">
          {mine.map((e) => (
            <Link key={e.id} href={`/academy/apprenants/${e.id}`} className="block rounded-md border border-border p-3 transition-colors hover:border-border-strong">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium">{courses.find((c) => c.id === e.courseId)?.title ?? "Formation"}</span>
                <StatusBadge options={ENROLLMENT_STATUSES} value={effectiveStatus(e, now)} className="shrink-0 text-[11px]" />
              </div>
              <Progress value={e.progressPercent} className="mt-2" label={`Progression ${e.progressPercent} %`} />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{e.progressPercent} % · {Math.round(e.timeSpentMinutes / 6) / 10} h</span>
                <span>{e.lastActivityAt ? `actif ${relative(e.lastActivityAt, now)}` : `jusqu'au ${date(e.expiresAt)}`}</span>
              </div>
            </Link>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}

/** Onglet « Academy » d'une session : formations liées et progression des participants. */
export function SessionAcademyTab({ ev, canEdit }: { ev: EventSession; canEdit: boolean }) {
  const courses = useCollection("courses");
  const enrollments = useCollection("enrollments");
  const applications = useCollection("applications");
  const { update } = useActions();
  const { canEdit: can } = useSession();
  const toast = useToast();
  const editable = canEdit && can("academy");
  const linked = courses.filter((c) => c.eventIds.includes(ev.id));
  const rows = React.useMemo(() => enrollments.filter((e) => e.eventId === ev.id), [enrollments, ev.id]);
  const enrolledContacts = applications.filter((a) => a.eventId === ev.id && a.status === "inscrite").map((a) => a.contactId);

  if (!linked.length) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Aucune formation en ligne liée"
        description="Liez une formation StartupWeek Academy : chaque participant inscrit y aura accès automatiquement pendant 6 mois après la session."
        action={
          editable ? (
            <div className="flex flex-wrap justify-center gap-2">
              {courses
                .filter((c) => c.status !== "archivee")
                .map((c) => (
                  <Button key={c.id} size="sm" variant="secondary" onClick={() => (update("courses", c.id, { eventIds: [...c.eventIds, ev.id] }, { log: `Session ${ev.code} liée` }), toast({ title: `« ${c.title} » liée à ${ev.code}` }))}>
                    <Link2 /> {c.title}
                  </Button>
                ))}
            </div>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {linked.map((c) => {
          const es = rows.filter((e) => e.courseId === c.id);
          const missing = enrolledContacts.filter((id) => !enrollments.some((e) => e.courseId === c.id && e.contactId === id)).length;
          const avg = es.length ? Math.round(es.reduce((s, e) => s + e.progressPercent, 0) / es.length) : 0;
          return (
            <Card key={c.id}>
              <CardHeader>
                <div className="min-w-0">
                  <CardTitle>
                    <Link href={`/academy/formations/${c.id}`} className="hover:text-accent-text">
                      {c.title}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {es.length} apprenant{es.length > 1 ? "s" : ""} de cette session · progression moyenne {avg} %
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={avg} label="Progression moyenne" />
                {missing > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-warning-text">
                    <span>{missing} inscrit(s) sans accès</span>
                    {editable ? (
                      <Button size="xs" onClick={() => toast({ title: `${syncCourseEnrollments(c.id)} accès ouverts` })}>
                        <KeyRound /> Ouvrir les accès
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <EnrollmentTable rows={rows} />
    </div>
  );
}
