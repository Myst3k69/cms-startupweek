"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, FormField, Input, Modal, Select, useToast } from "@/components/ui";
import { useActions, useCollection, useSession } from "@/lib/hooks";
import { CHANNELS, CONTENT_TYPES } from "@/lib/domain/constants";
import type { Channel, ContentType } from "@/lib/domain/types";
import { slugify } from "@/lib/utils";
import { DEFAULT_CHANNEL, fromLocalInput } from "../lib/content";

/** Création d'un contenu (statut « Idée ») puis redirection vers l'éditeur. */
export function NewContentModal({ open, onClose, defaultDate }: { open: boolean; onClose: () => void; defaultDate?: string }) {
  const router = useRouter();
  const toast = useToast();
  const { create } = useActions();
  const { user } = useSession();
  const contents = useCollection("contents");
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<ContentType>("article");
  const [channel, setChannel] = React.useState<Channel>("blog");
  const [when, setWhen] = React.useState(defaultDate ?? "");
  const [error, setError] = React.useState<string>();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (clean.length < 3) {
      setError("Donnez un titre de travail (3 caractères minimum).");
      return;
    }
    const base = slugify(clean) || "contenu";
    let slug = base;
    for (let n = 2; contents.some((c) => c.slug === slug); n++) slug = `${base}-${n}`;
    const item = create(
      "contents",
      {
        title: clean,
        slug,
        type,
        channel,
        status: "idee",
        authorId: user?.id,
        excerpt: "",
        body: "",
        tags: [],
        scheduledAt: fromLocalInput(when),
        metrics: { views: 0, clicks: 0, leads: 0 },
      },
      { log: "Contenu créé (idée)" },
    );
    toast({ title: "Contenu créé", description: "Complétez-le dans l'éditeur." });
    onClose();
    router.push(`/contenus/${item.id}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouveau contenu"
      description="Article, post, newsletter ou page du site : il démarre au statut « Idée »."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form="new-content-form">
            Créer et ouvrir l'éditeur
          </Button>
        </>
      }
    >
      <form id="new-content-form" onSubmit={submit} className="space-y-4">
        <FormField label="Titre de travail" htmlFor="nc-title" error={error}>
          <Input
            id="nc-title"
            autoFocus
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(undefined);
            }}
            placeholder="Ex. : Lancer son MVP no-code en 7 jours"
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Type" htmlFor="nc-type">
            <Select
              id="nc-type"
              value={type}
              onChange={(e) => {
                const t = e.target.value as ContentType;
                setType(t);
                setChannel(DEFAULT_CHANNEL[t]);
              }}
              options={CONTENT_TYPES}
            />
          </FormField>
          <FormField label="Canal" htmlFor="nc-channel">
            <Select id="nc-channel" value={channel} onChange={(e) => setChannel(e.target.value as Channel)} options={CHANNELS} />
          </FormField>
        </div>
        <FormField label="Date cible (optionnel)" htmlFor="nc-when" hint="Apparaît dans le calendrier éditorial ; la programmation se confirme dans l'éditeur.">
          <Input id="nc-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </FormField>
      </form>
    </Modal>
  );
}
