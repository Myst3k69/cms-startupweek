"use client";

import * as React from "react";
import { CalendarClock, Clock3, LogOut, UserX, Ban, Hourglass } from "lucide-react";
import { Button, Checkbox, FormField, Input, Modal, Badge } from "@/components/ui";
import { useEntity, useNow } from "@/lib/hooks";
import { APPLICATION_EXITS, APPLICATION_STATUSES, labelOf, toneOf } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { Application, ApplicationStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { DAY, fromDateTimeInput, toDateTimeInput } from "../../lib/sessions";

/** Planification d'entretien (drag vers « Entretien planifié » ou action de la fiche). */
export function InterviewModal({
  app,
  onClose,
  onConfirm,
}: {
  app: Application;
  onClose: () => void;
  onConfirm: (iso: string | undefined, notify: boolean) => void;
}) {
  const now = useNow();
  const contact = useEntity("contacts", app.contactId);
  const [value, setValue] = React.useState(() => {
    if (app.interviewAt) return toDateTimeInput(app.interviewAt);
    const d = new Date(now + 2 * DAY);
    d.setHours(10, 0, 0, 0);
    return toDateTimeInput(d.toISOString());
  });
  const [notify, setNotify] = React.useState(true);
  const iso = fromDateTimeInput(value);
  return (
    <Modal
      open
      onClose={onClose}
      title="Planifier l'entretien"
      description={`#${app.number} · ${contactName(contact)}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => onConfirm(iso, notify && Boolean(iso))}>
            <CalendarClock /> {app.status === "entretien" ? "Enregistrer" : "Planifier"}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(iso, notify && Boolean(iso));
        }}
      >
        <FormField label="Date et heure de l'entretien" htmlFor="interview-at" hint="Laisser vide pour planifier plus tard.">
          <Input id="interview-at" type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
        </FormField>
        <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} label="Envoyer l'invitation par email au candidat" disabled={!iso} />
        <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
          <Clock3 className="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
          Une tâche « Préparer l'entretien » est créée automatiquement pour le référent de la candidature.
        </p>
      </form>
    </Modal>
  );
}

const EXIT_HELP: Record<string, { icon: React.ComponentType<{ className?: string }>; text: string }> = {
  liste_attente: { icon: Hourglass, text: "Session complète ou dossier à revoir : le candidat reste prioritaire si une place se libère." },
  refusee: { icon: Ban, text: "Décision datée et email de refus bienveillant envoyé automatiquement." },
  hors_cible: { icon: UserX, text: "Profil hors cible : tunnel marqué « out of scope » et email de refus envoyé." },
  desistee: { icon: LogOut, text: "Le candidat renonce : la place est libérée sur la session." },
};

/** Choix du motif de sortie (dépôt sur la colonne « Sorties » repliée). */
export function ExitModal({ app, onClose, onChoose }: { app: Application; onClose: () => void; onChoose: (status: ApplicationStatus) => void }) {
  const contact = useEntity("contacts", app.contactId);
  return (
    <Modal open onClose={onClose} title="Sortie du pipeline" description={`#${app.number} · ${contactName(contact)} — choisissez le motif`} size="sm">
      <ul className="space-y-2">
        {APPLICATION_EXITS.map((st) => {
          const help = EXIT_HELP[st];
          const Icon = help.icon;
          return (
            <li key={st}>
              <button
                type="button"
                onClick={() => onChoose(st)}
                disabled={app.status === st}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-surface-2 disabled:opacity-50",
                )}
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <Badge tone={toneOf(APPLICATION_STATUSES, st)} dot>
                    {labelOf(APPLICATION_STATUSES, st)}
                  </Badge>
                  <span className="mt-1 block text-xs text-muted-foreground">{help.text}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
