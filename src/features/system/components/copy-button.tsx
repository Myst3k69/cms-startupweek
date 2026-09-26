"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button, useToast } from "@/components/ui";

/** Bouton « copier » avec retour visuel (coche 1,5 s) + toast. */
export function CopyButton({ value, label = "Copier", className, iconOnly }: { value: string; label?: string; className?: string; iconOnly?: boolean }) {
  const toast = useToast();
  const [done, setDone] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.setTimeout(() => setDone(false), 1500);
      toast({ title: "Copié dans le presse-papiers" });
    } catch {
      toast({ title: "Copie impossible", description: "Sélectionnez le texte manuellement.", tone: "danger" });
    }
  };
  return (
    <Button variant={iconOnly ? "ghost" : "secondary"} size={iconOnly ? "icon-xs" : "xs"} onClick={copy} className={className} aria-label={label} title={label}>
      {done ? <Check /> : <Copy />}
      {iconOnly ? null : done ? "Copié" : label}
    </Button>
  );
}

const subscribe = () => () => {};
/** Origine de l'application (URL absolue des endpoints) sans lecture de window pendant le rendu serveur. */
export function useOrigin(fallback = "https://os.startupweek.tech") {
  return React.useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => fallback,
  );
}
