import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { InvoiceDetail } from "@/features/billing/components/invoice-detail";

export const metadata: Metadata = { title: "Facture" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Guard section="facturation">
      <InvoiceDetail id={id} />
    </Guard>
  );
}
