import { Suspense } from "react";
import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { PageSkeleton } from "@/components/ui";
import { CoursePreview } from "@/features/academy/components/course-preview";

export const metadata: Metadata = { title: "Aperçu apprenant · Academy" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Guard section="academy">
      <Suspense fallback={<PageSkeleton />}>
        <CoursePreview id={id} />
      </Suspense>
    </Guard>
  );
}
