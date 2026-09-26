"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge, DataTable, Progress, StatusBadge, type Column } from "@/components/ui";
import { EVENT_KINDS, EVENT_MODES, EVENT_STATUSES, labelOf } from "@/lib/domain/constants";
import { sessionStats } from "@/lib/domain/selectors";
import type { Application, Evaluation, EventSession } from "@/lib/domain/types";
import { date, dateRange, money } from "@/lib/format";
import { Rating } from "../bits";
import { audienceLabel, satisfactionOf, sessionAudience, type EventBilling, type SessionAudience } from "../../lib/sessions";

interface Row {
  ev: EventSession;
  audience: SessionAudience;
  enrolled: number;
  fillRate: number;
  revenue: number;
  collected: number;
  satisfaction?: number;
  responses: number;
}

export function SessionList({
  events,
  applications,
  evaluations,
  billed,
}: {
  events: EventSession[];
  applications: Application[];
  evaluations: Evaluation[];
  billed: Map<string, EventBilling>;
}) {
  const router = useRouter();
  const rows = React.useMemo<Row[]>(
    () =>
      events.map((ev) => {
        const st = sessionStats(ev, applications);
        const sat = satisfactionOf(evaluations, ev.id);
        const audience = sessionAudience(ev);
        const b = billed.get(ev.id);
        return {
          ev,
          audience,
          enrolled: st.enrolled,
          fillRate: st.fillRate,
          revenue: audience === "b2c" ? st.revenue : (b?.signed ?? 0),
          collected: audience === "b2c" ? st.collected : (b?.collected ?? 0),
          satisfaction: sat.avg,
          responses: sat.count,
        };
      }),
    [events, applications, evaluations, billed],
  );

  const columns = React.useMemo<Column<Row>[]>(
    () => [
      { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.ev.code}</span>, sort: (r) => r.ev.code },
      {
        key: "name",
        header: "Session",
        render: (r) => (
          <div className="min-w-0">
            <div className="max-w-72 truncate font-medium text-foreground">{r.ev.name}</div>
            <div className="text-xs text-muted-foreground">{labelOf(EVENT_KINDS, r.ev.kind)}</div>
          </div>
        ),
        sort: (r) => r.ev.name,
      },
      {
        key: "dates",
        header: "Dates",
        render: (r) => <span className="whitespace-nowrap text-xs">{dateRange(r.ev.startAt, r.ev.endAt)}</span>,
        sort: (r) => r.ev.startAt,
        csv: (r) => `${date(r.ev.startAt, "yyyy-MM-dd")} → ${date(r.ev.endAt, "yyyy-MM-dd")}`,
      },
      {
        key: "place",
        header: "Lieu",
        render: (r) => (
          <div className="text-xs">
            <div className="text-foreground">{r.ev.city}</div>
            <div className="text-muted-foreground">
              {labelOf(EVENT_MODES, r.ev.mode)} · {r.ev.region}
            </div>
          </div>
        ),
        sort: (r) => r.ev.city,
        hideBelow: "lg",
      },
      {
        key: "status",
        header: "Statut",
        render: (r) => <StatusBadge options={EVENT_STATUSES} value={r.ev.status} />,
        sort: (r) => EVENT_STATUSES.findIndex((o) => o.value === r.ev.status),
        csv: (r) => labelOf(EVENT_STATUSES, r.ev.status),
      },
      {
        key: "fill",
        header: "Remplissage",
        render: (r) =>
          r.audience === "b2c" ? (
            <div className="w-28">
              <div className="tabular mb-1 flex justify-between text-xs">
                <span className="text-foreground">
                  {r.enrolled}/{r.ev.capacity}
                </span>
                <span className="text-muted-foreground">{r.fillRate} %</span>
              </div>
              <Progress value={r.fillRate} tone={r.fillRate >= 100 ? "warning" : r.fillRate >= 70 ? "success" : "accent"} label={`Remplissage ${r.fillRate} %`} />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              {audienceLabel(r.ev)} · {r.ev.capacity} {r.audience === "b2b" ? "pers." : "places"}
            </span>
          ),
        sort: (r) => (r.audience === "b2c" ? r.fillRate : -1),
        csv: (r) => (r.audience === "b2c" ? `${r.enrolled}/${r.ev.capacity}` : `${audienceLabel(r.ev)} (${r.ev.capacity})`),
      },
      { key: "revenue", header: "CA", render: (r) => money(r.revenue), sort: (r) => r.revenue, csv: (r) => (r.revenue / 100).toFixed(2), align: "right", hideBelow: "md" },
      { key: "collected", header: "Encaissé", render: (r) => money(r.collected), sort: (r) => r.collected, csv: (r) => (r.collected / 100).toFixed(2), align: "right", hideBelow: "xl" },
      {
        key: "sat",
        header: "Satisfaction",
        render: (r) => (
          <span title={`${r.responses} réponse${r.responses > 1 ? "s" : ""}`}>
            <Rating value={r.satisfaction} />
          </span>
        ),
        sort: (r) => r.satisfaction ?? -1,
        csv: (r) => (r.satisfaction === undefined ? "" : r.satisfaction.toFixed(2)),
        align: "center",
        hideBelow: "md",
      },
      {
        key: "site",
        header: "Site",
        render: (r) => (r.ev.publishedOnSite ? <Badge tone="success" dot>Publiée</Badge> : <Badge dot>Non publiée</Badge>),
        sort: (r) => (r.ev.publishedOnSite ? 1 : 0),
        csv: (r) => (r.ev.publishedOnSite ? "oui" : "non"),
        hideBelow: "xl",
      },
    ],
    [],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.ev.id}
      searchable={(r) => `${r.ev.code} ${r.ev.name} ${r.ev.city}`}
      searchPlaceholder="Code, nom, ville…"
      exportName="sessions"
      initialSort={{ key: "dates", dir: "desc" }}
      onRowClick={(r) => router.push(`/sessions/${r.ev.id}`)}
      emptyTitle="Aucune session"
      emptyDescription="Aucune session ne correspond à ces filtres."
    />
  );
}
