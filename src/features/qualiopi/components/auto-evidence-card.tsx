"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Badge, Progress } from "@/components/ui";
import { cn } from "@/lib/utils";
import { VERDICTS, type AutoEvidence } from "../auto-evidence";

/** Carte « preuve calculée par le CRM » (drawer indicateur). */
export function AutoEvidenceCard({ evidence, className }: { evidence: AutoEvidence; className?: string }) {
  const v = VERDICTS[evidence.verdict];
  return (
    <div className={cn("rounded-lg border border-ring/25 bg-accent-soft p-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-accent-text" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">{evidence.label}</p>
        </div>
        <Badge tone={v.tone} dot>
          {v.label}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-foreground">{evidence.summary}</p>
      {evidence.score !== undefined ? (
        <Progress
          value={evidence.score}
          tone={evidence.verdict === "ok" ? "success" : evidence.verdict === "a_ameliorer" ? "warning" : "accent"}
          className="mt-3"
          label={`Couverture ${evidence.score} %`}
        />
      ) : null}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {evidence.metrics.map((m) => (
          <div key={m.label} className="min-w-0">
            <dt className="truncate text-xs text-muted-foreground">{m.label}</dt>
            <dd className="tabular text-sm font-semibold text-foreground">
              {m.value}
              {m.hint ? <span className="ml-1 text-xs font-normal text-muted-foreground">{m.hint}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ring/15 pt-2 text-xs text-muted-foreground">
        <span>Calculé en temps réel depuis les données du CRM — à présenter à l'auditeur avec les pièces sources.</span>
        {evidence.href ? (
          <Link href={evidence.href} className="inline-flex items-center gap-1 font-medium text-accent-text hover:underline">
            {evidence.hrefLabel ?? "Voir les données"} <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
