"use client";

import * as React from "react";
import { z } from "zod";
import { useCrm } from "@/lib/store";
import { DEAL_STAGE_PROBABILITY, DEAL_STAGES, DEAL_TYPES, LEAD_SOURCES } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { Deal, DealStage, DealType, LeadSource } from "@/lib/domain/types";
import { FormField, Input, Select, Textarea } from "@/components/ui";
import { centsToInput, fromDateInput, inputToCents, toDateInput } from "../../lib/format";
import { useOrgOptions, useUserOptions } from "../shared/hooks";

export interface DealDraft {
  title: string;
  type: DealType;
  stage: DealStage;
  amount: string;
  probability: string;
  orgId: string;
  contactId: string;
  ownerId: string;
  eventId: string;
  expectedCloseAt: string;
  nextStep: string;
  source: LeadSource | "";
  lostReason: string;
}

export function draftFromDeal(d?: Partial<Deal>, defaults?: { ownerId?: string; orgId?: string; contactId?: string }): DealDraft {
  return {
    title: d?.title ?? "",
    type: d?.type ?? "entreprise",
    stage: d?.stage ?? "nouveau",
    amount: centsToInput(d?.amountCents),
    probability: String(d?.probability ?? DEAL_STAGE_PROBABILITY[d?.stage ?? "nouveau"]),
    orgId: d?.orgId ?? defaults?.orgId ?? "",
    contactId: d?.contactId ?? defaults?.contactId ?? "",
    ownerId: d?.ownerId ?? defaults?.ownerId ?? "",
    eventId: d?.eventId ?? "",
    expectedCloseAt: toDateInput(d?.expectedCloseAt),
    nextStep: d?.nextStep ?? "",
    source: d?.source ?? "",
    lostReason: d?.lostReason ?? "",
  };
}

const schema = z.object({
  title: z.string().trim().min(3, "Donnez un intitulé à l'opportunité"),
  amount: z.string().refine((v) => !v || /^\d[\d\s]*([.,]\d{1,2})?$/.test(v.trim()), "Montant invalide (ex : 12 500)"),
  probability: z.string().refine((v) => /^\d{1,3}$/.test(v) && Number(v) <= 100, "Entre 0 et 100"),
});

export function validateDraft(d: DealDraft): Record<string, string> {
  const parsed = schema.safeParse(d);
  const errs: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
  return errs;
}

export function draftToPatch(d: DealDraft): Omit<Deal, "id" | "createdAt" | "updatedAt"> {
  return {
    title: d.title.trim(),
    type: d.type,
    stage: d.stage,
    amountCents: inputToCents(d.amount),
    probability: Number(d.probability),
    orgId: d.orgId || undefined,
    contactId: d.contactId || undefined,
    ownerId: d.ownerId || undefined,
    eventId: d.eventId || undefined,
    expectedCloseAt: fromDateInput(d.expectedCloseAt),
    nextStep: d.nextStep.trim() || undefined,
    source: d.source || undefined,
    lostReason: d.stage === "perdu" ? d.lostReason.trim() || undefined : undefined,
  };
}

/** Champs d'édition d'une opportunité (création en modal, édition dans le drawer). */
export function DealFields({ value, onChange, errors, disabled, idPrefix = "deal" }: { value: DealDraft; onChange: (patch: Partial<DealDraft>) => void; errors: Record<string, string>; disabled?: boolean; idPrefix?: string }) {
  const contacts = useCrm((s) => s.contacts);
  const events = useCrm((s) => s.events);
  const orgOptions = useOrgOptions();
  const userOptions = useUserOptions();
  const contactOptions = React.useMemo(() => {
    const list = value.orgId ? contacts.filter((c) => c.orgId === value.orgId || c.id === value.contactId) : contacts;
    return [...list].sort((a, b) => contactName(a).localeCompare(contactName(b), "fr")).map((c) => ({ value: c.id, label: `${contactName(c)} — ${c.email}` }));
  }, [contacts, value.orgId, value.contactId]);
  const eventOptions = React.useMemo(() => [...events].sort((a, b) => b.startAt.localeCompare(a.startAt)).map((e) => ({ value: e.id, label: `${e.code} · ${e.name}` })), [events]);
  const id = (k: string) => `${idPrefix}-${k}`;

  return (
    <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
      <FormField label="Intitulé" htmlFor={id("title")} error={errors.title} className="sm:col-span-2">
        <Input id={id("title")} value={value.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Startup Village — Kedge 2027" />
      </FormField>
      <FormField label="Type" htmlFor={id("type")}>
        <Select id={id("type")} value={value.type} onChange={(e) => onChange({ type: e.target.value as DealType })} options={DEAL_TYPES} />
      </FormField>
      <FormField label="Étape" htmlFor={id("stage")}>
        <Select
          id={id("stage")}
          value={value.stage}
          onChange={(e) => {
            const stage = e.target.value as DealStage;
            onChange({ stage, probability: String(DEAL_STAGE_PROBABILITY[stage]) });
          }}
          options={DEAL_STAGES}
        />
      </FormField>
      <FormField label="Montant HT (€)" htmlFor={id("amount")} error={errors.amount}>
        <Input id={id("amount")} inputMode="decimal" value={value.amount} onChange={(e) => onChange({ amount: e.target.value })} placeholder="12 500" />
      </FormField>
      <FormField label="Probabilité (%)" htmlFor={id("proba")} error={errors.probability} hint="Pré-remplie selon l'étape">
        <Input id={id("proba")} inputMode="numeric" value={value.probability} onChange={(e) => onChange({ probability: e.target.value.replace(/\D/g, "").slice(0, 3) })} />
      </FormField>
      <FormField label="Organisation" htmlFor={id("org")}>
        <Select id={id("org")} value={value.orgId} onChange={(e) => onChange({ orgId: e.target.value })} options={orgOptions} placeholder="Aucune" />
      </FormField>
      <FormField label="Contact principal" htmlFor={id("contact")}>
        <Select id={id("contact")} value={value.contactId} onChange={(e) => onChange({ contactId: e.target.value })} options={contactOptions} placeholder="Aucun" />
      </FormField>
      <FormField label="Propriétaire" htmlFor={id("owner")}>
        <Select id={id("owner")} value={value.ownerId} onChange={(e) => onChange({ ownerId: e.target.value })} options={userOptions} placeholder="Non assigné" />
      </FormField>
      <FormField label="Clôture prévue" htmlFor={id("close")}>
        <Input id={id("close")} type="date" value={value.expectedCloseAt} onChange={(e) => onChange({ expectedCloseAt: e.target.value })} />
      </FormField>
      <FormField label="Session liée" htmlFor={id("event")}>
        <Select id={id("event")} value={value.eventId} onChange={(e) => onChange({ eventId: e.target.value })} options={eventOptions} placeholder="Aucune" />
      </FormField>
      <FormField label="Source" htmlFor={id("source")}>
        <Select id={id("source")} value={value.source} onChange={(e) => onChange({ source: e.target.value as LeadSource | "" })} options={LEAD_SOURCES} placeholder="Non renseignée" />
      </FormField>
      <FormField label="Prochaine étape" htmlFor={id("next")} className="sm:col-span-2">
        <Input id={id("next")} value={value.nextStep} onChange={(e) => onChange({ nextStep: e.target.value })} placeholder="Envoyer la proposition, relancer le DAF…" />
      </FormField>
      {value.stage === "perdu" ? (
        <FormField label="Raison de la perte" htmlFor={id("lost")} className="sm:col-span-2">
          <Textarea id={id("lost")} value={value.lostReason} onChange={(e) => onChange({ lostReason: e.target.value })} className="min-h-16" />
        </FormField>
      ) : null}
    </fieldset>
  );
}
