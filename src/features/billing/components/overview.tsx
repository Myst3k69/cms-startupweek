"use client";

import * as React from "react";
import { AlarmClock, Banknote, CreditCard, HandCoins, Receipt, Timer } from "lucide-react";
import type { Invoice, Offer, Payment } from "@/lib/domain/types";
import { cashIn, invoiceTotal, isOverdue, invoiceBalance, lastMonths, receivables } from "@/lib/domain/selectors";
import { money, moneyCompact } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Segmented, StatCard } from "@/components/ui";
import { BarList, ColumnChart, seriesColor } from "@/components/charts";
import { averagePaymentDelay, DAY, estimateDso, isNumbered, METHOD_GROUPS, type BillingLookups } from "../lib";

const inRange = (iso: string, from: number, to: number) => {
  const v = new Date(iso).getTime();
  return v >= from && v < to;
};

export function BillingOverview({
  invoices,
  payments,
  offers,
  lookups,
  now,
  onOpenReminders,
}: {
  invoices: Invoice[];
  payments: Payment[];
  offers: Offer[];
  lookups: BillingLookups;
  now: number;
  onOpenReminders?: () => void;
}) {
  const [caView, setCaView] = React.useState<"session" | "offre">("session");

  const kpis = React.useMemo(() => {
    const d = new Date(now);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const yearStart = new Date(d.getFullYear(), 0, 1).getTime();
    const numbered = invoices.filter(isNumbered);
    const ht = (from: number) => numbered.filter((i) => inRange(i.issuedAt, from, now + DAY)).reduce((s, i) => s + invoiceTotal(i).ht, 0);
    const overdue = invoices.filter((i) => i.kind !== "avoir" && isOverdue(i, now));
    const rec = receivables(invoices, now);
    const openCount = invoices.filter((i) => i.kind !== "avoir" && isNumbered(i) && !["annulee", "payee"].includes(i.status) && invoiceBalance(i) > 0).length;
    const stripeMonth = payments.filter((p) => p.method === "stripe" && p.status === "reussi" && inRange(p.receivedAt, monthStart, now + DAY));
    const stripeFees = stripeMonth.reduce((s, p) => s + (p.feeCents ?? 0), 0);
    const stripeVolume = stripeMonth.reduce((s, p) => s + p.amountCents, 0);
    return {
      caMonth: ht(monthStart),
      caYear: ht(yearStart),
      year: d.getFullYear(),
      monthLabel: d.toLocaleDateString("fr-FR", { month: "long" }),
      cash30: cashIn(payments, now - 30 * DAY, now + DAY),
      cashPrev30: cashIn(payments, now - 60 * DAY, now - 30 * DAY),
      receivable: rec,
      openCount,
      overdueAmount: overdue.reduce((s, i) => s + invoiceBalance(i), 0),
      overdueCount: overdue.length,
      dso: estimateDso(invoices, now),
      avgDelay: averagePaymentDelay(invoices, payments, now),
      stripeFees,
      stripeRate: stripeVolume ? (stripeFees / stripeVolume) * 100 : 0,
    };
  }, [invoices, payments, now]);

  const months = React.useMemo(() => lastMonths(now, 12), [now]);

  const cashSeries = React.useMemo(() => {
    const ok = payments.filter((p) => p.status === "reussi");
    const series = METHOD_GROUPS.map((g, gi) => ({
      name: g.label,
      color: seriesColor(gi),
      values: months.map((m) => ok.filter((p) => g.methods.includes(p.method) && inRange(p.receivedAt, m.start, m.end)).reduce((s, p) => s + p.amountCents, 0)),
    }));
    // « Autres » n'apparaît que s'il y a des montants (Stripe / Virement / OPCO toujours affichés).
    return series.filter((s, i) => i < 3 || s.values.some((v) => v > 0));
  }, [payments, months]);

  const aging = [
    { key: "a", label: "À échoir", value: kpis.receivable.aEchoir, color: "var(--info)" },
    { key: "b", label: "Retard 1 à 30 j", value: kpis.receivable.j0_30, color: "var(--warning)" },
    { key: "c", label: "Retard 31 à 60 j", value: kpis.receivable.j31_60, color: "var(--serious)" },
    { key: "d", label: "Retard > 60 j", value: kpis.receivable.j60plus, color: "var(--danger)" },
  ];

  const revenueBy = React.useMemo(() => {
    const rows = invoices.filter((i) => isNumbered(i) && new Date(i.issuedAt).getTime() >= now - 365 * DAY);
    const map = new Map<string, { label: string; value: number }>();
    const add = (key: string, label: string, v: number) => {
      const cur = map.get(key) ?? { label, value: 0 };
      cur.value += v;
      map.set(key, cur);
    };
    for (const inv of rows) {
      const ht = invoiceTotal(inv).ht;
      if (caView === "session") {
        const ev = inv.eventId ? lookups.events.get(inv.eventId) : undefined;
        if (ev) add(ev.id, `${ev.code} · ${ev.name}`, ht);
        else add("_none", "Hors session (B2B, accompagnement…)", ht);
      } else {
        const app = inv.applicationId ? lookups.applications.get(inv.applicationId) : undefined;
        const byApp = app?.offerId ? offers.find((o) => o.id === app.offerId) : undefined;
        const labels = inv.lines.map((l) => l.label.toLowerCase()).join(" ");
        const byLabel = byApp ?? offers.find((o) => labels.includes(o.name.toLowerCase()) || (o.code && labels.includes(o.code.toLowerCase())));
        const ev = inv.eventId ? lookups.events.get(inv.eventId) : undefined;
        if (byLabel) add(byLabel.id, byLabel.name, ht);
        else if (ev) add(`kind_${ev.mode}`, ev.mode === "distanciel" ? "StartupWeek Distanciel" : "StartupWeek Présentiel", ht);
        else add("_other", "Autres prestations", ht);
      }
    }
    return [...map.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .filter((v) => v.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [invoices, offers, lookups, caView, now]);

  const cashTrend = months.map((_, i) => cashSeries.reduce((s, se) => s + (se.values[i] ?? 0), 0));
  const cashDelta = kpis.cashPrev30 ? Math.round(((kpis.cash30 - kpis.cashPrev30) / kpis.cashPrev30) * 1000) / 10 : undefined;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard label={`CA facturé HT · ${kpis.monthLabel}`} value={money(kpis.caMonth)} hint={`Année ${kpis.year} : ${money(kpis.caYear)} HT`} icon={Receipt} />
        <StatCard label="Encaissé sur 30 jours" value={money(kpis.cash30)} delta={cashDelta} deltaLabel="vs 30 j préc." trend={cashTrend} icon={Banknote} />
        <StatCard label="À encaisser" value={money(kpis.receivable.total)} hint={`${kpis.openCount} facture${kpis.openCount > 1 ? "s" : ""} ouverte${kpis.openCount > 1 ? "s" : ""}`} icon={HandCoins} />
        {kpis.overdueCount && onOpenReminders ? (
          <button type="button" onClick={onOpenReminders} className="block h-full w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${kpis.overdueCount} factures en retard : ouvrir les relances`}>
            <StatCard
              label="En retard"
              value={money(kpis.overdueAmount)}
              hint={`${kpis.overdueCount} facture${kpis.overdueCount > 1 ? "s" : ""} échue${kpis.overdueCount > 1 ? "s" : ""} — voir les relances`}
              icon={AlarmClock}
              className="border-danger/30 transition-colors hover:border-danger/60"
            />
          </button>
        ) : (
          <StatCard label="En retard" value={money(kpis.overdueAmount)} hint={kpis.overdueCount ? `${kpis.overdueCount} facture${kpis.overdueCount > 1 ? "s" : ""} échue${kpis.overdueCount > 1 ? "s" : ""}` : "Aucune facture échue"} icon={AlarmClock} />
        )}
        <StatCard
          label="DSO estimé"
          value={kpis.dso === null ? "—" : `${kpis.dso} j`}
          hint={kpis.avgDelay === null ? "Créances / CA TTC 90 j × 90" : `Délai moyen constaté : ${kpis.avgDelay} j`}
          icon={Timer}
        />
        <StatCard label="Frais Stripe du mois" value={money(kpis.stripeFees, true)} hint={kpis.stripeFees ? `${kpis.stripeRate.toFixed(2).replace(".", ",")} % du volume carte` : "Aucun paiement carte ce mois-ci"} icon={CreditCard} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-12">
        <Card className="lg:col-span-2 xl:col-span-6">
          <CardHeader>
            <div>
              <CardTitle>Encaissements par mois</CardTitle>
              <CardDescription>12 derniers mois, par moyen de paiement (paiements réussis, TTC)</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ColumnChart labels={months.map((m) => m.label)} series={cashSeries} format={(v) => moneyCompact(v)} height={220} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader>
            <div>
              <CardTitle>Balance âgée</CardTitle>
              <CardDescription>Créances ouvertes : {money(kpis.receivable.total)} TTC</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {kpis.receivable.total > 0 ? (
              <BarList items={aging} format={(v) => money(v)} max={Math.max(1, ...aging.map((a) => a.value))} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucune créance ouverte.</p>
            )}
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader className="flex-wrap">
            <div>
              <CardTitle>CA HT par {caView === "session" ? "session" : "offre"}</CardTitle>
              <CardDescription>Pièces émises sur 12 mois (avoirs déduits)</CardDescription>
            </div>
            <Segmented
              size="xs"
              value={caView}
              onChange={setCaView}
              options={[
                { value: "session", label: "Session" },
                { value: "offre", label: "Offre" },
              ]}
            />
          </CardHeader>
          <CardContent>
            {revenueBy.length ? (
              <BarList items={revenueBy} format={(v) => moneyCompact(v)} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Aucune facture émise sur la période.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
