"use client";

import * as React from "react";
import { CheckCircle2, Clock, MailCheck, RotateCcw, Sparkles } from "lucide-react";
import { useActions, useCollection, useEntity, useNow, useSession, useSettings } from "@/lib/hooks";
import { ACTION_STATUSES, COMPLAINT_STATUSES, COMPLAINT_TYPES, labelOf } from "@/lib/domain/constants";
import { acknowledgeComplaint } from "@/lib/domain/actions";
import type { Complaint, ComplaintStatus, ID } from "@/lib/domain/types";
import { date, dateTime, relative } from "@/lib/format";
import { Badge, Button, DescriptionList, Drawer, FormField, Segmented, Select, StatusBadge, Textarea, useToast } from "@/components/ui";
import { ContactLink, SessionLink } from "@/components/shared/entity-links";
import { StatusSelect } from "@/components/shared/status-select";
import { ActivityTimeline } from "@/components/shared/timeline";
import { cn } from "@/lib/utils";
import { COMPLAINT_CHANNELS, SEVERITIES } from "../labels";
import { userOptions } from "../form-utils";
import { HOUR, complaintAckHours, complaintCloseDays, fmtDays, fmtHours } from "../metrics";
import { ActionDrawer, type ActionDraft } from "./action-drawer";

export function ComplaintDrawer({ complaintId, onClose }: { complaintId: ID | null; onClose: () => void }) {
  const complaint = useEntity("complaints", complaintId);
  return (
    <Drawer
      open={!!complaintId}
      onClose={onClose}
      width="xl"
      title={complaint ? <span className="font-mono">{complaint.number}</span> : "Réclamation"}
      description={complaint ? complaint.subject : complaintId ? "Réclamation introuvable (supprimée ou lien invalide)." : undefined}
    >
      {complaint ? <ComplaintDetail key={complaint.id} complaint={complaint} /> : null}
    </Drawer>
  );
}

function ComplaintDetail({ complaint }: { complaint: Complaint }) {
  const now = useNow();
  const settings = useSettings();
  const { update } = useActions();
  const { canEdit } = useSession();
  const toast = useToast();
  const users = useCollection("users");
  const action = useEntity("improvementActions", complaint.improvementActionId);
  const readOnly = !canEdit("qualiopi");

  const [form, setForm] = React.useState({
    description: complaint.description,
    analysis: complaint.analysis ?? "",
    response: complaint.response ?? "",
    correctiveAction: complaint.correctiveAction ?? "",
  });
  const [satisfied, setSatisfied] = React.useState<"oui" | "non" | "nr">(complaint.satisfiedWithResponse === true ? "oui" : complaint.satisfiedWithResponse === false ? "non" : "nr");
  const [actionDrawer, setActionDrawer] = React.useState<{ open: boolean; id?: ID; draft?: ActionDraft }>({ open: false });

  const dirty =
    form.description !== complaint.description ||
    form.analysis !== (complaint.analysis ?? "") ||
    form.response !== (complaint.response ?? "") ||
    form.correctiveAction !== (complaint.correctiveAction ?? "");

  const ackLimit = Date.parse(complaint.receivedAt) + settings.complaintAckHours * HOUR;
  const ackH = complaintAckHours(complaint);
  const closeD = complaintCloseDays(complaint);
  const closed = complaint.status === "cloturee";

  const save = () => {
    update(
      "complaints",
      complaint.id,
      {
        description: form.description.trim() || complaint.description,
        analysis: form.analysis.trim() || undefined,
        response: form.response.trim() || undefined,
        correctiveAction: form.correctiveAction.trim() || undefined,
      },
      { log: `Traitement de la réclamation ${complaint.number} mis à jour` },
    );
    toast({ title: "Traitement enregistré" });
  };

  const setStatus = (status: ComplaintStatus) => {
    const patch: Partial<Complaint> = { status };
    if (status === "cloturee" && !complaint.closedAt) patch.closedAt = new Date().toISOString();
    if (status !== "cloturee") patch.closedAt = undefined;
    update("complaints", complaint.id, patch, { log: `Réclamation ${complaint.number} : ${labelOf(COMPLAINT_STATUSES, complaint.status)} → ${labelOf(COMPLAINT_STATUSES, status)}`, kind: "statut" });
    toast({ title: `Statut : ${labelOf(COMPLAINT_STATUSES, status)}` });
  };

  const close = () => {
    if (dirty) save();
    update(
      "complaints",
      complaint.id,
      { status: "cloturee", closedAt: new Date().toISOString(), satisfiedWithResponse: satisfied === "nr" ? undefined : satisfied === "oui" },
      { log: `Réclamation ${complaint.number} clôturée${satisfied === "nr" ? "" : satisfied === "oui" ? " — réclamant satisfait" : " — réclamant non satisfait"}`, kind: "statut" },
    );
    toast({ title: `Réclamation ${complaint.number} clôturée` });
  };

  const reopen = () => {
    update("complaints", complaint.id, { status: complaint.improvementActionId ? "action" : "analyse", closedAt: undefined }, { log: `Réclamation ${complaint.number} rouverte`, kind: "statut" });
    toast({ title: "Réclamation rouverte", tone: "info" });
  };

  const newActionDraft = (): ActionDraft => ({
    title: `Réclamation ${complaint.number} — ${complaint.subject}`,
    description: form.correctiveAction.trim() || form.analysis.trim() || complaint.description,
    origin: "reclamation",
    originRef: { entity: "complaints", id: complaint.id },
    indicatorCodes: complaint.type === "accessibilite" ? [26, 31, 32] : [31, 32],
    ownerId: complaint.ownerId,
    dueAt: new Date(now + 30 * 24 * HOUR).toISOString(),
    status: "a_faire",
  });

  return (
    <div className="space-y-6">
      {/* Statut & délais */}
      <section className="flex flex-wrap items-center gap-2">
        {readOnly ? (
          <StatusBadge options={COMPLAINT_STATUSES} value={complaint.status} />
        ) : (
          <StatusSelect options={COMPLAINT_STATUSES} value={complaint.status} onChange={setStatus} label="Statut de la réclamation" className="h-8 w-44" />
        )}
        <StatusBadge options={SEVERITIES} value={complaint.severity} />
        <Badge tone="neutral">{labelOf(COMPLAINT_TYPES, complaint.type)}</Badge>
      </section>

      <section
        className={cn(
          "rounded-lg border p-3",
          complaint.ackAt ? (ackH !== null && ackH > settings.complaintAckHours ? "border-warning/40 bg-warning-soft" : "border-success/30 bg-success-soft") : now > ackLimit ? "border-danger/30 bg-danger-soft" : "border-border bg-surface-2/60",
        )}
      >
        {complaint.ackAt ? (
          <p className="flex items-start gap-2 text-sm text-foreground">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              Accusé de réception envoyé le {dateTime(complaint.ackAt)} — en <strong className="tabular">{fmtHours(ackH)}</strong>
              {ackH !== null && ackH > settings.complaintAckHours ? ` (au-delà de l'engagement de ${settings.complaintAckHours} h)` : ` (engagement ${settings.complaintAckHours} h respecté)`}.
            </span>
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-start gap-2 text-sm text-foreground">
              <Clock className={cn("mt-0.5 size-4 shrink-0", now > ackLimit ? "text-danger" : "text-warning")} aria-hidden="true" />
              <span>
                {now > ackLimit ? (
                  <>
                    <strong>Accusé de réception en retard</strong> — échéance dépassée {relative(new Date(ackLimit).toISOString(), now)} (engagement {settings.complaintAckHours} h).
                  </>
                ) : (
                  <>Accusé de réception à envoyer {relative(new Date(ackLimit).toISOString(), now)} (engagement {settings.complaintAckHours} h).</>
                )}
                {!complaint.contactId ? <span className="block text-xs text-muted-foreground">Réclamant non identifié : l'accusé sera seulement horodaté.</span> : null}
              </span>
            </p>
            {!readOnly ? (
              <Button
                size="sm"
                onClick={() => {
                  acknowledgeComplaint(complaint.id);
                  toast({ title: "Accusé de réception envoyé", description: complaint.contactId ? "Email envoyé au réclamant et horodaté." : "Horodatage enregistré." });
                }}
              >
                <MailCheck /> Envoyer l'accusé
              </Button>
            ) : null}
          </div>
        )}
      </section>

      <DescriptionList
        columns={2}
        items={[
          { label: "Reçue le", value: `${dateTime(complaint.receivedAt)} (${relative(complaint.receivedAt, now)})` },
          { label: "Canal", value: labelOf(COMPLAINT_CHANNELS, complaint.channel) },
          { label: "Réclamant", value: complaint.contactId ? <ContactLink id={complaint.contactId} withEmail /> : "Anonyme / non identifié" },
          { label: "Session", value: complaint.eventId ? <SessionLink id={complaint.eventId} /> : "—" },
          {
            label: "Responsable",
            value: readOnly ? (
              users.find((u) => u.id === complaint.ownerId)?.name ?? "Non assigné"
            ) : (
              <Select
                aria-label="Responsable du traitement"
                value={complaint.ownerId ?? ""}
                onChange={(e) => {
                  update("complaints", complaint.id, { ownerId: e.target.value || undefined }, { log: "Responsable de la réclamation modifié" });
                  toast({ title: "Responsable mis à jour" });
                }}
                options={userOptions(users)}
                placeholder="Non assigné"
              />
            ),
          },
          { label: "Délai de clôture", value: closeD !== null ? `${fmtDays(closeD)} (clôturée le ${date(complaint.closedAt)})` : `En cours depuis ${fmtDays((now - Date.parse(complaint.receivedAt)) / (24 * HOUR))}` },
        ]}
      />

      {/* Traitement */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Traitement</h3>
        <FormField label="Description (faits rapportés)" htmlFor="rec-d">
          <Textarea id="rec-d" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={readOnly} className="min-h-20" />
        </FormField>
        <FormField label="Analyse (causes, recevabilité)" htmlFor="rec-a">
          <Textarea id="rec-a" value={form.analysis} onChange={(e) => setForm({ ...form, analysis: e.target.value })} disabled={readOnly} className="min-h-20" placeholder="Causes identifiées, personnes interrogées, recevabilité…" />
        </FormField>
        <FormField label="Réponse apportée au réclamant" htmlFor="rec-r">
          <Textarea id="rec-r" value={form.response} onChange={(e) => setForm({ ...form, response: e.target.value })} disabled={readOnly} className="min-h-20" placeholder="Réponse écrite envoyée, geste commercial éventuel…" />
        </FormField>
        <FormField label="Action corrective" htmlFor="rec-c">
          <Textarea id="rec-c" value={form.correctiveAction} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} disabled={readOnly} className="min-h-16" placeholder="Correction immédiate du dysfonctionnement…" />
        </FormField>
        {!readOnly ? (
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" disabled={!dirty} onClick={save}>
              Enregistrer le traitement
            </Button>
          </div>
        ) : null}
      </section>

      {/* Amélioration continue */}
      <section className="rounded-lg border border-border p-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="size-4 text-accent-text" aria-hidden="true" /> Amélioration continue (indicateur 32)
        </h3>
        {action ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{action.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge options={ACTION_STATUSES} value={action.status} />
                {action.dueAt ? <span>Échéance {date(action.dueAt)}</span> : null}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setActionDrawer({ open: true, id: action.id })}>
              Ouvrir l'action
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Aucune action d'amélioration liée. Transformez cette réclamation en action du plan d'amélioration.</p>
            {!readOnly ? (
              <Button size="sm" variant="subtle" onClick={() => setActionDrawer({ open: true, draft: newActionDraft() })}>
                Créer une action liée
              </Button>
            ) : null}
          </div>
        )}
      </section>

      {/* Clôture */}
      <section className="rounded-lg border border-border p-3">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Clôture</h3>
        {closed ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
              Clôturée le {date(complaint.closedAt)}
              {typeof complaint.satisfiedWithResponse === "boolean" ? (
                <Badge tone={complaint.satisfiedWithResponse ? "success" : "danger"} dot>
                  {complaint.satisfiedWithResponse ? "Réclamant satisfait" : "Réclamant non satisfait"}
                </Badge>
              ) : (
                <Badge tone="neutral">Satisfaction non renseignée</Badge>
              )}
            </p>
            {!readOnly ? (
              <Button size="sm" variant="ghost" onClick={reopen}>
                <RotateCcw /> Rouvrir
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-foreground">Le réclamant est-il satisfait de la réponse ?</span>
              <Segmented
                value={satisfied}
                onChange={setSatisfied}
                options={[
                  { value: "oui", label: "Oui" },
                  { value: "non", label: "Non" },
                  { value: "nr", label: "Non renseigné" },
                ]}
              />
            </div>
            {!readOnly ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {!form.response.trim() ? <span className="text-xs text-muted-foreground">Renseignez la réponse apportée avant de clôturer.</span> : null}
                <Button size="sm" disabled={!form.response.trim()} onClick={close}>
                  <CheckCircle2 /> Clôturer la réclamation
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Historique</h3>
        <ActivityTimeline entity="complaints" id={complaint.id} />
      </section>

      <ActionDrawer
        open={actionDrawer.open}
        actionId={actionDrawer.id}
        draft={actionDrawer.draft}
        onClose={() => setActionDrawer({ open: false })}
        onSaved={(a) => {
          if (complaint.improvementActionId === a.id) return;
          update(
            "complaints",
            complaint.id,
            { improvementActionId: a.id, status: ["recue", "accusee", "analyse"].includes(complaint.status) ? "action" : complaint.status },
            { log: `Action d'amélioration liée : « ${a.title} »`, kind: "statut" },
          );
        }}
      />
    </div>
  );
}
