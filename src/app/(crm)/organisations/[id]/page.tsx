import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { OrganisationDetail } from "@/features/crm/components/organisations/organisation-detail";

export const metadata: Metadata = { title: "Fiche organisation" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Guard section="organisations">
      <OrganisationDetail key={id} id={decodeURIComponent(id)} />
    </Guard>
  );
}
