import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { MarketingPage } from "@/features/marketing/components/marketing-page";
import { firstParam } from "@/features/programmes/lib/url";

export const metadata: Metadata = { title: "Marketing" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <Guard section="marketing">
      <MarketingPage initialTab={firstParam(sp.onglet)} />
    </Guard>
  );
}
