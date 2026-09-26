/**
 * POST (ou GET, pour Vercel Cron) /api/qonto/sync — relevé Qonto → crm.bank_transactions
 * puis rapprochement automatique avec les factures.
 *
 * Sécurité : `Authorization: Bearer <CRON_SECRET>` (Vercel Cron envoie cet en-tête
 * automatiquement quand CRON_SECRET est défini dans le projet).
 *
 * Paramètres (query) : `since` (ISO 8601, défaut : maintenant − `days`), `days` (défaut 3).
 * La fenêtre glissante recouvre volontairement les exécutions précédentes : l'upsert est
 * idempotent (id = « qonto_<uuid Qonto> ») et ne réécrit jamais une transaction existante.
 *
 * Rapprochement automatique (prudent) : transaction créditrice « à rapprocher » dont le
 * libellé / la référence contient UN numéro de facture (F-AAAA-NNNN) existant, émise et non
 * soldée, et dont le montant est EXACTEMENT le solde restant dû ou le total TTC.
 * Sinon la transaction reste « a_rapprocher » pour un rapprochement manuel.
 */
import { verifyBearer } from "@/lib/server/security";
import { getSupabaseAdmin, type CrmAdminClient } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const QONTO_API = "https://thirdparty.qonto.com/v2/transactions";
const MAX_PAGES = 50;

interface QontoTransaction {
  id?: string;
  transaction_id?: string;
  amount_cents?: number;
  amount?: number;
  side?: "credit" | "debit";
  label?: string | null;
  reference?: string | null;
  note?: string | null;
  settled_at?: string | null;
  emitted_at?: string | null;
  updated_at?: string | null;
  status?: string;
}

interface QontoPage {
  transactions?: QontoTransaction[];
  meta?: { current_page?: number; next_page?: number | null; total_pages?: number };
}

interface BankRow {
  id: string;
  booked_at: string;
  label: string;
  counterparty: string;
  amount_cents: number;
  reference: string | null;
  source: "qonto";
  status: "a_rapprocher";
}

interface InvoiceRow {
  id: string;
  number: string;
  status: string;
  kind: string;
  lines: unknown;
  paid_cents: number;
}

/** Même arrondi que lineTotal() (src/lib/format.ts) et crm.lines_total_cents(). */
function invoiceTotalCents(lines: unknown): number {
  if (!Array.isArray(lines)) return 0;
  return lines.reduce((sum: number, l: unknown) => {
    const line = (l ?? {}) as { quantity?: unknown; unitPriceCents?: unknown; vatRate?: unknown };
    const ht = Math.round(Number(line.quantity ?? 0) * Number(line.unitPriceCents ?? 0));
    const vat = Math.round((ht * Number(line.vatRate ?? 0)) / 100);
    return sum + (Number.isFinite(ht + vat) ? ht + vat : 0);
  }, 0);
}

function toBankRow(t: QontoTransaction): BankRow | null {
  const qid = t.id ?? t.transaction_id;
  const booked = t.settled_at ?? t.emitted_at ?? t.updated_at;
  const cents = typeof t.amount_cents === "number" ? t.amount_cents : typeof t.amount === "number" ? Math.round(t.amount * 100) : null;
  if (!qid || !booked || cents === null) return null;
  const counterparty = (t.label ?? "").trim();
  const reference = (t.reference ?? "").trim() || null;
  return {
    id: `qonto_${qid}`,
    booked_at: new Date(booked).toISOString(),
    label: [reference, t.note?.trim()].filter(Boolean).join(" — ") || counterparty,
    counterparty,
    amount_cents: t.side === "debit" ? -Math.abs(cents) : Math.abs(cents),
    reference,
    source: "qonto",
    status: "a_rapprocher",
  };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Numéros de facture présents dans un texte libre (préfixe paramétrable, séparateurs tolérés). */
function extractInvoiceNumbers(text: string, prefix = "F"): string[] {
  const re = new RegExp(`\\b${escapeRegExp(prefix)}[-\\s_]?(\\d{4})[-\\s_]?(\\d{3,5})\\b`, "gi");
  const found = new Set<string>();
  for (const m of text.matchAll(re)) found.add(`${prefix}-${m[1]}-${m[2].padStart(4, "0")}`);
  return [...found];
}

async function fetchQonto(since: string): Promise<{ transactions: QontoTransaction[]; pages: number }> {
  const slug = process.env.QONTO_ORGANIZATION_SLUG ?? "";
  const key = process.env.QONTO_SECRET_KEY ?? "";
  const account = process.env.QONTO_BANK_ACCOUNT_ID ?? "";
  const all: QontoTransaction[] = [];
  let page = 1;
  let pages = 0;
  while (page && pages < MAX_PAGES) {
    const url = new URL(QONTO_API);
    url.searchParams.set("bank_account_id", account);
    url.searchParams.set("updated_at_from", since);
    url.searchParams.append("status[]", "completed");
    url.searchParams.set("sort_by", "updated_at:asc");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("current_page", String(page));
    const res = await fetch(url, {
      headers: { Authorization: `${slug}:${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Qonto HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as QontoPage;
    all.push(...(data.transactions ?? []));
    pages += 1;
    page = data.meta?.next_page ?? 0;
  }
  return { transactions: all, pages };
}

async function reconcile(db: CrmAdminClient, ids: string[]): Promise<{ reconciled: number; details: { transactionId: string; invoice: string }[] }> {
  if (!ids.length) return { reconciled: 0, details: [] };
  const { data: settings } = await db.from("settings").select("invoice_prefix").limit(1).maybeSingle();
  const prefix = ((settings as { invoice_prefix?: string } | null)?.invoice_prefix || "F").trim();

  const txs: { id: string; label: string; reference: string | null; amount_cents: number; booked_at: string }[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await db
      .from("bank_transactions")
      .select("id, label, reference, amount_cents, booked_at")
      .in("id", ids.slice(i, i + 100))
      .eq("status", "a_rapprocher")
      .gt("amount_cents", 0);
    if (error) throw new Error(error.message);
    txs.push(...((data ?? []) as typeof txs));
  }

  const details: { transactionId: string; invoice: string }[] = [];
  for (const tx of txs) {
    const numbers = extractInvoiceNumbers(`${tx.label} ${tx.reference ?? ""}`, prefix);
    if (numbers.length !== 1) continue; // aucun ou plusieurs numéros : rapprochement manuel
    const { data: inv } = await db.from("invoices").select("id, number, status, kind, lines, paid_cents").eq("number", numbers[0]).maybeSingle();
    const invoice = inv as InvoiceRow | null;
    if (!invoice || invoice.kind === "avoir" || !["emise", "partielle", "en_retard"].includes(invoice.status)) continue;
    const total = invoiceTotalCents(invoice.lines);
    const balance = total - (invoice.paid_cents ?? 0);
    if (tx.amount_cents !== balance && !(invoice.paid_cents === 0 && tx.amount_cents === total)) continue;

    const paymentId = `pay_${crypto.randomUUID().replace(/-/g, "")}`;
    const { error: payErr } = await db.from("payments").insert({
      id: paymentId,
      invoice_id: invoice.id,
      amount_cents: tx.amount_cents,
      received_at: tx.booked_at,
      method: "virement",
      status: "reussi",
      reference: `qonto:${tx.id.replace(/^qonto_/, "")}`,
      bank_transaction_id: tx.id,
    });
    if (payErr) {
      if (payErr.code === "23505") continue; // déjà rapprochée par une exécution concurrente
      throw new Error(payErr.message);
    }
    const { error: txErr } = await db
      .from("bank_transactions")
      .update({ status: "rapproche", matched_invoice_id: invoice.id, payment_id: paymentId })
      .eq("id", tx.id);
    if (txErr) throw new Error(txErr.message);
    await db.from("activities").insert({
      kind: "paiement",
      entity: "invoices",
      entity_id: invoice.id,
      summary: `Virement Qonto rapproché automatiquement (facture ${invoice.number})`,
      meta: { bankTransactionId: tx.id, amountCents: tx.amount_cents },
    });
    details.push({ transactionId: tx.id, invoice: invoice.number });
  }
  return { reconciled: details.length, details };
}

async function handle(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && !verifyBearer(request.headers.get("authorization"), cronSecret)) {
    return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const qontoConfigured = Boolean(process.env.QONTO_ORGANIZATION_SLUG && process.env.QONTO_SECRET_KEY && process.env.QONTO_BANK_ACCOUNT_ID);
  if (!db || !qontoConfigured) {
    return Response.json({ ok: true, dryRun: true, configured: { supabase: Boolean(db), qonto: qontoConfigured } });
  }
  if (!cronSecret) {
    // En production, la synchro (qui écrit des paiements) ne doit jamais être publique.
    return Response.json({ ok: false, error: "CRON_SECRET_REQUIRED" }, { status: 503 });
  }

  const url = new URL(request.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? "3") || 3, 1), 90);
  const sinceParam = url.searchParams.get("since");
  const sinceDate = sinceParam ? new Date(sinceParam) : new Date(Date.now() - days * 86_400_000);
  if (Number.isNaN(sinceDate.getTime())) return Response.json({ ok: false, error: "INVALID_SINCE" }, { status: 400 });

  try {
    const { transactions, pages } = await fetchQonto(sinceDate.toISOString());
    const rows = transactions.map(toBankRow).filter((r): r is BankRow => r !== null);

    // Insertion des nouvelles transactions uniquement (les existantes — éventuellement
    // déjà rapprochées ou ignorées à la main — ne sont jamais réécrites).
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { data, error } = await db.from("bank_transactions").upsert(chunk, { onConflict: "id", ignoreDuplicates: true }).select("id");
      if (error) throw new Error(error.message);
      inserted += data?.length ?? 0;
    }

    const { reconciled, details } = await reconcile(db, rows.map((r) => r.id));
    return Response.json({ ok: true, since: sinceDate.toISOString(), pages, fetched: transactions.length, inserted, reconciled, details });
  } catch (error) {
    console.error("[qonto] synchro", error);
    return Response.json({ ok: false, error: "QONTO_SYNC_FAILED" }, { status: 502 });
  }
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}

/** Vercel Cron appelle les routes en GET. */
export async function GET(request: Request): Promise<Response> {
  return handle(request);
}
