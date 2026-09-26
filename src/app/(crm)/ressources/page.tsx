import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { ResourcesPage } from "@/features/site/components/resources-page";

export const metadata: Metadata = { title: "Ressources" };

export default function Page() {
  return (
    <Guard section="ressources">
      <ResourcesPage />
    </Guard>
  );
}
