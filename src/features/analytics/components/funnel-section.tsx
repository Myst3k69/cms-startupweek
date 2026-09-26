"use client";

import * as React from "react";
import { Funnel } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Segmented } from "@/components/ui";
import { useCollection, useLookup } from "@/lib/hooks";
import { useCrm } from "@/lib/store";
import { number, percent } from "@/lib/format";
import {
  FUNNEL_STEPS,
  conversionRows,
  funnelCounts,
  inCur,
  personaOf,
  sourceOf,
  sumTraffic,
  trafficBetween,
  type ConversionRow,
  type Range,
} from "../lib/metrics";
import { NoData, RateBar } from "./parts";

type Split = "source" | "persona";

function ConversionTable({ rows, first }: { rows: ConversionRow[]; first: string }) {
  if (!rows.length) return <NoData>Aucune candidature sur la période.</NoData>;
  const tot = rows.reduce(
    (acc, r) => ({ total: acc.total + r.total, qualified: acc.qualified + r.qualified, interviews: acc.interviews + r.interviews, enrolled: acc.enrolled + r.enrolled }),
    { total: 0, qualified: 0, interviews: 0, enrolled: 0 },
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="py-2 pr-3 text-left font-semibold">{first}</th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">Cand.</th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">Qualif.</th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">Entret.</th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">Inscrits</th>
            <th scope="col" className="py-2 pl-2 text-right font-semibold">Conversion</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-border last:border-0">
              <th scope="row" className="max-w-40 truncate py-2 pr-3 text-left font-medium text-foreground">{r.label}</th>
              <td className="tabular px-2 py-2 text-right">{number(r.total)}</td>
              <td className="tabular px-2 py-2 text-right text-muted-foreground">{number(r.qualified)}</td>
              <td className="tabular px-2 py-2 text-right text-muted-foreground">{number(r.interviews)}</td>
              <td className="tabular px-2 py-2 text-right">{number(r.enrolled)}</td>
              <td className="py-2 pl-2 text-right">
                <RateBar value={r.rate} label={percent(r.rate)} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border-strong text-foreground">
            <th scope="row" className="py-2 pr-3 text-left font-semibold">Total</th>
            <td className="tabular px-2 py-2 text-right font-semibold">{number(tot.total)}</td>
            <td className="tabular px-2 py-2 text-right">{number(tot.qualified)}</td>
            <td className="tabular px-2 py-2 text-right">{number(tot.interviews)}</td>
            <td className="tabular px-2 py-2 text-right font-semibold">{number(tot.enrolled)}</td>
            <td className="tabular py-2 pl-2 text-right font-semibold">{tot.total ? percent((tot.enrolled / tot.total) * 100) : "—"}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function FunnelSection({ range }: { range: Range }) {
  const applications = useCollection("applications");
  const contacts = useLookup("contacts");
  const traffic = useCrm((s) => s.traffic);
  const [split, setSplit] = React.useState<Split>("source");

  const apps = React.useMemo(() => applications.filter((a) => inCur(a.submittedAt, range)), [applications, range]);
  const visitors = React.useMemo(() => sumTraffic(trafficBetween(traffic, range.startKey, range.endKey)).visitors, [traffic, range]);
  const counts = React.useMemo(() => funnelCounts(apps), [apps]);
  const rows = React.useMemo(
    () => (split === "source" ? conversionRows(apps, (a) => sourceOf(a, contacts.get(a.contactId))) : conversionRows(apps, personaOf)),
    [apps, split, contacts],
  );

  const steps = FUNNEL_STEPS.map((label, i) => ({ label, value: counts[i] }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Funnel candidature</CardTitle>
            <CardDescription>Candidatures déposées sur la période · étape maximale atteinte (un refus après entretien compte à l'étape « Entretiens »)</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            En amont : <span className="tabular font-medium text-foreground">{number(visitors)}</span> visiteurs du site · visiteur → candidature :{" "}
            <span className="tabular font-medium text-foreground">{visitors ? percent((counts[0] / visitors) * 100, 2) : "—"}</span>
          </p>
          {apps.length === 0 ? (
            <NoData>Aucune candidature sur la période.</NoData>
          ) : (
            <>
              <Funnel steps={steps} format={(v) => number(v)} />
              <p className="mt-3 text-xs text-muted-foreground">
                Visiteur → inscrit : <span className="tabular font-medium text-foreground">{visitors ? percent((counts[4] / visitors) * 100, 2) : "—"}</span> · candidature → inscrit :{" "}
                <span className="tabular font-medium text-foreground">{counts[0] ? percent((counts[4] / counts[0]) * 100) : "—"}</span>
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-wrap">
          <div>
            <CardTitle>Conversion par {split === "source" ? "source (UTM)" : "persona"}</CardTitle>
            <CardDescription>{split === "source" ? "UTM de la candidature, sinon du contact, sinon source déclarée" : "Profil déclaré dans le tunnel de candidature"}</CardDescription>
          </div>
          <Segmented<Split>
            size="xs"
            value={split}
            onChange={setSplit}
            options={[
              { value: "source", label: "Source" },
              { value: "persona", label: "Persona" },
            ]}
          />
        </CardHeader>
        <CardContent>
          <ConversionTable rows={rows} first={split === "source" ? "Source" : "Persona"} />
        </CardContent>
      </Card>
    </div>
  );
}
