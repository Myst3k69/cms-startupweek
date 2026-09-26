"use client";

import * as React from "react";
import { ExternalLink, FileText, Library, Plus, Search, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Input, LinkButton, Modal, Select, StatusBadge, useToast } from "@/components/ui";
import { RESOURCE_CATEGORIES, RESOURCE_FORMATS, VISIBILITIES, labelOf } from "@/lib/domain/constants";
import type { EventSession, Resource } from "@/lib/domain/types";
import { useActions, useCollection } from "@/lib/hooks";

function ResourceRow({ r, action }: { r: Resource; action?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[10px] font-semibold uppercase text-muted-foreground ring-1 ring-inset ring-border">
        {r.format === "lien" ? <FileText className="size-4" aria-hidden="true" /> : r.format}
      </span>
      <div className="min-w-0 flex-1">
        <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-sm font-medium text-foreground hover:text-accent-text">
          <span className="truncate">{r.title}</span>
          <ExternalLink className="size-3 shrink-0 text-faint" aria-hidden="true" />
        </a>
        {r.description ? <p className="line-clamp-2 text-xs text-muted-foreground">{r.description}</p> : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <Badge className="text-[11px]">{labelOf(RESOURCE_CATEGORIES, r.category)}</Badge>
          <StatusBadge options={VISIBILITIES} value={r.visibility} className="text-[11px]" />
          {r.indicatorCodes.map((c) => (
            <Badge key={c} tone="violet" className="px-1.5 py-0 text-[10px]">
              ind. {c}
            </Badge>
          ))}
          <span>
            {labelOf(RESOURCE_FORMATS, r.format)} · v{r.version} · {r.downloads} téléchargement{r.downloads > 1 ? "s" : ""}
          </span>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </li>
  );
}

export function ResourcesTab({ ev, canEdit }: { ev: EventSession; canEdit: boolean }) {
  const resources = useCollection("resources");
  const { update } = useActions();
  const toast = useToast();
  const [picking, setPicking] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("");

  const linked = React.useMemo(() => resources.filter((r) => ev.resourceIds.includes(r.id) || r.eventIds.includes(ev.id)), [resources, ev.resourceIds, ev.id]);
  const available = React.useMemo(() => {
    const ids = new Set(linked.map((r) => r.id));
    const needle = q.trim().toLowerCase();
    return resources.filter((r) => !ids.has(r.id) && (!cat || r.category === cat) && (!needle || `${r.title} ${r.description}`.toLowerCase().includes(needle)));
  }, [resources, linked, q, cat]);

  const add = (r: Resource) => {
    update("events", ev.id, { resourceIds: Array.from(new Set([...ev.resourceIds, r.id])) }, { log: `Ressource ajoutée : ${r.title}`, kind: "document" });
    if (!r.eventIds.includes(ev.id)) update("resources", r.id, { eventIds: [...r.eventIds, ev.id] });
    toast({ title: `« ${r.title} » ajoutée à ${ev.code}`, description: r.visibility === "participants" ? "Accessible aux participants de la session." : undefined });
  };
  const detach = (r: Resource) => {
    update("events", ev.id, { resourceIds: ev.resourceIds.filter((id) => id !== r.id) }, { log: `Ressource retirée : ${r.title}`, kind: "document" });
    if (r.eventIds.includes(ev.id)) update("resources", r.id, { eventIds: r.eventIds.filter((id) => id !== ev.id) });
    toast({ title: `« ${r.title} » retirée de la session`, tone: "info" });
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Ressources pédagogiques</CardTitle>
          <CardDescription>Supports remis aux participants — preuve des moyens pédagogiques (indicateur 19).</CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <LinkButton href="/ressources" size="sm" variant="ghost">
            <Library /> Bibliothèque
          </LinkButton>
          {canEdit ? (
            <Button size="sm" onClick={() => setPicking(true)}>
              <Plus /> Ajouter
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {linked.length ? (
          <ul className="divide-y divide-border">
            {linked.map((r) => (
              <ResourceRow
                key={r.id}
                r={r}
                action={
                  canEdit ? (
                    <Button size="icon-sm" variant="ghost" aria-label={`Retirer « ${r.title} »`} title="Retirer de la session" onClick={() => detach(r)}>
                      <X />
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </ul>
        ) : (
          <EmptyState icon={Library} title="Aucune ressource liée" description="Ajoutez les templates (business plan, pitch deck, maquettes…) depuis la bibliothèque." />
        )}
      </CardContent>

      {picking ? (
        <Modal open onClose={() => setPicking(false)} title="Ajouter depuis la bibliothèque" description={`${available.length} ressource${available.length > 1 ? "s" : ""} disponible${available.length > 1 ? "s" : ""}`} size="lg">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher une ressource" className="pl-8" autoFocus />
            </div>
            <Select aria-label="Catégorie" value={cat} onChange={(e) => setCat(e.target.value)} options={RESOURCE_CATEGORIES} placeholder="Toutes catégories" className="w-full sm:w-48" />
          </div>
          {available.length ? (
            <ul className="divide-y divide-border">
              {available.map((r) => (
                <ResourceRow
                  key={r.id}
                  r={r}
                  action={
                    <Button size="xs" variant="secondary" onClick={() => add(r)}>
                      <Plus /> Ajouter
                    </Button>
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune ressource ne correspond.</p>
          )}
        </Modal>
      ) : null}
    </Card>
  );
}
