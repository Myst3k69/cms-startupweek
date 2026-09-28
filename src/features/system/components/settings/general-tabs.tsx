"use client";

import * as React from "react";
import { z } from "zod";
import { format, parseISO, isValid } from "date-fns";
import { CalendarCheck2, Info, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, DescriptionList, FormField, Input, Select, Switch, Textarea } from "@/components/ui";
import { useCollection, useNow } from "@/lib/hooks";
import { daysUntil } from "@/lib/domain/selectors";
import { date } from "@/lib/format";
import { FormCard, useSettingsDraft } from "./form-card";

/* ───────────────────────────── Organisation ───────────────────────────── */

const ORG_KEYS = ["legalName", "brand", "siret", "nda", "address", "email", "phone", "website"] as const;
const orgSchema = z.object({
  legalName: z.string().trim().min(2, { error: "Raison sociale requise" }),
  brand: z.string().trim().min(2, { error: "Nom de marque requis" }),
  siret: z.string().refine((v) => v.trim() === "" || /^\d{14}$/.test(v.replace(/\s/g, "")), { error: "SIRET : 14 chiffres" }),
  nda: z.string(),
  address: z.string().trim().min(5, { error: "Adresse du siège requise (mentions légales)" }),
  email: z.email({ error: "Email invalide" }),
  phone: z.string(),
  website: z.url({ error: "URL invalide (https://…)" }),
});

export function OrganizationTab() {
  const { draft, set, errors, dirty, reset, save, editable } = useSettingsDraft(ORG_KEYS, orgSchema);
  const ndaOk = /^\d{11}$/.test(draft.nda.replace(/\s/g, ""));
  return (
    <FormCard
      title="Organisation"
      description="Identité légale reprise sur les factures, conventions, attestations et mentions du site."
      dirty={dirty}
      editable={editable}
      onReset={reset}
      onSave={() => save("Organisation enregistrée")}
      aside={
        <Card>
          <CardHeader>
            <CardTitle>Aperçu en-tête de document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p className="text-sm font-semibold text-foreground">{draft.brand || "—"}</p>
            <p>{draft.legalName}</p>
            <p>{draft.address}</p>
            <p>
              SIRET {draft.siret || "—"} · NDA {draft.nda || "—"}
            </p>
            <p>
              {draft.email} · {draft.phone}
            </p>
            <p>{draft.website}</p>
            {!ndaOk ? (
              <p className="mt-2 flex items-start gap-1.5 rounded bg-warning-soft px-2 py-1.5 text-warning-text">
                <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                NDA à compléter (11 chiffres, délivré par le SRC de la DREETS) : obligatoire sur les conventions et prérequis de Qualiopi.
              </p>
            ) : null}
          </CardContent>
        </Card>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Raison sociale" htmlFor="st-legal" error={errors.legalName}>
          <Input id="st-legal" value={draft.legalName} disabled={!editable} onChange={(e) => set("legalName", e.target.value)} />
        </FormField>
        <FormField label="Marque" htmlFor="st-brand" error={errors.brand}>
          <Input id="st-brand" value={draft.brand} disabled={!editable} onChange={(e) => set("brand", e.target.value)} />
        </FormField>
        <FormField label="SIRET" htmlFor="st-siret" error={errors.siret}>
          <Input id="st-siret" value={draft.siret} disabled={!editable} inputMode="numeric" onChange={(e) => set("siret", e.target.value)} />
        </FormField>
        <FormField label="N° de déclaration d'activité (NDA)" htmlFor="st-nda" hint="Organisme de formation — 11 chiffres">
          <Input id="st-nda" value={draft.nda} disabled={!editable} onChange={(e) => set("nda", e.target.value)} />
        </FormField>
      </div>
      <FormField label="Adresse du siège" htmlFor="st-address" error={errors.address}>
        <Input id="st-address" value={draft.address} disabled={!editable} onChange={(e) => set("address", e.target.value)} />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Email de contact" htmlFor="st-email" error={errors.email}>
          <Input id="st-email" type="email" value={draft.email} disabled={!editable} onChange={(e) => set("email", e.target.value)} />
        </FormField>
        <FormField label="Téléphone" htmlFor="st-phone">
          <Input id="st-phone" type="tel" value={draft.phone} disabled={!editable} onChange={(e) => set("phone", e.target.value)} />
        </FormField>
        <FormField label="Site web" htmlFor="st-web" error={errors.website}>
          <Input id="st-web" type="url" value={draft.website} disabled={!editable} onChange={(e) => set("website", e.target.value)} />
        </FormField>
      </div>
    </FormCard>
  );
}

/* ───────────────────────────── Facturation ───────────────────────────── */

const BILLING_KEYS = ["invoicePrefix", "quotePrefix", "paymentTermsDays", "depositPercent", "balanceDaysBefore", "vatExempt", "iban", "latePenaltyText"] as const;
const billingSchema = z.object({
  invoicePrefix: z.string().regex(/^[A-Z0-9]{1,6}$/, { error: "Préfixe : 1 à 6 lettres majuscules / chiffres" }),
  quotePrefix: z.string().regex(/^[A-Z0-9]{1,6}$/, { error: "Préfixe : 1 à 6 lettres majuscules / chiffres" }),
  paymentTermsDays: z.number().int().min(0, { error: "Délai ≥ 0" }).max(60, { error: "60 jours maximum (art. L.441-10)" }),
  depositPercent: z.number().int().min(0).max(100, { error: "Entre 0 et 100 %" }),
  balanceDaysBefore: z.number().int().min(0).max(120, { error: "Entre 0 et 120 jours" }),
  vatExempt: z.boolean(),
  iban: z.string().refine((v) => v.includes("•") || v.trim() === "" || /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v.replace(/\s/g, "").toUpperCase()), { error: "IBAN invalide" }),
  latePenaltyText: z.string().trim().min(20, { error: "Mentions de pénalités obligatoires sur les factures B2B" }),
});

export function BillingTab() {
  const { draft, set, errors, dirty, reset, save, editable } = useSettingsDraft(BILLING_KEYS, billingSchema);
  const invoices = useCollection("invoices");
  const now = useNow();
  const year = new Date(now).getFullYear();
  const nextInvoice = React.useMemo(() => {
    const re = new RegExp(`^${draft.invoicePrefix}-${year}-(\\d+)$`);
    const max = invoices.reduce((m, i) => {
      const r = re.exec(i.number);
      return r ? Math.max(m, Number(r[1])) : m;
    }, 0);
    return `${draft.invoicePrefix}-${year}-${String(max + 1).padStart(4, "0")}`;
  }, [invoices, draft.invoicePrefix, year]);
  const num = (v: string) => (v === "" ? 0 : Math.round(Number(v)));

  return (
    <FormCard
      title="Facturation"
      description="Numérotation légale, conditions générales de vente (acompte / solde) et mentions obligatoires."
      dirty={dirty}
      editable={editable}
      onReset={reset}
      onSave={() => save("Paramètres de facturation enregistrés")}
      aside={
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Aperçu</CardTitle>
              <CardDescription>Appliqué aux prochains documents</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DescriptionList
              items={[
                { label: "Prochaine facture", value: <span className="font-mono">{nextInvoice}</span> },
                { label: "Prochain devis", value: <span className="font-mono">{`${draft.quotePrefix}-${year}-####`}</span> },
                { label: "Échéancier B2C (CGV)", value: `Acompte ${draft.depositPercent} % à l'inscription, solde ${100 - draft.depositPercent} % exigible à J-${draft.balanceDaysBefore}` },
                { label: "Paiement B2B", value: `À ${draft.paymentTermsDays} jours date de facture` },
                { label: "Mention TVA", value: draft.vatExempt ? "TVA non applicable — art. 261-4-4° a du CGI" : "TVA 20 %" },
              ]}
            />
          </CardContent>
        </Card>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Préfixe des factures" htmlFor="st-inv" error={errors.invoicePrefix} hint="Séquence continue par année, sans trou">
          <Input id="st-inv" value={draft.invoicePrefix} disabled={!editable} onChange={(e) => set("invoicePrefix", e.target.value.toUpperCase())} className="font-mono" />
        </FormField>
        <FormField label="Préfixe des devis" htmlFor="st-quo" error={errors.quotePrefix}>
          <Input id="st-quo" value={draft.quotePrefix} disabled={!editable} onChange={(e) => set("quotePrefix", e.target.value.toUpperCase())} className="font-mono" />
        </FormField>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Acompte à l'inscription (%)" htmlFor="st-dep" error={errors.depositPercent}>
          <Input id="st-dep" type="number" min={0} max={100} value={draft.depositPercent} disabled={!editable} onChange={(e) => set("depositPercent", num(e.target.value))} />
        </FormField>
        <FormField label="Solde exigible à J-" htmlFor="st-bal" error={errors.balanceDaysBefore} hint="Jours avant le début">
          <Input id="st-bal" type="number" min={0} value={draft.balanceDaysBefore} disabled={!editable} onChange={(e) => set("balanceDaysBefore", num(e.target.value))} />
        </FormField>
        <FormField label="Délai de paiement B2B (jours)" htmlFor="st-terms" error={errors.paymentTermsDays}>
          <Input id="st-terms" type="number" min={0} value={draft.paymentTermsDays} disabled={!editable} onChange={(e) => set("paymentTermsDays", num(e.target.value))} />
        </FormField>
      </div>
      <div className="flex items-start justify-between gap-4 rounded-md border border-border px-3 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Exonération de TVA (formation professionnelle continue)</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Art. 261-4-4° a du CGI : suppose un NDA enregistré et une attestation d'exonération. Les factures portent alors « TVA non applicable ».</p>
        </div>
        <Switch checked={draft.vatExempt} onChange={(v) => set("vatExempt", v)} disabled={!editable} label="Exonération de TVA" />
      </div>
      <FormField label="IBAN" htmlFor="st-iban" error={errors.iban} hint="Affiché sur les factures pour les virements">
        <Input id="st-iban" value={draft.iban} disabled={!editable} onChange={(e) => set("iban", e.target.value)} className="font-mono" />
      </FormField>
      <FormField label="Pénalités de retard et indemnité forfaitaire" htmlFor="st-pen" error={errors.latePenaltyText}>
        <Textarea id="st-pen" value={draft.latePenaltyText} disabled={!editable} onChange={(e) => set("latePenaltyText", e.target.value)} className="min-h-28" />
      </FormField>
    </FormCard>
  );
}

/* ───────────────────────────── Qualiopi ───────────────────────────── */

const QUALIOPI_KEYS = ["qualityLeadId", "disabilityLeadId", "auditDate", "auditBody", "newcomer", "complaintAckHours", "slaHours", "satisfactionFormUrl"] as const;
const qualiopiSchema = z.object({
  qualityLeadId: z.string({ error: "Désignez un référent qualité" }).min(1, { error: "Désignez un référent qualité" }),
  disabilityLeadId: z.string({ error: "Désignez un référent handicap (ind. 26)" }).min(1, { error: "Désignez un référent handicap (ind. 26)" }),
  auditDate: z.string().optional(),
  auditBody: z.string().optional(),
  newcomer: z.boolean(),
  complaintAckHours: z.number().int().min(1, { error: "Au moins 1 h" }).max(240, { error: "10 jours maximum" }),
  slaHours: z.number().int().min(1, { error: "Au moins 1 h" }).max(240, { error: "10 jours maximum" }),
  satisfactionFormUrl: z.string().trim().refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), { error: "Adresse web complète attendue (https://…)" }),
});

function isoToDay(iso?: string) {
  if (!iso) return "";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "yyyy-MM-dd") : "";
}

export function QualiopiTab() {
  const { draft, set, errors, dirty, reset, save, editable } = useSettingsDraft(QUALIOPI_KEYS, qualiopiSchema);
  const users = useCollection("users");
  const now = useNow();
  const options = React.useMemo(() => users.filter((u) => u.active).map((u) => ({ value: u.id, label: `${u.name} — ${u.title}` })), [users]);
  const d = draft.auditDate ? daysUntil(draft.auditDate, now) : undefined;
  const num = (v: string) => (v === "" ? 0 : Math.round(Number(v)));

  return (
    <FormCard
      title="Qualiopi"
      description="Référents, audit et engagements de délais — repris dans le livret d'accueil, les CGV et le tableau de bord qualité."
      dirty={dirty}
      editable={editable}
      onReset={reset}
      onSave={() => save("Paramètres Qualiopi enregistrés")}
      aside={
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck2 className="size-4 text-accent-text" aria-hidden="true" /> Audit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {draft.auditDate ? (
              <>
                <p className="tabular text-2xl font-semibold tracking-tight text-foreground">{d !== undefined && d >= 0 ? `J-${d}` : "Passé"}</p>
                <p className="text-muted-foreground">
                  {draft.newcomer ? "Audit initial" : "Audit"} le {date(draft.auditDate, "EEEE d MMMM yyyy")}
                  {draft.auditBody ? ` · ${draft.auditBody}` : ""}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Aucune date d'audit fixée.</p>
            )}
            <p className="flex items-start gap-1.5 rounded bg-surface-2 px-2 py-1.5 text-xs text-muted-foreground">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              {draft.newcomer
                ? "Nouvel entrant : certains indicateurs (2, 3, 11, 13, 19, 22, 24-26, 32) ne sont audités qu'en mise en œuvre lors de l'audit de surveillance."
                : "Tous les indicateurs applicables sont audités (disposition + mise en œuvre)."}
            </p>
          </CardContent>
        </Card>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Référent qualité" htmlFor="st-ql" error={errors.qualityLeadId}>
          <Select id="st-ql" value={draft.qualityLeadId ?? ""} disabled={!editable} placeholder="À désigner" options={options} onChange={(e) => set("qualityLeadId", e.target.value || undefined)} />
        </FormField>
        <FormField label="Référent(e) handicap" htmlFor="st-dl" error={errors.disabilityLeadId} hint="Indicateur 26 — contact affiché sur le site">
          <Select id="st-dl" value={draft.disabilityLeadId ?? ""} disabled={!editable} placeholder="À désigner" options={options} onChange={(e) => set("disabilityLeadId", e.target.value || undefined)} />
        </FormField>
        <FormField label="Date d'audit" htmlFor="st-audit">
          <Input
            id="st-audit"
            type="date"
            value={isoToDay(draft.auditDate)}
            disabled={!editable}
            onChange={(e) => set("auditDate", e.target.value ? new Date(`${e.target.value}T09:00:00`).toISOString() : undefined)}
          />
        </FormField>
        <FormField label="Organisme certificateur" htmlFor="st-body">
          <Input id="st-body" value={draft.auditBody ?? ""} disabled={!editable} onChange={(e) => set("auditBody", e.target.value || undefined)} placeholder="Accrédité COFRAC" />
        </FormField>
      </div>
      <div className="flex items-start justify-between gap-4 rounded-md border border-border px-3 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Nouvel entrant</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Premier audit de certification sans session réalisée sur tout le périmètre audité.</p>
        </div>
        <Switch checked={draft.newcomer} onChange={(v) => set("newcomer", v)} disabled={!editable} label="Nouvel entrant" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Délai de réponse aux demandes (heures)" htmlFor="st-sla" error={errors.slaHours} hint="Promesse « réponse sous 48 h » du site — alertes et tâches automatiques">
          <Input id="st-sla" type="number" min={1} value={draft.slaHours} disabled={!editable} onChange={(e) => set("slaHours", num(e.target.value))} />
        </FormField>
        <FormField label="Accusé de réception des réclamations (heures)" htmlFor="st-ack" error={errors.complaintAckHours} hint="Indicateur 31 — engagement affiché dans la procédure réclamations">
          <Input id="st-ack" type="number" min={1} value={draft.complaintAckHours} disabled={!editable} onChange={(e) => set("complaintAckHours", num(e.target.value))} />
        </FormField>
      </div>
      <FormField
        label="Questionnaire de satisfaction à chaud"
        htmlFor="st-satisfaction"
        error={errors.satisfactionFormUrl}
        hint="Lien de votre formulaire (Tally, Google Forms…) envoyé aux participants en fin de session — indicateur 30. Le code de session et l'identifiant du participant sont ajoutés au lien."
      >
        <Input id="st-satisfaction" type="url" value={draft.satisfactionFormUrl} disabled={!editable} onChange={(e) => set("satisfactionFormUrl", e.target.value)} placeholder="https://tally.so/r/…" />
      </FormField>
    </FormCard>
  );
}
