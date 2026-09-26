import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { AttestationDoc } from "@/features/documents/components/AttestationDoc";

export const metadata: Metadata = { title: "Certificat de réalisation" };

export default async function AttestationPrintPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  return (
    <Guard section="candidatures">
      <AttestationDoc applicationId={applicationId} />
    </Guard>
  );
}
