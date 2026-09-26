"use client";

import * as React from "react";
import { PackagePlus } from "lucide-react";
import { z } from "zod";
import { useCollection, useSession, useSettings } from "@/lib/hooks";
import type { Offer } from "@/lib/domain/types";
import { money } from "@/lib/format";
import { Button, Checkbox, DataTable, FormField, Input, Modal, Select, Switch, Textarea, useToast, type Column, type FilterDef } from "@/components/ui";
import { centsToInput, isB2bOffer, parseAmountToCents } from "../lib";
import { saveOffer, setOfferActive, type OfferInput } from "../actions";
import { InfoNote } from "./shared";

const OFFER_KINDS: { value: Offer["kind"]; label: string }[] = [
  { value: "session", label: "Session (bootcamp)" },
  { value: "accompagnement", label: "Accompagnement" },
  { value: "mentorat", label: "Mentorat" },
  { value: "kit", label: "Kit / produit" },
  { value: "ecole", label: "École (B2B)" },
  { value: "entreprise", label: "Entreprise (B2B)" },
];
const kindLabel = (k: Offer["kind"]) => OFFER_KINDS.find((o) => o.value === k)?.label ?? k;

const schema = z.object({
  name: z.string().trim().min(2, "Nom obligatoire"),
  price: z.number({ message: "Prix invalide" }).int().min(0, "Prix invalide"),
  duration: z.number().min(0).optional(),
});

function OfferForm({ offer, onDone }: { offer?: Offer; onDone: () => void }) {
  const toast = useToast();
  const [name, setName] = React.useState(offer?.name ?? "");
  const [code, setCode] = React.useState(offer?.code ?? "");
  const [kind, setKind] = React.useState<Offer["kind"]>(offer?.kind ?? "session");
  const [price, setPrice] = React.useState(offer ? centsToInput(offer.priceCents) : "");
  const [vatRate, setVatRate] = React.useState(String(offer?.vatRate ?? 20));
  const [duration, setDuration] = React.useState(offer?.durationHours ? String(offer.durationHours) : "");
  const [description, setDescription] = React.useState(offer?.description ?? "");
  const [active, setActive] = React.useState(offer?.active ?? true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const b2b = isB2bOffer({ kind });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseAmountToCents(price);
    const hours = duration.trim() ? Number(duration.replace(",", ".")) : undefined;
    const parsed = schema.safeParse({ name, price: cents ?? Number.NaN, duration: hours });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    const input: OfferInput = {
      name: parsed.data.name,
      code: code.trim() || undefined,
      kind,
      priceCents: parsed.data.price,
      vatRate: Number(vatRate),
      durationHours: parsed.data.duration,
      description: description.trim(),
      active,
    };
    saveOffer(input, offer?.id);
    toast({ title: offer ? "Offre mise à jour" : "Offre ajoutée au catalogue", description: input.name });
    onDone();
  };

  return (
    <form id="offer-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <FormField label="Nom de l'offre" htmlFor="of-name" error={errors.name} className="sm:col-span-2">
        <Input id="of-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </FormField>
      <FormField label="Type" htmlFor="of-kind">
        <Select id="of-kind" value={kind} onChange={(e) => setKind(e.target.value as Offer["kind"])} options={OFFER_KINDS} />
      </FormField>
      <FormField label="Code catalogue" htmlFor="of-code" hint="Ex. BLD-SWP, PRC-SR">
        <Input id="of-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono" />
      </FormField>
      <FormField label={`Prix public (€ ${b2b ? "HT" : "TTC"})`} htmlFor="of-price" error={errors.price} hint={b2b ? "B2B : prix de base HT (devis)" : "B2C : prix affiché TTC sur le site"}>
        <Input id="of-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      </FormField>
      <FormField label="TVA" htmlFor="of-vat">
        <Select
          id="of-vat"
          value={vatRate}
          onChange={(e) => setVatRate(e.target.value)}
          options={[
            { value: "20", label: "20 %" },
            { value: "0", label: "0 % (exonération formation)" },
          ]}
        />
      </FormField>
      <FormField label="Durée (heures)" htmlFor="of-dur" error={errors.duration}>
        <Input id="of-dur" inputMode="decimal" value={duration} onChange={(e) => setDuration(e.target.value)} />
      </FormField>
      <div className="flex items-end pb-2">
        <Checkbox checked={active} onChange={(e) => setActive(e.target.checked)} label="Offre active (proposée dans l'éditeur)" />
      </div>
      <FormField label="Description" htmlFor="of-desc" className="sm:col-span-2">
        <Textarea id="of-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20" />
      </FormField>
    </form>
  );
}

export function CatalogTab() {
  const offers = useCollection("offers");
  const settings = useSettings();
  const toast = useToast();
  const { canEdit } = useSession();
  const editable = canEdit("facturation");
  const [editing, setEditing] = React.useState<Offer | "new" | null>(null);

  const rows = React.useMemo(() => [...offers].sort((a, b) => Number(b.active) - Number(a.active) || a.kind.localeCompare(b.kind) || a.priceCents - b.priceCents), [offers]);

  const columns = React.useMemo<Column<Offer>[]>(
    () => [
      {
        key: "name",
        header: "Offre",
        render: (o) => (
          <span className="block min-w-0">
            <span className="block font-medium">{o.name}</span>
            <span className="line-clamp-1 text-xs text-muted-foreground">{o.description}</span>
          </span>
        ),
        sort: (o) => o.name,
        className: "max-w-96",
      },
      { key: "code", header: "Code", render: (o) => <span className="font-mono text-xs text-muted-foreground">{o.code ?? "—"}</span>, sort: (o) => o.code ?? "", hideBelow: "md" },
      { key: "kind", header: "Type", render: (o) => <span className="text-xs">{kindLabel(o.kind)}</span>, sort: (o) => o.kind, hideBelow: "sm" },
      {
        key: "price",
        header: "Prix public",
        align: "right",
        render: (o) => (
          <span className="whitespace-nowrap">
            <span className="font-medium">{o.priceCents ? money(o.priceCents) : "Gratuit"}</span>
            {o.priceCents ? <span className="ml-1 text-xs text-muted-foreground">{isB2bOffer(o) ? "HT" : "TTC"}</span> : null}
          </span>
        ),
        sort: (o) => o.priceCents,
      },
      { key: "vat", header: "TVA", align: "right", render: (o) => <span className="tabular text-xs">{o.vatRate} %</span>, sort: (o) => o.vatRate, hideBelow: "md" },
      { key: "duration", header: "Durée", align: "right", render: (o) => <span className="tabular text-xs">{o.durationHours ? `${o.durationHours} h` : "—"}</span>, sort: (o) => o.durationHours ?? 0, hideBelow: "lg" },
      {
        key: "active",
        header: "Actif",
        align: "center",
        render: (o) => (
          <span className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={o.active}
              disabled={!editable}
              label={`${o.active ? "Désactiver" : "Activer"} ${o.name}`}
              onChange={(v) => {
                setOfferActive(o.id, v);
                toast({ title: v ? "Offre activée" : "Offre désactivée", description: o.name, tone: "info" });
              }}
            />
            <span className="sr-only">{o.active ? "Active" : "Inactive"}</span>
          </span>
        ),
        sort: (o) => Number(o.active),
      },
    ],
    [editable, toast],
  );

  const filters = React.useMemo<FilterDef<Offer>[]>(
    () => [
      { key: "kind", label: "Type", options: OFFER_KINDS, predicate: (o, v) => o.kind === v },
      {
        key: "active",
        label: "Statut",
        options: [
          { value: "1", label: "Actives" },
          { value: "0", label: "Inactives" },
        ],
        predicate: (o, v) => String(Number(o.active)) === v,
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <InfoNote title="Catalogue utilisé par l'éditeur de factures et de devis">
        Convention de prix : <strong className="font-medium text-foreground">TTC pour le B2C</strong> (sessions, accompagnements, mentorat — comme sur le site) et <strong className="font-medium text-foreground">HT pour le B2B</strong> (écoles, entreprises). Les lignes sont converties en HT
        automatiquement{settings.vatExempt ? " ; l'exonération de TVA formation est active (TVA 0 %)" : " ; TVA 20 % tant que l'exonération formation (art. 261-4-4° CGI, après obtention du NDA) n'est pas activée dans les paramètres"}.
      </InfoNote>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {offers.filter((o) => o.active).length} offres actives sur {offers.length}
        </p>
        {editable ? (
          <Button size="sm" onClick={() => setEditing("new")}>
            <PackagePlus aria-hidden="true" /> Nouvelle offre
          </Button>
        ) : null}
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(o) => o.id}
        searchable={(o) => `${o.name} ${o.code ?? ""} ${o.description}`}
        searchPlaceholder="Nom, code…"
        filters={filters}
        onRowClick={editable ? (o) => setEditing(o) : undefined}
        rowClassName={(o) => (o.active ? undefined : "opacity-60")}
        emptyTitle="Catalogue vide"
      />
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing === "new" ? "Nouvelle offre" : "Modifier l'offre"}
        description={editing && editing !== "new" ? editing.name : "Ajoutée au catalogue et proposée dans l'éditeur de lignes."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button type="submit" form="offer-form">
              Enregistrer
            </Button>
          </>
        }
      >
        {editing ? <OfferForm key={editing === "new" ? "new" : editing.id} offer={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} /> : null}
      </Modal>
    </div>
  );
}
