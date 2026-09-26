"use client";

import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import {
  CalendarCheck2,
  Check,
  Database,
  ExternalLink,
  FileText,
  Link2,
  Plus,
  ScrollText,
  Trash2,
} from "lucide-react";
import { useActions, useNow, useSession } from "@/lib/hooks";
import { ACTION_STATUSES, INDICATOR_STATUSES, QUALIOPI_CRITERIA, labelOf } from "@/lib/domain/constants";
import type { Evidence, ID, IndicatorStatus, QualiopiIndicator } from "@/lib/domain/types";
import { getReferentielIndicator } from "@/lib/data/qualiopi-referentiel";
import { date, relative } from "@/lib/format";
import { Badge, Button, Drawer, FormField, Input, Select, StatusBadge, Textarea, useToast } from "@/components/ui";
import { UserChip } from "@/components/shared/entity-links";
import { computeAutoEvidence } from "../auto-evidence";
import { EVIDENCE_KINDS } from "../labels";
import { fieldErrors, userOptions } from "../form-utils";
import { DAY, fromDateInput, isActionOpen } from "../metrics";
import type { QualiopiData } from "../use-qualiopi-data";
import { AutoEvidenceCard } from "./auto-evidence-card";

const KIND_ICON: Record<Evidence["kind"], React.ComponentType<{ className?: string }>> = {
  document: FileText,
  lien: Link2,
  procedure: ScrollText,
  enregistrement: Database,
};

export function IndicatorDrawer({ indicatorId, onClose, data }: { indicatorId: ID | null; onClose: () => void; data: QualiopiData }) {
  const indicator = React.useMemo(() => data.indicators.find((i) => i.id === indicatorId), [data.indicators, indicatorId]);
  const criterion = QUALIOPI_CRITERIA.find((c) => c.code === indicator?.criterion);
  return (
    <Drawer
      open={!!indicator}
      onClose={onClose}
      width="xl"
      title={
        indicator ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            Indicateur {indicator.code}
            <StatusBadge options={INDICATOR_STATUSES} value={indicator.status} />
          </span>
        ) : (
          "Indicateur"
        )
      }
      description={criterion ? `Critère ${criterion.code} — ${criterion.short}` : undefined}
    >
      {indicator ? <IndicatorDetail key={indicator.id} indicator={indicator} data={data} /> : null}
    </Drawer>
  );
}

const evidenceSchema = z.object({
  title: z.string().trim().min(3, "Intitulé trop court."),
  url: z
    .string()
    .trim()
    .refine((v) => {
      if (!v) return true;
      try {
        new URL(v);
        return true;
      } catch {
        return false;
      }
    }, "URL invalide (https://…)."),
});

function IndicatorDetail({ indicator, data }: { indicator: QualiopiIndicator; data: QualiopiData }) {
  const now = useNow();
  const { update, create, remove } = useActions();
  const { canEdit, user } = useSession();
  const toast = useToast();
  const readOnly = !canEdit("qualiopi");
  const ref = getReferentielIndicator(indicator.code);
  const criterion = QUALIOPI_CRITERIA.find((c) => c.code === indicator.criterion);

  const evidences = React.useMemo(
    () => data.evidences.filter((e) => e.indicatorCode === indicator.code).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.evidences, indicator.code],
  );
  const linkedResources = React.useMemo(() => data.resources.filter((r) => r.indicatorCodes.includes(indicator.code)), [data.resources, indicator.code]);
  const linkedActions = React.useMemo(
    () => data.improvementActions.filter((a) => a.indicatorCodes.includes(indicator.code)).sort((a, b) => Number(isActionOpen(b)) - Number(isActionOpen(a))),
    [data.improvementActions, indicator.code],
  );
  const auto = React.useMemo(
    () => (indicator.autoSource ? computeAutoEvidence(indicator.autoSource, data, now, indicator.code) : null),
    [indicator.autoSource, indicator.code, data, now],
  );
  const resourceById = React.useMemo(() => new Map(data.resources.map((r) => [r.id, r])), [data.resources]);

  const [notes, setNotes] = React.useState(indicator.notes ?? "");
  const [adding, setAdding] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState<ID | null>(null);
  const [form, setForm] = React.useState({ title: "", kind: "document" as Evidence["kind"], url: "", resourceId: "", validUntil: "", note: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const setStatus = (status: IndicatorStatus) => {
    update("indicators", indicator.id, { status, lastReviewedAt: new Date().toISOString() }, { log: `Indicateur ${indicator.code} : ${labelOf(INDICATOR_STATUSES, indicator.status)} → ${labelOf(INDICATOR_STATUSES, status)}`, kind: "statut" });
    toast({ title: `Indicateur ${indicator.code} : ${labelOf(INDICATOR_STATUSES, status)}` });
  };

  const openForm = (title = "") => {
    setForm({ title, kind: "document", url: "", resourceId: "", validUntil: "", note: "" });
    setErrors({});
    setAdding(true);
  };

  const addEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = evidenceSchema.safeParse({ title: form.title, url: form.url });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    const res = form.resourceId ? resourceById.get(form.resourceId) : undefined;
    create(
      "evidences",
      {
        indicatorCode: indicator.code,
        title: parsed.data.title,
        kind: form.kind,
        url: parsed.data.url || res?.url || undefined,
        resourceId: form.resourceId || undefined,
        ownerId: user?.id,
        validUntil: fromDateInput(form.validUntil),
        note: form.note.trim() || undefined,
      },
      { log: `Preuve ajoutée à l'indicateur ${indicator.code} : « ${parsed.data.title} »` },
    );
    toast({ title: "Preuve ajoutée", description: `Indicateur ${indicator.code}` });
    setAdding(false);
  };

  const reviewedToday = indicator.lastReviewedAt && now - Date.parse(indicator.lastReviewedAt) < DAY;

  return (
    <div className="space-y-6">
      {/* Intitulé + contexte */}
      <section className="space-y-3">
        <p className="text-sm leading-relaxed text-foreground">{indicator.title}</p>
        <div className="flex flex-wrap gap-1.5">
          {criterion ? <Badge tone="violet">Critère {criterion.code} · {criterion.short}</Badge> : null}
          {ref ? <Badge tone="neutral">{ref.applicability}</Badge> : null}
          {indicator.newcomerDeferred && data.settings.newcomer ? <Badge tone="info" dot>Nouvel entrant : mise en œuvre auditée en surveillance</Badge> : null}
          {indicator.newcomerDeferred && !data.settings.newcomer ? <Badge tone="neutral">Report nouvel entrant possible (non activé)</Badge> : null}
        </div>
      </section>

      {/* Pilotage */}
      <section className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface-2/50 p-3 sm:grid-cols-3">
        <FormField label="Statut" htmlFor="ind-status">
          <Select id="ind-status" value={indicator.status} onChange={(e) => setStatus(e.target.value as IndicatorStatus)} options={INDICATOR_STATUSES} disabled={readOnly} />
        </FormField>
        <FormField label="Responsable" htmlFor="ind-owner">
          <Select
            id="ind-owner"
            value={indicator.ownerId ?? ""}
            onChange={(e) => {
              update("indicators", indicator.id, { ownerId: e.target.value || undefined }, { log: `Indicateur ${indicator.code} : responsable modifié` });
              toast({ title: "Responsable mis à jour" });
            }}
            options={userOptions(data.users)}
            placeholder="Non assigné"
            disabled={readOnly}
          />
        </FormField>
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Dernière revue</span>
          <div className="flex h-9 items-center gap-2">
            <span className="truncate text-sm text-foreground">{indicator.lastReviewedAt ? relative(indicator.lastReviewedAt, now) : "Jamais revu"}</span>
          </div>
          {!readOnly ? (
            <Button
              size="xs"
              variant="subtle"
              disabled={!!reviewedToday}
              onClick={() => {
                update("indicators", indicator.id, { lastReviewedAt: new Date().toISOString() }, { log: `Indicateur ${indicator.code} revu` });
                toast({ title: "Revue enregistrée", description: `Indicateur ${indicator.code} marqué revu aujourd'hui.` });
              }}
            >
              <CalendarCheck2 /> {reviewedToday ? "Revu aujourd'hui" : "Marquer revu aujourd'hui"}
            </Button>
          ) : null}
        </div>
      </section>

      {/* Attendu */}
      <section>
        <h3 className="mb-1.5 text-sm font-semibold text-foreground">Niveau attendu</h3>
        <p className="rounded-md border-l-2 border-primary bg-surface-2/60 px-3 py-2 text-sm leading-relaxed text-foreground">{indicator.expectation}</p>
      </section>

      <section>
        <h3 className="mb-1.5 text-sm font-semibold text-foreground">Exemples de preuves attendues</h3>
        <ul className="space-y-1">
          {indicator.evidenceHints.map((h) => (
            <li key={h} className="group flex items-start gap-2 text-sm text-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              <span className="flex-1">{h}</span>
              {!readOnly && indicator.status !== "non_applicable" ? (
                <button type="button" onClick={() => openForm(h)} className="shrink-0 text-xs text-accent-text opacity-70 hover:underline hover:opacity-100 focus-visible:opacity-100">
                  Ajouter comme preuve
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {auto ? (
        <section>
          <h3 className="mb-1.5 text-sm font-semibold text-foreground">Preuve automatique</h3>
          <AutoEvidenceCard evidence={auto} />
        </section>
      ) : null}

      {/* Preuves */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Preuves au dossier <span className="tabular font-normal text-muted-foreground">({evidences.length})</span>
          </h3>
          {!readOnly && !adding ? (
            <Button size="xs" variant="secondary" onClick={() => openForm()}>
              <Plus /> Ajouter une preuve
            </Button>
          ) : null}
        </div>

        {adding ? (
          <form onSubmit={addEvidence} className="mb-3 space-y-3 rounded-lg border border-border p-3" noValidate>
            <FormField label="Intitulé" htmlFor="evd-title" error={errors.title}>
              <Input id="evd-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex. Procédure de traitement des réclamations v2" autoFocus />
            </FormField>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Type" htmlFor="evd-kind">
                <Select id="evd-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Evidence["kind"] })} options={EVIDENCE_KINDS} />
              </FormField>
              <FormField label="Valide jusqu'au" htmlFor="evd-valid" hint="Optionnel (attestation, assurance…)">
                <Input id="evd-valid" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Lien" htmlFor="evd-url" error={errors.url}>
              <Input id="evd-url" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
            </FormField>
            <FormField label="Ou lier une ressource existante" htmlFor="evd-res">
              <Select
                id="evd-res"
                value={form.resourceId}
                onChange={(e) => {
                  const r = resourceById.get(e.target.value);
                  setForm({ ...form, resourceId: e.target.value, title: form.title || r?.title || "" });
                }}
                options={data.resources.map((r) => ({ value: r.id, label: `${r.title} (v${r.version})` }))}
                placeholder="Aucune"
              />
            </FormField>
            <FormField label="Note" htmlFor="evd-note">
              <Textarea id="evd-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="min-h-14" />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm">
                Ajouter
              </Button>
            </div>
          </form>
        ) : null}

        {evidences.length === 0 && !adding ? (
          <p className="rounded-md border border-dashed border-border-strong px-3 py-4 text-center text-sm text-muted-foreground">
            {indicator.status === "non_applicable" ? "Indicateur non applicable : justifiez l'exclusion dans les notes." : "Aucune preuve au dossier pour l'instant."}
          </p>
        ) : null}

        <ul className="space-y-2">
          {evidences.map((ev) => {
            const Icon = KIND_ICON[ev.kind];
            const res = ev.resourceId ? resourceById.get(ev.resourceId) : undefined;
            const left = ev.validUntil ? (Date.parse(ev.validUntil) - now) / DAY : null;
            return (
              <li key={ev.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  {ev.url ? (
                    <a href={ev.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-accent-text hover:underline">
                      {ev.title} <ExternalLink className="size-3 text-faint" aria-hidden="true" />
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-foreground">{ev.title}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{labelOf(EVIDENCE_KINDS, ev.kind)}</span>
                    {res ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <Link href="/ressources" className="hover:text-accent-text hover:underline">
                          Ressource : {res.title}
                        </Link>
                      </>
                    ) : null}
                    <span aria-hidden="true">·</span>
                    <span>Ajoutée le {date(ev.createdAt)}</span>
                    {left !== null ? (
                      left < 0 ? (
                        <Badge tone="danger" dot>Expirée le {date(ev.validUntil)}</Badge>
                      ) : left < 60 ? (
                        <Badge tone="warning" dot>Expire le {date(ev.validUntil)}</Badge>
                      ) : (
                        <span>Valide jusqu'au {date(ev.validUntil)}</span>
                      )
                    ) : null}
                    {ev.ownerId ? <UserChip id={ev.ownerId} /> : null}
                  </div>
                  {ev.note ? <p className="mt-1 text-xs text-muted-foreground">{ev.note}</p> : null}
                </div>
                {!readOnly ? (
                  confirmId === ev.id ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <Button
                        size="xs"
                        variant="danger"
                        onClick={() => {
                          remove("evidences", ev.id, { log: `Preuve retirée de l'indicateur ${indicator.code} : « ${ev.title} »` });
                          toast({ title: "Preuve supprimée", tone: "info" });
                          setConfirmId(null);
                        }}
                      >
                        Supprimer
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => setConfirmId(null)}>
                        Annuler
                      </Button>
                    </span>
                  ) : (
                    <Button size="icon-xs" variant="ghost" aria-label={`Supprimer la preuve ${ev.title}`} onClick={() => setConfirmId(ev.id)}>
                      <Trash2 />
                    </Button>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>

        {linkedResources.length ? (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Ressources taguées « indicateur {indicator.code} » ({linkedResources.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {linkedResources.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-border px-2 py-0.5 text-xs text-foreground hover:border-border-strong hover:text-accent-text">
                  <FileText className="size-3 shrink-0 text-faint" aria-hidden="true" />
                  <span className="truncate">{r.title}</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Actions liées */}
      {linkedActions.length ? (
        <section>
          <h3 className="mb-1.5 text-sm font-semibold text-foreground">Actions d'amélioration liées</h3>
          <ul className="divide-y divide-border rounded-md border border-border">
            {linkedActions.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <Link href={`/qualiopi/amelioration?id=${a.id}`} className="min-w-0 truncate text-sm text-foreground hover:text-accent-text hover:underline">
                  {a.title}
                </Link>
                <StatusBadge options={ACTION_STATUSES} value={a.status} className="shrink-0" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Notes */}
      <section>
        <h3 className="mb-1.5 text-sm font-semibold text-foreground">Notes de préparation</h3>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={readOnly}
          aria-label="Notes de préparation"
          placeholder="Points à préparer, pièces à rassembler, questions pour l'auditeur…"
          className="min-h-24"
        />
        {!readOnly ? (
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              disabled={notes === (indicator.notes ?? "")}
              onClick={() => {
                update("indicators", indicator.id, { notes: notes.trim() || undefined }, { log: `Indicateur ${indicator.code} : notes mises à jour`, kind: "note" });
                toast({ title: "Notes enregistrées" });
              }}
            >
              Enregistrer les notes
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
