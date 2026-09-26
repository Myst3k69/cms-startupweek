"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, UserPlus } from "lucide-react";
import { Button, DataTable, Progress, StatusBadge, useToast, type Column, type FilterDef } from "@/components/ui";
import { ContactLink, SessionLink, UserChip } from "@/components/shared/entity-links";
import { StatusSelect } from "@/components/shared/status-select";
import { APPLICATION_STATUSES, FUNDING_SOURCES, PERSONAS, labelOf } from "@/lib/domain/constants";
import { sendConvocation } from "@/lib/domain/actions";
import { contactName } from "@/lib/domain/selectors";
import type { Application, Contact, EventSession, ID, User } from "@/lib/domain/types";
import { date, money, relative } from "@/lib/format";
import { useActions, useSession } from "@/lib/hooks";
import { ScorePill } from "../bits";
import { checklistProgress } from "../../lib/applications";
import type { MoveTarget } from "./use-mover";

const ORDER = APPLICATION_STATUSES.map((o) => o.value);

export function ApplicationList({
  rows,
  contacts,
  events,
  users,
  now,
  canEdit,
  onMove,
}: {
  rows: Application[];
  contacts: Map<ID, Contact>;
  events: Map<ID, EventSession>;
  users: Map<ID, User>;
  now: number;
  canEdit: boolean;
  onMove: (app: Application, to: MoveTarget) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { update } = useActions();
  const { user } = useSession();

  const columns = React.useMemo<Column<Application>[]>(
    () => [
      {
        key: "number",
        header: "#",
        render: (a) => <span className="tabular font-mono text-xs text-muted-foreground">#{a.number}</span>,
        sort: (a) => a.number,
        className: "w-14",
      },
      {
        key: "candidat",
        header: "Candidat",
        render: (a) => <ContactLink id={a.contactId} withEmail />,
        sort: (a) => contactName(contacts.get(a.contactId)),
        csv: (a) => contactName(contacts.get(a.contactId)),
      },
      {
        key: "email",
        header: "Email",
        render: (a) => <span className="text-xs text-muted-foreground">{contacts.get(a.contactId)?.email ?? "—"}</span>,
        csv: (a) => contacts.get(a.contactId)?.email ?? "",
        hideBelow: "xl",
        headerClassName: "hidden",
        className: "hidden",
      },
      {
        key: "session",
        header: "Session",
        render: (a) => <SessionLink id={a.eventId} />,
        sort: (a) => events.get(a.eventId)?.code ?? "",
      },
      {
        key: "status",
        header: "Statut",
        render: (a) =>
          canEdit ? (
            <StatusSelect options={APPLICATION_STATUSES} value={a.status} onChange={(v) => onMove(a, v)} label={`Statut de la candidature #${a.number}`} />
          ) : (
            <StatusBadge options={APPLICATION_STATUSES} value={a.status} />
          ),
        sort: (a) => ORDER.indexOf(a.status),
        csv: (a) => labelOf(APPLICATION_STATUSES, a.status),
      },
      {
        key: "persona",
        header: "Persona",
        render: (a) => <StatusBadge options={PERSONAS} value={a.persona} />,
        sort: (a) => labelOf(PERSONAS, a.persona),
        hideBelow: "md",
      },
      {
        key: "score",
        header: "Score",
        render: (a) => <ScorePill score={a.score} />,
        sort: (a) => a.score,
        align: "center",
      },
      {
        key: "funding",
        header: "Financement",
        render: (a) => <span className="text-xs text-muted-foreground">{a.funderName ?? labelOf(FUNDING_SOURCES, a.funding)}</span>,
        sort: (a) => labelOf(FUNDING_SOURCES, a.funding),
        hideBelow: "lg",
      },
      {
        key: "reviewer",
        header: "Assigné",
        render: (a) => <UserChip id={a.reviewerId} />,
        sort: (a) => users.get(a.reviewerId ?? "")?.name ?? "~",
        csv: (a) => users.get(a.reviewerId ?? "")?.name ?? "",
        hideBelow: "lg",
      },
      {
        key: "payment",
        header: "Paiement",
        render: (a) =>
          a.amountDueCents > 0 ? (
            <span className="tabular text-xs">
              <span className={a.amountPaidCents >= a.amountDueCents ? "text-success-text" : "text-foreground"}>{money(a.amountPaidCents)}</span>
              <span className="text-muted-foreground"> / {money(a.amountDueCents)}</span>
            </span>
          ) : (
            <span className="text-xs text-faint">—</span>
          ),
        sort: (a) => a.amountPaidCents,
        csv: (a) => (a.amountPaidCents / 100).toFixed(2),
        align: "right",
        hideBelow: "md",
      },
      {
        key: "qualiopi",
        header: "Qualiopi",
        render: (a) => {
          const p = checklistProgress(a);
          return (
            <div className="flex w-20 items-center gap-2" title={`Checklist Qualiopi : ${p.done}/${p.total}`}>
              <Progress value={(p.done / p.total) * 100} tone={p.done === p.total ? "success" : "accent"} label={`Checklist Qualiopi ${p.done} sur ${p.total}`} />
              <span className="tabular text-[11px] text-muted-foreground">
                {p.done}/{p.total}
              </span>
            </div>
          );
        },
        sort: (a) => checklistProgress(a).done,
        hideBelow: "xl",
      },
      {
        key: "submitted",
        header: "Reçue",
        render: (a) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground" title={date(a.submittedAt)}>
            {relative(a.submittedAt, now)}
          </span>
        ),
        sort: (a) => a.submittedAt,
        csv: (a) => date(a.submittedAt, "yyyy-MM-dd"),
      },
    ],
    [contacts, events, users, canEdit, onMove, now],
  );

  const filters = React.useMemo<FilterDef<Application>[]>(
    () => [
      {
        key: "status",
        label: "Tous les statuts",
        options: APPLICATION_STATUSES.map((o) => ({ value: o.value, label: o.label })),
        predicate: (a, v) => a.status === v,
      },
    ],
    [],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(a) => a.id}
      filters={filters}
      exportName="candidatures"
      initialSort={{ key: "submitted", dir: "desc" }}
      onRowClick={(a) => router.push(`/candidatures/${a.id}`)}
      emptyTitle="Aucune candidature"
      emptyDescription="Aucune candidature ne correspond à ces filtres."
      bulkActions={
        canEdit
          ? (selected, clear) => (
              <>
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => {
                    if (!user) return;
                    selected.forEach((a) => update("applications", a.id, { reviewerId: user.id }, { log: `Assignée à ${user.name}` }));
                    toast({ title: `${selected.length} candidature${selected.length > 1 ? "s" : ""} assignée${selected.length > 1 ? "s" : ""} à ${user.name.split(" ")[0]}` });
                    clear();
                  }}
                >
                  <UserPlus /> M'assigner
                </Button>
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => {
                    const targets = selected.filter((a) => a.status === "inscrite");
                    targets.forEach((a) => sendConvocation(a.id));
                    toast({
                      title: targets.length ? `${targets.length} convocation${targets.length > 1 ? "s" : ""} envoyée${targets.length > 1 ? "s" : ""}` : "Aucune candidature inscrite dans la sélection",
                      description: targets.length ? "Horodatées dans la checklist Qualiopi (indicateur 9)." : "Les convocations ne concernent que les candidatures « Inscrite (payée) ».",
                      tone: targets.length ? "success" : "info",
                    });
                    clear();
                  }}
                >
                  <Send /> Envoyer la convocation
                </Button>
              </>
            )
          : undefined
      }
    />
  );
}
