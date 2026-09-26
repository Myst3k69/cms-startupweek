"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { useCrm } from "@/lib/store";
import { labelOf, SEQUENCE_TRIGGERS, TEMPLATE_CATEGORIES } from "@/lib/domain/constants";
import type { ID, Sequence, SequenceStep, SequenceTrigger } from "@/lib/domain/types";
import { uid } from "@/lib/utils";
import { Button, Drawer, FormField, Input, Select, Switch, Textarea, useToast } from "@/components/ui";

export function SequenceDrawer({ id, onClose, editable }: { id: ID | undefined; onClose: () => void; editable: boolean }) {
  const seq = useCrm((s) => (id ? s.sequences.find((x) => x.id === id) : undefined));
  if (!id || !seq) return null;
  return <SequenceEditor key={`${seq.id}:${seq.updatedAt}`} seq={seq} onClose={onClose} editable={editable} />;
}

function SequenceEditor({ seq, onClose, editable }: { seq: Sequence; onClose: () => void; editable: boolean }) {
  const templates = useCrm((s) => s.emailTemplates);
  const update = useCrm((s) => s.update);
  const toast = useToast();
  const [name, setName] = React.useState(seq.name);
  const [description, setDescription] = React.useState(seq.description);
  const [trigger, setTrigger] = React.useState<SequenceTrigger>(seq.trigger);
  const [active, setActive] = React.useState(seq.active);
  const [steps, setSteps] = React.useState<SequenceStep[]>(seq.steps);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const templateOptions = React.useMemo(
    () =>
      [...templates]
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, "fr"))
        .map((t) => ({ value: t.id, label: `${labelOf(TEMPLATE_CATEGORIES, t.category)} · ${t.name}` })),
    [templates],
  );

  const patchStep = (sid: string, patch: Partial<SequenceStep>) => setSteps((list) => list.map((s) => (s.id === sid ? { ...s, ...patch } : s)));
  const move = (i: number, dir: -1 | 1) =>
    setSteps((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const addStep = () =>
    setSteps((list) => [...list, { id: uid("stp"), delayDays: (list.at(-1)?.delayDays ?? -2) + 2, channel: list.length % 2 ? "email" : "tache", label: "" }]);

  const save = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Nom obligatoire";
    if (!steps.length) errs.steps = "Ajoutez au moins une étape";
    steps.forEach((s) => {
      if (!s.label.trim()) errs[`label-${s.id}`] = "Libellé obligatoire";
      if (!Number.isFinite(s.delayDays) || s.delayDays < 0) errs[`delay-${s.id}`] = "≥ 0";
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const ordered = [...steps].map((s) => ({ ...s, label: s.label.trim(), templateId: s.channel === "email" ? s.templateId : undefined })).sort((a, b) => a.delayDays - b.delayDays);
    update("sequences", seq.id, { name: name.trim(), description: description.trim(), trigger, active, steps: ordered }, { log: `Séquence modifiée (${ordered.length} étape${ordered.length > 1 ? "s" : ""})` });
    toast({ title: "Séquence enregistrée", description: `${name.trim()} — ${ordered.length} étape${ordered.length > 1 ? "s" : ""}` });
    onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      title={editable ? "Modifier la séquence" : seq.name}
      description={labelOf(SEQUENCE_TRIGGERS, seq.trigger)}
      footer={
        editable ? (
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button size="sm" onClick={save}>
              <Save /> Enregistrer
            </Button>
          </>
        ) : undefined
      }
    >
      <fieldset disabled={!editable} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nom" htmlFor="seq-name" error={errors.name} className="sm:col-span-2">
            <Input id="seq-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Déclencheur" htmlFor="seq-trigger">
            <Select id="seq-trigger" value={trigger} onChange={(e) => setTrigger(e.target.value as SequenceTrigger)} options={SEQUENCE_TRIGGERS} />
          </FormField>
          <div className="flex items-end gap-3 pb-1.5">
            <Switch checked={active} onChange={setActive} label="Séquence active" disabled={!editable} />
            <span className="text-sm text-foreground">{active ? "Active — nouvelles inscriptions" : "Inactive — en pause"}</span>
          </div>
          <FormField label="Description" htmlFor="seq-desc" className="sm:col-span-2">
            <Textarea id="seq-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-16" />
          </FormField>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="eyebrow text-muted-foreground">Étapes</h3>
            <span className="text-xs text-muted-foreground">Triées par délai à l'enregistrement</span>
          </div>
          {errors.steps ? <p className="mb-2 text-xs text-danger-text">{errors.steps}</p> : null}
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s.id} className="rounded-lg border border-border bg-surface-2/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Étape {i + 1}</span>
                  {editable ? (
                    <div className="flex items-center gap-1">
                      <Button size="icon-xs" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter l'étape">
                        <ArrowUp />
                      </Button>
                      <Button size="icon-xs" variant="ghost" onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label="Descendre l'étape">
                        <ArrowDown />
                      </Button>
                      <Button size="icon-xs" variant="ghost" onClick={() => setSteps((l) => l.filter((x) => x.id !== s.id))} aria-label="Supprimer l'étape" className="text-danger-text">
                        <Trash2 />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-[96px_130px_1fr]">
                  <FormField label="Délai (J+)" htmlFor={`delay-${s.id}`} error={errors[`delay-${s.id}`]}>
                    <Input id={`delay-${s.id}`} type="number" min={0} value={Number.isFinite(s.delayDays) ? s.delayDays : ""} onChange={(e) => patchStep(s.id, { delayDays: e.target.value === "" ? NaN : Number(e.target.value) })} />
                  </FormField>
                  <FormField label="Canal" htmlFor={`channel-${s.id}`}>
                    <Select
                      id={`channel-${s.id}`}
                      value={s.channel}
                      onChange={(e) => patchStep(s.id, { channel: e.target.value as SequenceStep["channel"] })}
                      options={[
                        { value: "email", label: "Email auto" },
                        { value: "tache", label: "Tâche" },
                      ]}
                    />
                  </FormField>
                  <FormField label="Libellé" htmlFor={`label-${s.id}`} error={errors[`label-${s.id}`]}>
                    <Input id={`label-${s.id}`} value={s.label} onChange={(e) => patchStep(s.id, { label: e.target.value })} placeholder={s.channel === "email" ? "Email de relance devis" : "Appeler pour faire le point"} />
                  </FormField>
                  {s.channel === "email" ? (
                    <FormField label="Template d'email" htmlFor={`tpl-${s.id}`} className="sm:col-span-3">
                      <Select id={`tpl-${s.id}`} value={s.templateId ?? ""} onChange={(e) => patchStep(s.id, { templateId: e.target.value || undefined })} options={templateOptions} placeholder="— Choisir un template —" />
                    </FormField>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
          {editable ? (
            <Button variant="secondary" size="sm" className="mt-3" onClick={addStep}>
              <Plus /> Ajouter une étape
            </Button>
          ) : null}
        </div>
      </fieldset>
    </Drawer>
  );
}
