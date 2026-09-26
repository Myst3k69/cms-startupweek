"use client";

import * as React from "react";
import Link from "next/link";
import { BarList, ColumnChart } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Segmented } from "@/components/ui";
import { useCollection, useLookup } from "@/lib/hooks";
import { invoiceTotal, sessionStats } from "@/lib/domain/selectors";
import { money, moneyCompact, number, percent } from "@/lib/format";
import {
  REVENUE_MODE_GROUPS,
  REVENUE_OFFER_GROUPS,
  forecast,
  inCur,
  isRevenueInvoice,
  modeGroup,
  offerGroup,
  revenueBuckets,
  revenueSeries,
  type Period,
  type Range,
  type RevenueLookups,
} from "../lib/metrics";
import { MiniStat, NoData } from "./parts";

type Split = "offre" | "mode";

export function RevenueSection({ period, range, now }: { period: Period; range: Range; now: number }) {
  const invoices = useCollection("invoices");
  const applications = useCollection("applications");
  const events = useCollection("events");
  const deals = useCollection("deals");
  const apps = useLookup("applications");
  const offers = useLookup("offers");
  const orgs = useLookup("organizations");
  const eventsById = useLookup("events");
  const [split, setSplit] = React.useState<Split>("offre");

  const lookups = React.useMemo<RevenueLookups>(() => ({ apps, offers, orgs, events: eventsById }), [apps, offers, orgs, eventsById]);
  const { buckets, grain } = React.useMemo(() => revenueBuckets(period, now), [period, now]);
  const series = React.useMemo(
    () =>
      split === "offre"
        ? revenueSeries(invoices, buckets, REVENUE_OFFER_GROUPS, (inv) => offerGroup(inv, lookups))
        : revenueSeries(invoices, buckets, REVENUE_MODE_GROUPS, (inv) => modeGroup(inv, lookups)),
    [invoices, buckets, split, lookups],
  );

  const kpis = React.useMemo(() => {
    const periodInv = invoices.filter((i) => isRevenueInvoice(i) && inCur(i.issuedAt, range));
    const revenue = periodInv.reduce((s, i) => s + invoiceTotal(i).ht, 0);
    const enrolled = applications.filter((a) => a.status === "inscrite" && inCur(a.submittedAt, range) && a.amountDueCents > 0);
    const basketBase = enrolled.length ? enrolled : applications.filter((a) => a.status === "inscrite" && a.amountDueCents > 0);
    const basket = basketBase.length ? basketBase.reduce((s, a) => s + a.amountDueCents, 0) / basketBase.length : 0;
    // CA par session (factures de la période rattachées à une session).
    const bySession = new Map<string, number>();
    for (const inv of periodInv) {
      const evId = inv.eventId ?? (inv.applicationId ? apps.get(inv.applicationId)?.eventId : undefined);
      if (!evId) continue;
      bySession.set(evId, (bySession.get(evId) ?? 0) + invoiceTotal(inv).ht);
    }
    const sessions = [...bySession.entries()]
      .map(([id, v]) => ({ ev: eventsById.get(id), v }))
      .filter((x) => x.ev && x.v > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, 8);
    return { revenue, basket, basketAllTime: !enrolled.length, sessions };
  }, [invoices, applications, range, apps, eventsById]);

  const fc = React.useMemo(() => forecast(events, applications, deals, now), [events, applications, deals, now]);
  const fmt = (v: number) => moneyCompact(v);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex-wrap">
          <div>
            <CardTitle>Chiffre d'affaires facturé (HT) par {grain}</CardTitle>
            <CardDescription>Factures émises (hors brouillons et annulées), avoirs déduits</CardDescription>
          </div>
          <Segmented<Split>
            size="xs"
            value={split}
            onChange={setSplit}
            options={[
              { value: "offre", label: "Par offre" },
              { value: "mode", label: "Par mode" },
            ]}
          />
        </CardHeader>
        <CardContent>
          {series.length === 0 ? <NoData>Aucune facture émise sur la période.</NoData> : <ColumnChart labels={buckets.map((b) => b.label)} series={series} format={fmt} height={250} />}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="CA facturé HT" value={moneyCompact(kpis.revenue)} />
            <MiniStat label="Panier moyen B2C" value={kpis.basket ? money(kpis.basket) : "—"} hint={kpis.basketAllTime ? "toutes périodes (aucune inscription récente)" : "inscriptions de la période, TTC"} />
            <MiniStat label="Remplissage moyen" value={fc.soon.length ? percent(fc.fillRate) : "—"} hint={`${fc.soon.length} bootcamp${fc.soon.length > 1 ? "s" : ""} dans les ${fc.horizonDays} j`} />
            <MiniStat label="Sous le minimum" value={number(fc.below.length)} hint={fc.below.length ? `${fc.below.slice(0, 3).map((b) => b.ev.code).join(", ")} (départ < ${fc.horizonDays} j)` : `aucun départ à risque sous ${fc.horizonDays} j`} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Prévision (sessions à venir)</CardTitle>
              <CardDescription>Inscrits confirmés + pipeline pondéré</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="tabular text-2xl font-semibold tracking-tight text-foreground">{money(fc.total)}</p>
            <ul className="space-y-1.5 text-xs">
              {[
                { label: "Inscrits confirmés (TTC)", value: fc.enrolled, hint: `dont ${moneyCompact(fc.collected)} encaissés` },
                { label: "Candidatures pondérées", value: fc.pipeline, hint: "nouvelle 10 % · qualifiée 25 % · entretien 45 % · acceptée 80 %" },
                { label: "Opportunités B2B pondérées (HT)", value: fc.b2b, hint: "montant × probabilité de l'étape" },
              ].map((r) => (
                <li key={r.label} className="rounded-md bg-surface-2/70 px-2.5 py-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="tabular font-medium text-foreground">{moneyCompact(r.value)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-faint">{r.hint}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>CA par session</CardTitle>
              <CardDescription>Facturé HT sur la période</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {kpis.sessions.length === 0 ? (
              <NoData>Aucune facture rattachée à une session.</NoData>
            ) : (
              <BarList
                format={fmt}
                items={kpis.sessions.map(({ ev, v }) => {
                  const st = sessionStats(ev!, applications);
                  return {
                    key: ev!.id,
                    value: v,
                    hint: `· ${st.fillRate} %`,
                    label: (
                      <Link href={`/sessions/${ev!.id}`} className="hover:text-accent-text hover:underline" title={`${ev!.name} — remplissage ${st.fillRate} %`}>
                        <span className="font-mono text-[11px] text-muted-foreground">{ev!.code}</span> {ev!.city}
                      </Link>
                    ),
                  };
                })}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
