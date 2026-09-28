import { Suspense } from "react";
import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { PageSkeleton } from "@/components/ui";
import { StudioCourse } from "@/features/studio/components/studio-course";

export const metadata: Metadata = { title: "Formation · Studio" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Guard section="academy">
      <Suspense fallback={<PageSkeleton />}>
        <StudioCourse id={id} />
      </Suspense>
    </Guard>
  );
}
