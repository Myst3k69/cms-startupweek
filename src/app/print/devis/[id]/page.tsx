import type { Metadata } from "next";
import { QuotePrintView } from "@/features/billing/components/print/print-views";

export const metadata: Metadata = { title: "Devis" };

export default async function PrintQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuotePrintView id={id} />;
}
