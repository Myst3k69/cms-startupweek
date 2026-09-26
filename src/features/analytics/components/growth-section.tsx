"use client";

import * as React from "react";
import Link from "next/link";
import { BarList } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Segmented } from "@/components/ui";
import { useCollection, useLookup } from "@/lib/hooks";
import { CHANNELS, labelOf } from "@/lib/domain/constants";
import { compactNumber, date, moneyCompact, number, percent } from "@/lib/format";
import { alumniRebuy, topContents } from "../lib/metrics";
import { MiniStat, NoData, RateBar } from "./parts";

type Metric = "views" | "leads" | "clicks";
const METRIC_LABEL: Record<Metric, string> = { views: "vues", leads: "leads", clicks: "clics" };

/** Top contenus + cohortes d'alumni (récurrence / upsell). */
export function GrowthSection({ now }: { now: number }) {
  const contents = useCollection("contents");
  const applications = useCollection("applications");
  const invoices = useCollection("invoices");
  const events = useCollection("events");
  const offers = useLookup("offers");
  const [metric, setMetric] = React.useState<Metric>("views");

  const top = React.useMemo(() => topContents(contents, metric, 7), [contents, metric]);
  const cohorts = React.useMemo(() => alumniRebuy(applications, invoices, events, offers, now), [applications, invoices, events, offers, now]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-wrap">
          <div>
            <CardTitle>Top contenus</CardTitle>
            <CardDescription>Contenus publiés · cumul depuis publication</CardDescription>
          </div>
          <Segmented<Metric>
            size="xs"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "views", label: "Vues" },
              { value: "clicks", label: "Clics" },
              { value: "leads", label: "Leads" },
            ]}
          />
        </CardHeader>
        <CardContent>
          {top.length === 0 || top.every((c) => c.metrics[metric] === 0) ? (
            <NoData>Aucun contenu publié avec des {METRIC_LABEL[metric]}.</NoData>
          ) : (
            <BarList
              format={(v) => (metric === "views" ? compactNumber(v) : number(v))}
              items={top.map((c) => ({
                key: c.id,
                value: c.metrics[metric],
                hint: metric === "views" ? `· ${c.metrics.leads} leads` : `· ${labelOf(CHANNELS, c.channel)}`,
                label: (
                  <Link href={`/contenus/${c.id}`} className="hover:text-accent-text hover:underline">
                    {c.title}
                  </Link>
                ),
              }))}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Récurrence des alumni</CardTitle>
            <CardDescription>Participants ayant racheté après leur session (Iteration Lab, mentorat, nouvelle session)</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Alumni" value={number(cohorts.alumni)} />
            <MiniStat label="Taux de rachat" value={cohorts.alumni ? percent(cohorts.rate) : "—"} hint={`${number(cohorts.rebuyers)} client${cohorts.rebuyers > 1 ? "s" : ""}`} />
            <MiniStat label="CA upsell HT" value={moneyCompact(cohorts.revenue)} />
          </div>
          {cohorts.alumni === 0 ? (
            <NoData>Aucune session terminée avec des inscrits.</NoData>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[280px] text-xs">
                  <thead>
                    <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="py-1.5 pr-2 text-left font-semibold">Cohorte</th>
                      <th scope="col" className="px-2 py-1.5 text-right font-semibold">Alumni</th>
                      <th scope="col" className="py-1.5 pl-2 text-right font-semibold">Rachat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.cohorts.slice(0, 8).map((c) => (
                      <tr key={c.eventId} className="border-b border-border last:border-0">
                        <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                          <Link href={`/sessions/${c.eventId}`} className="font-mono text-foreground hover:text-accent-text hover:underline" title={c.name}>
                            {c.code}
                          </Link>
                          <span className="ml-1.5 text-muted-foreground">{date(c.endAt, "MMM yy")}</span>
                        </th>
                        <td className="tabular px-2 py-1.5 text-right">{c.alumni}</td>
                        <td className="py-1.5 pl-2 text-right">
                          <RateBar value={c.alumni ? (c.rebuyers / c.alumni) * 100 : 0} label={`${c.rebuyers}/${c.alumni}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Offres rachetées</p>
                {cohorts.offers.length ? (
                  <BarList items={cohorts.offers.slice(0, 5).map((o) => ({ key: o.label, label: o.label, value: o.value }))} format={(v) => `${v}`} color="var(--series-3)" />
                ) : (
                  <p className="text-xs text-muted-foreground">Aucun rachat pour l'instant : proposer l'Iteration Lab à J+15.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
