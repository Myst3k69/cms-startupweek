import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { ProgrammeDoc } from "@/features/documents/components/ProgrammeDoc";

export const metadata: Metadata = { title: "Fiche programme" };

export default async function ProgrammePrintPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return (
    <Guard section="sessions">
      <ProgrammeDoc eventId={eventId} />
    </Guard>
  );
}
