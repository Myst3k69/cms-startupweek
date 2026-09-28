/**
 * Connecteurs des régies publicitaires (serveur uniquement) — lecture seule.
 *
 * Meta Marketing API (Graph) : insights quotidiens au niveau publicité, puis détails des
 * campagnes et publicités concernées (requêtes groupées `?ids=`).
 *   META_ADS_ACCESS_TOKEN (jeton d'utilisateur système, permission ads_read),
 *   META_AD_ACCOUNT_ID (avec ou sans « act_ »), META_GRAPH_VERSION (défaut v25.0).
 *
 * LinkedIn Marketing API (versionnée, Rest.li 2.0) : /rest/adAnalytics?q=statistics,
 * pivots CAMPAIGN + CREATIVE, granularité quotidienne, puis détails des campagnes et créations.
 *   LINKEDIN_ADS_ACCESS_TOKEN (portées r_ads, r_ads_reporting), LINKEDIN_AD_ACCOUNT_ID
 *   (identifiant numérique du compte publicitaire), LINKEDIN_API_VERSION (AAAAMM, défaut 202609).
 *
 * Les montants sont lus dans la devise du compte publicitaire (supposée EUR) et convertis en centimes.
 * Clics : clics sur lien pour Meta (inline_link_clicks), clics totaux pour LinkedIn.
 * Leads : actions « lead » pour Meta ; oneClickLeads + externalWebsiteConversions pour LinkedIn.
 */
import type { AdCreative, AdPlatform, CampaignObjective, CampaignStatus } from "@/lib/domain/types";

/* ───────────── Modèle normalisé ───────────── */

export interface RemoteCreative {
  externalId: string;
  name: string;
  headline: string;
  primaryText: string;
  callToAction?: string;
  imageUrl?: string;
  format: AdCreative["format"];
  active: boolean;
}

export interface RemoteCampaign {
  externalId: string;
  name: string;
  status: CampaignStatus;
  objective: CampaignObjective;
  startAt?: string;
  endAt?: string;
  budgetCents?: number;
  dailyBudgetCents?: number;
  creatives: RemoteCreative[];
}

export interface RemoteStat {
  campaignExternalId: string;
  creativeExternalId?: string;
  date: string; // YYYY-MM-DD
  spendCents: number;
  impressions: number;
  clicks: number;
  leads: number;
}

export interface PlatformPull {
  platform: AdPlatform;
  campaigns: RemoteCampaign[];
  stats: RemoteStat[];
}

export function metaConfigured(env = process.env): boolean {
  return Boolean(env.META_ADS_ACCESS_TOKEN && env.META_AD_ACCOUNT_ID);
}

export function linkedinConfigured(env = process.env): boolean {
  return Boolean(env.LINKEDIN_ADS_ACCESS_TOKEN && env.LINKEDIN_AD_ACCOUNT_ID);
}

const toCents = (v: unknown) => {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
};
const toInt = (v: unknown) => {
  const n = typeof v === "number" ? v : Number.parseInt(String(v ?? "0"), 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

async function getJson<T>(url: string, init: RequestInit, label: string): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) {
    // Jamais le jeton dans les messages d'erreur : on ne renvoie que le statut et le début du corps.
    throw new Error(`${label} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/* ───────────── Meta ───────────── */

interface MetaAction {
  action_type?: string;
  value?: string;
}

interface MetaInsight {
  campaign_id?: string;
  campaign_name?: string;
  ad_id?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  inline_link_clicks?: string;
  actions?: MetaAction[];
  date_start?: string;
}

interface MetaPage<T> {
  data?: T[];
  paging?: { next?: string };
}

interface MetaCampaign {
  id: string;
  name?: string;
  effective_status?: string;
  status?: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
}

interface MetaAd {
  id: string;
  name?: string;
  effective_status?: string;
  creative?: { title?: string; body?: string; call_to_action_type?: string; image_url?: string; thumbnail_url?: string; object_type?: string; video_id?: string };
}

const META_LEAD_ACTIONS = ["offsite_conversion.fb_pixel_lead", "onsite_conversion.lead_grouped"];

/** Leads Meta : action agrégée « lead » si présente, sinon pixel + formulaires instantanés. */
export function metaLeads(actions: MetaAction[] | undefined): number {
  if (!actions?.length) return 0;
  const aggregated = actions.find((a) => a.action_type === "lead");
  if (aggregated) return toInt(aggregated.value);
  return actions.filter((a) => META_LEAD_ACTIONS.includes(a.action_type ?? "")).reduce((s, a) => s + toInt(a.value), 0);
}

export function metaStatus(c: Pick<MetaCampaign, "effective_status" | "status" | "stop_time">, now = Date.now()): CampaignStatus {
  const s = (c.effective_status ?? c.status ?? "").toUpperCase();
  if (s === "ARCHIVED" || s === "DELETED") return "terminee";
  if (c.stop_time && new Date(c.stop_time).getTime() < now) return "terminee";
  if (s.includes("PAUSED")) return "en_pause";
  return "active";
}

export function metaObjective(objective: string | undefined): CampaignObjective {
  switch ((objective ?? "").toUpperCase()) {
    case "OUTCOME_AWARENESS":
    case "BRAND_AWARENESS":
    case "REACH":
    case "OUTCOME_ENGAGEMENT":
    case "VIDEO_VIEWS":
      return "notoriete";
    case "OUTCOME_TRAFFIC":
    case "LINK_CLICKS":
      return "trafic";
    case "OUTCOME_LEADS":
    case "LEAD_GENERATION":
      return "leads";
    default:
      return "conversions";
  }
}

async function metaPaged<T>(first: string): Promise<T[]> {
  const out: T[] = [];
  let url: string | undefined = first;
  for (let i = 0; url && i < 50; i++) {
    const page: MetaPage<T> = await getJson<MetaPage<T>>(url, {}, "Meta");
    out.push(...(page.data ?? []));
    url = page.paging?.next;
  }
  return out;
}

/** Détails de plusieurs objets Graph en une requête (50 ids maximum par appel). */
async function metaByIds<T>(base: string, token: string, ids: string[], fields: string): Promise<Record<string, T>> {
  const out: Record<string, T> = {};
  for (let i = 0; i < ids.length; i += 50) {
    const url = new URL(base + "/");
    url.searchParams.set("ids", ids.slice(i, i + 50).join(","));
    url.searchParams.set("fields", fields);
    url.searchParams.set("access_token", token);
    Object.assign(out, await getJson<Record<string, T>>(url.toString(), {}, "Meta"));
  }
  return out;
}

export async function pullMeta(since: string, until: string, knownCampaignIds: string[] = []): Promise<PlatformPull> {
  const token = process.env.META_ADS_ACCESS_TOKEN ?? "";
  const account = (process.env.META_AD_ACCOUNT_ID ?? "").replace(/^act_/, "");
  const version = process.env.META_GRAPH_VERSION || "v25.0";
  const base = `https://graph.facebook.com/${version}`;

  const insightsUrl = new URL(`${base}/act_${account}/insights`);
  insightsUrl.searchParams.set("level", "ad");
  insightsUrl.searchParams.set("time_increment", "1");
  insightsUrl.searchParams.set("time_range", JSON.stringify({ since, until }));
  insightsUrl.searchParams.set("fields", "campaign_id,campaign_name,ad_id,ad_name,spend,impressions,clicks,inline_link_clicks,actions,date_start");
  insightsUrl.searchParams.set("limit", "500");
  insightsUrl.searchParams.set("access_token", token);
  const insights = await metaPaged<MetaInsight>(insightsUrl.toString());

  const stats: RemoteStat[] = [];
  const adIds = new Set<string>();
  const campaignIds = new Set<string>(knownCampaignIds);
  for (const row of insights) {
    if (!row.campaign_id || !row.date_start) continue;
    campaignIds.add(row.campaign_id);
    if (row.ad_id) adIds.add(row.ad_id);
    stats.push({
      campaignExternalId: row.campaign_id,
      creativeExternalId: row.ad_id,
      date: row.date_start.slice(0, 10),
      spendCents: toCents(row.spend),
      impressions: toInt(row.impressions),
      clicks: toInt(row.inline_link_clicks ?? row.clicks),
      leads: metaLeads(row.actions),
    });
  }

  const campaigns = await metaByIds<MetaCampaign>(base, token, [...campaignIds], "id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time");
  const ads = await metaByIds<MetaAd & { campaign_id?: string }>(
    base,
    token,
    [...adIds],
    "id,name,effective_status,campaign_id,creative{title,body,call_to_action_type,image_url,thumbnail_url,object_type,video_id}",
  );
  const adsByCampaign = new Map<string, RemoteCreative[]>();
  for (const ad of Object.values(ads)) {
    if (!ad.campaign_id) continue;
    const cr = ad.creative ?? {};
    const list = adsByCampaign.get(ad.campaign_id) ?? [];
    list.push({
      externalId: ad.id,
      name: ad.name ?? `Publicité ${ad.id}`,
      headline: cr.title ?? "",
      primaryText: cr.body ?? "",
      callToAction: cr.call_to_action_type ? cr.call_to_action_type.replace(/_/g, " ").toLowerCase() : undefined,
      imageUrl: cr.image_url ?? cr.thumbnail_url,
      format: cr.video_id || cr.object_type === "VIDEO" ? "video" : "image",
      active: (ad.effective_status ?? "").toUpperCase() === "ACTIVE",
    });
    adsByCampaign.set(ad.campaign_id, list);
  }

  return {
    platform: "meta",
    stats,
    campaigns: Object.values(campaigns).map((c) => ({
      externalId: c.id,
      name: c.name ?? `Campagne ${c.id}`,
      status: metaStatus(c),
      objective: metaObjective(c.objective),
      startAt: c.start_time ? new Date(c.start_time).toISOString() : undefined,
      endAt: c.stop_time ? new Date(c.stop_time).toISOString() : undefined,
      // Budgets Graph : chaînes en unités mineures (centimes).
      budgetCents: c.lifetime_budget ? toInt(c.lifetime_budget) : undefined,
      dailyBudgetCents: c.daily_budget ? toInt(c.daily_budget) : undefined,
      creatives: adsByCampaign.get(c.id) ?? [],
    })),
  };
}

/* ───────────── LinkedIn ───────────── */

interface LiDate {
  year: number;
  month: number;
  day: number;
}

interface LiAnalytics {
  pivotValues?: string[];
  dateRange?: { start?: LiDate };
  impressions?: number;
  clicks?: number;
  costInLocalCurrency?: string;
  oneClickLeads?: number;
  externalWebsiteConversions?: number;
}

interface LiCampaign {
  id?: number;
  name?: string;
  status?: string;
  objectiveType?: string;
  runSchedule?: { start?: number; end?: number };
  dailyBudget?: { amount?: string };
  totalBudget?: { amount?: string };
}

interface LiCreative {
  id?: string;
  name?: string;
  campaign?: string;
  intendedStatus?: string;
}

const liDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `(year:${y},month:${m},day:${d})`;
};
const ymd = (d?: LiDate) => (d ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` : "");
/** urn:li:sponsoredCampaign:123 → 123 */
const urnId = (urn: string) => urn.split(":").pop() ?? urn;

export function linkedinStatus(c: Pick<LiCampaign, "status" | "runSchedule">, now = Date.now()): CampaignStatus {
  const s = (c.status ?? "").toUpperCase();
  if (s === "DRAFT") return "brouillon";
  if (s === "PAUSED") return "en_pause";
  if (["ARCHIVED", "COMPLETED", "CANCELED", "REMOVED", "PENDING_DELETION"].includes(s)) return "terminee";
  if (c.runSchedule?.end && c.runSchedule.end < now) return "terminee";
  return "active";
}

export function linkedinObjective(o: string | undefined): CampaignObjective {
  switch ((o ?? "").toUpperCase()) {
    case "BRAND_AWARENESS":
    case "ENGAGEMENT":
    case "VIDEO_VIEW":
      return "notoriete";
    case "WEBSITE_VISIT":
      return "trafic";
    case "LEAD_GENERATION":
      return "leads";
    default:
      return "conversions";
  }
}

export async function pullLinkedin(since: string, until: string, knownCampaignIds: string[] = []): Promise<PlatformPull> {
  const token = process.env.LINKEDIN_ADS_ACCESS_TOKEN ?? "";
  const account = (process.env.LINKEDIN_AD_ACCOUNT_ID ?? "").replace(/^urn:li:sponsoredAccount:/, "");
  const headers = {
    Authorization: `Bearer ${token}`,
    "LinkedIn-Version": process.env.LINKEDIN_API_VERSION || "202609",
    "X-Restli-Protocol-Version": "2.0.0",
    Accept: "application/json",
  };

  // Rest.li 2.0 : parenthèses et virgules littérales, URN encodées (pas d'URLSearchParams).
  const query = [
    "q=statistics",
    "pivots=List(CAMPAIGN,CREATIVE)",
    "timeGranularity=DAILY",
    `dateRange=(start:${liDate(since)},end:${liDate(until)})`,
    `accounts=List(${encodeURIComponent(`urn:li:sponsoredAccount:${account}`)})`,
    "fields=dateRange,pivotValues,impressions,clicks,costInLocalCurrency,oneClickLeads,externalWebsiteConversions",
  ].join("&");
  const analytics = await getJson<{ elements?: LiAnalytics[] }>(`https://api.linkedin.com/rest/adAnalytics?${query}`, { headers }, "LinkedIn");

  const stats: RemoteStat[] = [];
  const campaignIds = new Set<string>(knownCampaignIds.map(urnId));
  const creativeUrns = new Set<string>();
  for (const el of analytics.elements ?? []) {
    const [campaignUrn, creativeUrn] = el.pivotValues ?? [];
    const date = ymd(el.dateRange?.start);
    if (!campaignUrn || !date) continue;
    campaignIds.add(urnId(campaignUrn));
    if (creativeUrn) creativeUrns.add(creativeUrn);
    stats.push({
      campaignExternalId: `urn:li:sponsoredCampaign:${urnId(campaignUrn)}`,
      creativeExternalId: creativeUrn,
      date,
      spendCents: toCents(el.costInLocalCurrency),
      impressions: toInt(el.impressions),
      clicks: toInt(el.clicks),
      leads: toInt(el.oneClickLeads) + toInt(el.externalWebsiteConversions),
    });
  }

  const creativesByCampaign = new Map<string, RemoteCreative[]>();
  for (const urn of creativeUrns) {
    try {
      const cr = await getJson<LiCreative>(`https://api.linkedin.com/rest/adAccounts/${account}/creatives/${encodeURIComponent(urn)}`, { headers }, "LinkedIn");
      const campaign = cr.campaign ? urnId(cr.campaign) : undefined;
      if (!campaign) continue;
      const list = creativesByCampaign.get(campaign) ?? [];
      list.push({
        externalId: urn,
        name: cr.name || `Création ${urnId(urn)}`,
        headline: "",
        primaryText: "",
        format: "image",
        active: (cr.intendedStatus ?? "").toUpperCase() === "ACTIVE",
      });
      creativesByCampaign.set(campaign, list);
    } catch (e) {
      // Une création illisible (supprimée, droits) n'empêche pas la synchro des chiffres.
      console.warn("[ads] création LinkedIn", urn, e instanceof Error ? e.message : e);
    }
  }

  const campaigns: RemoteCampaign[] = [];
  for (const id of campaignIds) {
    const c = await getJson<LiCampaign>(`https://api.linkedin.com/rest/adAccounts/${account}/adCampaigns/${id}`, { headers }, "LinkedIn");
    campaigns.push({
      externalId: `urn:li:sponsoredCampaign:${id}`,
      name: c.name ?? `Campagne ${id}`,
      status: linkedinStatus(c),
      objective: linkedinObjective(c.objectiveType),
      startAt: c.runSchedule?.start ? new Date(c.runSchedule.start).toISOString() : undefined,
      endAt: c.runSchedule?.end ? new Date(c.runSchedule.end).toISOString() : undefined,
      budgetCents: c.totalBudget?.amount ? toCents(c.totalBudget.amount) : undefined,
      dailyBudgetCents: c.dailyBudget?.amount ? toCents(c.dailyBudget.amount) : undefined,
      creatives: creativesByCampaign.get(id) ?? [],
    });
  }
  return { platform: "linkedin", campaigns, stats };
}

/* ───────────── Fusion avec les campagnes du CRM ───────────── */

/** Ligne crm.ad_campaigns (snake_case ; creatives en camelCase, comme dans le store). */
export interface CampaignRow {
  id: string;
  platform: AdPlatform;
  external_id: string | null;
  name: string;
  status: CampaignStatus;
  objective: CampaignObjective;
  start_at: string;
  end_at: string | null;
  budget_cents: number;
  daily_budget_cents: number | null;
  utm_campaign: string;
  landing_url: string;
  creatives: AdCreative[];
  last_synced_at: string | null;
}

/** Identifiant stable dérivé de l'id de la régie (les stats d'un même objet gardent la même clé). */
export const remoteKey = (externalId: string) => (externalId.split(":").pop() ?? externalId).replace(/[^A-Za-z0-9_-]/g, "");

/** utm_campaign par défaut d'une campagne découverte par la synchro (modifiable ensuite dans le CRM). */
export function defaultUtm(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

/**
 * Publicités : celles de la régie sont mises à jour (repérées par externalId, id CRM conservé),
 * les nouvelles ajoutées, celles saisies à la main (sans externalId) conservées telles quelles.
 */
export function mergeCreatives(existing: AdCreative[], remote: RemoteCreative[], platform: AdPlatform): AdCreative[] {
  const out = existing.map((c) => ({ ...c }));
  for (const r of remote) {
    const cur = out.find((c) => c.externalId === r.externalId);
    if (cur) {
      cur.name = r.name || cur.name;
      cur.headline = r.headline || cur.headline;
      cur.primaryText = r.primaryText || cur.primaryText;
      cur.callToAction = r.callToAction ?? cur.callToAction;
      cur.imageUrl = r.imageUrl ?? cur.imageUrl;
      cur.format = r.format;
      cur.active = r.active;
    } else {
      out.push({ id: `cr_${platform}_${remoteKey(r.externalId)}`, ...r });
    }
  }
  return out;
}

/**
 * Ligne à écrire pour une campagne de la régie : création (valeurs par défaut) ou mise à jour
 * des seuls champs portés par la régie. Les champs propres au CRM (session promue, utm_campaign,
 * ciblage résumé, notes, responsable, objectif affiné) ne sont jamais écrasés.
 */
export function campaignUpsert(existing: CampaignRow | undefined, remote: RemoteCampaign, platform: AdPlatform, syncedAt: string): CampaignRow {
  const creatives = mergeCreatives(existing?.creatives ?? [], remote.creatives, platform);
  if (existing) {
    return {
      ...existing,
      name: remote.name || existing.name,
      status: remote.status,
      start_at: remote.startAt ?? existing.start_at,
      end_at: remote.endAt ?? existing.end_at,
      budget_cents: remote.budgetCents ?? existing.budget_cents,
      daily_budget_cents: remote.dailyBudgetCents ?? existing.daily_budget_cents,
      creatives,
      last_synced_at: syncedAt,
    };
  }
  return {
    id: `cmp_${platform}_${remoteKey(remote.externalId)}`,
    platform,
    external_id: remote.externalId,
    name: remote.name,
    status: remote.status,
    objective: remote.objective,
    start_at: remote.startAt ?? syncedAt,
    end_at: remote.endAt ?? null,
    budget_cents: remote.budgetCents ?? 0,
    daily_budget_cents: remote.dailyBudgetCents ?? null,
    utm_campaign: defaultUtm(remote.name),
    landing_url: "",
    creatives,
    last_synced_at: syncedAt,
  };
}
