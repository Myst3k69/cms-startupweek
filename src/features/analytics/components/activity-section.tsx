"use client";

import * as React from "react";
import { BarList, CalendarHeatmap } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useCollection } from "@/lib/hooks";
import { date, number } from "@/lib/format";
import { submissionHeatmap } from "../lib/metrics";

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function ActivitySection({ now }: { now: number }) {
  const submissions = useCollection("submissions");
  const heat = React.useMemo(() => submissionHeatmap(submissions, now), [submissions, now]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Activité des formulaires</CardTitle>
          <CardDescription>Demandes reçues par jour · 52 dernières semaines (lignes : lundi → dimanche)</CardDescription>
        </div>
        <span className="tabular text-right text-xs text-muted-foreground">
          <span className="block text-lg font-semibold text-foreground">{number(heat.total)}</span>
          demandes
        </span>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <CalendarHeatmap days={heat.days} format={(v) => `${v} demande${v > 1 ? "s" : ""}`} className="scrollbar-thin pb-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {heat.busiest.value ? (
              <>
                Pic : <span className="font-medium text-foreground">{date(heat.busiest.date, "EEEE d MMMM yyyy")}</span> ({heat.busiest.value} demandes)
              </>
            ) : (
              "Aucune demande sur la période."
            )}
          </p>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Par jour de la semaine</p>
          <BarList items={WEEKDAYS.map((d, i) => ({ key: d, label: d, value: heat.weekday[i] }))} format={(v) => number(v)} />
        </div>
      </CardContent>
    </Card>
  );
}
