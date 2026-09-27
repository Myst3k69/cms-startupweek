"use client";

import * as React from "react";
import Link from "next/link";
import { Award, CalendarPlus, CheckCircle2, Circle, FileSearch, Lock, PauseCircle, PlayCircle, Printer } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DescriptionList,
  EmptyState,
  LinkButton,
  PageHeader,
  Progress,
  ProgressRing,
  Select,
  StatusBadge,
  useToast,
} from "@/components/ui";
import { ContactLink, SessionLink } from "@/components/shared/entity-links";
import { ActivityTimeline } from "@/components/shared/timeline";
import { useActions, useCollection, useEntity, useNow, useSession } from "@/lib/hooks";
import { ENROLLMENT_SOURCES, ENROLLMENT_STATUSES, PERSONAS, labelOf } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import { certificateCheck, effectiveStatus, formatDuration, lessonStates, summarizeProgress } from "@/lib/domain/academy";
import { issueCertificate } from "@/lib/domain/actions";
import type { Enrollment, ID, Persona, QuizBlock } from "@/lib/domain/types";
import { date, dateTime, relative } from "@/lib/format";
import { useCourseOutline } from "../lib/use-academy";
import { AssignmentList } from "./assignments-tab";

const DAY = 86_400_000;

export function EnrollmentDetail({ id }: { id: ID }) {
  const e = useEntity("enrollments", id);
  if (!e) return <EmptyState icon={FileSearch} title="Inscription introuvable" action={<LinkButton href="/academy?onglet=apprenants">Retour aux apprenants</LinkButton>} className="mt-10" />;
  return <Inner e={e} />;
}

function Inner({ e }: { e: Enrollment }) {
  const course = useEntity("courses", e.courseId);
  const contact = useEntity("contacts", e.contactId);
  const cohort = useEntity("cohorts", e.cohortId);
  const { modules, lessons, byModule } = useCourseOutline(e.courseId);
  const allProgress = useCollection("lessonProgress");
  const allConnections = useCollection("learnerConnections");
  const allAssignments = useCollection("assignments");
  const now = useNow();
  const { update } = useActions();
  const { canEdit } = useSession();
  const toast = useToast();
  const editable = canEdit("academy");

  const progress = React.useMemo(() => allProgress.filter((p) => p.enrollmentId === e.id), [allProgress, e.id]);
  const connections = React.useMemo(() => allConnections.filter((c) => c.enrollmentId === e.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt)), [allConnections, e.id]);
  const assignments = React.useMemo(() => allAssignments.filter((a) => a.enrollmentId === e.id), [allAssignments, e.id]);
  const summary = React.useMemo(() => summarizeProgress(lessons, progress), [lessons, progress]);
  const states = React.useMemo(() => lessonStates(lessons, progress, course?.sequential ?? true), [lessons, progress, course?.sequential]);
  const status = effectiveStatus(e, now);
  const cert = course ? certificateCheck(course, summary) : { eligible: false, reasons: [] };
  const connectedSeconds = connections.reduce((s, c) => s + c.durationSeconds, 0);
  const daysLeft = Math.ceil((new Date(e.expiresAt).getTime() - now) / DAY);

  const extend = (days: number) => {
    const base = Math.max(now, new Date(e.expiresAt).getTime());
    update("enrollments", e.id, { expiresAt: new Date(base + days * DAY).toISOString(), status: e.completedAt ? "terminee" : "active" }, { log: `Accès prolongé de ${days} jours`, kind: "statut" });
    toast({ title: `Accès prolongé de ${days} jours` });
  };

  return (
    <div className="pb-10">
      <PageHeader
        breadcrumbs={[{ label: "Academy", href: "/academy" }, { label: "Apprenants", href: "/academy?onglet=apprenants" }, { label: contactName(contact) }]}
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {contactName(contact)} <StatusBadge options={ENROLLMENT_STATUSES} value={status} />
          </span>
        }
        description={
          <>
            <Link href={`/academy/formations/${e.courseId}`} className="text-accent-text hover:underline">
              {course?.title ?? "Formation supprimée"}
            </Link>{" "}
            · {labelOf(ENROLLMENT_SOURCES, e.source)}
            {e.eventId ? (
              <>
                {" "}
                · <SessionLink id={e.eventId} />
              </>
            ) : null}
            {cohort ? ` · ${cohort.name}` : null}
          </>
        }
        actions={
          <>
            <LinkButton href={`/print/academy/${e.id}`} variant="secondary" size="sm" target="_blank">
              <Printer /> Relevé & certificat
            </LinkButton>
            {editable ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => extend(30)}>
                  <CalendarPlus /> +30 jours
                </Button>
                {status === "suspendue" ? (
                  <Button size="sm" variant="secondary" onClick={() => update("enrollments", e.id, { status: "active" }, { log: "Accès réactivé", kind: "statut" })}>
                    <PlayCircle /> Réactiver
                  </Button>
                ) : status === "active" ? (
                  <Button size="sm" variant="ghost" onClick={() => window.confirm("Suspendre l'accès de cet apprenant ?") && update("enrollments", e.id, { status: "suspendue" }, { log: "Accès suspendu", kind: "statut" })}>
                    <PauseCircle /> Suspendre
                  </Button>
                ) : null}
              </>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <Card className="col-span-2 flex items-center gap-3 p-4 sm:col-span-1">
              <ProgressRing value={summary.percent} size={60} />
              <div className="text-xs text-muted-foreground">
                {summary.done}/{summary.total} leçons
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Temps passé (leçons)</div>
              <div className="mt-1 text-xl font-semibold">{formatDuration(summary.timeSpentMinutes)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Temps connecté</div>
              <div className="mt-1 text-xl font-semibold">{formatDuration(Math.round(connectedSeconds / 60))}</div>
              <div className="text-xs text-muted-foreground">{connections.length} connexions</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Quiz évalués</div>
              <div className="mt-1 text-xl font-semibold">{summary.quizAverage !== undefined ? `${summary.quizAverage} %` : "—"}</div>
              <div className="text-xs text-muted-foreground">
                {summary.gradedTaken}/{summary.gradedQuizzes} passés
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Progression par module</CardTitle>
                <CardDescription>Profil servi : {labelOf(PERSONAS, e.persona)} — {course?.sequential ? "progression séquentielle" : "accès libre aux leçons"}.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {modules.map((m, mi) => {
                const ls = byModule.get(m.id) ?? [];
                const d = ls.filter((l) => states.get(l.id) === "terminee").length;
                return (
                  <details key={m.id} className="group rounded-md border border-border" open={ls.some((l) => states.get(l.id) === "en_cours")}>
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2">
                      <span className="tabular w-6 font-mono text-[11px] text-muted-foreground">{String(mi).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.title}</span>
                      <span className="tabular text-xs text-muted-foreground">
                        {d}/{ls.length}
                      </span>
                      <Progress value={ls.length ? (d / ls.length) * 100 : 0} className="w-24" tone={d === ls.length ? "success" : "accent"} label={`${m.title} : ${d}/${ls.length}`} />
                    </summary>
                    <ul className="border-t border-border">
                      {ls.map((l) => {
                        const st = states.get(l.id);
                        const p = progress.find((x) => x.lessonId === l.id);
                        const quizzes = l.blocks.filter((b): b is QuizBlock => b.type === "quiz");
                        return (
                          <li key={l.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs">
                            {st === "terminee" ? <CheckCircle2 className="size-4 text-success-text" aria-label="Terminée" /> : st === "en_cours" ? <PlayCircle className="size-4 text-accent-text" aria-label="En cours" /> : st === "verrouillee" ? <Lock className="size-4 text-faint" aria-label="Verrouillée" /> : <Circle className="size-4 text-faint" aria-label="Disponible" />}
                            <span className="min-w-0 flex-1 truncate">{l.title}</span>
                            {quizzes.map((q) =>
                              p?.quizScores[q.id] !== undefined ? (
                                <Badge key={q.id} tone={p.quizScores[q.id] >= (course?.passingScore ?? 70) ? "success" : "danger"} className="text-[10px]">
                                  {q.graded ? "Éval." : "Quiz"} {p.quizScores[q.id]} %
                                </Badge>
                              ) : null,
                            )}
                            <span className="tabular w-20 text-right text-muted-foreground">{p ? `${Math.round(p.timeSpentSeconds / 60)} / ${l.estimatedMinutes} min` : `— / ${l.estimatedMinutes} min`}</span>
                            <span className="hidden w-24 text-right text-muted-foreground sm:inline">{p?.completedAt ? date(p.completedAt) : p ? "en cours" : ""}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Livrables</CardTitle>
                <CardDescription>Exercices corrigés par un formateur.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <AssignmentList rows={assignments} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Relevé de connexions</CardTitle>
                <CardDescription>Preuve de réalisation d&apos;une formation à distance (temps de connexion et leçons suivies).</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {connections.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-left text-xs">
                    <thead className="text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="py-1.5 pr-3 font-medium">Début</th>
                        <th className="py-1.5 pr-3 font-medium">Durée</th>
                        <th className="py-1.5 pr-3 font-medium">Leçons</th>
                        <th className="py-1.5 font-medium">Appareil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {connections.slice(0, 40).map((c) => (
                        <tr key={c.id} className="border-b border-border last:border-0">
                          <td className="whitespace-nowrap py-1.5 pr-3">{dateTime(c.startedAt)}</td>
                          <td className="tabular whitespace-nowrap py-1.5 pr-3">{formatDuration(Math.max(1, Math.round(c.durationSeconds / 60)))}</td>
                          <td className="py-1.5 pr-3">{c.lessonIds.map((lid) => lessons.find((l) => l.id === lid)?.title ?? "—").join(" · ")}</td>
                          <td className="whitespace-nowrap py-1.5 text-muted-foreground">{c.device ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {connections.length > 40 ? <p className="mt-2 text-xs text-muted-foreground">40 connexions les plus récentes sur {connections.length} — relevé complet dans le document imprimable.</p> : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune connexion enregistrée.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Accès</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList
                items={[
                  { label: "Apprenant", value: <ContactLink id={e.contactId} withEmail /> },
                  {
                    label: "Profil (variante des contenus)",
                    value: editable ? (
                      <Select
                        aria-label="Profil"
                        value={e.persona}
                        onChange={(ev) => update("enrollments", e.id, { persona: ev.target.value as Persona }, { log: `Profil : ${labelOf(PERSONAS, ev.target.value as Persona)}` })}
                        options={PERSONAS}
                      />
                    ) : (
                      labelOf(PERSONAS, e.persona)
                    ),
                  },
                  { label: "Accès ouvert le", value: date(e.grantedAt) },
                  { label: "Fin d'accès", value: `${date(e.expiresAt)}${daysLeft > 0 ? ` (dans ${daysLeft} j)` : ""}` },
                  { label: "Première activité", value: e.startedAt ? dateTime(e.startedAt) : "Pas encore commencé" },
                  { label: "Dernière activité", value: e.lastActivityAt ? relative(e.lastActivityAt, now) : "—" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="size-4" aria-hidden="true" /> Certificat de réalisation
                </CardTitle>
                <CardDescription>
                  Conditions : {course?.certificateMinProgress ?? 80} % de progression et {course?.passingScore ?? 70} % de moyenne aux quiz évalués.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {e.certificateIssuedAt ? (
                <p className="text-sm text-success-text">Délivré le {date(e.certificateIssuedAt)}.</p>
              ) : cert.eligible ? (
                <p className="text-sm text-success-text">Conditions remplies.</p>
              ) : (
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                  {cert.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <LinkButton href={`/print/academy/${e.id}`} size="sm" variant="secondary" target="_blank">
                  <Printer /> Ouvrir le document
                </LinkButton>
                {editable && !e.certificateIssuedAt ? (
                  <Button
                    size="sm"
                    disabled={!cert.eligible}
                    onClick={() => {
                      issueCertificate(e.id);
                      toast({ title: "Certificat marqué comme délivré" });
                    }}
                  >
                    <Award /> Délivrer
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline entity="enrollments" id={e.id} limit={15} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
