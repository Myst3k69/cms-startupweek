"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Building2, CalendarDays, CalendarX2, Globe2, MapPin, Radio, Users } from "lucide-react";
import { Badge, EmptyState, Progress, StatusBadge } from "@/components/ui";
import { EVENT_MODES, EVENT_STATUSES, labelOf } from "@/lib/domain/constants";
import { daysUntil, sessionStats } from "@/lib/domain/selectors";
import type { Application, EventSession } from "@/lib/domain/types";
import { dateRange, money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OrgLink } from "@/components/shared/entity-links";
import { SessionImage } from "../bits";
import { audienceLabel, sessionAudience, type EventBilling } from "../../lib/sessions";

export function SessionCard({ ev, applications, now, billing }: { ev: EventSession; applications: Application[]; now: number; billing?: EventBilling }) {
  const st = sessionStats(ev, applications);
  const audience = sessionAudience(ev);
  const b2c = audience === "b2c";
  const d = daysUntil(ev.startAt, now);
  const running = d <= 0;
  const underMin = b2c && !running && d <= 21 && st.belowMinimum && ev.status !== "annule";
  const full = st.remaining === 0;
  const tone = full ? "warning" : st.fillRate >= 70 ? "success" : underMin ? "danger" : "accent";

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md">
      <SessionImage src={ev.imageUrl} alt="" className="h-36 shrink-0">
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-start gap-1.5">
          <span className="rounded bg-sw-black/70 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white backdrop-blur">{ev.code}</span>
          {ev.founderEdition ? <span className="rounded bg-sw-cyan px-1.5 py-0.5 text-[11px] font-semibold text-sw-ink">Founder Edition</span> : null}
          {ev.earlyBird ? <span className="rounded bg-sw-amber px-1.5 py-0.5 text-[11px] font-semibold text-sw-ink">Early Bird</span> : null}
        </div>
        <div className="absolute inset-x-3 bottom-2.5 flex items-end justify-between gap-2 text-white">
          <span className="inline-flex items-center gap-1 text-xs font-medium">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {dateRange(ev.startAt, ev.endAt)}
          </span>
          <span className="rounded-full bg-sw-black/60 px-2 py-0.5 text-[11px] font-medium backdrop-blur">{running ? "En cours" : `J-${d}`}</span>
        </div>
      </SessionImage>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-sm font-semibold leading-snug text-foreground">
            <Link href={`/sessions/${ev.id}`} className="after:absolute after:inset-0 after:content-[''] hover:text-accent-text focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring">
              {ev.name}
            </Link>
          </h3>
          <StatusBadge options={EVENT_STATUSES} value={ev.status} className="shrink-0" />
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {ev.mode === "distanciel" ? <Globe2 className="size-3.5" aria-hidden="true" /> : <MapPin className="size-3.5" aria-hidden="true" />}
            {labelOf(EVENT_MODES, ev.mode)} · {ev.city}
          </span>
          <span>{ev.region}</span>
        </p>

        {b2c ? (
          <>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="tabular text-lg font-semibold text-foreground">{money(ev.priceCents)}</span>
              {ev.publicPriceCents && ev.publicPriceCents > ev.priceCents ? <span className="tabular text-sm text-faint line-through">{money(ev.publicPriceCents)}</span> : null}
              <span className="text-xs text-muted-foreground">TTC</span>
            </div>

            <div className="mt-3">
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Users className="size-3.5" aria-hidden="true" />
                  <span className="tabular font-medium text-foreground">
                    {st.enrolled}/{ev.capacity}
                  </span>
                  inscrits
                </span>
                <span className={cn("tabular font-medium", full ? "text-warning-text" : "text-muted-foreground")}>
                  {full ? "Complet" : `${st.remaining} place${st.remaining > 1 ? "s" : ""} restante${st.remaining > 1 ? "s" : ""}`}
                </span>
              </div>
              <Progress value={st.fillRate} tone={tone} label={`Remplissage ${st.fillRate} %`} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              <Link href={`/candidatures?session=${ev.id}`} className="relative z-10 text-muted-foreground hover:text-accent-text hover:underline">
                {st.pipeline} candidature{st.pipeline > 1 ? "s" : ""} en cours
              </Link>
              <span className="tabular text-muted-foreground">CA {money(st.revenue)}</span>
            </div>
          </>
        ) : audience === "b2b" ? (
          <div className="mt-3 space-y-2 rounded-md bg-surface-2/70 px-3 py-2.5 text-xs">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Building2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
              {audienceLabel(ev)} · {ev.capacity} participants
            </p>
            <p className="relative z-10 truncate text-muted-foreground">
              Client : <OrgLink id={ev.orgId} />
            </p>
            <p className="tabular text-muted-foreground">
              {billing?.signed ? `CA signé ${money(billing.signed)} · facturé ${money(billing.billed)}` : "Facturation sur devis (pas de candidatures individuelles)"}
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-md bg-surface-2/70 px-3 py-2.5 text-xs">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Radio className="size-3.5 text-muted-foreground" aria-hidden="true" />
              {audienceLabel(ev)} · {ev.capacity} places
            </p>
            <p className="mt-1 text-muted-foreground">Inscriptions libres via le site, sans candidature ni facturation.</p>
          </div>
        )}

        {underMin ? (
          <p className="mt-3 flex items-start gap-1.5 rounded-md bg-danger-soft px-2.5 py-1.5 text-xs font-medium text-danger-text">
            <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            Sous le seuil minimum : {st.enrolled}/{ev.minCapacity} inscrits à J-{d}
          </p>
        ) : null}
        {!ev.publishedOnSite && ev.status !== "annule" && audience !== "b2b" ? (
          <Badge tone="neutral" className="mt-3 self-start">
            Non publiée sur le site
          </Badge>
        ) : null}
      </div>
    </article>
  );
}

export function SessionCards({ events, applications, now, billed }: { events: EventSession[]; applications: Application[]; now: number; billed: Map<string, EventBilling> }) {
  if (!events.length) {
    return <EmptyState icon={CalendarX2} title="Aucune session à venir" description="Aucune session à venir ne correspond à ces filtres. Consultez la vue Liste pour l'historique." />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {events.map((ev) => (
        <SessionCard key={ev.id} ev={ev} applications={applications} now={now} billing={billed.get(ev.id)} />
      ))}
    </div>
  );
}
