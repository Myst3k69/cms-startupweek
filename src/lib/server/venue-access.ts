/**
 * Accès aux routes de l'assistant de sourcing (/api/lieux/*).
 *  - mode supabase : jeton Supabase Auth du membre connecté (Authorization: Bearer …),
 *    vérifié auprès de Supabase, avec le droit d'écriture sur la section « sessions »
 *    (crm.has_access, même matrice que l'interface) ;
 *  - mode démo : uniquement en développement local (une démo publique ne consomme
 *    jamais les crédits AI Gateway).
 */
import { createClient } from "@supabase/supabase-js";
import { DATA_MODE, isValidSupabaseUrl } from "@/lib/data/supabase";
import { clientIp } from "@/lib/server/security";

export type VenueAccess =
  | { ok: true; key: string }
  | { ok: false; status: 401 | 403; error: "demo_mode" | "unauthorized" | "forbidden"; message: string };

const expired: VenueAccess = { ok: false, status: 401, error: "unauthorized", message: "Session expirée : reconnectez-vous." };

export async function authorizeSessionsWriter(req: Request): Promise<VenueAccess> {
  if (DATA_MODE !== "supabase") {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, status: 403, error: "demo_mode", message: "Mode démo : l'assistant IA n'est actif qu'une fois l'équipe connectée à Supabase." };
    }
    return { ok: true, key: `dev:${clientIp(req.headers)}` };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!token || !isValidSupabaseUrl(url) || !key) return expired;

  const sb = createClient(url!, key, {
    db: { schema: "crm" },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: auth, error } = await sb.auth.getUser(token);
  if (error || !auth.user) return expired;
  const { data: allowed, error: rpcError } = await sb.rpc("has_access", { section: "sessions", level: "write" });
  if (rpcError || allowed !== true) return { ok: false, status: 403, error: "forbidden", message: "Droit d'écriture sur les sessions requis." };
  return { ok: true, key: `user:${auth.user.id}` };
}
