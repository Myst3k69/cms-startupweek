"use client";

import * as React from "react";
import { CalendarClock, Send, TriangleAlert } from "lucide-react";
import { z } from "zod";
import { useCrm } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { sendEmail } from "@/lib/domain/actions";
import { contactName } from "@/lib/domain/selectors";
import { labelOf, TEMPLATE_CATEGORIES } from "@/lib/domain/constants";
import type { EmailMessage, EntityRef, ID } from "@/lib/domain/types";
import { normalizeEmail } from "@/lib/utils";
import { fillEmailTemplate, missingVariables, SERVER_VARIABLES } from "@/lib/email-template";
import { Badge, Button, FormField, Input, Modal, Segmented, Select, Textarea, useToast } from "@/components/ui";
import { DAY, decodeEntities, fromDateTimeInput, normText, startOfDay, toDateTimeInput } from "../../lib/format";
import { useEmailDelivery } from "../../lib/email-delivery";

export interface EmailComposerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  to?: string;
  contactId?: ID;
  related?: EntityRef;
  templateId?: ID;
  /** Objet / corps par défaut si aucun template n'est fourni. */
  defaultSubject?: string;
  defaultBody?: string;
  vars?: Record<string, string | number | undefined>;
  /** Champ destinataire avec recherche de contact (sinon destinataire figé mais modifiable). */
  recipientSearch?: boolean;
  onSent?: (msg: EmailMessage, scheduled: boolean) => void;
}

const schema = z.object({
  to: z.email("Adresse email invalide"),
  subject: z.string().trim().min(1, "L'objet est obligatoire"),
  body: z.string().trim().min(1, "Le message est vide"),
});

/** Rédaction d'un email (template optionnel, variables, envoi immédiat ou programmé → sendEmail). */
export function EmailComposer(props: EmailComposerProps) {
  if (!props.open) return null;
  return <ComposerInner {...props} />;
}

function ComposerInner({ onClose, title = "Nouvel email", description, to: initialTo = "", contactId: initialContactId, related, templateId: initialTemplateId, defaultSubject = "", defaultBody = "", vars: extraVars, recipientSearch, onSent }: EmailComposerProps) {
  const templates = useCrm((s) => s.emailTemplates);
  const contacts = useCrm((s) => s.contacts);
  const organizations = useCrm((s) => s.organizations);
  const update = useCrm((s) => s.update);
  const log = useCrm((s) => s.log);
  const sessionUserId = useCrm((s) => s.sessionUserId);
  const now = useNow();
  const toast = useToast();

  const initialTpl = templates.find((t) => t.id === initialTemplateId);
  const [to, setTo] = React.useState(initialTo);
  const [pickedContactId, setPickedContactId] = React.useState<ID | undefined>(initialContactId);
  const [templateId, setTemplateId] = React.useState<string>(initialTpl?.id ?? "");
  const [subject, setSubject] = React.useState(initialTpl?.subject ?? defaultSubject);
  const [body, setBody] = React.useState(initialTpl?.body ?? defaultBody);
  const [mode, setMode] = React.useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = React.useState(() => toDateTimeInput(startOfDay(now) + DAY + 9 * 3_600_000));
  const [view, setView] = React.useState<"edit" | "preview">("edit");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [suggestOpen, setSuggestOpen] = React.useState(false);

  const contact = React.useMemo(() => {
    if (pickedContactId) {
      const c = contacts.find((x) => x.id === pickedContactId);
      if (c && normalizeEmail(c.email) === normalizeEmail(to)) return c;
    }
    const e = normalizeEmail(to);
    return e ? contacts.find((c) => normalizeEmail(c.email) === e) : undefined;
  }, [contacts, pickedContactId, to]);

  const vars = React.useMemo(() => {
    const org = contact?.orgId ? organizations.find((o) => o.id === contact.orgId) : undefined;
    const base: Record<string, string | number | undefined> = {
      prenom: contact?.firstName,
      nom: contact?.lastName,
      email: contact?.email ?? (to || undefined),
      organisation: org?.name,
    };
    const out: Record<string, string | number | undefined> = { ...extraVars };
    for (const [k, v] of Object.entries(base)) if (v !== undefined && v !== "") out[k] = v;
    return out;
  }, [contact, organizations, extraVars, to]);

  const filledSubject = React.useMemo(() => fillEmailTemplate(subject, vars), [subject, vars]);
  const filledBody = React.useMemo(() => fillEmailTemplate(body, vars), [body, vars]);
  // Jamais d'email envoyé avec une variable non remplie ; les liens personnels sont complétés à l'envoi.
  const missing = React.useMemo(() => missingVariables(filledSubject, filledBody), [filledSubject, filledBody]);
  const serverFilled = React.useMemo(() => SERVER_VARIABLES.filter((v) => `${subject} ${body}`.includes(`{{${v}}}`)), [subject, body]);
  const delivery = useEmailDelivery();

  const suggestions = React.useMemo(() => {
    const q = normText(to);
    if (!recipientSearch || q.length < 2) return [];
    return contacts.filter((c) => normText(`${c.firstName} ${c.lastName} ${c.email}`).includes(q) && normalizeEmail(c.email) !== normalizeEmail(to)).slice(0, 6);
  }, [contacts, to, recipientSearch]);

  const templateOptions = React.useMemo(
    () =>
      [...templates]
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, "fr"))
        .map((t) => ({ value: t.id, label: `${labelOf(TEMPLATE_CATEGORIES, t.category)} · ${t.name}` })),
    [templates],
  );

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  };

  const submit = () => {
    const parsed = schema.safeParse({ to: to.trim(), subject, body });
    const errs: Record<string, string> = {};
    if (!parsed.success) for (const issue of parsed.error.issues) errs[String(issue.path[0])] ??= issue.message;
    let scheduledIso: string | undefined;
    if (missing.length) errs.body = `Complétez ou retirez : ${missing.map((v) => `{{${v}}}`).join(", ")}`;
    if (mode === "later") {
      scheduledIso = fromDateTimeInput(scheduledAt);
      if (!scheduledIso || new Date(scheduledIso).getTime() <= Date.now()) errs.scheduledAt = "Choisissez une date future";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const effectiveRelated = related ?? (contact ? { entity: "contacts" as const, id: contact.id } : undefined);
    const msg = sendEmail({
      to: normalizeEmail(to),
      templateId: templateId || undefined,
      subject,
      body,
      vars,
      related: effectiveRelated,
      scheduledAt: scheduledIso,
    });
    // Base connectée : l'envoi réel est journalisé par le serveur (sur l'élément lié et le contact).
    if (contact && effectiveRelated?.entity !== "contacts" && (!delivery.live || scheduledIso)) {
      log({ kind: "email", entity: "contacts", entityId: contact.id, actorId: sessionUserId, summary: `${scheduledIso ? "Email programmé" : "Email envoyé"} : « ${decodeEntities(msg.subject)} »` });
    }
    if (contact && !scheduledIso) update("contacts", contact.id, { lastContactAt: new Date().toISOString() });
    toast({ title: scheduledIso ? "Email programmé" : delivery.live ? "Email en cours d'envoi" : "Email envoyé", description: `${decodeEntities(msg.subject)} → ${msg.to}` });
    onSent?.(msg, Boolean(scheduledIso));
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>
            {mode === "later" ? <CalendarClock /> : <Send />}
            {mode === "later" ? "Programmer l'envoi" : "Envoyer"}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Destinataire" htmlFor="composer-to" error={errors.to} hint={contact ? `Contact : ${contactName(contact)}` : recipientSearch ? "Nom ou email d'un contact, ou adresse libre" : undefined}>
            <div className="relative">
              <Input
                id="composer-to"
                value={to}
                autoComplete="off"
                placeholder="prenom.nom@exemple.fr"
                onFocus={() => setSuggestOpen(true)}
                onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPickedContactId(undefined);
                  setSuggestOpen(true);
                }}
              />
              {suggestOpen && suggestions.length ? (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg" role="listbox" aria-label="Contacts correspondants">
                  {suggestions.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-surface-2"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setTo(c.email);
                          setPickedContactId(c.id);
                          setSuggestOpen(false);
                        }}
                      >
                        <span className="text-sm text-foreground">{contactName(c)}</span>
                        <span className="text-xs text-muted-foreground">{c.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </FormField>
          <FormField label="Template (optionnel)" htmlFor="composer-tpl">
            <Select id="composer-tpl" value={templateId} onChange={(e) => applyTemplate(e.target.value)} options={templateOptions} placeholder="— Aucun (message libre) —" />
          </FormField>
        </div>

        <FormField label="Objet" htmlFor="composer-subject" error={errors.subject}>
          <Input id="composer-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Objet de l'email" />
        </FormField>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Message</span>
            <Segmented
              size="xs"
              value={view}
              onChange={setView}
              options={[
                { value: "edit", label: "Rédaction" },
                { value: "preview", label: "Aperçu" },
              ]}
            />
          </div>
          {view === "edit" ? (
            <Textarea id="composer-body" aria-label="Message" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-56 font-mono text-[13px]" />
          ) : (
            <div className="min-h-56 rounded-md border border-border bg-surface-2 px-4 py-3">
              <p className="mb-2 text-sm font-semibold text-foreground">{decodeEntities(filledSubject || "(sans objet)")}</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{decodeEntities(filledBody)}</p>
            </div>
          )}
          {errors.body ? <p className="text-xs text-danger-text">{errors.body}</p> : null}
          {missing.length ? (
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-warning-text">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              Variables sans valeur, à compléter ou retirer avant l&apos;envoi :
              {missing.map((v) => (
                <Badge key={v} tone="warning">{`{{${v}}}`}</Badge>
              ))}
            </p>
          ) : null}
          {serverFilled.length ? (
            <p className="text-xs text-muted-foreground">
              {serverFilled.map((v) => `{{${v}}}`).join(", ")} : lien personnel complété automatiquement à l&apos;envoi.
            </p>
          ) : null}
          {delivery.live && delivery.configured === false ? (
            <p className="flex items-start gap-1.5 text-xs text-warning-text">
              <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              Envoi pas encore configuré sur le serveur : l&apos;email restera en file et partira dès la configuration terminée.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-2/60 p-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Envoi</span>
            <div>
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: "now", label: "Maintenant" },
                  { value: "later", label: "Programmer" },
                ]}
              />
            </div>
          </div>
          {mode === "later" ? (
            <FormField label="Date et heure d'envoi" htmlFor="composer-when" error={errors.scheduledAt} className="sm:w-60">
              <Input id="composer-when" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </FormField>
          ) : (
            <p className="text-xs text-muted-foreground sm:pb-2">L'email part immédiatement et apparaît dans le journal d'envoi.</p>
          )}
        </div>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
