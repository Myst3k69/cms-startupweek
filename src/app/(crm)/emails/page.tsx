import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { EmailsPage } from "@/features/crm/components/emails/emails-page";
import { firstParam } from "@/features/crm/lib/params";

export const metadata: Metadata = { title: "Emails" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const initial = { onglet: firstParam(sp.onglet), id: firstParam(sp.id) };
  return (
    <Guard section="emails">
      <EmailsPage key={JSON.stringify(initial)} initial={initial} />
    </Guard>
  );
}
