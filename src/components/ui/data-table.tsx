"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input, Select } from "./form";
import { EmptyState } from "./misc";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  /** Valeur de tri (active le tri sur la colonne). */
  sort?: (row: T) => string | number;
  /** Valeur exportée en CSV (défaut : sort, sinon ignorée). */
  csv?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
  align?: "left" | "right" | "center";
  /** Masquée sous ce breakpoint. */
  hideBelow?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export interface FilterDef<T> {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  predicate: (row: T, value: string) => boolean;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchable?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: FilterDef<T>[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: React.ReactNode;
  /** Sélection multiple + actions groupées. */
  bulkActions?: (selected: T[], clear: () => void) => React.ReactNode;
  exportName?: string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  dense?: boolean;
  rowClassName?: (row: T) => string | undefined;
}

const HIDE: Record<string, string> = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell", xl: "hidden xl:table-cell", "2xl": "hidden 2xl:table-cell" };

function toCsv<T>(rows: T[], columns: Column<T>[]) {
  const cols = columns.filter((c) => c.csv || c.sort);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = cols.map((c) => esc(typeof c.header === "string" ? c.header : c.key)).join(";");
  const body = rows.map((r) => cols.map((c) => esc((c.csv ?? c.sort)!(r))).join(";"));
  return "﻿" + [head, ...body].join("\n");
}

/** Table de données : recherche, filtres, tri, pagination, sélection, export CSV — côté client. */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchable,
  searchPlaceholder = "Rechercher…",
  filters = [],
  pageSize = 25,
  onRowClick,
  emptyTitle = "Aucun résultat",
  emptyDescription,
  toolbar,
  bulkActions,
  exportName,
  initialSort,
  dense,
  rowClassName,
}: Props<T>) {
  const [q, setQ] = React.useState("");
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState(initialSort);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter(
      (r) => (!needle || !searchable || searchable(r).toLowerCase().includes(needle)) && filters.every((f) => !values[f.key] || f.predicate(r, values[f.key])),
    );
    const col = sort && columns.find((c) => c.key === sort.key);
    if (col?.sort) {
      const dir = sort!.dir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const va = col.sort!(a);
        const vb = col.sort!(b);
        return (typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "fr")) * dir;
      });
    }
    return out;
  }, [rows, q, values, filters, searchable, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const slice = filtered.slice((current - 1) * pageSize, current * pageSize);
  const selectedRows = React.useMemo(() => rows.filter((r) => selected.has(rowKey(r))), [rows, selected, rowKey]);
  const allOnPage = slice.length > 0 && slice.every((r) => selected.has(rowKey(r)));

  const toggleSort = (key: string) =>
    setSort((s) => (!s || s.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : undefined));

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered, columns)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasToolbar = searchable || filters.length > 0 || toolbar || exportName;

  return (
    <div className="space-y-3">
      {hasToolbar ? (
        <div className="flex flex-wrap items-center gap-2">
          {searchable ? (
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={searchPlaceholder} aria-label="Rechercher" className="pl-8" />
            </div>
          ) : null}
          {filters.map((f) => (
            <Select
              key={f.key}
              aria-label={f.label}
              value={values[f.key] ?? ""}
              onChange={(e) => { setValues({ ...values, [f.key]: e.target.value }); setPage(1); }}
              placeholder={f.label}
              options={f.options}
              className="w-[calc(50%-4px)] sm:w-auto sm:min-w-40"
            />
          ))}
          <div className="ml-auto flex items-center gap-2">
            {toolbar}
            {exportName ? (
              <Button variant="secondary" size="sm" onClick={exportCsv} title="Exporter en CSV">
                <Download /> <span className="hidden sm:inline">CSV</span>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {bulkActions && selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-ring/30 bg-accent-soft px-3 py-2 text-sm">
          <span className="font-medium text-foreground">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>
          <div className="flex flex-wrap gap-2">{bulkActions(selectedRows, () => setSelected(new Set()))}</div>
          <Button variant="ghost" size="xs" className="ml-auto" onClick={() => setSelected(new Set())}>Désélectionner</Button>
        </div>
      ) : null}

      {slice.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/60">
                {bulkActions ? (
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="Tout sélectionner"
                      checked={allOnPage}
                      onChange={() => {
                        const next = new Set(selected);
                        slice.forEach((r) => (allOnPage ? next.delete(rowKey(r)) : next.add(rowKey(r))));
                        setSelected(next);
                      }}
                      className="size-4 accent-[var(--sw-teal)]"
                    />
                  </th>
                ) : null}
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.hideBelow && HIDE[c.hideBelow],
                      c.headerClassName,
                    )}
                    aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {c.sort ? (
                      <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
                        {c.header}
                        {sort?.key === c.key ? sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-40" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((r) => {
                const k = rowKey(r);
                return (
                  <tr
                    key={k}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors",
                      onRowClick && "cursor-pointer hover:bg-surface-2/70",
                      selected.has(k) && "bg-accent-soft",
                      rowClassName?.(r),
                    )}
                  >
                    {bulkActions ? (
                      <td className="px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label="Sélectionner la ligne"
                          checked={selected.has(k)}
                          onChange={() => {
                            const next = new Set(selected);
                            if (next.has(k)) next.delete(k);
                            else next.add(k);
                            setSelected(next);
                          }}
                          className="size-4 accent-[var(--sw-teal)]"
                        />
                      </td>
                    ) : null}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-3 align-middle text-foreground",
                          dense ? "py-1.5" : "py-2.5",
                          c.align === "right" && "text-right tabular",
                          c.align === "center" && "text-center",
                          c.hideBelow && HIDE[c.hideBelow],
                          c.className,
                        )}
                      >
                        {c.render(r)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="tabular">
          {filtered.length} élément{filtered.length > 1 ? "s" : ""}
          {filtered.length !== rows.length ? ` sur ${rows.length}` : ""}
        </span>
        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <Button size="xs" variant="secondary" disabled={current <= 1} onClick={() => setPage(current - 1)}>Précédent</Button>
            <span className="tabular">{current} / {totalPages}</span>
            <Button size="xs" variant="secondary" disabled={current >= totalPages} onClick={() => setPage(current + 1)}>Suivant</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
