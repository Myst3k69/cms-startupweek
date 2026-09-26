"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FileCheck2,
  FileText,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useActions, useCollection, useNow, useSession } from "@/lib/hooks";
import { ACTION_STATUSES, INDICATOR_STATUSES, QUALIOPI_CRITERIA, labelOf } from "@/lib/domain/constants";
import { contactName, daysUntil, qualiopiReadiness } from "@/lib/domain/selectors";
import type { ID, IndicatorStatus, QualiopiIndicator } from "@/lib/domain/types";
import { date, relative } from "@/lib/format";
import {
  Avatar,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  Input,
  LinkButton,
  PageHeader,
  Progress,
  ProgressRing,
  SectionTitle,
  Select,
  StatCard,
  StatusBadge,
  useToast,
} from "@/components/ui";
import { StatusSelect } from "@/components/shared/status-select";
import { UserChip } from "@/components/shared/entity-links";
import { cn } from "@/lib/utils";
import { computeAutoEvidence, VERDICTS, type AutoEvidence } from "../auto-evidence";
import { DAY, isActionLate, isActionOpen, isTrainingSession } from "../metrics";
import { useQualiopiData } from "../use-qualiopi-data";
import { QualiopiNav } from "./qualiopi-nav";
import { IndicatorDrawer } from "./indicator-drawer";
import { printHref } from "@/features/documents/links";

const STATUS_BAR: Record<IndicatorStatus, string> = {
  conforme: "bg-success",
  partiel: "bg-warning",
  non_conforme: "bg-danger",
  a_faire: "bg-surface-3",
  non_applicable: "bg-faint/40",
};

function scoreTone(score: number): "success" | "warning" | "danger" {
  return score >= 80 ? "success" : score >= 50 ? "warning" : "danger";
}

export function QualiopiDashboard() {
  const data = useQualiopiData();
  const now = useNow();
  const { canEdit } = useSession();
  const { update } = useActions();
  const toast = useToast();
  const readOnly = !canEdit("qualiopi");
  const { settings, users } = data;

  const [selected, setSelected] = React.useState<ID | null>(null);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<IndicatorStatus | "">("");
  const [owner, setOwner] = React.useState("");
  const [criterion, setCriterion] = React.useState(0);
  const [noEvidence, setNoEvidence] = React.useState(false);
  const listRef = React.useRef<HTMLElement>(null);

  const indicators = React.useMemo(() => [...data.indicators].sort((a, b) => a.code - b.code), [data.indicators]);
  const evidenceCount = React.useMemo(() => {
    const m = new Map<number, number>();
    data.evidences.forEach((e) => m.set(e.indicatorCode, (m.get(e.indicatorCode) ?? 0) + 1));
    return m;
  }, [data.evidences]);
  const autoByCode = React.useMemo(() => {
    const m = new Map<number, AutoEvidence>();
    indicators.forEach((i) => {
      if (i.autoSource && i.status !== "non_applicable") m.set(i.code, computeAutoEvidence(i.autoSource, data, now, i.code));
    });
    return m;
  }, [indicators, data, now]);

  const readiness = qualiopiReadiness(indicators);
  const applicable = indicators.filter((i) => i.status !== "non_applicable");
  const counts = React.useMemo(() => {
    const c: Record<IndicatorStatus, number> = { conforme: 0, partiel: 0, non_conforme: 0, a_faire: 0, non_applicable: 0 };
    indicators.forEach((i) => (c[i.status] += 1));
    return c;
  }, [indicators]);

  const criteria = React.useMemo(
    () =>
      QUALIOPI_CRITERIA.map((c) => {
        const list = indicators.filter((i) => i.criterion === c.code);
        const app = list.filter((i) => i.status !== "non_applicable");
        return {
          ...c,
          score: qualiopiReadiness(indicators, c.code),
          total: list.length,
          applicable: app.length,
          conformes: app.filter((i) => i.status === "conforme").length,
          nonConformes: app.filter((i) => i.status === "non_conforme").length,
          todo: app.filter((i) => i.status === "a_faire").length,
        };
      }),
    [indicators],
  );

  const qualityLead = users.find((u) => u.id === settings.qualityLeadId);
  const disabilityLead = users.find((u) => u.id === settings.disabilityLeadId);
  const auditDays = settings.auditDate ? daysUntil(settings.auditDate, now) : null;

  const evidenceStats = React.useMemo(() => {
    const expired = data.evidences.filter((e) => e.validUntil && Date.parse(e.validUntil) < now).length;
    const soon = data.evidences.filter((e) => e.validUntil && Date.parse(e.validUntil) >= now && Date.parse(e.validUntil) - now < 60 * DAY).length;
    const withoutProof = applicable.filter((i) => !evidenceCount.get(i.code) && !i.autoSource).length;
    return { total: data.evidences.length, expired, soon, withoutProof };
  }, [data.evidences, now, applicable, evidenceCount]);

  const openActions = React.useMemo(
    () =>
      data.improvementActions
        .filter(isActionOpen)
        .sort((a, b) => (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity)),
    [data.improvementActions],
  );
  const lateActions = openActions.filter((a) => isActionLate(a, now)).length;

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return indicators.filter(
      (i) =>
        (!status || i.status === status) &&
        (!owner || (owner === "none" ? !i.ownerId : i.ownerId === owner)) &&
        (!criterion || i.criterion === criterion) &&
        (!noEvidence || (!evidenceCount.get(i.code) && i.status !== "non_applicable")) &&
        (!needle || `${i.code} ${i.title} ${i.expectation}`.toLowerCase().includes(needle)),
    );
  }, [indicators, q, status, owner, criterion, noEvidence, evidenceCount]);

  const grouped = React.useMemo(
    () => QUALIOPI_CRITERIA.map((c) => ({ criterion: c, items: filtered.filter((i) => i.criterion === c.code) })).filter((g) => g.items.length),
    [filtered],
  );
  const hasFilters = !!(q || status || owner || criterion || noEvidence);

  const changeStatus = (ind: QualiopiIndicator, next: IndicatorStatus) => {
    update("indicators", ind.id, { status: next, lastReviewedAt: new Date().toISOString() }, { log: `Indicateur ${ind.code} : ${labelOf(INDICATOR_STATUSES, ind.status)} → ${labelOf(INDICATOR_STATUSES, next)}`, kind: "statut" });
    toast({ title: `Indicateur ${ind.code} : ${labelOf(INDICATOR_STATUSES, next)}` });
  };

  const focusCriterion = (code: number) => {
    setCriterion((c) => (c === code ? 0 : code));
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Qualité · Référentiel national qualité"
        title="Qualiopi — préparation à l'audit initial"
        description={`${settings.legalName} n'est pas encore certifié Qualiopi : la certification est en cours. Pilotez les 32 indicateurs, rassemblez les preuves et suivez le plan d'actions jusqu'à l'audit.`}
        actions={
          <>
            <LinkButton href="/qualiopi/amelioration" variant="secondary" size="sm">
              <ClipboardList /> Plan d'actions
            </LinkButton>
            <LinkButton href="/qualiopi/reclamations" variant="secondary" size="sm">
              Registre des réclamations
            </LinkButton>
          </>
        }
      />
      <QualiopiNav />

      {/* ───── En-tête : score, audit, statuts, référents ───── */}
      <Card className="mb-6">
        <div className="grid divide-y divide-border md:grid-cols-2 md:divide-y-0 xl:grid-cols-[auto_1fr_1.3fr_1fr] xl:divide-x">
          <div className="flex items-center gap-4 p-4 sm:p-5">
            <ProgressRing value={readiness} size={112} stroke={10} label={`${readiness} %`} sublabel="préparation" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Score de préparation</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {applicable.length} indicateurs applicables · conforme = 1, partiel = 0,5.
              </p>
              <Badge tone="warning" dot className="mt-2">
                Non certifié — certification en cours
              </Badge>
            </div>
          </div>

          <div className="p-4 sm:p-5 md:border-l md:border-border xl:border-l-0">
            <p className="eyebrow text-muted-foreground">Audit initial</p>
            {settings.auditDate && auditDays !== null ? (
              <>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="tabular text-3xl font-semibold tracking-tight text-foreground">{auditDays > 0 ? `J-${auditDays}` : auditDays === 0 ? "Aujourd'hui" : "Passé"}</span>
                  <span className="text-sm text-muted-foreground">{date(settings.auditDate, "EEEE d MMMM yyyy")}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{auditDays > 0 ? `soit ${Math.ceil(auditDays / 7)} semaine(s) pour finaliser les preuves` : "Mettez à jour la date d'audit dans les paramètres."}</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-foreground">
                Date d'audit à planifier —{" "}
                <Link href="/parametres" className="text-accent-text hover:underline">
                  paramètres
                </Link>
              </p>
            )}
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>{settings.auditBody ?? "Organisme certificateur à choisir"}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Nouvel entrant : <span className="font-medium text-foreground">{settings.newcomer ? "oui — certains indicateurs audités en surveillance" : "non"}</span>
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <p className="eyebrow text-muted-foreground">Répartition des 32 indicateurs</p>
            <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-surface-2" role="img" aria-label={INDICATOR_STATUSES.map((s) => `${s.label} ${counts[s.value]}`).join(", ")}>
              {INDICATOR_STATUSES.map((s) =>
                counts[s.value] ? <div key={s.value} className={cn("h-full border-r-2 border-surface last:border-r-0", STATUS_BAR[s.value])} style={{ width: `${(counts[s.value] / Math.max(1, indicators.length)) * 100}%` }} /> : null,
              )}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
              {INDICATOR_STATUSES.map((s) => (
                <li key={s.value}>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus((cur) => (cur === s.value ? "" : s.value));
                      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="inline-flex items-center gap-1.5 rounded text-xs text-muted-foreground hover:text-foreground"
                    aria-pressed={status === s.value}
                  >
                    <span className={cn("size-2.5 rounded-[3px]", STATUS_BAR[s.value])} aria-hidden="true" />
                    {s.label}
                    <span className="tabular font-semibold text-foreground">{counts[s.value]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 p-4 sm:p-5 md:border-l md:border-border xl:border-l-0">
            <p className="eyebrow text-muted-foreground">Référents</p>
            {[
              { role: "Référent qualité", user: qualityLead },
              { role: "Référent handicap", user: disabilityLead },
            ].map((r) => (
              <div key={r.role} className="flex items-center gap-2.5">
                {r.user ? <Avatar name={r.user.name} color={r.user.color} size="md" /> : <span className="inline-flex size-8 items-center justify-center rounded-full bg-danger-soft text-danger-text"><AlertTriangle className="size-4" aria-hidden="true" /></span>}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{r.user?.name ?? "À désigner"}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ───── KPIs ───── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Indicateurs conformes" value={`${counts.conforme}/${applicable.length}`} hint={`${counts.partiel} partiel(s) · ${counts.non_applicable} non applicable(s)`} icon={ShieldCheck} />
        <StatCard label="Non conformes ou à faire" value={counts.non_conforme + counts.a_faire} hint={`${counts.non_conforme} non conforme(s) · ${counts.a_faire} à faire`} icon={AlertTriangle} />
        <StatCard
          label="Preuves au dossier"
          value={evidenceStats.total}
          hint={`${evidenceStats.expired} expirée(s) · ${evidenceStats.soon} expirent < 60 j · ${evidenceStats.withoutProof} indicateur(s) sans preuve`}
          icon={FileCheck2}
        />
        <StatCard label="Actions d'amélioration ouvertes" value={openActions.length} hint={lateActions ? `${lateActions} en retard` : "Aucune en retard"} icon={ClipboardList} href="/qualiopi/amelioration" />
      </div>

      {/* ───── Score par critère ───── */}
      <SectionTitle title="Score par critère" description="Cliquez sur un critère pour filtrer la liste des indicateurs." />
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {criteria.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => focusCriterion(c.code)}
            aria-pressed={criterion === c.code}
            className={cn(
              "flex flex-col rounded-lg border bg-surface p-4 text-left shadow-sm transition-colors hover:border-border-strong",
              criterion === c.code ? "border-ring ring-2 ring-ring/20" : "border-border",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="eyebrow text-muted-foreground">Critère {c.code}</span>
              <span className="tabular text-lg font-semibold text-foreground">{c.score} %</span>
            </div>
            <span className="mt-1 text-sm font-medium text-foreground">{c.short}</span>
            <Progress value={c.score} tone={scoreTone(c.score)} className="mt-3" label={`Critère ${c.code} : ${c.score} %`} />
            <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="tabular">
                {c.conformes}/{c.applicable} conformes
              </span>
              {c.total - c.applicable ? <span className="tabular">· {c.total - c.applicable} NA</span> : null}
              {c.nonConformes ? (
                <Badge tone="danger" dot>
                  {c.nonConformes} non conforme{c.nonConformes > 1 ? "s" : ""}
                </Badge>
              ) : null}
            </span>
          </button>
        ))}
        <div className="flex flex-col justify-between rounded-lg border border-dashed border-border-strong p-4">
          <div>
            <span className="eyebrow text-muted-foreground">Périmètre</span>
            <p className="mt-1 text-sm text-foreground">Actions de formation uniquement (L.6313-1 1°), sans certification RNCP/RS ni apprentissage.</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Ind. 3, 7, 16 (certification) et 13-15, 20, 29 (apprentissage), 28 (AFEST) : non applicables.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ───── Indicateurs ───── */}
        <section ref={listRef} aria-labelledby="ind-title" className="min-w-0 scroll-mt-20">
          <SectionTitle title={<span id="ind-title">Les 32 indicateurs</span>} description={`${filtered.length} affiché(s) sur ${indicators.length}`} />
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (n°, mot-clé)…" aria-label="Rechercher un indicateur" className="pl-8" />
            </div>
            <Select aria-label="Filtrer par statut" value={status} onChange={(e) => setStatus(e.target.value as IndicatorStatus | "")} options={INDICATOR_STATUSES} placeholder="Tous les statuts" className="w-[calc(50%-4px)] sm:w-auto" />
            <Select
              aria-label="Filtrer par responsable"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              options={[...users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name })), { value: "none", label: "Sans responsable" }]}
              placeholder="Tous les responsables"
              className="w-[calc(50%-4px)] sm:w-auto"
            />
            <Select
              aria-label="Filtrer par critère"
              value={String(criterion || "")}
              onChange={(e) => setCriterion(Number(e.target.value) || 0)}
              options={QUALIOPI_CRITERIA.map((c) => ({ value: String(c.code), label: `Critère ${c.code} · ${c.short}` }))}
              placeholder="Tous les critères"
              className="w-full sm:w-auto"
            />
            <Checkbox label="Sans preuve" checked={noEvidence} onChange={(e) => setNoEvidence(e.target.checked)} />
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setStatus("");
                  setOwner("");
                  setCriterion(0);
                  setNoEvidence(false);
                }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" /> Réinitialiser
              </button>
            ) : null}
          </div>

          {grouped.length === 0 ? (
            <EmptyState icon={Search} title={indicators.length ? "Aucun indicateur ne correspond aux filtres" : "Référentiel non chargé"} description={indicators.length ? "Modifiez ou réinitialisez les filtres." : "Les 32 indicateurs apparaîtront ici dès l'initialisation des données."} />
          ) : (
            <div className="space-y-5">
              {grouped.map((g) => (
                <div key={g.criterion.code} className="overflow-hidden rounded-lg border border-border bg-surface">
                  <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-2/60 px-4 py-2.5">
                    <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">
                      <span className="text-muted-foreground">Critère {g.criterion.code} · </span>
                      {g.criterion.short}
                    </h3>
                    <span className="tabular shrink-0 text-xs text-muted-foreground">{qualiopiReadiness(indicators, g.criterion.code)} %</span>
                  </div>
                  <ul className="divide-y divide-border">
                    {g.items.map((ind) => {
                      const n = evidenceCount.get(ind.code) ?? 0;
                      const auto = autoByCode.get(ind.code);
                      const na = ind.status === "non_applicable";
                      return (
                        <li key={ind.id} className={cn("group relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:grid-cols-[auto_minmax(0,1fr)_auto]", na && "opacity-60")}>
                          <span className="tabular mt-0.5 inline-flex h-6 min-w-9 items-center justify-center rounded-md bg-surface-2 px-1.5 text-xs font-semibold text-foreground ring-1 ring-inset ring-border">{ind.code}</span>
                          <div className="min-w-0">
                            <button type="button" onClick={() => setSelected(ind.id)} className="line-clamp-2 text-left text-sm text-foreground after:absolute after:inset-0 hover:text-accent-text focus-visible:outline-none" aria-label={`Ouvrir l'indicateur ${ind.code}`}>
                              {ind.title}
                            </button>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              {auto ? (
                                <Badge tone={auto.verdict === "ok" ? "success" : auto.verdict === "a_ameliorer" ? "warning" : "accent"} title={auto.summary}>
                                  <Sparkles className="size-3" aria-hidden="true" /> Preuve auto · {VERDICTS[auto.verdict].label}
                                </Badge>
                              ) : ind.autoSource ? (
                                <Badge tone="accent">
                                  <Sparkles className="size-3" aria-hidden="true" /> Preuve auto
                                </Badge>
                              ) : null}
                              {ind.newcomerDeferred && settings.newcomer ? <Badge tone="info">Nouvel entrant : audité en surveillance</Badge> : null}
                              <span className={cn("inline-flex items-center gap-1", !n && !na && "text-danger-text")}>
                                <FileCheck2 className="size-3.5" aria-hidden="true" />
                                {n} preuve{n > 1 ? "s" : ""}
                              </span>
                              {ind.lastReviewedAt ? <span className="text-faint">· revu {relative(ind.lastReviewedAt, now)}</span> : null}
                            </div>
                          </div>
                          <div className="relative z-10 col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
                            <UserChip id={ind.ownerId} />
                            {readOnly ? (
                              <StatusBadge options={INDICATOR_STATUSES} value={ind.status} />
                            ) : (
                              <StatusSelect options={INDICATOR_STATUSES} value={ind.status} onChange={(v) => changeStatus(ind, v)} label={`Statut de l'indicateur ${ind.code}`} className="w-36" />
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ───── Colonne latérale ───── */}
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Plan d'actions</CardTitle>
                <CardDescription>
                  {openActions.length} action(s) ouverte(s){lateActions ? ` · ${lateActions} en retard` : ""}
                </CardDescription>
              </div>
              <Link href="/qualiopi/amelioration" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent-text hover:underline">
                Tout voir <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </CardHeader>
            <CardContent>
              {openActions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune action ouverte.</p>
              ) : (
                <ul className="space-y-3">
                  {openActions.slice(0, 6).map((a) => {
                    const late = isActionLate(a, now);
                    return (
                      <li key={a.id} className="min-w-0">
                        <Link href={`/qualiopi/amelioration?id=${a.id}`} className="line-clamp-2 text-sm font-medium text-foreground hover:text-accent-text hover:underline">
                          {a.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <StatusBadge options={ACTION_STATUSES} value={a.status} />
                          {a.dueAt ? (
                            <span className={cn("inline-flex items-center gap-1", late && "font-medium text-danger-text")}>
                              <CalendarClock className="size-3.5" aria-hidden="true" />
                              {late ? "En retard · " : ""}
                              {date(a.dueAt)}
                            </span>
                          ) : null}
                          {a.indicatorCodes.length ? <span className="tabular">Ind. {a.indicatorCodes.join(", ")}</span> : null}
                          <UserChip id={a.ownerId} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <DocumentsCard />
        </aside>
      </div>

      <IndicatorDrawer indicatorId={selected} onClose={() => setSelected(null)} data={data} />
    </div>
  );
}

/** Accès rapide aux documents imprimables (brouillons générés depuis les données). */
function DocumentsCard() {
  const events = useCollection("events");
  const applications = useCollection("applications");
  const contacts = useCollection("contacts");
  const now = useNow();
  const sessions = React.useMemo(
    () =>
      events
        .filter(isTrainingSession)
        .sort((a, b) => Math.abs(Date.parse(a.startAt) - now) - Math.abs(Date.parse(b.startAt) - now)),
    [events, now],
  );
  const [eventId, setEventId] = React.useState("");
  const [appId, setAppId] = React.useState("");
  const currentEvent = eventId || sessions[0]?.id || "";
  const contactById = React.useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const participants = React.useMemo(
    () =>
      applications
        .filter((a) => a.eventId === currentEvent && (a.status === "inscrite" || a.status === "acceptee"))
        .map((a) => ({ value: a.id, label: `${contactName(contactById.get(a.contactId))} · #${a.number}` }))
        .sort((a, b) => a.label.localeCompare(b.label, "fr")),
    [applications, currentEvent, contactById],
  );
  const currentApp = participants.some((p) => p.value === appId) ? appId : participants[0]?.value ?? "";

  const docLink = (href: string, label: string, disabled?: boolean) =>
    disabled ? (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-faint">
        <FileText className="size-3.5" aria-hidden="true" /> {label}
      </span>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2.5 text-xs font-medium text-foreground shadow-sm hover:bg-surface-2">
        <Printer className="size-3.5" aria-hidden="true" /> {label}
      </a>
    );

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Documents de formation</CardTitle>
          <CardDescription>Brouillons A4 générés depuis le CRM (ind. 1, 9, 11, 12) — à imprimer ou enregistrer en PDF.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune session de formation.</p>
        ) : (
          <>
            <div className="space-y-2">
              <Select aria-label="Session" value={currentEvent} onChange={(e) => setEventId(e.target.value)} options={sessions.map((s) => ({ value: s.id, label: `${s.code} · ${s.city} · ${date(s.startAt, "d MMM yy")}` }))} />
              <div className="flex flex-wrap gap-2">
                {docLink(printHref.programme(currentEvent), "Fiche programme")}
                {docLink(printHref.emargement(currentEvent), "Émargement")}
              </div>
            </div>
            <div className="space-y-2">
              <Select aria-label="Participant" value={currentApp} onChange={(e) => setAppId(e.target.value)} options={participants} placeholder={participants.length ? undefined : "Aucun participant"} />
              <div className="flex flex-wrap gap-2">
                {docLink(printHref.convention(currentApp), "Convention", !currentApp)}
                {docLink(printHref.convocation(currentApp), "Convocation", !currentApp)}
                {docLink(printHref.attestation(currentApp), "Attestations", !currentApp)}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
