"use client";

import * as React from "react";
import { CalendarDays, CalendarPlus, Euro, LayoutGrid, List, Smile, Ticket, X } from "lucide-react";
import { Button, PageHeader, Segmented, Select, StatCard } from "@/components/ui";
import { EVENT_KINDS, EVENT_MODES, EVENT_STATUSES } from "@/lib/domain/constants";
import { isRunning, isUpcoming, sessionStats } from "@/lib/domain/selectors";
import { money, percent } from "@/lib/format";
import { useCollection, useNow, useSession } from "@/lib/hooks";
import { REGIONS } from "../../lib/labels";
import { average, billedByEvent, DAY, sessionAudience } from "../../lib/sessions";
import { replaceQuery } from "../../lib/url";
import { SessionCalendar } from "./session-calendar";
import { SessionCards } from "./session-cards";
import { SessionCreateModal } from "./session-create-modal";
import { SessionList } from "./session-list";

type View = "cartes" | "calendrier" | "liste";

export function SessionsPage({ initialView }: { initialView?: string }) {
  const now = useNow();
  const { canEdit } = useSession();
  const editable = canEdit("sessions");
  const events = useCollection("events");
  const applications = useCollection("applications");
  const evaluations = useCollection("evaluations");
  const invoices = useCollection("invoices");
  const quotes = useCollection("quotes");
  const billed = React.useMemo(() => billedByEvent(invoices, quotes), [invoices, quotes]);

  const [view, setView] = React.useState<View>(initialView === "calendrier" || initialView === "liste" ? initialView : "cartes");
  const [status, setStatus] = React.useState("");
  const [mode, setMode] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [kind, setKind] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const filtered = React.useMemo(
    () => events.filter((e) => (!status || e.status === status) && (!mode || e.mode === mode) && (!region || e.region === region) && (!kind || e.kind === kind)),
    [events, status, mode, region, kind],
  );
  const upcoming = React.useMemo(
    () => filtered.filter((e) => isUpcoming(e, now) || isRunning(e, now)).sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [filtered, now],
  );

  const stats = React.useMemo(() => {
    // Jauge, remplissage et seuil : uniquement les StartupWeek B2C (les webinaires et sessions B2B n'ont pas de candidatures).
    let seats = 0;
    let sold = 0;
    let revenue = 0;
    let collected = 0;
    let b2b = 0;
    let pipeline = 0;
    let underMin = 0;
    upcoming.forEach((e) => {
      const audience = sessionAudience(e);
      if (audience === "b2b") {
        const b = billed.get(e.id);
        b2b += b?.signed ?? 0;
        collected += b?.collected ?? 0;
        return;
      }
      if (audience !== "b2c") return;
      const st = sessionStats(e, applications);
      seats += e.capacity;
      sold += st.enrolled;
      revenue += st.revenue;
      collected += st.collected;
      pipeline += st.pipeline;
      const d = Math.ceil((Date.parse(e.startAt) - now) / DAY);
      if (d > 0 && d <= 21 && st.belowMinimum) underMin += 1;
    });
    const ids = new Set(filtered.map((e) => e.id));
    const sats = evaluations.filter((ev) => ev.kind === "a_chaud" && ids.has(ev.eventId) && Date.parse(ev.submittedAt) >= now - 365 * DAY);
    return {
      seats,
      sold,
      revenue: revenue + b2b,
      b2b,
      collected,
      pipeline,
      underMin,
      published: upcoming.filter((e) => e.publishedOnSite).length,
      satisfaction: average(sats.map((s) => s.satisfaction)),
      responses: sats.length,
    };
  }, [upcoming, filtered, applications, evaluations, billed, now]);

  const hasFilters = Boolean(status || mode || region || kind);

  return (
    <div>
      <PageHeader
        eyebrow="Programmes"
        title="Sessions & événements"
        description="StartupWeek en villa et en ligne, Startup Village écoles, sprints entreprise et webinaires : remplissage, programme Qualiopi, émargement, évaluations et finances."
        actions={
          <>
            <Segmented<View>
              value={view}
              onChange={(v) => {
                setView(v);
                replaceQuery({ vue: v === "cartes" ? null : v });
              }}
              options={[
                { value: "cartes", label: <><LayoutGrid className="size-3.5" aria-hidden="true" /> Cartes</> },
                { value: "calendrier", label: <><CalendarDays className="size-3.5" aria-hidden="true" /> Calendrier</> },
                { value: "liste", label: <><List className="size-3.5" aria-hidden="true" /> Liste</> },
              ]}
            />
            {editable ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                <CalendarPlus /> Nouvelle session
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sessions à venir" value={upcoming.length} icon={CalendarDays} hint={`${stats.published} publiée${stats.published > 1 ? "s" : ""} sur le site${stats.underMin ? ` · ${stats.underMin} sous le seuil` : ""}`} />
        <StatCard
          label="Places vendues (B2C)"
          value={`${stats.sold}/${stats.seats}`}
          icon={Ticket}
          hint={`${stats.seats ? percent((stats.sold / stats.seats) * 100) : "0 %"} de remplissage StartupWeek · ${stats.pipeline} en pipeline`}
        />
        <StatCard label="CA signé à venir" value={money(stats.revenue)} icon={Euro} hint={`${money(stats.collected)} encaissés${stats.b2b ? ` · dont B2B ${money(stats.b2b)}` : ""}`} />
        <StatCard
          label="Satisfaction à chaud"
          value={stats.satisfaction === undefined ? "—" : `${stats.satisfaction.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/5`}
          icon={Smile}
          hint={`${stats.responses} réponse${stats.responses > 1 ? "s" : ""} sur 12 mois`}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)} options={EVENT_STATUSES} placeholder="Tous les statuts" className="w-[calc(50%-4px)] sm:w-auto sm:min-w-44" />
        <Select aria-label="Mode" value={mode} onChange={(e) => setMode(e.target.value)} options={EVENT_MODES} placeholder="Tous les modes" className="w-[calc(50%-4px)] sm:w-auto sm:min-w-36" />
        <Select aria-label="Région" value={region} onChange={(e) => setRegion(e.target.value)} options={REGIONS} placeholder="Toutes les régions" className="w-[calc(50%-4px)] sm:w-auto sm:min-w-40" />
        <Select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value)} options={EVENT_KINDS} placeholder="Tous les types" className="w-[calc(50%-4px)] sm:w-auto sm:min-w-48" />
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus("");
              setMode("");
              setRegion("");
              setKind("");
            }}
          >
            <X /> Réinitialiser
          </Button>
        ) : null}
        {view === "cartes" ? <span className="text-xs text-muted-foreground sm:ml-auto">Sessions à venir et en cours, par date de début</span> : null}
      </div>

      {view === "cartes" ? <SessionCards events={upcoming} applications={applications} now={now} billed={billed} /> : null}
      {view === "calendrier" ? <SessionCalendar events={filtered} now={now} /> : null}
      {view === "liste" ? <SessionList events={filtered} applications={applications} evaluations={evaluations} billed={billed} /> : null}

      {creating ? <SessionCreateModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
