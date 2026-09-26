import { Suspense } from "react";
import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { PageSkeleton } from "@/components/ui";
import { WatchPage } from "@/features/qualiopi/components/WatchPage";

export const metadata: Metadata = { title: "Veille — Qualiopi" };

export default function QualiopiWatchPage() {
  return (
    <Guard section="qualiopi">
      <Suspense fallback={<PageSkeleton />}>
        <WatchPage />
      </Suspense>
    </Guard>
  );
}
