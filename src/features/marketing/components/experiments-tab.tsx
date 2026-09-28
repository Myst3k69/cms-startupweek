"use client";

import * as React from "react";
import Link from "next/link";
import { FlaskConical, Plus } from "lucide-react";
import { Badge, Button, Card, EmptyState, Progress, Segmented, StatusBadge } from "@/components/ui";
import type { ExperimentStatus } from "@/lib/domain/types";
import { EXPERIMENT_CHANNELS, EXPERIMENT_METRICS, EXPERIMENT_STATUSES } from "../lib/labels";
import { analyzeExperiment } from "../lib/stats";
import { ExperimentFormModal } from "./experiment-form-modal";
import { VERDICT_LABEL, VERDICT_TONE, rateFmt } from "./parts";
import type { MarketingData } from "./use-marketing-data";

type Filter = "actifs" | "termines" | "tous";
const ORDER: Record<ExperimentStatus, number> = { en_cours: 0, brouillon: 1, termine: 2, abandonne: 3 };

export function ExperimentsTab({ data, editable }: { data: MarketingData; editable: boolean }) {
  const [filter, setFilter] = React.useState<Filter>("actifs");
  const [creating, setCreating] = React.useState(false);

  const rows = React.useMemo(
    () =>
      data.experiments
        .filter((e) => (filter === "tous" ? true : filter === "actifs" ? e.status === "en_cours" || e.status === "brouillon" : e.status === "termine" || e.status === "abandonne"))
        .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (b.startAt ?? b.createdAt).localeCompare(a.startAt ?? a.createdAt))
        .map((e) => ({ e, a: analyzeExperiment(e, data.adStats) })),
    [data.experiments, data.adStats, filter],
  );
  const active = data.experiments.filter((e) => e.status === "en_cours" || e.status === "brouillon").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "actifs", label: "En cours & brouillons", count: active },
            { value: "termines", label: "Terminés", count: data.experiments.length - active },
            { value: "tous", label: "Tous" },
          ]}
        />
        <p className="text-xs text-muted-foreground sm:ml-2">Test z de deux proportions contre le contrôle (A), taille d'échantillon calculée à l'avance, correction si plus de deux variantes.</p>
        {editable ? (
          <Button className="sm:ml-auto" onClick={() => setCreating(true)}>
            <Plus /> Nouveau test
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={FlaskConical} title="Aucun test dans cette vue" description="Testez une créa, un titre de page ou un objet d'email : une seule variable à la fois." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map(({ e, a }) => (
            <li key={e.id}>
              <Card interactive className="h-full">
                <Link href={`/marketing/tests/${e.id}`} className="block h-full px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge options={EXPERIMENT_STATUSES} value={e.status} />
                    <StatusBadge options={EXPERIMENT_CHANNELS} value={e.channel} />
                    <span className="text-xs text-muted-foreground">{EXPERIMENT_METRICS[e.metric].label}</span>
                  </div>
                  <p className="mt-2 font-medium text-foreground">{e.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{e.hypothesis}</p>

                  <ul className="mt-3 space-y-1.5">
                    {a.variants.map((v) => (
                      <li key={v.key} className="flex items-center justify-between gap-3 text-xs">
                        <span className="min-w-0 truncate">
                          <span className="mr-1.5 inline-flex size-5 items-center justify-center rounded bg-surface-2 font-mono text-[11px] font-semibold text-foreground">{v.key}</span>
                          <span className="text-foreground">{v.name}</span>
                        </span>
                        <span className="tabular shrink-0 text-muted-foreground">
                          {v.exposures ? rateFmt(v.rate) : "—"}
                          {v.upliftPct !== undefined && Number.isFinite(v.upliftPct) ? (
                            <span className={v.significant ? (v.upliftPct > 0 ? "ml-2 font-medium text-success-text" : "ml-2 font-medium text-danger-text") : "ml-2"}>
                              {v.upliftPct > 0 ? "+" : ""}
                              {v.upliftPct.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone={e.status === "termine" && e.winnerKey ? "success" : VERDICT_TONE[a.verdict]} dot>
                      {e.status === "termine" && e.winnerKey ? `Gagnant retenu : ${e.winnerKey}` : VERDICT_LABEL[a.verdict]}
                    </Badge>
                    {a.srm?.suspicious ? (
                      <Badge tone="danger" dot>
                        Répartition anormale
                      </Badge>
                    ) : null}
                  </div>
                  {e.status === "en_cours" && Number.isFinite(a.requiredPerVariant) ? (
                    <div className="mt-3">
                      <p className="mb-1 text-[11px] text-muted-foreground">
                        Échantillon : <span className="tabular font-medium text-foreground">{Math.round(a.progress * 100)} %</span> de {a.requiredPerVariant.toLocaleString("fr-FR")} par variante
                      </p>
                      <Progress value={Math.round(a.progress * 100)} tone={a.progress >= 1 ? "success" : "accent"} label="Avancement de l'échantillon" />
                    </div>
                  ) : null}
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {creating ? <ExperimentFormModal open onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

