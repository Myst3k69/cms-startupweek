"use client";

import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import { ExternalLink, Trash2 } from "lucide-react";
import { useActions, useCollection, useEntity, useSession } from "@/lib/hooks";
import { ACTION_STATUSES, labelOf } from "@/lib/domain/constants";
import type { ActionOrigin, ActionStatus, ID, ImprovementAction } from "@/lib/domain/types";
import { Button, Drawer, FormField, Input, Select, Textarea, useToast } from "@/components/ui";
import { cn } from "@/lib/utils";
import { date } from "@/lib/format";
import { ACTION_ORIGINS } from "../labels";
import { fieldErrors, userOptions } from "../form-utils";
import { fromDateInput, toDateInput } from "../metrics";

export type ActionDraft = Partial<Omit<ImprovementAction, "id" | "createdAt" | "updatedAt">>;

const schema = z.object({
  title: z.string().trim().min(3, "Donnez un intitulé explicite (3 caractères minimum)."),
  description: z.string().trim().min(1, "Décrivez l'action à mener."),
});

/** Création / édition d'une action d'amélioration (indicateur 32). */
export function ActionDrawer({
  open,
  onClose,
  actionId,
  draft,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  actionId?: ID | null;
  draft?: ActionDraft;
  onSaved?: (action: ImprovementAction) => void;
}) {
  const action = useEntity("improvementActions", actionId ?? undefined);
  const editing = !!actionId;
  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={editing ? "Action d'amélioration" : "Nouvelle action d'amélioration"}
      description={editing && action ? `Créée le ${date(action.createdAt)} · indicateur 32` : "Plan d'amélioration continue — indicateur 32"}
    >
      {editing && !action ? (
        <p className="text-sm text-muted-foreground">Cette action n'existe plus.</p>
      ) : (
        <ActionForm key={actionId ?? "new"} action={action} draft={draft} onDone={onClose} onSaved={onSaved} />
      )}
    </Drawer>
  );
}

function originHref(ref: ImprovementAction["originRef"]): { href: string; label: string } | null {
  if (!ref) return null;
  if (ref.entity === "complaints") return { href: `/qualiopi/reclamations?id=${ref.id}`, label: "Voir la réclamation d'origine" };
  if (ref.entity === "watchItems") return { href: "/qualiopi/veille", label: "Voir la veille d'origine" };
  if (ref.entity === "evaluations") return { href: "/qualiopi/satisfaction", label: "Voir l'évaluation d'origine" };
  if (ref.entity === "events") return { href: `/sessions/${ref.id}`, label: "Voir la session" };
  return null;
}

function ActionForm({
  action,
  draft,
  onDone,
  onSaved,
}: {
  action?: ImprovementAction;
  draft?: ActionDraft;
  onDone: () => void;
  onSaved?: (a: ImprovementAction) => void;
}) {
  const { create, update, remove } = useActions();
  const { canEdit, user } = useSession();
  const toast = useToast();
  const users = useCollection("users");
  const indicators = useCollection("indicators");
  const readOnly = !canEdit("qualiopi");
  const base = action ?? draft ?? {};

  const [title, setTitle] = React.useState(base.title ?? "");
  const [description, setDescription] = React.useState(base.description ?? "");
  const [origin, setOrigin] = React.useState<ActionOrigin>(base.origin ?? "interne");
  const [status, setStatus] = React.useState<ActionStatus>(base.status ?? "a_faire");
  const [ownerId, setOwnerId] = React.useState(base.ownerId ?? user?.id ?? "");
  const [dueAt, setDueAt] = React.useState(toDateInput(base.dueAt));
  const [codes, setCodes] = React.useState<number[]>(base.indicatorCodes ?? [32]);
  const [impact, setImpact] = React.useState(base.impact ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const allCodes = React.useMemo(() => {
    const map = new Map(indicators.map((i) => [i.code, i]));
    return Array.from({ length: 32 }, (_, i) => i + 1).map((code) => ({ code, na: map.get(code)?.status === "non_applicable", title: map.get(code)?.title }));
  }, [indicators]);

  const origin$ = originHref(base.originRef);

  const toggle = (code: number) => setCodes((cs) => (cs.includes(code) ? cs.filter((c) => c !== code) : [...cs, code].sort((a, b) => a - b)));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ title, description });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    const nowIso = new Date().toISOString();
    const patch = {
      title: parsed.data.title,
      description: parsed.data.description,
      origin,
      status,
      ownerId: ownerId || undefined,
      dueAt: fromDateInput(dueAt),
      indicatorCodes: codes,
      impact: impact.trim() || undefined,
      doneAt: status === "fait" ? (action?.doneAt ?? nowIso) : undefined,
    };
    if (action) {
      const statusChanged = action.status !== status;
      update("improvementActions", action.id, patch, {
        log: statusChanged ? `Action « ${patch.title} » : ${labelOf(ACTION_STATUSES, action.status)} → ${labelOf(ACTION_STATUSES, status)}` : `Action « ${patch.title} » mise à jour`,
        kind: statusChanged ? "statut" : "modification",
      });
      toast({ title: "Action enregistrée" });
      onSaved?.({ ...action, ...patch });
    } else {
      const created = create("improvementActions", { ...patch, originRef: draft?.originRef }, { log: `Action d'amélioration créée : « ${patch.title} »` });
      toast({ title: "Action d'amélioration créée", description: "Ajoutée au plan d'amélioration continue (ind. 32)." });
      onSaved?.(created);
    }
    onDone();
  };

  return (
    <form onSubmit={save} className="space-y-4" noValidate>
      <FormField label="Intitulé" htmlFor="act-title" error={errors.title}>
        <Input id="act-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={readOnly} placeholder="Ex. Ajouter une pause active l'après-midi du J3" />
      </FormField>
      <FormField label="Description / action à mener" htmlFor="act-desc" error={errors.description}>
        <Textarea id="act-desc" value={description} onChange={(e) => setDescription(e.target.value)} disabled={readOnly} className="min-h-20" />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Origine" htmlFor="act-origin">
          <Select id="act-origin" value={origin} onChange={(e) => setOrigin(e.target.value as ActionOrigin)} options={ACTION_ORIGINS} disabled={readOnly} />
        </FormField>
        <FormField label="Statut" htmlFor="act-status">
          <Select id="act-status" value={status} onChange={(e) => setStatus(e.target.value as ActionStatus)} options={ACTION_STATUSES} disabled={readOnly} />
        </FormField>
        <FormField label="Responsable" htmlFor="act-owner">
          <Select id="act-owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} options={userOptions(users)} placeholder="Non assigné" disabled={readOnly} />
        </FormField>
        <FormField label="Échéance" htmlFor="act-due">
          <Input id="act-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} disabled={readOnly} />
        </FormField>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Indicateurs liés</legend>
        <div className="grid grid-cols-8 gap-1">
          {allCodes.map((c) => {
            const on = codes.includes(c.code);
            return (
              <button
                key={c.code}
                type="button"
                disabled={readOnly || (c.na && !on)}
                aria-pressed={on}
                title={c.na ? `Indicateur ${c.code} — non applicable` : c.title ? `Indicateur ${c.code} — ${c.title}` : `Indicateur ${c.code}`}
                onClick={() => toggle(c.code)}
                className={cn(
                  "tabular h-8 rounded-md border text-xs font-medium transition-colors disabled:opacity-40",
                  on ? "border-ring bg-accent-soft text-accent-text" : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
                  c.na && "line-through",
                )}
              >
                {c.code}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-faint">Les indicateurs barrés sont non applicables à StartupWeek.</p>
      </fieldset>
      <FormField label="Efficacité / impact constaté" htmlFor="act-impact" hint="À renseigner à la clôture : preuve que l'action a produit l'effet attendu.">
        <Textarea id="act-impact" value={impact} onChange={(e) => setImpact(e.target.value)} disabled={readOnly} className="min-h-16" />
      </FormField>
      {origin$ ? (
        <Link href={origin$.href} className="inline-flex items-center gap-1.5 text-sm text-accent-text hover:underline">
          <ExternalLink className="size-3.5" aria-hidden="true" /> {origin$.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        {action && !readOnly ? (
          confirmDelete ? (
            <span className="mr-auto inline-flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Supprimer définitivement ?</span>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  remove("improvementActions", action.id, { log: `Action supprimée : « ${action.title} »` });
                  toast({ title: "Action supprimée", tone: "info" });
                  onDone();
                }}
              >
                Confirmer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Annuler
              </Button>
            </span>
          ) : (
            <Button size="sm" variant="ghost" className="mr-auto text-danger-text" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Supprimer
            </Button>
          )
        ) : null}
        <Button variant="secondary" onClick={onDone}>
          {readOnly ? "Fermer" : "Annuler"}
        </Button>
        {!readOnly ? <Button type="submit">{action ? "Enregistrer" : "Créer l'action"}</Button> : null}
      </div>
    </form>
  );
}
