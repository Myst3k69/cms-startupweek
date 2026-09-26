/** Dérivations communes aux documents de formation (pures). */
import type { EventSession, ProgramSlot, Settings, Speaker, User } from "@/lib/domain/types";
import { EVENT_MODES, labelOf } from "@/lib/domain/constants";

const DAY = 86_400_000;

/** Représentant légal = premier administrateur actif (président de la SASU). */
export function legalRepresentative(users: User[]): User | undefined {
  return users.find((u) => u.role === "admin" && u.active) ?? users.find((u) => u.role === "admin");
}

export function isRemote(ev: EventSession) {
  return ev.mode === "distanciel";
}

export function placeOf(ev: EventSession): string {
  if (isRemote(ev)) return "À distance — classe virtuelle (lien de connexion envoyé par email avant le début de la session)";
  const where = [ev.venue, ev.city, ev.region !== "France" ? ev.region : undefined].filter(Boolean).join(", ");
  return ev.mode === "hybride" ? `${where} et à distance (hybride)` : where;
}

export function modeLabel(ev: EventSession) {
  return `${labelOf(EVENT_MODES, ev.mode)}${isRemote(ev) ? " (formation à distance synchrone)" : ""}`;
}

export interface ProgramDay {
  day: number;
  date: string; // ISO du jour
  start: string;
  end: string;
  slots: ProgramSlot[];
}

export function programDays(ev: EventSession): ProgramDay[] {
  const start0 = Math.floor(Date.parse(ev.startAt) / DAY) * DAY;
  const days = Array.from(new Set(ev.program.map((p) => p.day))).sort((a, b) => a - b);
  return days.map((d) => {
    const slots = ev.program.filter((p) => p.day === d).sort((a, b) => a.start.localeCompare(b.start));
    return {
      day: d,
      date: new Date(start0 + (d - 1) * DAY + 12 * 3_600_000).toISOString(),
      start: slots[0]?.start ?? "",
      end: slots.reduce((m, s) => (s.end > m ? s.end : m), ""),
      slots,
    };
  });
}

export function trainingDaysCount(ev: EventSession) {
  const n = programDays(ev).length;
  if (n) return n;
  return Math.max(1, Math.round((Date.parse(ev.endAt) - Date.parse(ev.startAt)) / DAY) + 1);
}

/** « 09:30 » − 30 min → « 09:00 ». */
export function minusMinutes(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h)) return hhmm;
  const t = Math.max(0, h * 60 + (m || 0) - minutes);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function hoursLabel(h: number) {
  return `${h.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} heure${h > 1 ? "s" : ""}`;
}

export function audienceOf(ev: EventSession): string {
  switch (ev.kind) {
    case "startup_week":
      return "Porteurs de projet, entrepreneurs, indépendants et salariés (reconversion, intrapreneuriat) souhaitant concevoir, construire et tester un MVP digital.";
    case "startup_village":
      return "Étudiants de la promotion de l'établissement partenaire, constitués en équipes projet.";
    case "evenement_entreprise":
      return "Collaborateurs volontaires de l'entreprise cliente (équipes métiers, innovation, transformation).";
    default:
      return "Porteurs de projet et entrepreneurs, sans prérequis.";
  }
}

export function methodsOf(ev: EventSession): string[] {
  const common = [
    "Pédagogie active par projet : chaque stagiaire (ou équipe) construit son propre MVP tout au long de la session.",
    "Alternance d'apports courts, d'ateliers pratiques et de mentorat individuel quotidien par des praticiens (no-code, IA, produit, business).",
    "Outils no-code et IA générative en conditions réelles ; tests auprès d'utilisateurs ; démonstration finale devant un jury.",
  ];
  if (isRemote(ev)) return [...common, "Classes virtuelles live quotidiennes, espace de travail en ligne, supports et replays accessibles ; assistance technique et pédagogique par email et messagerie."];
  if (ev.kind === "startup_week") return [...common, "Immersion en résidence (villa) : hébergement et repas sur place, espaces de travail équipés (wifi, écrans, paperboards)."];
  return [...common, "Salle équipée (vidéoprojection, wifi), supports numériques remis aux participants."];
}

export function includesLodging(ev: EventSession) {
  return !isRemote(ev) && ev.highlights.some((h) => /hébergement/i.test(h));
}

export function priceParts(priceTtcCents: number, settings: Settings) {
  const vatRate = settings.vatExempt ? 0 : 20;
  const ht = vatRate ? Math.round(priceTtcCents / (1 + vatRate / 100)) : priceTtcCents;
  const deposit = Math.round((priceTtcCents * settings.depositPercent) / 100);
  return { ttc: priceTtcCents, ht, vat: priceTtcCents - ht, vatRate, deposit, balance: priceTtcCents - deposit };
}

export function balanceDueDate(ev: EventSession, settings: Settings) {
  return new Date(Date.parse(ev.startAt) - settings.balanceDaysBefore * DAY).toISOString();
}

export function speakerName(s?: Pick<Speaker, "firstName" | "lastName">) {
  return s ? `${s.firstName} ${s.lastName}` : "";
}

export function docRef(prefix: string, startAt: string, n: number | string) {
  return `${prefix}-${new Date(startAt).getFullYear()}-${String(n).padStart(4, "0")}`;
}

/** Niveau d'acquisition (/5) → libellé. */
export function acquisitionLevel(v: number) {
  if (v >= 4) return "Maîtrisé";
  if (v >= 3) return "Acquis";
  if (v >= 2) return "En cours d'acquisition";
  return "Non acquis";
}

export function capitalize(s: string) {
  const t = s.replace(/[_-]+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
