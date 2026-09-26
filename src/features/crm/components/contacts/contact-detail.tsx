"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity as ActivityIcon,
  CheckSquare,
  FileText,
  Inbox,
  ExternalLink,
  ListTodo,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Receipt,
  Rocket,
  ShieldCheck,
  ShieldX,
  UserRoundX,
} from "lucide-react";
import { useCrm } from "@/lib/store";
import { useNow, useSession } from "@/lib/hooks";
import {
  APPLICATION_STATUSES,
  DEAL_STAGES,
  EMAIL_STATUSES,
  INVOICE_KINDS,
  INVOICE_STATUSES,
  labelOf,
  LEAD_SOURCES,
  LIFECYCLES,
  PAYMENT_METHODS,
  PROJECT_STAGES,
  SUBMISSION_STATUSES,
  SUBMISSION_TYPES,
} from "@/lib/domain/constants";
import { contactName, effectiveInvoiceStatus, invoiceBalance, invoiceTotal, isTaskOverdue } from "@/lib/domain/selectors";
import type { Contact, ContactLifecycle, EntityRef, LeadSource } from "@/lib/domain/types";
import { date, dateTime, money, relative } from "@/lib/format";
import { normalizeEmail } from "@/lib/utils";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DescriptionList,
  EmptyState,
  LinkButton,
  PageHeader,
  ProgressRing,
  StatusBadge,
  Tabs,
  useToast,
} from "@/components/ui";
import { ActivityTimeline } from "@/components/shared/timeline";
import { OrgLink, SessionLink, UserChip } from "@/components/shared/entity-links";
import { StatusSelect } from "@/components/shared/status-select";
import { ContactFormModal } from "../shared/contact-form-modal";
import { EmailComposer } from "../shared/email-composer";
import { useOrgOptions, useUserOptions } from "../shared/hooks";
import { InlineField } from "../shared/inline-field";
import { TagEditor } from "../shared/tags";
import { TaskFormModal } from "../shared/task-form-modal";
import { TaskItem } from "../shared/task-item";
import { decodeEntities } from "../../lib/format";

type Tab = "apercu" | "candidatures" | "projets" | "factures" | "demandes" | "emails" | "taches" | "activite";

export function ContactDetail({ id, initialTab }: { id: string; initialTab?: string }) {
  const contact = useCrm((s) => s.contacts.find((c) => c.id === id));
  if (!contact) {
    return (
      <div>
        <PageHeader title="Contact introuvable" breadcrumbs={[{ label: "Contacts", href: "/contacts" }, { label: "Introuvable" }]} />
        <EmptyState icon={UserRoundX} title="Ce contact n'existe pas ou a été fusionné" description="Il a peut-être été fusionné avec un doublon ou supprimé." action={<LinkButton href="/contacts" variant="secondary">Retour aux contacts</LinkButton>} />
      </div>
    );
  }
  return <ContactView contact={contact} initialTab={initialTab} />;
}

function ContactView({ contact, initialTab }: { contact: Contact; initialTab?: string }) {
  const now = useNow();
  const toast = useToast();
  const { canEdit } = useSession();
  const editable = canEdit("contacts");
  const update = useCrm((s) => s.update);
  const applications = useCrm((s) => s.applications);
  const projects = useCrm((s) => s.projects);
  const invoices = useCrm((s) => s.invoices);
  const payments = useCrm((s) => s.payments);
  const submissions = useCrm((s) => s.submissions);
  const emails = useCrm((s) => s.emails);
  const tasks = useCrm((s) => s.tasks);
  const deals = useCrm((s) => s.deals);
  const organizations = useCrm((s) => s.organizations);
  const allContacts = useCrm((s) => s.contacts);
  const userOptions = useUserOptions();
  const orgOptions = useOrgOptions();

  const [tab, setTab] = React.useState<Tab>((["apercu", "candidatures", "projets", "factures", "demandes", "emails", "taches", "activite"] as Tab[]).includes(initialTab as Tab) ? (initialTab as Tab) : "apercu");
  const [editing, setEditing] = React.useState(false);
  const [composing, setComposing] = React.useState(false);
  const [tasking, setTasking] = React.useState(false);

  const name = contactName(contact);
  const org = contact.orgId ? organizations.find((o) => o.id === contact.orgId) : undefined;
  const email = normalizeEmail(contact.email);

  const myApps = React.useMemo(() => applications.filter((a) => a.contactId === contact.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [applications, contact.id]);
  const myProjects = React.useMemo(() => projects.filter((p) => p.founderIds.includes(contact.id)), [projects, contact.id]);
  const myInvoices = React.useMemo(() => {
    const appIds = new Set(myApps.map((a) => a.id));
    return invoices.filter((i) => i.contactId === contact.id || (i.applicationId && appIds.has(i.applicationId))).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }, [invoices, myApps, contact.id]);
  const myPayments = React.useMemo(() => {
    const ids = new Set(myInvoices.map((i) => i.id));
    return payments.filter((p) => ids.has(p.invoiceId)).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }, [payments, myInvoices]);
  const mySubs = React.useMemo(() => submissions.filter((s) => s.contactId === contact.id || normalizeEmail(s.email) === email).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)), [submissions, contact.id, email]);
  const myDeals = React.useMemo(() => deals.filter((d) => d.contactId === contact.id), [deals, contact.id]);
  const refs = React.useMemo<EntityRef[]>(
    () => [
      ...myApps.map((a) => ({ entity: "applications" as const, id: a.id })),
      ...mySubs.map((s) => ({ entity: "submissions" as const, id: s.id })),
      ...myDeals.map((d) => ({ entity: "deals" as const, id: d.id })),
      ...myInvoices.map((i) => ({ entity: "invoices" as const, id: i.id })),
    ],
    [myApps, mySubs, myDeals, myInvoices],
  );
  const refKeys = React.useMemo(() => new Set(refs.map((r) => `${r.entity}:${r.id}`)), [refs]);
  const myEmails = React.useMemo(
    () =>
      emails
        .filter((m) => normalizeEmail(m.to) === email || (m.related && ((m.related.entity === "contacts" && m.related.id === contact.id) || refKeys.has(`${m.related.entity}:${m.related.id}`))))
        .sort((a, b) => (b.sentAt ?? b.scheduledAt ?? b.createdAt).localeCompare(a.sentAt ?? a.scheduledAt ?? a.createdAt)),
    [emails, email, contact.id, refKeys],
  );
  const myTasks = React.useMemo(
    () =>
      tasks
        .filter((t) => t.related && ((t.related.entity === "contacts" && t.related.id === contact.id) || refKeys.has(`${t.related.entity}:${t.related.id}`)))
        .sort((a, b) => Number(Boolean(a.doneAt)) - Number(Boolean(b.doneAt)) || a.dueAt.localeCompare(b.dueAt)),
    [tasks, contact.id, refKeys],
  );

  const money3 = React.useMemo(() => {
    let billed = 0;
    let paid = 0;
    let due = 0;
    myInvoices.forEach((i) => {
      if (i.status === "annulee" || i.status === "brouillon") return;
      billed += invoiceTotal(i).ttc;
      paid += i.paidCents;
      if (i.kind !== "avoir") due += Math.max(0, invoiceBalance(i));
    });
    return { billed, paid, due };
  }, [myInvoices]);

  const openTasks = myTasks.filter((t) => !t.doneAt);
  const nextTask = openTasks[0];
  const lateTasks = openTasks.filter((t) => isTaskOverdue(t, now)).length;
  const allTags = React.useMemo(() => Array.from(new Set(allContacts.flatMap((c) => c.tags))).sort(), [allContacts]);

  const save = (patch: Partial<Contact>, label: string) => {
    update("contacts", contact.id, patch, { log: label });
    toast({ title: "Fiche mise à jour", description: label });
  };

  const changeLifecycle = (lc: ContactLifecycle) => {
    update("contacts", contact.id, { lifecycle: lc }, { log: `Cycle de vie : ${labelOf(LIFECYCLES, contact.lifecycle)} → ${labelOf(LIFECYCLES, lc)}`, kind: "statut" });
    toast({ title: "Cycle de vie mis à jour", description: labelOf(LIFECYCLES, lc) });
  };

  const tabs = [
    { value: "apercu" as const, label: "Aperçu" },
    { value: "candidatures" as const, label: "Candidatures", count: myApps.length, icon: FileText },
    { value: "projets" as const, label: "Projets", count: myProjects.length, icon: Rocket },
    { value: "factures" as const, label: "Factures & paiements", count: myInvoices.length, icon: Receipt },
    { value: "demandes" as const, label: "Demandes", count: mySubs.length, icon: Inbox },
    { value: "emails" as const, label: "Emails", count: myEmails.length, icon: Mail },
    { value: "taches" as const, label: "Tâches", count: openTasks.length, icon: ListTodo },
    { value: "activite" as const, label: "Activité", icon: ActivityIcon },
  ];

  const vars = { prenom: contact.firstName, nom: contact.lastName, organisation: org?.name };

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: "Contacts", href: "/contacts" }, { label: name }]} title={<span className="sr-only">{name}</span>} className="mb-3" />

      <Card className="mb-5">
        <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 gap-4">
            <Avatar name={name} size="lg" className="size-14 text-base" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl" aria-hidden="true">{name}</p>
                <StatusBadge options={LIFECYCLES} value={contact.lifecycle} />
                {contact.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
              {contact.jobTitle || org ? (
                <p className="text-sm text-muted-foreground">
                  {contact.jobTitle}
                  {contact.jobTitle && org ? " · " : null}
                  {org ? <OrgLink id={org.id} /> : null}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                <a href={`mailto:${contact.email}`} className="inline-flex min-w-0 items-center gap-1.5 text-foreground hover:text-accent-text">
                  <Mail className="size-4 text-faint" aria-hidden="true" />
                  <span className="break-all">{contact.email}</span>
                </a>
                {contact.phone ? (
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 text-foreground hover:text-accent-text">
                    <Phone className="size-4 text-faint" aria-hidden="true" />
                    {contact.phone}
                  </a>
                ) : null}
                {contact.city ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-4 text-faint" aria-hidden="true" />
                    {contact.city}
                    {contact.country && contact.country !== "France" ? `, ${contact.country}` : ""}
                  </span>
                ) : null}
                {contact.linkedin ? (
                  <a href={contact.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-foreground hover:text-accent-text">
                    <ExternalLink className="size-4 text-faint" aria-hidden="true" />
                    LinkedIn
                  </a>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <Badge tone={contact.consent.gdpr ? "success" : "neutral"} title={contact.consent.source}>
                  {contact.consent.gdpr ? <ShieldCheck className="size-3" aria-hidden="true" /> : <ShieldX className="size-3" aria-hidden="true" />}
                  RGPD {contact.consent.gdpr ? "accepté" : "non consenti"}
                </Badge>
                <Badge tone={contact.consent.marketing && !contact.consent.unsubscribedAt ? "success" : "neutral"}>
                  {contact.consent.marketing && !contact.consent.unsubscribedAt ? <ShieldCheck className="size-3" aria-hidden="true" /> : <ShieldX className="size-3" aria-hidden="true" />}
                  {contact.consent.unsubscribedAt
                    ? `Désinscrit le ${date(contact.consent.unsubscribedAt)}`
                    : contact.consent.marketing
                      ? `Opt-in marketing${contact.consent.marketingAt ? ` le ${date(contact.consent.marketingAt)}` : ""}`
                      : "Pas d'opt-in marketing"}
                </Badge>
                <span className="text-muted-foreground">Propriétaire :</span>
                <UserChip id={contact.ownerId} />
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center gap-4 lg:flex-col lg:items-end">
            <div className="flex items-center gap-3">
              <ProgressRing value={contact.score} size={56} stroke={5} label={String(contact.score)} sublabel="/100" />
              <div className="text-xs text-muted-foreground">
                Score
                <br />
                engagement + fit
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {canEdit("emails") ? (
                <Button size="sm" onClick={() => setComposing(true)}>
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
              {editable ? <StatusSelect options={LIFECYCLES} value={contact.lifecycle} onChange={changeLifecycle} label="Changer le cycle de vie" className="h-8" /> : null}
            </div>
          </div>
        </div>
      </Card>

      <Tabs value={tab} onChange={setTab} tabs={tabs} className="mb-5" />

      {tab === "apercu" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Informations</CardTitle>
              <span className="text-xs text-muted-foreground">Modifiables en place</span>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <InlineField label="Téléphone" kind="tel" value={contact.phone ?? ""} disabled={!editable} onSave={(v) => save({ phone: v || undefined }, "Téléphone modifié")} />
              <InlineField label="Fonction" value={contact.jobTitle ?? ""} disabled={!editable} onSave={(v) => save({ jobTitle: v || undefined }, "Fonction modifiée")} />
              <InlineField label="Ville" value={contact.city ?? ""} disabled={!editable} onSave={(v) => save({ city: v || undefined }, "Ville modifiée")} />
              <InlineField label="Pays" value={contact.country ?? ""} disabled={!editable} onSave={(v) => save({ country: v || undefined }, "Pays modifié")} />
              <InlineField
                label="Organisation"
                kind="select"
                value={contact.orgId ?? ""}
                options={orgOptions}
                placeholder="Aucune"
                display={org ? <OrgLink id={org.id} /> : undefined}
                disabled={!editable}
                onSave={(v) => save({ orgId: v || undefined }, `Organisation : ${orgOptions.find((o) => o.value === v)?.label ?? "aucune"}`)}
              />
              <InlineField
                label="Propriétaire"
                kind="select"
                value={contact.ownerId ?? ""}
                options={userOptions}
                placeholder="Non assigné"
                display={<UserChip id={contact.ownerId} />}
                disabled={!editable}
                onSave={(v) => save({ ownerId: v || undefined }, `Propriétaire : ${userOptions.find((o) => o.value === v)?.label ?? "aucun"}`)}
              />
              <InlineField
                label="LinkedIn"
                kind="url"
                value={contact.linkedin ?? ""}
                disabled={!editable}
                validate={(v) => (v && !/^https?:\/\//.test(v) ? "L'URL doit commencer par https://" : undefined)}
                display={contact.linkedin ? <a href={contact.linkedin} target="_blank" rel="noreferrer" className="break-all hover:text-accent-text hover:underline">{contact.linkedin}</a> : undefined}
                onSave={(v) => save({ linkedin: v || undefined }, "LinkedIn modifié")}
              />
              <InlineField
                label="Source"
                kind="select"
                value={contact.source}
                options={LEAD_SOURCES}
                display={labelOf(LEAD_SOURCES, contact.source)}
                disabled={!editable}
                onSave={(v) => v && save({ source: v as LeadSource }, `Source : ${labelOf(LEAD_SOURCES, v as LeadSource)}`)}
              />
              <div className="sm:col-span-2">
                <span className="text-xs text-muted-foreground">Tags</span>
                <div className="mt-1">
                  <TagEditor value={contact.tags} disabled={!editable} suggestions={allTags} onChange={(tags) => update("contacts", contact.id, { tags }, { log: `Tags : ${tags.join(", ") || "aucun"}` })} />
                </div>
              </div>
              <InlineField className="sm:col-span-2" label="Notes" kind="textarea" value={contact.notes ?? ""} placeholder="Contexte, besoins, prochaines étapes…" disabled={!editable} onSave={(v) => save({ notes: v || undefined }, "Notes modifiées")} />
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Résumé</CardTitle>
              </CardHeader>
              <CardContent>
                <DescriptionList
                  items={[
                    { label: "Candidatures", value: myApps.length ? `${myApps.length} — dernière : ${labelOf(APPLICATION_STATUSES, myApps[0].status)}` : "Aucune" },
                    { label: "Opportunités", value: myDeals.length ? myDeals.map((d) => `${d.title} (${labelOf(DEAL_STAGES, d.stage)})`).join(" · ") : "Aucune" },
                    { label: "Facturé / restant dû", value: myInvoices.length ? `${money(money3.billed)} / ${money(money3.due)}` : "—" },
                    { label: "Dernier contact", value: contact.lastContactAt ? `${relative(contact.lastContactAt, now)} (${date(contact.lastContactAt)})` : "Jamais" },
                    {
                      label: "Prochaine tâche",
                      value: nextTask ? (
                        <span className={isTaskOverdue(nextTask, now) ? "text-danger-text" : undefined}>
                          {nextTask.title} — {relative(nextTask.dueAt, now)}
                          {lateTasks > 1 ? ` (+${lateTasks - 1} en retard)` : ""}
                        </span>
                      ) : (
                        "Aucune"
                      ),
                    },
                  ]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Provenance</CardTitle>
              </CardHeader>
              <CardContent>
                <DescriptionList
                  items={[
                    { label: "Source", value: labelOf(LEAD_SOURCES, contact.source) },
                    { label: "UTM source / medium", value: contact.utm?.source || contact.utm?.medium ? `${contact.utm?.source ?? "—"} / ${contact.utm?.medium ?? "—"}` : "—" },
                    { label: "Campagne", value: contact.utm?.campaign ?? "—" },
                    { label: "Page de provenance", value: contact.utm?.referrer ? <span className="break-all">{contact.utm.referrer}</span> : "—" },
                    { label: "Preuve de consentement", value: contact.consent.source ?? "—" },
                    { label: "Fiche créée le", value: dateTime(contact.createdAt) },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "candidatures" ? (
        myApps.length ? (
          <Card>
            <ul className="divide-y divide-border">
              {myApps.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3">
                  <Link href={`/candidatures/${a.id}`} className="font-medium text-foreground hover:text-accent-text hover:underline">
                    Candidature #{a.number}
                  </Link>
                  <SessionLink id={a.eventId} />
                  <StatusBadge options={APPLICATION_STATUSES} value={a.status} />
                  <span className="text-xs text-muted-foreground">déposée le {date(a.submittedAt)}</span>
                  <span className="text-xs text-muted-foreground">score {a.score}/100</span>
                  <span className="tabular ml-auto text-xs text-muted-foreground">
                    {a.amountDueCents ? `${money(a.amountPaidCents)} payés / ${money(a.amountDueCents)}` : "Pas encore facturée"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <EmptyState icon={FileText} title="Aucune candidature" description="Ce contact n'a pas encore candidaté à une session." />
        )
      ) : null}

      {tab === "projets" ? (
        myProjects.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {myProjects.map((p) => (
              <Card key={p.id} interactive className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/projets/${p.id}`} className="font-medium text-foreground hover:text-accent-text hover:underline">
                    {p.name}
                  </Link>
                  <StatusBadge options={PROJECT_STAGES} value={p.stage} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                <p className="mt-2 text-xs text-faint">
                  {p.sector} · mis à jour {relative(p.lastUpdateAt, now)}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={Rocket} title="Aucun projet" description="Aucun projet n'est rattaché à ce contact en tant que fondateur." />
        )
      ) : null}

      {tab === "factures" ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Total facturé (TTC)</p>
              <p className="tabular mt-1 text-xl font-semibold text-foreground">{money(money3.billed)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Payé</p>
              <p className="tabular mt-1 text-xl font-semibold text-success-text">{money(money3.paid)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Restant dû</p>
              <p className={`tabular mt-1 text-xl font-semibold ${money3.due ? "text-warning-text" : "text-foreground"}`}>{money(money3.due)}</p>
            </Card>
          </div>
          {myInvoices.length ? (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Facture</th>
                    <th className="px-4 py-2 font-semibold">Type</th>
                    <th className="px-4 py-2 font-semibold">Statut</th>
                    <th className="px-4 py-2 font-semibold">Échéance</th>
                    <th className="px-4 py-2 text-right font-semibold">TTC</th>
                    <th className="px-4 py-2 text-right font-semibold">Restant</th>
                  </tr>
                </thead>
                <tbody>
                  {myInvoices.map((i) => (
                    <tr key={i.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <Link href={`/facturation/factures/${i.id}`} className="font-mono text-xs font-medium text-foreground hover:text-accent-text hover:underline">
                          {i.number}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{labelOf(INVOICE_KINDS, i.kind)}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge options={INVOICE_STATUSES} value={effectiveInvoiceStatus(i, now)} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{date(i.dueAt)}</td>
                      <td className="tabular px-4 py-2.5 text-right">{money(invoiceTotal(i).ttc)}</td>
                      <td className="tabular px-4 py-2.5 text-right">{money(Math.max(0, invoiceBalance(i)))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <EmptyState icon={Receipt} title="Aucune facture" description="Les factures d'acompte et de solde apparaîtront ici dès l'acceptation d'une candidature." />
          )}
          {myPayments.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Paiements reçus</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <ul className="divide-y divide-border">
                  {myPayments.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
                      <span className="tabular font-medium text-foreground">{money(p.amountCents, true)}</span>
                      <span className="text-xs text-muted-foreground">{labelOf(PAYMENT_METHODS, p.method)}</span>
                      <span className="font-mono text-[11px] text-faint">{p.reference}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{date(p.receivedAt)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "demandes" ? (
        mySubs.length ? (
          <Card>
            <ul className="divide-y divide-border">
              {mySubs.map((s) => (
                <li key={s.id}>
                  <Link href={`/demandes?id=${s.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-surface-2/60">
                    <StatusBadge options={SUBMISSION_TYPES} value={s.type} />
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{s.subject ?? s.message ?? "Formulaire du site"}</span>
                    <StatusBadge options={SUBMISSION_STATUSES} value={s.status} />
                    <span className="text-xs text-muted-foreground">{relative(s.receivedAt, now)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <EmptyState icon={Inbox} title="Aucune demande" description="Aucun formulaire du site n'a été soumis avec cet email." />
        )
      ) : null}

      {tab === "emails" ? (
        myEmails.length ? (
          <Card>
            <ul className="divide-y divide-border">
              {myEmails.map((m) => (
                <li key={m.id}>
                  <Link href={`/emails?onglet=journal&id=${m.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-surface-2/60">
                    <Mail className="size-4 text-faint" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{decodeEntities(m.subject)}</span>
                    <StatusBadge options={EMAIL_STATUSES} value={m.status} />
                    <span className="text-xs text-muted-foreground">{relative(m.sentAt ?? m.scheduledAt ?? m.createdAt, now)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <EmptyState icon={Mail} title="Aucun email" description="Aucun email envoyé à ce contact depuis le CRM." action={canEdit("emails") ? <Button size="sm" onClick={() => setComposing(true)}>Écrire un email</Button> : undefined} />
        )
      ) : null}

      {tab === "taches" ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setTasking(true)} disabled={!canEdit("relances")}>
              <CheckSquare /> Nouvelle tâche
            </Button>
          </div>
          {myTasks.length ? (
            <Card>
              <ul className="divide-y divide-border">
                {myTasks.map((t) => (
                  <TaskItem key={t.id} task={t} now={now} editable={canEdit("relances")} />
                ))}
              </ul>
            </Card>
          ) : (
            <EmptyState icon={ListTodo} title="Aucune tâche" description="Planifiez une relance pour ne pas perdre le fil." />
          )}
        </div>
      ) : null}

      {tab === "activite" ? (
        <Card>
          <CardContent>
            <ActivityTimeline entity="contacts" id={contact.id} extra={refs} limit={60} />
          </CardContent>
        </Card>
      ) : null}

      <ContactFormModal open={editing} onClose={() => setEditing(false)} contact={contact} />
      <EmailComposer open={composing} onClose={() => setComposing(false)} title={`Écrire à ${name}`} to={contact.email} contactId={contact.id} vars={vars} />
      <TaskFormModal open={tasking} onClose={() => setTasking(false)} related={{ entity: "contacts", id: contact.id }} defaultTitle={`Relancer ${name}`} />
    </div>
  );
}
