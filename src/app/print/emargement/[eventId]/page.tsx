import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { EmargementDoc } from "@/features/documents/components/EmargementDoc";

export const metadata: Metadata = { title: "Feuille d'émargement" };

export default async function EmargementPrintPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return (
    <Guard section="sessions">
      <EmargementDoc eventId={eventId} />
    </Guard>
  );
}
