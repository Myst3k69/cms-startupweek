"use client";

import * as React from "react";
import { useToast } from "@/components/ui";
import type { Application, ApplicationStatus } from "@/lib/domain/types";
import { moveApplication, scheduleInterview } from "../../lib/applications";
import { ExitModal, InterviewModal } from "./status-modals";

export type MoveTarget = ApplicationStatus | "__exit";

/**
 * Flux de changement de statut partagé (Kanban, liste, fiche) :
 * « Entretien planifié » ouvre la planification, « Sorties » demande le motif,
 * le reste passe par `moveApplication` (garde capacité + toast des automatisations).
 */
export function useApplicationMover() {
  const toast = useToast();
  const [pending, setPending] = React.useState<{ app: Application; kind: "interview" | "exit" } | null>(null);

  const apply = React.useCallback(
    (app: Application, to: ApplicationStatus) => {
      const res = moveApplication(app.id, to);
      if (!res.ok && res.tone === "info") return;
      toast({ title: res.title, description: res.description, tone: res.tone });
    },
    [toast],
  );

  const request = React.useCallback(
    (app: Application, to: MoveTarget) => {
      if (to === "__exit") setPending({ app, kind: "exit" });
      else if (to === "entretien") setPending({ app, kind: "interview" });
      else apply(app, to);
    },
    [apply],
  );

  const close = React.useCallback(() => setPending(null), []);

  const modals = pending ? (
    pending.kind === "interview" ? (
      <InterviewModal
        key={pending.app.id}
        app={pending.app}
        onClose={close}
        onConfirm={(iso, notify) => {
          const res = scheduleInterview(pending.app.id, iso, notify);
          toast({ title: res.title, description: res.description, tone: res.tone });
          setPending(null);
        }}
      />
    ) : (
      <ExitModal
        key={pending.app.id}
        app={pending.app}
        onClose={close}
        onChoose={(st) => {
          setPending(null);
          apply(pending.app, st);
        }}
      />
    )
  ) : null;

  return { request, modals };
}
