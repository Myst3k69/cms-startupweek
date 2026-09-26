"use client";

import * as React from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "info" | "danger";
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

const ToastContext = React.createContext<{ toast: (t: Omit<ToastItem, "id" | "tone"> & { tone?: ToastTone }) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const toast = React.useCallback((t: Omit<ToastItem, "id" | "tone"> & { tone?: ToastTone }) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-3), { id, tone: "success", ...t }]);
    window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);
  const value = React.useMemo(() => ({ toast }), [toast]);
  const icons = { success: CheckCircle2, info: Info, danger: TriangleAlert };
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-4 sm:translate-x-0" aria-live="polite">
        {items.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div key={t.id} className="page-enter pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-surface p-3 shadow-lg">
              <Icon className={cn("mt-0.5 size-4 shrink-0", t.tone === "success" && "text-success", t.tone === "info" && "text-info", t.tone === "danger" && "text-danger")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{t.title}</p>
                {t.description ? <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p> : null}
              </div>
              <button type="button" onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))} className="text-faint hover:text-foreground" aria-label="Fermer">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans <ToastProvider>");
  return ctx.toast;
}
