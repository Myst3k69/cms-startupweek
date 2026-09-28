"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, BedDouble, Building2, CheckCircle2, ExternalLink, Mail, MapPin, Phone, Plus, Sparkles, Star, Trash2, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Drawer,
  EmptyState,
  FormField,
  Input,
  Kanban,
  Modal,
  Segmented,
  Select,
  StatusBadge,
  Textarea,
  useToast,
  type KanbanColumn,
} from "@/components/ui";
import { StatusSelect } from "@/components/shared/status-select";
import { VENUE_KINDS, VENUE_OPTION_STAGES, VENUE_SOURCES, labelOf } from "@/lib/domain/constants";
import { retainVenue } from "@/lib/domain/actions";
import type { EventSession, Venue, VenueOption, VenueOptionStage } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { useActions, useCollection, useNow } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { centsToInput, inputToCents } from "@/features/crm/lib/format";
import { capacityFit, nightsOf, optionExpiry, perHead, venueEstimate } from "../../../lib/logistics";
import { fromDateInput, toDateInput } from "../../../lib/sessions";
import { VenueFormModal } from "../../venues/venue-form";

export function VenueSection({ ev, canEdit, onOpenAi }: { ev: EventSession; canEdit: boolean; onOpenAi: () => void }) {
  const venues = useCollection("venues");
  const allOptions = useCollection("venueOptions");
  const { create, update } = useActions();
  const toast = useToast();
  const now = useNow();
  const venueById = React.useMemo(() => new Map(venues.map((v) => [v.id, v])), [venues]);
  const options = React.useMemo(() => allOptions.filter((o) => o.eventId === ev.id && venueById.has(o.venueId)), [allOptions, ev.id, venueById]);
  const retained = ev.venueId ? venueById.get(ev.venueId) : undefined;

  const [view, setView] = React.useState<"kanban" | "comparatif">("kanban");
  const openCount = options.filter((o) => o.stage !== "retenu" && o.stage !== "ecarte").length;
  const [expanded, setExpanded] = React.useState(!retained || openCount > 0);
  const [picking, setPicking] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const opened = options.find((o) => o.id === openId);

  const columns = React.useMemo<KanbanColumn<VenueOptionStage>[]>(() => VENUE_OPTION_STAGES.map((s) => ({ id: s.value, title: s.label, tone: s.tone })), []);

  const addOption = (venue: Venue) => {
    if (options.some((o) => o.venueId === venue.id)) {
      toast({ title: "Déjà dans le sourcing", description: venue.name, tone: "info" });
      return;
    }
    create("venueOptions", { eventId: ev.id, venueId: venue.id, stage: "identifie", notes: "" }, { log: `Lieu envisagé pour ${ev.code} : ${venue.name}` });
    toast({ title: "Lieu ajouté au sourcing", description: `${venue.name} · ${ev.code}` });
  };

  const move = (o: VenueOption, to: VenueOptionStage) => {
    if (to === "retenu") {
      setOpenId(o.id);
      toast({ title: "Confirmez le choix du lieu", description: "Utilisez « Retenir ce lieu » dans la fiche.", tone: "info" });
      return;
    }
    update("venueOptions", o.id, { stage: to }, { log: `Sourcing ${ev.code} : ${labelOf(VENUE_OPTION_STAGES, o.stage)} → ${labelOf(VENUE_OPTION_STAGES, to)}`, kind: "statut" });
  };

  return (
    <div className="space-y-6">
      <RetainedVenueCard ev={ev} venue={retained} />

      <Card>
        <CardHeader className="flex-wrap gap-3">
          <div>
            <CardTitle>Sourcing du lieu</CardTitle>
            <CardDescription>
              {nightsOf(ev)} nuits · {ev.capacity} participants + encadrement. Glissez une carte pour changer d'étape.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "kanban", label: "Étapes" },
                { value: "comparatif", label: "Comparatif" },
              ]}
            />
            {canEdit ? (
              <>
                <Button size="sm" variant="subtle" onClick={onOpenAi}>
                  <Sparkles /> Chercher avec l'IA
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>
                  <Building2 /> Depuis le répertoire
                </Button>
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus /> Nouveau lieu
                </Button>
              </>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {!expanded ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              <span>
                Lieu retenu · {options.length} piste{options.length > 1 ? "s" : ""} au total, aucune en cours.
              </span>
              <Button size="xs" variant="ghost" onClick={() => setExpanded(true)}>
                Afficher le sourcing
              </Button>
            </div>
          ) : options.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Aucun lieu envisagé"
              description="Ajoutez des pistes depuis le répertoire, créez un lieu ou lancez une recherche avec l'assistant IA."
            />
          ) : view === "kanban" ? (
            <Kanban
              columns={columns}
              items={options}
              getId={(o) => o.id}
              getColumn={(o) => o.stage}
              onMove={move}
              readOnly={!canEdit}
              renderCard={(o) => <OptionCard option={o} venue={venueById.get(o.venueId)!} ev={ev} now={now} canEdit={canEdit} onOpen={() => setOpenId(o.id)} onMove={(to) => move(o, to)} />}
            />
          ) : (
            <Comparison options={options} venueById={venueById} ev={ev} onOpen={setOpenId} />
          )}
        </CardContent>
      </Card>

      <PickVenueModal open={picking} onClose={() => setPicking(false)} ev={ev} excluded={new Set(options.map((o) => o.venueId))} onPick={addOption} />
      <VenueFormModal
        open={creating}
        onClose={() => setCreating(false)}
        defaults={{ region: ev.region, city: ev.city === "En ligne" ? "" : ev.city }}
        onSaved={addOption}
        submitLabel="Ajouter au sourcing"
      />
      {opened ? <OptionDrawer option={opened} venue={venueById.get(opened.venueId)!} ev={ev} canEdit={canEdit} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

/* ───────────────────────────── Lieu retenu ───────────────────────────── */

function RetainedVenueCard({ ev, venue }: { ev: EventSession; venue?: Venue }) {
  if (!venue) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning-text">
            <MapPin className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-foreground">Aucun lieu retenu pour {ev.code}</p>
            <p className="text-sm text-muted-foreground">
              {ev.venue ? `Affiché aujourd'hui : « ${ev.venue} ». ` : ""}Comparez les pistes ci-dessous puis retenez-en une : le devis devient une dépense engagée avec son échéancier.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  const fit = capacityFit(venue, ev);
  const estimate = venueEstimate(venue, ev);
  return (
    <Card>
      <CardHeader className="flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
            <CardTitle>{venue.name}</CardTitle>
            <Badge tone="success" dot>
              Lieu retenu
            </Badge>
            {venue.rating ? (
              <Badge tone="warning">
                <Star className="size-3" aria-hidden="true" /> {venue.rating}/5
              </Badge>
            ) : null}
          </div>
          <CardDescription>
            {labelOf(VENUE_KINDS, venue.kind)} · {venue.city}
            {venue.country ? `, ${venue.country}` : ""}
          </CardDescription>
        </div>
        <Link href={`/lieux?lieu=${venue.id}`} className="text-sm font-medium text-accent-text hover:underline">
          Fiche du lieu
        </Link>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <dl className="space-y-2 text-sm">
          <Row label="Couchages" icon={BedDouble}>
            {venue.beds ?? "—"}
            {venue.bedrooms ? ` (${venue.bedrooms} chambres)` : ""}
            {fit.beds === false ? <Badge tone="danger" className="ml-2">Insuffisant</Badge> : null}
          </Row>
          <Row label="Places de travail" icon={Users}>
            {venue.workspaceSeats ?? "—"}
            {fit.seats === false ? <Badge tone="danger" className="ml-2">Insuffisant</Badge> : null}
          </Row>
          <Row label="Tarif indicatif">{venue.pricePerNightCents ? `${money(venue.pricePerNightCents)} / nuit${estimate ? ` · ≈ ${money(estimate)} pour ${nightsOf(ev)} nuits` : ""}` : "—"}</Row>
          {venue.priceNotes ? <p className="text-xs text-muted-foreground">{venue.priceNotes}</p> : null}
        </dl>
        <div className="space-y-2 text-sm">
          {venue.address ? (
            <p className="flex gap-2 text-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
              {venue.address}
            </p>
          ) : null}
          {venue.accessInfo ? <p className="text-muted-foreground">{venue.accessInfo}</p> : null}
          {venue.accessibility ? <p className="text-xs text-muted-foreground">Accessibilité : {venue.accessibility}</p> : null}
          {venue.amenities.length ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {venue.amenities.map((a) => (
                <Badge key={a}>{a}</Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">{venue.contactName ?? "Contact non renseigné"}</p>
          {venue.contactEmail ? (
            <a href={`mailto:${venue.contactEmail}`} className="flex items-center gap-2 text-accent-text hover:underline">
              <Mail className="size-4" aria-hidden="true" /> {venue.contactEmail}
            </a>
          ) : null}
          {venue.contactPhone ? (
            <a href={`tel:${venue.contactPhone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-accent-text hover:underline">
              <Phone className="size-4" aria-hidden="true" /> {venue.contactPhone}
            </a>
          ) : null}
          <ExternalLinks venue={venue} />
          {venue.notes ? <p className="rounded-md bg-surface-2 p-2 text-xs text-muted-foreground">{venue.notes}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, icon: Icon, children }: { label: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
        {label}
      </dt>
      <dd className="tabular text-right text-foreground">{children}</dd>
    </div>
  );
}

export function ExternalLinks({ venue }: { venue: Pick<Venue, "website" | "listingUrl"> }) {
  if (!venue.website && !venue.listingUrl) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {venue.website ? (
        <a href={venue.website} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">
          Site web <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      ) : null}
      {venue.listingUrl ? (
        <a href={venue.listingUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">
          Annonce <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

/* ───────────────────────────── Cartes & comparatif ───────────────────────────── */

function OptionCard({ option, venue, ev, now, canEdit, onOpen, onMove }: { option: VenueOption; venue: Venue; ev: EventSession; now: number; canEdit: boolean; onOpen: () => void; onMove: (to: VenueOptionStage) => void }) {
  const expiry = optionExpiry(option, now);
  const total = option.quotedCents ?? venueEstimate(venue, ev);
  const head = perHead(total, ev.capacity);
  const fit = capacityFit(venue, ev);
  return (
    <Card className="space-y-2 p-3">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <p className="truncate text-sm font-medium text-foreground hover:text-accent-text">{venue.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {venue.city}
          {venue.country ? `, ${venue.country}` : ""}
        </p>
      </button>
      <div className="flex flex-wrap items-center gap-1.5">
        {venue.source === "ia" ? (
          <Badge tone="violet">
            <Sparkles className="size-3" aria-hidden="true" /> IA
          </Badge>
        ) : null}
        {fit.beds === false ? <Badge tone="danger">Couchages insuffisants</Badge> : null}
        {venue.beds ? <Badge>{venue.beds} couchages</Badge> : null}
      </div>
      <p className="tabular text-sm text-foreground">
        {total ? (
          <>
            {money(total)}
            {!option.quotedCents ? <span className="text-xs text-muted-foreground"> (estimation)</span> : null}
            {head ? <span className="block text-xs text-muted-foreground">≈ {money(head)} / participant</span> : null}
          </>
        ) : (
          <span className="text-muted-foreground">Prix inconnu</span>
        )}
      </p>
      {option.availability ? <p className="text-xs text-muted-foreground">{option.availability}</p> : null}
      {expiry ? (
        <p className={cn("flex items-center gap-1 text-xs font-medium", expiry === "expiree" ? "text-danger-text" : "text-warning-text")}>
          <AlertTriangle className="size-3.5" aria-hidden="true" />
          {expiry === "expiree" ? "Option expirée" : "Option à confirmer"} — {date(option.optionUntil)}
        </p>
      ) : option.stage === "option" && option.optionUntil ? (
        <p className="text-xs text-muted-foreground">Option jusqu'au {date(option.optionUntil)}</p>
      ) : null}
      {option.stage === "ecarte" && option.rejectReason ? <p className="text-xs text-muted-foreground">Écarté : {option.rejectReason}</p> : null}
      {canEdit ? <StatusSelect options={VENUE_OPTION_STAGES} value={option.stage} onChange={onMove} label={`Étape pour ${venue.name}`} className="w-full" /> : null}
    </Card>
  );
}

function Comparison({ options, venueById, ev, onOpen }: { options: VenueOption[]; venueById: Map<string, Venue>; ev: EventSession; onOpen: (id: string) => void }) {
  const rows = [...options]
    .filter((o) => o.stage !== "ecarte")
    .map((o) => {
      const v = venueById.get(o.venueId)!;
      const total = o.quotedCents ?? venueEstimate(v, ev);
      return { o, v, total, head: perHead(total, ev.capacity), fit: capacityFit(v, ev) };
    })
    .sort((a, b) => (a.total ?? Infinity) - (b.total ?? Infinity));
  if (!rows.length) return <p className="text-sm text-muted-foreground">Toutes les pistes ont été écartées.</p>;
  const best = rows[0].total;
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Lieu</th>
            <th className="py-2 pr-3 font-medium">Étape</th>
            <th className="py-2 pr-3 text-right font-medium">Total</th>
            <th className="py-2 pr-3 text-right font-medium">/ participant</th>
            <th className="py-2 pr-3 text-right font-medium">Couchages</th>
            <th className="py-2 pr-3 text-right font-medium">Travail</th>
            <th className="py-2 pr-3 font-medium">Accès</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ o, v, total, head, fit }) => (
            <tr key={o.id} className="border-b border-border last:border-0">
              <td className="py-2 pr-3">
                <button type="button" className="font-medium text-foreground hover:text-accent-text" onClick={() => onOpen(o.id)}>
                  {v.name}
                </button>
                <span className="block text-xs text-muted-foreground">{v.city}</span>
              </td>
              <td className="py-2 pr-3">
                <StatusBadge options={VENUE_OPTION_STAGES} value={o.stage} />
              </td>
              <td className="tabular py-2 pr-3 text-right">
                {total ? money(total) : "—"}
                {total && total === best && rows.length > 1 ? <Badge tone="success" className="ml-2">Le moins cher</Badge> : null}
                {total && !o.quotedCents ? <span className="block text-xs text-muted-foreground">estimation</span> : null}
              </td>
              <td className="tabular py-2 pr-3 text-right">{head ? money(head) : "—"}</td>
              <td className={cn("tabular py-2 pr-3 text-right", fit.beds === false && "font-medium text-danger-text")}>{v.beds ?? "—"}</td>
              <td className={cn("tabular py-2 pr-3 text-right", fit.seats === false && "font-medium text-danger-text")}>{v.workspaceSeats ?? "—"}</td>
              <td className="max-w-[240px] py-2 pr-3 text-xs text-muted-foreground">{v.accessInfo ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-faint">Totaux : devis reçu, sinon estimation = tarif indicatif × {nightsOf(ev)} nuits. En rouge : capacité inférieure au besoin ({ev.capacity} participants + 2 encadrants).</p>
    </div>
  );
}

/* ───────────────────────────── Ajout depuis le répertoire ───────────────────────────── */

function PickVenueModal({ open, onClose, ev, excluded, onPick }: { open: boolean; onClose: () => void; ev: EventSession; excluded: Set<string>; onPick: (v: Venue) => void }) {
  const venues = useCollection("venues");
  const [q, setQ] = React.useState("");
  const list = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return venues
      .filter((v) => !excluded.has(v.id) && v.status !== "ecarte")
      .filter((v) => !needle || `${v.name} ${v.city} ${v.country}`.toLowerCase().includes(needle))
      .sort((a, b) => Number(b.region === ev.region) - Number(a.region === ev.region) || a.name.localeCompare(b.name, "fr"));
  }, [venues, excluded, q, ev.region]);
  if (!open) return null;
  return (
    <Modal open onClose={onClose} title="Ajouter un lieu du répertoire" description={`Pistes pour ${ev.code} — les lieux de la zone « ${ev.region} » d'abord.`} size="lg">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un lieu, une ville…" aria-label="Rechercher un lieu" className="mb-3" autoFocus />
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucun lieu disponible. Créez-en un ou utilisez l'assistant IA.</p>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((v) => (
            <li key={v.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{v.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {labelOf(VENUE_KINDS, v.kind)} · {v.city}
                  {v.country ? `, ${v.country}` : ""} · {v.beds ?? "?"} couchages{v.pricePerNightCents ? ` · ${money(v.pricePerNightCents)}/nuit` : ""} · {labelOf(VENUE_SOURCES, v.source)}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  onPick(v);
                  onClose();
                }}
              >
                Ajouter
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/* ───────────────────────────── Fiche d'une piste ───────────────────────────── */

function OptionDrawer({ option, venue, ev, canEdit, onClose }: { option: VenueOption; venue: Venue; ev: EventSession; canEdit: boolean; onClose: () => void }) {
  const { update, remove, create } = useActions();
  const expenses = useCollection("expenses");
  const toast = useToast();
  const [stage, setStage] = React.useState(option.stage);
  const [quoted, setQuoted] = React.useState(centsToInput(option.quotedCents));
  const [availability, setAvailability] = React.useState(option.availability ?? "");
  const [optionUntil, setOptionUntil] = React.useState(toDateInput(option.optionUntil));
  const [notes, setNotes] = React.useState(option.notes);
  const [rejectReason, setRejectReason] = React.useState(option.rejectReason ?? "");
  const [confirming, setConfirming] = React.useState(false);
  const [showOnSession, setShowOnSession] = React.useState(true);
  const hasExpense = expenses.some((e) => e.eventId === ev.id && e.venueId === venue.id && e.status !== "refuse");
  const id = (k: string) => `opt-${option.id}-${k}`;

  const save = () => {
    const quotedCents = quoted.trim() ? inputToCents(quoted) : undefined;
    update(
      "venueOptions",
      option.id,
      {
        stage: stage === "retenu" && option.stage !== "retenu" ? option.stage : stage,
        quotedCents,
        availability: availability.trim() || undefined,
        optionUntil: fromDateInput(optionUntil, 18),
        notes: notes.trim(),
        rejectReason: stage === "ecarte" ? rejectReason.trim() || undefined : undefined,
      },
      { log: `Piste mise à jour : ${venue.name}` },
    );
    toast({ title: "Piste enregistrée", description: venue.name });
    if (stage === "retenu" && option.stage !== "retenu") setConfirming(true);
    else onClose();
  };

  const recordQuote = () => {
    const quotedCents = quoted.trim() ? inputToCents(quoted) : option.quotedCents;
    if (!quotedCents) return;
    create(
      "expenses",
      { eventId: ev.id, category: "lieu", label: `Location ${venue.name}`, supplier: venue.name, status: "recu", amountCents: quotedCents, venueId: venue.id, receivedAt: new Date().toISOString(), installments: [], notes: "" },
      { log: `Devis du lieu enregistré (${money(quotedCents)})` },
    );
    toast({ title: "Devis enregistré", description: "Visible dans « Devis & paiements »." });
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      title={venue.name}
      description={`${labelOf(VENUE_KINDS, venue.kind)} · ${venue.city}${venue.country ? `, ${venue.country}` : ""} — piste pour ${ev.code}`}
      footer={
        canEdit ? (
          <>
            <Button
              variant="ghost"
              className="mr-auto text-danger-text"
              onClick={() => {
                remove("venueOptions", option.id, { log: `Retiré du sourcing : ${venue.name}` });
                toast({ title: "Retiré du sourcing", description: venue.name, tone: "info" });
                onClose();
              }}
            >
              <Trash2 /> Retirer
            </Button>
            {option.stage !== "retenu" ? (
              <Button variant="secondary" onClick={() => setConfirming(true)}>
                <CheckCircle2 /> Retenir ce lieu
              </Button>
            ) : null}
            <Button onClick={save}>Enregistrer</Button>
          </>
        ) : null
      }
    >
      <fieldset disabled={!canEdit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Étape" htmlFor={id("stage")}>
            <Select id={id("stage")} value={stage} onChange={(e) => setStage(e.target.value as VenueOptionStage)} options={VENUE_OPTION_STAGES} />
          </FormField>
          <FormField label="Montant du devis (€ TTC)" htmlFor={id("quoted")} hint={venue.pricePerNightCents ? `Estimation : ${money(venueEstimate(venue, ev))}` : undefined}>
            <Input id={id("quoted")} inputMode="decimal" value={quoted} onChange={(e) => setQuoted(e.target.value)} placeholder="9 800" />
          </FormField>
          <FormField label="Disponibilité" htmlFor={id("avail")}>
            <Input id={id("avail")} value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Libre du 23 au 31 octobre" />
          </FormField>
          <FormField label="Option posée jusqu'au" htmlFor={id("until")}>
            <Input id={id("until")} type="date" value={optionUntil} onChange={(e) => setOptionUntil(e.target.value)} />
          </FormField>
          {stage === "ecarte" ? (
            <FormField label="Raison de l'écart" htmlFor={id("reject")} className="sm:col-span-2">
              <Input id={id("reject")} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Trop cher, pas de salle de travail…" />
            </FormField>
          ) : null}
          <FormField label="Notes" htmlFor={id("notes")} className="sm:col-span-2">
            <Textarea id={id("notes")} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>
      </fieldset>

      <div className="mt-5 space-y-2 rounded-lg border border-border p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Le lieu</p>
        <p className="text-foreground">
          {venue.beds ?? "?"} couchages · {venue.bedrooms ?? "?"} chambres · {venue.workspaceSeats ?? "?"} places de travail
          {venue.pricePerNightCents ? ` · ${money(venue.pricePerNightCents)}/nuit` : ""}
        </p>
        {venue.accessInfo ? <p className="text-muted-foreground">{venue.accessInfo}</p> : null}
        {venue.contactEmail ? (
          <a href={`mailto:${venue.contactEmail}?subject=${encodeURIComponent(`Demande de disponibilité — ${date(ev.startAt)}`)}`} className="inline-flex items-center gap-1.5 text-accent-text hover:underline">
            <Mail className="size-4" aria-hidden="true" /> Écrire à {venue.contactName ?? venue.contactEmail}
          </a>
        ) : null}
        <ExternalLinks venue={venue} />
        <Link href={`/lieux?lieu=${venue.id}`} className="block text-xs font-medium text-accent-text hover:underline">
          Ouvrir la fiche du répertoire
        </Link>
      </div>

      {canEdit && !hasExpense && (option.quotedCents || quoted.trim()) ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={recordQuote}>
          Enregistrer ce devis dans « Devis & paiements »
        </Button>
      ) : null}

      {confirming ? (
        <Modal
          open
          onClose={() => setConfirming(false)}
          title={`Retenir ${venue.name} ?`}
          description={`Le lieu devient le lieu de ${ev.code}.`}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  const r = retainVenue(option.id, { showOnSession });
                  toast({
                    title: `${venue.name} retenu pour ${ev.code}`,
                    description: [r.expenseCreated ? "Dépense engagée créée (acompte 30 % / solde J-30)." : null, r.otherOptions ? `${r.otherOptions} autre${r.otherOptions > 1 ? "s" : ""} option${r.otherOptions > 1 ? "s" : ""} à libérer auprès des propriétaires.` : null]
                      .filter(Boolean)
                      .join(" ") || undefined,
                  });
                  setConfirming(false);
                  onClose();
                }}
              >
                Retenir ce lieu
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>{option.quotedCents || hasExpense ? "Le devis du lieu passera en dépense engagée, avec un échéancier à ajuster." : "Aucun montant de devis : pensez à l'ajouter dans « Devis & paiements »."}</p>
            <Checkbox checked={showOnSession} onChange={(e) => setShowOnSession(e.target.checked)} label={`Renseigner « ${venue.name} » comme lieu sur la fiche de la session`} />
          </div>
        </Modal>
      ) : null}
    </Drawer>
  );
}
