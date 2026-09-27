/**
 * POST /api/emails/dispatch — envoie les emails dus de la file crm.email_messages.
 *
 * Appelée par la base (pg_net) : trigger à l'insertion d'un email à envoyer, et
 * planificateur (chaque minute) pour les envois programmés et les nouveaux essais.
 * Sécurité : `Authorization: Bearer <EMAIL_DISPATCH_SECRET>` — le même secret est
 * rangé dans Supabase Vault (`crm_email_dispatch_secret`, docs/SUPABASE.md § 5 quater).
 * Sans fournisseur d'email configuré : 503, les emails restent en file.
 */
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { createMailSender } from "@/lib/server/mailer";
import { dispatchDueEmails } from "@/lib/server/email-dispatch";
import { verifyBearer } from "@/lib/server/security";
import { publicBaseUrl } from "@/lib/server/public-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.EMAIL_DISPATCH_SECRET;
  if (!secret) return Response.json({ ok: false, error: "EMAIL_DISPATCH_SECRET_REQUIRED" }, { status: 503 });
  if (!verifyBearer(request.headers.get("authorization"), secret)) {
    return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const db = getSupabaseAdmin();
  if (!db) return Response.json({ ok: false, error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  const send = createMailSender();
  if (!send) return Response.json({ ok: false, error: "EMAIL_NOT_CONFIGURED" }, { status: 503 });

  try {
    const result = await dispatchDueEmails(db, send, { baseUrl: publicBaseUrl(request), deadline: Date.now() + 45_000 });
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("[emails/dispatch]", e);
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
