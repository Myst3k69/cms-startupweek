"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CalendarDays, FileText, Receipt, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";
import { useCrm } from "@/lib/store";
import { useSession } from "@/lib/hooks";
import { Kbd } from "@/components/ui";

interface Result {
  id: string;
  label: string;
  hint?: string;
  href: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Palette de commandes ⌘K : navigation + recherche globale (contacts, sessions, candidatures, factures…). */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { can } = useSession();
  const [q, setQ] = React.useState("");
  const [cursor, setCursor] = React.useState(0);
  const contacts = useCrm((s) => s.contacts);
  const organizations = useCrm((s) => s.organizations);
  const events = useCrm((s) => s.events);
  const applications = useCrm((s) => s.applications);
  const invoices = useCrm((s) => s.invoices);

  const results = React.useMemo<Result[]>(() => {
    const needle = norm(q.trim());
    const nav: Result[] = NAV_ITEMS.filter((n) => can(n.section)).map((n) => ({ id: n.href, label: n.label, href: n.href, group: "Aller à", icon: n.icon, hint: n.keywords }));
    if (!needle) return nav;
    const match = (...parts: (string | undefined)[]) => norm(parts.filter(Boolean).join(" ")).includes(needle);
    const out: Result[] = nav.filter((n) => match(n.label, n.hint));
    if (can("contacts"))
      contacts.filter((c) => match(c.firstName, c.lastName, c.email, c.city)).slice(0, 6).forEach((c) => out.push({ id: c.id, label: `${c.firstName} ${c.lastName}`, hint: c.email, href: `/contacts/${c.id}`, group: "Contacts", icon: User }));
    if (can("organisations"))
      organizations.filter((o) => match(o.name, o.city, o.sector)).slice(0, 4).forEach((o) => out.push({ id: o.id, label: o.name, hint: o.city, href: `/organisations/${o.id}`, group: "Organisations", icon: Building2 }));
    if (can("sessions"))
      events.filter((e) => match(e.code, e.name, e.city)).slice(0, 5).forEach((e) => out.push({ id: e.id, label: `${e.code} · ${e.name}`, href: `/sessions/${e.id}`, group: "Sessions", icon: CalendarDays }));
    if (can("candidatures")) {
      const byContact = new Map(contacts.map((c) => [c.id, c]));
      applications
        .filter((a) => {
          const c = byContact.get(a.contactId);
          return match(`#${a.number}`, c?.firstName, c?.lastName, c?.email);
        })
        .slice(0, 5)
        .forEach((a) => {
          const c = byContact.get(a.contactId);
          out.push({ id: a.id, label: `Candidature #${a.number} — ${c ? `${c.firstName} ${c.lastName}` : ""}`, href: `/candidatures/${a.id}`, group: "Candidatures", icon: FileText });
        });
    }
    if (can("facturation"))
      invoices.filter((i) => match(i.number)).slice(0, 5).forEach((i) => out.push({ id: i.id, label: `Facture ${i.number}`, href: `/facturation/factures/${i.id}`, group: "Factures", icon: Receipt }));
    return out;
  }, [q, can, contacts, organizations, events, applications, invoices]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const go = (r: Result | undefined) => {
    if (!r) return;
    router.push(r.href);
    setQ("");
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-overlay backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Recherche globale" className="page-enter relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 text-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(results.length - 1, c + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(0, c - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(results[cursor]);
              }
            }}
            placeholder="Contact, session SW-0012, facture F-2026…, page…"
            className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-faint"
            aria-label="Rechercher"
          />
          <Kbd>Échap</Kbd>
        </div>
        <ul className="max-h-[55dvh] overflow-y-auto p-2" role="listbox">
          {results.length === 0 ? <li className="px-3 py-8 text-center text-sm text-muted-foreground">Aucun résultat pour « {q} »</li> : null}
          {results.map((r, i) => {
            const header = i === 0 || results[i - 1].group !== r.group ? r.group : null;
            return (
              <React.Fragment key={`${r.group}-${r.id}`}>
                {header ? <li className="eyebrow px-2 pb-1 pt-2 text-faint">{header}</li> : null}
                <li role="option" aria-selected={i === cursor}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(r)}
                    className={cn("flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm", i === cursor ? "bg-accent-soft text-foreground" : "text-muted-foreground")}
                  >
                    <r.icon className="size-4 shrink-0 text-faint" />
                    <span className="min-w-0 flex-1 truncate text-foreground">{r.label}</span>
                    {r.group !== "Aller à" && r.hint ? <span className="hidden truncate text-xs text-faint sm:block">{r.hint}</span> : null}
                    {i === cursor ? <ArrowRight className="size-4 text-accent-text" /> : null}
                  </button>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
