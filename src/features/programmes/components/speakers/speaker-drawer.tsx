"use client";

import * as React from "react";
import Link from "next/link";
import { GraduationCap, Mail, MapPin, Pencil, Star } from "lucide-react";
import { Avatar, Badge, Button, Drawer, Input, Switch, useToast } from "@/components/ui";
import { SessionLink } from "@/components/shared/entity-links";
import { useCrm } from "@/lib/store";
import { SPEAKER_KINDS, labelOf } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { Speaker } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { useActions, useCollection, useLookup, useNow, useSession } from "@/lib/hooks";
import { Chips, Rating } from "../bits";
import { CONTRACT_TYPES } from "../../lib/labels";
import { average, formatHours, fromDateInput, slotHours, toDateInput, sessionDates } from "../../lib/sessions";
import { SpeakerFields, charterFromLog, parseSpeakerDraft, speakerToDraft, trainingUpToDate, type SpeakerDraft } from "./speaker-form";

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="eyebrow text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SpeakerDrawer({ speaker, onClose }: { speaker: Speaker; onClose: () => void }) {
  const now = useNow();
  const { canEdit, user } = useSession();
  const editable = canEdit("intervenants");
  const { update } = useActions();
  const log = useCrm((s) => s.log);
  const activities = useCrm((s) => s.activities);
  const events = useCollection("events");
  const evaluations = useCollection("evaluations");
  const projects = useCollection("projects");
  const contacts = useLookup("contacts");
  const eventById = useLookup("events");
  const toast = useToast();
  const [draft, setDraft] = React.useState<SpeakerDraft | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const name = `${speaker.firstName} ${speaker.lastName}`;
  const charter = charterFromLog(activities, speaker.id);
  const upToDate = trainingUpToDate(speaker, now);

  const sessions = React.useMemo(() => {
    return events
      .filter((e) => e.status !== "annule" && (e.speakerIds.includes(speaker.id) || e.program.some((p) => p.speakerId === speaker.id)))
      .map((e) => {
        const slots = e.program.filter((p) => p.speakerId === speaker.id);
        return { ev: e, slots: slots.length, hours: slots.reduce((s, p) => s + slotHours(p), 0), past: Date.parse(e.endAt) < now };
      })
      .sort((a, b) => b.ev.startAt.localeCompare(a.ev.startAt));
  }, [events, speaker.id, now]);
  const evals = React.useMemo(() => evaluations.filter((e) => e.kind === "intervenant" && e.speakerId === speaker.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [evaluations, speaker.id]);
  const evalAvg = average(evals.map((e) => e.satisfaction ?? average(Object.values(e.scores ?? {}))));
  const mentored = React.useMemo(() => projects.filter((p) => p.mentorIds.includes(speaker.id)), [projects, speaker.id]);

  const save = () => {
    if (!draft) return;
    const res = parseSpeakerDraft(draft);
    if (!res.ok) {
      setErrors(res.errors);
      return;
    }
    update("speakers", speaker.id, res.data, { log: "Fiche intervenant mise à jour" });
    toast({ title: "Fiche intervenant enregistrée" });
    setDraft(null);
    setErrors({});
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      title={
        <span className="flex items-center gap-3">
          <Avatar name={name} size="lg" color="var(--violet)" />
          <span className="min-w-0">
            <span className="block truncate">{name}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-normal">
              <Badge tone="violet">{labelOf(SPEAKER_KINDS, speaker.kind)}</Badge>
              <Badge>{labelOf(CONTRACT_TYPES, speaker.contractType)}</Badge>
              <Rating value={speaker.rating} className="text-xs" />
            </span>
          </span>
        </span>
      }
      footer={
        editable ? (
          draft ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(null);
                  setErrors({});
                }}
              >
                Annuler
              </Button>
              <Button onClick={save}>Enregistrer</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setDraft(speakerToDraft(speaker))}>
              <Pencil /> Modifier la fiche
            </Button>
          )
        ) : undefined
      }
    >
      {draft ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <SpeakerFields value={draft} onChange={setDraft} errors={errors} idPrefix={`edit-${speaker.id}`} />
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <a href={`mailto:${speaker.email}`} className="inline-flex items-center gap-1.5 text-foreground hover:text-accent-text">
              <Mail className="size-4 text-faint" aria-hidden="true" /> {speaker.email}
            </a>
            {speaker.city ? (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-4 text-faint" aria-hidden="true" /> {speaker.city}
              </span>
            ) : null}
            <span className="text-muted-foreground">TJM : {speaker.dailyRateCents ? `${money(speaker.dailyRateCents)} HT` : "—"}</span>
          </div>

          <Section title="Conformité Qualiopi — critère 5">
            <ul className="divide-y divide-border rounded-md border border-border">
              <li className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    CV au dossier <Badge tone="violet" className="ml-1 px-1.5 py-0 text-[10px]">ind. 21</Badge>
                  </p>
                  <p className={speaker.cvOnFile ? "text-xs text-success-text" : "text-xs text-warning-text"}>{speaker.cvOnFile ? "Présent — qualifications justifiées" : "Manquant : à demander à l'intervenant"}</p>
                </div>
                <Switch
                  checked={speaker.cvOnFile}
                  disabled={!editable}
                  label="CV au dossier"
                  onChange={(v) => {
                    update("speakers", speaker.id, { cvOnFile: v }, { log: v ? "CV ajouté au dossier (ind. 21)" : "CV retiré du dossier", kind: "document" });
                    toast({ title: v ? "CV marqué au dossier" : "CV marqué manquant", tone: v ? "success" : "info" });
                  }}
                />
              </li>
              <li className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Formation continue <Badge tone="violet" className="ml-1 px-1.5 py-0 text-[10px]">ind. 22</Badge>
                  </p>
                  <p className={upToDate ? "text-xs text-success-text" : "text-xs text-warning-text"}>
                    {speaker.lastTrainingAt ? `Dernière formation le ${date(speaker.lastTrainingAt)} — ${upToDate ? "à jour (< 12 mois)" : "à renouveler"}` : "Aucune formation tracée"}
                  </p>
                </div>
                {editable ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={toDateInput(speaker.lastTrainingAt)}
                      aria-label="Date de la dernière formation"
                      onChange={(e) => update("speakers", speaker.id, { lastTrainingAt: fromDateInput(e.target.value, 12) }, { log: `Formation continue : ${e.target.value || "effacée"} (ind. 22)`, kind: "document" })}
                      className="h-8 w-40"
                    />
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => {
                        update("speakers", speaker.id, { lastTrainingAt: new Date().toISOString() }, { log: "Formation continue suivie aujourd'hui (ind. 22)", kind: "document" });
                        toast({ title: "Formation continue enregistrée", description: "Conformité indicateur 22 à jour pour 12 mois." });
                      }}
                    >
                      <GraduationCap /> Aujourd'hui
                    </Button>
                  </div>
                ) : null}
              </li>
              <li className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">Charte intervenant signée</p>
                  <p className={charter.signed ? "text-xs text-success-text" : "text-xs text-muted-foreground"}>
                    {charter.signed && charter.at ? `Signée le ${date(charter.at)}` : "Engagements qualité, confidentialité, accessibilité"}
                  </p>
                </div>
                <Switch
                  checked={charter.signed}
                  disabled={!editable}
                  label="Charte intervenant signée"
                  onChange={(v) => {
                    log({ kind: "document", entity: "speakers", entityId: speaker.id, actorId: user?.id, summary: v ? "Charte intervenant signée" : "Charte intervenant marquée non signée", meta: { field: "charter", value: v } });
                    toast({ title: v ? "Charte signée" : "Charte marquée non signée", tone: v ? "success" : "info" });
                  }}
                />
              </li>
            </ul>
          </Section>

          {speaker.bio ? (
            <Section title="Bio">
              <p className="text-sm leading-relaxed text-foreground">{speaker.bio}</p>
            </Section>
          ) : null}

          <Section title="Expertises">
            <Chips items={speaker.expertise} max={12} />
          </Section>

          <Section title="Qualifications">
            {speaker.qualifications.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-foreground marker:text-faint">
                {speaker.qualifications.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-faint">Non renseignées</p>
            )}
          </Section>

          <Section title={`Sessions animées (${sessions.length})`}>
            {sessions.length ? (
              <ul className="divide-y divide-border rounded-md border border-border">
                {sessions.slice(0, 12).map(({ ev, slots, hours, past }) => (
                  <li key={ev.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <SessionLink id={ev.id} className="min-w-0 flex-1 truncate" />
                    <span className="hidden text-xs text-muted-foreground sm:inline">{sessionDates(ev)}</span>
                    <span className="tabular shrink-0 text-xs text-muted-foreground">{slots ? `${slots} créneau${slots > 1 ? "x" : ""} · ${formatHours(hours)}` : "Jury / mentorat"}</span>
                    <Badge tone={past ? "neutral" : "accent"} className="shrink-0">
                      {past ? "Passée" : "À venir"}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-faint">Aucune session.</p>
            )}
          </Section>

          <Section
            title={`Évaluations reçues (${evals.length})`}
            action={
              evalAvg !== undefined ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="size-3.5 fill-warning text-warning" aria-hidden="true" /> {evalAvg.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/5 en moyenne
                </span>
              ) : null
            }
          >
            {evals.length ? (
              <ul className="space-y-2">
                {evals.slice(0, 8).map((e) => (
                  <li key={e.id} className="rounded-md bg-surface-2/60 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <Rating value={e.satisfaction ?? average(Object.values(e.scores ?? {}))} className="text-xs" />
                      <span className="font-mono">{eventById.get(e.eventId)?.code}</span>
                      <span>{date(e.submittedAt)}</span>
                      {e.contactId ? <span>{contactName(contacts.get(e.contactId))}</span> : null}
                    </div>
                    {e.comment ? <p className="mt-1 text-sm text-foreground">« {e.comment} »</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-faint">Aucune évaluation « intervenant » pour l'instant.</p>
            )}
          </Section>

          {mentored.length ? (
            <Section title={`Projets mentorés (${mentored.length})`}>
              <div className="flex flex-wrap gap-1.5">
                {mentored.map((p) => (
                  <Link key={p.id} href={`/projets/${p.id}`} className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:border-border-strong hover:bg-surface-2">
                    {p.name}
                  </Link>
                ))}
              </div>
            </Section>
          ) : null}

        </div>
      )}
    </Drawer>
  );
}
