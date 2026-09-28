"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { getSupabase } from "@/lib/data/supabase";
import { remoteSync } from "@/lib/data/sync";
import { useCrm } from "@/lib/store";

interface SyncResponse {
  ok: boolean;
  dryRun?: boolean;
  configured?: { supabase: boolean; meta: boolean; linkedin: boolean };
  error?: string;
  results?: Record<string, { ok: boolean; campaigns?: number; created?: number; stats?: number; skipped?: string | number; message?: string }>;
}

const PLATFORM_NAME: Record<string, string> = { meta: "Meta", linkedin: "LinkedIn" };

/**
 * Lance /api/ads/sync avec la session du membre connecté, puis recharge campagnes,
 * tests et statistiques depuis la base. En démo : l'API répond en dry-run.
 */
export function SyncButton({ size = "md" }: { size?: "sm" | "md" }) {
  const toast = useToast();
  const replaceMarketing = useCrm((s) => s.replaceMarketing);
  const [busy, setBusy] = React.useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const headers: Record<string, string> = {};
      const session = (await getSupabase()?.auth.getSession())?.data.session;
      if (session) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch("/api/ads/sync", { method: "POST", headers, cache: "no-store" });
      const body = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as SyncResponse;

      if (body.dryRun) {
        const c = body.configured;
        toast({
          title: "Synchro non disponible",
          description: !c?.supabase
            ? "Mode démo : les chiffres affichés sont fictifs. En production, la synchro lit Meta Ads et LinkedIn Ads."
            : "Aucune régie configurée : renseignez META_ADS_ACCESS_TOKEN / LINKEDIN_ADS_ACCESS_TOKEN (Paramètres → Intégrations).",
          tone: "info",
        });
        return;
      }
      if (res.status === 401 || res.status === 403) {
        toast({ title: "Synchro refusée", description: "Votre compte n'a pas le droit d'écriture sur la section Marketing.", tone: "danger" });
        return;
      }

      const parts = Object.entries(body.results ?? {}).map(([p, r]) =>
        r.ok ? (typeof r.skipped === "string" ? `${PLATFORM_NAME[p]} : ${r.skipped}` : `${PLATFORM_NAME[p]} : ${r.campaigns ?? 0} campagnes, ${r.stats ?? 0} lignes`) : `${PLATFORM_NAME[p]} : échec (${r.message ?? "erreur"})`,
      );
      const fresh = await remoteSync.loadMarketing();
      if (fresh) replaceMarketing(fresh);
      toast({ title: body.ok ? "Régies synchronisées" : "Synchro partielle", description: parts.join(" · ") || undefined, tone: body.ok ? "success" : "danger" });
    } catch (e) {
      toast({ title: "Synchro impossible", description: e instanceof Error ? e.message : "Réseau indisponible", tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="secondary" size={size} onClick={run} loading={busy}>
      <RefreshCw /> Synchroniser les régies
    </Button>
  );
}
