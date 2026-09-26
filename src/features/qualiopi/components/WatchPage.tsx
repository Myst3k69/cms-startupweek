"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { ExternalLink, Pencil, Plus, Radar, Search, Trash2, Wand2 } from "lucide-react";
import { useActions, useCollection, useLookup, useNow, useSession } from "@/lib/hooks";
import { ACTION_STATUSES, WATCH_KINDS, labelOf, type Tone } from "@/lib/domain/constants";
import type { ID, WatchItem, WatchKind } from "@/lib/domain/types";
import { date } from "@/lib/format";
import { Badge, Button, Checkbox, EmptyState, FormField, Input, Modal, PageHeader, Segmented, Select, StatusBadge, Textarea, useToast } from "@/components/ui";
import { cn } from "@/lib/utils";
import { WATCH_IMPACTS, WATCH_INDICATOR } from "../labels";
import { fieldErrors } from "../form-utils";
import { DAY, fromDateInput, toDateInput } from "../metrics";
import { QualiopiNav } from "./qualiopi-nav";
import { ActionDrawer, type ActionDraft } from "./action-drawer";

const KIND_TONE: Record<WatchKind, Tone> = { legale: "info", metiers: "violet", pedagogique: "accent", handicap: "success" };
const KIND_SHORT: Record<WatchKind, string> = { legale: "Légale & réglementaire", metiers: "Compétences & métiers", pedagogique: "Pédagogique & techno", handicap: "Handicap" };
const KINDS = WATCH_KINDS.map((k) => k.value);
const isKind = (v: string | null): v is WatchKind => !!v && (KINDS as string[]).includes(v);

export function WatchPage() {
  const items = useCollection("watchItems");
  const actionsById = useLookup("improvementActions");
  const now = useNow();
  const { canEdit } = useSession();
  const { update, remove } = useActions();
  const toast = useToast();
  const readOnly = !canEdit("qualiopi");
  const searchParams = useSearchParams();
  const initial = searchParams.get("type");

  const [kind, setKind] = React.useState<WatchKind | "tous">(isKind(initial) ? initial : "tous");
  const [impact, setImpact] = React.useState("");
  const [q, setQ] = React.useState("");
  const [withoutAction, setWithoutAction] = React.useState(false);
  const [editing, setEditing] = React.useState<{ open: boolean; item?: WatchItem }>({ open: false });
  const [confirmId, setConfirmId] = React.useState<ID | null>(null);
  const [draft, setDraft] = React.useState<{ itemId: ID; draft: ActionDraft } | null>(null);

  const perKind = React.useMemo(
    () =>
      WATCH_KINDS.map((k) => {
        const list = items.filter((w) => w.kind === k.value);
        const year = list.filter((w) => now - Date.parse(w.publishedAt) <= 365 * DAY);
        const last = [...list].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0];
        return { kind: k.value, total: list.length, year: year.length, last: last?.publishedAt, fresh: last ? now - Date.parse(last.publishedAt) <= 120 * DAY : false };
      }),
    [items, now],
  );

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items
      .filter(
        (w) =>
          (kind === "tous" || w.kind === kind) &&
          (!impact || w.impact === impact) &&
          (!withoutAction || !w.actionId) &&
          (!needle || `${w.title} ${w.source} ${w.summary}`.toLowerCase().includes(needle)),
      )
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }, [items, kind, impact, withoutAction, q]);

  const byMonth = React.useMemo(() => {
    const groups: { key: string; label: string; items: WatchItem[] }[] = [];
    filtered.forEach((w) => {
      const key = w.publishedAt.slice(0, 7);
      let g = groups.find((x) => x.key === key);
      if (!g) {
        g = { key, label: date(w.publishedAt, "MMMM yyyy"), items: [] };
        groups.push(g);
      }
      g.items.push(w);
    });
    return groups;
  }, [filtered]);

  const toAction = (w: WatchItem) =>
    setDraft({
      itemId: w.id,
      draft: {
        title: `Veille ${KIND_SHORT[w.kind].toLowerCase()} — ${w.title}`,
        description: `Suite à la veille : ${w.summary}\nSource : ${w.source}${w.url ? ` (${w.url})` : ""}\n\nAction à mener : `,
        origin: "veille",
        originRef: { entity: "watchItems", id: w.id },
        indicatorCodes: [WATCH_INDICATOR[w.kind], 32],
        dueAt: new Date(now + 45 * DAY).toISOString(),
        status: "a_faire",
      },
    });

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Qualiopi · indicateurs 23 à 26"
        title="Veille"
        description="Veille légale et réglementaire, sur les compétences et métiers, pédagogique et technologique, et handicap. Chaque élément documente son impact et peut devenir une action d'amélioration."
        breadcrumbs={[{ label: "Qualiopi", href: "/qualiopi" }, { label: "Veille" }]}
        actions={
          !readOnly ? (
            <Button onClick={() => setEditing({ open: true })}>
              <Plus /> Nouvel élément de veille
            </Button>
          ) : null
        }
      />
      <QualiopiNav />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {perKind.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={() => setKind((cur) => (cur === k.kind ? "tous" : k.kind))}
            aria-pressed={kind === k.kind}
            className={cn("rounded-lg border bg-surface p-4 text-left shadow-sm transition-colors hover:border-border-strong", kind === k.kind ? "border-ring ring-2 ring-ring/20" : "border-border")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Ind. {WATCH_INDICATOR[k.kind]} · {KIND_SHORT[k.kind]}</span>
            </div>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="tabular text-2xl font-semibold text-foreground">{k.year}</span>
              <span className="text-xs text-muted-foreground">sur 12 mois</span>
            </p>
            <p className={cn("mt-1 text-xs", k.fresh ? "text-muted-foreground" : "text-warning-text")}>
              {k.last ? `Dernier : ${date(k.last)}` : "Aucun élément"}
              {!k.fresh ? " · à alimenter" : ""}
            </p>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[{ value: "tous" as const, label: "Tous", count: items.length }, ...WATCH_KINDS.map((k) => ({ value: k.value, label: KIND_SHORT[k.value].split(" ")[0], count: items.filter((w) => w.kind === k.value).length }))]}
          className="max-w-full overflow-x-auto"
        />
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher dans la veille" className="pl-8" />
        </div>
        <Select aria-label="Filtrer par impact" value={impact} onChange={(e) => setImpact(e.target.value)} options={WATCH_IMPACTS} placeholder="Tous les impacts" className="w-auto" />
        <Checkbox label="Sans action" checked={withoutAction} onChange={(e) => setWithoutAction(e.target.checked)} />
      </div>

      {byMonth.length === 0 ? (
        <EmptyState icon={Radar} title={items.length ? "Aucun élément ne correspond" : "Aucune veille documentée"} description={items.length ? "Modifiez les filtres." : "Ajoutez vos sources : textes réglementaires, études métiers, outils pédagogiques, ressources handicap."} />
      ) : (
        <div className="space-y-6">
          {byMonth.map((g) => (
            <section key={g.key} aria-labelledby={`m-${g.key}`}>
              <h2 id={`m-${g.key}`} className="eyebrow mb-2 text-muted-foreground first-letter:uppercase">
                {g.label}
              </h2>
              <ol className="relative space-y-3 border-l border-border pl-4 sm:pl-5">
                {g.items.map((w) => {
                  const act = w.actionId ? actionsById.get(w.actionId) : undefined;
                  return (
                    <li key={w.id} className="relative">
                      <span className="absolute -left-[21px] top-4 size-2.5 rounded-full border-2 border-surface bg-primary sm:-left-[25px]" aria-hidden="true" />
                      <article className="rounded-lg border border-border bg-surface p-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={KIND_TONE[w.kind]}>{KIND_SHORT[w.kind]}</Badge>
                          <StatusBadge options={WATCH_IMPACTS} value={w.impact} />
                          <span className="ml-auto text-xs text-muted-foreground">{date(w.publishedAt)}</span>
                        </div>
                        <h3 className="mt-2 text-sm font-semibold text-foreground">
                          {w.url ? (
                            <a href={w.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-accent-text hover:underline">
                              {w.title} <ExternalLink className="size-3 text-faint" aria-hidden="true" />
                            </a>
                          ) : (
                            w.title
                          )}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">Source : {w.source}</p>
                        <p className="mt-2 text-sm leading-relaxed text-foreground">{w.summary}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                          {act ? (
                            <Link href={`/qualiopi/amelioration?id=${act.id}`} className="inline-flex min-w-0 items-center gap-2 text-xs text-foreground hover:text-accent-text">
                              <span className="truncate">Action : {act.title}</span>
                              <StatusBadge options={ACTION_STATUSES} value={act.status} />
                            </Link>
                          ) : !readOnly && w.impact !== "aucun" ? (
                            <Button size="xs" variant="subtle" onClick={() => toAction(w)}>
                              <Wand2 /> Transformer en action
                            </Button>
                          ) : (
                            <span className="text-xs text-faint">{w.impact === "aucun" ? "Sans impact : pas d'action requise" : "Aucune action liée"}</span>
                          )}
                          {!readOnly ? (
                            confirmId === w.id ? (
                              <span className="flex items-center gap-1">
                                <Button
                                  size="xs"
                                  variant="danger"
                                  onClick={() => {
                                    remove("watchItems", w.id, { log: `Veille supprimée : « ${w.title} »` });
                                    toast({ title: "Élément de veille supprimé", tone: "info" });
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
                              <span className="flex items-center gap-1">
                                <Button size="icon-xs" variant="ghost" aria-label={`Modifier « ${w.title} »`} onClick={() => setEditing({ open: true, item: w })}>
                                  <Pencil />
                                </Button>
                                <Button size="icon-xs" variant="ghost" aria-label={`Supprimer « ${w.title} »`} onClick={() => setConfirmId(w.id)}>
                                  <Trash2 />
                                </Button>
                              </span>
                            )
                          ) : null}
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      <WatchItemModal open={editing.open} item={editing.item} defaultKind={kind === "tous" ? "legale" : kind} onClose={() => setEditing({ open: false })} />
      <ActionDrawer
        open={!!draft}
        draft={draft?.draft}
        onClose={() => setDraft(null)}
        onSaved={(a) => {
          if (draft) update("watchItems", draft.itemId, { actionId: a.id }, { log: `Veille transformée en action : « ${a.title} »` });
        }}
      />
    </div>
  );
}

const schema = z.object({
  title: z.string().trim().min(3, "Titre trop court."),
  source: z.string().trim().min(2, "Indiquez la source (Légifrance, France compétences, Agefiph…)."),
  summary: z.string().trim().min(10, "Résumez l'information et son impact (10 caractères minimum)."),
  publishedAt: z.string().min(1, "Date obligatoire."),
});

function WatchItemModal({ open, item, defaultKind, onClose }: { open: boolean; item?: WatchItem; defaultKind: WatchKind; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={item ? "Modifier l'élément de veille" : "Nouvel élément de veille"} description="Documentez la source, la date et l'impact sur vos prestations." size="lg">
      {open ? <WatchItemForm key={item?.id ?? "new"} item={item} defaultKind={defaultKind} onClose={onClose} /> : null}
    </Modal>
  );
}

function WatchItemForm({ item, defaultKind, onClose }: { item?: WatchItem; defaultKind: WatchKind; onClose: () => void }) {
  const { create, update } = useActions();
  const toast = useToast();
  const [form, setForm] = React.useState({
    kind: item?.kind ?? defaultKind,
    title: item?.title ?? "",
    source: item?.source ?? "",
    url: item?.url ?? "",
    publishedAt: toDateInput(item?.publishedAt) || toDateInput(new Date().toISOString()),
    summary: item?.summary ?? "",
    impact: item?.impact ?? ("faible" as WatchItem["impact"]),
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    const data = {
      kind: form.kind,
      title: parsed.data.title,
      source: parsed.data.source,
      url: form.url.trim() || undefined,
      publishedAt: fromDateInput(form.publishedAt) ?? new Date().toISOString(),
      summary: parsed.data.summary,
      impact: form.impact,
    };
    if (item) {
      update("watchItems", item.id, data, { log: `Veille modifiée : « ${data.title} »` });
      toast({ title: "Élément de veille mis à jour" });
    } else {
      create("watchItems", data, { log: `Veille ajoutée (${labelOf(WATCH_KINDS, data.kind)}) : « ${data.title} »` });
      toast({ title: "Élément de veille ajouté", description: `Indicateur ${WATCH_INDICATOR[data.kind]}` });
    }
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField label="Type de veille" htmlFor="w-kind" className="sm:col-span-2">
          <Select id="w-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as WatchKind })} options={WATCH_KINDS} />
        </FormField>
        <FormField label="Date" htmlFor="w-date" error={errors.publishedAt}>
          <Input id="w-date" type="date" value={form.publishedAt} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} />
        </FormField>
      </div>
      <FormField label="Titre" htmlFor="w-title" error={errors.title}>
        <Input id="w-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex. Décret relatif au compte personnel de formation" />
      </FormField>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Source" htmlFor="w-source" error={errors.source}>
          <Input id="w-source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Légifrance, Centre Inffo, Agefiph…" />
        </FormField>
        <FormField label="Lien" htmlFor="w-url">
          <Input id="w-url" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
        </FormField>
      </div>
      <FormField label="Résumé et analyse d'impact" htmlFor="w-summary" error={errors.summary}>
        <Textarea id="w-summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
      </FormField>
      <FormField label="Impact sur les prestations" htmlFor="w-impact">
        <Select id="w-impact" value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value as WatchItem["impact"] })} options={WATCH_IMPACTS} />
      </FormField>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit">{item ? "Enregistrer" : "Ajouter"}</Button>
      </div>
    </form>
  );
}
