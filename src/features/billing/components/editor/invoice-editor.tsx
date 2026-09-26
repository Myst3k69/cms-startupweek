"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Calculator, FileCheck2, FileX2, Info, Lock, Save } from "lucide-react";
import { z } from "zod";
import { useCollection, useEntity, useNow, useSession, useSettings } from "@/lib/hooks";
import { APPLICATION_STATUSES, PAYMENT_METHODS, labelOf } from "@/lib/domain/constants";
import type { Application, EventSession, Invoice, InvoiceKind, PaymentMethod, Settings } from "@/lib/domain/types";
import { date, money, totals } from "@/lib/format";
import { uid } from "@/lib/utils";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, EmptyState, FormField, Input, LinkButton, Modal, PageHeader, Segmented, Select, Textarea, useToast } from "@/components/ui";
import { DAY, dateInputToIso, isoDateInput, previewNextNumber, ttcLine } from "../../lib";
import { createAndIssueInvoice, issueInvoice, saveInvoiceDraft, type InvoiceInput } from "../../actions";
import { ClientPicker, type PartyValue } from "./client-picker";
import { emptyLine, LinesEditor, toEditorLine, toLineItem, TotalsSummary, type EditorLine } from "./lines-editor";

type EditableKind = Exclude<InvoiceKind, "avoir">;

export interface InvoicePrefill {
  contactId?: string;
  orgId?: string;
  applicationId?: string;
  eventId?: string;
  kind?: string;
}

interface InitialState {
  party: PartyValue;
  applicationId: string;
  eventId: string;
  kind: EditableKind;
  lines: EditorLine[];
  due: string;
  method: PaymentMethod;
  stripeLink: boolean;
  hasFunder: boolean;
  funderName: string;
  subrogation: boolean;
  agreementRef: string;
  notes: string;
}

const isEditableKind = (k?: string): k is EditableKind => k === "facture" || k === "acompte" || k === "solde";

/** Échéance CGV : acompte à 7 jours, solde à J-30 (au plus tôt dans 7 jours), sinon délai de paiement standard. */
function cgvDue(kind: EditableKind, ev: EventSession | undefined, settings: Settings, now: number) {
  if (kind === "acompte") return now + 7 * DAY;
  if (kind === "solde" && ev) return Math.max(now + 7 * DAY, new Date(ev.startAt).getTime() - settings.balanceDaysBefore * DAY);
  return now + settings.paymentTermsDays * DAY;
}

function sessionLine(kind: EditableKind, ev: EventSession, settings: Settings, id: string) {
  if (kind === "facture") return ttcLine(id, `${ev.name} (${ev.code})`, ev.priceCents, settings.vatExempt);
  const pct = kind === "acompte" ? settings.depositPercent : 100 - settings.depositPercent;
  const label = `${kind === "acompte" ? `Acompte ${pct} %` : `Solde ${pct} %`} — ${ev.name} (${ev.code})`;
  return ttcLine(id, label, Math.round((ev.priceCents * pct) / 100), settings.vatExempt);
}

function buildInitial(existing: Invoice | undefined, prefill: InvoicePrefill | undefined, app: Application | undefined, ev: EventSession | undefined, settings: Settings, now: number): InitialState {
  if (existing) {
    return {
      party: { orgId: existing.orgId, contactId: existing.contactId },
      applicationId: existing.applicationId ?? "",
      eventId: existing.eventId ?? "",
      kind: isEditableKind(existing.kind) ? existing.kind : "facture",
      lines: existing.lines.length ? existing.lines.map(toEditorLine) : [emptyLine(settings.vatExempt ? 0 : 20)],
      due: isoDateInput(existing.dueAt),
      method: existing.preferredMethod,
      stripeLink: !!existing.stripePaymentLink || existing.preferredMethod === "stripe",
      hasFunder: !!existing.funder,
      funderName: existing.funder?.name ?? "",
      subrogation: existing.funder?.subrogation ?? true,
      agreementRef: existing.funder?.agreementRef ?? "",
      notes: existing.notes ?? "",
    };
  }
  const kind: EditableKind = isEditableKind(prefill?.kind) ? prefill!.kind as EditableKind : app ? "acompte" : "facture";
  const opco = app?.funding === "opco";
  const party: PartyValue = prefill?.orgId ? { orgId: prefill.orgId, contactId: prefill.contactId } : { contactId: prefill?.contactId ?? app?.contactId };
  return {
    party,
    applicationId: app?.id ?? "",
    eventId: ev?.id ?? "",
    kind,
    lines: ev ? [toEditorLine(sessionLine(kind, ev, settings, `li_init_${ev.id}`))] : [emptyLine(settings.vatExempt ? 0 : 20)],
    due: isoDateInput(new Date(cgvDue(kind, ev, settings, now)).toISOString()),
    method: opco ? "opco" : party.orgId ? "virement" : "stripe",
    stripeLink: !opco && !party.orgId,
    hasFunder: opco,
    funderName: app?.funderName ?? "",
    subrogation: true,
    agreementRef: "",
    notes: "",
  };
}

const lineSchema = z.object({
  label: z.string().min(1, "Chaque ligne doit avoir une désignation"),
  quantity: z.number().positive("Quantité strictement positive"),
  unitPriceCents: z.number().int(),
});

const schema = z.object({
  client: z.string().min(1, "Choisissez un client (contact ou organisation)"),
  lines: z.array(lineSchema).min(1, "Ajoutez au moins une ligne"),
  total: z.number().positive("Le total TTC doit être positif"),
  due: z.string().min(10, "Échéance obligatoire"),
  funder: z.string().optional(),
});

function InvoiceForm({ initial, existing }: { initial: InitialState; existing?: Invoice }) {
  const router = useRouter();
  const toast = useToast();
  const settings = useSettings();
  const now = useNow();
  const applications = useCollection("applications");
  const events = useCollection("events");
  const orgs = useCollection("organizations");
  const invoices = useCollection("invoices");

  const [party, setParty] = React.useState<PartyValue>(initial.party);
  const [applicationId, setApplicationId] = React.useState(initial.applicationId);
  const [eventId, setEventId] = React.useState(initial.eventId);
  const [kind, setKind] = React.useState<EditableKind>(initial.kind);
  const [lines, setLines] = React.useState<EditorLine[]>(initial.lines);
  const [due, setDue] = React.useState(initial.due);
  const [method, setMethod] = React.useState<PaymentMethod>(initial.method);
  const [stripeLink, setStripeLink] = React.useState(initial.stripeLink);
  const [hasFunder, setHasFunder] = React.useState(initial.hasFunder);
  const [funderName, setFunderName] = React.useState(initial.funderName);
  const [subrogation, setSubrogation] = React.useState(initial.subrogation);
  const [agreementRef, setAgreementRef] = React.useState(initial.agreementRef);
  const [notes, setNotes] = React.useState(initial.notes);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [confirm, setConfirm] = React.useState(false);

  const items = React.useMemo(() => lines.map(toLineItem), [lines]);
  const t = totals(items);
  const personId = party.contactId;
  const personApps = React.useMemo(() => applications.filter((a) => a.contactId === personId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [applications, personId]);
  const app = applications.find((a) => a.id === applicationId);
  const ev = events.find((e) => e.id === eventId);
  const eventOptions = React.useMemo(() => [...events].sort((a, b) => b.startAt.localeCompare(a.startAt)).map((e) => ({ value: e.id, label: `${e.code} · ${e.name} — ${date(e.startAt)}` })), [events]);
  const funders = React.useMemo(() => orgs.filter((o) => o.type === "financeur"), [orgs]);
  const next = previewNextNumber(invoices.map((i) => i.number), settings.invoicePrefix, new Date(now).getFullYear());
  const existingSiblings = React.useMemo(
    () => (applicationId ? invoices.filter((i) => i.applicationId === applicationId && i.id !== existing?.id && i.status !== "annulee" && i.kind === kind) : []),
    [invoices, applicationId, kind, existing?.id],
  );

  const onParty = (p: PartyValue) => {
    setParty(p);
    if (p.contactId !== party.contactId) setApplicationId("");
    if (p.orgId && !party.orgId && method === "stripe") setMethod("virement");
    const org = p.orgId ? orgs.find((o) => o.id === p.orgId) : undefined;
    if (org?.type === "financeur") {
      setHasFunder(true);
      setFunderName(org.name);
      setSubrogation(true);
      setMethod("opco");
    }
  };

  const onApplication = (id: string) => {
    setApplicationId(id);
    const a = applications.find((x) => x.id === id);
    if (!a) return;
    setEventId(a.eventId);
    if (a.funding === "opco") {
      setHasFunder(true);
      setFunderName((n) => n || a.funderName || "");
      setMethod("opco");
    }
  };

  const applyCgv = () => {
    if (!ev) return;
    setLines([toEditorLine(sessionLine(kind, ev, settings, uid("li")))]);
    setDue(isoDateInput(new Date(cgvDue(kind, ev, settings, Date.now())).toISOString()));
    toast({ title: kind === "facture" ? "Prix public de la session appliqué" : `${kind === "acompte" ? "Acompte" : "Solde"} calculé selon les CGV`, description: `${ev.code} · ${money(ev.priceCents)} TTC`, tone: "info" });
  };

  const buildInput = (): InvoiceInput | null => {
    const parsed = schema.safeParse({ client: party.orgId ?? party.contactId ?? "", lines: items, total: t.ttc, due, funder: hasFunder ? funderName.trim() : undefined });
    const errs: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0]) === "total" ? "lines" : String(i.path[0])] ??= i.message;
    if (hasFunder && !funderName.trim()) errs.funder = "Nom du financeur obligatoire";
    const dueIso = dateInputToIso(due);
    if (!dueIso) errs.due ??= "Date d'échéance invalide";
    setErrors(errs);
    if (Object.keys(errs).length || !dueIso) {
      toast({ title: "Formulaire incomplet", description: Object.values(errs)[0], tone: "danger" });
      return null;
    }
    return {
      kind,
      contactId: party.contactId,
      orgId: party.orgId,
      applicationId: applicationId || undefined,
      eventId: eventId || undefined,
      quoteId: existing?.quoteId,
      dueAt: dueIso,
      lines: items,
      preferredMethod: method,
      funder: hasFunder ? { name: funderName.trim(), subrogation, agreementRef: agreementRef.trim() || undefined } : undefined,
      notes: notes.trim() || undefined,
      withStripeLink: method === "stripe" && stripeLink,
    };
  };

  const saveDraft = () => {
    const input = buildInput();
    if (!input) return;
    const inv = saveInvoiceDraft(input, existing?.id);
    toast({ title: existing ? "Brouillon mis à jour" : "Brouillon enregistré", description: "Aucun numéro attribué tant que la facture n'est pas émise." });
    router.push(`/facturation/factures/${inv.id}`);
  };

  const issue = () => {
    const input = buildInput();
    setConfirm(false);
    if (!input) return;
    let inv: Invoice | undefined;
    if (existing) {
      saveInvoiceDraft(input, existing.id);
      inv = issueInvoice(existing.id);
    } else {
      inv = createAndIssueInvoice(input);
    }
    if (!inv) return;
    toast({ title: `Facture ${inv.number} émise`, description: `${money(t.ttc, true)} TTC — échéance ${date(inv.dueAt)}` });
    router.push(`/facturation/factures/${inv.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Facturation", href: "/facturation" }, { label: "Factures", href: "/facturation" }, { label: existing ? "Brouillon" : "Nouvelle facture" }]}
        title={existing ? "Modifier le brouillon" : "Nouvelle facture"}
        description="Le numéro légal (séquentiel, sans trou) n'est attribué qu'à l'émission. Un brouillon peut être modifié ou annulé librement."
        className="mb-0"
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Client & rattachements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ClientPicker value={party} onChange={onParty} error={errors.client} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Candidature liée (facultatif)" htmlFor="inv-app" hint={personId ? undefined : "Choisissez d'abord un contact"}>
                  <Select
                    id="inv-app"
                    value={applicationId}
                    disabled={!personApps.length}
                    onChange={(e) => onApplication(e.target.value)}
                    placeholder={personApps.length ? "Aucune" : "Aucune candidature pour ce contact"}
                    options={personApps.map((a) => {
                      const e = events.find((x) => x.id === a.eventId);
                      return { value: a.id, label: `#${a.number} · ${e?.code ?? "—"} — ${labelOf(APPLICATION_STATUSES, a.status)}` };
                    })}
                  />
                </FormField>
                <FormField label="Session (facultatif)" htmlFor="inv-ev">
                  <Select id="inv-ev" value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="Hors session" options={eventOptions} />
                </FormField>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Type de facture</span>
                <div className="flex flex-wrap items-center gap-3">
                  <Segmented<EditableKind>
                    value={kind}
                    onChange={setKind}
                    options={[
                      { value: "facture", label: "Facture" },
                      { value: "acompte", label: `Acompte ${settings.depositPercent} %` },
                      { value: "solde", label: `Solde ${100 - settings.depositPercent} %` },
                    ]}
                  />
                  {ev ? (
                    <Button variant="subtle" size="sm" onClick={applyCgv}>
                      <Calculator aria-hidden="true" /> {kind === "facture" ? "Prix public de la session" : `Calculer ${kind === "acompte" ? "l'acompte" : "le solde"} (CGV)`}
                    </Button>
                  ) : null}
                </div>
                {existingSiblings.length ? (
                  <p className="text-xs text-warning-text">
                    Attention : une facture de type « {kind} » existe déjà pour cette candidature ({existingSiblings.map((i) => i.number || "brouillon").join(", ")}).
                  </p>
                ) : null}
                {app && ev && kind !== "facture" ? (
                  <p className="text-xs text-muted-foreground">
                    Prix de la session {money(ev.priceCents)} TTC · CGV : acompte {settings.depositPercent} % à l'inscription, solde à J-{settings.balanceDaysBefore} (début le {date(ev.startAt)}).
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lignes</CardTitle>
            </CardHeader>
            <CardContent>
              <LinesEditor lines={lines} onChange={setLines} error={errors.lines} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conditions de paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Échéance" htmlFor="inv-due" error={errors.due} hint={`Par défaut : ${settings.paymentTermsDays} jours (acompte : 7 jours, solde : J-${settings.balanceDaysBefore})`}>
                  <Input id="inv-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                </FormField>
                <FormField label="Moyen de paiement préféré" htmlFor="inv-method">
                  <Select id="inv-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={PAYMENT_METHODS} />
                </FormField>
              </div>
              {method === "stripe" ? <Checkbox checked={stripeLink} onChange={(e) => setStripeLink(e.target.checked)} label="Générer un lien de paiement Stripe à l'émission" /> : null}
              <div className="space-y-3 rounded-md border border-border p-3">
                <Checkbox checked={hasFunder} onChange={(e) => setHasFunder(e.target.checked)} label="Prise en charge par un financeur (OPCO, France Travail…)" />
                {hasFunder ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Financeur" htmlFor="inv-funder" error={errors.funder}>
                        <Input id="inv-funder" list="inv-funders" value={funderName} onChange={(e) => setFunderName(e.target.value)} placeholder="OPCO Atlas, AKTO…" />
                        <datalist id="inv-funders">
                          {funders.map((f) => (
                            <option key={f.id} value={f.name} />
                          ))}
                        </datalist>
                      </FormField>
                      <FormField label="N° d'accord de prise en charge" htmlFor="inv-agreement">
                        <Input id="inv-agreement" value={agreementRef} onChange={(e) => setAgreementRef(e.target.value)} />
                      </FormField>
                    </div>
                    <Checkbox checked={subrogation} onChange={(e) => setSubrogation(e.target.checked)} label="Subrogation de paiement (l'OPCO règle directement StartupWeek)" />
                    {subrogation ? (
                      <p className="flex gap-1.5 text-xs text-muted-foreground">
                        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        En subrogation, la facture est adressée au financeur : choisissez l'organisation OPCO comme client (le stagiaire figure en objet via la candidature).
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
              <FormField label="Notes (imprimées sur la facture)" htmlFor="inv-notes">
                <Textarea id="inv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20" placeholder="Ex. Bon de commande n°…, conditions particulières" />
              </FormField>
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TotalsSummary lines={items} />
              <div className="rounded-md bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
                Numéro attribué à l'émission : <span className="font-mono font-medium text-foreground">{next}</span> (prochain de la séquence)
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => setConfirm(true)}>
                  <FileCheck2 aria-hidden="true" /> Émettre la facture
                </Button>
                <Button variant="secondary" onClick={saveDraft}>
                  <Save aria-hidden="true" /> Enregistrer le brouillon
                </Button>
                <LinkButton href={existing ? `/facturation/factures/${existing.id}` : "/facturation"} variant="ghost">
                  Annuler
                </LinkButton>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Émettre la facture ?"
        description={`Elle recevra le numéro ${next}.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Revenir
            </Button>
            <Button onClick={issue}>
              <FileCheck2 aria-hidden="true" /> Émettre ({money(t.ttc, true)})
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Une facture émise ne peut plus être modifiée ni supprimée : toute correction passe par un <strong className="font-medium text-foreground">avoir</strong>. Vérifiez le client, les lignes et l'échéance.
        </p>
      </Modal>
    </div>
  );
}

export function InvoiceEditorPage({ invoiceId, prefill }: { invoiceId?: string; prefill?: InvoicePrefill }) {
  const existing = useEntity("invoices", invoiceId);
  const settings = useSettings();
  const now = useNow();
  const app = useEntity("applications", existing ? undefined : prefill?.applicationId);
  const ev = useEntity("events", existing ? undefined : prefill?.eventId ?? app?.eventId);
  const { canEdit } = useSession();
  // État initial figé à l'ouverture (le formulaire est ensuite autonome).
  const [initial] = React.useState(() => buildInitial(existing, prefill, app, ev, settings, now));

  if (!canEdit("facturation")) {
    return <EmptyState icon={Lock} title="Lecture seule" description="Votre rôle permet de consulter la facturation, pas de créer ou modifier des factures." className="mt-10" action={<LinkButton href="/facturation" variant="secondary" size="sm">Retour à la facturation</LinkButton>} />;
  }
  if (invoiceId && !existing) {
    return <EmptyState icon={FileX2} title="Facture introuvable" className="mt-10" action={<LinkButton href="/facturation" variant="secondary" size="sm">Retour à la facturation</LinkButton>} />;
  }
  if (existing && existing.status !== "brouillon") {
    return (
      <EmptyState
        icon={Lock}
        title={`Facture ${existing.number} émise — non modifiable`}
        description="Numérotation légale : une facture émise ne se modifie pas. Pour corriger, créez un avoir puis une nouvelle facture."
        className="mt-10"
        action={<LinkButton href={`/facturation/factures/${existing.id}`} size="sm">Ouvrir la facture</LinkButton>}
      />
    );
  }
  return <InvoiceForm key={existing?.id ?? "new"} initial={initial} existing={existing} />;
}
