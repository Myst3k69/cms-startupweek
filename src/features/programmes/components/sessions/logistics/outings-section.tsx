"use client";

import * as React from "react";
import { Clock, MapPin, Plus, Receipt, Trash2, Tent } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, EmptyState, FormField, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { StatusSelect } from "@/components/shared/status-select";
import { OUTING_KINDS, OUTING_STATUSES, labelOf } from "@/lib/domain/constants";
import type { EventSession, OutingKind, OutingStatus, SessionActivity } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { useActions, useCollection } from "@/lib/hooks";
import { centsToInput, inputToCents } from "@/features/crm/lib/format";
import { sessionDays } from "../../../lib/sessions";
import type { ExpensePreset } from "./expenses-section";

export function OutingsSection({ ev, canEdit, onBudget }: { ev: EventSession; canEdit: boolean; onBudget: (preset: ExpensePreset) => void }) {
  const all = useCollection("outings");
  const expenses = useCollection("expenses");
  const { update } = useActions();
  const { outings, groups } = React.useMemo(() => {
    const list = all.filter((o) => o.eventId === ev.id).sort((a, b) => (a.day ?? 99) - (b.day ?? 99) || (a.start ?? "").localeCompare(b.start ?? ""));
    const m = new Map<string, SessionActivity[]>();
    for (const o of list) {
      const k = o.day ? `J${o.day}` : "Jour à définir";
      m.set(k, [...(m.get(k) ?? []), o]);
    }
    return { outings: list, groups: [...m.entries()] };
  }, [all, ev.id]);
  const linked = React.useMemo(() => new Set(expenses.filter((e) => e.eventId === ev.id && e.activityId).map((e) => e.activityId)), [expenses, ev.id]);
  const days = React.useMemo(() => sessionDays(ev), [ev]);
  const [editing, setEditing] = React.useState<SessionActivity | "new" | null>(null);

  const total = outings.filter((o) => o.status !== "annule").reduce((s, o) => s + (o.costCents ?? 0), 0);
  const toBook = outings.filter((o) => o.status === "a_reserver").length;

  return (
    <Card>
      <CardHeader className="flex-wrap gap-3">
        <div>
          <CardTitle>Activités</CardTitle>
          <CardDescription>
            Hors programme pédagogique · {outings.length} activité{outings.length > 1 ? "s" : ""} · coût estimé {money(total)}
            {toBook ? ` · ${toBook} à réserver` : ""}
          </CardDescription>
        </div>
        {canEdit ? (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus /> Nouvelle activité
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {outings.length === 0 ? (
          <EmptyState icon={Tent} title="Aucune activité prévue" description="Sortie en mer, visite, dîner de clôture… Planifiez-les jour par jour et suivez les réservations." />
        ) : (
          <div className="space-y-5">
            {groups.map(([label, list]) => {
              const dayInfo = list[0].day ? days[list[0].day - 1] : undefined;
              return (
                <section key={label} aria-label={label}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                    {dayInfo ? ` · ${date(`${dayInfo.date}T12:00:00Z`, "EEEE d MMMM")}` : ""}
                  </h3>
                  <ul className="space-y-2">
                    {list.map((o) => (
                      <li key={o.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(o)}>
                          <p className="truncate text-sm font-medium text-foreground hover:text-accent-text">{o.title}</p>
                          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span>{labelOf(OUTING_KINDS, o.kind)}</span>
                            {o.start ? (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="size-3" aria-hidden="true" />
                                {o.start}
                                {o.end ? `–${o.end}` : ""}
                              </span>
                            ) : null}
                            {o.location ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="size-3" aria-hidden="true" />
                                {o.location}
                              </span>
                            ) : null}
                            {o.provider ? <span>{o.provider}</span> : null}
                          </p>
                        </button>
                        <div className="flex flex-wrap items-center gap-2">
                          {o.costCents ? <span className="tabular text-sm text-foreground">{money(o.costCents)}</span> : null}
                          {o.included ? <Badge>Inclus</Badge> : <Badge tone="warning">En option</Badge>}
                          {linked.has(o.id) ? (
                            <Badge tone="info">
                              <Receipt className="size-3" aria-hidden="true" /> Au budget
                            </Badge>
                          ) : canEdit && o.costCents && o.status !== "annule" ? (
                            <Button size="xs" variant="ghost" onClick={() => onBudget({ category: "activite", label: o.title, supplier: o.provider ?? "", amountCents: o.costCents, activityId: o.id, status: o.status === "reserve" ? "accepte" : "recu" })}>
                              <Receipt /> Ajouter au budget
                            </Button>
                          ) : null}
                          {canEdit ? (
                            <StatusSelect
                              options={OUTING_STATUSES}
                              value={o.status}
                              label={`Statut de ${o.title}`}
                              onChange={(v) => update("outings", o.id, { status: v }, { log: `Activité « ${o.title} » : ${labelOf(OUTING_STATUSES, v)}`, kind: "statut" })}
                            />
                          ) : (
                            <Badge tone={OUTING_STATUSES.find((s) => s.value === o.status)?.tone} dot>
                              {labelOf(OUTING_STATUSES, o.status)}
                            </Badge>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </CardContent>
      {editing ? <OutingModal ev={ev} outing={editing === "new" ? undefined : editing} canEdit={canEdit} dayCount={days.length} onClose={() => setEditing(null)} /> : null}
    </Card>
  );
}

function OutingModal({ ev, outing, canEdit, dayCount, onClose }: { ev: EventSession; outing?: SessionActivity; canEdit: boolean; dayCount: number; onClose: () => void }) {
  const { create, update, remove } = useActions();
  const toast = useToast();
  const [title, setTitle] = React.useState(outing?.title ?? "");
  const [kind, setKind] = React.useState<OutingKind>(outing?.kind ?? "team_building");
  const [status, setStatus] = React.useState<OutingStatus>(outing?.status ?? "idee");
  const [day, setDay] = React.useState(outing?.day ? String(outing.day) : "");
  const [start, setStart] = React.useState(outing?.start ?? "");
  const [end, setEnd] = React.useState(outing?.end ?? "");
  const [location, setLocation] = React.useState(outing?.location ?? "");
  const [provider, setProvider] = React.useState(outing?.provider ?? "");
  const [contact, setContact] = React.useState(outing?.contact ?? "");
  const [cost, setCost] = React.useState(centsToInput(outing?.costCents));
  const [included, setIncluded] = React.useState(outing?.included ?? true);
  const [notes, setNotes] = React.useState(outing?.notes ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const id = (k: string) => `outing-${outing?.id ?? "new"}-${k}`;

  const save = () => {
    if (title.trim().length < 2) return setError("Donnez un nom à l'activité.");
    if (cost.trim() && !/^\d[\d\s]*([.,]\d{1,2})?$/.test(cost.trim())) return setError("Coût invalide (ex : 1 350).");
    const data = {
      title: title.trim(),
      kind,
      status,
      day: day ? Number(day) : undefined,
      start: start || undefined,
      end: end || undefined,
      location: location.trim() || undefined,
      provider: provider.trim() || undefined,
      contact: contact.trim() || undefined,
      costCents: cost.trim() ? inputToCents(cost) : undefined,
      included,
      notes: notes.trim(),
    };
    if (outing) update("outings", outing.id, data, { log: `Activité mise à jour — ${data.title}` });
    else create("outings", { ...data, eventId: ev.id }, { log: `Activité ajoutée — ${data.title}` });
    toast({ title: outing ? "Activité enregistrée" : "Activité ajoutée", description: data.title });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={outing ? outing.title : "Nouvelle activité"}
      description={ev.code}
      size="lg"
      footer={
        canEdit ? (
          <>
            {outing ? (
              <Button
                variant="ghost"
                className="mr-auto text-danger-text"
                onClick={() => {
                  remove("outings", outing.id, { log: `Activité supprimée — ${outing.title}` });
                  toast({ title: "Activité supprimée", tone: "info" });
                  onClose();
                }}
              >
                <Trash2 /> Supprimer
              </Button>
            ) : null}
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={save}>{outing ? "Enregistrer" : "Ajouter"}</Button>
          </>
        ) : null
      }
    >
      <fieldset disabled={!canEdit} className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <FormField label="Activité" htmlFor={id("title")} className="sm:col-span-4">
          <Input id={id("title")} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sortie en bateau" autoFocus={!outing} />
        </FormField>
        <FormField label="Type" htmlFor={id("kind")} className="sm:col-span-2">
          <Select id={id("kind")} value={kind} onChange={(e) => setKind(e.target.value as OutingKind)} options={OUTING_KINDS} />
        </FormField>
        <FormField label="Jour" htmlFor={id("day")} className="sm:col-span-2">
          <Select id={id("day")} value={day} onChange={(e) => setDay(e.target.value)} options={Array.from({ length: Math.max(dayCount, 1) }, (_, i) => ({ value: String(i + 1), label: `J${i + 1}` }))} placeholder="À définir" />
        </FormField>
        <FormField label="Début" htmlFor={id("start")} className="sm:col-span-2">
          <Input id={id("start")} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </FormField>
        <FormField label="Fin" htmlFor={id("end")} className="sm:col-span-2">
          <Input id={id("end")} type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </FormField>
        <FormField label="Lieu" htmlFor={id("loc")} className="sm:col-span-3">
          <Input id={id("loc")} value={location} onChange={(e) => setLocation(e.target.value)} />
        </FormField>
        <FormField label="Prestataire" htmlFor={id("prov")} className="sm:col-span-3">
          <Input id={id("prov")} value={provider} onChange={(e) => setProvider(e.target.value)} />
        </FormField>
        <FormField label="Contact prestataire" htmlFor={id("contact")} className="sm:col-span-3">
          <Input id={id("contact")} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Téléphone, email" />
        </FormField>
        <FormField label="Coût total estimé (€)" htmlFor={id("cost")} className="sm:col-span-3">
          <Input id={id("cost")} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
        </FormField>
        <FormField label="Statut" htmlFor={id("status")} className="sm:col-span-3">
          <Select id={id("status")} value={status} onChange={(e) => setStatus(e.target.value as OutingStatus)} options={OUTING_STATUSES} />
        </FormField>
        <div className="flex items-end sm:col-span-3">
          <Checkbox checked={included} onChange={(e) => setIncluded(e.target.checked)} label="Incluse dans le prix participant" />
        </div>
        <FormField label="Notes" htmlFor={id("notes")} className="sm:col-span-6">
          <Textarea id={id("notes")} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tenue, météo, nombre max…" />
        </FormField>
        {error ? <p className="text-sm font-medium text-danger-text sm:col-span-6">{error}</p> : null}
      </fieldset>
    </Modal>
  );
}
