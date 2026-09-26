import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { ContactsPage } from "@/features/crm/components/contacts/contacts-page";
import { firstParam } from "@/features/crm/lib/params";

export const metadata: Metadata = { title: "Contacts" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const initial = { cycle: firstParam(sp.cycle), source: firstParam(sp.source), tag: firstParam(sp.tag), proprietaire: firstParam(sp.proprietaire) };
  return (
    <Guard section="contacts">
      <ContactsPage key={JSON.stringify(initial)} initial={initial} />
    </Guard>
  );
}
