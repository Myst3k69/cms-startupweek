"use client";

import * as React from "react";
import { Award } from "lucide-react";
import { useActions, useCollection, useEntity, useNow, useSession, useSettings } from "@/lib/hooks";
import { contactName } from "@/lib/domain/selectors";
import type { ID } from "@/lib/domain/types";
import { date, dateRange } from "@/lib/format";
import { Button, useToast } from "@/components/ui";
import { Checkline, DocFooter, DocHeader, DocNotFound, DocSection, DocTitle, Facts, PrintPage, ScreenNotes, SignatureBlock } from "./print-kit";
import { acquisitionLevel, capitalize, docRef, hoursLabel, isRemote, legalRepresentative, modeLabel } from "../doc-data";
import { fmt1, traineeAttendance } from "@/features/qualiopi/metrics";

/**
 * Certificat de réalisation (modèle du ministère du Travail) + attestation de fin de formation
 * (art. L.6353-1 : objectifs, nature, durée et résultats de l'évaluation des acquis).
 */
export function AttestationDoc({ applicationId }: { applicationId: ID }) {
  const app = useEntity("applications", applicationId);
  const contact = useEntity("contacts", app?.contactId);
  const org = useEntity("organizations", contact?.orgId);
  const ev = useEntity("events", app?.eventId);
  const users = useCollection("users");
  const attendances = useCollection("attendances");
  const evaluations = useCollection("evaluations");
  const settings = useSettings();
  const now = useNow();
  const { update } = useActions();
  const { canEdit } = useSession();
  const toast = useToast();

  const att = React.useMemo(() => (ev && app ? traineeAttendance(ev, app.contactId, attendances) : null), [ev, app, attendances]);
  const acquis = React.useMemo(
    () => evaluations.filter((e) => e.kind === "acquis" && e.eventId === app?.eventId && e.contactId === app?.contactId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0],
    [evaluations, app],
  );

  if (!app || !ev) return <DocNotFound what="Candidature" />;

  const rep = legalRepresentative(users);
  const ended = Date.parse(ev.endAt) < now || ev.status === "termine";
  const issued = app.certificateIssuedAt ?? new Date(Math.max(now, Date.parse(ev.endAt))).toISOString();
  const hours = att?.hoursDone ?? null;
  const scores = acquis ? Object.entries(acquis.scores).filter(([, v]) => v <= 5) : [];
  const orgEmployer = org && org.type !== "ecole" ? org : undefined;

  const notes: React.ReactNode[] = [];
  if (!ended) notes.push("La session n'est pas terminée : le certificat de réalisation ne peut être délivré qu'à l'issue de la formation.");
  if (att?.rate === null || !att) notes.push("Aucune feuille d'émargement pour cette session : la durée réalisée ne peut pas être calculée (à compléter à la main).");
  else notes.push(`Assiduité calculée depuis l'émargement : ${att.present}/${att.expected} demi-journées (${Math.round(att.rate * 100)} %) → ${hoursLabel(att.hoursDone ?? 0)} réalisées sur ${hoursLabel(ev.durationHours)}.`);
  if (!acquis) notes.push("Aucune évaluation des acquis saisie : la grille de l'attestation de fin de formation est laissée vierge.");

  return (
    <>
      <ScreenNotes
        notes={notes}
        actions={
          canEdit("candidatures") ? (
            app.certificateIssuedAt ? (
              <span className="text-xs text-muted-foreground">Certificat délivré le {date(app.certificateIssuedAt)}.</span>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled={!ended}
                onClick={() => {
                  update("applications", app.id, { certificateIssuedAt: new Date().toISOString() }, { log: "Certificat de réalisation délivré", kind: "document" });
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
        <DocHeader reference={docRef("CR", ev.startAt, app.number)} title="Certificat" subtitle="de réalisation" />
        <DocTitle title="Certificat de réalisation" subtitle="Modèle établi par le ministère chargé de la formation professionnelle" />

        <div className="space-y-4 text-[13px] print:text-[10.5pt]">
          <p>
            Je soussigné(e) <strong>{rep?.name ?? "……………………"}</strong>, représentant(e) légal(e) du dispensateur de l'action concourant au développement des compétences <strong>{settings.legalName}</strong>, atteste que :
          </p>
          <div className="rounded-md border border-border p-3">
            <p>
              <strong>{contactName(contact)}</strong>
            </p>
            {orgEmployer ? <p>salarié(e) de l'entreprise {orgEmployer.name}</p> : null}
            <p className="mt-2">
              a suivi l'action : <strong>{ev.name}</strong> ({ev.code})
            </p>
          </div>
          <div>
            <p className="mb-1">Nature de l'action concourant au développement des compétences :</p>
            <p className="flex flex-wrap gap-y-1">
              <Checkline checked>action de formation</Checkline>
              <Checkline checked={false}>bilan de compétences</Checkline>
              <Checkline checked={false}>action de VAE</Checkline>
              <Checkline checked={false}>action de formation par apprentissage</Checkline>
            </p>
          </div>
          <p>
            qui s'est déroulée du <strong>{date(ev.startAt, "d MMMM yyyy")}</strong> au <strong>{date(ev.endAt, "d MMMM yyyy")}</strong>
            <br />
            pour une durée de <strong>{hours !== null ? hoursLabel(hours) : "…………… heures"}</strong>
            {hours !== null && hours < ev.durationHours ? <span className="text-muted-foreground"> (durée prévue : {hoursLabel(ev.durationHours)})</span> : null}.
          </p>
          {isRemote(ev) ? (
            <p className="text-xs text-muted-foreground">Formation à distance : la durée tient compte de la réalisation des activités pédagogiques et du temps estimé pour les réaliser.</p>
          ) : null}
          <p className="text-[12px] text-muted-foreground print:text-[9pt]">
            Sans préjudice des délais imposés par les règles fiscales, comptables ou commerciales, je m'engage à conserver l'ensemble des pièces justificatives qui ont permis d'établir le présent certificat pendant une
            durée de 3 ans à compter de la fin de l'année du dernier paiement. En cas de cofinancement des fonds européens, la durée de conservation est étendue conformément aux obligations conventionnelles spécifiques.
          </p>
        </div>

        <SignatureBlock
          signedAt={app.certificateIssuedAt ?? (ended ? issued : undefined)}
          parties={[{ label: "Cachet et signature du responsable du dispensateur de formation", name: rep?.name, role: rep ? `${rep.title} — ${settings.legalName}` : settings.legalName, stamp: true }]}
        />
        <DocFooter note={`${ev.code} · candidature #${app.number}`} />
      </PrintPage>

      {/* ── Attestation de fin de formation ── */}
      <PrintPage>
        <DocHeader reference={docRef("AF", ev.startAt, app.number)} title="Attestation" subtitle="de fin de formation" />
        <DocTitle title="Attestation de fin de formation" subtitle="Article L.6353-1 du Code du travail" />

        <p className="mb-4">
          {settings.legalName} ({settings.brand}) atteste que <strong>{contactName(contact)}</strong> a suivi l'action de formation <strong>« {ev.name} »</strong> du {dateRange(ev.startAt, ev.endAt)}.
        </p>

        <DocSection title="Nature et durée de l'action">
          <Facts
            items={[
              { label: "Nature", value: "Action de formation (art. L.6313-1 1° du Code du travail), sans certification visée" },
              { label: "Modalité", value: modeLabel(ev) },
              { label: "Durée prévue", value: hoursLabel(ev.durationHours) },
              { label: "Durée suivie", value: hours !== null ? `${hoursLabel(hours)}${att?.rate !== null && att ? ` (assiduité ${Math.round((att.rate ?? 0) * 100)} %)` : ""}` : "…………… heures" },
            ]}
          />
        </DocSection>

        <DocSection title="Objectifs de la formation">
          <ol className="list-decimal space-y-0.5 pl-5">
            {ev.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ol>
        </DocSection>

        <DocSection title="Résultats de l'évaluation des acquis">
          {scores.length ? (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-strong text-[11px] text-muted-foreground print:text-[8.5pt]">
                  <th className="py-1 pr-2 font-medium">Compétence évaluée</th>
                  <th className="py-1 pr-2 text-right font-medium">Score</th>
                  <th className="py-1 font-medium">Niveau</th>
                </tr>
              </thead>
              <tbody>
                {scores.map(([k, v]) => (
                  <tr key={k} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-2">{capitalize(k)}</td>
                    <td className="tabular py-1.5 pr-2 text-right">{fmt1(v)} / 5</td>
                    <td className="py-1.5">{acquisitionLevel(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-strong text-[11px] text-muted-foreground print:text-[8.5pt]">
                  <th className="py-1 pr-2 font-medium">Objectif</th>
                  <th className="py-1 font-medium">Niveau atteint</th>
                </tr>
              </thead>
              <tbody>
                {ev.objectives.map((o, i) => (
                  <tr key={o} className="border-b border-border last:border-0 align-top">
                    <td className="py-1.5 pr-2">Objectif {i + 1}</td>
                    <td className="py-1.5">
                      <Checkline checked={false}>Maîtrisé</Checkline>
                      <Checkline checked={false}>Acquis</Checkline>
                      <Checkline checked={false}>En cours</Checkline>
                      <Checkline checked={false}>Non acquis</Checkline>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2">
            {acquis && typeof acquis.objectivesReached === "number" ? (
              <>
                Atteinte globale des objectifs : <strong>{fmt1(acquis.objectivesReached)} / 5</strong> ({acquisitionLevel(acquis.objectivesReached).toLowerCase()})
                {typeof app.positioningScore === "number" ? ` — positionnement d'entrée : ${fmt1(app.positioningScore)} / 10.` : "."}
              </>
            ) : typeof app.positioningScore === "number" ? (
              <>Positionnement d'entrée : {fmt1(app.positioningScore)} / 10.</>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">Modalités d'évaluation : {ev.evaluationMethods}</p>
        </DocSection>

        <SignatureBlock
          signedAt={app.certificateIssuedAt ?? (ended ? issued : undefined)}
          parties={[{ label: "Pour l'organisme de formation", name: rep?.name, role: rep ? `${rep.title} — ${settings.legalName}` : settings.legalName, stamp: true }]}
        />
        <DocFooter note={`${ev.code} · candidature #${app.number}`} />
      </PrintPage>
    </>
  );
}
