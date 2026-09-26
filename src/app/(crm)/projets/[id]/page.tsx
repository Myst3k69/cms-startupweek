import { Guard } from "@/components/layout/guards";
import { ProjectDetail } from "@/features/programmes/components/projects/project-detail";

export const metadata = { title: "Projet" };

export default async function ProjetRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Guard section="projets">
      <ProjectDetail id={id} />
    </Guard>
  );
}
