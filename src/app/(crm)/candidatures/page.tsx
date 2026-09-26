import { Guard } from "@/components/layout/guards";
import { ApplicationsPage } from "@/features/programmes/components/applications/applications-page";
import { firstParam } from "@/features/programmes/lib/url";

export const metadata = { title: "Candidatures" };

export default async function CandidaturesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <Guard section="candidatures">
      <ApplicationsPage
        initialView={firstParam(sp.vue)}
        initialSession={firstParam(sp.session)}
        initialPersona={firstParam(sp.persona)}
        initialFunding={firstParam(sp.financement)}
        initialReviewer={firstParam(sp.assigne)}
      />
    </Guard>
  );
}
