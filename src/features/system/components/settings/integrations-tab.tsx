"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, CreditCard, Database, Globe, Landmark, Mail, Workflow } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Select, Switch, useToast } from "@/components/ui";
import { useCrm } from "@/lib/store";
import { useSession, useSettings } from "@/lib/hooks";
import { remoteSync } from "@/lib/data/sync";
import type { Tone } from "@/lib/domain/constants";
import type { Settings } from "@/lib/domain/types";
import { CopyButton, useOrigin } from "../copy-button";

type HealthServices = Partial<Record<"supabaseAdmin" | "supabasePublic" | "intakeSignature" | "allowedOriginsCustom" | "stripeWebhook" | "stripeApi" | "qonto" | "email" | "cron", boolean>>;
interface Health {
  ok: boolean;
  mode: string;
  uiDataMode?: string;
  database?: string;
  services?: HealthServices;
  time?: string;
}

interface Integration {
  key: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: { label: string; tone: Tone };
  description: string;
  env: string[];
  health?: (keyof HealthServices)[];
  endpoint?: string;
  control?: React.ReactNode;
  extra?: React.ReactNode;
}

const EMAIL_PROVIDERS: { value: Settings["emailProvider"]; label: string }[] = [
  { value: "resend", label: "Resend (recommandé)" },
  { value: "smtp", label: "SMTP" },
  { value: "brevo", label: "Brevo" },
];

export function IntegrationsTab() {
  const settings = useSettings();
  const updateSettings = useCrm((s) => s.updateSettings);
  const toast = useToast();
  const { canEdit } = useSession();
  const editable = canEdit("parametres");
  const origin = useOrigin();
  const [health, setHealth] = React.useState<Health | { error: string } | null>(null);
  const [checking, setChecking] = React.useState(false);

  const check = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      setHealth((await res.json()) as Health);
    } catch (e) {
      setHealth({ error: e instanceof Error ? e.message : "Indisponible" });
    } finally {
      setChecking(false);
    }
  };

  const toggle = (patch: Partial<Settings>, label: string) => {
    updateSettings(patch);
    toast({ title: label });
  };

  const services = health && "services" in health ? health.services : undefined;

  const items: Integration[] = [
    {
      key: "stripe",
      name: "Stripe",
      icon: CreditCard,
      status: settings.stripeConnected ? { label: "Connecté", tone: "success" } : { label: "Non connecté", tone: "neutral" },
      description: "Liens de paiement des acomptes et soldes ; le webhook marque les factures payées et confirme l'inscription.",
      env: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
      health: ["stripeApi", "stripeWebhook"],
      endpoint: "/api/stripe/webhook",
      control: <Switch checked={settings.stripeConnected} disabled={!editable} onChange={(v) => toggle({ stripeConnected: v }, v ? "Stripe marqué connecté" : "Stripe déconnecté")} label="Stripe connecté" />,
      extra: <p className="text-xs text-muted-foreground">Événements : checkout.session.completed, payment_intent.succeeded, charge.refunded.</p>,
    },
    {
      key: "qonto",
      name: "Qonto",
      icon: Landmark,
      status: settings.qontoConnected ? { label: "Connecté", tone: "success" } : { label: "Non connecté", tone: "neutral" },
      description: "Import quotidien des transactions (Vercel Cron) et rapprochement automatique des virements avec les factures.",
      env: ["QONTO_ORGANIZATION_SLUG", "QONTO_SECRET_KEY", "QONTO_BANK_ACCOUNT_ID", "CRON_SECRET"],
      health: ["qonto", "cron"],
      endpoint: "/api/qonto/sync",
      control: <Switch checked={settings.qontoConnected} disabled={!editable} onChange={(v) => toggle({ qontoConnected: v }, v ? "Qonto marqué connecté" : "Qonto déconnecté")} label="Qonto connecté" />,
    },
    {
      key: "email",
      name: "Emails transactionnels",
      icon: Mail,
      status: { label: EMAIL_PROVIDERS.find((p) => p.value === settings.emailProvider)?.label ?? settings.emailProvider, tone: "info" },
      description: "Accusés de réception, convocations, relances : variables échappées (fin de l'injection HTML des emails n8n).",
      env: settings.emailProvider === "resend" ? ["RESEND_API_KEY", "EMAIL_FROM"] : settings.emailProvider === "smtp" ? ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_FROM"] : ["BREVO_API_KEY", "EMAIL_FROM"],
      health: ["email"],
      control: (
        <Select
          aria-label="Fournisseur d'email"
          value={settings.emailProvider}
          disabled={!editable}
          options={EMAIL_PROVIDERS}
          onChange={(e) => toggle({ emailProvider: e.target.value as Settings["emailProvider"] }, "Fournisseur d'email mis à jour")}
          className="w-44"
        />
      ),
    },
    {
      key: "supabase",
      name: "Supabase",
      icon: Database,
      status: remoteSync.mode === "supabase" ? (remoteSync.configured ? { label: "Base connectée", tone: "success" } : { label: "Mal configuré", tone: "danger" }) : { label: "Mode démo (local)", tone: "warning" },
      description: "Base Postgres (schéma crm, RLS par rôle), Auth (magic link) et Storage (bucket « ressources », URLs stables).",
      env: ["NEXT_PUBLIC_CRM_DATA_MODE", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"],
      health: ["supabasePublic", "supabaseAdmin"],
      extra: (
        <p className="text-xs text-muted-foreground">
          Mise en place : <code className="rounded bg-surface-2 px-1 font-mono">docs/SUPABASE.md</code> (migrations, policies, bascule du mode de données).
        </p>
      ),
    },
    {
      key: "site",
      name: "Site startupweek.tech",
      icon: Globe,
      status: { label: "Bascule en cours", tone: "warning" },
      description: "Les routes /api/submit-* du site appellent /api/intake/<form> (signé). Les sessions publiées sont poussées vers public.event par trigger SQL.",
      env: ["INTAKE_SIGNING_SECRET", "ALLOWED_ORIGINS", "CRM_INTAKE_SECRET (côté site)"],
      health: ["intakeSignature", "allowedOriginsCustom"],
      endpoint: "/api/intake/candidature",
      extra: (
        <Link href="/automatisations" className="text-xs font-medium text-accent-text hover:underline">
          Endpoints, exemples et testeur →
        </Link>
      ),
    },
    {
      key: "n8n",
      name: "n8n",
      icon: Workflow,
      status: { label: "En cours de décommission", tone: "danger" },
      description: "13 workflows StartupWeek : 8 webhooks de formulaires à couper après bascule, polling Airtable → Supabase déjà remplacé.",
      env: [],
      extra: (
        <Link href="/automatisations" className="text-xs font-medium text-accent-text hover:underline">
          Voir la carte de migration →
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-accent-text" aria-hidden="true" /> Configuration serveur
            </CardTitle>
            <CardDescription>Interroge GET /api/health : variables présentes (jamais leur valeur) et accès à la base.</CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={check} loading={checking}>
            Vérifier maintenant
          </Button>
        </CardHeader>
        {health ? (
          <CardContent>
            {"error" in health ? (
              <p className="text-sm text-danger-text">Endpoint injoignable : {health.error}</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={health.ok ? "success" : "danger"} dot>
                  {health.ok ? "API opérationnelle" : "API dégradée"}
                </Badge>
                <Badge tone={health.mode === "supabase" ? "success" : "warning"}>API : {health.mode === "supabase" ? "Supabase" : "démo (dry-run)"}</Badge>
                {health.database ? <Badge tone={health.database === "ok" ? "success" : health.database === "erreur" ? "danger" : "neutral"}>Base : {health.database.replace("_", " ")}</Badge> : null}
                {health.time ? <span className="text-xs text-muted-foreground">vérifié à {new Date(health.time).toLocaleTimeString("fr-FR")}</span> : null}
              </div>
            )}
          </CardContent>
        ) : null}
      </Card>

      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((it) => (
          <li key={it.key}>
            <Card className="flex h-full flex-col">
              <CardHeader>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
                    <it.icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle>{it.name}</CardTitle>
                    <Badge tone={it.status.tone} dot className="mt-1">
                      {it.status.label}
                    </Badge>
                  </div>
                </div>
                {it.control}
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground">{it.description}</p>
                {it.env.length ? (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Variables d'environnement</p>
                    <ul className="flex flex-wrap gap-1.5">
                      {it.env.map((v) => (
                        <li key={v}>
                          <code className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-foreground">{v}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {services && it.health ? (
                  <p className="flex flex-wrap gap-1.5">
                    {it.health.map((h) => (
                      <Badge key={h} tone={services[h] ? "success" : "danger"} dot>
                        {h} {services[h] ? "configuré" : "manquant"}
                      </Badge>
                    ))}
                  </p>
                ) : null}
                {it.endpoint ? (
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-md bg-surface-2 px-2 py-1 font-mono text-[11px] text-foreground">
                      {origin}
                      {it.endpoint}
                    </code>
                    <CopyButton value={`${origin}${it.endpoint}`} label={`Copier ${it.endpoint}`} iconOnly />
                  </div>
                ) : null}
                {it.extra}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
