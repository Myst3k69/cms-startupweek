"use client";

import * as React from "react";
import { FileCheck2, GraduationCap, LayoutGrid, List, MapPin, Mic2, Search, Star, UserPlus, X } from "lucide-react";
import { Avatar, Badge, Button, Card, DataTable, EmptyState, Input, Modal, PageHeader, Segmented, Select, StatCard, useToast, type Column } from "@/components/ui";
import { useCrm } from "@/lib/store";
import { SPEAKER_KINDS, labelOf } from "@/lib/domain/constants";
import type { Speaker } from "@/lib/domain/types";
import { money } from "@/lib/format";
import { useActions, useCollection, useNow, useSession } from "@/lib/hooks";
import { pct } from "@/lib/utils";
import { Chips, ComplianceBadge, Rating } from "../bits";
import { CONTRACT_TYPES } from "../../lib/labels";
import { average } from "../../lib/sessions";
import { replaceQuery } from "../../lib/url";
import { SpeakerDrawer } from "./speaker-drawer";
import { SpeakerFields, emptySpeakerDraft, parseSpeakerDraft, trainingUpToDate, useCharterMap, YEAR, type SpeakerDraft } from "./speaker-form";

type View = "cartes" | "tableau";

interface Row {
  s: Speaker;
  name: string;
  past: number;
  upcoming: number;
  lastSessionAt?: number;
  cv: boolean;
  training: boolean;
  charter: boolean;
}

function CreateSpeakerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: Speaker) => void }) {
  const { create } = useActions();
  const toast = useToast();
  const speakers = useCollection("speakers");
  const [draft, setDraft] = React.useState<SpeakerDraft>(emptySpeakerDraft);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const submit = () => {
    const res = parseSpeakerDraft(draft);
    if (!res.ok) {
      setErrors(res.errors);
      return;
    }
    if (speakers.some((s) => s.email.toLowerCase() === res.data.email)) {
      setErrors({ email: "Un intervenant utilise déjà cet email" });
      return;
    }
    const s = create("speakers", res.data, { log: "Intervenant ajouté à l'annuaire" });
    toast({
      title: `${s.firstName} ${s.lastName} ajouté·e`,
      description: !s.cvOnFile || !s.lastTrainingAt ? "Pensez à collecter le CV et la dernière formation suivie (indicateurs 21 et 22)." : "Dossier de conformité complet.",
      tone: !s.cvOnFile || !s.lastTrainingAt ? "info" : "success",
    });
    onCreated(s);
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Nouvel intervenant"
      description="Formateur, mentor, coach, expert ou membre du jury."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit}>
            <UserPlus /> Ajouter
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <SpeakerFields value={draft} onChange={setDraft} errors={errors} idPrefix="new-spk" />
      </form>
    </Modal>
  );
}

function SpeakerCard({ row, onOpen }: { row: Row; onOpen: () => void }) {
  const { s } = row;
  return (
    <Card interactive className="relative flex h-full flex-col p-4">
      <div className="flex items-start gap-3">
        <Avatar name={row.name} size="lg" color="var(--violet)" />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpen}
            className="block max-w-full truncate text-left text-sm font-semibold text-foreground after:absolute after:inset-0 after:rounded-lg after:content-[''] hover:text-accent-text focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {row.name}
          </button>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{labelOf(SPEAKER_KINDS, s.kind)}</span>
            <span aria-hidden="true">·</span>
            <span>{labelOf(CONTRACT_TYPES, s.contractType)}</span>
            {s.city ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="size-3" aria-hidden="true" />
                {s.city}
              </span>
            ) : null}
          </div>
        </div>
        <Rating value={s.rating} />
      </div>
      <Chips items={s.expertise} max={4} className="mt-3" />
      <div className="mt-3 flex flex-wrap gap-1.5">
        <ComplianceBadge ok={row.cv} label="CV" okLabel="au dossier" koLabel="manquant" title="Indicateur 21" />
        <ComplianceBadge ok={row.training} label="Formation" okLabel="< 12 mois" koLabel="à renouveler" title="Indicateur 22" />
        <ComplianceBadge ok={row.charter} label="Charte" okLabel="signée" koLabel="à signer" />
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="tabular">
          {row.past} session{row.past > 1 ? "s" : ""} animée{row.past > 1 ? "s" : ""} · {row.upcoming} à venir
        </span>
        <span className="tabular">{s.dailyRateCents ? `${money(s.dailyRateCents)}/j` : labelOf(CONTRACT_TYPES, s.contractType)}</span>
      </div>
    </Card>
  );
}

export function SpeakersPage({ initialView, initialId }: { initialView?: string; initialId?: string }) {
  const now = useNow();
  const { canEdit } = useSession();
  const editable = canEdit("intervenants");
  const speakers = useCollection("speakers");
  const events = useCollection("events");
  const evaluations = useCollection("evaluations");
  const activities = useCrm((s) => s.activities);
  const charters = useCharterMap(activities);

  const [view, setView] = React.useState<View>(initialView === "tableau" ? "tableau" : "cartes");
  const [openId, setOpenId] = React.useState<string | undefined>(initialId);
  const [creating, setCreating] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [kind, setKind] = React.useState("");
  const [contract, setContract] = React.useState("");
  const [compliance, setCompliance] = React.useState("");

  const rows = React.useMemo<Row[]>(
    () =>
      speakers.map((s) => {
        const mine = events.filter((e) => e.status !== "annule" && (e.speakerIds.includes(s.id) || e.program.some((p) => p.speakerId === s.id)));
        const past = mine.filter((e) => Date.parse(e.endAt) < now);
        return {
          s,
          name: `${s.firstName} ${s.lastName}`,
          past: past.length,
          upcoming: mine.length - past.length,
          lastSessionAt: mine.length ? Math.max(...mine.map((e) => Date.parse(e.startAt))) : undefined,
          cv: s.cvOnFile,
          training: trainingUpToDate(s, now),
          charter: charters.get(s.id)?.signed ?? false,
        };
      }),
    [speakers, events, now, charters],
  );

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (kind && r.s.kind !== kind) return false;
        if (contract && r.s.contractType !== contract) return false;
        if (compliance === "ok" && !(r.cv && r.training)) return false;
        if (compliance === "ko" && r.cv && r.training) return false;
        if (needle && !`${r.name} ${r.s.email} ${r.s.expertise.join(" ")} ${r.s.city ?? ""}`.toLowerCase().includes(needle)) return false;
        return true;
      })
      .sort((a, b) => a.s.lastName.localeCompare(b.s.lastName, "fr"));
  }, [rows, q, kind, contract, compliance]);

  const stats = React.useMemo(() => {
    const active = rows.filter((r) => r.upcoming > 0 || (r.lastSessionAt !== undefined && r.lastSessionAt >= now - YEAR)).length;
    const cv = rows.filter((r) => r.cv).length;
    const training = rows.filter((r) => r.training).length;
    const speakerEvals = evaluations.filter((e) => e.kind === "intervenant");
    return {
      active,
      cv,
      training,
      cvPct: pct(cv, rows.length),
      trainingPct: pct(training, rows.length),
      rating: average(rows.map((r) => r.s.rating)),
      evals: speakerEvals.length,
    };
  }, [rows, evaluations, now]);

  const columns = React.useMemo<Column<Row>[]>(
    () => [
      {
        key: "name",
        header: "Intervenant",
        render: (r) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={r.name} size="sm" color="var(--violet)" />
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground">{r.name}</div>
              <div className="truncate text-xs text-muted-foreground">{r.s.city ?? r.s.email}</div>
            </div>
          </div>
        ),
        sort: (r) => r.s.lastName,
        csv: (r) => r.name,
      },
      { key: "kind", header: "Rôle", render: (r) => <Badge tone="violet">{labelOf(SPEAKER_KINDS, r.s.kind)}</Badge>, sort: (r) => r.s.kind, csv: (r) => labelOf(SPEAKER_KINDS, r.s.kind) },
      { key: "expertise", header: "Expertises", render: (r) => <Chips items={r.s.expertise} max={3} />, csv: (r) => r.s.expertise.join(", "), hideBelow: "lg" },
      { key: "rating", header: "Note", render: (r) => <Rating value={r.s.rating} />, sort: (r) => r.s.rating ?? 0, csv: (r) => r.s.rating ?? "", align: "center" },
      { key: "rate", header: "TJM HT", render: (r) => (r.s.dailyRateCents ? money(r.s.dailyRateCents) : <span className="text-faint">—</span>), sort: (r) => r.s.dailyRateCents ?? 0, csv: (r) => (r.s.dailyRateCents ?? 0) / 100, align: "right", hideBelow: "md" },
      { key: "contract", header: "Contrat", render: (r) => <span className="text-xs text-muted-foreground">{labelOf(CONTRACT_TYPES, r.s.contractType)}</span>, sort: (r) => r.s.contractType, hideBelow: "xl" },
      { key: "sessions", header: "Sessions", render: (r) => <span className="tabular text-xs">{r.past} <span className="text-muted-foreground">+ {r.upcoming} à venir</span></span>, sort: (r) => r.past + r.upcoming, csv: (r) => r.past + r.upcoming, hideBelow: "md" },
      {
        key: "compliance",
        header: "Conformité",
        render: (r) => (
          <div className="flex flex-wrap gap-1">
            <ComplianceBadge ok={r.cv} label="CV" okLabel="✓" koLabel="manquant" title="CV au dossier — indicateur 21" />
            <ComplianceBadge ok={r.training} label="Formation" okLabel="✓" koLabel="à renouveler" title="Formation continue < 12 mois — indicateur 22" />
            <ComplianceBadge ok={r.charter} label="Charte" okLabel="✓" koLabel="à signer" />
          </div>
        ),
        sort: (r) => Number(r.cv) + Number(r.training) + Number(r.charter),
        csv: (r) => `CV:${r.cv ? "oui" : "non"} Formation:${r.training ? "oui" : "non"} Charte:${r.charter ? "oui" : "non"}`,
      },
    ],
    [],
  );

  const open = openId ? speakers.find((s) => s.id === openId) : undefined;
  const openDrawer = (id: string | undefined) => {
    setOpenId(id);
    replaceQuery({ id });
  };
  const hasFilters = Boolean(q || kind || contract || compliance);

  return (
    <div>
      <PageHeader
        eyebrow="Programmes"
        title="Intervenants"
        description="Annuaire des formateurs, mentors, coachs, experts et jury — preuves du critère 5 Qualiopi : CV au dossier (ind. 21) et formation continue de moins de 12 mois (ind. 22)."
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
                { value: "tableau", label: <><List className="size-3.5" aria-hidden="true" /> Tableau</> },
              ]}
            />
            {editable ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                <UserPlus /> Nouvel intervenant
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Intervenants actifs" value={stats.active} icon={Mic2} hint={`sur ${rows.length} dans l'annuaire (12 mois)`} />
        <StatCard label="Conformité CV" value={`${stats.cvPct} %`} icon={FileCheck2} hint={rows.length - stats.cv ? `${rows.length - stats.cv} CV manquant${rows.length - stats.cv > 1 ? "s" : ""} (ind. 21)` : "Tous les CV au dossier"} />
        <StatCard label="Formation continue à jour" value={`${stats.trainingPct} %`} icon={GraduationCap} hint={rows.length - stats.training ? `${rows.length - stats.training} à renouveler (ind. 22)` : "Tous à jour (< 12 mois)"} />
        <StatCard label="Note moyenne" value={stats.rating === undefined ? "—" : `${stats.rating.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/5`} icon={Star} hint={`${stats.evals} évaluation${stats.evals > 1 ? "s" : ""} « intervenant »`} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, expertise, ville…" aria-label="Rechercher un intervenant" className="pl-8" />
        </div>
        <Select aria-label="Rôle" value={kind} onChange={(e) => setKind(e.target.value)} options={SPEAKER_KINDS} placeholder="Tous les rôles" className="w-[calc(50%-4px)] sm:w-auto sm:min-w-36" />
        <Select aria-label="Contrat" value={contract} onChange={(e) => setContract(e.target.value)} options={CONTRACT_TYPES} placeholder="Tous contrats" className="w-[calc(50%-4px)] sm:w-auto sm:min-w-36" />
        <Select
          aria-label="Conformité"
          value={compliance}
          onChange={(e) => setCompliance(e.target.value)}
          options={[
            { value: "ok", label: "Conformes (CV + formation)" },
            { value: "ko", label: "À régulariser" },
          ]}
          placeholder="Toute conformité"
          className="w-full sm:w-auto sm:min-w-48"
        />
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setKind("");
              setContract("");
              setCompliance("");
            }}
          >
            <X /> Réinitialiser
          </Button>
        ) : null}
      </div>

      {view === "cartes" ? (
        filtered.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((r) => (
              <SpeakerCard key={r.s.id} row={r} onOpen={() => openDrawer(r.s.id)} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Mic2} title="Aucun intervenant" description="Aucun intervenant ne correspond à ces filtres." />
        )
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.s.id}
          exportName="intervenants"
          initialSort={{ key: "name", dir: "asc" }}
          onRowClick={(r) => openDrawer(r.s.id)}
          emptyTitle="Aucun intervenant"
        />
      )}

      {open ? <SpeakerDrawer key={open.id} speaker={open} onClose={() => openDrawer(undefined)} /> : null}
      {creating ? (
        <CreateSpeakerModal
          onClose={() => setCreating(false)}
          onCreated={(s) => {
            setCreating(false);
            openDrawer(s.id);
          }}
        />
      ) : null}
    </div>
  );
}
