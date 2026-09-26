"use client";

import * as React from "react";
import { BellRing, CalendarClock, ClipboardCheck, Download, FileSignature, Mail, Pencil, Plus, Receipt, Sparkles, SquareCheck, Workflow } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useSession } from "@/lib/hooks";
import { labelOf, SEQUENCE_TRIGGERS } from "@/lib/domain/constants";
import type { Sequence, SequenceTrigger } from "@/lib/domain/types";
import { uid } from "@/lib/utils";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, Switch, useToast } from "@/components/ui";
import { SequenceDrawer } from "./sequence-drawer";

/** Relances absentes des 13 workflows n8n, désormais automatisées par le CRM. */
const N8N_GAPS: { trigger: SequenceTrigger; title: string; detail: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { trigger: "demande_sans_reponse", title: "SLA 48 h des demandes", detail: "Les accusés n8n promettaient « réponse sous 24-48 h » sans aucun suivi : tâche prioritaire, alerte interne puis escalade.", icon: BellRing },
  { trigger: "digital_starter_kit", title: "Nurturing Digital Starter Kit", detail: "Les téléchargements du kit restaient dans une table Airtable sans suite : nurturing puis appel de découverte.", icon: Download },
  { trigger: "devis_envoye", title: "Relance des devis B2B", detail: "Aucune relance après l'envoi d'un devis école / entreprise : emails et appel jusqu'à l'acceptation ou l'expiration.", icon: FileSignature },
  { trigger: "facture_echue", title: "Impayés (acompte / solde)", detail: "Rien n'existait pour l'acompte de 30 % ni le solde à J-30 : relances progressives puis appel.", icon: Receipt },
  { trigger: "session_j_moins_7", title: "Préparation J-7", detail: "Rappel pratique, positionnement et vérification logistique / aménagements avant chaque session.", icon: CalendarClock },
  { trigger: "evaluation_froid", title: "Évaluation à froid J+60", detail: "Questionnaire à froid et nouvelles du projet (Qualiopi ind. 30), avec relance des non-répondants.", icon: ClipboardCheck },
];
const NEW_TRIGGERS = new Set<SequenceTrigger>(N8N_GAPS.map((g) => g.trigger));

function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

export function SequencesView() {
  const sequences = useCrm((s) => s.sequences);
  const templates = useCrm((s) => s.emailTemplates);
  const update = useCrm((s) => s.update);
  const create = useCrm((s) => s.create);
  const toast = useToast();
  const { canEdit } = useSession();
  const editable = canEdit("relances");
  const [openId, setOpenId] = React.useState<string>();

  const byTrigger = React.useMemo(() => {
    const m = new Map<SequenceTrigger, Sequence[]>();
    sequences.forEach((s) => m.set(s.trigger, [...(m.get(s.trigger) ?? []), s]));
    return m;
  }, [sequences]);
  const tplName = React.useMemo(() => new Map(templates.map((t) => [t.id, t.name])), [templates]);
  const sorted = React.useMemo(() => [...sequences].sort((a, b) => Number(b.active) - Number(a.active) || b.enrolled - a.enrolled), [sequences]);

  const toggle = (s: Sequence, v: boolean) => {
    update("sequences", s.id, { active: v }, { log: v ? "Séquence activée" : "Séquence mise en pause", kind: "statut" });
    toast({ title: v ? "Séquence activée" : "Séquence en pause", description: s.name, tone: v ? "success" : "info" });
  };

  const addSequence = () => {
    const s = create(
      "sequences",
      {
        name: "Nouvelle séquence",
        description: "",
        trigger: "demande_sans_reponse",
        active: false,
        steps: [{ id: uid("stp"), delayDays: 0, channel: "email", label: "Premier email" }],
        enrolled: 0,
        completed: 0,
        replied: 0,
      },
      { log: "Séquence créée" },
    );
    setOpenId(s.id);
  };

  return (
    <div className="space-y-6">
      <Card className="border-ring/30">
        <CardHeader>
          <div>
            <CardTitle className="inline-flex items-center gap-2">
              <Sparkles className="size-4 text-accent-text" aria-hidden="true" />
              Relances qui manquaient dans n8n
            </CardTitle>
            <CardDescription>Les 13 workflows n8n se limitaient à « formulaire → Airtable → email d'accusé ». Ces relances sont désormais gérées nativement.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {N8N_GAPS.map((g) => {
              const seqs = byTrigger.get(g.trigger) ?? [];
              const active = seqs.some((s) => s.active);
              const enrolled = seqs.reduce((a, s) => a + s.enrolled, 0);
              return (
                <li key={g.trigger} className="flex gap-3 rounded-md border border-border p-3">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-text">
                    <g.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{g.title}</p>
                      {seqs.length ? (
                        <Badge tone={active ? "success" : "neutral"} dot>
                          {active ? "Active" : "En pause"}
                        </Badge>
                      ) : (
                        <Badge tone="warning" dot>
                          À configurer
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{g.detail}</p>
                    {seqs.length ? (
                      <button type="button" onClick={() => setOpenId(seqs[0].id)} className="mt-1 text-xs font-medium text-accent-text hover:underline">
                        {enrolled} inscrit{enrolled > 1 ? "s" : ""} · voir la séquence
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Séquences</h2>
          <p className="text-xs text-muted-foreground">
            {sequences.filter((s) => s.active).length} active{sequences.filter((s) => s.active).length > 1 ? "s" : ""} sur {sequences.length} — chaque étape crée un email programmé ou une tâche assignée.
          </p>
        </div>
        {editable ? (
          <Button size="sm" variant="secondary" onClick={addSequence}>
            <Plus /> Nouvelle séquence
          </Button>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Workflow} title="Aucune séquence" description="Créez une séquence pour automatiser vos relances." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sorted.map((s) => (
            <Card key={s.id} className={s.active ? undefined : "opacity-80"}>
              <CardHeader>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{s.name}</CardTitle>
                    {NEW_TRIGGERS.has(s.trigger) ? <Badge tone="accent">Nouveau — absent de n8n</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Déclencheur : <span className="font-medium text-foreground">{labelOf(SEQUENCE_TRIGGERS, s.trigger)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">{s.active ? "Active" : "Pause"}</span>
                  <Switch checked={s.active} onChange={(v) => toggle(s, v)} label={`${s.active ? "Désactiver" : "Activer"} ${s.name}`} disabled={!editable} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {s.description ? <p className="text-sm text-muted-foreground">{s.description}</p> : null}
                <ol className="scrollbar-thin -mx-1 flex items-start gap-0 overflow-x-auto px-1 pb-1" aria-label="Étapes de la séquence">
                  {s.steps.map((st, i) => (
                    <li key={st.id} className="flex shrink-0 items-start">
                      <div className="w-32">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex size-6 items-center justify-center rounded-full ${st.channel === "email" ? "bg-info-soft text-info-text" : "bg-warning-soft text-warning-text"}`}>
                            {st.channel === "email" ? <Mail className="size-3.5" aria-hidden="true" /> : <SquareCheck className="size-3.5" aria-hidden="true" />}
                          </span>
                          <span className="tabular text-xs font-semibold text-foreground">J+{st.delayDays}</span>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{st.channel === "email" ? "email" : "tâche"}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 pr-2 text-xs text-foreground">{st.label}</p>
                        {st.templateId ? <p className="mt-0.5 truncate pr-2 text-[11px] text-faint">{tplName.get(st.templateId) ?? "Template supprimé"}</p> : null}
                      </div>
                      {i < s.steps.length - 1 ? <span className="mt-3 h-px w-4 shrink-0 bg-border-strong" aria-hidden="true" /> : null}
                    </li>
                  ))}
                </ol>
                <dl className="grid grid-cols-3 gap-2 rounded-md bg-surface-2/60 p-3 text-center">
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Inscrits</dt>
                    <dd className="tabular text-lg font-semibold text-foreground">{s.enrolled}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Terminés</dt>
                    <dd className="tabular text-lg font-semibold text-foreground">
                      {s.completed} <span className="text-xs font-normal text-muted-foreground">{pct(s.completed, s.enrolled)} %</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Réponses</dt>
                    <dd className="tabular text-lg font-semibold text-foreground">
                      {s.replied} <span className="text-xs font-normal text-muted-foreground">{pct(s.replied, s.enrolled)} %</span>
                    </dd>
                  </div>
                </dl>
                <div className="flex justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(s.id)}>
                    <Pencil /> {editable ? "Modifier les étapes" : "Voir les étapes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SequenceDrawer id={openId} onClose={() => setOpenId(undefined)} editable={editable} />
    </div>
  );
}
