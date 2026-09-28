"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, Megaphone, PenLine, Plus } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState, LinkButton } from "@/components/ui";
import { date, money, number } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PromoRow } from "../lib/metrics";
import { FillBar, Hint, PlatformBadge, RISK } from "./parts";

/**
 * Plan de promotion : chaque session publique des 120 prochains jours, son remplissage face à un
 * repère simple (0 % à J-90 → 100 % à J-7), les campagnes et contenus qui la poussent, et l'action conseillée.
 */
export function PromotionTab({ plan, editable, onCreateCampaign }: { plan: PromoRow[]; editable: boolean; onCreateCampaign: (eventId: string) => void }) {
  if (!plan.length) {
    return <EmptyState icon={CalendarClock} title="Aucune session publique dans les 120 prochains jours" description="Les sessions ouvertes aux inscriptions apparaissent ici avec leur rythme de remplissage." />;
  }
  const counts = plan.reduce<Record<string, number>>((m, p) => ({ ...m, [p.risk]: (m[p.risk] ?? 0) + 1 }), {});
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["critique", "a_surveiller", "ok", "complet"] as const).map((r) =>
          counts[r] ? (
            <Badge key={r} tone={RISK[r].tone} dot>
              {counts[r]} · {RISK[r].label}
            </Badge>
          ) : null,
        )}
        <Hint className="sm:ml-auto">Repère de remplissage : linéaire de 0 % à J-90 jusqu'à 100 % à J-7 — un ordre de grandeur, pas une prévision.</Hint>
      </div>

      <ul className="space-y-3">
        {plan.map((p) => (
          <li key={p.event.id}>
            <Card className={cn(p.risk === "critique" && "border-danger/40")}>
              <CardContent className="grid grid-cols-1 gap-4 py-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={RISK[p.risk].tone} dot>
                      {RISK[p.risk].label}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">{p.event.code}</span>
                    <span className="text-xs text-muted-foreground">J-{p.daysLeft} · {date(p.event.startAt, "d MMM")}</span>
                  </div>
                  <Link href={`/sessions/${p.event.id}`} className="mt-1 block truncate text-sm font-medium text-foreground hover:underline">
                    {p.event.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {!p.tracksFill ? `${number(p.capacity)} places` : `${p.enrolled} inscrit${p.enrolled > 1 ? "s" : ""} / ${p.capacity} · ${p.pipeline} en cours de candidature · ${p.remaining} place${p.remaining > 1 ? "s" : ""}`}
                  </p>
                </div>

                <div className="space-y-2">
                  {p.tracksFill ? <FillBar fill={p.fillRate} expected={p.expectedFill} label={p.event.code} /> : <p className="text-xs text-muted-foreground">Webinaire gratuit : inscriptions suivies hors CRM</p>}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Megaphone className="size-3.5" aria-hidden="true" />
                    {p.campaigns.length ? (
                      <>
                        {p.activeCampaigns} active{p.activeCampaigns > 1 ? "s" : ""} / {p.campaigns.length}
                        {[...new Set(p.campaigns.map((c) => c.platform))].map((pl) => (
                          <PlatformBadge key={pl} platform={pl} />
                        ))}
                        <span>· {money(p.spendCents)} dépensés</span>
                      </>
                    ) : (
                      <span>Aucune campagne</span>
                    )}
                    <span aria-hidden="true">·</span>
                    <PenLine className="size-3.5" aria-hidden="true" />
                    {p.contentsPlanned} contenu{p.contentsPlanned > 1 ? "s" : ""}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch xl:flex-row xl:items-center">
                  <p className="text-sm text-foreground">{p.advice}</p>
                  {editable && p.risk !== "complet" ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button size="sm" variant={p.risk === "critique" ? "primary" : "secondary"} onClick={() => onCreateCampaign(p.event.id)}>
                        <Plus /> Campagne
                      </Button>
                      <LinkButton size="sm" variant="ghost" href="/contenus">
                        Contenu
                      </LinkButton>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
