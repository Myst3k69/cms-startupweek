"use client";

import Link from "next/link";
import { CalendarClock, Eye, UserPlus } from "lucide-react";
import { Kanban } from "@/components/ui";
import { UserChip } from "@/components/shared/entity-links";
import { StatusSelect } from "@/components/shared/status-select";
import { CHANNELS, CONTENT_STATUSES, CONTENT_TYPES, labelOf, toneOf } from "@/lib/domain/constants";
import type { ContentItem, ContentStatus } from "@/lib/domain/types";
import { compactNumber, date } from "@/lib/format";
import { CHANNEL_COLOR, CONTENT_PIPELINE, contentDate } from "../lib/content";

const PIPELINE_OPTIONS = CONTENT_STATUSES.filter((o) => CONTENT_PIPELINE.includes(o.value));

/** Kanban éditorial : idée → rédaction → relecture → planifié → publié. */
export function ContentPipeline({
  items,
  editable,
  onMove,
}: {
  items: ContentItem[];
  editable: boolean;
  onMove: (item: ContentItem, to: ContentStatus) => void;
}) {
  const active = items.filter((i) => i.status !== "archive");
  return (
    <Kanban
      columns={CONTENT_PIPELINE.map((s) => ({ id: s, title: labelOf(CONTENT_STATUSES, s), tone: toneOf(CONTENT_STATUSES, s) }))}
      items={active}
      getId={(i) => i.id}
      getColumn={(i) => i.status}
      onMove={onMove}
      readOnly={!editable}
      renderCard={(it) => {
        const when = contentDate(it);
        return (
          <article className="rounded-md border border-border bg-surface p-3 shadow-sm transition-colors hover:border-border-strong">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-2 shrink-0 rounded-full" style={{ background: CHANNEL_COLOR[it.channel] }} aria-hidden="true" />
              <span>{labelOf(CHANNELS, it.channel)}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{labelOf(CONTENT_TYPES, it.type)}</span>
            </div>
            <Link href={`/contenus/${it.id}`} className="line-clamp-2 text-sm font-medium text-foreground hover:text-accent-text hover:underline" draggable={false}>
              {it.title}
            </Link>
            <div className="mt-2 flex items-center justify-between gap-2">
              <UserChip id={it.authorId} />
              {it.status === "publie" ? (
                <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5" title="Vues">
                    <Eye className="size-3" aria-hidden="true" />
                    <span className="tabular">{compactNumber(it.metrics.views)}</span>
                  </span>
                  <span className="inline-flex items-center gap-0.5" title="Leads">
                    <UserPlus className="size-3" aria-hidden="true" />
                    <span className="tabular">{it.metrics.leads}</span>
                  </span>
                </span>
              ) : when ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CalendarClock className="size-3" aria-hidden="true" />
                  {date(when, "d MMM · HH:mm")}
                </span>
              ) : null}
            </div>
            {editable ? (
              <div className="mt-2 lg:hidden">
                <StatusSelect options={PIPELINE_OPTIONS} value={it.status} onChange={(v) => onMove(it, v)} className="w-full" label={`Statut de « ${it.title} »`} />
              </div>
            ) : null}
          </article>
        );
      }}
    />
  );
}
