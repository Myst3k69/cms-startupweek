/**
 * Dérivations pures propres aux sessions (jours de formation, durée du programme,
 * satisfaction, NPS, codes). Toujours `now` en paramètre (rendu pur).
 */
import type { Evaluation, EventSession, ProgramSlot } from "@/lib/domain/types";

export const DAY = 86_400_000;

export interface SessionDay {
  /** 1…n (J1, J2…) */
  index: number;
  /** YYYY-MM-DD (clé Attendance.date) */
  date: string;
}

/**
 * Jours de formation J1…Jn : autant de jours que le programme (sinon l'amplitude calendaire),
 * à partir du jour de début (minuit UTC — même convention que le seed et la base).
 */
export function sessionDays(ev: Pick<EventSession, "startAt" | "endAt" | "program">): SessionDay[] {
  const startMs = Date.parse(ev.startAt);
  const endMs = Date.parse(ev.endAt);
  if (Number.isNaN(startMs)) return [];
  const start = Math.floor(startMs / DAY) * DAY;
  const programDays = ev.program.reduce((m, p) => Math.max(m, p.day), 0);
  const calendar = Number.isNaN(endMs) ? 1 : Math.floor((Math.floor(endMs / DAY) * DAY - start) / DAY) + 1;
  const n = Math.min(31, Math.max(1, programDays || calendar));
  return Array.from({ length: n }, (_, i) => ({ index: i + 1, date: new Date(start + i * DAY).toISOString().slice(0, 10) }));
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function slotHours(slot: Pick<ProgramSlot, "start" | "end">): number {
  return Math.max(0, minutes(slot.end) - minutes(slot.start)) / 60;
}

export function programHours(program: ProgramSlot[]): number {
  return program.reduce((s, p) => s + slotHours(p), 0);
}

export function formatHours(h: number): string {
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  if (!min) return `${whole} h`;
  return `${whole} h ${String(min).padStart(2, "0")}`;
}

export function average(values: (number | undefined | null)[]): number | undefined {
  const list = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (!list.length) return undefined;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

/** Net Promoter Score : % promoteurs (9-10) − % détracteurs (0-6). */
export function npsOf(evals: Evaluation[]): number | undefined {
  const list = evals.map((e) => e.nps).filter((v): v is number => typeof v === "number");
  if (!list.length) return undefined;
  const promoters = list.filter((v) => v >= 9).length;
  const detractors = list.filter((v) => v <= 6).length;
  return Math.round(((promoters - detractors) / list.length) * 100);
}

/** Satisfaction à chaud moyenne (/5) d'une session. */
export function satisfactionOf(evals: Evaluation[], eventId: string): { avg?: number; count: number } {
  const list = evals.filter((e) => e.eventId === eventId && e.kind === "a_chaud" && typeof e.satisfaction === "number");
  return { avg: average(list.map((e) => e.satisfaction)), count: list.length };
}

/**
 * Score d'une évaluation ramené sur 10 (positionnement / acquis) — tolère les différentes
 * échelles possibles (/5, /10, /100) des grilles de scores.
 */
export function evalScore10(ev: Evaluation): number | undefined {
  const values = Object.values(ev.scores ?? {}).filter((v) => typeof v === "number");
  let v = average(values);
  if (v === undefined && typeof ev.objectivesReached === "number") v = ev.objectivesReached;
  if (v === undefined) return undefined;
  if (v <= 5) return Math.round(v * 2 * 10) / 10;
  if (v <= 10) return Math.round(v * 10) / 10;
  return Math.round(v) / 10;
}

/** Prochain code libre pour un préfixe (SW-0024…). */
export function nextSessionCode(codes: string[], prefix: string): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  const max = codes.reduce((m, c) => {
    const r = re.exec(c);
    return r ? Math.max(m, Number(r[1])) : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

/** Minuit local d'un timestamp. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Valeur `YYYY-MM-DD` pour un <input type="date"> (jour local) à partir d'un ISO. */
export function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Valeur `YYYY-MM-DDTHH:mm` pour un <input type="datetime-local">. */
export function toDateTimeInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${toDateInput(iso)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Date saisie (jour local) → ISO, avec une heure par défaut. */
export function fromDateInput(value: string, hh = 9, mm = 0): string | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d, hh, mm).toISOString();
}

export function fromDateTimeInput(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
