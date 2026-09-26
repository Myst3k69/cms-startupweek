"use client";

import * as React from "react";
import { useCollection, useEntity, useLookup, useNow, useSettings } from "@/lib/hooks";
import { SPEAKER_KINDS, labelOf } from "@/lib/domain/constants";
import type { ID } from "@/lib/domain/types";
import { date, dateRange, money } from "@/lib/format";
import { DocFooter, DocHeader, DocNotFound, DocSection, Facts, PrintPage, ScreenNotes } from "./print-kit";
import { audienceOf, hoursLabel, includesLodging, methodsOf, modeLabel, placeOf, priceParts, programDays, speakerName, trainingDaysCount } from "../doc-data";
import { fmt1, fmtPct, resultIndicators } from "@/features/qualiopi/metrics";

/** Fiche programme conforme à l'indicateur 1 (information du public) + programme jour par jour. */
export function ProgrammeDoc({ eventId }: { eventId: ID }) {
  const ev = useEntity("events", eventId);
  const users = useCollection("users");
  const speakers = useLookup("speakers");
  const events = useCollection("events");
  const applications = useCollection("applications");
  const evaluations = useCollection("evaluations");
  const attendances = useCollection("attendances");
  const settings = useSettings();
  const now = useNow();

  const results = React.useMemo(() => resultIndicators({ events, applications, evaluations, attendances }, now), [events, applications, evaluations, attendances, now]);

  if (!ev) return <DocNotFound what="Session" />;

  const days = programDays(ev);
  const quality = users.find((u) => u.id === settings.qualityLeadId);
  const disability = users.find((u) => u.id === settings.disabilityLeadId);
  const price = priceParts(ev.priceCents, settings);
  const team = ev.speakerIds.map((id) => speakers.get(id)).filter((s): s is NonNullable<typeof s> => !!s);
  const b2b = !!ev.orgId || ev.kind === "startup_village" || ev.kind === "evenement_entreprise";

  const notes: React.ReactNode[] = [];
  if (!ev.isTraining) notes.push("Cet événement n'est pas une action de formation (webinaire d'information) : la fiche programme Qualiopi n'est pas requise.");
  if (!ev.objectives.length) notes.push("Objectifs opérationnels manquants : exigés par les indicateurs 1 et 5.");
  if (!ev.accessibility) notes.push("Mention d'accessibilité manquante (indicateur 1).");

  return (
    <>
      <ScreenNotes notes={notes} />
      <PrintPage>
        <DocHeader title="Programme" subtitle="de formation" reference={ev.code} />

        <div className="my-5">
          <p className="eyebrow text-muted-foreground">Action de formation · {modeLabel(ev)}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold leading-tight text-foreground print:text-[17pt]">{ev.name}</h1>
          <p className="mt-1 text-muted-foreground">{ev.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">Programme mis à jour le {date(ev.updatedAt, "d MMMM yyyy")}</p>
        </div>

        <DocSection title="Objectifs opérationnels">
          <p>À l'issue de la formation, le stagiaire sera capable de :</p>
          <ol className="list-decimal space-y-0.5 pl-5">
            {ev.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ol>
        </DocSection>

        <DocSection title="Informations clés">
          <Facts
            items={[
              { label: "Public visé", value: audienceOf(ev) },
              { label: "Prérequis", value: `${ev.prerequisites} Vérification lors du positionnement d'entrée (questionnaire et diagnostic individuel).` },
              { label: "Durée", value: `${hoursLabel(ev.durationHours)} sur ${trainingDaysCount(ev)} jour(s)` },
              { label: "Dates et lieu", value: `${dateRange(ev.startAt, ev.endAt)} — ${placeOf(ev)}` },
              { label: "Effectif", value: `De ${ev.minCapacity} à ${ev.capacity} participants` },
              {
                label: "Modalités et délais d'accès",
                value: b2b
                  ? `Session organisée à la demande d'un client (entreprise ou école) : analyse du besoin, proposition et convention préalables. Délai de mise en œuvre convenu avec le client dans la proposition.`
                  : `Candidature en ligne sur ${settings.website.replace(/^https?:\/\//, "")}, entretien de qualification (analyse du besoin et positionnement), réponse sous ${settings.slaHours} h. Inscription confirmée à réception de l'acompte de ${settings.depositPercent} %. Clôture des inscriptions le ${date(ev.registrationDeadline, "d MMMM yyyy")} (dans la limite des places disponibles).`,
              },
              {
                label: "Tarif",
                value: ev.priceCents ? (
                  <>
                    <strong>{money(price.ttc)} TTC</strong>
                    {price.vatRate ? ` (${money(price.ht)} HT)` : " — TVA non applicable, art. 261-4-4° a du CGI"} par participant
                    {ev.publicPriceCents && ev.publicPriceCents > ev.priceCents ? ` au lieu de ${money(ev.publicPriceCents)}` : ""}
                    {includesLodging(ev) ? ", hébergement et repas inclus" : ""}. Acompte de {settings.depositPercent} % à l'inscription, solde à J-{settings.balanceDaysBefore}.
                  </>
                ) : b2b ? (
                  "Sur devis (tarif selon le nombre de participants et les options retenues)."
                ) : (
                  "Gratuit."
                ),
              },
              {
                label: "Financement",
                value: "Autofinancement, employeur, OPCO (selon critères de prise en charge), France Travail ou collectivités (sous réserve d'accord). Formation non éligible au CPF : elle ne prépare pas à une certification enregistrée.",
              },
              { label: "Sanction", value: "Certificat de réalisation et attestation de fin de formation mentionnant les résultats de l'évaluation des acquis." },
            ]}
          />
        </DocSection>

        <DocSection title="Méthodes mobilisées">
          <ul className="list-disc space-y-0.5 pl-5">
            {methodsOf(ev).map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          {team.length ? (
            <p className="mt-1">
              <span className="text-muted-foreground">Équipe pédagogique : </span>
              {team
                .slice(0, 8)
                .map((s) => `${speakerName(s)} (${labelOf(SPEAKER_KINDS, s.kind).toLowerCase()}${s.expertise[0] ? `, ${s.expertise[0]}` : ""})`)
                .join(" · ")}
              {team.length > 8 ? "…" : ""}
            </p>
          ) : null}
        </DocSection>

        <DocSection title="Modalités d'évaluation">
          <p>{ev.evaluationMethods}</p>
        </DocSection>

        <DocSection title="Accessibilité aux personnes en situation de handicap">
          <p>{ev.accessibility || "Nous contacter pour étudier les aménagements possibles."}</p>
          <p>Référent handicap : {disability ? `${disability.name} — ${disability.email}` : settings.email}.</p>
        </DocSection>

        <DocSection title="Contacts">
          <p>
            Inscriptions et informations : {settings.email} · {settings.phone}
            {quality ? ` — Référent pédagogique et qualité : ${quality.name}` : ""}.
          </p>
        </DocSection>

        {results.trainees > 0 ? (
          <DocSection title="Nos résultats">
            <p>
              Satisfaction des stagiaires : <strong>{fmtPct(results.satisfactionPct)}</strong> de satisfaits (note moyenne {fmt1(results.avgSatisfaction, "/5")}) · assiduité <strong>{fmtPct(results.attendanceRate)}</strong> ·{" "}
              <strong>{results.trainees}</strong> stagiaires formés sur {results.sessions} session(s) — données au {date(new Date(now).toISOString(), "d MMMM yyyy")}.
            </p>
          </DocSection>
        ) : null}

        {days.length ? (
          <section className="mt-2 break-before-page">
            <h2 className="mb-2 border-b border-border-strong pb-1 font-display text-base font-semibold text-foreground print:text-[12pt]">Programme jour par jour</h2>
            <div className="space-y-3">
              {days.map((d) => (
                <div key={d.day} className="break-inside-avoid">
                  <p className="mb-1 font-semibold text-foreground">
                    Jour {d.day} — <span className="first-letter:uppercase">{date(d.date, "EEEE d MMMM")}</span>{" "}
                    <span className="font-normal text-muted-foreground">
                      ({d.start}–{d.end})
                    </span>
                  </p>
                  <table className="w-full border-collapse text-left">
                    <tbody>
                      {d.slots.map((s) => {
                        const sp = s.speakerId ? speakers.get(s.speakerId) : undefined;
                        return (
                          <tr key={s.id} className="border-b border-border align-top last:border-0">
                            <td className="tabular w-[22%] py-1 pr-2 text-muted-foreground">
                              {s.start}–{s.end}
                            </td>
                            <td className="py-1 pr-2 text-foreground">{s.title}</td>
                            <td className="w-[28%] py-1 text-right text-xs text-muted-foreground">{sp ? speakerName(sp) : ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <DocFooter note={`Fiche programme ${ev.code} — document non contractuel, susceptible d'ajustements pédagogiques.`} />
      </PrintPage>
    </>
  );
}
