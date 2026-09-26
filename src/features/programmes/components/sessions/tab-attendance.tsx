"use client";

import * as React from "react";
import { CheckCheck, ClipboardCheck, Printer, UserX } from "lucide-react";
import { Card, EmptyState, LinkButton, Progress, StatCard, useToast } from "@/components/ui";
import { ContactLink } from "@/components/shared/entity-links";
import { ATTENDANCE_STATUSES, labelOf } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { Attendance, AttendanceStatus, EventSession } from "@/lib/domain/types";
import { date } from "@/lib/format";
import { useActions, useLookup, useNow } from "@/lib/hooks";
import { cn, pct } from "@/lib/utils";
import { HALF_DAYS } from "../../lib/labels";
import { sessionDays } from "../../lib/sessions";
import type { SessionData } from "./use-session-data";

const CYCLE: (AttendanceStatus | undefined)[] = [undefined, "present", "retard", "excuse", "absent"];
const LETTER: Record<AttendanceStatus, string> = { present: "P", retard: "R", excuse: "E", absent: "A" };
const CELL: Record<AttendanceStatus | "none", string> = {
  present: "bg-success-soft text-success-text ring-success/30",
  retard: "bg-warning-soft text-warning-text ring-warning/40",
  excuse: "bg-info-soft text-info-text ring-info/30",
  absent: "bg-danger-soft text-danger-text ring-danger/30",
  none: "bg-surface-2 text-faint ring-border",
};
const attended = (s?: AttendanceStatus) => s === "present" || s === "retard";

interface HalfDay {
  key: string;
  date: string;
  dayIndex: number;
  half: "matin" | "apres_midi";
  startsAt: number;
}

export function AttendanceTab({ ev, data, canEdit }: { ev: EventSession; data: SessionData; canEdit: boolean }) {
  const now = useNow();
  const contacts = useLookup("contacts");
  const { create, update, remove, log } = useActions();
  const toast = useToast();

  const participants = React.useMemo(
    () => [...data.enrolled].sort((a, b) => contactName(contacts.get(a.contactId)).localeCompare(contactName(contacts.get(b.contactId)), "fr")),
    [data.enrolled, contacts],
  );
  const halfDays = React.useMemo<HalfDay[]>(
    () =>
      sessionDays(ev).flatMap((d) =>
        HALF_DAYS.map((h) => {
          const [y, m, day] = d.date.split("-").map(Number);
          return { key: `${d.date}|${h.value}`, date: d.date, dayIndex: d.index, half: h.value, startsAt: new Date(y, m - 1, day, h.value === "matin" ? 9 : 14).getTime() };
        }),
      ),
    [ev],
  );
  const byKey = React.useMemo(() => new Map<string, Attendance>(data.attendance.map((a) => [`${a.contactId}|${a.date}|${a.halfDay}`, a])), [data.attendance]);
  const elapsed = React.useMemo(() => halfDays.filter((h) => h.startsAt <= now), [halfDays, now]);

  const stats = React.useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;
    participants.forEach((p) =>
      elapsed.forEach((h) => {
        const s = byKey.get(`${p.contactId}|${h.date}|${h.half}`)?.status;
        if (s === "present") present += 1;
        else if (s === "retard") late += 1;
        else if (s === "absent") absent += 1;
        else if (s === "excuse") excused += 1;
      }),
    );
    const expected = participants.length * elapsed.length;
    return { present, late, absent, excused, expected, rate: expected ? pct(present + late, expected) : undefined };
  }, [participants, elapsed, byKey]);

  const setStatus = (contactId: string, h: HalfDay, next: AttendanceStatus | undefined) => {
    const existing = byKey.get(`${contactId}|${h.date}|${h.half}`);
    const ts = new Date().toISOString();
    if (!next) {
      if (existing) remove("attendances", existing.id);
      return;
    }
    if (existing) update("attendances", existing.id, { status: next, signedAt: attended(next) ? (existing.signedAt ?? ts) : undefined });
    else create("attendances", { eventId: ev.id, contactId, date: h.date, halfDay: h.half, status: next, method: "numerique", signedAt: attended(next) ? ts : undefined }, { log: false });
  };

  const cycle = (contactId: string, h: HalfDay) => {
    const current = byKey.get(`${contactId}|${h.date}|${h.half}`)?.status;
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
    setStatus(contactId, h, next);
  };

  const markAll = (h: HalfDay) => {
    let changed = 0;
    participants.forEach((p) => {
      const s = byKey.get(`${p.contactId}|${h.date}|${h.half}`)?.status;
      if (s !== "present") {
        setStatus(p.contactId, h, "present");
        changed += 1;
      }
    });
    const label = `J${h.dayIndex} ${h.half === "matin" ? "matin" : "après-midi"}`;
    if (changed) log({ kind: "document", entity: "events", entityId: ev.id, summary: `Émargement : ${changed} participant${changed > 1 ? "s" : ""} marqué${changed > 1 ? "s" : ""} présent${changed > 1 ? "s" : ""} — ${label}` });
    toast({ title: changed ? `Tous présents — ${label}` : `Déjà tous présents — ${label}`, description: changed ? `${changed} émargement${changed > 1 ? "s" : ""} enregistré${changed > 1 ? "s" : ""} (signature numérique horodatée).` : undefined, tone: changed ? "success" : "info" });
  };

  if (!participants.length) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Aucun participant inscrit"
        description="La grille d'émargement se remplit avec les candidatures « Inscrite (payée) » de la session."
        action={
          <LinkButton href={`/print/emargement/${ev.id}`} target="_blank" variant="secondary">
            <Printer /> Feuille d'émargement vierge
          </LinkButton>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Taux d'assiduité" value={stats.rate === undefined ? "—" : `${stats.rate} %`} icon={ClipboardCheck} hint={elapsed.length ? `sur ${elapsed.length} demi-journée${elapsed.length > 1 ? "s" : ""} écoulée${elapsed.length > 1 ? "s" : ""}` : "La session n'a pas commencé"} />
        <StatCard label="Demi-journées" value={`${elapsed.length}/${halfDays.length}`} icon={CheckCheck} hint={`${participants.length} participant${participants.length > 1 ? "s" : ""}`} />
        <StatCard label="Absences" value={stats.absent + stats.excused} icon={UserX} hint={`dont ${stats.excused} excusée${stats.excused > 1 ? "s" : ""}`} />
        <StatCard label="Retards" value={stats.late} hint="Comptés présents dans l'assiduité" />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Légende">
          {ATTENDANCE_STATUSES.map((s) => (
            <li key={s.value} className="inline-flex items-center gap-1.5">
              <span className={cn("inline-flex size-5 items-center justify-center rounded text-[10px] font-semibold ring-1 ring-inset", CELL[s.value])}>{LETTER[s.value]}</span>
              {s.label}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5">
            <span className={cn("inline-flex size-5 items-center justify-center rounded text-[10px] ring-1 ring-inset", CELL.none)}>·</span>
            Non saisi
          </li>
        </ul>
        <LinkButton href={`/print/emargement/${ev.id}`} target="_blank" size="sm" variant="secondary" className="sm:ml-auto">
          <Printer /> Feuille d'émargement
        </LinkButton>
      </div>
      {canEdit ? <p className="text-xs text-muted-foreground">Cliquez sur une case pour faire défiler : Présent → Retard → Excusé → Absent → non saisi. Les émargements sont horodatés (signature numérique, indicateur 11).</p> : null}

      <Card className="overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/60">
                <th scope="col" rowSpan={2} className="sticky left-0 z-10 min-w-44 bg-surface-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Participant
                </th>
                {sessionDays(ev).map((d) => (
                  <th key={d.date} scope="colgroup" colSpan={2} className="whitespace-nowrap border-l border-border px-2 py-1.5 text-center text-[11px] font-semibold text-foreground">
                    J{d.index} <span className="font-normal capitalize text-muted-foreground">{date(d.date, "EEE d MMM")}</span>
                  </th>
                ))}
                <th scope="col" rowSpan={2} className="border-l border-border px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Assiduité
                </th>
              </tr>
              <tr className="border-b border-border bg-surface-2/60">
                {halfDays.map((h) => (
                  <th key={h.key} scope="col" className={cn("px-1 py-1 text-center", h.half === "matin" && "border-l border-border")}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground">{h.half === "matin" ? "Matin" : "A-midi"}</span>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => markAll(h)}
                          className="inline-flex size-6 items-center justify-center rounded text-faint hover:bg-success-soft hover:text-success-text"
                          aria-label={`Tout marquer présent — J${h.dayIndex} ${h.half === "matin" ? "matin" : "après-midi"}`}
                          title="Tout marquer présent"
                        >
                          <CheckCheck className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => {
                const name = contactName(contacts.get(p.contactId));
                let ok = 0;
                elapsed.forEach((h) => {
                  if (attended(byKey.get(`${p.contactId}|${h.date}|${h.half}`)?.status)) ok += 1;
                });
                const rate = elapsed.length ? pct(ok, elapsed.length) : undefined;
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-1.5 text-left font-normal">
                      <ContactLink id={p.contactId} className="block max-w-44 truncate text-sm" />
                    </th>
                    {halfDays.map((h) => {
                      const a = byKey.get(`${p.contactId}|${h.date}|${h.half}`);
                      const st = a?.status;
                      const future = h.startsAt > now;
                      const label = `${name} — J${h.dayIndex} ${h.half === "matin" ? "matin" : "après-midi"} : ${st ? labelOf(ATTENDANCE_STATUSES, st) : "non saisi"}`;
                      return (
                        <td key={h.key} className={cn("px-1 py-1 text-center", h.half === "matin" && "border-l border-border")}>
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => cycle(p.contactId, h)}
                            aria-label={canEdit ? `${label}. Cliquer pour changer.` : label}
                            title={a?.signedAt ? `${label} · signé le ${date(a.signedAt, "d MMM HH:mm")}` : label}
                            className={cn(
                              "inline-flex size-8 items-center justify-center rounded-md text-xs font-semibold ring-1 ring-inset transition-transform enabled:hover:scale-105 disabled:cursor-default",
                              CELL[st ?? "none"],
                              future && !st && "opacity-50",
                            )}
                          >
                            {st ? LETTER[st] : "·"}
                          </button>
                        </td>
                      );
                    })}
                    <td className="border-l border-border px-3 py-1.5">
                      {rate === undefined ? (
                        <span className="text-xs text-faint">—</span>
                      ) : (
                        <div className="ml-auto flex w-24 items-center gap-2">
                          <Progress value={rate} tone={rate >= 90 ? "success" : rate >= 70 ? "warning" : "danger"} label={`Assiduité ${rate} %`} />
                          <span className="tabular w-9 text-right text-xs text-foreground">{rate} %</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-surface-2/40">
                <th scope="row" className="sticky left-0 z-10 bg-surface-2 px-3 py-1.5 text-left text-[11px] font-medium text-muted-foreground">
                  Présents
                </th>
                {halfDays.map((h) => {
                  const n = participants.filter((p) => attended(byKey.get(`${p.contactId}|${h.date}|${h.half}`)?.status)).length;
                  return (
                    <td key={h.key} className={cn("tabular px-1 py-1.5 text-center text-[11px] text-muted-foreground", h.half === "matin" && "border-l border-border")}>
                      {n}/{participants.length}
                    </td>
                  );
                })}
                <td className="border-l border-border" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
