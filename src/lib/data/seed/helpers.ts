/**
 * Outils du jeu de démo : PRNG déterministe, horloge relative, montants.
 *
 * Tout est déterministe : jamais de Math.random ni de Date.now() ici.
 * Les dates « réelles » (calendrier Airtable) sont exprimées par rapport au jour de référence
 * 2026-09-26 puis recalées sur `now` : la démo colle à la réalité aujourd'hui
 * et reste « vivante » (mêmes écarts relatifs) quand on la régénère plus tard.
 */
import type { ISODate, LineItem } from "../../domain/types";

export const MIN = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

/** Jour de référence réel de la démo (minuit UTC). */
export const REF_DAY_UTC = Date.UTC(2026, 8, 26);

/* ───────────────────────────── PRNG ───────────────────────────── */

/** mulberry32 : générateur 32 bits rapide et reproductible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash FNV-1a d'un libellé → graine (permet des flux indépendants par module). */
export function hashSeed(label: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export class Rng {
  private readonly nextFn: () => number;
  constructor(seed: number | string) {
    this.nextFn = mulberry32(typeof seed === "string" ? hashSeed(seed) : seed);
  }
  /** Flux dérivé indépendant (ajouter un tirage dans un module ne décale pas les autres). */
  fork(label: string): Rng {
    return new Rng(hashSeed(label) ^ Math.floor(this.nextFn() * 0xffffffff));
  }
  next(): number {
    return this.nextFn();
  }
  /** Entier dans [min, max] (bornes incluses). */
  between(min: number, max: number): number {
    return min + Math.floor(this.nextFn() * (max - min + 1));
  }
  float(min: number, max: number): number {
    return min + this.nextFn() * (max - min);
  }
  chance(p: number): boolean {
    return this.nextFn() < p;
  }
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.nextFn() * items.length)];
  }
  /** n éléments distincts. */
  pickN<T>(items: readonly T[], n: number): T[] {
    return this.shuffle(items).slice(0, Math.min(n, items.length));
  }
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    const total = entries.reduce((acc, [, w]) => acc + w, 0);
    let r = this.nextFn() * total;
    for (const [value, w] of entries) {
      r -= w;
      if (r < 0) return value;
    }
    return entries[entries.length - 1][0];
  }
  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.nextFn() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  alnum(n: number): string {
    let s = "";
    for (let i = 0; i < n; i++) s += ALNUM[Math.floor(this.nextFn() * ALNUM.length)];
    return s;
  }
  hex(n: number): string {
    let s = "";
    for (let i = 0; i < n; i++) s += Math.floor(this.nextFn() * 16).toString(16);
    return s;
  }
  digits(n: number): string {
    let s = "";
    for (let i = 0; i < n; i++) s += Math.floor(this.nextFn() * 10).toString();
    return s;
  }
}

/* ───────────────────────────── Horloge ───────────────────────────── */

/** Décalage approximatif Europe/Paris (heure d'été d'avril à octobre). */
function parisOffsetHours(ts: number): number {
  const m = new Date(ts).getUTCMonth();
  return m >= 3 && m <= 9 ? 2 : 1;
}

export class Clock {
  readonly now: number;
  /** Minuit UTC du jour de `now`. */
  readonly today0: number;

  constructor(now: number) {
    this.now = now;
    this.today0 = Math.floor(now / DAY) * DAY;
  }

  /** Nombre de jours entre le 2026-09-26 et une date réelle (« 2026-10-05 » → 9). */
  static daysFromRef(ymd: string): number {
    const [y, m, d] = ymd.split("-").map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - REF_DAY_UTC) / DAY);
  }

  /** Timestamp relatif à aujourd'hui (jours, heure de Paris). */
  rel(days: number, hh = 10, mm = 0): number {
    const base = this.today0 + Math.round(days) * DAY;
    return base + (hh - parisOffsetHours(base)) * HOUR + mm * MIN;
  }

  /** Date réelle (calendrier 2026) recalée sur `now` (heure de Paris). */
  real(ymd: string, hh = 9, mm = 0): number {
    return this.rel(Clock.daysFromRef(ymd), hh, mm);
  }

  /** Instant passé : `now` moins une durée (ms). */
  ago(ms: number): number {
    return this.now - ms;
  }

  /** Borne un instant au passé (≤ now − marge) : évite les « événements du futur » déjà réalisés. */
  past(ts: number, marginMs = 20 * MIN): number {
    return Math.min(ts, this.now - marginMs);
  }

  iso(ts: number): ISODate {
    return new Date(ts).toISOString();
  }

  /** Jour calendaire YYYY-MM-DD (Attendance.date, TrafficDay.date). */
  ymd(ts: number): string {
    return new Date(ts).toISOString().slice(0, 10);
  }

  isPast(ts: number): boolean {
    return ts <= this.now;
  }

  year(ts: number): number {
    return new Date(ts).getUTCFullYear();
  }
}

/* ───────────────────────────── Montants ───────────────────────────── */

/** Prix TTC (site B2C) → HT arrondi au centime (TVA 20 %). */
export function htFromTtc(ttcCents: number): number {
  return Math.round(ttcCents / 1.2);
}

/** Total TTC d'une ligne (HT + TVA arrondie). */
export function lineTotalCents(line: LineItem): number {
  const base = Math.round(line.quantity * line.unitPriceCents);
  return base + Math.round((base * line.vatRate) / 100);
}

export function linesTotalCents(lines: LineItem[]): number {
  return lines.reduce((acc, l) => acc + lineTotalCents(l), 0);
}

/** Frais Stripe cartes UE ≈ 1,5 % + 0,25 €. */
export function stripeFee(amountCents: number): number {
  return Math.round(amountCents * 0.015) + 25;
}

/* ───────────────────────────── Divers ───────────────────────────── */

export function pad(n: number, width = 4): string {
  return String(n).padStart(width, "0");
}

/** Slug ASCII pour identifiants / emails. */
export function slug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Clé d'email : « Élodie » → « elodie », « Le Gall » → « legall ». */
export function emailPart(input: string): string {
  return slug(input).replace(/-/g, "");
}

export function sortBy<T>(items: T[], key: (item: T) => number | string): T[] {
  return items.slice().sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}
