import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { QuoteEditorPage } from "@/features/billing/components/editor/quote-editor";

export const metadata: Metadata = { title: "Modifier le devis" };

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Guard section="facturation">
      <QuoteEditorPage quoteId={id} />
    </Guard>
  );
}
