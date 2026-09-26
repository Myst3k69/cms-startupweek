"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, Info, Lightbulb, TriangleAlert } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useCollection, useContentPerformance, useLookup, useSettings } from "@/lib/hooks";
import { useCrm } from "@/lib/store";
import { SATISFACTION_KINDS, conversionRows, forecast, inCur, inPrev, npsOf, sourceOf, sumTraffic, trafficBetween, type Range } from "../lib/metrics";
import { buildRecommendations, type Recommendation } from "../lib/recommendations";
import { cn } from "@/lib/utils";

const ICON: Record<Recommendation["tone"], React.ComponentType<{ className?: string }>> = {
  danger: TriangleAlert,
  warning: TriangleAlert,
  info: Info,
  success: CircleCheck,
};
const ICON_CLS: Record<Recommendation["tone"], string> = {
  danger: "text-danger-text",
  warning: "text-warning-text",
  info: "text-info-text",
  success: "text-success-text",
};
const TONE_LABEL: Record<Recommendation["tone"], string> = { danger: "Urgent", warning: "À surveiller", info: "Opportunité", success: "Point fort" };

export function RecommendationsCard({ range, now }: { range: Range; now: number }) {
  const applications = useCollection("applications");
  const contacts = useLookup("contacts");
  const events = useCollection("events");
  const deals = useCollection("deals");
  const submissions = useCollection("submissions");
  const contents = useCollection("contents");
  const contentPerf = useContentPerformance();
  const evaluations = useCollection("evaluations");
  const traffic = useCrm((s) => s.traffic);
  const settings = useSettings();

  const recos = React.useMemo(() => {
    const apps = applications.filter((a) => inCur(a.submittedAt, range));
    const sat = evaluations.filter((e) => SATISFACTION_KINDS.includes(e.kind));
    return buildRecommendations({
      now,
      sources: conversionRows(apps, (a) => sourceOf(a, contacts.get(a.contactId))),
      below: forecast(events, applications, deals, now).below,
      submissions: submissions.filter((s) => inCur(s.receivedAt, range)),
      allSubmissions: submissions,
      slaHours: settings.slaHours,
      traffic: sumTraffic(trafficBetween(traffic, range.startKey, range.endKey)),
      contents,
      contentPerf,
      npsCur: npsOf(sat.filter((e) => inCur(e.submittedAt, range))),
      npsPrev: npsOf(sat.filter((e) => inPrev(e.submittedAt, range))),
      applications,
    });
  }, [applications, contacts, events, deals, submissions, contents, contentPerf, evaluations, traffic, settings.slaHours, range, now]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="size-4 text-accent-text" aria-hidden="true" /> Recommandations
          </CardTitle>
          <CardDescription>Règles simples appliquées aux données de la période — pas d'IA, chaque constat est vérifiable.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {recos.slice(0, 8).map((r) => {
            const Icon = ICON[r.tone];
            return (
              <li key={r.id} className="flex gap-3 rounded-md border border-border bg-surface px-3 py-2.5">
                <Icon className={cn("mt-0.5 size-4 shrink-0", ICON_CLS[r.tone])} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <Badge tone={r.tone} className="px-1.5 text-[10px]">
                      {TONE_LABEL[r.tone]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.detail}</p>
                  {r.href ? (
                    <Link href={r.href} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">
                      {r.cta ?? "Voir"} <ArrowRight className="size-3" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
