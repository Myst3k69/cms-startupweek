import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { EnrollmentRecordDoc } from "@/features/academy/components/print/enrollment-record";

export const metadata: Metadata = { title: "Certificat de réalisation et relevé de connexions" };

export default async function Page({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const { enrollmentId } = await params;
  return (
    <Guard section="academy">
      <EnrollmentRecordDoc enrollmentId={enrollmentId} />
    </Guard>
  );
}
