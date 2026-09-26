"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/domain/constants";
import { Dot } from "./badge";

export interface KanbanColumn<S extends string> {
  id: S;
  title: string;
  tone?: Tone;
  /** Pied de colonne (ex : total €). */
  footer?: React.ReactNode;
}

/**
 * Kanban générique avec glisser-déposer natif (HTML5) + repli clavier/mobile
 * via `renderCard` (qui peut exposer un sélecteur de statut).
 */
export function Kanban<T, S extends string>({
  columns,
  items,
  getId,
  getColumn,
  onMove,
  renderCard,
  className,
  columnClassName,
  readOnly,
}: {
  columns: KanbanColumn<S>[];
  items: T[];
  getId: (item: T) => string;
  getColumn: (item: T) => S;
  onMove?: (item: T, to: S) => void;
  renderCard: (item: T) => React.ReactNode;
  className?: string;
  columnClassName?: string;
  readOnly?: boolean;
}) {
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<S | null>(null);
  const byCol = React.useMemo(() => {
    const m = new Map<S, T[]>();
    columns.forEach((c) => m.set(c.id, []));
    items.forEach((it) => m.get(getColumn(it))?.push(it));
    return m;
  }, [columns, items, getColumn]);

  return (
    <div className={cn("scrollbar-thin -mx-4 flex gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0", className)}>
      {columns.map((col) => {
        const list = byCol.get(col.id) ?? [];
        return (
          <section
            key={col.id}
            aria-label={col.title}
            onDragOver={(e) => {
              if (readOnly || !dragId) return;
              e.preventDefault();
              setOver(col.id);
            }}
            onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              const it = items.find((x) => getId(x) === dragId);
              if (it && getColumn(it) !== col.id) onMove?.(it, col.id);
              setDragId(null);
              setOver(null);
            }}
            className={cn(
              "flex w-[272px] shrink-0 flex-col rounded-lg border border-border bg-surface-2/50 transition-colors",
              over === col.id && "border-ring/50 bg-accent-soft",
              columnClassName,
            )}
          >
            <header className="flex items-center gap-2 px-3 py-2.5">
              <Dot tone={col.tone ?? "neutral"} />
              <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.title}</h3>
              <span className="tabular ml-auto rounded-full bg-surface px-1.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border">{list.length}</span>
            </header>
            <div className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
              {list.map((it) => {
                const id = getId(it);
                return (
                  <div
                    key={id}
                    draggable={!readOnly}
                    onDragStart={(e) => {
                      setDragId(id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOver(null);
                    }}
                    className={cn(!readOnly && "cursor-grab active:cursor-grabbing", dragId === id && "opacity-40")}
                  >
                    {renderCard(it)}
                  </div>
                );
              })}
            </div>
            {col.footer ? <footer className="border-t border-border px-3 py-2 text-xs text-muted-foreground">{col.footer}</footer> : null}
          </section>
        );
      })}
    </div>
  );
}
