"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, Building2, Pencil, Plus, Search, Sparkles, Star, Trash2 } from "lucide-react";
import { Badge, Button, DataTable, DescriptionList, Drawer, PageHeader, StatCard, StatusBadge, useToast, type Column } from "@/components/ui";
import { StatusSelect } from "@/components/shared/status-select";
import { EXPENSE_STATUSES, VENUE_KINDS, VENUE_OPTION_STAGES, VENUE_SOURCES, VENUE_STATUSES, labelOf } from "@/lib/domain/constants";
import type { Venue } from "@/lib/domain/types";
import { dateRange, money } from "@/lib/format";
import { useActions, useCollection, useNow, useSession } from "@/lib/hooks";
import { replaceQuery } from "../../lib/url";
import { nightsOf } from "../../lib/logistics";
import { ExternalLinks } from "../sessions/logistics/venue-section";
import { AiSourcingDrawer } from "./ai-sourcing";
import { VenueFormModal } from "./venue-form";

interface Row {
  v: Venue;
  sessions: number;
  upcoming: number;
}

const REGION_OPTIONS = [
  { value: "France", label: "France" },
  { value: "Europe", label: "Europe" },
  { value: "Hors Europe", label: "Hors Europe" },
];

export function VenuesPage({ initialId }: { initialId?: string }) {
  const venues = useCollection("venues");
  const events = useCollection("events");
  const { canEdit } = useSession();
  const editable = canEdit("sessions");
  const [openId, setOpenId] = React.useState<string | undefined>(initialId);
  const [creating, setCreating] = React.useState(false);
  const [ai, setAi] = React.useState(false);

  const now = useNow();
  const nowIso = React.useMemo(() => new Date(now).toISOString(), [now]);
  const rows = React.useMemo<Row[]>(
    () =>
      venues.map((v) => {
        const mine = events.filter((e) => e.venueId === v.id && e.status !== "annule");
        return { v, sessions: mine.length, upcoming: mine.filter((e) => e.endAt > nowIso).length };
      }),
    [venues, events, nowIso],
  );

  const stats = React.useMemo(() => {
    const prices = venues.map((v) => v.pricePerNightCents).filter((x): x is number => Boolean(x)).sort((a, b) => a - b);
    return {
      valid: venues.filter((v) => v.status === "valide").length,
      contact: venues.filter((v) => v.status === "en_contact").length,
      spotted: venues.filter((v) => v.status === "repere").length,
      ai: venues.filter((v) => v.source === "ia").length,
      median: prices.length ? prices[Math.floor(prices.length / 2)] : undefined,
    };
  }, [venues]);

  const open = (id?: string) => {
    setOpenId(id);
    replaceQuery({ lieu: id ?? null });
  };

  const columns = React.useMemo<Column<Row>[]>(
    () => [
      {
        key: "name",
        header: "Lieu",
        sort: (r) => r.v.name.toLowerCase(),
        csv: (r) => r.v.name,
        render: (r) => (
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium text-foreground">
              {r.v.name}
              {r.v.source === "ia" ? <Sparkles className="size-3.5 shrink-0 text-violet" aria-label="Trouvé par l'assistant IA" /> : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {labelOf(VENUE_KINDS, r.v.kind)} · {r.v.city}
              {r.v.country ? `, ${r.v.country}` : ""}
            </p>
          </div>
        ),
      },
      { key: "region", header: "Zone", hideBelow: "xl", sort: (r) => r.v.region, csv: (r) => r.v.region, render: (r) => <span className="text-xs text-muted-foreground">{r.v.region}</span> },
      { key: "status", header: "Statut", sort: (r) => r.v.status, csv: (r) => labelOf(VENUE_STATUSES, r.v.status), render: (r) => <StatusBadge options={VENUE_STATUSES} value={r.v.status} /> },
      {
        key: "capacity",
        header: "Capacité",
        hideBelow: "sm",
        sort: (r) => r.v.beds ?? 0,
        csv: (r) => `${r.v.beds ?? ""} couchages / ${r.v.workspaceSeats ?? ""} places`,
        render: (r) => (
          <span className="text-xs text-muted-foreground">
            {r.v.beds ?? "?"} couchages · {r.v.workspaceSeats ?? "?"} places
          </span>
        ),
      },
      { key: "price", header: "Tarif / nuit", align: "right", sort: (r) => r.v.pricePerNightCents ?? 0, csv: (r) => (r.v.pricePerNightCents ? (r.v.pricePerNightCents / 100).toFixed(0) : ""), render: (r) => (r.v.pricePerNightCents ? money(r.v.pricePerNightCents) : <span className="text-faint">—</span>) },
      {
        key: "rating",
        header: "Note",
        hideBelow: "md",
        sort: (r) => r.v.rating ?? 0,
        csv: (r) => r.v.rating ?? "",
        render: (r) =>
          r.v.rating ? (
            <span className="inline-flex items-center gap-1 text-xs text-foreground">
              <Star className="size-3.5 text-warning" aria-hidden="true" /> {r.v.rating}/5
            </span>
          ) : (
            <span className="text-faint">—</span>
          ),
      },
      { key: "sessions", header: "Sessions", align: "right", hideBelow: "md", sort: (r) => r.sessions, csv: (r) => r.sessions, render: (r) => (r.sessions ? <span className="tabular">{r.sessions}{r.upcoming ? <span className="text-xs text-muted-foreground"> ({r.upcoming} à venir)</span> : null}</span> : <span className="text-faint">0</span>) },
    ],
    [],
  );

  const opened = venues.find((v) => v.id === openId);

  return (
    <div>
      <PageHeader
        eyebrow="Programmes"
        title="Lieux"
        description="Répertoire des villas, domaines et lieux de session : capacité, tarifs, contacts, historique des séjours et des devis."
        actions={
          editable ? (
            <>
              <Button variant="subtle" onClick={() => setAi(true)}>
                <Sparkles /> Chercher avec l'IA
              </Button>
              <Button onClick={() => setCreating(true)}>
                <Plus /> Nouveau lieu
              </Button>
            </>
          ) : null
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Lieux validés" value={stats.valid} icon={BadgeCheck} hint="Déjà utilisés ou retenus" />
        <StatCard label="En contact" value={stats.contact} icon={Building2} hint="Devis ou disponibilités en cours" />
        <StatCard label="Repérés" value={stats.spotted} icon={Search} hint={stats.ai ? `${stats.ai} trouvé${stats.ai > 1 ? "s" : ""} par l'IA au total` : "À qualifier"} />
        <StatCard label="Tarif médian" value={stats.median ? money(stats.median) : "—"} icon={Star} hint="Par nuit, lieu entier" />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.v.id}
        onRowClick={(r) => open(r.v.id)}
        searchable={(r) => `${r.v.name} ${r.v.city} ${r.v.country} ${r.v.amenities.join(" ")}`}
        searchPlaceholder="Rechercher un lieu, une ville, un équipement…"
        filters={[
          { key: "status", label: "Statut", options: VENUE_STATUSES, predicate: (r, v) => r.v.status === v },
          { key: "region", label: "Zone", options: REGION_OPTIONS, predicate: (r, v) => r.v.region === v },
          { key: "kind", label: "Type", options: VENUE_KINDS, predicate: (r, v) => r.v.kind === v },
        ]}
        exportName="lieux"
        initialSort={{ key: "status", dir: "desc" }}
        emptyTitle="Aucun lieu"
        emptyDescription="Ajoutez les lieux déjà utilisés, ou lancez l'assistant IA pour en trouver de nouveaux."
      />

      <VenueFormModal open={creating} onClose={() => setCreating(false)} onSaved={(v) => open(v.id)} />
      <AiSourcingDrawer open={ai} onClose={() => setAi(false)} />
      {opened ? <VenueDrawer venue={opened} canEdit={editable} onClose={() => open(undefined)} /> : null}
    </div>
  );
}

function VenueDrawer({ venue, canEdit, onClose }: { venue: Venue; canEdit: boolean; onClose: () => void }) {
  const events = useCollection("events");
  const options = useCollection("venueOptions");
  const expenses = useCollection("expenses");
  const { update, remove } = useActions();
  const toast = useToast();
  const [editing, setEditing] = React.useState(false);

  const sessions = React.useMemo(() => events.filter((e) => e.venueId === venue.id).sort((a, b) => b.startAt.localeCompare(a.startAt)), [events, venue.id]);
  const eventById = React.useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const pistes = React.useMemo(() => options.filter((o) => o.venueId === venue.id && o.stage !== "retenu"), [options, venue.id]);
  const quotes = React.useMemo(() => expenses.filter((e) => e.venueId === venue.id && e.category === "lieu"), [expenses, venue.id]);
  const used = sessions.length + options.filter((o) => o.venueId === venue.id).length + quotes.length;

  return (
    <Drawer
      open
      onClose={onClose}
      width="xl"
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          {venue.name}
          {venue.source === "ia" ? (
            <Badge tone="violet">
              <Sparkles className="size-3" aria-hidden="true" /> IA
            </Badge>
          ) : null}
        </span>
      }
      description={`${labelOf(VENUE_KINDS, venue.kind)} · ${venue.city}${venue.country ? `, ${venue.country}` : ""} · ${labelOf(VENUE_SOURCES, venue.source)}`}
      footer={
        canEdit ? (
          <>
            <Button
              variant="ghost"
              className="mr-auto text-danger-text"
              disabled={used > 0}
              title={used > 0 ? "Utilisé par des sessions, des pistes ou des devis : passez-le plutôt en « Écarté »." : undefined}
              onClick={() => {
                remove("venues", venue.id, { log: `Lieu supprimé du répertoire : ${venue.name}` });
                toast({ title: "Lieu supprimé", description: venue.name, tone: "info" });
                onClose();
              }}
            >
              <Trash2 /> Supprimer
            </Button>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil /> Modifier
            </Button>
          </>
        ) : null
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <StatusSelect options={VENUE_STATUSES} value={venue.status} label="Statut du lieu" onChange={(s) => update("venues", venue.id, { status: s }, { log: `Statut : ${labelOf(VENUE_STATUSES, venue.status)} → ${labelOf(VENUE_STATUSES, s)}`, kind: "statut" })} />
          ) : (
            <StatusBadge options={VENUE_STATUSES} value={venue.status} />
          )}
          {venue.rating ? (
            <Badge tone="warning">
              <Star className="size-3" aria-hidden="true" /> {venue.rating}/5
            </Badge>
          ) : null}
          <ExternalLinks venue={venue} />
        </div>

        <DescriptionList
          columns={2}
          items={[
            { label: "Capacité", value: `${venue.beds ?? "?"} couchages · ${venue.bedrooms ?? "?"} chambres · ${venue.workspaceSeats ?? "?"} places de travail` },
            { label: "Tarif indicatif", value: venue.pricePerNightCents ? `${money(venue.pricePerNightCents)} / nuit` : "—" },
            { label: "Conditions", value: venue.priceNotes ?? "—" },
            { label: "Adresse", value: venue.address ?? "—" },
            { label: "Accès", value: venue.accessInfo ?? "—" },
            { label: "Accessibilité PMR", value: venue.accessibility ?? "—" },
            { label: "Contact", value: [venue.contactName, venue.contactEmail, venue.contactPhone].filter(Boolean).join(" · ") || "—" },
            { label: "Équipements", value: venue.amenities.length ? venue.amenities.join(", ") : "—" },
          ]}
        />
        {venue.notes ? <p className="whitespace-pre-line rounded-md bg-surface-2 p-3 text-sm text-muted-foreground">{venue.notes}</p> : null}

        <section aria-label="Sessions">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Sessions dans ce lieu ({sessions.length})</h3>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune session pour l'instant.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {sessions.map((e) => {
                const q = quotes.find((x) => x.eventId === e.id && x.status === "accepte");
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    <Link href={`/sessions/${e.id}?onglet=logistique`} className="font-medium text-foreground hover:text-accent-text">
                      {e.code}
                    </Link>
                    <span className="text-muted-foreground">{dateRange(e.startAt, e.endAt)}</span>
                    {q ? (
                      <span className="tabular ml-auto text-xs text-muted-foreground">
                        {money(q.amountCents)} · {money(Math.round(q.amountCents / nightsOf(e)))}/nuit
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {pistes.length || quotes.some((q) => q.status !== "accepte") ? (
          <section aria-label="Pistes et devis">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Pistes & devis</h3>
            <ul className="divide-y divide-border rounded-md border border-border">
              {pistes.map((o) => {
                const e = eventById.get(o.eventId);
                return (
                  <li key={o.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    {e ? (
                      <Link href={`/sessions/${e.id}?onglet=logistique`} className="font-medium text-foreground hover:text-accent-text">
                        {e.code}
                      </Link>
                    ) : null}
                    <StatusBadge options={VENUE_OPTION_STAGES} value={o.stage} />
                    {o.quotedCents ? <span className="tabular ml-auto text-xs text-muted-foreground">{money(o.quotedCents)}</span> : null}
                  </li>
                );
              })}
              {quotes
                .filter((q) => q.status !== "accepte")
                .map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    <span className="text-foreground">{eventById.get(q.eventId)?.code ?? "—"}</span>
                    <span className="text-muted-foreground">{q.label}</span>
                    <StatusBadge options={EXPENSE_STATUSES} value={q.status} />
                    <span className="tabular ml-auto text-xs text-muted-foreground">{money(q.amountCents)}</span>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}
      </div>
      <VenueFormModal open={editing} onClose={() => setEditing(false)} venue={venue} />
    </Drawer>
  );
}
