"use client";

import * as React from "react";
import { ArrowRight, CalendarClock, Gauge, KanbanSquare, List, Plus, Scale, Timer, Trophy, TrendingUp, X } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useNow, useSession } from "@/lib/hooks";
import { DEAL_STAGE_PROBABILITY, DEAL_STAGES, DEAL_TYPES, labelOf } from "@/lib/domain/constants";
import type { Deal, DealStage } from "@/lib/domain/types";
import { date, money, moneyCompact, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataTable, FormField, Kanban, Modal, PageHeader, Segmented, Select, StatCard, StatusBadge, Textarea, useToast, type Column, type KanbanColumn } from "@/components/ui";
import { ColumnChart } from "@/components/charts";
import { OrgLink, UserChip } from "@/components/shared/entity-links";
import { StatusSelect } from "@/components/shared/status-select";
import { useUserOptions } from "../shared/hooks";
import { DAY, quarterStart } from "../../lib/format";
import { DealDrawer } from "./deal-drawer";
import { DealFormModal } from "./deal-form-modal";

const OPEN_STAGES: DealStage[] = ["nouveau", "qualification", "rdv", "proposition", "negociation"];
const isOpen = (d: Deal) => OPEN_STAGES.includes(d.stage);
const weightedOf = (d: Deal) => Math.round((d.amountCents * d.probability) / 100);
const LOST_REASONS = ["Budget insuffisant", "Calendrier / timing", "Choix d'un concurrent", "Pas de réponse", "Projet abandonné", "Hors cible"];

export interface PipelineFilters {
  deal?: string;
  vue?: string;
  type?: string;
  proprietaire?: string;
}

export function PipelinePage({ initial }: { initial: PipelineFilters }) {
  const deals = useCrm((s) => s.deals);
  const organizations = useCrm((s) => s.organizations);
  const users = useCrm((s) => s.users);
  const update = useCrm((s) => s.update);
  const now = useNow();
  const toast = useToast();
  const { canEdit, user } = useSession();
  const editable = canEdit("pipeline");
  const userOptions = useUserOptions();

  const [view, setView] = React.useState<"kanban" | "liste">(initial.vue === "liste" ? "liste" : "kanban");
  const [type, setType] = React.useState(initial.type ?? "");
  const [owner, setOwner] = React.useState(initial.proprietaire ?? "");
  const [openId, setOpenId] = React.useState<string | undefined>(initial.deal);
  const [creating, setCreating] = React.useState(false);
  const [lost, setLost] = React.useState<Deal | null>(null);

  const orgById = React.useMemo(() => new Map(organizations.map((o) => [o.id, o])), [organizations]);
  const userById = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const filtered = React.useMemo(
    () => deals.filter((d) => (!type || d.type === type) && (owner === "me" ? d.ownerId === user?.id : !owner || d.ownerId === owner)),
    [deals, type, owner, user?.id],
  );

  /** Kanban : affaires ouvertes + clôturées sur les 90 derniers jours. */
  const boardDeals = React.useMemo(
    () => filtered.filter((d) => isOpen(d) || (d.closedAt ? now - new Date(d.closedAt).getTime() < 90 * DAY : now - new Date(d.updatedAt).getTime() < 90 * DAY)),
    [filtered, now],
  );

  const stats = React.useMemo(() => {
    const open = filtered.filter(isOpen);
    const q0 = quarterStart(now);
    const wonQ = filtered.filter((d) => d.stage === "gagne" && d.closedAt && new Date(d.closedAt).getTime() >= q0);
    const yearAgo = now - 365 * DAY;
    const closed12 = filtered.filter((d) => (d.stage === "gagne" || d.stage === "perdu") && new Date(d.closedAt ?? d.updatedAt).getTime() >= yearAgo);
    const won12 = closed12.filter((d) => d.stage === "gagne");
    const cycles = filtered.filter((d) => d.stage === "gagne" && d.closedAt).map((d) => (new Date(d.closedAt!).getTime() - new Date(d.createdAt).getTime()) / DAY);
    return {
      openCount: open.length,
      total: open.reduce((s, d) => s + d.amountCents, 0),
      weighted: open.reduce((s, d) => s + weightedOf(d), 0),
      wonQ: wonQ.reduce((s, d) => s + d.amountCents, 0),
      wonQCount: wonQ.length,
      rate: closed12.length ? (won12.length / closed12.length) * 100 : 0,
      won12: won12.length,
      lost12: closed12.length - won12.length,
      cycle: cycles.length ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : 0,
      overdue: open.filter((d) => d.expectedCloseAt && new Date(d.expectedCloseAt).getTime() < now).length,
    };
  }, [filtered, now]);

  const forecast = React.useMemo(() => {
    const d = new Date(now);
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(d.getFullYear(), d.getMonth() + i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + i + 1, 1);
      return { label: start.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }).replace(".", ""), start: start.getTime(), end: end.getTime(), value: 0 };
    });
    let late = 0;
    let unplanned = 0;
    filtered.filter(isOpen).forEach((deal) => {
      if (!deal.expectedCloseAt) {
        unplanned += weightedOf(deal);
        return;
      }
      const t = new Date(deal.expectedCloseAt).getTime();
      if (t < buckets[0].start) {
        late += weightedOf(deal);
        buckets[0].value += weightedOf(deal);
        return;
      }
      const b = buckets.find((x) => t >= x.start && t < x.end);
      if (b) b.value += weightedOf(deal);
    });
    return { labels: buckets.map((b) => b.label), values: buckets.map((b) => b.value), late, unplanned };
  }, [filtered, now]);

  const columns = React.useMemo<KanbanColumn<DealStage>[]>(
    () =>
      DEAL_STAGES.map((s) => {
        const list = boardDeals.filter((d) => d.stage === s.value);
        const sum = list.reduce((a, d) => a + d.amountCents, 0);
        const w = list.reduce((a, d) => a + weightedOf(d), 0);
        return {
          id: s.value,
          title: s.label,
          tone: s.tone,
          footer: (
            <div className="flex items-center justify-between gap-2">
              <span className="tabular font-medium text-foreground">{money(sum)}</span>
              {s.value === "gagne" || s.value === "perdu" ? <span>90 derniers jours</span> : <span className="tabular">pondéré {money(w)}</span>}
            </div>
          ),
        };
      }),
    [boardDeals],
  );

  const moveTo = React.useCallback(
    (deal: Deal, to: DealStage, lostReason?: string) => {
      if (deal.stage === to) return;
      const closed = to === "gagne" || to === "perdu";
      update(
        "deals",
        deal.id,
        { stage: to, probability: DEAL_STAGE_PROBABILITY[to], closedAt: closed ? new Date().toISOString() : undefined, lostReason: to === "perdu" ? lostReason : undefined },
        { log: `Étape : ${labelOf(DEAL_STAGES, deal.stage)} → ${labelOf(DEAL_STAGES, to)}${lostReason ? ` (${lostReason})` : ""}`, kind: "statut" },
      );
      if (to === "gagne" && deal.orgId) {
        const org = useCrm.getState().organizations.find((o) => o.id === deal.orgId);
        if (org && org.status === "prospect") update("organizations", org.id, { status: "client" }, { log: `Devient client (opportunité gagnée : ${deal.title})`, kind: "statut" });
      }
      toast({
        title: to === "gagne" ? "Affaire gagnée" : to === "perdu" ? "Affaire perdue" : `Déplacée en « ${labelOf(DEAL_STAGES, to)} »`,
        description: `${deal.title} — probabilité ${DEAL_STAGE_PROBABILITY[to]} %`,
        tone: to === "perdu" ? "info" : "success",
      });
    },
    [update, toast],
  );

  const requestMove = React.useCallback(
    (deal: Deal, to: DealStage) => {
      if (to === "perdu") setLost(deal);
      else moveTo(deal, to);
    },
    [moveTo],
  );

  const listColumns = React.useMemo<Column<Deal>[]>(
    () => [
      {
        key: "title",
        header: "Opportunité",
        sort: (d) => d.title.toLowerCase(),
        csv: (d) => d.title,
        render: (d) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{d.title}</p>
            <p className="truncate text-xs text-muted-foreground">{d.orgId ? orgById.get(d.orgId)?.name : "—"}</p>
          </div>
        ),
      },
      { key: "type", header: "Type", hideBelow: "lg", sort: (d) => labelOf(DEAL_TYPES, d.type), render: (d) => <span className="text-xs text-muted-foreground">{labelOf(DEAL_TYPES, d.type)}</span> },
      { key: "stage", header: "Étape", sort: (d) => OPEN_STAGES.indexOf(d.stage) + (d.stage === "gagne" ? 10 : d.stage === "perdu" ? 11 : 0), csv: (d) => labelOf(DEAL_STAGES, d.stage), render: (d) => <StatusBadge options={DEAL_STAGES} value={d.stage} /> },
      { key: "amount", header: "Montant", align: "right", sort: (d) => d.amountCents, csv: (d) => (d.amountCents / 100).toFixed(2).replace(".", ","), render: (d) => money(d.amountCents) },
      { key: "proba", header: "Proba.", align: "right", hideBelow: "md", sort: (d) => d.probability, render: (d) => `${d.probability} %` },
      { key: "weighted", header: "Pondéré", align: "right", hideBelow: "md", sort: (d) => weightedOf(d), csv: (d) => (weightedOf(d) / 100).toFixed(2).replace(".", ","), render: (d) => <span className="text-muted-foreground">{money(weightedOf(d))}</span> },
      { key: "owner", header: "Propriétaire", hideBelow: "lg", sort: (d) => (d.ownerId ? userById.get(d.ownerId)?.name ?? "" : ""), render: (d) => <UserChip id={d.ownerId} /> },
      {
        key: "close",
        header: "Clôture",
        hideBelow: "sm",
        sort: (d) => d.closedAt ?? d.expectedCloseAt ?? "9999",
        csv: (d) => date(d.closedAt ?? d.expectedCloseAt, "yyyy-MM-dd"),
        render: (d) => {
          const late = isOpen(d) && d.expectedCloseAt && new Date(d.expectedCloseAt).getTime() < now;
          return <span className={cn("whitespace-nowrap text-xs", late ? "font-medium text-danger-text" : "text-muted-foreground")}>{d.closedAt ? date(d.closedAt) : d.expectedCloseAt ? `${date(d.expectedCloseAt)}${late ? " · dépassée" : ""}` : "—"}</span>;
        },
      },
    ],
    [orgById, userById, now],
  );

  const hasFilters = Boolean(type || owner);

  return (
    <div>
      <PageHeader
        eyebrow="Commercial"
        title="Pipeline des opportunités"
        description="Écoles (Startup Village), entreprises, partenariats, accompagnements et sponsoring — de la première prise de contact à la signature."
        actions={
          editable ? (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Nouvelle opportunité
            </Button>
          ) : null
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Pipeline ouvert" value={moneyCompact(stats.total)} icon={KanbanSquare} hint={`${stats.openCount} opportunité${stats.openCount > 1 ? "s" : ""} en cours`} />
        <StatCard label="Pipeline pondéré" value={moneyCompact(stats.weighted)} icon={Scale} hint="Montant × probabilité de l'étape" />
        <StatCard label="Gagné ce trimestre" value={moneyCompact(stats.wonQ)} icon={Trophy} hint={`${stats.wonQCount} affaire${stats.wonQCount > 1 ? "s" : ""} signée${stats.wonQCount > 1 ? "s" : ""}`} />
        <StatCard label="Taux de transformation" value={percent(stats.rate)} icon={Gauge} hint={`${stats.won12} gagnées / ${stats.lost12} perdues (12 mois)`} />
        <StatCard label="Cycle de vente moyen" value={stats.cycle ? `${stats.cycle} j` : "—"} icon={Timer} hint="De la création à la signature" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            {
              value: "kanban",
              label: (
                <>
                  <KanbanSquare className="size-3.5" aria-hidden="true" /> Kanban
                </>
              ),
            },
            {
              value: "liste",
              label: (
                <>
                  <List className="size-3.5" aria-hidden="true" /> Liste
                </>
              ),
            },
          ]}
        />
        <Select aria-label="Type d'opportunité" value={type} onChange={(e) => setType(e.target.value)} options={DEAL_TYPES} placeholder="Tous les types" className="w-[calc(50%-4px)] sm:w-44" />
        <Select aria-label="Propriétaire" value={owner} onChange={(e) => setOwner(e.target.value)} options={[{ value: "me", label: "Mes opportunités" }, ...userOptions]} placeholder="Toute l'équipe" className="w-[calc(50%-4px)] sm:w-44" />
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setType("");
              setOwner("");
            }}
          >
            <X /> Réinitialiser
          </Button>
        ) : null}
        {stats.overdue ? (
          <Badge tone="danger" dot className="sm:ml-auto">
            {stats.overdue} date{stats.overdue > 1 ? "s" : ""} de clôture dépassée{stats.overdue > 1 ? "s" : ""}
          </Badge>
        ) : null}
      </div>

      {view === "kanban" ? (
        <Kanban
          columns={columns}
          items={boardDeals}
          getId={(d) => d.id}
          getColumn={(d) => d.stage}
          onMove={requestMove}
          readOnly={!editable}
          renderCard={(d) => <DealCard deal={d} now={now} editable={editable} onOpen={() => setOpenId(d.id)} onStage={(to) => requestMove(d, to)} />}
        />
      ) : (
        <DataTable
          rows={filtered}
          columns={listColumns}
          rowKey={(d) => d.id}
          searchable={(d) => `${d.title} ${d.orgId ? orgById.get(d.orgId)?.name ?? "" : ""} ${d.nextStep ?? ""}`}
          searchPlaceholder="Opportunité, organisation…"
          filters={[{ key: "stage", label: "Toutes les étapes", options: DEAL_STAGES, predicate: (d, v) => d.stage === v }]}
          exportName="pipeline-startupweek"
          onRowClick={(d) => setOpenId(d.id)}
          initialSort={{ key: "close", dir: "asc" }}
          emptyTitle="Aucune opportunité"
        />
      )}

      <Card className="mt-6">
        <CardHeader>
          <div>
            <CardTitle className="inline-flex items-center gap-2">
              <TrendingUp className="size-4 text-faint" aria-hidden="true" /> Prévisionnel pondéré
            </CardTitle>
            <CardDescription>Montants pondérés des opportunités ouvertes, par mois de clôture prévue (6 prochains mois).</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {forecast.values.some((v) => v > 0) ? (
            <ColumnChart labels={forecast.labels} series={[{ name: "Pondéré", values: forecast.values }]} height={200} format={(v) => moneyCompact(v)} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune date de clôture prévue sur les 6 prochains mois.</p>
          )}
          {forecast.late || forecast.unplanned ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {forecast.late ? `Dont ${money(forecast.late)} en retard (reporté sur le mois en cours). ` : ""}
              {forecast.unplanned ? `${money(forecast.unplanned)} pondérés sans date de clôture prévue.` : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <DealDrawer id={openId} onClose={() => setOpenId(undefined)} />
      <DealFormModal open={creating} onClose={() => setCreating(false)} onCreated={(d) => setOpenId(d.id)} />
      <LostReasonModal
        deal={lost}
        onCancel={() => setLost(null)}
        onConfirm={(reason) => {
          if (lost) moveTo(lost, "perdu", reason);
          setLost(null);
        }}
      />
    </div>
  );
}

function DealCard({ deal, now, editable, onOpen, onStage }: { deal: Deal; now: number; editable: boolean; onOpen: () => void; onStage: (to: DealStage) => void }) {
  const overdue = isOpen(deal) && deal.expectedCloseAt && new Date(deal.expectedCloseAt).getTime() < now;
  return (
    <div onClick={onOpen} className="cursor-pointer rounded-md border border-border bg-surface p-3 shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className="line-clamp-2 text-left text-sm font-medium text-foreground hover:text-accent-text"
      >
        {deal.title}
      </button>
      {deal.orgId ? (
        <div className="mt-0.5 truncate text-xs">
          <OrgLink id={deal.orgId} className="text-muted-foreground" />
        </div>
      ) : null}
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="tabular text-sm font-semibold text-foreground">{money(deal.amountCents)}</span>
        <span className="tabular text-xs text-muted-foreground">{deal.probability} %</span>
      </div>
      {deal.nextStep && isOpen(deal) ? (
        <p className="mt-1.5 flex items-start gap-1 text-xs text-muted-foreground">
          <ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span className="line-clamp-2">{deal.nextStep}</span>
        </p>
      ) : null}
      {deal.stage === "perdu" && deal.lostReason ? <p className="mt-1.5 line-clamp-2 text-xs text-danger-text">{deal.lostReason}</p> : null}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2">
        <UserChip id={deal.ownerId} />
        <span className={cn("inline-flex items-center gap-1 text-[11px] tabular", overdue ? "font-medium text-danger-text" : "text-muted-foreground")} title={overdue ? "Date de clôture prévue dépassée" : "Clôture prévue"}>
          <CalendarClock className="size-3" aria-hidden="true" />
          {deal.closedAt ? date(deal.closedAt, "d MMM") : deal.expectedCloseAt ? date(deal.expectedCloseAt, "d MMM") : "—"}
          {overdue ? " · dépassée" : ""}
        </span>
      </div>
      {editable ? (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <StatusSelect options={DEAL_STAGES} value={deal.stage} onChange={onStage} label={`Étape de ${deal.title}`} className="w-full" />
        </div>
      ) : null}
    </div>
  );
}

function LostReasonModal({ deal, onCancel, onConfirm }: { deal: Deal | null; onCancel: () => void; onConfirm: (reason: string) => void }) {
  if (!deal) return null;
  return <LostReasonInner deal={deal} onCancel={onCancel} onConfirm={onConfirm} />;
}

function LostReasonInner({ deal, onCancel, onConfirm }: { deal: Deal; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState("");
  const confirm = () => {
    if (!reason.trim()) {
      setError("Indiquez une raison : elle alimente l'analyse des pertes.");
      return;
    }
    onConfirm(reason.trim());
  };
  return (
    <Modal
      open
      onClose={onCancel}
      title="Marquer comme perdue"
      description={deal.title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
          <Button variant="danger" onClick={confirm}>
            Confirmer la perte
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Raisons fréquentes">
          {LOST_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setReason(r);
                setError("");
              }}
              aria-pressed={reason === r}
              className={cn("rounded-full border px-2.5 py-1 text-xs transition-colors", reason === r ? "border-ring bg-accent-soft text-foreground" : "border-border text-muted-foreground hover:bg-surface-2")}
            >
              {r}
            </button>
          ))}
        </div>
        <FormField label="Raison de la perte" htmlFor="lost-reason" error={error}>
          <Textarea id="lost-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-20" placeholder="Précisez (budget voté l'an prochain, concurrent retenu…)" autoFocus />
        </FormField>
      </div>
    </Modal>
  );
}
