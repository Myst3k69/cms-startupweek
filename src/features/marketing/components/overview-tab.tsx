"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, Euro, Info, MousePointerClick, Target, TrendingUp, UserCheck, UserPlus } from "lucide-react";
import { ColumnChart, LineChart } from "@/components/charts";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Segmented, StatCard } from "@/components/ui";
import { useCollection } from "@/lib/hooks";
import { lastMonths, lastWeeks } from "@/lib/domain/selectors";
import type { AdPlatform } from "@/lib/domain/types";
import { compactNumber, money, moneyCompact, number, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PERIOD_LABEL, pctDelta, periodRange, type Period } from "@/features/analytics/lib/metrics";
import { PLATFORM_SHORT } from "../lib/labels";
import { attributeAll, attributionIndex, promotionPlan, statsBetween, sumStats } from "../lib/metrics";
import { marketingInsights } from "../lib/insights";
import { PlatformBadge, cost, revenueLabel, roasFmt } from "./parts";
import type { MarketingData } from "./use-marketing-data";

const DAY = 86_400_000;
const key = (ms: number) => format(ms, "yyyy-MM-dd");

export function OverviewTab({ data, now, onOpenTab }: { data: MarketingData; now: number; onOpenTab: (t: "promotion" | "campagnes") => void }) {
  const [period, setPeriod] = React.useState<Period>("90j");
  const range = React.useMemo(() => periodRange(period, now), [period, now]);
  const events = useCollection("events");
  const contents = useCollection("contents");
  const { campaigns, adStats, byCampaign, applications, attributionInput, perf, experiments } = data;

  const kpi = React.useMemo(() => {
    const cur = sumStats(statsBetween(adStats, range.startKey, range.endKey));
    const prev = sumStats(statsBetween(adStats, range.prevStartKey, range.prevEndKey));
    const attrCur = attributionIndex(attributionInput, { start: range.start, end: range.end });
    const attrPrev = attributionIndex(attributionInput, { start: range.prevStart, end: range.prevEnd - 1 });
    const agg = (f: typeof attrCur) => {
      const a = attributeAll(f, campaigns);
      return { leads: a.leads, enrolled: a.enrolled, revenue: a.revenueCents, estimated: a.estimatedCents };
    };
    const a1 = agg(attrCur);
    const a0 = agg(attrPrev);
    return {
      cur,
      prev,
      crm: a1,
      crmPrev: a0,
      cpaCents: a1.enrolled ? cur.spendCents / a1.enrolled : undefined,
      roas: cur.spendCents ? a1.revenue / cur.spendCents : undefined,
    };
  }, [adStats, range, attributionInput, campaigns]);

  const series = React.useMemo(() => {
    const buckets =
      period === "30j"
        ? Array.from({ length: range.days }, (_, i) => {
            const d = range.start + i * DAY;
            return { label: format(d, "d MMM", { locale: fr }).replace(".", ""), from: key(d), to: key(d) };
          })
        : period === "90j"
          ? lastWeeks(now, 13).map((w) => ({ label: w.label, from: key(w.start), to: key(w.end - DAY) }))
          : lastMonths(now, 12).map((m) => ({ label: m.label, from: key(m.start), to: key(m.end - DAY) }));
    const platformOf = new Map(campaigns.map((c) => [c.id, c.platform]));
    const spend: Record<AdPlatform, number[]> = { meta: [], linkedin: [] };
    const leads: number[] = [];
    for (const b of buckets) {
      const rows = adStats.filter((s) => s.date >= b.from && s.date <= b.to);
      spend.meta.push(rows.filter((r) => platformOf.get(r.campaignId) === "meta").reduce((s, r) => s + r.spendCents, 0) / 100);
      spend.linkedin.push(rows.filter((r) => platformOf.get(r.campaignId) === "linkedin").reduce((s, r) => s + r.spendCents, 0) / 100);
      leads.push(rows.reduce((s, r) => s + r.leads, 0));
    }
    const attributed = attributeAll(attributionIndex({ ...attributionInput, submissions: [], invoices: [] }), campaigns).applications;
    const apps = buckets.map((b) => attributed.filter((a) => a.submittedAt.slice(0, 10) >= b.from && a.submittedAt.slice(0, 10) <= b.to).length);
    return { labels: buckets.map((b) => b.label), spend, leads, apps, grain: period === "30j" ? "jour" : period === "90j" ? "semaine" : "mois" };
  }, [period, range, now, campaigns, adStats, attributionInput]);

  const byPlatform = React.useMemo(() => {
    const attr = attributionIndex(attributionInput, { start: range.start, end: range.end });
    return (["meta", "linkedin"] as AdPlatform[]).map((platform) => {
      const list = campaigns.filter((c) => c.platform === platform);
      const t = sumStats(list.flatMap((c) => statsBetween(byCampaign.get(c.id) ?? [], range.startKey, range.endKey)));
      const a = attributeAll(attr, list);
      const crmLeads = a.leads;
      const enrolled = a.enrolled;
      const revenue = a.revenueCents;
      const estimated = a.estimatedCents;
      return { platform, campaigns: list.length, active: list.filter((c) => c.status === "active").length, t, crmLeads, enrolled, revenue, estimated };
    });
  }, [campaigns, byCampaign, range, attributionInput]);

  const top = React.useMemo(
    () =>
      campaigns
        .map((c) => ({ c, p: perf.get(c.id)! }))
        .filter((x) => x.p && x.p.spendCents > 0)
        .sort((a, b) => (b.p.roas ?? 0) - (a.p.roas ?? 0))
        .slice(0, 6),
    [campaigns, perf],
  );

  const insights = React.useMemo(() => {
    const plan = promotionPlan({ events, applications, campaigns, contents, statsByCampaign: byCampaign }, now);
    return marketingInsights({ campaigns, perf, byCampaign, experiments, adStats, events, applications, plan }, now);
  }, [events, applications, campaigns, contents, byCampaign, now, perf, experiments, adStats]);

  const deltaLabel = period === "12m" ? "vs 12 mois préc." : `vs ${range.days} j préc.`;
  const { cur, prev, crm, crmPrev } = kpi;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {PERIOD_LABEL[period]} · dépenses et clics lus dans les régies, leads et inscriptions comptés dans le CRM (dernier clic, utm_campaign).
        </p>
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: "30j", label: "30 j" },
            { value: "90j", label: "90 j" },
            { value: "12m", label: "12 mois" },
          ]}
        />
      </div>

      <section aria-label="Indicateurs clés" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Dépense publicitaire" value={moneyCompact(cur.spendCents)} delta={pctDelta(cur.spendCents, prev.spendCents)} deltaLabel={deltaLabel} upIsGood={false} icon={Euro} />
        <StatCard label="Clics" value={compactNumber(cur.clicks)} hint={`CTR ${percent(cur.ctr, 2)} · CPC ${cost(cur.cpcCents)}`} icon={MousePointerClick} />
        <StatCard label="Leads déclarés (régies)" value={number(cur.leads)} hint={`Coût par lead ${cost(cur.cplCents)}`} icon={Target} />
        <StatCard label="Leads CRM attribués" value={number(crm.leads)} delta={pctDelta(crm.leads, crmPrev.leads)} deltaLabel={deltaLabel} hint={crm.leads ? `${money(cur.spendCents / crm.leads)} par lead CRM` : undefined} icon={UserPlus} />
        <StatCard label="Inscriptions attribuées" value={number(crm.enrolled)} delta={pctDelta(crm.enrolled, crmPrev.enrolled)} deltaLabel={deltaLabel} hint={`Coût par inscription ${cost(kpi.cpaCents)}`} icon={UserCheck} />
        <StatCard label="ROAS" value={roasFmt(kpi.roas, crm.estimated > 0)} hint={`${revenueLabel(crm.revenue, crm.estimated, moneyCompact)} / dépense`} icon={TrendingUp} />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Dépense par régie</CardTitle>
              <CardDescription>En euros, par {series.grain}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ColumnChart
              labels={series.labels}
              series={[
                { name: "Meta", values: series.spend.meta },
                { name: "LinkedIn", values: series.spend.linkedin },
              ]}
              format={(v) => `${Math.round(v).toLocaleString("fr-FR")} €`}
              height={220}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Leads : régies vs CRM</CardTitle>
              <CardDescription>Ce que déclarent les régies et ce qui arrive vraiment en candidature</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <LineChart
              labels={series.labels}
              series={[
                { name: "Leads régies", values: series.leads },
                { name: "Candidatures attribuées", values: series.apps },
              ]}
              height={220}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <div>
              <CardTitle>Par régie</CardTitle>
              <CardDescription>{PERIOD_LABEL[period]}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-semibold">Régie</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Dépense</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">CTR</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">CPL régie</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Leads CRM</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Inscr.</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Coût / inscr.</th>
                    <th scope="col" className="py-2 text-right font-semibold">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {byPlatform.map((r) => (
                    <tr key={r.platform} className="border-b border-border last:border-0">
                      <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                        <span className="flex items-center gap-2">
                          <PlatformBadge platform={r.platform} />
                          <span className="text-xs font-normal text-muted-foreground">
                            {r.active}/{r.campaigns} active{r.active > 1 ? "s" : ""}
                          </span>
                        </span>
                      </th>
                      <td className="tabular py-2.5 pr-3 text-right">{money(r.t.spendCents)}</td>
                      <td className="tabular py-2.5 pr-3 text-right">{percent(r.t.ctr, 2)}</td>
                      <td className="tabular py-2.5 pr-3 text-right">{cost(r.t.cplCents)}</td>
                      <td className="tabular py-2.5 pr-3 text-right">{number(r.crmLeads)}</td>
                      <td className="tabular py-2.5 pr-3 text-right">{number(r.enrolled)}</td>
                      <td className="tabular py-2.5 pr-3 text-right">{cost(r.enrolled ? r.t.spendCents / r.enrolled : undefined)}</td>
                      <td className="tabular py-2.5 text-right font-medium">{roasFmt(r.t.spendCents ? r.revenue / r.t.spendCents : undefined, r.estimated > 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Les « leads » des régies (formulaires instantanés, pixel) et ceux du CRM ne se recouvrent pas exactement : bloqueurs, consentement refusé, attribution par vue… Pilotez sur le coût par inscription et le ROAS. Le ROAS repose sur les factures du CRM ; pour un inscrit sans facture (facturation tenue dans un autre outil), le CA est estimé au prix de son offre ou de sa session, HT, et le ROAS est précédé de « ≈ ».
            </p>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Meilleures campagnes</CardTitle>
              <CardDescription>ROAS depuis le lancement (CA HT attribué / dépense)</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {top.length ? (
              <ul className="divide-y divide-border">
                {top.map(({ c, p }) => (
                  <li key={c.id}>
                    <Link href={`/marketing/campagnes/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-surface-2/60 focus-visible:bg-surface-2/60">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {PLATFORM_SHORT[c.platform]} · {money(p.spendCents)} · {p.enrolled} inscr. · {cost(p.cpaCents)} / inscr.
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-sm font-semibold text-foreground">{roasFmt(p.roas, p.estimatedCents > 0)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucune dépense enregistrée.</p>
            )}
            <button type="button" onClick={() => onOpenTab("campagnes")} className="mt-2 text-xs font-medium text-accent-text hover:underline">
              Toutes les campagnes →
            </button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Points d'attention</CardTitle>
            <CardDescription>Règles vérifiables sur les données : dépenses inutiles, attribution cassée, tests à conclure, sessions en retard</CardDescription>
          </div>
          <Badge tone={insights.some((i) => i.tone === "danger") ? "danger" : insights.length ? "warning" : "success"} dot>
            {insights.length ? `${insights.length} point${insights.length > 1 ? "s" : ""}` : "Rien à signaler"}
          </Badge>
        </CardHeader>
        <CardContent>
          {insights.length ? (
            <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {insights.map((i) => {
                const Icon = i.tone === "success" ? CheckCircle2 : i.tone === "danger" || i.tone === "warning" ? AlertTriangle : Info;
                const body = (
                  <>
                    <Icon className={cn("mt-0.5 size-4 shrink-0", i.tone === "danger" ? "text-danger" : i.tone === "warning" ? "text-warning-text" : i.tone === "success" ? "text-success" : "text-info")} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{i.title}</span>
                      <span className="block text-xs text-muted-foreground">{i.detail}</span>
                    </span>
                  </>
                );
                return (
                  <li key={i.id}>
                    {i.href ? (
                      i.href.startsWith("/marketing?onglet=") ? (
                        <button type="button" onClick={() => onOpenTab(i.href!.endsWith("promotion") ? "promotion" : "campagnes")} className="flex w-full gap-2.5 rounded-md border border-border px-3 py-2.5 text-left hover:border-border-strong">
                          {body}
                        </button>
                      ) : (
                        <Link href={i.href} className="flex gap-2.5 rounded-md border border-border px-3 py-2.5 hover:border-border-strong">
                          {body}
                        </Link>
                      )
                    ) : (
                      <div className="flex gap-2.5 rounded-md border border-border px-3 py-2.5">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune anomalie détectée sur les campagnes, les tests et les sessions à venir.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
