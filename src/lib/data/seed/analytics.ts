/**
 * Trafic du site (180 jours) et fil d'activité (30 derniers jours), dérivé des données du seed.
 */
import type { Activity, ActivityKind, ContentStatDay, EntityName, TrafficDay } from "../../domain/types";
import { isSiteMeasured } from "../../domain/selectors";
import type { SeedContext } from "./context";
import { DAY, HOUR, MIN, linesTotalCents, pad, sortBy } from "./helpers";

/* ───────────────────────────── Trafic ───────────────────────────── */

type Source = keyof TrafficDay["sources"];
const BASE_SHARE: [Source, number][] = [
  ["google", 0.3],
  ["direct", 0.22],
  ["instagram", 0.14],
  ["linkedin", 0.11],
  ["partenaires", 0.1],
  ["meta_ads", 0.08],
  ["newsletter", 0.05],
];

/** Campagnes Meta Ads (jours relatifs à aujourd'hui) : [début, fin, multiplicateur]. */
const CAMPAIGNS: [number, number, number][] = [
  [-152, -139, 1.6], // Deauville / Marrakech
  [-101, -90, 1.45], // session en ligne de juin + Split
  [-46, -30, 1.8], // Founder Edition d'octobre
  [-12, -4, 1.5], // dernières places Espagne / novembre en ligne
];
const NEWSLETTER_DAYS = [-170, -140, -110, -80, -52, -18];
const PODCAST_DAY = -140; // épisode « Build in Public »

export function buildTraffic(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("traffic");
  const days: TrafficDay[] = [];
  for (let i = 180; i >= 1; i--) {
    const dayTs = clock.today0 - i * DAY;
    const rel = -i;
    const t = (180 - i) / 179;
    const weekly = [0.78, 1.05, 1.08, 1.04, 1.0, 0.9, 0.7][new Date(dayTs).getUTCDay()];
    const campaign = CAMPAIGNS.find(([a, b]) => rel >= a && rel <= b)?.[2] ?? 1;
    const podcast = rel >= PODCAST_DAY && rel <= PODCAST_DAY + 3 ? 2.1 - (rel - PODCAST_DAY) * 0.35 : 1;
    const newsletter = NEWSLETTER_DAYS.includes(rel) ? 70 : NEWSLETTER_DAYS.includes(rel - 1) ? 30 : 0;
    const organic = Math.round((190 + 150 * t) * weekly * podcast * r.float(0.86, 1.14));
    const paid = Math.round(organic * (campaign - 1));
    const visitors = Math.min(680, Math.max(120, organic + paid + newsletter));

    // Répartition par source (le surplus de campagne va sur meta_ads, le pic podcast sur « partenaires »).
    const base = visitors - paid - newsletter;
    const sources = Object.fromEntries(BASE_SHARE.map(([k, share]) => [k, Math.floor(base * share * r.float(0.85, 1.15))])) as TrafficDay["sources"];
    sources.meta_ads += paid;
    sources.newsletter += newsletter;
    const assigned = Object.values(sources).reduce((a, b) => a + b, 0);
    sources.direct += visitors - assigned;
    if (sources.direct < 0) {
      sources.google += sources.direct;
      sources.direct = 0;
    }

    const formStarts = Math.round(visitors * r.float(0.03, 0.06) * (campaign > 1 ? 1.1 : 1));
    days.push({
      id: `trf_${clock.ymd(dayTs).replace(/-/g, "")}`,
      date: clock.ymd(dayTs),
      visitors,
      pageviews: Math.round(visitors * r.float(2.1, 2.9)),
      sources,
      formStarts,
      formSubmits: Math.round(formStarts * r.float(0.35, 0.55)),
    });
  }
  ctx.data.traffic = days;
}

/* ───────────────────────────── Audience des articles du blog ───────────────────────────── */

/** Lecteurs d'un article par source : le blog vit surtout du SEO. */
const ARTICLE_SHARE: [Source, number][] = [
  ["google", 0.52],
  ["linkedin", 0.16],
  ["direct", 0.12],
  ["newsletter", 0.08],
  ["instagram", 0.05],
  ["partenaires", 0.05],
  ["meta_ads", 0.02],
];

/**
 * Comme en production, les articles du blog sont mesurés sur le site : leurs chiffres
 * (générés par buildContents) deviennent une audience quotidienne sur 180 jours au plus,
 * décroissante depuis la publication, et leur saisie manuelle est remise à zéro. Les
 * autres contenus (réseaux sociaux, newsletter, pages) gardent leurs chiffres saisis.
 */
export function buildContentStats(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("content-stats");
  const rows: ContentStatDay[] = [];

  for (const c of ctx.data.contents) {
    if (!isSiteMeasured(c) || !c.publishedAt) continue;
    const total = c.metrics;
    c.metrics = { views: 0, clicks: 0, leads: 0 };
    const pubRel = Math.floor((Date.parse(c.publishedAt) - clock.today0) / DAY);
    const first = Math.max(pubRel, -180);
    if (first > -1 || total.views === 0) continue;

    const days: number[] = [];
    for (let i = first; i <= -1; i++) days.push(i);
    const weights = days.map((i) => r.float(0.6, 1.4) / Math.sqrt(i - pubRel + 1));
    const sum = weights.reduce((a, b) => a + b, 0);
    const pick = () => {
      let x = r.float(0, sum);
      for (let k = 0; k < weights.length; k++) {
        x -= weights[k];
        if (x <= 0) return k;
      }
      return weights.length - 1;
    };
    const clicks = new Array<number>(days.length).fill(0);
    const leads = new Array<number>(days.length).fill(0);
    for (let n = 0; n < total.clicks; n++) clicks[pick()]++;
    for (let n = 0; n < total.leads; n++) leads[pick()]++;

    days.forEach((rel, k) => {
      const views = Math.max(clicks[k], Math.round((total.views * weights[k]) / sum));
      if (views === 0 && leads[k] === 0) return;
      const visitors = Math.max(Math.min(views, 1), Math.round(views * r.float(0.72, 0.9)));
      // Source tirée lecteur par lecteur (les volumes quotidiens sont trop faibles pour des parts arrondies).
      const sources: ContentStatDay["sources"] = {};
      for (let n = 0; n < visitors; n++) {
        let x = r.float(0, 1);
        const hit = ARTICLE_SHARE.find(([, share]) => (x -= share) <= 0)?.[0] ?? "google";
        sources[hit] = (sources[hit] ?? 0) + 1;
      }
      const ts = clock.today0 + rel * DAY;
      rows.push({
        id: `cst_${c.id}_${clock.ymd(ts).replace(/-/g, "")}`,
        contentId: c.id,
        date: clock.ymd(ts),
        views,
        visitors,
        clicks: clicks[k],
        leads: leads[k],
        sources,
      });
    });
  }
  ctx.data.contentStats = rows;
}

/* ───────────────────────────── Fil d'activité ───────────────────────────── */

const STATUS_LABEL: Record<string, string> = {
  acceptee: "acceptée",
  inscrite: "inscrite (acompte réglé)",
  refusee: "refusée",
  hors_cible: "classée hors cible",
  liste_attente: "mise en liste d'attente",
  desistee: "désistée",
};

export function buildActivities(ctx: SeedContext): void {
  const { clock, data } = ctx;
  const r = ctx.rng.fork("activities");
  const since = clock.now - 30 * DAY;
  const acts: (Omit<Activity, "id" | "at"> & { ts: number })[] = [];
  const add = (ts: number, kind: ActivityKind, entity: EntityName, entityId: string, summary: string, actorId?: string, meta?: Activity["meta"]) => {
    if (ts >= since && ts <= clock.now) acts.push({ ts, kind, entity, entityId, summary, actorId, meta });
  };
  const contactsById = new Map(data.contacts.map((c) => [c.id, c]));
  const name = (id?: string) => {
    const c = id ? contactsById.get(id) : undefined;
    return c ? `${c.firstName} ${c.lastName}` : "—";
  };
  const eurFmt = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const eur = (c: number) => `${eurFmt.format(c / 100)} €`;
  const codes = new Map(data.events.map((e) => [e.id, e.code]));
  const code = (eventId?: string) => (eventId ? codes.get(eventId) : undefined) ?? "";
  const invoicesById = new Map(data.invoices.map((i) => [i.id, i]));

  for (const a of data.applications) {
    add(Date.parse(a.submittedAt), "creation", "applications", a.id, `Nouvelle candidature #${a.number} — ${name(a.contactId)} (${code(a.eventId)})`, undefined, { source: a.utm?.source ?? "direct" });
    if (a.interviewAt && ["acceptee", "inscrite", "refusee", "liste_attente", "desistee"].includes(a.status)) {
      add(Date.parse(a.interviewAt) + 40 * MIN, "appel", "applications", a.id, `Entretien de qualification réalisé avec ${name(a.contactId)}`, a.reviewerId);
    }
    if (a.decisionAt && STATUS_LABEL[a.status]) {
      const label = a.status === "inscrite" || a.status === "desistee" ? "acceptée" : STATUS_LABEL[a.status];
      add(Date.parse(a.decisionAt), "statut", "applications", a.id, `Candidature #${a.number} ${label}`, a.reviewerId, { status: a.status === "inscrite" || a.status === "desistee" ? "acceptee" : a.status });
    }
    if (a.status === "entretien") add(Date.parse(a.submittedAt) + r.between(20, 40) * HOUR, "statut", "applications", a.id, `Candidature #${a.number} : entretien planifié`, a.reviewerId ?? "usr_lea", { status: "entretien" });
    if (a.convocationSentAt) add(Date.parse(a.convocationSentAt), "document", "applications", a.id, `Convocation envoyée à ${name(a.contactId)} (${code(a.eventId)})`);
    if (a.certificateIssuedAt) add(Date.parse(a.certificateIssuedAt), "document", "applications", a.id, `Certificat de réalisation généré — ${name(a.contactId)}`);
  }

  for (const p of data.payments) {
    const inv = invoicesById.get(p.invoiceId)!;
    const how = p.method === "stripe" ? "Stripe" : p.method === "virement" ? "virement Qonto" : "financeur";
    if (p.status === "rembourse") add(Date.parse(p.receivedAt), "paiement", "invoices", inv.id, `Remboursement de ${eur(p.amountCents)} effectué (avoir ${inv.number})`, "usr_lea", { amountCents: p.amountCents });
    else add(Date.parse(p.receivedAt), "paiement", "invoices", inv.id, `Paiement reçu : ${eur(p.amountCents)} — ${inv.number} (${how})`, undefined, { amountCents: p.amountCents, method: p.method });
  }
  const kindLabel = { facture: "facture", acompte: "facture d'acompte", solde: "facture de solde", avoir: "avoir" } as const;
  for (const inv of data.invoices) {
    add(Date.parse(inv.issuedAt), "document", "invoices", inv.id, `${kindLabel[inv.kind][0].toUpperCase()}${kindLabel[inv.kind].slice(1)} ${inv.number} émise (${eur(linesTotalCents(inv.lines))})`, inv.orgId && !inv.applicationId ? "usr_lea" : undefined);
    if (inv.lastReminderAt) add(Date.parse(inv.lastReminderAt), "email", "invoices", inv.id, `Relance n° ${inv.remindersSent} envoyée pour ${inv.number}`);
  }
  for (const q of data.quotes) {
    if (q.sentAt) add(Date.parse(q.sentAt), "document", "quotes", q.id, `Devis ${q.number} envoyé (${data.organizations.find((o) => o.id === q.orgId)?.name ?? name(q.contactId)})`, "usr_lea");
    if (q.acceptedAt) add(Date.parse(q.acceptedAt), "statut", "quotes", q.id, `Devis ${q.number} accepté`, "usr_lea");
    if (q.status === "brouillon") add(Date.parse(q.createdAt), "creation", "quotes", q.id, `Devis ${q.number} créé (brouillon)`, "usr_lea");
  }
  for (const s of data.submissions) {
    if (s.type === "candidature") continue;
    add(Date.parse(s.receivedAt), "creation", "submissions", s.id, `Nouvelle demande ${s.type.replace(/_/g, " ")} — ${s.company ?? s.name}`);
  }
  for (const d of data.deals) {
    add(Date.parse(d.createdAt), "creation", "deals", d.id, `Opportunité créée : ${d.title}`, d.ownerId);
    if (d.closedAt) add(Date.parse(d.closedAt), "statut", "deals", d.id, `Opportunité ${d.stage === "gagne" ? "gagnée" : "perdue"} : ${d.title}`, d.ownerId);
    else if (d.stage !== "nouveau" && r.chance(0.6)) add(clock.now - r.between(1, 25) * DAY - r.between(1, 8) * HOUR, "note", "deals", d.id, `Note : ${d.nextStep ?? "point d'avancement"} (${d.title})`, d.ownerId);
  }
  for (const c of data.complaints) {
    add(Date.parse(c.receivedAt), "creation", "complaints", c.id, `Réclamation ${c.number} reçue : ${c.subject}`);
    if (c.ackAt) add(Date.parse(c.ackAt), "email", "complaints", c.id, `Accusé de réception envoyé (${c.number})`, c.ownerId);
    if (c.closedAt) add(Date.parse(c.closedAt), "statut", "complaints", c.id, `Réclamation ${c.number} clôturée`, c.ownerId);
  }
  for (const t of data.tasks) {
    if (t.doneAt) add(Date.parse(t.doneAt), "modification", "tasks", t.id, `Tâche terminée : ${t.title}`, t.assigneeId);
  }
  for (const c of data.contents) {
    if (c.publishedAt) add(Date.parse(c.publishedAt), "modification", "contents", c.id, `Contenu publié : ${c.title}`, c.authorId);
  }
  for (const a of data.improvementActions) {
    add(Date.parse(a.createdAt), "creation", "improvementActions", a.id, `Action d'amélioration ouverte : ${a.title}`, a.ownerId);
    if (a.doneAt) add(Date.parse(a.doneAt), "statut", "improvementActions", a.id, `Action d'amélioration terminée : ${a.title}`, a.ownerId);
  }
  // Émargements par demi-journée (synthèse).
  const byHalf = new Map<string, { eventId: string; total: number; present: number; ts: number; label: string }>();
  for (const att of data.attendances) {
    const key = `${att.eventId}|${att.date}|${att.halfDay}`;
    const cur = byHalf.get(key) ?? { eventId: att.eventId, total: 0, present: 0, ts: Date.parse(att.createdAt), label: `${att.date} ${att.halfDay === "matin" ? "matin" : "après-midi"}` };
    cur.total++;
    if (att.status === "present" || att.status === "retard") cur.present++;
    cur.ts = Math.max(cur.ts, Date.parse(att.createdAt));
    byHalf.set(key, cur);
  }
  for (const v of byHalf.values()) add(v.ts + 15 * MIN, "document", "events", v.eventId, `Émargements ${code(v.eventId)} — ${v.label} : ${v.present}/${v.total} présents`);
  // Quelques emails notables (accusés de réception, convocations) — échantillon.
  for (const m of data.emails.filter((e) => e.sentAt && e.templateId && ["tpl_ack_entreprise", "tpl_ack_partenariat", "tpl_eval_chaud", "tpl_relance_devis"].includes(e.templateId))) {
    add(Date.parse(m.sentAt!), "email", m.related?.entity ?? "emails", m.related?.id ?? m.id, `Email « ${m.subject} » envoyé à ${m.to}`);
  }
  // Synchronisations système.
  for (let d = 1; d <= 29; d += 7) {
    add(clock.now - d * DAY - 3 * HOUR, "systeme", "bankTransactions", data.bankTransactions.at(-1)?.id ?? "btx_0001", `Rapprochement Qonto : ${r.between(3, 9)} transactions rapprochées automatiquement`);
  }
  add(clock.now - 2 * HOUR, "systeme", "events", "ev_sw0012", "Site synchronisé : 13 sessions publiées, places restantes recalculées");

  const ordered = sortBy(acts, (a) => -a.ts).slice(0, 200);
  data.activities = ordered.map(({ ts, ...a }, i) => ({ id: `evt_${pad(ordered.length - i)}`, at: clock.iso(ts), ...a }));
}
