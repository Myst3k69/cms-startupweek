import { Suspense } from "react";
import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { PageSkeleton } from "@/components/ui";
import { ImprovementPage } from "@/features/qualiopi/components/ImprovementPage";

export const metadata: Metadata = { title: "Amélioration continue — Qualiopi" };

export default function QualiopiImprovementPage() {
  return (
    <Guard section="qualiopi">
      <Suspense fallback={<PageSkeleton />}>
        <ImprovementPage />
      </Suspense>
    </Guard>
  );
}
