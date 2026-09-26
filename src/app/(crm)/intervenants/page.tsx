import { Guard } from "@/components/layout/guards";
import { SpeakersPage } from "@/features/programmes/components/speakers/speakers-page";
import { firstParam } from "@/features/programmes/lib/url";

export const metadata = { title: "Intervenants" };

export default async function IntervenantsRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <Guard section="intervenants">
      <SpeakersPage initialView={firstParam(sp.vue)} initialId={firstParam(sp.id)} />
    </Guard>
  );
}
