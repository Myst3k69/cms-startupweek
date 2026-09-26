import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { OrganisationsPage } from "@/features/crm/components/organisations/organisations-page";
import { firstParam } from "@/features/crm/lib/params";

export const metadata: Metadata = { title: "Organisations" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const initial = { type: firstParam(sp.type), statut: firstParam(sp.statut) };
  return (
    <Guard section="organisations">
      <OrganisationsPage key={JSON.stringify(initial)} initial={initial} />
    </Guard>
  );
}
