"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRightLeft, CalendarClock, Clock, Wallet } from "lucide-react";
import { UserChip } from "@/components/shared/entity-links";
import { APPLICATION_STATUSES, FUNDING_SOURCES, PERSONAS, labelOf, toneOf } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { Application, ApplicationStatus, Contact, EventSession } from "@/lib/domain/types";
import { dateTime, money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";
import { ScorePill } from "../bits";
import type { MoveTarget } from "./use-mover";

const PERSONA_SHORT: Record<Application["persona"], string> = { tech: "Tech", non_tech: "Non-tech", reconversion: "Reconversion" };

const HOUR = 3_600_000;

/** Âge compact d'une candidature (« 5 h », « 3 j », « 2 mois »). */
export function ageLabel(iso: string, now: number): string {
  const h = Math.floor((now - Date.parse(iso)) / HOUR);
  if (h < 1) return "< 1 h";
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 31) return `${d} j`;
  return `${Math.floor(d / 30)} mois`;
}

/** Nouvelle candidature non traitée depuis plus de 48 h (engagement de réponse du site). */
export function isStale(app: Pick<Application, "status" | "submittedAt">, now: number) {
  return app.status === "nouvelle" && now - Date.parse(app.submittedAt) >= 48 * HOUR;
}

/** Sélecteur natif discret « Déplacer vers… » (clavier, mobile, lecteurs d'écran). */
export function MoveSelect({ app, onMove, className }: { app: Application; onMove: (to: MoveTarget) => void; className?: string }) {
  return (
    <label
      className={cn(
        "relative inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
      title="Déplacer vers…"
    >
      <ArrowRightLeft className="size-3.5" aria-hidden="true" />
      <select
        aria-label={`Déplacer la candidature #${app.number} vers…`}
        value=""
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const v = e.target.value as ApplicationStatus;
          if (v) onMove(v);
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        <option value="" disabled>
          Déplacer vers…
        </option>
        {APPLICATION_STATUSES.filter((o) => o.value !== app.status).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ApplicationCard({
  app,
  contact,
  event,
  sessionFull,
  now,
  canEdit,
  onMove,
  compact,
}: {
  app: Application;
  contact?: Contact;
  event?: EventSession;
  sessionFull: boolean;
  now: number;
  canEdit: boolean;
  onMove: (to: MoveTarget) => void;
  compact?: boolean;
}) {
  const stale = isStale(app, now);
  const showCapacity = sessionFull && ["nouvelle", "qualifiee", "entretien", "acceptee", "liste_attente"].includes(app.status);
  const remaining = Math.max(0, app.amountDueCents - app.amountPaidCents);
  const name = contactName(contact);

  return (
    <article
      className={cn(
        "group relative rounded-md border bg-surface shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md",
        showCapacity ? "border-warning/50" : "border-border",
        compact ? "p-2.5" : "p-3",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="tabular font-mono">#{app.number}</span>
            {event ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate font-mono" title={event.name}>
                  {event.code}
                </span>
              </>
            ) : null}
            {compact ? (
              <Badge tone={toneOf(APPLICATION_STATUSES, app.status)} className="ml-0.5 px-1.5 py-0 text-[10px]">
                {labelOf(APPLICATION_STATUSES, app.status)}
              </Badge>
            ) : null}
          </div>
          <Link
            href={`/candidatures/${app.id}`}
            draggable={false}
            className="mt-0.5 block truncate text-sm font-semibold text-foreground after:absolute after:inset-0 after:rounded-md after:content-[''] hover:text-accent-text focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {name}
          </Link>
        </div>
        <ScorePill score={app.score} />
      </div>

      {!compact ? (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Badge tone={toneOf(PERSONAS, app.persona)} className="text-[11px]">
            {PERSONA_SHORT[app.persona]}
          </Badge>
          {app.funding !== "personnel" ? (
            <Badge tone="neutral" className="text-[11px]" title={app.funderName ?? undefined}>
              <Wallet className="size-3" aria-hidden="true" />
              {app.funderName ?? labelOf(FUNDING_SOURCES, app.funding)}
            </Badge>
          ) : null}
          {app.intent === "diagnostic" ? (
            <Badge tone="violet" className="text-[11px]">
              Diagnostic
            </Badge>
          ) : null}
        </div>
      ) : null}

      {app.status === "entretien" && !compact ? (
        <p className={cn("mt-2 flex items-center gap-1.5 text-xs", app.interviewAt ? "text-foreground" : "text-warning-text")}>
          <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
          {app.interviewAt ? dateTime(app.interviewAt) : "Date d'entretien à fixer"}
        </p>
      ) : null}

      {(app.status === "acceptee" || app.status === "inscrite") && !compact ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wallet className="size-3.5 shrink-0" aria-hidden="true" />
          {app.status === "acceptee" ? (
            app.amountPaidCents > 0 ? (
              <span className="text-success-text">Acompte reçu · {money(app.amountPaidCents)}</span>
            ) : (
              <span>Acompte en attente</span>
            )
          ) : remaining <= 0 ? (
            <span className="text-success-text">Soldé · {money(app.amountPaidCents)}</span>
          ) : (
            <span>
              Reste <span className="tabular font-medium text-foreground">{money(remaining)}</span>
            </span>
          )}
        </p>
      ) : null}

      {showCapacity ? (
        <p className="mt-2 flex items-center gap-1.5 rounded bg-warning-soft px-2 py-1 text-[11px] font-medium text-warning-text">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          Session complète ({event?.capacity} places)
        </p>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className={cn("inline-flex items-center gap-1", stale && "font-medium text-warning-text")} title={`Reçue le ${dateTime(app.submittedAt)}`}>
          <Clock className="size-3" aria-hidden="true" />
          {ageLabel(app.submittedAt, now)}
          {stale ? <span className="sr-only"> — en attente de traitement</span> : null}
        </span>
        <div className="relative z-10 flex items-center gap-1">
          {app.reviewerId ? <UserChip id={app.reviewerId} showName={false} /> : null}
          {canEdit ? <MoveSelect app={app} onMove={onMove} /> : null}
        </div>
      </div>
    </article>
  );
}
