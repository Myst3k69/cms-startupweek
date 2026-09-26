import { Suspense } from "react";
import type { Metadata } from "next";
import { Guard } from "@/components/layout/guards";
import { PageSkeleton } from "@/components/ui";
import { BillingPage } from "@/features/billing/components/billing-page";

export const metadata: Metadata = { title: "Facturation" };

/** Onglets et filtres pilotés par la query string (?onglet=…&statut=…), lue côté client sous Suspense. */
export default function FacturationPage() {
  return (
    <Guard section="facturation">
      <Suspense fallback={<PageSkeleton />}>
        <BillingPage />
      </Suspense>
    </Guard>
  );
}
