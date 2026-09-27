"use client";

import * as React from "react";
import { ArrowLeft, Building2, CalendarX2, ClipboardCheck, Columns3, Euro, FileText, Globe2, LayoutDashboard, Library, ListChecks, Luggage, MapPin, Printer, Smile, Users } from "lucide-react";
import { Badge, EmptyState, LinkButton, PageHeader, StatusBadge, Tabs, useToast } from "@/components/ui";
import { StatusSelect } from "@/components/shared/status-select";
import { EVENT_KINDS, EVENT_MODES, EVENT_STATUSES, labelOf } from "@/lib/domain/constants";
import { daysUntil } from "@/lib/domain/selectors";
import type { EventSession, ID } from "@/lib/domain/types";

import { useActions, useEntity, useNow, useSession } from "@/lib/hooks";
import { SessionImage } from "../bits";
import { replaceQuery } from "../../lib/url";
import { audienceLabel, sessionAudience, sessionDates } from "../../lib/sessions";
import { useSessionData } from "./use-session-data";
import { OverviewTab } from "./tab-overview";
import { ParticipantsTab } from "./tab-participants";
import { ProgramTab } from "./tab-program";
import { AttendanceTab } from "./tab-attendance";
import { EvaluationsTab } from "./tab-evaluations";
import { ResourcesTab } from "./tab-resources";
import { FinancesTab } from "./tab-finances";
import { DocumentsTab } from "./tab-documents";
import { LogisticsTab } from "./logistics/tab-logistics";

const TABS = ["apercu", "participants", "programme", "logistique", "emargement", "evaluations", "ressources", "finances", "documents"] as const;
export type SessionTab = (typeof TABS)[number];

export function isSessionTab(v: string | undefined): v is SessionTab {
  return Boolean(v) && (TABS as readonly string[]).includes(v!);
}

export function SessionDetail({ id, initialTab, initialSection }: { id: ID; initialTab?: string; initialSection?: string }) {
  const ev = useEntity("events", id);
  if (!ev) {
    return (
      <EmptyState
        icon={CalendarX2}
        title="Session introuvable"
        description="Elle a peut-être été supprimée ou l'identifiant est incorrect."
        action={
          <LinkButton href="/sessions" variant="secondary">
            <ArrowLeft /> Retour aux sessions
          </LinkButton>
        }
        className="mt-10"
      />
    );
  }
  return <SessionDetailView ev={ev} initialTab={isSessionTab(initialTab) ? initialTab : "apercu"} initialSection={initialSection} />;
}

function SessionDetailView({ ev, initialTab, initialSection }: { ev: EventSession; initialTab: SessionTab; initialSection?: string }) {
  const now = useNow();
  const { canEdit } = useSession();
  const editable = canEdit("sessions");
  const { update } = useActions();
  const toast = useToast();
  const data = useSessionData(ev);
  const [tab, setTab] = React.useState<SessionTab>(initialTab);
  const d = daysUntil(ev.startAt, now);
  const ended = Date.parse(ev.endAt) < now;
  const audience = sessionAudience(ev);

  const tabs = [
    { value: "apercu" as const, label: "Aperçu", icon: LayoutDashboard },
    { value: "participants" as const, label: "Participants", icon: Users, count: audience === "b2c" ? data.enrolled.length : undefined },
    { value: "programme" as const, label: "Programme", icon: ListChecks },
    ...(ev.mode === "distanciel" ? [] : [{ value: "logistique" as const, label: "Logistique", icon: Luggage }]),
    { value: "emargement" as const, label: "Émargement", icon: ClipboardCheck },
    { value: "evaluations" as const, label: "Évaluations", icon: Smile, count: data.evals.length || undefined },
    { value: "ressources" as const, label: "Ressources", icon: Library, count: ev.resourceIds.length || undefined },
    { value: "finances" as const, label: "Finances", icon: Euro },
    { value: "documents" as const, label: "Documents", icon: FileText },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Sessions", href: "/sessions" }, { label: ev.code }]}
        eyebrow={`${ev.code} · ${labelOf(EVENT_KINDS, ev.kind)}`}
        title={ev.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{sessionDates(ev)}</span>
            <span className="inline-flex items-center gap-1">
              {ev.mode === "distanciel" ? <Globe2 className="size-3.5" aria-hidden="true" /> : <MapPin className="size-3.5" aria-hidden="true" />}
              {labelOf(EVENT_MODES, ev.mode)} · {ev.city}
              {ev.venue ? ` — ${ev.venue}` : ""}
            </span>
            <span className="font-medium text-foreground">{ended ? "Terminée" : d > 0 ? `J-${d}` : "En cours"}</span>
          </span>
        }
        actions={
          <>
            {audience === "b2c" ? (
              <LinkButton href={`/candidatures?session=${ev.id}`} size="sm" variant="secondary">
                <Columns3 /> Candidatures ({data.apps.length})
              </LinkButton>
            ) : audience === "b2b" && ev.orgId ? (
              <LinkButton href={`/organisations/${ev.orgId}`} size="sm" variant="secondary">
                <Building2 /> Organisation cliente
              </LinkButton>
            ) : null}
            <LinkButton href={`/print/programme/${ev.id}`} target="_blank" size="sm" variant="secondary">
              <Printer /> Imprimer le programme
            </LinkButton>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {editable ? (
            <StatusSelect
              options={EVENT_STATUSES}
              value={ev.status}
              label="Statut de la session"
              className="h-8"
              onChange={(v) => {
                update("events", ev.id, { status: v }, { log: `Statut : ${labelOf(EVENT_STATUSES, ev.status)} → ${labelOf(EVENT_STATUSES, v)}`, kind: "statut" });
                toast({ title: `${ev.code} : ${labelOf(EVENT_STATUSES, v)}` });
              }}
            />
          ) : (
            <StatusBadge options={EVENT_STATUSES} value={ev.status} />
          )}
          <Badge tone={ev.publishedOnSite ? "success" : "neutral"} dot>
            {ev.publishedOnSite ? "Publiée sur le site" : "Non publiée"}
          </Badge>
          {ev.founderEdition ? <Badge tone="accent">Founder Edition</Badge> : null}
          {ev.earlyBird ? <Badge tone="warning">Early Bird</Badge> : null}
          <Badge tone={audience === "b2c" ? "accent" : audience === "b2b" ? "info" : "neutral"}>{audienceLabel(ev)}</Badge>
          {ev.isTraining ? <Badge tone="violet">Action de formation</Badge> : null}
          <SessionImage src={ev.imageUrl} alt="" className="ml-auto hidden h-10 w-16 rounded-md sm:block" />
        </div>
      </PageHeader>

      <Tabs<SessionTab>
        value={tab}
        onChange={(v) => {
          setTab(v);
          replaceQuery({ onglet: v === "apercu" ? null : v, ...(v === "logistique" ? {} : { rubrique: null }) });
        }}
        tabs={tabs}
        className="mb-6"
      />

      {tab === "apercu" ? <OverviewTab ev={ev} data={data} canEdit={editable} /> : null}
      {tab === "participants" ? <ParticipantsTab ev={ev} data={data} canEdit={editable} /> : null}
      {tab === "programme" ? <ProgramTab ev={ev} canEdit={editable} /> : null}
      {tab === "logistique" ? <LogisticsTab ev={ev} canEdit={editable} initialSection={initialSection} /> : null}
      {tab === "emargement" ? <AttendanceTab ev={ev} data={data} canEdit={editable} /> : null}
      {tab === "evaluations" ? <EvaluationsTab ev={ev} data={data} canEdit={editable} /> : null}
      {tab === "ressources" ? <ResourcesTab ev={ev} canEdit={editable} /> : null}
      {tab === "finances" ? <FinancesTab key={ev.budgetCents ?? "none"} ev={ev} data={data} canEdit={editable} /> : null}
      {tab === "documents" ? <DocumentsTab ev={ev} data={data} /> : null}
    </div>
  );
}
