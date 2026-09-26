import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { AutomationsPage } from "@/features/system/components/automations-page";

export const metadata: Metadata = { title: "Automatisations" };

export default function Page() {
  return (
    <Guard section="automatisations">
      <AutomationsPage />
    </Guard>
  );
}
