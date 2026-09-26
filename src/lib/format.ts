import { differenceInCalendarDays, format, formatDistanceStrict, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { Cents, LineItem } from "./domain/types";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("fr-FR");
const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });

/** 235000 → « 2 350 € » ; precise=true → « 2 350,00 € » (factures). */
export function money(cents: Cents | undefined | null, precise = false): string {
  const v = (cents ?? 0) / 100;
  return (precise ? eur2 : eur).format(v);
}

/** Montant compact : 1 284 000 € → « 1,3 M € ». */
export function moneyCompact(cents: Cents): string {
  const v = cents / 100;
  if (Math.abs(v) < 10000) return eur.format(v);
  return `${compact.format(v)} €`;
}

export function number(n: number | undefined | null): string {
  return num.format(n ?? 0);
}

export function compactNumber(n: number): string {
  return compact.format(n);
}

export function percent(n: number, digits = 0): string {
  return `${n.toFixed(digits).replace(".", ",")} %`;
}

function toDate(iso: string | Date | undefined | null): Date | null {
  if (!iso) return null;
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return isValid(d) ? d : null;
}

/** « 24 oct. 2026 » */
export function date(iso: string | undefined | null, pattern = "d MMM yyyy"): string {
  const d = toDate(iso);
  return d ? format(d, pattern, { locale: fr }) : "—";
}

/** « 24 oct. 2026 · 14:30 » */
export function dateTime(iso: string | undefined | null): string {
  return date(iso, "d MMM yyyy · HH:mm");
}

/** « 24 → 31 oct. 2026 » */
export function dateRange(start: string, end: string): string {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return "—";
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${format(s, "d", { locale: fr })} → ${format(e, "d MMM yyyy", { locale: fr })}`;
  }
  return `${format(s, "d MMM", { locale: fr })} → ${format(e, "d MMM yyyy", { locale: fr })}`;
}

/** « il y a 3 jours » / « dans 2 heures » — `now` est passé explicitement (rendu pur). */
export function relative(iso: string | undefined | null, now: number): string {
  const d = toDate(iso);
  if (!d) return "—";
  const diff = d.getTime() - now;
  if (Math.abs(diff) < 60_000) return "à l'instant";
  const dist = formatDistanceStrict(d, now, { locale: fr, roundingMethod: "floor" });
  return diff < 0 ? `il y a ${dist}` : `dans ${dist}`;
}

/** Nombre de jours calendaires entre maintenant et la date (négatif = passé). */
export function daysFrom(iso: string | undefined | null, now: number): number {
  const d = toDate(iso);
  if (!d) return 0;
  return differenceInCalendarDays(d, now);
}

export function isoDay(ts: number | Date): string {
  return format(ts, "yyyy-MM-dd");
}

/* ───────────── Facturation ───────────── */

export function lineTotal(l: LineItem) {
  const ht = Math.round(l.quantity * l.unitPriceCents);
  const vat = Math.round((ht * l.vatRate) / 100);
  return { ht, vat, ttc: ht + vat };
}

export function totals(lines: LineItem[]) {
  return lines.reduce(
    (acc, l) => {
      const t = lineTotal(l);
      return { ht: acc.ht + t.ht, vat: acc.vat + t.vat, ttc: acc.ttc + t.ttc };
    },
    { ht: 0, vat: 0, ttc: 0 },
  );
}

export function fullName(p: { firstName?: string; lastName?: string } | undefined | null): string {
  if (!p) return "—";
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || "—";
}
