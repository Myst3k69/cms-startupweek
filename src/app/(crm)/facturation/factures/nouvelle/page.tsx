import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { InvoiceEditorPage } from "@/features/billing/components/editor/invoice-editor";

export const metadata: Metadata = { title: "Nouvelle facture" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

/** Préremplissage : ?contact=…&organisation=…&candidature=…&session=…&type=acompte|solde|facture */
export default async function NewInvoicePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return (
    <Guard section="facturation">
      <InvoiceEditorPage
        prefill={{ contactId: one(sp.contact), orgId: one(sp.organisation), applicationId: one(sp.candidature), eventId: one(sp.session), kind: one(sp.type) }}
      />
    </Guard>
  );
}
