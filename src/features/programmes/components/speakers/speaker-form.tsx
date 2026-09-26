"use client";

import * as React from "react";
import { z } from "zod";
import { Checkbox, FormField, Input, Select, Textarea } from "@/components/ui";
import { SPEAKER_KINDS } from "@/lib/domain/constants";
import type { Activity, Speaker, SpeakerKind } from "@/lib/domain/types";
import { CONTRACT_TYPES } from "../../lib/labels";
import { fromDateInput, toDateInput } from "../../lib/sessions";

export interface SpeakerDraft {
  firstName: string;
  lastName: string;
  email: string;
  kind: SpeakerKind;
  contractType: Speaker["contractType"];
  dailyRate: string;
  city: string;
  expertise: string;
  qualifications: string;
  bio: string;
  cvOnFile: boolean;
  lastTraining: string;
}

export function emptySpeakerDraft(): SpeakerDraft {
  return { firstName: "", lastName: "", email: "", kind: "formateur", contractType: "freelance", dailyRate: "", city: "", expertise: "", qualifications: "", bio: "", cvOnFile: false, lastTraining: "" };
}

export function speakerToDraft(s: Speaker): SpeakerDraft {
  return {
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    kind: s.kind,
    contractType: s.contractType,
    dailyRate: s.dailyRateCents !== undefined ? String(s.dailyRateCents / 100) : "",
    city: s.city ?? "",
    expertise: s.expertise.join(", "),
    qualifications: s.qualifications.join("\n"),
    bio: s.bio,
    cvOnFile: s.cvOnFile,
    lastTraining: toDateInput(s.lastTrainingAt),
  };
}

const schema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis"),
  lastName: z.string().trim().min(1, "Nom requis"),
  email: z.string().trim().toLowerCase().email("Email invalide"),
});

/** Valide le brouillon et renvoie les champs du contrat Speaker (ou les erreurs). */
export function parseSpeakerDraft(d: SpeakerDraft): { ok: true; data: Omit<Speaker, "id" | "createdAt" | "updatedAt" | "rating"> } | { ok: false; errors: Record<string, string> } {
  const parsed = schema.safeParse(d);
  const errors: Record<string, string> = {};
  if (!parsed.success) parsed.error.issues.forEach((i) => (errors[String(i.path[0])] = i.message));
  const rate = d.dailyRate.trim() === "" ? undefined : Number(d.dailyRate.replace(",", "."));
  if (rate !== undefined && (Number.isNaN(rate) || rate < 0)) errors.dailyRate = "Montant invalide";
  if (!parsed.success || Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      kind: d.kind,
      contractType: d.contractType,
      dailyRateCents: rate === undefined ? undefined : Math.round(rate * 100),
      city: d.city.trim() || undefined,
      expertise: d.expertise.split(",").map((x) => x.trim()).filter(Boolean),
      qualifications: d.qualifications.split("\n").map((x) => x.replace(/^[-•*]\s*/, "").trim()).filter(Boolean),
      bio: d.bio.trim(),
      cvOnFile: d.cvOnFile,
      lastTrainingAt: fromDateInput(d.lastTraining, 12),
    },
  };
}

export function SpeakerFields({ value, onChange, errors, idPrefix = "spk" }: { value: SpeakerDraft; onChange: (v: SpeakerDraft) => void; errors: Record<string, string>; idPrefix?: string }) {
  const set = <K extends keyof SpeakerDraft>(k: K, v: SpeakerDraft[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Prénom" htmlFor={`${idPrefix}-first`} error={errors.firstName}>
        <Input id={`${idPrefix}-first`} value={value.firstName} onChange={(e) => set("firstName", e.target.value)} />
      </FormField>
      <FormField label="Nom" htmlFor={`${idPrefix}-last`} error={errors.lastName}>
        <Input id={`${idPrefix}-last`} value={value.lastName} onChange={(e) => set("lastName", e.target.value)} />
      </FormField>
      <FormField label="Email" htmlFor={`${idPrefix}-email`} error={errors.email} className="sm:col-span-2">
        <Input id={`${idPrefix}-email`} type="email" value={value.email} onChange={(e) => set("email", e.target.value)} />
      </FormField>
      <FormField label="Rôle" htmlFor={`${idPrefix}-kind`}>
        <Select id={`${idPrefix}-kind`} value={value.kind} onChange={(e) => set("kind", e.target.value as SpeakerKind)} options={SPEAKER_KINDS} />
      </FormField>
      <FormField label="Contrat" htmlFor={`${idPrefix}-contract`}>
        <Select id={`${idPrefix}-contract`} value={value.contractType} onChange={(e) => set("contractType", e.target.value as Speaker["contractType"])} options={CONTRACT_TYPES} />
      </FormField>
      <FormField label="TJM HT (€)" htmlFor={`${idPrefix}-rate`} error={errors.dailyRate}>
        <Input id={`${idPrefix}-rate`} type="number" min={0} step={50} value={value.dailyRate} onChange={(e) => set("dailyRate", e.target.value)} placeholder="Ex. 650" />
      </FormField>
      <FormField label="Ville" htmlFor={`${idPrefix}-city`}>
        <Input id={`${idPrefix}-city`} value={value.city} onChange={(e) => set("city", e.target.value)} />
      </FormField>
      <FormField label="Expertises (séparées par des virgules)" htmlFor={`${idPrefix}-exp`} className="sm:col-span-2">
        <Input id={`${idPrefix}-exp`} value={value.expertise} onChange={(e) => set("expertise", e.target.value)} placeholder="No-code, IA générative, Pitch…" />
      </FormField>
      <FormField label="Qualifications (une par ligne)" htmlFor={`${idPrefix}-qual`} className="sm:col-span-2" hint="Diplômes, certifications, expériences probantes (indicateur 21).">
        <Textarea id={`${idPrefix}-qual`} value={value.qualifications} onChange={(e) => set("qualifications", e.target.value)} className="min-h-20" />
      </FormField>
      <FormField label="Bio" htmlFor={`${idPrefix}-bio`} className="sm:col-span-2">
        <Textarea id={`${idPrefix}-bio`} value={value.bio} onChange={(e) => set("bio", e.target.value)} />
      </FormField>
      <FormField label="Dernière formation suivie" htmlFor={`${idPrefix}-training`} hint="Développement des compétences (indicateur 22)">
        <Input id={`${idPrefix}-training`} type="date" value={value.lastTraining} onChange={(e) => set("lastTraining", e.target.value)} />
      </FormField>
      <div className="flex items-end pb-2">
        <Checkbox checked={value.cvOnFile} onChange={(e) => set("cvOnFile", e.target.checked)} label="CV au dossier (ind. 21)" />
      </div>
    </div>
  );
}

/* ───────────── Conformité (critère 5) ───────────── */

export const YEAR = 365 * 86_400_000;

export function trainingUpToDate(s: Pick<Speaker, "lastTrainingAt">, now: number) {
  return Boolean(s.lastTrainingAt) && now - Date.parse(s.lastTrainingAt!) < YEAR;
}

/** Charte intervenant : tracée dans le journal d'activité (meta.field = "charter"), sans champ dédié dans le contrat. */
export function charterFromLog(activities: Activity[], speakerId: string): { signed: boolean; at?: string } {
  const a = activities.find((x) => x.entity === "speakers" && x.entityId === speakerId && x.meta?.field === "charter");
  return a ? { signed: a.meta?.value === true, at: a.at } : { signed: false };
}

export function useCharterMap(activities: Activity[]) {
  return React.useMemo(() => {
    const m = new Map<string, { signed: boolean; at?: string }>();
    activities.forEach((a) => {
      if (a.entity === "speakers" && a.meta?.field === "charter" && !m.has(a.entityId)) m.set(a.entityId, { signed: a.meta.value === true, at: a.at });
    });
    return m;
  }, [activities]);
}
