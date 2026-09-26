"use client";

import * as React from "react";
import { Building2, Database, Plug, Receipt, ShieldCheck, Users } from "lucide-react";
import { PageHeader, Tabs } from "@/components/ui";
import { useSession } from "@/lib/hooks";
import { DataTab } from "./settings/data-tab";
import { BillingTab, OrganizationTab, QualiopiTab } from "./settings/general-tabs";
import { IntegrationsTab } from "./settings/integrations-tab";
import { TeamTab } from "./settings/team-tab";

type Tab = "organisation" | "facturation" | "qualiopi" | "equipe" | "integrations" | "donnees";

export function SettingsPage() {
  const { canEdit } = useSession();
  const [tab, setTab] = React.useState<Tab>("organisation");

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Site & système"
        title="Paramètres"
        description={
          canEdit("parametres")
            ? "Organisme, facturation, Qualiopi, équipe, intégrations et données — modifications réservées aux administrateurs."
            : "Consultation seule : les modifications sont réservées aux administrateurs."
        }
      />
      <Tabs<Tab>
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "organisation", label: "Organisation", icon: Building2 },
          { value: "facturation", label: "Facturation", icon: Receipt },
          { value: "qualiopi", label: "Qualiopi", icon: ShieldCheck },
          { value: "equipe", label: "Équipe & rôles", icon: Users },
          { value: "integrations", label: "Intégrations", icon: Plug },
          { value: "donnees", label: "Données", icon: Database },
        ]}
      />
      {tab === "organisation" ? (
        <OrganizationTab />
      ) : tab === "facturation" ? (
        <BillingTab />
      ) : tab === "qualiopi" ? (
        <QualiopiTab />
      ) : tab === "equipe" ? (
        <TeamTab />
      ) : tab === "integrations" ? (
        <IntegrationsTab />
      ) : (
        <DataTab />
      )}
    </div>
  );
}
