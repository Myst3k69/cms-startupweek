import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { QuoteDetail } from "@/features/billing/components/quote-detail";

export const metadata: Metadata = { title: "Devis" };

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Guard section="facturation">
      <QuoteDetail id={id} />
    </Guard>
  );
}
