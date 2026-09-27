/**
 * Désinscription des emails marketing (lien personnel / en-tête List-Unsubscribe).
 * Le consentement « marketing » du contact passe à faux, horodaté ; les emails
 * marketing déjà programmés ne partiront pas (contrôle au moment de l'envoi).
 */
import type { CrmAdminClient } from "./supabase-admin";

type Row = Record<string, unknown>;

export const UNSUBSCRIBE_TOKEN = /^[a-f0-9]{64}$/;

export interface UnsubscribeTarget {
  id: string;
  maskedEmail: string;
  alreadyUnsubscribed: boolean;
}

/** « c•••••@exemple.fr » : on confirme le bon destinataire sans exposer l'adresse. */
function mask(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "•••";
  return `${user.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(6, user.length - 1)))}@${domain}`;
}

export async function findUnsubscribeTarget(db: CrmAdminClient, token: string): Promise<UnsubscribeTarget | null> {
  if (!UNSUBSCRIBE_TOKEN.test(token)) return null;
  const { data } = await db.from("contacts").select("id, email, consent").eq("unsubscribe_token", token).maybeSingle();
  if (!data) return null;
  const row = data as Row;
  const consent = (row.consent ?? {}) as { marketing?: boolean };
  return { id: row.id as string, maskedEmail: mask(String(row.email ?? "")), alreadyUnsubscribed: consent.marketing !== true };
}

export async function unsubscribe(db: CrmAdminClient, token: string, via: "lien" | "one-click"): Promise<boolean> {
  if (!UNSUBSCRIBE_TOKEN.test(token)) return false;
  const { data } = await db.from("contacts").select("id, consent").eq("unsubscribe_token", token).maybeSingle();
  if (!data) return false;
  const row = data as Row;
  const consent = (row.consent ?? {}) as Row;
  if (consent.marketing === false && consent.unsubscribedAt) return true;
  const at = new Date().toISOString();
  const { error } = await db
    .from("contacts")
    .update({ consent: { ...consent, marketing: false, unsubscribedAt: at } })
    .eq("id", row.id as string);
  if (error) throw new Error(error.message);
  await db.from("activities").insert({
    kind: "systeme",
    entity: "contacts",
    entity_id: row.id,
    summary: via === "one-click" ? "Désinscription des emails marketing (bouton de la messagerie)" : "Désinscription des emails marketing (lien de l'email)",
    meta: { unsubscribedAt: at },
  });
  return true;
}
