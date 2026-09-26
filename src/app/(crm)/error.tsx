"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui";

export default function CrmError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-danger/30 bg-danger-soft p-6 text-center">
      <TriangleAlert className="mx-auto size-6 text-danger" />
      <h2 className="mt-3 text-base font-semibold text-foreground">Une erreur est survenue</h2>
      <p className="mt-1 text-sm text-muted-foreground">{error.message || "Erreur inattendue."}</p>
      <Button className="mt-4" variant="secondary" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}
