import { Guard } from "@/components/layout/guards";
import { ApplicationDetail } from "@/features/programmes/components/applications/application-detail";

export const metadata = { title: "Candidature" };

export default async function CandidaturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Guard section="candidatures">
      <ApplicationDetail id={id} />
    </Guard>
  );
}
