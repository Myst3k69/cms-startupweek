"use client";

import { cn } from "@/lib/utils";
import { HOME_VARIANT_META, HOME_VARIANTS, type HomeVariant } from "./home.config";

/**
 * Switch 3 positions (bas droite) — pilule avec curseur glissant.
 * Facile à retirer : supprimer ce composant et son usage dans HomePage.
 */
export function VariantSwitcher({ value, onChange }: { value: HomeVariant; onChange: (v: HomeVariant) => void }) {
  const index = HOME_VARIANTS.indexOf(value);
  return (
    <div className="no-print fixed bottom-4 right-4 z-30 sm:bottom-5 sm:right-5" role="radiogroup" aria-label="Design du tableau de bord">
      <div className="relative flex items-center rounded-full border border-white/10 bg-[#0a0a0a]/90 p-1 text-xs text-white shadow-lg backdrop-blur">
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-[#00f5ff] shadow-[0_0_18px_-2px_rgba(0,245,255,.6)] transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
        {HOME_VARIANTS.map((v) => {
          const meta = HOME_VARIANT_META[v];
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
                active ? "text-[#001417]" : "text-white/70 hover:text-white",
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
