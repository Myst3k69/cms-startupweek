import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { VenuesPage } from "@/features/programmes/components/venues/venues-page";
import { firstParam } from "@/features/programmes/lib/url";

export const metadata: Metadata = { title: "Lieux" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const lieu = firstParam(sp.lieu);
  return (
    <Guard section="sessions">
      <VenuesPage key={lieu ?? ""} initialId={lieu} />
    </Guard>
  );
}
