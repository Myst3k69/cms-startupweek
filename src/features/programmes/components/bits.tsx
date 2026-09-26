"use client";

import * as React from "react";
import { Check, ImageOff, Star } from "lucide-react";
import { Badge } from "@/components/ui";
import type { LeadStage } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { LEAD_FUNNEL, scoreTone } from "../lib/labels";

/** Pastille de score 0-100 (point + valeur, jamais la couleur seule). */
export function ScorePill({ score, className }: { score: number; className?: string }) {
  const tone = scoreTone(score);
  return (
    <Badge tone={tone} dot className={cn("tabular", className)} aria-label={`Score ${score} sur 100`} title={`Score global ${score}/100`}>
      {score}
    </Badge>
  );
}

/** Visuel de session : <img> simple avec repli en dégradé de marque. */
export function SessionImage({ src, alt, className, children }: { src?: string; alt: string; className?: string; children?: React.ReactNode }) {
  const [failed, setFailed] = React.useState(false);
  const showImg = Boolean(src) && !failed;
  return (
    <div className={cn("relative overflow-hidden bg-linear-to-br from-sw-ink via-sw-ink to-sw-teal", className)}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="grid-bg absolute inset-0 opacity-30" aria-hidden="true">
          {src ? <ImageOff className="absolute bottom-3 right-3 size-4 text-sw-cyan/60" /> : null}
        </div>
      )}
      <div className="absolute inset-0 bg-linear-to-t from-sw-black/70 via-sw-black/10 to-transparent" aria-hidden="true" />
      {children}
    </div>
  );
}

/** Frise du tunnel de candidature du site : capture → qualification → booking → enrichissement. */
export function LeadStageStepper({ stage }: { stage: LeadStage }) {
  if (stage === "out_of_scope") {
    return (
      <div className="flex items-center gap-2">
        <Badge tone="neutral" dot>
          Hors cible
        </Badge>
        <span className="text-xs text-muted-foreground">Le tunnel a classé ce profil hors cible.</span>
      </div>
    );
  }
  const current = LEAD_FUNNEL.findIndex((s) => s.value === stage);
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Étape du tunnel de candidature">
      {LEAD_FUNNEL.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.value} className="min-w-0" aria-current={active ? "step" : undefined} title={s.hint}>
            <div className={cn("h-1.5 rounded-full", done || active ? "bg-primary" : "bg-surface-3")} />
            <div className="mt-1.5 flex items-center gap-1">
              {done ? <Check className="size-3 shrink-0 text-accent-text" aria-hidden="true" /> : null}
              <span className={cn("truncate text-[11px]", active ? "font-semibold text-foreground" : done ? "text-muted-foreground" : "text-faint")}>{s.label}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Note sur 5 (étoile + valeur). */
export function Rating({ value, className }: { value?: number; className?: string }) {
  if (value === undefined || value === null) return <span className="text-xs text-faint">—</span>;
  return (
    <span className={cn("tabular inline-flex items-center gap-1 text-sm text-foreground", className)} aria-label={`Note ${value.toFixed(1)} sur 5`}>
      <Star className="size-3.5 fill-warning text-warning" aria-hidden="true" />
      {value.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
    </span>
  );
}

/** Petite statistique (libellé + valeur) pour cartes et en-têtes. */
export function MiniStat({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="tabular mt-0.5 truncate text-base font-semibold text-foreground">{value}</div>
      {hint ? <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/** Chips d'étiquettes (expertises, secteurs…) avec « +n ». */
export function Chips({ items, max = 3, className }: { items: string[]; max?: number; className?: string }) {
  if (!items.length) return <span className="text-xs text-faint">—</span>;
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {shown.map((it) => (
        <span key={it} className="inline-flex max-w-full items-center truncate rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border">
          {it}
        </span>
      ))}
      {rest > 0 ? <span className="inline-flex items-center rounded-md px-1 py-0.5 text-[11px] text-faint" title={items.slice(max).join(", ")}>+{rest}</span> : null}
    </div>
  );
}

/** Ligne d'état « conforme / à faire » (badges Qualiopi). */
export function ComplianceBadge({ ok, label, okLabel, koLabel, title }: { ok: boolean; label?: string; okLabel?: string; koLabel?: string; title?: string }) {
  return (
    <Badge tone={ok ? "success" : "warning"} dot title={title}>
      {label ? `${label} · ` : ""}
      {ok ? (okLabel ?? "OK") : (koLabel ?? "À faire")}
    </Badge>
  );
}
