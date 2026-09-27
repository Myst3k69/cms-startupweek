"use client";

import * as React from "react";
import { Badge } from "@/components/ui";
import type { Tone } from "@/lib/domain/constants";
import type { AdPlatform } from "@/lib/domain/types";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PLATFORM_SHORT } from "../lib/labels";
import type { PromoRisk } from "../lib/metrics";
import type { Verdict } from "../lib/stats";

export function PlatformBadge({ platform, className }: { platform: AdPlatform; className?: string }) {
  return (
    <Badge tone={platform === "meta" ? "info" : "violet"} className={className}>
      {PLATFORM_SHORT[platform]}
    </Badge>
  );
}

export const VERDICT_TONE: Record<Verdict, Tone> = {
  vide: "neutral",
  insuffisant: "neutral",
  en_cours: "info",
  gagnant: "success",
  controle: "warning",
  sans_difference: "neutral",
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  vide: "Pas de données",
  insuffisant: "Données insuffisantes",
  en_cours: "Échantillon en cours",
  gagnant: "Gagnant significatif",
  controle: "Contrôle meilleur",
  sans_difference: "Pas de différence",
};

export const RISK: Record<PromoRisk, { label: string; tone: Tone }> = {
  critique: { label: "En retard", tone: "danger" },
  a_surveiller: { label: "À surveiller", tone: "warning" },
  ok: { label: "Dans le rythme", tone: "success" },
  complet: { label: "Complet", tone: "info" },
};

/** Coût (centimes) ou tiret si non calculable. */
export const cost = (cents?: number) => (cents === undefined || !Number.isFinite(cents) ? "—" : money(cents));

/** ROAS « 4,2× » (CA HT / dépense). */
export const roasFmt = (v?: number) => (v === undefined || !Number.isFinite(v) ? "—" : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}×`);

/** Taux 0-1 → « 1,24 % ». */
export const rateFmt = (v: number, digits = 2) => `${(v * 100).toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;

/** Barre de budget consommé (le dépassement reste lisible : texte + couleur). */
export function BudgetBar({ spent, budget, className }: { spent: number; budget: number; className?: string }) {
  if (!budget) return <span className="text-xs text-faint">Budget non défini</span>;
  const pct = (spent / budget) * 100;
  const tone = pct > 100 ? "bg-danger" : pct > 90 ? "bg-warning" : "bg-primary";
  return (
    <div className={cn("min-w-24", className)}>
      <div className="flex items-baseline justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="tabular">{Math.round(pct)} %</span>
        <span className="tabular">{money(budget)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`Budget consommé : ${Math.round(pct)} %`}>
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

/** Remplissage d'une session avec le repère « attendu à cette date ». */
export function FillBar({ fill, expected, label }: { fill: number; expected: number; label: string }) {
  return (
    <div className="min-w-32">
      <div className="relative h-2 w-full rounded-full bg-surface-3" role="img" aria-label={`${label} : ${fill} % rempli, repère ${expected} % attendu`}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, fill)}%` }} />
        <span className="absolute -top-1 h-4 w-0.5 rounded bg-foreground/70" style={{ left: `calc(${Math.min(100, expected)}% - 1px)` }} aria-hidden="true" />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        <span className="tabular font-medium text-foreground">{fill} %</span> rempli · repère {expected} %
      </p>
    </div>
  );
}

export function Hint({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>{children}</p>;
}
