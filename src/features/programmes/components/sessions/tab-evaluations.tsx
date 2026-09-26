"use client";

import * as React from "react";
import { MessageSquareQuote, Send, Smile, Target, ThumbsUp, Users } from "lucide-react";
import { BarList, ColumnChart, seriesColor } from "@/components/charts";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, StatCard, useToast } from "@/components/ui";
import { sendEmail } from "@/lib/domain/actions";
import { EVALUATION_KINDS, labelOf } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { EventSession } from "@/lib/domain/types";
import { date } from "@/lib/format";
import { useLookup, useNow } from "@/lib/hooks";
import { pct } from "@/lib/utils";
import { Rating } from "../bits";
import { templateMatching } from "../../lib/applications";
import { average, evalScore10, npsOf } from "../../lib/sessions";
import type { SessionData } from "./use-session-data";

const fmt1 = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

export function EvaluationsTab({ ev, data, canEdit }: { ev: EventSession; data: SessionData; canEdit: boolean }) {
  const contacts = useLookup("contacts");
  const speakers = useLookup("speakers");
  const now = useNow();
  const toast = useToast();
  const [showAll, setShowAll] = React.useState(false);

  const view = React.useMemo(() => {
    const hot = data.evals.filter((e) => e.kind === "a_chaud");
    const cold = data.evals.filter((e) => e.kind === "a_froid");
    const respondents = new Set(hot.map((e) => e.contactId).filter(Boolean));
    const enrolledIds = new Set(data.enrolled.map((a) => a.contactId));
    const answered = [...respondents].filter((id) => id && enrolledIds.has(id)).length;

    const progression = data.enrolled
      .map((a) => {
        const c = contacts.get(a.contactId);
        const posEval = data.evals.find((e) => e.kind === "positionnement" && e.contactId === a.contactId);
        const acqEval = data.evals.find((e) => e.kind === "acquis" && e.contactId === a.contactId);
        const pos = typeof a.positioningScore === "number" ? a.positioningScore : posEval ? evalScore10(posEval) : undefined;
        const acq = acqEval ? evalScore10(acqEval) : undefined;
        return { label: c?.firstName ?? `#${a.number}`, pos, acq };
      })
      .filter((r) => r.pos !== undefined || r.acq !== undefined);
    const both = progression.filter((r) => r.pos !== undefined && r.acq !== undefined);
    const gain = average(both.map((r) => r.acq! - r.pos!));

    const keys = new Map<string, number[]>();
    hot.forEach((e) =>
      Object.entries(e.scores ?? {}).forEach(([k, v]) => {
        if (typeof v === "number") keys.set(k, [...(keys.get(k) ?? []), v]);
      }),
    );
    const criteria = [...keys.entries()].map(([k, vs]) => ({ label: k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " "), value: average(vs) ?? 0, key: k })).sort((a, b) => b.value - a.value);

    const bySpeaker = new Map<string, number[]>();
    data.evals
      .filter((e) => e.kind === "intervenant" && e.speakerId)
      .forEach((e) => {
        const v = e.satisfaction ?? average(Object.values(e.scores ?? {}));
        if (typeof v === "number") bySpeaker.set(e.speakerId!, [...(bySpeaker.get(e.speakerId!) ?? []), v]);
      });

    const verbatims = [...hot, ...cold].filter((e) => e.comment?.trim()).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    return {
      hot,
      cold,
      satisfaction: average(hot.map((e) => e.satisfaction)),
      coldSatisfaction: average(cold.map((e) => e.satisfaction)),
      nps: npsOf(hot.length ? hot : cold),
      answered,
      objectives: average(hot.map((e) => e.objectivesReached)),
      progression,
      gain,
      criteria,
      speakers: [...bySpeaker.entries()].map(([id, vs]) => ({ id, value: average(vs) ?? 0, count: vs.length })).sort((a, b) => b.value - a.value),
      verbatims,
    };
  }, [data.evals, data.enrolled, contacts]);

  const started = Date.parse(ev.startAt) <= now;
  const hasEnrolled = data.enrolled.length > 0;

  const sendHot = () => {
    const tpl = templateMatching("qualiopi", "chaud", "satisfaction");
    let n = 0;
    data.enrolled.forEach((a) => {
      const c = contacts.get(a.contactId);
      if (!c) return;
      sendEmail({
        to: c.email,
        template: tpl,
        subject: tpl ? undefined : "Votre avis sur la {{session}} (2 minutes)",
        body: tpl
          ? undefined
          : "Bonjour {{prenom}},\n\nMerci d'avoir participé à la session {{session}} ({{code_session}}).\nVotre avis nous aide à améliorer chaque édition : répondez au questionnaire de satisfaction à chaud (2 minutes) : {{lien_questionnaire}}\n\nMerci !\nL'équipe StartupWeek",
        vars: { prenom: c.firstName, session: ev.name, code_session: ev.code, lien_questionnaire: `https://startupweek.tech/avis/${ev.code.toLowerCase()}?p=${a.id}` },
        related: { entity: "applications", id: a.id },
      });
      n += 1;
    });
    toast({
      title: n ? `Questionnaire à chaud envoyé à ${n} participant${n > 1 ? "s" : ""}` : "Aucun participant inscrit",
      description: n ? "Les réponses alimenteront la satisfaction, le NPS et l'indicateur Qualiopi 30." : undefined,
      tone: n ? "success" : "info",
    });
  };

  const verbatims = showAll ? view.verbatims : view.verbatims.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {view.hot.length} réponse{view.hot.length > 1 ? "s" : ""} à chaud · {view.cold.length} à froid · {data.evals.filter((e) => e.kind === "intervenant").length} évaluation{data.evals.filter((e) => e.kind === "intervenant").length > 1 ? "s" : ""} d'intervenants
        </p>
        {canEdit ? (
          <Button size="sm" onClick={sendHot} disabled={!hasEnrolled} title={started ? undefined : "À envoyer en fin de session"}>
            <Send /> Envoyer le questionnaire à chaud
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Satisfaction à chaud"
          value={view.satisfaction === undefined ? "—" : `${fmt1(view.satisfaction)}/5`}
          icon={Smile}
          hint={view.coldSatisfaction === undefined ? "Pas encore de retour à froid" : `À froid (J+60) : ${fmt1(view.coldSatisfaction)}/5`}
        />
        <StatCard label="NPS" value={view.nps === undefined ? "—" : view.nps > 0 ? `+${view.nps}` : view.nps} icon={ThumbsUp} hint="% promoteurs − % détracteurs" />
        <StatCard
          label="Taux de réponse"
          value={data.enrolled.length ? `${pct(view.answered, data.enrolled.length)} %` : "—"}
          icon={Users}
          hint={`${view.answered}/${data.enrolled.length} participant${data.enrolled.length > 1 ? "s" : ""}`}
        />
        <StatCard label="Objectifs atteints" value={view.objectives === undefined ? "—" : `${fmt1(view.objectives)}/5`} icon={Target} hint="Auto-évaluation en fin de session" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Progression des acquis</CardTitle>
              <CardDescription>Positionnement d'entrée → évaluation des acquis, notes sur 10 (indicateurs 8 et 11).</CardDescription>
            </div>
            {view.gain !== undefined ? (
              <Badge tone={view.gain >= 0 ? "success" : "danger"} className="shrink-0">
                {view.gain >= 0 ? "+" : ""}
                {fmt1(view.gain)} pt en moyenne
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {view.progression.length ? (
              <ColumnChart
                labels={view.progression.map((r) => r.label)}
                series={[
                  { name: "Positionnement", values: view.progression.map((r) => r.pos ?? 0), color: seriesColor(0) },
                  { name: "Acquis", values: view.progression.map((r) => r.acq ?? 0), color: seriesColor(1) },
                ]}
                stacked={false}
                height={220}
                format={(v) => `${fmt1(v)}/10`}
              />
            ) : (
              <EmptyState title="Pas encore de données" description="Saisissez le positionnement dans la checklist des candidatures, puis l'évaluation des acquis en fin de session." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Critères de satisfaction</CardTitle>
              <CardDescription>Moyenne par critère du questionnaire à chaud.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {view.criteria.length ? <BarList items={view.criteria} format={fmt1} /> : <p className="text-sm text-muted-foreground">Aucun critère détaillé pour l'instant.</p>}
            {view.speakers.length ? (
              <div>
                <h4 className="eyebrow mb-2 text-muted-foreground">Évaluation des intervenants</h4>
                <BarList
                  items={view.speakers.map((s) => {
                    const sp = speakers.get(s.id);
                    return { key: s.id, label: sp ? `${sp.firstName} ${sp.lastName}` : "Intervenant", value: s.value, hint: `(${s.count})` };
                  })}
                  format={(v) => `${fmt1(v)}/5`}
                  max={5}
                  color={seriesColor(2)}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Verbatims</CardTitle>
            <CardDescription>Commentaires libres des participants — à exploiter dans le plan d'amélioration (indicateur 32).</CardDescription>
          </div>
          <MessageSquareQuote className="size-4 text-faint" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          {verbatims.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {verbatims.map((e) => (
                <li key={e.id} className="rounded-md border border-border bg-surface-2/40 p-3">
                  <p className="text-sm leading-relaxed text-foreground">« {e.comment} »</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{e.contactId ? contactName(contacts.get(e.contactId)) : "Anonyme"}</span>
                    <span>{labelOf(EVALUATION_KINDS, e.kind)}</span>
                    <span>{date(e.submittedAt)}</span>
                    {typeof e.satisfaction === "number" ? <Rating value={e.satisfaction} className="text-xs" /> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun commentaire pour l'instant.</p>
          )}
          {view.verbatims.length > 6 ? (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Réduire" : `Voir les ${view.verbatims.length} verbatims`}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
