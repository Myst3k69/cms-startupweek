import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { ContactDetail } from "@/features/crm/components/contacts/contact-detail";
import { firstParam } from "@/features/crm/lib/params";

export const metadata: Metadata = { title: "Fiche contact" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = firstParam(sp.onglet);
  return (
    <Guard section="contacts">
      <ContactDetail key={`${id}:${tab ?? ""}`} id={decodeURIComponent(id)} initialTab={tab} />
    </Guard>
  );
}
