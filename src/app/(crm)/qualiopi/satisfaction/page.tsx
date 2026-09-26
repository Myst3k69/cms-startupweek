import { Suspense } from "react";
import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { PageSkeleton } from "@/components/ui";
import { SatisfactionPage } from "@/features/qualiopi/components/SatisfactionPage";

export const metadata: Metadata = { title: "Satisfaction — Qualiopi" };

export default function QualiopiSatisfactionPage() {
  return (
    <Guard section="qualiopi">
      <Suspense fallback={<PageSkeleton />}>
        <SatisfactionPage />
      </Suspense>
    </Guard>
  );
}
