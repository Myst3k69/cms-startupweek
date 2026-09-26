import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth/redirect";
import { DATA_MODE } from "@/lib/data/supabase";
import { AuthCallback } from "./auth-callback";

export const metadata: Metadata = { title: "Connexion" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

/** Retour du lien magique Supabase : ?code=… (PKCE), ?token_hash=…&type=… ou ?error=…. */
export default async function AuthCallbackPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  // `next` n'est plus transmis par le lien (page mémorisée dans le navigateur) ; accepté s'il est présent.
  const next = typeof sp.next === "string" ? safeNext(sp.next) : undefined;
  if (DATA_MODE !== "supabase") redirect(`/connexion?next=${encodeURIComponent(next ?? "/")}`);
  return (
    <AuthCallback
      next={next}
      params={{
        code: one(sp.code),
        tokenHash: one(sp.token_hash),
        type: one(sp.type),
        error: one(sp.error),
        errorCode: one(sp.error_code),
        errorDescription: one(sp.error_description),
      }}
    />
  );
}
