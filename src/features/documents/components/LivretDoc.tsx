"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { OUTING_STATUSES } from "@/lib/domain/constants";
import type { ID } from "@/lib/domain/types";
import { date, dateRange } from "@/lib/format";
import { useCollection, useEntity, useNow, useSettings } from "@/lib/hooks";
import { logisticsCompleteness } from "@/features/programmes/lib/logistics";
import { DocFooter, DocHeader, DocNotFound, DocSection, DocTitle, Facts, PrintPage, ScreenNotes } from "./print-kit";
import { isRemote, placeOf, programDays } from "../doc-data";

/** Livret d'accueil participant : lieu, accès, arrivée/départ, semaine, repas, quoi apporter, contacts. Aucune donnée personnelle de participant. */
export function LivretDoc({ eventId }: { eventId: ID }) {
  const ev = useEntity("events", eventId);
  const venue = useEntity("venues", ev?.venueId);
  const outings = useCollection("outings");
  const settings = useSettings();
  const now = useNow();

  const activities = React.useMemo(() => outings.filter((o) => o.eventId === eventId && o.status !== "annule" && o.status !== "idee"), [outings, eventId]);
  if (!ev) return <DocNotFound what="Session" />;

  const l = ev.logistics ?? {};
  const completeness = logisticsCompleteness(ev.logistics);
  const days = programDays(ev);
  const notes: React.ReactNode[] = [];
  if (completeness.missing.length) notes.push(`Rubriques essentielles à compléter : ${completeness.missing.join(", ")}.`);
  if (!venue && !isRemote(ev)) notes.push("Aucun lieu retenu dans l'onglet Logistique : le livret reprend le lieu affiché sur la session.");
  if (outings.some((o) => o.eventId === eventId && o.status === "idee")) notes.push("Les activités au statut « Idée » ne figurent pas dans le livret.");

  // L'adresse saisie dans les infos pratiques fait foi ; sinon, celle de la fiche du lieu retenu.
  const place = l.address ?? (venue ? [venue.name, venue.address ?? [venue.city, venue.country].filter(Boolean).join(", ")].join(" — ") : placeOf(ev));

  return (
    <>
      <ScreenNotes
        notes={notes}
        actions={
          <LinkButton href={`/sessions/${ev.id}?onglet=logistique&rubrique=infos`} size="sm" variant="secondary">
            <ArrowLeft /> Compléter les infos pratiques
          </LinkButton>
        }
      />
      <PrintPage>
        <DocHeader title="Livret d'accueil" subtitle={ev.code} date={new Date(now).toISOString()} compact />
        <DocTitle title={ev.name} subtitle={dateRange(ev.startAt, ev.endAt)} />

        <DocSection title="Le lieu">
          <Facts
            items={[
              { label: "Adresse", value: place || "—" },
              ...(l.mapsUrl ? [{ label: "Carte", value: <span className="break-all">{l.mapsUrl}</span> }] : []),
              ...(l.nearestHub ? [{ label: "Aéroport / gare", value: l.nearestHub }] : []),
              ...(l.access ?? venue?.accessInfo ? [{ label: "Comment venir", value: l.access ?? venue?.accessInfo }] : []),
            ]}
          />
        </DocSection>

        <DocSection title="Arrivée & départ">
          <Facts
            items={[
              { label: "Arrivée", value: l.checkIn ?? `Le ${date(ev.startAt, "EEEE d MMMM")}` },
              { label: "Départ", value: l.checkOut ?? `Le ${date(ev.endAt, "EEEE d MMMM")}` },
              ...(l.meetingPoint ? [{ label: "Point de rendez-vous", value: l.meetingPoint }] : []),
              ...(l.shuttle ? [{ label: "Navettes", value: l.shuttle }] : []),
            ]}
          />
        </DocSection>

        {days.length ? (
          <DocSection title="Votre semaine">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border text-[11px] text-muted-foreground">
                  <th className="py-1 pr-3 font-medium">Jour</th>
                  <th className="py-1 pr-3 font-medium">Horaires</th>
                  <th className="py-1 font-medium">Temps forts & activités</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => {
                  const acts = activities.filter((a) => a.day === d.day).sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
                  const highlights = d.slots.slice(0, 2).map((s) => s.title);
                  return (
                    <tr key={d.day} className="border-b border-border align-top last:border-0">
                      <td className="whitespace-nowrap py-1.5 pr-3 font-medium text-foreground">
                        J{d.day} · {date(d.date, "EEE d MMM")}
                      </td>
                      <td className="whitespace-nowrap py-1.5 pr-3 text-muted-foreground">
                        {d.start}–{d.end}
                      </td>
                      <td className="py-1.5 text-foreground">
                        {highlights.join(" · ")}
                        {acts.map((a) => (
                          <span key={a.id} className="block text-muted-foreground">
                            {a.start ? `${a.start} — ` : ""}
                            {a.title}
                            {a.location ? ` (${a.location})` : ""}
                            {!a.included ? " — en option" : ""}
                            {a.status === "a_reserver" ? ` — ${OUTING_STATUSES.find((s) => s.value === "a_reserver")?.label.toLowerCase()}` : ""}
                          </span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DocSection>
        ) : null}

        {l.meals ? (
          <DocSection title="Repas">
            <p>{l.meals}</p>
          </DocSection>
        ) : null}

        {l.whatToBring?.length ? (
          <DocSection title="Quoi apporter">
            <ul className="grid list-disc grid-cols-1 gap-x-6 pl-5 sm:grid-cols-2 print:grid-cols-2">
              {l.whatToBring.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </DocSection>
        ) : null}

        {l.wifi || l.houseRules ? (
          <DocSection title="Sur place">
            <Facts items={[...(l.wifi ? [{ label: "Wifi", value: l.wifi }] : []), ...(l.houseRules ? [{ label: "Règles du lieu", value: l.houseRules }] : [])]} />
          </DocSection>
        ) : null}

        <DocSection title="Contacts">
          <Facts
            items={[
              ...(l.onsiteContact ? [{ label: "Sur place", value: l.onsiteContact }] : []),
              ...(l.emergency ? [{ label: "Urgences", value: l.emergency }] : []),
              { label: "StartupWeek", value: [settings.email, settings.phone].filter(Boolean).join(" · ") || "—" },
            ]}
          />
        </DocSection>

        {ev.accessibility || venue?.accessibility ? (
          <DocSection title="Accessibilité">
            {venue?.accessibility ? <p>Lieu : {venue.accessibility}</p> : null}
            {ev.accessibility ? <p>{ev.accessibility}</p> : null}
          </DocSection>
        ) : null}

        {l.extra ? (
          <DocSection title="À savoir">
            <p className="whitespace-pre-line">{l.extra}</p>
          </DocSection>
        ) : null}

        <DocFooter validationNotice={false} note="Une question avant le départ ? Répondez simplement à l'email qui accompagne ce livret." />
      </PrintPage>
    </>
  );
}
