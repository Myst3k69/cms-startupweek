/**
 * File d'envoi des emails (crm.email_messages) — serveur uniquement.
 *
 * Un email « programme » dont l'heure est passée est réservé par
 * crm.claim_due_emails() (verrou + tentative comptée), complété (liens personnels),
 * contrôlé (variables remplies, consentement pour le marketing), envoyé, puis :
 *   • envoyé → statut « envoye », horodatage, identifiant du message, journal ;
 *   • échec → nouvel essai à +5 / +10 min, puis « erreur » au 3e échec (raison gardée) ;
 *   • non envoyable (variable non remplie, contact désinscrit) → « erreur » ou
 *     « brouillon » avec la raison, sans nouvel essai.
 * Déclenchée par la base (trigger + planificateur → pg_net → /api/emails/dispatch).
 */
import type { CrmAdminClient } from "./supabase-admin";
import { renderEmail, type EmailSender } from "./mailer";
import { unfilledVariables } from "@/lib/email-template";
import type { EntityRef } from "@/lib/domain/types";

type Row = Record<string, unknown>;

export const MAX_ATTEMPTS = 3;

export interface DispatchResult {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  skipped: number;
}

export interface DispatchOptions {
  /** Base des liens publics (documents, désinscription), ex. https://crm.startupweek.tech */
  baseUrl: string;
  /** Arrêt au-delà de cet instant (ms epoch) — marge avant la limite de durée de la fonction. */
  deadline: number;
  batchSize?: number;
}

const now = () => new Date().toISOString();

async function logActivity(db: CrmAdminClient, kind: "email" | "systeme", related: EntityRef | undefined, summary: string, meta: Row) {
  if (!related?.entity || !related.id) return;
  await db.from("activities").insert({ kind, entity: related.entity, entity_id: related.id, summary, meta });
}

async function resolveDocumentLink(db: CrmAdminClient, related: EntityRef | undefined, baseUrl: string): Promise<string | undefined> {
  if (!related || (related.entity !== "invoices" && related.entity !== "quotes")) return undefined;
  const { data } = await db.from(related.entity).select("public_token").eq("id", related.id).maybeSingle();
  const token = (data as Row | null)?.public_token;
  return typeof token === "string" && token ? `${baseUrl}/documents/${token}` : undefined;
}

interface ContactInfo {
  id: string;
  unsubscribeToken?: string;
  marketingOk: boolean;
}

async function findContact(db: CrmAdminClient, email: string): Promise<ContactInfo | undefined> {
  const { data } = await db.from("contacts").select("id, consent, unsubscribe_token").ilike("email", email.replace(/[%_\\]/g, "\\$&")).limit(1).maybeSingle();
  if (!data) return undefined;
  const row = data as Row;
  const consent = (row.consent ?? {}) as { marketing?: boolean; marketingAt?: string; unsubscribedAt?: string };
  const unsubscribedAfterOptIn = consent.unsubscribedAt && (!consent.marketingAt || consent.unsubscribedAt >= consent.marketingAt);
  return {
    id: row.id as string,
    unsubscribeToken: typeof row.unsubscribe_token === "string" ? row.unsubscribe_token : undefined,
    marketingOk: consent.marketing === true && !unsubscribedAfterOptIn,
  };
}

async function finish(db: CrmAdminClient, id: string, patch: Row) {
  await db.from("email_messages").update({ ...patch, sending_at: null, updated_at: now() }).eq("id", id);
}

/** Traite un email réservé. */
async function processOne(db: CrmAdminClient, send: EmailSender, msg: Row, categories: Map<string, string>, opts: DispatchOptions): Promise<keyof Omit<DispatchResult, "claimed">> {
  const id = msg.id as string;
  const to = String(msg.to ?? "").trim();
  const related = (msg.related ?? undefined) as EntityRef | undefined;
  const attempts = Number(msg.attempts ?? 1);
  const marketing = categories.get(String(msg.template_id ?? "")) === "nurturing";
  let subject = String(msg.subject ?? "").trim();
  let body = String(msg.body ?? "");

  const contact = to ? await findContact(db, to) : undefined;

  if (marketing && !contact?.marketingOk) {
    const reason = contact ? "Non envoyé : le contact n'a pas (ou plus) consenti aux emails marketing." : "Non envoyé : destinataire inconnu, consentement marketing introuvable.";
    await finish(db, id, { status: "brouillon", error: reason });
    await logActivity(db, "systeme", related, `Email non envoyé (consentement) : « ${subject} »`, { emailId: id });
    return "skipped";
  }

  // Liens personnels complétés à l'envoi.
  const vars: Record<string, string | undefined> = {
    lien_document: body.includes("lien_document") || subject.includes("lien_document") ? await resolveDocumentLink(db, related, opts.baseUrl) : undefined,
    lien_desinscription: contact?.unsubscribeToken ? `${opts.baseUrl}/desinscription/${contact.unsubscribeToken}` : undefined,
  };
  const fill = (t: string) => t.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, k: string) => vars[k] ?? whole);
  subject = fill(subject);
  body = fill(body);

  const unfilled = unfilledVariables(subject, body);
  if (!to || !subject || !body.trim() || unfilled.length) {
    const reason = !to ? "Destinataire manquant." : !subject || !body.trim() ? "Objet ou message vide." : `Variables non remplies : ${unfilled.map((v) => `{{${v}}}`).join(", ")}.`;
    await finish(db, id, { status: "erreur", error: reason });
    await logActivity(db, "systeme", related, `Email non envoyé : « ${subject} » — ${reason}`, { emailId: id });
    return "failed";
  }

  const unsubscribeUrl = marketing ? vars.lien_desinscription : undefined;
  const rendered = renderEmail(body, { unsubscribeUrl });
  const result = await send({
    to,
    subject: subject.replace(/\s+/g, " "),
    text: rendered.text,
    html: rendered.html,
    headers: unsubscribeUrl
      ? { "List-Unsubscribe": `<${unsubscribeUrl.replace("/desinscription/", "/api/unsubscribe/")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
      : undefined,
  });

  if (result.ok) {
    await finish(db, id, { status: "envoye", sent_at: now(), subject, body, error: null, provider_id: result.id ?? null });
    await logActivity(db, "email", related, `Email envoyé : « ${subject} »`, { emailId: id, to });
    if (contact && !(related?.entity === "contacts" && related.id === contact.id)) {
      await logActivity(db, "email", { entity: "contacts", id: contact.id }, `Email envoyé : « ${subject} »`, { emailId: id });
    }
    return "sent";
  }

  if (attempts >= MAX_ATTEMPTS) {
    await finish(db, id, { status: "erreur", error: result.error });
    await logActivity(db, "systeme", related, `Échec d'envoi de l'email « ${subject} » (${attempts} tentatives) : ${result.error}`, { emailId: id, to });
    return "failed";
  }
  const retryAt = new Date(Date.now() + attempts * 5 * 60_000).toISOString();
  await finish(db, id, { status: "programme", scheduled_at: retryAt, error: result.error });
  return "retried";
}

/** Envoie les emails dus, par lots, jusqu'à épuisement ou échéance. */
export async function dispatchDueEmails(db: CrmAdminClient, send: EmailSender, opts: DispatchOptions): Promise<DispatchResult> {
  const result: DispatchResult = { claimed: 0, sent: 0, retried: 0, failed: 0, skipped: 0 };
  const categories = new Map<string, string>();
  const { data: tpls } = await db.from("email_templates").select("id, category");
  for (const t of (tpls ?? []) as Row[]) categories.set(String(t.id), String(t.category));

  while (Date.now() < opts.deadline) {
    const { data, error } = await db.rpc("claim_due_emails", { p_limit: opts.batchSize ?? 10 });
    if (error) throw new Error(`[emails] réservation impossible : ${error.message}`);
    const batch = (data ?? []) as Row[];
    if (!batch.length) break;
    result.claimed += batch.length;
    for (const msg of batch) {
      if (Date.now() >= opts.deadline) {
        // Plus le temps : on libère la réservation, le prochain passage reprendra.
        await db.from("email_messages").update({ sending_at: null, attempts: Math.max(0, Number(msg.attempts ?? 1) - 1) }).eq("id", msg.id as string);
        continue;
      }
      result[await processOne(db, send, msg, categories, opts)] += 1;
    }
  }
  return result;
}
