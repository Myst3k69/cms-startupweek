import type { Metadata } from "next";
import { RequireSession } from "@/components/layout/guards";
import { PrintShell } from "@/features/documents/components/print-shell";

export const metadata: Metadata = { title: { default: "Document", template: "%s · StartupWeek OS" } };

/**
 * Documents imprimables (A4) : fond blanc, sans AppShell, barre « Imprimer / PDF » masquée à l'impression.
 * Briques réutilisables : @/features/documents/components/print-kit (PrintPage, DocHeader, DocFooter, SignatureBlock…).
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSession>
      <PrintShell>{children}</PrintShell>
    </RequireSession>
  );
}
