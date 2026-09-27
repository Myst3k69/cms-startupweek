"use client";

import * as React from "react";
import { DataTable, StatusBadge, type Column } from "@/components/ui";
import { useLookup } from "@/lib/hooks";
import type { AdCampaign } from "@/lib/domain/types";
import { date, money, number, percent } from "@/lib/format";
import { AD_PLATFORMS, CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUSES } from "../lib/labels";
import type { CampaignPerf } from "../lib/metrics";
import { BudgetBar, PlatformBadge, cost, roasFmt } from "./parts";
import type { MarketingData } from "./use-marketing-data";

interface Row {
  c: AdCampaign;
  p: CampaignPerf;
}

export function CampaignsTab({ data, onOpen }: { data: MarketingData; onOpen: (c: AdCampaign) => void }) {
  const events = useLookup("events");
  const rows = React.useMemo<Row[]>(() => data.campaigns.map((c) => ({ c, p: data.perf.get(c.id)! })), [data.campaigns, data.perf]);

  const eventOptions = React.useMemo(() => {
    const ids = [...new Set(data.campaigns.map((c) => c.eventId).filter((x): x is string => Boolean(x)))];
    return ids.map((id) => ({ value: id, label: events.get(id)?.code ?? id })).sort((a, b) => a.label.localeCompare(b.label));
  }, [data.campaigns, events]);

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Campagne",
      render: ({ c }) => {
        const ev = c.eventId ? events.get(c.eventId) : undefined;
        return (
          <div className="min-w-48">
            <p className="font-medium text-foreground">{c.name}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <PlatformBadge platform={c.platform} />
              <span>{CAMPAIGN_OBJECTIVES.find((o) => o.value === c.objective)?.label}</span>
              {ev ? <span className="font-mono">{ev.code}</span> : null}
            </p>
          </div>
        );
      },
      sort: ({ c }) => c.name,
      csv: ({ c }) => c.name,
    },
    { key: "status", header: "Statut", render: ({ c }) => <StatusBadge options={CAMPAIGN_STATUSES} value={c.status} />, sort: ({ c }) => c.status, csv: ({ c }) => c.status },
    {
      key: "period",
      header: "Période",
      render: ({ c }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {date(c.startAt, "d MMM")} → {c.endAt ? date(c.endAt, "d MMM yy") : "en continu"}
        </span>
      ),
      sort: ({ c }) => c.startAt,
      csv: ({ c }) => `${c.startAt.slice(0, 10)} → ${c.endAt?.slice(0, 10) ?? ""}`,
      hideBelow: "lg",
    },
    { key: "budget", header: "Budget", render: ({ c, p }) => <BudgetBar spent={p.spendCents} budget={c.budgetCents} />, sort: ({ p }) => p.budgetUsedPct ?? 0, csv: ({ c }) => c.budgetCents / 100, hideBelow: "md" },
    { key: "spend", header: "Dépense", align: "right", render: ({ p }) => <span className="tabular">{money(p.spendCents)}</span>, sort: ({ p }) => p.spendCents, csv: ({ p }) => p.spendCents / 100 },
    { key: "ctr", header: "CTR", align: "right", render: ({ p }) => <span className="tabular">{p.impressions ? percent(p.ctr, 2) : "—"}</span>, sort: ({ p }) => p.ctr, csv: ({ p }) => p.ctr.toFixed(2), hideBelow: "xl" },
    { key: "cpl", header: "CPL régie", align: "right", render: ({ p }) => <span className="tabular">{cost(p.cplCents)}</span>, sort: ({ p }) => p.cplCents ?? Infinity, csv: ({ p }) => (p.cplCents ?? 0) / 100, hideBelow: "xl" },
    { key: "leads", header: "Leads CRM", align: "right", render: ({ p }) => <span className="tabular">{number(p.crmLeads)}</span>, sort: ({ p }) => p.crmLeads, csv: ({ p }) => p.crmLeads },
    { key: "enrolled", header: "Inscr.", align: "right", render: ({ p }) => <span className="tabular">{number(p.enrolled)}</span>, sort: ({ p }) => p.enrolled, csv: ({ p }) => p.enrolled },
    { key: "cpa", header: "Coût / inscr.", align: "right", render: ({ p }) => <span className="tabular">{cost(p.cpaCents)}</span>, sort: ({ p }) => p.cpaCents ?? Infinity, csv: ({ p }) => (p.cpaCents ?? 0) / 100, hideBelow: "md" },
    { key: "roas", header: "ROAS", align: "right", render: ({ p }) => <span className="tabular font-medium">{roasFmt(p.roas)}</span>, sort: ({ p }) => p.roas ?? -1, csv: ({ p }) => (p.roas ?? 0).toFixed(2) },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={({ c }) => c.id}
      searchable={({ c }) => `${c.name} ${c.utmCampaign} ${c.audience} ${c.externalId ?? ""}`}
      searchPlaceholder="Rechercher une campagne, une utm…"
      filters={[
        { key: "platform", label: "Régie", options: AD_PLATFORMS, predicate: ({ c }, v) => c.platform === v },
        { key: "status", label: "Statut", options: CAMPAIGN_STATUSES, predicate: ({ c }, v) => c.status === v },
        { key: "event", label: "Session", options: eventOptions, predicate: ({ c }, v) => c.eventId === v },
      ]}
      onRowClick={({ c }) => onOpen(c)}
      initialSort={{ key: "period", dir: "desc" }}
      exportName="campagnes-marketing"
      emptyTitle="Aucune campagne"
      emptyDescription="Créez une campagne ou lancez la synchro des régies."
    />
  );
}
