import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { QuoteEditorPage } from "@/features/billing/components/editor/quote-editor";

export const metadata: Metadata = { title: "Nouveau devis" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

/** Préremplissage : ?organisation=…&contact=…&opportunite=…&session=… */
export default async function NewQuotePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return (
    <Guard section="facturation">
      <QuoteEditorPage prefill={{ orgId: one(sp.organisation), contactId: one(sp.contact), dealId: one(sp.opportunite) ?? one(sp.deal), eventId: one(sp.session) }} />
    </Guard>
  );
}
