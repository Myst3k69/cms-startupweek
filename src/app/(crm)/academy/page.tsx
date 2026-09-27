import { Suspense } from "react";
import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { PageSkeleton } from "@/components/ui";
import { AcademyPage } from "@/features/academy/components/academy-page";

export const metadata: Metadata = { title: "StartupWeek Academy" };

/** Onglets (?onglet=) et direction artistique (?da=) lus côté client sous Suspense. */
export default function Page() {
  return (
    <Guard section="academy">
      <Suspense fallback={<PageSkeleton />}>
        <AcademyPage />
      </Suspense>
    </Guard>
  );
}
