"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, RotateCcw } from "lucide-react";
import { Button, DataTable, Drawer, FormField, Input, Segmented, StatusBadge, Textarea, useToast, type Column } from "@/components/ui";
import { ContactLink, UserChip } from "@/components/shared/entity-links";
import { MarkdownPreview } from "@/features/site/components/markdown-preview";
import { useCollection, useEntity, useLookup, useNow, useSession } from "@/lib/hooks";
import { ASSIGNMENT_STATUSES } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import { reviewAssignment } from "@/lib/domain/actions";
import type { Assignment, ExerciseBlock } from "@/lib/domain/types";
import { dateTime, relative } from "@/lib/format";

/** Correction d'un livrable : consigne, critères, réponse de l'apprenant, retour et note. */
export function AssignmentDrawer({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const lesson = useEntity("lessons", assignment.lessonId);
  const contact = useEntity("contacts", assignment.contactId);
  const { canEdit } = useSession();
  const toast = useToast();
  const block = lesson?.blocks.find((b): b is ExerciseBlock => b.id === assignment.blockId && b.type === "exercice");
  const [feedback, setFeedback] = React.useState(assignment.feedback ?? "");
  const [grade, setGrade] = React.useState(assignment.grade !== undefined ? String(assignment.grade) : "");
  const editable = canEdit("academy");

  const save = (status: Assignment["status"]) => {
    if (!feedback.trim()) return toast({ title: "Rédigez un retour pour l'apprenant", tone: "danger" });
    const g = grade.trim() ? Math.max(0, Math.min(20, Number(grade.replace(",", ".")))) : undefined;
    reviewAssignment(assignment.id, { status, feedback: feedback.trim(), grade: Number.isFinite(g) ? g : undefined });
    toast({ title: status === "valide" ? "Livrable validé" : "Livrable renvoyé à l'apprenant", description: "Le retour est visible dans Mon espace." });
    onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      title={block?.title ?? "Livrable"}
      description={
        <>
          {contactName(contact)} · {lesson?.title} · remis {dateTime(assignment.submittedAt)}
        </>
      }
      footer={
        editable ? (
          <>
            <Button variant="secondary" onClick={() => save("a_reprendre")}>
              <RotateCcw /> À reprendre
            </Button>
            <Button onClick={() => save("valide")}>
              <CheckCircle2 /> Valider
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <StatusBadge options={ASSIGNMENT_STATUSES} value={assignment.status} />
          {assignment.reviewerId ? <UserChip id={assignment.reviewerId} /> : null}
        </div>
        {block ? (
          <section className="rounded-lg border border-border bg-surface-2 p-3">
            <h3 className="eyebrow mb-2 text-muted-foreground">Consigne</h3>
            <MarkdownPreview source={block.instructions} className="text-sm" />
            {block.rubric.length ? (
              <>
                <h4 className="eyebrow mb-1 mt-3 text-muted-foreground">Critères de réussite</h4>
                <ul className="list-disc space-y-0.5 pl-5 text-sm">
                  {block.rubric.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ) : null}
        <section>
          <h3 className="eyebrow mb-2 text-muted-foreground">Réponse de l&apos;apprenant</h3>
          <p className="whitespace-pre-wrap rounded-lg border border-border p-3 text-sm">{assignment.content || "—"}</p>
          {assignment.url ? (
            <a href={assignment.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-accent-text hover:underline">
              Ouvrir le lien remis <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </section>
        <FormField label="Retour à l'apprenant" htmlFor="asg-feedback" hint="Concret : ce qui est réussi, ce qu'il faut reprendre, et comment.">
          <Textarea id="asg-feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} disabled={!editable} className="min-h-32" />
        </FormField>
        <FormField label="Note (sur 20, facultative)" htmlFor="asg-grade">
          <Input id="asg-grade" inputMode="decimal" value={grade} onChange={(e) => setGrade(e.target.value)} disabled={!editable} className="w-28" />
        </FormField>
        <Link href={`/academy/apprenants/${assignment.enrollmentId}`} className="inline-block text-sm text-accent-text hover:underline">
          Voir la progression de l&apos;apprenant →
        </Link>
      </div>
    </Drawer>
  );
}

type Filter = "soumis" | "a_reprendre" | "valide" | "tous";

export function AssignmentList({ rows }: { rows: Assignment[] }) {
  const contacts = useLookup("contacts");
  const lessons = useLookup("lessons");
  const now = useNow();
  const [open, setOpen] = React.useState<Assignment | null>(null);
  const titleOf = (a: Assignment) => {
    const b = lessons.get(a.lessonId)?.blocks.find((x) => x.id === a.blockId);
    return b && b.type === "exercice" ? b.title : "Livrable";
  };
  const columns: Column<Assignment>[] = [
    { key: "contact", header: "Apprenant", render: (a) => <ContactLink id={a.contactId} />, sort: (a) => contactName(contacts.get(a.contactId)) },
    {
      key: "title",
      header: "Livrable",
      render: (a) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{titleOf(a)}</div>
          <div className="truncate text-xs text-muted-foreground">{lessons.get(a.lessonId)?.title}</div>
        </div>
      ),
      sort: titleOf,
    },
    { key: "submitted", header: "Remis", render: (a) => <span className="text-xs text-muted-foreground">{relative(a.submittedAt, now)}</span>, sort: (a) => a.submittedAt, hideBelow: "sm" },
    { key: "grade", header: "Note", render: (a) => <span className="tabular text-xs">{a.grade !== undefined ? `${a.grade}/20` : "—"}</span>, sort: (a) => a.grade ?? -1, align: "right", hideBelow: "md" },
    { key: "status", header: "Statut", render: (a) => <StatusBadge options={ASSIGNMENT_STATUSES} value={a.status} className="text-[11px]" />, sort: (a) => a.status },
  ];
  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(a) => a.id}
        onRowClick={setOpen}
        searchable={(a) => `${contactName(contacts.get(a.contactId))} ${titleOf(a)}`}
        initialSort={{ key: "submitted", dir: "desc" }}
        emptyTitle="Aucun livrable"
        emptyDescription="Les exercices corrigés par un formateur apparaissent ici dès qu'un apprenant les remet."
      />
      {open ? <AssignmentDrawer assignment={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

export function AssignmentsTab() {
  const assignments = useCollection("assignments");
  const [filter, setFilter] = React.useState<Filter>("soumis");
  const rows = React.useMemo(() => assignments.filter((a) => filter === "tous" || a.status === filter), [assignments, filter]);
  const n = (s: Assignment["status"]) => assignments.filter((a) => a.status === s).length;
  return (
    <div className="space-y-4">
      <div className="-mx-1 max-w-full overflow-x-auto px-1 scrollbar-thin">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "soumis", label: "À corriger", count: n("soumis") },
            { value: "a_reprendre", label: "À reprendre", count: n("a_reprendre") },
            { value: "valide", label: "Validés", count: n("valide") },
            { value: "tous", label: "Tous", count: assignments.length },
          ]}
        />
      </div>
      <AssignmentList rows={rows} />
    </div>
  );
}
