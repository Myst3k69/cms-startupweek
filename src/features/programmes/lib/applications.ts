/**
 * Orchestration des candidatures côté module Programmes :
 * - garde « Alerte capacité » (reprise d'Airtable) avant de passer une candidature en « inscrite » ;
 * - appel de l'action métier partagée `changeApplicationStatus` ;
 * - résumé lisible de ce qui a été automatisé (factures, emails, tâches) pour le toast.
 */
import { crm, findById } from "@/lib/store";
import { changeApplicationStatus, sendEmail } from "@/lib/domain/actions";
import { APPLICATION_STATUSES, labelOf } from "@/lib/domain/constants";
import { contactName, invoiceTotal } from "@/lib/domain/selectors";
import type { Activity, Application, ApplicationStatus, EntityName, ID, TemplateCategory } from "@/lib/domain/types";
import { dateTime, money } from "@/lib/format";
import { truncate } from "@/lib/utils";

export interface MoveResult {
  ok: boolean;
  tone: "success" | "info" | "danger";
  title: string;
  description?: string;
}

/** Inscrits d'une session (hors candidature courante). */
function enrolledCount(eventId: ID, exceptId?: ID) {
  return crm().applications.filter((a) => a.eventId === eventId && a.status === "inscrite" && a.id !== exceptId).length;
}

/** Vérifie qu'une candidature peut être inscrite (capacité de la session). */
export function capacityCheck(app: Application): { ok: boolean; enrolled: number; capacity: number; code: string } {
  const ev = findById("events", app.eventId);
  if (!ev) return { ok: true, enrolled: 0, capacity: 0, code: "" };
  const enrolled = enrolledCount(ev.id, app.id);
  return { ok: enrolled < ev.capacity, enrolled, capacity: ev.capacity, code: ev.code };
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function uncapitalize(s: string) {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}

/**
 * Change le statut d'une candidature (avec garde de capacité) et décrit les automatisations déclenchées.
 * À appeler depuis un gestionnaire d'événement (jamais pendant le rendu).
 */
export function moveApplication(applicationId: ID, to: ApplicationStatus): MoveResult {
  const s = crm();
  const app = findById("applications", applicationId);
  if (!app) return { ok: false, tone: "danger", title: "Candidature introuvable" };
  if (app.status === to) return { ok: false, tone: "info", title: "Statut inchangé" };
  const ev = findById("events", app.eventId);
  const contact = findById("contacts", app.contactId);
  const who = `#${app.number} ${contactName(contact)}`;

  if (to === "inscrite" && ev) {
    const cap = capacityCheck(app);
    if (!cap.ok) {
      return {
        ok: false,
        tone: "danger",
        title: `Alerte capacité — ${ev.code} est complète`,
        description: `${cap.enrolled}/${cap.capacity} inscrits : impossible d'inscrire ${who}. Mettez la candidature en liste d'attente ou augmentez la capacité de la session.`,
      };
    }
  }

  const before = { invoices: new Set(s.invoices.map((i) => i.id)), emails: new Set(s.emails.map((m) => m.id)), tasks: new Set(s.tasks.map((t) => t.id)) };
  changeApplicationStatus(applicationId, to);
  const after = crm();
  const templates = new Map(after.emailTemplates.map((t) => [t.id, t]));

  const parts: string[] = [];
  after.invoices
    .filter((i) => !before.invoices.has(i.id))
    .forEach((i) => parts.push(`facture ${i.kind === "acompte" ? "d'acompte" : i.kind === "solde" ? "de solde" : ""} ${i.number} créée (${money(invoiceTotal(i).ttc)})`.replace("  ", " ")));
  after.emails
    .filter((m) => !before.emails.has(m.id))
    .forEach((m) => {
      const name = m.templateId ? templates.get(m.templateId)?.name : undefined;
      parts.push(`email « ${truncate(name ?? m.subject, 52)} » ${m.status === "programme" ? "programmé" : "envoyé"}`);
    });
  after.tasks.filter((t) => !before.tasks.has(t.id)).forEach((t) => parts.push(`tâche « ${truncate(t.title, 52)} » créée`));
  if (to === "inscrite") parts.push("contact passé en « participant »");
  if (to === "desistee" && ev) parts.push(`place libérée sur ${ev.code}`);
  if (to === "hors_cible") parts.push("tunnel marqué « hors cible »");

  let tone: MoveResult["tone"] = "success";
  if (to === "acceptee" && ev && enrolledCount(ev.id) >= ev.capacity) {
    parts.push(`attention : ${ev.code} est déjà complète, la place ira au premier acompte réglé`);
    tone = "info";
  }
  if (to === "inscrite") {
    const deposit = after.invoices.find((i) => i.applicationId === app.id && i.kind === "acompte" && i.status !== "annulee");
    if (!deposit || deposit.paidCents <= 0) {
      parts.push("aucun acompte encaissé à ce jour : vérifiez le paiement");
      tone = "info";
    }
  }

  return {
    ok: true,
    tone,
    title: `${labelOf(APPLICATION_STATUSES, to)} — ${who}`,
    description: parts.length ? `${capitalize(parts.join(" · "))}.` : "Statut mis à jour.",
  };
}

/* ───────────── Checklist Qualiopi ───────────── */

export type ChecklistKey = "needsAnalysis" | "positioning" | "prerequisites" | "accessibility" | "convocation" | "agreement" | "certificate";

export const CHECKLIST: { key: ChecklistKey; label: string; indicator?: number; hint: string }[] = [
  { key: "needsAnalysis", label: "Analyse du besoin", indicator: 4, hint: "Entretien ou questionnaire d'analyse du besoin réalisé et tracé." },
  { key: "positioning", label: "Positionnement d'entrée", indicator: 8, hint: "Évaluation des acquis à l'entrée (note sur 10)." },
  { key: "prerequisites", label: "Prérequis validés", indicator: 8, hint: "Prérequis vérifiés avant l'entrée en formation." },
  { key: "accessibility", label: "Besoins d'aménagement / handicap", indicator: 26, hint: "Situation de handicap recueillie et aménagements définis avec la référente." },
  { key: "convocation", label: "Convocation envoyée", indicator: 9, hint: "Programme, horaires, lieu, accès et règlement intérieur transmis." },
  { key: "agreement", label: "Convention / contrat signé", hint: "Convention (financement tiers) ou contrat de formation signé." },
  { key: "certificate", label: "Certificat de réalisation", hint: "Délivré à l'issue de la formation (assiduité)." },
];

export function accessibilityState(app: Pick<Application, "accessibilityNeeds" | "accommodations">): "aucun" | "a_traiter" | "amenage" {
  if (!app.accessibilityNeeds?.trim()) return "aucun";
  return app.accommodations?.trim() ? "amenage" : "a_traiter";
}

export function checklistStatus(app: Application): Record<ChecklistKey, boolean> {
  return {
    needsAnalysis: app.needsAnalysisDone,
    positioning: typeof app.positioningScore === "number",
    prerequisites: app.prerequisitesOk,
    accessibility: accessibilityState(app) !== "a_traiter",
    convocation: Boolean(app.convocationSentAt),
    agreement: Boolean(app.agreementSignedAt),
    certificate: Boolean(app.certificateIssuedAt),
  };
}

export function checklistProgress(app: Application): { done: number; total: number } {
  const st = checklistStatus(app);
  const values = Object.values(st);
  return { done: values.filter(Boolean).length, total: values.length };
}

/**
 * Horodatage d'un élément de checklist sans champ date dans le contrat
 * (analyse du besoin, prérequis, positionnement…) : on relit le journal d'activité,
 * où chaque bascule est tracée avec `meta.field`.
 */
export function stampFromLog(activities: Activity[], entity: EntityName, id: ID, field: string): Activity | undefined {
  return activities.find((a) => a.entity === entity && a.entityId === id && a.meta?.field === field);
}

/* ───────────── Entretien & emails ───────────── */

/**
 * Template dont le nom/l'objet contient un mot-clé — sans repli sur « le premier de la catégorie »
 * (contrairement à `findTemplate`, on ne veut pas envoyer un email d'acceptation à la place d'une invitation).
 */
export function templateMatching(category: TemplateCategory, ...keywords: string[]) {
  const list = crm().emailTemplates.filter((t) => t.category === category);
  for (const k of keywords) {
    const found = list.find((t) => `${t.name} ${t.subject}`.toLowerCase().includes(k.toLowerCase()));
    if (found) return found;
  }
  return undefined;
}

/** Planifie (ou replanifie) l'entretien : date, passage en « Entretien planifié », invitation email. */
export function scheduleInterview(applicationId: ID, iso: string | undefined, notify: boolean): MoveResult {
  const s = crm();
  const app = findById("applications", applicationId);
  if (!app) return { ok: false, tone: "danger", title: "Candidature introuvable" };
  const contact = findById("contacts", app.contactId);
  const ev = findById("events", app.eventId);
  const parts: string[] = [];
  if (iso) {
    s.update("applications", app.id, { interviewAt: iso }, { log: `Entretien planifié le ${dateTime(iso)}`, kind: "appel" });
    parts.push(`entretien le ${dateTime(iso)}`);
  }
  let title = `Entretien planifié — #${app.number} ${contactName(contact)}`;
  if (app.status !== "entretien") {
    const res = moveApplication(app.id, "entretien");
    if (!res.ok) return res;
    if (res.description) parts.push(uncapitalize(res.description.replace(/\.$/, "")));
    title = res.title;
  }
  if (notify && contact && iso) {
    const tpl = templateMatching("candidature", "entretien");
    sendEmail({
      to: contact.email,
      template: tpl,
      subject: tpl ? undefined : "Votre entretien StartupWeek — {{date_entretien}}",
      body: tpl
        ? undefined
        : "Bonjour {{prenom}},\n\nMerci pour votre candidature à la session {{session}} ({{code_session}}).\nNous vous proposons un entretien de 30 minutes le {{date_entretien}} (visio, lien envoyé la veille).\nSi le créneau ne vous convient pas, répondez simplement à cet email.\n\nÀ très vite,\nL'équipe StartupWeek",
      vars: { prenom: contact.firstName, session: ev?.name, code_session: ev?.code, date_entretien: dateTime(iso) },
      related: { entity: "applications", id: app.id },
    });
    parts.push("invitation envoyée par email");
  }
  return { ok: true, tone: "success", title, description: parts.length ? `${capitalize(parts.join(" · "))}.` : undefined };
}
