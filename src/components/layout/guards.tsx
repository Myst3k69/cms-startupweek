"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useHydrated, useSession } from "@/lib/hooks";
import { EmptyState, PageSkeleton, Skeleton } from "@/components/ui";
import type { Section } from "@/lib/auth/permissions";
import { ROLES, labelOf } from "@/lib/domain/constants";

/** Exige une session (démo : profil choisi sur /connexion ; prod : Supabase Auth). */
export function RequireSession({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const { user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  React.useEffect(() => {
    if (hydrated && !user) router.replace(`/connexion?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, user, router, pathname]);
  if (!hydrated || !user) {
    return (
      <div className="flex min-h-dvh">
        <div className="hidden w-[var(--sidebar-width)] border-r border-border bg-surface p-4 lg:block">
          <Skeleton className="mb-6 h-8 w-40" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-6" />
          ))}
        </div>
        <div className="flex-1 p-6 lg:p-8">
          <PageSkeleton />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

/** Garde de section selon la matrice de droits (lecture minimale requise). */
export function Guard({ section, children }: { section: Section; children: React.ReactNode }) {
  const { can, role } = useSession();
  if (!can(section)) {
    return (
      <EmptyState
        icon={Lock}
        title="Accès restreint"
        description={`Votre rôle (${labelOf(ROLES, role)}) ne donne pas accès à cette section. Demandez l'accès à un administrateur.`}
        className="mt-10"
      />
    );
  }
  return <>{children}</>;
}
