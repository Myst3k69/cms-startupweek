import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { ExperimentDetail } from "@/features/marketing/components/experiment-detail";

export const metadata: Metadata = { title: "Test A/B" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Guard section="marketing">
      <ExperimentDetail id={id} />
    </Guard>
  );
}
