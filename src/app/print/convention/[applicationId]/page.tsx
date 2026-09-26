import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { ConventionDoc } from "@/features/documents/components/ConventionDoc";

export const metadata: Metadata = { title: "Convention de formation" };

export default async function ConventionPrintPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  return (
    <Guard section="candidatures">
      <ConventionDoc applicationId={applicationId} />
    </Guard>
  );
}
