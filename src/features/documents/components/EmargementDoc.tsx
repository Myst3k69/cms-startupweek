"use client";

import * as React from "react";
import { useCollection, useEntity, useLookup } from "@/lib/hooks";
import type { Attendance, ID } from "@/lib/domain/types";
import { date, dateRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DocFooter, DocHeader, DocNotFound, PrintPage, ScreenNotes, SignatureBlock } from "./print-kit";
import { hoursLabel, modeLabel, placeOf, speakerName } from "../doc-data";
import { isPresent, sessionHalfDays } from "@/features/qualiopi/metrics";

function timeOf(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function Cell({ a }: { a?: Attendance }) {
  if (!a) return <span className="block h-7" aria-label="Non émargé" />;
  if (a.status === "absent") return <span className="font-medium text-danger-text">Absent</span>;
  if (a.status === "excuse") return <span className="text-muted-foreground">Absent excusé</span>;
  return (
    <span className="leading-tight">
      <span className={cn("font-medium", a.status === "retard" ? "text-warning-text" : "text-success-text")}>
        {a.status === "retard" ? "Retard" : "✓ Signé"}
      </span>
      {a.signedAt ? <span className="block tabular text-[9px] text-muted-foreground print:text-[6.5pt]">{timeOf(a.signedAt)} · {a.method === "numerique" ? "num." : "papier"}</span> : a.method === "papier" ? <span className="block text-[9px] text-muted-foreground print:text-[6.5pt]">papier</span> : null}
    </span>
  );
}

/** Feuille d'émargement par demi-journée (indicateur 12 / preuve de réalisation). */
export function EmargementDoc({ eventId }: { eventId: ID }) {
  const ev = useEntity("events", eventId);
  const applications = useCollection("applications");
  const attendances = useCollection("attendances");
  const contacts = useLookup("contacts");
  const speakers = useLookup("speakers");

  const records = React.useMemo(() => attendances.filter((a) => a.eventId === eventId), [attendances, eventId]);
  const halfDays = React.useMemo(() => (ev ? sessionHalfDays(ev, attendances) : []), [ev, attendances]);
  const participants = React.useMemo(() => {
    const ids = new Set(applications.filter((a) => a.eventId === eventId && a.status === "inscrite").map((a) => a.contactId));
    records.forEach((r) => ids.add(r.contactId));
    return [...ids]
      .map((id) => contacts.get(id))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr"));
  }, [applications, records, contacts, eventId]);
  const index = React.useMemo(() => {
    const m = new Map<string, Attendance>();
    records.forEach((r) => m.set(`${r.contactId}|${r.date.slice(0, 10)}|${r.halfDay}`, r));
    return m;
  }, [records]);

  if (!ev) return <DocNotFound what="Session" />;

  const days = Array.from(new Set(halfDays.map((h) => h.date)));
  const trainers = Array.from(new Set(halfDays.flatMap((h) => h.speakerIds)))
    .map((id) => speakers.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s);
  const colCount = (key: string) => participants.filter((p) => {
    const r = index.get(`${p.id}|${key}`);
    return r && isPresent(r);
  }).length;

  const notes: React.ReactNode[] = [];
  if (!records.length) notes.push("Aucune signature enregistrée pour cette session : la feuille est générée vierge, à faire signer sur place (ou via l'émargement numérique de la fiche session).");
  if (!participants.length) notes.push("Aucun participant inscrit sur cette session.");
  if (halfDays.length > 16) notes.push(`${halfDays.length} demi-journées : la feuille peut s'étendre sur plusieurs pages.`);

  return (
    <>
      <ScreenNotes notes={notes} className="max-w-[297mm]" />
      <PrintPage orientation="landscape">
        <DocHeader title="Feuille d'émargement" subtitle="Présence par demi-journée" reference={ev.code} compact />
        <div className="my-3 grid gap-x-6 gap-y-0.5 text-[11.5px] sm:grid-cols-2 print:grid-cols-2 print:text-[8.5pt]">
          <p>
            <span className="text-muted-foreground">Action de formation : </span>
            <strong>{ev.name}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">Dates : </span>
            {dateRange(ev.startAt, ev.endAt)} · {hoursLabel(ev.durationHours)}
          </p>
          <p>
            <span className="text-muted-foreground">Lieu : </span>
            {placeOf(ev)}
          </p>
          <p>
            <span className="text-muted-foreground">Modalité : </span>
            {modeLabel(ev)}
          </p>
          <p className="sm:col-span-2 print:col-span-2">
            <span className="text-muted-foreground">Intervenant(s) : </span>
            {trainers.length ? trainers.map((t) => speakerName(t)).join(", ") : "—"}
          </p>
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[720px] border-collapse text-[10.5px] print:min-w-0 print:text-[7.5pt]">
            <thead>
              <tr>
                <th rowSpan={2} scope="col" className="border border-border-strong bg-surface-2 px-1.5 py-1 text-left align-bottom font-semibold print:bg-transparent">
                  Stagiaire
                </th>
                {days.map((d) => {
                  const span = halfDays.filter((h) => h.date === d).length;
                  const n = halfDays.find((h) => h.date === d)?.day;
                  return (
                    <th key={d} colSpan={span} scope="colgroup" className="border border-border-strong bg-surface-2 px-1 py-1 text-center font-semibold print:bg-transparent">
                      J{n} · {date(d, "EEE d MMM")}
                    </th>
                  );
                })}
                <th rowSpan={2} scope="col" className="border border-border-strong bg-surface-2 px-1 py-1 text-center align-bottom font-semibold print:bg-transparent">
                  Présence
                </th>
              </tr>
              <tr>
                {halfDays.map((h) => (
                  <th key={h.key} scope="col" className="border border-border-strong px-1 py-0.5 text-center font-medium text-muted-foreground">
                    {h.halfDay === "matin" ? "Matin" : "Après-midi"}
                    {h.start ? (
                      <span className="block tabular text-[9px] font-normal print:text-[6.5pt]">
                        {h.start}–{h.end}
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => {
                const present = halfDays.filter((h) => {
                  const r = index.get(`${p.id}|${h.key}`);
                  return r && isPresent(r);
                }).length;
                return (
                  <tr key={p.id} className="break-inside-avoid">
                    <th scope="row" className="border border-border-strong px-1.5 py-1 text-left font-medium">
                      {p.lastName.toUpperCase()} {p.firstName}
                    </th>
                    {halfDays.map((h) => (
                      <td key={h.key} className="h-9 border border-border-strong px-1 py-0.5 text-center align-middle">
                        <Cell a={index.get(`${p.id}|${h.key}`)} />
                      </td>
                    ))}
                    <td className="tabular border border-border-strong px-1 text-center">
                      {records.length ? `${present}/${halfDays.length}` : ""}
                    </td>
                  </tr>
                );
              })}
              {Array.from({ length: participants.length ? 0 : 6 }).map((_, i) => (
                <tr key={`blank-${i}`}>
                  <th scope="row" className="h-9 border border-border-strong px-1.5" />
                  {halfDays.map((h) => (
                    <td key={h.key} className="border border-border-strong" />
                  ))}
                  <td className="border border-border-strong" />
                </tr>
              ))}
            </tbody>
            <tfoot>
              {records.length ? (
                <tr>
                  <th scope="row" className="border border-border-strong bg-surface-2 px-1.5 py-1 text-left font-medium print:bg-transparent">
                    Présents
                  </th>
                  {halfDays.map((h) => (
                    <td key={h.key} className="tabular border border-border-strong px-1 text-center font-medium">
                      {colCount(h.key)}/{participants.length}
                    </td>
                  ))}
                  <td className="border border-border-strong" />
                </tr>
              ) : null}
              <tr>
                <th scope="row" className="border border-border-strong bg-surface-2 px-1.5 py-1 text-left align-top font-medium print:bg-transparent">
                  Formateur
                  <span className="block text-[9px] font-normal text-muted-foreground print:text-[6.5pt]">nom et signature</span>
                </th>
                {halfDays.map((h) => (
                  <td key={h.key} className="h-12 border border-border-strong px-1 pt-0.5 text-center align-top text-[9px] text-muted-foreground print:text-[6.5pt]">
                    {h.speakerIds
                      .map((id) => speakers.get(id))
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s) => `${s!.firstName} ${s!.lastName.charAt(0)}.`)
                      .join(", ")}
                  </td>
                ))}
                <td className="border border-border-strong" />
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-2 text-[10px] text-muted-foreground print:text-[7pt]">
          ✓ Signé : signature électronique horodatée recueillie dans StartupWeek OS (relevé d'horodatage conservé 3 ans) — « papier » : signature manuscrite sur feuille jointe. Les demi-journées non renseignées sont à émarger
          manuellement. Stagiaires : {participants.length}.
        </p>

        <SignatureBlock
          className="mt-3"
          parties={[{ label: "Visa du responsable de l'organisme", name: undefined, role: "Certifie l'exactitude des présences", stamp: true }]}
        />
        <DocFooter note={`Feuille d'émargement ${ev.code} — preuve de réalisation et de suivi de l'assiduité`} />
      </PrintPage>
    </>
  );
}
