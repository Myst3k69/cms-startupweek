"use client";

/**
 * Mode supabase : ouverture de l'espace de travail après connexion.
 * session Supabase Auth → membre de l'équipe → chargement des données (RLS) → store.
 */
import { resolveMemberId, signOut } from "@/lib/auth/supabase-auth";
import { remoteSync } from "@/lib/data/sync";
import { getSupabase, supabaseConfigured } from "@/lib/data/supabase";
import { useCrm } from "./index";

export type OpenResult = { ok: true } | { ok: false; message: string };

export async function openWorkspace(): Promise<OpenResult> {
  const member = await resolveMemberId();
  if (!member.ok) {
    // Compte Auth valide mais hors équipe : on ferme la session (elle ne donne accès à rien ici).
    if (member.reason === "not_member") await signOut();
    return { ok: false, message: member.message };
  }
  const data = await remoteSync.loadAll();
  if (data.fatal) return { ok: false, message: data.fatal };
  useCrm.getState().hydrateRemote(data, member.memberId);
  return { ok: true };
}

let watching = false;

/** Déconnexion depuis un autre onglet, jeton révoqué ou expiré : on vide l'interface. */
export function watchAuth() {
  const supabase = getSupabase();
  if (!supabase || watching) return;
  watching = true;
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") useCrm.getState().clearRemote(useCrm.getState().authNotice);
  });
}

let started = false;

export const CONFIG_NOTICE =
  "Connexion indisponible : la variable NEXT_PUBLIC_SUPABASE_URL (adresse https://…supabase.co) ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY est absente ou invalide sur ce déploiement Vercel. Corrigez-la puis redéployez.";

/** Au chargement de l'application : reprend la session enregistrée dans ce navigateur, s'il y en a une. */
export async function startRemoteSession() {
  if (started) return;
  started = true;
  try {
    const supabase = supabaseConfigured ? getSupabase() : null;
    if (!supabase) {
      useCrm.getState().clearRemote(CONFIG_NOTICE);
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      useCrm.getState().clearRemote();
      return;
    }
    const res = await openWorkspace();
    if (!res.ok) useCrm.getState().clearRemote(res.message);
  } catch (e) {
    // Jamais d'écran bloqué sur le chargement : l'erreur est affichée sur /connexion.
    console.error("[session] démarrage impossible", e);
    useCrm.getState().clearRemote(`Connexion à Supabase impossible : ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Recharge toutes les données depuis la base (bouton « Recharger »). */
export async function reloadWorkspace(): Promise<OpenResult> {
  const res = await openWorkspace();
  if (!res.ok) useCrm.getState().clearRemote(res.message);
  return res;
}

export async function signOutAndClear(notice?: string) {
  await signOut();
  useCrm.getState().clearRemote(notice);
}
