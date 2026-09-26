"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  Circle,
  ExternalLink,
  MessageSquarePlus,
  Pencil,
  Plus,
  Presentation,
  Rocket,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { Sparkline } from "@/components/charts";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  FormField,
  Input,
  LinkButton,
  Modal,
  PageHeader,
  Progress,
  Select,
  StatusBadge,
  Textarea,
  useToast,
} from "@/components/ui";
import { ContactLink, SessionLink } from "@/components/shared/entity-links";
import { StatusSelect } from "@/components/shared/status-select";
import { ActivityTimeline } from "@/components/shared/timeline";
import { useCrm } from "@/lib/store";
import { APPLICATION_STATUSES, PROJECT_STAGES, SPEAKER_KINDS, labelOf } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { ID, Project } from "@/lib/domain/types";
import { compactNumber, date, money, number, relative } from "@/lib/format";
import { useActions, useCollection, useEntity, useLookup, useNow, useSession } from "@/lib/hooks";
import { cn, uid } from "@/lib/utils";
import { PROJECT_HEALTH } from "../../lib/labels";
import { DAY, fromDateInput, toDateInput, sessionDates } from "../../lib/sessions";
import { followUpState } from "./project-card";

/* ───────────── Fiche ───────────── */

function PitchCard({ p, canEdit }: { p: Project; canEdit: boolean }) {
  const { update } = useActions();
  const toast = useToast();
  const [draft, setDraft] = React.useState<Pick<Project, "name" | "tagline" | "description" | "sector" | "targetMarket" | "sixMonthGoals" | "mvpUrl" | "deckUrl"> | null>(null);
  const set = <K extends keyof NonNullable<typeof draft>>(k: K, v: string) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const save = () => {
    if (!draft || !draft.name.trim()) return;
    update(
      "projects",
      p.id,
      {
        name: draft.name.trim(),
        tagline: draft.tagline.trim(),
        description: draft.description.trim(),
        sector: draft.sector.trim(),
        targetMarket: draft.targetMarket.trim(),
        sixMonthGoals: draft.sixMonthGoals.trim(),
        mvpUrl: draft.mvpUrl?.trim() || undefined,
        deckUrl: draft.deckUrl?.trim() || undefined,
      },
      { log: "Fiche projet mise à jour" },
    );
    toast({ title: "Fiche projet enregistrée" });
    setDraft(null);
  };
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Fiche projet</CardTitle>
          <CardDescription>Pitch, marché et objectifs — partagés avec les mentors.</CardDescription>
        </div>
        {canEdit && !draft ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDraft({ name: p.name, tagline: p.tagline, description: p.description, sector: p.sector, targetMarket: p.targetMarket, sixMonthGoals: p.sixMonthGoals, mvpUrl: p.mvpUrl ?? "", deckUrl: p.deckUrl ?? "" })}
          >
            <Pencil /> Modifier
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {draft ? (
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <FormField label="Nom" htmlFor="pf-name" error={draft.name.trim() ? undefined : "Nom requis"}>
              <Input id="pf-name" value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </FormField>
            <FormField label="Secteur" htmlFor="pf-sector">
              <Input id="pf-sector" value={draft.sector} onChange={(e) => set("sector", e.target.value)} />
            </FormField>
            <FormField label="Pitch en une phrase" htmlFor="pf-tagline" className="sm:col-span-2">
              <Input id="pf-tagline" value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} />
            </FormField>
            <FormField label="Description" htmlFor="pf-desc" className="sm:col-span-2">
              <Textarea id="pf-desc" value={draft.description} onChange={(e) => set("description", e.target.value)} />
            </FormField>
            <FormField label="Marché cible" htmlFor="pf-market" className="sm:col-span-2">
              <Input id="pf-market" value={draft.targetMarket} onChange={(e) => set("targetMarket", e.target.value)} />
            </FormField>
            <FormField label="Objectifs à 6 mois" htmlFor="pf-goals" className="sm:col-span-2">
              <Textarea id="pf-goals" value={draft.sixMonthGoals} onChange={(e) => set("sixMonthGoals", e.target.value)} className="min-h-20" />
            </FormField>
            <FormField label="Lien du MVP" htmlFor="pf-mvp">
              <Input id="pf-mvp" type="url" value={draft.mvpUrl ?? ""} onChange={(e) => set("mvpUrl", e.target.value)} placeholder="https://…" />
            </FormField>
            <FormField label="Pitch deck" htmlFor="pf-deck">
              <Input id="pf-deck" type="url" value={draft.deckUrl ?? ""} onChange={(e) => set("deckUrl", e.target.value)} placeholder="https://…" />
            </FormField>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            {p.tagline ? <p className="border-l-2 border-primary pl-3 text-base font-medium text-foreground">{p.tagline}</p> : null}
            {p.description ? <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{p.description}</p> : <p className="text-sm text-faint">Pas encore de description.</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <section>
                <h4 className="eyebrow mb-1 text-muted-foreground">Marché cible</h4>
                <p className="text-sm text-foreground">{p.targetMarket || "—"}</p>
              </section>
              <section>
                <h4 className="eyebrow mb-1 text-muted-foreground">Objectifs à 6 mois</h4>
                <p className="whitespace-pre-line text-sm text-foreground">{p.sixMonthGoals || "—"}</p>
              </section>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.mvpUrl ? (
                <a href={p.mvpUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-border-strong hover:bg-surface-2">
                  <Rocket className="size-3.5 text-accent-text" aria-hidden="true" /> Voir le MVP <ExternalLink className="size-3 text-faint" aria-hidden="true" />
                </a>
              ) : null}
              {p.deckUrl ? (
                <a href={p.deckUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-border-strong hover:bg-surface-2">
                  <Presentation className="size-3.5 text-accent-text" aria-hidden="true" /> Pitch deck <ExternalLink className="size-3 text-faint" aria-hidden="true" />
                </a>
              ) : null}
              {!p.mvpUrl && !p.deckUrl ? <span className="text-xs text-faint">Aucun lien MVP ni deck.</span> : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────────── Jalons ───────────── */

function MilestonesCard({ p, canEdit, now }: { p: Project; canEdit: boolean; now: number }) {
  const { update } = useActions();
  const [label, setLabel] = React.useState("");
  const [due, setDue] = React.useState("");
  const done = p.milestones.filter((m) => m.doneAt).length;
  const sorted = React.useMemo(
    () => [...p.milestones].sort((a, b) => Number(Boolean(a.doneAt)) - Number(Boolean(b.doneAt)) || (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999")),
    [p.milestones],
  );
  const setMilestones = (milestones: Project["milestones"], log: string) => update("projects", p.id, { milestones, lastUpdateAt: new Date().toISOString() }, { log });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Jalons</CardTitle>
          <CardDescription>
            {done}/{p.milestones.length} atteints
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={p.milestones.length ? (done / p.milestones.length) * 100 : 0} tone={done === p.milestones.length && done > 0 ? "success" : "accent"} label={`Jalons ${done} sur ${p.milestones.length}`} className="mb-3" />
        {sorted.length ? (
          <ul className="divide-y divide-border">
            {sorted.map((m) => {
              const late = !m.doneAt && m.dueAt && Date.parse(m.dueAt) < now;
              return (
                <li key={m.id} className="group flex items-center gap-3 py-2">
                  <button
                    type="button"
                    disabled={!canEdit}
                    aria-pressed={Boolean(m.doneAt)}
                    aria-label={`${m.label} — ${m.doneAt ? "atteint" : "à faire"}`}
                    onClick={() => setMilestones(p.milestones.map((x) => (x.id === m.id ? { ...x, doneAt: x.doneAt ? undefined : new Date().toISOString() } : x)), `Jalon ${m.doneAt ? "rouvert" : "atteint"} : ${m.label}`)}
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-surface-2 disabled:cursor-default"
                  >
                    {m.doneAt ? <CheckCircle2 className="size-4.5 text-success" /> : <Circle className="size-4.5 text-faint" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", m.doneAt ? "text-muted-foreground line-through" : "text-foreground")}>{m.label}</p>
                    <p className={cn("text-xs", late ? "font-medium text-danger-text" : "text-muted-foreground")}>
                      {m.doneAt ? `Atteint le ${date(m.doneAt)}` : m.dueAt ? `${late ? "En retard — prévu" : "Prévu"} le ${date(m.dueAt)}` : "Sans échéance"}
                    </p>
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      aria-label={`Supprimer le jalon « ${m.label} »`}
                      onClick={() => setMilestones(p.milestones.filter((x) => x.id !== m.id), `Jalon supprimé : ${m.label}`)}
                      className="rounded p-1.5 text-faint opacity-60 hover:bg-surface-2 hover:text-danger-text group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun jalon.</p>
        )}
        {canEdit ? (
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!label.trim()) return;
              setMilestones([...p.milestones, { id: uid("ms"), label: label.trim(), dueAt: fromDateInput(due, 18) }], `Jalon ajouté : ${label.trim()}`);
              setLabel("");
              setDue("");
            }}
          >
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nouveau jalon (ex. 100 inscrits sur la waitlist)" aria-label="Libellé du jalon" className="min-w-0 flex-1" />
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Échéance" className="w-40" />
            <Button type="submit" variant="secondary" disabled={!label.trim()}>
              <Plus /> Ajouter
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ───────────── Métriques ───────────── */

type MetricKey = "users" | "waitlist" | "mrrCents" | "fundingCents";
const METRICS: { key: MetricKey; label: string; money?: boolean }[] = [
  { key: "users", label: "Utilisateurs" },
  { key: "waitlist", label: "Waitlist" },
  { key: "mrrCents", label: "MRR", money: true },
  { key: "fundingCents", label: "Fonds levés", money: true },
];

function MetricsCard({ p, canEdit }: { p: Project; canEdit: boolean }) {
  const activities = useCrm((s) => s.activities);
  const log = useCrm((s) => s.log);
  const { update } = useActions();
  const { user } = useSession();
  const toast = useToast();
  const [draft, setDraft] = React.useState<Record<MetricKey, string> | null>(null);

  const history = React.useMemo(
    () =>
      activities
        .filter((a) => a.entity === "projects" && a.entityId === p.id && a.meta?.type === "metrics")
        .map((a) => ({
          at: a.at,
          users: typeof a.meta?.users === "number" ? a.meta.users : undefined,
          waitlist: typeof a.meta?.waitlist === "number" ? a.meta.waitlist : undefined,
          mrrCents: typeof a.meta?.mrrCents === "number" ? a.meta.mrrCents : undefined,
          fundingCents: typeof a.meta?.fundingCents === "number" ? a.meta.fundingCents : undefined,
        })),
    [activities, p.id],
  );
  const trend = (k: MetricKey) => {
    const vals = [...history].reverse().map((h) => h[k]).filter((v): v is number => typeof v === "number");
    return vals.length > 1 ? vals : undefined;
  };
  const fmt = (k: MetricKey, v?: number) => (v === undefined ? "—" : METRICS.find((m) => m.key === k)?.money ? money(v) : number(v));

  const save = () => {
    if (!draft) return;
    const parse = (v: string, isMoney?: boolean) => {
      if (v.trim() === "") return undefined;
      const n = Number(v.replace(/\s/g, "").replace(",", "."));
      if (Number.isNaN(n) || n < 0) return undefined;
      return isMoney ? Math.round(n * 100) : Math.round(n);
    };
    const metrics: Project["metrics"] = {};
    METRICS.forEach((m) => {
      const v = parse(draft[m.key], m.money);
      if (v !== undefined) metrics[m.key] = v;
    });
    update("projects", p.id, { metrics, lastUpdateAt: new Date().toISOString() });
    const summary = METRICS.filter((m) => metrics[m.key] !== undefined).map((m) => `${m.label.toLowerCase()} ${fmt(m.key, metrics[m.key])}`).join(" · ");
    log({ kind: "modification", entity: "projects", entityId: p.id, actorId: user?.id, summary: `Métriques mises à jour : ${summary || "aucune"}`, meta: { type: "metrics", ...metrics } });
    toast({ title: "Métriques enregistrées", description: summary || undefined });
    setDraft(null);
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Métriques clés</CardTitle>
          <CardDescription>Traction post-MVP (indicateur de résultats — critère 1).</CardDescription>
        </div>
        {canEdit && !draft ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setDraft({
                users: p.metrics.users?.toString() ?? "",
                waitlist: p.metrics.waitlist?.toString() ?? "",
                mrrCents: p.metrics.mrrCents !== undefined ? String(p.metrics.mrrCents / 100) : "",
                fundingCents: p.metrics.fundingCents !== undefined ? String(p.metrics.fundingCents / 100) : "",
              })
            }
          >
            <Pencil /> Mettre à jour
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {draft ? (
          <form
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {METRICS.map((m) => (
              <FormField key={m.key} label={m.money ? `${m.label} (€)` : m.label} htmlFor={`m-${m.key}`}>
                <Input id={`m-${m.key}`} type="number" min={0} value={draft[m.key]} onChange={(e) => setDraft({ ...draft, [m.key]: e.target.value })} />
              </FormField>
            ))}
            <div className="col-span-2 flex justify-end gap-2 lg:col-span-4">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {METRICS.map((m) => {
              const t = trend(m.key);
              return (
                <div key={m.key} className="rounded-md border border-border p-3">
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <span className="tabular truncate text-lg font-semibold text-foreground">{m.money ? (p.metrics[m.key] !== undefined ? money(p.metrics[m.key]) : "—") : p.metrics[m.key] !== undefined ? compactNumber(p.metrics[m.key]!) : "—"}</span>
                    {t ? <Sparkline values={t} className="h-6 w-14 shrink-0" /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {history.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-xs">
              <caption className="mb-1 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Historique</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-1.5 text-left font-medium">Date</th>
                  {METRICS.map((m) => (
                    <th key={m.key} scope="col" className="py-1.5 text-right font-medium">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 8).map((h) => (
                  <tr key={h.at} className="border-b border-border last:border-0">
                    <td className="py-1.5 text-muted-foreground">{date(h.at)}</td>
                    {METRICS.map((m) => (
                      <td key={m.key} className="tabular py-1.5 text-right text-foreground">
                        {fmt(m.key, h[m.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">L'historique se construit à chaque mise à jour des métriques.</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────────── Santé & suivi ───────────── */

function HealthCard({ p, canEdit, now, lastEventEnd }: { p: Project; canEdit: boolean; now: number; lastEventEnd?: number }) {
  const { update } = useActions();
  const toast = useToast();
  const follow = followUpState(p, now);
  const setFollow = (iso: string | undefined, log: string) => {
    update("projects", p.id, { followUpAt: iso }, { log });
    toast({ title: iso ? `Suivi planifié le ${date(iso)}` : "Suivi retiré" });
  };
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Santé & suivi post-formation</CardTitle>
          <CardDescription>Points J+30 et J+90 après la session.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Santé du projet">
          <StatusSelect
            options={PROJECT_HEALTH}
            value={p.health}
            disabled={!canEdit}
            label="Santé du projet"
            className="h-9 w-full"
            onChange={(v) => update("projects", p.id, { health: v, lastUpdateAt: new Date().toISOString() }, { log: `Santé : ${labelOf(PROJECT_HEALTH, p.health)} → ${labelOf(PROJECT_HEALTH, v)}`, kind: "statut" })}
          />
        </FormField>
        <div className="rounded-md bg-surface-2 px-3 py-2.5">
          <div className="text-xs text-muted-foreground">Dernière mise à jour · {relative(p.lastUpdateAt, now)}</div>
          <p className="mt-1 whitespace-pre-line text-sm text-foreground">{p.lastUpdateNote || "Aucune note."}</p>
        </div>
        <FormField label="Prochain suivi" htmlFor={`follow-${p.id}`} hint={follow === "retard" ? "Suivi en retard" : undefined}>
          <Input
            id={`follow-${p.id}`}
            type="date"
            value={toDateInput(p.followUpAt)}
            disabled={!canEdit}
            onChange={(e) => {
              const iso = fromDateInput(e.target.value, 10);
              update("projects", p.id, { followUpAt: iso }, { log: iso ? `Suivi planifié le ${date(iso)}` : "Suivi retiré" });
            }}
            className={follow === "retard" ? "border-danger" : undefined}
          />
        </FormField>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            {lastEventEnd ? (
              <>
                <Button size="xs" variant="secondary" onClick={() => setFollow(new Date(lastEventEnd + 30 * DAY).toISOString(), "Suivi J+30 planifié")}>
                  J+30
                </Button>
                <Button size="xs" variant="secondary" onClick={() => setFollow(new Date(lastEventEnd + 90 * DAY).toISOString(), "Suivi J+90 planifié")}>
                  J+90
                </Button>
              </>
            ) : null}
            {p.followUpAt ? (
              <Button
                size="xs"
                onClick={() => {
                  const next = lastEventEnd && Date.parse(p.followUpAt!) < lastEventEnd + 60 * DAY ? new Date(lastEventEnd + 90 * DAY).toISOString() : undefined;
                  update("projects", p.id, { followUpAt: next, lastUpdateAt: new Date().toISOString() }, { log: `Suivi post-formation réalisé${next ? ` — prochain point J+90 le ${date(next)}` : ""}`, kind: "appel" });
                  toast({ title: "Suivi réalisé", description: next ? `Prochain point (J+90) planifié le ${date(next)}.` : "Aucun autre point planifié." });
                }}
              >
                <CheckCircle2 /> Suivi réalisé
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ───────────── Personnes & sessions ───────────── */

function PeopleCard({ p, canEdit }: { p: Project; canEdit: boolean }) {
  const contacts = useCollection("contacts");
  const speakers = useCollection("speakers");
  const events = useCollection("events");
  const speakerById = useLookup("speakers");
  const eventById = useLookup("events");
  const contactById = useLookup("contacts");
  const { update } = useActions();

  const founderOptions = React.useMemo(
    () => contacts.filter((c) => !p.founderIds.includes(c.id) && ["candidat", "participant", "alumni"].includes(c.lifecycle)).sort((a, b) => contactName(a).localeCompare(contactName(b), "fr")).map((c) => ({ value: c.id, label: contactName(c) })),
    [contacts, p.founderIds],
  );
  const mentorOptions = React.useMemo(() => speakers.filter((s) => !p.mentorIds.includes(s.id)).map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName} · ${labelOf(SPEAKER_KINDS, s.kind)}` })), [speakers, p.mentorIds]);
  const eventOptions = React.useMemo(() => [...events].filter((e) => !p.eventIds.includes(e.id)).sort((a, b) => b.startAt.localeCompare(a.startAt)).map((e) => ({ value: e.id, label: `${e.code} · ${e.city}` })), [events, p.eventIds]);

  const section = (title: string, children: React.ReactNode, add?: React.ReactNode) => (
    <section className="space-y-2">
      <h4 className="eyebrow text-muted-foreground">{title}</h4>
      {children}
      {canEdit && add ? add : null}
    </section>
  );
  const removeBtn = (label: string, onClick: () => void) =>
    canEdit ? (
      <button type="button" aria-label={label} onClick={onClick} className="rounded p-1 text-faint opacity-60 hover:bg-surface-2 hover:text-danger-text group-hover:opacity-100">
        <X className="size-3.5" />
      </button>
    ) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Équipe & sessions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {section(
          "Fondateurs",
          p.founderIds.length ? (
            <ul className="space-y-1.5">
              {p.founderIds.map((id) => (
                <li key={id} className="group flex items-center gap-2">
                  <Avatar name={contactName(contactById.get(id))} size="sm" />
                  <ContactLink id={id} withEmail className="min-w-0 flex-1 truncate text-sm" />
                  {removeBtn(`Retirer ${contactName(contactById.get(id))}`, () => update("projects", p.id, { founderIds: p.founderIds.filter((x) => x !== id) }, { log: `Fondateur retiré : ${contactName(contactById.get(id))}` }))}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-faint">Aucun fondateur.</p>
          ),
          <Select
            aria-label="Ajouter un fondateur"
            value=""
            onChange={(e) => e.target.value && update("projects", p.id, { founderIds: [...p.founderIds, e.target.value] }, { log: `Fondateur ajouté : ${contactName(contactById.get(e.target.value))}` })}
            options={founderOptions}
            placeholder="+ Ajouter un fondateur…"
            className="[&_select]:h-8 [&_select]:text-xs"
          />,
        )}
        {section(
          "Mentors",
          p.mentorIds.length ? (
            <ul className="space-y-1.5">
              {p.mentorIds.map((id) => {
                const s = speakerById.get(id);
                return (
                  <li key={id} className="group flex items-center gap-2">
                    <Avatar name={s ? `${s.firstName} ${s.lastName}` : "?"} size="sm" color="var(--violet)" />
                    <span className="min-w-0 flex-1">
                      <Link href={`/intervenants?id=${id}`} className="block truncate text-sm font-medium text-foreground hover:text-accent-text">
                        {s ? `${s.firstName} ${s.lastName}` : "Intervenant supprimé"}
                      </Link>
                      {s ? <span className="block truncate text-xs text-muted-foreground">{s.expertise.slice(0, 2).join(" · ")}</span> : null}
                    </span>
                    {removeBtn(`Retirer ${s?.firstName ?? "ce mentor"}`, () => update("projects", p.id, { mentorIds: p.mentorIds.filter((x) => x !== id) }, { log: `Mentor retiré : ${s ? `${s.firstName} ${s.lastName}` : id}` }))}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-faint">Aucun mentor assigné.</p>
          ),
          <Select
            aria-label="Ajouter un mentor"
            value=""
            onChange={(e) => {
              const s = speakerById.get(e.target.value);
              if (s) update("projects", p.id, { mentorIds: [...p.mentorIds, s.id] }, { log: `Mentor ajouté : ${s.firstName} ${s.lastName}` });
            }}
            options={mentorOptions}
            placeholder="+ Ajouter un mentor…"
            className="[&_select]:h-8 [&_select]:text-xs"
          />,
        )}
        {section(
          "Sessions",
          p.eventIds.length ? (
            <ul className="space-y-1.5">
              {p.eventIds.map((id) => {
                const e = eventById.get(id);
                return (
                  <li key={id} className="group flex items-center gap-2 text-sm">
                    <SessionLink id={id} className="min-w-0 flex-1 truncate" />
                    {e ? <span className="shrink-0 text-xs text-muted-foreground">{sessionDates(e)}</span> : null}
                    {removeBtn(`Retirer ${e?.code ?? "la session"}`, () => update("projects", p.id, { eventIds: p.eventIds.filter((x) => x !== id) }, { log: `Session retirée : ${e?.code ?? id}` }))}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-faint">Aucune session.</p>
          ),
          <Select
            aria-label="Ajouter une session"
            value=""
            onChange={(e) => {
              const ev = eventById.get(e.target.value);
              if (ev) update("projects", p.id, { eventIds: [...p.eventIds, ev.id] }, { log: `Session ajoutée : ${ev.code}` });
            }}
            options={eventOptions}
            placeholder="+ Rattacher une session…"
            className="[&_select]:h-8 [&_select]:text-xs"
          />,
        )}
      </CardContent>
    </Card>
  );
}

function AwardsCard({ p, canEdit }: { p: Project; canEdit: boolean }) {
  const { update } = useActions();
  const [value, setValue] = React.useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distinctions</CardTitle>
        <Trophy className="size-4 text-faint" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        {p.awards.length ? (
          <div className="flex flex-wrap gap-1.5">
            {p.awards.map((a) => (
              <Badge key={a} tone="warning">
                <Trophy className="size-3" aria-hidden="true" /> {a}
                {canEdit ? (
                  <button type="button" aria-label={`Retirer « ${a} »`} onClick={() => update("projects", p.id, { awards: p.awards.filter((x) => x !== a) }, { log: `Distinction retirée : ${a}` })} className="-mr-1 ml-0.5 rounded-full p-0.5 hover:bg-warning-soft">
                    <X className="size-3" />
                  </button>
                ) : null}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-faint">Aucune distinction.</p>
        )}
        {canEdit ? (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = value.trim();
              if (!v || p.awards.includes(v)) return;
              update("projects", p.id, { awards: [...p.awards, v] }, { log: `Distinction ajoutée : ${v}` });
              setValue("");
            }}
          >
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Prix du jury Démo Day…" aria-label="Nouvelle distinction" className="h-8 text-xs" />
            <Button type="submit" size="icon-sm" variant="secondary" aria-label="Ajouter la distinction" disabled={!value.trim()}>
              <Plus />
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ───────────── Page ───────────── */

export function ProjectDetail({ id }: { id: ID }) {
  const p = useEntity("projects", id);
  const applications = useCollection("applications");
  const eventById = useLookup("events");
  const contactById = useLookup("contacts");
  const now = useNow();
  const { canEdit } = useSession();
  const editable = canEdit("projets");
  const { update } = useActions();
  const toast = useToast();
  const [noting, setNoting] = React.useState(false);
  const [note, setNote] = React.useState("");

  const linkedApps = React.useMemo(() => applications.filter((a) => a.projectId === id), [applications, id]);
  const lastEventEnd = React.useMemo(() => {
    if (!p) return undefined;
    const ends = p.eventIds.map((e) => eventById.get(e)).filter(Boolean).map((e) => Date.parse(e!.endAt));
    return ends.length ? Math.max(...ends) : undefined;
  }, [p, eventById]);

  if (!p) {
    return (
      <EmptyState
        icon={Rocket}
        title="Projet introuvable"
        description="Il a peut-être été supprimé."
        action={
          <LinkButton href="/projets" variant="secondary">
            <ArrowLeft /> Retour aux projets
          </LinkButton>
        }
        className="mt-10"
      />
    );
  }

  const follow = followUpState(p, now);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Projets", href: "/projets" }, { label: p.name }]}
        eyebrow={p.sector || "Projet"}
        title={p.name}
        actions={
          editable ? (
            <Button size="sm" onClick={() => setNoting(true)}>
              <MessageSquarePlus /> Point d'étape
            </Button>
          ) : null
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {editable ? (
            <StatusSelect
              options={PROJECT_STAGES}
              value={p.stage}
              label="Stade du projet"
              className="h-8"
              onChange={(v) => {
                update("projects", p.id, { stage: v, lastUpdateAt: new Date().toISOString() }, { log: `Stade : ${labelOf(PROJECT_STAGES, p.stage)} → ${labelOf(PROJECT_STAGES, v)}`, kind: "statut" });
                toast({ title: `Stade : ${labelOf(PROJECT_STAGES, v)}` });
              }}
            />
          ) : (
            <StatusBadge options={PROJECT_STAGES} value={p.stage} />
          )}
          <StatusBadge options={PROJECT_HEALTH} value={p.health} />
          {follow ? (
            <Badge tone={follow === "retard" ? "danger" : "warning"} dot>
              <BellRing className="size-3" aria-hidden="true" /> Suivi {follow === "retard" ? "en retard" : `le ${date(p.followUpAt, "d MMM")}`}
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">Mis à jour {relative(p.lastUpdateAt, now)}</span>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <PitchCard p={p} canEdit={editable} />
          <MilestonesCard p={p} canEdit={editable} now={now} />
          <MetricsCard p={p} canEdit={editable} />
          <Card>
            <CardHeader>
              <CardTitle>Activité</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline entity="projects" id={p.id} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <HealthCard p={p} canEdit={editable} now={now} lastEventEnd={lastEventEnd} />
          <PeopleCard p={p} canEdit={editable} />
          <Card>
            <CardHeader>
              <CardTitle>Candidatures liées</CardTitle>
            </CardHeader>
            <CardContent>
              {linkedApps.length ? (
                <ul className="space-y-2">
                  {linkedApps.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/candidatures/${a.id}`} className="min-w-0 truncate text-foreground hover:text-accent-text">
                        <span className="font-mono text-xs text-muted-foreground">#{a.number}</span> {contactName(contactById.get(a.contactId))}
                        <span className="text-xs text-muted-foreground"> · {eventById.get(a.eventId)?.code}</span>
                      </Link>
                      <StatusBadge options={APPLICATION_STATUSES} value={a.status} className="shrink-0" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-faint">Aucune candidature rattachée.</p>
              )}
            </CardContent>
          </Card>
          <AwardsCard p={p} canEdit={editable} />
        </div>
      </div>

      {noting ? (
        <Modal
          open
          onClose={() => setNoting(false)}
          title="Point d'étape"
          description="La note devient la « dernière mise à jour » du projet et est ajoutée à l'historique."
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setNoting(false)}>
                Annuler
              </Button>
              <Button
                disabled={!note.trim()}
                onClick={() => {
                  update("projects", p.id, { lastUpdateNote: note.trim(), lastUpdateAt: new Date().toISOString() }, { log: `Point d'étape : ${note.trim()}`, kind: "note" });
                  toast({ title: "Point d'étape enregistré" });
                  setNote("");
                  setNoting(false);
                }}
              >
                Enregistrer
              </Button>
            </>
          }
        >
          <FormField label="Où en est le projet ?" htmlFor="prj-note" hint="Avancement, blocages, prochaines étapes, besoin de mentorat…">
            <Textarea id="prj-note" value={note} onChange={(e) => setNote(e.target.value)} autoFocus className="min-h-32" />
          </FormField>
        </Modal>
      ) : null}
    </div>
  );
}
