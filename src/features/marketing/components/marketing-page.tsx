"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, FlaskConical, LayoutDashboard, Link2, Megaphone, Plus, Users } from "lucide-react";
import { Button, PageHeader, Tabs } from "@/components/ui";
import { useCollection, useNow, useSession } from "@/lib/hooks";
import { replaceQuery } from "@/features/programmes/lib/url";
import type { AdCampaign } from "@/lib/domain/types";
import { CampaignFormModal } from "./campaign-form-modal";
import { CampaignsTab } from "./campaigns-tab";
import { ExperimentsTab } from "./experiments-tab";
import { OverviewTab } from "./overview-tab";
import { PromotionTab } from "./promotion-tab";
import { AudiencesTab } from "./audiences-tab";
import { UtmTab } from "./utm-tab";
import { SyncButton } from "./sync-button";
import { useMarketingData } from "./use-marketing-data";
import { promotionPlan } from "../lib/metrics";

type Tab = "vue" | "campagnes" | "tests" | "promotion" | "audiences" | "utm";
const TABS: Tab[] = ["vue", "campagnes", "tests", "promotion", "audiences", "utm"];

export function MarketingPage({ initialTab }: { initialTab?: string }) {
  const router = useRouter();
  const now = useNow();
  const { canEdit } = useSession();
  const editable = canEdit("marketing");
  const data = useMarketingData();
  const events = useCollection("events");
  const contents = useCollection("contents");
  const [tab, setTab] = React.useState<Tab>(TABS.includes(initialTab as Tab) ? (initialTab as Tab) : "vue");
  const [creating, setCreating] = React.useState<{ preset?: Partial<AdCampaign> } | null>(null);

  const plan = React.useMemo(
    () => promotionPlan({ events, applications: data.applications, campaigns: data.campaigns, contents, statsByCampaign: data.byCampaign }, now),
    [events, data.applications, data.campaigns, contents, data.byCampaign, now],
  );
  const running = data.experiments.filter((e) => e.status === "en_cours").length;
  const atRisk = plan.filter((p) => p.risk === "critique" || p.risk === "a_surveiller").length;

  const go = (t: Tab) => {
    setTab(t);
    replaceQuery({ onglet: t === "vue" ? null : t });
  };
  const newCampaign = (preset?: Partial<AdCampaign>) => setCreating({ preset });

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow="Acquisition"
        title="Marketing"
        description="Campagnes Meta et LinkedIn, A/B tests (créas, pages du site, emails) et plan de promotion des sessions — les chiffres des régies rapprochés des candidatures, inscriptions et factures du CRM."
        actions={
          editable ? (
            <>
              <SyncButton />
              <Button onClick={() => newCampaign()}>
                <Plus /> Nouvelle campagne
              </Button>
            </>
          ) : null
        }
      >
        <Tabs<Tab>
          value={tab}
          onChange={go}
          tabs={[
            { value: "vue", label: "Vue d'ensemble", icon: LayoutDashboard },
            { value: "campagnes", label: "Campagnes", icon: Megaphone, count: data.campaigns.length },
            { value: "tests", label: "A/B tests", icon: FlaskConical, count: running },
            { value: "promotion", label: "Promotion des sessions", icon: CalendarClock, count: atRisk },
            { value: "audiences", label: "Audiences", icon: Users },
            { value: "utm", label: "Liens UTM", icon: Link2 },
          ]}
        />
      </PageHeader>

      {tab === "vue" ? (
        <OverviewTab data={data} now={now} onOpenTab={go} />
      ) : tab === "campagnes" ? (
        <CampaignsTab data={data} onOpen={(c) => router.push(`/marketing/campagnes/${c.id}`)} />
      ) : tab === "tests" ? (
        <ExperimentsTab data={data} editable={editable} />
      ) : tab === "promotion" ? (
        <PromotionTab plan={plan} editable={editable} onCreateCampaign={(eventId) => newCampaign({ eventId, objective: "conversions" })} />
      ) : tab === "audiences" ? (
        <AudiencesTab now={now} />
      ) : (
        <UtmTab campaigns={data.campaigns} />
      )}

      {creating ? (
        <CampaignFormModal
          open
          preset={creating.preset}
          onClose={() => setCreating(null)}
          onSaved={(c) => router.push(`/marketing/campagnes/${c.id}`)}
        />
      ) : null}
    </div>
  );
}
