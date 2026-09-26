"use client";

import * as React from "react";
import Link from "next/link";
import { CheckSquare, FileText, Inbox, Save } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useNow, useSession } from "@/lib/hooks";
import { DEAL_STAGES, labelOf, LEAD_SOURCES, QUOTE_STATUSES } from "@/lib/domain/constants";
import type { Deal, ID } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { totals } from "@/lib/format";
import { Badge, Button, DescriptionList, Drawer, LinkButton, StatusBadge, useToast } from "@/components/ui";
import { ActivityTimeline } from "@/components/shared/timeline";
import { ContactLink, OrgLink } from "@/components/shared/entity-links";
import { TaskFormModal } from "../shared/task-form-modal";
import { TaskItem } from "../shared/task-item";
import { DealFields, draftFromDeal, draftToPatch, validateDraft, type DealDraft } from "./deal-fields";

export function DealDrawer({ id, onClose }: { id: ID | undefined; onClose: () => void }) {
  const deal = useCrm((s) => (id ? s.deals.find((d) => d.id === id) : undefined));
  if (!id || !deal) return null;
  return <DealDrawerBody key={`${deal.id}:${deal.updatedAt}`} deal={deal} onClose={onClose} />;
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-2.5 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="eyebrow text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function DealDrawerBody({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const now = useNow();
  const toast = useToast();
  const { canEdit } = useSession();
  const editable = canEdit("pipeline");
  const update = useCrm((s) => s.update);
  const quotes = useCrm((s) => s.quotes);
  const tasks = useCrm((s) => s.tasks);
  const [draft, setDraft] = React.useState<DealDraft>(() => draftFromDeal(deal));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [tasking, setTasking] = React.useState(false);
  const initial = React.useMemo(() => JSON.stringify(draftFromDeal(deal)), [deal]);
  const dirty = JSON.stringify(draft) !== initial;

  const linkedQuotes = React.useMemo(() => quotes.filter((q) => q.id === deal.quoteId || q.dealId === deal.id), [quotes, deal.quoteId, deal.id]);
  const dealTasks = React.useMemo(
    () => tasks.filter((t) => t.related?.entity === "deals" && t.related.id === deal.id).sort((a, b) => Number(Boolean(a.doneAt)) - Number(Boolean(b.doneAt)) || a.dueAt.localeCompare(b.dueAt)),
    [tasks, deal.id],
  );
  const weighted = Math.round((deal.amountCents * deal.probability) / 100);
  const overdue = deal.expectedCloseAt && !deal.closedAt && new Date(deal.expectedCloseAt).getTime() < now;

  const save = () => {
    const errs = validateDraft(draft);
    if (draft.stage === "perdu" && !draft.lostReason.trim()) errs.lostReason = "Indiquez la raison de la perte";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const patch: Partial<Deal> = draftToPatch(draft);
    const wasClosed = deal.stage === "gagne" || deal.stage === "perdu";
    const isClosed = patch.stage === "gagne" || patch.stage === "perdu";
    if (isClosed && (!wasClosed || deal.stage !== patch.stage)) patch.closedAt = new Date().toISOString();
    if (!isClosed) patch.closedAt = undefined;
    const stageChanged = patch.stage !== deal.stage;
    update("deals", deal.id, patch, {
      log: stageChanged ? `Étape : ${labelOf(DEAL_STAGES, deal.stage)} → ${labelOf(DEAL_STAGES, patch.stage)}${patch.stage === "perdu" && patch.lostReason ? ` (${patch.lostReason})` : ""}` : "Opportunité modifiée",
      kind: stageChanged ? "statut" : "modification",
    });
    toast({ title: "Opportunité enregistrée", description: patch.title });
  };

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        width="lg"
        title={deal.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge options={DEAL_STAGES} value={deal.stage} />
            <span className="tabular font-medium text-foreground">{money(deal.amountCents)}</span>
            <span>
              · {deal.probability} % · pondéré {money(weighted)}
            </span>
          </span>
        }
        footer={
          editable ? (
            <>
              {dirty ? <span className="mr-auto text-xs text-warning-text">Modifications non enregistrées</span> : null}
              <Button variant="ghost" size="sm" onClick={() => setDraft(draftFromDeal(deal))} disabled={!dirty}>
                Annuler
              </Button>
              <Button size="sm" onClick={save} disabled={!dirty}>
                <Save /> Enregistrer
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="space-y-5">
          <DescriptionList
            columns={2}
            items={[
              { label: "Contact", value: deal.contactId ? <ContactLink id={deal.contactId} withEmail /> : "—" },
              { label: "Organisation", value: <OrgLink id={deal.orgId} /> },
              { label: "Clôture prévue", value: deal.expectedCloseAt ? <span className={overdue ? "font-medium text-danger-text" : undefined}>{date(deal.expectedCloseAt)}{overdue ? " — dépassée" : ""}</span> : "—" },
              { label: deal.stage === "gagne" ? "Gagnée le" : deal.stage === "perdu" ? "Perdue le" : "Créée le", value: date(deal.closedAt ?? deal.createdAt) },
              { label: "Source", value: deal.source ? labelOf(LEAD_SOURCES, deal.source) : "—" },
              {
                label: "Demande d'origine",
                value: deal.submissionId ? (
                  <Link href={`/demandes?id=${deal.submissionId}`} className="inline-flex items-center gap-1 hover:text-accent-text hover:underline">
                    <Inbox className="size-3.5" aria-hidden="true" /> Voir la demande
                  </Link>
                ) : (
                  "—"
                ),
              },
            ]}
          />
          {deal.stage === "perdu" && deal.lostReason ? <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-text">Raison de la perte : {deal.lostReason}</p> : null}

          <Section title="Devis lié">
            {linkedQuotes.length ? (
              <ul className="space-y-1.5">
                {linkedQuotes.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <FileText className="size-4 text-faint" aria-hidden="true" />
                    <Link href={`/facturation/devis/${q.id}`} className="font-mono text-xs font-medium text-foreground hover:text-accent-text hover:underline">
                      {q.number}
                    </Link>
                    <StatusBadge options={QUOTE_STATUSES} value={q.status} />
                    <span className="tabular text-muted-foreground">{money(totals(q.lines).ttc)} TTC</span>
                    <span className="text-xs text-muted-foreground">valable jusqu'au {date(q.validUntil)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-border-strong px-3 py-2.5 text-sm text-muted-foreground">
                Aucun devis rattaché à cette opportunité.
                {canEdit("facturation") ? (
                  <LinkButton href="/facturation" size="xs" variant="secondary">
                    Aller à la facturation
                  </LinkButton>
                ) : null}
              </div>
            )}
          </Section>

          <Section title={editable ? "Modifier" : "Détails"}>
            <DealFields value={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} errors={errors} disabled={!editable} idPrefix={`deal-${deal.id}`} />
            {errors.lostReason ? <p className="text-xs text-danger-text">{errors.lostReason}</p> : null}
          </Section>

          <Section
            title="Relances"
            action={
              canEdit("relances") ? (
                <Button size="xs" variant="secondary" onClick={() => setTasking(true)}>
                  <CheckSquare /> Planifier
                </Button>
              ) : null
            }
          >
            {dealTasks.length ? (
              <ul className="divide-y divide-border rounded-md border border-border">
                {dealTasks.map((t) => (
                  <TaskItem key={t.id} task={t} now={now} editable={canEdit("relances")} showRelated={false} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune relance planifiée.{" "}
                {deal.nextStep ? (
                  <>
                    Prochaine étape notée : <Badge>{deal.nextStep}</Badge>
                  </>
                ) : null}
              </p>
            )}
          </Section>

          <Section title="Activité">
            <ActivityTimeline entity="deals" id={deal.id} limit={25} />
          </Section>
        </div>
      </Drawer>
      <TaskFormModal open={tasking} onClose={() => setTasking(false)} related={{ entity: "deals", id: deal.id }} defaultTitle={deal.nextStep ?? `Relancer — ${deal.title}`} />
    </>
  );
}
