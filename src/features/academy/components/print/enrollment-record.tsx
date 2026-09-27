"use client";

import * as React from "react";
import { Award } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { Checkline, DocFooter, DocHeader, DocNotFound, DocSection, DocTitle, Facts, PrintPage, ScreenNotes, SignatureBlock } from "@/features/documents/components/print-kit";
import { hoursLabel, legalRepresentative } from "@/features/documents/doc-data";
import { useCollection, useEntity, useNow, useSession, useSettings } from "@/lib/hooks";
import { certificateCheck, formatDuration, orderedLessons, summarizeProgress } from "@/lib/domain/academy";
import { issueCertificate } from "@/lib/domain/actions";
import { contactName } from "@/lib/domain/selectors";
import type { ID } from "@/lib/domain/types";
import { date, dateTime } from "@/lib/format";

/**
 * Formation à distance : certificat de réalisation (modèle ministériel) et relevé
 * de connexions / activités réalisées — pièces justificatives de l'assiduité en FOAD.
 */
export function EnrollmentRecordDoc({ enrollmentId }: { enrollmentId: ID }) {
  const e = useEntity("enrollments", enrollmentId);
  const course = useEntity("courses", e?.courseId);
  const contact = useEntity("contacts", e?.contactId);
  const org = useEntity("organizations", contact?.orgId);
  const modules = useCollection("courseModules");
  const allLessons = useCollection("lessons");
  const allProgress = useCollection("lessonProgress");
  const allConnections = useCollection("learnerConnections");
  const allAssignments = useCollection("assignments");
  const users = useCollection("users");
  const settings = useSettings();
  const now = useNow();
  const { canEdit } = useSession();
  const toast = useToast();

  const lessons = React.useMemo(() => (e ? orderedLessons(e.courseId, modules, allLessons) : []), [e, modules, allLessons]);
  const progress = React.useMemo(() => allProgress.filter((p) => p.enrollmentId === enrollmentId), [allProgress, enrollmentId]);
  const connections = React.useMemo(() => allConnections.filter((c) => c.enrollmentId === enrollmentId).sort((a, b) => a.startedAt.localeCompare(b.startedAt)), [allConnections, enrollmentId]);
  const assignments = React.useMemo(() => allAssignments.filter((a) => a.enrollmentId === enrollmentId), [allAssignments, enrollmentId]);

  if (!e || !course) return <DocNotFound what="Inscription Academy" />;

  const summary = summarizeProgress(lessons, progress);
  const check = certificateCheck(course, summary);
  const rep = legalRepresentative(users);
  const connectedMinutes = Math.round(connections.reduce((s, c) => s + c.durationSeconds, 0) / 60);
  // Durée réalisée (FOAD) : temps estimé des leçons terminées — sans dépasser la durée annoncée.
  const doneMinutes = lessons.filter((l) => progress.some((p) => p.lessonId === l.id && p.status === "terminee")).reduce((s, l) => s + l.estimatedMinutes, 0);
  const doneHours = Math.round((doneMinutes / 60) * 100) / 100;
  const first = connections[0]?.startedAt ?? e.startedAt ?? e.grantedAt;
  const last = connections[connections.length - 1]?.endedAt ?? e.lastActivityAt ?? e.grantedAt;
  const validated = assignments.filter((a) => a.status === "valide").length;
  const ref = `CR-EL-${new Date(e.grantedAt).getFullYear()}-${e.id.slice(-6).toUpperCase()}`;

  const notes: React.ReactNode[] = [
    `Durée réalisée calculée à partir des activités terminées (${summary.done}/${summary.total} leçons, temps estimé ${formatDuration(doneMinutes)}) ; temps de connexion enregistré : ${formatDuration(connectedMinutes)}.`,
  ];
  if (!check.eligible) notes.push(`Conditions du certificat non remplies : ${check.reasons.join(" ; ")}.`);
  if (!course.isTraining) notes.push("Cette formation n'est pas déclarée comme action de formation : le certificat n'a pas de valeur réglementaire.");

  return (
    <>
      <ScreenNotes
        notes={notes}
        actions={
          canEdit("academy") ? (
            e.certificateIssuedAt ? (
              <span className="text-xs text-muted-foreground">Certificat délivré le {date(e.certificateIssuedAt)}.</span>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled={!check.eligible}
                onClick={() => {
                  issueCertificate(e.id);
                  toast({ title: "Certificat marqué comme délivré" });
                }}
              >
                <Award /> Marquer le certificat comme délivré
              </Button>
            )
          ) : undefined
        }
      />

      {/* ── Certificat de réalisation ── */}
      <PrintPage>
        <DocHeader reference={ref} />
        <DocTitle title="Certificat de réalisation" subtitle="Modèle établi par le ministère chargé de la formation professionnelle — formation à distance" />
        <div className="space-y-4 text-[13px] print:text-[10.5pt]">
          <p>
            Je soussigné(e) <strong>{rep?.name ?? "……………………"}</strong>, représentant(e) légal(e) du dispensateur de l&apos;action concourant au développement des compétences <strong>{settings.legalName}</strong>, atteste que :
          </p>
          <div className="rounded-md border border-border p-3">
            <p>
              <strong>{contactName(contact)}</strong>
            </p>
            {org && org.type !== "ecole" ? <p>salarié(e) de l&apos;entreprise {org.name}</p> : null}
            <p className="mt-2">
              a suivi l&apos;action : <strong>{course.title}</strong> (formation à distance, StartupWeek Academy)
            </p>
          </div>
          <div>
            <p className="mb-1">Nature de l&apos;action concourant au développement des compétences :</p>
            <p className="flex flex-wrap gap-y-1">
              <Checkline checked>action de formation</Checkline>
              <Checkline checked={false}>bilan de compétences</Checkline>
              <Checkline checked={false}>action de VAE</Checkline>
              <Checkline checked={false}>action de formation par apprentissage</Checkline>
            </p>
          </div>
          <p>
            qui s&apos;est déroulée du <strong>{date(first, "d MMMM yyyy")}</strong> au <strong>{date(last, "d MMMM yyyy")}</strong>
            <br />
            pour une durée de <strong>{hoursLabel(doneHours)}</strong>
            <span className="text-muted-foreground"> (durée prévue : {hoursLabel(course.durationHours)})</span>.
          </p>
          <p className="text-xs text-muted-foreground">
            Formation à distance : la durée tient compte de la réalisation des activités pédagogiques et du temps estimé pour les réaliser ; le relevé de connexions et des activités réalisées est joint.
          </p>
          <p className="text-[12px] text-muted-foreground print:text-[9pt]">
            Sans préjudice des délais imposés par les règles fiscales, comptables ou commerciales, je m&apos;engage à conserver l&apos;ensemble des pièces justificatives qui ont permis d&apos;établir le présent certificat pendant une durée de 3 ans à compter de la fin de l&apos;année du dernier paiement.
          </p>
        </div>
        <SignatureBlock
          signedAt={e.certificateIssuedAt ?? (check.eligible ? new Date(now).toISOString() : undefined)}
          parties={[{ label: "Cachet et signature du responsable du dispensateur de formation", name: rep?.name, role: rep ? `${rep.title} — ${settings.legalName}` : settings.legalName, stamp: true }]}
        />
        <DocFooter note={`${course.title} · inscription ${e.id}`} />
      </PrintPage>

      {/* ── Relevé de connexions et d'activités ── */}
      <PrintPage>
        <DocHeader reference={ref.replace("CR-", "RC-")} />
        <DocTitle title="Relevé de connexions et d'activités réalisées" subtitle="Formation à distance — pièce justificative de réalisation" />
        <DocSection title="Apprenant et formation">
          <Facts
            items={[
              { label: "Apprenant", value: `${contactName(contact)} — ${contact?.email ?? ""}` },
              { label: "Formation", value: course.title },
              { label: "Accès", value: `du ${date(e.grantedAt)} au ${date(e.expiresAt)}` },
              { label: "Progression", value: `${summary.done}/${summary.total} leçons (${summary.percent} %)` },
              { label: "Temps de connexion", value: `${formatDuration(connectedMinutes)} sur ${connections.length} connexion${connections.length > 1 ? "s" : ""}` },
              { label: "Évaluations", value: `${summary.gradedTaken}/${summary.gradedQuizzes} quiz évalués${summary.quizAverage !== undefined ? ` — moyenne ${summary.quizAverage} %` : ""} · ${validated} livrable${validated > 1 ? "s" : ""} validé${validated > 1 ? "s" : ""}` },
              { label: "Assistance", value: course.assistance || "—" },
            ]}
          />
        </DocSection>
        <DocSection title="Connexions">
          {connections.length ? (
            <table className="w-full border-collapse text-left text-[11px] print:text-[8.5pt]">
              <thead>
                <tr className="border-b border-border-strong text-muted-foreground">
                  <th className="py-1 pr-2 font-medium">Début</th>
                  <th className="py-1 pr-2 font-medium">Fin</th>
                  <th className="py-1 pr-2 text-right font-medium">Durée</th>
                  <th className="py-1 font-medium">Activités</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((c) => (
                  <tr key={c.id} className="border-b border-border align-top last:border-0">
                    <td className="py-1 pr-2 whitespace-nowrap">{dateTime(c.startedAt)}</td>
                    <td className="py-1 pr-2 whitespace-nowrap">{dateTime(c.endedAt)}</td>
                    <td className="tabular whitespace-nowrap py-1 pr-2 text-right">{formatDuration(Math.max(1, Math.round(c.durationSeconds / 60)))}</td>
                    <td className="py-1">{c.lessonIds.map((id) => lessons.find((l) => l.id === id)?.title ?? "—").join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Aucune connexion enregistrée.</p>
          )}
        </DocSection>
        <DocSection title="Activités terminées">
          <table className="w-full border-collapse text-left text-[11px] print:text-[8.5pt]">
            <thead>
              <tr className="border-b border-border-strong text-muted-foreground">
                <th className="py-1 pr-2 font-medium">Leçon</th>
                <th className="py-1 pr-2 text-right font-medium">Durée estimée</th>
                <th className="py-1 pr-2 text-right font-medium">Temps passé</th>
                <th className="py-1 font-medium">Terminée le</th>
              </tr>
            </thead>
            <tbody>
              {lessons
                .map((l) => ({ l, p: progress.find((x) => x.lessonId === l.id && x.status === "terminee") }))
                .filter((x) => x.p)
                .map(({ l, p }) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="py-1 pr-2">{l.title}</td>
                    <td className="tabular py-1 pr-2 text-right">{l.estimatedMinutes} min</td>
                    <td className="tabular py-1 pr-2 text-right">{Math.round((p?.timeSpentSeconds ?? 0) / 60)} min</td>
                    <td className="py-1">{date(p?.completedAt)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </DocSection>
        <DocFooter note={`Relevé établi le ${date(new Date(now).toISOString())}`} />
      </PrintPage>
    </>
  );
}
