"use client";

import * as React from "react";
import { Archive, Clock3, Inbox, Percent, Search, TimerReset, X } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useNow, useSession } from "@/lib/hooks";
import { SUBMISSION_STATUSES, SUBMISSION_TYPES, labelOf } from "@/lib/domain/constants";
import { slaState } from "@/lib/domain/selectors";
import type { Submission, SubmissionStatus, SubmissionType } from "@/lib/domain/types";
import { relative, percent, dateTime } from "@/lib/format";
import { cn, truncate } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Input, PageHeader, Segmented, Select, StatCard, StatusBadge, useToast } from "@/components/ui";
import { UserChip } from "@/components/shared/entity-links";
import { useUserOptions } from "../shared/hooks";
import { DAY, durationLong, normText, slaBadge } from "../../lib/format";
import { SubmissionDrawer } from "./submission-drawer";

export interface DemandesFilters {
  type?: string;
  statut?: string;
  assigne?: string;
  sla?: string;
  id?: string;
}

type StatusFilter = "ouvertes" | "toutes" | SubmissionStatus;
type SlaFilter = "" | "depasse" | "bientot";
const OPEN: SubmissionStatus[] = ["nouvelle", "en_cours", "qualifiee"];

const TYPE_VALUES = SUBMISSION_TYPES.map((o) => o.value);
const STATUS_VALUES = SUBMISSION_STATUSES.map((o) => o.value);

export function DemandesPage({ initial }: { initial: DemandesFilters }) {
  const submissions = useCrm((s) => s.submissions);
  const settings = useCrm((s) => s.settings);
  const update = useCrm((s) => s.update);
  const users = useCrm((s) => s.users);
  const now = useNow();
  const { canEdit, user } = useSession();
  const editable = canEdit("demandes");
  const toast = useToast();
  const userOptions = useUserOptions();

  const [type, setType] = React.useState<"all" | SubmissionType>(TYPE_VALUES.includes(initial.type as SubmissionType) ? (initial.type as SubmissionType) : "all");
  const [status, setStatus] = React.useState<StatusFilter>(
    initial.statut === "toutes" || STATUS_VALUES.includes(initial.statut as SubmissionStatus) ? (initial.statut as StatusFilter) : "ouvertes",
  );
  const [assignee, setAssignee] = React.useState<string>(initial.assigne ?? "");
  const [sla, setSla] = React.useState<SlaFilter>(initial.sla === "depasse" || initial.sla === "bientot" ? initial.sla : "");
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [openId, setOpenId] = React.useState<string | undefined>(initial.id);

  const sorted = React.useMemo(() => [...submissions].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)), [submissions]);

  /** Filtres hors type (les compteurs du Segmented en dépendent). */
  const baseFiltered = React.useMemo(() => {
    const needle = normText(q);
    return sorted.filter((s) => {
      if (status === "ouvertes" ? !OPEN.includes(s.status) : status !== "toutes" && s.status !== status) return false;
      if (assignee === "me" ? s.assigneeId !== user?.id : assignee === "none" ? Boolean(s.assigneeId) : assignee && s.assigneeId !== assignee) return false;
      if (sla && slaState(s, now) !== sla) return false;
      if (needle && !normText(`${s.name} ${s.email} ${s.company ?? ""} ${s.subject ?? ""} ${s.message ?? ""}`).includes(needle)) return false;
      return true;
    });
  }, [sorted, status, assignee, sla, q, now, user?.id]);

  const rows = React.useMemo(() => (type === "all" ? baseFiltered : baseFiltered.filter((s) => s.type === type)), [baseFiltered, type]);

  const typeCounts = React.useMemo(() => {
    const m = new Map<string, number>();
    baseFiltered.forEach((s) => m.set(s.type, (m.get(s.type) ?? 0) + 1));
    return m;
  }, [baseFiltered]);

  const stats = React.useMemo(() => {
    const fresh = submissions.filter((s) => s.status === "nouvelle");
    const last24 = submissions.filter((s) => now - new Date(s.receivedAt).getTime() < DAY).length;
    const late = submissions.filter((s) => slaState(s, now) === "depasse").length;
    const soon = submissions.filter((s) => slaState(s, now) === "bientot").length;
    const recent = submissions.filter((s) => now - new Date(s.receivedAt).getTime() < 30 * DAY && s.status !== "spam");
    const converted = recent.filter((s) => s.status === "convertie" || Boolean(s.dealId) || Boolean(s.applicationId)).length;
    const answered = recent.filter((s) => s.answeredAt);
    const avg = answered.length ? answered.reduce((a, s) => a + (new Date(s.answeredAt!).getTime() - new Date(s.receivedAt).getTime()), 0) / answered.length : NaN;
    const withinSla = answered.filter((s) => new Date(s.answeredAt!).getTime() - new Date(s.receivedAt).getTime() <= settings.slaHours * 3_600_000).length;
    return { fresh: fresh.length, last24, late, soon, recent: recent.length, converted, avg, answered: answered.length, withinSla };
  }, [submissions, now, settings.slaHours]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const selectedRows = rows.filter((r) => selected.has(r.id));

  const bulkAssign = (assigneeId: string) => {
    if (!selectedRows.length) return;
    const u = users.find((x) => x.id === assigneeId);
    selectedRows.forEach((s) => update("submissions", s.id, { assigneeId: assigneeId || undefined }, { log: u ? `Assignée à ${u.name}` : "Désassignée" }));
    toast({ title: `${selectedRows.length} demande${selectedRows.length > 1 ? "s" : ""} ${u ? `assignée${selectedRows.length > 1 ? "s" : ""} à ${u.name}` : "désassignée(s)"}` });
    setSelected(new Set());
  };
  const bulkArchive = () => {
    selectedRows.forEach((s) => update("submissions", s.id, { status: "archivee" }, { log: "Archivée (action groupée)", kind: "statut" }));
    toast({ title: `${selectedRows.length} demande${selectedRows.length > 1 ? "s" : ""} archivée${selectedRows.length > 1 ? "s" : ""}` });
    setSelected(new Set());
  };

  const hasFilters = type !== "all" || status !== "ouvertes" || assignee || sla || q;
  const resetFilters = () => {
    setType("all");
    setStatus("ouvertes");
    setAssignee("");
    setSla("");
    setQ("");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Commercial"
        title="Demandes entrantes"
        description="Les 8 formulaires du site dans une seule boîte : candidature, contact, entreprise, accompagnement, partenariat, Digital Starter Kit, réclamation, newsletter. Engagement : réponse sous 48 h."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Nouvelles demandes" value={stats.fresh} icon={Inbox} hint={`${stats.last24} reçue${stats.last24 > 1 ? "s" : ""} ces dernières 24 h`} />
        <StatCard
          label={`Hors délai (SLA ${settings.slaHours} h)`}
          value={<span className={stats.late ? "text-danger-text" : undefined}>{stats.late}</span>}
          icon={Clock3}
          hint={stats.late ? `+ ${stats.soon} à échéance sous 12 h` : stats.soon ? `${stats.soon} à échéance sous 12 h` : "Toutes les promesses tenues"}
        />
        <StatCard label="Taux de conversion (30 j)" value={percent(stats.recent ? (stats.converted / stats.recent) * 100 : 0)} icon={Percent} hint={`${stats.converted} convertie${stats.converted > 1 ? "s" : ""} sur ${stats.recent} (hors spam)`} />
        <StatCard
          label="1re réponse (moyenne 30 j)"
          value={durationLong(stats.avg)}
          icon={TimerReset}
          hint={stats.answered ? `${Math.round((stats.withinSla / stats.answered) * 100)} % dans les ${settings.slaHours} h` : "Aucune réponse sur la période"}
        />
      </div>

      <div className="mb-3 -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: "Toutes", count: baseFiltered.length },
            ...SUBMISSION_TYPES.map((o) => ({ value: o.value, label: o.label, count: typeCounts.get(o.value) ?? 0 })),
          ]}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, email, organisation, message…" aria-label="Rechercher une demande" className="pl-8" />
        </div>
        <Select
          aria-label="Statut"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          options={[{ value: "ouvertes", label: "À traiter (ouvertes)" }, { value: "toutes", label: "Tous les statuts" }, ...SUBMISSION_STATUSES]}
          className="w-[calc(50%-4px)] sm:w-48"
        />
        <Select
          aria-label="Assignée à"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          options={[{ value: "me", label: "Moi" }, { value: "none", label: "Non assignées" }, ...userOptions]}
          placeholder="Toute l'équipe"
          className="w-[calc(50%-4px)] sm:w-44"
        />
        <Select
          aria-label="Délai de réponse"
          value={sla}
          onChange={(e) => setSla(e.target.value as SlaFilter)}
          options={[
            { value: "depasse", label: "SLA dépassé" },
            { value: "bientot", label: "Échéance < 12 h" },
          ]}
          placeholder="Tous délais"
          className="w-[calc(50%-4px)] sm:w-40"
        />
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X /> Réinitialiser
          </Button>
        ) : null}
      </div>

      {editable && selected.size > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-ring/30 bg-accent-soft px-3 py-2 text-sm">
          <span className="font-medium text-foreground">
            {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
          </span>
          <Select aria-label="Assigner la sélection à" value="" onChange={(e) => e.target.value && bulkAssign(e.target.value === "__none" ? "" : e.target.value)} options={[...userOptions, { value: "__none", label: "Personne (désassigner)" }]} placeholder="Assigner à…" className="w-44" />
          <Button size="sm" variant="secondary" onClick={bulkArchive}>
            <Archive /> Archiver
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            Désélectionner
          </Button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={hasFilters ? "Aucune demande ne correspond" : "Boîte de réception vide"}
          description={hasFilters ? "Modifiez ou réinitialisez les filtres." : "Les nouvelles soumissions des formulaires du site arriveront ici en temps réel."}
          action={hasFilters ? <Button variant="secondary" size="sm" onClick={resetFilters}>Réinitialiser les filtres</Button> : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border bg-surface-2/60 px-3 py-2 text-xs text-muted-foreground">
            {editable ? (
              <input
                type="checkbox"
                aria-label="Tout sélectionner"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                className="size-4 accent-[var(--sw-teal)]"
              />
            ) : null}
            <span className="tabular">
              {rows.length} demande{rows.length > 1 ? "s" : ""}
              {sla === "depasse" ? " hors délai" : ""}
            </span>
            <span className="ml-auto hidden sm:inline">Triées de la plus récente à la plus ancienne</span>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((s) => (
              <InboxRow key={s.id} sub={s} now={now} selected={selected.has(s.id)} onToggle={editable ? () => toggle(s.id) : undefined} onOpen={() => setOpenId(s.id)} />
            ))}
          </ul>
        </Card>
      )}

      <SubmissionDrawer id={openId} onClose={() => setOpenId(undefined)} />
    </div>
  );
}

function InboxRow({ sub, now, selected, onToggle, onOpen }: { sub: Submission; now: number; selected: boolean; onToggle?: () => void; onOpen: () => void }) {
  const sla = slaBadge(sub, now);
  const unread = sub.status === "nouvelle";
  const excerpt = sub.message ? truncate(sub.message.replace(/\s+/g, " "), 140) : "";
  return (
    <li className={cn("group relative flex gap-3 px-3 py-3 transition-colors hover:bg-surface-2/70", selected && "bg-accent-soft")}>
      {onToggle ? (
        <input type="checkbox" aria-label={`Sélectionner la demande de ${sub.name}`} checked={selected} onChange={onToggle} className="relative z-10 mt-1 size-4 shrink-0 accent-[var(--sw-teal)]" />
      ) : null}
      <span className={cn("mt-2 size-2 shrink-0 rounded-full", unread ? "bg-primary" : "bg-transparent")} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button type="button" onClick={onOpen} className={cn("truncate text-left text-sm text-foreground after:absolute after:inset-0 focus-visible:outline-none", unread ? "font-semibold" : "font-medium")}>
            {sub.name}
            {unread ? <span className="sr-only"> (nouvelle)</span> : null}
          </button>
          {sub.company ? <span className="truncate text-xs text-muted-foreground">· {sub.company}</span> : null}
          <StatusBadge options={SUBMISSION_TYPES} value={sub.type} />
          {sub.status !== "nouvelle" ? <StatusBadge options={SUBMISSION_STATUSES} value={sub.status} className="hidden sm:inline-flex" /> : null}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {sub.subject ? <span className="text-foreground">{sub.subject}</span> : null}
          {sub.subject && excerpt ? " — " : null}
          {excerpt || (!sub.subject ? `Formulaire ${labelOf(SUBMISSION_TYPES, sub.type).toLowerCase()}` : "")}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 text-right sm:flex-row sm:items-center sm:gap-3">
        {sla ? (
          <Badge tone={sla.tone} dot title={sla.title} className="tabular">
            {sla.label}
          </Badge>
        ) : null}
        <span className="hidden md:inline-flex">
          <UserChip id={sub.assigneeId} />
        </span>
        <time dateTime={sub.receivedAt} title={dateTime(sub.receivedAt)} className="tabular w-24 text-xs text-muted-foreground">
          {relative(sub.receivedAt, now)}
        </time>
      </div>
    </li>
  );
}
