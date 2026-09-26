import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { QualiopiDashboard } from "@/features/qualiopi/components/QualiopiDashboard";

export const metadata: Metadata = { title: "Qualiopi — préparation à l'audit" };

export default function QualiopiPage() {
  return (
    <Guard section="qualiopi">
      <QualiopiDashboard />
    </Guard>
  );
}
