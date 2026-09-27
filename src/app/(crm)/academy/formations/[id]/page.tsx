import { Suspense } from "react";
import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { PageSkeleton } from "@/components/ui";
import { CourseEditor } from "@/features/academy/components/course-editor";

export const metadata: Metadata = { title: "Formation · Academy" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Guard section="academy">
      <Suspense fallback={<PageSkeleton />}>
        <CourseEditor id={id} />
      </Suspense>
    </Guard>
  );
}
