"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button, DataTable, FormField, Modal, Progress, Select, StatusBadge, useToast, type Column } from "@/components/ui";
import { ContactLink } from "@/components/shared/entity-links";
import { ContactPicker } from "@/features/qualiopi/components/contact-picker";
import { useCollection, useLookup, useNow, useSession } from "@/lib/hooks";
import { ENROLLMENT_SOURCES, ENROLLMENT_STATUSES, PERSONAS, labelOf } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import { effectiveStatus } from "@/lib/domain/academy";
import { enrollInCourse } from "@/lib/domain/actions";
import type { Enrollment, ID, Persona } from "@/lib/domain/types";
import { date, relative } from "@/lib/format";
import { accessOrigin } from "../lib/use-academy";

/** Ouverture manuelle d'un accès (invité, geste commercial, partenaire…). */
export function GrantAccessModal({ open, onClose, courseId, contactId }: { open: boolean; onClose: () => void; courseId?: ID; contactId?: ID }) {
  const courses = useCollection("courses");
  const toast = useToast();
  const [course, setCourse] = React.useState(courseId ?? "");
  const [contact, setContact] = React.useState(contactId ?? "");
  const [persona, setPersona] = React.useState<Persona>("non_tech");
  const submit = () => {
    if (!course || !contact) return toast({ title: "Choisissez une formation et un contact", tone: "danger" });
    const r = enrollInCourse({ courseId: course, contactId: contact, source: "manuel", persona });
    toast({ title: r?.created ? "Accès ouvert" : "Accès déjà existant (prolongé si nécessaire)", description: r ? `Jusqu'au ${date(r.enrollment.expiresAt)}.` : undefined });
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Donner un accès"
      description="L'apprenant retrouve la formation dans Mon espace du site (email d'accès journalisé)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>Ouvrir l&apos;accès</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Formation" htmlFor="ga-course">
          <Select id="ga-course" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Choisir…" options={courses.filter((c) => c.status !== "archivee").map((c) => ({ value: c.id, label: c.title }))} />
        </FormField>
        <FormField label="Contact" htmlFor="ga-contact">
          <ContactPicker id="ga-contact" value={contact} onChange={setContact} placeholder="Choisir…" />
        </FormField>
        <FormField label="Profil (variante des contenus)" htmlFor="ga-persona">
          <Select id="ga-persona" value={persona} onChange={(e) => setPersona(e.target.value as Persona)} options={PERSONAS} />
        </FormField>
      </div>
    </Modal>
  );
}

export function EnrollmentTable({ rows, showCourse = true }: { rows: Enrollment[]; showCourse?: boolean }) {
  const contacts = useLookup("contacts");
  const courses = useLookup("courses");
  const events = useLookup("events");
  const cohorts = useLookup("cohorts");
  const now = useNow();
  const router = useRouter();

  const columns: Column<Enrollment>[] = [
    {
      key: "contact",
      header: "Apprenant",
      render: (e) => <ContactLink id={e.contactId} withEmail />,
      sort: (e) => contactName(contacts.get(e.contactId)),
      csv: (e) => contactName(contacts.get(e.contactId)),
    },
    ...(showCourse
      ? [{ key: "course", header: "Formation", render: (e: Enrollment) => <span className="line-clamp-2 block max-w-44 text-sm">{courses.get(e.courseId)?.title ?? "—"}</span>, sort: (e: Enrollment) => courses.get(e.courseId)?.title ?? "", hideBelow: "xl" as const }]
      : []),
    {
      key: "origin",
      header: "Origine",
      render: (e) => <span className="line-clamp-2 block max-w-40 text-xs text-muted-foreground">{accessOrigin(e, { eventCode: (id) => events.get(id)?.code, cohortName: (id) => cohorts.get(id)?.name })}</span>,
      sort: (e) => e.source,
      csv: (e) => labelOf(ENROLLMENT_SOURCES, e.source),
      hideBelow: "md",
    },
    { key: "persona", header: "Profil", render: (e) => <span className="whitespace-nowrap text-xs">{labelOf(PERSONAS, e.persona)}</span>, sort: (e) => e.persona, hideBelow: "2xl" },
    {
      key: "progress",
      header: "Progression",
      render: (e) => (
        <div className="w-28">
          <div className="tabular mb-1 text-xs text-muted-foreground">{e.progressPercent} %</div>
          <Progress value={e.progressPercent} tone={e.progressPercent >= 80 ? "success" : "accent"} label={`Progression ${e.progressPercent} %`} />
        </div>
      ),
      sort: (e) => e.progressPercent,
    },
    { key: "time", header: "Temps", render: (e) => <span className="tabular text-xs">{Math.round(e.timeSpentMinutes / 6) / 10} h</span>, sort: (e) => e.timeSpentMinutes, align: "right", hideBelow: "md" },
    { key: "quiz", header: "Quiz", render: (e) => <span className="tabular text-xs">{e.quizAverage !== undefined ? `${e.quizAverage} %` : "—"}</span>, sort: (e) => e.quizAverage ?? -1, align: "right", hideBelow: "lg" },
    { key: "last", header: "Dernière activité", render: (e) => <span className="whitespace-nowrap text-xs text-muted-foreground">{e.lastActivityAt ? relative(e.lastActivityAt, now) : "Jamais connecté"}</span>, sort: (e) => e.lastActivityAt ?? "", hideBelow: "sm" },
    { key: "expires", header: "Fin d'accès", render: (e) => <span className="whitespace-nowrap text-xs">{date(e.expiresAt)}</span>, sort: (e) => e.expiresAt, hideBelow: "2xl" },
    { key: "status", header: "Statut", render: (e) => <StatusBadge options={ENROLLMENT_STATUSES} value={effectiveStatus(e, now)} className="text-[11px]" />, sort: (e) => effectiveStatus(e, now) },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(e) => e.id}
      searchable={(e) => `${contactName(contacts.get(e.contactId))} ${contacts.get(e.contactId)?.email ?? ""} ${courses.get(e.courseId)?.title ?? ""}`}
      searchPlaceholder="Rechercher un apprenant…"
      onRowClick={(e) => router.push(`/academy/apprenants/${e.id}`)}
      initialSort={{ key: "last", dir: "desc" }}
      exportName="academy-apprenants"
      filters={[
        { key: "status", label: "Statut", options: ENROLLMENT_STATUSES, predicate: (e, v) => effectiveStatus(e, now) === v },
        { key: "source", label: "Origine", options: ENROLLMENT_SOURCES, predicate: (e, v) => e.source === v },
        { key: "persona", label: "Profil", options: PERSONAS, predicate: (e, v) => e.persona === v },
      ]}
      emptyTitle="Aucun apprenant"
      emptyDescription="Les inscrits des sessions liées, les acheteurs et les cohortes apparaissent ici."
    />
  );
}

export function LearnersTab() {
  const enrollments = useCollection("enrollments");
  const { canEdit } = useSession();
  const [granting, setGranting] = React.useState(false);
  return (
    <div className="space-y-4">
      {canEdit("academy") ? (
        <Button size="sm" onClick={() => setGranting(true)}>
          <KeyRound /> Donner un accès
        </Button>
      ) : null}
      <EnrollmentTable rows={enrollments} />
      <GrantAccessModal open={granting} onClose={() => setGranting(false)} />
    </div>
  );
}
