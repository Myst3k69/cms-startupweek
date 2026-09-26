"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronsUpDown, LogOut, Menu as MenuIcon, Monitor, Moon, Search, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";
import { useSession, useNow } from "@/lib/hooks";
import { useCrm } from "@/lib/store";
import { computeAlerts } from "@/lib/domain/alerts";
import { ROLES, labelOf } from "@/lib/domain/constants";
import { Avatar, Badge, Kbd } from "@/components/ui";
import { DATA_MODE } from "@/lib/data/supabase";
import { signOutAndClear } from "@/lib/store/remote-session";
import { setTheme, useThemePref, type ThemePref } from "./theme";
import { CommandPalette } from "./command-palette";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-1" aria-label="StartupWeek OS — accueil">
      <span className="relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-border">
        <Image src="/logo-sw-v4.webp" alt="" width={28} height={28} priority />
      </span>
      {!compact ? (
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-semibold tracking-tight text-foreground">StartupWeek</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-accent-text">OS · back-office</span>
        </span>
      ) : null}
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = useSession();
  const counts = useNavCounts();
  return (
    <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Navigation principale">
      {NAV.map((group) => {
        const items = group.items.filter((i) => can(i.section));
        if (!items.length) return null;
        return (
          <div key={group.label}>
            <p className="eyebrow mb-1.5 px-2 text-faint">{group.label}</p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(pathname, item.href);
                const count = counts[item.href];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active ? "bg-accent-soft font-medium text-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                      )}
                    >
                      <item.icon className={cn("size-4 shrink-0", active ? "text-accent-text" : "text-faint group-hover:text-muted-foreground")} />
                      <span className="truncate">{item.label}</span>
                      {count ? (
                        <span className={cn("tabular ml-auto rounded-full px-1.5 text-[11px] font-medium", count.tone === "danger" ? "bg-danger-soft text-danger-text" : "bg-surface-3 text-muted-foreground")}>
                          {count.value}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/** Compteurs discrets dans la navigation (éléments à traiter). */
function useNavCounts(): Record<string, { value: number; tone: "danger" | "neutral" } | undefined> {
  const submissions = useCrm((s) => s.submissions);
  const applications = useCrm((s) => s.applications);
  const tasks = useCrm((s) => s.tasks);
  const complaints = useCrm((s) => s.complaints);
  const sessionUserId = useCrm((s) => s.sessionUserId);
  const now = useNow();
  return React.useMemo(() => {
    const newSubs = submissions.filter((s) => s.status === "nouvelle").length;
    const newApps = applications.filter((a) => a.status === "nouvelle").length;
    const myLate = tasks.filter((t) => !t.doneAt && t.assigneeId === sessionUserId && new Date(t.dueAt).getTime() < now).length;
    const openComplaints = complaints.filter((c) => c.status !== "cloturee").length;
    return {
      "/demandes": newSubs ? { value: newSubs, tone: "neutral" as const } : undefined,
      "/candidatures": newApps ? { value: newApps, tone: "neutral" as const } : undefined,
      "/relances": myLate ? { value: myLate, tone: "danger" as const } : undefined,
      "/qualiopi": openComplaints ? { value: openComplaints, tone: "neutral" as const } : undefined,
    };
  }, [submissions, applications, tasks, complaints, sessionUserId, now]);
}

function ThemeSwitch() {
  const pref = useThemePref();
  const opts: { v: ThemePref; icon: typeof Sun; label: string }[] = [
    { v: "light", icon: Sun, label: "Clair" },
    { v: "dark", icon: Moon, label: "Sombre" },
    { v: "system", icon: Monitor, label: "Système" },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5" role="radiogroup" aria-label="Thème">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={pref === o.v}
          title={o.label}
          onClick={() => setTheme(o.v)}
          className={cn("inline-flex size-6 items-center justify-center rounded-[5px] transition-colors", pref === o.v ? "bg-surface text-foreground shadow-sm" : "text-faint hover:text-foreground")}
        >
          <o.icon className="size-3.5" />
          <span className="sr-only">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function UserSwitcher() {
  const { user, logout, login } = useSession();
  const users = useCrm((s) => s.users);
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  if (!user) return null;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-surface-2" aria-expanded={open}>
        <Avatar name={user.name} color={user.color} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{user.name}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{labelOf(ROLES, user.role)}</span>
        </span>
        <ChevronsUpDown className="size-4 text-faint" />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 right-0 z-40 mb-1 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg">
          {DATA_MODE === "supabase" ? (
            <p className="truncate px-3 pb-1.5 pt-1 text-xs text-muted-foreground" title={user.email}>
              {user.email}
            </p>
          ) : (
            <>
              <p className="eyebrow px-3 pb-1 pt-1.5 text-faint">Changer de profil (démo)</p>
              {users
                .filter((u) => u.active)
                .map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      login(u.id);
                      setOpen(false);
                      router.push("/");
                    }}
                    className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-2", u.id === user.id && "bg-accent-soft")}
                  >
                    <Avatar name={u.name} color={u.color} size="sm" />
                    <span className="min-w-0 flex-1 truncate">{u.name}</span>
                    <span className="text-[10px] text-muted-foreground">{labelOf(ROLES, u.role)}</span>
                  </button>
                ))}
            </>
          )}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              if (DATA_MODE === "supabase") {
                void signOutAndClear().then(() => router.push("/connexion"));
              } else {
                logout();
                router.push("/connexion");
              }
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-danger-text hover:bg-surface-2"
          >
            <LogOut className="size-4" /> Se déconnecter
          </button>
        </div>
      ) : null}
    </div>
  );
}

function NotificationBell() {
  const submissions = useCrm((s) => s.submissions);
  const complaints = useCrm((s) => s.complaints);
  const invoices = useCrm((s) => s.invoices);
  const tasks = useCrm((s) => s.tasks);
  const events = useCrm((s) => s.events);
  const applications = useCrm((s) => s.applications);
  const speakers = useCrm((s) => s.speakers);
  const contacts = useCrm((s) => s.contacts);
  const settings = useCrm((s) => s.settings);
  const sessionUserId = useCrm((s) => s.sessionUserId);
  const now = useNow();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const alerts = React.useMemo(
    () => computeAlerts({ submissions, complaints, invoices, tasks, events, applications, speakers, contacts, settings, sessionUserId }, now),
    [submissions, complaints, invoices, tasks, events, applications, speakers, contacts, settings, sessionUserId, now],
  );
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const urgent = alerts.filter((a) => a.tone === "danger").length;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        aria-label={`Alertes (${alerts.length})`}
        aria-expanded={open}
      >
        <Bell className="size-[18px]" />
        {alerts.length ? (
          <span className={cn("absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white", urgent ? "bg-danger" : "bg-info")}>
            {alerts.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-1 w-[min(92vw,380px)] overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-sm font-semibold">À traiter</p>
            <Badge tone={urgent ? "danger" : "neutral"}>{alerts.length}</Badge>
          </div>
          <ul className="max-h-[60dvh] divide-y divide-border overflow-y-auto">
            {alerts.length === 0 ? <li className="px-4 py-6 text-center text-sm text-muted-foreground">Rien d'urgent. Bravo 👏</li> : null}
            {alerts.map((a) => (
              <li key={a.id}>
                <Link href={a.href} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", { danger: "bg-danger", warning: "bg-warning", info: "bg-info", accent: "bg-primary", success: "bg-success", neutral: "bg-faint", violet: "bg-violet" }[a.tone])} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{a.title}</span>
                    <span className="block text-xs text-muted-foreground">{a.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-4">
        <Brand />
      </div>
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex h-8 w-full items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-sm text-faint shadow-sm hover:border-border-strong"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Rechercher…</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>
      <SidebarNav onNavigate={() => setMobileOpen(false)} />
      <div className="space-y-2 border-t border-border p-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-faint">Thème</span>
          <ThemeSwitch />
        </div>
        <UserSwitcher />
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-[var(--sidebar-width)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] border-r border-border bg-surface lg:block">{sidebar}</aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="relative h-full w-[min(85vw,var(--sidebar-width))] border-r border-border bg-surface shadow-lg">
            <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3.5 rounded-md p-1 text-muted-foreground hover:bg-surface-2" aria-label="Fermer le menu">
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
        <button type="button" onClick={() => setMobileOpen(true)} className="-ml-1.5 rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 lg:hidden" aria-label="Ouvrir le menu">
          <MenuIcon className="size-5" />
        </button>
        <div className="lg:hidden">
          <Brand compact />
        </div>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="ml-auto inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground lg:hidden"
          aria-label="Rechercher"
        >
          <Search className="size-[18px]" />
        </button>
        <div className="hidden flex-1 items-center gap-2 text-xs text-muted-foreground lg:flex">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5">
            <span className="size-1.5 rounded-full bg-success" style={{ animation: "sw-pulse-dot 2s infinite" }} />
            Mode démo · données locales
          </span>
        </div>
        <NotificationBell />
      </header>

      <main key={pathname} className="page-enter mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
