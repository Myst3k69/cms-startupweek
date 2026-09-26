"use client";

import * as React from "react";
import { CalendarPlus, Clock, ListChecks, Pencil, Plus, Printer, Trash2, Users } from "lucide-react";
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
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import { SPEAKER_KINDS, labelOf } from "@/lib/domain/constants";
import type { EventSession, ProgramSlot } from "@/lib/domain/types";
import { date } from "@/lib/format";
import { useActions, useCollection, useLookup } from "@/lib/hooks";
import { cn, uid } from "@/lib/utils";
import { formatHours, programHours, sessionDays, slotHours } from "../../lib/sessions";

function addMinutes(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const t = Math.min(23 * 60 + 59, (h || 0) * 60 + (m || 0) + minutes);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

const byStart = (a: ProgramSlot, b: ProgramSlot) => a.day - b.day || a.start.localeCompare(b.start);

/* ───────────── Programme J1…Jn ───────────── */

function ProgramCard({ ev, canEdit }: { ev: EventSession; canEdit: boolean }) {
  const speakers = useCollection("speakers");
  const speakerById = useLookup("speakers");
  const { update } = useActions();
  const toast = useToast();
  const [draft, setDraft] = React.useState<ProgramSlot[] | null>(null);
  const program = draft ?? ev.program;
  const days = sessionDays(ev);
  const dayCount = Math.max(days.length, program.reduce((m, p) => Math.max(m, p.day), 0));
  const speakerOptions = React.useMemo(
    () => [...speakers].sort((a, b) => a.lastName.localeCompare(b.lastName, "fr")).map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName} · ${labelOf(SPEAKER_KINDS, s.kind)}` })),
    [speakers],
  );

  const patch = (id: string, p: Partial<ProgramSlot>) => setDraft((d) => (d ? d.map((s) => (s.id === id ? { ...s, ...p } : s)) : d));
  const addSlot = (day: number) =>
    setDraft((d) => {
      if (!d) return d;
      const last = d.filter((s) => s.day === day).sort(byStart).at(-1);
      const start = last ? last.end : "09:30";
      return [...d, { id: uid("slot"), day, start, end: addMinutes(start, 90), title: "" }];
    });

  const save = () => {
    if (!draft) return;
    const clean = draft.filter((s) => s.title.trim()).map((s) => ({ ...s, title: s.title.trim() })).sort(byStart);
    const oldProgramSpeakers = new Set(ev.program.map((s) => s.speakerId).filter(Boolean));
    const keep = ev.speakerIds.filter((id) => !oldProgramSpeakers.has(id));
    const speakerIds = Array.from(new Set([...clean.map((s) => s.speakerId).filter((x): x is string => Boolean(x)), ...keep]));
    update("events", ev.id, { program: clean, speakerIds }, { log: `Programme mis à jour (${clean.length} créneaux, ${formatHours(programHours(clean))})` });
    toast({ title: "Programme enregistré", description: `${clean.length} créneaux · ${formatHours(programHours(clean))} · ${speakerIds.length} intervenant${speakerIds.length > 1 ? "s" : ""}` });
    setDraft(null);
  };

  const total = programHours(program);
  const involved = new Set(program.map((s) => s.speakerId).filter(Boolean)).size;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Programme détaillé</CardTitle>
          <CardDescription>
            {dayCount} jour{dayCount > 1 ? "s" : ""} · {program.length} créneaux · <span className="font-medium text-foreground">{formatHours(total)}</span> de face-à-face pédagogique
            {ev.isTraining ? ` (durée déclarée : ${formatHours(ev.durationHours)})` : ""} · {involved} intervenant{involved > 1 ? "s" : ""}
          </CardDescription>
        </div>
        {canEdit ? (
          draft ? (
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                Annuler
              </Button>
              <Button size="sm" onClick={save}>
                Enregistrer
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setDraft(ev.program.map((s) => ({ ...s })))} className="shrink-0">
              <Pencil /> Modifier
            </Button>
          )
        ) : null}
      </CardHeader>
      <CardContent>
        {!program.length && !draft ? (
          <EmptyState icon={ListChecks} title="Programme vide" description="Ajoutez les créneaux J1…J7 : ils alimentent la fiche programme Qualiopi, la convocation et la feuille d'émargement." />
        ) : (
          <ol className="space-y-5">
            {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => {
              const slots = program.filter((s) => s.day === day).sort(byStart);
              const info = days[day - 1];
              const hours = slots.reduce((s, x) => s + slotHours(x), 0);
              return (
                <li key={day}>
                  <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-border pb-1.5">
                    <h4 className="text-sm font-semibold text-foreground">
                      J{day}
                      {info ? <span className="ml-2 font-normal capitalize text-muted-foreground">{date(info.date, "EEEE d MMMM")}</span> : null}
                    </h4>
                    <span className="tabular text-xs text-muted-foreground">{formatHours(hours)}</span>
                  </div>
                  {slots.length === 0 && !draft ? <p className="text-xs text-faint">Aucun créneau.</p> : null}
                  <ul className="space-y-1.5">
                    {slots.map((s) => {
                      const spk = s.speakerId ? speakerById.get(s.speakerId) : undefined;
                      return draft ? (
                        <li key={s.id} className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 rounded-md border border-border bg-surface-2/40 p-2 sm:grid-cols-[88px_88px_1fr_220px_auto]">
                          <Input type="time" value={s.start} onChange={(e) => patch(s.id, { start: e.target.value })} aria-label="Début" className="h-8 px-2 text-xs" />
                          <Input type="time" value={s.end} onChange={(e) => patch(s.id, { end: e.target.value })} aria-label="Fin" className="h-8 px-2 text-xs" />
                          <Input value={s.title} onChange={(e) => patch(s.id, { title: e.target.value })} placeholder="Intitulé du créneau" aria-label="Intitulé" className="col-span-2 h-8 text-xs sm:col-span-1" />
                          <Select
                            value={s.speakerId ?? ""}
                            onChange={(e) => patch(s.id, { speakerId: e.target.value || undefined })}
                            options={speakerOptions}
                            placeholder="Intervenant…"
                            aria-label="Intervenant"
                            className="col-span-3 sm:col-span-1 [&_select]:h-8 [&_select]:text-xs"
                          />
                          <Button size="icon-sm" variant="ghost" aria-label="Supprimer le créneau" onClick={() => setDraft((d) => (d ? d.filter((x) => x.id !== s.id) : d))}>
                            <Trash2 />
                          </Button>
                        </li>
                      ) : (
                        <li key={s.id} className="flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-surface-2/60">
                          <span className="tabular w-24 shrink-0 pt-0.5 text-xs text-muted-foreground">
                            {s.start} – {s.end}
                          </span>
                          <span className="min-w-0 flex-1 text-sm text-foreground">{s.title}</span>
                          {spk ? (
                            <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
                              <Avatar name={`${spk.firstName} ${spk.lastName}`} size="xs" />
                              {spk.firstName} {spk.lastName}
                            </span>
                          ) : (
                            <Badge tone="warning" className="shrink-0">
                              Intervenant à assigner
                            </Badge>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {draft ? (
                    <Button size="xs" variant="ghost" className="mt-1.5" onClick={() => addSlot(day)}>
                      <Plus /> Ajouter un créneau
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
        {draft ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setDraft((d) => (d ? [...d, { id: uid("slot"), day: dayCount + 1, start: "09:30", end: "12:30", title: "" }] : d))}
            >
              <CalendarPlus /> Ajouter un jour (J{dayCount + 1})
            </Button>
            <p className="self-center text-xs text-muted-foreground">Les créneaux sans intitulé sont ignorés à l'enregistrement.</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ───────────── Fiche programme Qualiopi ───────────── */

function QualiopiSheetCard({ ev, canEdit }: { ev: EventSession; canEdit: boolean }) {
  const { update } = useActions();
  const toast = useToast();
  const [draft, setDraft] = React.useState<{ objectives: string; prerequisites: string; evaluationMethods: string; accessibility: string } | null>(null);
  const save = () => {
    if (!draft) return;
    update(
      "events",
      ev.id,
      {
        objectives: draft.objectives.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean),
        prerequisites: draft.prerequisites.trim(),
        evaluationMethods: draft.evaluationMethods.trim(),
        accessibility: draft.accessibility.trim(),
      },
      { log: "Fiche programme Qualiopi mise à jour", kind: "document" },
    );
    toast({ title: "Fiche programme enregistrée", description: "Objectifs, prérequis, évaluation et accessibilité (indicateurs 1, 5, 6 et 26)." });
    setDraft(null);
  };
  const missing = [!ev.objectives.length && "objectifs", !ev.prerequisites && "prérequis", !ev.evaluationMethods && "modalités d'évaluation", !ev.accessibility && "accessibilité"].filter(Boolean) as string[];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Fiche programme Qualiopi</CardTitle>
          <CardDescription>Objectifs opérationnels, prérequis, modalités d'évaluation et accessibilité — publiés et remis au stagiaire.</CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          {canEdit && !draft ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setDraft({ objectives: ev.objectives.join("\n"), prerequisites: ev.prerequisites, evaluationMethods: ev.evaluationMethods, accessibility: ev.accessibility })}
            >
              <Pencil /> Modifier
            </Button>
          ) : null}
          <LinkButton href={`/print/programme/${ev.id}`} target="_blank" size="sm" variant="secondary">
            <Printer /> Imprimer le programme
          </LinkButton>
        </div>
      </CardHeader>
      <CardContent>
        {missing.length && !draft ? <p className="mb-4 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-text">À compléter avant l'audit : {missing.join(", ")}.</p> : null}
        {draft ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <FormField label="Objectifs pédagogiques (un par ligne)" htmlFor="q-obj" hint="Formulés en compétences observables (« Être capable de… »).">
              <Textarea id="q-obj" value={draft.objectives} onChange={(e) => setDraft({ ...draft, objectives: e.target.value })} className="min-h-32" />
            </FormField>
            <FormField label="Prérequis" htmlFor="q-pre">
              <Textarea id="q-pre" value={draft.prerequisites} onChange={(e) => setDraft({ ...draft, prerequisites: e.target.value })} className="min-h-16" />
            </FormField>
            <FormField label="Modalités d'évaluation" htmlFor="q-eval">
              <Textarea id="q-eval" value={draft.evaluationMethods} onChange={(e) => setDraft({ ...draft, evaluationMethods: e.target.value })} />
            </FormField>
            <FormField label="Accessibilité (handicap, PMR)" htmlFor="q-acc">
              <Textarea id="q-acc" value={draft.accessibility} onChange={(e) => setDraft({ ...draft, accessibility: e.target.value })} />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section>
              <h4 className="eyebrow mb-2 text-muted-foreground">Objectifs</h4>
              {ev.objectives.length ? (
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-foreground marker:text-muted-foreground">
                  {ev.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-faint">Non renseignés</p>
              )}
            </section>
            <div className="space-y-4">
              {[
                { label: "Prérequis", value: ev.prerequisites, icon: ListChecks },
                { label: "Modalités d'évaluation", value: ev.evaluationMethods, icon: Clock },
                { label: "Accessibilité", value: ev.accessibility, icon: Users },
              ].map((b) => (
                <section key={b.label}>
                  <h4 className="eyebrow mb-1.5 flex items-center gap-1.5 text-muted-foreground">
                    <b.icon className="size-3.5" aria-hidden="true" /> {b.label}
                  </h4>
                  <p className={cn("whitespace-pre-line text-sm leading-relaxed", b.value ? "text-foreground" : "text-faint")}>{b.value || "Non renseigné"}</p>
                </section>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProgramTab({ ev, canEdit }: { ev: EventSession; canEdit: boolean }) {
  return (
    <div className="space-y-6">
      <ProgramCard ev={ev} canEdit={canEdit} />
      <QualiopiSheetCard ev={ev} canEdit={canEdit} />
    </div>
  );
}
