"use client";

import Link from "next/link";
import { ArrowUpRight, Award, Quote } from "lucide-react";
import type { DashboardData } from "../use-dashboard-data";
import { DonutChart } from "@/components/charts";
import { Badge, Progress, StatusBadge } from "@/components/ui";
import { CHANNELS, PROJECT_STAGES, QUALIOPI_CRITERIA, labelOf } from "@/lib/domain/constants";
import { compactNumber, date, dateRange, money, moneyCompact } from "@/lib/format";
import { useCollection } from "@/lib/hooks";
import { qualiopiReadiness } from "@/lib/domain/selectors";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  direct: "Direct",
  google: "Google",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  meta_ads: "Meta Ads",
  newsletter: "Newsletter",
  partenaires: "Partenaires",
};

function weekNumber(ts: number) {
  const d = new Date(ts);
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** Design 3 — « Studio » : brief éditorial de la semaine, grille bento, typographie serif. */
export function StudioHome({ data }: { data: DashboardData }) {
  const { now, kpis, week } = data;
  const indicators = useCollection("indicators");
  const next = data.upcoming[0];
  const season = data.upcoming.slice(0, 6);
  const nowIso = new Date(now).toISOString();
  const weekStartIso = new Date(now - 6 * 86_400_000).toISOString();
  const lateMsg = data.alerts.filter((a) => a.tone === "danger" || a.tone === "warning").slice(0, 3);

  return (
    <div className="-mx-4 -mt-6 min-h-full bg-paper px-4 pb-10 pt-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-10">
      <header className="mx-auto max-w-6xl border-b border-border-strong pb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="eyebrow text-muted-foreground">
            Brief hebdomadaire · Semaine {weekNumber(now)} · {dateRange(weekStartIso, nowIso)}
          </p>
          <p className="eyebrow text-accent-text">StartupWeek OS</p>
        </div>
        <h1 className="mt-4 max-w-4xl text-balance font-serif text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          {week.applications} candidatures, {week.enrolled} inscriptions et <em className="text-accent-text">{moneyCompact(week.cash)}</em> encaissés cette semaine.
        </h1>
        <p className="mt-5 max-w-3xl text-balance font-serif text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {next ? (
            <>
              Prochain départ : <span className="text-foreground">{next.name}</span>, dans {next.daysLeft} jours, {next.stats.enrolled} inscrits sur {next.capacity}.{" "}
            </>
          ) : null}
          {week.submissions} demandes sont arrivées par le site, {week.contentsPublished} contenus ont été publiés
          {week.complaints ? `, et ${week.complaints} réclamation${week.complaints > 1 ? "s" : ""} est à suivre` : ", sans aucune réclamation"}. La préparation Qualiopi atteint {kpis.readiness} %.
        </p>
      </header>

      <div className="mx-auto mt-8 grid max-w-6xl auto-rows-[minmax(0,auto)] grid-cols-1 gap-4 md:grid-cols-6">
        {/* Affiche de la prochaine session */}
        {next ? (
          <Link href={`/sessions/${next.id}`} className="group relative col-span-1 overflow-hidden rounded-2xl bg-sw-black text-white md:col-span-4 md:row-span-2">
            {next.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- visuels du site (domaine externe), pas d'optimisation nécessaire
              <img src={next.imageUrl} alt="" className="absolute inset-0 size-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-[1.03]" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" aria-hidden="true" />
            <div className="relative flex h-full min-h-[340px] flex-col justify-between p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs backdrop-blur">{next.code}</span>
                <span className="rounded-full bg-sw-cyan px-3 py-1 text-xs font-semibold text-sw-ink">J-{next.daysLeft}</span>
              </div>
              <div>
                <p className="eyebrow text-white/70">Prochain départ</p>
                <h2 className="mt-2 max-w-lg text-balance font-serif text-3xl leading-tight sm:text-4xl">{next.name}</h2>
                <p className="mt-2 text-sm text-white/75">
                  {dateRange(next.startAt, next.endAt)} · {next.mode === "distanciel" ? "En ligne" : next.city} · {money(next.priceCents)}
                </p>
                <div className="mt-5 max-w-sm">
                  <div className="mb-1.5 flex justify-between text-xs text-white/75">
                    <span>
                      {next.stats.enrolled}/{next.capacity} inscrits
                    </span>
                    <span>{next.stats.pipeline} candidatures en cours</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-sw-cyan" style={{ width: `${next.stats.fillRate}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ) : null}

        {/* Chiffre */}
        <Tile className="md:col-span-2">
          <p className="eyebrow text-muted-foreground">Encaissé · 30 jours</p>
          <p className="mt-3 font-serif text-5xl tracking-tight text-foreground">{moneyCompact(kpis.cash30)}</p>
          <p className={cn("mt-2 text-sm", kpis.cash30Delta >= 0 ? "text-success-text" : "text-danger-text")}>
            {kpis.cash30Delta >= 0 ? "+" : ""}
            {kpis.cash30Delta.toLocaleString("fr-FR")} % vs les 30 jours précédents
          </p>
          <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
            {moneyCompact(kpis.receivable)} restent à encaisser, dont {moneyCompact(kpis.overdueAmount)} en retard.
          </p>
        </Tile>

        {/* Verbatim */}
        <Tile className="md:col-span-2">
          <Quote className="size-6 text-accent-text" aria-hidden="true" />
          {data.verbatim ? (
            <>
              <blockquote className="mt-3 font-serif text-lg italic leading-snug text-foreground">« {data.verbatim.comment} »</blockquote>
              <p className="mt-3 text-xs text-muted-foreground">
                {data.verbatim.author} · {data.verbatim.session} · {date(data.verbatim.submittedAt)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Les verbatims des questionnaires apparaîtront ici.</p>
          )}
        </Tile>

        {/* Projet à la une */}
        {data.spotlight ? (
          <Tile className="md:col-span-3" href={`/projets/${data.spotlight.id}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow text-muted-foreground">Projet à la une</p>
              <StatusBadge options={PROJECT_STAGES} value={data.spotlight.stage} />
            </div>
            <h3 className="mt-3 font-serif text-3xl tracking-tight text-foreground">{data.spotlight.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{data.spotlight.tagline}</p>
            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
              {[
                ["Utilisateurs", data.spotlight.metrics.users ? compactNumber(data.spotlight.metrics.users) : "—"],
                ["Liste d'attente", data.spotlight.metrics.waitlist ? compactNumber(data.spotlight.metrics.waitlist) : "—"],
                ["MRR", data.spotlight.metrics.mrrCents ? moneyCompact(data.spotlight.metrics.mrrCents) : "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] text-muted-foreground">{k}</dt>
                  <dd className="font-serif text-xl text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            {data.spotlight.awards.length ? (
              <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-warning-text">
                <Award className="size-3.5" /> {data.spotlight.awards.join(" · ")}
              </p>
            ) : null}
          </Tile>
        ) : null}

        {/* Calendrier éditorial */}
        <Tile className="md:col-span-3" href="/contenus">
          <p className="eyebrow text-muted-foreground">Au programme éditorial</p>
          <ul className="mt-3 divide-y divide-border">
            {data.nextContents.length === 0 ? <li className="py-3 text-sm text-muted-foreground">Aucun contenu planifié.</li> : null}
            {data.nextContents.map((c) => (
              <li key={c.id} className="flex items-baseline gap-4 py-2.5">
                <span className="w-14 shrink-0 font-serif text-sm text-muted-foreground">{date(c.scheduledAt, "d MMM")}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{c.title}</span>
                <Badge tone="neutral" className="shrink-0">
                  {labelOf(CHANNELS, c.channel)}
                </Badge>
              </li>
            ))}
          </ul>
        </Tile>

        {/* Saison */}
        <Tile className="md:col-span-6" href="/sessions">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow text-muted-foreground">La saison</p>
            <span className="inline-flex items-center gap-1 text-xs text-accent-text">
              Toutes les sessions <ArrowUpRight className="size-3" />
            </span>
          </div>
          <ol className="scrollbar-thin -mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-1">
            {season.map((e) => (
              <li key={e.id} className="w-52 shrink-0 rounded-xl border border-border bg-surface p-3">
                <p className="font-mono text-[11px] text-muted-foreground">{e.code}</p>
                <p className="mt-1 truncate font-serif text-lg text-foreground">{e.city}</p>
                <p className="text-xs text-muted-foreground">{dateRange(e.startAt, e.endAt)}</p>
                <Progress value={e.stats.fillRate} className="mt-3" label={`Remplissage ${e.code}`} tone={e.stats.fillRate >= 80 ? "success" : "accent"} />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {e.stats.enrolled}/{e.capacity} · {money(e.priceCents)}
                </p>
              </li>
            ))}
          </ol>
        </Tile>

        {/* Qualiopi */}
        <Tile className="md:col-span-2" href="/qualiopi">
          <p className="eyebrow text-muted-foreground">Qualiopi · audit {kpis.auditInDays !== undefined ? `J-${kpis.auditInDays}` : ""}</p>
          <p className="mt-3 font-serif text-5xl tracking-tight text-foreground">{kpis.readiness} %</p>
          <ul className="mt-4 space-y-1.5">
            {QUALIOPI_CRITERIA.map((c) => (
              <li key={c.code} className="grid grid-cols-[1.25rem_1fr_2.5rem] items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-mono">C{c.code}</span>
                <Progress value={qualiopiReadiness(indicators, c.code)} label={c.short} />
                <span className="tabular text-right">{qualiopiReadiness(indicators, c.code)} %</span>
              </li>
            ))}
          </ul>
        </Tile>

        {/* Sources */}
        <Tile className="md:col-span-2">
          <p className="eyebrow text-muted-foreground">D'où viennent les visiteurs · 30 j</p>
          <DonutChart
            className="mt-4"
            size={120}
            thickness={14}
            data={data.topSources.slice(0, 5).map((x) => ({ label: SOURCE_LABEL[x.label] ?? x.label, value: x.value }))}
            center={<span className="font-serif text-lg text-foreground">{compactNumber(data.topSources.reduce((a, x) => a + x.value, 0))}</span>}
            format={(v) => compactNumber(v)}
          />
        </Tile>

        {/* À ne pas oublier */}
        <Tile className="md:col-span-2">
          <p className="eyebrow text-muted-foreground">À ne pas oublier</p>
          <ul className="mt-3 space-y-3">
            {lateMsg.length === 0 ? <li className="text-sm text-muted-foreground">Rien qui ne presse.</li> : null}
            {lateMsg.map((a) => (
              <li key={a.id}>
                <Link href={a.href} className="group block">
                  <span className="block font-serif text-base leading-snug text-foreground group-hover:text-accent-text">{a.title}</span>
                  <span className="block text-xs text-muted-foreground">{a.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Tile>
      </div>
    </div>
  );
}

function Tile({ children, className, href }: { children: React.ReactNode; className?: string; href?: string }) {
  const cls = cn("rounded-2xl border border-border bg-surface/70 p-5 sm:p-6", href && "transition-colors hover:border-border-strong hover:bg-surface", className);
  if (href) {
    return (
      <Link href={href} className={cn("block", cls)}>
        {children}
      </Link>
    );
  }
  return <div className={cls}>{children}</div>;
}
