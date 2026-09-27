"use client";

import * as React from "react";
import { useCollection } from "@/lib/hooks";
import { useCrm } from "@/lib/store";
import type { AdStatDay } from "@/lib/domain/types";
import { attributionIndex, campaignPerf, campaignWindow, statsByCampaign, type CampaignPerf } from "../lib/metrics";

/**
 * Données dérivées partagées par les écrans Marketing : statistiques par campagne,
 * attribution CRM (utm_campaign) et performance complète de chaque campagne (tout l'historique).
 */
export function useMarketingData() {
  const campaigns = useCollection("adCampaigns");
  const experiments = useCollection("experiments");
  const adStats = useCrm((s) => s.adStats);
  const applications = useCollection("applications");
  const submissions = useCollection("submissions");
  const invoices = useCollection("invoices");

  const byCampaign = React.useMemo(() => statsByCampaign(adStats), [adStats]);
  const attribute = React.useMemo(() => attributionIndex({ applications, submissions, invoices }), [applications, submissions, invoices]);
  const perf = React.useMemo(() => {
    const m = new Map<string, CampaignPerf>();
    for (const c of campaigns) m.set(c.id, campaignPerf(c, byCampaign.get(c.id) ?? EMPTY, attribute(c.utmCampaign, campaignWindow(c))));
    return m;
  }, [campaigns, byCampaign, attribute]);

  return { campaigns, experiments, adStats, byCampaign, attribute, perf, applications, submissions, invoices };
}

const EMPTY: AdStatDay[] = [];

export type MarketingData = ReturnType<typeof useMarketingData>;
