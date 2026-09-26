"use client";

import * as React from "react";
import { Activity, CircleAlert, Code2, FlaskConical, Map as MapIcon, ScrollText, Workflow, Zap } from "lucide-react";
import { PageHeader, StatCard, Tabs } from "@/components/ui";
import { useCollection } from "@/lib/hooks";
import { useCrm } from "@/lib/store";
import { compactNumber, number } from "@/lib/format";
import { N8N_WORKFLOWS } from "../lib/n8n";
import { EndpointsTab } from "./endpoints-tab";
import { JournalTab } from "./journal-tab";
import { MigrationTab } from "./migration-tab";
import { RulesTab } from "./rules-tab";
import { TesterTab } from "./tester-tab";

type Tab = "regles" | "migration" | "endpoints" | "testeur" | "journal";

export function AutomationsPage() {
  const rules = useCollection("automations");
  const activities = useCrm((s) => s.activities);
  const [tab, setTab] = React.useState<Tab>("regles");

  const stats = React.useMemo(() => {
    const active = rules.filter((r) => r.active).length;
    const runs = rules.reduce((s, r) => s + r.runs, 0);
    const errors = rules.reduce((s, r) => s + r.errors, 0);
    const failing = rules.filter((r) => r.errors > 0).length;
    const system = activities.filter((a) => !a.actorId).length;
    const replaced = N8N_WORKFLOWS.filter((w) => w.status !== "hors_perimetre").length;
    return { active, runs, errors, failing, system, replaced };
  }, [rules, activities]);

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Site & système"
        title="Automatisations"
        description="Règles métier du CRM, points d'entrée du site et suivi de la migration depuis les 13 workflows n8n (webhooks non signés, polling Airtable)."
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Règles actives" value={`${stats.active} / ${rules.length}`} hint="accusés, relances, convocations, factures…" icon={Zap} />
        <StatCard label="Exécutions" value={compactNumber(stats.runs)} hint={`${number(stats.system)} actions automatiques journalisées`} icon={Activity} />
        <StatCard
          label="Erreurs"
          value={number(stats.errors)}
          hint={stats.failing ? `${stats.failing} règle${stats.failing > 1 ? "s" : ""} à vérifier` : "Aucune règle en échec"}
          icon={CircleAlert}
        />
        <StatCard label="Workflows n8n couverts" value={`${stats.replaced} / ${N8N_WORKFLOWS.length}`} hint="≈ 4 300 appels Airtable / jour supprimés" icon={Workflow} />
      </div>

      <Tabs<Tab>
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "regles", label: "Règles", icon: Zap, count: rules.length },
          { value: "migration", label: "Migration n8n", icon: MapIcon, count: N8N_WORKFLOWS.length },
          { value: "endpoints", label: "Endpoints", icon: Code2 },
          { value: "testeur", label: "Testeur", icon: FlaskConical },
          { value: "journal", label: "Journal", icon: ScrollText },
        ]}
      />

      {tab === "regles" ? <RulesTab /> : tab === "migration" ? <MigrationTab /> : tab === "endpoints" ? <EndpointsTab /> : tab === "testeur" ? <TesterTab /> : <JournalTab />}
    </div>
  );
}
