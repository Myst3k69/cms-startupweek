import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { RelancesPage } from "@/features/crm/components/relances/relances-page";
import { firstParam } from "@/features/crm/lib/params";

export const metadata: Metadata = { title: "Relances & tâches" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const initial = { onglet: firstParam(sp.onglet), vue: firstParam(sp.vue), qui: firstParam(sp.qui) };
  return (
    <Guard section="relances">
      <RelancesPage key={JSON.stringify(initial)} initial={initial} />
    </Guard>
  );
}
