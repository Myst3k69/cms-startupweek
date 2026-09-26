import { File, FileArchive, FileSpreadsheet, FileText, Film, Link2, NotebookText, PenTool, type LucideIcon } from "lucide-react";
import type { ResourceFormat, Visibility } from "@/lib/domain/types";
import { slugify } from "@/lib/utils";

export const STORAGE_BASE = "https://storage.startupweek.tech";

export const FORMAT_ICON: Record<ResourceFormat, LucideIcon> = {
  pdf: FileText,
  docx: FileText,
  xlsx: FileSpreadsheet,
  figma: PenTool,
  notion: NotebookText,
  video: Film,
  lien: Link2,
  zip: FileArchive,
};

export const FALLBACK_ICON = File;

/** Où la ressource est publiée automatiquement selon sa visibilité. */
export const VISIBILITY_HINT: Record<Visibility, string> = {
  public: "Publiée sur startupweek.tech/ressources (accès libre, capture d'email optionnelle).",
  participants: "Espace participant : visible des inscrits aux sessions liées.",
  premium: "Réservée aux offres Signature, Residency et Iteration Lab.",
  interne: "Jamais publiée : usage équipe et preuves Qualiopi.",
};

export type UrlKind = "stable" | "airtable" | "externe";

/** URL stable (Supabase Storage) vs URL Airtable expirante vs lien externe (Notion, Figma, vidéo…). */
export function urlKind(url: string): UrlKind {
  const u = url.toLowerCase();
  if (u.includes("airtable") || u.includes("airtableusercontent")) return "airtable";
  if (u.startsWith(STORAGE_BASE) || u.includes(".supabase.co/storage/")) return "stable";
  return "externe";
}

export function formatFromExt(ext: string): ResourceFormat | undefined {
  const e = ext.toLowerCase();
  if (e === "pdf") return "pdf";
  if (["doc", "docx", "odt", "pages"].includes(e)) return "docx";
  if (["xls", "xlsx", "csv", "ods", "numbers"].includes(e)) return "xlsx";
  if (e === "fig") return "figma";
  if (["zip", "rar", "7z"].includes(e)) return "zip";
  if (["mp4", "mov", "webm", "m4v"].includes(e)) return "video";
  return undefined;
}

/** URL stable générée pour un fichier déposé (démo : le fichier n'est pas téléversé). */
export function storageUrl(fileName: string, suffix: string): string {
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "bin";
  return `${STORAGE_BASE}/ressources/${slugify(base) || "fichier"}-${suffix}.${ext}`;
}

/** 1.2 → 1.3 ; v2 → v3 ; sinon ajoute « .1 ». */
export function bumpVersion(v: string): string {
  const m = /^(.*?)(\d+)$/.exec(v.trim());
  if (!m) return v ? `${v}.1` : "1.0";
  return `${m[1]}${Number(m[2]) + 1}`;
}

export function fileSize(kb?: number): string {
  if (!kb) return "—";
  if (kb < 1024) return `${kb} Ko`;
  return `${(kb / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}
