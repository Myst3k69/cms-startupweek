"use client";

import * as React from "react";
import { AlertTriangle, BedDouble, Check, ExternalLink, Info, Loader2, Plus, Sparkles } from "lucide-react";
import { Badge, Button, Card, Checkbox, Drawer, FormField, Input, Select, Textarea, useToast } from "@/components/ui";
import { VENUE_KINDS, labelOf } from "@/lib/domain/constants";
import type { EventSession, Region, Venue, VenueKind } from "@/lib/domain/types";
import { DATA_MODE, getSupabase } from "@/lib/data/supabase";
import { date, money } from "@/lib/format";
import { useActions, useCollection } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { demoSuggestions, type VenueSearchCriteria, type VenueSearchResponse, type VenueSuggestion } from "../../lib/venue-search";
import { toDateInput } from "../../lib/sessions";

const KIND_CHOICES: VenueKind[] = ["villa", "domaine", "riad", "chalet", "chateau", "gite", "hotel"];
const MUST_HAVES = ["Salle de travail", "Wifi fibre", "Piscine", "Chef / traiteur sur place", "Accès PMR", "Proche aéroport", "Proche gare"];
const REGIONS: { value: Region; label: string }[] = [
  { value: "France", label: "France" },
  { value: "Europe", label: "Europe" },
  { value: "Hors Europe", label: "Hors Europe" },
];
const DAY = 86_400_000;

const normName = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Tiroir « Assistant de sourcing IA » : depuis le répertoire des lieux ou depuis une session (ajout direct au sourcing). */
export function AiSourcingDrawer({ open, onClose, ev }: { open: boolean; onClose: () => void; ev?: EventSession }) {
  if (!open) return null;
  return <AiSourcingInner onClose={onClose} ev={ev} />;
}

function AiSourcingInner({ onClose, ev }: { onClose: () => void; ev?: EventSession }) {
  const venues = useCollection("venues");
  const options = useCollection("venueOptions");
  const { create } = useActions();
  const toast = useToast();

  const [destination, setDestination] = React.useState(ev && ev.city !== "En ligne" ? ev.city : "");
  const [region, setRegion] = React.useState<Region | "">(ev?.region ?? "");
  const [startDate, setStartDate] = React.useState(ev ? toDateInput(new Date(Date.parse(ev.startAt) - DAY).toISOString()) : "");
  const [endDate, setEndDate] = React.useState(ev ? toDateInput(ev.endAt) : "");
  const [people, setPeople] = React.useState(String(ev ? ev.capacity + 2 : 12));
  const [bedroomsMin, setBedroomsMin] = React.useState(String(Math.ceil((ev ? ev.capacity + 2 : 12) / 2)));
  const [budget, setBudget] = React.useState("");
  const [kinds, setKinds] = React.useState<VenueKind[]>(["villa", "domaine"]);
  const [mustHaves, setMustHaves] = React.useState<string[]>(["Salle de travail", "Wifi fibre"]);
  const [notes, setNotes] = React.useState("");

  const [state, setState] = React.useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = React.useState<VenueSearchResponse | null>(null);
  const [demo, setDemo] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const abort = React.useRef<AbortController | null>(null);

  React.useEffect(() => () => abort.current?.abort(), []);
  React.useEffect(() => {
    if (state !== "loading") return;
    const started = Date.now();
    const t = window.setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [state]);

  const known = React.useMemo(() => new Map(venues.map((v) => [normName(v.name), v])), [venues]);

  const criteria = (): VenueSearchCriteria => ({
    destination: destination.trim(),
    region: region || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    people: Number(people) || 12,
    bedroomsMin: bedroomsMin ? Number(bedroomsMin) : undefined,
    budgetPerNightEur: budget.trim() ? Number(budget.replace(/\s/g, "").replace(",", ".")) || undefined : undefined,
    kinds,
    mustHaves,
    notes: notes.trim() || undefined,
    exclude: venues.slice(0, 80).map((v) => `${v.name} (${v.city})`),
  });

  const run = async () => {
    if (destination.trim().length < 2) {
      toast({ title: "Destination manquante", description: "Ville, région, côte, île…", tone: "danger" });
      return;
    }
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setState("loading");
    setElapsed(0);
    setDemo(false);
    setResult(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (DATA_MODE === "supabase") {
        const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch("/api/lieux/recherche", { method: "POST", headers, body: JSON.stringify(criteria()), signal: ctrl.signal });
      const body = (await res.json().catch(() => null)) as VenueSearchResponse | null;
      setResult(body ?? { ok: false, error: "upstream", message: `Réponse inattendue du serveur (${res.status}).` });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setResult({ ok: false, error: "upstream", message: "Connexion interrompue. Vérifiez le réseau et réessayez." });
    }
    setState("done");
  };

  const showDemo = () => {
    setDemo(true);
    setResult({ ok: true, summary: "Exemples fictifs : ils montrent le format des résultats. Aucune recherche n'a été faite.", suggestions: demoSuggestions({ destination, people: Number(people) || 12 }), searches: 0, model: "démo", demo: true });
    setState("done");
  };

  const addToDirectory = (s: VenueSuggestion): Venue => {
    const existing = known.get(normName(s.name));
    if (existing) return existing;
    const noteLines = [
      s.description,
      s.workspace ? `Espace de travail : ${s.workspace}` : null,
      s.availability ? `Disponibilité : ${s.availability}` : null,
      s.watchOuts.length ? `Vigilance : ${s.watchOuts.join(" · ")}` : null,
      s.sourceUrls.length ? `Sources : ${s.sourceUrls.join(" ")}` : null,
      `Trouvé par l'assistant IA le ${date(new Date().toISOString())} — informations à vérifier.`,
    ];
    return create(
      "venues",
      {
        name: s.name,
        kind: s.kind,
        status: "repere",
        source: "ia",
        region: s.region,
        country: s.country,
        city: s.city,
        bedrooms: s.bedrooms,
        beds: s.beds,
        amenities: [],
        pricePerNightCents: s.pricePerNightEur ? Math.round(s.pricePerNightEur * 100) : undefined,
        priceNotes: s.priceBasis,
        accessInfo: s.accessInfo,
        website: s.url,
        notes: noteLines.filter(Boolean).join("\n"),
      },
      { log: "Lieu ajouté depuis l'assistant IA" },
    );
  };

  const addToSourcing = (s: VenueSuggestion) => {
    if (!ev) return;
    const v = addToDirectory(s);
    if (options.some((o) => o.eventId === ev.id && o.venueId === v.id)) {
      toast({ title: "Déjà dans le sourcing", description: v.name, tone: "info" });
      return;
    }
    create(
      "venueOptions",
      {
        eventId: ev.id,
        venueId: v.id,
        stage: "identifie",
        quotedCents: s.totalEstimateEur ? Math.round(s.totalEstimateEur * 100) : undefined,
        availability: s.availability,
        notes: s.totalEstimateEur ? "Montant = estimation de l'assistant IA, à remplacer par le devis." : "",
      },
      { log: `Lieu envisagé pour ${ev.code} : ${v.name} (assistant IA)` },
    );
    toast({ title: "Ajouté au sourcing", description: `${v.name} · ${ev.code}` });
  };

  const unavailable = result && !result.ok && (result.error === "demo_mode" || result.error === "not_configured");

  return (
    <Drawer
      open
      onClose={onClose}
      width="xl"
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-4 text-accent-text" aria-hidden="true" /> Assistant de sourcing IA
        </span>
      }
      description={ev ? `Pistes de lieux pour ${ev.code} · ${ev.name}` : "Trouver de nouveaux lieux à bon prix sur des dates précises."}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className="space-y-4"
      >
        <fieldset disabled={state === "loading"} className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <FormField label="Destination" htmlFor="ai-dest" className="sm:col-span-4" hint="Ville, côte, île, région…">
            <Input id="ai-dest" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Costa del Sol, Paros, Luberon…" autoFocus />
          </FormField>
          <FormField label="Zone" htmlFor="ai-region" className="sm:col-span-2">
            <Select id="ai-region" value={region} onChange={(e) => setRegion(e.target.value as Region)} options={REGIONS} placeholder="Indifférent" />
          </FormField>
          <FormField label="Arrivée" htmlFor="ai-start" className="sm:col-span-2">
            <Input id="ai-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FormField>
          <FormField label="Départ" htmlFor="ai-end" className="sm:col-span-2">
            <Input id="ai-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </FormField>
          <FormField label="Personnes à loger" htmlFor="ai-people" className="sm:col-span-1">
            <Input id="ai-people" type="number" min={2} max={80} value={people} onChange={(e) => setPeople(e.target.value)} />
          </FormField>
          <FormField label="Chambres min." htmlFor="ai-bedrooms" className="sm:col-span-1">
            <Input id="ai-bedrooms" type="number" min={1} max={40} value={bedroomsMin} onChange={(e) => setBedroomsMin(e.target.value)} />
          </FormField>
          <FormField label="Budget max. / nuit (€)" htmlFor="ai-budget" className="sm:col-span-2" hint="Lieu entier">
            <Input id="ai-budget" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="1 200" />
          </FormField>
          <div className="sm:col-span-4">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Types de lieux</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {KIND_CHOICES.map((k) => (
                <Checkbox key={k} label={labelOf(VENUE_KINDS, k)} checked={kinds.includes(k)} onChange={(e) => setKinds((xs) => (e.target.checked ? [...xs, k] : xs.filter((x) => x !== k)))} />
              ))}
            </div>
          </div>
          <div className="sm:col-span-6">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Indispensables</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {MUST_HAVES.map((m) => (
                <Checkbox key={m} label={m} checked={mustHaves.includes(m)} onChange={(e) => setMustHaves((xs) => (e.target.checked ? [...xs, m] : xs.filter((x) => x !== m)))} />
              ))}
            </div>
          </div>
          <FormField label="Précisions" htmlFor="ai-notes" className="sm:col-span-6">
            <Textarea id="ai-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Vue mer, moins d'1 h de l'aéroport, calme, basse saison…" />
          </FormField>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={state === "loading"}>
            <Sparkles /> {state === "loading" ? "Recherche en cours…" : "Lancer la recherche"}
          </Button>
          {state === "loading" ? (
            <>
              <span className="text-xs text-muted-foreground">
                {elapsed}s — l'assistant consulte le web (1 à 3 min).
              </span>
              <Button variant="ghost" size="sm" onClick={() => { abort.current?.abort(); setState("idle"); }}>
                Annuler
              </Button>
            </>
          ) : (
            <span className="text-xs text-faint">Les {Math.min(venues.length, 80)} lieux déjà au répertoire sont exclus des résultats.</span>
          )}
        </div>
      </form>

      <div className="mt-6 space-y-4" aria-live="polite">
        {state === "loading" ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Recherche de lieux réels, lecture des annonces et comparaison des prix…
          </div>
        ) : null}

        {result && !result.ok ? (
          <div className={cn("space-y-3 rounded-lg border p-4 text-sm", unavailable ? "border-border bg-surface-2" : "border-danger/40 bg-danger-soft/40")}>
            <p className="flex items-start gap-2 text-foreground">
              {unavailable ? <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />}
              {result.message}
            </p>
            {unavailable ? (
              <Button size="sm" variant="secondary" onClick={showDemo}>
                Voir un exemple de résultats (fictifs)
              </Button>
            ) : null}
          </div>
        ) : null}

        {result && result.ok ? (
          <>
            <div className={cn("rounded-lg border p-4 text-sm", demo ? "border-warning/50 bg-warning-soft/50" : "border-border bg-surface-2")}>
              {demo ? <p className="mb-1 font-semibold text-warning-text">Exemples fictifs — aucune recherche réelle</p> : null}
              <p className="text-foreground">{result.summary}</p>
              {!demo ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {result.suggestions.length} lieu{result.suggestions.length > 1 ? "x" : ""} · {result.searches} recherche{result.searches > 1 ? "s" : ""} web. Prix et disponibilités sont des indications trouvées en ligne : à confirmer auprès des propriétaires.
                </p>
              ) : null}
            </div>
            <ul className="space-y-3">
              {result.suggestions.map((s) => (
                <SuggestionCard key={`${s.name}-${s.city}`} s={s} demo={demo} known={known.get(normName(s.name))} inSourcing={Boolean(ev && options.some((o) => o.eventId === ev.id && o.venueId === known.get(normName(s.name))?.id))} ev={ev} onAdd={() => { const v = addToDirectory(s); toast({ title: "Ajouté au répertoire", description: `${v.name} · statut « Repéré »` }); }} onSource={() => addToSourcing(s)} />
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </Drawer>
  );
}

function SuggestionCard({ s, demo, known, inSourcing, ev, onAdd, onSource }: { s: VenueSuggestion; demo: boolean; known?: Venue; inSourcing: boolean; ev?: EventSession; onAdd: () => void; onSource: () => void }) {
  const tone = s.confidence === "haute" ? "success" : s.confidence === "moyenne" ? "info" : "warning";
  return (
    <li>
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-foreground">{s.name}</p>
            <p className="text-xs text-muted-foreground">
              {labelOf(VENUE_KINDS, s.kind)} · {[s.city, s.country].filter(Boolean).join(", ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={tone} dot>
              Fiabilité {s.confidence}
            </Badge>
            {known ? <Badge tone="info">Déjà au répertoire</Badge> : null}
          </div>
        </div>
        {s.description ? <p className="text-sm text-muted-foreground">{s.description}</p> : null}
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <p className="flex items-center gap-1.5 text-foreground">
            <BedDouble className="size-4 text-faint" aria-hidden="true" />
            {s.beds ?? "?"} couchages{s.bedrooms ? ` · ${s.bedrooms} ch.` : ""}
          </p>
          <p className="tabular text-foreground">
            {s.pricePerNightEur ? `${money(s.pricePerNightEur * 100)} / nuit` : "Prix non affiché"}
            {s.totalEstimateEur ? <span className="block text-xs text-muted-foreground">≈ {money(s.totalEstimateEur * 100)} au total</span> : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {s.priceBasis ?? ""}
            {s.availability ? <span className="block">Dispo : {s.availability}</span> : null}
          </p>
        </div>
        {s.workspace ? <p className="text-xs text-muted-foreground">Espace de travail : {s.workspace}</p> : null}
        {s.accessInfo ? <p className="text-xs text-muted-foreground">Accès : {s.accessInfo}</p> : null}
        {s.matchReasons.length || s.watchOuts.length ? (
          <ul className="space-y-1 text-xs">
            {s.matchReasons.map((r) => (
              <li key={r} className="flex gap-1.5 text-foreground">
                <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" /> {r}
              </li>
            ))}
            {s.watchOuts.map((r) => (
              <li key={r} className="flex gap-1.5 text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" /> {r}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          {s.url ? (
            <a href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">
              Voir le lieu <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : null}
          {s.sourceUrls.slice(0, 3).map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent-text hover:underline">
              Source {i + 1} <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ))}
          <span className="ml-auto flex flex-wrap gap-2">
            {!known ? (
              <Button size="xs" variant="secondary" onClick={onAdd} disabled={demo} title={demo ? "Exemple fictif" : undefined}>
                <Plus /> Répertoire
              </Button>
            ) : null}
            {ev ? (
              <Button size="xs" onClick={onSource} disabled={demo || inSourcing} title={demo ? "Exemple fictif" : undefined}>
                {inSourcing ? <Check /> : <Plus />} {inSourcing ? "Dans le sourcing" : `Sourcing ${ev.code}`}
              </Button>
            ) : null}
          </span>
        </div>
      </Card>
    </li>
  );
}
