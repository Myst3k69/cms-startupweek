"use client";

import * as React from "react";
import { ListTodo, Workflow } from "lucide-react";
import { PageHeader, Tabs } from "@/components/ui";
import { SequencesView } from "./sequences-view";
import { TASK_VIEWS, TasksView, type TaskView } from "./tasks-view";

export interface RelancesFilters {
  onglet?: string;
  vue?: string;
  qui?: string;
}

export function RelancesPage({ initial }: { initial: RelancesFilters }) {
  const [tab, setTab] = React.useState<"taches" | "sequences">(initial.onglet === "sequences" ? "sequences" : "taches");
  const view = TASK_VIEWS.includes(initial.vue as TaskView) ? (initial.vue as TaskView) : undefined;
  const scope = initial.qui === "equipe" || initial.qui === "moi" ? initial.qui : undefined;
  return (
    <div>
      <PageHeader
        eyebrow="Commercial"
        title="Relances & tâches"
        description="Vos tâches du jour et les séquences automatiques : SLA des demandes, nurturing, devis, impayés, J-7 et J+60 — plus aucune relance oubliée."
      />
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5"
        tabs={[
          { value: "taches", label: "Tâches", icon: ListTodo },
          { value: "sequences", label: "Séquences", icon: Workflow },
        ]}
      />
      {tab === "taches" ? <TasksView initialView={view} initialScope={scope} /> : <SequencesView />}
    </div>
  );
}
