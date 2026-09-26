"use client";

import * as React from "react";
import { z } from "zod";
import { useActions, useCollection, useSession, useSettings } from "@/lib/hooks";
import { COMPLAINT_TYPES } from "@/lib/domain/constants";
import { createTask, nextComplaintNumber } from "@/lib/domain/actions";
import type { Complaint, ComplaintType, ID } from "@/lib/domain/types";
import { Button, FormField, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { COMPLAINT_CHANNELS, SEVERITIES } from "../labels";
import { fieldErrors, userOptions } from "../form-utils";
import { fromDateTimeInput, toDateTimeInput } from "../metrics";
import { ContactPicker } from "./contact-picker";

const schema = z.object({
  subject: z.string().trim().min(3, "Objet trop court (3 caractères minimum)."),
  description: z.string().trim().min(10, "Décrivez la réclamation (10 caractères minimum)."),
  receivedAt: z.string().min(1, "Date de réception obligatoire."),
});

/** Enregistrement manuel d'une réclamation (téléphone, oral, email…) — indicateur 31. */
export function ComplaintCreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: ID) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle réclamation" description="Enregistrement au registre (indicateur 31) — un accusé de réception est attendu sous le délai d'engagement." size="lg">
      {open ? <CreateForm onClose={onClose} onCreated={onCreated} /> : null}
    </Modal>
  );
}

function CreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: ID) => void }) {
  const { create } = useActions();
  const { user } = useSession();
  const settings = useSettings();
  const toast = useToast();
  const users = useCollection("users");
  const events = useCollection("events");
  const applications = useCollection("applications");

  const [number] = React.useState(() => nextComplaintNumber());
  const [receivedAt, setReceivedAt] = React.useState(() => toDateTimeInput(new Date().toISOString()));
  const [channel, setChannel] = React.useState<Complaint["channel"]>("email");
  const [type, setType] = React.useState<ComplaintType>("organisation");
  const [severity, setSeverity] = React.useState<Complaint["severity"]>("mineure");
  const [contactId, setContactId] = React.useState("");
  const [eventId, setEventId] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [ownerId, setOwnerId] = React.useState(settings.qualityLeadId ?? user?.id ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const sessionOptions = React.useMemo(() => {
    const mine = new Set(applications.filter((a) => a.contactId === contactId).map((a) => a.eventId));
    return [...events]
      .sort((a, b) => Number(mine.has(b.id)) - Number(mine.has(a.id)) || b.startAt.localeCompare(a.startAt))
      .map((e) => ({ value: e.id, label: `${mine.has(e.id) ? "★ " : ""}${e.code} · ${e.name}` }));
  }, [events, applications, contactId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ subject, description, receivedAt });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    const receivedIso = fromDateTimeInput(receivedAt) ?? new Date().toISOString();
    const c = create(
      "complaints",
      {
        number,
        receivedAt: receivedIso,
        channel,
        type,
        severity,
        status: "recue",
        contactId: contactId || undefined,
        eventId: eventId || undefined,
        subject: parsed.data.subject,
        description: parsed.data.description,
        ownerId: ownerId || undefined,
      },
      { log: `Réclamation ${number} enregistrée (${channel})` },
    );
    createTask({
      title: `Accuser réception de la réclamation ${number}`,
      kind: "qualiopi",
      priority: severity === "majeure" ? "urgente" : "haute",
      dueAt: new Date(Date.parse(receivedIso) + settings.complaintAckHours * 3_600_000).toISOString(),
      assigneeId: ownerId || undefined,
      related: { entity: "complaints", id: c.id },
      automated: true,
    });
    toast({ title: `Réclamation ${number} enregistrée`, description: `Tâche d'accusé de réception créée (sous ${settings.complaintAckHours} h).` });
    onCreated(c.id);
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Numéro" htmlFor="rec-number" hint="Attribué automatiquement">
          <Input id="rec-number" value={number} readOnly className="font-mono" />
        </FormField>
        <FormField label="Reçue le" htmlFor="rec-date" error={errors.receivedAt}>
          <Input id="rec-date" type="datetime-local" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
        </FormField>
        <FormField label="Canal" htmlFor="rec-channel">
          <Select id="rec-channel" value={channel} onChange={(e) => setChannel(e.target.value as Complaint["channel"])} options={COMPLAINT_CHANNELS} />
        </FormField>
        <FormField label="Type" htmlFor="rec-type">
          <Select id="rec-type" value={type} onChange={(e) => setType(e.target.value as ComplaintType)} options={COMPLAINT_TYPES} />
        </FormField>
        <FormField label="Gravité" htmlFor="rec-sev">
          <Select id="rec-sev" value={severity} onChange={(e) => setSeverity(e.target.value as Complaint["severity"])} options={SEVERITIES} />
        </FormField>
        <FormField label="Responsable du traitement" htmlFor="rec-owner">
          <Select id="rec-owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} options={userOptions(users)} placeholder="Non assigné" />
        </FormField>
      </div>
      <FormField label="Contact (réclamant)" htmlFor="rec-contact" hint="Laissez vide pour une réclamation anonyme.">
        <ContactPicker id="rec-contact" value={contactId} onChange={setContactId} placeholder="Anonyme / non identifié" />
      </FormField>
      <FormField label="Session concernée" htmlFor="rec-event" hint={contactId ? "★ = sessions du contact" : undefined}>
        <Select id="rec-event" value={eventId} onChange={(e) => setEventId(e.target.value)} options={sessionOptions} placeholder="Aucune session" />
      </FormField>
      <FormField label="Objet" htmlFor="rec-subject" error={errors.subject}>
        <Input id="rec-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex. Connexion instable pendant le live du J2" />
      </FormField>
      <FormField label="Description" htmlFor="rec-desc" error={errors.description}>
        <Textarea id="rec-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Faits rapportés, date, personnes concernées, attentes du réclamant…" />
      </FormField>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit">Enregistrer la réclamation</Button>
      </div>
    </form>
  );
}
