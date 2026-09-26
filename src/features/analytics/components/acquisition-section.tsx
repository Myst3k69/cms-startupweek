"use client";

import * as React from "react";
import { DonutChart, LineChart, seriesColor } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useCrm } from "@/lib/store";
import { compactNumber, number, percent } from "@/lib/format";
import { TRAFFIC_SOURCES, sumTraffic, trafficBetween, trafficSeries, type Period, type Range } from "../lib/metrics";
import { MiniStat, NoData } from "./parts";

export function AcquisitionSection({ period, range, now }: { period: Period; range: Range; now: number }) {
  const traffic = useCrm((s) => s.traffic);
  const cur = React.useMemo(() => sumTraffic(trafficBetween(traffic, range.startKey, range.endKey)), [traffic, range]);
  const prev = React.useMemo(() => sumTraffic(trafficBetween(traffic, range.prevStartKey, range.prevEndKey)), [traffic, range]);
  const series = React.useMemo(() => trafficSeries(traffic, period, range, now), [traffic, period, range, now]);

  const conv = cur.visitors ? (cur.formSubmits / cur.visitors) * 100 : 0;
  const convPrev = prev.visitors ? (prev.formSubmits / prev.visitors) * 100 : 0;
  const completion = cur.formStarts ? (cur.formSubmits / cur.formStarts) * 100 : 0;
  const donut = TRAFFIC_SOURCES.map((s, i) => ({ label: s.label, value: cur.sources[s.key], color: seriesColor(i) }));
  const sourcesTotal = donut.reduce((s, d) => s + d.value, 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div>
            <CardTitle>Visiteurs et pages vues</CardTitle>
            <CardDescription>Vercel Web Analytics · par {series.grain}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {cur.days === 0 ? (
            <NoData>Aucune donnée de trafic sur la période.</NoData>
          ) : (
            <LineChart
              labels={series.labels}
              series={[
                { name: "Visiteurs", values: series.visitors },
                { name: "Pages vues", values: series.pageviews },
              ]}
              format={(v) => compactNumber(v)}
              height={240}
            />
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="Visiteurs" value={compactNumber(cur.visitors)} hint={`${number(Math.round(cur.visitors / Math.max(1, cur.days)))} / jour`} />
            <MiniStat label="Pages / visite" value={cur.visitors ? (cur.pageviews / cur.visitors).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "—"} />
            <MiniStat
              label="Conversion formulaire"
              value={percent(conv, 2)}
              hint={convPrev ? `${conv >= convPrev ? "+" : ""}${(conv - convPrev).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} pt vs période préc.` : "envois / visiteurs"}
            />
            <MiniStat label="Complétion formulaires" value={cur.formStarts ? percent(completion) : "—"} hint={`${number(cur.formSubmits)} envois / ${number(cur.formStarts)} démarrés`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Sources de trafic</CardTitle>
            <CardDescription>Visites attribuées (référent + UTM)</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {sourcesTotal === 0 ? (
            <NoData>Aucune visite attribuée.</NoData>
          ) : (
            <DonutChart
              data={donut}
              format={(v) => compactNumber(v)}
              center={
                <>
                  <span className="text-lg font-semibold text-foreground">{compactNumber(sourcesTotal)}</span>
                  <span className="text-[11px] text-muted-foreground">visites</span>
                </>
              }
              className="flex-col items-stretch [&>div:first-child]:self-center"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
