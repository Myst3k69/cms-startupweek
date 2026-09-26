import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { ConvocationDoc } from "@/features/documents/components/ConvocationDoc";

export const metadata: Metadata = { title: "Convocation" };

export default async function ConvocationPrintPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  return (
    <Guard section="candidatures">
      <ConvocationDoc applicationId={applicationId} />
    </Guard>
  );
}
