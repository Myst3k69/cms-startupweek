import { Suspense } from "react";
import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { PageSkeleton } from "@/components/ui";
import { ComplaintsPage } from "@/features/qualiopi/components/ComplaintsPage";

export const metadata: Metadata = { title: "Réclamations — Qualiopi" };

export default function ReclamationsPage() {
  return (
    <Guard section="qualiopi">
      <Suspense fallback={<PageSkeleton />}>
        <ComplaintsPage />
      </Suspense>
    </Guard>
  );
}
