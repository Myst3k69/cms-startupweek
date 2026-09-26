"use client";

import type { Option } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";

/** Sélecteur de statut compact (inline dans les tables / fiches). */
export function StatusSelect<V extends string>({
  options,
  value,
  onChange,
  disabled,
  className,
  label = "Statut",
}: {
  options: Option<V>[];
  value: V;
  onChange: (v: V) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as V)}
      className={cn(
        "h-7 max-w-full rounded-md border border-border bg-surface px-2 text-xs font-medium text-foreground hover:border-border-strong focus-visible:border-ring focus-visible:outline-none disabled:opacity-60",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
