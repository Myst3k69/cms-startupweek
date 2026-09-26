"use client";

import * as React from "react";
import { z } from "zod";
import { AlertTriangle, CircleCheck, Database, Euro, Pencil, Plus, Smile, Ticket, Trash2, Wallet } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  DescriptionList,
  FormField,
  Input,
  Select,
  StatCard,
  Switch,
  Textarea,
  useToast,
} from "@/components/ui";
import { OrgLink } from "@/components/shared/entity-links";
import { StatusSelect } from "@/components/shared/status-select";
import { EVENT_KINDS, EVENT_MODES, EVENT_STATUSES, labelOf } from "@/lib/domain/constants";
import { daysUntil } from "@/lib/domain/selectors";
import type { EventKind, EventMode, EventSession, Region } from "@/lib/domain/types";
import { date, dateTime, money, relative } from "@/lib/format";
import { useActions, useCollection, useNow } from "@/lib/hooks";
import { pct } from "@/lib/utils";
import { EVENT_FORMATS, REGIONS } from "../../lib/labels";
import { audienceLabel, formatHours, fromDateInput, programHours, sessionAudience, toDateInput } from "../../lib/sessions";
import type { SessionData } from "./use-session-data";

/* ───────────── Alertes ───────────── */

function useSessionAlerts(ev: EventSession, data: SessionData) {
  const now = useNow();
  return React.useMemo(() => {
    const out: { tone: "danger" | "warning" | "info"; text: string }[] = [];
    const d = daysUntil(ev.startAt, now);
    const open = ["inscriptions_ouvertes", "prevu"].includes(ev.status);
    const b2c = sessionAudience(ev) === "b2c";
    if (b2c && open && d > 0 && d <= 21 && data.stats.belowMinimum) out.push({ tone: "danger", text: `Sous le seuil minimum à J-${d} : ${data.stats.enrolled}/${ev.minCapacity} inscrits. Décidez du maintien ou du report.` });
    if (b2c && ev.status === "inscriptions_ouvertes" && data.stats.remaining === 0) out.push({ tone: "warning", text: "Toutes les places sont vendues : passez la session en « Complet » (le site affichera « complet »)." });
    if (ev.status === "inscriptions_ouvertes" && Date.parse(ev.registrationDeadline) < now && d > 0) out.push({ tone: "warning", text: `Clôture des inscriptions dépassée (${date(ev.registrationDeadline)}) alors que la session est encore ouverte.` });
    const noConvoc = data.enrolled.filter((a) => !a.convocationSentAt).length;
    if (d > 0 && d <= 10 && noConvoc) out.push({ tone: "info", text: `${noConvoc} participant${noConvoc > 1 ? "s" : ""} sans convocation (indicateur 9) — onglet Participants.` });
    const hours = programHours(ev.program);
    if (ev.isTraining && ev.program.length && Math.abs(hours - ev.durationHours) >= 1) out.push({ tone: "info", text: `Le programme totalise ${formatHours(hours)} pour une durée déclarée de ${formatHours(ev.durationHours)}.` });
    if (ev.status === "brouillon" && ev.publishedOnSite) out.push({ tone: "warning", text: "Session publiée sur le site alors qu'elle est en brouillon." });
    return out;
  }, [ev, data, now]);
}

/* ───────────── Informations (édition) ───────────── */

interface InfoDraft {
  name: string;
  kind: EventKind;
  mode: EventMode;
  format: EventSession["format"];
  region: Region;
  city: string;
  venue: string;
  start: string;
  end: string;
  deadline: string;
  capacity: string;
  minCapacity: string;
  price: string;
  publicPrice: string;
  durationHours: string;
  founderEdition: boolean;
  earlyBird: boolean;
  isTraining: boolean;
  orgId: string;
  imageUrl: string;
  description: string;
}

const infoSchema = z
  .object({
    name: z.string().trim().min(3, "Nom requis"),
    city: z.string().trim().min(2, "Ville requise"),
    start: z.string().min(1, "Date requise"),
    end: z.string().min(1, "Date requise"),
    capacity: z.number().int().min(1, "Capacité ≥ 1"),
    minCapacity: z.number().int().min(0, "≥ 0"),
    price: z.number().min(0, "≥ 0"),
    durationHours: z.number().min(0, "≥ 0"),
  })
  .refine((v) => v.end >= v.start, { path: ["end"], message: "La fin doit suivre le début" })
  .refine((v) => v.minCapacity <= v.capacity, { path: ["minCapacity"], message: "Supérieur à la capacité" });

const num = (v: string) => (v.trim() === "" ? NaN : Number(v.replace(",", ".")));
const hm = (iso: string) => {
  const d = new Date(iso);
  return [d.getHours(), d.getMinutes()] as const;
};

function toDraft(ev: EventSession): InfoDraft {
  return {
    name: ev.name,
    kind: ev.kind,
    mode: ev.mode,
    format: ev.format,
    region: ev.region,
    city: ev.city,
    venue: ev.venue ?? "",
    start: toDateInput(ev.startAt),
    end: toDateInput(ev.endAt),
    deadline: toDateInput(ev.registrationDeadline),
    capacity: String(ev.capacity),
    minCapacity: String(ev.minCapacity),
    price: String(ev.priceCents / 100),
    publicPrice: ev.publicPriceCents ? String(ev.publicPriceCents / 100) : "",
    durationHours: String(ev.durationHours),
    founderEdition: ev.founderEdition,
    earlyBird: ev.earlyBird,
    isTraining: ev.isTraining,
    orgId: ev.orgId ?? "",
    imageUrl: ev.imageUrl ?? "",
    description: ev.description,
  };
}

function InfoCard({ ev, canEdit }: { ev: EventSession; canEdit: boolean }) {
  const { update } = useActions();
  const toast = useToast();
  const organizations = useCollection("organizations");
  const [draft, setDraft] = React.useState<InfoDraft | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const orgOptions = React.useMemo(
    () => organizations.filter((o) => ["ecole", "entreprise", "collectivite", "incubateur"].includes(o.type)).map((o) => ({ value: o.id, label: o.name })),
    [organizations],
  );

  const set = <K extends keyof InfoDraft>(k: K, v: InfoDraft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const save = () => {
    if (!draft) return;
    const parsed = infoSchema.safeParse({
      name: draft.name,
      city: draft.city,
      start: draft.start,
      end: draft.end,
      capacity: num(draft.capacity),
      minCapacity: num(draft.minCapacity),
      price: num(draft.price),
      durationHours: num(draft.durationHours),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      setErrors(errs);
      return;
    }
    const pp = num(draft.publicPrice);
    const [sh, sm] = hm(ev.startAt);
    const [eh, em] = hm(ev.endAt);
    update(
      "events",
      ev.id,
      {
        name: parsed.data.name,
        kind: draft.kind,
        mode: draft.mode,
        format: draft.format,
        region: draft.region,
        city: parsed.data.city,
        venue: draft.venue.trim() || undefined,
        startAt: fromDateInput(draft.start, sh, sm) ?? ev.startAt,
        endAt: fromDateInput(draft.end, eh, em) ?? ev.endAt,
        registrationDeadline: fromDateInput(draft.deadline, 23, 59) ?? ev.registrationDeadline,
        capacity: parsed.data.capacity,
        minCapacity: parsed.data.minCapacity,
        priceCents: Math.round(parsed.data.price * 100),
        publicPriceCents: Number.isNaN(pp) || pp <= 0 ? undefined : Math.round(pp * 100),
        durationHours: parsed.data.durationHours,
        founderEdition: draft.founderEdition,
        earlyBird: draft.earlyBird,
        isTraining: draft.isTraining,
        orgId: draft.orgId || undefined,
        imageUrl: draft.imageUrl.trim() || undefined,
        description: draft.description.trim(),
      },
      { log: "Informations de la session mises à jour" },
    );
    toast({ title: "Session mise à jour", description: ev.publishedOnSite ? "Modification répercutée sur le site par la synchro SQL." : undefined });
    setDraft(null);
    setErrors({});
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Informations</CardTitle>
          <CardDescription>Fiche publique de la session et paramètres commerciaux.</CardDescription>
        </div>
        {canEdit && !draft ? (
          <Button size="sm" variant="secondary" onClick={() => setDraft(toDraft(ev))}>
            <Pencil /> Modifier
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {draft ? (
          <form
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <FormField label="Nom" htmlFor="ev-name" error={errors.name} className="sm:col-span-2 xl:col-span-4">
              <Input id="ev-name" value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </FormField>
            <FormField label="Type" htmlFor="ev-kind" className="sm:col-span-2">
              <Select id="ev-kind" value={draft.kind} onChange={(e) => set("kind", e.target.value as EventKind)} options={EVENT_KINDS} />
            </FormField>
            <FormField label="Mode" htmlFor="ev-mode">
              <Select id="ev-mode" value={draft.mode} onChange={(e) => set("mode", e.target.value as EventMode)} options={EVENT_MODES} />
            </FormField>
            <FormField label="Format" htmlFor="ev-format">
              <Select id="ev-format" value={draft.format} onChange={(e) => set("format", e.target.value as EventSession["format"])} options={EVENT_FORMATS} />
            </FormField>
            <FormField label="Région" htmlFor="ev-region">
              <Select id="ev-region" value={draft.region} onChange={(e) => set("region", e.target.value as Region)} options={REGIONS} />
            </FormField>
            <FormField label="Ville" htmlFor="ev-city" error={errors.city}>
              <Input id="ev-city" value={draft.city} onChange={(e) => set("city", e.target.value)} />
            </FormField>
            <FormField label="Lieu / villa" htmlFor="ev-venue" className="sm:col-span-2">
              <Input id="ev-venue" value={draft.venue} onChange={(e) => set("venue", e.target.value)} />
            </FormField>
            <FormField label="Début" htmlFor="ev-start" error={errors.start}>
              <Input id="ev-start" type="date" value={draft.start} onChange={(e) => set("start", e.target.value)} />
            </FormField>
            <FormField label="Fin" htmlFor="ev-end" error={errors.end}>
              <Input id="ev-end" type="date" value={draft.end} onChange={(e) => set("end", e.target.value)} />
            </FormField>
            <FormField label="Clôture des inscriptions" htmlFor="ev-deadline" hint="CGV : J-7">
              <Input id="ev-deadline" type="date" value={draft.deadline} onChange={(e) => set("deadline", e.target.value)} />
            </FormField>
            <FormField label="Durée (heures)" htmlFor="ev-hours" error={errors.durationHours}>
              <Input id="ev-hours" type="number" min={0} step={0.5} value={draft.durationHours} onChange={(e) => set("durationHours", e.target.value)} />
            </FormField>
            <FormField label="Capacité" htmlFor="ev-cap" error={errors.capacity}>
              <Input id="ev-cap" type="number" min={1} value={draft.capacity} onChange={(e) => set("capacity", e.target.value)} />
            </FormField>
            <FormField label="Seuil minimum" htmlFor="ev-min" error={errors.minCapacity}>
              <Input id="ev-min" type="number" min={0} value={draft.minCapacity} onChange={(e) => set("minCapacity", e.target.value)} />
            </FormField>
            <FormField label="Prix TTC (€)" htmlFor="ev-price" error={errors.price}>
              <Input id="ev-price" type="number" min={0} step={10} value={draft.price} onChange={(e) => set("price", e.target.value)} />
            </FormField>
            <FormField label="Prix barré (€)" htmlFor="ev-public">
              <Input id="ev-public" type="number" min={0} step={10} value={draft.publicPrice} onChange={(e) => set("publicPrice", e.target.value)} />
            </FormField>
            <FormField label="Client B2B" htmlFor="ev-org" className="sm:col-span-2">
              <Select id="ev-org" value={draft.orgId} onChange={(e) => set("orgId", e.target.value)} options={orgOptions} placeholder="Aucun (session B2C)" />
            </FormField>
            <FormField label="Image (URL)" htmlFor="ev-img" className="sm:col-span-2">
              <Input id="ev-img" value={draft.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" />
            </FormField>
            <FormField label="Description" htmlFor="ev-desc" className="sm:col-span-2 xl:col-span-4">
              <Textarea id="ev-desc" value={draft.description} onChange={(e) => set("description", e.target.value)} />
            </FormField>
            <div className="flex flex-wrap gap-x-6 gap-y-2 sm:col-span-2 xl:col-span-4">
              <Checkbox checked={draft.founderEdition} onChange={(e) => set("founderEdition", e.target.checked)} label="Founder Edition" />
              <Checkbox checked={draft.earlyBird} onChange={(e) => set("earlyBird", e.target.checked)} label="Early Bird" />
              <Checkbox checked={draft.isTraining} onChange={(e) => set("isTraining", e.target.checked)} label="Action de formation (Qualiopi)" />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2 xl:col-span-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(null);
                  setErrors({});
                }}
              >
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <DescriptionList
              columns={3}
              items={[
                { label: "Type", value: labelOf(EVENT_KINDS, ev.kind) },
                { label: "Mode · format", value: `${labelOf(EVENT_MODES, ev.mode)} · ${labelOf(EVENT_FORMATS, ev.format)}` },
                { label: "Lieu", value: [ev.city, ev.venue].filter(Boolean).join(" — ") },
                { label: "Région", value: ev.region },
                { label: "Dates", value: `${dateTime(ev.startAt)} → ${dateTime(ev.endAt)}` },
                { label: "Clôture des inscriptions", value: date(ev.registrationDeadline) },
                { label: "Capacité", value: `${ev.capacity} places · seuil ${ev.minCapacity}` },
                {
                  label: "Prix TTC",
                  value: (
                    <span>
                      {ev.priceCents ? money(ev.priceCents) : "Gratuit"}
                      {ev.publicPriceCents ? <span className="ml-2 text-faint line-through">{money(ev.publicPriceCents)}</span> : null}
                    </span>
                  ),
                },
                { label: "Durée de formation", value: ev.isTraining ? formatHours(ev.durationHours) : "Hors formation (événement)" },
                { label: "Client B2B", value: ev.orgId ? <OrgLink id={ev.orgId} /> : "Session B2C" },
                {
                  label: "Offres",
                  value: (
                    <span className="flex flex-wrap gap-1">
                      {ev.founderEdition ? <Badge tone="accent">Founder Edition</Badge> : null}
                      {ev.earlyBird ? <Badge tone="warning">Early Bird</Badge> : null}
                      {!ev.founderEdition && !ev.earlyBird ? "—" : null}
                    </span>
                  ),
                },
              ]}
            />
            {ev.description ? <p className="whitespace-pre-line border-t border-border pt-4 text-sm leading-relaxed text-foreground">{ev.description}</p> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────────── Publication ───────────── */

function PublicationCard({ ev, canEdit }: { ev: EventSession; canEdit: boolean }) {
  const { update } = useActions();
  const toast = useToast();
  const now = useNow();
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Statut & publication</CardTitle>
          <CardDescription>Mis à jour {relative(ev.updatedAt, now)}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Statut de la session">
          <StatusSelect
            options={EVENT_STATUSES}
            value={ev.status}
            disabled={!canEdit}
            label="Statut de la session"
            className="h-9 w-full"
            onChange={(v) => {
              update("events", ev.id, { status: v }, { log: `Statut : ${labelOf(EVENT_STATUSES, ev.status)} → ${labelOf(EVENT_STATUSES, v)}`, kind: "statut" });
              toast({ title: `Statut : ${labelOf(EVENT_STATUSES, v)}` });
            }}
          />
        </FormField>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-foreground">Publiée sur le site</p>
            <p className="text-xs text-muted-foreground">{ev.publishedOnSite ? "Visible sur startupweek.tech" : "Invisible sur le site"}</p>
          </div>
          <Switch
            checked={ev.publishedOnSite}
            disabled={!canEdit}
            label="Publiée sur le site"
            onChange={(v) => {
              update("events", ev.id, { publishedOnSite: v }, { log: v ? "Publiée sur le site" : "Retirée du site", kind: "statut" });
              toast({
                title: v ? `${ev.code} publiée sur le site` : `${ev.code} retirée du site`,
                description: "La table `event` du site est mise à jour instantanément par trigger SQL.",
              });
            }}
          />
        </div>
        <p className="flex gap-2 rounded-md bg-surface-2 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          <Database className="mt-0.5 size-3.5 shrink-0 text-accent-text" aria-hidden="true" />
          <span>
            La synchronisation vers la table <code className="font-mono text-foreground">event</code> du site (clé <code className="font-mono text-foreground">event_code = {ev.code}</code>) se fait par
            trigger SQL dans Supabase : fini le polling n8n Airtable → Supabase toutes les 5 minutes et les doublons.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

/* ───────────── Points forts ───────────── */

function HighlightsCard({ ev, canEdit }: { ev: EventSession; canEdit: boolean }) {
  const { update } = useActions();
  const [value, setValue] = React.useState("");
  const add = () => {
    const v = value.trim();
    if (!v) return;
    update("events", ev.id, { highlights: [...ev.highlights, v] }, { log: `Point fort ajouté : ${v}` });
    setValue("");
  };
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Points forts</CardTitle>
          <CardDescription>Affichés sur la page de la session.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {ev.highlights.length ? (
          <ul className="space-y-1.5">
            {ev.highlights.map((h, i) => (
              <li key={`${h}-${i}`} className="group flex items-start gap-2 text-sm text-foreground">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                <span className="flex-1">{h}</span>
                {canEdit ? (
                  <button
                    type="button"
                    aria-label={`Retirer « ${h} »`}
                    onClick={() => update("events", ev.id, { highlights: ev.highlights.filter((_, j) => j !== i) }, { log: `Point fort retiré : ${h}` })}
                    className="rounded p-1 text-faint opacity-60 hover:bg-surface-2 hover:text-danger-text group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun point fort.</p>
        )}
        {canEdit ? (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ajouter un point fort…" aria-label="Nouveau point fort" />
            <Button type="submit" variant="secondary" size="icon" aria-label="Ajouter" disabled={!value.trim()}>
              <Plus />
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ───────────── Onglet ───────────── */

export function OverviewTab({ ev, data, canEdit }: { ev: EventSession; data: SessionData; canEdit: boolean }) {
  const alerts = useSessionAlerts(ev, data);
  const { stats, finance, satisfaction } = data;
  const audience = sessionAudience(ev);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {audience === "b2c" ? (
          <StatCard label="Remplissage" value={`${stats.enrolled}/${ev.capacity}`} icon={Ticket} hint={`${stats.fillRate} % · ${stats.remaining} place${stats.remaining > 1 ? "s" : ""} · seuil ${ev.minCapacity}`} />
        ) : (
          <StatCard
            label={audience === "b2b" ? "Participants prévus" : "Capacité"}
            value={ev.capacity}
            icon={Ticket}
            hint={audience === "b2b" ? "Liste nominative gérée par le client" : `${audienceLabel(ev)} · inscriptions libres`}
          />
        )}
        <StatCard
          label="CA attendu"
          value={money(finance.expected)}
          icon={Euro}
          hint={audience === "b2c" ? `${stats.pipeline} candidature${stats.pipeline > 1 ? "s" : ""} en cours` : audience === "b2b" ? "Selon devis et factures du client" : "Événement gratuit"}
        />
        <StatCard label="Encaissé" value={money(finance.collected)} icon={Wallet} hint={`${pct(finance.collected, finance.expected)} % · reste ${money(finance.remaining)}`} />
        <StatCard
          label="Satisfaction à chaud"
          value={satisfaction.avg === undefined ? "—" : `${satisfaction.avg.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/5`}
          icon={Smile}
          hint={`${satisfaction.count} réponse${satisfaction.count > 1 ? "s" : ""}`}
        />
      </div>

      {alerts.length ? (
        <ul className="space-y-2" aria-label="Alertes de la session">
          {alerts.map((a) => (
            <li
              key={a.text}
              className={
                a.tone === "danger"
                  ? "flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text"
                  : a.tone === "warning"
                    ? "flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-text"
                    : "flex items-start gap-2 rounded-md bg-info-soft px-3 py-2 text-sm text-info-text"
              }
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {a.text}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InfoCard ev={ev} canEdit={canEdit} />
        </div>
        <div className="space-y-6">
          <PublicationCard ev={ev} canEdit={canEdit} />
          <HighlightsCard ev={ev} canEdit={canEdit} />
        </div>
      </div>
    </div>
  );
}
