"use client";

import * as React from "react";
import { z } from "zod";
import { Button, Checkbox, FormField, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { VENUE_AMENITIES, VENUE_KINDS, VENUE_SOURCES, VENUE_STATUSES } from "@/lib/domain/constants";
import type { Region, Venue, VenueKind, VenueSource, VenueStatus } from "@/lib/domain/types";
import { useActions } from "@/lib/hooks";
import { centsToInput, inputToCents } from "@/features/crm/lib/format";

const REGIONS: { value: Region; label: string }[] = [
  { value: "France", label: "France" },
  { value: "Europe", label: "Europe" },
  { value: "Hors Europe", label: "Hors Europe" },
];

export type VenueData = Omit<Venue, "id" | "createdAt" | "updatedAt">;

interface Draft {
  name: string;
  kind: VenueKind;
  status: VenueStatus;
  source: VenueSource;
  region: Region;
  country: string;
  city: string;
  address: string;
  bedrooms: string;
  beds: string;
  workspaceSeats: string;
  amenities: string[];
  price: string;
  priceNotes: string;
  accessInfo: string;
  accessibility: string;
  website: string;
  listingUrl: string;
  imageUrl: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  rating: string;
  notes: string;
}

const intOrEmpty = (n?: number) => (n === undefined ? "" : String(n));
const toInt = (s: string) => (s.trim() === "" ? undefined : Math.max(0, Math.round(Number(s))));

function draftFrom(v?: Partial<VenueData>): Draft {
  return {
    name: v?.name ?? "",
    kind: v?.kind ?? "villa",
    status: v?.status ?? "repere",
    source: v?.source ?? "manuel",
    region: v?.region ?? "France",
    country: v?.country ?? "",
    city: v?.city ?? "",
    address: v?.address ?? "",
    bedrooms: intOrEmpty(v?.bedrooms),
    beds: intOrEmpty(v?.beds),
    workspaceSeats: intOrEmpty(v?.workspaceSeats),
    amenities: v?.amenities ?? [],
    price: centsToInput(v?.pricePerNightCents),
    priceNotes: v?.priceNotes ?? "",
    accessInfo: v?.accessInfo ?? "",
    accessibility: v?.accessibility ?? "",
    website: v?.website ?? "",
    listingUrl: v?.listingUrl ?? "",
    imageUrl: v?.imageUrl ?? "",
    contactName: v?.contactName ?? "",
    contactEmail: v?.contactEmail ?? "",
    contactPhone: v?.contactPhone ?? "",
    rating: intOrEmpty(v?.rating),
    notes: v?.notes ?? "",
  };
}

const url = z.string().trim().refine((v) => !v || /^https?:\/\/\S+$/i.test(v), "Adresse web invalide (https://…)");
const schema = z.object({
  name: z.string().trim().min(2, "Nom du lieu requis"),
  city: z.string().trim().min(1, "Ville requise"),
  price: z.string().refine((v) => !v || /^\d[\d\s]*([.,]\d{1,2})?$/.test(v.trim()), "Montant invalide (ex : 1 250)"),
  contactEmail: z.string().trim().refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Email invalide"),
  website: url,
  listingUrl: url,
  imageUrl: url,
});

function validate(d: Draft): Record<string, string> {
  const r = schema.safeParse(d);
  const errs: Record<string, string> = {};
  if (!r.success) for (const i of r.error.issues) errs[String(i.path[0])] ??= i.message;
  return errs;
}

const opt = (s: string) => s.trim() || undefined;

function toData(d: Draft): VenueData {
  const rating = toInt(d.rating);
  return {
    name: d.name.trim(),
    kind: d.kind,
    status: d.status,
    source: d.source,
    region: d.region,
    country: d.country.trim(),
    city: d.city.trim(),
    address: opt(d.address),
    bedrooms: toInt(d.bedrooms),
    beds: toInt(d.beds),
    workspaceSeats: toInt(d.workspaceSeats),
    amenities: d.amenities,
    pricePerNightCents: d.price.trim() ? inputToCents(d.price) : undefined,
    priceNotes: opt(d.priceNotes),
    accessInfo: opt(d.accessInfo),
    accessibility: opt(d.accessibility),
    website: opt(d.website),
    listingUrl: opt(d.listingUrl),
    imageUrl: opt(d.imageUrl),
    contactName: opt(d.contactName),
    contactEmail: opt(d.contactEmail),
    contactPhone: opt(d.contactPhone),
    rating: rating ? Math.min(5, Math.max(1, rating)) : undefined,
    notes: d.notes.trim(),
  };
}

/** Création ou édition d'un lieu du répertoire. `onSaved` reçoit le lieu enregistré (ex. : l'ajouter au sourcing d'une session). */
export function VenueFormModal({ open, onClose, venue, defaults, onSaved, submitLabel }: { open: boolean; onClose: () => void; venue?: Venue; defaults?: Partial<VenueData>; onSaved?: (v: Venue) => void; submitLabel?: string }) {
  if (!open) return null;
  return <VenueFormInner onClose={onClose} venue={venue} defaults={defaults} onSaved={onSaved} submitLabel={submitLabel} />;
}

function VenueFormInner({ onClose, venue, defaults, onSaved, submitLabel }: { onClose: () => void; venue?: Venue; defaults?: Partial<VenueData>; onSaved?: (v: Venue) => void; submitLabel?: string }) {
  const { create, update } = useActions();
  const toast = useToast();
  const [d, setD] = React.useState<Draft>(() => draftFrom(venue ?? defaults));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const id = (k: string) => `venue-${venue?.id ?? "new"}-${k}`;

  const submit = () => {
    const errs = validate(d);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const data = toData(d);
    if (venue) {
      update("venues", venue.id, data, { log: "Fiche du lieu mise à jour" });
      toast({ title: "Lieu mis à jour", description: data.name });
      onSaved?.({ ...venue, ...data });
    } else {
      const v = create("venues", data, { log: "Lieu ajouté au répertoire" });
      toast({ title: "Lieu ajouté au répertoire", description: `${v.name} · ${v.city}` });
      onSaved?.(v);
    }
    onClose();
  };

  const amenityList = Array.from(new Set([...VENUE_AMENITIES, ...d.amenities]));

  return (
    <Modal
      open
      onClose={onClose}
      title={venue ? `Modifier « ${venue.name} »` : "Nouveau lieu"}
      description="Fiche réutilisable d'une session à l'autre : capacité, tarifs, accès, contact."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>{submitLabel ?? (venue ? "Enregistrer" : "Ajouter le lieu")}</Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-5"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Nom du lieu" htmlFor={id("name")} error={errors.name} className="sm:col-span-2">
            <Input id={id("name")} value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Villa Las Buganvillas" autoFocus />
          </FormField>
          <FormField label="Type" htmlFor={id("kind")}>
            <Select id={id("kind")} value={d.kind} onChange={(e) => set({ kind: e.target.value as VenueKind })} options={VENUE_KINDS} />
          </FormField>
          <FormField label="Ville" htmlFor={id("city")} error={errors.city}>
            <Input id={id("city")} value={d.city} onChange={(e) => set({ city: e.target.value })} placeholder="Marbella" />
          </FormField>
          <FormField label="Pays" htmlFor={id("country")}>
            <Input id={id("country")} value={d.country} onChange={(e) => set({ country: e.target.value })} placeholder="Espagne" />
          </FormField>
          <FormField label="Zone" htmlFor={id("region")}>
            <Select id={id("region")} value={d.region} onChange={(e) => set({ region: e.target.value as Region })} options={REGIONS} />
          </FormField>
          <FormField label="Adresse" htmlFor={id("address")} className="sm:col-span-3">
            <Input id={id("address")} value={d.address} onChange={(e) => set({ address: e.target.value })} />
          </FormField>
        </div>

        <fieldset className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capacité & tarif</legend>
          <FormField label="Chambres" htmlFor={id("bedrooms")}>
            <Input id={id("bedrooms")} type="number" min={0} value={d.bedrooms} onChange={(e) => set({ bedrooms: e.target.value })} />
          </FormField>
          <FormField label="Couchages" htmlFor={id("beds")}>
            <Input id={id("beds")} type="number" min={0} value={d.beds} onChange={(e) => set({ beds: e.target.value })} />
          </FormField>
          <FormField label="Places de travail" htmlFor={id("seats")} hint="Assises, en groupe">
            <Input id={id("seats")} type="number" min={0} value={d.workspaceSeats} onChange={(e) => set({ workspaceSeats: e.target.value })} />
          </FormField>
          <FormField label="Tarif / nuit (€)" htmlFor={id("price")} error={errors.price} hint="Lieu entier, indicatif">
            <Input id={id("price")} inputMode="decimal" value={d.price} onChange={(e) => set({ price: e.target.value })} placeholder="1 200" />
          </FormField>
          <FormField label="Conditions tarifaires" htmlFor={id("priceNotes")} className="col-span-2 sm:col-span-4">
            <Input id={id("priceNotes")} value={d.priceNotes} onChange={(e) => set({ priceNotes: e.target.value })} placeholder="Haute saison, minimum de nuits, caution, ménage…" />
          </FormField>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Équipements</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {amenityList.map((a) => (
              <Checkbox
                key={a}
                label={a}
                checked={d.amenities.includes(a)}
                onChange={(e) => set({ amenities: e.target.checked ? [...d.amenities, a] : d.amenities.filter((x) => x !== a) })}
              />
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Accès" htmlFor={id("access")} hint="Aéroport / gare, temps de trajet">
            <Textarea id={id("access")} rows={2} value={d.accessInfo} onChange={(e) => set({ accessInfo: e.target.value })} />
          </FormField>
          <FormField label="Accessibilité PMR" htmlFor={id("pmr")} hint="Utile pour l'indicateur Qualiopi 26">
            <Textarea id={id("pmr")} rows={2} value={d.accessibility} onChange={(e) => set({ accessibility: e.target.value })} />
          </FormField>
        </div>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact & liens</legend>
          <FormField label="Contact" htmlFor={id("cname")}>
            <Input id={id("cname")} value={d.contactName} onChange={(e) => set({ contactName: e.target.value })} />
          </FormField>
          <FormField label="Email" htmlFor={id("cemail")} error={errors.contactEmail}>
            <Input id={id("cemail")} type="email" value={d.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} />
          </FormField>
          <FormField label="Téléphone" htmlFor={id("cphone")}>
            <Input id={id("cphone")} value={d.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} />
          </FormField>
          <FormField label="Site web" htmlFor={id("web")} error={errors.website}>
            <Input id={id("web")} value={d.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://" />
          </FormField>
          <FormField label="Annonce (plateforme)" htmlFor={id("listing")} error={errors.listingUrl}>
            <Input id={id("listing")} value={d.listingUrl} onChange={(e) => set({ listingUrl: e.target.value })} placeholder="https://" />
          </FormField>
          <FormField label="Photo (URL)" htmlFor={id("img")} error={errors.imageUrl}>
            <Input id={id("img")} value={d.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://" />
          </FormField>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <FormField label="Statut" htmlFor={id("status")}>
            <Select id={id("status")} value={d.status} onChange={(e) => set({ status: e.target.value as VenueStatus })} options={VENUE_STATUSES} />
          </FormField>
          <FormField label="Origine" htmlFor={id("source")}>
            <Select id={id("source")} value={d.source} onChange={(e) => set({ source: e.target.value as VenueSource })} options={VENUE_SOURCES} />
          </FormField>
          <FormField label="Note (1 à 5)" htmlFor={id("rating")} hint="Après un séjour">
            <Select
              id={id("rating")}
              value={d.rating}
              onChange={(e) => set({ rating: e.target.value })}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} / 5` }))}
              placeholder="Non noté"
            />
          </FormField>
          <FormField label="Notes internes" htmlFor={id("notes")} className="sm:col-span-4">
            <Textarea id={id("notes")} rows={3} value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Points forts, points de vigilance, retours des participants…" />
          </FormField>
        </div>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
