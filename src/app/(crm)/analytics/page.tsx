import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { AnalyticsPage } from "@/features/analytics/components/analytics-page";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return (
    <Guard section="analytics">
      <AnalyticsPage />
    </Guard>
  );
}
