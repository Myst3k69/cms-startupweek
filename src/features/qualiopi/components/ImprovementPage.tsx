"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarClock, CheckCircle2, ClipboardList, Clock, Columns3, List, Plus, TrendingUp } from "lucide-react";
import { useActions, useCollection, useNow, useSession } from "@/lib/hooks";
import { ACTION_STATUSES, labelOf } from "@/lib/domain/constants";
import type { ActionStatus, ImprovementAction } from "@/lib/domain/types";
import { date } from "@/lib/format";
import { Badge, Button, DataTable, Kanban, PageHeader, Segmented, Select, StatCard, StatusBadge, useToast, type Column } from "@/components/ui";
import { StatusSelect } from "@/components/shared/status-select";
import { UserChip } from "@/components/shared/entity-links";
import { cn } from "@/lib/utils";
import { ACTION_ORIGINS } from "../labels";
import { DAY, fmt1, fmtPct, isActionLate, isActionOpen, mean } from "../metrics";
import { QualiopiNav } from "./qualiopi-nav";
import { ActionDrawer } from "./action-drawer";

const COLUMNS = ACTION_STATUSES.map((s) => ({ id: s.value, title: s.label, tone: s.tone }));

export function ImprovementPage() {
  const actions = useCollection("improvementActions");
  const users = useCollection("users");
  const now = useNow();
  const { update } = useActions();
  const { canEdit } = useSession();
  const toast = useToast();
  const readOnly = !canEdit("qualiopi");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const selectedId = searchParams.get("id");

  const [view, setView] = React.useState<"kanban" | "table">("kanban");
  const [origin, setOrigin] = React.useState("");
  const [owner, setOwner] = React.useState("");
  const [code, setCode] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const setSelected = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("id", id);
    else params.delete("id");
    const qs = params.toString();
    window.history.replaceState(null, "", `${pathname}${qs ? `?${qs}` : ""}`);
  };

  const filtered = React.useMemo(
    () =>
      actions
        .filter((a) => (!origin || a.origin === origin) && (!owner || a.ownerId === owner) && (!code || a.indicatorCodes.includes(Number(code))))
        .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999")),
    [actions, origin, owner, code],
  );

  const stats = React.useMemo(() => {
    const open = actions.filter(isActionOpen);
    const late = actions.filter((a) => isActionLate(a, now));
    const done = actions.filter((a) => a.status === "fait");
    const doneYear = done.filter((a) => a.doneAt && now - Date.parse(a.doneAt) <= 365 * DAY);
    const relevant = actions.filter((a) => a.status !== "abandonne");
    const leadTime = mean(done.filter((a) => a.doneAt).map((a) => (Date.parse(a.doneAt!) - Date.parse(a.createdAt)) / DAY));
    return { open: open.length, late: late.length, doneYear: doneYear.length, rate: relevant.length ? (done.length / relevant.length) * 100 : null, leadTime };
  }, [actions, now]);

  const move = (a: ImprovementAction, to: ActionStatus) => {
    update(
      "improvementActions",
      a.id,
      { status: to, doneAt: to === "fait" ? new Date().toISOString() : undefined },
      { log: `Action « ${a.title} » : ${labelOf(ACTION_STATUSES, a.status)} → ${labelOf(ACTION_STATUSES, to)}`, kind: "statut" },
    );
    toast({ title: `Action déplacée : ${labelOf(ACTION_STATUSES, to)}`, description: to === "fait" ? "Pensez à renseigner l'efficacité constatée." : undefined });
  };

  const tableColumns: Column<ImprovementAction>[] = [
    { key: "title", header: "Action", render: (a) => <span className="line-clamp-2 max-w-md font-medium">{a.title}</span>, sort: (a) => a.title },
    { key: "origin", header: "Origine", render: (a) => <StatusBadge options={ACTION_ORIGINS} value={a.origin} />, sort: (a) => a.origin, csv: (a) => labelOf(ACTION_ORIGINS, a.origin) },
    { key: "codes", header: "Indicateurs", render: (a) => <span className="tabular text-muted-foreground">{a.indicatorCodes.join(", ") || "—"}</span>, csv: (a) => a.indicatorCodes.join(" "), hideBelow: "md" },
    { key: "owner", header: "Responsable", render: (a) => <UserChip id={a.ownerId} />, csv: (a) => users.find((u) => u.id === a.ownerId)?.name ?? "", hideBelow: "sm" },
    {
      key: "due",
      header: "Échéance",
      render: (a) => <span className={cn("whitespace-nowrap", isActionLate(a, now) && "font-medium text-danger-text")}>{a.dueAt ? date(a.dueAt) : "—"}</span>,
      sort: (a) => (a.dueAt ? Date.parse(a.dueAt) : Infinity),
      csv: (a) => a.dueAt ?? "",
    },
    { key: "status", header: "Statut", render: (a) => <StatusBadge options={ACTION_STATUSES} value={a.status} />, sort: (a) => ACTION_STATUSES.findIndex((s) => s.value === a.status), csv: (a) => labelOf(ACTION_STATUSES, a.status) },
    { key: "impact", header: "Efficacité", render: (a) => <span className="line-clamp-1 max-w-56 text-xs text-muted-foreground">{a.impact ?? "—"}</span>, csv: (a) => a.impact ?? "", hideBelow: "lg" },
  ];

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Qualiopi · indicateur 32"
        title="Plan d'amélioration continue"
        description="Toutes les actions issues des réclamations, évaluations, de la veille, des audits blancs et des revues internes. Glissez les cartes pour changer leur statut ; une action close doit documenter son efficacité."
        breadcrumbs={[{ label: "Qualiopi", href: "/qualiopi" }, { label: "Amélioration continue" }]}
        actions={
          !readOnly ? (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Nouvelle action
            </Button>
          ) : null
        }
      />
      <QualiopiNav />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Actions ouvertes" value={stats.open} hint={`${actions.length} au plan`} icon={ClipboardList} />
        <StatCard label="En retard" value={stats.late} hint={stats.late ? "Échéance dépassée" : "Aucune action en retard"} icon={CalendarClock} />
        <StatCard label="Réalisées (12 mois)" value={stats.doneYear} hint={stats.leadTime !== null ? `Délai moyen de réalisation : ${fmt1(stats.leadTime)} j` : undefined} icon={CheckCircle2} />
        <StatCard label="Taux de réalisation" value={fmtPct(stats.rate)} hint="Hors actions abandonnées" icon={TrendingUp} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "kanban", label: <span className="inline-flex items-center gap-1.5"><Columns3 className="size-3.5" aria-hidden="true" />Kanban</span> },
            { value: "table", label: <span className="inline-flex items-center gap-1.5"><List className="size-3.5" aria-hidden="true" />Tableau</span> },
          ]}
        />
        <Select aria-label="Filtrer par origine" value={origin} onChange={(e) => setOrigin(e.target.value)} options={ACTION_ORIGINS} placeholder="Toutes origines" className="w-[calc(50%-4px)] sm:w-auto" />
        <Select aria-label="Filtrer par responsable" value={owner} onChange={(e) => setOwner(e.target.value)} options={users.map((u) => ({ value: u.id, label: u.name }))} placeholder="Tous les responsables" className="w-[calc(50%-4px)] sm:w-auto" />
        <Select
          aria-label="Filtrer par indicateur"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          options={Array.from({ length: 32 }, (_, i) => ({ value: String(i + 1), label: `Indicateur ${i + 1}` }))}
          placeholder="Tous les indicateurs"
          className="w-full sm:w-auto"
        />
        {origin || owner || code ? (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setOrigin("");
              setOwner("");
              setCode("");
            }}
          >
            Réinitialiser
          </button>
        ) : null}
      </div>

      {view === "kanban" ? (
        <Kanban
          columns={COLUMNS}
          items={filtered}
          getId={(a) => a.id}
          getColumn={(a) => a.status}
          onMove={move}
          readOnly={readOnly}
          renderCard={(a) => {
            const late = isActionLate(a, now);
            return (
              <article className={cn("rounded-md border bg-surface p-3 shadow-sm transition-colors hover:border-border-strong", late ? "border-danger/40" : "border-border")}>
                <button type="button" onClick={() => setSelected(a.id)} className="line-clamp-3 text-left text-sm font-medium text-foreground hover:text-accent-text">
                  {a.title}
                </button>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <StatusBadge options={ACTION_ORIGINS} value={a.origin} />
                  {a.indicatorCodes.slice(0, 4).map((c) => (
                    <Badge key={c} tone="neutral" className="tabular">
                      Ind. {c}
                    </Badge>
                  ))}
                  {a.indicatorCodes.length > 4 ? <span className="text-xs text-faint">+{a.indicatorCodes.length - 4}</span> : null}
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <UserChip id={a.ownerId} />
                  {a.status === "fait" && a.doneAt ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success-text">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" /> {date(a.doneAt)}
                    </span>
                  ) : a.dueAt ? (
                    <span className={cn("inline-flex items-center gap-1 text-xs", late ? "font-medium text-danger-text" : "text-muted-foreground")}>
                      <Clock className="size-3.5" aria-hidden="true" />
                      {late ? "En retard · " : ""}
                      {date(a.dueAt, "d MMM")}
                    </span>
                  ) : null}
                </div>
                {!readOnly ? (
                  <StatusSelect options={ACTION_STATUSES} value={a.status} onChange={(v) => move(a, v)} label={`Statut de l'action ${a.title}`} className="mt-2 w-full sm:hidden" />
                ) : null}
              </article>
            );
          }}
        />
      ) : (
        <DataTable
          rows={filtered}
          columns={tableColumns}
          rowKey={(a) => a.id}
          searchable={(a) => `${a.title} ${a.description}`}
          onRowClick={(a) => setSelected(a.id)}
          exportName="plan-amelioration-continue"
          emptyTitle="Aucune action"
          emptyDescription="Créez une action ou transformez une réclamation, un verbatim ou un élément de veille en action."
        />
      )}

      <ActionDrawer open={!!selectedId} actionId={selectedId} onClose={() => setSelected(null)} />
      <ActionDrawer open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
