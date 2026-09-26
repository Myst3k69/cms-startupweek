"use client";

import * as React from "react";
import { useCrm } from "@/lib/store";
import { useSession } from "@/lib/hooks";
import type { Deal } from "@/lib/domain/types";
import { Button, Modal, useToast } from "@/components/ui";
import { DealFields, draftFromDeal, draftToPatch, validateDraft, type DealDraft } from "./deal-fields";

/** Création d'une opportunité (depuis le pipeline ou une fiche organisation / contact). */
export function DealFormModal(props: { open: boolean; onClose: () => void; orgId?: string; contactId?: string; onCreated?: (d: Deal) => void }) {
  if (!props.open) return null;
  return <DealFormInner {...props} />;
}

function DealFormInner({ onClose, orgId, contactId, onCreated }: { onClose: () => void; orgId?: string; contactId?: string; onCreated?: (d: Deal) => void }) {
  const { user } = useSession();
  const create = useCrm((s) => s.create);
  const toast = useToast();
  const [draft, setDraft] = React.useState<DealDraft>(() => draftFromDeal(undefined, { ownerId: user?.id, orgId, contactId }));
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const submit = () => {
    const errs = validateDraft(draft);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const data = draftToPatch(draft);
    const closed = data.stage === "gagne" || data.stage === "perdu";
    const deal = create("deals", { ...data, closedAt: closed ? new Date().toISOString() : undefined }, { log: "Opportunité créée" });
    toast({ title: "Opportunité créée", description: deal.title });
    onCreated?.(deal);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Nouvelle opportunité"
      description="École, entreprise, partenariat, accompagnement ou sponsoring."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>Créer l'opportunité</Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <DealFields value={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} errors={errors} idPrefix="new-deal" />
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
