"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarClock, CircleAlert, Radio, ShieldCheck, Wallet } from "lucide-react";
import type { DashboardData } from "../use-dashboard-data";
import { Badge, Card, CardContent, CardHeader, CardTitle, Progress, ProgressRing, StatCard } from "@/components/ui";
import { BarList, ColumnChart, Funnel, LineChart, Sparkline } from "@/components/charts";
import { StatusBadge } from "@/components/ui";
import { DEAL_STAGES, EVENT_STATUSES, labelOf } from "@/lib/domain/constants";
import { compactNumber, date, dateRange, money, moneyCompact, relative } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Design 1 — « Cockpit » : mission control dense, bandeau sombre néon StartupWeek. */
export function CockpitHome({ data }: { data: DashboardData }) {
  const { kpis, now } = data;
  const firstName = data.user?.name.split(" ")[0] ?? "";
  return (
    <div className="space-y-6">
      {/* ── Bandeau mission control (toujours sombre) ── */}
      <section className="scope-dark relative -mx-4 -mt-6 overflow-hidden border-b border-border px-4 pb-6 pt-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-20 -top-24 size-[380px] rounded-full bg-[radial-gradient(circle,rgba(0,245,255,.18),transparent_65%)]" aria-hidden="true" />
        <div className="relative">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-accent-text">Mission control · {date(new Date(now).toISOString(), "EEEE d MMMM")}</p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Bonjour {firstName}, voici l'état de StartupWeek.</h1>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {data.running.length ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ring/40 bg-accent-soft px-2.5 py-1 text-accent-text">
                  <Radio className="size-3.5" style={{ animation: "sw-pulse-dot 1.6s infinite" }} /> {data.running.map((e) => e.code).join(", ")} en cours
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                <CalendarClock className="size-3.5" /> {kpis.upcomingSessions} sessions à venir · {kpis.enrolledUpcoming} inscrits
              </span>
              {kpis.auditInDays !== undefined ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                  <ShieldCheck className="size-3.5" /> Audit Qualiopi J-{kpis.auditInDays}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <NeonKpi label="Encaissé · 30 j" value={moneyCompact(kpis.cash30)} delta={kpis.cash30Delta} trend={data.cashTrend} href="/facturation" />
            <NeonKpi label="Candidatures · 7 j" value={String(kpis.apps7)} delta={kpis.apps7Delta} trend={data.appsByWeek.values} href="/candidatures" />
            <NeonKpi label="Remplissage moyen" value={`${kpis.avgFill} %`} hint={`6 prochaines sessions`} trend={data.upcoming.slice(0, 8).map((e) => e.stats.fillRate)} href="/sessions" />
            <Link href="/qualiopi" className="group flex items-center gap-4 rounded-lg border border-border bg-surface/60 p-4 backdrop-blur transition-colors hover:border-ring/50">
              <ProgressRing value={kpis.readiness} size={60} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Préparation Qualiopi</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">32 indicateurs suivis</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-accent-text">
                  Plan d'actions <ArrowUpRight className="size-3" />
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Finances + à traiter ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <div>
              <CardTitle>Encaissements — 12 mois</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Par moyen de paiement (Stripe, virement, OPCO)</p>
            </div>
            <Link href="/facturation" className="text-xs text-accent-text hover:underline">
              Facturation →
            </Link>
          </CardHeader>
          <CardContent>
            <ColumnChart
              labels={data.cashByMonth.labels}
              series={[
                { name: "Stripe", values: data.cashByMonth.stripe },
                { name: "Virement", values: data.cashByMonth.virement },
                { name: "OPCO", values: data.cashByMonth.opco },
              ]}
              format={(v) => `${compactNumber(v)} €`}
              height={230}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleAlert className="size-4 text-danger" /> À traiter
            </CardTitle>
            <Badge tone={data.alerts.some((a) => a.tone === "danger") ? "danger" : "neutral"}>{data.alerts.length}</Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="space-y-1">
              {data.alerts.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <Link href={a.href} className="flex gap-2.5 rounded-md px-2 py-2 hover:bg-surface-2">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", a.tone === "danger" ? "bg-danger" : a.tone === "warning" ? "bg-warning" : a.tone === "accent" ? "bg-primary" : "bg-info")} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{a.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{a.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {data.alerts.length === 0 ? <li className="py-6 text-center text-sm text-muted-foreground">Rien d'urgent.</li> : null}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* ── Tuiles secondaires ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="À encaisser" value={moneyCompact(kpis.receivable)} hint="factures ouvertes" icon={Wallet} href="/facturation?onglet=relances" />
        <StatCard label="En retard" value={moneyCompact(kpis.overdueAmount)} hint={`${kpis.overdueCount} facture${kpis.overdueCount > 1 ? "s" : ""}`} href="/facturation?statut=en_retard" className={kpis.overdueCount ? "border-warning/40" : undefined} />
        <StatCard label="Pipeline pondéré" value={moneyCompact(kpis.weightedPipeline)} hint={`${kpis.openDeals} opportunités`} href="/pipeline" />
        <StatCard label="Satisfaction à chaud" value={kpis.satisfaction ? `${kpis.satisfaction.toLocaleString("fr-FR")}/5` : "—"} hint={`NPS ${kpis.nps > 0 ? "+" : ""}${kpis.nps} · ${kpis.evalCount} avis`} href="/qualiopi/satisfaction" />
        <StatCard label="Demandes à traiter" value={String(kpis.newSubmissions)} hint={kpis.lateSubmissions ? `${kpis.lateSubmissions} hors délai 48 h` : "toutes dans les délais"} href="/demandes" className={kpis.lateSubmissions ? "border-danger/40" : undefined} />
        <StatCard label="Conversion 90 j" value={`${kpis.conversion90} %`} hint="candidature → inscrite" href="/analytics" />
      </div>

      {/* ── Sessions + funnel ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Prochaines sessions</CardTitle>
            <Link href="/sessions" className="text-xs text-accent-text hover:underline">
              Toutes les sessions →
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="divide-y divide-border">
              {data.upcoming.slice(0, 6).map((e) => (
                <li key={e.id}>
                  <Link href={`/sessions/${e.id}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 hover:bg-surface-2/50 sm:grid-cols-[4.5rem_1fr_9rem_auto]">
                    <span className="rounded-md bg-accent-soft px-1.5 py-1 text-center font-mono text-xs font-medium text-accent-text">{e.code}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{e.city}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {dateRange(e.startAt, e.endAt)} · {e.mode === "distanciel" ? "En ligne" : "Présentiel"} · J-{e.daysLeft}
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      {e.orgId ? (
                        <span className="text-[11px] text-muted-foreground">Session B2B · {e.capacity} participants</span>
                      ) : (
                        <>
                      <span className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                        <span className="tabular">
                          {e.stats.enrolled}/{e.capacity} inscrits
                        </span>
                        <span className="tabular">{e.stats.pipeline} en cours</span>
                      </span>
                      <Progress value={e.stats.fillRate} tone={e.stats.fillRate >= 80 ? "success" : e.stats.belowMinimum && e.daysLeft < 21 ? "warning" : "accent"} label={`Remplissage ${e.code}`} />
                        </>
                      )}
                    </span>
                    <span className="text-right">
                      <StatusBadge options={EVENT_STATUSES} value={e.status} className="hidden md:inline-flex" />
                      <span className="tabular block text-xs text-muted-foreground md:mt-1">{money(e.stats.revenue)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader>
            <div>
              <CardTitle>Entonnoir — 90 jours</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.visitors90.toLocaleString("fr-FR")} visiteurs → {data.funnel[0]?.value ?? 0} candidatures (
                {data.visitors90 ? ((100 * (data.funnel[0]?.value ?? 0)) / data.visitors90).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : 0} %) → inscription payée
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Funnel steps={data.funnel} />
          </CardContent>
        </Card>
      </div>

      {/* ── Tendances + pipeline + activité ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>Candidatures par semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart series={[{ name: "Candidatures", values: data.appsByWeek.values }]} labels={data.appsByWeek.labels} height={200} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Pipeline B2B</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={data.pipelineByStage.map((p) => ({ key: p.stage, label: labelOf(DEAL_STAGES, p.stage as never), value: p.amount }))} format={(v) => moneyCompact(v)} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="space-y-2.5">
              {data.recentActivity.slice(0, 7).map((a) => (
                <li key={a.id} className="text-xs">
                  <p className="line-clamp-2 text-foreground">{a.summary}</p>
                  <p className="mt-0.5 text-faint">{relative(a.at, now)}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NeonKpi({ label, value, delta, hint, trend, href }: { label: string; value: string; delta?: number; hint?: string; trend?: number[]; href: string }) {
  return (
    <Link href={href} className="group rounded-lg border border-border bg-surface/60 p-4 backdrop-blur transition-colors hover:border-ring/50">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{value}</p>
          {delta !== undefined ? (
            <p className={cn("mt-0.5 text-xs font-medium", delta >= 0 ? "text-success-text" : "text-danger-text")}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toLocaleString("fr-FR")} % <span className="font-normal text-faint">vs préc.</span>
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-faint">{hint}</p>
          )}
        </div>
        {trend && trend.length > 1 ? <Sparkline values={trend} className="h-9 w-20 shrink-0 sm:w-24" /> : null}
      </div>
    </Link>
  );
}
