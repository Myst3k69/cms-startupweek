"use client";

import { useState, useSyncExternalStore } from "react";
import { DEFAULT_HOME_VARIANT, HOME_VARIANT_QUERY_PARAM, HOME_VARIANT_STORAGE_KEY, isHomeVariant, type HomeVariant } from "./home.config";
import { VariantSwitcher } from "./variant-switcher";
import { CockpitHome } from "./variants/cockpit";
import { FocusHome } from "./variants/focus";
import { StudioHome } from "./variants/studio";
import { useDashboardData } from "./use-dashboard-data";

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readStored(): HomeVariant | null {
  try {
    const v = localStorage.getItem(HOME_VARIANT_STORAGE_KEY);
    return isHomeVariant(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Tableau de bord composé — priorité de la variante :
 * 1. query string ?home= (partageable) · 2. localStorage · 3. « cockpit ».
 */
export function HomePage({ initialVariant }: { initialVariant?: HomeVariant }) {
  const stored = useSyncExternalStore(subscribe, readStored, () => null);
  const [chosen, setChosen] = useState<HomeVariant | null>(null);
  const variant: HomeVariant = chosen ?? initialVariant ?? stored ?? DEFAULT_HOME_VARIANT;
  const data = useDashboardData();

  const change = (v: HomeVariant) => {
    setChosen(v);
    try {
      localStorage.setItem(HOME_VARIANT_STORAGE_KEY, v);
    } catch {
      /* stockage indisponible */
    }
    listeners.forEach((l) => l());
    const url = new URL(window.location.href);
    url.searchParams.set(HOME_VARIANT_QUERY_PARAM, v);
    window.history.replaceState(null, "", url.toString());
  };

  const View = variant === "focus" ? FocusHome : variant === "studio" ? StudioHome : CockpitHome;
  return (
    <>
      <div key={variant} className="page-enter pb-16">
        <View data={data} />
      </div>
      <VariantSwitcher value={variant} onChange={change} />
    </>
  );
}
