import * as React from "react";
import { cn } from "@/lib/utils";
import type { Option, Tone } from "@/lib/domain/constants";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted-foreground ring-border",
  info: "bg-info-soft text-info-text ring-info/20",
  success: "bg-success-soft text-success-text ring-success/20",
  warning: "bg-warning-soft text-warning-text ring-warning/30",
  danger: "bg-danger-soft text-danger-text ring-danger/20",
  accent: "bg-accent-soft text-accent-text ring-ring/25",
  violet: "bg-violet-soft text-violet ring-violet/20",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-faint",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  accent: "bg-primary",
  violet: "bg-violet",
};

export function Badge({ tone = "neutral", dot = false, className, children, ...props }: React.ComponentProps<"span"> & { tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={cn("inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", TONES[tone], className)}
      {...props}
    >
      {dot ? <span className={cn("size-1.5 shrink-0 rounded-full", DOTS[tone])} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function Dot({ tone = "neutral", className }: { tone?: Tone; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", DOTS[tone], className)} aria-hidden="true" />;
}

/** Badge de statut à partir d'une liste d'options (libellé + tonalité). */
export function StatusBadge<V extends string>({ options, value, className }: { options: Option<V>[]; value: V | undefined | null; className?: string }) {
  const opt = options.find((o) => o.value === value);
  if (!opt) return <span className="text-faint">—</span>;
  return (
    <Badge tone={opt.tone ?? "neutral"} dot className={className}>
      {opt.label}
    </Badge>
  );
}
