"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ACADEMY_DA_META, ACADEMY_DA_QUERY_PARAM, ACADEMY_DA_STORAGE_KEY, ACADEMY_DAS, DEFAULT_ACADEMY_DA, isAcademyDa, type AcademyDa } from "../lib/da";

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readStored(): AcademyDa | null {
  try {
    const v = localStorage.getItem(ACADEMY_DA_STORAGE_KEY);
    return isAcademyDa(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Direction artistique active de l'Academy — priorité :
 * 1. ?da= (partageable) · 2. choix mémorisé (localStorage) · 3. « neon ».
 * Doit être rendu sous <Suspense> (useSearchParams).
 */
export function useAcademyDa(): [AcademyDa, (v: AcademyDa) => void] {
  const params = useSearchParams();
  const fromQuery = params.get(ACADEMY_DA_QUERY_PARAM);
  const stored = React.useSyncExternalStore(subscribe, readStored, () => null);
  const [chosen, setChosen] = React.useState<AcademyDa | null>(null);
  const da: AcademyDa = chosen ?? (isAcademyDa(fromQuery) ? fromQuery : null) ?? stored ?? DEFAULT_ACADEMY_DA;
  const change = (v: AcademyDa) => {
    setChosen(v);
    try {
      localStorage.setItem(ACADEMY_DA_STORAGE_KEY, v);
    } catch {
      /* stockage indisponible */
    }
    listeners.forEach((l) => l());
    const url = new URL(window.location.href);
    url.searchParams.set(ACADEMY_DA_QUERY_PARAM, v);
    window.history.replaceState(null, "", url.toString());
  };
  return [da, change];
}

/** Zone stylée par la direction artistique (Néon force le thème sombre dans la zone). */
export function DaScope({ da, className, children, ...props }: React.ComponentProps<"div"> & { da: AcademyDa }) {
  return (
    <div data-da={da} className={cn(da === "neon" && "scope-dark", "bg-da-bg text-da-ink", className)} {...props}>
      {children}
    </div>
  );
}

/** Switch 3 positions (bas droite), comme les designs du tableau de bord. */
export function DaSwitcher({ value, onChange }: { value: AcademyDa; onChange: (v: AcademyDa) => void }) {
  const index = ACADEMY_DAS.indexOf(value);
  return (
    <div className="no-print fixed bottom-4 right-4 z-30 sm:bottom-5 sm:right-5" role="radiogroup" aria-label="Direction artistique de l'Academy">
      <div data-da="neon" className="scope-dark relative flex items-center rounded-full border border-border bg-background/90 p-1 text-xs text-foreground shadow-lg backdrop-blur">
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-da-accent transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
        {ACADEMY_DAS.map((v) => {
          const meta = ACADEMY_DA_META[v];
          const active = v === value;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={active}
              title={meta.pitch}
              onClick={() => onChange(v)}
              className={cn(
                "relative z-10 inline-flex w-[5.5rem] items-center justify-center gap-1.5 rounded-full px-2 py-1.5 font-semibold transition-colors sm:w-24",
                active ? "text-da-accent-ink" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <meta.icon className="size-3.5" aria-hidden="true" />
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
