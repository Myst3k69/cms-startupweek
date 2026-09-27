import { BookOpen, PenTool, Zap, type LucideIcon } from "lucide-react";

/** Trois directions artistiques pour StartupWeek Academy (même contenu, présentation différente). */
export type AcademyDa = "neon" | "campus" | "atelier";

export const ACADEMY_DAS: AcademyDa[] = ["neon", "campus", "atelier"];
export const DEFAULT_ACADEMY_DA: AcademyDa = "neon";
export const ACADEMY_DA_STORAGE_KEY = "sw-academy-da";
export const ACADEMY_DA_QUERY_PARAM = "da";

export const ACADEMY_DA_META: Record<AcademyDa, { label: string; icon: LucideIcon; pitch: string }> = {
  neon: { label: "Néon", icon: Zap, pitch: "L'énergie StartupWeek : fond sombre, cyan, progression gamifiée." },
  campus: { label: "Campus", icon: BookOpen, pitch: "Éditorial : papier chaud, titres serif, lecture longue et posée." },
  atelier: { label: "Atelier", icon: PenTool, pitch: "Outil de travail : minimal, dense, centré sur le contenu." },
};

export function isAcademyDa(v: unknown): v is AcademyDa {
  return typeof v === "string" && (ACADEMY_DAS as string[]).includes(v);
}
