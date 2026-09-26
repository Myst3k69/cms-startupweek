import { Guard } from "@/components/layout/guards";
import { ProjectsPage } from "@/features/programmes/components/projects/projects-page";
import { firstParam } from "@/features/programmes/lib/url";

export const metadata = { title: "Projets candidats" };

export default async function ProjetsRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <Guard section="projets">
      <ProjectsPage initialView={firstParam(sp.vue)} initialSession={firstParam(sp.session)} />
    </Guard>
  );
}
