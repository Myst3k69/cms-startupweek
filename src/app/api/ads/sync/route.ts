/**
 * POST (ou GET, pour Vercel Cron) /api/ads/sync — synchro des régies publicitaires
 * (Meta, LinkedIn) → crm.ad_campaigns + crm.ad_stats.
 *
 * Autorisation (l'une ou l'autre) :
 *   • `Authorization: Bearer <CRON_SECRET>` (Vercel Cron) ;
 *   • `Authorization: Bearer <jeton de session Supabase>` d'un membre actif ayant le droit
 *     d'écriture sur la section « marketing » (bouton « Synchroniser » du back-office).
 *
 * Paramètres (query) : `days` (fenêtre glissante, défaut 7, max 90) ou `since` (AAAA-MM-JJ).
 * La fenêtre recouvre volontairement les jours déjà synchronisés : les régies révisent
 * leurs chiffres quelques jours (conversions attribuées a posteriori). Upsert idempotent :
 * une ligne par (campagne, publicité, jour), identifiant déterministe.
 *
 * Sans configuration (clé Supabase ou jetons des régies absents) : dry-run, aucune écriture.
 */
import { canWrite } from "@/lib/auth/permissions";
import type { Role } from "@/lib/domain/types";
import { verifyBearer } from "@/lib/server/security";
import { getSupabaseAdmin, type CrmAdminClient } from "@/lib/server/supabase-admin";
import {
  campaignUpsert,
  linkedinConfigured,
  metaConfigured,
  pullLinkedin,
  pullMeta,
  type CampaignRow,
  type PlatformPull,
} from "@/lib/server/ads";

export const runtime = "nodejs";
export const maxDuration = 60;

type Auth = { ok: true; via: "cron" | "member"; memberId?: string } | { ok: false; status: number; error: string };

async function authorize(request: Request, db: CrmAdminClient | null): Promise<Auth> {
  const header = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && verifyBearer(header, cronSecret)) return { ok: true, via: "cron" };
  const token = /^Bearer\s+(.+)$/i.exec(header?.trim() ?? "")?.[1];
  if (!token || !db) return { ok: false, status: 401, error: "UNAUTHORIZED" };
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "UNAUTHORIZED" };
  const { data: member } = await db.from("team_members").select("id, role, active").eq("auth_user_id", data.user.id).maybeSingle();
  const m = member as { id: string; role: Role; active: boolean } | null;
  if (!m?.active || !canWrite(m.role, "marketing")) return { ok: false, status: 403, error: "FORBIDDEN" };
  return { ok: true, via: "member", memberId: m.id };
}

const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function persist(db: CrmAdminClient, pull: PlatformPull, syncedAt: string) {
  const { data: existingData, error: readErr } = await db
    .from("ad_campaigns")
    .select("id, platform, external_id, name, status, objective, start_at, end_at, budget_cents, daily_budget_cents, utm_campaign, landing_url, creatives, last_synced_at")
    .eq("platform", pull.platform)
    .not("external_id", "is", null);
  if (readErr) throw new Error(readErr.message);
  const existing = new Map(((existingData ?? []) as CampaignRow[]).map((c) => [c.external_id!, c]));

  const rows = pull.campaigns.map((rc) => campaignUpsert(existing.get(rc.externalId), rc, pull.platform, syncedAt));
  if (rows.length) {
    const { error } = await db.from("ad_campaigns").upsert(rows, { onConflict: "id" });
    if (error) throw new Error(error.message);
  }

  const byExternal = new Map(rows.map((r) => [r.external_id!, r]));
  const stats = [];
  let skipped = 0;
  for (const s of pull.stats) {
    const campaign = byExternal.get(s.campaignExternalId);
    if (!campaign) {
      skipped++;
      continue;
    }
    const creativeId = s.creativeExternalId ? campaign.creatives.find((c) => c.externalId === s.creativeExternalId)?.id : undefined;
    stats.push({
      id: `ads_${campaign.id}_${creativeId ?? "all"}_${s.date.replace(/-/g, "")}`,
      campaign_id: campaign.id,
      creative_id: creativeId ?? null,
      date: s.date,
      spend_cents: s.spendCents,
      impressions: s.impressions,
      clicks: s.clicks,
      leads: s.leads,
    });
  }
  for (let i = 0; i < stats.length; i += 500) {
    const { error } = await db.from("ad_stats").upsert(stats.slice(i, i + 500), { onConflict: "id" });
    if (error) throw new Error(error.message);
  }
  return { campaigns: rows.length, created: rows.filter((r) => !existing.has(r.external_id!)).length, stats: stats.length, skipped, firstId: rows[0]?.id };
}

async function handle(request: Request): Promise<Response> {
  const db = getSupabaseAdmin();
  const configured = { supabase: Boolean(db), meta: metaConfigured(), linkedin: linkedinConfigured(), cron: Boolean(process.env.CRON_SECRET) };

  // Mode démo : rien à lire ni à écrire, on n'expose que l'état de configuration (booléens).
  if (!db || (!configured.meta && !configured.linkedin)) {
    return Response.json({ ok: true, dryRun: true, configured }, { headers: { "Cache-Control": "no-store" } });
  }

  const auth = await authorize(request, db);
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? "7") || 7, 1), 90);
  const sinceParam = url.searchParams.get("since");
  if (sinceParam && !/^\d{4}-\d{2}-\d{2}$/.test(sinceParam)) return Response.json({ ok: false, error: "INVALID_SINCE" }, { status: 400 });
  const now = Date.now();
  const since = sinceParam ?? ymd(now - days * 86_400_000);
  const until = ymd(now);
  const syncedAt = new Date(now).toISOString();

  // Campagnes déjà liées et encore en cours : leur statut est rafraîchi même sans dépense sur la période.
  const { data: linked } = await db.from("ad_campaigns").select("platform, external_id").neq("status", "terminee").not("external_id", "is", null);
  const known = (platform: string) => ((linked ?? []) as { platform: string; external_id: string }[]).filter((c) => c.platform === platform).map((c) => c.external_id);

  const results: Record<string, unknown> = {};
  let failed = false;
  for (const [platform, enabled, pull] of [
    ["meta", configured.meta, pullMeta],
    ["linkedin", configured.linkedin, pullLinkedin],
  ] as const) {
    if (!enabled) {
      results[platform] = { ok: true, skipped: "non configuré" };
      continue;
    }
    try {
      const data = await pull(since, until, known(platform));
      const saved = await persist(db, data, syncedAt);
      results[platform] = { ok: true, campaigns: saved.campaigns, created: saved.created, stats: saved.stats, skipped: saved.skipped };
      if (saved.firstId) {
        await db.from("activities").insert({
          actor_id: auth.via === "member" ? auth.memberId : null,
          kind: "systeme",
          entity: "adCampaigns",
          entity_id: saved.firstId,
          summary: `Synchro ${platform === "meta" ? "Meta Ads" : "LinkedIn Ads"} : ${saved.campaigns} campagne${saved.campaigns > 1 ? "s" : ""}, ${saved.stats} ligne${saved.stats > 1 ? "s" : ""} de statistiques (${since} → ${until})`,
          meta: { platform, created: saved.created, stats: saved.stats },
        });
      }
    } catch (error) {
      failed = true;
      console.error(`[ads] synchro ${platform}`, error);
      results[platform] = { ok: false, error: "SYNC_FAILED", message: error instanceof Error ? error.message.slice(0, 300) : "Erreur inconnue" };
    }
  }

  return Response.json({ ok: !failed, since, until, results }, { status: failed ? 502 : 200, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}

/** Vercel Cron appelle les routes en GET. */
export async function GET(request: Request): Promise<Response> {
  return handle(request);
}
