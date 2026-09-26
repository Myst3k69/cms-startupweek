"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BellRing, Building2, ClipboardList, Columns3, FileText, Inbox, KanbanSquare, Radio, Receipt, Send } from "lucide-react";
import { Badge, Button, Card, CardContent, DataTable, LinkButton, Segmented, StatusBadge, useToast, type Column } from "@/components/ui";
import { ContactLink, OrgLink } from "@/components/shared/entity-links";
import { sendConvocation, sendInvoiceReminder } from "@/lib/domain/actions";
import { APPLICATION_STATUSES, DEAL_STAGES, FUNDING_SOURCES, INVOICE_KINDS, INVOICE_STATUSES, QUOTE_STATUSES, labelOf } from "@/lib/domain/constants";
import { contactName, effectiveInvoiceStatus, invoiceBalance, invoiceTotal } from "@/lib/domain/selectors";
import type { Application, EventSession, Invoice } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { useCollection, useEntity, useLookup, useNow } from "@/lib/hooks";
import { daysUntil } from "@/lib/domain/selectors";
import { accessibilityState } from "../../lib/applications";
import { audienceLabel, sessionAudience } from "../../lib/sessions";
import type { SessionData } from "./use-session-data";

type Group = "inscrits" | "pipeline" | "sorties" | "toutes";

function openBalanceInvoices(app: Application, invoices: Invoice[]) {
  return invoices.filter((i) => i.applicationId === app.id && i.kind === "solde" && ["emise", "partielle", "en_retard"].includes(i.status) && invoiceBalance(i) > 0);
}

/** Webinaires et sessions B2B : pas de candidatures individuelles — on explique et on renvoie vers l'organisation / le devis. */
function NoApplicationsPanel({ ev }: { ev: EventSession }) {
  const now = useNow();
  const audience = sessionAudience(ev);
  const org = useEntity("organizations", ev.orgId);
  const quotesAll = useCollection("quotes");
  const dealsAll = useCollection("deals");
  const invoicesAll = useCollection("invoices");
  const quotes = React.useMemo(() => quotesAll.filter((q) => q.eventId === ev.id), [quotesAll, ev.id]);
  const deals = React.useMemo(() => dealsAll.filter((d) => d.eventId === ev.id), [dealsAll, ev.id]);
  const invoices = React.useMemo(() => invoicesAll.filter((i) => i.eventId === ev.id && !i.applicationId && i.status !== "annulee"), [invoicesAll, ev.id]);

  if (audience === "ouvert") {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
            <Radio className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              {audienceLabel(ev)} · {ev.capacity} places — inscriptions libres
            </h3>
            <p className="text-sm text-muted-foreground">
              Les participants s'inscrivent directement via le formulaire du site : ils ne passent pas par une candidature, ne reçoivent ni facture ni convocation, et n'apparaissent donc pas dans cette liste.
              Les inscriptions arrivent dans les demandes entrantes (type newsletter / webinaire) et alimentent les contacts.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <LinkButton href="/demandes" size="sm" variant="secondary">
                <Inbox /> Demandes entrantes
              </LinkButton>
              <LinkButton href="/contacts" size="sm" variant="ghost">
                Contacts
              </LinkButton>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info-text">
            <Building2 className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Session B2B · {ev.capacity} participants · <OrgLink id={ev.orgId} />
            </h3>
            <p className="text-sm text-muted-foreground">
              Les participants sont inscrits par {org?.name ?? "l'organisation cliente"} (liste nominative transmise avant la session) : pas de candidature individuelle ni de facture par
              participant. La commande passe par le devis et les factures ci-dessous ; l'émargement et les évaluations restent tracés sur la session (Qualiopi).
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {ev.orgId ? (
                <LinkButton href={`/organisations/${ev.orgId}`} size="sm" variant="secondary">
                  <Building2 /> Fiche organisation
                </LinkButton>
              ) : null}
              <LinkButton href={`/print/emargement/${ev.id}`} target="_blank" size="sm" variant="ghost">
                <ClipboardList /> Feuille d'émargement vierge
              </LinkButton>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-3">
          <section>
            <h4 className="eyebrow mb-2 flex items-center gap-1.5 text-muted-foreground">
              <KanbanSquare className="size-3.5" aria-hidden="true" /> Opportunité
            </h4>
            {deals.length ? (
              <ul className="space-y-1.5">
                {deals.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/pipeline?deal=${d.id}`} className="min-w-0 truncate text-foreground hover:text-accent-text">
                      {d.title}
                    </Link>
                    <StatusBadge options={DEAL_STAGES} value={d.stage} className="shrink-0" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-faint">Aucune opportunité liée.</p>
            )}
          </section>
          <section>
            <h4 className="eyebrow mb-2 flex items-center gap-1.5 text-muted-foreground">
              <FileText className="size-3.5" aria-hidden="true" /> Devis
            </h4>
            {quotes.length ? (
              <ul className="space-y-1.5">
                {quotes.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/facturation/devis/${q.id}`} className="font-mono text-xs font-medium text-foreground hover:text-accent-text">
                      {q.number}
                    </Link>
                    <span className="tabular text-xs text-muted-foreground">{money(invoiceTotal({ lines: q.lines, kind: "facture" }).ttc)}</span>
                    <StatusBadge options={QUOTE_STATUSES} value={q.status} className="shrink-0" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-faint">Aucun devis lié.</p>
            )}
          </section>
          <section>
            <h4 className="eyebrow mb-2 flex items-center gap-1.5 text-muted-foreground">
              <Receipt className="size-3.5" aria-hidden="true" /> Factures
            </h4>
            {invoices.length ? (
              <ul className="space-y-1.5">
                {invoices.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/facturation/factures/${i.id}`} className="font-mono text-xs font-medium text-foreground hover:text-accent-text" title={labelOf(INVOICE_KINDS, i.kind)}>
                      {i.number}
                    </Link>
                    <span className="tabular text-xs text-muted-foreground">{money(invoiceTotal(i).ttc)}</span>
                    <StatusBadge options={INVOICE_STATUSES} value={effectiveInvoiceStatus(i, now)} className="shrink-0" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-faint">Aucune facture émise.</p>
            )}
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

export function ParticipantsTab({ ev, data, canEdit }: { ev: EventSession; data: SessionData; canEdit: boolean }) {
  if (sessionAudience(ev) !== "b2c" && data.apps.length === 0) return <NoApplicationsPanel ev={ev} />;
  return <ParticipantsTable ev={ev} data={data} canEdit={canEdit} />;
}

function ParticipantsTable({ ev, data, canEdit }: { ev: EventSession; data: SessionData; canEdit: boolean }) {
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
