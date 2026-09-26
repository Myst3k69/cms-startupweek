/**
 * Facturation : devis B2B, factures (acompte 30 % à l'inscription, solde à J-30 — CGV), avoirs,
 * paiements (Stripe / virement Qonto / OPCO) et relevé bancaire Qonto à rapprocher.
 *
 * Numérotation légale : F-AAAA-NNNN et D-AAAA-NNNN, séquentielles sans trou par année, dans l'ordre d'émission.
 */
import type { BankTransaction, Invoice, InvoiceKind, LineItem, Payment, PaymentMethod, QuoteStatus } from "../../domain/types";
import { type SeedContext, stamps } from "./context";
import { DAY, HOUR, MIN, htFromTtc, linesTotalCents, pad, sortBy, stripeFee } from "./helpers";
import { evId } from "./events";
import { ORG } from "./organizations";
import { mainContactOf } from "./people";

/** Opportunités liées aux devis (créées par le module CRM avec ces identifiants). */
export const DEAL = {
  epitechSv: "deal_epitech_sv26",
  epitech2027: "deal_epitech_2027",
  epsiSv: "deal_epsi_sv",
  nextuSv: "deal_nextu_sv",
  ynovSv: "deal_ynov_sv",
  verdalysIs: "deal_verdalys_is",
  lyonStartUp: "deal_lyonstartup",
  nexoraAi: "deal_nexora_ai",
  kaliaIs: "deal_kalia_is",
  batimaxTs: "deal_batimax_ts",
  novatelSw: "deal_novatel_sw",
  startupReady: "deal_startup_ready",
  ilStandard: "deal_il_standard",
} as const;

interface PaySpec {
  ts: number;
  cents: number;
  method: PaymentMethod;
  reference?: string;
  status?: Payment["status"];
}

interface InvoiceDraft {
  key: string;
  kind: InvoiceKind;
  issuedTs: number;
  dueTs: number;
  lines: LineItem[];
  contactId?: string;
  orgId?: string;
  applicationId?: string;
  eventId?: string;
  quoteKey?: string;
  creditedKey?: string;
  method: PaymentMethod;
  payments: PaySpec[];
  reminders?: number;
  lastReminderTs?: number;
  funder?: Invoice["funder"];
  notes?: string;
  forcedStatus?: Invoice["status"];
}

interface QuoteDraft {
  key: string;
  status: QuoteStatus;
  orgId?: string;
  contactId?: string;
  dealId?: string;
  eventId?: string;
  issuedTs: number;
  validDays: number;
  lines: LineItem[];
  notes?: string;
  sentTs?: number;
  acceptedTs?: number;
  invoiceKey?: string;
}

export function buildBilling(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("billing");
  const events = new Map(ctx.data.events.map((e) => [e.id, e]));
  let lineSeq = 0;
  const line = (label: string, quantity: number, unitPriceCents: number, vatRate = 20): LineItem => ({ id: `li_${pad(++lineSeq, 5)}`, label, quantity, unitPriceCents, vatRate });

  const invoices: InvoiceDraft[] = [];
  const quotes: QuoteDraft[] = [];

  /* ───────── 1. Factures B2C issues des candidatures ───────── */
  for (const app of ctx.data.applications) {
    const plan = ctx.scratch.appPlans.get(app.id);
    if (!plan) continue;
    const ev = events.get(app.eventId)!;
    const label = `StartupWeek ${ev.code} — ${ev.name}`;
    const depositTtc = Math.round(plan.priceCents * 0.3);
    const balanceTtc = plan.priceCents - depositTtc;
    const base = { contactId: app.contactId, orgId: plan.payerOrgId, applicationId: app.id, eventId: ev.id, method: plan.method };

    if (plan.single && plan.funder) {
      const lines = [line(`Formation « ${ev.name} » (${ev.durationHours} h) — ${ev.code}`, 1, htFromTtc(plan.priceCents))];
      invoices.push({
        ...base,
        key: `${app.id}:single`,
        kind: "facture",
        orgId: plan.funder.orgId,
        issuedTs: plan.single.issuedTs,
        dueTs: plan.single.dueTs,
        lines,
        method: "opco",
        funder: { name: plan.funder.name, subrogation: true, agreementRef: plan.funder.agreementRef },
        payments: plan.single.paidTs ? [{ ts: plan.single.paidTs, cents: linesTotalCents(lines), method: "opco", reference: plan.funder.agreementRef }] : [],
        notes: "Paiement direct par le financeur (subrogation) sur présentation du certificat de réalisation et des émargements.",
      });
      continue;
    }
    if (plan.deposit) {
      const lines = [line(`Acompte 30 % — ${label}`, 1, htFromTtc(depositTtc))];
      invoices.push({
        ...base,
        key: `${app.id}:acompte`,
        kind: "acompte",
        issuedTs: plan.deposit.issuedTs,
        dueTs: plan.deposit.dueTs,
        lines,
        payments: plan.deposit.paidTs ? [{ ts: plan.deposit.paidTs, cents: linesTotalCents(lines), method: plan.method }] : [],
        notes: "Acompte de 30 % à l'inscription (CGV). Le solde est exigible 30 jours avant le début de la session.",
      });
    }
    if (plan.balance) {
      const lines = [line(`Solde 70 % — ${label}`, 1, htFromTtc(balanceTtc))];
      const total = linesTotalCents(lines);
      const b = plan.balance;
      invoices.push({
        ...base,
        key: `${app.id}:solde`,
        kind: "solde",
        issuedTs: b.issuedTs,
        dueTs: b.dueTs,
        lines,
        payments: b.paidTs ? [{ ts: b.paidTs, cents: b.partialCents ?? total, method: b.partialCents ? "virement" : plan.method }] : [],
        reminders: b.reminders,
        lastReminderTs: b.lastReminderTs,
        notes: b.partialCents ? "Règlement en deux virements convenu avec le participant." : undefined,
      });
    }
    if (plan.refund && plan.deposit?.paidTs) {
      const lines = [line(`Avoir — annulation de l'inscription ${ev.code} (désistement > J-30, acompte remboursé)`, 1, htFromTtc(depositTtc))];
      invoices.push({
        ...base,
        key: `${app.id}:avoir`,
        kind: "avoir",
        creditedKey: `${app.id}:acompte`,
        issuedTs: plan.refund.avoirTs,
        dueTs: plan.refund.avoirTs,
        lines,
        payments: [{ ts: plan.refund.refundTs, cents: linesTotalCents(lines), method: plan.method, status: "rembourse", reference: plan.method === "stripe" ? `re_3Q${r.alnum(21)}` : `qonto_tx_${r.hex(16)}` }],
        forcedStatus: "payee",
        notes: "Remboursement intégral de l'acompte (désistement plus de 30 jours avant la session, conformément aux CGV).",
      });
    }
  }

  /* ───────── 2. Accompagnements & mentorat (B2C, facture unique) ───────── */
  const alumniOf = (code: string, rank = 0) => {
    const list = sortBy(ctx.data.applications.filter((a) => a.eventId === evId(code) && a.status === "inscrite"), (a) => a.number);
    return list[rank % list.length].contactId;
  };
  const candidateOf = (code: string, status: string) => ctx.data.applications.find((a) => a.eventId === evId(code) && a.status === status)!.contactId;
  const serviceInvoice = (key: string, contactId: string, label: string, ttc: number, issuedTs: number, paid: boolean) => {
    const lines = [line(label, 1, htFromTtc(ttc))];
    invoices.push({
      key,
      kind: "facture",
      contactId,
      issuedTs,
      dueTs: issuedTs + 7 * DAY,
      lines,
      method: "stripe",
      payments: paid ? [{ ts: issuedTs + r.between(1, 30) * MIN, cents: linesTotalCents(lines), method: "stripe" }] : [],
    });
  };
  serviceInvoice("svc:il_light", alumniOf("SW-0007", 2), "Iteration Lab — Pack Light (4 séances de mentorat)", 60000, clock.real("2026-05-10", 11, 20), true);
  serviceInvoice("svc:il_standard", alumniOf("SW-0008", 1), "Iteration Lab — Pack Standard (8 séances de mentorat)", 110000, clock.rel(-45, 15, 5), true);
  serviceInvoice("svc:startup_ready", candidateOf("SW-0014", "entretien"), "Startup Ready — 4 sessions individuelles de préparation", 99000, clock.rel(-20, 10, 40), true);
  serviceInvoice("svc:single", alumniOf("SW-0010", 3), "Séance unique de mentorat (1 h) — growth", 18000, clock.rel(-5, 9, 15), false);

  /* ───────── 3. B2B : devis et factures ───────── */
  const epitech = mainContactOf(ctx, ORG.epitech);
  const ynov = mainContactOf(ctx, ORG.ynov);

  // Epitech — Startup Village mai 2026 (80 étudiants) : acompte 30 % à la commande, solde après l'événement.
  const epitechLines = () => [line("Startup Village — 4 jours / 3 nuits, hébergement et restauration inclus (prix par étudiant)", 80, 39000), line("Coordination pédagogique, jury et logistique", 1, 150000)];
  quotes.push({ key: "q:epitech", status: "accepte", orgId: ORG.epitech, contactId: epitech, dealId: DEAL.epitechSv, eventId: evId("SV-0001"), issuedTs: clock.real("2026-02-24", 14, 0), validDays: 30, lines: epitechLines(), sentTs: clock.real("2026-02-24", 14, 30), acceptedTs: clock.real("2026-03-10", 17, 45), invoiceKey: "b2b:epitech:acompte", notes: "Tarif école : 390 € HT par étudiant. Acompte de 30 % à la commande, solde à réception de facture après l'événement." });
  const epitechHt = 80 * 39000 + 150000;
  const epDep = [line("Acompte 30 % — Startup Village Epitech (80 étudiants), devis accepté", 1, Math.round(epitechHt * 0.3))];
  const epBal = [line("Solde 70 % — Startup Village Epitech (80 étudiants), 18 → 21 mai 2026", 1, epitechHt - Math.round(epitechHt * 0.3))];
  invoices.push({ key: "b2b:epitech:acompte", kind: "acompte", orgId: ORG.epitech, contactId: epitech, eventId: evId("SV-0001"), quoteKey: "q:epitech", issuedTs: clock.real("2026-03-12", 10, 0), dueTs: clock.real("2026-04-11", 12, 0), lines: epDep, method: "virement", payments: [{ ts: clock.real("2026-04-02", 9, 12), cents: linesTotalCents(epDep), method: "virement" }] });
  invoices.push({ key: "b2b:epitech:solde", kind: "solde", orgId: ORG.epitech, contactId: epitech, eventId: evId("SV-0001"), quoteKey: "q:epitech", issuedTs: clock.real("2026-05-22", 10, 0), dueTs: clock.real("2026-06-21", 12, 0), lines: epBal, method: "virement", payments: [{ ts: clock.real("2026-06-19", 8, 40), cents: linesTotalCents(epBal), method: "virement" }] });

  // EPSI — refusé ; Next-U — expiré.
  quotes.push({ key: "q:epsi", status: "refuse", orgId: ORG.epsi, contactId: mainContactOf(ctx, ORG.epsi), dealId: DEAL.epsiSv, issuedTs: clock.real("2026-03-25", 11, 0), validDays: 30, lines: [line("Startup Village — 4 jours / 3 nuits (prix par étudiant)", 120, 39000), line("Coordination pédagogique, jury et logistique", 1, 150000)], sentTs: clock.real("2026-03-25", 11, 20), notes: "Refusé le 22/04 : budget réaffecté à un hackathon interne." });
  quotes.push({ key: "q:nextu", status: "expire", orgId: ORG.nextu, contactId: mainContactOf(ctx, ORG.nextu), dealId: DEAL.nextuSv, issuedTs: clock.real("2026-06-10", 16, 0), validDays: 30, lines: [line("Startup Village — 4 jours / 3 nuits (prix par étudiant)", 45, 39000), line("Coordination pédagogique, jury et logistique", 1, 120000)], sentTs: clock.real("2026-06-10", 16, 10) });

  // Verdalys — Innovation Sprint juin 2026 : facture unique après l'événement.
  const verdalysLines = () => [line("Innovation Sprint — 3 jours sur site, 14 collaborateurs", 1, 1200000), line("Frais de déplacement et d'hébergement des intervenants", 1, 145000)];
  quotes.push({ key: "q:verdalys", status: "accepte", orgId: ORG.verdalys, contactId: mainContactOf(ctx, ORG.verdalys), dealId: DEAL.verdalysIs, eventId: evId("IS-0001"), issuedTs: clock.real("2026-05-12", 10, 0), validDays: 30, lines: verdalysLines(), sentTs: clock.real("2026-05-12", 10, 15), acceptedTs: clock.real("2026-05-20", 18, 5), invoiceKey: "b2b:verdalys" });
  const vLines = verdalysLines();
  invoices.push({ key: "b2b:verdalys", kind: "facture", orgId: ORG.verdalys, contactId: mainContactOf(ctx, ORG.verdalys), eventId: evId("IS-0001"), quoteKey: "q:verdalys", issuedTs: clock.real("2026-06-26", 9, 30), dueTs: clock.real("2026-07-26", 12, 0), lines: vLines, method: "virement", payments: [{ ts: clock.real("2026-07-24", 10, 5), cents: linesTotalCents(vLines), method: "virement" }] });

  // Lyon Start Up — promo septembre 2026 : facture partiellement réglée (le solde vient d'arriver sur Qonto, à rapprocher).
  const lsuLines = () => [line("Masterclass « MVP no-code en 7 jours » — promotion septembre 2026", 2, 180000), line("Jury de sélection et entretiens (≈ 100 candidats)", 1, 250000), line("Accompagnement Startup Ready des 5 lauréats", 5, 48000)];
  quotes.push({ key: "q:lsu", status: "accepte", orgId: ORG.lyonStartUp, contactId: mainContactOf(ctx, ORG.lyonStartUp), dealId: DEAL.lyonStartUp, issuedTs: clock.real("2026-08-12", 15, 0), validDays: 30, lines: lsuLines(), sentTs: clock.real("2026-08-12", 15, 10), acceptedTs: clock.real("2026-08-20", 11, 30), invoiceKey: "b2b:lsu" });
  const lLines = lsuLines();
  invoices.push({ key: "b2b:lsu", kind: "facture", orgId: ORG.lyonStartUp, contactId: mainContactOf(ctx, ORG.lyonStartUp), quoteKey: "q:lsu", issuedTs: clock.real("2026-09-01", 9, 0), dueTs: clock.real("2026-10-01", 12, 0), lines: lLines, method: "virement", payments: [{ ts: clock.real("2026-09-15", 9, 50), cents: Math.round(linesTotalCents(lLines) / 2), method: "virement" }], notes: "Paiement en deux fois accordé (50 % à réception, 50 % à 30 jours)." });

  // Ynov — Startup Village janvier 2027 (60 étudiants) : acompte émis, virement reçu hier (à rapprocher).
  const ynovLines = () => [line("Startup Village — 4 jours / 3 nuits, hébergement et restauration inclus (prix par étudiant)", 60, 39000), line("Coordination pédagogique, jury et logistique", 1, 150000)];
  quotes.push({ key: "q:ynov", status: "accepte", orgId: ORG.ynov, contactId: ynov, dealId: DEAL.ynovSv, eventId: evId("SV-0002"), issuedTs: clock.real("2026-09-04", 10, 0), validDays: 30, lines: ynovLines(), sentTs: clock.real("2026-09-04", 10, 20), acceptedTs: clock.real("2026-09-15", 16, 40), invoiceKey: "b2b:ynov:acompte" });
  const ynovHt = 60 * 39000 + 150000;
  const yDep = [line("Acompte 30 % — Startup Village Ynov Campus (60 étudiants), devis accepté", 1, Math.round(ynovHt * 0.3))];
  invoices.push({ key: "b2b:ynov:acompte", kind: "acompte", orgId: ORG.ynov, contactId: ynov, eventId: evId("SV-0002"), quoteKey: "q:ynov", issuedTs: clock.real("2026-09-18", 9, 30), dueTs: clock.real("2026-10-18", 12, 0), lines: yDep, method: "virement", payments: [] });

  // Pipeline en cours.
  quotes.push({ key: "q:nexora", status: "envoye", orgId: ORG.nexora, contactId: mainContactOf(ctx, ORG.nexora), dealId: DEAL.nexoraAi, issuedTs: clock.rel(-16, 14, 0), validDays: 30, lines: [line("AI Adoption Sprint — 2 jours, équipe de 12 personnes", 1, 950000), line("Suivi à J+30 : revue des automatisations déployées", 1, 120000)], sentTs: clock.rel(-16, 14, 20) });
  quotes.push({ key: "q:kalia", status: "envoye", orgId: ORG.kalia, contactId: mainContactOf(ctx, ORG.kalia), dealId: DEAL.kaliaIs, issuedTs: clock.rel(-7, 11, 0), validDays: 30, lines: [line("Innovation Sprint — 3 jours sur site, 10 collaborateurs", 1, 1100000), line("Frais de déplacement des intervenants", 1, 90000)], sentTs: clock.rel(-7, 11, 30), notes: "Remise de 1 000 € HT accordée (première collaboration)." });
  quotes.push({ key: "q:batimax", status: "brouillon", orgId: ORG.batimax, contactId: mainContactOf(ctx, ORG.batimax), dealId: DEAL.batimaxTs, issuedTs: clock.rel(-2, 16, 0), validDays: 30, lines: [line("Talent Sprint — 5 demi-journées, 16 collaborateurs", 1, 850000)] });
  quotes.push({ key: "q:novatel", status: "envoye", orgId: ORG.novatel, contactId: mainContactOf(ctx, ORG.novatel), dealId: DEAL.novatelSw, eventId: evId("SW-0013"), issuedTs: clock.rel(-4, 10, 0), validDays: 30, lines: [line("StartupWeek Split — novembre 2026 : inscription collaborateur (tarif entreprise)", 3, 290000)], sentTs: clock.rel(-4, 10, 5), notes: "Prise en charge OPCO Atlas envisagée (subrogation)." });
  quotes.push({ key: "q:epitech2027", status: "envoye", orgId: ORG.epitech, contactId: epitech, dealId: DEAL.epitech2027, issuedTs: clock.rel(-10, 15, 0), validDays: 45, lines: [line("Startup Village multi-campus 2027 — 3 sessions (prix par étudiant)", 110, 39000), line("Coordination pédagogique, jury et logistique (par session)", 3, 70000)], sentTs: clock.rel(-10, 15, 30), notes: "Proposition de déploiement sur 3 campus (Lyon, Nantes, Lille)." });

  /* ───────── 4. Numérotation séquentielle et création des entités ───────── */
  const quoteOrder = sortBy(quotes, (q) => q.issuedTs);
  const quoteId = new Map<string, string>();
  const quoteNumber = new Map<string, string>();
  const qCount = new Map<number, number>();
  for (const q of quoteOrder) {
    const y = clock.year(q.issuedTs);
    const n = (qCount.get(y) ?? 0) + 1;
    qCount.set(y, n);
    quoteNumber.set(q.key, `D-${y}-${pad(n)}`);
    quoteId.set(q.key, `quo_${y}_${pad(n)}`);
  }

  const invOrder = sortBy(invoices, (i) => i.issuedTs);
  const invId = new Map<string, string>();
  const iCount = new Map<number, number>();
  const invNumber = new Map<string, string>();
  for (const i of invOrder) {
    const y = clock.year(i.issuedTs);
    const n = (iCount.get(y) ?? 0) + 1;
    iCount.set(y, n);
    invNumber.set(i.key, `F-${y}-${pad(n)}`);
    invId.set(i.key, `inv_${y}_${pad(n)}`);
  }

  ctx.data.quotes = quoteOrder.map((q) => ({
    id: quoteId.get(q.key)!,
    ...stamps(ctx, q.issuedTs, q.acceptedTs ?? q.sentTs ?? q.issuedTs),
    number: quoteNumber.get(q.key)!,
    status: q.status,
    orgId: q.orgId,
    contactId: q.contactId,
    dealId: q.dealId,
    eventId: q.eventId,
    issuedAt: clock.iso(q.issuedTs),
    validUntil: clock.iso(q.issuedTs + q.validDays * DAY),
    lines: q.lines,
    notes: q.notes,
    sentAt: q.sentTs ? clock.iso(q.sentTs) : undefined,
    acceptedAt: q.acceptedTs ? clock.iso(q.acceptedTs) : undefined,
    invoiceId: q.invoiceKey ? invId.get(q.invoiceKey) : undefined,
  }));

  /* Paiements */
  const payments: Payment[] = [];
  let paySeq = 0;
  const invoiceRows: Invoice[] = invOrder.map((d) => {
    const id = invId.get(d.key)!;
    const total = linesTotalCents(d.lines);
    let paid = 0;
    for (const p of d.payments) {
      const ts = clock.past(p.ts, HOUR);
      const status = p.status ?? "reussi";
      payments.push({
        id: `pay_${pad(++paySeq)}`,
        ...stamps(ctx, ts),
        invoiceId: id,
        amountCents: p.cents,
        receivedAt: clock.iso(ts),
        method: p.method,
        status,
        reference: p.reference ?? (p.method === "stripe" ? `pi_3Q${r.alnum(21)}` : p.method === "virement" ? `qonto_tx_${r.hex(16)}` : `OPCO-${r.digits(8)}`),
        feeCents: p.method === "stripe" ? stripeFee(p.cents) : undefined,
      });
      paid += p.cents;
    }
    const status: Invoice["status"] = d.forcedStatus ?? (paid >= total ? "payee" : paid > 0 ? "partielle" : d.dueTs < clock.now ? "en_retard" : "emise");
    const lastPayTs = d.payments.length ? Math.max(...d.payments.map((p) => p.ts)) : d.issuedTs;
    return {
      id,
      ...stamps(ctx, d.issuedTs, Math.max(lastPayTs, d.lastReminderTs ?? 0)),
      number: invNumber.get(d.key)!,
      kind: d.kind,
      status,
      orgId: d.orgId,
      contactId: d.contactId,
      applicationId: d.applicationId,
      eventId: d.eventId,
      quoteId: d.quoteKey ? quoteId.get(d.quoteKey) : undefined,
      creditedInvoiceId: d.creditedKey ? invId.get(d.creditedKey) : undefined,
      issuedAt: clock.iso(d.issuedTs),
      dueAt: clock.iso(d.dueTs),
      lines: d.lines,
      paidCents: Math.min(paid, total),
      preferredMethod: d.method,
      stripePaymentLink: d.method === "stripe" && d.kind !== "avoir" ? `https://buy.stripe.com/test_${r.alnum(14)}` : undefined,
      funder: d.funder,
      remindersSent: d.reminders ?? 0,
      lastReminderAt: d.lastReminderTs ? clock.iso(d.lastReminderTs) : undefined,
      notes: d.notes,
    };
  });
  ctx.data.invoices = invoiceRows;
  ctx.data.payments = payments;

  /* Montants dénormalisés sur les candidatures */
  for (const app of ctx.data.applications) {
    const own = invoiceRows.filter((i) => i.applicationId === app.id);
    if (!own.length) continue;
    const credited = own.filter((i) => i.kind === "avoir").reduce((acc, i) => acc + i.paidCents, 0);
    app.amountPaidCents = own.filter((i) => i.kind !== "avoir").reduce((acc, i) => acc + i.paidCents, 0) - credited;
    const main = sortBy(own.filter((i) => i.kind !== "avoir"), (i) => Date.parse(i.issuedAt)).at(-1);
    app.invoiceId = main?.id;
  }

  buildBank(ctx, invoiceRows, payments);
}

/* ───────────────────────────── Relevé bancaire (Qonto + virements Stripe) ───────────────────────────── */

function buildBank(ctx: SeedContext, invoices: Invoice[], payments: Payment[]): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("bank");
  const windowStart = clock.rel(-100, 0, 0); // flux Qonto synchronisé depuis ~100 jours
  const txs: (Omit<BankTransaction, "id" | "createdAt" | "updatedAt"> & { ts: number })[] = [];
  const invById = new Map(invoices.map((i) => [i.id, i]));
  const counterpartyOf = (inv: Invoice) => {
    if (inv.orgId) return ctx.data.organizations.find((o) => o.id === inv.orgId)!.name.toUpperCase();
    const c = ctx.data.contacts.find((x) => x.id === inv.contactId)!;
    return `${c.firstName} ${c.lastName}`.toUpperCase();
  };
  const links: [BankTransaction["paymentId"], number][] = [];

  // Crédits Qonto : virements et règlements financeurs.
  for (const p of payments) {
    const ts = Date.parse(p.receivedAt);
    if (ts < windowStart || p.status !== "reussi" || (p.method !== "virement" && p.method !== "opco")) continue;
    const inv = invById.get(p.invoiceId)!;
    txs.push({ ts: ts + r.between(1, 20) * HOUR, bookedAt: "", label: `VIR SEPA RECU /DE ${counterpartyOf(inv)} /MOTIF ${inv.number}`, counterparty: counterpartyOf(inv), amountCents: p.amountCents, reference: inv.number, source: "qonto", status: "rapproche", matchedInvoiceId: inv.id, paymentId: p.id });
    links.push([p.id, txs.length - 1]);
  }

  // Virements Stripe hebdomadaires (net des frais et des remboursements).
  const stripePays = payments.filter((p) => p.method === "stripe" && Date.parse(p.receivedAt) >= windowStart - 7 * DAY);
  const payoutDay = (ts: number) => {
    // Versement le mardi suivant (≥ J+2).
    let d = Math.floor((ts + 2 * DAY) / DAY) * DAY;
    while (new Date(d).getUTCDay() !== 2) d += DAY;
    return d;
  };
  const groups = new Map<number, Payment[]>();
  for (const p of stripePays) {
    const d = payoutDay(Date.parse(p.receivedAt));
    if (d < windowStart || d > clock.now - 6 * HOUR) continue;
    groups.set(d, [...(groups.get(d) ?? []), p]);
  }
  const payoutDays = [...groups.keys()].sort((a, b) => a - b);
  for (const d of payoutDays) {
    const list = groups.get(d)!;
    const net = list.reduce((acc, p) => acc + (p.status === "rembourse" ? -p.amountCents : p.amountCents - (p.feeCents ?? 0)), 0);
    const isLast = d === payoutDays[payoutDays.length - 1] && d > clock.now - 3 * DAY;
    txs.push({ ts: d + 6 * HOUR, bookedAt: "", label: "STRIPE PAYOUT", counterparty: "Stripe Technology Europe Ltd", amountCents: net, reference: `po_1Q${r.alnum(20)}`, source: "stripe_payout", status: isLast ? "a_rapprocher" : "rapproche" });
    for (const p of list) links.push([p.id, txs.length - 1]);
  }

  // Crédits récents non rapprochés (matchables par montant / référence).
  const find = (pred: (i: Invoice) => boolean) => invoices.find(pred);
  const lateBalance = find((i) => i.kind === "solde" && i.status === "en_retard" && i.remindersSent === 1);
  if (lateBalance) {
    const due = sumDue(lateBalance);
    txs.push({ ts: clock.ago(20 * HOUR), bookedAt: "", label: `VIR SEPA RECU /DE ${counterpartyOf(lateBalance)} /MOTIF SOLDE ${lateBalance.number}`, counterparty: counterpartyOf(lateBalance), amountCents: due, reference: lateBalance.number, source: "qonto", status: "a_rapprocher" });
  }
  const lsu = find((i) => i.orgId === ORG.lyonStartUp && i.status === "partielle");
  if (lsu) txs.push({ ts: clock.ago(28 * HOUR), bookedAt: "", label: `VIR SEPA RECU /DE LYON START UP /MOTIF ${lsu.number} 2E ECHEANCE`, counterparty: "LYON START UP", amountCents: sumDue(lsu), reference: lsu.number, source: "qonto", status: "a_rapprocher" });
  const ynov = find((i) => i.orgId === ORG.ynov && i.kind === "acompte");
  if (ynov) txs.push({ ts: clock.ago(26 * HOUR), bookedAt: "", label: "VIR SEPA RECU /DE YNOV CAMPUS /MOTIF ACOMPTE STARTUP VILLAGE", counterparty: "YNOV CAMPUS", amountCents: sumDue(ynov), source: "qonto", status: "a_rapprocher" });
  const akto = find((i) => i.funder?.name === "AKTO" && i.paidCents === 0);
  if (akto) txs.push({ ts: clock.ago(44 * HOUR), bookedAt: "", label: `VIR SEPA RECU /DE AKTO /REF ${akto.funder!.agreementRef}`, counterparty: "AKTO", amountCents: sumDue(akto), reference: akto.funder!.agreementRef, source: "qonto", status: "a_rapprocher" });
  const partial = find((i) => i.kind === "solde" && i.status === "partielle");
  if (partial) txs.push({ ts: clock.ago(3 * DAY + 5 * HOUR), bookedAt: "", label: `VIR INST RECU /DE ${counterpartyOf(partial)}`, counterparty: counterpartyOf(partial), amountCents: sumDue(partial), source: "qonto", status: "a_rapprocher" });

  // Débits (hors factures clients).
  const debits: [string, string, number, number][] = [
    ["VIR VILLA ADRIATICA SPLIT — SOLDE LOCATION SW-0010", "VILLA ADRIATICA", -680000, clock.real("2026-08-10", 10, 0)],
    ["VIR ACOMPTE LOCATION VILLA COSTA DEL SOL — SW-0011", "COSTA SOL RENTALS SL", -390000, clock.real("2026-09-02", 11, 0)],
    ["CB TRANSAVIA — BILLETS INTERVENANTS SW-0010", "TRANSAVIA", -124000, clock.real("2026-08-18", 20, 12)],
    ["VIR JULIE MARCHAND — FACTURE INTERVENTION SW-0010", "JULIE MARCHAND", -195000, clock.real("2026-09-16", 9, 30)],
    ["VIR SOFIA MARTINEZ — FACTURE INTERVENTION SW-0010", "SOFIA MARTINEZ", -120000, clock.real("2026-09-17", 9, 30)],
    ["VIR THOMAS NGUYEN — FACTURE INTERVENTION SW-0009", "THOMAS NGUYEN", -180000, clock.real("2026-06-24", 9, 30)],
    ["PRLV SEPA URSSAF", "URSSAF ILE-DE-FRANCE", -185000, clock.real("2026-08-05", 7, 0)],
    ["PRLV SEPA URSSAF", "URSSAF ILE-DE-FRANCE", -185000, clock.real("2026-09-05", 7, 0)],
    ["VIR CABINET GARNIER & ASSOCIES — HONORAIRES T2", "CABINET GARNIER & ASSOCIES", -54000, clock.real("2026-07-15", 10, 0)],
  ];
  for (const month of ["2026-07", "2026-08", "2026-09"]) {
    debits.push([`PRLV SEPA META PLATFORMS IRELAND — ADS ${month}`, "META PLATFORMS IRELAND LTD", -r.between(62000, 145000), clock.real(`${month}-03`, 6, 0)]);
    debits.push(["PRLV SEPA GOOGLE WORKSPACE", "GOOGLE IRELAND LTD", -8640, clock.real(`${month}-02`, 6, 0)]);
    debits.push(["CB SUPABASE INC", "SUPABASE", -2500, clock.real(`${month}-12`, 3, 0)]);
    debits.push(["PRLV QONTO — ABONNEMENT BUSINESS", "QONTO", -2900, clock.real(`${month}-01`, 5, 0)]);
  }
  for (const [label, counterparty, amount, ts] of debits) {
    if (ts < windowStart || ts > clock.now) continue;
    txs.push({ ts, bookedAt: "", label, counterparty, amountCents: amount, source: "qonto", status: "ignore" });
  }
  txs.push({ ts: clock.ago(2 * DAY + 3 * HOUR), bookedAt: "", label: "PRLV SEPA NOTION LABS INC", counterparty: "NOTION LABS", amountCents: -9600, source: "qonto", status: "a_rapprocher" });

  const ordered = txs.map((t, i) => ({ t, i })).sort((a, b) => a.t.ts - b.t.ts);
  const idOf = new Map<number, string>();
  ctx.data.bankTransactions = ordered.map(({ t, i }, n) => {
    const id = `btx_${pad(n + 1)}`;
    idOf.set(i, id);
    const { ts, ...rest } = t;
    const booked = clock.past(ts, 10 * MIN);
    return { id, ...stamps(ctx, booked), ...rest, bookedAt: clock.iso(booked) };
  });
  const paymentsById = new Map(payments.map((p) => [p.id, p]));
  for (const [paymentId, idx] of links) {
    const p = paymentId ? paymentsById.get(paymentId) : undefined;
    if (p) p.bankTransactionId = idOf.get(idx);
  }
}

/** Reste à payer TTC d'une facture. */
function sumDue(inv: Invoice): number {
  return linesTotalCents(inv.lines) - inv.paidCents;
}
