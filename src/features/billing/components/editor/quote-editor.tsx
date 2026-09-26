"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileX2, Lock, Save, Send } from "lucide-react";
import { z } from "zod";
import { useCollection, useEntity, useNow, useSession, useSettings } from "@/lib/hooks";
import { DEAL_STAGES, labelOf } from "@/lib/domain/constants";
import type { Deal, Quote, Settings } from "@/lib/domain/types";
import { date, totals } from "@/lib/format";
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, FormField, Input, LinkButton, PageHeader, Select, Textarea, useToast } from "@/components/ui";
import { DAY, dateInputToIso, isoDateInput, previewNextNumber } from "../../lib";
import { saveQuote, sendQuote, type QuoteInput } from "../../actions";
import { ClientPicker, type PartyValue } from "./client-picker";
import { emptyLine, LinesEditor, toEditorLine, toLineItem, TotalsSummary, type EditorLine } from "./lines-editor";

export interface QuotePrefill {
  contactId?: string;
  orgId?: string;
  dealId?: string;
  eventId?: string;
}

interface InitialState {
  party: PartyValue;
  dealId: string;
  eventId: string;
  validUntil: string;
  lines: EditorLine[];
  notes: string;
}

function buildInitial(existing: Quote | undefined, prefill: QuotePrefill | undefined, deal: Deal | undefined, settings: Settings, now: number): InitialState {
  if (existing) {
    return {
      party: { orgId: existing.orgId, contactId: existing.contactId },
      dealId: existing.dealId ?? "",
      eventId: existing.eventId ?? "",
      validUntil: isoDateInput(existing.validUntil),
      lines: existing.lines.length ? existing.lines.map(toEditorLine) : [emptyLine(settings.vatExempt ? 0 : 20)],
      notes: existing.notes ?? "",
    };
  }
  return {
    party: { orgId: prefill?.orgId ?? deal?.orgId, contactId: prefill?.contactId ?? deal?.contactId },
    dealId: deal?.id ?? "",
    eventId: prefill?.eventId ?? deal?.eventId ?? "",
    validUntil: isoDateInput(new Date(now + 30 * DAY).toISOString()),
    lines: [emptyLine(settings.vatExempt ? 0 : 20)],
    notes: "",
  };
}

const schema = z.object({
  client: z.string().min(1, "Choisissez un client (organisation ou contact)"),
  lines: z.array(z.object({ label: z.string().min(1, "Chaque ligne doit avoir une désignation"), quantity: z.number().positive("Quantité strictement positive") })).min(1, "Ajoutez au moins une ligne"),
  total: z.number().positive("Le total doit être positif"),
});

function QuoteForm({ initial, existing }: { initial: InitialState; existing?: Quote }) {
  const router = useRouter();
  const toast = useToast();
  const settings = useSettings();
  const now = useNow();
  const deals = useCollection("deals");
  const events = useCollection("events");
  const quotes = useCollection("quotes");

  const [party, setParty] = React.useState<PartyValue>(initial.party);
  const [dealId, setDealId] = React.useState(initial.dealId);
  const [eventId, setEventId] = React.useState(initial.eventId);
  const [validUntil, setValidUntil] = React.useState(initial.validUntil);
  const [lines, setLines] = React.useState<EditorLine[]>(initial.lines);
  const [notes, setNotes] = React.useState(initial.notes);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const items = React.useMemo(() => lines.map(toLineItem), [lines]);
  const t = totals(items);
  const clientDeals = React.useMemo(
    () => deals.filter((d) => (party.orgId && d.orgId === party.orgId) || (party.contactId && d.contactId === party.contactId) || d.id === dealId),
    [deals, party.orgId, party.contactId, dealId],
  );
  const eventOptions = React.useMemo(() => [...events].sort((a, b) => b.startAt.localeCompare(a.startAt)).map((e) => ({ value: e.id, label: `${e.code} · ${e.name} — ${date(e.startAt)}` })), [events]);
  const next = existing?.number || previewNextNumber(quotes.map((q) => q.number), settings.quotePrefix, new Date(now).getFullYear());

  const buildInput = (): QuoteInput | null => {
    const parsed = schema.safeParse({ client: party.orgId ?? party.contactId ?? "", lines: items, total: t.ht });
    const errs: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0]) === "total" ? "lines" : String(i.path[0])] ??= i.message;
    const validIso = dateInputToIso(validUntil);
    if (!validIso) errs.valid = "Date de validité invalide";
    setErrors(errs);
    if (Object.keys(errs).length || !validIso) {
      toast({ title: "Formulaire incomplet", description: Object.values(errs)[0], tone: "danger" });
      return null;
    }
    return { contactId: party.contactId, orgId: party.orgId, dealId: dealId || undefined, eventId: eventId || undefined, validUntil: validIso, lines: items, notes: notes.trim() || undefined };
  };

  const save = (andSend: boolean) => {
    const input = buildInput();
    if (!input) return;
    const q = saveQuote(input, existing?.id);
    if (andSend) {
      const ok = sendQuote(q.id);
      toast(ok ? { title: `Devis ${q.number} envoyé`, description: "Statut « Envoyé » ; l'opportunité liée passe en « Proposition »." } : { title: `Devis ${q.number} enregistré`, description: "Envoi impossible : aucun email pour ce client.", tone: "danger" });
    } else {
      toast({ title: existing ? "Devis mis à jour" : `Devis ${q.number} créé`, description: "Statut brouillon — à envoyer au client." });
    }
    router.push(`/facturation/devis/${q.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Facturation", href: "/facturation" }, { label: "Devis", href: "/facturation?onglet=devis" }, { label: existing ? existing.number : "Nouveau devis" }]}
        title={existing ? `Modifier le devis ${existing.number}` : "Nouveau devis"}
        description="Proposition commerciale B2B (écoles, entreprises, accompagnements). Une fois acceptée, elle se convertit en facture en un clic."
        className="mb-0"
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Client & opportunité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ClientPicker id="quote-client" value={party} onChange={setParty} error={errors.client} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Opportunité (facultatif)" htmlFor="q-deal">
                  <Select
                    id="q-deal"
                    value={dealId}
                    onChange={(e) => {
                      setDealId(e.target.value);
                      const d = deals.find((x) => x.id === e.target.value);
                      if (d?.eventId && !eventId) setEventId(d.eventId);
                    }}
                    placeholder={clientDeals.length ? "Aucune" : "Aucune opportunité pour ce client"}
                    options={clientDeals.map((d) => ({ value: d.id, label: `${d.title} — ${labelOf(DEAL_STAGES, d.stage)}` }))}
                  />
                </FormField>
                <FormField label="Session (facultatif)" htmlFor="q-ev">
                  <Select id="q-ev" value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="Hors session" options={eventOptions} />
                </FormField>
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
              <CardTitle>Validité & conditions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Valable jusqu'au" htmlFor="q-valid" error={errors.valid} hint="Par défaut : 30 jours">
                <Input id="q-valid" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </FormField>
              <div className="text-xs text-muted-foreground sm:pt-6">Modalités imprimées : acompte de {settings.depositPercent} % à la commande, solde à J-{settings.balanceDaysBefore} ; bloc « Bon pour accord ».</div>
              <FormField label="Notes (imprimées sur le devis)" htmlFor="q-notes" className="sm:col-span-2">
                <Textarea id="q-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20" placeholder="Périmètre, logistique (hébergement, restauration), options…" />
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
                Numéro du devis : <span className="font-mono font-medium text-foreground">{next}</span>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => save(true)}>
                  <Send aria-hidden="true" /> Enregistrer et envoyer
                </Button>
                <Button variant="secondary" onClick={() => save(false)}>
                  <Save aria-hidden="true" /> Enregistrer
                </Button>
                <LinkButton href={existing ? `/facturation/devis/${existing.id}` : "/facturation?onglet=devis"} variant="ghost">
                  Annuler
                </LinkButton>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function QuoteEditorPage({ quoteId, prefill }: { quoteId?: string; prefill?: QuotePrefill }) {
  const existing = useEntity("quotes", quoteId);
  const deal = useEntity("deals", existing ? undefined : prefill?.dealId);
  const settings = useSettings();
  const now = useNow();
  const { canEdit } = useSession();
  const [initial] = React.useState(() => buildInitial(existing, prefill, deal, settings, now));

  if (!canEdit("facturation")) {
    return <EmptyState icon={Lock} title="Lecture seule" description="Votre rôle permet de consulter les devis, pas d'en créer." className="mt-10" action={<LinkButton href="/facturation?onglet=devis" variant="secondary" size="sm">Retour aux devis</LinkButton>} />;
  }
  if (quoteId && !existing) {
    return <EmptyState icon={FileX2} title="Devis introuvable" className="mt-10" action={<LinkButton href="/facturation?onglet=devis" variant="secondary" size="sm">Retour aux devis</LinkButton>} />;
  }
  if (existing && existing.status !== "brouillon") {
    return (
      <EmptyState
        icon={Lock}
        title={`Devis ${existing.number} déjà envoyé`}
        description="Un devis transmis au client ne se modifie plus : dupliquez-le pour préparer une nouvelle version."
        className="mt-10"
        action={<LinkButton href={`/facturation/devis/${existing.id}`} size="sm">Ouvrir le devis</LinkButton>}
      />
    );
  }
  return <QuoteForm key={existing?.id ?? "new"} initial={initial} existing={existing} />;
}
