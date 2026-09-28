"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge, DataTable, type Column, type FilterDef } from "@/components/ui";
import { useNow } from "@/lib/hooks";
import { useCrm } from "@/lib/store";
import type { Activity } from "@/lib/domain/types";
import { dateTime, number, relative } from "@/lib/format";
import { ACTIVITY_KIND_LABEL, ENTITY_LABEL, entityHref } from "../lib/labels";

const DAY = 86_400_000;

/** Journal des exécutions : activités sans auteur humain (automatisations, intake, webhooks, triggers). */
export function JournalTab() {
  const activities = useCrm((s) => s.activities);
  const now = useNow();
  const rows = React.useMemo(() => activities.filter((a) => !a.actorId), [activities]);
  const last7 = React.useMemo(() => rows.filter((a) => now - new Date(a.at).getTime() < 7 * DAY).length, [rows, now]);

  const columns = React.useMemo<Column<Activity>[]>(
    () => [
      {
        key: "at",
        header: "Date",
        sort: (a) => a.at,
        render: (a) => (
          <span className="whitespace-nowrap">
            <span className="block text-foreground">{relative(a.at, now)}</span>
            <span className="block text-[11px] text-muted-foreground">{dateTime(a.at)}</span>
          </span>
        ),
      },
      { key: "kind", header: "Type", sort: (a) => a.kind, csv: (a) => ACTIVITY_KIND_LABEL[a.kind], render: (a) => <Badge tone={a.kind === "systeme" ? "accent" : a.kind === "email" ? "info" : a.kind === "paiement" ? "success" : "neutral"}>{ACTIVITY_KIND_LABEL[a.kind]}</Badge>, hideBelow: "sm" },
      {
        key: "entity",
        header: "Objet",
        sort: (a) => ENTITY_LABEL[a.entity],
        csv: (a) => ENTITY_LABEL[a.entity],
        render: (a) => {
          const href = entityHref(a.entity, a.entityId);
          return href ? (
            <Link href={href} className="whitespace-nowrap text-foreground underline-offset-2 hover:text-accent-text hover:underline" onClick={(e) => e.stopPropagation()}>
              {ENTITY_LABEL[a.entity]}
            </Link>
          ) : (
            <span className="whitespace-nowrap">{ENTITY_LABEL[a.entity]}</span>
          );
        },
      },
      { key: "summary", header: "Résumé", sort: (a) => a.summary, render: (a) => <span className="line-clamp-2 min-w-48 text-foreground">{a.summary}</span> },
    ],
    [now],
  );

  const filters = React.useMemo<FilterDef<Activity>[]>(() => {
    const entities = Array.from(new Set(rows.map((r) => r.entity)));
    const kinds = Array.from(new Set(rows.map((r) => r.kind)));
    return [
      { key: "entity", label: "Tous les objets", options: entities.map((e) => ({ value: e, label: ENTITY_LABEL[e] })), predicate: (a, v) => a.entity === v },
      { key: "kind", label: "Tous les types", options: kinds.map((k) => ({ value: k, label: ACTIVITY_KIND_LABEL[k] })), predicate: (a, v) => a.kind === v },
    ];
  }, [rows]);

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="size-4 text-accent-text" aria-hidden="true" />
        <span>
          <span className="tabular font-medium text-foreground">{number(last7)}</span> exécution{last7 > 1 ? "s" : ""} automatique{last7 > 1 ? "s" : ""} sur 7 jours · formulaires, webhook Stripe, triggers et règles — sans intervention humaine.
        </span>
      </p>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(a) => a.id}
        searchable={(a) => a.summary}
        searchPlaceholder="Rechercher dans le journal…"
        filters={filters}
        exportName="journal-automatisations"
        initialSort={{ key: "at", dir: "desc" }}
        pageSize={30}
        dense
        emptyTitle="Aucune exécution journalisée"
        emptyDescription="Les actions des automatisations apparaîtront ici (accusés de réception, relances, paiements…)."
      />
    </div>
  );
}
