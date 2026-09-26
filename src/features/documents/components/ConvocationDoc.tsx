"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { useCollection, useEntity, useNow, useSession, useSettings } from "@/lib/hooks";
import { sendConvocation } from "@/lib/domain/actions";
import { APPLICATION_STATUSES, labelOf } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { ID } from "@/lib/domain/types";
import { date, dateRange, dateTime } from "@/lib/format";
import { Button, useToast } from "@/components/ui";
import { DocFooter, DocHeader, DocNotFound, DocSection, Facts, PrintPage, ScreenNotes, SignatureBlock } from "./print-kit";
import { docRef, hoursLabel, includesLodging, isRemote, minusMinutes, modeLabel, placeOf, programDays, speakerName, trainingDaysCount } from "../doc-data";

/** Convocation à la formation (indicateur 9) : dates, horaires, lieu, programme, contacts, accessibilité, règlement intérieur. */
export function ConvocationDoc({ applicationId }: { applicationId: ID }) {
  const app = useEntity("applications", applicationId);
  const contact = useEntity("contacts", app?.contactId);
  const ev = useEntity("events", app?.eventId);
  const users = useCollection("users");
  const speakers = useCollection("speakers");
  const settings = useSettings();
  const now = useNow();
  const { canEdit } = useSession();
  const toast = useToast();

  if (!app || !ev) return <DocNotFound what="Candidature" />;

  const days = programDays(ev);
  const d1 = days[0];
  const quality = users.find((u) => u.id === settings.qualityLeadId);
  const disability = users.find((u) => u.id === settings.disabilityLeadId);
  const team = ev.speakerIds.map((id) => speakers.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);
  const remote = isRemote(ev);
  const issued = app.convocationSentAt ?? new Date(now).toISOString();

  const notes: React.ReactNode[] = [];
  if (app.status !== "inscrite") notes.push(`Candidature au statut « ${labelOf(APPLICATION_STATUSES, app.status)} » : la convocation n'est normalement envoyée qu'aux inscrits.`);
  if (app.convocationSentAt) notes.push(`Convocation envoyée par email le ${dateTime(app.convocationSentAt)}.`);
  if (!remote && !ev.venue) notes.push("Adresse précise du lieu non renseignée sur la session : complétez-la avant l'envoi.");

  return (
    <>
      <ScreenNotes
        notes={notes}
        actions={
          canEdit("candidatures") && contact ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                sendConvocation(app.id);
                toast({ title: "Convocation envoyée", description: `${contact.email} — horodatage enregistré (ind. 9).` });
              }}
            >
              <Send /> {app.convocationSentAt ? "Renvoyer par email" : "Envoyer par email"}
            </Button>
          ) : undefined
        }
      />
      <PrintPage>
        <DocHeader title="Convocation" reference={docRef("CV", ev.startAt, app.number)} date={issued} />

        <div className="my-5 flex justify-end">
          <div className="w-full max-w-[85mm] rounded-md border border-border p-3 text-foreground">
            <p className="font-semibold">{contactName(contact)}</p>
            {contact?.email ? <p>{contact.email}</p> : null}
            {contact?.phone ? <p>{contact.phone}</p> : null}
            {contact?.city ? <p>{contact.city}</p> : null}
          </div>
        </div>

        <p className="mb-3 font-semibold text-foreground">
          Objet : convocation à la formation « {ev.name} » ({ev.code})
        </p>
        <p className="mb-2">Bonjour {contact?.firstName ?? ""},</p>
        <p className="mb-4">
          Nous avons le plaisir de vous confirmer votre inscription et de vous convoquer à l'action de formation « {ev.name} ». Vous trouverez ci-dessous toutes les informations pratiques. Le programme détaillé et le règlement
          intérieur sont joints à ce courrier.
        </p>

        <DocSection title="Informations pratiques">
          <Facts
            items={[
              { label: "Dates", value: `${dateRange(ev.startAt, ev.endAt)} — ${trainingDaysCount(ev)} jour(s), ${hoursLabel(ev.durationHours)}` },
              {
                label: "Horaires du premier jour",
                value: d1 ? (
                  <>
                    {date(d1.date, "EEEE d MMMM")} : {remote ? "connexion" : "accueil"} à partir de <strong>{minusMinutes(d1.start, remote ? 15 : 30)}</strong>, début à <strong>{d1.start}</strong>, fin prévue à {d1.end}.
                  </>
                ) : (
                  date(ev.startAt, "EEEE d MMMM · HH:mm")
                ),
              },
              ...(days.length > 1 ? [{ label: "Jours suivants", value: days.slice(1).map((d) => `J${d.day} ${d.start}–${d.end}`).join(" · ") }] : []),
              { label: remote ? "Accès" : "Lieu", value: placeOf(ev) },
              { label: "Modalité", value: modeLabel(ev) },
              ...(team.length ? [{ label: "Équipe pédagogique", value: team.slice(0, 6).map((s) => speakerName(s)).join(", ") + (team.length > 6 ? "…" : "") }] : []),
              { label: "Contact organisation", value: `${settings.email} · ${settings.phone}${quality ? ` — ${quality.name}, ${quality.title}` : ""}` },
            ]}
          />
        </DocSection>

        {days.length ? (
          <DocSection title="Programme">
            <table className="w-full border-collapse text-left">
              <tbody>
                {days.map((d) => (
                  <tr key={d.day} className="border-b border-border align-top last:border-0">
                    <th scope="row" className="w-[26%] py-1 pr-2 text-[11.5px] font-medium text-muted-foreground print:text-[9pt]">
                      J{d.day} · {date(d.date, "EEE d MMM")}
                      <span className="block font-normal">
                        {d.start}–{d.end}
                      </span>
                    </th>
                    <td className="py-1">{d.slots.map((s) => s.title).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DocSection>
        ) : null}

        <DocSection title="À prévoir">
          <ul className="list-disc space-y-0.5 pl-5">
            <li>Un ordinateur portable (et son chargeur) avec un navigateur à jour{remote ? ", une webcam, un micro et une connexion internet stable" : ""}.</li>
            <li>Votre idée ou projet, et les éléments déjà réunis (notes, maquettes, contacts utilisateurs).</li>
            {includesLodging(ev) ? <li>Vos affaires personnelles pour la durée du séjour : l'hébergement et les repas sont inclus.</li> : null}
            {!remote ? <li>Une pièce d'identité.</li> : null}
          </ul>
        </DocSection>

        <DocSection title="Accessibilité et aménagements">
          <p>{ev.accessibility}</p>
          <p>
            Référent handicap : {disability ? `${disability.name} — ${disability.email}` : settings.email}.
            {app.accessibilityNeeds ? (app.accommodations ? ` Aménagements convenus : ${app.accommodations}` : " Votre besoin d'aménagement est en cours d'étude : le référent vous contactera avant la session.") : ""}
          </p>
        </DocSection>

        <DocSection title="Règlement intérieur">
          <p>
            Le règlement intérieur applicable aux stagiaires (art. L.6352-3 du Code du travail), joint à la présente et consultable sur {settings.website.replace(/^https?:\/\//, "")}, précise les règles d'hygiène et de sécurité, la
            discipline et les droits des stagiaires. Points essentiels :
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            <li>La présence est attestée par un émargement numérique à chaque demi-journée ; toute absence ou retard est signalé au plus tôt à {settings.email}.</li>
            <li>Les évaluations (positionnement, acquis, satisfaction) font partie intégrante de la formation.</li>
            <li>{remote ? "Caméra allumée pendant les temps de travail collectifs, dans la mesure du possible." : "Respect des lieux, du voisinage et des consignes de sécurité du site d'accueil."}</li>
          </ul>
        </DocSection>

        <p className="mt-2">Toute l'équipe se réjouit de vous accueillir. Nous restons à votre disposition pour toute question.</p>

        <SignatureBlock parties={[{ label: "Pour l'organisme de formation", name: quality?.name, role: quality ? `${quality.title} — ${settings.legalName}` : settings.legalName }]} signedAt={issued} />
        <DocFooter note={`${ev.code} · candidature #${app.number} · pièces jointes : programme détaillé, règlement intérieur`} />
      </PrintPage>
    </>
  );
}
