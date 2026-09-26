/**
 * Petits utilitaires d'affichage propres au CRM commercial.
 * Tous purs : `now` est toujours passé explicitement.
 */
import type { Tone } from "@/lib/domain/constants";
import { slaState } from "@/lib/domain/selectors";
import type { Submission } from "@/lib/domain/types";
import { date } from "@/lib/format";

export const MINUTE = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

/** Durée courte : « 35 min », « 6 h », « 3 j ». */
export function durationShort(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < HOUR) return `${Math.max(1, Math.round(abs / MINUTE))} min`;
  if (abs < 48 * HOUR) return `${Math.round(abs / HOUR)} h`;
  return `${Math.round(abs / DAY)} j`;
}

/** Durée moyenne lisible : « 5 h 20 », « 2 j 3 h ». */
export function durationLong(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  if (ms < HOUR) return `${Math.round(ms / MINUTE)} min`;
  if (ms < DAY) {
    const h = Math.floor(ms / HOUR);
    const m = Math.round((ms - h * HOUR) / MINUTE);
    return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
  }
  const d = Math.floor(ms / DAY);
  const h = Math.round((ms - d * DAY) / HOUR);
  return h ? `${d} j ${h} h` : `${d} j`;
}

/** Badge SLA d'une demande : « dans 6 h » / « dépassé de 12 h » / « répondu en 3 h ». */
export function slaBadge(sub: Submission, now: number): { label: string; tone: Tone; title: string } | null {
  const state = slaState(sub, now);
  if (state === "traite") {
    if (sub.answeredAt) {
      const took = new Date(sub.answeredAt).getTime() - new Date(sub.receivedAt).getTime();
      return { label: `répondu en ${durationShort(took)}`, tone: "success", title: "Première réponse envoyée" };
    }
    return null;
  }
  if (!sub.slaDueAt) return { label: "sans échéance", tone: "neutral", title: "Aucune échéance de réponse" };
  const left = new Date(sub.slaDueAt).getTime() - now;
  const title = `Réponse promise avant le ${date(sub.slaDueAt, "d MMM à HH:mm")}`;
  if (state === "depasse") return { label: `dépassé de ${durationShort(left)}`, tone: "danger", title };
  if (state === "bientot") return { label: `dans ${durationShort(left)}`, tone: "warning", title };
  return { label: `dans ${durationShort(left)}`, tone: "info", title };
}

/** Décode les entités HTML insérées par renderTemplate (affichage texte brut). */
export function decodeEntities(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[e] ?? _);
}

/** Variables {{x}} présentes dans un texte. */
export function extractVariables(...texts: string[]): string[] {
  const out = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) out.add(m[1]);
  return Array.from(out);
}

/* ───────────── Champs de formulaire (date / montant) ───────────── */

export function toDateInput(iso?: string | null): string {
  return iso ? date(iso, "yyyy-MM-dd") : "";
}

export function toDateTimeInput(iso?: string | number | null): string {
  if (iso === undefined || iso === null || iso === "") return "";
  const v = typeof iso === "number" ? new Date(iso).toISOString() : iso;
  return date(v, "yyyy-MM-dd'T'HH:mm");
}

/** « 2026-10-12 » → ISO (midi local, évite les décalages de fuseau). */
export function fromDateInput(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}T12:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function fromDateTimeInput(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function centsToInput(cents?: number | null): string {
  if (!cents) return "";
  return String(Math.round(cents) / 100).replace(".", ",");
}

export function inputToCents(v: string): number {
  const n = Number.parseFloat(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Normalisation pour recherche / dédoublonnage (accents, casse, espaces). */
export function normText(s?: string | null): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Début du trimestre civil contenant `now`. */
export function quarterStart(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).getTime();
}

/** Début de journée locale. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
