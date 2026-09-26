import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/charts";

/**
 * Tuile KPI : libellé · valeur · delta (vs période nommée) · tendance optionnelle.
 * `upIsGood` inverse la couleur du delta (ex : retards de paiement).
 */
export function StatCard({
  label,
  value,
  hint,
  delta,
  deltaLabel = "vs période préc.",
  upIsGood = true,
  trend,
  icon: Icon,
  className,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: number;
  deltaLabel?: string;
  upIsGood?: boolean;
  trend?: number[];
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  href?: string;
}) {
  const good = delta === undefined ? undefined : delta === 0 ? undefined : delta > 0 === upIsGood;
  const body = (
    <div className={cn("flex h-full flex-col rounded-lg border border-border bg-surface p-4 shadow-sm", href && "transition-colors hover:border-border-strong", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon ? <Icon className="size-4 text-faint" /> : null}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-2xl font-semibold tracking-tight text-foreground">{value}</div>
          {delta !== undefined ? (
            <div className={cn("mt-1 inline-flex items-center gap-0.5 text-xs font-medium", good === undefined ? "text-muted-foreground" : good ? "text-success-text" : "text-danger-text")}>
              {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {delta > 0 ? "+" : ""}
              {delta.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %<span className="ml-1 font-normal text-faint">{deltaLabel}</span>
            </div>
          ) : hint ? (
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          ) : null}
        </div>
        {trend && trend.length > 1 ? <Sparkline values={trend} className="h-8 w-20 shrink-0" /> : null}
      </div>
      {delta !== undefined && hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block h-full">
        {body}
      </a>
    );
  }
  return body;
}
