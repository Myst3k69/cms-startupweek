"use client";

import * as React from "react";
import { ChevronRight, KeyRound, ShieldCheck } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { INTAKE_FORMS, SIGNATURE_HEADER, SIGNING_SECRET_ENV, siteSnippet } from "../lib/intake";
import { CopyButton, useOrigin } from "./copy-button";

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="relative">
      <div className="absolute right-2 top-2">
        <CopyButton value={code} label={`Copier ${label}`} iconOnly />
      </div>
      <pre className="scrollbar-thin max-h-72 overflow-auto rounded-md border border-border bg-surface-2 p-3 pr-10 font-mono text-[11px] leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const OTHER_ENDPOINTS = [
  { method: "POST", path: "/api/stripe/webhook", auth: "En-tête Stripe-Signature (STRIPE_WEBHOOK_SECRET, tolérance 5 min)", role: "Paiements Stripe → factures payées, acompte réglé ⇒ candidature « Inscrite »" },
  { method: "POST", path: "/api/qonto/sync", auth: "Authorization: Bearer CRON_SECRET (Vercel Cron)", role: "Import des transactions Qonto et rapprochement des virements" },
  { method: "GET", path: "/api/health", auth: "Public (aucune donnée sensible)", role: "Supervision : base, email, Stripe, Qonto — remplace l'« Error workflow » n8n" },
];

export function EndpointsTab() {
  const origin = useOrigin();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent-text" aria-hidden="true" /> Signature obligatoire
            </CardTitle>
            <CardDescription>Chaque route /api/submit-* du site relaie le formulaire côté serveur, signé — les webhooks n8n publics sont supprimés.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
              <span>
                En-tête <code className="rounded bg-surface-2 px-1 font-mono text-xs">{SIGNATURE_HEADER}: sha256=&lt;hex&gt;</code> = HMAC-SHA256 du corps brut avec le secret{" "}
                <code className="rounded bg-surface-2 px-1 font-mono text-xs">{SIGNING_SECRET_ENV}</code> (côté site : <code className="rounded bg-surface-2 px-1 font-mono text-xs">CRM_INTAKE_SECRET</code>).
              </span>
            </li>
            <li className="text-muted-foreground">• Corps JSON ≤ 64 Ko, 10 envois / minute par internaute, champs pièges (honeypot) ignorés.</li>
            <li className="text-muted-foreground">• Idempotence : leadId du tunnel ou en-tête <code className="font-mono text-xs">Idempotency-Key</code> — un double clic ne crée pas de doublon.</li>
            <li className="text-muted-foreground">• Consentement lu tel quel (consentRGPD, consentNewsletter) : jamais forcé à true.</li>
            <li className="text-muted-foreground">• CORS limité à ALLOWED_ORIGINS (défaut : https://www.startupweek.tech).</li>
          </ul>
          <CodeBlock
            label="la requête"
            code={`POST ${origin}/api/intake/contact
content-type: application/json
${SIGNATURE_HEADER}: sha256=5f0c…e91a

{"firstName":"Julien","email":"julien@example.fr","consentRGPD":true, …}`}
          />
        </CardContent>
      </Card>

      <section className="space-y-2" aria-label="Endpoints des formulaires">
        {INTAKE_FORMS.map((f) => {
          const url = `${origin}/api/intake/${f.form}`;
          const sample = JSON.stringify(f.sample, null, 2);
          return (
            <details key={f.form} className="group rounded-lg border border-border bg-surface shadow-sm open:shadow-md">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-4 shrink-0 text-faint transition-transform group-open:rotate-90" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">{f.label}</span>
                <Badge tone="info" className="font-mono">
                  POST
                </Badge>
                <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">/api/intake/{f.form}</code>
                <span className="hidden text-xs text-faint md:inline">remplace « {f.n8n} »</span>
              </summary>
              <div className="space-y-4 border-t border-border px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-md border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-xs text-foreground">{url}</code>
                  <CopyButton value={url} label="Copier l'URL" />
                </div>
                <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Route du site à rebrancher</dt>
                    <dd className="mt-0.5 font-mono text-foreground">{f.siteRoute}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Workflow n8n remplacé</dt>
                    <dd className="mt-0.5 text-foreground">{f.n8n}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Type de demande</dt>
                    <dd className="mt-0.5 text-foreground">{f.type}</dd>
                  </div>
                </dl>
                <p className="rounded-md bg-surface-2/70 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">À la réception : </span>
                  {f.creates}.
                </p>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="min-w-0">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Exemple de payload (clés actuelles du formulaire)</p>
                    <CodeBlock code={sample} label="le payload" />
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Route Next.js du site (relais signé)</p>
                    <CodeBlock code={siteSnippet(f.form, url)} label="le code" />
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Autres points d'entrée</CardTitle>
            <CardDescription>Paiements, banque et supervision</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {OTHER_ENDPOINTS.map((e) => (
              <li key={e.path} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex min-w-0 items-center gap-2 sm:w-72 sm:shrink-0">
                  <Badge tone={e.method === "GET" ? "success" : "info"} className="font-mono">
                    {e.method}
                  </Badge>
                  <code className="truncate font-mono text-xs text-foreground">{e.path}</code>
                  <CopyButton value={`${origin}${e.path}`} label={`Copier l'URL ${e.path}`} iconOnly />
                </div>
                <div className="min-w-0 text-xs">
                  <p className="text-foreground">{e.role}</p>
                  <p className="mt-0.5 text-muted-foreground">{e.auth}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
