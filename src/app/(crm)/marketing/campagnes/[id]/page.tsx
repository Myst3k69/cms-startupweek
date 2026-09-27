import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { CampaignDetail } from "@/features/marketing/components/campaign-detail";

export const metadata: Metadata = { title: "Campagne" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Guard section="marketing">
      <CampaignDetail id={id} />
    </Guard>
  );
}
