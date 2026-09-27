"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Ban, Flag, Pencil, Play, Save, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DescriptionList, EmptyState, FormField, Input, Modal, PageHeader, Progress, Select, StatusBadge, Textarea, useToast } from "@/components/ui";
import { SessionLink, UserChip } from "@/components/shared/entity-links";
import { CopyButton, useOrigin } from "@/features/system/components/copy-button";
import { useActions, useEntity, useSession } from "@/lib/hooks";
import { useCrm } from "@/lib/store";
import type { Experiment } from "@/lib/domain/types";
import { date, number } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EXPERIMENT_CHANNELS, EXPERIMENT_METRICS, EXPERIMENT_STATUSES } from "../lib/labels";
import { analyzeExperiment, type ExperimentAnalysis } from "../lib/stats";
import { ExperimentFormModal } from "./experiment-form-modal";
import { VERDICT_LABEL, VERDICT_TONE, rateFmt } from "./parts";

export function ExperimentDetail({ id }: { id: string }) {
  const exp = useEntity("experiments", id);
  if (!exp) {
    return <EmptyState title="Test introuvable" description="Il a peut-être été supprimé." action={<Link href="/marketing?onglet=tests" className="text-sm font-medium text-accent-text hover:underline">Retour aux A/B tests</Link>} />;
  }
  return <ExperimentView exp={exp} />;
}

function ExperimentView({ exp }: { exp: Experiment }) {
  const router = useRouter();
  const toast = useToast();
  const { update, remove } = useActions();
  const { canEdit } = useSession();
  const editable = canEdit("marketing");
  const adStats = useCrm((s) => s.adStats);
  const campaign = useEntity("adCampaigns", exp.campaignId);
  const template = useEntity("emailTemplates", exp.templateId);
  const a = React.useMemo(() => analyzeExperiment(exp, adStats), [exp, adStats]);
  const metric = EXPERIMENT_METRICS[exp.metric];
  const [editing, setEditing] = React.useState(false);
  const [concluding, setConcluding] = React.useState(false);

  const start = () => {
    update("experiments", exp.id, { status: "en_cours", startAt: new Date().toISOString() }, { log: "Test démarré", kind: "statut" });
    toast({ title: "Test démarré", description: exp.channel === "site" ? "Le site peut maintenant afficher les variantes (GET /api/experiments)." : undefined });
  };
  const abandon = () => {
    if (!window.confirm("Abandonner ce test ? Les résultats restent consultables mais aucune conclusion ne sera tirée.")) return;
    update("experiments", exp.id, { status: "abandonne", endAt: new Date().toISOString() }, { log: "Test abandonné", kind: "statut" });
  };
  const del = () => {
    if (!window.confirm("Supprimer ce brouillon de test ?")) return;
    remove("experiments", exp.id, { log: `Test supprimé : ${exp.name}` });
    router.push("/marketing?onglet=tests");
  };

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Marketing", href: "/marketing" }, { label: "A/B tests", href: "/marketing?onglet=tests" }, { label: exp.name }]}
        title={exp.name}
        description={exp.hypothesis}
        actions={
          editable ? (
            <>
              {exp.status === "brouillon" ? (
                <>
                  <Button variant="ghost" onClick={del} aria-label="Supprimer le test">
                    <Trash2 />
                  </Button>
                  <Button onClick={start}>
                    <Play /> Démarrer
                  </Button>
                </>
              ) : null}
              {exp.status === "en_cours" ? (
                <>
                  <Button variant="ghost" onClick={abandon}>
                    <Ban /> Abandonner
                  </Button>
                  <Button onClick={() => setConcluding(true)}>
                    <Flag /> Conclure
                  </Button>
                </>
              ) : null}
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil /> Modifier
              </Button>
            </>
          ) : null
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge options={EXPERIMENT_STATUSES} value={exp.status} />
          <StatusBadge options={EXPERIMENT_CHANNELS} value={exp.channel} />
          <Badge>{metric.label}</Badge>
          <span className="font-mono text-xs text-muted-foreground">{exp.key}</span>
        </div>
      </PageHeader>

      <VerdictCard exp={exp} a={a} />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Résultats par variante</CardTitle>
            <CardDescription>
              {metric.conversions} / {metric.exposures.toLowerCase()} · intervalle de confiance à {exp.confidenceTarget} % · comparaison à la variante A
              {a.variants.length > 2 ? ` (seuil corrigé : p < ${a.alpha.toLocaleString("fr-FR", { maximumSignificantDigits: 2 })})` : ""}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ResultsTable key={exp.updatedAt} exp={exp} a={a} editable={editable && exp.channel === "email" && exp.status !== "abandonne"} />
          <RateChart a={a} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Paramètres</CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList
              columns={2}
              items={[
                { label: "Canal", value: EXPERIMENT_CHANNELS.find((c) => c.value === exp.channel)?.label },
                { label: "Métrique", value: metric.label },
                ...(exp.channel === "publicite" ? [{ label: "Campagne", value: campaign ? <Link href={`/marketing/campagnes/${campaign.id}`} className="text-accent-text hover:underline">{campaign.name}</Link> : "—" }] : []),
                ...(exp.channel === "site" ? [{ label: "Page", value: exp.pageUrl ? <a href={exp.pageUrl} target="_blank" rel="noreferrer" className="break-all text-accent-text hover:underline">{exp.pageUrl}</a> : "—" }] : []),
                ...(exp.channel === "email" ? [{ label: "Modèle d'email", value: template?.name ?? "—" }] : []),
                { label: "Session", value: exp.eventId ? <SessionLink id={exp.eventId} /> : "—" },
                { label: "Confiance / effet minimal", value: `${exp.confidenceTarget} % · +${exp.minDetectableEffect} %` },
                { label: "Taux de référence", value: rateFmt(a.baseline) },
                { label: "Période", value: exp.startAt ? `${date(exp.startAt)} → ${exp.endAt ? date(exp.endAt) : "en cours"}` : "Pas démarré" },
                { label: "Responsable", value: exp.ownerId ? <UserChip id={exp.ownerId} /> : "—" },
              ]}
            />
            {exp.conclusion ? (
              <div className="mt-4 rounded-md bg-surface-2 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Conclusion{exp.winnerKey ? ` · gagnant retenu : ${exp.winnerKey}` : ""}</p>
                <p className="mt-1 text-sm text-foreground">{exp.conclusion}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <MethodCard exp={exp} />
      </div>

      {exp.channel === "site" ? <SiteIntegrationCard exp={exp} /> : null}

      {editing ? <ExperimentFormModal open experiment={exp} onClose={() => setEditing(false)} /> : null}
      {concluding ? <ConcludeModal exp={exp} a={a} onClose={() => setConcluding(false)} /> : null}
    </div>
  );
}

function VerdictCard({ exp, a }: { exp: Experiment; a: ExperimentAnalysis }) {
  const tone = VERDICT_TONE[a.verdict];
  return (
    <Card className={cn(tone === "success" && "border-success/40", a.srm?.suspicious && "border-danger/40")}>
      <CardContent className="grid grid-cols-1 gap-4 py-4 md:grid-cols-[minmax(0,1fr)_16rem] md:items-center">
        <div className="min-w-0">
          <Badge tone={tone} dot>
            {VERDICT_LABEL[a.verdict]}
          </Badge>
          <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">{a.headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">{a.detail}</p>
          {a.srm?.suspicious ? (
            <p className="mt-2 flex gap-2 rounded-md bg-danger-soft px-3 py-2 text-xs text-danger-text">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Répartition anormale des visiteurs entre variantes (test SRM, p = {a.srm.pValue.toExponential(1)}) : un problème d'intégration fausse probablement les résultats. Corrigez avant de conclure.
            </p>
          ) : null}
        </div>
        {exp.status !== "brouillon" && Number.isFinite(a.requiredPerVariant) ? (
          <div>
            <p className="text-xs text-muted-foreground">Échantillon nécessaire</p>
            <p className="tabular text-lg font-semibold text-foreground">
              {Math.round(a.progress * 100)} %<span className="ml-1 text-xs font-normal text-muted-foreground">de {number(a.requiredPerVariant)} / variante</span>
            </p>
            <Progress className="mt-2" value={a.progress * 100} tone={a.progress >= 1 ? "success" : "accent"} label="Avancement de l'échantillon" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ResultsTable({ exp, a, editable }: { exp: Experiment; a: ExperimentAnalysis; editable: boolean }) {
  const { update } = useActions();
  const toast = useToast();
  const metric = EXPERIMENT_METRICS[exp.metric];
  const [counts, setCounts] = React.useState(() => Object.fromEntries(exp.variants.map((v) => [v.id, { e: String(v.exposures), c: String(v.conversions) }])));
  const dirty = exp.variants.some((v) => counts[v.id] && (counts[v.id].e !== String(v.exposures) || counts[v.id].c !== String(v.conversions)));

  const save = () => {
    const bad = exp.variants.find((v) => {
      const e = Number(counts[v.id]?.e);
      const c = Number(counts[v.id]?.c);
      return !Number.isInteger(e) || !Number.isInteger(c) || e < 0 || c < 0 || c > e;
    });
    if (bad) {
      toast({ title: "Chiffres incohérents", description: `Variante ${bad.key} : les ${metric.conversions.toLowerCase()} ne peuvent pas dépasser les ${metric.exposures.toLowerCase()}.`, tone: "danger" });
      return;
    }
    update("experiments", exp.id, { variants: exp.variants.map((v) => ({ ...v, exposures: Number(counts[v.id].e), conversions: Number(counts[v.id].c) })) }, { log: "Résultats du test mis à jour" });
    toast({ title: "Résultats enregistrés" });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-semibold">Variante</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">{metric.exposures}</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">{metric.conversions}</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Taux (IC)</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Écart vs A</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">p-valeur</th>
              <th scope="col" className="py-2 text-right font-semibold">Proba. &gt; A</th>
            </tr>
          </thead>
          <tbody>
            {a.variants.map((v, i) => {
              const src = exp.variants[i];
              return (
                <tr key={v.key} className="border-b border-border last:border-0">
                  <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                    <span className="flex items-center gap-2">
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded bg-surface-2 font-mono text-xs font-semibold text-foreground">{v.key}</span>
                      <span className="min-w-0">
                        <span className="block font-medium text-foreground">{v.name}</span>
                        {src?.description ? <span className="block text-xs text-muted-foreground">{src.description}</span> : null}
                      </span>
                    </span>
                  </th>
                  <td className="tabular py-2.5 pr-3 text-right">
                    {editable && src ? (
                      <Input aria-label={`${metric.exposures} — variante ${v.key}`} inputMode="numeric" value={counts[src.id]?.e ?? ""} onChange={(e) => setCounts((c) => ({ ...c, [src.id]: { ...c[src.id], e: e.target.value.replace(/[^\d]/g, "") } }))} className="ml-auto h-8 w-24 text-right" />
                    ) : (
                      number(v.exposures)
                    )}
                  </td>
                  <td className="tabular py-2.5 pr-3 text-right">
                    {editable && src ? (
                      <Input aria-label={`${metric.conversions} — variante ${v.key}`} inputMode="numeric" value={counts[src.id]?.c ?? ""} onChange={(e) => setCounts((c) => ({ ...c, [src.id]: { ...c[src.id], c: e.target.value.replace(/[^\d]/g, "") } }))} className="ml-auto h-8 w-24 text-right" />
                    ) : (
                      number(v.conversions)
                    )}
                  </td>
                  <td className="tabular py-2.5 pr-3 text-right">
                    <span className="font-medium text-foreground">{v.exposures ? rateFmt(v.rate) : "—"}</span>
                    {v.exposures ? <span className="block text-[11px] text-muted-foreground">{rateFmt(v.ci[0])} – {rateFmt(v.ci[1])}</span> : null}
                  </td>
                  <td className={cn("tabular py-2.5 pr-3 text-right", v.significant && (v.upliftPct ?? 0) > 0 && "font-semibold text-success-text", v.significant && (v.upliftPct ?? 0) < 0 && "font-semibold text-danger-text")}>
                    {v.isControl ? "référence" : v.upliftPct !== undefined && Number.isFinite(v.upliftPct) ? `${v.upliftPct > 0 ? "+" : ""}${v.upliftPct.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %${v.significant ? " ✓" : ""}` : "—"}
                  </td>
                  <td className="tabular py-2.5 pr-3 text-right text-muted-foreground">{v.pValue !== undefined ? (v.pValue < 0.0001 ? "< 0,0001" : v.pValue.toLocaleString("fr-FR", { maximumSignificantDigits: 2 })) : "—"}</td>
                  <td className="tabular py-2.5 text-right text-muted-foreground">{v.probBeatControl !== undefined ? `${Math.round(v.probBeatControl * 100)} %` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">✓ = écart statistiquement significatif. « Proba. &gt; A » : lecture bayésienne indicative, ne remplace pas la taille d'échantillon.</p>
      {editable ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-2">
          <p className="text-xs text-muted-foreground">Email : reportez les envois et {metric.conversions.toLowerCase()} de votre outil d'emailing pour chaque variante.</p>
          <Button size="sm" disabled={!dirty} onClick={save}>
            <Save /> Enregistrer les chiffres
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Taux de chaque variante avec son intervalle de confiance (échelle commune, repère du contrôle). */
function RateChart({ a }: { a: ExperimentAnalysis }) {
  const withData = a.variants.filter((v) => v.exposures > 0);
  if (withData.length < 2) return null;
  const max = Math.max(...withData.map((v) => v.ci[1])) * 1.1 || 1;
  const ctrl = a.variants[0];
  const pos = (x: number) => `${(x / max) * 100}%`;
  return (
    <div className="mt-5 space-y-2" role="img" aria-label="Taux de conversion par variante avec intervalle de confiance">
      {withData.map((v, i) => (
        <div key={v.key} className="grid grid-cols-[2rem_minmax(0,1fr)_4.5rem] items-center gap-2">
          <span className="font-mono text-xs font-semibold text-foreground">{v.key}</span>
          <div className="relative h-5 rounded bg-surface-2">
            <div className="absolute inset-y-1 left-0 rounded-sm" style={{ width: pos(v.rate), background: `var(--series-${i + 1})`, opacity: 0.85 }} />
            <div className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-foreground/70" style={{ left: pos(v.ci[0]), width: `calc(${pos(v.ci[1])} - ${pos(v.ci[0])})` }} />
            <div className="absolute top-1 bottom-1 w-px bg-foreground/70" style={{ left: pos(v.ci[0]) }} />
            <div className="absolute top-1 bottom-1 w-px bg-foreground/70" style={{ left: pos(v.ci[1]) }} />
            {!v.isControl && ctrl.exposures ? <div className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-foreground/40" style={{ left: pos(ctrl.rate) }} title="Taux du contrôle" /> : null}
          </div>
          <span className="tabular text-right text-xs text-foreground">{rateFmt(v.rate)}</span>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">Barre : taux observé · trait : intervalle de confiance · repère gris : taux du contrôle. Des intervalles qui se chevauchent largement = pas de conclusion possible.</p>
    </div>
  );
}

function MethodCard({ exp }: { exp: Experiment }) {
  const tips: Record<Experiment["channel"], string[]> = {
    publicite: [
      "Même ensemble de publicités, même audience, même budget : seule la créa change.",
      "Les chiffres viennent de la synchro de la régie (clics sur lien pour Meta, clics pour LinkedIn).",
      "Méfiez-vous de l'optimisation automatique des régies : elle favorise vite une créa et déséquilibre les expositions ; le test reste valable mais la moins diffusée mettra plus longtemps à atteindre l'échantillon.",
    ],
    site: [
      "Le site tire la variante à partir de l'identifiant anonyme du visiteur : un visiteur voit toujours la même version.",
      "Exposition envoyée à l'affichage, conversion à l'envoi du formulaire : une seule de chaque par visiteur.",
      "Mesure soumise au consentement « mesure d'audience » du bandeau cookies si l'identifiant est stocké dans un cookie.",
    ],
    email: [
      "Envoyez les variantes au même moment, sur des échantillons tirés au hasard de la même liste.",
      "Taux d'ouverture : fiabilité réduite depuis la protection de la vie privée d'Apple Mail — préférez le taux de clic pour décider.",
      "Reportez les chiffres une fois les envois terminés (48 h après).",
    ],
  };
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Bonnes pratiques</CardTitle>
          <CardDescription>Pour que le résultat soit fiable</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-foreground">
          {[...tips[exp.channel], "Fixez la durée à l'avance (au moins une semaine complète) et ne coupez pas le test dès qu'un écart apparaît."].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function SiteIntegrationCard({ exp }: { exp: Experiment }) {
  const origin = useOrigin();
  const weights = exp.variants.map((v) => `{ key: "${v.key}", weight: ${v.weight} }`).join(", ");
  const snippet = `// Site startupweek.tech — composant de la page testée
const EXPERIMENT = "${exp.key}";
const variants = [${weights}]; // ou GET ${origin}/api/experiments

// 1. Tirage stable : même visiteur → même variante
function pickVariant(visitorId: string) {
  let h = 2166136261;
  for (const ch of EXPERIMENT + visitorId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let r = ((h >>> 0) % 10000) / 100; // 0 → 100
  for (const v of variants) { if ((r -= v.weight) < 0) return v.key; }
  return variants[0].key;
}

// 2. Exposition (à l'affichage) puis conversion (formulaire envoyé)
function track(visitorId: string, variant: string, event: "exposure" | "conversion") {
  return fetch("${origin}/api/experiments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ experiment: EXPERIMENT, variant, visitorId, event }),
    keepalive: true,
  });
}`;
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Intégration sur le site</CardTitle>
          <CardDescription>Le test n'est servi que lorsqu'il est « En cours ». Origines autorisées : ALLOWED_ORIGINS.</CardDescription>
        </div>
        <CopyButton value={snippet} label="Copier le code" />
      </CardHeader>
      <CardContent>
        <pre className="scrollbar-thin max-h-80 overflow-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-[11px] leading-relaxed text-foreground">
          <code>{snippet}</code>
        </pre>
      </CardContent>
    </Card>
  );
}

function ConcludeModal({ exp, a, onClose }: { exp: Experiment; a: ExperimentAnalysis; onClose: () => void }) {
  const { update } = useActions();
  const toast = useToast();
  const [winner, setWinner] = React.useState(a.winner?.key ?? (a.verdict === "controle" ? exp.variants[0]?.key ?? "" : ""));
  const [conclusion, setConclusion] = React.useState("");
  const submit = () => {
    if (conclusion.trim().length < 10) {
      toast({ title: "Conclusion requise", description: "Notez ce que vous retenez : c'est ce qui rend le test utile pour la suite.", tone: "danger" });
      return;
    }
    update("experiments", exp.id, { status: "termine", endAt: new Date().toISOString(), winnerKey: winner || undefined, conclusion: conclusion.trim() }, { log: winner ? `Test conclu : variante ${winner} retenue` : "Test conclu sans gagnant", kind: "statut" });
    toast({ title: "Test conclu", description: winner ? `Variante ${winner} retenue` : "Pas de gagnant retenu" });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Conclure le test"
      description={a.headline}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>Conclure</Button>
        </>
      }
    >
      <div className="space-y-4">
        {a.verdict !== "gagnant" && a.verdict !== "controle" && a.verdict !== "sans_difference" ? (
          <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-text">L'échantillon nécessaire n'est pas atteint : conclure maintenant expose à un faux positif. Continuez le test si possible.</p>
        ) : null}
        <FormField label="Variante retenue" htmlFor="conclude-winner" hint="Laissez vide si aucune version ne s'impose">
          <Select id="conclude-winner" value={winner} onChange={(e) => setWinner(e.target.value)} options={exp.variants.map((v) => ({ value: v.key, label: `${v.key} — ${v.name}` }))} placeholder="Aucune (pas de différence)" />
        </FormField>
        <FormField label="Ce que l'on retient" htmlFor="conclude-text">
          <Textarea id="conclude-text" value={conclusion} onChange={(e) => setConclusion(e.target.value)} placeholder="Ex. : le prix barré fait mieux cliquer (+38 %) ; on le généralise aux campagnes de novembre et on teste ensuite l'accroche." />
        </FormField>
      </div>
    </Modal>
  );
}
