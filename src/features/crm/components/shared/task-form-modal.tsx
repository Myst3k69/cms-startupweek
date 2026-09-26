"use client";

import * as React from "react";
import { z } from "zod";
import { useCrm } from "@/lib/store";
import { useNow, useSession } from "@/lib/hooks";
import { createTask } from "@/lib/domain/actions";
import { PRIORITIES, TASK_KINDS } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { EntityRef, Priority, TaskKind } from "@/lib/domain/types";
import { Button, FormField, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { DAY, fromDateTimeInput, normText, startOfDay, toDateTimeInput } from "../../lib/format";
import { LINKABLE_ENTITIES } from "../../lib/entity-ref";
import { EntityRefLink } from "./entity-ref-link";
import { useRefResolver, useUserOptions } from "./hooks";

type Linkable = (typeof LINKABLE_ENTITIES)[number]["value"];

const schema = z.object({
  title: z.string().trim().min(3, "Décrivez la tâche en quelques mots"),
  dueAt: z.string().min(1, "Échéance obligatoire"),
});

/** Création rapide d'une tâche / relance (optionnellement rattachée à une entité). */
export function TaskFormModal(props: { open: boolean; onClose: () => void; related?: EntityRef; defaultTitle?: string; defaultKind?: TaskKind }) {
  if (!props.open) return null;
  return <TaskFormInner {...props} />;
}

function TaskFormInner({ onClose, related: fixedRelated, defaultTitle = "", defaultKind = "relance" }: { onClose: () => void; related?: EntityRef; defaultTitle?: string; defaultKind?: TaskKind }) {
  const now = useNow();
  const { user } = useSession();
  const toast = useToast();
  const log = useCrm((s) => s.log);
  const contacts = useCrm((s) => s.contacts);
  const organizations = useCrm((s) => s.organizations);
  const deals = useCrm((s) => s.deals);
  const applications = useCrm((s) => s.applications);
  const invoices = useCrm((s) => s.invoices);
  const submissions = useCrm((s) => s.submissions);
  const userOptions = useUserOptions();
  const resolve = useRefResolver();

  const [title, setTitle] = React.useState(defaultTitle);
  const [kind, setKind] = React.useState<TaskKind>(defaultKind);
  const [priority, setPriority] = React.useState<Priority>("normale");
  const [dueAt, setDueAt] = React.useState(() => toDateTimeInput(startOfDay(now) + DAY + 9 * 3_600_000));
  const [assigneeId, setAssigneeId] = React.useState(user?.id ?? "");
  const [notes, setNotes] = React.useState("");
  const [entity, setEntity] = React.useState<Linkable | "">("");
  const [entityId, setEntityId] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const candidates = React.useMemo(() => {
    if (!entity) return [];
    const q = normText(query);
    const rows: { value: string; label: string }[] =
      entity === "contacts"
        ? contacts.map((c) => ({ value: c.id, label: `${contactName(c)} — ${c.email}` }))
        : entity === "organizations"
          ? organizations.map((o) => ({ value: o.id, label: o.name }))
          : entity === "deals"
            ? deals.map((d) => ({ value: d.id, label: d.title }))
            : entity === "applications"
              ? applications.map((a) => ({ value: a.id, label: resolve({ entity: "applications", id: a.id }).label }))
              : entity === "invoices"
                ? invoices.map((i) => ({ value: i.id, label: i.number }))
                : submissions.map((s) => ({ value: s.id, label: `${s.name} — ${s.subject ?? s.type}` }));
    return rows.filter((r) => !q || normText(r.label).includes(q)).slice(0, 80);
  }, [entity, query, contacts, organizations, deals, applications, invoices, submissions, resolve]);

  const submit = () => {
    const parsed = schema.safeParse({ title, dueAt });
    const errs: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
    const iso = fromDateTimeInput(dueAt);
    if (!iso) errs.dueAt ??= "Date invalide";
    setErrors(errs);
    if (Object.keys(errs).length || !iso) return;
    const related: EntityRef | undefined = fixedRelated ?? (entity && entityId ? { entity, id: entityId } : undefined);
    createTask({ title: title.trim(), kind, priority, dueAt: iso, assigneeId: assigneeId || undefined, related, notes: notes.trim() || undefined });
    if (related) log({ kind: "note", entity: related.entity, entityId: related.id, actorId: user?.id, summary: `Tâche planifiée : ${title.trim()}` });
    toast({ title: "Tâche créée", description: title.trim() });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Nouvelle tâche"
      description="Relance, appel, rendez-vous… avec une échéance et un responsable."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>Créer la tâche</Button>
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
        <FormField label="Intitulé" htmlFor="task-title" error={errors.title}>
          <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rappeler pour le devis Startup Village" autoFocus />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Type" htmlFor="task-kind">
            <Select id="task-kind" value={kind} onChange={(e) => setKind(e.target.value as TaskKind)} options={TASK_KINDS} />
          </FormField>
          <FormField label="Priorité" htmlFor="task-priority">
            <Select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} options={PRIORITIES} />
          </FormField>
          <FormField label="Échéance" htmlFor="task-due" error={errors.dueAt}>
            <Input id="task-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Assignée à" htmlFor="task-assignee">
          <Select id="task-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} options={userOptions} placeholder="Non assignée" />
        </FormField>
        {fixedRelated ? (
          <div className="rounded-md border border-border bg-surface-2/60 px-3 py-2 text-sm">
            <span className="mr-2 text-xs text-muted-foreground">Rattachée à</span>
            <EntityRefLink value={fixedRelated} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
            <FormField label="Rattacher à" htmlFor="task-entity">
              <Select
                id="task-entity"
                value={entity}
                onChange={(e) => {
                  setEntity(e.target.value as Linkable | "");
                  setEntityId("");
                  setQuery("");
                }}
                options={LINKABLE_ENTITIES}
                placeholder="Rien"
              />
            </FormField>
            {entity ? (
              <div className="space-y-2">
                <FormField label="Rechercher" htmlFor="task-entity-q">
                  <Input id="task-entity-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, email, numéro…" />
                </FormField>
                <Select aria-label="Élément rattaché" value={entityId} onChange={(e) => setEntityId(e.target.value)} options={candidates} placeholder={candidates.length ? "Choisir…" : "Aucun résultat"} />
              </div>
            ) : null}
          </div>
        )}
        <FormField label="Notes" htmlFor="task-notes">
          <Textarea id="task-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-16" placeholder="Contexte, points à aborder…" />
        </FormField>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
