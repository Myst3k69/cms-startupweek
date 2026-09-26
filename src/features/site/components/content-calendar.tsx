"use client";

import * as React from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, PencilLine, Plus } from "lucide-react";
import { Legend } from "@/components/charts";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Modal } from "@/components/ui";
import { CHANNELS, CONTENT_STATUSES, labelOf } from "@/lib/domain/constants";
import type { ContentItem } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { CHANNEL_COLOR, contentDate, dayKey } from "../lib/content";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function StatusIcon({ item }: { item: ContentItem }) {
  const label = labelOf(CONTENT_STATUSES, item.status);
  const Icon = item.status === "publie" ? CheckCircle2 : item.status === "planifie" ? Clock3 : PencilLine;
  return <Icon className={cn("size-3 shrink-0", item.status === "publie" ? "text-success-text" : "text-muted-foreground")} aria-label={label} />;
}

function Chip({ item, draggable, onDragStart }: { item: ContentItem; draggable: boolean; onDragStart: (id: string) => void }) {
  const when = contentDate(item);
  return (
    <Link
      href={`/contenus/${item.id}`}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(item.id);
      }}
      title={`${item.title} — ${labelOf(CHANNELS, item.channel)} · ${labelOf(CONTENT_STATUSES, item.status)}`}
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-md border px-1.5 py-1 text-[11px] leading-tight transition-colors hover:border-border-strong",
        item.status === "publie" ? "border-border bg-surface-2 text-foreground" : item.status === "planifie" ? "border-dashed border-border-strong bg-surface text-foreground" : "border-dashed border-border bg-surface text-muted-foreground",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ background: CHANNEL_COLOR[item.channel] }} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {when ? <span className="tabular hidden shrink-0 text-faint xl:inline">{format(parseISO(when), "HH:mm")}</span> : null}
      <StatusIcon item={item} />
    </Link>
  );
}

/**
 * Calendrier éditorial mensuel : contenus publiés (date de publication) et programmés
 * (date prévue), pastille par canal. Glisser-déposer pour reprogrammer (hors publiés).
 */
export function ContentCalendar({
  items,
  now,
  editable,
  onCreate,
  onReschedule,
}: {
  items: ContentItem[];
  now: number;
  editable: boolean;
  onCreate: (day: string) => void;
  onReschedule: (id: string, day: string) => void;
}) {
  const [month, setMonth] = React.useState(() => startOfMonth(now).getTime());
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overDay, setOverDay] = React.useState<string | null>(null);
  const [openDay, setOpenDay] = React.useState<string | null>(null);

  const todayKey = format(now, "yyyy-MM-dd");
  const monthStart = new Date(month);

  const days = React.useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const last = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = first; d <= last; d = addDays(d, 1)) out.push(d);
    return out;
  }, [month]);

  const byDay = React.useMemo(() => {
    const m = new Map<string, ContentItem[]>();
    for (const it of items) {
      if (it.status === "archive") continue;
      const d = contentDate(it);
      if (!d) continue;
      const k = dayKey(d);
      const list = m.get(k) ?? [];
      list.push(it);
      m.set(k, list);
    }
    for (const list of m.values()) list.sort((a, b) => (contentDate(a) ?? "").localeCompare(contentDate(b) ?? ""));
    return m;
  }, [items]);

  const monthItems = React.useMemo(
    () =>
      days
        .filter((d) => isSameMonth(d, month))
        .map((d) => ({ day: d, key: format(d, "yyyy-MM-dd"), list: byDay.get(format(d, "yyyy-MM-dd")) ?? [] }))
        .filter((d) => d.list.length > 0),
    [days, byDay, month],
  );

  const unscheduled = React.useMemo(
    () => items.filter((i) => i.status !== "archive" && i.status !== "publie" && !i.scheduledAt),
    [items],
  );

  const canDrag = (it: ContentItem) => editable && it.status !== "publie";

  const drop = (key: string) => {
    if (dragId) onReschedule(dragId, key);
    setDragId(null);
    setOverDay(null);
  };

  const monthCount = monthItems.reduce((s, d) => s + d.list.length, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-wrap items-center">
          <div className="min-w-0">
            <CardTitle className="text-base capitalize">{format(monthStart, "MMMM yyyy", { locale: fr })}</CardTitle>
            <CardDescription>
              {monthCount} contenu{monthCount > 1 ? "s" : ""} ce mois-ci{editable ? " · glissez une carte sur un autre jour pour la reprogrammer" : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="icon-sm" aria-label="Mois précédent" onClick={() => setMonth(addMonths(month, -1).getTime())}>
              <ChevronLeft />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setMonth(startOfMonth(now).getTime())}>
              Aujourd'hui
            </Button>
            <Button variant="secondary" size="icon-sm" aria-label="Mois suivant" onClick={() => setMonth(addMonths(month, 1).getTime())}>
              <ChevronRight />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Grille (≥ sm) */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-7 border-b border-border pb-1.5">
              {WEEKDAYS.map((d) => (
                <div key={d} className="px-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const list = byDay.get(key) ?? [];
                const inMonth = isSameMonth(d, monthStart);
                const isToday = key === todayKey;
                const shown = list.slice(0, 3);
                return (
                  <div
                    key={key}
                    onDragOver={(e) => {
                      if (!dragId) return;
                      e.preventDefault();
                      setOverDay(key);
                    }}
                    onDragLeave={() => setOverDay((o) => (o === key ? null : o))}
                    onDrop={(e) => {
                      e.preventDefault();
                      drop(key);
                    }}
                    className={cn(
                      "group relative min-h-28 border-b border-r border-border p-1.5 transition-colors [&:nth-child(7n+1)]:border-l",
                      !inMonth && "bg-surface-2/50",
                      overDay === key && "bg-accent-soft",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={cn(
                          "tabular inline-flex size-6 items-center justify-center rounded-full text-xs",
                          isToday ? "bg-primary font-semibold text-primary-foreground" : inMonth ? "text-foreground" : "text-faint",
                        )}
                      >
                        {format(d, "d")}
                      </span>
                      {editable ? (
                        <button
                          type="button"
                          onClick={() => onCreate(key)}
                          className="inline-flex size-6 items-center justify-center rounded-md text-faint opacity-0 transition-opacity hover:bg-surface-2 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                          aria-label={`Nouveau contenu le ${format(d, "d MMMM", { locale: fr })}`}
                        >
                          <Plus className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      {shown.map((it) => (
                        <Chip key={it.id} item={it} draggable={canDrag(it)} onDragStart={setDragId} />
                      ))}
                      {list.length > shown.length ? (
                        <button type="button" onClick={() => setOpenDay(key)} className="w-full rounded px-1.5 text-left text-[11px] font-medium text-accent-text hover:underline">
                          + {list.length - shown.length} autre{list.length - shown.length > 1 ? "s" : ""}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agenda (mobile) */}
          <div className="sm:hidden">
            {monthItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucun contenu publié ou programmé ce mois-ci.</p>
            ) : (
              <ol className="space-y-3">
                {monthItems.map((d) => (
                  <li key={d.key}>
                    <p className={cn("mb-1 text-xs font-semibold capitalize", d.key === todayKey ? "text-accent-text" : "text-muted-foreground")}>
                      {format(d.day, "EEEE d MMMM", { locale: fr })}
                    </p>
                    <div className="space-y-1">
                      {d.list.map((it) => (
                        <Chip key={it.id} item={it} draggable={false} onDragStart={setDragId} />
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Legend items={CHANNELS.map((c) => ({ label: c.label, color: CHANNEL_COLOR[c.value] }))} />
            <ul className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <li className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3 text-success-text" aria-hidden="true" /> Publié
              </li>
              <li className="inline-flex items-center gap-1">
                <Clock3 className="size-3" aria-hidden="true" /> Planifié
              </li>
              <li className="inline-flex items-center gap-1">
                <PencilLine className="size-3" aria-hidden="true" /> En préparation
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>À programmer</CardTitle>
            <CardDescription>Idées et brouillons sans date : fixez une date dans l'éditeur pour les faire apparaître dans le calendrier.</CardDescription>
          </div>
          <span className="tabular rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted-foreground">{unscheduled.length}</span>
        </CardHeader>
        <CardContent className="pt-3">
          {unscheduled.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tout est programmé.</p>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {unscheduled.slice(0, 9).map((it) => (
                <Chip key={it.id} item={it} draggable={canDrag(it)} onDragStart={setDragId} />
              ))}
            </div>
          )}
          {unscheduled.length > 9 ? <p className="mt-2 text-xs text-muted-foreground">+ {unscheduled.length - 9} autres dans la vue Pipeline.</p> : null}
        </CardContent>
      </Card>

      <Modal open={openDay !== null} onClose={() => setOpenDay(null)} title={openDay ? format(parseISO(openDay), "EEEE d MMMM yyyy", { locale: fr }) : ""} size="sm">
        <div className="space-y-1.5">
          {(openDay ? (byDay.get(openDay) ?? []) : []).map((it) => (
            <Chip key={it.id} item={it} draggable={false} onDragStart={setDragId} />
          ))}
        </div>
      </Modal>
    </div>
  );
}
