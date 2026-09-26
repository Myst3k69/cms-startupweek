"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Frown, Globe, Meh, MessageSquareQuote, Smile, Star, Target, TrendingUp, Users } from "lucide-react";
import { useCollection, useLookup, useNow, useSession } from "@/lib/hooks";
import { contactName } from "@/lib/domain/selectors";
import type { Evaluation, ID } from "@/lib/domain/types";
import { date } from "@/lib/format";
import { BarList, ColumnChart, LineChart } from "@/components/charts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Segmented,
  Select,
  StatCard,
} from "@/components/ui";
import { ContactLink } from "@/components/shared/entity-links";
import { cn } from "@/lib/utils";
import {
  STAKEHOLDER_KINDS,
  endedSessions,
  enrolledApplications,
  fmt1,
  fmtPct,
  mean,
  ratingStats,
  sentimentOf,
} from "../metrics";
import { useQualiopiData } from "../use-qualiopi-data";
import { QualiopiNav } from "./qualiopi-nav";
import { scoreLabel } from "../labels";
import { PublishResultsModal } from "./publish-results-modal";
import { ActionDrawer, type ActionDraft } from "./action-drawer";

type Kind = (typeof STAKEHOLDER_KINDS)[number]["value"];
type Sentiment = "tous" | "positif" | "neutre" | "negatif";

const SENTIMENT_ICON = { positif: Smile, neutre: Meh, negatif: Frown } as const;
const SENTIMENT_TONE = { positif: "success", neutre: "neutral", negatif: "danger" } as const;
const SENTIMENT_LABEL = { positif: "Positif", neutre: "Neutre", negatif: "Négatif" } as const;

/** Moyenne des scores d'une évaluation des acquis (/5), à défaut d'objectivesReached. */
function acquisScore(e: Evaluation): number | null {
  if (typeof e.objectivesReached === "number") return e.objectivesReached;
  const vals = Object.values(e.scores).filter((v) => v <= 5);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export function SatisfactionPage() {
  const data = useQualiopiData();
  const contacts = useLookup("contacts");
  const speakersById = useLookup("speakers");
  const now = useNow();
  const { canEdit } = useSession();
  const readOnly = !canEdit("qualiopi");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const publishOpen = searchParams.get("publier") === "1";
  const actions = useCollection("improvementActions");

  const [kind, setKind] = React.useState<Kind>("a_chaud");
  const [sessionId, setSessionId] = React.useState("");
  const [sentiment, setSentiment] = React.useState<Sentiment>("tous");
  const [shown, setShown] = React.useState(12);
  const [actionDraft, setActionDraft] = React.useState<ActionDraft | null>(null);

  const setPublish = (open: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (open) params.set("publier", "1");
    else params.delete("publier");
    const qs = params.toString();
    window.history.replaceState(null, "", `${pathname}${qs ? `?${qs}` : ""}`);
  };

  const { events, evaluations, applications } = data;
  const eventsById = React.useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const ended = React.useMemo(() => endedSessions(events, now), [events, now]);

  /** Sessions qui ont des évaluations du type choisi (ordre chronologique). */
  const kindEvals = React.useMemo(() => evaluations.filter((e) => e.kind === kind), [evaluations, kind]);
  const sessionsWithEvals = React.useMemo(() => {
    const ids = new Set(kindEvals.map((e) => e.eventId));
    return events.filter((e) => ids.has(e.id)).sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [kindEvals, events]);

  const scoped = React.useMemo(() => kindEvals.filter((e) => !sessionId || e.eventId === sessionId), [kindEvals, sessionId]);
  const rs = React.useMemo(() => ratingStats(scoped), [scoped]);

  const response = React.useMemo(() => {
    const scopeSessions = sessionId ? ended.filter((e) => e.id === sessionId) : ended;
    const ids = new Set(scopeSessions.map((e) => e.id));
    const inScope = scoped.filter((e) => ids.has(e.eventId)).length;
    let denom = 0;
    let unit = "participants";
    if (kind === "a_chaud" || kind === "a_froid") denom = enrolledApplications(applications, ids).length;
    else if (kind === "intervenant") {
      denom = new Set(scopeSessions.flatMap((e) => e.speakerIds)).size;
      unit = "intervenants";
    } else if (kind === "financeur") {
      denom = enrolledApplications(applications, ids).filter((a) => ["opco", "france_travail", "region", "entreprise", "ecole"].includes(a.funding)).length;
      unit = "dossiers financés";
    } else {
      denom = scopeSessions.filter((e) => e.orgId).length + enrolledApplications(applications, ids).filter((a) => a.funding === "entreprise").length;
      unit = "clients B2B / employeurs";
    }
    return { rate: denom ? Math.min(100, (inScope / denom) * 100) : null, count: inScope, denom, unit };
  }, [sessionId, ended, scoped, kind, applications]);

  const perSession = React.useMemo(
    () =>
      sessionsWithEvals.map((ev) => {
        const list = kindEvals.filter((e) => e.eventId === ev.id);
        const s = ratingStats(list);
        return { ev, stats: s };
      }),
    [sessionsWithEvals, kindEvals],
  );

  const distribution = React.useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    scoped.forEach((e) => {
      if (typeof e.satisfaction === "number") counts[Math.min(5, Math.max(1, Math.round(e.satisfaction))) - 1] += 1;
    });
    return counts;
  }, [scoped]);

  /** Progression positionnement d'entrée → évaluation des acquis (indicateur 11). */
  const progression = React.useMemo(() => {
    return ended
      .map((ev) => {
        const trainees = enrolledApplications(applications, new Set([ev.id]));
        const posEvals = evaluations.filter((e) => e.eventId === ev.id && e.kind === "positionnement");
        const entryFromApps = trainees.map((a) => (typeof a.positioningScore === "number" ? a.positioningScore * 10 : NaN));
        const entryFromEvals = posEvals.map((e) => (typeof e.objectivesReached === "number" ? e.objectivesReached * 20 : NaN));
        const entry = mean(entryFromApps.some(Number.isFinite) ? entryFromApps : entryFromEvals);
        const exit = mean(evaluations.filter((e) => e.eventId === ev.id && e.kind === "acquis").map((e) => (acquisScore(e) ?? NaN) * 20));
        return { ev, entry, exit };
      })
      .filter((p) => p.entry !== null || p.exit !== null);
  }, [ended, applications, evaluations]);
  const avgGain = mean(progression.filter((p) => p.entry !== null && p.exit !== null).map((p) => p.exit! - p.entry!));

  const competencies = React.useMemo(() => {
    const acc = new Map<string, number[]>();
    evaluations
      .filter((e) => e.kind === "acquis" && (!sessionId || e.eventId === sessionId))
      .forEach((e) => Object.entries(e.scores).forEach(([k, v]) => v <= 5 && acc.set(k, [...(acc.get(k) ?? []), v])));
    return [...acc.entries()].map(([k, v]) => ({ key: k, label: scoreLabel(k), value: mean(v) ?? 0, n: v.length })).sort((a, b) => b.value - a.value);
  }, [evaluations, sessionId]);

  const verbatims = React.useMemo(
    () =>
      scoped
        .filter((e) => e.comment?.trim())
        .map((e) => ({ e, s: sentimentOf(e) }))
        .sort((a, b) => b.e.submittedAt.localeCompare(a.e.submittedAt)),
    [scoped],
  );
  const sentimentCounts = React.useMemo(() => {
    const c = { positif: 0, neutre: 0, negatif: 0 };
    verbatims.forEach((v) => (c[v.s] += 1));
    return c;
  }, [verbatims]);
  const visibleVerbatims = verbatims.filter((v) => sentiment === "tous" || v.s === sentiment);
  const actionByEval = React.useMemo(() => {
    const m = new Map<ID, ID>();
    actions.forEach((a) => a.originRef?.entity === "evaluations" && m.set(a.originRef.id, a.id));
    return m;
  }, [actions]);

  const kindLabel = STAKEHOLDER_KINDS.find((k) => k.value === kind)!.label;
  const showObjectives = kind === "a_chaud" || kind === "a_froid";

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Qualiopi · indicateurs 2, 11 et 30"
        title="Appréciations des parties prenantes"
        description="Satisfaction des stagiaires à chaud et à froid, retours des financeurs, entreprises et intervenants — et progression des acquis. Données issues des questionnaires du CRM."
        breadcrumbs={[{ label: "Qualiopi", href: "/qualiopi" }, { label: "Satisfaction" }]}
        actions={
          <Button onClick={() => setPublish(true)}>
            <Globe /> Publier les indicateurs de résultats
          </Button>
        }
      />
      <QualiopiNav />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Segmented
          value={kind}
          onChange={(v) => {
            setKind(v);
            setShown(12);
          }}
          options={STAKEHOLDER_KINDS.map((k) => ({ value: k.value, label: k.short, count: evaluations.filter((e) => e.kind === k.value).length }))}
          className="max-w-full overflow-x-auto"
        />
        <Select
          aria-label="Filtrer par session"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          options={sessionsWithEvals.map((s) => ({ value: s.id, label: `${s.code} · ${s.city} · ${date(s.startAt, "MMM yyyy")}` }))}
          placeholder="Toutes les sessions"
          className="w-full sm:w-72"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Note moyenne" value={fmt1(rs.avg, " /5")} hint={`${rs.count} réponse(s) · ${kindLabel.toLowerCase()}`} icon={Star} />
        <StatCard label="NPS" value={rs.nps === null ? "—" : `${rs.nps > 0 ? "+" : ""}${rs.nps}`} hint={rs.npsCount ? `% promoteurs (9-10) − % détracteurs (0-6) · ${rs.npsCount} votes` : "Aucune note de recommandation"} icon={TrendingUp} />
        <StatCard label="Taux de réponse" value={fmtPct(response.rate)} hint={response.denom ? `${response.count} / ${response.denom} ${response.unit}` : `Aucun ${response.unit.replace(/s$/, "")} concerné`} icon={Users} />
        <StatCard
          label={showObjectives ? "Objectifs atteints (auto-éval.)" : "Satisfaits (≥ 4/5)"}
          value={showObjectives ? fmt1(rs.objectivesAvg, " /5") : fmtPct(rs.satisfiedPct)}
          hint={showObjectives ? `${fmtPct(rs.satisfiedPct)} de répondants satisfaits` : `${rs.withComment} verbatim(s)`}
          icon={Target}
        />
      </div>

      {kindEvals.length === 0 ? (
        <EmptyState icon={MessageSquareQuote} title={`Aucune évaluation « ${kindLabel.toLowerCase()} »`} description="Les réponses aux questionnaires envoyés automatiquement (J+1, J+60, financeurs, intervenants) apparaîtront ici." className="mb-6" />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Évolution par session</CardTitle>
                <CardDescription>Note moyenne /5 — toutes sessions, ordre chronologique</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <LineChart
                labels={perSession.map((p) => p.ev.code)}
                series={[
                  { name: "Satisfaction /5", values: perSession.map((p) => Number((p.stats.avg ?? 0).toFixed(2))) },
                  ...(showObjectives && perSession.some((p) => p.stats.objectivesAvg !== null)
                    ? [{ name: "Objectifs atteints /5", values: perSession.map((p) => Number((p.stats.objectivesAvg ?? 0).toFixed(2))) }]
                    : []),
                ]}
                format={(v) => fmt1(v)}
                height={220}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Comparaison des sessions</CardTitle>
                <CardDescription>Part de répondants satisfaits (note ≥ 4/5)</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <BarList
                max={100}
                format={(v) => `${Math.round(v)} %`}
                items={[...perSession]
                  .filter((p) => p.stats.satisfiedPct !== null)
                  .sort((a, b) => (b.stats.satisfiedPct ?? 0) - (a.stats.satisfiedPct ?? 0))
                  .slice(0, 8)
                  .map((p) => ({
                    key: p.ev.id,
                    label: `${p.ev.code} · ${p.ev.city}`,
                    value: p.stats.satisfiedPct ?? 0,
                    hint: `${p.stats.count} rép.${p.stats.nps !== null ? ` · NPS ${p.stats.nps}` : ""}`,
                  }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Distribution des notes</CardTitle>
                <CardDescription>{sessionId ? `Session ${eventsById.get(sessionId)?.code}` : "Toutes les sessions"} — nombre de réponses par note</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ColumnChart labels={["1/5", "2/5", "3/5", "4/5", "5/5"]} series={[{ name: "Réponses", values: distribution }]} height={200} format={(v) => String(Math.round(v))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Progression positionnement → acquis</CardTitle>
                <CardDescription>
                  Indicateur 11 — score moyen d'entrée vs évaluation des acquis, en % du maximum
                  {avgGain !== null ? (
                    <>
                      {" "}
                      · progression moyenne <strong className="text-foreground">{avgGain >= 0 ? "+" : ""}{Math.round(avgGain)} pts</strong>
                    </>
                  ) : null}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {progression.length ? (
                <ColumnChart
                  stacked={false}
                  labels={progression.map((p) => p.ev.code)}
                  series={[
                    { name: "Positionnement d'entrée", values: progression.map((p) => Math.round(p.entry ?? 0)) },
                    { name: "Évaluation des acquis", values: progression.map((p) => Math.round(p.exit ?? 0)) },
                  ]}
                  height={200}
                  format={(v) => `${Math.round(v)} %`}
                />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">Pas encore de positionnements ni d'évaluations des acquis sur les sessions terminées.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {competencies.length ? (
        <Card className="mb-6">
          <CardHeader>
            <div>
              <CardTitle>Acquis par compétence</CardTitle>
              <CardDescription>Moyenne des grilles d'évaluation des acquis (/5){sessionId ? ` — session ${eventsById.get(sessionId)?.code}` : ""}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BarList max={5} format={(v) => fmt1(v)} items={competencies.map((c) => ({ key: c.key, label: c.label, value: c.value, hint: `${c.n} éval.` }))} className="sm:columns-2 sm:gap-8 [&>li]:break-inside-avoid" />
          </CardContent>
        </Card>
      ) : null}

      {/* Verbatims */}
      <section aria-labelledby="verbatims-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="verbatims-title" className="text-sm font-semibold text-foreground">
              Verbatims
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{kindLabel} — les retours négatifs peuvent être transformés en action d'amélioration (ind. 32).</p>
          </div>
          <Segmented
            value={sentiment}
            onChange={(v) => {
              setSentiment(v);
              setShown(12);
            }}
            options={[
              { value: "tous", label: "Tous", count: verbatims.length },
              { value: "positif", label: "Positifs", count: sentimentCounts.positif },
              { value: "neutre", label: "Neutres", count: sentimentCounts.neutre },
              { value: "negatif", label: "Négatifs", count: sentimentCounts.negatif },
            ]}
          />
        </div>
        {visibleVerbatims.length === 0 ? (
          <EmptyState icon={MessageSquareQuote} title="Aucun verbatim" description="Aucun commentaire pour ce filtre." />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {visibleVerbatims.slice(0, shown).map(({ e, s }) => {
                const Icon = SENTIMENT_ICON[s];
                const ev = eventsById.get(e.eventId);
                const sp = e.speakerId ? speakersById.get(e.speakerId) : undefined;
                const linkedAction = actionByEval.get(e.id);
                return (
                  <li key={e.id} className={cn("flex flex-col rounded-lg border bg-surface p-4", s === "negatif" ? "border-danger/25" : "border-border")}>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge tone={SENTIMENT_TONE[s]}>
                        <Icon className="size-3" aria-hidden="true" /> {SENTIMENT_LABEL[s]}
                      </Badge>
                      {typeof e.satisfaction === "number" ? <span className="tabular font-medium text-foreground">{e.satisfaction}/5</span> : null}
                      {typeof e.nps === "number" ? <span className="tabular">NPS {e.nps}</span> : null}
                      {ev ? <span className="font-mono">{ev.code}</span> : null}
                      <span className="ml-auto">{date(e.submittedAt)}</span>
                    </div>
                    <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-foreground">« {e.comment} »</blockquote>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="min-w-0">
                        {e.contactId && contacts.get(e.contactId) ? <ContactLink id={e.contactId} /> : sp ? `${sp.firstName} ${sp.lastName} (intervenant)` : e.contactId ? contactName(contacts.get(e.contactId)) : "Réponse anonyme"}
                      </span>
                      {linkedAction ? (
                        <Link href={`/qualiopi/amelioration?id=${linkedAction}`} className="font-medium text-accent-text hover:underline">
                          Action créée →
                        </Link>
                      ) : s === "negatif" && !readOnly ? (
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() =>
                            setActionDraft({
                              title: `Retour ${ev?.code ?? ""} — ${(e.comment ?? "").slice(0, 60)}${(e.comment ?? "").length > 60 ? "…" : ""}`,
                              description: `Verbatim (${kindLabel.toLowerCase()}, ${date(e.submittedAt)}) : « ${e.comment} »\n\nAction proposée : `,
                              origin: e.kind === "intervenant" ? "intervenant" : "evaluation",
                              originRef: { entity: "evaluations", id: e.id },
                              indicatorCodes: [30, 32],
                              status: "a_faire",
                            })
                          }
                        >
                          Créer une action
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {visibleVerbatims.length > shown ? (
              <div className="mt-3 flex justify-center">
                <Button variant="secondary" size="sm" onClick={() => setShown((n) => n + 12)}>
                  Afficher plus ({visibleVerbatims.length - shown} restants)
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <PublishResultsModal open={publishOpen} onClose={() => setPublish(false)} data={data} />
      <ActionDrawer open={!!actionDraft} draft={actionDraft ?? undefined} onClose={() => setActionDraft(null)} />
    </div>
  );
}
