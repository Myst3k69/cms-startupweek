"use client";

import * as React from "react";
import { Play, Workflow, Zap } from "lucide-react";
import {
  Badge,
  Button,
  DataTable,
  DescriptionList,
  Drawer,
  Switch,
  useToast,
  type Column,
  type FilterDef,
} from "@/components/ui";
import { ActivityTimeline } from "@/components/shared/timeline";
import { useActions, useCollection, useNow, useSession } from "@/lib/hooks";
import { useCrm } from "@/lib/store";
import type { AutomationRule } from "@/lib/domain/types";
import { dateTime, number, percent, relative } from "@/lib/format";
import { truncate } from "@/lib/utils";
import { AUTOMATION_TRIGGER_LABEL } from "../lib/labels";

function RuleDrawer({ rule, onClose, onToggle }: { rule: AutomationRule; onClose: () => void; onToggle: (r: AutomationRule, v: boolean) => void }) {
  const now = useNow();
  const toast = useToast();
  const log = useCrm((s) => s.log);
  const { update } = useActions();
  const { canEdit } = useSession();
  const editable = canEdit("automatisations");
  const success = rule.runs ? ((rule.runs - rule.errors) / rule.runs) * 100 : undefined;

  const testRun = () => {
    const at = new Date().toISOString();
    update("automations", rule.id, { runs: rule.runs + 1, lastRunAt: at });
    log({ kind: "systeme", entity: "automations", entityId: rule.id, summary: `Exécution de test : ${rule.actions.length} action${rule.actions.length > 1 ? "s" : ""} simulée${rule.actions.length > 1 ? "s" : ""} (aucun email réel)` });
    toast({ title: "Exécution de test réussie", description: "Visible dans le journal des exécutions." });
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      title={rule.name}
      description={AUTOMATION_TRIGGER_LABEL[rule.trigger]}
      footer={
        <>
          {editable ? (
            <Button variant="secondary" onClick={testRun} disabled={!rule.active} title={rule.active ? undefined : "Activez la règle pour la tester"}>
              <Play /> Lancer un test
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-foreground">{rule.active ? "Règle active" : "Règle désactivée"}</p>
            <p className="text-xs text-muted-foreground">{rule.active ? "S'exécute à chaque déclenchement." : "Aucune exécution tant qu'elle est désactivée."}</p>
          </div>
          <Switch checked={rule.active} onChange={(v) => onToggle(rule, v)} disabled={!editable} label={rule.active ? "Désactiver la règle" : "Activer la règle"} />
        </div>

        {rule.description ? <p className="text-sm text-muted-foreground">{rule.description}</p> : null}

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Déclencheur & conditions</h3>
          <div className="space-y-2 rounded-md bg-surface-2/70 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <Zap className="size-4 text-accent-text" aria-hidden="true" />
              {AUTOMATION_TRIGGER_LABEL[rule.trigger]}
            </p>
            <p className="font-mono text-xs text-muted-foreground">{rule.conditions || "Aucune condition (toujours)"}</p>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions ({rule.actions.length})</h3>
          <ol className="relative space-y-3 border-l border-border pl-5">
            {rule.actions.map((a, i) => (
              <li key={i} className="relative text-sm text-foreground">
                <span className="tabular absolute -left-[31px] top-0 inline-flex size-5 items-center justify-center rounded-full border border-border bg-surface text-[10px] font-semibold text-muted-foreground">{i + 1}</span>
                {a}
              </li>
            ))}
          </ol>
        </section>

        {rule.replacesN8n?.length ? (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Remplace (n8n)</h3>
            <div className="flex flex-wrap gap-1.5">
              {rule.replacesN8n.map((w) => (
                <Badge key={w} tone="violet">
                  <Workflow className="size-3" aria-hidden="true" /> {w}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-md border border-border p-3">
          <DescriptionList
            columns={2}
            items={[
              { label: "Exécutions", value: number(rule.runs) },
              { label: "Erreurs", value: rule.errors ? <span className="text-danger-text">{number(rule.errors)}</span> : "0" },
              { label: "Taux de succès", value: success !== undefined ? percent(success, 1) : "—" },
              { label: "Dernière exécution", value: rule.lastRunAt ? `${dateTime(rule.lastRunAt)} (${relative(rule.lastRunAt, now)})` : "Jamais" },
            ]}
          />
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historique</h3>
          <ActivityTimeline entity="automations" id={rule.id} limit={15} />
        </section>
      </div>
    </Drawer>
  );
}

export function RulesTab() {
  const rules = useCollection("automations");
  const now = useNow();
  const toast = useToast();
  const { update } = useActions();
  const { canEdit } = useSession();
  const editable = canEdit("automatisations");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const open = openId ? rules.find((r) => r.id === openId) : undefined;

  const toggle = React.useCallback(
    (r: AutomationRule, active: boolean) => {
      update("automations", r.id, { active }, { log: active ? "Règle activée" : "Règle désactivée", kind: "statut" });
      toast({ title: active ? "Règle activée" : "Règle désactivée", description: r.name, tone: active ? "success" : "info" });
    },
    [update, toast],
  );

  const columns = React.useMemo<Column<AutomationRule>[]>(
    () => [
      {
        key: "name",
        header: "Règle",
        sort: (r) => r.name,
        render: (r) => (
          <div className="min-w-0 max-w-[26rem]">
            <p className="truncate font-medium text-foreground">{r.name}</p>
            <p className="truncate text-xs text-muted-foreground">{truncate(r.description, 100)}</p>
          </div>
        ),
      },
      {
        key: "trigger",
        header: "Déclencheur · conditions",
        sort: (r) => AUTOMATION_TRIGGER_LABEL[r.trigger],
        csv: (r) => `${AUTOMATION_TRIGGER_LABEL[r.trigger]} — ${r.conditions}`,
        render: (r) => (
          <div className="min-w-0 max-w-[18rem]">
            <p className="truncate text-foreground">{AUTOMATION_TRIGGER_LABEL[r.trigger]}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground" title={r.conditions}>
              {r.conditions || "Toujours"}
            </p>
          </div>
        ),
        hideBelow: "lg",
      },
      { key: "actions", header: "Étapes", align: "right", sort: (r) => r.actions.length, render: (r) => r.actions.length, hideBelow: "2xl" },
      {
        key: "active",
        header: "Active",
        align: "center",
        sort: (r) => (r.active ? 1 : 0),
        csv: (r) => (r.active ? "oui" : "non"),
        render: (r) => (
          <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
            <Switch checked={r.active} onChange={(v) => toggle(r, v)} disabled={!editable} label={`${r.active ? "Désactiver" : "Activer"} « ${r.name} »`} />
          </span>
        ),
      },
      { key: "runs", header: "Exécutions", align: "right", sort: (r) => r.runs, render: (r) => number(r.runs) },
      { key: "last", header: "Dernière", sort: (r) => r.lastRunAt ?? "", render: (r) => <span className="whitespace-nowrap text-muted-foreground">{r.lastRunAt ? relative(r.lastRunAt, now) : "—"}</span>, hideBelow: "xl" },
      {
        key: "errors",
        header: "Erreurs",
        align: "right",
        sort: (r) => r.errors,
        render: (r) => (r.errors ? <Badge tone="danger" dot>{r.errors}</Badge> : <span className="text-faint">0</span>),
      },
    ],
    [now, editable, toggle],
  );

  const filters = React.useMemo<FilterDef<AutomationRule>[]>(
    () => [
      { key: "trigger", label: "Tous les déclencheurs", options: Object.entries(AUTOMATION_TRIGGER_LABEL).map(([value, label]) => ({ value, label })), predicate: (r, v) => r.trigger === v },
      { key: "state", label: "Toutes", options: [{ value: "on", label: "Actives" }, { value: "off", label: "Désactivées" }, { value: "err", label: "En erreur" }], predicate: (r, v) => (v === "on" ? r.active : v === "off" ? !r.active : r.errors > 0) },
    ],
    [],
  );

  return (
    <>
      <DataTable
        rows={rules}
        columns={columns}
        rowKey={(r) => r.id}
        searchable={(r) => `${r.name} ${r.description} ${r.actions.join(" ")} ${(r.replacesN8n ?? []).join(" ")}`}
        searchPlaceholder="Rechercher une règle, une action…"
        filters={filters}
        onRowClick={(r) => setOpenId(r.id)}
        exportName="automatisations"
        initialSort={{ key: "runs", dir: "desc" }}
        emptyTitle="Aucune règle"
        emptyDescription="Les règles d'automatisation apparaissent ici (accusés de réception, relances, convocations…)."
      />
      {open ? <RuleDrawer rule={open} onClose={() => setOpenId(null)} onToggle={toggle} /> : null}
    </>
  );
}
