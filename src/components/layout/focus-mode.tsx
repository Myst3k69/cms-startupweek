"use client";

import { usePathname } from "next/navigation";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui";
import { enterFocusMode, exitFocusMode, inFocusScope, useFocusScope } from "./sidebar";

/**
 * Bascule du mode lecture : menu et en-tête masqués, page en pleine largeur.
 * Reste actif sur toutes les pages sous `scope` (ex. éditeur ↔ aperçu d'une même formation) ; Échap pour quitter.
 */
export function FocusModeButton({ scope, size = "sm" }: { scope: string; size?: "xs" | "sm" }) {
  const pathname = usePathname();
  const active = inFocusScope(useFocusScope(), pathname);
  return (
    <Button size={size} variant="ghost" onClick={() => (active ? exitFocusMode() : enterFocusMode(scope))} aria-pressed={active}>
      {active ? <Minimize2 /> : <Maximize2 />} {active ? "Quitter le plein écran" : "Plein écran"}
    </Button>
  );
}
