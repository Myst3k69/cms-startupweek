"use client";

import * as React from "react";
import { Columns3, FilePlus2, Gauge, Hourglass, List, Search, Timer, TrendingUp, UserCheck, X } from "lucide-react";
import { Button, Input, LinkButton, PageHeader, Segmented, Select, StatCard } from "@/components/ui";
import { FUNDING_SOURCES, PERSONAS } from "@/lib/domain/constants";
import { ACTIVE_PIPELINE, contactName, isRunning, isUpcoming } from "@/lib/domain/selectors";
import type { Application } from "@/lib/domain/types";
import { date, money, percent } from "@/lib/format";
import { useCollection, useLookup, useNow, useSession } from "@/lib/hooks";
import { DAY, hasApplications } from "../../lib/sessions";
import { replaceQuery } from "../../lib/url";
import { ApplicationBoard, type BoardSort } from "./application-board";
import { ApplicationList } from "./application-list";
import { useApplicationMover } from "./use-mover";

type View = "kanban" | "liste";

export interface ApplicationsPageProps {
  initialView?: string;
  initialSession?: string;
  initialPersona?: string;
  initialFunding?: string;
  initialReviewer?: string;
}

export function ApplicationsPage({ initialView, initialSession, initialPersona, initialFunding, initialReviewer }: ApplicationsPageProps) {
  const now = useNow();
  const { canEdit, user } = useSession();
  const editable = canEdit("candidatures");
  const applications = useCollection("applications");
  const eventsList = useCollection("events");
  const usersList = useCollection("users");
  const invoices = useCollection("invoices");
  const payments = useCollection("payments");
  const contacts = useLookup("contacts");
  const events = useLookup("events");
  const users = useLookup("users");
  const { request, modals } = useApplicationMover();

  const [view, setView] = React.useState<View>(initialView === "liste" ? "liste" : "kanban");
  const [session, setSession] = React.useState(initialSession === "toutes" ? "" : (initialSession ?? "a_venir"));
  const [persona, setPersona] = React.useState(initialPersona ?? "");
  const [funding, setFunding] = React.useState(initialFunding ?? "");
  const [reviewer, setReviewer] = React.useState(initialReviewer ?? "");
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<BoardSort>("recent");

  const upcomingEvents = React.useMemo(
    () => eventsList.filter((e) => hasApplications(e) && (isUpcoming(e, now) || isRunning(e, now))).sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [eventsList, now],
  );
  const upcomingIds = React.useMemo(() => new Set(upcomingEvents.map((e) => e.id)), [upcomingEvents]);

  const sessionOptions = React.useMemo(() => {
    const opts = [
      { value: "a_venir", label: `Sessions à venir (${upcomingEvents.length})` },
      ...upcomingEvents.map((e) => ({ value: e.id, label: `${e.code} · ${e.city} · ${date(e.startAt, "d MMM")}` })),
    ];
    const extra = session && session !== "a_venir" && !upcomingIds.has(session) ? events.get(session) : undefined;
    if (extra) opts.push({ value: extra.id, label: `${extra.code} · ${extra.city} (passée)` });
    return opts;
  }, [upcomingEvents, upcomingIds, session, events]);

  const reviewerOptions = React.useMemo(
    () => [
      ...(user ? [{ value: "me", label: "Moi" }] : []),
      { value: "none", label: "Non assigné" },
      ...usersList.filter((u) => u.active && u.role !== "lecture").map((u) => ({ value: u.id, label: u.name })),
    ],
    [usersList, user],
  );

  const fullEvents = React.useMemo(() => {
    const counts = new Map<string, number>();
    applications.forEach((a) => {
      if (a.status === "inscrite") counts.set(a.eventId, (counts.get(a.eventId) ?? 0) + 1);
    });
    return new Set(eventsList.filter((e) => (counts.get(e.id) ?? 0) >= e.capacity).map((e) => e.id));
  }, [applications, eventsList]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return applications.filter((a) => {
      if (session === "a_venir" ? !upcomingIds.has(a.eventId) : session && a.eventId !== session) return false;
      if (persona && a.persona !== persona) return false;
      if (funding && a.funding !== funding) return false;
      if (reviewer === "me" ? a.reviewerId !== user?.id : reviewer === "none" ? Boolean(a.reviewerId) : reviewer && a.reviewerId !== reviewer) return false;
      if (needle) {
        const c = contacts.get(a.contactId);
        const hay = `#${a.number} ${contactName(c)} ${c?.email ?? ""} ${events.get(a.eventId)?.code ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [applications, session, upcomingIds, persona, funding, reviewer, user, q, contacts, events]);

  const stats = React.useMemo(() => {
    const newLast7 = filtered.filter((a) => Date.parse(a.submittedAt) >= now - 7 * DAY).length;
    const newPrev7 = filtered.filter((a) => {
      const t = Date.parse(a.submittedAt);
      return t >= now - 14 * DAY && t < now - 7 * DAY;
    }).length;
    const inProgress = filtered.filter((a) => ACTIVE_PIPELINE.includes(a.status)).length;
    const waitingNew = filtered.filter((a) => a.status === "nouvelle").length;
    const accepted = filtered.filter((a) => a.status === "acceptee" || a.status === "inscrite" || (a.status === "desistee" && a.decisionAt)).length;
    const rejected = filtered.filter((a) => a.status === "refusee" || a.status === "hors_cible").length;
    const decided = accepted + rejected;

    // Inscriptions payées ce mois : premier paiement reçu sur une facture de la candidature.
    const d = new Date(now);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const invByApp = new Map<string, string[]>();
    invoices.forEach((i) => {
      if (i.applicationId && i.status !== "annulee") invByApp.set(i.applicationId, [...(invByApp.get(i.applicationId) ?? []), i.id]);
    });
    const payByInv = new Map<string, { at: number; amount: number }[]>();
    payments.forEach((p) => {
      if (p.status === "reussi") payByInv.set(p.invoiceId, [...(payByInv.get(p.invoiceId) ?? []), { at: Date.parse(p.receivedAt), amount: p.amountCents }]);
    });
    let paidThisMonth = 0;
    let cashThisMonth = 0;
    filtered.forEach((a) => {
      const pays = (invByApp.get(a.id) ?? []).flatMap((id) => payByInv.get(id) ?? []);
      pays.forEach((p) => {
        if (p.at >= monthStart) cashThisMonth += p.amount;
      });
      if (a.status !== "inscrite" || !pays.length) return;
      const first = Math.min(...pays.map((p) => p.at));
      if (first >= monthStart) paidThisMonth += 1;
    });

    const decisions = filtered.filter((a) => a.decisionAt && Date.parse(a.decisionAt) >= now - 90 * DAY);
    const avgDelay = decisions.length ? decisions.reduce((s, a) => s + (Date.parse(a.decisionAt!) - Date.parse(a.submittedAt)), 0) / decisions.length / DAY : undefined;

    return { newLast7, newPrev7, inProgress, waitingNew, accepted, decided, rate: decided ? (accepted / decided) * 100 : undefined, paidThisMonth, cashThisMonth, avgDelay, decisionsCount: decisions.length };
  }, [filtered, now, invoices, payments]);

  const activeFilters = Boolean(persona || funding || reviewer || q || session !== "a_venir");
  const resetFilters = () => {
    setPersona("");
    setFunding("");
    setReviewer("");
    setQ("");
    setSession("a_venir");
    replaceQuery({ session: null, persona: null, financement: null, assigne: null });
  };

  const onMove = React.useCallback((app: Application, to: Parameters<typeof request>[1]) => request(app, to), [request]);

  const deltaNew = stats.newPrev7 ? Math.round(((stats.newLast7 - stats.newPrev7) / stats.newPrev7) * 100) : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Programmes"
        title="Candidatures"
        description="Pipeline d'admission des StartupWeek, de la candidature du site à l'inscription payée. Chaque changement de statut déclenche factures d'acompte et de solde, emails et tâches."
        actions={
          <>
            <Segmented<View>
              value={view}
              onChange={(v) => {
                setView(v);
                replaceQuery({ vue: v === "kanban" ? null : v });
              }}
              options={[
                {
                  value: "kanban",
                  label: (
                    <>
                      <Columns3 className="size-3.5" aria-hidden="true" /> Kanban
                    </>
                  ),
                },
                {
                  value: "liste",
                  label: (
                    <>
                      <List className="size-3.5" aria-hidden="true" /> Liste
                    </>
                  ),
                },
              ]}
            />
            <LinkButton href="/demandes" variant="secondary" size="sm">
              <FilePlus2 /> Demandes du site
            </LinkButton>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Nouvelles (7 j)"
          value={stats.newLast7}
          icon={TrendingUp}
          delta={deltaNew}
          deltaLabel="vs 7 j préc."
          hint={deltaNew === undefined ? `${stats.newPrev7} les 7 jours précédents` : undefined}
        />
        <StatCard label="En cours" value={stats.inProgress} icon={Hourglass} hint={`dont ${stats.waitingNew} à qualifier`} />
        <StatCard
          label="Taux d'acceptation"
          value={stats.rate === undefined ? "—" : percent(stats.rate)}
          icon={Gauge}
          hint={stats.decided ? `${stats.accepted} acceptées sur ${stats.decided} décisions` : "Aucune décision"}
        />
        <StatCard label="Inscrites payées ce mois" value={stats.paidThisMonth} icon={UserCheck} hint={`${money(stats.cashThisMonth)} encaissés ce mois`} />
        <StatCard
          label="Délai moyen de décision"
          value={stats.avgDelay === undefined ? "—" : `${stats.avgDelay.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} j`}
          icon={Timer}
          hint={stats.decisionsCount ? `${stats.decisionsCount} décisions sur 90 j` : "Aucune décision sur 90 j"}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, email, #numéro…" aria-label="Rechercher une candidature" className="pl-8" />
        </div>
        <Select
          aria-label="Session"
          value={session}
          onChange={(e) => {
            setSession(e.target.value);
            replaceQuery({ session: e.target.value === "a_venir" ? null : e.target.value || "toutes" });
          }}
          options={sessionOptions}
          placeholder="Toutes les sessions"
          className="w-full sm:w-auto sm:min-w-56"
        />
        <Select
          aria-label="Persona"
          value={persona}
          onChange={(e) => {
            setPersona(e.target.value);
            replaceQuery({ persona: e.target.value });
          }}
          options={PERSONAS.map((p) => ({ value: p.value, label: p.label }))}
          placeholder="Tous les profils"
          className="w-[calc(50%-4px)] sm:w-auto sm:min-w-40"
        />
        <Select
          aria-label="Financement"
          value={funding}
          onChange={(e) => {
            setFunding(e.target.value);
            replaceQuery({ financement: e.target.value });
          }}
          options={FUNDING_SOURCES.map((f) => ({ value: f.value, label: f.label }))}
          placeholder="Tous financements"
          className="w-[calc(50%-4px)] sm:w-auto sm:min-w-40"
        />
        <Select
          aria-label="Assigné à"
          value={reviewer}
          onChange={(e) => {
            setReviewer(e.target.value);
            replaceQuery({ assigne: e.target.value });
          }}
          options={reviewerOptions}
          placeholder="Tous les référents"
          className="w-[calc(50%-4px)] sm:w-auto sm:min-w-40"
        />
        {activeFilters ? (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X /> Réinitialiser
          </Button>
        ) : null}
        {view === "kanban" ? (
          <Segmented<BoardSort>
            className="sm:ml-auto"
            size="xs"
            value={sort}
            onChange={setSort}
            options={[
              { value: "recent", label: "Récentes" },
              { value: "ancien", label: "Anciennes" },
              { value: "score", label: "Score" },
            ]}
          />
        ) : null}
      </div>

      {view === "kanban" ? (
        <>
          <ApplicationBoard apps={filtered} contacts={contacts} events={events} fullEvents={fullEvents} now={now} canEdit={editable} sort={sort} onMove={onMove} />
          {editable ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Glissez une carte d'une colonne à l'autre (ou utilisez l'icône ⇄ au clavier / sur mobile). « Acceptée » crée la facture d'acompte et envoie l'email ; « Inscrite » crée la facture de solde, sauf si la session est complète.
            </p>
          ) : null}
        </>
      ) : (
        <ApplicationList rows={filtered} contacts={contacts} events={events} users={users} now={now} canEdit={editable} onMove={onMove} />
      )}
      {modals}
    </div>
  );
}
