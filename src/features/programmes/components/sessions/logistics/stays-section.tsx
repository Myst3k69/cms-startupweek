"use client";

import * as React from "react";
import { BedDouble, Bus, PlaneLanding, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, DataTable, FormField, Input, Modal, Select, StatCard, StatusBadge, Textarea, useToast, type Column } from "@/components/ui";
import { STAY_ROLES, TRAVEL_MODES, labelOf } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { EventSession, SessionStay, StayRole, TravelMode } from "@/lib/domain/types";
import { date, dateTime } from "@/lib/format";
import { useActions, useCollection } from "@/lib/hooks";
import { arrivalGroups, roomOccupancy, type StayRow } from "../../../lib/logistics";
import { fromDateTimeInput, toDateTimeInput } from "../../../lib/sessions";

/** Personnes attendues sur place : inscrits, intervenants du programme, puis séjours libres (équipe, invités). */
export function useStayRows(ev: EventSession): StayRow[] {
  const applications = useCollection("applications");
  const contacts = useCollection("contacts");
  const speakers = useCollection("speakers");
  const stays = useCollection("stays");
  return React.useMemo(() => {
    const mine = stays.filter((s) => s.eventId === ev.id);
    const byContact = new Map(mine.filter((s) => s.contactId).map((s) => [s.contactId!, s]));
    const bySpeaker = new Map(mine.filter((s) => s.speakerId).map((s) => [s.speakerId!, s]));
    const contactById = new Map(contacts.map((c) => [c.id, c]));
    const rows: StayRow[] = [];
    const seenContacts = new Set<string>();
    for (const a of applications) {
      if (a.eventId !== ev.id || a.status !== "inscrite" || seenContacts.has(a.contactId)) continue;
      seenContacts.add(a.contactId);
      const c = contactById.get(a.contactId);
      rows.push({ key: `c:${a.contactId}`, role: "participant", name: c ? contactName(c) : "Participant", contactId: a.contactId, stay: byContact.get(a.contactId) });
    }
    const speakerIds = Array.from(new Set([...ev.speakerIds, ...ev.program.map((p) => p.speakerId).filter((x): x is string => Boolean(x))]));
    for (const sid of speakerIds) {
      const s = speakers.find((x) => x.id === sid);
      if (!s) continue;
      rows.push({ key: `s:${sid}`, role: "intervenant", name: `${s.firstName} ${s.lastName}`, speakerId: sid, stay: bySpeaker.get(sid) });
    }
    // Séjours sans ligne ci-dessus : équipe, invités, participant désinscrit depuis…
    for (const st of mine) {
      if ((st.contactId && seenContacts.has(st.contactId)) || (st.speakerId && speakerIds.includes(st.speakerId))) continue;
      rows.push({ key: `x:${st.id}`, role: st.role, name: st.name, contactId: st.contactId, speakerId: st.speakerId, stay: st });
    }
    return rows;
  }, [applications, contacts, speakers, stays, ev.id, ev.speakerIds, ev.program]);
}

export function StaysSection({ ev, canEdit, bedrooms }: { ev: EventSession; canEdit: boolean; bedrooms?: number }) {
  const rows = useStayRows(ev);
  const [editing, setEditing] = React.useState<StayRow | "new" | null>(null);
  const stays = React.useMemo(() => rows.map((r) => r.stay).filter((s): s is SessionStay => Boolean(s)), [rows]);
  const groups = React.useMemo(() => arrivalGroups(stays), [stays]);
  const rooms = React.useMemo(() => roomOccupancy(stays), [stays]);
  const withArrival = rows.filter((r) => r.stay?.arrivalAt).length;
  const shuttle = stays.filter((s) => s.shuttle).length;
  const diets = stays.filter((s) => s.diet?.trim()).length;

  const columns = React.useMemo<Column<StayRow>[]>(
    () => [
      {
        key: "name",
        header: "Personne",
        sort: (r) => r.name.toLowerCase(),
        csv: (r) => r.name,
        render: (r) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{r.name}</p>
            <StatusBadge options={STAY_ROLES} value={r.role} />
          </div>
        ),
      },
      { key: "role", header: "Rôle", hideBelow: "2xl", csv: (r) => labelOf(STAY_ROLES, r.role), render: (r) => labelOf(STAY_ROLES, r.role) },
      { key: "room", header: "Chambre", sort: (r) => r.stay?.room ?? "zzz", csv: (r) => r.stay?.room ?? "", render: (r) => r.stay?.room ?? <span className="text-faint">—</span> },
      {
        key: "arrival",
        header: "Arrivée",
        sort: (r) => r.stay?.arrivalAt ?? "9999",
        csv: (r) => (r.stay?.arrivalAt ? `${dateTime(r.stay.arrivalAt)} ${r.stay.arrivalRef ?? ""}`.trim() : ""),
        render: (r) =>
          r.stay?.arrivalAt ? (
            <span className="text-xs">
              <span className="whitespace-nowrap text-foreground">{date(r.stay.arrivalAt, "EEE d MMM · HH:mm")}</span>
              <span className="block text-muted-foreground">
                {r.stay.arrivalMode ? labelOf(TRAVEL_MODES, r.stay.arrivalMode) : ""}
                {r.stay.arrivalRef ? ` · ${r.stay.arrivalRef}` : ""}
              </span>
            </span>
          ) : (
            <Badge tone="warning">À renseigner</Badge>
          ),
      },
      {
        key: "departure",
        header: "Départ",
        hideBelow: "md",
        sort: (r) => r.stay?.departureAt ?? "9999",
        csv: (r) => (r.stay?.departureAt ? `${dateTime(r.stay.departureAt)} ${r.stay.departureRef ?? ""}`.trim() : ""),
        render: (r) => (r.stay?.departureAt ? <span className="whitespace-nowrap text-xs text-muted-foreground">{date(r.stay.departureAt, "EEE d MMM · HH:mm")}</span> : <span className="text-faint">—</span>),
      },
      { key: "shuttle", header: "Navette", hideBelow: "sm", sort: (r) => Number(Boolean(r.stay?.shuttle)), csv: (r) => (r.stay?.shuttle ? "oui" : "non"), render: (r) => (r.stay?.shuttle ? <Badge tone="info">Oui</Badge> : <span className="text-faint">—</span>) },
      { key: "diet", header: "Régime", hideBelow: "lg", csv: (r) => r.stay?.diet ?? "", render: (r) => (r.stay?.diet ? <span className="text-xs text-foreground">{r.stay.diet}</span> : <span className="text-faint">—</span>) },
      {
        key: "confirmed",
        header: "Présence",
        sort: (r) => Number(Boolean(r.stay?.confirmed)),
        csv: (r) => (r.stay?.confirmed ? "confirmée" : "à confirmer"),
        render: (r) => (r.stay?.confirmed ? <Badge tone="success" dot>Confirmée</Badge> : <Badge tone="neutral" dot>À confirmer</Badge>),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Arrivées renseignées" value={`${withArrival}/${rows.length}`} icon={PlaneLanding} hint={rows.length - withArrival ? `${rows.length - withArrival} à collecter` : "Tout est renseigné"} />
        <StatCard label="Navettes" value={shuttle} icon={Bus} hint={`${groups.length} créneau${groups.length > 1 ? "x" : ""} d'arrivée`} />
        <StatCard label="Chambres occupées" value={bedrooms ? `${rooms.length}/${bedrooms}` : rooms.length} icon={BedDouble} hint={bedrooms ? "Capacité du lieu retenu" : "Aucun lieu retenu"} />
        <StatCard label="Régimes particuliers" value={diets} icon={UtensilsCrossed} hint="À transmettre au traiteur" />
      </div>

      <Card>
        <CardHeader className="flex-wrap gap-3">
          <div>
            <CardTitle>Chambres & arrivées</CardTitle>
            <CardDescription>Inscrits, intervenants du programme et équipe. Cliquez sur une ligne pour la compléter. Export CSV = rooming list.</CardDescription>
          </div>
          {canEdit ? (
            <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
              <Plus /> Équipe / invité
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.key}
            onRowClick={canEdit ? (r) => setEditing(r) : undefined}
            exportName={`rooming-list-${ev.code}`}
            initialSort={{ key: "arrival", dir: "asc" }}
            pageSize={50}
            dense
            emptyTitle="Personne n'est encore attendu"
            emptyDescription="Les inscrits (candidatures « Inscrite ») et les intervenants du programme apparaissent automatiquement."
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Arrivées groupées</CardTitle>
              <CardDescription>Par créneau horaire : base du planning des navettes.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune arrivée renseignée.</p>
            ) : (
              <ul className="divide-y divide-border">
                {groups.map((g) => (
                  <li key={g.at} className="flex items-start gap-3 py-2">
                    <span className="tabular w-32 shrink-0 text-sm font-medium text-foreground">{date(g.at, "EEE d MMM · HH'h'")}</span>
                    <span className="min-w-0 flex-1 text-xs text-muted-foreground">{g.names.join(", ")}</span>
                    <Badge tone={g.shuttle ? "info" : "neutral"}>
                      {g.count} pers.{g.shuttle ? ` · ${g.shuttle} navette` : ""}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Répartition des chambres</CardTitle>
              <CardDescription>{bedrooms ? `${bedrooms} chambres dans le lieu retenu.` : "Retenez un lieu pour comparer à sa capacité."}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {rooms.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune chambre attribuée.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {rooms.map((r) => (
                  <li key={r.room} className="rounded-md border border-border p-2.5">
                    <p className="text-sm font-medium text-foreground">{r.room}</p>
                    <p className="text-xs text-muted-foreground">{r.names.join(" · ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {editing ? <StayModal ev={ev} row={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

/** Création / édition d'un séjour. Sans `row` : personne libre (équipe, invité). */
export function StayModal({ ev, row, onClose }: { ev: EventSession; row?: StayRow; onClose: () => void }) {
  const { create, update, remove } = useActions();
  const toast = useToast();
  const st = row?.stay;
  const [name, setName] = React.useState(row?.name ?? "");
  const [role, setRole] = React.useState<StayRole>(row?.role ?? "equipe");
  const [confirmed, setConfirmed] = React.useState(st?.confirmed ?? false);
  const [room, setRoom] = React.useState(st?.room ?? "");
  const [arrivalAt, setArrivalAt] = React.useState(toDateTimeInput(st?.arrivalAt));
  const [arrivalMode, setArrivalMode] = React.useState<TravelMode | "">(st?.arrivalMode ?? "");
  const [arrivalRef, setArrivalRef] = React.useState(st?.arrivalRef ?? "");
  const [departureAt, setDepartureAt] = React.useState(toDateTimeInput(st?.departureAt));
  const [departureMode, setDepartureMode] = React.useState<TravelMode | "">(st?.departureMode ?? "");
  const [departureRef, setDepartureRef] = React.useState(st?.departureRef ?? "");
  const [shuttle, setShuttle] = React.useState(st?.shuttle ?? false);
  const [diet, setDiet] = React.useState(st?.diet ?? "");
  const [notes, setNotes] = React.useState(st?.notes ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const free = !row?.contactId && !row?.speakerId;
  const id = (k: string) => `stay-${row?.key ?? "new"}-${k}`;

  const save = () => {
    if (free && name.trim().length < 2) return setError("Indiquez le nom de la personne.");
    const a = fromDateTimeInput(arrivalAt);
    const d = fromDateTimeInput(departureAt);
    if (a && d && d < a) return setError("Le départ est avant l'arrivée.");
    const data = {
      name: free ? name.trim() : row!.name,
      role: free ? role : row!.role,
      confirmed,
      room: room.trim() || undefined,
      arrivalAt: a,
      arrivalMode: arrivalMode || undefined,
      arrivalRef: arrivalRef.trim() || undefined,
      departureAt: d,
      departureMode: departureMode || undefined,
      departureRef: departureRef.trim() || undefined,
      shuttle,
      diet: diet.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (st) update("stays", st.id, data, { log: `Séjour mis à jour — ${data.name}` });
    else create("stays", { ...data, eventId: ev.id, contactId: row?.contactId, speakerId: row?.speakerId }, { log: `Séjour renseigné — ${data.name}` });
    toast({ title: "Séjour enregistré", description: data.name });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={row ? row.name : "Ajouter une personne"}
      description={`${ev.code} · ${row ? labelOf(STAY_ROLES, row.role) : "Équipe, invité, prestataire logé…"}`}
      size="lg"
      footer={
        <>
          {st ? (
            <Button
              variant="ghost"
              className="mr-auto text-danger-text"
              onClick={() => {
                remove("stays", st.id, { log: `Séjour effacé — ${st.name}` });
                toast({ title: "Séjour effacé", description: st.name, tone: "info" });
                onClose();
              }}
            >
              <Trash2 /> Effacer
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={save}>Enregistrer</Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-6"
      >
        {free ? (
          <>
            <FormField label="Nom" htmlFor={id("name")} className="sm:col-span-4">
              <Input id={id("name")} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </FormField>
            <FormField label="Rôle" htmlFor={id("role")} className="sm:col-span-2">
              <Select id={id("role")} value={role} onChange={(e) => setRole(e.target.value as StayRole)} options={STAY_ROLES.filter((r) => r.value === "equipe" || r.value === "invite")} />
            </FormField>
          </>
        ) : null}
        <FormField label="Chambre" htmlFor={id("room")} className="sm:col-span-3" hint="ex : Chambre 2 (lit 1)">
          <Input id={id("room")} value={room} onChange={(e) => setRoom(e.target.value)} />
        </FormField>
        <div className="flex items-end sm:col-span-3">
          <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} label="Présence confirmée" />
        </div>
        <FormField label="Arrivée" htmlFor={id("arr")} className="sm:col-span-2">
          <Input id={id("arr")} type="datetime-local" value={arrivalAt} onChange={(e) => setArrivalAt(e.target.value)} />
        </FormField>
        <FormField label="Moyen" htmlFor={id("arrm")} className="sm:col-span-2">
          <Select id={id("arrm")} value={arrivalMode} onChange={(e) => setArrivalMode(e.target.value as TravelMode)} options={TRAVEL_MODES} placeholder="—" />
        </FormField>
        <FormField label="N° de vol / train" htmlFor={id("arrr")} className="sm:col-span-2">
          <Input id={id("arrr")} value={arrivalRef} onChange={(e) => setArrivalRef(e.target.value)} />
        </FormField>
        <FormField label="Départ" htmlFor={id("dep")} className="sm:col-span-2">
          <Input id={id("dep")} type="datetime-local" value={departureAt} onChange={(e) => setDepartureAt(e.target.value)} />
        </FormField>
        <FormField label="Moyen" htmlFor={id("depm")} className="sm:col-span-2">
          <Select id={id("depm")} value={departureMode} onChange={(e) => setDepartureMode(e.target.value as TravelMode)} options={TRAVEL_MODES} placeholder="—" />
        </FormField>
        <FormField label="N° de vol / train" htmlFor={id("depr")} className="sm:col-span-2">
          <Input id={id("depr")} value={departureRef} onChange={(e) => setDepartureRef(e.target.value)} />
        </FormField>
        <div className="sm:col-span-6">
          <Checkbox checked={shuttle} onChange={(e) => setShuttle(e.target.checked)} label="Navette à prévoir (arrivée et départ)" />
        </div>
        <FormField label="Régime / allergies" htmlFor={id("diet")} className="sm:col-span-6" hint="Le strict nécessaire pour le traiteur (donnée sensible)">
          <Input id={id("diet")} value={diet} onChange={(e) => setDiet(e.target.value)} placeholder="Végétarien, sans gluten…" />
        </FormField>
        <FormField label="Notes" htmlFor={id("notes")} className="sm:col-span-6">
          <Textarea id={id("notes")} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        {error ? <p className="text-sm font-medium text-danger-text sm:col-span-6">{error}</p> : null}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
