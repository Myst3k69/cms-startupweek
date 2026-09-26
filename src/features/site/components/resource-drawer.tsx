"use client";

import * as React from "react";
import { Copy, Download, ExternalLink, Search, Trash2, TriangleAlert } from "lucide-react";
import {
  Badge,
  Button,
  DescriptionList,
  Drawer,
  FormField,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import { useActions, useCollection, useNow, useSession } from "@/lib/hooks";
import { crm } from "@/lib/store";
import { QUALIOPI_CRITERIA, RESOURCE_CATEGORIES, RESOURCE_FORMATS, VISIBILITIES } from "@/lib/domain/constants";
import { QUALIOPI_REFERENTIEL } from "@/lib/data/qualiopi-referentiel";
import type { ID, Resource, ResourceCategory, ResourceFormat, Visibility } from "@/lib/domain/types";
import { date, number, relative } from "@/lib/format";
import { cn, uid } from "@/lib/utils";
import { bumpVersion, fileSize, formatFromExt, storageUrl, urlKind, VISIBILITY_HINT } from "../lib/resource";
import { FileDropzone, type DroppedFile } from "./file-dropzone";

interface Draft {
  title: string;
  description: string;
  category: ResourceCategory;
  format: ResourceFormat;
  visibility: Visibility;
  url: string;
  sizeKb?: number;
  version: string;
  eventIds: ID[];
  indicatorCodes: number[];
  ownerId: string;
}

const EMPTY: Draft = { title: "", description: "", category: "pedagogique", format: "pdf", visibility: "participants", url: "", version: "1.0", eventIds: [], indicatorCodes: [], ownerId: "" };

function toDraft(r?: Resource, ownerId?: string): Draft {
  if (!r) return { ...EMPTY, ownerId: ownerId ?? "" };
  return {
    title: r.title,
    description: r.description,
    category: r.category,
    format: r.format,
    visibility: r.visibility,
    url: r.url,
    sizeKb: r.sizeKb,
    version: r.version,
    eventIds: [...r.eventIds],
    indicatorCodes: [...r.indicatorCodes].sort((a, b) => a - b),
    ownerId: r.ownerId ?? "",
  };
}

/** Répercute les liens ressource ↔ sessions (EventSession.resourceIds dénormalisé). */
function syncEventLinks(resourceId: ID, before: ID[], after: ID[]) {
  const s = crm();
  const added = after.filter((id) => !before.includes(id));
  const removed = before.filter((id) => !after.includes(id));
  for (const id of added) {
    const ev = s.events.find((e) => e.id === id);
    if (ev && !ev.resourceIds.includes(resourceId)) s.update("events", id, { resourceIds: [...ev.resourceIds, resourceId] });
  }
  for (const id of removed) {
    const ev = s.events.find((e) => e.id === id);
    if (ev) s.update("events", id, { resourceIds: ev.resourceIds.filter((r) => r !== resourceId) });
  }
}

export function ResourceDrawer({ resource, onClose }: { resource?: Resource; onClose: () => void }) {
  const toast = useToast();
  const now = useNow();
  const { create, update, remove } = useActions();
  const { canEdit, user } = useSession();
  const editable = canEdit("ressources");
  const events = useCollection("events");
  const users = useCollection("users");
  const isNew = !resource;

  const [draft, setDraft] = React.useState<Draft>(() => toDraft(resource, user?.id));
  const [errors, setErrors] = React.useState<{ title?: string; url?: string }>({});
  const [eventQuery, setEventQuery] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const sortedEvents = React.useMemo(() => [...events].sort((a, b) => b.startAt.localeCompare(a.startAt)), [events]);
  const shownEvents = React.useMemo(() => {
    const q = eventQuery.trim().toLowerCase();
    return sortedEvents.filter((e) => !q || `${e.code} ${e.name} ${e.city}`.toLowerCase().includes(q));
  }, [sortedEvents, eventQuery]);

  const onFile = (f: DroppedFile, replace: boolean) => {
    setDraft((d) => {
      const version = replace ? bumpVersion(d.version) : d.version;
      const title = d.title || f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      return { ...d, title, sizeKb: f.sizeKb, format: formatFromExt(f.ext) ?? d.format, url: storageUrl(f.name, `v${version.replace(/[^0-9a-z]+/gi, "-")}-${uid("f").slice(2, 7)}`), version };
    });
    setErrors((e) => ({ ...e, url: undefined }));
    toast({ title: replace ? "Nouvelle version prête" : "Fichier prêt", description: `${f.name} · ${fileSize(f.sizeKb)} — enregistrez pour publier.`, tone: "info" });
  };

  const toggleEvent = (id: ID) => set("eventIds", draft.eventIds.includes(id) ? draft.eventIds.filter((x) => x !== id) : [...draft.eventIds, id]);
  const toggleIndicator = (code: number) =>
    set("indicatorCodes", draft.indicatorCodes.includes(code) ? draft.indicatorCodes.filter((x) => x !== code) : [...draft.indicatorCodes, code].sort((a, b) => a - b));

  const save = () => {
    const next: typeof errors = {};
    if (draft.title.trim().length < 3) next.title = "Titre requis (3 caractères minimum).";
    if (!/^https:\/\/\S+$/.test(draft.url.trim())) next.url = "Déposez un fichier ou saisissez une URL https.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const data = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      format: draft.format,
      visibility: draft.visibility,
      url: draft.url.trim(),
      sizeKb: draft.sizeKb,
      version: draft.version.trim() || "1.0",
      eventIds: draft.eventIds,
      indicatorCodes: draft.indicatorCodes,
      ownerId: draft.ownerId || undefined,
    };
    if (isNew) {
      const r = create("resources", { ...data, downloads: 0 }, { log: `Ressource ajoutée (${data.visibility})` });
      syncEventLinks(r.id, [], data.eventIds);
      toast({ title: "Ressource ajoutée", description: VISIBILITY_HINT[data.visibility] });
    } else {
      const versionChanged = resource.version !== data.version;
      update("resources", resource.id, data, { log: versionChanged ? `Nouvelle version ${data.version}` : "Ressource modifiée" });
      syncEventLinks(resource.id, resource.eventIds, data.eventIds);
      toast({ title: "Ressource enregistrée" });
    }
    onClose();
  };

  const destroy = () => {
    if (!resource) return;
    syncEventLinks(resource.id, resource.eventIds, []);
    remove("resources", resource.id, { log: `Ressource supprimée : ${resource.title}` });
    toast({ title: "Ressource supprimée", tone: "info" });
    onClose();
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(draft.url);
      toast({ title: "URL copiée" });
    } catch {
      toast({ title: "Copie impossible", description: "Sélectionnez l'URL manuellement.", tone: "danger" });
    }
  };

  const kind = draft.url ? urlKind(draft.url) : undefined;

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        width="lg"
        title={isNew ? "Ajouter une ressource" : draft.title || "Ressource"}
        description={isNew ? "Le fichier est stocké dans Supabase Storage : URL stable, versionnée, publiée selon la visibilité." : `Version ${resource.version} · mise à jour ${relative(resource.updatedAt, now)}`}
        footer={
          editable ? (
            <>
              {!isNew ? (
                <Button variant="ghost" className="mr-auto text-danger-text" onClick={() => setConfirmDelete(true)}>
                  <Trash2 /> Supprimer
                </Button>
              ) : null}
              <Button variant="secondary" onClick={onClose}>
                Annuler
              </Button>
              <Button onClick={save}>{isNew ? "Ajouter" : "Enregistrer"}</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Fermer
            </Button>
          )
        }
      >
        <div className="space-y-5">
          {/* Fichier */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fichier</h3>
            {isNew && !draft.url ? <FileDropzone onFile={(f) => onFile(f, false)} disabled={!editable} /> : null}
            {draft.url ? (
              <div className="space-y-2 rounded-md border border-border bg-surface-2/50 p-3">
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground" title={draft.url}>
                    {draft.url}
                  </code>
                  <Button variant="ghost" size="icon-xs" aria-label="Copier l'URL" onClick={copyUrl}>
                    <Copy />
                  </Button>
                  <a href={draft.url} target="_blank" rel="noopener noreferrer" className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground" aria-label="Ouvrir le fichier">
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {kind === "stable" ? <Badge tone="success" dot>URL stable</Badge> : kind === "airtable" ? <Badge tone="danger" dot>URL Airtable expirante</Badge> : <Badge tone="info" dot>Lien externe</Badge>}
                  <span>{fileSize(draft.sizeKb)}</span>
                </div>
                {kind === "airtable" ? (
                  <p className="flex items-start gap-1.5 text-xs text-danger-text">
                    <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                    Les pièces jointes Airtable expirent après quelques heures : redéposez le fichier pour obtenir une URL stable.
                  </p>
                ) : null}
                {editable ? <FileDropzone compact onFile={(f) => onFile(f, !isNew)} /> : null}
              </div>
            ) : null}
            {editable ? (
              <FormField label="URL (fichier ou lien Notion / Figma / vidéo)" htmlFor="rs-url" error={errors.url}>
                <Input id="rs-url" value={draft.url} onChange={(e) => { set("url", e.target.value); setErrors((x) => ({ ...x, url: undefined })); }} placeholder="https://storage.startupweek.tech/ressources/…" className="font-mono text-xs" />
              </FormField>
            ) : null}
          </section>

          {/* Métadonnées */}
          <section className="space-y-4">
            <FormField label="Titre" htmlFor="rs-title" error={errors.title}>
              <Input id="rs-title" value={draft.title} disabled={!editable} onChange={(e) => { set("title", e.target.value); setErrors((x) => ({ ...x, title: undefined })); }} />
            </FormField>
            <FormField label="Description" htmlFor="rs-desc">
              <Textarea id="rs-desc" value={draft.description} disabled={!editable} className="min-h-20" onChange={(e) => set("description", e.target.value)} placeholder="À quoi sert ce document, pour qui, à quel moment de la session ?" />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Catégorie" htmlFor="rs-cat">
                <Select id="rs-cat" value={draft.category} disabled={!editable} options={RESOURCE_CATEGORIES} onChange={(e) => set("category", e.target.value as ResourceCategory)} />
              </FormField>
              <FormField label="Format" htmlFor="rs-format">
                <Select id="rs-format" value={draft.format} disabled={!editable} options={RESOURCE_FORMATS} onChange={(e) => set("format", e.target.value as ResourceFormat)} />
              </FormField>
              <FormField label="Version" htmlFor="rs-version">
                <Input id="rs-version" value={draft.version} disabled={!editable} onChange={(e) => set("version", e.target.value)} />
              </FormField>
            </div>
            <FormField label="Visibilité" htmlFor="rs-vis" hint={VISIBILITY_HINT[draft.visibility]}>
              <Select id="rs-vis" value={draft.visibility} disabled={!editable} options={VISIBILITIES} onChange={(e) => set("visibility", e.target.value as Visibility)} />
            </FormField>
            <FormField label="Responsable" htmlFor="rs-owner">
              <Select id="rs-owner" value={draft.ownerId} disabled={!editable} placeholder="Non attribué" options={users.map((u) => ({ value: u.id, label: u.name }))} onChange={(e) => set("ownerId", e.target.value)} />
            </FormField>
          </section>

          {/* Sessions */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sessions liées</h3>
              <span className="tabular text-xs text-muted-foreground">{draft.eventIds.length} sélectionnée{draft.eventIds.length > 1 ? "s" : ""}</span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
              <Input value={eventQuery} onChange={(e) => setEventQuery(e.target.value)} placeholder="Filtrer par code, nom, ville…" aria-label="Filtrer les sessions" className="pl-8" />
            </div>
            <ul className="scrollbar-thin max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border" role="group" aria-label="Sessions liées">
              {shownEvents.length === 0 ? <li className="px-3 py-3 text-sm text-muted-foreground">Aucune session.</li> : null}
              {shownEvents.map((e) => {
                const on = draft.eventIds.includes(e.id);
                return (
                  <li key={e.id}>
                    <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-surface-2", on && "bg-accent-soft")}>
                      <input type="checkbox" checked={on} disabled={!editable} onChange={() => toggleEvent(e.id)} className="size-4 accent-[var(--sw-teal)]" />
                      <span className="font-mono text-xs text-muted-foreground">{e.code}</span>
                      <span className="min-w-0 flex-1 truncate text-foreground">{e.name}</span>
                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{date(e.startAt, "MMM yyyy")}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Qualiopi */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preuve Qualiopi (indicateurs)</h3>
              <span className="tabular text-xs text-muted-foreground">{draft.indicatorCodes.length ? draft.indicatorCodes.map((c) => `ind. ${c}`).join(", ") : "aucun"}</span>
            </div>
            <div className="space-y-2">
              {QUALIOPI_CRITERIA.map((crit) => {
                const inds = QUALIOPI_REFERENTIEL.filter((i) => i.criterion === crit.code);
                return (
                  <div key={crit.code} className="flex flex-wrap items-center gap-1.5">
                    <span className="w-full text-[11px] text-muted-foreground sm:w-40 sm:shrink-0">
                      C{crit.code} · {crit.short}
                    </span>
                    {inds.map((ind) => {
                      const on = draft.indicatorCodes.includes(ind.code);
                      return (
                        <button
                          key={ind.code}
                          type="button"
                          disabled={!editable}
                          aria-pressed={on}
                          title={`Indicateur ${ind.code} — ${ind.title}${ind.applicableToStartupWeek ? "" : " (non applicable à StartupWeek)"}`}
                          onClick={() => toggleIndicator(ind.code)}
                          className={cn(
                            "tabular inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-1.5 text-xs font-medium transition-colors disabled:cursor-default",
                            on ? "border-ring bg-accent-soft-strong text-accent-text" : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
                            !ind.applicableToStartupWeek && !on && "border-dashed opacity-60",
                          )}
                        >
                          {ind.code}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Ind. 19 : ressources pédagogiques mises à disposition · ind. 1 : information du public · ind. 26 : accessibilité. Les indicateurs en pointillés sont non applicables à StartupWeek.</p>
          </section>

          {!isNew ? (
            <section className="rounded-md border border-border p-3">
              <DescriptionList
                columns={3}
                items={[
                  { label: "Téléchargements", value: <span className="inline-flex items-center gap-1"><Download className="size-3.5 text-faint" aria-hidden="true" />{number(resource.downloads)}</span> },
                  { label: "Créée le", value: date(resource.createdAt) },
                  { label: "Mise à jour", value: relative(resource.updatedAt, now) },
                ]}
              />
            </section>
          ) : null}
        </div>
      </Drawer>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Supprimer cette ressource ?"
        description="Elle sera retirée du site, des sessions liées et des preuves Qualiopi."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={destroy}>
              <Trash2 /> Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground">« {resource?.title} »</p>
      </Modal>
    </>
  );
}
