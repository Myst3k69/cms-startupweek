"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Petite métrique (libellé · valeur · précision) pour les panneaux latéraux des sections. */
export function MiniStat({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-md bg-surface-2/70 px-3 py-2.5", className)}>
      <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 truncate text-lg font-semibold tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Message d'absence de données dans une carte de graphique. */
export function NoData({ children }: { children: React.ReactNode }) {
  return <p className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Barre de proportion inline (taux dans un tableau). */
export function RateBar({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: "var(--series-1)" }} />
      </span>
      <span className="tabular w-11 text-right font-medium text-foreground">{label}</span>
    </span>
  );
}
