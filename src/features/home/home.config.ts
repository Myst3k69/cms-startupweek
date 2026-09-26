import { Gauge, Sparkles, Target, type LucideIcon } from "lucide-react";

/** Trois designs du tableau de bord, même données, présentation différente (comme buildclub). */
export type HomeVariant = "cockpit" | "focus" | "studio";

export const HOME_VARIANTS: HomeVariant[] = ["cockpit", "focus", "studio"];
export const DEFAULT_HOME_VARIANT: HomeVariant = "cockpit";
export const HOME_VARIANT_STORAGE_KEY = "sw-home-variant";
export const HOME_VARIANT_QUERY_PARAM = "home";

export const HOME_VARIANT_META: Record<HomeVariant, { label: string; icon: LucideIcon; pitch: string }> = {
  cockpit: { label: "Cockpit", icon: Gauge, pitch: "Vue dense « mission control » : tous les indicateurs d'un coup d'œil." },
  focus: { label: "Focus", icon: Target, pitch: "Vue « aujourd'hui » : la liste priorisée de ce qu'il faut faire, rien d'autre." },
  studio: { label: "Studio", icon: Sparkles, pitch: "Brief éditorial de la semaine : récit, projets, verbatims, calendrier." },
};

export function isHomeVariant(v: unknown): v is HomeVariant {
  return typeof v === "string" && (HOME_VARIANTS as string[]).includes(v);
}
