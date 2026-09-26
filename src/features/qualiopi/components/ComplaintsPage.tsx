"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AlarmClock, CheckCircle2, Hourglass, MailCheck, MessageSquareWarning, Plus, Timer } from "lucide-react";
import { useCollection, useLookup, useNow, useSession, useSettings, useActions } from "@/lib/hooks";
import { COMPLAINT_STATUSES, COMPLAINT_TYPES, labelOf } from "@/lib/domain/constants";
import { acknowledgeComplaint } from "@/lib/domain/actions";
import { contactName } from "@/lib/domain/selectors";
import type { Complaint } from "@/lib/domain/types";
import { date, relative } from "@/lib/format";
import { Badge, Button, Card, DataTable, PageHeader, StatCard, StatusBadge, useToast, type Column, type FilterDef } from "@/components/ui";
import { ContactLink, SessionLink } from "@/components/shared/entity-links";
import { COMPLAINT_CHANNELS, SEVERITIES } from "../labels";
import { HOUR, complaintAckHours, complaintCloseDays, complaintStats, fmtDays, fmtHours, fmtPct } from "../metrics";
import { QualiopiNav } from "./qualiopi-nav";
import { ComplaintDrawer } from "./complaint-drawer";
import { ComplaintCreateModal } from "./complaint-create-modal";

const STATUS_ORDER = COMPLAINT_STATUSES.map((s) => s.value);

export function ComplaintsPage() {
  const complaints = useCollection("complaints");
  const contacts = useLookup("contacts");
  const events = useLookup("events");
  const settings = useSettings();
  const now = useNow();
  const { canEdit } = useSession();
  const toast = useToast();
  const { log } = useActions();
  const readOnly = !canEdit("qualiopi");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const selectedId = searchParams.get("id");
  const [creating, setCreating] = React.useState(false);
  const ackLimit = settings.complaintAckHours;

  const setSelected = React.useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("id", id);
      else params.delete("id");
      const qs = params.toString();
      window.history.replaceState(null, "", `${pathname}${qs ? `?${qs}` : ""}`);
    },
    [searchParams, pathname],
  );

  const rows = React.useMemo(() => [...complaints].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)), [complaints]);
  const stats = React.useMemo(() => complaintStats(complaints, now, ackLimit), [complaints, now, ackLimit]);
  const lateList = React.useMemo(() => complaints.filter((c) => !c.ackAt && now - Date.parse(c.receivedAt) > ackLimit * HOUR), [complaints, now, ackLimit]);

  const isLate = React.useCallback((c: Complaint) => !c.ackAt && now - Date.parse(c.receivedAt) > ackLimit * HOUR, [now, ackLimit]);

  const columns: Column<Complaint>[] = React.useMemo(
    () => [
      {
        key: "number",
        header: "Numéro",
        render: (c) => <span className="font-mono text-xs font-medium text-foreground">{c.number}</span>,
        sort: (c) => c.number,
      },
      {
        key: "receivedAt",
        header: "Reçue le",
        render: (c) => (
          <span className="whitespace-nowrap">
            {date(c.receivedAt)}
            <span className="block text-xs text-muted-foreground">{relative(c.receivedAt, now)}</span>
          </span>
        ),
        sort: (c) => Date.parse(c.receivedAt),
        csv: (c) => c.receivedAt,
      },
      {
        key: "subject",
        header: "Objet",
        render: (c) => (
          <span className="block max-w-72">
            <span className="line-clamp-2 font-medium text-foreground">{c.subject}</span>
          </span>
        ),
        sort: (c) => c.subject,
      },
      { key: "channel", header: "Canal", render: (c) => <span className="text-muted-foreground">{labelOf(COMPLAINT_CHANNELS, c.channel)}</span>, csv: (c) => labelOf(COMPLAINT_CHANNELS, c.channel), hideBelow: "xl" },
      { key: "type", header: "Type", render: (c) => <span className="text-muted-foreground">{labelOf(COMPLAINT_TYPES, c.type)}</span>, sort: (c) => labelOf(COMPLAINT_TYPES, c.type), hideBelow: "lg" },
      { key: "severity", header: "Gravité", render: (c) => <StatusBadge options={SEVERITIES} value={c.severity} />, sort: (c) => (c.severity === "majeure" ? 0 : 1), csv: (c) => c.severity },
      {
        key: "contact",
        header: "Contact",
        render: (c) => (c.contactId ? <ContactLink id={c.contactId} /> : <span className="text-faint">Anonyme</span>),
        sort: (c) => contactName(contacts.get(c.contactId ?? "")),
        hideBelow: "md",
      },
      {
        key: "session",
        header: "Session",
        render: (c) => <SessionLink id={c.eventId} short />,
        csv: (c) => events.get(c.eventId ?? "")?.code ?? "",
        hideBelow: "lg",
      },
      {
        key: "status",
        header: "Statut",
        render: (c) => <StatusBadge options={COMPLAINT_STATUSES} value={c.status} />,
        sort: (c) => STATUS_ORDER.indexOf(c.status),
        csv: (c) => labelOf(COMPLAINT_STATUSES, c.status),
      },
      {
        key: "ack",
        header: "Accusé",
        render: (c) => {
          const h = complaintAckHours(c);
          if (h !== null) return <Badge tone={h > ackLimit ? "warning" : "success"}>{fmtHours(h)}</Badge>;
          if (isLate(c)) return <Badge tone="danger" dot>En retard · {fmtHours((now - Date.parse(c.receivedAt)) / HOUR)}</Badge>;
          return <Badge tone="neutral">Reste {fmtHours(Math.max(0, ackLimit - (now - Date.parse(c.receivedAt)) / HOUR))}</Badge>;
        },
        sort: (c) => complaintAckHours(c) ?? (now - Date.parse(c.receivedAt)) / HOUR + 10_000,
        csv: (c) => (complaintAckHours(c) === null ? "" : Math.round(complaintAckHours(c)!)),
      },
      {
        key: "close",
        header: "Clôture",
        render: (c) => {
          const d = complaintCloseDays(c);
          return d !== null ? <span className="tabular">{fmtDays(d)}</span> : <span className="text-xs text-muted-foreground">ouverte · {fmtDays((now - Date.parse(c.receivedAt)) / (24 * HOUR))}</span>;
        },
        sort: (c) => complaintCloseDays(c) ?? 10_000,
        csv: (c) => (complaintCloseDays(c) === null ? "" : complaintCloseDays(c)!.toFixed(1)),
        align: "right",
        hideBelow: "sm",
      },
    ],
    [now, ackLimit, contacts, events, isLate],
  );

  const filters: FilterDef<Complaint>[] = React.useMemo(
    () => [
      { key: "status", label: "Tous les statuts", options: [{ value: "ouvertes", label: "Ouvertes (non clôturées)" }, ...COMPLAINT_STATUSES], predicate: (c, v) => (v === "ouvertes" ? c.status !== "cloturee" : c.status === v) },
      { key: "type", label: "Tous les types", options: COMPLAINT_TYPES, predicate: (c, v) => c.type === v },
      { key: "severity", label: "Toutes gravités", options: SEVERITIES, predicate: (c, v) => c.severity === v },
      { key: "ack", label: "Accusé : tous", options: [{ value: "retard", label: "Accusé en retard" }, { value: "attente", label: "Accusé à envoyer" }, { value: "envoye", label: "Accusé envoyé" }], predicate: (c, v) => (v === "retard" ? isLate(c) : v === "attente" ? !c.ackAt : !!c.ackAt) },
    ],
    [isLate],
  );

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Qualiopi · indicateur 31"
        title="Registre des réclamations"
        description={`Chaque réclamation (formulaire, email, téléphone, oral, évaluation) est enregistrée, accusée sous ${ackLimit} h, analysée, traitée puis clôturée. Les causes récurrentes alimentent le plan d'amélioration (ind. 32).`}
        breadcrumbs={[{ label: "Qualiopi", href: "/qualiopi" }, { label: "Réclamations" }]}
        actions={
          !readOnly ? (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Nouvelle réclamation
            </Button>
          ) : null
        }
      />
      <QualiopiNav />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Réclamations ouvertes" value={stats.open} hint={`${stats.majorOpen} majeure(s) · ${stats.total} au registre`} icon={MessageSquareWarning} />
        <StatCard label="Délai moyen d'accusé" value={fmtHours(stats.avgAckHours)} hint={`Engagement : ${ackLimit} h`} icon={Timer} />
        <StatCard label="Délai moyen de clôture" value={fmtDays(stats.avgCloseDays)} hint={stats.satisfiedPct !== null ? `${fmtPct(stats.satisfiedPct)} de réclamants satisfaits` : "Satisfaction non renseignée"} icon={Hourglass} />
        <StatCard label="Accusés dans les délais" value={fmtPct(stats.onTimePct)} hint={stats.lateAck ? `${stats.lateAck} accusé(s) en retard` : "Aucun retard en cours"} icon={CheckCircle2} />
      </div>

      {lateList.length ? (
        <Card className="mb-6 border-danger/30 bg-danger-soft">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-foreground">
              <AlarmClock className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
              <span>
                <strong>{lateList.length} réclamation(s) sans accusé de réception</strong> au-delà de {ackLimit} h : {lateList.map((c) => c.number).join(", ")}.
              </span>
            </p>
            {!readOnly ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  lateList.forEach((c) => acknowledgeComplaint(c.id));
                  log({ kind: "systeme", entity: "complaints", entityId: lateList[0].id, summary: `Accusés de réception envoyés en lot (${lateList.length})` });
                  toast({ title: `${lateList.length} accusé(s) de réception envoyé(s)` });
                }}
              >
                <MailCheck /> Envoyer les accusés
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(c) => c.id}
        searchable={(c) => `${c.number} ${c.subject} ${c.description} ${contactName(contacts.get(c.contactId ?? ""))}`}
        searchPlaceholder="N°, objet, contact…"
        filters={filters}
        onRowClick={(c) => setSelected(c.id)}
        rowClassName={(c) => (isLate(c) ? "bg-danger-soft/50" : undefined)}
        exportName="registre-reclamations"
        emptyTitle={complaints.length ? "Aucune réclamation ne correspond" : "Aucune réclamation enregistrée"}
        emptyDescription={complaints.length ? "Modifiez la recherche ou les filtres." : "Le registre est prêt : les réclamations du formulaire du site arrivent ici automatiquement."}
      />

      <ComplaintDrawer complaintId={selectedId} onClose={() => setSelected(null)} />
      <ComplaintCreateModal open={creating} onClose={() => setCreating(false)} onCreated={(id) => setSelected(id)} />
    </div>
  );
}
