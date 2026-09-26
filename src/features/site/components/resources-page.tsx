"use client";

import * as React from "react";
import { CalendarDays, Download, LayoutGrid, Library, Link2, Plus, Rows3, Search, ShieldCheck, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  Segmented,
  Select,
  StatCard,
  StatusBadge,
  type Column,
} from "@/components/ui";
import { useCollection, useNow, useSession } from "@/lib/hooks";
import { RESOURCE_CATEGORIES, RESOURCE_FORMATS, VISIBILITIES, labelOf } from "@/lib/domain/constants";
import type { Resource } from "@/lib/domain/types";
import { compactNumber, number, relative } from "@/lib/format";
import { cn, truncate } from "@/lib/utils";
import { FALLBACK_ICON, FORMAT_ICON, fileSize, urlKind } from "../lib/resource";
import { ResourceDrawer } from "./resource-drawer";

type Layout = "grille" | "liste";

function QualiopiBadges({ codes, max = 3 }: { codes: number[]; max?: number }) {
  if (!codes.length) return null;
  const shown = codes.slice(0, max);
  return (
    <span className="inline-flex flex-wrap items-center gap-1" aria-label={`Preuve Qualiopi : indicateurs ${codes.join(", ")}`}>
      <ShieldCheck className="size-3.5 text-violet" aria-hidden="true" />
      {shown.map((c) => (
        <Badge key={c} tone="violet" className="px-1.5">
          Ind. {c}
        </Badge>
      ))}
      {codes.length > max ? <span className="text-[11px] text-muted-foreground">+{codes.length - max}</span> : null}
    </span>
  );
}

function FormatTile({ r }: { r: Resource }) {
  const Icon = FORMAT_ICON[r.format] ?? FALLBACK_ICON;
  return (
    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

export function ResourcesPage() {
  const resources = useCollection("resources");
  const events = useCollection("events");
  const now = useNow();
  const { canEdit } = useSession();
  const editable = canEdit("ressources");

  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [format, setFormat] = React.useState("");
  const [visibility, setVisibility] = React.useState("");
  const [eventId, setEventId] = React.useState("");
  const [layout, setLayout] = React.useState<Layout>("grille");
  const [open, setOpen] = React.useState<string | null>(null); // id | "new"

  const eventById = React.useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const eventOptions = React.useMemo(
    () => [...events].sort((a, b) => b.startAt.localeCompare(a.startAt)).filter((e) => resources.some((r) => r.eventIds.includes(e.id))).map((e) => ({ value: e.id, label: `${e.code} · ${e.city}` })),
    [events, resources],
  );

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return resources
      .filter(
        (r) =>
          (!needle || `${r.title} ${r.description}`.toLowerCase().includes(needle)) &&
          (!category || r.category === category) &&
          (!format || r.format === format) &&
          (!visibility || r.visibility === visibility) &&
          (!eventId || r.eventIds.includes(eventId)),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [resources, q, category, format, visibility, eventId]);

  const stats = React.useMemo(() => {
    const downloads = resources.reduce((s, r) => s + r.downloads, 0);
    const top = [...resources].sort((a, b) => b.downloads - a.downloads)[0];
    const proofs = resources.filter((r) => r.indicatorCodes.length > 0);
    const covered = Array.from(new Set(proofs.flatMap((r) => r.indicatorCodes))).sort((a, b) => a - b);
    const airtable = resources.filter((r) => urlKind(r.url) === "airtable").length;
    const stable = resources.filter((r) => urlKind(r.url) === "stable").length;
    const byVis = Object.fromEntries(VISIBILITIES.map((v) => [v.value, resources.filter((r) => r.visibility === v.value).length])) as Record<string, number>;
    return { downloads, top, proofs: proofs.length, covered, airtable, stable, byVis };
  }, [resources]);

  const selected = open && open !== "new" ? resources.find((r) => r.id === open) : undefined;
  const hasFilters = Boolean(q || category || format || visibility || eventId);
  const reset = () => {
    setQ("");
    setCategory("");
    setFormat("");
    setVisibility("");
    setEventId("");
  };

  const columns = React.useMemo<Column<Resource>[]>(
    () => [
      {
        key: "title",
        header: "Ressource",
        sort: (r) => r.title,
        render: (r) => (
          <div className="flex min-w-0 max-w-[26rem] items-center gap-3">
            <FormatTile r={r} />
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{r.title}</p>
              <p className="truncate text-xs text-muted-foreground">{truncate(r.description, 90)}</p>
            </div>
          </div>
        ),
      },
      { key: "category", header: "Catégorie", sort: (r) => labelOf(RESOURCE_CATEGORIES, r.category), render: (r) => labelOf(RESOURCE_CATEGORIES, r.category), hideBelow: "lg" },
      { key: "format", header: "Format", sort: (r) => r.format, render: (r) => <span className="text-muted-foreground">{labelOf(RESOURCE_FORMATS, r.format)}</span>, hideBelow: "md" },
      { key: "visibility", header: "Visibilité", sort: (r) => r.visibility, csv: (r) => labelOf(VISIBILITIES, r.visibility), render: (r) => <StatusBadge options={VISIBILITIES} value={r.visibility} /> },
      { key: "qualiopi", header: "Qualiopi", csv: (r) => r.indicatorCodes.join(" "), render: (r) => <QualiopiBadges codes={r.indicatorCodes} max={2} />, hideBelow: "md" },
      { key: "sessions", header: "Sessions", align: "right", sort: (r) => r.eventIds.length, render: (r) => r.eventIds.length || "—", hideBelow: "lg" },
      { key: "version", header: "Version", sort: (r) => r.version, render: (r) => <span className="font-mono text-xs">v{r.version}</span> },
      { key: "downloads", header: "Téléch.", align: "right", sort: (r) => r.downloads, render: (r) => number(r.downloads) },
    ],
    [],
  );

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Programmes"
        title="Ressources"
        description="Bibliothèque des kits, templates et supports remis aux participants — et preuves Qualiopi associées."
        actions={
          editable ? (
            <Button onClick={() => setOpen("new")}>
              <Plus /> Ajouter une ressource
            </Button>
          ) : null
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ressources" value={number(resources.length)} hint={`${stats.byVis.public ?? 0} publiques · ${stats.byVis.participants ?? 0} participants · ${stats.byVis.premium ?? 0} premium`} icon={Library} />
        <StatCard label="Téléchargements" value={compactNumber(stats.downloads)} hint={stats.top ? `Top : ${truncate(stats.top.title, 34)}` : undefined} icon={Download} />
        <StatCard
          label="Preuves Qualiopi"
          value={number(stats.proofs)}
          hint={stats.covered.length ? `Indicateurs couverts : ${stats.covered.slice(0, 8).join(", ")}${stats.covered.length > 8 ? "…" : ""}` : "Aucun indicateur rattaché"}
          icon={ShieldCheck}
        />
        <StatCard
          label="URLs stables"
          value={`${stats.stable}/${resources.length}`}
          hint={stats.airtable ? `${stats.airtable} URL${stats.airtable > 1 ? "s" : ""} Airtable à migrer` : "Aucune URL Airtable expirante"}
          icon={Link2}
        />
      </div>

      <Card className="mb-6 border-info/30 bg-info-soft/40 p-4">
        <div className="flex items-start gap-3">
          <Link2 className="mt-0.5 size-4 shrink-0 text-info-text" aria-hidden="true" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">Fin des URLs Airtable qui expirent</p>
            <p className="text-muted-foreground">
              Les fichiers sont désormais stockés dans Supabase Storage (bucket « ressources ») avec une URL stable et versionnée — les workflows n8n « Ressources copy » et « add ressources for event(s) » ne sont plus nécessaires.
              Publication automatique sur startupweek.tech selon la visibilité : <strong className="font-medium text-foreground">Public</strong> → page Ressources du site,{" "}
              <strong className="font-medium text-foreground">Participants</strong> → espace des sessions liées, <strong className="font-medium text-foreground">Premium</strong> → offres Signature / Residency / Iteration Lab,{" "}
              <strong className="font-medium text-foreground">Interne</strong> → jamais publiée.
            </p>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une ressource…" aria-label="Rechercher une ressource" className="pl-8" />
        </div>
        <Select aria-label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Catégorie" options={RESOURCE_CATEGORIES} className="w-[calc(50%-4px)] sm:w-40" />
        <Select aria-label="Format" value={format} onChange={(e) => setFormat(e.target.value)} placeholder="Format" options={RESOURCE_FORMATS} className="w-[calc(50%-4px)] sm:w-32" />
        <Select aria-label="Visibilité" value={visibility} onChange={(e) => setVisibility(e.target.value)} placeholder="Visibilité" options={VISIBILITIES} className="w-[calc(50%-4px)] sm:w-36" />
        <Select aria-label="Session" value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="Session" options={eventOptions} className="w-[calc(50%-4px)] sm:w-44" />
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X /> Effacer
          </Button>
        ) : null}
        <Segmented<Layout>
          className="ml-auto"
          value={layout}
          onChange={setLayout}
          options={[
            { value: "grille", label: (<><LayoutGrid className="size-3.5" aria-hidden="true" /><span className="sr-only sm:not-sr-only">Grille</span></>) },
            { value: "liste", label: (<><Rows3 className="size-3.5" aria-hidden="true" /><span className="sr-only sm:not-sr-only">Liste</span></>) },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Library}
          title={resources.length ? "Aucune ressource ne correspond" : "Bibliothèque vide"}
          description={resources.length ? "Modifiez la recherche ou les filtres." : "Ajoutez vos kits, templates et supports de session."}
          action={
            resources.length ? (
              <Button variant="secondary" size="sm" onClick={reset}>
                Effacer les filtres
              </Button>
            ) : editable ? (
              <Button size="sm" onClick={() => setOpen("new")}>
                <Plus /> Ajouter une ressource
              </Button>
            ) : undefined
          }
        />
      ) : layout === "grille" ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const kind = urlKind(r.url);
            const linked = r.eventIds.map((id) => eventById.get(id)).filter(Boolean);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpen(r.id)}
                  className="flex h-full w-full flex-col rounded-lg border border-border bg-surface p-4 text-left shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <FormatTile r={r} />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-foreground">{r.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {labelOf(RESOURCE_FORMATS, r.format)} · v{r.version} · {fileSize(r.sizeKb)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{r.description || "Pas de description."}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <StatusBadge options={VISIBILITIES} value={r.visibility} />
                    <Badge>{labelOf(RESOURCE_CATEGORIES, r.category)}</Badge>
                    {kind === "airtable" ? (
                      <Badge tone="danger" dot>
                        URL à migrer
                      </Badge>
                    ) : null}
                  </div>
                  {r.indicatorCodes.length ? (
                    <div className="mt-2">
                      <QualiopiBadges codes={r.indicatorCodes} />
                    </div>
                  ) : null}
                  <div className="min-h-3 flex-1" aria-hidden="true" />
                  <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Download className="size-3.5" aria-hidden="true" />
                      <span className="tabular">{number(r.downloads)}</span>
                    </span>
                    <span className={cn("inline-flex min-w-0 items-center gap-1", !linked.length && "text-faint")}>
                      <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{linked.length ? linked.map((e) => e!.code).slice(0, 2).join(", ") + (linked.length > 2 ? ` +${linked.length - 2}` : "") : "Aucune session"}</span>
                    </span>
                    <span className="shrink-0">{relative(r.updatedAt, now)}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <DataTable rows={filtered} columns={columns} rowKey={(r) => r.id} onRowClick={(r) => setOpen(r.id)} exportName="ressources" initialSort={{ key: "downloads", dir: "desc" }} />
      )}

      {open ? <ResourceDrawer key={open} resource={selected} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
