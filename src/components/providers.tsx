"use client";

import { useEffect } from "react";
import { ToastProvider, useToast } from "@/components/ui";
import { useCrm } from "@/lib/store";
import { DATA_MODE } from "@/lib/data/supabase";
import { remoteSync } from "@/lib/data/sync";
import { startRemoteSession, watchAuth } from "@/lib/store/remote-session";

/**
 * Démarrage du store + horloge partagée (1 min).
 * Démo : réhydratation du stockage local. Supabase : reprise de la session et chargement
 * des données (sauf sur /auth/callback, qui ouvre lui-même l'espace après l'échange du code).
 */
function StoreRuntime() {
  const toast = useToast();
  useEffect(() => {
    if (DATA_MODE === "supabase") {
      watchAuth();
      if (!window.location.pathname.startsWith("/auth/callback")) void startRemoteSession();
    } else {
      void useCrm.persist.rehydrate();
    }
    const id = window.setInterval(() => useCrm.getState().tick(), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (DATA_MODE !== "supabase") return;
    const off = remoteSync.onError((e) => toast({ title: "Modification non enregistrée", description: e.message, tone: "danger" }));
    // Écritures encore en file : on prévient avant de quitter la page.
    const onUnload = (e: BeforeUnloadEvent) => {
      if (remoteSync.pending > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      off();
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [toast]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <StoreRuntime />
      {children}
    </ToastProvider>
  );
}
