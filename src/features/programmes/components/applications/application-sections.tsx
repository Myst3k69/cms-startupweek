"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Circle,
  ExternalLink,
  FilePlus2,
  Globe,
  Mail,
  Pencil,
  Phone,
  Printer,
  Rocket,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DescriptionList,
  FormField,
  Input,
  LinkButton,
  Progress,
  Select,
  StatusBadge,
  Switch,
  Textarea,
  useToast,
} from "@/components/ui";
import { useCrm } from "@/lib/store";
import { createApplicationInvoice, sendConvocation, sendInvoiceReminder } from "@/lib/domain/actions";
import { FUNDING_SOURCES, INVOICE_KINDS, INVOICE_STATUSES, LIFECYCLES, PROJECT_STAGES, labelOf } from "@/lib/domain/constants";
import { contactName, effectiveInvoiceStatus, invoiceBalance, invoiceTotal } from "@/lib/domain/selectors";
import type { Application, Contact, EventSession, FundingSource, Invoice, Project } from "@/lib/domain/types";
import { date, dateTime, money } from "@/lib/format";
import { useActions, useCollection, useLookup, useNow, useSession } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Chips, LeadStageStepper } from "../bits";
import { ENTREPRENEURIAL_XP, INTENTS, PROJECT_HEALTH, TECHNICAL_XP, budgetLabel } from "../../lib/labels";
import { CHECKLIST, accessibilityState, checklistProgress, checklistStatus, stampFromLog, type ChecklistKey } from "../../lib/applications";
import { ProjectFormModal } from "../projects/project-form-modal";

/* ───────────────────────────── Dossier ───────────────────────────── */

export function DossierCard({ app, project }: { app: Application; project?: Project }) {
  const offers = useLookup("offers");
  const offer = app.offerId ? offers.get(app.offerId) : undefined;
  const utm = app.utm;
  const utmItems = utm ? [utm.source && `source : ${utm.source}`, utm.medium && `medium : ${utm.medium}`, utm.campaign && `campagne : ${utm.campaign}`, utm.referrer && `référent : ${utm.referrer}`].filter(Boolean) as string[] : [];
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Dossier de candidature</CardTitle>
          <CardDescription>Reçu le {dateTime(app.submittedAt)} via le tunnel du site</CardDescription>
        </div>
        <Badge tone={app.intent === "diagnostic" ? "violet" : "accent"}>{labelOf(INTENTS, app.intent)}</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <section>
          <h4 className="eyebrow mb-2 text-muted-foreground">Projet</h4>
          {project ? (
            <div className="rounded-md border border-border bg-surface-2/50 p-3">
              <Link href={`/projets/${project.id}`} className="text-sm font-semibold text-foreground hover:text-accent-text">
                {project.name}
              </Link>
              {project.tagline ? <p className="mt-0.5 text-sm text-muted-foreground">{project.tagline}</p> : null}
              {project.description ? <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-foreground">{project.description}</p> : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusBadge options={PROJECT_STAGES} value={project.stage} />
                {project.sector ? <Badge>{project.sector}</Badge> : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun projet rattaché — créez-le depuis le bloc « Projet lié » pour éviter une double saisie.</p>
          )}
        </section>

        <section>
          <h4 className="eyebrow mb-2 text-muted-foreground">Motivation</h4>
          {app.motivation ? (
            <blockquote className="whitespace-pre-line border-l-2 border-primary pl-3 text-sm leading-relaxed text-foreground">{app.motivation}</blockquote>
          ) : (
            <p className="text-sm text-faint">Non renseignée</p>
          )}
        </section>

        <DescriptionList
          columns={2}
          items={[
            { label: "Expérience entrepreneuriale", value: labelOf(ENTREPRENEURIAL_XP, app.entrepreneurialXp) },
            { label: "Expérience technique", value: labelOf(TECHNICAL_XP, app.technicalXp) },
            { label: "Budget déclaré", value: budgetLabel(app.budget) },
            { label: "Disponibilités", value: app.availability || "—" },
            { label: "Offre visée", value: offer ? `${offer.name}${offer.code ? ` (${offer.code})` : ""}` : "—" },
            { label: "Comment nous a-t-il connus ?", value: app.heardFrom || "—" },
          ]}
        />

        <section>
          <h4 className="eyebrow mb-2 text-muted-foreground">Tunnel du site</h4>
          <LeadStageStepper stage={app.leadStage} />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Source / UTM :</span>
            {utmItems.length ? <Chips items={utmItems} max={4} /> : <span className="text-faint">aucune (trafic direct)</span>}
            {app.idempotencyKey ? (
              <span className="ml-auto font-mono text-[11px] text-faint" title="Lead ID du tunnel (clé d'idempotence)">
                {app.idempotencyKey}
              </span>
            ) : null}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────────── Scoring ───────────────────────────── */

const CRITERIA: { key: keyof Application["scoreDetail"]; label: string; hint: string }[] = [
  { key: "motivation", label: "Motivation", hint: "Clarté du pourquoi, engagement" },
  { key: "projet", label: "Projet", hint: "Maturité, problème identifié, cible" },
  { key: "disponibilite", label: "Disponibilité", hint: "7 jours pleins + suivi J+30" },
  { key: "adequation", label: "Adéquation", hint: "Format, budget, attentes" },
];

export function ScoringCard({ app, canEdit }: { app: Application; canEdit: boolean }) {
  const { update } = useActions();
  const toast = useToast();
  const [draft, setDraft] = React.useState<Application["scoreDetail"] | null>(null);
  const detail = draft ?? app.scoreDetail;
  const total = CRITERIA.reduce((s, c) => s + (detail[c.key] ?? 0), 0);

  const save = () => {
    if (!draft) return;
    update("applications", app.id, { scoreDetail: draft, score: total }, { log: `Scoring mis à jour : ${app.score} → ${total}/100`, kind: "modification" });
    toast({ title: `Score enregistré : ${total}/100` });
    setDraft(null);
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Scoring</CardTitle>
          <CardDescription>4 critères notés sur 25 — le total alimente la pastille du Kanban.</CardDescription>
        </div>
        <div className="text-right">
          <div className="tabular text-2xl font-semibold text-foreground">
            {total}
            <span className="text-sm font-normal text-muted-foreground">/100</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3.5">
          {CRITERIA.map((c) => {
            const v = detail[c.key] ?? 0;
            return (
              <li key={c.key}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <label htmlFor={`score-${c.key}`} className="text-sm font-medium text-foreground">
                    {c.label} <span className="text-xs font-normal text-muted-foreground">· {c.hint}</span>
                  </label>
                  <span className="tabular text-sm font-semibold text-foreground">{v}/25</span>
                </div>
                {draft ? (
                  <input
                    id={`score-${c.key}`}
                    type="range"
                    min={0}
                    max={25}
                    step={1}
                    value={v}
                    onChange={(e) => setDraft({ ...draft, [c.key]: Number(e.target.value) })}
                    className="w-full accent-[var(--primary)]"
                  />
                ) : (
                  <Progress value={(v / 25) * 100} tone={v >= 19 ? "success" : v >= 13 ? "accent" : v >= 8 ? "warning" : "danger"} label={`${c.label} ${v} sur 25`} />
                )}
              </li>
            );
          })}
        </ul>
        {canEdit ? (
          <div className="mt-4 flex justify-end gap-2">
            {draft ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
                  Annuler
                </Button>
                <Button size="sm" onClick={save}>
                  Enregistrer le score
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setDraft({ ...app.scoreDetail })}>
                <Pencil /> Modifier le scoring
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ───────────────────────────── Checklist Qualiopi ───────────────────────────── */

function PositioningInput({ app, disabled, onCommit }: { app: Application; disabled: boolean; onCommit: (v: number | undefined) => void }) {
  const [value, setValue] = React.useState(app.positioningScore === undefined ? "" : String(app.positioningScore));
  const commit = () => {
    const n = value === "" ? undefined : Math.max(0, Math.min(10, Math.round(Number(value) * 2) / 2));
    if (n === app.positioningScore || (value !== "" && Number.isNaN(n))) return;
    onCommit(n);
  };
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        max={10}
        step={0.5}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        aria-label="Note de positionnement sur 10"
        className="h-8 w-16 text-center"
      />
      <span className="text-xs text-muted-foreground">/10</span>
    </div>
  );
}

function AccessibilityEditor({ app, onSave, onCancel }: { app: Application; onSave: (needs: string, accommodations: string) => void; onCancel: () => void }) {
  const [needs, setNeeds] = React.useState(app.accessibilityNeeds ?? "");
  const [acc, setAcc] = React.useState(app.accommodations ?? "");
  return (
    <div className="mt-2 space-y-2 rounded-md border border-border bg-surface-2/50 p-3">
      <FormField label="Besoin déclaré (situation de handicap, contrainte)" htmlFor={`needs-${app.id}`}>
        <Textarea id={`needs-${app.id}`} value={needs} onChange={(e) => setNeeds(e.target.value)} className="min-h-16" placeholder="Laisser vide si aucun besoin déclaré" />
      </FormField>
      <FormField label="Aménagements convenus avec la référente handicap" htmlFor={`acc-${app.id}`}>
        <Textarea id={`acc-${app.id}`} value={acc} onChange={(e) => setAcc(e.target.value)} className="min-h-16" placeholder="Supports adaptés, rythme, accessibilité du lieu…" />
      </FormField>
      <div className="flex justify-end gap-2">
        <Button size="xs" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button size="xs" onClick={() => onSave(needs.trim(), acc.trim())}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

export function QualiopiChecklist({ app, event, canEdit }: { app: Application; event?: EventSession; canEdit: boolean }) {
  const activities = useCrm((s) => s.activities);
  const users = useLookup("users");
  const log = useCrm((s) => s.log);
  const { update } = useActions();
  const { user } = useSession();
  const toast = useToast();
  const now = useNow();
  const [editAccess, setEditAccess] = React.useState(false);
  const status = checklistStatus(app);
  const progress = checklistProgress(app);
  const access = accessibilityState(app);
  const ended = event ? Date.parse(event.endAt) < now : false;

  const trace = (field: string, summary: string, value: string | number | boolean) =>
    log({ kind: "document", entity: "applications", entityId: app.id, actorId: user?.id, summary, meta: { field, value } });

  const stampText = (field: string, done: boolean, verb = "Validé") => {
    const a = stampFromLog(activities, "applications", app.id, field);
    if (!done) return undefined;
    if (!a) return `${verb} (date non tracée : donnée migrée)`;
    const who = a.actorId ? users.get(a.actorId)?.name : undefined;
    return `${verb} le ${dateTime(a.at)}${who ? ` par ${who}` : ""}`;
  };

  const toggleBool = (field: "needsAnalysisDone" | "prerequisitesOk", label: string, v: boolean) => {
    update("applications", app.id, { [field]: v } as Partial<Application>);
    trace(field, `${label} ${v ? "validé(e)" : "remis(e) à faire"} (checklist Qualiopi)`, v);
  };

  const toggleDate = (field: "agreementSignedAt" | "certificateIssuedAt", label: string, v: boolean) => {
    update("applications", app.id, { [field]: v ? new Date().toISOString() : undefined } as Partial<Application>, { log: `${label} ${v ? "enregistré(e)" : "annulé(e)"}`, kind: "document" });
  };

  const rows: Record<ChecklistKey, { detail?: React.ReactNode; control?: React.ReactNode; warn?: boolean; links?: React.ReactNode }> = {
    needsAnalysis: {
      detail: stampText("needsAnalysisDone", app.needsAnalysisDone, "Réalisée"),
      control: <Switch checked={app.needsAnalysisDone} onChange={(v) => toggleBool("needsAnalysisDone", "Analyse du besoin", v)} disabled={!canEdit} label="Analyse du besoin réalisée" />,
    },
    positioning: {
      detail:
        typeof app.positioningScore === "number"
          ? (() => {
              const a = stampFromLog(activities, "applications", app.id, "positioningScore");
              return `Note ${String(app.positioningScore).replace(".", ",")}/10${a ? ` · saisie le ${dateTime(a.at)}` : ""}`;
            })()
          : "Questionnaire de positionnement à faire passer avant l'entrée.",
      control: (
        <PositioningInput
          key={String(app.positioningScore)}
          app={app}
          disabled={!canEdit}
          onCommit={(v) => {
            update("applications", app.id, { positioningScore: v });
            trace("positioningScore", v === undefined ? "Positionnement d'entrée effacé" : `Positionnement d'entrée : ${v}/10`, v ?? "");
            toast({ title: v === undefined ? "Positionnement effacé" : `Positionnement enregistré : ${v}/10` });
          }}
        />
      ),
    },
    prerequisites: {
      detail: stampText("prerequisitesOk", app.prerequisitesOk, "Validés"),
      control: <Switch checked={app.prerequisitesOk} onChange={(v) => toggleBool("prerequisitesOk", "Prérequis", v)} disabled={!canEdit} label="Prérequis validés" />,
    },
    accessibility: {
      warn: access === "a_traiter",
      detail:
        access === "aucun" ? (
          "Aucun besoin déclaré."
        ) : (
          <span>
            <span className="font-medium text-foreground">Besoin :</span> {app.accessibilityNeeds}
            <br />
            <span className="font-medium text-foreground">Aménagements :</span> {app.accommodations || <span className="text-warning-text">à définir avec la référente handicap</span>}
          </span>
        ),
      control: canEdit ? (
        <Button size="xs" variant="ghost" onClick={() => setEditAccess((v) => !v)} aria-expanded={editAccess}>
          <Pencil /> {access === "aucun" ? "Déclarer" : "Modifier"}
        </Button>
      ) : null,
    },
    convocation: {
      detail: app.convocationSentAt ? `Envoyée le ${dateTime(app.convocationSentAt)}` : app.status === "inscrite" ? "À envoyer au plus tard à J-7." : "Réservée aux candidatures inscrites.",
      control: (
        <Switch
          checked={Boolean(app.convocationSentAt)}
          disabled={!canEdit || (!app.convocationSentAt && app.status !== "inscrite" && app.status !== "acceptee")}
          label="Convocation envoyée"
          onChange={(v) => {
            if (v) {
              sendConvocation(app.id);
              toast({ title: "Convocation envoyée", description: "Email envoyé avec programme, horaires et accès — horodaté (indicateur 9)." });
            } else {
              update("applications", app.id, { convocationSentAt: undefined }, { log: "Convocation marquée comme non envoyée", kind: "document" });
            }
          }}
        />
      ),
      links: (
        <Link href={`/print/convocation/${app.id}`} target="_blank" className="inline-flex items-center gap-1 text-accent-text hover:underline">
          <Printer className="size-3" aria-hidden="true" /> Aperçu
        </Link>
      ),
    },
    agreement: {
      detail: app.agreementSignedAt ? `Signée le ${date(app.agreementSignedAt)}` : app.funding === "personnel" ? "Contrat de formation (particulier) à faire signer." : "Convention avec le financeur à faire signer.",
      control: <Switch checked={Boolean(app.agreementSignedAt)} onChange={(v) => toggleDate("agreementSignedAt", "Convention signée", v)} disabled={!canEdit} label="Convention signée" />,
      links: (
        <Link href={`/print/convention/${app.id}`} target="_blank" className="inline-flex items-center gap-1 text-accent-text hover:underline">
          <Printer className="size-3" aria-hidden="true" /> Convention
        </Link>
      ),
    },
    certificate: {
      detail: app.certificateIssuedAt ? `Délivré le ${date(app.certificateIssuedAt)}` : ended ? "Session terminée : certificat à délivrer." : "À délivrer à l'issue de la session.",
      warn: ended && !app.certificateIssuedAt && app.status === "inscrite",
      control: <Switch checked={Boolean(app.certificateIssuedAt)} onChange={(v) => toggleDate("certificateIssuedAt", "Certificat de réalisation", v)} disabled={!canEdit} label="Certificat de réalisation délivré" />,
      links: (
        <Link href={`/print/attestation/${app.id}`} target="_blank" className="inline-flex items-center gap-1 text-accent-text hover:underline">
          <Printer className="size-3" aria-hidden="true" /> Certificat
        </Link>
      ),
    },
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Checklist Qualiopi</CardTitle>
          <CardDescription>Preuves individuelles attendues à l'audit (ind. 4, 8, 9, 26).</CardDescription>
        </div>
        <span className="tabular text-sm font-semibold text-foreground">
          {progress.done}/{progress.total}
        </span>
      </CardHeader>
      <CardContent className="pt-3">
        <Progress value={(progress.done / progress.total) * 100} tone={progress.done === progress.total ? "success" : "accent"} label={`Checklist ${progress.done} sur ${progress.total}`} />
        <ul className="mt-2 divide-y divide-border">
          {CHECKLIST.map((item) => {
            const r = rows[item.key];
            const done = status[item.key];
            const Icon = r.warn ? AlertTriangle : done ? CheckCircle2 : Circle;
            return (
              <li key={item.key} className="py-3">
                <div className="flex items-start gap-3">
                  <Icon className={cn("mt-0.5 size-4 shrink-0", r.warn ? "text-warning" : done ? "text-success" : "text-faint")} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                      {item.indicator ? (
                        <Badge tone="violet" className="px-1.5 py-0 text-[10px]">
                          ind. {item.indicator}
                        </Badge>
                      ) : null}
                      <span className="sr-only">{done ? "— fait" : "— à faire"}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground" title={item.hint}>
                      {r.detail ?? item.hint}
                    </p>
                    {r.links ? <div className="mt-1 flex gap-3 text-xs">{r.links}</div> : null}
                    {item.key === "accessibility" && editAccess ? (
                      <AccessibilityEditor
                        app={app}
                        onCancel={() => setEditAccess(false)}
                        onSave={(needs, acc) => {
                          update("applications", app.id, { accessibilityNeeds: needs || undefined, accommodations: acc || undefined });
                          trace("accessibility", needs ? `Besoin d'aménagement déclaré${acc ? " et aménagements définis" : ""} (ind. 26)` : "Aucun besoin d'aménagement déclaré (ind. 26)", Boolean(needs));
                          toast({ title: "Besoins d'aménagement enregistrés", description: needs && !acc ? "Pensez à définir les aménagements avec la référente handicap." : undefined, tone: needs && !acc ? "info" : "success" });
                          setEditAccess(false);
                        }}
                      />
                    ) : null}
                  </div>
                  {r.control ? <div className="shrink-0">{r.control}</div> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────────── Paiement ───────────────────────────── */

export function PaymentCard({ app, event, invoices, canEdit }: { app: Application; event?: EventSession; invoices: Invoice[]; canEdit: boolean }) {
  const now = useNow();
  const { update } = useActions();
  const toast = useToast();
  const [funderName, setFunderName] = React.useState(app.funderName ?? "");
  const due = app.amountDueCents || event?.priceCents || 0;
  const paid = app.amountPaidCents;
  const rest = Math.max(0, due - paid);
  const hasDeposit = invoices.some((i) => i.kind === "acompte" && i.status !== "annulee");
  const hasBalance = invoices.some((i) => i.kind === "solde" && i.status !== "annulee");
  const accepted = app.status === "acceptee" || app.status === "inscrite";

  const createInv = (kind: "acompte" | "solde") => {
    const inv = createApplicationInvoice(app.id, kind);
    if (inv) toast({ title: `Facture ${kind === "acompte" ? "d'acompte" : "de solde"} ${inv.number} créée`, description: `${money(invoiceTotal(inv).ttc)} — lien de paiement Stripe généré.` });
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Paiement</CardTitle>
          <CardDescription>CGV : acompte 30 % à l'inscription, solde à J-30.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-surface-2 px-2 py-2">
            <div className="text-[11px] text-muted-foreground">Dû</div>
            <div className="tabular text-sm font-semibold text-foreground">{money(due)}</div>
          </div>
          <div className="rounded-md bg-success-soft px-2 py-2">
            <div className="text-[11px] text-success-text">Payé</div>
            <div className="tabular text-sm font-semibold text-foreground">{money(paid)}</div>
          </div>
          <div className={cn("rounded-md px-2 py-2", rest > 0 ? "bg-warning-soft" : "bg-surface-2")}>
            <div className={cn("text-[11px]", rest > 0 ? "text-warning-text" : "text-muted-foreground")}>Reste</div>
            <div className="tabular text-sm font-semibold text-foreground">{money(rest)}</div>
          </div>
        </div>
        <Progress value={due ? (paid / due) * 100 : 0} tone={rest <= 0 && due > 0 ? "success" : "accent"} label="Part réglée" />

        {invoices.length ? (
          <ul className="divide-y divide-border rounded-md border border-border">
            {invoices.map((inv) => {
              const st = effectiveInvoiceStatus(inv, now);
              const bal = invoiceBalance(inv);
              return (
                <li key={inv.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <Link href={`/facturation/factures/${inv.id}`} className="font-mono text-xs font-medium text-foreground hover:text-accent-text">
                      {inv.number}
                    </Link>
                    <div className="text-[11px] text-muted-foreground">
                      {labelOf(INVOICE_KINDS, inv.kind)} · échéance {date(inv.dueAt)}
                    </div>
                  </div>
                  <StatusBadge options={INVOICE_STATUSES} value={st} />
                  <div className="tabular w-full text-right text-xs sm:w-auto">
                    <div className="font-medium text-foreground">{money(invoiceTotal(inv).ttc)}</div>
                    {bal > 0 && st !== "annulee" ? <div className="text-muted-foreground">reste {money(bal)}</div> : null}
                  </div>
                  {canEdit && bal > 0 && ["emise", "partielle", "en_retard"].includes(st) ? (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Relancer ${inv.number}`}
                      title="Envoyer une relance"
                      onClick={() => {
                        sendInvoiceReminder(inv.id);
                        toast({ title: `Relance envoyée — ${inv.number}`, description: `${money(bal)} restant dû.` });
                      }}
                    >
                      <BellRing />
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune facture. La facture d'acompte est créée automatiquement au passage en « Acceptée ».</p>
        )}

        {canEdit && accepted && (!hasDeposit || !hasBalance) ? (
          <div className="flex flex-wrap gap-2">
            {!hasDeposit ? (
              <Button size="xs" variant="secondary" onClick={() => createInv("acompte")}>
                <FilePlus2 /> Facture d'acompte
              </Button>
            ) : null}
            {hasDeposit && !hasBalance ? (
              <Button size="xs" variant="secondary" onClick={() => createInv("solde")}>
                <FilePlus2 /> Facture de solde
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <FormField label="Financement" htmlFor={`funding-${app.id}`}>
            <Select
              id={`funding-${app.id}`}
              value={app.funding}
              disabled={!canEdit}
              onChange={(e) => {
                const v = e.target.value as FundingSource;
                update("applications", app.id, { funding: v }, { log: `Financement : ${labelOf(FUNDING_SOURCES, v)}` });
              }}
              options={FUNDING_SOURCES}
            />
          </FormField>
          <FormField label="Financeur" htmlFor={`funder-${app.id}`} hint="OPCO Atlas, AKTO, employeur…">
            <Input
              id={`funder-${app.id}`}
              value={funderName}
              disabled={!canEdit}
              onChange={(e) => setFunderName(e.target.value)}
              onBlur={() => {
                if ((app.funderName ?? "") === funderName.trim()) return;
                update("applications", app.id, { funderName: funderName.trim() || undefined }, { log: `Financeur : ${funderName.trim() || "—"}` });
              }}
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────────── Projet lié ───────────────────────────── */

export function LinkedProjectCard({ app, contact, canEdit }: { app: Application; contact?: Contact; canEdit: boolean }) {
  const projects = useCollection("projects");
  const { update } = useActions();
  const toast = useToast();
  const [creating, setCreating] = React.useState(false);
  const project = React.useMemo(() => projects.find((p) => p.id === app.projectId), [projects, app.projectId]);
  const candidates = React.useMemo(() => projects.filter((p) => p.founderIds.includes(app.contactId) && p.id !== app.projectId), [projects, app.contactId, app.projectId]);

  const link = (p: Project) => {
    update("applications", app.id, { projectId: p.id }, { log: `Projet lié : ${p.name}` });
    if (!p.eventIds.includes(app.eventId)) update("projects", p.id, { eventIds: [...p.eventIds, app.eventId] });
    if (!p.founderIds.includes(app.contactId)) update("projects", p.id, { founderIds: [...p.founderIds, app.contactId] });
    toast({ title: `Projet « ${p.name} » lié à la candidature #${app.number}` });
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Projet lié</CardTitle>
          <CardDescription>Une seule fiche projet, de la candidature au suivi J+90.</CardDescription>
        </div>
        <Rocket className="size-4 text-faint" aria-hidden="true" />
      </CardHeader>
      <CardContent className="space-y-3">
        {project ? (
          <div className="rounded-md border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/projets/${project.id}`} className="block truncate text-sm font-semibold text-foreground hover:text-accent-text">
                  {project.name}
                </Link>
                <p className="line-clamp-2 text-xs text-muted-foreground">{project.tagline || "—"}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge options={PROJECT_STAGES} value={project.stage} />
              <StatusBadge options={PROJECT_HEALTH} value={project.health} />
            </div>
            <LinkButton href={`/projets/${project.id}`} variant="link" size="sm" className="mt-2">
              Ouvrir la fiche projet <ExternalLink className="size-3.5" />
            </LinkButton>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Aucun projet rattaché à cette candidature.</p>
            {canEdit ? (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Rocket /> Créer le projet
              </Button>
            ) : null}
            {canEdit && candidates.length ? (
              <FormField label="Ou lier un projet existant du candidat" htmlFor={`link-prj-${app.id}`}>
                <Select
                  id={`link-prj-${app.id}`}
                  value=""
                  onChange={(e) => {
                    const p = candidates.find((x) => x.id === e.target.value);
                    if (p) link(p);
                  }}
                  options={candidates.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Choisir un projet…"
                />
              </FormField>
            ) : null}
          </>
        )}
      </CardContent>
      {creating ? (
        <ProjectFormModal
          open
          lockedFounder
          onClose={() => setCreating(false)}
          initial={{
            name: contact ? `Projet de ${contact.firstName}` : "",
            description: app.motivation,
            founderIds: [app.contactId],
            eventIds: [app.eventId],
            stage: "idee",
          }}
          onCreated={(p) => update("applications", app.id, { projectId: p.id }, { log: `Projet créé depuis le dossier : ${p.name}` })}
        />
      ) : null}
    </Card>
  );
}

/* ───────────────────────────── Candidat ───────────────────────────── */

export function CandidateCard({ contact }: { contact?: Contact }) {
  if (!contact) return null;
  const name = contactName(contact);
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={name} size="lg" />
          <div className="min-w-0">
            <Link href={`/contacts/${contact.id}`} className="block truncate text-sm font-semibold text-foreground hover:text-accent-text">
              {name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{[contact.jobTitle, contact.city].filter(Boolean).join(" · ") || "—"}</p>
          </div>
        </div>
        <StatusBadge options={LIFECYCLES} value={contact.lifecycle} />
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <a href={`mailto:${contact.email}`} className="flex items-center gap-2 truncate text-foreground hover:text-accent-text">
          <Mail className="size-4 shrink-0 text-faint" aria-hidden="true" /> {contact.email}
        </a>
        {contact.phone ? (
          <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-foreground hover:text-accent-text">
            <Phone className="size-4 shrink-0 text-faint" aria-hidden="true" /> {contact.phone}
          </a>
        ) : null}
        {contact.linkedin ? (
          <a href={contact.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate text-foreground hover:text-accent-text">
            <Globe className="size-4 shrink-0 text-faint" aria-hidden="true" /> Profil LinkedIn
          </a>
        ) : null}
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          {contact.age ? <span>{contact.age} ans</span> : null}
          <span>{contact.consent.marketing ? "Consentement marketing ✓" : "Pas de consentement marketing"}</span>
        </div>
        {contact.tags.length ? <Chips items={contact.tags} max={5} className="pt-1" /> : null}
      </CardContent>
    </Card>
  );
}
