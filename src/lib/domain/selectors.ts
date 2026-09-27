/**
 * Dérivations métier pures, partagées par tous les modules (dashboard, listes, fiches).
 * Toujours passer `now` explicitement (rendu pur).
 */
import type {
  Application,
  Complaint,
  Contact,
  ContentItem,
  ContentStatDay,
  EventSession,
  ID,
  Invoice,
  Payment,
  QualiopiIndicator,
  Submission,
  Task,
} from "./types";
import { totals } from "@/lib/format";

const DAY = 86_400_000;
const t = (iso?: string) => (iso ? new Date(iso).getTime() : NaN);

export function contactName(c?: Pick<Contact, "firstName" | "lastName"> | null) {
  if (!c) return "—";
  return `${c.firstName} ${c.lastName}`.trim();
}

/* ───────────── Sessions ───────────── */

export const ENROLLED_STATUSES: Application["status"][] = ["inscrite"];
export const ACTIVE_PIPELINE: Application["status"][] = ["nouvelle", "qualifiee", "entretien", "acceptee"];

export function sessionStats(ev: EventSession, applications: Application[]) {
  const apps = applications.filter((a) => a.eventId === ev.id);
  const enrolled = apps.filter((a) => a.status === "inscrite");
  const pipeline = apps.filter((a) => ACTIVE_PIPELINE.includes(a.status));
  const revenue = enrolled.reduce((s, a) => s + a.amountDueCents, 0);
  const collected = enrolled.reduce((s, a) => s + a.amountPaidCents, 0);
  const capacity = ev.capacity || 1;
  return {
    applications: apps.length,
    enrolled: enrolled.length,
    pipeline: pipeline.length,
    remaining: Math.max(0, ev.capacity - enrolled.length),
    fillRate: Math.round((enrolled.length / capacity) * 100),
    revenue,
    collected,
    belowMinimum: enrolled.length < ev.minCapacity,
  };
}

export function isUpcoming(ev: EventSession, now: number) {
  return t(ev.startAt) > now && ev.status !== "annule";
}

export function isRunning(ev: EventSession, now: number) {
  return t(ev.startAt) <= now && t(ev.endAt) + DAY > now && ev.status !== "annule";
}

export function daysUntil(iso: string, now: number) {
  return Math.ceil((t(iso) - now) / DAY);
}

/* ───────────── Facturation ───────────── */

export function invoiceTotal(inv: Pick<Invoice, "lines" | "kind">) {
  const tt = totals(inv.lines);
  const sign = inv.kind === "avoir" ? -1 : 1;
  return { ht: tt.ht * sign, vat: tt.vat * sign, ttc: tt.ttc * sign };
}

export function invoiceBalance(inv: Invoice) {
  return invoiceTotal(inv).ttc - inv.paidCents;
}

/** Statut effectif (une facture émise dont l'échéance est passée est « en retard »). */
export function effectiveInvoiceStatus(inv: Invoice, now: number): Invoice["status"] {
  if (inv.status === "emise" || inv.status === "partielle") {
    if (t(inv.dueAt) < now && invoiceBalance(inv) > 0) return "en_retard";
  }
  return inv.status;
}

export function isOverdue(inv: Invoice, now: number) {
  return effectiveInvoiceStatus(inv, now) === "en_retard";
}

export function receivables(invoices: Invoice[], now: number) {
  const open = invoices.filter((i) => i.kind !== "avoir" && !["brouillon", "annulee", "payee"].includes(i.status));
  const buckets = { aEchoir: 0, j0_30: 0, j31_60: 0, j60plus: 0 };
  for (const inv of open) {
    const bal = invoiceBalance(inv);
    if (bal <= 0) continue;
    const late = Math.floor((now - t(inv.dueAt)) / DAY);
    if (late <= 0) buckets.aEchoir += bal;
    else if (late <= 30) buckets.j0_30 += bal;
    else if (late <= 60) buckets.j31_60 += bal;
    else buckets.j60plus += bal;
  }
  return { ...buckets, total: buckets.aEchoir + buckets.j0_30 + buckets.j31_60 + buckets.j60plus };
}

export function cashIn(payments: Payment[], from: number, to: number) {
  return payments.filter((p) => p.status === "reussi" && t(p.receivedAt) >= from && t(p.receivedAt) < to).reduce((s, p) => s + p.amountCents, 0);
}

/* ───────────── Relances & SLA ───────────── */

export function isTaskOverdue(task: Task, now: number) {
  return !task.doneAt && t(task.dueAt) < now;
}

export function slaState(sub: Submission, now: number): "ok" | "bientot" | "depasse" | "traite" {
  if (sub.status !== "nouvelle") return "traite";
  if (!sub.slaDueAt) return "ok";
  const left = t(sub.slaDueAt) - now;
  if (left < 0) return "depasse";
  if (left < 12 * 3_600_000) return "bientot";
  return "ok";
}

export function complaintAckLate(c: Complaint, now: number, ackHours = 48) {
  return !c.ackAt && c.status === "recue" && now - t(c.receivedAt) > ackHours * 3_600_000;
}

/* ───────────── Qualiopi ───────────── */

const WEIGHT: Record<QualiopiIndicator["status"], number> = { conforme: 1, partiel: 0.5, non_conforme: 0, a_faire: 0, non_applicable: 0 };

/** Score de préparation à l'audit (0-100) sur les indicateurs applicables. */
export function qualiopiReadiness(indicators: QualiopiIndicator[], criterion?: number) {
  const list = indicators.filter((i) => i.status !== "non_applicable" && (criterion === undefined || i.criterion === criterion));
  if (!list.length) return 100;
  return Math.round((list.reduce((s, i) => s + WEIGHT[i.status], 0) / list.length) * 100);
}

/* ───────────── Séries temporelles ───────────── */

/** Buckets mensuels (12 derniers mois par défaut) : [{ key: '2026-09', label: 'sept.', start, end }]. */
export function lastMonths(now: number, count = 12) {
  const d = new Date(now);
  const out: { key: string; label: string; start: number; end: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() - i + 1, 1);
    out.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: start.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
      start: start.getTime(),
      end: end.getTime(),
    });
  }
  return out;
}

export function lastWeeks(now: number, count = 12) {
  const out: { key: string; label: string; start: number; end: number }[] = [];
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // lundi = 0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
  for (let i = count - 1; i >= 0; i--) {
    const start = monday - i * 7 * DAY;
    out.push({ key: String(start), label: new Date(start).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", ""), start, end: start + 7 * DAY });
  }
  return out;
}

export function inRange(iso: string | undefined, start: number, end: number) {
  const v = t(iso);
  return v >= start && v < end;
}

/* ───────────── Contenus ───────────── */

/** Contenus mesurés page par page sur le site : les articles du blog (/blog/<slug>, cf. crm.track_site_event). */
export function isSiteMeasured(c: Pick<ContentItem, "type" | "channel">): boolean {
  return c.type === "article" && c.channel === "blog";
}

export interface ContentPerformance {
  views: number;
  /** Lecteurs uniques par jour, additionnés (mesure du site uniquement). */
  visitors: number;
  clicks: number;
  leads: number;
  /** Dernier jour avec une vue mesurée (YYYY-MM-DD). */
  lastViewDate?: string;
}

/** Chiffres affichés de chaque contenu : saisie manuelle (metrics) + audience mesurée sur le site. */
export function contentPerformance(contents: ContentItem[], stats: ContentStatDay[]): Map<ID, ContentPerformance> {
  const measured = new Map<ID, ContentPerformance>();
  for (const d of stats) {
    const m = measured.get(d.contentId) ?? { views: 0, visitors: 0, clicks: 0, leads: 0 };
    m.views += d.views;
    m.visitors += d.visitors;
    m.clicks += d.clicks;
    m.leads += d.leads;
    const day = d.date.slice(0, 10);
    if (d.views > 0 && (!m.lastViewDate || day > m.lastViewDate)) m.lastViewDate = day;
    measured.set(d.contentId, m);
  }
  return new Map(
    contents.map((c) => {
      const m = measured.get(c.id);
      const manual = c.metrics ?? { views: 0, clicks: 0, leads: 0 };
      return [
        c.id,
        {
          views: (manual.views ?? 0) + (m?.views ?? 0),
          visitors: m?.visitors ?? 0,
          clicks: (manual.clicks ?? 0) + (m?.clicks ?? 0),
          leads: (manual.leads ?? 0) + (m?.leads ?? 0),
          lastViewDate: m?.lastViewDate,
        },
      ];
    }),
  );
}
