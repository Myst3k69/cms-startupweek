"use client";

import { useEffect } from "react";
import { ToastProvider } from "@/components/ui";
import { useCrm } from "@/lib/store";

/** Réhydrate le store persistant après montage + horloge partagée (1 min). */
function StoreRuntime() {
  useEffect(() => {
    void useCrm.persist.rehydrate();
    const id = window.setInterval(() => useCrm.getState().tick(), 60_000);
    return () => window.clearInterval(id);
  }, []);
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
