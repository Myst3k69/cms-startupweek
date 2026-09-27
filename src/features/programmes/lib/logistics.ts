/**
 * Logistique des sessions — dérivations pures (aucun accès au store) :
 * devis & échéanciers fournisseurs, séjours, rétroplanning, complétude des infos pratiques.
 */
import type { EventSession, ExpenseInstallment, SessionExpense, SessionLogistics, SessionStay, Task, Venue, VenueOption } from "@/lib/domain/types";

const DAY = 86_400_000;

/* ───────────────────────────── Devis & paiements ───────────────────────────── */

export type InstallmentState = "payee" | "en_retard" | "a_venir";

export function installmentState(i: ExpenseInstallment, now: number): InstallmentState {
  if (i.paidAt) return "payee";
  return Date.parse(i.dueAt) < now ? "en_retard" : "a_venir";
}

export const expensePaid = (e: SessionExpense) => e.installments.reduce((s, i) => s + (i.paidAt ? i.amountCents : 0), 0);

/** Engagé = devis accepté (les devis reçus ou demandés ne comptent pas). */
export const isCommitted = (e: SessionExpense) => e.status === "accepte";

export const expenseRemaining = (e: SessionExpense) => (isCommitted(e) ? Math.max(0, e.amountCents - expensePaid(e)) : 0);

/** Montant d'un devis accepté qui n'est couvert par aucune échéance (échéancier à compléter). */
export const expenseUnscheduled = (e: SessionExpense) => (isCommitted(e) ? Math.max(0, e.amountCents - e.installments.reduce((s, i) => s + i.amountCents, 0)) : 0);

export function nextInstallment(e: SessionExpense): ExpenseInstallment | undefined {
  return e.installments.filter((i) => !i.paidAt).sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
}

export interface ExpenseSummary {
  committed: number;
  paid: number;
  remaining: number;
  pendingCount: number; // devis à demander / demandés / reçus (à décider)
  pendingAmount: number;
  overdueCount: number;
  overdueAmount: number;
  next?: { expense: SessionExpense; installment: ExpenseInstallment };
}

export function summarizeExpenses(expenses: SessionExpense[], now: number): ExpenseSummary {
  const out: ExpenseSummary = { committed: 0, paid: 0, remaining: 0, pendingCount: 0, pendingAmount: 0, overdueCount: 0, overdueAmount: 0 };
  for (const e of expenses) {
    if (e.status === "refuse") continue;
    if (!isCommitted(e)) {
      out.pendingCount += 1;
      out.pendingAmount += e.amountCents;
      continue;
    }
    out.committed += e.amountCents;
    out.paid += expensePaid(e);
    out.remaining += expenseRemaining(e);
    for (const i of e.installments) {
      if (installmentState(i, now) === "en_retard") {
        out.overdueCount += 1;
        out.overdueAmount += i.amountCents;
      }
      if (!i.paidAt && (!out.next || i.dueAt < out.next.installment.dueAt)) out.next = { expense: e, installment: i };
    }
  }
  return out;
}

/** Échéancier par défaut : acompte (x %) sous 7 jours, solde à J-30 du début de session (jamais avant le lendemain de l'acompte). */
export function defaultSchedule(amountCents: number, ev: Pick<EventSession, "startAt">, now: number, depositPercent = 30): ExpenseInstallment[] {
  const deposit = Math.round((amountCents * depositPercent) / 100);
  const balanceDue = Math.max(now + 8 * DAY, Date.parse(ev.startAt) - 30 * DAY);
  return [
    { id: `i${now.toString(36)}a`, label: `Acompte ${depositPercent} %`, amountCents: deposit, dueAt: new Date(now + 7 * DAY).toISOString() },
    { id: `i${now.toString(36)}b`, label: "Solde", amountCents: amountCents - deposit, dueAt: new Date(balanceDue).toISOString() },
  ];
}

/* ───────────────────────────── Lieux & sourcing ───────────────────────────── */

/** Nombre de nuits d'une session (arrivée la veille du premier jour, départ le dernier jour). */
export function nightsOf(ev: Pick<EventSession, "startAt" | "endAt">): number {
  const a = new Date(ev.startAt);
  const b = new Date(ev.endAt);
  const days = Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY);
  return Math.max(1, days + 1);
}

/** Estimation du coût du lieu pour la session à partir du tarif indicatif par nuit. */
export function venueEstimate(v: Pick<Venue, "pricePerNightCents">, ev: Pick<EventSession, "startAt" | "endAt">): number | undefined {
  return v.pricePerNightCents ? v.pricePerNightCents * nightsOf(ev) : undefined;
}

/** Coût par participant (capacité pleine) — base de comparaison entre lieux. */
export function perHead(totalCents: number | undefined, capacity: number): number | undefined {
  if (!totalCents || capacity <= 0) return undefined;
  return Math.round(totalCents / capacity);
}

/** Capacité suffisante ? (participants + encadrement, par défaut 2 personnes). */
export function capacityFit(v: Pick<Venue, "beds" | "workspaceSeats">, ev: Pick<EventSession, "capacity">, staff = 2): { beds?: boolean; seats?: boolean } {
  const need = ev.capacity + staff;
  return { beds: v.beds === undefined ? undefined : v.beds >= need, seats: v.workspaceSeats === undefined ? undefined : v.workspaceSeats >= ev.capacity + 1 };
}

export const OPEN_OPTION_STAGES: VenueOption["stage"][] = ["identifie", "demande", "devis_recu", "option"];

/** Option posée qui expire bientôt (≤ 3 jours) ou déjà expirée. */
export function optionExpiry(o: VenueOption, now: number): "expiree" | "bientot" | undefined {
  if (o.stage !== "option" || !o.optionUntil) return undefined;
  const t = Date.parse(o.optionUntil);
  if (t < now) return "expiree";
  return t - now <= 3 * DAY ? "bientot" : undefined;
}

/* ───────────────────────────── Séjours ───────────────────────────── */

export interface StayRow {
  key: string; // clé stable (contact / intervenant / séjour libre)
  role: SessionStay["role"];
  name: string;
  contactId?: string;
  speakerId?: string;
  stay?: SessionStay;
}

/** Arrivées regroupées par créneau (jour + heure arrondie) : base du planning des navettes. */
export function arrivalGroups(stays: SessionStay[]): { at: string; count: number; shuttle: number; names: string[] }[] {
  const map = new Map<string, { at: string; count: number; shuttle: number; names: string[] }>();
  for (const s of stays) {
    if (!s.arrivalAt) continue;
    const d = new Date(s.arrivalAt);
    d.setMinutes(0, 0, 0);
    const k = d.toISOString();
    const g = map.get(k) ?? { at: k, count: 0, shuttle: 0, names: [] };
    g.count += 1;
    if (s.shuttle) g.shuttle += 1;
    g.names.push(s.name);
    map.set(k, g);
  }
  return [...map.values()].sort((a, b) => a.at.localeCompare(b.at));
}

/** Occupation des chambres (libellé de chambre → personnes). */
export function roomOccupancy(stays: SessionStay[]): { room: string; names: string[] }[] {
  const map = new Map<string, string[]>();
  for (const s of stays) {
    const room = s.room?.replace(/\s*\(.*\)\s*$/, "").trim();
    if (!room) continue;
    map.set(room, [...(map.get(room) ?? []), s.name]);
  }
  return [...map.entries()].map(([room, names]) => ({ room, names })).sort((a, b) => a.room.localeCompare(b.room, "fr", { numeric: true }));
}

/* ───────────────────────────── Infos pratiques ───────────────────────────── */

export const LOGISTICS_FIELDS: { key: Exclude<keyof SessionLogistics, "whatToBring">; label: string; placeholder: string; long?: boolean; essential?: boolean }[] = [
  { key: "address", label: "Adresse du lieu", placeholder: "Villa Adriatica — Put Firula 12, 21000 Split", essential: true },
  { key: "mapsUrl", label: "Lien de carte", placeholder: "https://maps.google.com/…" },
  { key: "nearestHub", label: "Aéroport / gare le plus proche", placeholder: "Aéroport de Split (SPU)", essential: true },
  { key: "access", label: "Comment venir", placeholder: "Vols directs, taxi, navettes groupées…", long: true, essential: true },
  { key: "checkIn", label: "Arrivée (check-in)", placeholder: "Vendredi 13 novembre à partir de 16 h", essential: true },
  { key: "checkOut", label: "Départ (check-out)", placeholder: "Samedi 21 novembre avant 11 h", essential: true },
  { key: "meetingPoint", label: "Point de rendez-vous", placeholder: "Hall des arrivées, sortie B" },
  { key: "shuttle", label: "Navettes / transferts", placeholder: "Vendredi 15 h et 19 h depuis l'aéroport", long: true },
  { key: "onsiteContact", label: "Contact sur place", placeholder: "Prénom — +33 6 …", essential: true },
  { key: "emergency", label: "Urgences", placeholder: "112 · hôpital le plus proche…" },
  { key: "wifi", label: "Wifi", placeholder: "Réseau et modalités" },
  { key: "meals", label: "Repas", placeholder: "Petits-déjeuners, déjeuners, dîners, régimes…", long: true, essential: true },
  { key: "houseRules", label: "Règles du lieu", placeholder: "Horaires calmes, piscine, ménage…", long: true },
  { key: "extra", label: "Autres informations", placeholder: "Météo, tenue, monnaie locale…", long: true },
];

export function logisticsCompleteness(l: SessionLogistics | undefined): { done: number; total: number; missing: string[] } {
  const essentials = LOGISTICS_FIELDS.filter((f) => f.essential);
  const missing = essentials.filter((f) => !l?.[f.key]?.trim()).map((f) => f.label);
  const hasBring = Boolean(l?.whatToBring?.length);
  return { done: essentials.length - missing.length + (hasBring ? 1 : 0), total: essentials.length + 1, missing: hasBring ? missing : [...missing, "Quoi apporter"] };
}

/* ───────────────────────────── Rétroplanning ───────────────────────────── */

export const PLAYBOOK_NOTE = "Rétroplanning logistique";

export const isEventTask = (t: Task, eventId: string) => t.related?.entity === "events" && t.related.id === eventId;

export function taskProgress(tasks: Task[], now: number): { done: number; total: number; overdue: number } {
  return {
    done: tasks.filter((t) => t.doneAt).length,
    total: tasks.length,
    overdue: tasks.filter((t) => !t.doneAt && Date.parse(t.dueAt) < now).length,
  };
}
