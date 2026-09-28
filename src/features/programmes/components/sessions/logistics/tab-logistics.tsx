"use client";

import * as React from "react";
import { BookOpen, CalendarCheck2, MapPin, PlaneLanding, Receipt } from "lucide-react";
import { Segmented } from "@/components/ui";
import type { EventSession } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { useCollection, useNow } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { isEventTask, logisticsCompleteness, summarizeExpenses, taskProgress } from "../../../lib/logistics";
import { replaceQuery } from "../../../lib/url";
import { AiSourcingDrawer } from "../../venues/ai-sourcing";
import { ExpensesSection, type ExpensePreset } from "./expenses-section";
import { InfoSection } from "./info-section";
import { OutingsSection } from "./outings-section";
import { PlanSection } from "./plan-section";
import { SpeakersSection } from "./speakers-section";
import { StaysSection, useStayRows } from "./stays-section";
import { VenueSection } from "./venue-section";

const SECTIONS = ["lieu", "devis", "activites", "intervenants", "sejours", "infos", "retroplanning"] as const;
export type LogisticsSection = (typeof SECTIONS)[number];
export const isLogisticsSection = (v: string | undefined): v is LogisticsSection => Boolean(v) && (SECTIONS as readonly string[]).includes(v!);

export function LogisticsTab({ ev, canEdit, initialSection }: { ev: EventSession; canEdit: boolean; initialSection?: string }) {
  const [section, setSection] = React.useState<LogisticsSection>(isLogisticsSection(initialSection) ? initialSection : "lieu");
  const [preset, setPreset] = React.useState<ExpensePreset | undefined>();
  const [ai, setAi] = React.useState(false);
  const now = useNow();

  const venues = useCollection("venues");
  const options = useCollection("venueOptions");
  const expenses = useCollection("expenses");
  const tasks = useCollection("tasks");
  const stayRows = useStayRows(ev);

  const venue = ev.venueId ? venues.find((v) => v.id === ev.venueId) : undefined;
  const openOptions = options.filter((o) => o.eventId === ev.id && o.stage !== "ecarte" && o.stage !== "retenu").length;
  const money$ = React.useMemo(() => summarizeExpenses(expenses.filter((e) => e.eventId === ev.id), now), [expenses, ev.id, now]);
  const plan = React.useMemo(() => taskProgress(tasks.filter((t) => isEventTask(t, ev.id)), now), [tasks, ev.id, now]);
  const arrivals = stayRows.filter((r) => r.stay?.arrivalAt).length;
  const info = logisticsCompleteness(ev.logistics);

  const go = (s: LogisticsSection) => {
    setSection(s);
    replaceQuery({ rubrique: s === "lieu" ? null : s });
  };
  const budget = React.useCallback((p: ExpensePreset) => {
    setPreset(p);
    setSection("devis");
    replaceQuery({ rubrique: "devis" });
  }, []);
  const consumed = React.useCallback(() => setPreset(undefined), []);

  const tiles: { key: LogisticsSection; label: string; value: string; hint: string; icon: React.ComponentType<{ className?: string }>; alert?: boolean }[] = [
    { key: "lieu", label: "Lieu", value: venue ? venue.name : openOptions ? `${openOptions} piste${openOptions > 1 ? "s" : ""}` : "À trouver", hint: venue ? venue.city : "Aucun lieu retenu", icon: MapPin, alert: !venue },
    {
      key: "devis",
      label: "Reste à payer",
      value: money(money$.remaining),
      hint: money$.overdueCount ? `${money$.overdueCount} échéance${money$.overdueCount > 1 ? "s" : ""} en retard` : money$.next ? `Prochaine : ${date(money$.next.installment.dueAt, "d MMM")}` : `Engagé ${money(money$.committed)}`,
      icon: Receipt,
      alert: money$.overdueCount > 0,
    },
    { key: "sejours", label: "Arrivées", value: `${arrivals}/${stayRows.length}`, hint: "renseignées", icon: PlaneLanding, alert: stayRows.length > 0 && arrivals < stayRows.length },
    { key: "infos", label: "Livret d'accueil", value: `${info.done}/${info.total}`, hint: info.missing.length ? "rubriques à compléter" : "complet", icon: BookOpen, alert: info.missing.length > 0 },
    { key: "retroplanning", label: "Rétroplanning", value: plan.total ? `${plan.done}/${plan.total}` : "—", hint: plan.overdue ? `${plan.overdue} en retard` : plan.total ? "tâches faites" : "à générer", icon: CalendarCheck2, alert: plan.overdue > 0 },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => go(t.key)}
            className={cn(
              "flex min-w-0 items-start gap-2.5 rounded-lg border bg-surface p-3 text-left transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              section === t.key ? "border-ring/60" : "border-border",
            )}
          >
            <t.icon className={cn("mt-0.5 size-4 shrink-0", t.alert ? "text-warning" : "text-faint")} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">{t.label}</span>
              <span className="block truncate text-sm font-semibold text-foreground">{t.value}</span>
              <span className={cn("block truncate text-xs", t.alert ? "text-warning-text" : "text-faint")}>{t.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Segmented
          value={section}
          onChange={go}
          options={[
            { value: "lieu", label: "Lieu & sourcing" },
            { value: "devis", label: "Devis & paiements" },
            { value: "activites", label: "Activités" },
            { value: "intervenants", label: "Intervenants" },
            { value: "sejours", label: "Chambres & arrivées" },
            { value: "infos", label: "Infos pratiques" },
            { value: "retroplanning", label: "Rétroplanning" },
          ]}
        />
      </div>

      {section === "lieu" ? <VenueSection ev={ev} canEdit={canEdit} onOpenAi={() => setAi(true)} /> : null}
      {section === "devis" ? <ExpensesSection ev={ev} canEdit={canEdit} preset={preset} onPresetConsumed={consumed} /> : null}
      {section === "activites" ? <OutingsSection ev={ev} canEdit={canEdit} onBudget={budget} /> : null}
      {section === "intervenants" ? <SpeakersSection ev={ev} canEdit={canEdit} onBudget={budget} /> : null}
      {section === "sejours" ? <StaysSection ev={ev} canEdit={canEdit} bedrooms={venue?.bedrooms} /> : null}
      {section === "infos" ? <InfoSection ev={ev} venue={venue} canEdit={canEdit} /> : null}
      {section === "retroplanning" ? <PlanSection ev={ev} canEdit={canEdit} /> : null}

      <AiSourcingDrawer open={ai} onClose={() => setAi(false)} ev={ev} />
    </div>
  );
}
