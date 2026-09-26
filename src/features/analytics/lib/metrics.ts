/**
 * Dérivations pures du module Analytics (aucun accès au store, `now` passé explicitement).
 */
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import type {
  Application,
  Attendance,
  Complaint,
  Contact,
  ContentItem,
  Deal,
  EventMode,
  EventSession,
  Evaluation,
  Invoice,
  Offer,
  Organization,
  Persona,
  Submission,
  TrafficDay,
} from "@/lib/domain/types";
import { ACTIVE_PIPELINE, invoiceTotal, isUpcoming, lastMonths, lastWeeks, sessionStats } from "@/lib/domain/selectors";
import { LEAD_SOURCES, PERSONAS, labelOf } from "@/lib/domain/constants";

export const DAY = 86_400_000;
const t = (iso?: string) => (iso ? new Date(iso).getTime() : NaN);

/* ───────────── Période ───────────── */

export type Period = "30j" | "90j" | "12m";
export const PERIOD_DAYS: Record<Period, number> = { "30j": 30, "90j": 90, "12m": 365 };
export const PERIOD_LABEL: Record<Period, string> = { "30j": "30 derniers jours", "90j": "90 derniers jours", "12m": "12 derniers mois" };

export interface Range {
  start: number; // inclus (minuit local)
  end: number; // inclus (now)
  prevStart: number;
  prevEnd: number; // exclu
  startKey: string; // YYYY-MM-DD
  endKey: string;
  prevStartKey: string;
  prevEndKey: string;
  days: number;
}

function midnight(ms: number) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function periodRange(period: Period, now: number): Range {
  const days = PERIOD_DAYS[period];
  const today = midnight(now);
  const start = addDays(today, -(days - 1)).getTime();
  const prevStart = addDays(today, -(2 * days - 1)).getTime();
  const key = (ms: number | Date) => format(ms, "yyyy-MM-dd");
  return { start, end: now, prevStart, prevEnd: start, startKey: key(start), endKey: key(now), prevStartKey: key(prevStart), prevEndKey: key(addDays(start, -1)), days };
}

export const inCur = (iso: string | undefined, r: Range) => {
  const v = t(iso);
  return v >= r.start && v <= r.end;
};
export const inPrev = (iso: string | undefined, r: Range) => {
  const v = t(iso);
  return v >= r.prevStart && v < r.prevEnd;
};

export function pctDelta(cur: number, prev: number): number | undefined {
  if (!prev) return undefined;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

/* ───────────── Trafic ───────────── */

export type SourceKey = keyof TrafficDay["sources"];
export const TRAFFIC_SOURCES: { key: SourceKey; label: string }[] = [
  { key: "direct", label: "Direct" },
  { key: "google", label: "Google (SEO)" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "meta_ads", label: "Meta Ads" },
  { key: "newsletter", label: "Newsletter" },
  { key: "partenaires", label: "Partenaires" },
];

export interface TrafficTotals {
  visitors: number;
  pageviews: number;
  formStarts: number;
  formSubmits: number;
  sources: Record<SourceKey, number>;
  days: number;
}

export function sumTraffic(days: TrafficDay[]): TrafficTotals {
  const sources = Object.fromEntries(TRAFFIC_SOURCES.map((s) => [s.key, 0])) as Record<SourceKey, number>;
  const out: TrafficTotals = { visitors: 0, pageviews: 0, formStarts: 0, formSubmits: 0, sources, days: days.length };
  for (const d of days) {
    out.visitors += d.visitors;
    out.pageviews += d.pageviews;
    out.formStarts += d.formStarts;
    out.formSubmits += d.formSubmits;
    for (const s of TRAFFIC_SOURCES) sources[s.key] += d.sources?.[s.key] ?? 0;
  }
  return out;
}

export function trafficBetween(traffic: TrafficDay[], fromKey: string, toKey: string) {
  return traffic.filter((d) => d.date.slice(0, 10) >= fromKey && d.date.slice(0, 10) <= toKey);
}

/** Série visiteurs / pages vues : quotidienne (30 j, 90 j) ou hebdomadaire (12 mois). */
export function trafficSeries(traffic: TrafficDay[], period: Period, r: Range, now: number) {
  const byDay = new Map(traffic.map((d) => [d.date.slice(0, 10), d]));
  if (period === "12m") {
    const weeks = lastWeeks(now, 52);
    const labels = weeks.map((w) => w.label);
    const visitors: number[] = [];
    const pageviews: number[] = [];
    for (const w of weeks) {
      let v = 0;
      let p = 0;
      for (let d = w.start; d < w.end; d += DAY) {
        const row = byDay.get(format(d, "yyyy-MM-dd"));
        if (row) {
          v += row.visitors;
          p += row.pageviews;
        }
      }
      visitors.push(v);
      pageviews.push(p);
    }
    return { labels, visitors, pageviews, grain: "semaine" as const };
  }
  const labels: string[] = [];
  const visitors: number[] = [];
  const pageviews: number[] = [];
  // Le jour en cours n'est pas encore consolidé : la série s'arrête au dernier jour disponible.
  const lastKey = traffic.reduce((m, d) => (d.date.slice(0, 10) > m ? d.date.slice(0, 10) : m), "");
  for (let i = 0; i < r.days; i++) {
    const d = addDays(r.start, i);
    const k = format(d, "yyyy-MM-dd");
    if (lastKey && k > lastKey) break;
    labels.push(format(d, "d MMM", { locale: fr }).replace(".", ""));
    visitors.push(byDay.get(k)?.visitors ?? 0);
    pageviews.push(byDay.get(k)?.pageviews ?? 0);
  }
  return { labels, visitors, pageviews, grain: "jour" as const };
}

/* ───────────── Funnel candidature ───────────── */

export const FUNNEL_STEPS = ["Candidatures", "Qualifiées", "Entretiens", "Acceptées", "Inscrites (payées)"] as const;

/**
 * Étape maximale atteinte (0 = candidature … 4 = inscrite), déduite du statut courant
 * et des jalons horodatés (un refus après entretien compte comme « entretien atteint »).
 */
export function appStage(a: Application): number {
  switch (a.status) {
    case "inscrite":
      return 4;
    case "acceptee":
      return 3;
    case "desistee":
      return a.decisionAt || a.amountPaidCents > 0 ? 3 : a.interviewAt ? 2 : 1;
    case "entretien":
      return 2;
    case "refusee":
    case "liste_attente":
      return a.interviewAt ? 2 : 1;
    case "qualifiee":
      return 1;
    default:
      return 0;
  }
}

export function funnelCounts(apps: Application[]): number[] {
  const out = [0, 0, 0, 0, 0];
  for (const a of apps) {
    const s = appStage(a);
    for (let i = 0; i <= s; i++) out[i]++;
  }
  return out;
}

export interface ConversionRow {
  key: string;
  label: string;
  total: number;
  qualified: number;
  interviews: number;
  accepted: number;
  enrolled: number;
  rate: number; // inscrites / candidatures (%)
}

export function conversionRows(apps: Application[], keyOf: (a: Application) => { key: string; label: string }): ConversionRow[] {
  const m = new Map<string, ConversionRow>();
  for (const a of apps) {
    const k = keyOf(a);
    const row = m.get(k.key) ?? { key: k.key, label: k.label, total: 0, qualified: 0, interviews: 0, accepted: 0, enrolled: 0, rate: 0 };
    const s = appStage(a);
    row.total++;
    if (s >= 1) row.qualified++;
    if (s >= 2) row.interviews++;
    if (s >= 3) row.accepted++;
    if (s >= 4) row.enrolled++;
    m.set(k.key, row);
  }
  return [...m.values()].map((r) => ({ ...r, rate: r.total ? (r.enrolled / r.total) * 100 : 0 })).sort((a, b) => b.total - a.total);
}

const SOURCE_ALIASES: Record<string, string> = {
  google: "Google",
  bing: "Google",
  linkedin: "LinkedIn",
  lnkd: "LinkedIn",
  instagram: "Instagram",
  ig: "Instagram",
  facebook: "Meta Ads",
  fb: "Meta Ads",
  meta: "Meta Ads",
  meta_ads: "Meta Ads",
  newsletter: "Newsletter",
  brevo: "Newsletter",
  email: "Newsletter",
  partenaire: "Partenaires",
  partenaires: "Partenaires",
  partner: "Partenaires",
  ecole: "Partenaires",
};

/** Source d'acquisition d'une candidature : UTM de la candidature, sinon du contact, sinon source déclarée. */
export function sourceOf(a: Application, contact?: Contact): { key: string; label: string } {
  const raw = (a.utm?.source ?? contact?.utm?.source ?? "").trim().toLowerCase();
  if (raw) {
    const label = SOURCE_ALIASES[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
    return { key: label.toLowerCase(), label };
  }
  const src = contact?.source;
  if (src && ["linkedin", "instagram", "newsletter", "recommandation", "evenement", "ecole"].includes(src)) {
    const label = src === "ecole" ? "Partenaires" : labelOf(LEAD_SOURCES, src);
    return { key: label.toLowerCase(), label };
  }
  return { key: "direct", label: "Direct / non tracé" };
}

export function personaOf(a: Application): { key: Persona; label: string } {
  return { key: a.persona, label: labelOf(PERSONAS, a.persona) };
}

/* ───────────── Revenus ───────────── */

export const REVENUE_OFFER_GROUPS = ["Sessions B2C", "Accompagnement & mentorat", "Écoles", "Entreprises", "Autres"] as const;
export const REVENUE_MODE_GROUPS = ["Présentiel", "Distanciel", "Hybride", "Hors session"] as const;
const MODE_LABEL: Record<EventMode, (typeof REVENUE_MODE_GROUPS)[number]> = { presentiel: "Présentiel", distanciel: "Distanciel", hybride: "Hybride" };

export interface RevenueLookups {
  apps: Map<string, Application>;
  offers: Map<string, Offer>;
  orgs: Map<string, Organization>;
  events: Map<string, EventSession>;
}

export function isRevenueInvoice(inv: Invoice) {
  return inv.status !== "brouillon" && inv.status !== "annulee";
}

export function offerGroup(inv: Invoice, l: RevenueLookups): (typeof REVENUE_OFFER_GROUPS)[number] {
  const app = inv.applicationId ? l.apps.get(inv.applicationId) : undefined;
  if (app) {
    const offer = app.offerId ? l.offers.get(app.offerId) : undefined;
    return offer && (offer.kind === "accompagnement" || offer.kind === "mentorat") ? "Accompagnement & mentorat" : "Sessions B2C";
  }
  const ev = inv.eventId ? l.events.get(inv.eventId) : undefined;
  const org = inv.orgId ? l.orgs.get(inv.orgId) : undefined;
  if (ev?.kind === "startup_village" || org?.type === "ecole") return "Écoles";
  if (ev?.kind === "evenement_entreprise" || org?.type === "entreprise") return "Entreprises";
  const label = inv.lines.map((x) => x.label.toLowerCase()).join(" ");
  if (/mentorat|iteration lab|startup ready|residency|accompagnement/.test(label)) return "Accompagnement & mentorat";
  if (inv.contactId && !inv.orgId) return "Sessions B2C";
  return "Autres";
}

export function modeGroup(inv: Invoice, l: RevenueLookups): (typeof REVENUE_MODE_GROUPS)[number] {
  const ev = inv.eventId ? l.events.get(inv.eventId) : inv.applicationId ? l.events.get(l.apps.get(inv.applicationId)?.eventId ?? "") : undefined;
  return ev ? MODE_LABEL[ev.mode] : "Hors session";
}

export function revenueBuckets(period: Period, now: number) {
  if (period === "12m") return { buckets: lastMonths(now, 12), grain: "mois" as const };
  return { buckets: lastWeeks(now, period === "30j" ? 5 : 13), grain: "semaine" as const };
}

/** Séries empilées (HT, centimes) par groupe ; les avoirs viennent en déduction du groupe. */
export function revenueSeries(invoices: Invoice[], buckets: { start: number; end: number }[], groups: readonly string[], groupOf: (inv: Invoice) => string) {
  const matrix = groups.map(() => buckets.map(() => 0));
  for (const inv of invoices) {
    if (!isRevenueInvoice(inv)) continue;
    const ts = t(inv.issuedAt);
    const bi = buckets.findIndex((b) => ts >= b.start && ts < b.end);
    if (bi < 0) continue;
    const gi = groups.indexOf(groupOf(inv));
    if (gi < 0) continue;
    matrix[gi][bi] += invoiceTotal(inv).ht;
  }
  return groups
    .map((name, i) => ({ name, values: matrix[i].map((v) => Math.max(0, v)) }))
    .filter((s) => s.values.some((v) => v > 0));
}

/* ───────────── Prévision ───────────── */

export const STAGE_PROBABILITY: Partial<Record<Application["status"], number>> = { nouvelle: 0.1, qualifiee: 0.25, entretien: 0.45, acceptee: 0.8 };

/**
 * Prévisionnel des sessions à venir. Remplissage et seuil minimum : bootcamps StartupWeek
 * (inscriptions via candidatures) démarrant dans l'horizon donné — les webinaires gratuits
 * et les Startup Village (B2B) ont leur propre logique d'inscription.
 */
export function forecast(events: EventSession[], applications: Application[], deals: Deal[], now: number, horizonDays = 90) {
  const upcoming = events.filter((e) => isUpcoming(e, now) && e.status !== "brouillon");
  const ids = new Set(upcoming.map((e) => e.id));
  const byId = new Map(upcoming.map((e) => [e.id, e]));
  // Webinaires et sessions B2B (orgId) : pas de candidatures individuelles ⇒ exclus du remplissage et du seuil.
  const soon = upcoming.filter((e) => e.kind === "startup_week" && !e.orgId && t(e.startAt) - now <= horizonDays * DAY);
  let enrolled = 0;
  let collected = 0;
  let fillSum = 0;
  const below: { ev: EventSession; enrolled: number }[] = [];
  for (const ev of upcoming) {
    const st = sessionStats(ev, applications);
    enrolled += st.revenue;
    collected += st.collected;
  }
  for (const ev of soon) {
    const st = sessionStats(ev, applications);
    fillSum += st.fillRate;
    if (st.belowMinimum) below.push({ ev, enrolled: st.enrolled });
  }
  let pipeline = 0;
  for (const a of applications) {
    if (!ids.has(a.eventId) || !ACTIVE_PIPELINE.includes(a.status)) continue;
    pipeline += (byId.get(a.eventId)?.priceCents ?? 0) * (STAGE_PROBABILITY[a.status] ?? 0);
  }
  const b2b = deals.filter((d) => d.stage !== "gagne" && d.stage !== "perdu").reduce((s, d) => s + (d.amountCents * d.probability) / 100, 0);
  return {
    upcoming,
    enrolled,
    collected,
    pipeline: Math.round(pipeline),
    b2b: Math.round(b2b),
    total: Math.round(enrolled + pipeline + b2b),
    soon,
    horizonDays,
    fillRate: soon.length ? Math.round(fillSum / soon.length) : 0,
    below: below.sort((a, b) => a.ev.startAt.localeCompare(b.ev.startAt)),
  };
}

/* ───────────── Qualité ───────────── */

export function npsOf(evals: Evaluation[]): number | undefined {
  const withNps = evals.filter((e) => typeof e.nps === "number");
  if (!withNps.length) return undefined;
  const prom = withNps.filter((e) => (e.nps ?? 0) >= 9).length;
  const det = withNps.filter((e) => (e.nps ?? 0) <= 6).length;
  return Math.round(((prom - det) / withNps.length) * 100);
}

export function satisfactionOf(evals: Evaluation[]): number | undefined {
  const withSat = evals.filter((e) => typeof e.satisfaction === "number");
  if (!withSat.length) return undefined;
  return withSat.reduce((s, e) => s + (e.satisfaction ?? 0), 0) / withSat.length;
}

export const SATISFACTION_KINDS: Evaluation["kind"][] = ["a_chaud", "a_froid"];

export function qualityMonthly(evaluations: Evaluation[], now: number) {
  const months = lastMonths(now, 12);
  const rows = months.map((m) => {
    const list = evaluations.filter((e) => SATISFACTION_KINDS.includes(e.kind) && t(e.submittedAt) >= m.start && t(e.submittedAt) < m.end);
    return { label: m.label, sat: satisfactionOf(list), nps: npsOf(list), n: list.length };
  });
  const sat = rows.filter((r) => r.sat !== undefined);
  const nps = rows.filter((r) => r.nps !== undefined);
  return {
    sat: { labels: sat.map((r) => r.label), values: sat.map((r) => Math.round((r.sat ?? 0) * 100) / 100) },
    nps: { labels: nps.map((r) => r.label), values: nps.map((r) => r.nps ?? 0) },
  };
}

export function attendanceRate(list: Attendance[]): number | undefined {
  if (!list.length) return undefined;
  const ok = list.filter((a) => a.status === "present" || a.status === "retard").length;
  return (ok / list.length) * 100;
}

export function complaintRate(complaints: Complaint[], attendances: Attendance[]) {
  const participants = new Set(attendances.map((a) => a.contactId)).size;
  return { count: complaints.length, participants, rate: participants ? (complaints.length / participants) * 100 : undefined };
}

/* ───────────── Cohortes / récurrence (upsell alumni) ───────────── */

export interface CohortRow {
  eventId: string;
  code: string;
  name: string;
  endAt: string;
  alumni: number;
  rebuyers: number;
  revenue: number; // HT
}

export function alumniRebuy(
  applications: Application[],
  invoices: Invoice[],
  events: EventSession[],
  offers: Map<string, Offer>,
  now: number,
) {
  const evById = new Map(events.map((e) => [e.id, e]));
  // Première session suivie (terminée) par contact.
  const first = new Map<string, { app: Application; ev: EventSession }>();
  for (const a of applications) {
    if (a.status !== "inscrite") continue;
    const ev = evById.get(a.eventId);
    if (!ev || t(ev.endAt) >= now) continue;
    const cur = first.get(a.contactId);
    if (!cur || t(ev.endAt) < t(cur.ev.endAt)) first.set(a.contactId, { app: a, ev });
  }
  const rows = new Map<string, CohortRow>();
  const offerCount = new Map<string, number>();
  let rebuyers = 0;
  let revenue = 0;
  for (const [contactId, { app, ev }] of first) {
    const row = rows.get(ev.id) ?? { eventId: ev.id, code: ev.code, name: ev.name, endAt: ev.endAt, alumni: 0, rebuyers: 0, revenue: 0 };
    row.alumni++;
    const end = t(ev.endAt);
    const laterApps = applications.filter((x) => x.contactId === contactId && x.id !== app.id && t(x.submittedAt) > end && ["acceptee", "inscrite"].includes(x.status));
    const laterInvoices = invoices.filter((inv) => inv.contactId === contactId && inv.applicationId !== app.id && isRevenueInvoice(inv) && inv.kind !== "avoir" && t(inv.issuedAt) > end);
    if (laterApps.length || laterInvoices.length) {
      rebuyers++;
      row.rebuyers++;
      const amount = laterInvoices.reduce((s, inv) => s + invoiceTotal(inv).ht, 0);
      row.revenue += amount;
      revenue += amount;
      const names = new Set<string>();
      for (const x of laterApps) {
        const o = x.offerId ? offers.get(x.offerId) : undefined;
        names.add(o?.name ?? `Nouvelle session (${evById.get(x.eventId)?.code ?? "?"})`);
      }
      for (const inv of laterInvoices) {
        const label = inv.lines[0]?.label ?? "";
        const o = [...offers.values()].find((of) => label.toLowerCase().includes(of.name.toLowerCase()));
        if (o) names.add(o.name);
        else if (!inv.applicationId) names.add(/mentorat|iteration/i.test(label) ? "Iteration Lab / mentorat" : "Autre achat");
      }
      for (const n of names) offerCount.set(n, (offerCount.get(n) ?? 0) + 1);
    }
    rows.set(ev.id, row);
  }
  return {
    alumni: first.size,
    rebuyers,
    rate: first.size ? (rebuyers / first.size) * 100 : 0,
    revenue,
    cohorts: [...rows.values()].sort((a, b) => b.endAt.localeCompare(a.endAt)),
    offers: [...offerCount.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
  };
}

/* ───────────── Activité (heatmap) ───────────── */

/** 52 semaines complètes alignées sur le lundi (la heatmap découpe par tranches de 7). */
export function submissionHeatmap(submissions: Submission[], now: number) {
  const today = midnight(now);
  const dow = (new Date(today).getDay() + 6) % 7;
  const start = addDays(today, -(dow + 51 * 7)).getTime();
  const counts = new Map<string, number>();
  for (const s of submissions) {
    const k = format(t(s.receivedAt), "yyyy-MM-dd");
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const days: { date: string; value: number }[] = [];
  const count = dow + 51 * 7 + 1;
  for (let i = 0; i < count; i++) {
    const k = format(addDays(start, i), "yyyy-MM-dd");
    days.push({ date: k, value: counts.get(k) ?? 0 });
  }
  const total = days.reduce((s, d) => s + d.value, 0);
  const busiest = days.reduce((m, d) => (d.value > m.value ? d : m), { date: "", value: 0 });
  const weekday = [0, 0, 0, 0, 0, 0, 0];
  days.forEach((d, i) => (weekday[i % 7] += d.value));
  return { days, total, busiest, weekday };
}

/* ───────────── Contenus ───────────── */

export function topContents(contents: ContentItem[], metric: "views" | "leads" | "clicks", n = 6) {
  return contents
    .filter((c) => c.status === "publie")
    .sort((a, b) => b.metrics[metric] - a.metrics[metric])
    .slice(0, n);
}
