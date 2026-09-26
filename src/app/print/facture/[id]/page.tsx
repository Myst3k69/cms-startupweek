import type { Metadata } from "next";
import { InvoicePrintView } from "@/features/billing/components/print/print-views";

export const metadata: Metadata = { title: "Facture" };

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoicePrintView id={id} />;
}
