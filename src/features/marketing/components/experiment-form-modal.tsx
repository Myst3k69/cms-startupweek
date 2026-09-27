"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, FormField, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { useUserOptions } from "@/features/crm/components/shared/hooks";
import { useActions, useCollection, useNow, useSession } from "@/lib/hooks";
import type { Experiment, ExperimentChannel, ExperimentMetric, ExperimentVariant } from "@/lib/domain/types";
import { uid } from "@/lib/utils";
import { CONFIDENCE_OPTIONS, EXPERIMENT_CHANNELS, EXPERIMENT_METRICS, metricOptions } from "../lib/labels";

interface VariantDraft {
  id: string;
  key: string;
  name: string;
  description: string;
  creativeId: string;
  weight: string;
}

interface Draft {
  name: string;
  key: string;
  hypothesis: string;
  channel: ExperimentChannel;
  metric: ExperimentMetric;
  eventId: string;
  campaignId: string;
  templateId: string;
  pageUrl: string;
  confidence: string;
  mde: string;
  ownerId: string;
  variants: VariantDraft[];
}

const KEYS = ["A", "B", "C", "D"];
const DEFAULT_METRIC: Record<ExperimentChannel, ExperimentMetric> = { publicite: "ctr", site: "conversion", email: "ouverture" };

const slugKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

function evenWeights(n: number): string[] {
  const base = Math.floor(100 / n);
  return Array.from({ length: n }, (_, i) => String(i === 0 ? 100 - base * (n - 1) : base));
}

function draftFrom(e: Partial<Experiment> | undefined, ownerId?: string): Draft {
  const variants = e?.variants && e.variants.length >= 2
    ? e.variants.map((v) => ({ id: v.id, key: v.key, name: v.name, description: v.description, creativeId: v.creativeId ?? "", weight: String(v.weight) }))
    : [
        { id: uid("var"), key: "A", name: "Contrôle", description: "Version actuelle", creativeId: "", weight: "50" },
        { id: uid("var"), key: "B", name: "", description: "", creativeId: "", weight: "50" },
      ];
  return {
    name: e?.name ?? "",
    key: e?.key ?? slugKey(e?.name ?? ""),
    hypothesis: e?.hypothesis ?? "",
    channel: e?.channel ?? "publicite",
    metric: e?.metric ?? DEFAULT_METRIC[e?.channel ?? "publicite"],
    eventId: e?.eventId ?? "",
    campaignId: e?.campaignId ?? "",
    templateId: e?.templateId ?? "",
    pageUrl: e?.pageUrl ?? "",
    confidence: String(e?.confidenceTarget ?? 95),
    mde: String(e?.minDetectableEffect ?? 20),
    ownerId: e?.ownerId ?? ownerId ?? "",
    variants,
  };
}

/**
 * Création / édition d'un A/B test. Une fois le test démarré, sa structure (canal, métrique,
 * variantes, pondérations) est figée : la modifier en cours de route fausserait la comparaison.
 */
export function ExperimentFormModal(props: { open: boolean; onClose: () => void; experiment?: Experiment; preset?: Partial<Experiment>; onSaved?: (e: Experiment) => void }) {
  if (!props.open) return null;
  return <ExperimentFormInner {...props} />;
}

function ExperimentFormInner({ onClose, experiment, preset, onSaved }: { onClose: () => void; experiment?: Experiment; preset?: Partial<Experiment>; onSaved?: (e: Experiment) => void }) {
  const { user } = useSession();
  const { create, update } = useActions();
  const toast = useToast();
  const now = useNow();
  const campaigns = useCollection("adCampaigns");
  const experiments = useCollection("experiments");
  const events = useCollection("events");
  const templates = useCollection("emailTemplates");
  const userOptions = useUserOptions();
  const [draft, setDraft] = React.useState<Draft>(() => draftFrom(experiment ?? preset, user?.id));
  const [keyTouched, setKeyTouched] = React.useState(Boolean(experiment));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const locked = Boolean(experiment && experiment.status !== "brouillon");
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setVariant = (i: number, patch: Partial<VariantDraft>) => setDraft((d) => ({ ...d, variants: d.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));

  const campaign = campaigns.find((c) => c.id === draft.campaignId);
  const creativeOptions = (campaign?.creatives ?? []).map((c) => ({ value: c.id, label: c.name }));
  const usesWeights = draft.channel !== "publicite";
  const eventOptions = React.useMemo(
    () =>
      [...events]
        .filter((e) => e.id === draft.eventId || new Date(e.endAt).getTime() > now)
        .sort((a, b) => a.startAt.localeCompare(b.startAt))
        .map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` })),
    [events, now, draft.eventId],
  );

  const changeVariantCount = (n: number) =>
    setDraft((d) => {
      const weights = evenWeights(n);
      const variants = Array.from({ length: n }, (_, i) => d.variants[i] ?? { id: uid("var"), key: KEYS[i], name: "", description: "", creativeId: "", weight: "0" });
      return { ...d, variants: variants.map((v, i) => ({ ...v, key: KEYS[i], weight: weights[i] })) };
    });

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (draft.name.trim().length < 3) e.name = "Donnez un nom au test";
    if (!/^[a-z0-9][a-z0-9_-]{1,62}$/.test(draft.key)) e.key = "Minuscules, chiffres et tirets (2 à 63 caractères)";
    else if (experiments.some((x) => x.id !== experiment?.id && x.key === draft.key)) e.key = "Clé déjà utilisée par un autre test";
    if (draft.hypothesis.trim().length < 10) e.hypothesis = "Formulez l'hypothèse : « si … alors … parce que … »";
    const mde = Number(draft.mde);
    if (!Number.isFinite(mde) || mde < 1 || mde > 500) e.mde = "Entre 1 et 500 %";
    if (draft.channel === "publicite") {
      if (!draft.campaignId) e.campaignId = "Choisissez la campagne dont les publicités sont comparées";
      const ids = draft.variants.map((v) => v.creativeId);
      if (ids.some((x) => !x)) e.variants = "Associez chaque variante à une publicité de la campagne";
      else if (new Set(ids).size !== ids.length) e.variants = "Chaque variante doit correspondre à une publicité différente";
    }
    if (draft.channel === "site" && !/^https?:\/\/\S+$/.test(draft.pageUrl.trim())) e.pageUrl = "URL complète de la page testée";
    if (draft.variants.some((v) => !v.name.trim())) e.variants ??= "Nommez chaque variante";
    if (usesWeights) {
      const sum = draft.variants.reduce((s, v) => s + (Number(v.weight) || 0), 0);
      if (sum !== 100 || draft.variants.some((v) => !(Number(v.weight) > 0))) e.variants ??= `Les pondérations doivent être positives et totaliser 100 % (actuellement ${sum} %)`;
    }
    return e;
  };

  const submit = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const previous = new Map((experiment?.variants ?? []).map((v) => [v.id, v]));
    const variants: ExperimentVariant[] = draft.variants.map((v) => ({
      id: v.id,
      key: v.key,
      name: v.name.trim(),
      description: v.description.trim(),
      creativeId: draft.channel === "publicite" ? v.creativeId || undefined : undefined,
      weight: usesWeights ? Number(v.weight) : Math.round(100 / draft.variants.length),
      exposures: previous.get(v.id)?.exposures ?? 0,
      conversions: previous.get(v.id)?.conversions ?? 0,
    }));
    const data = {
      name: draft.name.trim(),
      key: draft.key,
      hypothesis: draft.hypothesis.trim(),
      channel: draft.channel,
      metric: draft.metric,
      eventId: draft.eventId || undefined,
      campaignId: draft.channel === "publicite" ? draft.campaignId || undefined : undefined,
      templateId: draft.channel === "email" ? draft.templateId || undefined : undefined,
      pageUrl: draft.channel === "site" ? draft.pageUrl.trim() : undefined,
      confidenceTarget: Number(draft.confidence),
      minDetectableEffect: Number(draft.mde),
      ownerId: draft.ownerId || undefined,
      variants,
    };
    if (experiment) {
      // Test démarré : seuls les libellés changent (les compteurs du site sont protégés côté base).
      const patch = locked ? { name: data.name, hypothesis: data.hypothesis, eventId: data.eventId, ownerId: data.ownerId, variants: experiment.variants.map((v) => ({ ...v, name: variants.find((x) => x.id === v.id)?.name ?? v.name, description: variants.find((x) => x.id === v.id)?.description ?? v.description })) } : data;
      update("experiments", experiment.id, patch, { log: `Test A/B modifié : ${data.name}` });
      toast({ title: "Test enregistré", description: data.name });
      onSaved?.({ ...experiment, ...patch });
    } else {
      const created = create("experiments", { ...data, status: "brouillon" }, { log: `Test A/B créé : ${data.name}` });
      toast({ title: "Test créé (brouillon)", description: "Démarrez-le quand les variantes sont en ligne." });
      onSaved?.(created);
    }
    onClose();
  };

  const id = (k: string) => `abt-${k}`;
  return (
    <Modal
      open
      onClose={onClose}
      title={experiment ? "Modifier le test" : "Nouveau test A/B"}
      description="Une seule différence entre les variantes, une métrique principale, une taille d'échantillon fixée avant de lancer."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>{experiment ? "Enregistrer" : "Créer le test"}</Button>
        </>
      }
    >
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {locked ? <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-text sm:col-span-2">Test démarré : canal, métrique, variantes et pondérations sont figés. Seuls les libellés restent modifiables.</p> : null}
        <FormField label="Nom du test" htmlFor={id("name")} error={errors.name}>
          <Input id={id("name")} value={draft.name} onChange={(e) => set({ name: e.target.value, ...(keyTouched ? {} : { key: slugKey(e.target.value) }) })} placeholder="Titre de la page session : descriptif ou résultat ?" />
        </FormField>
        <FormField label="Clé technique" htmlFor={id("key")} error={errors.key} hint={draft.channel === "site" ? "Lue par le site pour afficher la bonne variante" : "Identifiant unique"}>
          <Input
            id={id("key")}
            value={draft.key}
            disabled={locked}
            onChange={(e) => {
              setKeyTouched(true);
              set({ key: e.target.value.toLowerCase() });
            }}
            className="font-mono"
          />
        </FormField>
        <FormField label="Hypothèse" htmlFor={id("hypo")} error={errors.hypothesis} className="sm:col-span-2">
          <Textarea id={id("hypo")} value={draft.hypothesis} onChange={(e) => set({ hypothesis: e.target.value })} className="min-h-16" placeholder="Si le titre promet le résultat, alors plus de visiteurs candidatent, parce que le bénéfice est immédiatement compris." />
        </FormField>
        <FormField label="Canal" htmlFor={id("channel")}>
          <Select id={id("channel")} value={draft.channel} disabled={locked} onChange={(e) => {
            const channel = e.target.value as ExperimentChannel;
            set({ channel, metric: DEFAULT_METRIC[channel] });
          }} options={EXPERIMENT_CHANNELS} />
        </FormField>
        <FormField label="Métrique principale" htmlFor={id("metric")} hint={`${EXPERIMENT_METRICS[draft.metric].conversions} / ${EXPERIMENT_METRICS[draft.metric].exposures.toLowerCase()}`}>
          <Select id={id("metric")} value={draft.metric} disabled={locked} onChange={(e) => set({ metric: e.target.value as ExperimentMetric })} options={metricOptions(draft.channel)} />
        </FormField>

        {draft.channel === "publicite" ? (
          <FormField label="Campagne" htmlFor={id("campaign")} error={errors.campaignId} hint="Les chiffres de chaque publicité viennent de la synchro de la régie">
            <Select
              id={id("campaign")}
              value={draft.campaignId}
              disabled={locked}
              onChange={(e) => set({ campaignId: e.target.value, variants: draft.variants.map((v) => ({ ...v, creativeId: "" })) })}
              options={campaigns.filter((c) => c.creatives.length >= 2 || c.id === draft.campaignId).map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Choisir une campagne (≥ 2 publicités)"
            />
          </FormField>
        ) : draft.channel === "site" ? (
          <FormField label="Page testée" htmlFor={id("page")} error={errors.pageUrl}>
            <Input id={id("page")} type="url" value={draft.pageUrl} disabled={locked} onChange={(e) => set({ pageUrl: e.target.value })} placeholder="https://www.startupweek.tech/sessions/…" />
          </FormField>
        ) : (
          <FormField label="Modèle d'email" htmlFor={id("tpl")} hint="Optionnel">
            <Select id={id("tpl")} value={draft.templateId} disabled={locked} onChange={(e) => set({ templateId: e.target.value })} options={templates.map((t) => ({ value: t.id, label: t.name }))} placeholder="—" />
          </FormField>
        )}
        <FormField label="Session concernée" htmlFor={id("event")} hint="Optionnel">
          <Select id={id("event")} value={draft.eventId} onChange={(e) => set({ eventId: e.target.value })} options={eventOptions} placeholder="Aucune" />
        </FormField>

        <FormField label="Niveau de confiance" htmlFor={id("conf")}>
          <Select id={id("conf")} value={draft.confidence} disabled={locked} onChange={(e) => set({ confidence: e.target.value })} options={CONFIDENCE_OPTIONS} />
        </FormField>
        <FormField label="Effet minimal à détecter (%)" htmlFor={id("mde")} error={errors.mde} hint="Écart relatif visé : plus il est petit, plus il faut de trafic">
          <Input id={id("mde")} inputMode="numeric" value={draft.mde} disabled={locked} onChange={(e) => set({ mde: e.target.value.replace(/[^\d]/g, "") })} />
        </FormField>

        <div role="group" aria-label="Variantes" className="space-y-2 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Variantes (A = contrôle)</p>
            {!locked ? (
              <div className="flex gap-1">
                <Button size="xs" variant="ghost" disabled={draft.variants.length <= 2} onClick={() => changeVariantCount(draft.variants.length - 1)} aria-label="Retirer la dernière variante">
                  <Trash2 /> Retirer
                </Button>
                <Button size="xs" variant="secondary" disabled={draft.variants.length >= 4} onClick={() => changeVariantCount(draft.variants.length + 1)}>
                  <Plus /> Variante
                </Button>
              </div>
            ) : null}
          </div>
          {errors.variants ? <p className="text-xs text-danger-text">{errors.variants}</p> : null}
          <ul className="space-y-2">
            {draft.variants.map((v, i) => (
              <li key={v.id} className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-center">
                <span className="inline-flex size-7 items-center justify-center rounded bg-surface-2 font-mono text-sm font-semibold text-foreground" aria-hidden="true">
                  {v.key}
                </span>
                <Input aria-label={`Nom de la variante ${v.key}`} value={v.name} onChange={(e) => setVariant(i, { name: e.target.value })} placeholder={i === 0 ? "Contrôle" : "Nouvelle version"} />
                {draft.channel === "publicite" ? (
                  <Select aria-label={`Publicité de la variante ${v.key}`} value={v.creativeId} disabled={locked || !campaign} onChange={(e) => setVariant(i, { creativeId: e.target.value })} options={creativeOptions} placeholder={campaign ? "Publicité…" : "Choisissez d'abord la campagne"} />
                ) : (
                  <Input aria-label={`Description de la variante ${v.key}`} value={v.description} onChange={(e) => setVariant(i, { description: e.target.value })} placeholder="Ce qui change (titre, bouton, objet…)" />
                )}
                {usesWeights ? (
                  <div className="flex items-center gap-1">
                    <Input aria-label={`Part du trafic de la variante ${v.key} (%)`} inputMode="numeric" value={v.weight} disabled={locked} onChange={(e) => setVariant(i, { weight: e.target.value.replace(/[^\d]/g, "") })} className="w-16 text-right" />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                ) : (
                  <span className="hidden sm:block" />
                )}
              </li>
            ))}
          </ul>
        </div>

        <FormField label="Responsable" htmlFor={id("owner")}>
          <Select id={id("owner")} value={draft.ownerId} onChange={(e) => set({ ownerId: e.target.value })} options={userOptions} placeholder="—" />
        </FormField>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
