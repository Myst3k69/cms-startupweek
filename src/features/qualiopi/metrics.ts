/**
 * Dérivations Qualiopi pures (sessions de formation, assiduité, satisfaction, réclamations,
 * indicateurs de résultats). Toujours passer `now` explicitement (rendu pur).
 * Réutilisées par le tableau de bord Qualiopi, les preuves automatiques et les documents imprimables.
 */
import type {
  Application,
  Attendance,
  Complaint,
  EvaluationKind,
  Evaluation,
  EventSession,
  ID,
  ImprovementAction,
} from "@/lib/domain/types";
import { pct } from "@/lib/utils";

export const DAY = 86_400_000;
export const HOUR = 3_600_000;
const ts = (iso?: string) => (iso ? Date.parse(iso) : NaN);

export function mean(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

/** « 4,6 » — une décimale, virgule française. */
export function fmt1(n: number | null | undefined, suffix = ""): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${suffix}`;
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${Math.round(n)} %`;
}

export function fmtHours(h: number | null | undefined): string {
  if (h === null || h === undefined || !Number.isFinite(h)) return "—";
  if (h < 48) return `${Math.round(h)} h`;
  return `${fmt1(h / 24)} j`;
}

export function fmtDays(d: number | null | undefined): string {
  if (d === null || d === undefined || !Number.isFinite(d)) return "—";
  return `${fmt1(d)} j`;
}

/* ───────────── Sessions de formation ───────────── */

/** Action de formation « réelle » (hors webinaire d'information, brouillon ou annulation). */
export function isTrainingSession(ev: EventSession) {
  return ev.isTraining && ev.status !== "annule" && ev.status !== "brouillon";
}

/** Sessions de formation terminées (triées chronologiquement). */
export function endedSessions(events: EventSession[], now: number) {
  return events
    .filter((ev) => isTrainingSession(ev) && (ev.status === "termine" || ts(ev.endAt) < now))
    .sort((a, b) => ts(a.startAt) - ts(b.startAt));
}

/** Sessions de formation commencées (terminées ou en cours). */
export function startedSessions(events: EventSession[], now: number) {
  return events.filter((ev) => isTrainingSession(ev) && ts(ev.startAt) <= now).sort((a, b) => ts(a.startAt) - ts(b.startAt));
}

export function enrolledApplications(applications: Application[], eventIds?: Set<ID>) {
  return applications.filter((a) => a.status === "inscrite" && (!eventIds || eventIds.has(a.eventId)));
}

/* ───────────── Demi-journées & assiduité ───────────── */

export type HalfDay = "matin" | "apres_midi";

export interface HalfDaySlot {
  key: string; // `${date}|${halfDay}`
  day: number; // J1…Jn
  date: string; // YYYY-MM-DD (UTC, comme Attendance.date)
  halfDay: HalfDay;
  start?: string;
  end?: string;
  speakerIds: ID[];
}

const halfOf = (hhmm: string): HalfDay => (hhmm < "13:00" ? "matin" : "apres_midi");
const byDateThenHalf = (a: { date: string; halfDay: HalfDay }, b: { date: string; halfDay: HalfDay }) =>
  a.date.localeCompare(b.date) || (a.halfDay === b.halfDay ? 0 : a.halfDay === "matin" ? -1 : 1);

/** Demi-journées prévues au programme d'une session. */
export function plannedHalfDays(ev: EventSession): HalfDaySlot[] {
  const start0 = Math.floor(ts(ev.startAt) / DAY) * DAY;
  const map = new Map<string, HalfDaySlot>();
  const program = ev.program.length
    ? ev.program
    : [{ id: "x", day: 1, start: ev.startAt.slice(11, 16) || "09:00", end: ev.endAt.slice(11, 16) || "17:00", title: "", speakerId: undefined }];
  for (const p of program) {
    const date = new Date(start0 + (p.day - 1) * DAY).toISOString().slice(0, 10);
    const halfDay = halfOf(p.start);
    const key = `${date}|${halfDay}`;
    const cur = map.get(key) ?? { key, day: p.day, date, halfDay, start: p.start, end: p.end, speakerIds: [] };
    if (p.start < (cur.start ?? "99:99")) cur.start = p.start;
    if (p.end > (cur.end ?? "00:00")) cur.end = p.end;
    if (p.speakerId && !cur.speakerIds.includes(p.speakerId)) cur.speakerIds.push(p.speakerId);
    map.set(key, cur);
  }
  return [...map.values()].sort(byDateThenHalf);
}

/**
 * Demi-journées d'une session pour l'émargement : celles réellement émargées si elles existent
 * (source de vérité), sinon celles du programme.
 */
export function sessionHalfDays(ev: EventSession, attendances: Attendance[]): HalfDaySlot[] {
  const planned = plannedHalfDays(ev);
  const recorded = attendances.filter((a) => a.eventId === ev.id);
  if (!recorded.length) return planned;
  const keys = Array.from(new Set(recorded.map((a) => `${a.date.slice(0, 10)}|${a.halfDay}`))).sort();
  const dates = Array.from(new Set(keys.map((k) => k.split("|")[0]))).sort();
  return keys
    .map((key) => {
      const [date, halfDay] = key.split("|") as [string, HalfDay];
      const day = dates.indexOf(date) + 1;
      const plan = planned.find((p) => p.key === key) ?? planned.find((p) => p.day === day && p.halfDay === halfDay);
      return { key, day, date, halfDay, start: plan?.start, end: plan?.end, speakerIds: plan?.speakerIds ?? [] };
    })
    .sort(byDateThenHalf);
}

export const isPresent = (a: Pick<Attendance, "status">) => a.status === "present" || a.status === "retard";

export interface TraineeAttendance {
  expected: number;
  present: number;
  absent: number;
  /** 0-1, null si aucune feuille d'émargement pour la session. */
  rate: number | null;
  /** Heures réalisées = durée × assiduité (arrondi à la demi-heure). */
  hoursDone: number | null;
}

export function traineeAttendance(ev: EventSession, contactId: ID, attendances: Attendance[]): TraineeAttendance {
  const forEvent = attendances.filter((a) => a.eventId === ev.id);
  if (!forEvent.length) return { expected: plannedHalfDays(ev).length, present: 0, absent: 0, rate: null, hoursDone: null };
  const expected = Math.max(1, sessionHalfDays(ev, attendances).length);
  const mine = forEvent.filter((a) => a.contactId === contactId);
  const present = mine.filter(isPresent).length;
  const rate = Math.min(1, present / expected);
  return { expected, present, absent: expected - present, rate, hoursDone: Math.round(ev.durationHours * rate * 2) / 2 };
}

export function attendanceStats(attendances: Attendance[]) {
  const present = attendances.filter(isPresent);
  const sheets = new Set(attendances.map((a) => `${a.eventId}|${a.date.slice(0, 10)}|${a.halfDay}`));
  return {
    total: attendances.length,
    present: present.length,
    rate: attendances.length ? pct(present.length, attendances.length) : null,
    signedDigital: present.filter((a) => a.signedAt && a.method === "numerique").length,
    sheets: sheets.size,
  };
}

/* ───────────── Satisfaction ───────────── */

export interface RatingStats {
  count: number;
  avg: number | null; // /5
  satisfiedPct: number | null; // % de notes ≥ 4
  nps: number | null; // -100…100
  npsCount: number;
  objectivesAvg: number | null; // /5
  withComment: number;
}

export function ratingStats(evals: Evaluation[]): RatingStats {
  const sat = evals.map((e) => e.satisfaction).filter((v): v is number => typeof v === "number");
  const nps = evals.map((e) => e.nps).filter((v): v is number => typeof v === "number");
  const obj = evals.map((e) => e.objectivesReached).filter((v): v is number => typeof v === "number");
  const promoters = nps.filter((v) => v >= 9).length;
  const detractors = nps.filter((v) => v <= 6).length;
  return {
    count: evals.length,
    avg: mean(sat),
    satisfiedPct: sat.length ? (sat.filter((v) => v >= 4).length / sat.length) * 100 : null,
    nps: nps.length ? Math.round(((promoters - detractors) / nps.length) * 100) : null,
    npsCount: nps.length,
    objectivesAvg: mean(obj),
    withComment: evals.filter((e) => e.comment?.trim()).length,
  };
}

/** Tonalité d'un verbatim : négatif (≤ 2/5, ou ≤ 3/5 avec NPS détracteur), positif (≥ 4/5), sinon neutre ; à défaut de note, selon le NPS. */
export function sentimentOf(e: Pick<Evaluation, "satisfaction" | "nps">): "positif" | "neutre" | "negatif" {
  const detractor = typeof e.nps === "number" && e.nps <= 6;
  if (typeof e.satisfaction === "number") {
    if (e.satisfaction <= 2 || (e.satisfaction <= 3 && detractor)) return "negatif";
    if (e.satisfaction >= 4) return "positif";
    return "neutre";
  }
  if (typeof e.nps === "number") {
    if (e.nps >= 9) return "positif";
    if (e.nps <= 6) return "negatif";
  }
  return "neutre";
}

export const STAKEHOLDER_KINDS: { value: Extract<EvaluationKind, "a_chaud" | "a_froid" | "financeur" | "entreprise" | "intervenant">; label: string; short: string }[] = [
  { value: "a_chaud", label: "Stagiaires — à chaud", short: "À chaud" },
  { value: "a_froid", label: "Stagiaires — à froid (J+60)", short: "À froid" },
  { value: "financeur", label: "Financeurs", short: "Financeurs" },
  { value: "entreprise", label: "Entreprises / écoles", short: "Entreprises" },
  { value: "intervenant", label: "Intervenants", short: "Intervenants" },
];

/* ───────────── Réclamations ───────────── */

export function complaintAckHours(c: Complaint): number | null {
  if (!c.ackAt) return null;
  return Math.max(0, (ts(c.ackAt) - ts(c.receivedAt)) / HOUR);
}

export function complaintCloseDays(c: Complaint): number | null {
  if (!c.closedAt) return null;
  return Math.max(0, (ts(c.closedAt) - ts(c.receivedAt)) / DAY);
}

export function complaintStats(complaints: Complaint[], now: number, ackLimitHours: number) {
  const open = complaints.filter((c) => c.status !== "cloturee");
  const ack = complaints.map(complaintAckHours).filter((v): v is number => v !== null);
  const close = complaints.map(complaintCloseDays).filter((v): v is number => v !== null);
  const lateAck = complaints.filter((c) => !c.ackAt && now - ts(c.receivedAt) > ackLimitHours * HOUR);
  const ackOnTime = ack.filter((h) => h <= ackLimitHours).length;
  const judged = ack.length + lateAck.length;
  return {
    total: complaints.length,
    open: open.length,
    majorOpen: open.filter((c) => c.severity === "majeure").length,
    avgAckHours: mean(ack),
    avgCloseDays: mean(close),
    lateAck: lateAck.length,
    onTimePct: judged ? (ackOnTime / judged) * 100 : null,
    satisfiedPct: (() => {
      const answered = complaints.filter((c) => c.status === "cloturee" && typeof c.satisfiedWithResponse === "boolean");
      return answered.length ? (answered.filter((c) => c.satisfiedWithResponse).length / answered.length) * 100 : null;
    })(),
  };
}

/* ───────────── Plan d'amélioration ───────────── */

export function isActionOpen(a: ImprovementAction) {
  return a.status === "a_faire" || a.status === "en_cours";
}

export function isActionLate(a: ImprovementAction, now: number) {
  return isActionOpen(a) && !!a.dueAt && ts(a.dueAt) < now;
}

/* ───────────── Indicateurs de résultats (ind. 2) ───────────── */

export interface ResultIndicators {
  sessions: number;
  trainees: number;
  since?: string;
  responses: number;
  responseRate: number | null;
  satisfactionPct: number | null;
  avgSatisfaction: number | null;
  nps: number | null;
  attendanceRate: number | null;
  completionRate: number | null;
  objectivesAvg: number | null;
}

/** Indicateurs de résultats publiables (calculés sur les sessions de formation terminées). */
export function resultIndicators(
  data: { events: EventSession[]; applications: Application[]; evaluations: Evaluation[]; attendances: Attendance[] },
  now: number,
): ResultIndicators {
  const sessions = endedSessions(data.events, now);
  const ids = new Set(sessions.map((s) => s.id));
  const trainees = enrolledApplications(data.applications, ids);
  const hot = data.evaluations.filter((e) => e.kind === "a_chaud" && ids.has(e.eventId));
  const rs = ratingStats(hot);
  const att = attendanceStats(data.attendances.filter((a) => ids.has(a.eventId)));
  const byId = new Map(sessions.map((s) => [s.id, s]));
  let withData = 0;
  let completed = 0;
  for (const app of trainees) {
    const ev = byId.get(app.eventId);
    if (!ev) continue;
    const ta = traineeAttendance(ev, app.contactId, data.attendances);
    if (ta.rate === null) continue;
    withData++;
    if (ta.rate >= 0.8) completed++;
  }
  return {
    sessions: sessions.length,
    trainees: trainees.length,
    since: sessions[0]?.startAt,
    responses: hot.length,
    responseRate: trainees.length ? Math.min(100, (hot.length / trainees.length) * 100) : null,
    satisfactionPct: rs.satisfiedPct,
    avgSatisfaction: rs.avg,
    nps: rs.nps,
    attendanceRate: att.rate,
    completionRate: withData ? (completed / withData) * 100 : null,
    objectivesAvg: rs.objectivesAvg,
  };
}

/* ───────────── Dates (formulaires) ───────────── */

/** ISO → valeur d'un <input type="date"> (jour local). */
export function toDateInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** <input type="date"> → ISO (midi local, évite les décalages de fuseau). */
export function fromDateInput(v: string): string | undefined {
  if (!v) return undefined;
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

/** ISO → valeur d'un <input type="datetime-local">. */
export function toDateTimeInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromDateTimeInput(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
