/**
 * Sécurité des points d'entrée publics (formulaires du site, webhooks).
 *
 * Corrige les faiblesses des webhooks n8n : signature HMAC obligatoire, rate-limit,
 * honeypot, taille de corps bornée, CORS restreint. Vérification Stripe manuelle
 * (pas de dépendance au SDK Stripe).
 *
 * Toutes les comparaisons de secrets sont en temps constant (timingSafeEqual).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/* ───────────────────────────── HMAC ───────────────────────────── */

type Payload = string | Uint8Array;

const toBuffer = (p: Payload) => (typeof p === "string" ? Buffer.from(p, "utf8") : Buffer.from(p));

/** HMAC-SHA256 hexadécimal. */
export function hmacSha256Hex(secret: string, payload: Payload): string {
  return createHmac("sha256", secret).update(toBuffer(payload)).digest("hex");
}

/** Comparaison en temps constant de deux chaînes (longueurs différentes → false, sans fuite de timing sur le contenu). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    // On compare quand même pour garder un temps homogène.
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/** Valeur de l'en-tête `x-sw-signature` pour un corps donné : `sha256=<hex>`. */
export function signIntakeBody(rawBody: Payload, secret: string): string {
  return `sha256=${hmacSha256Hex(secret, rawBody)}`;
}

/**
 * Vérifie `x-sw-signature: sha256=<hex>` = HMAC-SHA256(INTAKE_SIGNING_SECRET, corps brut).
 * Le corps doit être EXACTEMENT celui envoyé (octets bruts, avant tout JSON.parse).
 */
export function verifyIntakeSignature(rawBody: Payload, header: string | null | undefined, secret: string): boolean {
  if (!header || !secret) return false;
  const match = /^sha256=([0-9a-f]{64})$/i.exec(header.trim());
  if (!match) return false;
  return safeEqual(match[1].toLowerCase(), hmacSha256Hex(secret, rawBody));
}

/* ───────────────────────────── Stripe ───────────────────────────── */

export type StripeSignatureResult =
  | { ok: true; timestamp: number }
  | { ok: false; reason: "missing_header" | "malformed_header" | "timestamp_out_of_tolerance" | "no_matching_signature" };

/**
 * Vérification manuelle de l'en-tête `Stripe-Signature: t=…,v1=…[,v1=…][,v0=…]` :
 * HMAC-SHA256(STRIPE_WEBHOOK_SECRET, `${t}.${payload}`) comparé à chaque v1, tolérance 5 min
 * (protection contre le rejeu). Même algorithme que stripe.webhooks.constructEvent.
 */
export function verifyStripeSignature(
  payload: Payload,
  header: string | null | undefined,
  secret: string,
  opts: { toleranceSec?: number; nowSec?: number } = {},
): StripeSignatureResult {
  if (!header) return { ok: false, reason: "missing_header" };
  const tolerance = opts.toleranceSec ?? 300;
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);

  let timestamp = Number.NaN;
  const v1: string[] = [];
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "t") timestamp = Number(value);
    else if (key === "v1") v1.push(value);
  }
  if (!Number.isFinite(timestamp) || v1.length === 0) return { ok: false, reason: "malformed_header" };
  if (Math.abs(now - timestamp) > tolerance) return { ok: false, reason: "timestamp_out_of_tolerance" };

  const signed = Buffer.concat([Buffer.from(`${timestamp}.`, "utf8"), toBuffer(payload)]);
  const expected = hmacSha256Hex(secret, signed);
  // Toutes les signatures sont comparées (pas de sortie anticipée) : rotation de secret supportée.
  let matched = false;
  for (const candidate of v1) {
    if (safeEqual(candidate.toLowerCase(), expected)) matched = true;
  }
  return matched ? { ok: true, timestamp } : { ok: false, reason: "no_matching_signature" };
}

/* ───────────────────────────── Rate-limit (token bucket en mémoire) ───────────────────────────── */

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Secondes avant qu'un jeton soit de nouveau disponible (0 si ok). */
  retryAfterSec: number;
}

export interface RateLimiter {
  take(key: string, nowMs?: number): RateLimitResult;
  reset(): void;
}

/**
 * Token bucket : `capacity` jetons, rechargés linéairement sur `windowMs`.
 * Mémoire locale au processus : sur Vercel (plusieurs instances), la limite est
 * « par instance » — suffisant contre le spam de formulaire ; pour une limite
 * globale, brancher un store partagé (Upstash / table Postgres).
 */
export function createRateLimiter({ capacity, windowMs, maxKeys = 10_000 }: { capacity: number; windowMs: number; maxKeys?: number }): RateLimiter {
  const buckets = new Map<string, { tokens: number; updatedAt: number }>();
  const refillPerMs = capacity / windowMs;

  return {
    take(key, nowMs = Date.now()) {
      let bucket = buckets.get(key);
      if (!bucket) {
        if (buckets.size >= maxKeys) {
          // Éviction simple : on retire les plus anciennes entrées (Map = ordre d'insertion).
          for (const k of buckets.keys()) {
            buckets.delete(k);
            if (buckets.size < maxKeys * 0.9) break;
          }
        }
        bucket = { tokens: capacity, updatedAt: nowMs };
        buckets.set(key, bucket);
      } else {
        bucket.tokens = Math.min(capacity, bucket.tokens + (nowMs - bucket.updatedAt) * refillPerMs);
        bucket.updatedAt = nowMs;
      }
      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { ok: true, remaining: Math.floor(bucket.tokens), retryAfterSec: 0 };
      }
      return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((1 - bucket.tokens) / refillPerMs / 1000)) };
    },
    reset() {
      buckets.clear();
    },
  };
}

/** Par internaute (IP réelle transmise par le site) : 10 soumissions / minute. */
export const intakeUserLimiter = createRateLimiter({ capacity: 10, windowMs: 60_000 });
/** Par IP de transport (le serveur du site, ou un navigateur) : filet large contre les floods. */
export const intakeTransportLimiter = createRateLimiter({ capacity: 120, windowMs: 60_000 });

/** IP du client d'après les en-têtes du proxy (Vercel : x-forwarded-for / x-real-ip). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/* ───────────────────────────── Honeypot ───────────────────────────── */

/**
 * Champs pièges (invisibles pour un humain). NB : « website » n'en fait PAS partie,
 * c'est un vrai champ du formulaire partenaire.
 */
export const HONEYPOT_FIELDS = ["_hp", "_gotcha", "honeypot", "hp_field", "botField", "bot_field", "fax_number"] as const;

export function honeypotTriggered(payload: Record<string, unknown>): boolean {
  return HONEYPOT_FIELDS.some((f) => {
    const v = payload[f];
    return v !== undefined && v !== null && v !== false && String(v).trim() !== "";
  });
}

export function stripHoneypot(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };
  for (const f of HONEYPOT_FIELDS) delete out[f];
  return out;
}

/* ───────────────────────────── Corps de requête borné ───────────────────────────── */

export const MAX_INTAKE_BODY_BYTES = 64 * 1024;
export const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;

export type BodyResult = { ok: true; bytes: Uint8Array; text: string } | { ok: false; reason: "too_large" | "unreadable" };

/** Lit le corps brut sans jamais dépasser `maxBytes` (Content-Length vérifié puis lecture en flux). */
export async function readBodyWithLimit(req: Request, maxBytes: number): Promise<BodyResult> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, reason: "too_large" };
  if (!req.body) return { ok: true, bytes: new Uint8Array(0), text: "" };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return { ok: true, bytes, text: new TextDecoder("utf-8").decode(bytes) };
}

/* ───────────────────────────── CORS ───────────────────────────── */

export const DEFAULT_ALLOWED_ORIGINS = ["https://www.startupweek.tech"];

/** ALLOWED_ORIGINS = liste séparée par des virgules (défaut : https://www.startupweek.tech). */
export function allowedOrigins(env: string | undefined = process.env.ALLOWED_ORIGINS): string[] {
  const list = (env ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return list.length ? list : DEFAULT_ALLOWED_ORIGINS;
}

export function isOriginAllowed(origin: string | null, allowed: string[] = allowedOrigins()): boolean {
  if (!origin) return true; // appel serveur-à-serveur (pas d'en-tête Origin)
  return allowed.includes(origin.replace(/\/+$/, ""));
}

/** En-têtes CORS : l'origine n'est reflétée que si elle est autorisée. */
export function corsHeaders(origin: string | null, allowed: string[] = allowedOrigins()): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-SW-Signature, Idempotency-Key",
    "Access-Control-Max-Age": "600",
  };
  if (origin && isOriginAllowed(origin, allowed)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

/** Vérifie `Authorization: Bearer <secret>` en temps constant. */
export function verifyBearer(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return false;
  return safeEqual(match[1], secret);
}
