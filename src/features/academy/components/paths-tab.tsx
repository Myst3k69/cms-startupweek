"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Pencil, Plus, Route, Trash2, X } from "lucide-react";
import { Badge, Button, Checkbox, EmptyState, FormField, Input, Modal, Select, StatusBadge, Switch, Textarea, useToast } from "@/components/ui";
import { useActions, useCollection, useLookup, useSession } from "@/lib/hooks";
import { COURSE_STATUSES, PATH_STATUSES, PERSONAS, labelOf } from "@/lib/domain/constants";
import { formatDuration, slugify } from "@/lib/domain/academy";
import type { AcademyPath, ID, PathStatus, Persona } from "@/lib/domain/types";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DaScope } from "./da";
import { useCourseStats } from "../lib/use-academy";
import type { AcademyDa } from "../lib/da";

type Draft = Omit<AcademyPath, "id" | "createdAt" | "updatedAt">;

const EMPTY: Draft = { title: "", slug: "", description: "", status: "brouillon", personas: [], courseIds: [], priceCents: 0, inCatalog: false };

function PathModal({ path, onClose }: { path: AcademyPath | "new"; onClose: () => void }) {
  const courses = useCollection("courses");
  const { create, update } = useActions();
  const toast = useToast();
  const [d, setD] = React.useState<Draft>(() => (path === "new" ? EMPTY : { ...path }));
  const [price, setPrice] = React.useState(() => (path === "new" || !path.priceCents ? "" : String(path.priceCents / 100)));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const move = (i: number, dir: -1 | 1) => {
    const ids = [...d.courseIds];
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    set("courseIds", ids);
  };
  const save = () => {
    if (d.title.trim().length < 3) return toast({ title: "Titre trop court", tone: "danger" });
    const data: Draft = { ...d, title: d.title.trim(), slug: d.slug || slugify(d.title), priceCents: Math.round((Number(price.replace(",", ".")) || 0) * 100) };
    if (path === "new") create("academyPaths", data, { log: `Parcours « ${data.title} » créé` });
    else update("academyPaths", path.id, data, { log: "Parcours modifié" });
    toast({ title: path === "new" ? "Parcours créé" : "Parcours enregistré" });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={path === "new" ? "Nouveau parcours" : "Modifier le parcours"}
      description="Un parcours enchaîne plusieurs formations dans un ordre recommandé."
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
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <FormField label="Titre" htmlFor="pth-title">
            <Input id="pth-title" value={d.title} onChange={(e) => set("title", e.target.value)} />
          </FormField>
          <FormField label="Statut" htmlFor="pth-status">
            <Select id="pth-status" value={d.status} onChange={(e) => set("status", e.target.value as PathStatus)} options={PATH_STATUSES} />
          </FormField>
        </div>
        <FormField label="Description" htmlFor="pth-desc">
          <Textarea id="pth-desc" value={d.description} onChange={(e) => set("description", e.target.value)} className="min-h-16" />
        </FormField>
        <FormField label="Profils visés" hint="Aucun coché = tous les profils.">
          <div className="flex flex-wrap gap-4">
            {PERSONAS.map((p) => (
              <Checkbox
                key={p.value}
                label={p.label}
                checked={d.personas.includes(p.value)}
                onChange={(e) => set("personas", e.target.checked ? [...d.personas, p.value] : d.personas.filter((x) => x !== p.value))}
              />
            ))}
          </div>
        </FormField>
        <FormField label="Formations du parcours (dans l'ordre)">
          <div className="space-y-1.5">
            {d.courseIds.map((id, i) => {
              const c = courses.find((x) => x.id === id);
              return (
                <div key={id} className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-sm">
                  <span className="tabular w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{c?.title ?? "Formation supprimée"}</span>
                  <Button size="icon-xs" variant="ghost" aria-label="Monter" onClick={() => move(i, -1)} disabled={i === 0}>
                    <ArrowUp />
                  </Button>
                  <Button size="icon-xs" variant="ghost" aria-label="Descendre" onClick={() => move(i, 1)} disabled={i === d.courseIds.length - 1}>
                    <ArrowDown />
                  </Button>
                  <Button size="icon-xs" variant="ghost" aria-label="Retirer" onClick={() => set("courseIds", d.courseIds.filter((x) => x !== id))}>
                    <X />
                  </Button>
                </div>
              );
            })}
            <Select
              aria-label="Ajouter une formation"
              value=""
              placeholder="+ Ajouter une formation…"
              onChange={(e) => e.target.value && set("courseIds", [...d.courseIds, e.target.value])}
              options={courses.filter((c) => !d.courseIds.includes(c.id)).map((c) => ({ value: c.id, label: c.title }))}
            />
          </div>
        </FormField>
        <div className="grid items-end gap-4 sm:grid-cols-2">
          <FormField label="Prix du parcours (€ TTC)" htmlFor="pth-price" hint="Vide = non vendu seul.">
            <Input id="pth-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </FormField>
          <div className="flex items-center gap-2 pb-2 text-sm">
            <Switch checked={d.inCatalog} onChange={(v) => set("inCatalog", v)} label="Au catalogue" />
            Proposé à l&apos;achat sur le site
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function PathsTab({ da }: { da: AcademyDa }) {
  const paths = useCollection("academyPaths");
  const courses = useLookup("courses");
  const stats = useCourseStats();
  const { remove } = useActions();
  const { canEdit } = useSession();
  const toast = useToast();
  const editable = canEdit("academy");
  const [editing, setEditing] = React.useState<AcademyPath | "new" | null>(null);

  return (
    <div className="space-y-4">
      {editable ? (
        <Button onClick={() => setEditing("new")} size="sm">
          <Plus /> Nouveau parcours
        </Button>
      ) : null}
      {paths.length ? (
        <DaScope da={da} className="grid grid-cols-1 gap-4 rounded-xl p-3 sm:p-4 lg:grid-cols-2">
          {paths.map((p) => {
            const minutes = p.courseIds.reduce((s, id) => s + (stats.get(id)?.minutes ?? 0), 0);
            return (
              <article key={p.id} className="flex flex-col gap-3 rounded-da border border-da-line bg-da-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className={cn("eyebrow mb-1 text-da-accent", da === "atelier" && "font-mono")}>Parcours · {p.courseIds.length} formation{p.courseIds.length > 1 ? "s" : ""} · {formatDuration(minutes)}</div>
                    <h3 className={cn("text-da-ink", da === "campus" ? "font-da-title text-xl" : "font-da-title text-base font-semibold")}>{p.title}</h3>
                  </div>
                  <StatusBadge options={COURSE_STATUSES} value={p.status} className="shrink-0 text-[11px]" />
                </div>
                {p.description ? <p className="text-sm text-da-muted">{p.description}</p> : null}
                <ol className="space-y-1.5">
                  {p.courseIds.map((id, i) => (
                    <li key={id} className="flex items-center gap-2 text-sm">
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-da-accent-soft text-xs font-semibold text-da-accent">{i + 1}</span>
                      <Link href={`/academy/formations/${id}`} className="truncate text-da-ink hover:text-da-accent">
                        {courses.get(id)?.title ?? "Formation supprimée"}
                      </Link>
                    </li>
                  ))}
                </ol>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-da-line pt-3 text-xs text-da-muted">
                  <span className="flex flex-wrap gap-1.5">
                    {p.personas.length ? p.personas.map((x: Persona) => <Badge key={x}>{labelOf(PERSONAS, x)}</Badge>) : <span>Tous profils</span>}
                  </span>
                  <span>{p.priceCents ? `${money(p.priceCents)} TTC${p.inCatalog ? " · au catalogue" : ""}` : "Non vendu seul"}</span>
                </div>
                {editable ? (
                  <div className="flex gap-2">
                    <Button size="xs" variant="secondary" onClick={() => setEditing(p)}>
                      <Pencil /> Modifier
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        if (!window.confirm(`Supprimer le parcours « ${p.title} » ? Les formations ne sont pas supprimées.`)) return;
                        remove("academyPaths", p.id as ID, { log: `Parcours « ${p.title} » supprimé` });
                        toast({ title: "Parcours supprimé", tone: "info" });
                      }}
                    >
                      <Trash2 /> Supprimer
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </DaScope>
      ) : (
        <EmptyState icon={Route} title="Aucun parcours" description="Assemblez plusieurs formations dans un ordre recommandé (ex. « MVP avec l'IA » puis « Iteration Lab »)." />
      )}
      {editing ? <PathModal path={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
