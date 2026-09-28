import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { LivretDoc } from "@/features/documents/components/LivretDoc";

export const metadata: Metadata = { title: "Livret d'accueil" };

export default async function LivretPrintPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return (
    <Guard section="sessions">
      <LivretDoc eventId={eventId} />
    </Guard>
  );
}
