"use client";

import * as React from "react";
import { AlertTriangle, BellRing, Columns3, LayoutGrid, Plus, Rocket, Search, Target, X } from "lucide-react";
import { Button, EmptyState, Input, Kanban, PageHeader, Segmented, Select, StatCard, useToast, type KanbanColumn } from "@/components/ui";
import { PROJECT_STAGES, labelOf } from "@/lib/domain/constants";
import type { Project, ProjectStage } from "@/lib/domain/types";
import { useActions, useCollection, useLookup, useNow, useSession } from "@/lib/hooks";
import { pct } from "@/lib/utils";
import { PROJECT_HEALTH } from "../../lib/labels";
import { replaceQuery } from "../../lib/url";
import { ProjectCard, followUpState } from "./project-card";
import { ProjectFormModal } from "./project-form-modal";

type View = "grille" | "kanban";
const DELIVERED: ProjectStage[] = ["mvp", "lance", "traction"];

export function ProjectsPage({ initialView, initialSession }: { initialView?: string; initialSession?: string }) {
  const now = useNow();
  const { canEdit } = useSession();
  const editable = canEdit("projets");
  const projects = useCollection("projects");
  const eventsList = useCollection("events");
  const contacts = useLookup("contacts");
  const events = useLookup("events");
  const speakers = useLookup("speakers");
  const { update } = useActions();
  const toast = useToast();

  const [view, setView] = React.useState<View>(initialView === "kanban" ? "kanban" : "grille");
  const [q, setQ] = React.useState("");
  const [stage, setStage] = React.useState("");
  const [health, setHealth] = React.useState("");
  const [session, setSession] = React.useState(initialSession ?? "");
  const [sector, setSector] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const lookups = React.useMemo(() => ({ contacts, events, speakers }), [contacts, events, speakers]);
  const sectors = React.useMemo(() => Array.from(new Set(projects.map((p) => p.sector).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")), [projects]);
  const sessionOptions = React.useMemo(() => {
    const used = new Set(projects.flatMap((p) => p.eventIds));
    return eventsList
      .filter((e) => used.has(e.id))
      .sort((a, b) => b.startAt.localeCompare(a.startAt))
      .map((e) => ({ value: e.id, label: `${e.code} · ${e.city}` }));
  }, [projects, eventsList]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return projects
      .filter((p) => {
        if (stage && p.stage !== stage) return false;
        if (health && p.health !== health) return false;
        if (session && !p.eventIds.includes(session)) return false;
        if (sector && p.sector !== sector) return false;
        if (needle) {
          const founders = p.founderIds.map((id) => contacts.get(id)).map((c) => (c ? `${c.firstName} ${c.lastName}` : "")).join(" ");
          if (!`${p.name} ${p.tagline} ${p.sector} ${founders}`.toLowerCase().includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => b.lastUpdateAt.localeCompare(a.lastUpdateAt));
  }, [projects, stage, health, session, sector, q, contacts]);

  const stats = React.useMemo(() => {
    const followed = filtered.filter((p) => p.health !== "en_pause").length;
    const delivered = filtered.filter((p) => DELIVERED.includes(p.stage)).length;
    const risky = filtered.filter((p) => p.health === "a_risque" || p.health === "bloque");
    const follow = filtered.filter((p) => followUpState(p, now));
    return {
      followed,
      delivered,
      risky: risky.length,
      blocked: risky.filter((p) => p.health === "bloque").length,
      follow: follow.length,
      late: follow.filter((p) => followUpState(p, now) === "retard").length,
    };
  }, [filtered, now]);

  const columns = React.useMemo<KanbanColumn<ProjectStage>[]>(
    () =>
      PROJECT_STAGES.map((s) => ({
        id: s.value,
        title: s.label,
        tone: s.tone,
      })),
    [],
  );
  const getColumn = React.useCallback((p: Project) => p.stage, []);

  const hasFilters = Boolean(q || stage || health || session || sector);

  return (
    <div>
      <PageHeader
        eyebrow="Programmes"
        title="Projets candidats"
        description="Portefeuille des projets des candidats et alumni : une seule fiche, de la candidature au suivi J+90 (fini le « projet saisi deux fois » d'Airtable)."
        actions={
          <>
            <Segmented<View>
              value={view}
              onChange={(v) => {
                setView(v);
                replaceQuery({ vue: v === "grille" ? null : v });
              }}
              options={[
                { value: "grille", label: <><LayoutGrid className="size-3.5" aria-hidden="true" /> Grille</> },
                { value: "kanban", label: <><Columns3 className="size-3.5" aria-hidden="true" /> Par stade</> },
              ]}
            />
            {editable ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus /> Nouveau projet
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Projets suivis" value={stats.followed} icon={Rocket} hint={`${filtered.length - stats.followed} en pause`} />
        <StatCard label="MVP livrés" value={stats.delivered} icon={Target} hint={`${pct(stats.delivered, filtered.length)} % des projets`} />
        <StatCard label="À risque" value={stats.risky} icon={AlertTriangle} hint={stats.blocked ? `dont ${stats.blocked} bloqué${stats.blocked > 1 ? "s" : ""}` : "Aucun projet bloqué"} />
        <StatCard label="Suivi J+30 / J+90 à faire" value={stats.follow} icon={BellRing} hint={stats.late ? `dont ${stats.late} en retard` : "dans les 7 prochains jours"} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Projet, fondateur, secteur…" aria-label="Rechercher un projet" className="pl-8" />
        </div>
        <Select aria-label="Stade" value={stage} onChange={(e) => setStage(e.target.value)} options={PROJECT_STAGES} placeholder="Tous les stades" className="w-[calc(50%-4px)] sm:w-auto sm:min-w-36" />
        <Select aria-label="Santé" value={health} onChange={(e) => setHealth(e.target.value)} options={PROJECT_HEALTH} placeholder="Toutes santés" className="w-[calc(50%-4px)] sm:w-auto sm:min-w-36" />
        <Select
          aria-label="Session"
          value={session}
          onChange={(e) => {
            setSession(e.target.value);
            replaceQuery({ session: e.target.value });
          }}
          options={sessionOptions}
          placeholder="Toutes les sessions"
          className="w-[calc(50%-4px)] sm:w-auto sm:min-w-44"
        />
        <Select aria-label="Secteur" value={sector} onChange={(e) => setSector(e.target.value)} options={sectors.map((s) => ({ value: s, label: s }))} placeholder="Tous secteurs" className="w-[calc(50%-4px)] sm:w-auto sm:min-w-36" />
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setStage("");
              setHealth("");
              setSession("");
              setSector("");
              replaceQuery({ session: null });
            }}
          >
            <X /> Réinitialiser
          </Button>
        ) : null}
      </div>

      {view === "grille" ? (
        filtered.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((p) => (
              <ProjectCard key={p.id} p={p} lookups={lookups} now={now} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Rocket} title="Aucun projet" description={hasFilters ? "Aucun projet ne correspond à ces filtres." : "Créez un projet ou générez-le depuis le dossier d'une candidature."} />
        )
      ) : (
        <Kanban<Project, ProjectStage>
          columns={columns}
          items={filtered}
          getId={(p) => p.id}
          getColumn={getColumn}
          readOnly={!editable}
          onMove={(p, to) => {
            update("projects", p.id, { stage: to, lastUpdateAt: new Date().toISOString() }, { log: `Stade : ${labelOf(PROJECT_STAGES, p.stage)} → ${labelOf(PROJECT_STAGES, to)}`, kind: "statut" });
            toast({ title: `${p.name} : ${labelOf(PROJECT_STAGES, to)}`, description: DELIVERED.includes(to) && !DELIVERED.includes(p.stage) ? "MVP livré — pensez à planifier le suivi J+30." : undefined });
          }}
          renderCard={(p) => <ProjectCard p={p} lookups={lookups} now={now} compact />}
        />
      )}

      {creating ? <ProjectFormModal open onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
