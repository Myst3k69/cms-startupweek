/**
 * Authentification d'un membre de l'équipe sur une route API (jeton Supabase du back-office).
 *
 * Le navigateur envoie `Authorization: Bearer <access_token>` (session Supabase du CRM) ;
 * le serveur vérifie le jeton auprès de Supabase Auth, retrouve le membre actif de
 * crm.team_members et contrôle ses droits avec la même matrice que la RLS.
 *
 * Mode démo (Supabase non configuré côté serveur) : refusé, sauf si ALLOW_DEMO_API=1
 * (développement local) — une route payante ne doit jamais être ouverte sans compte.
 */
import { access, type Access, type Section } from "@/lib/auth/permissions";
import type { Role } from "@/lib/domain/types";
import { getSupabaseAdmin } from "./supabase-admin";

export type TeamAuth = { ok: true; memberId?: string; role: Role; demo: boolean } | { ok: false; status: 401 | 403 | 503; error: string };

export async function authenticateTeamMember(request: Request, section: Section, level: Exclude<Access, "none"> = "write"): Promise<TeamAuth> {
  const db = getSupabaseAdmin();
  if (!db) {
    if (process.env.ALLOW_DEMO_API === "1") return { ok: true, role: "admin", demo: true };
    return { ok: false, status: 503, error: "SUPABASE_NOT_CONFIGURED" };
  }
  const header = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1];
  if (!token) return { ok: false, status: 401, error: "MISSING_TOKEN" };
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "INVALID_TOKEN" };
  const { data: member, error: memberError } = await db.from("team_members").select("id, role, active").eq("auth_user_id", data.user.id).maybeSingle();
  if (memberError) return { ok: false, status: 503, error: "MEMBER_LOOKUP_FAILED" };
  if (!member || !member.active) return { ok: false, status: 403, error: "NOT_A_TEAM_MEMBER" };
  const role = member.role as Role;
  const granted = access(role, section);
  if (granted === "none" || (level === "write" && granted !== "write")) return { ok: false, status: 403, error: "FORBIDDEN" };
  return { ok: true, memberId: member.id as string, role, demo: false };
}
