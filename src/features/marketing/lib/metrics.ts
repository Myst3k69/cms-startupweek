/**
 * Dérivations pures du module Marketing : performance des campagnes, attribution CRM,
 * plan de promotion des sessions. `now` toujours passé explicitement (rendu pur).
 */
import type { AdCampaign, AdStatDay, Application, ContentItem, EventSession, Invoice, Submission } from "@/lib/domain/types";
import { daysUntil, invoiceTotal, isUpcoming, sessionStats } from "@/lib/domain/selectors";

const DAY = 86_400_000;

/* ───────────── Performance régie ───────────── */

export interface AdTotals {
  spendCents: number;
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number; // %
  cpcCents?: number;
  cpmCents?: number;
  cplCents?: number; // coût par lead déclaré par la régie
}

export function sumStats(rows: AdStatDay[]): AdTotals {
  let spendCents = 0;
  let impressions = 0;
  let clicks = 0;
  let leads = 0;
  for (const r of rows) {
    spendCents += r.spendCents;
    impressions += r.impressions;
    clicks += r.clicks;
    leads += r.leads;
  }
  return {
    spendCents,
    impressions,
    clicks,
    leads,
    ctr: impressions ? (clicks / impressions) * 100 : 0,
    cpcCents: clicks ? Math.round(spendCents / clicks) : undefined,
    cpmCents: impressions ? Math.round((spendCents / impressions) * 1000) : undefined,
    cplCents: leads ? Math.round(spendCents / leads) : undefined,
  };
}

export function statsBetween(rows: AdStatDay[], fromKey?: string, toKey?: string): AdStatDay[] {
  return rows.filter((r) => (!fromKey || r.date >= fromKey) && (!toKey || r.date <= toKey));
}

/** Index campagne → lignes de statistiques. */
export function statsByCampaign(rows: AdStatDay[]): Map<string, AdStatDay[]> {
  const m = new Map<string, AdStatDay[]>();
  for (const r of rows) {
    const list = m.get(r.campaignId);
    if (list) list.push(r);
    else m.set(r.campaignId, [r]);
  }
  return m;
}

/* ───────────── Attribution CRM (UTM) ───────────── */

const norm = (s?: string) => (s ?? "").trim().toLowerCase();

export interface Attribution {
  /** Candidatures dont utm_campaign = celle de la campagne, arrivées pendant sa fenêtre d'attribution. */
  applications: Application[];
  /** Autres demandes du site (Digital Starter Kit, contact, entreprise…) portant la même utm_campaign. */
  submissions: Submission[];
  leads: number;
  enrolled: number;
  /** CA facturé HT (acomptes + soldes − avoirs) des candidatures attribuées. */
  revenueCents: number;
  revenueByApp: Map<string, number>;
}

/** Fenêtre d'attribution : du lancement (J-1) jusqu'à 30 jours après la fin (clic → candidature). */
export const ATTRIBUTION_DAYS = 30;
export function campaignWindow(c: Pick<AdCampaign, "startAt" | "endAt">): { start: number; end: number } {
  return { start: new Date(c.startAt).getTime() - DAY, end: c.endAt ? new Date(c.endAt).getTime() + ATTRIBUTION_DAYS * DAY : Infinity };
}

export interface AttributionInput {
  applications: Application[];
  submissions: Submission[];
  invoices: Invoice[];
}

/** Indexe les leads par utm_campaign (normalisée) — calcul unique pour toutes les campagnes. */
export function attributionIndex({ applications, submissions, invoices }: AttributionInput, range?: { start: number; end: number }) {
  const inRange = (iso: string) => {
    if (!range) return true;
    const t = new Date(iso).getTime();
    return t >= range.start && t <= range.end;
  };
  const invByApp = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    if (!inv.applicationId || inv.status === "brouillon" || inv.status === "annulee") continue;
    const list = invByApp.get(inv.applicationId);
    if (list) list.push(inv);
    else invByApp.set(inv.applicationId, [inv]);
  }
  const apps = new Map<string, Application[]>();
  for (const a of applications) {
    const k = norm(a.utm?.campaign);
    if (!k || !inRange(a.submittedAt)) continue;
    const list = apps.get(k);
    if (list) list.push(a);
    else apps.set(k, [a]);
  }
  const subs = new Map<string, Submission[]>();
  for (const s of submissions) {
    // Les candidatures ont leur propre fiche : on ne compte pas la demande en double.
    if (s.type === "candidature" || s.status === "spam") continue;
    const k = norm(s.utm?.campaign);
    if (!k || !inRange(s.receivedAt)) continue;
    const list = subs.get(k);
    if (list) list.push(s);
    else subs.set(k, [s]);
  }
  const within = (iso: string, w?: { start: number; end: number }) => {
    if (!w) return true;
    const t = new Date(iso).getTime();
    return t >= w.start && t <= w.end;
  };
  return (utmCampaign: string, window?: { start: number; end: number }): Attribution => {
    const k = norm(utmCampaign);
    const a = ((k && apps.get(k)) || []).filter((x) => within(x.submittedAt, window));
    const s = ((k && subs.get(k)) || []).filter((x) => within(x.receivedAt, window));
    const enrolled = a.filter((x) => x.status === "inscrite").length;
    const revenueByApp = new Map(a.map((x) => [x.id, (invByApp.get(x.id) ?? []).reduce((t, inv) => t + invoiceTotal(inv).ht, 0)]));
    const revenueCents = [...revenueByApp.values()].reduce((sum, v) => sum + v, 0);
    return { applications: a, submissions: s, leads: a.length + s.length, enrolled, revenueCents, revenueByApp };
  };
}

export type Attribute = ReturnType<typeof attributionIndex>;

/** Leads attribués à un ensemble de campagnes, sans double compte (utm_campaign partagée, fenêtres qui se chevauchent). */
export function attributeAll(attribute: Attribute, campaigns: AdCampaign[]): { leads: number; enrolled: number; revenueCents: number; applications: Application[] } {
  const apps = new Map<string, Application>();
  const subs = new Set<string>();
  const revenue = new Map<string, number>();
  for (const c of campaigns) {
    if (!c.utmCampaign) continue;
    const a = attribute(c.utmCampaign, campaignWindow(c));
    for (const x of a.applications) apps.set(x.id, x);
    for (const x of a.submissions) subs.add(x.id);
    for (const [id, v] of a.revenueByApp) revenue.set(id, v);
  }
  const list = [...apps.values()];
  return {
    leads: list.length + subs.size,
    enrolled: list.filter((x) => x.status === "inscrite").length,
    revenueCents: [...revenue.values()].reduce((s, v) => s + v, 0),
    applications: list,
  };
}

export interface CampaignPerf extends AdTotals {
  campaign: AdCampaign;
  crmLeads: number;
  enrolled: number;
  revenueCents: number;
  /** Coût par lead CRM (candidature ou demande attribuée). */
  cplCrmCents?: number;
  /** Coût par inscription payée. */
  cpaCents?: number;
  /** CA HT / dépense. */
  roas?: number;
  budgetUsedPct?: number;
}

export function campaignPerf(campaign: AdCampaign, rows: AdStatDay[], attribution: Attribution): CampaignPerf {
  const t = sumStats(rows);
  return {
    ...t,
    campaign,
    crmLeads: attribution.leads,
    enrolled: attribution.enrolled,
    revenueCents: attribution.revenueCents,
    cplCrmCents: attribution.leads ? Math.round(t.spendCents / attribution.leads) : undefined,
    cpaCents: attribution.enrolled ? Math.round(t.spendCents / attribution.enrolled) : undefined,
    roas: t.spendCents ? attribution.revenueCents / t.spendCents : undefined,
    budgetUsedPct: campaign.budgetCents ? (t.spendCents / campaign.budgetCents) * 100 : undefined,
  };
}

/** Série quotidienne (dépense, clics, leads) sur une fenêtre de jours (clés YYYY-MM-DD). */
export function dailySeries(rows: AdStatDay[], keys: string[]) {
  const by = new Map<string, { spend: number; clicks: number; leads: number; impressions: number }>();
  for (const r of rows) {
    const cur = by.get(r.date) ?? { spend: 0, clicks: 0, leads: 0, impressions: 0 };
    cur.spend += r.spendCents;
    cur.clicks += r.clicks;
    cur.leads += r.leads;
    cur.impressions += r.impressions;
    by.set(r.date, cur);
  }
  return {
    spend: keys.map((k) => (by.get(k)?.spend ?? 0) / 100),
    clicks: keys.map((k) => by.get(k)?.clicks ?? 0),
    leads: keys.map((k) => by.get(k)?.leads ?? 0),
    impressions: keys.map((k) => by.get(k)?.impressions ?? 0),
  };
}

/* ───────────── Plan de promotion des sessions ───────────── */

export type PromoRisk = "critique" | "a_surveiller" | "ok" | "complet";

export interface PromoRow {
  event: EventSession;
  daysLeft: number;
  enrolled: number;
  capacity: number;
  remaining: number;
  fillRate: number;
  pipeline: number;
  /** Remplissage attendu à cette date (courbe type : 100 % à J-7, départ à J-90). */
  expectedFill: number;
  /** Faux pour les webinaires : leurs inscriptions ne passent pas par les candidatures du CRM. */
  tracksFill: boolean;
  campaigns: AdCampaign[];
  activeCampaigns: number;
  spendCents: number;
  contentsPlanned: number;
  risk: PromoRisk;
  advice: string;
}

/** Remplissage « normal » attendu à J-d (linéaire de J-90 à J-7) — repère simple, pas une prévision. */
export function expectedFillAt(daysLeft: number): number {
  if (daysLeft <= 7) return 100;
  if (daysLeft >= 90) return 0;
  return Math.round(((90 - daysLeft) / 83) * 100);
}

export function promotionPlan(
  input: { events: EventSession[]; applications: Application[]; campaigns: AdCampaign[]; contents: ContentItem[]; statsByCampaign: Map<string, AdStatDay[]> },
  now: number,
  horizonDays = 120,
): PromoRow[] {
  const rows: PromoRow[] = [];
  for (const ev of input.events) {
    // Sessions ouvertes au public (les formats B2B privés ne se promeuvent pas en publicité).
    if (!isUpcoming(ev, now) || ev.orgId || !["inscriptions_ouvertes", "prevu", "complet"].includes(ev.status)) continue;
    const daysLeft = daysUntil(ev.startAt, now);
    if (daysLeft > horizonDays) continue;
    const st = sessionStats(ev, input.applications);
    const campaigns = input.campaigns.filter((c) => c.eventId === ev.id);
    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
    const spendCents = campaigns.reduce((s, c) => s + (input.statsByCampaign.get(c.id) ?? []).reduce((t, r) => t + r.spendCents, 0), 0);
    const contentsPlanned = input.contents.filter((c) => c.eventId === ev.id && (c.status === "planifie" || (c.status === "publie" && c.publishedAt && new Date(c.publishedAt).getTime() > now - 30 * DAY))).length;
    const isWebinar = ev.kind === "webinaire";
    const capacity = ev.capacity || 1;
    const fillRate = isWebinar ? Math.round((st.applications / capacity) * 100) : st.fillRate;
    const expectedFill = expectedFillAt(daysLeft);
    const gap = expectedFill - fillRate;

    let risk: PromoRisk;
    if (isWebinar) risk = activeCampaigns === 0 && daysLeft <= 21 ? "a_surveiller" : "ok";
    else if (ev.status === "complet" || st.remaining === 0) risk = "complet";
    else if ((st.belowMinimum && daysLeft <= 30 && !isWebinar) || gap >= 40) risk = "critique";
    else if (gap >= 15 || (activeCampaigns === 0 && daysLeft <= 45)) risk = "a_surveiller";
    else risk = "ok";

    let advice: string;
    if (isWebinar) advice = activeCampaigns ? "Inscriptions au webinaire gérées hors CRM : suivez le coût par lead de la campagne." : "Aucune campagne pour ce webinaire gratuit : un post LinkedIn sponsorisé suffit souvent.";
    else if (risk === "complet") advice = activeCampaigns ? "Session complète : coupez les campagnes et basculez sur la liste d'attente." : "Session complète — orientez la demande vers la prochaine date.";
    else if (risk === "critique" && activeCampaigns === 0) advice = `Aucune campagne active à J-${daysLeft} : lancez une campagne conversion + un retargeting des visiteurs de la page.`;
    else if (risk === "critique") advice = `Remplissage en retard (${fillRate} % vs ~${expectedFill} % attendu) : renforcez le budget, relancez le pipeline (${st.pipeline} en cours) et testez une nouvelle accroche.`;
    else if (activeCampaigns === 0 && daysLeft <= 45) advice = "Pas de campagne active : prévoyez au moins une campagne de notoriété puis de conversion.";
    else if (contentsPlanned === 0) advice = "Aucun contenu planifié pour cette session : programmez un post ou une newsletter.";
    else advice = "Rythme conforme : surveillez le coût par inscription.";

    rows.push({
      event: ev,
      daysLeft,
      enrolled: isWebinar ? st.applications : st.enrolled,
      capacity: ev.capacity,
      remaining: isWebinar ? Math.max(0, ev.capacity - st.applications) : st.remaining,
      fillRate,
      pipeline: st.pipeline,
      expectedFill,
      tracksFill: !isWebinar,
      campaigns,
      activeCampaigns,
      spendCents,
      contentsPlanned,
      risk,
      advice,
    });
  }
  const order: Record<PromoRisk, number> = { critique: 0, a_surveiller: 1, ok: 2, complet: 3 };
  return rows.sort((a, b) => order[a.risk] - order[b.risk] || a.daysLeft - b.daysLeft);
}

/* ───────────── Liens UTM ───────────── */

export interface UtmParams {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
}

/** Normalise une valeur UTM : minuscules, sans accents, séparateur « _ ». */
export function utmValue(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9{}.]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
}

/** URL taguée (conserve les paramètres existants, remplace les utm_*). */
export function buildUtmUrl(base: string, p: UtmParams): string | null {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }
  const set = (k: string, v?: string) => {
    if (v) url.searchParams.set(k, v);
    else url.searchParams.delete(k);
  };
  set("utm_source", p.source);
  set("utm_medium", p.medium);
  set("utm_campaign", p.campaign);
  set("utm_content", p.content);
  set("utm_term", p.term);
  // Les macros de régie ({{ad.id}}…) doivent rester lisibles pour la régie.
  return url.toString().replace(/%7B%7B/g, "{{").replace(/%7D%7D/g, "}}");
}
