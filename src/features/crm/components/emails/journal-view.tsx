"use client";

import * as React from "react";
import { AlertTriangle, CalendarClock, MailOpen, MousePointerClick, RotateCcw, Send, XCircle } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useNow, useSession } from "@/lib/hooks";
import { sendEmail } from "@/lib/domain/actions";
import { EMAIL_STATUSES, labelOf } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { EmailMessage } from "@/lib/domain/types";
import { dateTime, percent, relative } from "@/lib/format";
import { normalizeEmail } from "@/lib/utils";
import { Button, DataTable, DescriptionList, Drawer, StatCard, StatusBadge, useToast, type Column, type FilterDef } from "@/components/ui";
import { ContactLink } from "@/components/shared/entity-links";
import { EntityRefLink } from "../shared/entity-ref-link";
import { DAY, decodeEntities } from "../../lib/format";

const DELIVERED = new Set<EmailMessage["status"]>(["envoye", "ouvert", "clique"]);
const when = (m: EmailMessage) => m.sentAt ?? m.scheduledAt ?? m.createdAt;

export function JournalView({ initialId }: { initialId?: string }) {
  const emails = useCrm((s) => s.emails);
  const templates = useCrm((s) => s.emailTemplates);
  const contacts = useCrm((s) => s.contacts);
  const now = useNow();
  const [openId, setOpenId] = React.useState<string | undefined>(initialId);

  const tplById = React.useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);
  const contactByEmail = React.useMemo(() => new Map(contacts.map((c) => [normalizeEmail(c.email), c])), [contacts]);

  const stats = React.useMemo(() => {
    const recent = emails.filter((m) => now - new Date(when(m)).getTime() < 30 * DAY);
    const delivered = recent.filter((m) => DELIVERED.has(m.status));
    const opened = delivered.filter((m) => m.status === "ouvert" || m.status === "clique").length;
    const clicked = delivered.filter((m) => m.status === "clique").length;
    const errors = recent.filter((m) => m.status === "erreur").length;
    const scheduled = emails.filter((m) => m.status === "programme").length;
    return { sent: delivered.length, opened, clicked, errors, scheduled, attempts: delivered.length + errors };
  }, [emails, now]);

  const columns = React.useMemo<Column<EmailMessage>[]>(
    () => [
      {
        key: "to",
        header: "Destinataire",
        sort: (m) => m.to,
        render: (m) => {
          const c = contactByEmail.get(normalizeEmail(m.to));
          return c ? <ContactLink id={c.id} withEmail className="block max-w-56" /> : <span className="block max-w-56 truncate text-sm">{m.to}</span>;
        },
      },
      {
        key: "subject",
        header: "Objet",
        sort: (m) => m.subject,
        csv: (m) => decodeEntities(m.subject),
        render: (m) => (
          <div className="min-w-0 max-w-80">
            <p className="truncate text-sm text-foreground">{decodeEntities(m.subject)}</p>
            {m.templateId ? <p className="truncate text-xs text-muted-foreground">{tplById.get(m.templateId)?.name ?? "Template supprimé"}</p> : null}
          </div>
        ),
      },
      { key: "status", header: "Statut", sort: (m) => labelOf(EMAIL_STATUSES, m.status), render: (m) => <StatusBadge options={EMAIL_STATUSES} value={m.status} /> },
      {
        key: "date",
        header: "Date",
        hideBelow: "sm",
        sort: (m) => when(m),
        csv: (m) => dateTime(when(m)),
        render: (m) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground" title={dateTime(when(m))}>
            {m.status === "programme" ? "prévu " : ""}
            {relative(when(m), now)}
          </span>
        ),
      },
      { key: "related", header: "Lié à", hideBelow: "lg", render: (m) => <EntityRefLink value={m.related} className="max-w-56" /> },
    ],
    [contactByEmail, tplById, now],
  );

  const filters = React.useMemo<FilterDef<EmailMessage>[]>(
    () => [
      { key: "status", label: "Tous les statuts", options: EMAIL_STATUSES, predicate: (m, v) => m.status === v },
      {
        key: "template",
        label: "Tous les templates",
        options: [{ value: "__none", label: "Sans template" }, ...[...templates].sort((a, b) => a.name.localeCompare(b.name, "fr")).map((t) => ({ value: t.id, label: t.name }))],
        predicate: (m, v) => (v === "__none" ? !m.templateId : m.templateId === v),
      },
    ],
    [templates],
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Envoyés (30 j)" value={stats.sent} icon={Send} hint={stats.scheduled ? `+ ${stats.scheduled} programmé${stats.scheduled > 1 ? "s" : ""}` : "Aucun envoi programmé"} />
        <StatCard label="Taux d'ouverture" value={percent(stats.sent ? (stats.opened / stats.sent) * 100 : 0)} icon={MailOpen} hint={`${stats.opened} ouverts sur ${stats.sent}`} />
        <StatCard label="Taux de clic" value={percent(stats.sent ? (stats.clicked / stats.sent) * 100 : 0)} icon={MousePointerClick} hint={`${stats.clicked} clics (lien de paiement, candidature…)`} />
        <StatCard
          label="Erreurs d'envoi (30 j)"
          value={<span className={stats.errors ? "text-danger-text" : undefined}>{stats.errors}</span>}
          icon={AlertTriangle}
          hint={stats.attempts ? `${percent((stats.errors / stats.attempts) * 100, 1)} des tentatives` : "—"}
        />
      </div>
      <DataTable
        rows={emails}
        columns={columns}
        rowKey={(m) => m.id}
        searchable={(m) => `${m.to} ${decodeEntities(m.subject)}`}
        searchPlaceholder="Destinataire, objet…"
        filters={filters}
        exportName="journal-emails"
        onRowClick={(m) => setOpenId(m.id)}
        initialSort={{ key: "date", dir: "desc" }}
        emptyTitle="Aucun email"
        emptyDescription="Les emails envoyés par le CRM (accusés, relances, factures…) apparaîtront ici."
        rowClassName={(m) => (m.status === "erreur" ? "bg-danger-soft/40" : undefined)}
      />
      <EmailPreviewDrawer id={openId} onClose={() => setOpenId(undefined)} />
    </div>
  );
}

function EmailPreviewDrawer({ id, onClose }: { id?: string; onClose: () => void }) {
  const msg = useCrm((s) => (id ? s.emails.find((m) => m.id === id) : undefined));
  const templates = useCrm((s) => s.emailTemplates);
  const sequences = useCrm((s) => s.sequences);
  const contacts = useCrm((s) => s.contacts);
  const update = useCrm((s) => s.update);
  const toast = useToast();
  const { canEdit } = useSession();
  if (!id || !msg) return null;
  const editable = canEdit("emails");
  const tpl = msg.templateId ? templates.find((t) => t.id === msg.templateId) : undefined;
  const seq = msg.sequenceId ? sequences.find((s) => s.id === msg.sequenceId) : undefined;
  const contact = contacts.find((c) => normalizeEmail(c.email) === normalizeEmail(msg.to));

  const cancel = () => {
    update("emails", msg.id, { status: "brouillon", scheduledAt: undefined });
    toast({ title: "Envoi programmé annulé", description: "L'email repasse en brouillon.", tone: "info" });
  };
  const sendNow = () => {
    update("emails", msg.id, { status: "envoye", sentAt: new Date().toISOString(), scheduledAt: undefined });
    toast({ title: "Email envoyé", description: decodeEntities(msg.subject) });
  };
  const resend = () => {
    sendEmail({ to: msg.to, subject: msg.subject, body: msg.body, templateId: msg.templateId, related: msg.related });
    toast({ title: "Email renvoyé", description: `${decodeEntities(msg.subject)} → ${msg.to}` });
    onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      title={decodeEntities(msg.subject)}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge options={EMAIL_STATUSES} value={msg.status} />
          <span>{dateTime(when(msg))}</span>
        </span>
      }
      footer={
        editable ? (
          msg.status === "programme" ? (
            <>
              <Button variant="ghost" size="sm" onClick={cancel}>
                <XCircle /> Annuler l'envoi
              </Button>
              <Button size="sm" onClick={sendNow}>
                <Send /> Envoyer maintenant
              </Button>
            </>
          ) : msg.status === "brouillon" ? (
            <Button size="sm" onClick={sendNow}>
              <Send /> Envoyer
            </Button>
          ) : (
            <Button size="sm" variant={msg.status === "erreur" ? "primary" : "secondary"} onClick={resend}>
              <RotateCcw /> Renvoyer
            </Button>
          )
        ) : undefined
      }
    >
      <div className="space-y-5">
        <DescriptionList
          columns={2}
          items={[
            { label: "À", value: contact ? <span><ContactLink id={contact.id} /> <span className="text-muted-foreground">&lt;{msg.to}&gt;</span></span> : msg.to },
            { label: "Template", value: tpl ? tpl.name : "Message libre" },
            { label: msg.status === "programme" ? "Programmé pour" : "Envoyé le", value: dateTime(msg.status === "programme" ? msg.scheduledAt : msg.sentAt) },
            { label: "Ouvert le", value: msg.openedAt ? dateTime(msg.openedAt) : "—" },
            { label: "Lié à", value: <EntityRefLink value={msg.related} /> },
            { label: "Séquence", value: seq ? seq.name : "—" },
          ]}
        />
        {msg.status === "erreur" ? (
          <p className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger-text">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            L'envoi a échoué (adresse invalide, boîte pleine ou rejet du fournisseur). Vérifiez l'adresse puis renvoyez.
          </p>
        ) : null}
        {msg.status === "programme" ? (
          <p className="flex items-start gap-2 rounded-md bg-info-soft px-3 py-2 text-sm text-info-text">
            <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Envoi automatique le {dateTime(msg.scheduledAt)}.
          </p>
        ) : null}
        <div className="rounded-lg border border-border bg-surface-2/60">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              De : StartupWeek &lt;hello@startupweek.tech&gt; — À : {contact ? contactName(contact) : msg.to}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{decodeEntities(msg.subject)}</p>
          </div>
          <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-foreground">{decodeEntities(msg.body) || <span className="text-muted-foreground">(corps vide)</span>}</p>
        </div>
      </div>
    </Drawer>
  );
}
