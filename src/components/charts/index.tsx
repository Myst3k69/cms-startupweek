"use client";

/**
 * Graphiques SVG maison (aucune dépendance) — spécifications dataviz :
 * traits 2px, barres ≤ 24px à extrémité arrondie 4px ancrées sur la ligne de base,
 * grille en filet 1px discret, légende dès 2 séries, infobulle au survol,
 * textes en encre (jamais la couleur de la série), palette catégorielle en ordre fixe.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)", "var(--series-7)", "var(--series-8)"];
export const seriesColor = (i: number) => SERIES[Math.min(i, SERIES.length - 1)];

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T>(null);
  const [w, setW] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setW(Math.floor(entries[0].contentRect.width)));
    ro.observe(el);
    setW(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceMax(max: number, ticks = 4): { max: number; step: number } {
  if (max <= 0) return { max: ticks, step: 1 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { max: Math.ceil(max / step) * step, step };
}

const defaultFmt = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

export function Legend({ items, className }: { items: { label: string; color: string; value?: React.ReactNode }[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: it.color }} aria-hidden="true" />
          <span>{it.label}</span>
          {it.value !== undefined ? <span className="tabular font-medium text-foreground">{it.value}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: React.ReactNode }) {
  const left = Math.min(Math.max(x, 70), width - 70);
  return (
    <div className="pointer-events-none absolute z-10 min-w-32 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-md" style={{ left, top: y - 8 }}>
      {children}
    </div>
  );
}

/* ─────────────── Sparkline ─────────────── */

export function Sparkline({ values, className, color = "var(--primary)" }: { values: number[]; className?: string; color?: string }) {
  const w = 100;
  const h = 32;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("overflow-visible", className)} aria-hidden="true">
      <path d={`${d}L${w},${h}L0,${h}Z`} fill={color} opacity={0.1} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ─────────────── Courbes (1..n séries) ─────────────── */

export interface LineSeries {
  name: string;
  values: number[];
  color?: string;
}

export function LineChart({
  series,
  labels,
  height = 220,
  format = defaultFmt,
  area = true,
  className,
  showLegend = true,
}: {
  series: LineSeries[];
  labels: string[];
  height?: number;
  format?: (v: number) => string;
  area?: boolean;
  className?: string;
  showLegend?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<number | null>(null);
  const pad = { l: 44, r: 12, t: 12, b: 24 };
  const n = labels.length;
  const rawMax = Math.max(0, ...series.flatMap((s) => s.values));
  const { max, step } = niceMax(rawMax);
  const iw = Math.max(0, width - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 64))));

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = (e.target as SVGRectElement).getBoundingClientRect();
    const rel = e.clientX - rect.left;
    const i = Math.round((rel / rect.width) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div className={cn("w-full", className)}>
      {showLegend && series.length > 1 ? <Legend className="mb-2" items={series.map((s, i) => ({ label: s.name, color: s.color ?? seriesColor(i) }))} /> : null}
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 ? (
          <svg width={width} height={height} role="img" aria-label={series.map((s) => s.name).join(", ")}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
                <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-faint text-[10px] tabular">
                  {format(t)}
                </text>
              </g>
            ))}
            {labels.map((l, i) =>
              (i % labelEvery === 0 && n - 1 - i >= labelEvery) || i === n - 1 ? (
                <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-faint text-[10px]">
                  {l}
                </text>
              ) : null,
            )}
            {series.map((s, si) => {
              const color = s.color ?? seriesColor(si);
              const d = s.values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");
              return (
                <g key={s.name}>
                  {area ? <path d={`${d}L${x(s.values.length - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={color} opacity={series.length > 1 ? 0.06 : 0.1} /> : null}
                  <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  <circle cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1] ?? 0)} r={4} fill={color} stroke="var(--chart-surface)" strokeWidth={2} />
                </g>
              );
            })}
            {hover !== null ? (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--axis)" strokeWidth={1} />
                {series.map((s, si) => (
                  <circle key={s.name} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4.5} fill={s.color ?? seriesColor(si)} stroke="var(--chart-surface)" strokeWidth={2} />
                ))}
              </g>
            ) : null}
            <rect x={pad.l} y={pad.t} width={iw} height={ih} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
          </svg>
        ) : null}
        {hover !== null && width > 0 ? (
          <Tooltip x={x(hover)} y={Math.min(...series.map((s) => y(s.values[hover] ?? 0)))} width={width}>
            <div className="mb-1 font-medium text-foreground">{labels[hover]}</div>
            {series.map((s, si) => (
              <div key={s.name} className="flex items-center justify-between gap-3 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: s.color ?? seriesColor(si) }} />
                  {s.name}
                </span>
                <span className="tabular font-medium text-foreground">{format(s.values[hover] ?? 0)}</span>
              </div>
            ))}
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}

/* ─────────────── Colonnes (simples ou empilées) ─────────────── */

export function ColumnChart({
  labels,
  series,
  height = 220,
  format = defaultFmt,
  className,
  stacked = true,
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  format?: (v: number) => string;
  className?: string;
  stacked?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<number | null>(null);
  const pad = { l: 44, r: 8, t: 12, b: 24 };
  const n = labels.length;
  const totals = labels.map((_, i) => (stacked ? series.reduce((a, s) => a + (s.values[i] ?? 0), 0) : Math.max(...series.map((s) => s.values[i] ?? 0))));
  const { max, step } = niceMax(Math.max(0, ...totals));
  const iw = Math.max(0, width - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const band = n ? iw / n : 0;
  const groupW = Math.min(stacked ? 24 : 24 * series.length + 2 * (series.length - 1), band * 0.7);
  const barW = stacked ? groupW : Math.min(24, (groupW - 2 * (series.length - 1)) / series.length);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 48))));

  const rounded = (x0: number, y0: number, w: number, h: number, r: number) => {
    const rr = Math.min(r, h, w / 2);
    return `M${x0},${y0 + h}V${y0 + rr}Q${x0},${y0} ${x0 + rr},${y0}H${x0 + w - rr}Q${x0 + w},${y0} ${x0 + w},${y0 + rr}V${y0 + h}Z`;
  };

  return (
    <div className={cn("w-full", className)}>
      {series.length > 1 ? <Legend className="mb-2" items={series.map((s, i) => ({ label: s.name, color: s.color ?? seriesColor(i) }))} /> : null}
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 ? (
          <svg width={width} height={height} role="img" aria-label="Histogramme">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
                <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-faint text-[10px] tabular">
                  {format(t)}
                </text>
              </g>
            ))}
            {labels.map((l, i) => {
              const cx = pad.l + band * i + band / 2;
              let acc = 0;
              return (
                <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <rect x={pad.l + band * i} y={pad.t} width={band} height={ih} fill={hover === i ? "var(--surface-2)" : "transparent"} />
                  {series.map((s, si) => {
                    const v = s.values[i] ?? 0;
                    if (v <= 0) return null;
                    const color = s.color ?? seriesColor(si);
                    if (stacked) {
                      const top = y(acc + v);
                      const h = y(acc) - top - (acc > 0 ? 2 : 0); // 2px de respiration entre segments
                      acc += v;
                      const isTop = si === series.length - 1 || series.slice(si + 1).every((ss) => (ss.values[i] ?? 0) <= 0);
                      return isTop ? (
                        <path key={s.name} d={rounded(cx - barW / 2, top, barW, Math.max(0, h), 4)} fill={color} />
                      ) : (
                        <rect key={s.name} x={cx - barW / 2} y={top} width={barW} height={Math.max(0, h)} fill={color} />
                      );
                    }
                    const x0 = cx - groupW / 2 + si * (barW + 2);
                    return <path key={s.name} d={rounded(x0, y(v), barW, y(0) - y(v), 4)} fill={color} />;
                  })}
                  {i % labelEvery === 0 ? (
                    <text x={cx} y={height - 6} textAnchor="middle" className="fill-faint text-[10px]">
                      {l}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        ) : null}
        {hover !== null && width > 0 ? (
          <Tooltip x={pad.l + band * hover + band / 2} y={y(totals[hover])} width={width}>
            <div className="mb-1 font-medium text-foreground">{labels[hover]}</div>
            {series.map((s, si) => (
              <div key={s.name} className="flex items-center justify-between gap-3 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: s.color ?? seriesColor(si) }} />
                  {s.name}
                </span>
                <span className="tabular font-medium text-foreground">{format(s.values[hover] ?? 0)}</span>
              </div>
            ))}
            {stacked && series.length > 1 ? (
              <div className="mt-1 flex justify-between border-t border-border pt-1 text-foreground">
                <span>Total</span>
                <span className="tabular font-semibold">{format(totals[hover])}</span>
              </div>
            ) : null}
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}

/* ─────────────── Barres horizontales (classements) ─────────────── */

export function BarList({
  items,
  format = defaultFmt,
  className,
  color = "var(--series-1)",
  max: maxProp,
}: {
  items: { label: React.ReactNode; value: number; hint?: React.ReactNode; color?: string; key?: string }[];
  format?: (v: number) => string;
  className?: string;
  color?: string;
  max?: number;
}) {
  const max = maxProp ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((it, i) => (
        <li key={it.key ?? i} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-foreground">{it.label}</span>
            <span className="tabular shrink-0 font-medium text-foreground">
              {format(it.value)}
              {it.hint ? <span className="ml-1 font-normal text-muted-foreground">{it.hint}</span> : null}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-2">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(1.5, (it.value / max) * 100)}%`, background: it.color ?? color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ─────────────── Anneau ─────────────── */

export function DonutChart({
  data,
  size = 148,
  thickness = 18,
  center,
  format = defaultFmt,
  className,
  legend = true,
}: {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  thickness?: number;
  center?: React.ReactNode;
  format?: (v: number) => string;
  className?: string;
  legend?: boolean;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gap = data.filter((d) => d.value > 0).length > 1 ? 2 : 0;
  const offsets = data.reduce<number[]>((acc, d, i) => [...acc, i === 0 ? 0 : acc[i - 1] + (data[i - 1].value / total) * c], []);
  return (
    <div className={cn("flex flex-wrap items-center gap-5", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={data.map((d) => `${d.label} ${format(d.value)}`).join(", ")}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const seg = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color ?? seriesColor(i)}
                strokeWidth={hover === i ? thickness + 3 : thickness}
                strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                strokeDashoffset={-offsets[i]}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className="transition-[stroke-width]"
              />
            );
            return d.value > 0 ? seg : null;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {hover !== null ? (
            <>
              <span className="text-lg font-semibold text-foreground">{format(data[hover].value)}</span>
              <span className="max-w-[80%] truncate text-[11px] text-muted-foreground">{data[hover].label}</span>
            </>
          ) : (
            center
          )}
        </div>
      </div>
      {legend ? (
        <ul className="min-w-36 flex-1 space-y-1.5 text-xs">
          {data.map((d, i) => (
            <li key={d.label} className="flex items-center justify-between gap-3" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: d.color ?? seriesColor(i) }} />
                <span className="truncate">{d.label}</span>
              </span>
              <span className="tabular font-medium text-foreground">
                {format(d.value)} <span className="font-normal text-faint">· {Math.round((d.value / total) * 100)} %</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ─────────────── Entonnoir de conversion ─────────────── */

export function Funnel({ steps, className, format = defaultFmt }: { steps: { label: string; value: number; hint?: string }[]; className?: string; format?: (v: number) => string }) {
  const first = steps[0]?.value || 1;
  return (
    <ol className={cn("space-y-2", className)}>
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : s.value;
        const conv = prev ? Math.round((s.value / prev) * 100) : 0;
        const width = Math.max(4, (s.value / first) * 100);
        return (
          <li key={s.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="text-foreground">
                <span className="tabular mr-1.5 text-faint">{i + 1}.</span>
                {s.label}
              </span>
              <span className="tabular text-muted-foreground">
                <span className="font-semibold text-foreground">{format(s.value)}</span>
                {i > 0 ? <span className="ml-2">{conv} % de l'étape préc.</span> : null}
              </span>
            </div>
            <div className="h-6 w-full rounded-md bg-surface-2">
              <div className="flex h-full items-center rounded-md px-2 transition-[width] duration-500" style={{ width: `${width}%`, background: "var(--series-1)", opacity: 1 - i * 0.12 }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ─────────────── Heatmap calendrier (activité) ─────────────── */

export function CalendarHeatmap({ days, className, format = defaultFmt }: { days: { date: string; value: number }[]; className?: string; format?: (v: number) => string }) {
  const max = Math.max(1, ...days.map((d) => d.value));
  const steps = ["var(--surface-2)", "#b7d3f6", "#86b6ef", "#5598e7", "#2a78d6", "#1c5cab"];
  const weeks: { date: string; value: number }[][] = [];
  days.forEach((d, i) => {
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push(d);
  });
  return (
    <div className={cn("flex gap-[3px] overflow-x-auto", className)} role="img" aria-label="Activité quotidienne">
      {weeks.map((w, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {w.map((d) => {
            const idx = d.value === 0 ? 0 : Math.min(steps.length - 1, 1 + Math.floor((d.value / max) * (steps.length - 2)));
            return <span key={d.date} className="size-3 rounded-[3px]" style={{ background: steps[idx] }} title={`${d.date} · ${format(d.value)}`} />;
          })}
        </div>
      ))}
    </div>
  );
}
