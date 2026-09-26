"use client";

import * as React from "react";
import Link from "next/link";
import { Code2, Database, LayoutGrid, Workflow } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from "@/components/ui";
import { useCollection } from "@/lib/hooks";
import { number } from "@/lib/format";
import { CUTOVER_STEPS, MIGRATION_STATUS, N8N_WORKFLOWS, matchesWorkflow, type MigrationStatus, type N8nWorkflow } from "../lib/n8n";

const KIND_ICON: Record<N8nWorkflow["replacedBy"][number]["kind"], React.ComponentType<{ className?: string }>> = {
  endpoint: Code2,
  regle: Workflow,
  trigger: Database,
  module: LayoutGrid,
};

export function MigrationTab() {
  const rules = useCollection("automations");
  const counts = React.useMemo(() => {
    const c: Record<MigrationStatus, number> = { remplace: 0, a_decommissionner: 0, hors_perimetre: 0 };
    N8N_WORKFLOWS.forEach((w) => c[w.status]++);
    return c;
  }, []);
  const rulesFor = React.useCallback((name: string) => rules.filter((r) => r.replacesN8n?.some((w) => matchesWorkflow(w, name))), [rules]);
  const inScope = N8N_WORKFLOWS.length - counts.hors_perimetre;
  const covered = counts.remplace + counts.a_decommissionner;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4 md:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Couverture fonctionnelle par le CRM</p>
            <p className="tabular text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{covered}</span> / {inScope} workflows du périmètre
            </p>
          </div>
          <Progress value={(covered / inScope) * 100} className="mt-3 h-2" tone="success" label="Couverture de la migration" />
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {(Object.keys(MIGRATION_STATUS) as MigrationStatus[]).map((s) => (
              <li key={s}>
                <Badge tone={MIGRATION_STATUS[s].tone} dot>
                  {MIGRATION_STATUS[s].label} · {counts[s]}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Appels Airtable évités</p>
          <p className="tabular mt-1 text-2xl font-semibold tracking-tight text-foreground">≈ {number(4300)} / jour</p>
          <p className="mt-1 text-xs text-muted-foreground">Le polling « Sync Airtable → Supabase » (1 appel / min × tables) est remplacé par un trigger SQL en temps réel.</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Carte de migration n8n → CRM</CardTitle>
            <CardDescription>Les 13 workflows StartupWeek de l'instance n8n, leurs faiblesses et leur remplaçant</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0 sm:px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-y border-border bg-surface-2/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-2 text-left font-semibold sm:px-5">Workflow n8n</th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">Faiblesses identifiées</th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">Remplacé par</th>
                  <th scope="col" className="px-4 py-2 text-left font-semibold sm:px-5">Statut</th>
                </tr>
              </thead>
              <tbody>
                {N8N_WORKFLOWS.map((w) => {
                  const linked = rulesFor(w.name);
                  return (
                    <tr key={w.name} className="border-b border-border align-top last:border-0">
                      <th scope="row" className="max-w-64 px-4 py-3 text-left font-normal sm:px-5">
                        <p className="flex items-center gap-1.5 font-medium text-foreground">
                          <Workflow className="size-3.5 shrink-0 text-faint" aria-hidden="true" />
                          {w.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{w.role}</p>
                      </th>
                      <td className="max-w-72 px-3 py-3">
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {w.weaknesses.map((x) => (
                            <li key={x} className="flex gap-1.5">
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />
                              {x}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="max-w-80 px-3 py-3">
                        <ul className="space-y-1.5 text-xs">
                          {w.replacedBy.map((r) => {
                            const Icon = KIND_ICON[r.kind];
                            const content = (
                              <>
                                <Icon className="size-3.5 shrink-0 text-faint" aria-hidden="true" />
                                <span className={r.kind === "endpoint" ? "font-mono" : undefined}>{r.label}</span>
                              </>
                            );
                            return (
                              <li key={r.label} className="flex items-start gap-1.5 text-foreground">
                                {r.href ? (
                                  <Link href={r.href} className="inline-flex items-start gap-1.5 hover:text-accent-text hover:underline">
                                    {content}
                                  </Link>
                                ) : (
                                  content
                                )}
                              </li>
                            );
                          })}
                          {linked.map((r) => (
                            <li key={r.id} className="flex items-start gap-1.5 text-foreground">
                              <Workflow className="size-3.5 shrink-0 text-accent-text" aria-hidden="true" />
                              <span>
                                Règle « {r.name} »{" "}
                                <span className="text-muted-foreground">
                                  ({r.active ? "active" : "désactivée"} · {number(r.runs)} exéc.)
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <Badge tone={MIGRATION_STATUS[w.status].tone} dot className="whitespace-normal">
                          {MIGRATION_STATUS[w.status].label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Plan de bascule</CardTitle>
            <CardDescription>Double écriture pendant 7 jours, puis coupure de n8n et archivage d'Airtable</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 md:grid-cols-5">
            {CUTOVER_STEPS.map((s, i) => (
              <li key={s.title} className="rounded-md border border-border p-3">
                <span className="tabular inline-flex size-6 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-text">{i + 1}</span>
                <p className="mt-2 text-sm font-medium text-foreground">{s.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.detail}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
