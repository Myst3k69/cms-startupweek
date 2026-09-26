/**
 * Simulation locale (mode démo) de la réception d'un formulaire par `/api/intake/<form>` :
 * reproduit dans le store les écritures de `persistIntake()` pour visualiser le flux complet.
 */
import { crm } from "@/lib/store";
import { acknowledgeComplaint, createTask, ensureContactFromSubmission, findTemplate, nextComplaintNumber, sendEmail } from "@/lib/domain/actions";
import type { ComplaintType, DealType, ID, Persona, Submission } from "@/lib/domain/types";
import { DEAL_STAGE_PROBABILITY } from "@/lib/domain/constants";
import { FORM_META, normalizeLocal, type IntakeForm } from "./intake";
import { matchesWorkflow } from "./n8n";

export interface SimStep {
  label: string;
  detail?: string;
  href?: string;
}

export type SimResult = { ok: true; duplicate: boolean; steps: SimStep[]; submissionId: ID } | { ok: false; error: string; issues: string[] };

const COMPLAINT_TYPES: ComplaintType[] = ["qualite", "organisation", "paiement", "remboursement", "annulation", "accessibilite", "autre"];

const logSystem = (entity: "submissions" | "contacts" | "applications" | "deals" | "complaints" | "automations", entityId: ID, summary: string) =>
  crm().log({ kind: "systeme", entity, entityId, summary });

function persona(fields: Record<string, string>): Persona {
  const tech = (fields.technicalLevel ?? "").toLowerCase();
  const txt = `${fields.motivation ?? ""} ${fields.objectives ?? ""}`.toLowerCase();
  if (/reconversion|changer de métier|transition/.test(txt)) return "reconversion";
  if (/avanc|expert|intermediaire|intermédiaire|dev/.test(tech)) return "tech";
  return "non_tech";
}

export function simulateIntake(form: IntakeForm, payload: unknown): SimResult {
  const s = crm();
  const norm = normalizeLocal(form, payload, { now: Date.now(), slaHours: s.settings.slaHours, ackHours: s.settings.complaintAckHours });
  if (!norm.ok) return { ok: false, error: norm.error, issues: norm.issues };
  const meta = FORM_META[form];
  const draft = norm.submission;

  // Idempotence : même leadId / même empreinte ⇒ pas de doublon (corrige les upserts n8n).
  const existing = s.submissions.find((x) => x.idempotencyKey && x.idempotencyKey === draft.idempotencyKey);
  if (existing) {
    return { ok: true, duplicate: true, submissionId: existing.id, steps: [{ label: "Doublon détecté (idempotence) — rien n'a été recréé", detail: `Clé ${existing.idempotencyKey}`, href: "/demandes" }] };
  }

  const steps: SimStep[] = [];
  const sub = s.create("submissions", draft, { log: false });
  logSystem("submissions", sub.id, `Demande reçue via POST /api/intake/${form} (simulation)`);
  steps.push({ label: `Demande « ${meta.label} » enregistrée`, detail: draft.slaDueAt ? `Échéance de réponse : ${new Date(draft.slaDueAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}` : "Sans engagement de réponse", href: "/demandes" });

  const known = s.contacts.some((c) => c.email.trim().toLowerCase() === draft.email);
  const contactId = ensureContactFromSubmission(sub);
  const patch: Partial<Submission> = { contactId };
  steps.push({ label: known ? "Contact existant enrichi (fusion, sans écrasement)" : "Contact créé", detail: `Consentement RGPD ${draft.consent.gdpr ? "oui" : "non"} · marketing ${draft.consent.marketing ? "oui" : "non"} (jamais forcé)`, href: `/contacts/${contactId}` });

  const f = draft.fields;
  if (form === "candidature") {
    const ev = norm.eventCode ? crm().events.find((e) => e.code.toUpperCase() === norm.eventCode) : undefined;
    if (ev) {
      const number = crm().applications.reduce((m, a) => Math.max(m, a.number), 0) + 1;
      const app = crm().create(
        "applications",
        {
          number,
          eventId: ev.id,
          contactId,
          status: f.qualified === "true" ? "qualifiee" : "nouvelle",
          leadStage: "qualification",
          intent: f.intent === "diagnostic" ? "diagnostic" : "candidature",
          persona: persona(f),
          submittedAt: draft.receivedAt,
          score: 50,
          scoreDetail: { motivation: 12, projet: 12, disponibilite: 13, adequation: 13 },
          motivation: f.motivation ?? f.objectives ?? "",
          entrepreneurialXp: "premiere",
          technicalXp: "debutant",
          availability: f.availability ?? "",
          budget: f.budget ?? "",
          heardFrom: f.hearAboutUs,
          funding: "personnel",
          needsAnalysisDone: false,
          prerequisitesOk: false,
          amountDueCents: 0,
          amountPaidCents: 0,
          idempotencyKey: draft.idempotencyKey,
          utm: draft.utm,
        },
        { log: false },
      );
      logSystem("applications", app.id, `Candidature #${number} créée depuis le site (${ev.code})`);
      patch.applicationId = app.id;
      steps.push({ label: `Candidature #${number} créée`, detail: `${ev.code} · ${ev.name}`, href: `/candidatures/${app.id}` });
    } else {
      steps.push({ label: "Session introuvable : candidature à rattacher manuellement", detail: norm.eventCode ? `Code ${norm.eventCode} inconnu` : "Aucun code session dans le payload" });
    }
  }

  if (form === "entreprise" || form === "partenaire" || form === "accompagnement") {
    const type: DealType = form === "accompagnement" ? "accompagnement" : form === "partenaire" ? (/sponsor/i.test(f.partnershipType ?? "") ? "sponsoring" : "partenariat") : /[ée]cole|universit|campus/i.test(`${f.sector ?? ""} ${draft.company ?? ""}`) ? "ecole" : "entreprise";
    const deal = crm().create(
      "deals",
      {
        title: `${draft.company ?? draft.name} — ${f.format ?? f.serviceName ?? f.partnershipType ?? meta.label}`,
        type,
        stage: form === "accompagnement" && f.hasReservedBooking === "true" ? "rdv" : "nouveau",
        amountCents: 0,
        probability: DEAL_STAGE_PROBABILITY.nouveau,
        contactId,
        ownerId: undefined,
        source: form === "accompagnement" ? "site_accompagnement" : form === "partenaire" ? "site_partenariat" : "site_entreprise",
        submissionId: sub.id,
        nextStep: "Rappeler sous 48 h",
      },
      { log: false },
    );
    logSystem("deals", deal.id, "Opportunité créée depuis une demande du site");
    patch.dealId = deal.id;
    steps.push({ label: "Opportunité créée (étape « Nouveau »)", detail: deal.title, href: "/pipeline" });
  }

  if (form === "reclamation") {
    const t = (f.typeReclamation ?? "").toLowerCase() as ComplaintType;
    const complaint = crm().create(
      "complaints",
      {
        number: nextComplaintNumber(),
        receivedAt: draft.receivedAt,
        channel: "formulaire",
        type: COMPLAINT_TYPES.includes(t) ? t : "autre",
        severity: "mineure",
        status: "recue",
        contactId,
        subject: draft.subject ?? "Réclamation",
        description: draft.message ?? "",
      },
      { log: false },
    );
    logSystem("complaints", complaint.id, `Réclamation ${complaint.number} reçue via le site`);
    acknowledgeComplaint(complaint.id);
    patch.complaintId = complaint.id;
    steps.push({ label: `Réclamation ${complaint.number} créée et accusé de réception envoyé`, detail: "Engagement Qualiopi ind. 31 tenu à la seconde près", href: "/qualiopi/reclamations" });
  }

  crm().update("submissions", sub.id, patch);

  // Accusé de réception / email de bienvenue (le template qui remplace le workflow n8n ; les réclamations ont le leur).
  if (form !== "reclamation") {
    const templates = crm().emailTemplates;
    const tpl = templates.find((t) => t.replacesN8n && matchesWorkflow(t.replacesN8n, meta.n8n)) ?? findTemplate("accuse_reception", meta.label.split(" ")[0].toLowerCase());
    const ev = norm.eventCode ? crm().events.find((e) => e.code.toUpperCase() === norm.eventCode) : undefined;
    const mail = sendEmail({
      to: draft.email,
      template: tpl,
      subject: tpl ? undefined : "Nous avons bien reçu votre demande",
      body: tpl ? undefined : "Bonjour {{prenom}},\n\nMerci pour votre message : l'équipe StartupWeek vous répond sous 48 h.\n\nL'équipe StartupWeek",
      vars: {
        prenom: draft.name.includes("@") ? "" : draft.name.split(" ")[0],
        session: ev?.name ?? norm.eventCode ?? "",
        code_session: ev?.code ?? norm.eventCode ?? "",
        date_debut: ev ? new Date(ev.startAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "",
        entreprise: draft.company ?? "",
        offre: f.serviceName ?? f.offer ?? f.accompagnementType ?? "",
        lien_kit: "https://www.startupweek.tech/digital-starter-kit",
      },
      related: { entity: "submissions", id: sub.id },
    });
    steps.push({ label: form === "starter-kit" ? "Email du kit envoyé" : form === "newsletter" ? "Email de bienvenue envoyé" : "Accusé de réception envoyé", detail: `« ${mail.subject} » → ${draft.email}`, href: "/emails" });
  }

  if (draft.slaDueAt) {
    createTask({
      title: form === "candidature" ? `Qualifier la candidature de ${draft.name}` : form === "reclamation" ? `Traiter la réclamation de ${draft.name}` : `Répondre à ${draft.name} — ${meta.label}`,
      kind: form === "reclamation" ? "qualiopi" : form === "contact" ? "email" : "appel",
      priority: form === "entreprise" || form === "reclamation" ? "haute" : "normale",
      dueAt: draft.slaDueAt,
      related: { entity: "submissions", id: sub.id },
      automated: true,
    });
    steps.push({ label: "Tâche de suivi créée (échéance = engagement de réponse)", href: "/relances" });
  }

  // Compteur de la règle d'automatisation correspondante.
  const rule = crm().automations.find((r) => r.active && r.replacesN8n?.some((w) => matchesWorkflow(w, meta.n8n))) ?? crm().automations.find((r) => r.active && r.trigger === "formulaire_recu");
  if (rule) {
    crm().update("automations", rule.id, { runs: rule.runs + 1, lastRunAt: new Date().toISOString() });
    logSystem("automations", rule.id, `Règle « ${rule.name} » exécutée (${meta.label}, simulation)`);
    steps.push({ label: `Règle « ${rule.name} » exécutée`, detail: `${rule.actions.length} action${rule.actions.length > 1 ? "s" : ""}` });
  }

  return { ok: true, duplicate: false, steps, submissionId: sub.id };
}
