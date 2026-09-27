"use client";

import * as React from "react";
import { KeyRound, Pencil, Plus, School, X } from "lucide-react";
import { Badge, Button, Checkbox, EmptyState, FormField, Input, Modal, Progress, Select, Textarea, useToast } from "@/components/ui";
import { OrgLink, SessionLink } from "@/components/shared/entity-links";
import { ContactPicker } from "@/features/qualiopi/components/contact-picker";
import { useActions, useCollection, useLookup, useNow, useSession } from "@/lib/hooks";
import { contactName } from "@/lib/domain/selectors";
import { enrollCohort } from "@/lib/domain/actions";
import { crm } from "@/lib/store";
import type { Cohort, ID } from "@/lib/domain/types";
import { date } from "@/lib/format";
import { normalizeEmail } from "@/lib/utils";

type Draft = Omit<Cohort, "id" | "createdAt" | "updatedAt">;
const DAY = 86_400_000;
const toInput = (iso: string) => iso.slice(0, 10);
const fromInput = (v: string) => (v ? new Date(`${v}T12:00:00`).toISOString() : "");

/** « Prénom;Nom;email » ou « email » par ligne → contacts existants (email) ou nouveaux. */
function importLines(text: string, orgId?: ID): { ids: ID[]; created: number; invalid: string[] } {
  const s = crm();
  const ids: ID[] = [];
  const invalid: string[] = [];
  let created = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/[;,\t]/).map((p) => p.trim());
    const email = normalizeEmail(parts.find((p) => p.includes("@")) ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      invalid.push(line);
      continue;
    }
    const existing = s.contacts.find((c) => normalizeEmail(c.email) === email);
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const names = parts.filter((p) => !p.includes("@"));
    const local = email.split("@")[0].split(/[._-]/);
    const c = s.create(
      "contacts",
      {
        firstName: names[0] || local[0] || email,
        lastName: names[1] || local.slice(1).join(" "),
        email,
        lifecycle: "participant",
        source: "ecole",
        orgId,
        tags: ["Cohorte Academy"],
        consent: { gdpr: true, marketing: false, source: "Import cohorte (convention école / entreprise)" },
        score: 30,
      },
      { log: "Contact créé par l'import d'une cohorte Academy" },
    );
    ids.push(c.id);
    created++;
  }
  return { ids, created, invalid };
}

function CohortModal({ cohort, onClose }: { cohort: Cohort | "new"; onClose: () => void }) {
  const orgs = useCollection("organizations");
  const events = useCollection("events");
  const courses = useCollection("courses");
  const contacts = useLookup("contacts");
  const now = useNow();
  const { create, update } = useActions();
  const toast = useToast();
  const [d, setD] = React.useState<Draft>(() =>
    cohort === "new"
      ? { name: "", courseIds: [], contactIds: [], seats: 20, startsAt: new Date(now).toISOString(), endsAt: new Date(now + 183 * DAY).toISOString() }
      : { ...cohort },
  );
  const [pick, setPick] = React.useState("");
  const [paste, setPaste] = React.useState("");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const doImport = () => {
    const r = importLines(paste, d.orgId);
    set("contactIds", Array.from(new Set([...d.contactIds, ...r.ids])));
    setPaste("");
    toast({ title: `${r.ids.length} apprenant${r.ids.length > 1 ? "s" : ""} ajouté${r.ids.length > 1 ? "s" : ""}`, description: [r.created ? `${r.created} contact(s) créé(s).` : "", r.invalid.length ? `${r.invalid.length} ligne(s) ignorée(s) (email invalide).` : ""].filter(Boolean).join(" ") || undefined });
  };

  const save = () => {
    if (d.name.trim().length < 3) return toast({ title: "Nommez la cohorte", tone: "danger" });
    if (!d.courseIds.length) return toast({ title: "Choisissez au moins une formation", tone: "danger" });
    if (d.contactIds.length > d.seats) return toast({ title: `Plus d'apprenants (${d.contactIds.length}) que de places (${d.seats})`, tone: "danger" });
    const data = { ...d, name: d.name.trim() };
    if (cohort === "new") create("cohorts", data, { log: `Cohorte « ${data.name} » créée` });
    else update("cohorts", cohort.id, data, { log: "Cohorte modifiée" });
    toast({ title: "Cohorte enregistrée", description: "Utilisez « Ouvrir les accès » pour inscrire les apprenants." });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={cohort === "new" ? "Nouvelle cohorte" : "Modifier la cohorte"}
      description="Accès collectif pour une école ou une entreprise : mêmes formations, même date de fin d'accès."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={save}>Enregistrer</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Nom" htmlFor="coh-name">
          <Input id="coh-name" value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex. Epitech Lyon — promo 2027" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Organisation" htmlFor="coh-org">
            <Select id="coh-org" value={d.orgId ?? ""} onChange={(e) => set("orgId", e.target.value || undefined)} placeholder="Aucune" options={orgs.filter((o) => o.type === "ecole" || o.type === "entreprise").map((o) => ({ value: o.id, label: o.name }))} />
          </FormField>
          <FormField label="Session associée (facultatif)" htmlFor="coh-ev">
            <Select id="coh-ev" value={d.eventId ?? ""} onChange={(e) => set("eventId", e.target.value || undefined)} placeholder="Aucune" options={events.map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` }))} />
          </FormField>
        </div>
        <FormField label="Formations">
          <div className="flex flex-col gap-2">
            {courses
              .filter((c) => c.status !== "archivee")
              .map((c) => (
                <Checkbox key={c.id} label={c.title} checked={d.courseIds.includes(c.id)} onChange={(e) => set("courseIds", e.target.checked ? [...d.courseIds, c.id] : d.courseIds.filter((x) => x !== c.id))} />
              ))}
          </div>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Places" htmlFor="coh-seats">
            <Input id="coh-seats" type="number" min={1} value={d.seats} onChange={(e) => set("seats", Math.max(1, Number(e.target.value) || 1))} />
          </FormField>
          <FormField label="Début d'accès" htmlFor="coh-start">
            <Input id="coh-start" type="date" value={toInput(d.startsAt)} onChange={(e) => set("startsAt", fromInput(e.target.value) || d.startsAt)} />
          </FormField>
          <FormField label="Fin d'accès" htmlFor="coh-end">
            <Input id="coh-end" type="date" value={toInput(d.endsAt)} onChange={(e) => set("endsAt", fromInput(e.target.value) || d.endsAt)} />
          </FormField>
        </div>
        <FormField label={`Apprenants (${d.contactIds.length}/${d.seats})`}>
          <div className="space-y-2">
            {d.contactIds.length ? (
              <div className="flex flex-wrap gap-1.5">
                {d.contactIds.map((id) => (
                  <Badge key={id} className="gap-1 pr-1">
                    {contactName(contacts.get(id))}
                    <button type="button" aria-label="Retirer" onClick={() => set("contactIds", d.contactIds.filter((x) => x !== id))} className="rounded p-0.5 hover:bg-surface-3">
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <ContactPicker value={pick} onChange={setPick} placeholder="Ajouter un contact existant…" />
              </div>
              <Button variant="secondary" size="sm" disabled={!pick} onClick={() => (set("contactIds", Array.from(new Set([...d.contactIds, pick]))), setPick(""))}>
                Ajouter
              </Button>
            </div>
            <Textarea value={paste} onChange={(e) => setPaste(e.target.value)} className="min-h-20 font-mono text-xs" placeholder={"Coller une liste : une ligne par apprenant\nPrénom;Nom;email@ecole.fr  (ou juste l'email)"} aria-label="Importer une liste d'apprenants" />
            <Button size="sm" variant="secondary" disabled={!paste.trim()} onClick={doImport}>
              Importer la liste
            </Button>
          </div>
        </FormField>
        <FormField label="Notes" htmlFor="coh-notes">
          <Textarea id="coh-notes" value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className="min-h-16" />
        </FormField>
      </div>
    </Modal>
  );
}

export function CohortsTab() {
  const cohorts = useCollection("cohorts");
  const courses = useLookup("courses");
  const enrollments = useCollection("enrollments");
  const { canEdit } = useSession();
  const toast = useToast();
  const editable = canEdit("academy");
  const [editing, setEditing] = React.useState<Cohort | "new" | null>(null);

  return (
    <div className="space-y-4">
      {editable ? (
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> Nouvelle cohorte
        </Button>
      ) : null}
      {cohorts.length ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {cohorts.map((c) => {
            const es = enrollments.filter((e) => e.cohortId === c.id);
            const avg = es.length ? Math.round(es.reduce((s, e) => s + e.progressPercent, 0) / es.length) : 0;
            const pending = c.contactIds.length * c.courseIds.length - es.length;
            return (
              <article key={c.id} className="space-y-3 rounded-lg border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">{c.name}</h3>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                      {c.orgId ? <OrgLink id={c.orgId} /> : null}
                      {c.eventId ? <SessionLink id={c.eventId} /> : null}
                      <span>
                        Accès du {date(c.startsAt)} au {date(c.endsAt)}
                      </span>
                    </p>
                  </div>
                  <Badge tone="violet" className="shrink-0">
                    {c.contactIds.length}/{c.seats} places
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.courseIds.map((id) => (
                    <Badge key={id}>{courses.get(id)?.title ?? "Formation supprimée"}</Badge>
                  ))}
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>
                      {es.length} accès ouvert{es.length > 1 ? "s" : ""}
                    </span>
                    <span className="tabular">Progression moyenne {avg} %</span>
                  </div>
                  <Progress value={avg} label="Progression moyenne de la cohorte" />
                </div>
                {c.notes ? <p className="text-xs text-muted-foreground">{c.notes}</p> : null}
                {editable ? (
                  <div className="flex flex-wrap gap-2">
                    <Button size="xs" variant="secondary" onClick={() => setEditing(c)}>
                      <Pencil /> Modifier
                    </Button>
                    <Button
                      size="xs"
                      disabled={pending <= 0}
                      onClick={() => {
                        const n = enrollCohort(c.id);
                        toast({ title: n ? `${n} accès ouverts` : "Tous les accès sont déjà ouverts" });
                      }}
                    >
                      <KeyRound /> Ouvrir les accès{pending > 0 ? ` (${pending})` : ""}
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={School} title="Aucune cohorte" description="Créez une cohorte pour donner accès à un groupe d'étudiants ou de salariés (Startup Village, entreprise)." />
      )}
      {editing ? <CohortModal cohort={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
