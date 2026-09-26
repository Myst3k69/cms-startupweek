"use client";

import * as React from "react";
import { ArrowLeft, Ban, CalendarClock, CheckCircle2, FileSearch, Hourglass, LogOut, RotateCcw, Send, UserCheck } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  LinkButton,
  Modal,
  PageHeader,
  ProgressRing,
  Select,
  StatusBadge,
  useToast,
} from "@/components/ui";
import { SessionLink } from "@/components/shared/entity-links";
import { StatusSelect } from "@/components/shared/status-select";
import { ActivityTimeline } from "@/components/shared/timeline";
import { sendConvocation } from "@/lib/domain/actions";
import { APPLICATION_STATUSES, PERSONAS, labelOf } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { ApplicationStatus, EntityName, ID } from "@/lib/domain/types";
import { dateTime, relative } from "@/lib/format";
import { useActions, useCollection, useEntity, useNow, useSession } from "@/lib/hooks";
import { scoreTone } from "../../lib/labels";
import { CandidateCard, DossierCard, LinkedProjectCard, PaymentCard, QualiopiChecklist, ScoringCard } from "./application-sections";
import { useApplicationMover, type MoveTarget } from "./use-mover";
import { sessionDates } from "../../lib/sessions";

interface ActionDef {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: MoveTarget;
  variant?: "primary" | "secondary" | "ghost";
  confirm?: boolean;
  onClick?: () => void;
}

export function ApplicationDetail({ id }: { id: ID }) {
  const app = useEntity("applications", id);
  const contact = useEntity("contacts", app?.contactId);
  const event = useEntity("events", app?.eventId);
  const project = useEntity("projects", app?.projectId);
  const allInvoices = useCollection("invoices");
  const users = useCollection("users");
  const now = useNow();
  const { canEdit } = useSession();
  const editable = canEdit("candidatures");
  const { update } = useActions();
  const toast = useToast();
  const { request, modals } = useApplicationMover();
  const [confirm, setConfirm] = React.useState<ApplicationStatus | null>(null);

  const invoices = React.useMemo(() => allInvoices.filter((i) => i.applicationId === id).sort((a, b) => a.issuedAt.localeCompare(b.issuedAt)), [allInvoices, id]);
  const extra = React.useMemo<{ entity: EntityName; id: ID }[]>(() => invoices.map((i) => ({ entity: "invoices", id: i.id })), [invoices]);
  const reviewerOptions = React.useMemo(() => users.filter((u) => u.active && u.role !== "lecture").map((u) => ({ value: u.id, label: u.name })), [users]);

  if (!app) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Candidature introuvable"
        description="Elle a peut-être été supprimée ou l'identifiant est incorrect."
        action={
          <LinkButton href="/candidatures" variant="secondary">
            <ArrowLeft /> Retour aux candidatures
          </LinkButton>
        }
        className="mt-10"
      />
    );
  }

  const name = contactName(contact);
  const move = (to: MoveTarget) => request(app, to);

  const actions: ActionDef[] = (() => {
    const interview: ActionDef = { key: "interview", label: app.status === "entretien" ? "Replanifier l'entretien" : "Planifier l'entretien", icon: CalendarClock, to: "entretien", variant: "secondary" };
    const accept: ActionDef = { key: "accept", label: "Accepter", icon: CheckCircle2, to: "acceptee", variant: "primary" };
    const refuse: ActionDef = { key: "refuse", label: "Refuser", icon: Ban, to: "refusee", variant: "ghost", confirm: true };
    const wait: ActionDef = { key: "wait", label: "Liste d'attente", icon: Hourglass, to: "liste_attente", variant: "ghost" };
    const withdraw: ActionDef = { key: "withdraw", label: "Désistement", icon: LogOut, to: "desistee", variant: "ghost", confirm: true };
    const convocation: ActionDef = {
      key: "convocation",
      label: app.convocationSentAt ? "Renvoyer la convocation" : "Envoyer la convocation",
      icon: Send,
      variant: app.convocationSentAt ? "secondary" : "primary",
      onClick: () => {
        sendConvocation(app.id);
        toast({ title: app.convocationSentAt ? "Convocation renvoyée" : "Convocation envoyée", description: `${name} · ${event?.code ?? ""} — horodatée pour l'indicateur Qualiopi 9.` });
      },
    };
    switch (app.status) {
      case "nouvelle":
        return [{ key: "qualify", label: "Qualifier", icon: UserCheck, to: "qualifiee", variant: "primary" }, interview, wait, refuse];
      case "qualifiee":
        return [accept, interview, wait, refuse];
      case "entretien":
        return [accept, interview, wait, refuse];
      case "acceptee":
        return [{ key: "enroll", label: "Marquer inscrite (payée)", icon: UserCheck, to: "inscrite", variant: "primary" }, withdraw];
      case "inscrite":
        return [convocation, withdraw];
      case "liste_attente":
        return [accept, refuse];
      default:
        return [{ key: "reopen", label: "Réactiver", icon: RotateCcw, to: "qualifiee", variant: "secondary" }];
    }
  })();

  const runAction = (a: ActionDef) => {
    if (a.onClick) return a.onClick();
    if (!a.to) return;
    if (a.confirm && a.to !== "__exit") setConfirm(a.to);
    else move(a.to);
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Candidatures", href: "/candidatures" }, { label: `#${app.number}` }]}
        eyebrow={event ? `${event.code} · ${event.city}` : "Candidature"}
        title={
          <span>
            <span className="tabular font-mono text-muted-foreground">#{app.number}</span> {name}
          </span>
        }
        description={
          <>
            {event ? `${event.name} · ${sessionDates(event)}` : "Session inconnue"} — reçue {relative(app.submittedAt, now)} ({dateTime(app.submittedAt)})
          </>
        }
        actions={
          editable ? (
            <>
              {actions.map((a) => (
                <Button key={a.key} size="sm" variant={a.variant} onClick={() => runAction(a)}>
                  <a.icon /> {a.label}
                </Button>
              ))}
            </>
          ) : null
        }
      >
        <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Statut</span>
            {editable ? (
              <StatusSelect options={APPLICATION_STATUSES} value={app.status} onChange={(v) => move(v)} label="Statut de la candidature" className="h-8" />
            ) : (
              <StatusBadge options={APPLICATION_STATUSES} value={app.status} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Session</span>
            <SessionLink id={app.eventId} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Persona</span>
            <StatusBadge options={PERSONAS} value={app.persona} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Référent</span>
            <Select
              aria-label="Référent de la candidature"
              value={app.reviewerId ?? ""}
              disabled={!editable}
              onChange={(e) => {
                const u = users.find((x) => x.id === e.target.value);
                update("applications", app.id, { reviewerId: e.target.value || undefined }, { log: u ? `Assignée à ${u.name}` : "Référent retiré" });
              }}
              options={reviewerOptions}
              placeholder="Non assigné"
              className="w-44 [&_select]:h-8"
            />
          </div>
          {app.status === "entretien" || app.interviewAt ? (
            <div className="flex items-center gap-2 text-sm">
              <CalendarClock className="size-4 text-faint" aria-hidden="true" />
              <span className="text-muted-foreground">Entretien</span>
              <span className="font-medium text-foreground">{app.interviewAt ? dateTime(app.interviewAt) : "à planifier"}</span>
            </div>
          ) : null}
          <div className="flex items-center gap-2 sm:ml-auto">
            <ProgressRing value={app.score} size={44} stroke={5} label={String(app.score)} />
            <div className="leading-tight">
              <div className="text-xs text-muted-foreground">Score global</div>
              <Badge tone={scoreTone(app.score)} className="mt-0.5 px-1.5 py-0 text-[10px]">
                {app.score >= 75 ? "Prioritaire" : app.score >= 55 ? "Solide" : app.score >= 35 ? "À challenger" : "Faible"}
              </Badge>
            </div>
          </div>
        </Card>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DossierCard app={app} project={project} />
          <ScoringCard app={app} canEdit={editable} />
          <Card>
            <CardHeader>
              <CardTitle>Activité</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline entity="applications" id={app.id} extra={extra} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <CandidateCard contact={contact} />
          <QualiopiChecklist app={app} event={event} canEdit={editable} />
          <PaymentCard key={app.funderName ?? ""} app={app} event={event} invoices={invoices} canEdit={editable} />
          <LinkedProjectCard app={app} contact={contact} canEdit={editable} />
        </div>
      </div>

      {confirm ? (
        <Modal
          open
          onClose={() => setConfirm(null)}
          title={confirm === "refusee" ? "Refuser la candidature ?" : `Passer en « ${labelOf(APPLICATION_STATUSES, confirm)} » ?`}
          description={`#${app.number} · ${name}`}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Annuler
              </Button>
              <Button
                variant={confirm === "refusee" ? "danger" : "primary"}
                onClick={() => {
                  const to = confirm;
                  setConfirm(null);
                  move(to);
                }}
              >
                Confirmer
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            {confirm === "refusee"
              ? "La décision est datée et un email de refus bienveillant est envoyé automatiquement au candidat."
              : "La place sur la session est libérée et l'historique de la candidature est conservé."}
          </p>
        </Modal>
      ) : null}
      {modals}
    </div>
  );
}
