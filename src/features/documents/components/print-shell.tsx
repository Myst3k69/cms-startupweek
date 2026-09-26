"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * Enveloppe des documents imprimables : force le thème clair (papier blanc), barre d'outils
 * « Imprimer / PDF » masquée à l'impression, format A4 par défaut (voir PrintPage pour le paysage).
 */
export function PrintShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  React.useEffect(() => {
    const html = document.documentElement;
    const prev = html.dataset.theme;
    html.dataset.theme = "light";
    return () => {
      if (prev) html.dataset.theme = prev;
    };
  }, []);

  return (
    <div className="print-root min-h-dvh bg-surface-3 text-foreground print:bg-transparent">
      <style>{`
        @page { size: A4; margin: 12mm 12mm 14mm; }
        @media print {
          html, body { background: var(--surface) !important; }
          .print-root { min-height: 0 !important; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>
      <div className="no-print sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[297mm] items-center justify-between gap-3 px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push("/qualiopi");
            }}
          >
            <ArrowLeft /> Retour
          </Button>
          <p className="hidden text-xs text-muted-foreground sm:block">Aperçu A4 — brouillon généré depuis StartupWeek OS</p>
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> Imprimer / PDF
          </Button>
        </div>
      </div>
      <main className="px-2 py-6 sm:px-6 print:p-0">{children}</main>
    </div>
  );
}
