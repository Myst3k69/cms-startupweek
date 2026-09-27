"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Euro, FlaskConical, MousePointerClick, Pencil, Plus, Target, Trash2, TrendingUp, UserCheck, UserPlus } from "lucide-react";
import { ColumnChart, LineChart } from "@/components/charts";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DescriptionList, EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { ContactLink, SessionLink, UserChip } from "@/components/shared/entity-links";
import { StatusSelect } from "@/components/shared/status-select";
import { CopyButton } from "@/features/system/components/copy-button";
import { useActions, useEntity, useNow, useSession } from "@/lib/hooks";
import { APPLICATION_STATUSES, SUBMISSION_TYPES, labelOf } from "@/lib/domain/constants";
import type { AdCampaign, AdCreative, CampaignStatus } from "@/lib/domain/types";
import { compactNumber, date, dateTime, money, number, percent, relative } from "@/lib/format";
import { AD_PLATFORMS, CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUSES, CREATIVE_FORMATS, PLATFORM_UTM_SOURCE } from "../lib/labels";
import { ATTRIBUTION_DAYS, buildUtmUrl, campaignWindow, dailySeries, sumStats } from "../lib/metrics";
import { analyzeExperiment } from "../lib/stats";
import { CampaignFormModal } from "./campaign-form-modal";
import { CreativeFormModal } from "./creative-form-modal";
import { ExperimentFormModal } from "./experiment-form-modal";
import { BudgetBar, PlatformBadge, VERDICT_LABEL, VERDICT_TONE, cost, roasFmt } from "./parts";
import { useMarketingData } from "./use-marketing-data";

const DAY = 86_400_000;

export function CampaignDetail({ id }: { id: string }) {
  const campaign = useEntity("adCampaigns", id);
  if (!campaign) {
    return <EmptyState title="Campagne introuvable" description="Elle a peut-être été supprimée." action={<Link href="/marketing?onglet=campagnes" className="text-sm font-medium text-accent-text hover:underline">Retour aux campagnes</Link>} />;
  }
  return <CampaignView campaign={campaign} />;
}

function CampaignView({ campaign: c }: { campaign: AdCampaign }) {
  const router = useRouter();
  const now = useNow();
  const { update, remove } = useActions();
  const { canEdit, can } = useSession();
  const editable = canEdit("marketing");
  const data = useMarketingData();
  const p = data.perf.get(c.id)!;
  const rows = React.useMemo(() => data.byCampaign.get(c.id) ?? [], [data.byCampaign, c.id]);
  const { attribute } = data;
  const attribution = React.useMemo(() => attribute(c.utmCampaign, campaignWindow(c)), [attribute, c]);
  const tests = data.experiments.filter((e) => e.campaignId === c.id);
  const [editing, setEditing] = React.useState(false);
  const [creative, setCreative] = React.useState<{ creative?: AdCreative } | null>(null);
  const [testing, setTesting] = React.useState(false);

  const chart = React.useMemo(() => {
    const start = new Date(c.startAt).getTime();
    const end = Math.min(c.endAt ? new Date(c.endAt).getTime() : now, now - DAY);
    const from = Math.max(start, end - 119 * DAY);
    const keys: string[] = [];
    const labels: string[] = [];
    for (let d = from; d <= end; d += DAY) {
      keys.push(format(d, "yyyy-MM-dd"));
      labels.push(format(d, "d MMM", { locale: fr }).replace(".", ""));
    }
    return { labels, ...dailySeries(rows, keys) };
  }, [c.startAt, c.endAt, now, rows]);

  const creativeStats = React.useMemo(() => new Map(c.creatives.map((cr) => [cr.id, sumStats(rows.filter((r) => r.creativeId === cr.id))])), [c.creatives, rows]);

  const trackedUrl = buildUtmUrl(c.landingUrl || "https://www.startupweek.tech", {
    source: PLATFORM_UTM_SOURCE[c.platform],
    medium: "paid_social",
    campaign: c.utmCampaign,
    content: c.platform === "meta" ? "{{ad.id}}" : undefined,
  });
  const urlParams = `utm_source=${PLATFORM_UTM_SOURCE[c.platform]}&utm_medium=paid_social&utm_campaign=${c.utmCampaign}${c.platform === "meta" ? "&utm_content={{ad.id}}" : ""}`;

  const setStatus = (status: CampaignStatus) => update("adCampaigns", c.id, { status }, { log: `Statut : ${labelOf(CAMPAIGN_STATUSES, c.status)} → ${labelOf(CAMPAIGN_STATUSES, status)}`, kind: "statut" });
  const del = () => {
    if (!window.confirm(`Supprimer la campagne « ${c.name} » ?`)) return;
    remove("adCampaigns", c.id, { log: `Campagne supprimée : ${c.name}` });
    router.push("/marketing?onglet=campagnes");
  };

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Marketing", href: "/marketing" }, { label: "Campagnes", href: "/marketing?onglet=campagnes" }, { label: c.name }]}
        title={c.name}
        description={c.audience || undefined}
        actions={
          editable ? (
            <>
              {p.spendCents === 0 ? (
                <Button variant="ghost" onClick={del} aria-label="Supprimer la campagne">
                  <Trash2 />
                </Button>
              ) : null}
              {c.creatives.length >= 2 ? (
                <Button variant="secondary" onClick={() => setTesting(true)}>
                  <FlaskConical /> Tester les créas
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil /> Modifier
              </Button>
            </>
          ) : null
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <PlatformBadge platform={c.platform} />
          {editable ? <StatusSelect options={CAMPAIGN_STATUSES} value={c.status} onChange={setStatus} label="Statut de la campagne" /> : <StatusBadge options={CAMPAIGN_STATUSES} value={c.status} />}
          <Badge>{labelOf(CAMPAIGN_OBJECTIVES, c.objective)}</Badge>
          {c.eventId ? <SessionLink id={c.eventId} /> : <span className="text-xs text-muted-foreground">Campagne de marque</span>}
          <span className="font-mono text-xs text-muted-foreground">utm_campaign={c.utmCampaign || "∅"}</span>
        </div>
      </PageHeader>

      <section aria-label="Indicateurs" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Dépense" value={money(p.spendCents)} hint={c.budgetCents ? `${Math.round(p.budgetUsedPct ?? 0)} % du budget de ${money(c.budgetCents)}` : "Budget non défini"} icon={Euro} />
        <StatCard label="Clics" value={compactNumber(p.clicks)} hint={`${compactNumber(p.impressions)} impressions · CTR ${percent(p.ctr, 2)}`} icon={MousePointerClick} />
        <StatCard label="Leads régie" value={number(p.leads)} hint={`CPL ${cost(p.cplCents)} · CPC ${cost(p.cpcCents)}`} icon={Target} />
        <StatCard label="Leads CRM" value={number(p.crmLeads)} hint={`${cost(p.cplCrmCents)} par lead CRM`} icon={UserPlus} />
        <StatCard label="Inscriptions" value={number(p.enrolled)} hint={`${cost(p.cpaCents)} par inscription`} icon={UserCheck} />
        <StatCard label="ROAS" value={roasFmt(p.roas)} hint={`${money(p.revenueCents)} HT facturés`} icon={TrendingUp} />
      </section>

      {rows.length ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Dépense quotidienne</CardTitle>
                <CardDescription>En euros{chart.labels.length >= 120 ? " · 120 derniers jours" : ""}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ColumnChart labels={chart.labels} series={[{ name: "Dépense", values: chart.spend }]} format={(v) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`} height={200} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Clics et leads</CardTitle>
                <CardDescription>Déclarés par la régie</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <LineChart labels={chart.labels} series={[{ name: "Clics", values: chart.clicks }, { name: "Leads", values: chart.leads }]} height={200} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Pas encore de statistiques. {c.externalId ? "Elles arriveront à la prochaine synchro de la régie." : "Renseignez l'identifiant de la campagne dans la régie (Modifier) pour recevoir les chiffres."}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Publicités</CardTitle>
            <CardDescription>Performance par création · base des A/B tests de créas</CardDescription>
          </div>
          {editable ? (
            <Button size="sm" variant="secondary" onClick={() => setCreative({})}>
              <Plus /> Publicité
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {c.creatives.length ? (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-semibold">Publicité</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Dépense</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Impr.</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">CTR</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Leads</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">CPL</th>
                    <th scope="col" className="py-2 text-right font-semibold"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {c.creatives.map((cr) => {
                    const s = creativeStats.get(cr.id)!;
                    return (
                      <tr key={cr.id} className="border-b border-border align-top last:border-0">
                        <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">{cr.name}</span>
                            <Badge>{labelOf(CREATIVE_FORMATS, cr.format)}</Badge>
                            {!cr.active ? <Badge tone="neutral">Inactive</Badge> : null}
                          </span>
                          {cr.headline ? <span className="mt-0.5 block text-xs text-foreground">« {cr.headline} »</span> : null}
                          {cr.primaryText ? <span className="block max-w-xl text-xs text-muted-foreground">{cr.primaryText}</span> : null}
                        </th>
                        <td className="tabular py-2.5 pr-3 text-right">{money(s.spendCents)}</td>
                        <td className="tabular py-2.5 pr-3 text-right">{compactNumber(s.impressions)}</td>
                        <td className="tabular py-2.5 pr-3 text-right">{s.impressions ? percent(s.ctr, 2) : "—"}</td>
                        <td className="tabular py-2.5 pr-3 text-right">{number(s.leads)}</td>
                        <td className="tabular py-2.5 pr-3 text-right">{cost(s.cplCents)}</td>
                        <td className="py-2 text-right">
                          {editable ? (
                            <Button size="icon-xs" variant="ghost" onClick={() => setCreative({ creative: cr })} aria-label={`Modifier ${cr.name}`}>
                              <Pencil />
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune publicité. La synchro les importe automatiquement ; vous pouvez aussi les saisir pour préparer la campagne.</p>
          )}
          {tests.length ? (
            <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
              {tests.map((t) => {
                const a = analyzeExperiment(t, data.adStats);
                return (
                  <li key={t.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <FlaskConical className="size-4 text-faint" aria-hidden="true" />
                    <Link href={`/marketing/tests/${t.id}`} className="font-medium text-accent-text hover:underline">
                      {t.name}
                    </Link>
                    <Badge tone={VERDICT_TONE[a.verdict]} dot>
                      {t.status === "termine" && t.winnerKey ? `Gagnant : ${t.winnerKey}` : VERDICT_LABEL[a.verdict]}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Leads attribués</CardTitle>
              <CardDescription>Candidatures et demandes du site arrivées avec utm_campaign={c.utmCampaign || "∅"}, du lancement à {ATTRIBUTION_DAYS} jours après la fin</CardDescription>
            </div>
            <Badge tone="info">{attribution.leads}</Badge>
          </CardHeader>
          <CardContent>
            {attribution.leads === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun lead attribué pour l'instant. Vérifiez que les liens des publicités portent bien cette utm_campaign.</p>
            ) : (
              <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                {can("candidatures")
                  ? [...attribution.applications]
                      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
                      .map((a) => (
                        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <span className="min-w-0">
                            <Link href={`/candidatures/${a.id}`} className="font-mono text-xs text-accent-text hover:underline">
                              #{a.number}
                            </Link>{" "}
                            <ContactLink id={a.contactId} className="text-sm" />
                            <span className="block text-xs text-muted-foreground">
                              {date(a.submittedAt)} · <SessionLink id={a.eventId} short />
                            </span>
                          </span>
                          <StatusBadge options={APPLICATION_STATUSES} value={a.status} />
                        </li>
                      ))
                  : null}
                {attribution.submissions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <span className="text-sm text-foreground">{s.company ?? s.name}</span>
                      <span className="block text-xs text-muted-foreground">{date(s.receivedAt)}</span>
                    </span>
                    <Badge>{labelOf(SUBMISSION_TYPES, s.type)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Détails & tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BudgetBar spent={p.spendCents} budget={c.budgetCents} />
            <DescriptionList
              columns={2}
              items={[
                { label: "Régie", value: labelOf(AD_PLATFORMS, c.platform) },
                { label: "Période", value: `${date(c.startAt)} → ${c.endAt ? date(c.endAt) : "en continu"}` },
                { label: "Budget quotidien", value: c.dailyBudgetCents ? money(c.dailyBudgetCents) : "—" },
                { label: "Responsable", value: c.ownerId ? <UserChip id={c.ownerId} /> : "—" },
                { label: "Identifiant régie", value: c.externalId ? <span className="break-all font-mono text-xs">{c.externalId}</span> : "Non relié" },
                { label: "Dernière synchro", value: c.lastSyncedAt ? <span title={dateTime(c.lastSyncedAt)}>{relative(c.lastSyncedAt, now)}</span> : "—" },
              ]}
            />
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">{c.platform === "meta" ? "Paramètres d'URL (champ « Paramètres d'URL » de la publicité Meta)" : "Paramètres à ajouter à l'URL de destination"}</p>
              <div className="flex items-start gap-2">
                <code className="min-w-0 flex-1 break-all rounded-md bg-surface-2 px-2 py-1.5 font-mono text-[11px] text-foreground">{urlParams}</code>
                <CopyButton value={urlParams} iconOnly label="Copier les paramètres" />
              </div>
            </div>
            {trackedUrl ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Lien complet</p>
                <div className="flex items-start gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-md bg-surface-2 px-2 py-1.5 font-mono text-[11px] text-foreground">{trackedUrl}</code>
                  <CopyButton value={trackedUrl} iconOnly label="Copier le lien" />
                </div>
              </div>
            ) : null}
            {c.notes ? <p className="rounded-md bg-surface-2 px-3 py-2 text-sm text-foreground">{c.notes}</p> : null}
          </CardContent>
        </Card>
      </div>

      {editing ? <CampaignFormModal open campaign={c} onClose={() => setEditing(false)} /> : null}
      {creative ? <CreativeFormModal campaign={c} creative={creative.creative} onClose={() => setCreative(null)} /> : null}
      {testing ? (
        <ExperimentFormModal
          open
          preset={{
            channel: "publicite",
            metric: "ctr",
            campaignId: c.id,
            eventId: c.eventId,
            name: `Créas — ${c.name}`,
            variants: c.creatives.filter((cr) => cr.active).slice(0, 4).map((cr, i) => ({ id: `var_${i}_${cr.id}`, key: ["A", "B", "C", "D"][i], name: cr.name, description: cr.headline, creativeId: cr.id, weight: 0, exposures: 0, conversions: 0 })),
          }}
          onClose={() => setTesting(false)}
          onSaved={(e) => router.push(`/marketing/tests/${e.id}`)}
        />
      ) : null}
    </div>
  );
}
