/**
 * GET /api/health — état de l'API serveur (supervision, vérification post-déploiement).
 *
 * Ne renvoie QUE des booléens de configuration : jamais de secret, d'URL privée ni de clé.
 * `database` : « ok » si une requête légère sur crm.settings aboutit (schéma exposé,
 * migrations appliquées, clé service_role valide).
 */
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const env = process.env;
  const supabase = isSupabaseAdminConfigured();

  let database: "ok" | "erreur" | "non_configure" = "non_configure";
  const db = supabase ? getSupabaseAdmin() : null;
  if (db) {
    try {
      const { error } = await db.from("settings").select("id", { head: true, count: "exact" });
      database = error ? "erreur" : "ok";
    } catch {
      database = "erreur";
    }
  }

  return Response.json(
    {
      ok: !supabase || database === "ok",
      /** Persistance de l'API : « supabase » si la clé service_role est configurée, sinon « demo » (dry-run). */
      mode: supabase ? "supabase" : "demo",
      /** Mode de données de l'interface (NEXT_PUBLIC_CRM_DATA_MODE). */
      uiDataMode: env.NEXT_PUBLIC_CRM_DATA_MODE === "supabase" ? "supabase" : "demo",
      database,
      services: {
        supabaseAdmin: supabase,
        supabasePublic: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
        intakeSignature: Boolean(env.INTAKE_SIGNING_SECRET),
        allowedOriginsCustom: Boolean(env.ALLOWED_ORIGINS),
        stripeWebhook: Boolean(env.STRIPE_WEBHOOK_SECRET),
        stripeApi: Boolean(env.STRIPE_SECRET_KEY),
        qonto: Boolean(env.QONTO_ORGANIZATION_SLUG && env.QONTO_SECRET_KEY && env.QONTO_BANK_ACCOUNT_ID),
        email: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
        cron: Boolean(env.CRON_SECRET),
      },
      time: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
