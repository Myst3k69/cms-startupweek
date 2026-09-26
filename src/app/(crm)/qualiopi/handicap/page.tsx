import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { DisabilityPage } from "@/features/qualiopi/components/DisabilityPage";

export const metadata: Metadata = { title: "Handicap — Qualiopi" };

export default function QualiopiDisabilityPage() {
  return (
    <Guard section="qualiopi">
      <DisabilityPage />
    </Guard>
  );
}
