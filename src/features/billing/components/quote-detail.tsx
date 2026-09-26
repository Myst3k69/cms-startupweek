"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, FileOutput, FileX2, MoreHorizontal, Pencil, Printer, Send, XCircle } from "lucide-react";
import { useEntity, useNow, useSession } from "@/lib/hooks";
import { DEAL_STAGES, labelOf } from "@/lib/domain/constants";
import { date, dateTime, money } from "@/lib/format";
import { Button, Card, CardContent, CardHeader, CardTitle, DescriptionList, EmptyState, LinkButton, Menu, PageHeader, StatusBadge, useToast } from "@/components/ui";
import { SessionLink } from "@/components/shared/entity-links";
import { ActivityTimeline } from "@/components/shared/timeline";
import { DAY, displayNumber, effectiveQuoteStatus, partyName, quoteTotal } from "../lib";
import { convertQuoteToInvoice, duplicateQuote, sendQuote, setQuoteStatus } from "../actions";
import { InvoiceStatusBadge, PartyCell, QuoteStatusBadge, useBillingLookups } from "./shared";
import { QuoteDocument } from "./print/billing-documents";

export function QuoteDetail({ id }: { id: string }) {
  const q = useEntity("quotes", id);
  const deal = useEntity("deals", q?.dealId);
  const invoice = useEntity("invoices", q?.invoiceId);
  const lk = useBillingLookups();
  const now = useNow();
  const router = useRouter();
  const toast = useToast();
  const { canEdit } = useSession();
  const editable = canEdit("facturation");

  if (!q) {
    return <EmptyState icon={FileX2} title="Devis introuvable" className="mt-10" action={<LinkButton href="/facturation?onglet=devis" variant="secondary" size="sm">Retour aux devis</LinkButton>} />;
  }

  const total = quoteTotal(q);
  const status = effectiveQuoteStatus(q, now);
  const daysLeft = Math.floor((new Date(q.validUntil).getTime() - now) / DAY);
  const open = status === "brouillon" || status === "envoye" || status === "expire";

  const send = () => {
    const ok = sendQuote(q.id);
    toast(ok ? { title: `Devis ${q.number} envoyé`, description: `À ${partyName(q, lk)}${deal ? " — opportunité en « Proposition »" : ""}` } : { title: "Envoi impossible", description: "Aucun email pour ce client.", tone: "danger" });
  };
  const convert = () => {
    const inv = convertQuoteToInvoice(q.id);
    if (!inv) return;
    toast({ title: "Brouillon de facture créé", description: "Vérifiez le type (acompte / solde / facture) et l'échéance, puis émettez." });
    router.push(`/facturation/factures/${inv.id}/modifier`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Facturation", href: "/facturation" }, { label: "Devis", href: "/facturation?onglet=devis" }, { label: displayNumber(q) }]}
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            Devis {displayNumber(q)}
            <QuoteStatusBadge quote={q} now={now} />
          </span>
        }
        description={
          <>
            {partyName(q, lk)} · {money(total.ht, true)} HT ({money(total.ttc, true)} TTC) · valable jusqu'au {date(q.validUntil)}
          </>
        }
        actions={
          <>
            {editable && q.status === "accepte" && !q.invoiceId ? (
              <Button size="sm" onClick={convert}>
                <FileOutput aria-hidden="true" /> Créer la facture
              </Button>
            ) : null}
            {editable && open ? (
              <Button size="sm" variant={q.status === "brouillon" ? "primary" : "secondary"} onClick={send}>
                <Send aria-hidden="true" /> {q.status === "brouillon" ? "Envoyer" : "Renvoyer"}
              </Button>
            ) : null}
            {editable && (status === "envoye" || status === "expire") ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => { setQuoteStatus(q.id, "accepte"); toast({ title: "Devis accepté", description: deal ? "Opportunité passée en « Gagné »." : "Vous pouvez maintenant créer la facture." }); }}>
                  <CheckCircle2 aria-hidden="true" /> Accepté
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setQuoteStatus(q.id, "refuse"); toast({ title: "Devis refusé", tone: "info" }); }}>
                  <XCircle aria-hidden="true" /> Refusé
                </Button>
              </>
            ) : null}
            <LinkButton href={`/print/devis/${q.id}`} target="_blank" rel="noopener" variant="secondary" size="sm">
              <Printer aria-hidden="true" /> <span className="hidden sm:inline">Imprimer / PDF</span>
            </LinkButton>
            {editable ? (
              <Menu
                trigger={(p) => (
                  <Button variant="secondary" size="icon-sm" aria-label="Plus d'actions" {...p}>
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                )}
                items={[
                  ...(q.status === "brouillon" ? [{ label: "Modifier", icon: Pencil, onSelect: () => router.push(`/facturation/devis/${q.id}/modifier`) }] : []),
                  {
                    label: "Dupliquer (nouvelle version)",
                    icon: Copy,
                    onSelect: () => {
                      const copy = duplicateQuote(q.id);
                      if (!copy) return;
                      toast({ title: `Devis ${copy.number} créé`, description: "Copie en brouillon, validité 30 jours." });
                      router.push(`/facturation/devis/${copy.id}/modifier`);
                    },
                  },
                  ...(q.status === "accepte" && !q.invoiceId ? [{ label: "Créer la facture", icon: FileOutput, onSelect: convert }] : []),
                ]}
              />
            ) : null}
          </>
        }
        className="mb-0"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <section aria-label="Aperçu du devis" className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-8">
            <QuoteDocument quote={q} />
          </section>
          <Card>
            <CardHeader>
              <CardTitle>Activité</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline entity="quotes" id={q.id} />
            </CardContent>
          </Card>
        </div>
        <aside className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suivi</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList
                items={[
                  { label: "Montant", value: `${money(total.ht, true)} HT · ${money(total.ttc, true)} TTC` },
                  { label: "Émis le", value: date(q.issuedAt) },
                  { label: "Envoyé", value: q.sentAt ? dateTime(q.sentAt) : "Pas encore" },
                  {
                    label: "Validité",
                    value: (
                      <span>
                        {date(q.validUntil)}
                        {open ? <span className={daysLeft < 0 ? "ml-2 text-xs text-danger-text" : "ml-2 text-xs text-muted-foreground"}>{daysLeft < 0 ? `expiré depuis ${-daysLeft} j` : `encore ${daysLeft} j`}</span> : null}
                      </span>
                    ),
                  },
                  ...(q.acceptedAt && q.status === "accepte" ? [{ label: "Accepté le", value: date(q.acceptedAt) }] : []),
                  {
                    label: "Facture",
                    value: invoice ? (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <Link href={`/facturation/factures/${invoice.id}`} className="font-mono text-xs text-accent-text hover:underline">
                          {displayNumber(invoice)}
                        </Link>
                        <InvoiceStatusBadge inv={invoice} now={now} />
                      </span>
                    ) : q.status === "accepte" ? (
                      <span className="text-warning-text">À créer</span>
                    ) : (
                      "—"
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Rattachements</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList
                items={[
                  { label: "Client", value: <PartyCell doc={q} /> },
                  {
                    label: "Opportunité",
                    value: deal ? (
                      <span className="space-y-1">
                        <span className="block">{deal.title}</span>
                        <StatusBadge options={DEAL_STAGES} value={deal.stage} />
                      </span>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Session", value: q.eventId ? <SessionLink id={q.eventId} /> : "—" },
                ]}
              />
              {deal ? <p className="mt-3 text-xs text-muted-foreground">Étape de l'opportunité : {labelOf(DEAL_STAGES, deal.stage)} — mise à jour automatiquement à l'envoi et à l'acceptation.</p> : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
