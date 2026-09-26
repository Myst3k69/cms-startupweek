/**
 * Connexion de l'équipe par lien magique (Supabase Auth, flux PKCE).
 *
 * 1. /connexion : `requestMagicLink(email)` — n'envoie un lien qu'à un compte Auth
 *    existant (`shouldCreateUser: false`) : le projet Supabase héberge aussi les comptes
 *    des participants du site, la page de connexion du CRM ne doit pas en créer.
 * 2. Le lien ramène sur /auth/callback?code=… : `completeSignIn()` échange le code
 *    contre une session (même navigateur requis : le vérificateur PKCE y est stocké).
 * 3. `resolveMemberId()` : le compte doit correspondre à un membre actif de
 *    `crm.team_members` (sinon aucune donnée n'est lisible, RLS) — rattachement
 *    automatique par email vérifié via `crm.claim_team_membership()` si la migration
 *    correspondante est appliquée.
 */
import { isAuthApiError, isAuthPKCECodeVerifierMissingError, isAuthRetryableFetchError, type EmailOtpType } from "@supabase/supabase-js";
import { z } from "zod";
import { describeDbError } from "@/lib/data/sync";
import { getSupabase } from "@/lib/data/supabase";
import { safeNext } from "./redirect";

const emailSchema = z.email();

export type LinkRequest = { ok: true; email: string } | { ok: false; message: string };

export async function requestMagicLink(rawEmail: string, next: string): Promise<LinkRequest> {
  const parsed = emailSchema.safeParse(rawEmail.trim().toLowerCase());
  if (!parsed.success) return { ok: false, message: "Adresse email invalide." };
  const email = parsed.data;
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: "Supabase n'est pas configuré sur ce déploiement (variables NEXT_PUBLIC_SUPABASE_*)." };

  const redirect = new URL("/auth/callback", window.location.origin);
  redirect.searchParams.set("next", safeNext(next));
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: redirect.toString() },
  });
  if (!error) return { ok: true, email };

  // Adresse sans compte : réponse identique à un envoi réussi (on ne révèle pas qui est membre).
  if (error.code === "otp_disabled" || error.code === "signup_disabled" || error.code === "user_not_found" || /signups? not allowed/i.test(error.message)) {
    return { ok: true, email };
  }
  if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit" || error.status === 429) {
    return { ok: false, message: "Trop de demandes de lien : patientez quelques minutes avant de réessayer." };
  }
  if (error.code === "email_address_not_authorized") {
    return {
      ok: false,
      message: "Supabase refuse d'envoyer un email à cette adresse : le serveur d'envoi par défaut est limité. Configurez un SMTP personnalisé (Supabase → Authentication → Emails).",
    };
  }
  if (error.code === "email_address_invalid") return { ok: false, message: "Adresse email refusée par Supabase." };
  if (isAuthRetryableFetchError(error)) return { ok: false, message: "Supabase est injoignable. Vérifiez votre connexion et réessayez." };
  return { ok: false, message: `Envoi du lien impossible (${error.code ?? error.status ?? "erreur"}) : ${error.message}` };
}

export interface CallbackParams {
  code?: string;
  tokenHash?: string;
  type?: string;
  error?: string;
  errorCode?: string;
  errorDescription?: string;
}

export type SignInResult = { ok: true } | { ok: false; message: string };

const EXPIRED = "Ce lien a expiré ou a déjà été utilisé (un lien ne sert qu'une fois). Demandez-en un nouveau.";
const OTHER_BROWSER =
  "Ce lien a déjà servi, ou il a été ouvert dans un autre navigateur que celui où vous l'avez demandé (il ne fonctionne que dans ce dernier). Demandez un nouveau lien depuis ce navigateur-ci.";

export async function completeSignIn(p: CallbackParams): Promise<SignInResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: "Supabase n'est pas configuré sur ce déploiement." };

  if (p.error || p.errorCode) {
    if (p.errorCode === "otp_expired" || p.error === "access_denied") return { ok: false, message: EXPIRED };
    return { ok: false, message: p.errorDescription || p.error || p.errorCode || "Connexion refusée." };
  }

  if (p.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(p.code);
    if (!error) return { ok: true };
    // Lien rouvert alors qu'une session est déjà ouverte dans ce navigateur (le vérificateur
    // PKCE a été consommé au premier passage) : on continue avec la session existante.
    const { data } = await supabase.auth.getSession();
    if (data.session) return { ok: true };
    if (isAuthPKCECodeVerifierMissingError(error) || error.code === "bad_code_verifier") return { ok: false, message: OTHER_BROWSER };
    if (error.code === "flow_state_not_found" || error.code === "flow_state_expired" || error.code === "otp_expired") return { ok: false, message: EXPIRED };
    return { ok: false, message: isAuthApiError(error) ? EXPIRED : error.message };
  }

  // Modèle d'email personnalisé utilisant {{ .TokenHash }} (fonctionne depuis n'importe quel navigateur).
  if (p.tokenHash && (p.type === "magiclink" || p.type === "email")) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: p.tokenHash, type: p.type as EmailOtpType });
    return error ? { ok: false, message: EXPIRED } : { ok: true };
  }

  const { data } = await supabase.auth.getSession();
  return data.session ? { ok: true } : { ok: false, message: "Lien de connexion incomplet. Demandez un nouveau lien." };
}

export type MemberResult = { ok: true; memberId: string } | { ok: false; reason: "no_session" | "not_member" | "error"; message: string };

const NOT_MEMBER =
  "Ce compte n'est pas (ou plus) rattaché à un membre actif de l'équipe. Demandez à un administrateur de vous ajouter dans Paramètres → Équipe avec cette adresse email.";

export async function resolveMemberId(): Promise<MemberResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: "error", message: "Supabase n'est pas configuré." };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "no_session", message: "Session expirée : reconnectez-vous." };

  // 1. Rattachement par email vérifié (migration 20260926150000) — renvoie l'id du membre.
  const claim = await supabase.rpc("claim_team_membership");
  if (!claim.error) {
    return typeof claim.data === "string" && claim.data ? { ok: true, memberId: claim.data } : { ok: false, reason: "not_member", message: NOT_MEMBER };
  }
  if (claim.error.code === "PGRST106") return { ok: false, reason: "error", message: describeDbError(claim.error) };

  // 2. Fonction absente (migration non appliquée) : lien existant auth_user_id → membre.
  const { data, error } = await supabase.from("team_members").select("id, active").eq("auth_user_id", auth.user.id).maybeSingle();
  if (error) return { ok: false, reason: "error", message: describeDbError(error) };
  if (!data || !data.active) return { ok: false, reason: "not_member", message: NOT_MEMBER };
  return { ok: true, memberId: data.id as string };
}

/** Déconnexion de ce navigateur uniquement (les autres appareils restent connectés). */
export async function signOut() {
  await getSupabase()?.auth.signOut({ scope: "local" });
}
