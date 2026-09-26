"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DataTable, StatusBadge, type Column, type FilterDef } from "@/components/ui";
import { UserChip } from "@/components/shared/entity-links";
import { CHANNELS, CONTENT_STATUSES, CONTENT_TYPES, labelOf } from "@/lib/domain/constants";
import type { ContentItem, User } from "@/lib/domain/types";
import { date, number } from "@/lib/format";
import { CHANNEL_COLOR, contentDate } from "../lib/content";

export function ContentList({ items, users }: { items: ContentItem[]; users: Map<string, User> }) {
  const router = useRouter();

  const columns = React.useMemo<Column<ContentItem>[]>(
    () => [
      {
        key: "title",
        header: "Titre",
        sort: (r) => r.title,
        render: (r) => (
          <div className="min-w-0 max-w-[22rem]">
            <p className="truncate font-medium text-foreground">{r.title}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">/{r.slug}</p>
          </div>
        ),
      },
      { key: "type", header: "Type", sort: (r) => labelOf(CONTENT_TYPES, r.type), render: (r) => <span className="text-muted-foreground">{labelOf(CONTENT_TYPES, r.type)}</span>, hideBelow: "md" },
      {
        key: "channel",
        header: "Canal",
        sort: (r) => labelOf(CHANNELS, r.channel),
        render: (r) => (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: CHANNEL_COLOR[r.channel] }} aria-hidden="true" />
            {labelOf(CHANNELS, r.channel)}
          </span>
        ),
      },
      { key: "status", header: "Statut", sort: (r) => r.status, csv: (r) => labelOf(CONTENT_STATUSES, r.status), render: (r) => <StatusBadge options={CONTENT_STATUSES} value={r.status} /> },
      { key: "author", header: "Auteur", sort: (r) => users.get(r.authorId ?? "")?.name ?? "", render: (r) => <UserChip id={r.authorId} />, hideBelow: "lg" },
      {
        key: "date",
        header: "Date",
        sort: (r) => contentDate(r) ?? r.updatedAt,
        csv: (r) => contentDate(r) ?? "",
        render: (r) => <span className="tabular whitespace-nowrap text-muted-foreground">{date(contentDate(r))}</span>,
      },
      { key: "views", header: "Vues", align: "right", sort: (r) => r.metrics.views, render: (r) => number(r.metrics.views) },
      { key: "clicks", header: "Clics", align: "right", sort: (r) => r.metrics.clicks, render: (r) => number(r.metrics.clicks), hideBelow: "md" },
      { key: "leads", header: "Leads", align: "right", sort: (r) => r.metrics.leads, render: (r) => <span className="font-medium">{number(r.metrics.leads)}</span> },
    ],
    [users],
  );

  const filters = React.useMemo<FilterDef<ContentItem>[]>(
    () => [{ key: "status", label: "Tous les statuts", options: CONTENT_STATUSES, predicate: (r, v) => r.status === v }],
    [],
  );

  return (
    <DataTable
      rows={items}
      columns={columns}
      rowKey={(r) => r.id}
      searchable={(r) => `${r.title} ${r.slug} ${r.tags.join(" ")} ${r.excerpt}`}
      searchPlaceholder="Rechercher un titre, un tag…"
      filters={filters}
      onRowClick={(r) => router.push(`/contenus/${r.id}`)}
      exportName="contenus"
      initialSort={{ key: "date", dir: "desc" }}
      emptyTitle="Aucun contenu"
      emptyDescription="Modifiez les filtres ou créez un nouveau contenu."
    />
  );
}
