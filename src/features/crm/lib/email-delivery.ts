"use client";

/**
 * État de l'envoi réel des emails (base connectée) : configuration du serveur
 * (fournisseur + secret de la route d'envoi, via /api/health) et relecture des
 * emails en cours d'envoi — le serveur les passe en « envoyé » ou « erreur ».
 */
import * as React from "react";
import { remoteSync } from "@/lib/data/sync";
import type { EmailMessage } from "@/lib/domain/types";

export interface EmailDelivery {
  /** Base connectée : les emails partent réellement (sinon mode démo). */
  live: boolean;
  /** Envoi configuré côté serveur (undefined : inconnu / en cours de vérification). */
  configured?: boolean;
}

let check: Promise<boolean | undefined> | null = null;

function fetchConfigured(): Promise<boolean | undefined> {
  check ??= fetch("/api/health", { cache: "no-store" })
    .then((r) => r.json())
    .then((h: { services?: { email?: boolean; emailDispatch?: boolean } }) => Boolean(h.services?.email && h.services?.emailDispatch))
    .catch(() => undefined);
  return check;
}

export function useEmailDelivery(): EmailDelivery {
  const live = remoteSync.active;
  const [configured, setConfigured] = React.useState<boolean | undefined>(undefined);
  React.useEffect(() => {
    if (!live) return;
    let alive = true;
    void fetchConfigured().then((v) => {
      if (alive) setConfigured(v);
    });
    return () => {
      alive = false;
    };
  }, [live]);
  return { live, configured };
}

/** Email en file dont l'heure d'envoi est (quasi) atteinte : envoi en cours. */
export function isSending(m: EmailMessage, now: number): boolean {
  return m.status === "programme" && new Date(m.scheduledAt ?? m.createdAt).getTime() <= now + 60_000;
}

/** Relit en base, toutes les 4 s pendant 2 min au plus, les emails en cours d'envoi. */
export function useSendingRefresh(emails: EmailMessage[], now: number) {
  const key = React.useMemo(
    () =>
      emails
        .filter((m) => isSending(m, now))
        .map((m) => m.id)
        .join(","),
    [emails, now],
  );
  React.useEffect(() => {
    if (!remoteSync.active || !key) return;
    const ids = key.split(",");
    let n = 0;
    const timer = window.setInterval(() => {
      n += 1;
      void remoteSync.refresh("emails", ids);
      if (n >= 30) window.clearInterval(timer);
    }, 4_000);
    return () => window.clearInterval(timer);
  }, [key]);
}
