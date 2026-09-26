"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Accessibility, ClipboardList, Gauge, MessageSquareWarning, Radar, Smile } from "lucide-react";
import { useCollection } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { isActionOpen } from "../metrics";

const LINKS = [
  { href: "/qualiopi", label: "Préparation à l'audit", icon: Gauge },
  { href: "/qualiopi/reclamations", label: "Réclamations", icon: MessageSquareWarning, count: "complaints" as const },
  { href: "/qualiopi/satisfaction", label: "Satisfaction", icon: Smile },
  { href: "/qualiopi/amelioration", label: "Amélioration continue", icon: ClipboardList, count: "actions" as const },
  { href: "/qualiopi/veille", label: "Veille", icon: Radar },
  { href: "/qualiopi/handicap", label: "Handicap", icon: Accessibility },
];

/** Sous-navigation du module Qualiopi (onglets = liens). */
export function QualiopiNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const complaints = useCollection("complaints");
  const actions = useCollection("improvementActions");
  const counts = React.useMemo(
    () => ({
      complaints: complaints.filter((c) => c.status !== "cloturee").length,
      actions: actions.filter(isActionOpen).length,
    }),
    [complaints, actions],
  );
  return (
    <nav aria-label="Sections Qualiopi" className={cn("scrollbar-thin -mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-border px-1", className)}>
      {LINKS.map((l) => {
        const active = l.href === "/qualiopi" ? pathname === "/qualiopi" : pathname.startsWith(l.href);
        const count = l.count ? counts[l.count] : undefined;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative -mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <l.icon className="size-4" aria-hidden="true" />
            {l.label}
            {count ? <span className="tabular rounded-full bg-surface-2 px-1.5 text-[11px] text-muted-foreground">{count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
