import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { PipelinePage } from "@/features/crm/components/pipeline/pipeline-page";
import { firstParam } from "@/features/crm/lib/params";

export const metadata: Metadata = { title: "Pipeline" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const initial = { deal: firstParam(sp.deal), vue: firstParam(sp.vue), type: firstParam(sp.type), proprietaire: firstParam(sp.proprietaire) };
  return (
    <Guard section="pipeline">
      <PipelinePage key={JSON.stringify(initial)} initial={initial} />
    </Guard>
  );
}
