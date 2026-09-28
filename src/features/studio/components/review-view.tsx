"use client";

import * as React from "react";
import { AlertTriangle, Archive, CheckCircle2, CircleDot, ClipboardCheck, Rocket, RotateCcw, Send, Undo2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FormField, Modal, Select, useToast } from "@/components/ui";
import { useCollection, useEntity, useNow } from "@/lib/hooks";
import { canWrite } from "@/lib/auth/permissions";
import { publishCourse, requestCourseChanges, sendCourseToReview, unpublishCourse, validateCourse } from "@/lib/domain/actions";
import type { Course, CourseComment, ID, Lesson } from "@/lib/domain/types";
import { dateTime, relative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CommentThread } from "./inspector";
import type { CheckTarget, StudioCheck } from "../lib/checks";

const STEPS: { status: Course["status"]; label: string; hint: string }[] = [
  { status: "brouillon", label: "Brouillon", hint: "Écriture en cours" },
  { status: "relecture", label: "En relecture", hint: "Le relecteur commente" },
  { status: "validee", label: "Validée", hint: "Contenu approuvé" },
  { status: "publiee", label: "Publiée", hint: "Visible des apprenants" },
];

/** Choix du relecteur puis envoi en relecture. */
export function SendToReviewButton({ course, size = "sm" }: { course: Course; size?: "sm" | "md" }) {
  const users = useCollection("users");
  const toast = useToast();
  const reviewers = users.filter((u) => u.active && canWrite(u.role, "academy"));
  const [open, setOpen] = React.useState(false);
  const [reviewer, setReviewer] = React.useState<ID>(course.reviewerId ?? reviewers[0]?.id ?? "");
  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        <Send /> Envoyer en relecture
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Envoyer en relecture"
        description="Le relecteur commente les leçons et les blocs, puis valide le contenu ou demande des corrections. La formation reste invisible des apprenants."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={!reviewer}
              onClick={() => {
                sendCourseToReview(course.id, reviewer);
                setOpen(false);
                toast({ title: "Formation envoyée en relecture", description: users.find((u) => u.id === reviewer)?.name });
              }}
            >
              <Send /> Envoyer
            </Button>
          </>
        }
      >
        <FormField label="Relecteur" htmlFor="rv-reviewer" hint="Vous pouvez vous désigner vous-même tant que vous êtes seul à écrire.">
          <Select id="rv-reviewer" value={reviewer} onChange={(e) => setReviewer(e.target.value)} options={reviewers.map((u) => ({ value: u.id, label: u.name }))} />
        </FormField>
      </Modal>
    </>
  );
}

function CheckRow({ check, onGo }: { check: StudioCheck; onGo: (t: CheckTarget) => void }) {
  const blocking = check.level === "bloquant";
  return (
    <li className="flex items-start gap-3 rounded-lg bg-surface-2 px-3 py-2.5 text-sm">
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", blocking ? "bg-danger" : "bg-warning")} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <span className={cn("mr-1.5 text-[10.5px] font-semibold uppercase tracking-wide", blocking ? "text-danger-text" : "text-warning-text")}>{blocking ? "Bloquant" : "À vérifier"}</span>
        <span>
          {check.count && check.count > 1 ? `${check.label} (${check.count})` : check.label}
        </span>
      </div>
      {check.target ? (
        <Button size="xs" variant="secondary" onClick={() => onGo(check.target!)}>
          {blocking ? "Corriger" : "Voir"}
        </Button>
      ) : null}
    </li>
  );
}

export function ReviewView({
  course,
  checks,
  comments,
  lessons,
  editable,
  onGo,
}: {
  course: Course;
  checks: StudioCheck[];
  comments: CourseComment[];
  lessons: Lesson[];
  editable: boolean;
  onGo: (t: CheckTarget) => void;
}) {
  const toast = useToast();
  const now = useNow();
  const reviewer = useEntity("users", course.reviewerId);
  const validator = useEntity("users", course.validatedBy);
  const blocking = checks.filter((c) => c.level === "bloquant");
  const warnings = checks.filter((c) => c.level === "a_verifier");
  const open = comments.filter((c) => !c.resolvedAt);
  const stepIndex = STEPS.findIndex((s) => s.status === course.status);
  const [showResolved, setShowResolved] = React.useState(false);

  const byLesson = React.useMemo(() => {
    const list = comments.filter((c) => showResolved || !c.resolvedAt);
    const groups: { lesson?: Lesson; comments: CourseComment[] }[] = [];
    const general = list.filter((c) => !c.lessonId);
    if (general.length) groups.push({ comments: general });
    for (const l of lessons) {
      const cs = list.filter((c) => c.lessonId === l.id);
      if (cs.length) groups.push({ lesson: l, comments: cs });
    }
    return groups;
  }, [comments, lessons, showResolved]);

  const publishReason =
    course.status !== "validee" ? "Publication possible une fois le contenu validé en relecture." : blocking.length ? `Publication bloquée : ${blocking.length} point${blocking.length > 1 ? "s" : ""} bloquant${blocking.length > 1 ? "s" : ""} à corriger.` : "Tout est prêt : la formation peut être publiée.";

  return (
    <div className="space-y-5">
      {course.status === "archivee" ? (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted-foreground">Formation archivée : invisible des apprenants et du catalogue.</p>
      ) : (
        <ol className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Circuit de publication">
          {STEPS.map((s, i) => (
            <li key={s.status} aria-current={i === stepIndex ? "step" : undefined} className={cn("rounded-xl border bg-surface px-3.5 py-3", i === stepIndex ? "border-ring shadow-[0_0_0_3px_var(--accent-soft)]" : "border-border")}>
              <span className="text-[11px] text-muted-foreground">Étape {i + 1}</span>
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                {i < stepIndex ? <CheckCircle2 className="size-4 text-success-text" aria-hidden="true" /> : <CircleDot className={cn("size-4", i === stepIndex ? "text-accent-text" : "text-faint")} aria-hidden="true" />}
                {s.label}
              </span>
              <span className="text-[11px] text-muted-foreground">{s.hint}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Décision</CardTitle>
                <CardDescription>
                  {reviewer ? `Relecteur désigné : ${reviewer.name}` : "Aucun relecteur désigné."}
                  {course.reviewRequestedAt ? ` · envoyée ${relative(course.reviewRequestedAt, now)}` : ""}
                  {course.validatedAt ? ` · validée le ${dateTime(course.validatedAt)}${validator ? ` par ${validator.name}` : ""}` : ""}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {editable ? (
                <div className="flex flex-wrap gap-2">
                  {course.status === "brouillon" ? <SendToReviewButton course={course} /> : null}
                  {course.status === "relecture" ? (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => (requestCourseChanges(course.id), toast({ title: "Corrections demandées", description: "La formation revient en brouillon avec les commentaires." }))}>
                        <Undo2 /> Demander des corrections
                      </Button>
                      <Button size="sm" disabled={open.length > 0} onClick={() => (validateCourse(course.id), toast({ title: "Contenu validé", description: "Reste à publier." }))}>
                        <CheckCircle2 /> Valider le contenu
                      </Button>
                    </>
                  ) : null}
                  {course.status === "validee" ? (
                    <>
                      <Button size="sm" disabled={blocking.length > 0} onClick={() => (publishCourse(course.id), toast({ title: "Formation publiée", description: "Visible des apprenants inscrits." }))}>
                        <Rocket /> Publier
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => unpublishCourse(course.id, "brouillon")}>
                        <RotateCcw /> Revenir en brouillon
                      </Button>
                    </>
                  ) : null}
                  {course.status === "publiee" ? (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => window.confirm("Retirer la formation des apprenants et du catalogue (retour en brouillon) ?") && unpublishCourse(course.id, "brouillon")}>
                        <RotateCcw /> Dépublier
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => window.confirm("Archiver la formation ? Elle ne sera plus accessible aux apprenants.") && unpublishCourse(course.id, "archivee")}>
                        <Archive /> Archiver
                      </Button>
                    </>
                  ) : null}
                  {course.status === "archivee" ? (
                    <Button size="sm" variant="secondary" onClick={() => unpublishCourse(course.id, "brouillon")}>
                      <RotateCcw /> Remettre en brouillon
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {course.status === "relecture"
                  ? open.length
                    ? `Validation possible une fois les ${open.length} commentaire${open.length > 1 ? "s" : ""} résolu${open.length > 1 ? "s" : ""}.`
                    : "Tous les commentaires sont résolus : le contenu peut être validé."
                  : course.status === "publiee"
                    ? "Formation publiée. Les modifications faites dans l'édition sont visibles immédiatement."
                    : publishReason}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="size-4" aria-hidden="true" /> Vérifications automatiques
                </CardTitle>
                <CardDescription>Recalculées à chaque modification. Un point bloquant empêche la publication, pas la relecture.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {checks.length ? (
                <ul className="space-y-2">
                  {[...blocking, ...warnings].map((c) => (
                    <CheckRow key={c.id} check={c} onGo={onGo} />
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 text-sm text-success-text">
                  <CheckCircle2 className="size-4" aria-hidden="true" /> Aucun point à corriger.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                Commentaires de relecture <Badge tone={open.length ? "warning" : "success"}>{open.length} ouvert{open.length > 1 ? "s" : ""}</Badge>
              </CardTitle>
              <CardDescription>Chaque commentaire est attaché à une leçon ou à un bloc, et s&apos;affiche aussi en marge dans l&apos;édition.</CardDescription>
            </div>
            <Button size="xs" variant="ghost" onClick={() => setShowResolved((v) => !v)} aria-pressed={showResolved}>
              {showResolved ? "Masquer les résolus" : "Afficher les résolus"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {byLesson.length ? (
              byLesson.map((g) => (
                <section key={g.lesson?.id ?? "general"} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{g.lesson ? g.lesson.title : "Formation (général)"}</h3>
                    {g.lesson ? (
                      <Button size="xs" variant="ghost" onClick={() => onGo({ view: "edition", lessonId: g.lesson!.id, blockId: g.comments.find((c) => c.blockId)?.blockId })}>
                        Ouvrir la leçon
                      </Button>
                    ) : null}
                  </div>
                  <CommentThread comments={g.comments} courseId={course.id} lessonId={g.lesson?.id} />
                </section>
              ))
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                {open.length ? <AlertTriangle className="size-4" aria-hidden="true" /> : <CheckCircle2 className="size-4 text-success-text" aria-hidden="true" />}
                {comments.length ? "Tous les commentaires sont résolus." : "Aucun commentaire pour l'instant. Le relecteur commente depuis l'édition (panneau de droite)."}
              </p>
            )}
            {editable && !byLesson.some((g) => !g.lesson) ? (
              <section className="space-y-2 border-t border-border pt-4">
                <h3 className="text-sm font-semibold">Commentaire général sur la formation</h3>
                <CommentThread comments={[]} courseId={course.id} />
              </section>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
