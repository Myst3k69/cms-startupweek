"use client";

import * as React from "react";
import Link from "next/link";
import { BellRing, Trophy } from "lucide-react";
import { AvatarGroup, Badge, StatusBadge } from "@/components/ui";
import { PROJECT_STAGES } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { Contact, EventSession, ID, Project, Speaker } from "@/lib/domain/types";
import { compactNumber, date, money, relative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PROJECT_HEALTH } from "../../lib/labels";

export interface ProjectLookups {
  contacts: Map<ID, Contact>;
  events: Map<ID, EventSession>;
  speakers: Map<ID, Speaker>;
}

export function followUpState(p: Project, now: number): "retard" | "bientot" | undefined {
  if (!p.followUpAt) return undefined;
  const t = Date.parse(p.followUpAt);
  if (t < now) return "retard";
  if (t < now + 7 * 86_400_000) return "bientot";
  return undefined;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md bg-surface-2/70 px-2 py-1.5">
      <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="tabular truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

export function ProjectCard({ p, lookups, now, compact }: { p: Project; lookups: ProjectLookups; now: number; compact?: boolean }) {
  const founders = p.founderIds.map((id) => lookups.contacts.get(id)).filter((c): c is Contact => Boolean(c));
  const mentors = p.mentorIds.map((id) => lookups.speakers.get(id)).filter((s): s is Speaker => Boolean(s));
  const sessions = p.eventIds.map((id) => lookups.events.get(id)).filter((e): e is EventSession => Boolean(e));
  const follow = followUpState(p, now);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-lg border bg-surface shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md",
        p.health === "bloque" ? "border-danger/40" : p.health === "a_risque" ? "border-warning/50" : "border-border",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">
            <Link
              href={`/projets/${p.id}`}
              draggable={false}
              className="after:absolute after:inset-0 after:content-[''] hover:text-accent-text focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {p.name}
            </Link>
          </h3>
          {p.sector && !compact ? <p className="truncate text-xs text-muted-foreground">{p.sector}</p> : null}
        </div>
        <StatusBadge options={PROJECT_HEALTH} value={p.health} className="shrink-0" />
      </div>
      {p.tagline ? <p className={cn("mt-1.5 text-sm text-muted-foreground", compact ? "line-clamp-2 text-xs" : "line-clamp-2")}>{p.tagline}</p> : null}

      {!compact ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <StatusBadge options={PROJECT_STAGES} value={p.stage} />
          {sessions.map((e) => (
            <Badge key={e.id} className="font-mono text-[11px]" title={e.name}>
              {e.code}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        {founders.length ? <AvatarGroup people={founders.map((c) => ({ name: contactName(c) }))} size="xs" /> : null}
        <span className="min-w-0 truncate text-xs text-muted-foreground">{founders.length ? founders.map((c) => c.firstName).join(", ") : "Aucun fondateur"}</span>
      </div>
      {!compact && mentors.length ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">
          Mentors : <span className="text-foreground">{mentors.map((m) => `${m.firstName} ${m.lastName.charAt(0)}.`).join(", ")}</span>
        </p>
      ) : null}

      {!compact ? (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <Metric label="Users" value={p.metrics.users !== undefined ? compactNumber(p.metrics.users) : "—"} />
          <Metric label="Waitlist" value={p.metrics.waitlist !== undefined ? compactNumber(p.metrics.waitlist) : "—"} />
          <Metric label="MRR" value={p.metrics.mrrCents !== undefined ? money(p.metrics.mrrCents) : "—"} />
        </div>
      ) : p.metrics.mrrCents || p.metrics.users ? (
        <p className="tabular mt-2 text-xs text-muted-foreground">
          {p.metrics.users !== undefined ? `${compactNumber(p.metrics.users)} users` : ""}
          {p.metrics.users !== undefined && p.metrics.mrrCents ? " · " : ""}
          {p.metrics.mrrCents ? `${money(p.metrics.mrrCents)} MRR` : ""}
        </p>
      ) : null}

      {p.awards.length && !compact ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {p.awards.map((a) => (
            <Badge key={a} tone="warning" className="text-[11px]">
              <Trophy className="size-3" aria-hidden="true" /> {a}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11px] text-muted-foreground">
        <span title={date(p.lastUpdateAt)}>Mis à jour {relative(p.lastUpdateAt, now)}</span>
        {follow ? (
          <span className={cn("inline-flex items-center gap-1 font-medium", follow === "retard" ? "text-danger-text" : "text-warning-text")}>
            <BellRing className="size-3" aria-hidden="true" />
            Suivi {follow === "retard" ? "en retard" : date(p.followUpAt, "d MMM")}
          </span>
        ) : null}
      </div>
    </article>
  );
}
