"use client";

import * as React from "react";
import { z } from "zod";
import { useCrm } from "@/lib/store";
import { useSession } from "@/lib/hooks";
import { ORG_STATUSES, ORG_TYPES } from "@/lib/domain/constants";
import type { Organization, OrgStatus, OrgType } from "@/lib/domain/types";
import { Button, FormField, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { normText } from "../../lib/format";
import { useUserOptions } from "./hooks";

const SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Nom obligatoire"),
  siret: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{14}$/.test(v.replace(/\s/g, "")), "Le SIRET compte 14 chiffres"),
  vatNumber: z
    .string()
    .trim()
    .refine((v) => !v || /^[A-Z]{2}[0-9A-Z]{2,13}$/.test(v.replace(/\s/g, "").toUpperCase()), "Format TVA intracommunautaire invalide (ex : FR12345678901)"),
  billingEmail: z
    .string()
    .trim()
    .refine((v) => !v || z.email().safeParse(v).success, "Email de facturation invalide"),
  website: z
    .string()
    .trim()
    .refine((v) => !v || /^https?:\/\//.test(v), "L'URL doit commencer par https://"),
});

interface Props {
  open: boolean;
  onClose: () => void;
  organization?: Organization;
  onSaved?: (o: Organization) => void;
}

export function OrgFormModal(props: Props) {
  if (!props.open) return null;
  return <OrgFormInner {...props} />;
}

function OrgFormInner({ onClose, organization, onSaved }: Props) {
  const organizations = useCrm((s) => s.organizations);
  const create = useCrm((s) => s.create);
  const update = useCrm((s) => s.update);
  const { user } = useSession();
  const toast = useToast();
  const userOptions = useUserOptions();
  const o = organization;
  const [v, setV] = React.useState({
    name: o?.name ?? "",
    type: (o?.type ?? "entreprise") as OrgType,
    status: (o?.status ?? "prospect") as OrgStatus,
    sector: o?.sector ?? "",
    size: (o?.size ?? "") as Organization["size"] | "",
    city: o?.city ?? "",
    country: o?.country ?? "France",
    website: o?.website ?? "",
    siret: o?.siret ?? "",
    vatNumber: o?.vatNumber ?? "",
    billingEmail: o?.billingEmail ?? "",
    address: o?.address ?? "",
    ownerId: o?.ownerId ?? user?.id ?? "",
    notes: o?.notes ?? "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((p) => ({ ...p, [k]: val }));

  const homonym = React.useMemo(() => {
    const n = normText(v.name);
    return n.length > 2 ? organizations.find((x) => x.id !== o?.id && normText(x.name) === n) : undefined;
  }, [organizations, v.name, o?.id]);

  const submit = () => {
    const parsed = schema.safeParse(v);
    const errs: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
    if (homonym) errs.name = "Une organisation porte déjà ce nom";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const data = {
      name: v.name.trim(),
      type: v.type,
      status: v.status,
      sector: v.sector.trim() || undefined,
      size: v.size || undefined,
      city: v.city.trim() || undefined,
      country: v.country.trim() || undefined,
      website: v.website.trim() || undefined,
      siret: v.siret.replace(/\s/g, "") || undefined,
      vatNumber: v.vatNumber.replace(/\s/g, "").toUpperCase() || undefined,
      billingEmail: v.billingEmail.trim().toLowerCase() || undefined,
      address: v.address.trim() || undefined,
      ownerId: v.ownerId || undefined,
      notes: v.notes.trim() || undefined,
    };
    if (o) {
      update("organizations", o.id, data, { log: "Fiche organisation modifiée" });
      toast({ title: "Organisation mise à jour", description: data.name });
      onSaved?.({ ...o, ...data });
    } else {
      const created = create("organizations", { ...data, tags: [] }, { log: "Organisation créée" });
      toast({ title: "Organisation créée", description: created.name });
      onSaved?.(created);
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={o ? "Modifier l'organisation" : "Nouvelle organisation"}
      description="École, entreprise, incubateur, financeur, lieu…"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>{o ? "Enregistrer" : "Créer l'organisation"}</Button>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nom" htmlFor="org-name" error={errors.name} className="sm:col-span-2">
            <Input id="org-name" value={v.name} onChange={(e) => set("name", e.target.value)} autoFocus />
          </FormField>
          <FormField label="Type" htmlFor="org-type">
            <Select id="org-type" value={v.type} onChange={(e) => set("type", e.target.value as OrgType)} options={ORG_TYPES} />
          </FormField>
          <FormField label="Statut" htmlFor="org-status">
            <Select id="org-status" value={v.status} onChange={(e) => set("status", e.target.value as OrgStatus)} options={ORG_STATUSES} />
          </FormField>
          <FormField label="Secteur" htmlFor="org-sector">
            <Input id="org-sector" value={v.sector} onChange={(e) => set("sector", e.target.value)} placeholder="EdTech, Banque, Enseignement supérieur…" />
          </FormField>
          <FormField label="Taille" htmlFor="org-size">
            <Select id="org-size" value={v.size ?? ""} onChange={(e) => set("size", e.target.value as Organization["size"] | "")} options={SIZES.map((s) => ({ value: s, label: `${s} salariés` }))} placeholder="Non renseignée" />
          </FormField>
          <FormField label="Ville" htmlFor="org-city">
            <Input id="org-city" value={v.city} onChange={(e) => set("city", e.target.value)} />
          </FormField>
          <FormField label="Site web" htmlFor="org-web" error={errors.website}>
            <Input id="org-web" value={v.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
          </FormField>
          <FormField label="SIRET" htmlFor="org-siret" error={errors.siret}>
            <Input id="org-siret" value={v.siret} onChange={(e) => set("siret", e.target.value)} inputMode="numeric" placeholder="14 chiffres" />
          </FormField>
          <FormField label="N° TVA intracommunautaire" htmlFor="org-vat" error={errors.vatNumber}>
            <Input id="org-vat" value={v.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} placeholder="FR…" />
          </FormField>
          <FormField label="Email de facturation" htmlFor="org-bill" error={errors.billingEmail}>
            <Input id="org-bill" type="email" value={v.billingEmail} onChange={(e) => set("billingEmail", e.target.value)} placeholder="compta@…" />
          </FormField>
          <FormField label="Propriétaire du compte" htmlFor="org-owner">
            <Select id="org-owner" value={v.ownerId} onChange={(e) => set("ownerId", e.target.value)} options={userOptions} placeholder="Non assigné" />
          </FormField>
          <FormField label="Adresse de facturation" htmlFor="org-address" className="sm:col-span-2">
            <Textarea id="org-address" value={v.address} onChange={(e) => set("address", e.target.value)} className="min-h-16" />
          </FormField>
          <FormField label="Notes" htmlFor="org-notes" className="sm:col-span-2">
            <Textarea id="org-notes" value={v.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-16" />
          </FormField>
        </div>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
