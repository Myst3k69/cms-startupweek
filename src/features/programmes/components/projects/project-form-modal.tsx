"use client";

import * as React from "react";
import { z } from "zod";
import { Rocket } from "lucide-react";
import { Button, FormField, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { PROJECT_STAGES } from "@/lib/domain/constants";
import type { ID, Project, ProjectStage } from "@/lib/domain/types";
import { useActions, useCollection } from "@/lib/hooks";
import { uid } from "@/lib/utils";
import { contactName } from "@/lib/domain/selectors";

const schema = z.object({
  name: z.string().trim().min(2, "Nom du projet requis (2 caractères minimum)"),
  tagline: z.string().trim().max(140, "140 caractères maximum"),
  sector: z.string().trim().min(2, "Secteur requis"),
});

export interface ProjectDraft {
  name?: string;
  tagline?: string;
  description?: string;
  sector?: string;
  targetMarket?: string;
  stage?: ProjectStage;
  founderIds?: ID[];
  eventIds?: ID[];
}

/** Milestones par défaut du parcours StartupWeek (J1 → J+90). */
function defaultMilestones(): Project["milestones"] {
  return [
    { id: uid("ms"), label: "Scope MVP validé" },
    { id: uid("ms"), label: "Maquette testée" },
    { id: uid("ms"), label: "MVP en ligne" },
    { id: uid("ms"), label: "5 tests utilisateurs" },
    { id: uid("ms"), label: "Premiers utilisateurs actifs" },
  ];
}

/**
 * Création d'un projet (depuis /projets ou depuis le dossier d'une candidature :
 * fin du « projet saisi deux fois » d'Airtable).
 */
export function ProjectFormModal({
  open,
  onClose,
  initial,
  onCreated,
  lockedFounder,
}: {
  open: boolean;
  onClose: () => void;
  initial?: ProjectDraft;
  onCreated?: (p: Project) => void;
  lockedFounder?: boolean;
}) {
  const { create } = useActions();
  const toast = useToast();
  const contacts = useCollection("contacts");
  const events = useCollection("events");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [tagline, setTagline] = React.useState(initial?.tagline ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [sector, setSector] = React.useState(initial?.sector ?? "");
  const [targetMarket, setTargetMarket] = React.useState(initial?.targetMarket ?? "");
  const [stage, setStage] = React.useState<ProjectStage>(initial?.stage ?? "idee");
  const [founderId, setFounderId] = React.useState(initial?.founderIds?.[0] ?? "");
  const [eventId, setEventId] = React.useState(initial?.eventIds?.[0] ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const founderOptions = React.useMemo(
    () =>
      contacts
        .filter((c) => ["candidat", "participant", "alumni"].includes(c.lifecycle) || c.id === founderId)
        .sort((a, b) => contactName(a).localeCompare(contactName(b), "fr"))
        .map((c) => ({ value: c.id, label: `${contactName(c)} — ${c.email}` })),
    [contacts, founderId],
  );
  const eventOptions = React.useMemo(
    () => [...events].sort((a, b) => b.startAt.localeCompare(a.startAt)).map((e) => ({ value: e.id, label: `${e.code} · ${e.city}` })),
    [events],
  );

  const submit = () => {
    const parsed = schema.safeParse({ name, tagline, sector });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      setErrors(errs);
      return;
    }
    const ts = new Date().toISOString();
    const p = create(
      "projects",
      {
        name: parsed.data.name,
        tagline: parsed.data.tagline,
        description: description.trim(),
        stage,
        sector: parsed.data.sector,
        targetMarket: targetMarket.trim(),
        founderIds: founderId ? [founderId] : [],
        eventIds: eventId ? [eventId] : [],
        mentorIds: [],
        sixMonthGoals: "",
        milestones: defaultMilestones(),
        metrics: {},
        health: "on_track",
        lastUpdateAt: ts,
        lastUpdateNote: "Projet créé",
        awards: [],
      },
      { log: "Projet créé" },
    );
    toast({ title: `Projet « ${p.name} » créé`, description: "Fondateur et session rattachés, jalons du parcours StartupWeek initialisés." });
    onCreated?.(p);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouveau projet"
      description="Fiche unique du projet, partagée par la candidature, la session et le suivi post-formation."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>
            <Rocket /> Créer le projet
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormField label="Nom du projet" htmlFor="prj-name" error={errors.name}>
          <Input id="prj-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </FormField>
        <FormField label="Secteur" htmlFor="prj-sector" error={errors.sector} hint="Ex. EdTech, HealthTech, SaaS B2B…">
          <Input id="prj-sector" value={sector} onChange={(e) => setSector(e.target.value)} />
        </FormField>
        <FormField label="Pitch en une phrase" htmlFor="prj-tagline" error={errors.tagline} className="sm:col-span-2">
          <Input id="prj-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="L'app qui…" />
        </FormField>
        <FormField label="Description" htmlFor="prj-desc" className="sm:col-span-2">
          <Textarea id="prj-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <FormField label="Marché cible" htmlFor="prj-market">
          <Input id="prj-market" value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)} />
        </FormField>
        <FormField label="Stade" htmlFor="prj-stage">
          <Select id="prj-stage" value={stage} onChange={(e) => setStage(e.target.value as ProjectStage)} options={PROJECT_STAGES} />
        </FormField>
        <FormField label="Fondateur·rice" htmlFor="prj-founder">
          <Select id="prj-founder" value={founderId} onChange={(e) => setFounderId(e.target.value)} options={founderOptions} placeholder="—" disabled={lockedFounder} />
        </FormField>
        <FormField label="Session" htmlFor="prj-event">
          <Select id="prj-event" value={eventId} onChange={(e) => setEventId(e.target.value)} options={eventOptions} placeholder="—" />
        </FormField>
      </form>
    </Modal>
  );
}
