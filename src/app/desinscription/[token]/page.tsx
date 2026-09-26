import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { findUnsubscribeTarget } from "@/lib/server/unsubscribe";

/** Désinscription des emails marketing (lien en pied des emails concernés). */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Désinscription — StartupWeek" }, robots: { index: false, follow: false } };

export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ fait?: string }> }) {
  const { token } = await params;
  const { fait } = await searchParams;
  const db = getSupabaseAdmin();
  const target = db ? await findUnsubscribeTarget(db, token) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-3 px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="font-display text-lg font-semibold text-foreground">StartupWeek</p>
        {!target ? (
          <>
            <h1 className="mt-4 text-base font-semibold text-foreground">Lien invalide</h1>
            <p className="mt-2 text-sm text-muted-foreground">Ce lien de désinscription n&apos;est pas (ou plus) valide. Écrivez-nous à contact@startupweek.tech : nous vous retirons de nos envois.</p>
          </>
        ) : fait || target.alreadyUnsubscribed ? (
          <>
            <h1 className="mt-4 text-base font-semibold text-foreground">Vous êtes désinscrit(e)</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              L&apos;adresse {target.maskedEmail} ne recevra plus nos emails d&apos;information. Vous continuerez à recevoir les emails liés à vos démarches (candidature, facture, convocation…).
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-base font-semibold text-foreground">Se désinscrire des emails d&apos;information</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Confirmez que l&apos;adresse {target.maskedEmail} ne doit plus recevoir nos emails d&apos;information (ressources, programmes StartupWeek).
            </p>
            <form method="post" action={`/api/unsubscribe/${token}`} className="mt-5">
              <input type="hidden" name="source" value="page" />
              <button type="submit" className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                Me désinscrire
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
