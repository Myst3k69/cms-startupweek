import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { EnrollmentDetail } from "@/features/academy/components/enrollment-detail";

export const metadata: Metadata = { title: "Apprenant · Academy" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Guard section="academy">
      <EnrollmentDetail id={id} />
    </Guard>
  );
}
