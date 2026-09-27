/**
 * Désinscription des emails marketing.
 * POST : formulaire de la page /desinscription/<jeton> (redirection vers la confirmation),
 *        ou désabonnement « en un clic » des messageries (RFC 8058, en-tête List-Unsubscribe-Post).
 * GET  : renvoie vers la page de confirmation (aucun changement sur un simple clic de lien,
 *        les antivirus de messagerie ouvrent les liens).
 */
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { UNSUBSCRIBE_TOKEN, unsubscribe } from "@/lib/server/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return Response.redirect(new URL(`/desinscription/${UNSUBSCRIBE_TOKEN.test(token) ? token : "invalide"}`, request.url), 303);
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getSupabaseAdmin();
  if (!db || !UNSUBSCRIBE_TOKEN.test(token)) return new Response("Lien invalide", { status: 404 });
  const form = await request.formData().catch(() => null);
  const fromPage = form?.get("source") === "page";
  try {
    const ok = await unsubscribe(db, token, fromPage ? "lien" : "one-click");
    if (!ok) return new Response("Lien invalide", { status: 404 });
  } catch (e) {
    console.error("[unsubscribe]", e);
    return new Response("Erreur, réessayez plus tard", { status: 500 });
  }
  if (fromPage) return Response.redirect(new URL(`/desinscription/${token}?fait=1`, request.url), 303);
  return new Response("Désinscription enregistrée", { status: 200 });
}
