"use client";

import { useMemo } from "react";
import { useCrm, type CrmState } from "@/lib/store";
import { useNow, useSession } from "@/lib/hooks";
import { computeAlerts, type Alert } from "@/lib/domain/alerts";
import {
  cashIn,
  contactName,
  effectiveInvoiceStatus,
  inRange,
  invoiceBalance,
  invoiceTotal,
  isRunning,
  isTaskOverdue,
  lastMonths,
  lastWeeks,
  qualiopiReadiness,
  sessionStats,
  slaState,
} from "@/lib/domain/selectors";
import { DEAL_STAGE_PROBABILITY } from "@/lib/domain/constants";
import type { Activity, Application, ContentItem, Evaluation, EventSession, Project, Task, User } from "@/lib/domain/types";

const DAY = 86_400_000;
const ts = (iso?: string) => (iso ? new Date(iso).getTime() : NaN);
const delta = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : cur ? 100 : 0);

export interface AgendaItem {
  id: string;
  at: string;
  title: string;
  detail: string;
  href: string;
  kind: "session" | "entretien" | "tache" | "contenu" | "echeance";
}

export interface PriorityItem {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "danger" | "warning" | "info" | "accent" | "neutral";
  kind: "tache" | "demande" | "reclamation" | "facture" | "convocation" | "candidature";
  due?: string;
  taskId?: string;
  invoiceId?: string;
  complaintId?: string;
  submissionId?: string;
}

export interface DashboardData {
  now: number;
  user?: User;
  kpis: {
    cash30: number;
    cash30Delta: number;
    invoicedYear: number;
    receivable: number;
    overdueAmount: number;
    overdueCount: number;
    apps7: number;
    apps7Delta: number;
    newSubmissions: number;
    lateSubmissions: number;
    weightedPipeline: number;
    openDeals: number;
    upcomingSessions: number;
    avgFill: number;
    satisfaction: number;
    nps: number;
    evalCount: number;
    readiness: number;
    auditInDays?: number;
    enrolledUpcoming: number;
    conversion90: number;
  };
  cashByMonth: { labels: string[]; stripe: number[]; virement: number[]; opco: number[] };
  appsByWeek: { labels: string[]; values: number[] };
  trafficTrend: number[];
  cashTrend: number[];
  upcoming: (EventSession & { stats: ReturnType<typeof sessionStats>; daysLeft: number })[];
  running: EventSession[];
  funnel: { label: string; value: number }[];
  alerts: Alert[];
  priorities: PriorityItem[];
  agenda: AgendaItem[];
  myTasks: Task[];
  recentActivity: Activity[];
  spotlight?: Project;
  verbatim?: Evaluation & { author?: string; session?: string };
  nextContents: ContentItem[];
  topSources: { label: string; value: number }[];
  pipelineByStage: { stage: string; amount: number }[];
  newestApplications: Application[];
  week: { applications: number; enrolled: number; cash: number; submissions: number; contentsPublished: number; complaints: number };
}

type Source = Pick<
  CrmState,
  | "submissions" | "complaints" | "invoices" | "payments" | "tasks" | "events" | "applications" | "speakers" | "contacts" | "settings"
  | "sessionUserId" | "deals" | "evaluations" | "indicators" | "traffic" | "activities" | "projects" | "contents"
>;

export function useDashboardData(): DashboardData {
  const now = useNow();
  const { user } = useSession();
  const submissions = useCrm((x) => x.submissions);
  const complaints = useCrm((x) => x.complaints);
  const invoices = useCrm((x) => x.invoices);
  const payments = useCrm((x) => x.payments);
  const tasks = useCrm((x) => x.tasks);
  const events = useCrm((x) => x.events);
  const applications = useCrm((x) => x.applications);
  const speakers = useCrm((x) => x.speakers);
  const contacts = useCrm((x) => x.contacts);
  const settings = useCrm((x) => x.settings);
  const sessionUserId = useCrm((x) => x.sessionUserId);
  const deals = useCrm((x) => x.deals);
  const evaluations = useCrm((x) => x.evaluations);
  const indicators = useCrm((x) => x.indicators);
  const traffic = useCrm((x) => x.traffic);
  const activities = useCrm((x) => x.activities);
  const projects = useCrm((x) => x.projects);
  const contents = useCrm((x) => x.contents);
  return useMemo(
    () =>
      computeDashboard(
        { submissions, complaints, invoices, payments, tasks, events, applications, speakers, contacts, settings, sessionUserId, deals, evaluations, indicators, traffic, activities, projects, contents },
        now,
        user,
      ),
    [submissions, complaints, invoices, payments, tasks, events, applications, speakers, contacts, settings, sessionUserId, deals, evaluations, indicators, traffic, activities, projects, contents, now, user],
  );
}

/** Calcul pur de toutes les données du tableau de bord (partagé par les 3 designs). */
export function computeDashboard(s: Source, now: number, user?: User): DashboardData {
  const contactById = new Map(s.contacts.map((c) => [c.id, c]));
  const eventById = new Map(s.events.map((e) => [e.id, e]));

  // ── Finances
  const cash30 = cashIn(s.payments, now - 30 * DAY, now);
  const cashPrev = cashIn(s.payments, now - 60 * DAY, now - 30 * DAY);
  const yearStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
  const invoicedYear = s.invoices.filter((i) => i.status !== "brouillon" && i.status !== "annulee" && ts(i.issuedAt) >= yearStart).reduce((a, i) => a + invoiceTotal(i).ttc, 0);
  const openInvoices = s.invoices.filter((i) => i.kind !== "avoir" && !["brouillon", "annulee", "payee"].includes(i.status));
  const receivable = openInvoices.reduce((a, i) => a + Math.max(0, invoiceBalance(i)), 0);
  const overdue = openInvoices.filter((i) => effectiveInvoiceStatus(i, now) === "en_retard");
  const overdueAmount = overdue.reduce((a, i) => a + invoiceBalance(i), 0);

  const months = lastMonths(now, 12);
  const byMethod = (m: string) => months.map((mo) => s.payments.filter((p) => p.status === "reussi" && p.method === m && inRange(p.receivedAt, mo.start, mo.end)).reduce((a, p) => a + p.amountCents, 0) / 100);
  const cashByMonth = { labels: months.map((m) => m.label), stripe: byMethod("stripe"), virement: byMethod("virement"), opco: byMethod("opco") };
  const cashTrend = months.map((_, i) => cashByMonth.stripe[i] + cashByMonth.virement[i] + cashByMonth.opco[i]);

  // ── Candidatures & demandes
  const apps7 = s.applications.filter((a) => ts(a.submittedAt) >= now - 7 * DAY).length;
  const appsPrev = s.applications.filter((a) => ts(a.submittedAt) >= now - 14 * DAY && ts(a.submittedAt) < now - 7 * DAY).length;
  const weeks = lastWeeks(now, 12);
  const appsByWeek = { labels: weeks.map((w) => w.label), values: weeks.map((w) => s.applications.filter((a) => inRange(a.submittedAt, w.start, w.end)).length) };
  const newSubmissions = s.submissions.filter((x) => x.status === "nouvelle").length;
  const lateSubmissions = s.submissions.filter((x) => slaState(x, now) === "depasse").length;

  const recentApps = s.applications.filter((a) => ts(a.submittedAt) >= now - 90 * DAY);
  const reached = (a: Application, stage: number) => {
    const order = ["nouvelle", "qualifiee", "entretien", "acceptee", "inscrite"];
    const idx = order.indexOf(a.status);
    if (idx >= 0) return idx >= stage;
    if (a.status === "desistee") return stage <= 3;
    if (a.status === "liste_attente") return stage <= 2;
    if (a.status === "refusee") return a.interviewAt ? stage <= 2 : stage <= 1;
    return stage === 0;
  };
  const visitors90 = s.traffic.filter((d) => ts(d.date) >= now - 90 * DAY).reduce((a, d) => a + d.visitors, 0);
  const funnel = [
    { label: "Visiteurs du site", value: visitors90 },
    { label: "Candidatures", value: recentApps.length },
    { label: "Qualifiées", value: recentApps.filter((a) => reached(a, 1)).length },
    { label: "Entretiens", value: recentApps.filter((a) => reached(a, 2)).length },
    { label: "Acceptées", value: recentApps.filter((a) => reached(a, 3)).length },
    { label: "Inscrites (payées)", value: recentApps.filter((a) => reached(a, 4)).length },
  ];
  const conversion90 = recentApps.length ? Math.round((funnel[5].value / recentApps.length) * 100) : 0;

  // ── Sessions
  const upcoming = s.events
    .filter((e) => ts(e.startAt) > now && e.status !== "annule" && e.status !== "brouillon")
    .sort((a, b) => ts(a.startAt) - ts(b.startAt))
    .map((e) => ({ ...e, stats: sessionStats(e, s.applications), daysLeft: Math.ceil((ts(e.startAt) - now) / DAY) }));
  const running = s.events.filter((e) => isRunning(e, now));
  const next6 = upcoming.slice(0, 6);
  const avgFill = next6.length ? Math.round(next6.reduce((a, e) => a + e.stats.fillRate, 0) / next6.length) : 0;
  const enrolledUpcoming = upcoming.reduce((a, e) => a + e.stats.enrolled, 0);

  // ── Qualité
  const chaud = s.evaluations.filter((e) => e.kind === "a_chaud" && ts(e.submittedAt) >= now - 365 * DAY);
  const sat = chaud.filter((e) => e.satisfaction !== undefined);
  const satisfaction = sat.length ? Math.round((sat.reduce((a, e) => a + (e.satisfaction ?? 0), 0) / sat.length) * 10) / 10 : 0;
  const npsList = chaud.filter((e) => e.nps !== undefined).map((e) => e.nps!);
  const nps = npsList.length ? Math.round(((npsList.filter((n) => n >= 9).length - npsList.filter((n) => n <= 6).length) / npsList.length) * 100) : 0;
  const readiness = qualiopiReadiness(s.indicators);
  const auditInDays = s.settings.auditDate ? Math.ceil((ts(s.settings.auditDate) - now) / DAY) : undefined;

  // ── Commercial
  const openDeals = s.deals.filter((d) => d.stage !== "gagne" && d.stage !== "perdu");
  const weightedPipeline = openDeals.reduce((a, d) => a + Math.round((d.amountCents * (d.probability ?? DEAL_STAGE_PROBABILITY[d.stage])) / 100), 0);
  const stages = ["nouveau", "qualification", "rdv", "proposition", "negociation"] as const;
  const pipelineByStage = stages.map((st) => ({ stage: st, amount: openDeals.filter((d) => d.stage === st).reduce((a, d) => a + d.amountCents, 0) }));

  // ── Alertes & priorités
  const alerts = computeAlerts(s, now);
  const myTasks = s.tasks
    .filter((t) => !t.doneAt && t.assigneeId === s.sessionUserId)
    .sort((a, b) => ts(a.dueAt) - ts(b.dueAt));
  const priorities: PriorityItem[] = [];
  s.complaints
    .filter((c) => c.status !== "cloturee")
    .forEach((c) =>
      priorities.push({
        id: `rec-${c.id}`,
        complaintId: c.id,
        kind: "reclamation",
        tone: !c.ackAt ? "danger" : "warning",
        title: `${c.ackAt ? "Traiter" : "Accuser réception de"} la réclamation ${c.number}`,
        detail: `${c.subject} — ${contactName(contactById.get(c.contactId ?? ""))}`,
        href: `/qualiopi/reclamations?id=${c.id}`,
        due: c.ackAt ? undefined : new Date(ts(c.receivedAt) + s.settings.complaintAckHours * 3_600_000).toISOString(),
      }),
    );
  s.submissions
    .filter((x) => slaState(x, now) === "depasse" || slaState(x, now) === "bientot")
    .forEach((x) =>
      priorities.push({
        id: `sub-${x.id}`,
        submissionId: x.id,
        kind: "demande",
        tone: slaState(x, now) === "depasse" ? "danger" : "warning",
        title: `Répondre à ${x.name}`,
        detail: `Demande « ${x.type.replace(/_/g, " ")} »${x.company ? ` — ${x.company}` : ""}`,
        href: `/demandes?id=${x.id}`,
        due: x.slaDueAt,
      }),
    );
  myTasks
    .filter((t) => ts(t.dueAt) < now + DAY)
    .forEach((t) =>
      priorities.push({
        id: `tsk-${t.id}`,
        taskId: t.id,
        kind: "tache",
        tone: isTaskOverdue(t, now) ? "warning" : "info",
        title: t.title,
        detail: t.automated ? "Relance automatique" : "Tâche",
        href: "/relances",
        due: t.dueAt,
      }),
    );
  overdue
    .sort((a, b) => invoiceBalance(b) - invoiceBalance(a))
    .slice(0, 4)
    .forEach((i) =>
      priorities.push({
        id: `inv-${i.id}`,
        invoiceId: i.id,
        kind: "facture",
        tone: "warning",
        title: `Relancer la facture ${i.number}`,
        detail: `${(invoiceBalance(i) / 100).toLocaleString("fr-FR")} € — ${contactName(contactById.get(i.contactId ?? ""))}`,
        href: `/facturation/factures/${i.id}`,
        due: i.dueAt,
      }),
    );
  upcoming
    .filter((e) => e.daysLeft <= 7)
    .forEach((e) => {
      const missing = s.applications.filter((a) => a.eventId === e.id && a.status === "inscrite" && !a.convocationSentAt).length;
      if (missing)
        priorities.push({ id: `conv-${e.id}`, kind: "convocation", tone: "info", title: `Envoyer ${missing} convocation${missing > 1 ? "s" : ""} — ${e.code}`, detail: `Session du ${new Date(e.startAt).toLocaleDateString("fr-FR")} · indicateur Qualiopi 9`, href: `/sessions/${e.id}?onglet=participants` });
    });
  const toneRank = { danger: 0, warning: 1, info: 2, accent: 3, neutral: 4 };
  priorities.sort((a, b) => toneRank[a.tone] - toneRank[b.tone] || (ts(a.due) || Infinity) - (ts(b.due) || Infinity));

  // ── Agenda (7 prochains jours)
  const agenda: AgendaItem[] = [];
  s.events
    .filter((e) => ts(e.startAt) >= now - DAY && ts(e.startAt) <= now + 7 * DAY)
    .forEach((e) => agenda.push({ id: `ev-${e.id}`, at: e.startAt, title: `Début ${e.code}`, detail: e.name, href: `/sessions/${e.id}`, kind: "session" }));
  s.applications
    .filter((a) => a.interviewAt && ts(a.interviewAt) >= now - 3_600_000 && ts(a.interviewAt) <= now + 7 * DAY)
    .forEach((a) => agenda.push({ id: `itw-${a.id}`, at: a.interviewAt!, title: `Entretien — ${contactName(contactById.get(a.contactId))}`, detail: `Candidature #${a.number} · ${eventById.get(a.eventId)?.code ?? ""}`, href: `/candidatures/${a.id}`, kind: "entretien" }));
  s.contents
    .filter((c) => c.status === "planifie" && c.scheduledAt && ts(c.scheduledAt) >= now && ts(c.scheduledAt) <= now + 7 * DAY)
    .forEach((c) => agenda.push({ id: `cnt-${c.id}`, at: c.scheduledAt!, title: `Publication — ${c.title}`, detail: c.channel, href: `/contenus/${c.id}`, kind: "contenu" }));
  s.invoices
    .filter((i) => i.status === "emise" && ts(i.dueAt) >= now && ts(i.dueAt) <= now + 7 * DAY)
    .forEach((i) => agenda.push({ id: `due-${i.id}`, at: i.dueAt, title: `Échéance ${i.number}`, detail: `${(invoiceBalance(i) / 100).toLocaleString("fr-FR")} €`, href: `/facturation/factures/${i.id}`, kind: "echeance" }));
  agenda.sort((a, b) => ts(a.at) - ts(b.at));

  // ── Studio : semaine, spotlight, verbatim
  const weekStart = now - 7 * DAY;
  const week = {
    applications: apps7,
    enrolled: s.applications.filter((a) => a.status === "inscrite" && ts(a.updatedAt) >= weekStart).length,
    cash: cashIn(s.payments, weekStart, now),
    submissions: s.submissions.filter((x) => ts(x.receivedAt) >= weekStart).length,
    contentsPublished: s.contents.filter((c) => c.publishedAt && ts(c.publishedAt) >= weekStart).length,
    complaints: s.complaints.filter((c) => ts(c.receivedAt) >= weekStart).length,
  };
  const spotlight = [...s.projects]
    .filter((p) => p.health === "on_track")
    .sort((a, b) => b.awards.length - a.awards.length || (b.metrics.users ?? 0) - (a.metrics.users ?? 0))[0];
  const good = s.evaluations
    .filter((e) => e.comment && (e.satisfaction ?? 0) >= 5 && (e.kind === "a_chaud" || e.kind === "a_froid"))
    .sort((a, b) => ts(b.submittedAt) - ts(a.submittedAt))[0];
  const verbatim = good ? { ...good, author: contactName(contactById.get(good.contactId ?? "")), session: eventById.get(good.eventId)?.code } : undefined;
  const nextContents = s.contents
    .filter((c) => (c.status === "planifie" || c.status === "relecture") && c.scheduledAt)
    .sort((a, b) => ts(a.scheduledAt) - ts(b.scheduledAt))
    .slice(0, 5);

  const src: Record<string, number> = {};
  s.traffic.filter((d) => ts(d.date) >= now - 30 * DAY).forEach((d) => Object.entries(d.sources).forEach(([k, v]) => (src[k] = (src[k] ?? 0) + v)));
  const topSources = Object.entries(src)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return {
    now,
    user,
    kpis: {
      cash30,
      cash30Delta: delta(cash30, cashPrev),
      invoicedYear,
      receivable,
      overdueAmount,
      overdueCount: overdue.length,
      apps7,
      apps7Delta: delta(apps7, appsPrev),
      newSubmissions,
      lateSubmissions,
      weightedPipeline,
      openDeals: openDeals.length,
      upcomingSessions: upcoming.length,
      avgFill,
      satisfaction,
      nps,
      evalCount: chaud.length,
      readiness,
      auditInDays,
      enrolledUpcoming,
      conversion90,
    },
    cashByMonth,
    appsByWeek,
    trafficTrend: s.traffic.slice(-30).map((d) => d.visitors),
    cashTrend,
    upcoming,
    running,
    funnel,
    alerts,
    priorities,
    agenda,
    myTasks,
    recentActivity: s.activities.slice(0, 12),
    spotlight,
    verbatim,
    nextContents,
    topSources,
    pipelineByStage,
    newestApplications: [...s.applications].sort((a, b) => ts(b.submittedAt) - ts(a.submittedAt)).slice(0, 6),
    week,
  };
}
