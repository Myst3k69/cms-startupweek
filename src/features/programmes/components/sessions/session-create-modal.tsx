"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { CalendarPlus } from "lucide-react";
import { Button, Checkbox, FormField, Input, Modal, Select, useToast } from "@/components/ui";
import { EVENT_KINDS, EVENT_MODES, EVENT_STATUSES } from "@/lib/domain/constants";
import type { EventKind, EventMode, EventSession, EventStatus, Region } from "@/lib/domain/types";
import { useActions, useCollection, useNow } from "@/lib/hooks";
import { uid } from "@/lib/utils";
import { EVENT_FORMATS, REGIONS, codePrefix } from "../../lib/labels";
import { DAY, fromDateInput, nextSessionCode, toDateInput } from "../../lib/sessions";

const schema = z
  .object({
    code: z.string().trim().regex(/^[A-Z]{2,4}-\d{4}$/, "Format attendu : SW-0024"),
    name: z.string().trim().min(3, "Nom requis"),
    city: z.string().trim().min(2, "Ville requise (« En ligne » pour une session distancielle)"),
    start: z.string().min(1, "Date de début requise"),
    end: z.string().min(1, "Date de fin requise"),
    capacity: z.number().int().min(1, "Capacité ≥ 1"),
    minCapacity: z.number().int().min(0),
    price: z.number().min(0, "Prix ≥ 0"),
    publicPrice: z.number().min(0).optional(),
    durationHours: z.number().min(0),
  })
  .refine((v) => v.end >= v.start, { path: ["end"], message: "La fin doit suivre le début" })
  .refine((v) => v.minCapacity <= v.capacity, { path: ["minCapacity"], message: "Le seuil minimum dépasse la capacité" })
  .refine((v) => v.publicPrice === undefined || v.publicPrice >= v.price, { path: ["publicPrice"], message: "Le prix barré doit être supérieur au prix" });

const DEFAULT_HOURS: Record<EventKind, number> = { startup_week: 42, startup_village: 28, atelier: 3, masterclass: 2, webinaire: 1.25, demo_day: 4, evenement_entreprise: 21 };

const num = (v: string) => (v === "" ? NaN : Number(v.replace(",", ".")));

/** Création d'une session (code auto SW-00xx suivant, duplication du programme d'une session modèle). */
export function SessionCreateModal({ onClose }: { onClose: () => void }) {
  const events = useCollection("events");
  const now = useNow();
  const { create } = useActions();
  const toast = useToast();
  const router = useRouter();

  const [kind, setKind] = React.useState<EventKind>("startup_week");
  const codes = React.useMemo(() => events.map((e) => e.code), [events]);
  const [code, setCode] = React.useState(() => nextSessionCode(codes, "SW"));
  const [name, setName] = React.useState("");
  const [mode, setMode] = React.useState<EventMode>("presentiel");
  const [format, setFormat] = React.useState<EventSession["format"]>("semaine");
  const [status, setStatus] = React.useState<EventStatus>("brouillon");
  const [region, setRegion] = React.useState<Region>("France");
  const [city, setCity] = React.useState("");
  const [venue, setVenue] = React.useState("");
  const [start, setStart] = React.useState(() => toDateInput(new Date(now + 60 * DAY).toISOString()));
  const [end, setEnd] = React.useState(() => toDateInput(new Date(now + 67 * DAY).toISOString()));
  const [capacity, setCapacity] = React.useState("10");
  const [minCapacity, setMinCapacity] = React.useState("6");
  const [price, setPrice] = React.useState("2900");
  const [publicPrice, setPublicPrice] = React.useState("");
  const [founder, setFounder] = React.useState(false);
  const [early, setEarly] = React.useState(false);
  const [durationHours, setDurationHours] = React.useState(String(DEFAULT_HOURS.startup_week));
  const templates = React.useMemo(() => [...events].sort((a, b) => b.startAt.localeCompare(a.startAt)), [events]);
  const [templateId, setTemplateId] = React.useState(() => templates.find((e) => e.kind === "startup_week" && e.mode === "presentiel")?.id ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const onKind = (k: EventKind) => {
    setKind(k);
    setCode(nextSessionCode(codes, codePrefix(k)));
    setDurationHours(String(DEFAULT_HOURS[k]));
    if (k === "webinaire") {
      setMode("distanciel");
      setFormat("journee");
      setCity("En ligne");
    }
    const tpl = templates.find((e) => e.kind === k);
    setTemplateId(tpl?.id ?? "");
  };

  const submit = () => {
    const pp = num(publicPrice);
    const parsed = schema.safeParse({
      code,
      name,
      city,
      start,
      end,
      capacity: num(capacity),
      minCapacity: num(minCapacity),
      price: num(price),
      publicPrice: Number.isNaN(pp) ? undefined : pp,
      durationHours: num(durationHours),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      setErrors(errs);
      return;
    }
    const v = parsed.data;
    if (events.some((e) => e.code === v.code)) {
      setErrors({ code: "Ce code existe déjà" });
      return;
    }
    const tpl = templates.find((e) => e.id === templateId);
    const startAt = fromDateInput(v.start, kind === "webinaire" ? 18 : 9, 30)!;
    const endAt = fromDateInput(v.end, kind === "webinaire" ? 19 : 12, kind === "webinaire" ? 45 : 0)!;
    const ev = create(
      "events",
      {
        code: v.code,
        name: v.name,
        kind,
        mode,
        format,
        status,
        region,
        city: v.city,
        venue: venue.trim() || undefined,
        startAt,
        endAt,
        registrationDeadline: new Date(Date.parse(startAt) - 7 * DAY).toISOString(),
        capacity: v.capacity,
        minCapacity: v.minCapacity,
        priceCents: Math.round(v.price * 100),
        publicPriceCents: v.publicPrice !== undefined ? Math.round(v.publicPrice * 100) : undefined,
        founderEdition: founder,
        earlyBird: early,
        highlights: tpl ? [...tpl.highlights] : [],
        description: tpl?.description ?? "",
        imageUrl: tpl?.imageUrl,
        isTraining: kind !== "webinaire",
        durationHours: v.durationHours,
        objectives: tpl ? [...tpl.objectives] : [],
        prerequisites: tpl?.prerequisites ?? "",
        evaluationMethods: tpl?.evaluationMethods ?? "",
        accessibility: tpl?.accessibility ?? "",
        program: tpl ? tpl.program.map((p) => ({ ...p, id: uid("slot") })) : [],
        speakerIds: tpl ? [...tpl.speakerIds] : [],
        resourceIds: tpl ? [...tpl.resourceIds] : [],
        budgetCents: tpl?.budgetCents,
        publishedOnSite: false,
      },
      { log: `Session ${v.code} créée${tpl ? ` (programme dupliqué de ${tpl.code})` : ""}` },
    );
    toast({ title: `Session ${ev.code} créée`, description: tpl ? `Programme, objectifs et fiche Qualiopi repris de ${tpl.code} — à ajuster.` : "Complétez le programme et la fiche Qualiopi." });
    onClose();
    router.push(`/sessions/${ev.id}`);
  };

  const field = (key: string) => errors[key];

  return (
    <Modal
      open
      onClose={onClose}
      title="Nouvelle session"
      description="Brouillon non publié : la publication sur le site se fait depuis la fiche de la session."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>
            <CalendarPlus /> Créer la session
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormField label="Type" htmlFor="ns-kind" className="sm:col-span-2">
          <Select id="ns-kind" value={kind} onChange={(e) => onKind(e.target.value as EventKind)} options={EVENT_KINDS} />
        </FormField>
        <FormField label="Code" htmlFor="ns-code" error={field("code")} hint="Clé partagée avec le site (event_code)">
          <Input id="ns-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono" />
        </FormField>
        <FormField label="Statut" htmlFor="ns-status">
          <Select id="ns-status" value={status} onChange={(e) => setStatus(e.target.value as EventStatus)} options={EVENT_STATUSES} />
        </FormField>
        <FormField label="Nom" htmlFor="ns-name" error={field("name")} className="sm:col-span-2 lg:col-span-4">
          <Input id="ns-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Villa Toscane — Mai 2027" autoFocus />
        </FormField>
        <FormField label="Mode" htmlFor="ns-mode">
          <Select id="ns-mode" value={mode} onChange={(e) => setMode(e.target.value as EventMode)} options={EVENT_MODES} />
        </FormField>
        <FormField label="Format" htmlFor="ns-format">
          <Select id="ns-format" value={format} onChange={(e) => setFormat(e.target.value as EventSession["format"])} options={EVENT_FORMATS} />
        </FormField>
        <FormField label="Région" htmlFor="ns-region">
          <Select id="ns-region" value={region} onChange={(e) => setRegion(e.target.value as Region)} options={REGIONS} />
        </FormField>
        <FormField label="Ville" htmlFor="ns-city" error={field("city")}>
          <Input id="ns-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </FormField>
        <FormField label="Lieu / villa" htmlFor="ns-venue" className="sm:col-span-2">
          <Input id="ns-venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Villa à confirmer" />
        </FormField>
        <FormField label="Début" htmlFor="ns-start" error={field("start")}>
          <Input id="ns-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </FormField>
        <FormField label="Fin" htmlFor="ns-end" error={field("end")}>
          <Input id="ns-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </FormField>
        <FormField label="Capacité" htmlFor="ns-cap" error={field("capacity")}>
          <Input id="ns-cap" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </FormField>
        <FormField label="Seuil minimum" htmlFor="ns-min" error={field("minCapacity")} hint="Alerte à J-21 si non atteint">
          <Input id="ns-min" type="number" min={0} value={minCapacity} onChange={(e) => setMinCapacity(e.target.value)} />
        </FormField>
        <FormField label="Prix TTC (€)" htmlFor="ns-price" error={field("price")}>
          <Input id="ns-price" type="number" min={0} step={10} value={price} onChange={(e) => setPrice(e.target.value)} />
        </FormField>
        <FormField label="Prix barré (€)" htmlFor="ns-public" error={field("publicPrice")}>
          <Input id="ns-public" type="number" min={0} step={10} value={publicPrice} onChange={(e) => setPublicPrice(e.target.value)} placeholder="Optionnel" />
        </FormField>
        <FormField label="Durée de formation (h)" htmlFor="ns-hours" error={field("durationHours")} hint="Mentionnée sur la convention et le certificat">
          <Input id="ns-hours" type="number" min={0} step={0.5} value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
        </FormField>
        <FormField label="Dupliquer le programme de" htmlFor="ns-tpl" className="sm:col-span-2 lg:col-span-3" hint="Programme J1…J7, objectifs, prérequis, modalités d'évaluation, accessibilité, intervenants et ressources.">
          <Select id="ns-tpl" value={templateId} onChange={(e) => setTemplateId(e.target.value)} options={templates.map((e) => ({ value: e.id, label: `${e.code} · ${e.name}` }))} placeholder="Aucun (programme vierge)" />
        </FormField>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:col-span-2 lg:col-span-4">
          <Checkbox checked={founder} onChange={(e) => setFounder(e.target.checked)} label="Founder Edition" />
          <Checkbox checked={early} onChange={(e) => setEarly(e.target.checked)} label="Early Bird" />
        </div>
      </form>
    </Modal>
  );
}
