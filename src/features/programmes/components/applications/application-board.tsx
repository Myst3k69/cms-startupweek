"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { Dot } from "@/components/ui";
import { APPLICATION_EXITS, APPLICATION_PIPELINE, APPLICATION_STATUSES, labelOf, toneOf, type Tone } from "@/lib/domain/constants";
import type { Application, ApplicationStatus, Contact, EventSession, ID } from "@/lib/domain/types";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ApplicationCard, isStale } from "./application-card";
import type { MoveTarget } from "./use-mover";

export type BoardSort = "recent" | "ancien" | "score";

const COLUMN_HINT: Partial<Record<ApplicationStatus, string>> = {
  nouvelle: "À qualifier sous 48 h",
  qualifiee: "Dossier complet, à recevoir en entretien",
  entretien: "Entretien de motivation (30 min)",
  acceptee: "Facture d'acompte 30 % envoyée",
  inscrite: "Acompte réglé : place confirmée",
};

function sorter(sort: BoardSort) {
  return (a: Application, b: Application) => {
    if (sort === "score") return b.score - a.score || b.submittedAt.localeCompare(a.submittedAt);
    if (sort === "ancien") return a.submittedAt.localeCompare(b.submittedAt);
    return b.submittedAt.localeCompare(a.submittedAt);
  };
}

function Column({
  title,
  tone,
  count,
  hint,
  footer,
  active,
  dropProps,
  children,
  className,
  headerAction,
}: {
  title: string;
  tone: Tone;
  count: number;
  hint?: React.ReactNode;
  footer?: React.ReactNode;
  active: boolean;
  dropProps: React.HTMLAttributes<HTMLElement>;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}) {
  return (
    <section
      aria-label={`${title} (${count})`}
      {...dropProps}
      className={cn(
        "flex w-[272px] shrink-0 snap-start flex-col rounded-lg border bg-surface-2/50 transition-colors",
        active ? "border-ring/60 bg-accent-soft" : "border-border",
        className,
      )}
    >
      <header className="px-3 pb-2 pt-2.5">
        <div className="flex items-center gap-2">
          <Dot tone={tone} />
          <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
          <span className="tabular ml-auto rounded-full bg-surface px-1.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">{count}</span>
          {headerAction}
        </div>
        {hint ? <p className="mt-1 truncate text-[11px] text-faint">{hint}</p> : null}
      </header>
      <div className="flex min-h-28 flex-1 flex-col gap-2 px-2 pb-2">{children}</div>
      {footer ? <footer className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">{footer}</footer> : null}
    </section>
  );
}

function EmptyDrop({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border-strong px-3 py-6 text-center text-[11px] text-faint">
      <Inbox className="mb-1 size-4" aria-hidden="true" />
      {label}
    </div>
  );
}

/**
 * Kanban des candidatures : 5 colonnes du pipeline + colonne « Sorties » repliable.
 * Glisser-déposer natif (HTML5) ; repli clavier / mobile via le sélecteur « Déplacer vers… » de chaque carte.
 */
export function ApplicationBoard({
  apps,
  contacts,
  events,
  fullEvents,
  now,
  canEdit,
  sort,
  onMove,
}: {
  apps: Application[];
  contacts: Map<ID, Contact>;
  events: Map<ID, EventSession>;
  fullEvents: Set<ID>;
  now: number;
  canEdit: boolean;
  sort: BoardSort;
  onMove: (app: Application, to: MoveTarget) => void;
}) {
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<string | null>(null);
  const [exitsOpen, setExitsOpen] = React.useState(false);

  const byStatus = React.useMemo(() => {
    const m = new Map<ApplicationStatus, Application[]>();
    APPLICATION_STATUSES.forEach((o) => m.set(o.value, []));
    apps.forEach((a) => m.get(a.status)?.push(a));
    const cmp = sorter(sort);
    m.forEach((list) => list.sort(cmp));
    return m;
  }, [apps, sort]);

  const exitCount = APPLICATION_EXITS.reduce((s, st) => s + (byStatus.get(st)?.length ?? 0), 0);

  const dropProps = (key: MoveTarget): React.HTMLAttributes<HTMLElement> =>
    canEdit
      ? {
          onDragOver: (e) => {
            if (!dragId) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (over !== key) setOver(key);
          },
          onDragLeave: (e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
            setOver((o) => (o === key ? null : o));
          },
          onDrop: (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = dragId ?? e.dataTransfer.getData("text/plain");
            setDragId(null);
            setOver(null);
            const app = apps.find((a) => a.id === id);
            if (!app) return;
            if (key === "__exit" ? APPLICATION_EXITS.includes(app.status) : app.status === key) return;
            onMove(app, key);
          },
        }
      : {};

  const card = (a: Application, compact = false) => (
    <div
      key={a.id}
      draggable={canEdit}
      onDragStart={(e) => {
        setDragId(a.id);
        e.dataTransfer.setData("text/plain", a.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => {
        setDragId(null);
        setOver(null);
      }}
      className={cn(canEdit && "cursor-grab active:cursor-grabbing", dragId === a.id && "opacity-40")}
    >
      <ApplicationCard
        app={a}
        contact={contacts.get(a.contactId)}
        event={events.get(a.eventId)}
        sessionFull={fullEvents.has(a.eventId)}
        now={now}
        canEdit={canEdit}
        onMove={(to) => onMove(a, to)}
        compact={compact}
      />
    </div>
  );

  const footerFor = (st: ApplicationStatus, list: Application[]): React.ReactNode => {
    if (!list.length) return null;
    if (st === "nouvelle") {
      const stale = list.filter((a) => isStale(a, now)).length;
      return stale ? <span className="font-medium text-warning-text">{stale} en attente depuis plus de 48 h</span> : "Toutes traitées dans les délais";
    }
    if (st === "qualifiee") {
      const avg = Math.round(list.reduce((s, a) => s + a.score, 0) / list.length);
      return `Score moyen ${avg}/100`;
    }
    if (st === "entretien") {
      const undated = list.filter((a) => !a.interviewAt).length;
      return undated ? <span className="text-warning-text">{undated} entretien{undated > 1 ? "s" : ""} sans date</span> : "Tous les entretiens sont datés";
    }
    if (st === "acceptee") {
      const waiting = list.filter((a) => a.amountPaidCents <= 0).length;
      return `${waiting} acompte${waiting > 1 ? "s" : ""} en attente`;
    }
    if (st === "inscrite") {
      const due = list.reduce((s, a) => s + a.amountDueCents, 0);
      const paid = list.reduce((s, a) => s + a.amountPaidCents, 0);
      return (
        <span className="tabular">
          CA {money(due)} · encaissé {money(paid)}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="scrollbar-thin -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0" role="group" aria-label="Pipeline des candidatures">
      {APPLICATION_PIPELINE.map((st) => {
        const list = byStatus.get(st) ?? [];
        return (
          <Column
            key={st}
            title={labelOf(APPLICATION_STATUSES, st)}
            tone={toneOf(APPLICATION_STATUSES, st)}
            count={list.length}
            hint={COLUMN_HINT[st]}
            footer={footerFor(st, list)}
            active={over === st}
            dropProps={dropProps(st)}
          >
            {list.length ? list.map((a) => card(a)) : <EmptyDrop label={canEdit ? "Déposez une candidature ici" : "Aucune candidature"} />}
          </Column>
        );
      })}

      {exitsOpen ? (
        <section aria-label={`Sorties (${exitCount})`} className="flex w-[272px] shrink-0 snap-start flex-col rounded-lg border border-border bg-surface-2/30">
          <header className="flex items-center gap-2 px-3 pb-2 pt-2.5">
            <Dot tone="neutral" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sorties</h3>
            <span className="tabular rounded-full bg-surface px-1.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">{exitCount}</span>
            <button
              type="button"
              onClick={() => setExitsOpen(false)}
              className="ml-auto inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              aria-label="Replier la colonne Sorties"
              aria-expanded
            >
              <ChevronLeft className="size-4" />
            </button>
          </header>
          <div className="flex flex-col gap-2 px-2 pb-2">
            {APPLICATION_EXITS.map((st) => {
              const list = byStatus.get(st) ?? [];
              const active = over === st;
              return (
                <div
                  key={st}
                  role="group"
                  aria-label={`${labelOf(APPLICATION_STATUSES, st)} (${list.length})`}
                  {...dropProps(st)}
                  className={cn("rounded-md border p-1.5 transition-colors", active ? "border-ring/60 bg-accent-soft" : "border-border bg-surface-2/60")}
                >
                  <div className="flex items-center gap-2 px-1 py-1">
                    <Dot tone={toneOf(APPLICATION_STATUSES, st)} />
                    <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{labelOf(APPLICATION_STATUSES, st)}</span>
                    <span className="tabular ml-auto text-[11px] text-muted-foreground">{list.length}</span>
                  </div>
                  <div className="mt-1 flex flex-col gap-1.5">
                    {list.length ? list.map((a) => card(a, true)) : <p className="px-1 pb-1 text-[11px] text-faint">{canEdit ? "Déposer ici" : "Aucune"}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section
          aria-label={`Sorties (${exitCount}) — colonne repliée`}
          {...dropProps("__exit")}
          className={cn(
            "flex w-12 shrink-0 snap-start flex-col items-center rounded-lg border py-2 transition-colors",
            over === "__exit" ? "border-ring/60 bg-accent-soft" : "border-dashed border-border-strong bg-surface-2/30",
          )}
        >
          <button
            type="button"
            onClick={() => setExitsOpen(true)}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label="Déplier la colonne Sorties"
            aria-expanded={false}
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="tabular mt-2 rounded-full bg-surface px-1.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">{exitCount}</span>
          <span className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground [writing-mode:vertical-rl]">Sorties · attente, refus, désistements</span>
        </section>
      )}
    </div>
  );
}
