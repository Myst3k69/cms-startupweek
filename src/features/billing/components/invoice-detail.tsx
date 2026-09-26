"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, BellRing, Copy, CreditCard, ExternalLink, FileCheck2, FileMinus2, FileX2, Mail, MoreHorizontal, Pencil, Printer } from "lucide-react";
import { useCollection, useEntity, useNow, useSession } from "@/lib/hooks";
import { effectiveInvoiceStatus, invoiceBalance, invoiceTotal } from "@/lib/domain/selectors";
import { EMAIL_STATUSES, INVOICE_KINDS, PAYMENT_METHODS, PAYMENT_STATUSES, labelOf } from "@/lib/domain/constants";
import type { Invoice } from "@/lib/domain/types";
import { date, dateTime, money, relative } from "@/lib/format";
import { Button, Card, CardContent, CardHeader, CardTitle, DescriptionList, EmptyState, FormField, LinkButton, Menu, Modal, PageHeader, Progress, StatusBadge, Textarea, useToast } from "@/components/ui";
import { SessionLink } from "@/components/shared/entity-links";
import { ActivityTimeline } from "@/components/shared/timeline";
import { displayNumber, isCollectible, partyName, paymentsOf, REMINDER_LEVEL_LABELS, reminderInfo } from "../lib";
import { cancelDraftInvoice, createCreditNote, duplicateInvoice, issueInvoice, runReminderStep, sendInvoiceEmail } from "../actions";
import { CopyButton, DueHint, InvoiceStatusBadge, PartyCell, useBillingLookups } from "./shared";
import { RecordPaymentModal } from "./record-payment-modal";
import { InvoiceDocument } from "./print/billing-documents";

type Dialog = "payment" | "credit" | "issue" | "cancel" | null;

function kindTitle(inv: Invoice) {
  return inv.kind === "avoir" ? "Avoir" : inv.kind === "facture" ? "Facture" : labelOf(INVOICE_KINDS, inv.kind);
}

export function InvoiceDetail({ id }: { id: string }) {
  const inv = useEntity("invoices", id);
  const invoices = useCollection("invoices");
  const allPayments = useCollection("payments");
  const emails = useCollection("emails");
  const application = useEntity("applications", inv?.applicationId);
  const quote = useEntity("quotes", inv?.quoteId);
  const lk = useBillingLookups();
  const now = useNow();
  const router = useRouter();
  const toast = useToast();
  const { canEdit } = useSession();
  const editable = canEdit("facturation");
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const [reason, setReason] = React.useState("");

  const payments = React.useMemo(() => (inv ? paymentsOf(inv.id, allPayments) : []), [inv, allPayments]);
  const credited = inv?.creditedInvoiceId ? invoices.find((i) => i.id === inv.creditedInvoiceId) : undefined;
  const creditNotes = React.useMemo(() => (inv ? invoices.filter((i) => i.creditedInvoiceId === inv.id) : []), [invoices, inv]);
  const sentEmails = React.useMemo(() => (inv ? emails.filter((m) => m.related?.entity === "invoices" && m.related.id === inv.id).sort((a, b) => (b.sentAt ?? b.createdAt).localeCompare(a.sentAt ?? a.createdAt)) : []), [emails, inv]);

  if (!inv) {
    return <EmptyState icon={FileX2} title="Facture introuvable" description="Elle a peut-être été supprimée, ou le lien est incorrect." className="mt-10" action={<LinkButton href="/facturation" variant="secondary" size="sm">Retour à la facturation</LinkButton>} />;
  }

  const total = invoiceTotal(inv);
  const balance = inv.kind === "avoir" || inv.status === "annulee" ? 0 : Math.max(0, invoiceBalance(inv));
  const status = effectiveInvoiceStatus(inv, now);
  const draft = inv.status === "brouillon";
  const collectible = isCollectible(inv);
  const overdue = status === "en_retard";
  const info = reminderInfo(inv, now);
  const paidPct = total.ttc > 0 ? (inv.paidCents / total.ttc) * 100 : 0;
  const title = draft ? kindTitle(inv) : `${kindTitle(inv)} ${inv.number}`;

  const send = () => {
    if (overdue) {
      const r = runReminderStep(inv.id);
      toast(r.ok ? { title: `${REMINDER_LEVEL_LABELS[Math.min(r.level, 3)]} envoyée`, description: r.level === 2 ? "Tâche d'appel créée" : r.level >= 3 ? "Tâche de mise en demeure créée" : "Email avec lien de paiement" } : { title: "Relance impossible", description: r.reason, tone: "danger" });
      return;
    }
    const ok = sendInvoiceEmail(inv.id);
    toast(ok ? { title: "Facture envoyée", description: `${inv.number} · ${partyName(inv, lk)}` } : { title: "Envoi impossible", description: "Aucun email de facturation pour ce client.", tone: "danger" });
  };

  const duplicate = () => {
    const copy = duplicateInvoice(inv.id);
    if (!copy) return;
    toast({ title: "Brouillon dupliqué", description: "Vérifiez puis émettez la nouvelle facture." });
    router.push(`/facturation/factures/${copy.id}/modifier`);
  };

  const menuItems = [
    ...(draft ? [{ label: "Modifier le brouillon", icon: Pencil, onSelect: () => router.push(`/facturation/factures/${inv.id}/modifier`) }] : []),
    { label: "Dupliquer en brouillon", icon: Copy, onSelect: duplicate },
    ...(!draft && inv.kind !== "avoir" && inv.status !== "annulee" ? [{ label: "Créer un avoir", icon: FileMinus2, onSelect: () => setDialog("credit") }] : []),
    { label: "Imprimer / PDF", icon: Printer, onSelect: () => window.open(`/print/facture/${inv.id}`, "_blank", "noopener") },
    ...(draft ? ["separator" as const, { label: "Annuler le brouillon", icon: Ban, danger: true, onSelect: () => setDialog("cancel") }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Facturation", href: "/facturation" }, { label: "Factures", href: "/facturation" }, { label: displayNumber(inv) }]}
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {title}
            <InvoiceStatusBadge inv={inv} now={now} />
          </span>
        }
        description={
          <>
            {partyName(inv, lk)} · {draft ? "brouillon créé" : "émise"} le {date(inv.issuedAt)}
            {inv.kind !== "avoir" ? ` · échéance ${date(inv.dueAt)}` : ""} · {money(total.ttc, true)} TTC
          </>
        }
        actions={
          <>
            {editable && draft ? (
              <>
                <LinkButton href={`/facturation/factures/${inv.id}/modifier`} variant="secondary" size="sm">
                  <Pencil aria-hidden="true" /> Modifier
                </LinkButton>
                <Button size="sm" onClick={() => setDialog("issue")}>
                  <FileCheck2 aria-hidden="true" /> Émettre
                </Button>
              </>
            ) : null}
            {editable && collectible ? (
              <>
                <Button variant="secondary" size="sm" onClick={send}>
                  {overdue ? <BellRing aria-hidden="true" /> : <Mail aria-hidden="true" />} {overdue ? "Relancer" : "Envoyer"}
                </Button>
                <Button size="sm" onClick={() => setDialog("payment")}>
                  <CreditCard aria-hidden="true" /> Enregistrer un paiement
                </Button>
              </>
            ) : null}
            <LinkButton href={`/print/facture/${inv.id}`} target="_blank" rel="noopener" variant="secondary" size="sm">
              <Printer aria-hidden="true" /> <span className="hidden sm:inline">Imprimer / PDF</span>
            </LinkButton>
            {editable ? (
              <Menu
                trigger={(p) => (
                  <Button variant="secondary" size="icon-sm" aria-label="Plus d'actions" {...p}>
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                )}
                items={menuItems}
              />
            ) : null}
          </>
        }
        className="mb-0"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <section aria-label="Aperçu du document" className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-8">
            <InvoiceDocument invoice={inv} />
          </section>
          <Card>
            <CardHeader>
              <CardTitle>Activité</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline entity="invoices" id={inv.id} />
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{inv.kind === "avoir" ? "Montant de l'avoir" : "Règlement"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {inv.kind === "avoir" ? (
                <p className="text-2xl font-semibold tabular">{money(total.ttc, true)}</p>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Reste à payer</p>
                    <p className={balance > 0 && overdue ? "text-2xl font-semibold tabular text-danger-text" : "text-2xl font-semibold tabular"}>{money(balance, true)}</p>
                    <Progress value={paidPct} tone={paidPct >= 100 ? "success" : overdue ? "danger" : "accent"} className="mt-2" label="Part réglée" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {money(inv.paidCents, true)} réglés sur {money(total.ttc, true)} TTC
                    </p>
                  </div>
                  <DescriptionList
                    items={[
                      { label: "Échéance", value: <span>{date(inv.dueAt)}<DueHint dueAt={inv.dueAt} now={now} done={!collectible} /></span> },
                      { label: "Moyen préféré", value: labelOf(PAYMENT_METHODS, inv.preferredMethod) },
                      { label: "Total HT · TVA", value: `${money(total.ht, true)} · ${money(total.vat, true)}` },
                    ]}
                  />
                  {inv.stripePaymentLink ? (
                    <div className="space-y-2 rounded-md border border-border p-3">
                      <p className="text-xs font-medium text-muted-foreground">Lien de paiement Stripe</p>
                      <p className="break-all font-mono text-xs">{inv.stripePaymentLink}</p>
                      <div className="flex flex-wrap gap-2">
                        <CopyButton value={inv.stripePaymentLink} label="Copier le lien" size="xs" />
                        <LinkButton href={inv.stripePaymentLink} target="_blank" rel="noopener noreferrer" variant="ghost" size="xs">
                          <ExternalLink aria-hidden="true" /> Ouvrir
                        </LinkButton>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rattachements</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList
                items={[
                  { label: "Client", value: <PartyCell doc={inv} /> },
                  { label: "Session", value: inv.eventId ? <SessionLink id={inv.eventId} /> : "—" },
                  {
                    label: "Candidature",
                    value: application ? (
                      <Link href={`/candidatures/${application.id}`} className="text-accent-text hover:underline">
                        Candidature #{application.number}
                      </Link>
                    ) : (
                      "—"
                    ),
                  },
                  ...(quote ? [{ label: "Devis d'origine", value: <Link href={`/facturation/devis/${quote.id}`} className="font-mono text-xs text-accent-text hover:underline">{quote.number}</Link> }] : []),
                  ...(credited ? [{ label: "Facture créditée", value: <Link href={`/facturation/factures/${credited.id}`} className="font-mono text-xs text-accent-text hover:underline">{credited.number}</Link> }] : []),
                  ...(creditNotes.length
                    ? [
                        {
                          label: "Avoirs émis",
                          value: (
                            <span className="flex flex-wrap gap-2">
                              {creditNotes.map((c) => (
                                <Link key={c.id} href={`/facturation/factures/${c.id}`} className="font-mono text-xs text-accent-text hover:underline">
                                  {c.number} ({money(invoiceTotal(c).ttc)})
                                </Link>
                              ))}
                            </span>
                          ),
                        },
                      ]
                    : []),
                  ...(inv.funder ? [{ label: "Financeur", value: `${inv.funder.name}${inv.funder.subrogation ? " · subrogation" : ""}${inv.funder.agreementRef ? ` · accord ${inv.funder.agreementRef}` : ""}` }] : []),
                ]}
              />
            </CardContent>
          </Card>

          {inv.kind !== "avoir" ? (
            <Card>
              <CardHeader>
                <CardTitle>Paiements reçus</CardTitle>
                {editable && collectible ? (
                  <Button variant="ghost" size="xs" onClick={() => setDialog("payment")}>
                    <CreditCard aria-hidden="true" /> Ajouter
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {payments.length ? (
                  <ul className="divide-y divide-border">
                    {payments.map((p) => (
                      <li key={p.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium tabular">{money(p.amountCents, true)}</p>
                          <p className="text-xs text-muted-foreground">
                            {date(p.receivedAt)} · {labelOf(PAYMENT_METHODS, p.method)}
                            {p.feeCents ? ` · frais ${money(p.feeCents, true)}` : ""}
                          </p>
                          <p className="truncate font-mono text-[11px] text-faint" title={p.reference}>
                            {p.reference}
                          </p>
                        </div>
                        <StatusBadge options={PAYMENT_STATUSES} value={p.status} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">{draft ? "Émettez la facture pour pouvoir encaisser." : "Aucun paiement reçu pour l'instant."}</p>
                )}
              </CardContent>
            </Card>
          ) : null}

          {!draft && inv.kind !== "avoir" ? (
            <Card>
              <CardHeader>
                <CardTitle>Relances</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DescriptionList
                  columns={2}
                  items={[
                    { label: "Niveau", value: `${info.level}/3 · ${REMINDER_LEVEL_LABELS[info.level]}` },
                    { label: "Dernière relance", value: inv.lastReminderAt ? relative(inv.lastReminderAt, now) : "—" },
                  ]}
                />
                {collectible && info.next && info.daysLate >= 0 ? (
                  <p className={info.nextDue ? "text-xs font-medium text-danger-text" : "text-xs text-muted-foreground"}>
                    Prochaine étape : {info.next.title} (J+{info.next.day}){info.nextDue ? " — à envoyer maintenant" : ` le ${date(new Date(info.nextAt!).toISOString())}`}
                  </p>
                ) : null}
                {sentEmails.length ? (
                  <ul className="space-y-1.5 border-t border-border pt-3">
                    {sentEmails.slice(0, 6).map((m) => (
                      <li key={m.id} className="flex items-start justify-between gap-2 text-xs">
                        <span className="min-w-0">
                          <span className="block truncate text-foreground">{m.subject}</span>
                          <span className="text-muted-foreground">{dateTime(m.sentAt ?? m.createdAt)}</span>
                        </span>
                        <StatusBadge options={EMAIL_STATUSES} value={m.status} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Aucun email envoyé pour cette facture.</p>
                )}
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>

      <RecordPaymentModal invoice={inv} now={now} open={dialog === "payment"} onClose={() => setDialog(null)} />

      <Modal
        open={dialog === "credit"}
        onClose={() => setDialog(null)}
        title={`Créer un avoir sur ${inv.number}`}
        description={`Avoir total de ${money(total.ttc, true)} TTC, mêmes lignes, numéroté dans la séquence des factures.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const c = createCreditNote(inv.id, reason.trim() || undefined);
                setDialog(null);
                setReason("");
                if (!c) return;
                toast({ title: `Avoir ${c.number} émis`, description: inv.paidCents > 0 ? `Tâche de remboursement créée (${money(inv.paidCents, true)})` : `Facture ${inv.number} annulée` });
                router.push(`/facturation/factures/${c.id}`);
              }}
            >
              <FileMinus2 aria-hidden="true" /> Émettre l'avoir
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {inv.paidCents > 0
              ? `La facture a déjà été réglée à hauteur de ${money(inv.paidCents, true)} : une tâche de remboursement sera créée.`
              : "La facture n'a reçu aucun paiement : elle passera au statut « Annulée »."}
          </p>
          <FormField label="Motif (imprimé sur l'avoir)" htmlFor="credit-reason">
            <Textarea id="credit-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-20" placeholder="Ex. Annulation de l'inscription (désistement à J-45, conformément aux CGV)" />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={dialog === "issue"}
        onClose={() => setDialog(null)}
        size="sm"
        title="Émettre la facture ?"
        description="Un numéro légal séquentiel lui sera attribué."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Revenir
            </Button>
            <Button
              onClick={() => {
                const issued = issueInvoice(inv.id);
                setDialog(null);
                if (issued) toast({ title: `Facture ${issued.number} émise`, description: `Échéance ${date(issued.dueAt)}` });
              }}
            >
              <FileCheck2 aria-hidden="true" /> Émettre
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Une fois émise, la facture ne peut plus être modifiée ni supprimée : toute correction passe par un avoir.</p>
      </Modal>

      <Modal
        open={dialog === "cancel"}
        onClose={() => setDialog(null)}
        size="sm"
        title="Annuler ce brouillon ?"
        description="Aucun numéro n'a été consommé : la séquence légale reste intacte."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Garder le brouillon
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                cancelDraftInvoice(inv.id);
                setDialog(null);
                toast({ title: "Brouillon annulé", tone: "info" });
                router.push("/facturation");
              }}
            >
              <Ban aria-hidden="true" /> Annuler le brouillon
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Le brouillon sera retiré de la liste des factures (il reste visible avec le filtre « Annulée »).</p>
      </Modal>
    </div>
  );
}
