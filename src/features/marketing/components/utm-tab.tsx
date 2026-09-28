"use client";

import * as React from "react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, FormField, Input, Select } from "@/components/ui";
import { CopyButton } from "@/features/system/components/copy-button";
import { useCollection, useNow, useSettings } from "@/lib/hooks";
import type { AdCampaign } from "@/lib/domain/types";
import { number } from "@/lib/format";
import { PLATFORM_UTM_SOURCE, UTM_MEDIUMS, UTM_SOURCES } from "../lib/labels";
import { buildUtmUrl, utmValue } from "../lib/metrics";
import { Hint } from "./parts";

const DAY = 86_400_000;

/** Générateur de liens tagués + contrôle des utm_campaign réellement reçues par le CRM. */
export function UtmTab({ campaigns }: { campaigns: AdCampaign[] }) {
  const settings = useSettings();
  const now = useNow();
  const applications = useCollection("applications");
  const submissions = useCollection("submissions");
  const [base, setBase] = React.useState(settings.website);
  const [campaignId, setCampaignId] = React.useState("");
  const [source, setSource] = React.useState(UTM_SOURCES[0].value);
  const [medium, setMedium] = React.useState(UTM_SOURCES[0].medium);
  const [campaign, setCampaign] = React.useState("");
  const [content, setContent] = React.useState("");
  const [term, setTerm] = React.useState("");

  const pickCampaign = (id: string) => {
    setCampaignId(id);
    const c = campaigns.find((x) => x.id === id);
    if (!c) return;
    setSource(PLATFORM_UTM_SOURCE[c.platform]);
    setMedium("paid_social");
    setCampaign(c.utmCampaign);
    if (c.landingUrl) setBase(c.landingUrl);
  };

  const url = buildUtmUrl(base.trim(), { source: utmValue(source), medium: utmValue(medium), campaign: utmValue(campaign), content: content ? utmValue(content) : undefined, term: term ? utmValue(term) : undefined });
  const missing = !campaign.trim() ? "Renseignez utm_campaign : sans elle, aucun lead ne sera attribué." : null;

  // utm_campaign reçues sur 90 jours : celles qui ne correspondent à aucune campagne trahissent une faute de frappe.
  const received = React.useMemo(() => {
    const since = now - 90 * DAY;
    const known = new Set(campaigns.map((c) => c.utmCampaign.toLowerCase()));
    const m = new Map<string, { count: number; source?: string }>();
    const add = (utm: { campaign?: string; source?: string } | undefined, at: string) => {
      const k = utm?.campaign?.trim().toLowerCase();
      if (!k || new Date(at).getTime() < since) return;
      const cur = m.get(k) ?? { count: 0, source: utm?.source };
      cur.count++;
      m.set(k, cur);
    };
    for (const a of applications) add(a.utm, a.submittedAt);
    for (const s of submissions) if (s.type !== "candidature") add(s.utm, s.receivedAt);
    return [...m.entries()].map(([utm, v]) => ({ utm, ...v, known: known.has(utm) })).sort((a, b) => Number(a.known) - Number(b.known) || b.count - a.count);
  }, [applications, submissions, campaigns, now]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Card className="xl:col-span-3">
        <CardHeader>
          <div>
            <CardTitle>Générateur de liens</CardTitle>
            <CardDescription>Pour les publicités, posts, newsletters et partenaires : même convention partout</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Partir d'une campagne" htmlFor="utm-cmp" hint="Optionnel : pré-remplit source, medium et campagne">
              <Select id="utm-cmp" value={campaignId} onChange={(e) => pickCampaign(e.target.value)} options={campaigns.map((c) => ({ value: c.id, label: c.name }))} placeholder="—" />
            </FormField>
            <FormField label="Page de destination" htmlFor="utm-base">
              <Input id="utm-base" type="url" value={base} onChange={(e) => setBase(e.target.value)} />
            </FormField>
            <FormField label="utm_source" htmlFor="utm-source">
              <Select
                id="utm-source"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setMedium(UTM_SOURCES.find((s) => s.value === e.target.value)?.medium ?? medium);
                }}
                options={UTM_SOURCES.map((s) => ({ value: s.value, label: `${s.value} — ${s.label}` }))}
              />
            </FormField>
            <FormField label="utm_medium" htmlFor="utm-medium">
              <Select id="utm-medium" value={medium} onChange={(e) => setMedium(e.target.value)} options={UTM_MEDIUMS} />
            </FormField>
            <FormField label="utm_campaign" htmlFor="utm-campaign" error={missing ?? undefined}>
              <Input id="utm-campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} onBlur={() => setCampaign(utmValue(campaign))} className="font-mono" placeholder="sw0013_split_novembre" />
            </FormField>
            <FormField label="utm_content" htmlFor="utm-content" hint="Publicité / variante (Meta : {{ad.id}})">
              <Input id="utm-content" value={content} onChange={(e) => setContent(e.target.value)} className="font-mono" placeholder="b_prix_barre" />
            </FormField>
            <FormField label="utm_term" htmlFor="utm-term" hint="Optionnel (mot-clé, audience)">
              <Input id="utm-term" value={term} onChange={(e) => setTerm(e.target.value)} className="font-mono" />
            </FormField>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Lien tagué</p>
            {url ? (
              <div className="flex items-start gap-2">
                <code className="min-w-0 flex-1 break-all rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-foreground">{url}</code>
                <CopyButton value={url} label="Copier" />
              </div>
            ) : (
              <p className="text-sm text-danger-text">Adresse de destination invalide (https://…).</p>
            )}
          </div>
          <Hint>Valeurs normalisées automatiquement : minuscules, sans accents, « _ » comme séparateur. Le formulaire du site transmet utm_source, utm_medium, utm_campaign et utm_content au CRM avec chaque candidature.</Hint>
        </CardContent>
      </Card>

      <div className="space-y-4 xl:col-span-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Convention de nommage</CardTitle>
              <CardDescription>Une valeur = un canal, toujours écrite de la même façon</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-xs">
              {UTM_SOURCES.map((s) => (
                <li key={s.value} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{s.label}</span>
                  <code className="font-mono text-foreground">
                    {s.value} / {s.medium}
                  </code>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              utm_campaign : <code className="font-mono text-foreground">&lt;session&gt;_&lt;angle&gt;</code> ex. <code className="font-mono text-foreground">sw0012_founder_octobre</code>. Unique par campagne : c'est la clé qui relie les candidatures à la dépense.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>utm_campaign reçues (90 j)</CardTitle>
              <CardDescription>Celles sans campagne correspondante ne sont attribuées à aucune dépense</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {received.length ? (
              <ul className="divide-y divide-border">
                {received.slice(0, 12).map((r) => (
                  <li key={r.utm} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                    <code className="min-w-0 truncate font-mono text-foreground">{r.utm}</code>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular text-muted-foreground">{number(r.count)} lead{r.count > 1 ? "s" : ""}</span>
                      <Badge tone={r.known ? "success" : "warning"} dot>
                        {r.known ? "Campagne" : "Non reliée"}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune utm_campaign reçue sur la période.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
