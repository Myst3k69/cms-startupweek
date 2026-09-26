import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { InvoiceEditorPage } from "@/features/billing/components/editor/invoice-editor";

export const metadata: Metadata = { title: "Modifier le brouillon" };

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Guard section="facturation">
      <InvoiceEditorPage invoiceId={id} />
    </Guard>
  );
}
