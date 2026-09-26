"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BellRing, Columns3, Send } from "lucide-react";
import { Badge, Button, DataTable, LinkButton, Segmented, StatusBadge, useToast, type Column } from "@/components/ui";
import { ContactLink } from "@/components/shared/entity-links";
import { sendConvocation, sendInvoiceReminder } from "@/lib/domain/actions";
import { APPLICATION_STATUSES, FUNDING_SOURCES, labelOf } from "@/lib/domain/constants";
import { contactName, invoiceBalance } from "@/lib/domain/selectors";
import type { Application, EventSession, Invoice } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { useLookup, useNow } from "@/lib/hooks";
import { daysUntil } from "@/lib/domain/selectors";
import { accessibilityState } from "../../lib/applications";
import type { SessionData } from "./use-session-data";

type Group = "inscrits" | "pipeline" | "sorties" | "toutes";

function openBalanceInvoices(app: Application, invoices: Invoice[]) {
  return invoices.filter((i) => i.applicationId === app.id && i.kind === "solde" && ["emise", "partielle", "en_retard"].includes(i.status) && invoiceBalance(i) > 0);
}

export function ParticipantsTab({ ev, data, canEdit }: { ev: EventSession; data: SessionData; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const now = useNow();
  const contacts = useLookup("contacts");
  const [group, setGroup] = React.useState<Group>(data.enrolled.length ? "inscrits" : "pipeline");

  const rows = group === "inscrits" ? data.enrolled : group === "pipeline" ? data.pipeline : group === "sorties" ? data.exits : data.apps;
  const missingConvocations = React.useMemo(() => data.enrolled.filter((a) => !a.convocationSentAt), [data.enrolled]);
  const balancesToRemind = React.useMemo(() => data.enrolled.flatMap((a) => openBalanceInvoices(a, data.sessionInvoices)), [data.enrolled, data.sessionInvoices]);
  const d = daysUntil(ev.startAt, now);

  const sendConvocations = (list: Application[]) => {
    const targets = list.filter((a) => a.status === "inscrite");
    targets.forEach((a) => sendConvocation(a.id));
    toast({
      title: targets.length ? `${targets.length} convocation${targets.length > 1 ? "s" : ""} envoyée${targets.length > 1 ? "s" : ""}` : "Aucune convocation à envoyer",
      description: targets.length ? "Programme, horaires, lieu et règlement intérieur — horodatés pour l'indicateur Qualiopi 9." : "Seules les candidatures « Inscrite (payée) » reçoivent une convocation.",
      tone: targets.length ? "success" : "info",
    });
  };

  const remindBalances = (invoices: Invoice[]) => {
    invoices.forEach((i) => sendInvoiceReminder(i.id));
    const total = invoices.reduce((s, i) => s + invoiceBalance(i), 0);
    toast({
      title: invoices.length ? `${invoices.length} relance${invoices.length > 1 ? "s" : ""} de solde envoyée${invoices.length > 1 ? "s" : ""}` : "Aucun solde à relancer",
      description: invoices.length ? `${money(total)} restant dû — lien de paiement Stripe inclus.` : "Tous les soldes émis sont réglés.",
      tone: invoices.length ? "success" : "info",
    });
  };

  const columns = React.useMemo<Column<Application>[]>(
    () => [
      { key: "number", header: "#", render: (a) => <span className="tabular font-mono text-xs text-muted-foreground">#{a.number}</span>, sort: (a) => a.number, className: "w-14" },
      { key: "name", header: "Participant", render: (a) => <ContactLink id={a.contactId} withEmail />, sort: (a) => contactName(contacts.get(a.contactId)), csv: (a) => contactName(contacts.get(a.contactId)) },
      { key: "status", header: "Statut", render: (a) => <StatusBadge options={APPLICATION_STATUSES} value={a.status} />, sort: (a) => a.status, csv: (a) => labelOf(APPLICATION_STATUSES, a.status) },
      {
        key: "payment",
        header: "Paiement",
        render: (a) => {
          if (!a.amountDueCents) return <span className="text-xs text-faint">—</span>;
          const rest = a.amountDueCents - a.amountPaidCents;
          return (
            <div className="text-xs">
              {rest <= 0 ? (
                <Badge tone="success" dot>
                  Soldé
                </Badge>
              ) : a.amountPaidCents > 0 ? (
                <Badge tone="info" dot>
                  Acompte réglé
                </Badge>
              ) : (
                <Badge tone="warning" dot>
                  En attente
                </Badge>
              )}
              <div className="tabular mt-0.5 text-muted-foreground">
                {money(a.amountPaidCents)} / {money(a.amountDueCents)}
              </div>
            </div>
          );
        },
        sort: (a) => a.amountPaidCents / Math.max(1, a.amountDueCents),
        csv: (a) => `${(a.amountPaidCents / 100).toFixed(2)} / ${(a.amountDueCents / 100).toFixed(2)}`,
      },
      {
        key: "convocation",
        header: "Convocation",
        render: (a) =>
          a.convocationSentAt ? (
            <span className="text-xs text-success-text">{date(a.convocationSentAt)}</span>
          ) : a.status === "inscrite" ? (
            <Badge tone={d > 0 && d <= 7 ? "danger" : "warning"} dot>
              À envoyer
            </Badge>
          ) : (
            <span className="text-xs text-faint">—</span>
          ),
        sort: (a) => a.convocationSentAt ?? "",
        csv: (a) => (a.convocationSentAt ? date(a.convocationSentAt, "yyyy-MM-dd") : ""),
      },
      {
        key: "agreement",
        header: "Convention",
        render: (a) => (a.agreementSignedAt ? <span className="text-xs text-success-text">Signée · {date(a.agreementSignedAt, "d MMM")}</span> : <span className="text-xs text-faint">Non signée</span>),
        sort: (a) => a.agreementSignedAt ?? "",
        csv: (a) => (a.agreementSignedAt ? date(a.agreementSignedAt, "yyyy-MM-dd") : ""),
        hideBelow: "md",
      },
      {
        key: "positioning",
        header: "Position.",
        render: (a) => (typeof a.positioningScore === "number" ? <span className="tabular text-xs">{String(a.positioningScore).replace(".", ",")}/10</span> : <span className="text-xs text-faint">—</span>),
        sort: (a) => a.positioningScore ?? -1,
        csv: (a) => a.positioningScore ?? "",
        align: "center",
        hideBelow: "lg",
      },
      {
        key: "access",
        header: "Aménagement",
        render: (a) => {
          const st = accessibilityState(a);
          if (st === "aucun") return <span className="text-xs text-faint">—</span>;
          return (
            <Badge tone={st === "amenage" ? "success" : "warning"} dot title={a.accessibilityNeeds}>
              {st === "amenage" ? "Aménagé" : "À traiter"}
            </Badge>
          );
        },
        sort: (a) => accessibilityState(a),
        csv: (a) => a.accessibilityNeeds ?? "",
        hideBelow: "lg",
      },
      {
        key: "funding",
        header: "Financement",
        render: (a) => <span className="text-xs text-muted-foreground">{a.funderName ?? labelOf(FUNDING_SOURCES, a.funding)}</span>,
        sort: (a) => a.funding,
        hideBelow: "xl",
      },
    ],
    [contacts, d],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Group>
          value={group}
          onChange={setGroup}
          options={[
            { value: "inscrits", label: "Inscrits", count: data.enrolled.length },
            { value: "pipeline", label: "Pipeline", count: data.pipeline.length },
            { value: "sorties", label: "Sorties", count: data.exits.length },
            { value: "toutes", label: "Toutes", count: data.apps.length },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {canEdit ? (
            <>
              <Button size="sm" variant={missingConvocations.length ? "primary" : "secondary"} disabled={!missingConvocations.length} onClick={() => sendConvocations(missingConvocations)}>
                <Send /> Envoyer les convocations{missingConvocations.length ? ` (${missingConvocations.length})` : ""}
              </Button>
              <Button size="sm" variant="secondary" disabled={!balancesToRemind.length} onClick={() => remindBalances(balancesToRemind)}>
                <BellRing /> Relancer les soldes{balancesToRemind.length ? ` (${balancesToRemind.length})` : ""}
              </Button>
            </>
          ) : null}
          <LinkButton href={`/candidatures?session=${ev.id}`} size="sm" variant="ghost">
            <Columns3 /> Kanban
          </LinkButton>
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(a) => a.id}
        searchable={(a) => `${contactName(contacts.get(a.contactId))} ${contacts.get(a.contactId)?.email ?? ""} #${a.number}`}
        searchPlaceholder="Rechercher un participant…"
        exportName={`participants-${ev.code}`}
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(a) => router.push(`/candidatures/${a.id}`)}
        emptyTitle={group === "inscrits" ? "Aucun inscrit pour l'instant" : "Aucune candidature"}
        emptyDescription={group === "inscrits" ? "Les candidatures passent ici quand l'acompte est réglé." : undefined}
        bulkActions={
          canEdit
            ? (selected, clear) => (
                <>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      sendConvocations(selected);
                      clear();
                    }}
                  >
                    <Send /> Envoyer les convocations
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      remindBalances(selected.flatMap((a) => openBalanceInvoices(a, data.sessionInvoices)));
                      clear();
                    }}
                  >
                    <BellRing /> Relancer les soldes
                  </Button>
                </>
              )
            : undefined
        }
      />
    </div>
  );
}
