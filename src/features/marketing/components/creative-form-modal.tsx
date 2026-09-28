"use client";

import * as React from "react";
import { Button, Checkbox, FormField, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { useActions } from "@/lib/hooks";
import type { AdCampaign, AdCreative } from "@/lib/domain/types";
import { uid } from "@/lib/utils";
import { CREATIVE_FORMATS } from "../lib/labels";

/** Ajout / édition d'une publicité d'une campagne (les publicités synchronisées sont mises à jour par la régie). */
export function CreativeFormModal({ campaign, creative, onClose }: { campaign: AdCampaign; creative?: AdCreative; onClose: () => void }) {
  const { update } = useActions();
  const toast = useToast();
  const [draft, setDraft] = React.useState<AdCreative>(
    () => creative ?? { id: uid("cr"), name: "", headline: "", primaryText: "", callToAction: "", format: "image", active: true },
  );
  const [error, setError] = React.useState<string>();
  const set = (patch: Partial<AdCreative>) => setDraft((d) => ({ ...d, ...patch }));

  const submit = () => {
    if (draft.name.trim().length < 2) {
      setError("Nommez la publicité (ex. « B — Prix barré »)");
      return;
    }
    const clean: AdCreative = {
      ...draft,
      name: draft.name.trim(),
      headline: draft.headline.trim(),
      primaryText: draft.primaryText.trim(),
      callToAction: draft.callToAction?.trim() || undefined,
      externalId: draft.externalId?.trim() || undefined,
    };
    const creatives = creative ? campaign.creatives.map((c) => (c.id === creative.id ? clean : c)) : [...campaign.creatives, clean];
    update("adCampaigns", campaign.id, { creatives }, { log: `${creative ? "Publicité modifiée" : "Publicité ajoutée"} : ${clean.name}` });
    toast({ title: creative ? "Publicité enregistrée" : "Publicité ajoutée", description: clean.name });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={creative ? "Modifier la publicité" : "Nouvelle publicité"}
      description={campaign.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>Enregistrer</Button>
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
        <FormField label="Nom" htmlFor="cr-name" error={error} className="sm:col-span-2">
          <Input id="cr-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="B — Prix barré Founder" />
        </FormField>
        <FormField label="Titre" htmlFor="cr-headline" className="sm:col-span-2">
          <Input id="cr-headline" value={draft.headline} onChange={(e) => set({ headline: e.target.value })} />
        </FormField>
        <FormField label="Texte principal" htmlFor="cr-text" className="sm:col-span-2">
          <Textarea id="cr-text" value={draft.primaryText} onChange={(e) => set({ primaryText: e.target.value })} className="min-h-16" />
        </FormField>
        <FormField label="Bouton (CTA)" htmlFor="cr-cta">
          <Input id="cr-cta" value={draft.callToAction ?? ""} onChange={(e) => set({ callToAction: e.target.value })} placeholder="Candidater" />
        </FormField>
        <FormField label="Format" htmlFor="cr-format">
          <Select id="cr-format" value={draft.format} onChange={(e) => set({ format: e.target.value as AdCreative["format"] })} options={CREATIVE_FORMATS} />
        </FormField>
        <FormField label={campaign.platform === "meta" ? "ID de la publicité Meta" : "URN de la création LinkedIn"} htmlFor="cr-ext" hint="Pour rattacher les chiffres synchronisés à cette publicité">
          <Input id="cr-ext" value={draft.externalId ?? ""} onChange={(e) => set({ externalId: e.target.value })} className="font-mono" />
        </FormField>
        <div className="flex items-end pb-2">
          <Checkbox label="Publicité active" checked={draft.active} onChange={(e) => set({ active: e.target.checked })} />
        </div>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
