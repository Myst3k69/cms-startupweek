"use client";

import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import { useCrm } from "@/lib/store";
import { useSession } from "@/lib/hooks";
import { LEAD_SOURCES, LIFECYCLES } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { Contact, ContactLifecycle, LeadSource } from "@/lib/domain/types";
import { normalizeEmail } from "@/lib/utils";
import { Button, Checkbox, FormField, Input, Modal, Select, useToast } from "@/components/ui";
import { useOrgOptions, useUserOptions } from "./hooks";

const schema = z.object({
  firstName: z.string().trim().min(1, "Prénom obligatoire"),
  lastName: z.string().trim().min(1, "Nom obligatoire"),
  email: z.email("Adresse email invalide"),
  phone: z
    .string()
    .trim()
    .refine((v) => !v || /^[+\d][\d\s().-]{7,}$/.test(v), "Numéro de téléphone invalide"),
  linkedin: z
    .string()
    .trim()
    .refine((v) => !v || /^https?:\/\//.test(v), "L'URL doit commencer par https://"),
});

interface Props {
  open: boolean;
  onClose: () => void;
  contact?: Contact; // édition
  onSaved?: (c: Contact) => void;
}

/** Création / édition d'un contact — email normalisé et unique (refus des doublons). */
export function ContactFormModal(props: Props) {
  if (!props.open) return null;
  return <ContactFormInner {...props} />;
}

function ContactFormInner({ onClose, contact, onSaved }: Props) {
  const contacts = useCrm((s) => s.contacts);
  const create = useCrm((s) => s.create);
  const update = useCrm((s) => s.update);
  const { user } = useSession();
  const toast = useToast();
  const userOptions = useUserOptions();
  const orgOptions = useOrgOptions();

  const [v, setV] = React.useState({
    firstName: contact?.firstName ?? "",
    lastName: contact?.lastName ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    jobTitle: contact?.jobTitle ?? "",
    city: contact?.city ?? "",
    linkedin: contact?.linkedin ?? "",
    orgId: contact?.orgId ?? "",
    lifecycle: (contact?.lifecycle ?? "lead") as ContactLifecycle,
    source: (contact?.source ?? "autre") as LeadSource,
    ownerId: contact?.ownerId ?? user?.id ?? "",
    gdpr: contact?.consent.gdpr ?? false,
    marketing: contact?.consent.marketing ?? false,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((p) => ({ ...p, [k]: val }));

  const duplicate = React.useMemo(() => {
    const e = normalizeEmail(v.email);
    if (!e) return undefined;
    return contacts.find((c) => c.id !== contact?.id && normalizeEmail(c.email) === e);
  }, [contacts, v.email, contact?.id]);

  const submit = () => {
    const parsed = schema.safeParse({ firstName: v.firstName, lastName: v.lastName, email: v.email.trim(), phone: v.phone, linkedin: v.linkedin });
    const errs: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
    if (duplicate) errs.email = "Un contact existe déjà avec cet email";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const nowIso = new Date().toISOString();
    const base = {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      email: normalizeEmail(v.email),
      phone: v.phone.trim() || undefined,
      jobTitle: v.jobTitle.trim() || undefined,
      city: v.city.trim() || undefined,
      linkedin: v.linkedin.trim() || undefined,
      orgId: v.orgId || undefined,
      lifecycle: v.lifecycle,
      source: v.source,
      ownerId: v.ownerId || undefined,
    };
    if (contact) {
      const prev = contact.consent;
      const consent = {
        ...prev,
        gdpr: v.gdpr,
        marketing: v.marketing,
        marketingAt: v.marketing && !prev.marketing ? nowIso : prev.marketingAt,
        unsubscribedAt: !v.marketing && prev.marketing ? nowIso : prev.unsubscribedAt,
      };
      update("contacts", contact.id, { ...base, consent }, { log: "Fiche contact modifiée" });
      toast({ title: "Contact mis à jour", description: `${base.firstName} ${base.lastName}` });
      onSaved?.({ ...contact, ...base, consent });
    } else {
      const created = create(
        "contacts",
        {
          ...base,
          tags: [],
          score: 20 + (base.orgId ? 10 : 0) + (base.phone ? 5 : 0),
          consent: { gdpr: v.gdpr, marketing: v.marketing, marketingAt: v.marketing ? nowIso : undefined, source: "Saisie manuelle (back-office)" },
          lastContactAt: undefined,
        },
        { log: "Contact créé manuellement" },
      );
      toast({ title: "Contact créé", description: `${created.firstName} ${created.lastName}` });
      onSaved?.(created);
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={contact ? "Modifier le contact" : "Nouveau contact"}
      description={contact ? contactName(contact) : "L'email est normalisé (minuscules) et doit être unique."}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>{contact ? "Enregistrer" : "Créer le contact"}</Button>
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
          <FormField label="Prénom" htmlFor="ct-first" error={errors.firstName}>
            <Input id="ct-first" value={v.firstName} onChange={(e) => set("firstName", e.target.value)} autoFocus />
          </FormField>
          <FormField label="Nom" htmlFor="ct-last" error={errors.lastName}>
            <Input id="ct-last" value={v.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </FormField>
          <FormField label="Email" htmlFor="ct-email" error={errors.email}>
            <Input id="ct-email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} aria-invalid={Boolean(errors.email || duplicate)} />
            {duplicate ? (
              <p className="text-xs text-danger-text">
                Déjà utilisé par{" "}
                <Link href={`/contacts/${duplicate.id}`} className="font-medium underline" onClick={onClose}>
                  {contactName(duplicate)}
                </Link>
              </p>
            ) : null}
          </FormField>
          <FormField label="Téléphone" htmlFor="ct-phone" error={errors.phone}>
            <Input id="ct-phone" type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+33 6 12 34 56 78" />
          </FormField>
          <FormField label="Fonction" htmlFor="ct-job">
            <Input id="ct-job" value={v.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />
          </FormField>
          <FormField label="Ville" htmlFor="ct-city">
            <Input id="ct-city" value={v.city} onChange={(e) => set("city", e.target.value)} />
          </FormField>
          <FormField label="Organisation" htmlFor="ct-org">
            <Select id="ct-org" value={v.orgId} onChange={(e) => set("orgId", e.target.value)} options={orgOptions} placeholder="Aucune" />
          </FormField>
          <FormField label="LinkedIn" htmlFor="ct-li" error={errors.linkedin}>
            <Input id="ct-li" value={v.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://www.linkedin.com/in/…" />
          </FormField>
          <FormField label="Cycle de vie" htmlFor="ct-lc">
            <Select id="ct-lc" value={v.lifecycle} onChange={(e) => set("lifecycle", e.target.value as ContactLifecycle)} options={LIFECYCLES} />
          </FormField>
          <FormField label="Source" htmlFor="ct-src">
            <Select id="ct-src" value={v.source} onChange={(e) => set("source", e.target.value as LeadSource)} options={LEAD_SOURCES} />
          </FormField>
          <FormField label="Propriétaire" htmlFor="ct-owner">
            <Select id="ct-owner" value={v.ownerId} onChange={(e) => set("ownerId", e.target.value)} options={userOptions} placeholder="Non assigné" />
          </FormField>
        </div>
        <fieldset className="space-y-2 rounded-md border border-border p-3">
          <legend className="px-1 text-xs font-medium text-muted-foreground">Consentements (preuve horodatée)</legend>
          <Checkbox checked={v.gdpr} onChange={(e) => set("gdpr", e.target.checked)} label="Accepte le traitement de ses données (RGPD)" />
          <Checkbox checked={v.marketing} onChange={(e) => set("marketing", e.target.checked)} label="Accepte les communications marketing (newsletter, offres)" />
          <p className="text-xs text-faint">Ne cochez que si la personne a donné son accord explicite — le consentement n'est jamais présumé.</p>
        </fieldset>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
