"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, CalendarDays, FileText, Inbox, Megaphone, Receipt, ShieldCheck, Workflow } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { Avatar, Badge, Skeleton } from "@/components/ui";
import { ROLES, labelOf, toneOf } from "@/lib/domain/constants";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DATA_MODE } from "@/lib/data/supabase";
import { MagicLinkPanel } from "./magic-link-panel";

const ROLE_PITCH: Record<string, string> = {
  admin: "Accès complet : finance, paramètres, équipe.",
  commercial: "Demandes, pipeline, relances, candidatures, facturation.",
  pedagogie: "Sessions, Qualiopi, candidatures, projets, contenus.",
  formateur: "Ses sessions (émargement, évaluations) et les projets suivis.",
  lecture: "Consultation seule (ex. expert-comptable).",
};

const MODULES = [
  { icon: Inbox, title: "Demandes entrantes", text: "Les 8 formulaires du site, SLA 48 h suivi" },
  { icon: FileText, title: "Candidatures", text: "Pipeline, scoring, acompte automatique" },
  { icon: CalendarDays, title: "Sessions & émargement", text: "Programme, présences, évaluations" },
  { icon: ShieldCheck, title: "Qualiopi", text: "32 indicateurs, preuves calculées" },
  { icon: Receipt, title: "Facturation", text: "Acompte / solde, paiements, relances" },
  { icon: Megaphone, title: "Contenus du site", text: "Calendrier éditorial, SEO, ressources" },
  { icon: BarChart3, title: "Analytics", text: "Funnel, revenus, satisfaction, sources" },
  { icon: Workflow, title: "Automatisations", text: "Relances et séquences, sans n8n" },
];

const STATS: [string, string][] = [
  ["18", "sections métier"],
  ["32", "indicateurs Qualiopi"],
  ["8", "formulaires du site intégrés"],
  ["0", "polling Airtable"],
];

export function LoginScreen({ next }: { next: string }) {
  return (
    <div className="relative grid grid-cols-1 min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-sw-black px-10 py-7 text-white lg:flex lg:flex-col xl:px-16">
        <div className="grid-bg absolute inset-0 opacity-40" style={{ ["--border" as string]: "rgba(255,255,255,.06)" }} />
        <div className="absolute -left-24 top-1/4 size-[460px] rounded-full bg-[radial-gradient(circle,rgba(0,245,255,.22),transparent_65%)] blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center overflow-hidden rounded-xl bg-white">
            <Image src="/logo-sw-v4.webp" alt="" width={34} height={34} priority />
          </span>
          <span className="font-display text-lg font-semibold">StartupWeek OS</span>
        </div>

        {/* Contenu centré verticalement, aligné sur le bloc « Connexion » */}
        <div className="relative my-auto max-w-2xl py-6">
          <p className="eyebrow text-sw-cyan">Back-office 100 % custom</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight xl:text-[2.75rem]">
            De la demande entrante à l'attestation Qualiopi, <span className="text-sw-cyan">un seul outil.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
            CRM, candidatures, sessions, émargement, satisfaction, réclamations, factures d'acompte et de solde, paiements Stripe, contenus du site et analytics — à la place d'Airtable + 13 workflows n8n.
          </p>

          <ul className="mt-6 grid grid-cols-2 gap-2">
            {MODULES.map((m) => (
              <li key={m.title} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[.03] px-3 py-2.5 backdrop-blur-[1px]">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-sw-cyan/10 text-sw-cyan">
                  <m.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-white">{m.title}</span>
                  <span className="block text-xs leading-snug text-white/60">{m.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <ul className="mt-4 grid grid-cols-4 gap-2 text-xs text-white/60">
            {STATS.map(([n, l]) => (
              <li key={l} className="rounded-lg border border-white/10 bg-white/[.03] px-3 py-2">
                <span className="block font-display text-xl font-semibold text-white">{n}</span>
                {l}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">INTERSTELLABS SASU · StartupWeek · Bootcamp MVP 7 jours</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md xl:max-w-lg">
          <div className="mb-8 lg:hidden">
            <span className="inline-flex size-10 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-border">
              <Image src="/logo-sw-v4.webp" alt="" width={34} height={34} />
            </span>
          </div>
          {DATA_MODE === "supabase" ? <MagicLinkPanel next={next} /> : <DemoProfiles next={next} />}
        </div>
      </section>
    </div>
  );
}

/** Mode démo : choix d'un profil fictif (aucune authentification). */
function DemoProfiles({ next }: { next: string }) {
  const hydrated = useHydrated();
  const users = useCrm((s) => s.users);
  const login = useCrm((s) => s.login);
  const router = useRouter();
  return (
    <>
      <h2 className="text-xl font-semibold tracking-tight">Connexion</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Mode démo : choisissez un profil. En production, connexion par lien magique (Supabase Auth) et droits appliqués en base (RLS).
      </p>
      <ul className="mt-6 space-y-2">
        {!hydrated
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          : users
              .filter((u) => u.active)
              .map((u) => {
                const sections = Object.values(PERMISSIONS[u.role]).filter((a) => a !== "none").length;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        login(u.id);
                        router.push(next);
                      }}
                      className="group flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left shadow-sm transition-colors hover:border-ring/50 hover:bg-accent-soft"
                    >
                      <Avatar name={u.name} color={u.color} size="lg" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{u.name}</span>
                          <Badge tone={toneOf(ROLES, u.role)}>{labelOf(ROLES, u.role)}</Badge>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {u.title} · {ROLE_PITCH[u.role]} ({sections} sections)
                        </span>
                      </span>
                      <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent-text" />
                    </button>
                  </li>
                );
              })}
      </ul>
      <p className="mt-6 flex items-center gap-2 text-xs text-faint">
        <ShieldCheck className="size-4" /> Données de démonstration fictives, stockées uniquement dans ce navigateur.
      </p>
    </>
  );
}
