"use client";

import * as React from "react";
import { Euro, FileText, MousePointerClick, Smile, UserCheck, Users } from "lucide-react";
import { PageHeader, SectionTitle, Segmented, StatCard } from "@/components/ui";
import { useCollection, useNow } from "@/lib/hooks";
import { useCrm } from "@/lib/store";
import { invoiceTotal } from "@/lib/domain/selectors";
import { compactNumber, moneyCompact, number, percent } from "@/lib/format";
import {
  PERIOD_LABEL,
  SATISFACTION_KINDS,
  inCur,
  inPrev,
  isRevenueInvoice,
  npsOf,
  pctDelta,
  periodRange,
  satisfactionOf,
  sumTraffic,
  trafficBetween,
  type Period,
} from "../lib/metrics";
import { AcquisitionSection } from "./acquisition-section";
import { ActivitySection } from "./activity-section";
import { FunnelSection } from "./funnel-section";
import { GrowthSection } from "./growth-section";
import { QualitySection } from "./quality-section";
import { RecommendationsCard } from "./recommendations-card";
import { RevenueSection } from "./revenue-section";
import { TrackingCard } from "./tracking-card";

export function AnalyticsPage() {
  const now = useNow();
  const [period, setPeriod] = React.useState<Period>("90j");
  const range = React.useMemo(() => periodRange(period, now), [period, now]);

  const traffic = useCrm((s) => s.traffic);
  const applications = useCollection("applications");
  const invoices = useCollection("invoices");
  const evaluations = useCollection("evaluations");

  const kpi = React.useMemo(() => {
    const cur = sumTraffic(trafficBetween(traffic, range.startKey, range.endKey));
    const prev = sumTraffic(trafficBetween(traffic, range.prevStartKey, range.prevEndKey));
    const conv = cur.visitors ? (cur.formSubmits / cur.visitors) * 100 : 0;
    const convPrev = prev.visitors ? (prev.formSubmits / prev.visitors) * 100 : 0;
    const appsCur = applications.filter((a) => inCur(a.submittedAt, range));
    const appsPrev = applications.filter((a) => inPrev(a.submittedAt, range));
    const enrolledCur = appsCur.filter((a) => a.status === "inscrite").length;
    const enrolledPrev = appsPrev.filter((a) => a.status === "inscrite").length;
    const rev = (pred: (iso: string) => boolean) => invoices.filter((i) => isRevenueInvoice(i) && pred(i.issuedAt)).reduce((s, i) => s + invoiceTotal(i).ht, 0);
    const revCur = rev((d) => inCur(d, range));
    const revPrev = rev((d) => inPrev(d, range));
    const sat = evaluations.filter((e) => SATISFACTION_KINDS.includes(e.kind));
    const satCur = sat.filter((e) => inCur(e.submittedAt, range));
    const satPrev = sat.filter((e) => inPrev(e.submittedAt, range));
    const s1 = satisfactionOf(satCur);
    const s0 = satisfactionOf(satPrev);
    return {
      visitors: cur.visitors,
      visitorsDelta: pctDelta(cur.visitors, prev.visitors),
      conv,
      convDelta: convPrev ? Math.round(((conv - convPrev) / convPrev) * 1000) / 10 : undefined,
      apps: appsCur.length,
      appsDelta: pctDelta(appsCur.length, appsPrev.length),
      enrolled: enrolledCur,
      enrolledDelta: pctDelta(enrolledCur, enrolledPrev),
      revenue: revCur,
      revenueDelta: pctDelta(revCur, revPrev),
      sat: s1,
      satDelta: s1 !== undefined && s0 ? Math.round(((s1 - s0) / s0) * 1000) / 10 : undefined,
      nps: npsOf(satCur),
    };
  }, [traffic, applications, invoices, evaluations, range]);

  const deltaLabel = period === "12m" ? "vs 12 mois préc." : `vs ${range.days} j préc.`;

  return (
    <div className="page-enter space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Pilotage"
        title="Analytics"
        description="Acquisition, conversion des candidatures, revenus, qualité et récurrence — calculés en direct depuis les données du CRM et du site."
        actions={
          <Segmented<Period>
            value={period}
            onChange={setPeriod}
            options={[
              { value: "30j", label: "30 j" },
              { value: "90j", label: "90 j" },
              { value: "12m", label: "12 mois" },
            ]}
          />
        }
      />

      <section aria-label="Indicateurs clés" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Visiteurs" value={compactNumber(kpi.visitors)} delta={kpi.visitorsDelta} deltaLabel={deltaLabel} icon={Users} />
        <StatCard label="Conversion formulaire" value={percent(kpi.conv, 2)} delta={kpi.convDelta} deltaLabel={deltaLabel} icon={MousePointerClick} />
        <StatCard label="Candidatures" value={number(kpi.apps)} delta={kpi.appsDelta} deltaLabel={deltaLabel} icon={FileText} />
        <StatCard label="Inscriptions payées" value={number(kpi.enrolled)} delta={kpi.enrolledDelta} deltaLabel={deltaLabel} icon={UserCheck} />
        <StatCard label="CA facturé HT" value={moneyCompact(kpi.revenue)} delta={kpi.revenueDelta} deltaLabel={deltaLabel} icon={Euro} />
        <StatCard
          label="Satisfaction"
          value={kpi.sat !== undefined ? `${kpi.sat.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/5` : "—"}
          delta={kpi.satDelta}
          deltaLabel={deltaLabel}
          hint={kpi.nps !== undefined ? `NPS ${kpi.nps}` : "aucune évaluation"}
          icon={Smile}
        />
      </section>

      <RecommendationsCard range={range} now={now} />

      <section>
        <SectionTitle title="Acquisition" description={`Trafic du site startupweek.tech · ${PERIOD_LABEL[period]}`} />
        <AcquisitionSection period={period} range={range} now={now} />
      </section>

      <section>
        <SectionTitle title="Conversion des candidatures" description="Du visiteur à l'inscription payée, par source et par persona" />
        <FunnelSection range={range} />
      </section>

      <section>
        <SectionTitle title="Revenus" description="CA facturé, panier moyen, remplissage et prévisionnel" />
        <RevenueSection period={period} range={range} now={now} />
      </section>

      <section>
        <SectionTitle title="Qualité" description="Satisfaction, NPS, assiduité et réclamations (Qualiopi critère 7)" />
        <QualitySection range={range} now={now} />
      </section>

      <section>
        <SectionTitle title="Contenus & récurrence" description="Ce qui attire les leads, et ce qui fait revenir les alumni" />
        <GrowthSection now={now} />
      </section>

      <section>
        <SectionTitle title="Activité" />
        <ActivitySection now={now} />
      </section>

      <section>
        <SectionTitle title="Tracking" />
        <TrackingCard />
      </section>
    </div>
  );
}
