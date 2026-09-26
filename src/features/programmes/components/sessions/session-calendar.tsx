"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Dot } from "@/components/ui";
import { EVENT_STATUSES, labelOf, toneOf, type Tone } from "@/lib/domain/constants";
import type { EventSession } from "@/lib/domain/types";
import { date } from "@/lib/format";
import { cn } from "@/lib/utils";
import { startOfDay, sessionDates } from "../../lib/sessions";

const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

const BAR: Record<Tone, string> = {
  neutral: "bg-surface-3 text-muted-foreground ring-border",
  info: "bg-info-soft text-info-text ring-info/30",
  success: "bg-success-soft text-success-text ring-success/30",
  warning: "bg-warning-soft text-warning-text ring-warning/40",
  danger: "bg-danger-soft text-danger-text ring-danger/30",
  accent: "bg-accent-soft-strong text-accent-text ring-ring/40",
  violet: "bg-violet-soft text-violet ring-violet/30",
};

const dayDiff = (a: number, b: number) => Math.round((b - a) / 86_400_000);

interface Placed {
  ev: EventSession;
  from: number; // colonne 0-6
  to: number;
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

/** Calendrier mensuel simple : sessions en barres continues (lundi → dimanche). */
export function SessionCalendar({ events, now }: { events: EventSession[]; now: number }) {
  const [cursor, setCursor] = React.useState(() => {
    const d = new Date(now);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const today = startOfDay(now);

  const weeks = React.useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const count = Math.ceil((offset + daysInMonth) / 7);
    const spans = events.map((ev) => ({ ev, s: startOfDay(Date.parse(ev.startAt)), e: startOfDay(Date.parse(ev.endAt)) }));
    return Array.from({ length: count }, (_, w) => {
      const days = Array.from({ length: 7 }, (_, i) => new Date(cursor.y, cursor.m, 1 - offset + w * 7 + i).getTime());
      const ws = days[0];
      const we = days[6];
      const items = spans
        .filter((x) => x.s <= we && x.e >= ws)
        .map((x) => ({ ev: x.ev, from: Math.max(0, dayDiff(ws, x.s)), to: Math.min(6, dayDiff(ws, x.e)), continuesBefore: x.s < ws, continuesAfter: x.e > we }))
        .sort((a, b) => a.from - b.from || b.to - b.from - (a.to - a.from));
      const laneEnds: number[] = [];
      const placed: Placed[] = items.map((it) => {
        let lane = laneEnds.findIndex((end) => end < it.from);
        if (lane === -1) {
          lane = laneEnds.length;
          laneEnds.push(it.to);
        } else laneEnds[lane] = it.to;
        return { ...it, lane };
      });
      return { days, placed, lanes: laneEnds.length };
    });
  }, [cursor, events]);

  const monthLabel = date(new Date(cursor.y, cursor.m, 1).toISOString(), "MMMM yyyy");
  const shift = (delta: number) => setCursor((c) => {
    const d = new Date(c.y, c.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const monthCount = React.useMemo(() => {
    const ms = new Date(cursor.y, cursor.m, 1).getTime();
    const me = new Date(cursor.y, cursor.m + 1, 1).getTime();
    return events.filter((ev) => Date.parse(ev.startAt) < me && Date.parse(ev.endAt) >= ms).length;
  }, [cursor, events]);

  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-base font-semibold capitalize text-foreground" aria-live="polite">
            {monthLabel}
          </h2>
          <p className="text-xs text-muted-foreground">{monthCount ? `${monthCount} session${monthCount > 1 ? "s" : ""} ce mois-ci` : "Aucune session ce mois-ci"}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="icon-sm" onClick={() => shift(-1)} aria-label="Mois précédent">
            <ChevronLeft />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const d = new Date(now);
              setCursor({ y: d.getFullYear(), m: d.getMonth() });
            }}
          >
            Aujourd'hui
          </Button>
          <Button variant="secondary" size="icon-sm" onClick={() => shift(1)} aria-label="Mois suivant">
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-surface-2/60">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-1 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-2 sm:text-left">
            {d}
          </div>
        ))}
      </div>

      <div aria-label={`Sessions — ${monthLabel}`}>
        {weeks.map((w, wi) => (
          <div key={wi} className="relative border-b border-border last:border-0" style={{ minHeight: `${Math.max(88, 34 + w.lanes * 26)}px` }}>
            <div className="absolute inset-0 grid grid-cols-7" aria-hidden="true">
              {w.days.map((d, di) => {
                const inMonth = new Date(d).getMonth() === cursor.m;
                const isToday = d === today;
                return (
                  <div key={d} className={cn("border-border px-1 pt-1 sm:px-2", di > 0 && "border-l", !inMonth && "bg-surface-2/40")}>
                    <span
                      className={cn(
                        "tabular inline-flex size-6 items-center justify-center rounded-full text-xs",
                        isToday ? "bg-primary font-semibold text-primary-foreground" : inMonth ? "text-foreground" : "text-faint",
                      )}
                    >
                      {new Date(d).getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="relative grid grid-cols-7 gap-y-1 px-0.5 pb-2 pt-8" style={{ gridTemplateRows: w.lanes ? `repeat(${w.lanes}, 22px)` : undefined }}>
              {w.placed.map((p) => {
                const tone = toneOf(EVENT_STATUSES, p.ev.status);
                return (
                  <Link
                    key={p.ev.id}
                    href={`/sessions/${p.ev.id}`}
                    title={`${p.ev.code} · ${p.ev.name} — ${sessionDates(p.ev)} · ${labelOf(EVENT_STATUSES, p.ev.status)}`}
                    style={{ gridColumn: `${p.from + 1} / ${p.to + 2}`, gridRow: p.lane + 1 }}
                    className={cn(
                      "mx-0.5 flex min-w-0 items-center gap-1 truncate rounded-md px-1.5 text-[10px] font-medium ring-1 ring-inset transition-opacity hover:opacity-80 sm:text-[11px]",
                      BAR[tone],
                      p.continuesBefore && "ml-0 rounded-l-none",
                      p.continuesAfter && "mr-0 rounded-r-none",
                    )}
                  >
                    <span className="font-mono">{p.ev.code}</span>
                    <span className="hidden truncate sm:inline">· {p.ev.city}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        {EVENT_STATUSES.filter((s) => s.value !== "brouillon").map((s) => (
          <span key={s.value} className="inline-flex items-center gap-1.5">
            <Dot tone={s.tone} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
