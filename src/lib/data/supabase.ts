/**
 * Client Supabase du navigateur (schéma `crm`), partagé par l'authentification
 * (lien magique) et la synchronisation des données.
 *
 * Mode démo (par défaut) : aucun client, tout vit dans le store local.
 * Mode supabase (NEXT_PUBLIC_CRM_DATA_MODE=supabase) : session Supabase Auth
 * (flux PKCE, stockée dans le navigateur) ; chaque requête porte le jeton de
 * l'utilisateur, la RLS du schéma `crm` s'applique.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const DATA_MODE: "demo" | "supabase" = process.env.NEXT_PUBLIC_CRM_DATA_MODE === "supabase" ? "supabase" : "demo";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Adresse d'API valide (https://<ref>.supabase.co) — protège d'une variable mal saisie (ex. son nom collé comme valeur). */
export function isValidSupabaseUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const u = new globalThis.URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Mode supabase demandé ET variables présentes et valides. */
export const supabaseConfigured = DATA_MODE === "supabase" && isValidSupabaseUrl(URL) && Boolean(KEY);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schéma `crm` non typé (types générés à venir : supabase gen types)
export type CrmClient = SupabaseClient<any, "crm">;

let client: CrmClient | null = null;

/** Client unique (null en mode démo ou si mal configuré, et côté serveur). */
export function getSupabase(): CrmClient | null {
  if (!supabaseConfigured || typeof window === "undefined") return null;
  client ??= createClient(URL!, KEY!, {
    db: { schema: "crm" },
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      // Le retour du lien magique est traité explicitement par /auth/callback.
      detectSessionInUrl: false,
      // Clé dédiée : n'interfère pas avec une éventuelle session du site sur le même navigateur.
      storageKey: "sw-crm-auth",
    },
  });
  return client;
}
