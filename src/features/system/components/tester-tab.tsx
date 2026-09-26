"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, FlaskConical, RotateCcw, Send, TriangleAlert } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FormField, Input, Select, useToast } from "@/components/ui";
import { useSession } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { FORM_META, INTAKE_FORMS, SIGNATURE_HEADER, signBody, type IntakeForm } from "../lib/intake";
import { simulateIntake, type SimResult } from "../lib/simulate";
import { DATA_MODE } from "@/lib/data/supabase";

interface HttpResult {
  status: number;
  ms: number;
  body: string;
  signed: boolean;
}

function pretty(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export function TesterTab() {
  const toast = useToast();
  const { canEdit } = useSession();
  const editable = canEdit("automatisations");
  const [form, setForm] = React.useState<IntakeForm>("candidature");
  const [json, setJson] = React.useState(() => JSON.stringify(FORM_META.candidature.sample, null, 2));
  const [secret, setSecret] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [http, setHttp] = React.useState<HttpResult | { error: string } | null>(null);
  const [sim, setSim] = React.useState<SimResult | null>(null);

  const parsed = React.useMemo((): { ok: true; value: unknown } | { ok: false; error: string } => {
    try {
      return { ok: true, value: JSON.parse(json) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "JSON invalide" };
    }
  }, [json]);

  const choose = (f: IntakeForm) => {
    setForm(f);
    setJson(JSON.stringify(FORM_META[f].sample, null, 2));
    setHttp(null);
    setSim(null);
  };

  const send = async () => {
    if (!parsed.ok) return;
    setSending(true);
    setHttp(null);
    const body = JSON.stringify(parsed.value);
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (secret) headers[SIGNATURE_HEADER] = await signBody(secret, body);
    const t0 = performance.now();
    try {
      const res = await fetch(`/api/intake/${form}`, { method: "POST", headers, body });
      const text = await res.text();
      setHttp({ status: res.status, ms: Math.round(performance.now() - t0), body: text, signed: Boolean(secret) });
    } catch (e) {
      setHttp({ error: e instanceof Error ? e.message : "Requête impossible" });
    } finally {
      setSending(false);
    }
  };

  const simulate = () => {
    if (!parsed.ok) return;
    const r = simulateIntake(form, parsed.value);
    setSim(r);
    if (r.ok && !r.duplicate) toast({ title: "Réception simulée", description: `${r.steps.length} étapes exécutées dans le CRM.` });
    else if (r.ok) toast({ title: "Doublon ignoré", description: "Même clé d'idempotence qu'une demande existante.", tone: "info" });
    else toast({ title: "Payload refusé", description: r.issues[0], tone: "danger" });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="size-4 text-accent-text" aria-hidden="true" /> Testeur de formulaire
            </CardTitle>
            <CardDescription>Éditez un payload du site puis envoyez-le à l'endpoint réel ou simulez sa réception dans la démo.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Formulaire" htmlFor="tester-form">
              <Select id="tester-form" value={form} onChange={(e) => choose(e.target.value as IntakeForm)} options={INTAKE_FORMS.map((f) => ({ value: f.form, label: `${f.label} — /api/intake/${f.form}` }))} />
            </FormField>
            <FormField label="Secret de signature (optionnel)" htmlFor="tester-secret" hint="Jamais stocké : sert à calculer l'en-tête dans le navigateur.">
              <Input id="tester-secret" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="INTAKE_SIGNING_SECRET" />
            </FormField>
          </div>
          <FormField label="Payload JSON" htmlFor="tester-json" error={parsed.ok ? undefined : `JSON invalide : ${parsed.error}`}>
            <textarea
              id="tester-json"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              spellCheck={false}
              className={cn(
                "min-h-[360px] w-full resize-y rounded-md border bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                parsed.ok ? "border-border-strong focus-visible:border-ring" : "border-danger",
              )}
            />
          </FormField>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={send} disabled={!parsed.ok} loading={sending}>
              <Send /> Envoyer
            </Button>
            {editable && DATA_MODE === "demo" ? (
              <Button variant="secondary" onClick={simulate} disabled={!parsed.ok}>
                <FlaskConical /> Simuler la réception
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => choose(form)}>
              <RotateCcw /> Réinitialiser l'exemple
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            « Envoyer » appelle <code className="font-mono">POST /api/intake/{form}</code> : en démo (sans base configurée) la route répond <code className="font-mono">dryRun: true</code> avec l'objet normalisé, sans rien écrire. {DATA_MODE === "demo"
              ? "« Simuler la réception » rejoue le flux dans les données de démo (demande, contact, objet métier, accusé, tâche)."
              : "La simulation est désactivée en production : elle écrirait de fausses demandes dans la base réelle."}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Réponse HTTP</CardTitle>
              <CardDescription>Résultat brut de l'endpoint</CardDescription>
            </div>
            {http && "status" in http ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={http.status < 300 ? "success" : http.status < 500 ? "warning" : "danger"} dot className="font-mono">
                  {http.status}
                </Badge>
                <span className="tabular text-xs text-muted-foreground">{http.ms} ms</span>
                {http.signed ? <Badge tone="violet">signé</Badge> : <Badge>non signé</Badge>}
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {!http ? (
              <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">Aucune requête envoyée.</p>
            ) : "error" in http ? (
              <p className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {http.error} — la route /api/intake est-elle déployée ?
              </p>
            ) : (
              <>
                {http.status === 401 ? <p className="mb-2 text-xs text-warning-text">Signature absente ou invalide : renseignez le secret configuré côté serveur (ou utilisez la simulation).</p> : null}
                {http.status === 403 ? <p className="mb-2 text-xs text-warning-text">Origine refusée : ajoutez l'URL du back-office à ALLOWED_ORIGINS (variable d'environnement du CRM) pour tester depuis le navigateur.</p> : null}
                <pre className="scrollbar-thin max-h-96 overflow-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                  <code>{pretty(http.body) || "(corps vide)"}</code>
                </pre>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Flux simulé dans le CRM</CardTitle>
              <CardDescription>Ce que produit la réception dans les données de démo</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!sim ? (
              <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {editable ? "Cliquez sur « Simuler la réception »." : "La simulation écrit dans les données : réservée aux administrateurs."}
              </p>
            ) : !sim.ok ? (
              <div className="space-y-1 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">
                <p className="font-medium">{sim.error === "CONSENT_REQUIRED" ? "Consentement requis" : sim.error === "SPAM" ? "Spam détecté" : "Validation échouée"}</p>
                <ul className="list-disc pl-5 text-xs">
                  {sim.issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <ol className="space-y-2">
                {sim.steps.map((s, i) => (
                  <li key={i} className="flex gap-2.5 rounded-md border border-border px-3 py-2">
                    <CircleCheck className={cn("mt-0.5 size-4 shrink-0", sim.duplicate ? "text-info-text" : "text-success-text")} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{s.label}</p>
                      {s.detail ? <p className="text-xs text-muted-foreground">{s.detail}</p> : null}
                    </div>
                    {s.href ? (
                      <Link href={s.href} className="inline-flex shrink-0 items-center gap-1 self-center text-xs font-medium text-accent-text hover:underline">
                        Voir <ArrowRight className="size-3" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
