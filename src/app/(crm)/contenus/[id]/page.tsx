import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { ContentEditor } from "@/features/site/components/content-editor";

export const metadata: Metadata = { title: "Éditeur de contenu" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Guard section="contenus">
      <ContentEditor id={id} />
    </Guard>
  );
}
