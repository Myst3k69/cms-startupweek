import * as React from "react";
import { cn, initials } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-surface-2", className)} {...props} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong px-6 py-12 text-center", className)}>
      {Icon ? <Icon className="mb-3 size-8 text-faint" /> : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Avatar({ name, color, size = "md", className }: { name: string; color?: string; size?: "xs" | "sm" | "md" | "lg"; className?: string }) {
  const sizes = { xs: "size-5 text-[9px]", sm: "size-6 text-[10px]", md: "size-8 text-xs", lg: "size-11 text-sm" };
  return (
    <span
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface", sizes[size], className)}
      style={{ background: color ?? "var(--sw-teal-deep)" }}
      title={name}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarGroup({ people, max = 4, size = "sm" }: { people: { name: string; color?: string }[]; max?: number; size?: "xs" | "sm" | "md" }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex -space-x-1.5">
      {shown.map((p, i) => (
        <Avatar key={i} name={p.name} color={p.color} size={size} />
      ))}
      {rest > 0 ? (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-surface-3 text-[10px] font-semibold text-muted-foreground ring-2 ring-surface">+{rest}</span>
      ) : null}
    </div>
  );
}

export function Progress({ value, tone = "accent", className, label }: { value: number; tone?: "accent" | "success" | "warning" | "danger" | "info"; className?: string; label?: string }) {
  const color = { accent: "bg-primary", success: "bg-success", warning: "bg-warning", danger: "bg-danger", info: "bg-info" }[tone];
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

/** Anneau de progression (score Qualiopi, taux de remplissage…). */
export function ProgressRing({ value, size = 64, stroke = 6, label, sublabel }: { value: number; size?: number; stroke?: number; label?: string; sublabel?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--primary)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-sm font-semibold leading-none text-foreground">{label ?? `${Math.round(v)}%`}</span>
        {sublabel ? <span className="mt-0.5 text-[10px] text-muted-foreground">{sublabel}</span> : null}
      </div>
    </div>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <kbd className={cn("rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground", className)}>{children}</kbd>;
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-border", className)} />;
}

/** Liste clé / valeur (fiches détail). */
export function DescriptionList({ items, className, columns = 1 }: { items: { label: string; value: React.ReactNode }[]; className?: string; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3", className)}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{it.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-foreground">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Segmented control (filtres rapides, vues). */
export function Segmented<V extends string>({
  value,
  onChange,
  options,
  className,
  size = "sm",
}: {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: React.ReactNode; count?: number }[];
  className?: string;
  size?: "xs" | "sm";
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] font-medium transition-colors",
            size === "xs" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs sm:text-sm",
            value === o.value ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
          {o.count !== undefined ? <span className="tabular rounded bg-surface-3 px-1 text-[10px] text-muted-foreground">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
