/**
 * Facturation — dérivations pures (aucun accès au store, `now` toujours passé explicitement).
 * Partagées par la vue d'ensemble, les listes, les fiches, l'éditeur et les documents imprimables.
 */
import type {
  Application,
  Contact,
  EventSession,
  ID,
  Invoice,
  LineItem,
  Offer,
  Organization,
  Payment,
  PaymentMethod,
  Quote,
  QuoteStatus,
  Settings,
} from "@/lib/domain/types";
import { invoiceBalance, invoiceTotal, receivables } from "@/lib/domain/selectors";
import { lineTotal } from "@/lib/format";

export const DAY = 86_400_000;
const ts = (iso?: string) => (iso ? new Date(iso).getTime() : NaN);

/* ───────────────────────────── Lookups ───────────────────────────── */

export interface BillingLookups {
  contacts: Map<ID, Contact>;
  orgs: Map<ID, Organization>;
  events: Map<ID, EventSession>;
  applications: Map<ID, Application>;
}

/** Nom affiché du client d'une pièce (organisation prioritaire, sinon contact). */
export function partyName(doc: { orgId?: ID; contactId?: ID }, lk: Pick<BillingLookups, "contacts" | "orgs">): string {
  const org = doc.orgId ? lk.orgs.get(doc.orgId) : undefined;
  if (org) return org.name;
  const c = doc.contactId ? lk.contacts.get(doc.contactId) : undefined;
  return c ? `${c.firstName} ${c.lastName}`.trim() : "Client non renseigné";
}

/* ───────────────────────────── Pièces ───────────────────────────── */

/** Une pièce numérotée = émise (le brouillon n'a pas encore de numéro légal). */
export const isNumbered = (inv: Invoice) => inv.status !== "brouillon" && inv.number !== "";

export const displayNumber = (doc: { number: string }) => doc.number || "Brouillon";

/** Facture sur laquelle un encaissement est encore attendu. */
export function isCollectible(inv: Invoice) {
  return inv.kind !== "avoir" && isNumbered(inv) && inv.status !== "annulee" && inv.status !== "payee" && invoiceBalance(inv) > 0;
}

/** Statut effectif d'un devis : un devis envoyé dont la validité est dépassée est « expiré ». */
export function effectiveQuoteStatus(q: Quote, now: number): QuoteStatus {
  if (q.status === "envoye" && ts(q.validUntil) < now) return "expire";
  return q.status;
}

export function quoteTotal(q: Pick<Quote, "lines">) {
  return invoiceTotal({ lines: q.lines, kind: "facture" });
}

/** Ventilation de la TVA par taux (mention obligatoire quand plusieurs taux coexistent). */
export function vatBreakdown(lines: LineItem[]) {
  const map = new Map<number, { rate: number; base: number; vat: number }>();
  for (const l of lines) {
    const t = lineTotal(l);
    const cur = map.get(l.vatRate) ?? { rate: l.vatRate, base: 0, vat: 0 };
    cur.base += t.ht;
    cur.vat += t.vat;
    map.set(l.vatRate, cur);
  }
  return [...map.values()].sort((a, b) => b.rate - a.rate);
}

/* ───────────────────────────── Identité légale ───────────────────────────── */

/** SIREN (9 chiffres) extrait d'un SIRET. */
export function sirenFromSiret(siret: string) {
  const digits = siret.replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(0, 9) : "";
}

/**
 * N° de TVA intracommunautaire français calculé depuis le SIREN : FR + clé + SIREN,
 * clé = (12 + 3 × (SIREN mod 97)) mod 97. (Settings ne porte pas encore de champ dédié.)
 */
export function vatNumberFromSiret(siret: string) {
  const siren = sirenFromSiret(siret);
  if (!siren) return "";
  const key = (12 + 3 * (Number(siren) % 97)) % 97;
  return `FR${String(key).padStart(2, "0")}${siren}`;
}

/** Ville du greffe (RCS) déduite de l'adresse du siège (« 75002 Paris » → « Paris »). */
export function rcsCity(address: string) {
  const m = /\b\d{5}\s+([A-Za-zÀ-ÿ' -]+)\s*$/.exec(address.trim());
  return m ? m[1].trim() : "";
}

export function legalIdentity(settings: Settings) {
  const siren = sirenFromSiret(settings.siret);
  const city = rcsCity(settings.address);
  const ndaKnown = !!settings.nda && !/compl[ée]ter/i.test(settings.nda);
  return {
    siren,
    vatNumber: vatNumberFromSiret(settings.siret),
    rcs: siren ? `RCS ${city || "—"} ${siren.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}` : "",
    nda: ndaKnown ? settings.nda : "",
  };
}

export const VAT_EXEMPTION_TEXT = "Exonération de TVA, art. 261-4-4° a du CGI (formation professionnelle continue).";
export const NO_DISCOUNT_TEXT = "Pas d'escompte pour paiement anticipé.";

/* ───────────────────────────── Paiements ───────────────────────────── */

/** Regroupement des moyens de paiement pour les graphiques (ordre de série fixe). */
export const METHOD_GROUPS: { key: "stripe" | "virement" | "opco" | "autre"; label: string; methods: PaymentMethod[] }[] = [
  { key: "stripe", label: "Stripe", methods: ["stripe"] },
  { key: "virement", label: "Virement", methods: ["virement"] },
  { key: "opco", label: "OPCO", methods: ["opco"] },
  { key: "autre", label: "Autres (CB, chèque)", methods: ["cb_terminal", "cheque"] },
];

export function paymentsOf(invoiceId: ID, payments: Payment[]) {
  return payments.filter((p) => p.invoiceId === invoiceId).sort((a, b) => ts(b.receivedAt) - ts(a.receivedAt));
}

/**
 * DSO (Days Sales Outstanding) : créances ouvertes / CA TTC facturé sur 90 jours × 90.
 * `null` si aucun CA sur la période (indicateur non significatif).
 */
export function estimateDso(invoices: Invoice[], now: number) {
  const from = now - 90 * DAY;
  const billed = invoices
    .filter((i) => isNumbered(i) && ts(i.issuedAt) >= from && ts(i.issuedAt) <= now)
    .reduce((s, i) => s + invoiceTotal(i).ttc, 0);
  if (billed <= 0) return null;
  return Math.round((receivables(invoices, now).total / billed) * 90);
}

/** Délai moyen constaté entre émission et encaissement complet (factures soldées sur 12 mois). */
export function averagePaymentDelay(invoices: Invoice[], payments: Payment[], now: number) {
  const from = now - 365 * DAY;
  const lastPay = new Map<ID, number>();
  for (const p of payments) {
    if (p.status !== "reussi") continue;
    lastPay.set(p.invoiceId, Math.max(lastPay.get(p.invoiceId) ?? 0, ts(p.receivedAt)));
  }
  const delays = invoices
    .filter((i) => i.status === "payee" && i.kind !== "avoir" && ts(i.issuedAt) >= from && lastPay.has(i.id))
    .map((i) => Math.max(0, (lastPay.get(i.id)! - ts(i.issuedAt)) / DAY));
  if (!delays.length) return null;
  return Math.round(delays.reduce((a, b) => a + b, 0) / delays.length);
}

/* ───────────────────────────── Relances ───────────────────────────── */

export interface ReminderStep {
  level: 1 | 2 | 3;
  day: number;
  title: string;
  detail: string;
}

/** Séquence de relance des impayés (J+ = jours après l'échéance). */
export const REMINDER_STEPS: ReminderStep[] = [
  { level: 1, day: 3, title: "Rappel courtois", detail: "Email automatique avec le lien de paiement" },
  { level: 2, day: 10, title: "Relance ferme", detail: "Email + tâche d'appel au client" },
  { level: 3, day: 30, title: "Mise en demeure", detail: "LRAR : pénalités de retard + indemnité de 40 €" },
];

export const REMINDER_LEVEL_LABELS = ["Aucune relance", "Rappel (J+3)", "Relance ferme (J+10)", "Mise en demeure (J+30)"];

export function reminderInfo(inv: Invoice, now: number) {
  const due = ts(inv.dueAt);
  const daysLate = Math.floor((now - due) / DAY);
  const level = Math.min(inv.remindersSent, 3);
  const next = REMINDER_STEPS.find((s) => s.level === level + 1);
  const nextAt = next ? due + next.day * DAY : undefined;
  return { daysLate, level, next, nextAt, nextDue: !!next && daysLate >= next.day };
}

/* ───────────────────────────── Saisie ───────────────────────────── */

/** Texte comparable : sans accents, minuscules, ponctuation remplacée par des espaces. */
export function normalizeText(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Montant saisi (« 1 234,56 », « 1234.56 », « 1.234,56 € ») → centimes, ou null si illisible. */
export function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.replace(/[\s  €]/g, "").replace(/'/g, "");
  if (!cleaned) return null;
  // « 1.234,56 » → « 1234.56 » ; « 1234,56 » → « 1234.56 » ; « 1234.56 » inchangé.
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  if (!/^[-+]?\d+(\.\d+)?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/* ───────────────────────────── Numérotation ───────────────────────────── */

/** Contrôle de la séquence légale : ruptures (numéros manquants) par année. */
export function numberingAudit(invoices: Invoice[], prefix: string) {
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d{4})-(\\d+)$`);
  const byYear = new Map<string, number[]>();
  for (const inv of invoices) {
    const m = re.exec(inv.number);
    if (!m) continue;
    const list = byYear.get(m[1]) ?? [];
    list.push(Number(m[2]));
    byYear.set(m[1], list);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, nums]) => {
      const sorted = [...new Set(nums)].sort((a, b) => a - b);
      const max = sorted[sorted.length - 1] ?? 0;
      const present = new Set(sorted);
      const missing: number[] = [];
      for (let n = 1; n <= max; n++) if (!present.has(n)) missing.push(n);
      return { year, count: sorted.length, max, missing, duplicates: nums.length - sorted.length };
    });
}

/* ───────────────────────────── Catalogue ───────────────────────────── */

/** Convention catalogue : prix public TTC pour le B2C, HT pour le B2B (écoles, entreprises). */
export const isB2bOffer = (o: Pick<Offer, "kind">) => o.kind === "ecole" || o.kind === "entreprise";

/** Ligne de facture HT depuis une offre du catalogue (exonération appliquée si l'organisme est exonéré). */
export function lineFromOffer(offer: Offer, vatExempt: boolean, id: ID): LineItem {
  const vatRate = vatExempt ? 0 : offer.vatRate;
  // B2C : prix TTC → HT (si exonéré, le prix payé reste le même et devient la base HT, comme lineFromTtc).
  const unit = isB2bOffer(offer) || !vatRate ? offer.priceCents : Math.round(offer.priceCents / (1 + vatRate / 100));
  return { id, label: offer.code ? `${offer.name} (${offer.code})` : offer.name, quantity: 1, unitPriceCents: unit, vatRate };
}

/* ───────────────────────────── Divers ───────────────────────────── */

/** Saisie monétaire « 1 234,56 » ↔ centimes. */
export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function isoDateInput(iso: string | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** « 2026-10-12 » (input date) → ISO à midi local (évite les décalages de fuseau). */
export function dateInputToIso(v: string) {
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

export function csvCell(v: string | number) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const content = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Montant comptable « 1234,56 » (export expert-comptable). */
export const accountingAmount = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** Aperçu (sans réservation) du prochain numéro de la séquence — même règle que nextNumber(). */
export function previewNextNumber(numbers: string[], prefix: string, year: number) {
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-${year}-(\\d+)$`);
  const max = numbers.reduce((m, n) => {
    const r = re.exec(n);
    return r ? Math.max(m, Number(r[1])) : m;
  }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}

/** Ligne HT depuis un prix TTC (règle de lineFromTtc, version pure pour les valeurs initiales). */
export function ttcLine(id: ID, label: string, ttcCents: number, vatExempt: boolean): LineItem {
  const vatRate = vatExempt ? 0 : 20;
  return { id, label, quantity: 1, unitPriceCents: vatRate ? Math.round(ttcCents / (1 + vatRate / 100)) : ttcCents, vatRate };
}
