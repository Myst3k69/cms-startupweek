/**
 * Client Supabase « service_role » — UNIQUEMENT côté serveur (Route Handlers).
 *
 * - Clé secrète : SUPABASE_SECRET_KEY (jamais préfixée NEXT_PUBLIC_, jamais envoyée au navigateur).
 * - URL : SUPABASE_URL, à défaut NEXT_PUBLIC_SUPABASE_URL.
 * - Schéma par défaut : `crm` (RLS contournée : le rôle service_role possède BYPASSRLS).
 *
 * Retourne `null` si l'environnement n'est pas configuré : les routes basculent
 * alors en mode démo (dry-run, aucune écriture).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schéma `crm` non typé (types générés à venir : supabase gen types)
export type CrmAdminClient = SupabaseClient<any, "crm">;

let cached: CrmAdminClient | null = null;

/** URL du projet Supabase (serveur d'abord, public en repli). */
export function supabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || undefined;
}

/** Vrai si l'API serveur peut écrire dans Supabase (URL + clé secrète présentes). */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(supabaseUrl() && process.env.SUPABASE_SECRET_KEY);
}

/** Client service_role mémorisé (une instance par processus serveur), ou null en mode démo. */
export function getSupabaseAdmin(): CrmAdminClient | null {
  if (typeof window !== "undefined") {
    // Garde-fou : ce module ne doit jamais être embarqué dans un bundle client.
    throw new Error("supabase-admin ne doit être utilisé que côté serveur");
  }
  if (cached) return cached;
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key, {
    db: { schema: "crm" },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-client-info": "startupweek-os-server" } },
  });
  return cached;
}
