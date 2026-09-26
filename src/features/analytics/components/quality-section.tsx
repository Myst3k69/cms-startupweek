"use client";

import * as React from "react";
import { LineChart } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useCollection, useSettings } from "@/lib/hooks";
import { number, percent } from "@/lib/format";
import {
  SATISFACTION_KINDS,
  attendanceRate,
  complaintRate,
  inCur,
  inPrev,
  npsOf,
  qualityMonthly,
  satisfactionOf,
  type Range,
} from "../lib/metrics";
import { MiniStat, NoData } from "./parts";

export function QualitySection({ range, now }: { range: Range; now: number }) {
  const evaluations = useCollection("evaluations");
  const attendances = useCollection("attendances");
  const complaints = useCollection("complaints");
  const settings = useSettings();

  const monthly = React.useMemo(() => qualityMonthly(evaluations, now), [evaluations, now]);
  const k = React.useMemo(() => {
    const sat = evaluations.filter((e) => SATISFACTION_KINDS.includes(e.kind));
    const cur = sat.filter((e) => inCur(e.submittedAt, range));
    const prev = sat.filter((e) => inPrev(e.submittedAt, range));
    const att = attendances.filter((a) => inCur(a.date, range));
    const comp = complaints.filter((c) => inCur(c.receivedAt, range));
    const acked = comp.filter((c) => c.ackAt);
    const ackLate = acked.filter((c) => new Date(c.ackAt!).getTime() - new Date(c.receivedAt).getTime() > settings.complaintAckHours * 3_600_000).length;
    return {
      sat: satisfactionOf(cur),
      nps: npsOf(cur),
      npsPrev: npsOf(prev),
      n: cur.length,
      attendance: attendanceRate(att),
      attN: att.length,
      complaints: complaintRate(comp, att),
      ackLate,
    };
  }, [evaluations, attendances, complaints, range, settings.complaintAckHours]);

  const npsDelta = k.nps !== undefined && k.npsPrev !== undefined ? k.nps - k.npsPrev : undefined;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Satisfaction moyenne (/5)</CardTitle>
            <CardDescription>Évaluations à chaud et à froid · 12 derniers mois</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {monthly.sat.values.length ? (
            <LineChart labels={monthly.sat.labels} series={[{ name: "Satisfaction", values: monthly.sat.values }]} format={(v) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} height={180} />
          ) : (
            <NoData>Aucune évaluation sur 12 mois.</NoData>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>NPS par mois</CardTitle>
            <CardDescription>% promoteurs (9-10) − % détracteurs (0-6)</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {monthly.nps.values.length && !monthly.nps.values.some((v) => v < 0) ? (
            <LineChart labels={monthly.nps.labels} series={[{ name: "NPS", values: monthly.nps.values }]} format={(v) => String(Math.round(v))} height={180} area={false} />
          ) : monthly.nps.values.length ? (
            // Valeurs négatives : pas d'axe négatif dans LineChart → tableau mensuel (jamais de valeur tronquée).
            <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {monthly.nps.labels.map((l, i) => (
                <li key={l} className="rounded-md bg-surface-2/70 px-2 py-1.5 text-center">
                  <p className="text-[11px] text-muted-foreground">{l}</p>
                  <p className="tabular text-sm font-semibold text-foreground">{monthly.nps.values[i]}</p>
                </li>
              ))}
            </ul>
          ) : (
            <NoData>Aucune note NPS sur 12 mois.</NoData>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Indicateurs de la période</CardTitle>
            <CardDescription>Preuves Qualiopi ind. 30 à 32</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <MiniStat label="Satisfaction" value={k.sat !== undefined ? `${k.sat.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} / 5` : "—"} hint={`${number(k.n)} réponse${k.n > 1 ? "s" : ""}`} />
          <MiniStat label="NPS" value={k.nps ?? "—"} hint={npsDelta !== undefined ? `${npsDelta >= 0 ? "+" : ""}${npsDelta} pts vs période préc.` : "pas de comparaison"} />
          <MiniStat label="Assiduité" value={k.attendance !== undefined ? percent(k.attendance) : "—"} hint={k.attN ? `${number(k.attN)} demi-journées émargées` : "aucun émargement"} />
          <MiniStat
            label="Réclamations"
            value={number(k.complaints.count)}
            hint={k.complaints.rate !== undefined ? `${percent(k.complaints.rate, 1)} des participants${k.ackLate ? ` · ${k.ackLate} AR hors délai` : ""}` : "aucun participant émargé"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
