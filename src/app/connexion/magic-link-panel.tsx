"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MailCheck, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button, FormField, Input, Skeleton } from "@/components/ui";
import { useHydrated, useSession } from "@/lib/hooks";
import { useCrm } from "@/lib/store";
import { requestMagicLink } from "@/lib/auth/supabase-auth";

const RESEND_DELAY = 60;

type State = { status: "idle" | "sending" } | { status: "sent"; email: string } | { status: "error"; message: string };

/** Mode supabase : connexion de l'équipe par lien magique (aucun mot de passe). */
export function MagicLinkPanel({ next }: { next: string }) {
  const hydrated = useHydrated();
  const { user } = useSession();
  const notice = useCrm((s) => s.authNotice);
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<State>({ status: "idle" });
  const [cooldown, setCooldown] = React.useState(0);

  // Session déjà ouverte dans ce navigateur : direction la page demandée.
  React.useEffect(() => {
    if (hydrated && user) router.replace(next);
  }, [hydrated, user, next, router]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const send = async (address: string) => {
    setState({ status: "sending" });
    const res = await requestMagicLink(address, next);
    if (res.ok) {
      setState({ status: "sent", email: res.email });
      setCooldown(RESEND_DELAY);
    } else {
      setState({ status: "error", message: res.message });
    }
  };

  if (!hydrated || user) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Vérification de la session">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Connexion</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Entrez votre adresse email professionnelle : vous recevrez un lien de connexion à usage unique. Aucun mot de passe.
      </p>

      {notice ? (
        <p role="alert" className="mt-5 flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-text">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      ) : null}

      {state.status === "sent" ? (
        <div className="mt-6 space-y-4">
          <div role="status" className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-success-soft text-success-text">
              <MailCheck className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-medium text-foreground">Vérifiez votre boîte mail</p>
              <p className="mt-1 text-muted-foreground">
                Si <span className="font-medium text-foreground break-all">{state.email}</span> est l'adresse d'un membre de l'équipe, un lien de connexion vient d'y être envoyé.
                Ouvrez-le <span className="font-medium text-foreground">dans ce navigateur</span>. Rien reçu d'ici 2 minutes ? Vérifiez l'adresse et le dossier des indésirables.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void send(state.email)} disabled={cooldown > 0}>
              {cooldown > 0 ? `Renvoyer le lien (${cooldown} s)` : "Renvoyer le lien"}
            </Button>
            <Button variant="ghost" onClick={() => setState({ status: "idle" })}>
              Changer d'adresse
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="mt-6 space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void send(email);
          }}
        >
          <FormField label="Email professionnel" htmlFor="login-email" error={state.status === "error" ? state.message : undefined}>
            <Input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="prenom@startupweek.tech"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={state.status === "error" || undefined}
            />
          </FormField>
          <Button type="submit" size="lg" className="w-full" loading={state.status === "sending"} disabled={!email.trim()}>
            Recevoir le lien de connexion
          </Button>
        </form>
      )}

      <p className="mt-6 flex items-center gap-2 text-xs text-faint">
        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" /> Accès réservé à l'équipe StartupWeek. Les droits de votre rôle s'appliquent directement en base (RLS).
      </p>
    </div>
  );
}
