"use client";

import * as React from "react";
import { z } from "zod";
import { Button, FormField, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { centsToInput, fromDateInput, inputToCents, toDateInput } from "@/features/crm/lib/format";
import { useUserOptions } from "@/features/crm/components/shared/hooks";
import { useActions, useCollection, useNow, useSession, useSettings } from "@/lib/hooks";
import type { AdCampaign, AdPlatform, CampaignObjective, CampaignStatus } from "@/lib/domain/types";
import { AD_PLATFORMS, CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUSES } from "../lib/labels";
import { utmValue } from "../lib/metrics";

interface Draft {
  name: string;
  platform: AdPlatform;
  objective: CampaignObjective;
  status: CampaignStatus;
  eventId: string;
  audience: string;
  startAt: string;
  endAt: string;
  budget: string;
  daily: string;
  utmCampaign: string;
  landingUrl: string;
  externalId: string;
  ownerId: string;
  notes: string;
}

const money = z.string().refine((v) => !v || /^\d[\d\s]*([.,]\d{1,2})?$/.test(v.trim()), "Montant invalide (ex : 1 500)");
const schema = z
  .object({
    name: z.string().trim().min(3, "Donnez un nom à la campagne"),
    startAt: z.string().min(1, "Date de début requise"),
    endAt: z.string(),
    budget: money,
    daily: money,
    utmCampaign: z.string().trim().regex(/^[a-z0-9_.-]{3,80}$/, "Minuscules, chiffres et « _ » uniquement (3 à 80 caractères)"),
    landingUrl: z.string().trim().refine((v) => !v || /^https?:\/\/\S+$/.test(v), "URL complète attendue (https://…)"),
  })
  .refine((d) => !d.endAt || d.endAt >= d.startAt, { path: ["endAt"], message: "La fin doit suivre le début" });

function draftFrom(c: Partial<AdCampaign> | undefined, defaults: { ownerId?: string; website: string; today: string }): Draft {
  return {
    name: c?.name ?? "",
    platform: c?.platform ?? "meta",
    objective: c?.objective ?? "conversions",
    status: c?.status ?? "brouillon",
    eventId: c?.eventId ?? "",
    audience: c?.audience ?? "",
    startAt: toDateInput(c?.startAt) || defaults.today,
    endAt: toDateInput(c?.endAt),
    budget: centsToInput(c?.budgetCents),
    daily: centsToInput(c?.dailyBudgetCents),
    utmCampaign: c?.utmCampaign ?? "",
    landingUrl: c?.landingUrl ?? defaults.website,
    externalId: c?.externalId ?? "",
    ownerId: c?.ownerId ?? defaults.ownerId ?? "",
    notes: c?.notes ?? "",
  };
}

/** Création / édition d'une campagne. `preset` : pré-remplissage (ex. session à promouvoir). */
export function CampaignFormModal(props: { open: boolean; onClose: () => void; campaign?: AdCampaign; preset?: Partial<AdCampaign>; onSaved?: (c: AdCampaign) => void }) {
  if (!props.open) return null;
  return <CampaignFormInner {...props} />;
}

function CampaignFormInner({ onClose, campaign, preset, onSaved }: { onClose: () => void; campaign?: AdCampaign; preset?: Partial<AdCampaign>; onSaved?: (c: AdCampaign) => void }) {
  const { user } = useSession();
  const { create, update } = useActions();
  const toast = useToast();
  const now = useNow();
  const events = useCollection("events");
  const campaigns = useCollection("adCampaigns");
  const settings = useSettings();
  const userOptions = useUserOptions();
  const today = React.useMemo(() => new Date(now).toISOString().slice(0, 10), [now]);
  const [draft, setDraft] = React.useState<Draft>(() => draftFrom(campaign ?? preset, { ownerId: user?.id, website: settings.website, today }));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [utmTouched, setUtmTouched] = React.useState(Boolean(campaign?.utmCampaign || preset?.utmCampaign));
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const eventOptions = React.useMemo(
    () =>
      [...events]
        .filter((e) => e.status !== "annule" && (e.id === draft.eventId || new Date(e.endAt).getTime() > now - 30 * 86_400_000))
        .sort((a, b) => a.startAt.localeCompare(b.startAt))
        .map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` })),
    [events, now, draft.eventId],
  );

  // utm_campaign proposée à partir du nom (tant qu'elle n'a pas été saisie à la main).
  const suggestUtm = (name: string, eventId: string) => {
    const code = events.find((e) => e.id === eventId)?.code;
    return utmValue(`${code ? code.replace("-", "") + "_" : ""}${name}`).slice(0, 60);
  };

  const submit = () => {
    const parsed = schema.safeParse(draft);
    const errs: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
    const utm = draft.utmCampaign.trim().toLowerCase();
    if (!errs.utmCampaign && campaigns.some((c) => c.id !== campaign?.id && c.utmCampaign.toLowerCase() === utm)) {
      errs.utmCampaign = "Déjà utilisée par une autre campagne : l'attribution serait mélangée";
    }
    const ext = draft.externalId.trim();
    if (ext && campaigns.some((c) => c.id !== campaign?.id && c.platform === draft.platform && c.externalId === ext)) {
      errs.externalId = "Cet identifiant de régie est déjà relié à une autre campagne";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const data = {
      name: draft.name.trim(),
      platform: draft.platform,
      objective: draft.objective,
      status: draft.status,
      eventId: draft.eventId || undefined,
      audience: draft.audience.trim(),
      startAt: fromDateInput(draft.startAt)!,
      endAt: fromDateInput(draft.endAt),
      budgetCents: inputToCents(draft.budget),
      dailyBudgetCents: draft.daily ? inputToCents(draft.daily) : undefined,
      utmCampaign: utm,
      landingUrl: draft.landingUrl.trim(),
      externalId: ext || undefined,
      ownerId: draft.ownerId || undefined,
      notes: draft.notes.trim() || undefined,
    };
    if (campaign) {
      update("adCampaigns", campaign.id, data, { log: `Campagne modifiée : ${data.name}` });
      toast({ title: "Campagne enregistrée", description: data.name });
      onSaved?.({ ...campaign, ...data });
    } else {
      const created = create("adCampaigns", { ...data, creatives: preset?.creatives ?? [] }, { log: `Campagne créée : ${data.name}` });
      toast({ title: "Campagne créée", description: "Ajoutez ses publicités, puis reliez-la à la régie pour recevoir les chiffres." });
      onSaved?.(created);
    }
    onClose();
  };

  const id = (k: string) => `cmp-${k}`;
  return (
    <Modal
      open
      onClose={onClose}
      title={campaign ? "Modifier la campagne" : "Nouvelle campagne"}
      description="Meta (Facebook / Instagram) ou LinkedIn Ads — l'utm_campaign relie les candidatures du site à la campagne."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>{campaign ? "Enregistrer" : "Créer la campagne"}</Button>
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
        <FormField label="Nom" htmlFor={id("name")} error={errors.name} className="sm:col-span-2">
          <Input
            id={id("name")}
            value={draft.name}
            onChange={(e) => set({ name: e.target.value, ...(utmTouched ? {} : { utmCampaign: suggestUtm(e.target.value, draft.eventId) }) })}
            placeholder="Founder Edition octobre — session en ligne"
          />
        </FormField>
        <FormField label="Régie" htmlFor={id("platform")}>
          <Select id={id("platform")} value={draft.platform} onChange={(e) => set({ platform: e.target.value as AdPlatform })} options={AD_PLATFORMS} />
        </FormField>
        <FormField label="Objectif" htmlFor={id("objective")}>
          <Select id={id("objective")} value={draft.objective} onChange={(e) => set({ objective: e.target.value as CampaignObjective })} options={CAMPAIGN_OBJECTIVES} />
        </FormField>
        <FormField label="Session / événement promu" htmlFor={id("event")} hint="Laisser vide pour une campagne de marque ou multi-sessions">
          <Select
            id={id("event")}
            value={draft.eventId}
            onChange={(e) => set({ eventId: e.target.value, ...(utmTouched ? {} : { utmCampaign: suggestUtm(draft.name, e.target.value) }) })}
            options={eventOptions}
            placeholder="Aucune (marque, multi-sessions)"
          />
        </FormField>
        <FormField label="Statut" htmlFor={id("status")}>
          <Select id={id("status")} value={draft.status} onChange={(e) => set({ status: e.target.value as CampaignStatus })} options={CAMPAIGN_STATUSES} />
        </FormField>
        <FormField label="Début" htmlFor={id("start")} error={errors.startAt}>
          <Input id={id("start")} type="date" value={draft.startAt} onChange={(e) => set({ startAt: e.target.value })} />
        </FormField>
        <FormField label="Fin" htmlFor={id("end")} error={errors.endAt} hint="Vide = campagne permanente">
          <Input id={id("end")} type="date" value={draft.endAt} onChange={(e) => set({ endAt: e.target.value })} />
        </FormField>
        <FormField label="Budget total (€)" htmlFor={id("budget")} error={errors.budget}>
          <Input id={id("budget")} inputMode="decimal" value={draft.budget} onChange={(e) => set({ budget: e.target.value })} placeholder="1 500" />
        </FormField>
        <FormField label="Budget quotidien (€)" htmlFor={id("daily")} error={errors.daily} hint="Optionnel">
          <Input id={id("daily")} inputMode="decimal" value={draft.daily} onChange={(e) => set({ daily: e.target.value })} placeholder="40" />
        </FormField>
        <FormField label="utm_campaign" htmlFor={id("utm")} error={errors.utmCampaign} hint="Clé d'attribution : identique dans tous les liens de la campagne">
          <Input
            id={id("utm")}
            value={draft.utmCampaign}
            onChange={(e) => {
              setUtmTouched(true);
              set({ utmCampaign: e.target.value.toLowerCase() });
            }}
            className="font-mono"
            placeholder="sw0012_founder_octobre"
          />
        </FormField>
        <FormField label="Page de destination" htmlFor={id("landing")} error={errors.landingUrl}>
          <Input id={id("landing")} type="url" value={draft.landingUrl} onChange={(e) => set({ landingUrl: e.target.value })} />
        </FormField>
        <FormField label="Ciblage (résumé)" htmlFor={id("audience")} className="sm:col-span-2">
          <Input id={id("audience")} value={draft.audience} onChange={(e) => set({ audience: e.target.value })} placeholder="France · 25-45 ans · intérêts no-code, entrepreneuriat · exclusion des inscrits" />
        </FormField>
        <FormField
          label={draft.platform === "meta" ? "ID de campagne Meta" : "URN de campagne LinkedIn"}
          htmlFor={id("ext")}
          error={errors.externalId}
          hint="Relie cette fiche à la campagne de la régie (sinon la synchro crée une nouvelle fiche)"
        >
          <Input
            id={id("ext")}
            value={draft.externalId}
            onChange={(e) => set({ externalId: e.target.value.trim() })}
            className="font-mono"
            placeholder={draft.platform === "meta" ? "120210000000004" : "urn:li:sponsoredCampaign:410000002"}
          />
        </FormField>
        <FormField label="Responsable" htmlFor={id("owner")}>
          <Select id={id("owner")} value={draft.ownerId} onChange={(e) => set({ ownerId: e.target.value })} options={userOptions} placeholder="—" />
        </FormField>
        <FormField label="Notes" htmlFor={id("notes")} className="sm:col-span-2">
          <Textarea id={id("notes")} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} className="min-h-16" />
        </FormField>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
