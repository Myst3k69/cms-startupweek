"use client";

import * as React from "react";
import Link from "next/link";
import { Briefcase, Building2, CalendarDays, CheckSquare, FileText, Globe, Mail, MapPin, Pencil, Plus, Receipt, Users } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useNow, useSession } from "@/lib/hooks";
import { DEAL_STAGES, EVENT_STATUSES, INVOICE_KINDS, INVOICE_STATUSES, labelOf, LIFECYCLES, ORG_STATUSES, ORG_TYPES, QUOTE_STATUSES } from "@/lib/domain/constants";
import { contactName, effectiveInvoiceStatus, invoiceBalance, invoiceTotal } from "@/lib/domain/selectors";
import type { EntityRef, Organization } from "@/lib/domain/types";
import { date, dateRange, money, relative, totals } from "@/lib/format";
import { Avatar, Badge, Button, Card, CardContent, CardHeader, CardTitle, DescriptionList, EmptyState, LinkButton, PageHeader, StatusBadge, useToast } from "@/components/ui";
import { ActivityTimeline } from "@/components/shared/timeline";
import { UserChip } from "@/components/shared/entity-links";
import { StatusSelect } from "@/components/shared/status-select";
import { OrgFormModal } from "../shared/org-form-modal";
import { TaskFormModal } from "../shared/task-form-modal";
import { EmailComposer } from "../shared/email-composer";
import { DealFormModal } from "../pipeline/deal-form-modal";

export function OrganisationDetail({ id }: { id: string }) {
  const org = useCrm((s) => s.organizations.find((o) => o.id === id));
  if (!org) {
    return (
      <div>
        <PageHeader title="Organisation introuvable" breadcrumbs={[{ label: "Organisations", href: "/organisations" }, { label: "Introuvable" }]} />
        <EmptyState icon={Building2} title="Cette organisation n'existe pas" description="Elle a peut-être été supprimée." action={<LinkButton href="/organisations" variant="secondary">Retour aux organisations</LinkButton>} />
      </div>
    );
  }
  return <OrgView org={org} />;
}

function Block({ title, icon: Icon, count, action, children }: { title: string; icon: React.ComponentType<{ className?: string }>; count?: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle className="inline-flex items-center gap-2">
          <Icon className="size-4 text-faint" />
          {title}
          {count !== undefined ? <span className="tabular rounded-full bg-surface-2 px-1.5 text-[11px] font-medium text-muted-foreground">{count}</span> : null}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="pt-3">{children}</CardContent>
    </Card>
  );
}

function OrgView({ org }: { org: Organization }) {
  const now = useNow();
  const toast = useToast();
  const { canEdit } = useSession();
  const editable = canEdit("organisations");
  const update = useCrm((s) => s.update);
  const contacts = useCrm((s) => s.contacts);
  const deals = useCrm((s) => s.deals);
  const events = useCrm((s) => s.events);
  const quotes = useCrm((s) => s.quotes);
  const invoices = useCrm((s) => s.invoices);
  const [editing, setEditing] = React.useState(false);
  const [dealOpen, setDealOpen] = React.useState(false);
  const [tasking, setTasking] = React.useState(false);
  const [composing, setComposing] = React.useState(false);

  const people = React.useMemo(() => contacts.filter((c) => c.orgId === org.id).sort((a, b) => contactName(a).localeCompare(contactName(b), "fr")), [contacts, org.id]);
  const myDeals = React.useMemo(() => deals.filter((d) => d.orgId === org.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [deals, org.id]);
  const sessions = React.useMemo(() => events.filter((e) => e.orgId === org.id).sort((a, b) => b.startAt.localeCompare(a.startAt)), [events, org.id]);
  const myQuotes = React.useMemo(() => quotes.filter((q) => q.orgId === org.id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)), [quotes, org.id]);
  const myInvoices = React.useMemo(() => invoices.filter((i) => i.orgId === org.id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)), [invoices, org.id]);
  const refs = React.useMemo<EntityRef[]>(
    () => [...myDeals.map((d) => ({ entity: "deals" as const, id: d.id })), ...myQuotes.map((q) => ({ entity: "quotes" as const, id: q.id })), ...myInvoices.map((i) => ({ entity: "invoices" as const, id: i.id }))],
    [myDeals, myQuotes, myInvoices],
  );

  const kpis = React.useMemo(() => {
    const valid = myInvoices.filter((i) => i.status !== "annulee" && i.status !== "brouillon");
    const billed = valid.reduce((s, i) => s + invoiceTotal(i).ttc, 0);
    const paid = valid.reduce((s, i) => s + i.paidCents, 0);
    const due = valid.filter((i) => i.kind !== "avoir").reduce((s, i) => s + Math.max(0, invoiceBalance(i)), 0);
    const open = myDeals.filter((d) => d.stage !== "gagne" && d.stage !== "perdu");
    return { billed, paid, due, openAmount: open.reduce((s, d) => s + d.amountCents, 0), openCount: open.length };
  }, [myInvoices, myDeals]);

  const mainContact = people.find((p) => p.lifecycle === "client") ?? people[0];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Organisations", href: "/organisations" }, { label: org.name }]}
        eyebrow={labelOf(ORG_TYPES, org.type)}
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {org.name}
            <StatusBadge options={ORG_STATUSES} value={org.status} />
          </span>
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
            {org.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {org.city}
              </span>
            ) : null}
            {org.website ? (
              <a href={org.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-accent-text">
                <Globe className="size-3.5" aria-hidden="true" />
                {org.website.replace(/^https?:\/\//, "")}
              </a>
            ) : null}
            {org.sector ? <span>{org.sector}</span> : null}
            <span className="inline-flex items-center gap-1.5">
              Compte : <UserChip id={org.ownerId} />
            </span>
          </span>
        }
        actions={
          <>
            {editable ? (
              <StatusSelect
                options={ORG_STATUSES}
                value={org.status}
                label="Statut de l'organisation"
                className="h-8"
                onChange={(v) => {
                  update("organizations", org.id, { status: v }, { log: `Statut : ${labelOf(ORG_STATUSES, org.status)} → ${labelOf(ORG_STATUSES, v)}`, kind: "statut" });
                  toast({ title: "Statut mis à jour", description: labelOf(ORG_STATUSES, v) });
                }}
              />
            ) : null}
            {canEdit("emails") && (mainContact || org.billingEmail) ? (
              <Button size="sm" variant="secondary" onClick={() => setComposing(true)}>
                <Mail /> Email
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={() => setTasking(true)} disabled={!canEdit("relances")}>
              <CheckSquare /> Tâche
            </Button>
            {editable ? (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <Pencil /> Modifier
              </Button>
            ) : null}
            {canEdit("pipeline") ? (
              <Button size="sm" onClick={() => setDealOpen(true)}>
                <Plus /> Opportunité
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">CA facturé (TTC)</p>
          <p className="tabular mt-1 text-xl font-semibold text-foreground">{money(kpis.billed)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Encaissé</p>
          <p className="tabular mt-1 text-xl font-semibold text-success-text">{money(kpis.paid)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Restant dû</p>
          <p className={`tabular mt-1 text-xl font-semibold ${kpis.due ? "text-warning-text" : "text-foreground"}`}>{money(kpis.due)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pipeline ouvert</p>
          <p className="tabular mt-1 text-xl font-semibold text-foreground">{money(kpis.openAmount)}</p>
          <p className="text-xs text-muted-foreground">
            {kpis.openCount} opportunité{kpis.openCount > 1 ? "s" : ""}
          </p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Block title="Informations légales & facturation" icon={Receipt}>
            <DescriptionList
              columns={2}
              items={[
                { label: "SIRET", value: org.siret ? <span className="font-mono text-xs">{org.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4")}</span> : <span className="text-warning-text">À compléter (facturation)</span> },
                { label: "N° TVA intracommunautaire", value: org.vatNumber ? <span className="font-mono text-xs">{org.vatNumber}</span> : "—" },
                { label: "Email de facturation", value: org.billingEmail ? <a href={`mailto:${org.billingEmail}`} className="break-all hover:text-accent-text hover:underline">{org.billingEmail}</a> : "—" },
                { label: "Site web", value: org.website ? <a href={org.website} target="_blank" rel="noreferrer" className="break-all hover:text-accent-text hover:underline">{org.website}</a> : "—" },
                { label: "Adresse", value: org.address ? <span className="whitespace-pre-line">{org.address}</span> : "—" },
                { label: "Taille", value: org.size ? `${org.size} salariés` : "—" },
                { label: "Pays", value: org.country ?? "—" },
                { label: "Créée le", value: date(org.createdAt) },
              ]}
            />
            {org.tags.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {org.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            ) : null}
            {org.notes ? <p className="mt-3 whitespace-pre-wrap rounded-md bg-surface-2 px-3 py-2 text-sm text-foreground">{org.notes}</p> : null}
          </Block>

          <Block title="Contacts" icon={Users} count={people.length}>
            {people.length ? (
              <ul className="divide-y divide-border">
                {people.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                    <Avatar name={contactName(c)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/contacts/${c.id}`} className="text-sm font-medium text-foreground hover:text-accent-text hover:underline">
                        {contactName(c)}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.jobTitle ? `${c.jobTitle} · ` : ""}
                        {c.email}
                      </p>
                    </div>
                    <StatusBadge options={LIFECYCLES} value={c.lifecycle} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun contact rattaché. Rattachez-en depuis une fiche contact (champ Organisation).</p>
            )}
          </Block>

          <Block title="Opportunités" icon={Briefcase} count={myDeals.length}>
            {myDeals.length ? (
              <ul className="divide-y divide-border">
                {myDeals.map((d) => {
                  const late = d.expectedCloseAt && d.stage !== "gagne" && d.stage !== "perdu" && new Date(d.expectedCloseAt).getTime() < now;
                  return (
                    <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                      <Link href={`/pipeline?deal=${d.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:text-accent-text hover:underline">
                        {d.title}
                      </Link>
                      <StatusBadge options={DEAL_STAGES} value={d.stage} />
                      <span className="tabular text-sm text-foreground">{money(d.amountCents)}</span>
                      <span className={`text-xs ${late ? "font-medium text-danger-text" : "text-muted-foreground"}`}>{d.closedAt ? `clôturée le ${date(d.closedAt)}` : d.expectedCloseAt ? `clôture ${date(d.expectedCloseAt)}` : "sans date"}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune opportunité pour ce compte.</p>
            )}
          </Block>

          <Block title="Sessions B2B" icon={CalendarDays} count={sessions.length}>
            {sessions.length ? (
              <ul className="divide-y divide-border">
                {sessions.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                    <Link href={`/sessions/${e.id}`} className="min-w-0 flex-1 text-sm text-foreground hover:text-accent-text hover:underline">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{e.code}</span>
                      {e.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">{dateRange(e.startAt, e.endAt)}</span>
                    <StatusBadge options={EVENT_STATUSES} value={e.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune session organisée pour cette organisation (Startup Village, événement entreprise…).</p>
            )}
          </Block>

          <Block title="Devis & factures" icon={FileText} count={myQuotes.length + myInvoices.length}>
            {myQuotes.length || myInvoices.length ? (
              <ul className="divide-y divide-border">
                {myQuotes.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                    <Link href={`/facturation/devis/${q.id}`} className="font-mono text-xs font-medium text-foreground hover:text-accent-text hover:underline">
                      {q.number}
                    </Link>
                    <span className="text-xs text-muted-foreground">Devis · {date(q.issuedAt)}</span>
                    <StatusBadge options={QUOTE_STATUSES} value={q.status} />
                    <span className="tabular ml-auto text-sm">{money(totals(q.lines).ttc)}</span>
                  </li>
                ))}
                {myInvoices.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                    <Link href={`/facturation/factures/${i.id}`} className="font-mono text-xs font-medium text-foreground hover:text-accent-text hover:underline">
                      {i.number}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {labelOf(INVOICE_KINDS, i.kind)} · échéance {date(i.dueAt)}
                    </span>
                    <StatusBadge options={INVOICE_STATUSES} value={effectiveInvoiceStatus(i, now)} />
                    <span className="tabular ml-auto text-sm">{money(invoiceTotal(i).ttc)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun devis ni facture.</p>
            )}
          </Block>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Activité</CardTitle>
            <span className="text-xs text-muted-foreground">mise à jour {relative(org.updatedAt, now)}</span>
          </CardHeader>
          <CardContent>
            <ActivityTimeline entity="organizations" id={org.id} extra={refs} limit={40} />
          </CardContent>
        </Card>
      </div>

      <OrgFormModal open={editing} onClose={() => setEditing(false)} organization={org} />
      <DealFormModal open={dealOpen} onClose={() => setDealOpen(false)} orgId={org.id} contactId={mainContact?.id} />
      <TaskFormModal open={tasking} onClose={() => setTasking(false)} related={{ entity: "organizations", id: org.id }} defaultTitle={`Relancer ${org.name}`} />
      <EmailComposer
        open={composing}
        onClose={() => setComposing(false)}
        title={`Écrire à ${org.name}`}
        recipientSearch
        to={mainContact?.email ?? org.billingEmail ?? ""}
        contactId={mainContact?.id}
        related={{ entity: "organizations", id: org.id }}
        vars={{ organisation: org.name }}
      />
    </div>
  );
}
