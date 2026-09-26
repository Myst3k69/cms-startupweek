import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { DemandesPage } from "@/features/crm/components/demandes/demandes-page";
import { firstParam } from "@/features/crm/lib/params";

export const metadata: Metadata = { title: "Demandes entrantes" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const initial = { type: firstParam(sp.type), statut: firstParam(sp.statut), assigne: firstParam(sp.assigne), sla: firstParam(sp.sla), id: firstParam(sp.id) };
  return (
    <Guard section="demandes">
      <DemandesPage key={JSON.stringify(initial)} initial={initial} />
    </Guard>
  );
}
