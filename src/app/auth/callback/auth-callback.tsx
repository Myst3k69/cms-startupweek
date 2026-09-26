"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { completeSignIn, takeStoredNext, type CallbackParams } from "@/lib/auth/supabase-auth";
import { useCrm } from "@/lib/store";
import { openWorkspace } from "@/lib/store/remote-session";

/** Paramètres d'erreur que Supabase place parfois dans le fragment (#error=…) plutôt que dans la requête. */
function hashErrors(): Partial<CallbackParams> {
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    error: h.get("error") ?? undefined,
    errorCode: h.get("error_code") ?? undefined,
    errorDescription: h.get("error_description") ?? undefined,
  };
}

export function AuthCallback({ next: nextFromQuery, params }: { next?: string; params: CallbackParams }) {
  const router = useRouter();
  const [next, setNext] = React.useState(nextFromQuery ?? "/");
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState("Vérification du lien…");
  const ran = React.useRef(false);

  React.useEffect(() => {
    // Un code d'autorisation ne s'échange qu'une fois (double exécution des effets en dev).
    if (ran.current) return;
    ran.current = true;
    const target = nextFromQuery ?? takeStoredNext() ?? "/";
    setNext(target);
    void (async () => {
      const fail = (message: string) => {
        // Débloque /connexion (le démarrage automatique de session est sauté sur cette page).
        useCrm.getState().clearRemote();
        setError(message);
      };
      const fromHash = hashErrors();
      const signIn = await completeSignIn({ ...params, ...(fromHash.error || fromHash.errorCode ? fromHash : {}) });
      if (!signIn.ok) return fail(signIn.message);
      setStep("Chargement de vos données…");
      const ws = await openWorkspace();
      if (!ws.ok) return fail(ws.message);
      router.replace(target);
    })();
  }, [params, nextFromQuery, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-border">
            <Image src="/logo-sw-v4.webp" alt="" width={34} height={34} priority />
          </span>
          <span className="font-display text-lg font-semibold">StartupWeek OS</span>
        </div>
        {error ? (
          <div className="mt-6">
            <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
            <LinkButton href={`/connexion?next=${encodeURIComponent(next)}`} className="mt-4 w-full">
              Demander un nouveau lien
            </LinkButton>
          </div>
        ) : (
          <p role="status" className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {step}
          </p>
        )}
      </div>
    </main>
  );
}
