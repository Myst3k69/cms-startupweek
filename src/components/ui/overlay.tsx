"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

function useLockAndEscape(open: boolean, onClose: () => void) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
}

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useLockAndEscape(open, onClose);
  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div className="absolute inset-0 bg-overlay backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
        <div role="dialog" aria-modal="true" aria-label={title} className={cn("page-enter relative flex max-h-[92dvh] w-full flex-col rounded-t-xl border border-border bg-surface shadow-lg sm:rounded-xl", widths[size])}>
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fermer">
              <X />
            </Button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : null}
        </div>
      </div>
    </Portal>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "md" | "lg" | "xl";
}) {
  useLockAndEscape(open, onClose);
  if (!open) return null;
  const widths = { md: "sm:max-w-md", lg: "sm:max-w-xl", xl: "sm:max-w-3xl" };
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-overlay" onClick={onClose} aria-hidden="true" />
        <aside role="dialog" aria-modal="true" className={cn("relative flex h-full w-full flex-col border-l border-border bg-surface shadow-lg", widths[width])} style={{ animation: "sw-drawer-in 220ms cubic-bezier(.2,.7,.2,1)" }}>
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <div className="text-base font-semibold text-foreground">{title}</div>
              {description ? <div className="mt-0.5 text-sm text-muted-foreground">{description}</div> : null}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fermer">
              <X />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : null}
        </aside>
        <style>{`@keyframes sw-drawer-in{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}`}</style>
      </div>
    </Portal>
  );
}

/** Menu déroulant simple (actions de ligne, sélecteurs). */
export function Menu({
  trigger,
  items,
  align = "end",
}: {
  trigger: (props: { onClick: () => void; "aria-expanded": boolean }) => React.ReactNode;
  items: ({ label: string; icon?: React.ComponentType<{ className?: string }>; onSelect: () => void; danger?: boolean; disabled?: boolean } | "separator")[];
  align?: "start" | "end";
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block">
      {trigger({ onClick: () => setOpen((o) => !o), "aria-expanded": open })}
      {open ? (
        <div role="menu" className={cn("absolute z-40 mt-1 min-w-48 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg", align === "end" ? "right-0" : "left-0")}>
          {items.map((it, i) =>
            it === "separator" ? (
              <div key={i} className="my-1 h-px bg-border" />
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
                className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-2 disabled:opacity-50", it.danger ? "text-danger-text" : "text-foreground")}
              >
                {it.icon ? <it.icon className="size-4 text-muted-foreground" /> : null}
                {it.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Onglets contrôlés. */
export function Tabs<V extends string>({
  value,
  onChange,
  tabs,
  className,
}: {
  value: V;
  onChange: (v: V) => void;
  tabs: { value: V; label: React.ReactNode; count?: number; icon?: React.ComponentType<{ className?: string }> }[];
  className?: string;
}) {
  return (
    <div className={cn("scrollbar-thin -mx-1 flex gap-1 overflow-x-auto border-b border-border px-1", className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "relative -mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            value === t.value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.icon ? <t.icon className="size-4" /> : null}
          {t.label}
          {t.count !== undefined ? <span className="tabular rounded-full bg-surface-2 px-1.5 text-[11px] text-muted-foreground">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
