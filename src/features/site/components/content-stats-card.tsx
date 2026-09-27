"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { PencilLine } from "lucide-react";
import { BarList, ColumnChart, seriesColor } from "@/components/charts";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FormField, Input, Segmented, useToast } from "@/components/ui";
import { useActions, useCollection, useContentPerformance } from "@/lib/hooks";
import { useCrm } from "@/lib/store";
import { isSiteMeasured, lastMonths, lastWeeks } from "@/lib/domain/selectors";
import type { ContentItem, ContentStatDay } from "@/lib/domain/types";
import { compactNumber, date, number, percent } from "@/lib/format";
import { PERIOD_DAYS, TRAFFIC_SOURCES, type Period } from "@/features/analytics/lib/metrics";
import { MiniStat, NoData } from "@/features/analytics/components/parts";

const key = (ms: number | Date) => format(ms, "yyyy-MM-dd");

/** Vues par jour (30 j), par semaine (90 j) ou par mois (12 mois) : au plus ~30 colonnes dans la colonne latérale. */
function viewSeries(rows: ContentStatDay[], period: Period, now: number) {
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(r.date.slice(0, 10), (byDay.get(r.date.slice(0, 10)) ?? 0) + r.views);
  const sumBetween = (start: number, end: number) => {
    let v = 0;
    // addDays (et non +24 h) : les jours de changement d'heure durent 23 ou 25 h.
    for (let d = new Date(start); d.getTime() < end; d = addDays(d, 1)) v += byDay.get(key(d)) ?? 0;
    return v;
  };
  if (period === "30j") {
    const today = new Date(now);
    const first = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
    const days = Array.from({ length: 30 }, (_, i) => addDays(first, i));
    return { labels: days.map((d) => format(d, "d MMM", { locale: fr }).replace(".", "")), values: days.map((d) => byDay.get(key(d)) ?? 0), grain: "jour" };
  }
  const buckets = period === "90j" ? lastWeeks(now, 13) : lastMonths(now, 12);
  return { labels: buckets.map((b) => b.label), values: buckets.map((b) => sumBetween(b.start, b.end)), grain: period === "90j" ? "semaine" : "mois" };
}

/** Statistiques d'un contenu : mesurées sur le site (articles du blog) ou saisies à la main (réseaux, newsletter…). */
export function ContentStatsCard({ item, editable, now }: { item: ContentItem; editable: boolean; now: number }) {
  const measured = isSiteMeasured(item);
  const perf = useContentPerformance();
  const contents = useCollection("contents");
  const p = perf.get(item.id);
  const isPublished = item.status === "publie";

  const rank = React.useMemo(() => {
    const leadsOf = (id: string) => perf.get(id)?.leads ?? 0;
    const sorted = contents.filter((c) => c.status === "publie").sort((a, b) => leadsOf(b.id) - leadsOf(a.id));
    const i = sorted.findIndex((c) => c.id === item.id);
    return i >= 0 ? { pos: i + 1, of: sorted.length } : null;
  }, [contents, perf, item.id]);

  const views = p?.views ?? 0;
  const clicks = p?.clicks ?? 0;
  const leads = p?.leads ?? 0;
  const ratios = (
    <ul className="space-y-1 text-xs text-muted-foreground">
      <li className="flex justify-between">
        <span>Taux de clic</span>
        <span className="tabular font-medium text-foreground">{views ? percent((clicks / views) * 100, 1) : "—"}</span>
      </li>
      <li className="flex justify-between">
        <span>Clic → lead</span>
        <span className="tabular font-medium text-foreground">{clicks ? percent((leads / clicks) * 100, 1) : "—"}</span>
      </li>
      {rank && isPublished ? (
        <li className="flex justify-between">
          <span>Classement (leads)</span>
          <span className="tabular font-medium text-foreground">
            {rank.pos}ᵉ / {rank.of}
          </span>
        </li>
      ) : null}
    </ul>
  );

  return measured ? (
    <MeasuredStats item={item} now={now} totals={{ views, clicks, leads, lastViewDate: p?.lastViewDate }} ratios={ratios} />
  ) : (
    <ManualStats item={item} editable={editable} ratios={ratios} />
  );
}

function MeasuredStats({
  item,
  now,
  totals,
  ratios,
}: {
  item: ContentItem;
  now: number;
  totals: { views: number; clicks: number; leads: number; lastViewDate?: string };
  ratios: React.ReactNode;
}) {
  const [period, setPeriod] = React.useState<Period>("30j");
  const allStats = useCrm((s) => s.contentStats);
  const rows = React.useMemo(() => allStats.filter((r) => r.contentId === item.id), [allStats, item.id]);

  const view = React.useMemo(() => {
    const today = new Date(now);
    const startKey = key(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (PERIOD_DAYS[period] - 1)));
    const inPeriod = rows.filter((r) => r.date.slice(0, 10) >= startKey);
    const sum = (k: "views" | "visitors" | "clicks" | "leads") => inPeriod.reduce((s, r) => s + r[k], 0);
    const sources = TRAFFIC_SOURCES.map((s, i) => ({ key: s.key, label: s.label, color: seriesColor(i), value: inPeriod.reduce((a, r) => a + (r.sources?.[s.key] ?? 0), 0) }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
    return { views: sum("views"), visitors: sum("visitors"), clicks: sum("clicks"), leads: sum("leads"), sources, series: viewSeries(rows, period, now) };
  }, [rows, period, now]);

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <div>
          <CardTitle>Statistiques</CardTitle>
          <CardDescription>Mesurées sur le site, sans cookie · actualisées à chaque chargement du CRM</CardDescription>
        </div>
        <Segmented<Period>
          size="xs"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "30j", label: "30 j" },
            { value: "90j", label: "90 j" },
            { value: "12m", label: "12 mois" },
          ]}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <NoData>
            {item.status === "publie"
              ? "Aucune lecture mesurée pour l'instant : les vues remontent dès que l'article est lu sur le site."
              : "Disponibles une fois l'article publié et lu sur le site."}
          </NoData>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Vues" value={number(view.views)} />
              <MiniStat label="Lecteurs" value={number(view.visitors)} hint="uniques par jour" />
              <MiniStat label="Clics" value={number(view.clicks)} hint="liens de l'article" />
              <MiniStat label="Leads" value={number(view.leads)} hint="formulaires après lecture" />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">Vues par {view.series.grain}</p>
              <ColumnChart labels={view.series.labels} series={[{ name: "Vues", values: view.series.values }]} format={(v) => compactNumber(v)} height={150} />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">Lecteurs par source</p>
              {view.sources.length ? (
                <BarList items={view.sources.map((s) => ({ key: s.key, label: s.label, value: s.value, color: s.color }))} format={(v) => number(v)} />
              ) : (
                <p className="text-xs text-muted-foreground">Aucun lecteur sur la période.</p>
              )}
            </div>
          </>
        )}
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          Depuis la publication : <span className="tabular font-medium text-foreground">{number(totals.views)}</span> vues ·{" "}
          <span className="tabular font-medium text-foreground">{number(totals.clicks)}</span> clics ·{" "}
          <span className="tabular font-medium text-foreground">{number(totals.leads)}</span> leads
          {totals.lastViewDate ? ` · dernière lecture le ${date(totals.lastViewDate, "d MMM yyyy")}` : ""}
        </p>
        {ratios}
      </CardContent>
    </Card>
  );
}

const MANUAL_HINT: Record<string, string> = {
  linkedin: "Relevez les chiffres dans les statistiques du post LinkedIn (impressions, clics, leads obtenus).",
  instagram: "Relevez les chiffres dans les statistiques Instagram (vues, clics sur le lien, leads obtenus).",
  newsletter: "Relevez les chiffres dans l'outil d'emailing (ouvertures, clics, leads obtenus).",
};

function ManualStats({ item, editable, ratios }: { item: ContentItem; editable: boolean; ratios: React.ReactNode }) {
  const { update } = useActions();
  const toast = useToast();
  const m = item.metrics;
  const [draft, setDraft] = React.useState<{ views: string; clicks: string; leads: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const start = () => {
    setDraft({ views: String(m.views), clicks: String(m.clicks), leads: String(m.leads) });
    setError(null);
  };
  const save = () => {
    if (!draft) return;
    const parsed = { views: Number(draft.views), clicks: Number(draft.clicks), leads: Number(draft.leads) };
    if (Object.values(parsed).some((v) => !Number.isInteger(v) || v < 0)) {
      setError("Nombres entiers positifs uniquement.");
      return;
    }
    update("contents", item.id, { metrics: parsed }, { log: `Statistiques saisies : ${number(parsed.views)} vues · ${number(parsed.clicks)} clics · ${number(parsed.leads)} leads` });
    toast({ title: "Statistiques enregistrées" });
    setDraft(null);
  };

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <div>
          <CardTitle>Statistiques</CardTitle>
          <CardDescription>
            {MANUAL_HINT[item.channel] ?? "Seuls les articles du blog sont mesurés automatiquement sur le site. Pour ce contenu, saisissez les chiffres relevés ailleurs."}
          </CardDescription>
        </div>
        <Badge>Saisie manuelle</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {draft ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="grid grid-cols-3 gap-2">
              {(["views", "clicks", "leads"] as const).map((k) => (
                <FormField key={k} label={k === "views" ? "Vues" : k === "clicks" ? "Clics" : "Leads"} htmlFor={`ct-metric-${k}`}>
                  <Input
                    id={`ct-metric-${k}`}
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={draft[k]}
                    onChange={(e) => setDraft((d) => (d ? { ...d, [k]: e.target.value } : d))}
                  />
                </FormField>
              ))}
            </div>
            {error ? <p className="text-xs text-danger-text">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setDraft(null)}>
                Annuler
              </Button>
              <Button type="submit" size="sm">
                Enregistrer
              </Button>
            </div>
          </form>
        ) : (
          <>
            <dl className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Vues", value: number(m.views) },
                { label: "Clics", value: number(m.clicks) },
                { label: "Leads", value: number(m.leads) },
              ].map((s) => (
                <div key={s.label} className="rounded-md bg-surface-2 px-2 py-2.5">
                  <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
                  <dd className="tabular mt-0.5 text-lg font-semibold text-foreground">{s.value}</dd>
                </div>
              ))}
            </dl>
            {editable ? (
              <Button variant="secondary" size="sm" className="w-full" onClick={start}>
                <PencilLine /> Mettre à jour les chiffres
              </Button>
            ) : null}
          </>
        )}
        {ratios}
      </CardContent>
    </Card>
  );
}
