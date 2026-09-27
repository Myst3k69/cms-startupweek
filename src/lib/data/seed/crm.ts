/**
 * CRM : modèles d'emails (remplacent les workflows n8n), séquences de relance, demandes entrantes (formulaires du site),
 * opportunités, tâches et journal des emails envoyés.
 */
import type {
  Contact,
  Deal,
  DealStage,
  DealType,
  EmailMessage,
  EmailStatus,
  EntityRef,
  LeadSource,
  Priority,
  Sequence,
  Submission,
  SubmissionStatus,
  SubmissionType,
  Task,
  TaskKind,
  TemplateCategory,
} from "../../domain/types";
import { DEAL_STAGE_PROBABILITY } from "../../domain/constants";
import { type SeedContext, stamps } from "./context";
import { DAY, HOUR, MIN, linesTotalCents, pad, sortBy } from "./helpers";
import { DEAL } from "./billing";
import { evId } from "./events";
import { ORG } from "./organizations";
import { mainContactOf } from "./people";
import { U } from "./team";
import { EMAIL_TEMPLATES } from "../email-templates";
import { fillEmailTemplate } from "../../email-template";

/* ───────────────────────────── Modèles d'emails ───────────────────────────── */

type Tpl = [id: string, name: string, category: TemplateCategory, subject: string, body: string, replacesN8n?: string];

const SIGN = "\n\nÀ très vite,\nL'équipe StartupWeek\ncontact@startupweek.tech";

const TEMPLATES: Tpl[] = [
  ["tpl_ack_candidature", "Accusé — candidature", "accuse_reception", "Candidature reçue - StartupWeek", "Bonjour {{prenom}},\n\nNous avons bien reçu ta candidature pour la session {{session}} (début le {{date_debut}}). Notre équipe revient vers toi sous 48 h pour caler un échange de qualification." + SIGN, "Candidature event"],
  ["tpl_ack_contact", "Accusé — contact", "accuse_reception", "Message reçu - StartupWeek", "Bonjour {{prenom}},\n\nMerci pour ton message ! Nous te répondons sous 48 h ouvrées." + SIGN, "Contact"],
  ["tpl_ack_entreprise", "Accusé — demande entreprise", "accuse_reception", "Demande entreprise reçue - StartupWeek", "Bonjour {{prenom}},\n\nMerci pour votre demande concernant {{entreprise}}. Léa Fontaine, notre responsable B2B, vous contacte sous 48 h pour préciser vos objectifs, le format et le nombre de participants." + SIGN, "Entreprise"],
  ["tpl_ack_accompagnement", "Accusé — accompagnement", "accuse_reception", "Demande d'accompagnement reçue - StartupWeek", "Bonjour {{prenom}},\n\nNous avons bien reçu ta demande pour l'offre {{offre}}. Un mentor te propose un créneau de découverte sous 48 h." + SIGN, "Accompagnements"],
  ["tpl_ack_partenariat", "Accusé — partenariat", "accuse_reception", "Proposition de partenariat reçue - StartupWeek", "Bonjour {{prenom}},\n\nMerci pour votre proposition de partenariat. Aurélien Chiren revient vers vous rapidement pour en discuter." + SIGN, "Partenariats"],
  ["tpl_ack_reclamation", "Accusé — réclamation (automatique)", "accuse_reception", "Réclamation reçue", "Bonjour {{prenom}},\n\nNous avons bien enregistré votre réclamation {{numero_reclamation}}. Notre référente qualité en accuse formellement réception sous 48 h et vous tient informé(e) de son traitement." + SIGN, "Reclamation"],
  ["tpl_dsk", "Digital Starter Kit — envoi", "accuse_reception", "🎁 Ton Digital Starter Kit StartupWeek est prêt", "Bonjour {{prenom}},\n\nVoici ton Digital Starter Kit (6 modules) : {{lien_kit}}\nCommence par le module 1 « Clarifier ton idée », 20 minutes suffisent." + SIGN, "Digital Starter Kit"],
  ["tpl_newsletter", "Bienvenue newsletter", "accuse_reception", "Bienvenue dans la newsletter StartupWeek", "Bonjour {{prenom}},\n\nMerci pour ton inscription ! Chaque mois : méthodes MVP, outils no-code & IA, prochaines sessions. Désinscription en un clic à tout moment." + SIGN, "Consent Newsletter"],
  ["tpl_accept_presentiel", "Acceptation — présentiel", "candidature", "🎉 Ta candidature est acceptée — {{session}}", "Bonjour {{prenom}},\n\nBonne nouvelle : ta candidature pour {{session}} est acceptée ! Pour confirmer ta place, règle l'acompte de 30 % ({{montant_acompte}}) : {{lien_paiement}}\nLe solde sera à régler 30 jours avant le départ." + SIGN],
  ["tpl_accept_distanciel", "Acceptation — distanciel", "candidature", "🎉 Bienvenue dans la StartupWeek en ligne — {{session}}", "Bonjour {{prenom}},\n\nTa candidature pour la session en ligne {{session}} est acceptée ! Confirme ta place avec l'acompte de 30 % ({{montant_acompte}}) : {{lien_paiement}}\nTon diagnostic MVP individuel sera planifié dès réception." + SIGN],
  ["tpl_refus", "Refus de candidature", "candidature", "Ta candidature StartupWeek", "Bonjour {{prenom}},\n\nMerci pour ta candidature. Après échange, nous pensons que ton projet gagnera à mûrir avant une StartupWeek. Le Digital Starter Kit et nos webinaires gratuits sont un excellent point de départ." + SIGN],
  ["tpl_facture_acompte", "Facture d'acompte", "facturation", "Ton acompte pour {{session}} — facture {{numero_facture}}", "Bonjour {{prenom}},\n\nTu trouveras ci-joint la facture d'acompte {{numero_facture}} ({{montant}}). Paiement sécurisé : {{lien_paiement}}" + SIGN],
  ["tpl_convocation", "Convocation", "qualiopi", "Convocation — {{session}} ({{date_debut}})", "Bonjour {{prenom}},\n\nTu es convoqué(e) à la formation {{session}} du {{date_debut}} au {{date_fin}}. Horaires, lieu, accès, livret d'accueil et règlement intérieur en pièces jointes. Besoin d'un aménagement ? Réponds à cet email, notre référente handicap te recontacte." + SIGN],
  ["tpl_rappel_j7", "Rappel J-7", "relance", "J-7 : prépare ta StartupWeek {{session}}", "Bonjour {{prenom}},\n\nPlus qu'une semaine ! Pense à compléter ton questionnaire de positionnement et à créer tes comptes Figma, Bubble et n8n avant le {{date_debut}}." + SIGN],
  ["tpl_eval_chaud", "Questionnaire à chaud", "qualiopi", "Ton avis sur la StartupWeek {{session}} (2 min)", "Bonjour {{prenom}},\n\nMerci pour cette semaine ! Ton avis nous aide à améliorer chaque session : {{lien_questionnaire}}" + SIGN],
  ["tpl_eval_froid", "Questionnaire à froid J+60", "qualiopi", "2 mois après ta StartupWeek : où en est ton projet ?", "Bonjour {{prenom}},\n\nDeux mois déjà depuis {{session}} ! Raconte-nous où en est ton projet en 3 minutes : {{lien_questionnaire}}" + SIGN],
  ["tpl_relance_devis", "Relance devis", "relance", "Votre proposition StartupWeek — {{numero_devis}}", "Bonjour {{prenom}},\n\nAvez-vous pu prendre connaissance de notre proposition {{numero_devis}} ? Je reste disponible pour l'ajuster à vos contraintes.\n\nLéa Fontaine — StartupWeek"],
  ["tpl_relance_facture_j3", "Relance facture J+3", "facturation", "Rappel : facture {{numero_facture}} à régler", "Bonjour {{prenom}},\n\nPetit rappel : la facture {{numero_facture}} ({{montant}}) arrive à échéance le {{date_echeance}}. Lien de paiement : {{lien_paiement}}" + SIGN],
  ["tpl_relance_facture_j10", "Relance facture J+10", "facturation", "Relance : facture {{numero_facture}} en attente de règlement", "Bonjour {{prenom}},\n\nSauf erreur de notre part, la facture {{numero_facture}} ({{montant}}) reste impayée. Merci de procéder au règlement : {{lien_paiement}}. Conformément aux CGV, la place peut être libérée en cas de non-paiement du solde à J-30." + SIGN],
  ["tpl_reclamation_48h", "Accusé réclamation 48 h", "qualiopi", "Votre réclamation {{numero_reclamation}} : accusé de réception", "Bonjour {{prenom}},\n\nJ'accuse réception de votre réclamation {{numero_reclamation}}. Elle est en cours d'analyse ; vous recevrez une réponse détaillée sous 10 jours ouvrés.\n\nClaire Dumas — Responsable qualité StartupWeek"],
  ["tpl_certificat", "Certificat de réalisation", "qualiopi", "Ton certificat de réalisation — {{session}}", "Bonjour {{prenom}},\n\nFélicitations pour ta StartupWeek ! Ton certificat de réalisation ({{duree}} h) est en pièce jointe." + SIGN],
  ["tpl_dsk_j3", "Nurturing DSK J+3", "nurturing", "Tu as ouvert ton Digital Starter Kit ? Voici la suite 🚀", "Bonjour {{prenom}},\n\nTu as commencé le kit ? Prochaine étape : réserve un diagnostic MVP gratuit de 20 minutes ou découvre la prochaine session : {{session}}." + SIGN],
  ["tpl_upsell_il", "Upsell Iteration Lab (alumni)", "nurturing", "Iteration Lab : continue d'itérer sur ton MVP", "Bonjour {{prenom}},\n\nTon MVP est en ligne, bravo ! Pour garder le rythme, l'Iteration Lab te propose 4 à 12 séances de mentorat (dès 600 €)." + SIGN],
  ["tpl_sla_interne", "Alerte interne SLA 48 h", "interne", "⚠️ Demande sans réponse depuis 48 h — {{type_demande}}", "Demande de {{nom}} reçue le {{date_reception}} toujours sans réponse. Ouvrir dans le CRM : {{lien_crm}}"],
];

function varsOf(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g), (m) => m[1])));
}

/** Remplissage de démo : variable absente → vide (ligne « Libellé : » retirée), lien de document fictif. */
function render(text: string, vars: Record<string, string>): string {
  const all = Object.fromEntries(varsOf(text).map((k) => [k, vars[k] ?? (k === "lien_document" ? "https://exemple.startupweek.tech/documents/demo" : "")]));
  return fillEmailTemplate(text, all);
}

/* ───────────────────────────── Construction ───────────────────────────── */

export function buildCrm(ctx: SeedContext): void {
  buildTemplatesAndSequences(ctx);
  buildSubmissions(ctx);
  buildDeals(ctx);
  buildTasks(ctx);
  buildEmails(ctx);
}

function buildTemplatesAndSequences(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("templates");
  // Modèles de production (src/lib/data/email-templates.ts) + modèles propres aux séquences de démo.
  const production: Tpl[] = EMAIL_TEMPLATES.map((t) => [t.id, t.name, t.category, t.subject, t.body, t.replacesN8n]);
  const demoOnly = TEMPLATES.filter(([id]) => !EMAIL_TEMPLATES.some((t) => t.id === id));
  ctx.data.emailTemplates = [...production, ...demoOnly].map(([id, name, category, subject, body, replacesN8n]) => ({
    id,
    ...stamps(ctx, clock.real("2026-01-15", 10, 0) + r.between(0, 120) * DAY, clock.now - r.between(3, 60) * DAY),
    name,
    category,
    subject,
    body,
    variables: varsOf(subject + " " + body),
    replacesN8n,
  }));

  type S = [id: string, name: string, description: string, trigger: Sequence["trigger"], steps: [number, "email" | "tache", string, string?][], enrolled: number, completed: number, replied: number];
  const seqs: S[] = [
    ["seq_sla", "Demande sans réponse (SLA 48 h)", "Alerte l'équipe et crée une tâche prioritaire si une demande du site reste sans réponse 48 h.", "demande_sans_reponse", [[0, "tache", "Répondre à la demande (SLA dépassé)"], [0, "email", "Alerte interne", "tpl_sla_interne"], [1, "tache", "Escalade à Aurélien"]], 23, 21, 0],
    ["seq_devis", "Relance devis B2B", "Relances progressives après l'envoi d'un devis, jusqu'à l'acceptation ou l'expiration.", "devis_envoye", [[3, "email", "Relance J+3", "tpl_relance_devis"], [7, "tache", "Appel de suivi du devis"], [14, "email", "Relance J+14", "tpl_relance_devis"]], 11, 8, 6],
    ["seq_facture", "Relance facture échue", "Relances J+3 et J+10 puis appel pour les factures non réglées (dont soldes à J-30).", "facture_echue", [[3, "email", "Relance J+3", "tpl_relance_facture_j3"], [10, "email", "Relance J+10", "tpl_relance_facture_j10"], [12, "tache", "Appel de relance paiement"]], 19, 16, 9],
    ["seq_acceptee", "Candidature acceptée → acompte", "Email d'acceptation, facture d'acompte avec lien Stripe, relance puis appel si l'acompte n'est pas réglé.", "candidature_acceptee", [[0, "email", "Acceptation", "tpl_accept_presentiel"], [0, "email", "Facture d'acompte", "tpl_facture_acompte"], [3, "email", "Rappel acompte", "tpl_relance_facture_j3"], [5, "tache", "Appeler si acompte non réglé"]], 96, 88, 71],
    ["seq_j7", "Préparation J-7", "Rappel pratique à J-7 et vérification logistique / aménagements à J-2.", "session_j_moins_7", [[0, "email", "Rappel J-7", "tpl_rappel_j7"], [5, "tache", "Vérifier logistique et aménagements"]], 82, 75, 12],
    ["seq_j1", "Clôture de session (J+1)", "Questionnaire à chaud, certificat de réalisation et relance des non-répondants.", "session_j_plus_1", [[0, "email", "Questionnaire à chaud", "tpl_eval_chaud"], [1, "email", "Certificat de réalisation", "tpl_certificat"], [3, "tache", "Relancer les non-répondants"]], 75, 75, 71],
    ["seq_froid", "Évaluation à froid (J+60)", "Questionnaire à froid 60 jours après la session, relance à J+67.", "evaluation_froid", [[0, "email", "Questionnaire à froid", "tpl_eval_froid"], [7, "email", "Relance questionnaire à froid", "tpl_eval_froid"]], 65, 62, 39],
    ["seq_dsk", "Nurturing Digital Starter Kit", "Envoi du kit, nurturing à J+3 puis qualification téléphonique des leads engagés.", "digital_starter_kit", [[0, "email", "Envoi du kit", "tpl_dsk"], [3, "email", "Nurturing J+3", "tpl_dsk_j3"], [10, "tache", "Appel découverte (lead engagé)"]], 214, 176, 23],
  ];
  ctx.data.sequences = seqs.map(([id, name, description, trigger, steps, enrolled, completed, replied], i) => ({
    id,
    ...stamps(ctx, clock.real("2026-02-01", 10, 0) + i * 3 * DAY, clock.now - r.between(2, 40) * DAY),
    name,
    description,
    trigger,
    active: true,
    steps: steps.map(([delayDays, channel, label, templateId], j) => ({ id: `${id}_s${j + 1}`, delayDays, channel, label, templateId })),
    enrolled,
    completed,
    replied,
  }));
}

/* ───────────────────────────── Demandes entrantes ───────────────────────────── */

const STADES = ["idee", "commence", "prototype", "refonte", "incertain"];

function buildSubmissions(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("submissions");
  const windowStart = clock.now - 120 * DAY;
  const subs: (Omit<Submission, "id" | "createdAt" | "updatedAt"> & { ts: number })[] = [];
  const fullName = (c: Contact) => `${c.firstName} ${c.lastName}`;
  const contact = (id: string) => ctx.data.contacts.find((c) => c.id === id)!;

  const answered = (ts: number, minH: number, maxH: number) => clock.iso(clock.past(ts + r.between(minH, maxH) * HOUR + r.between(0, 59) * MIN));
  const push = (type: SubmissionType, ts: number, c: Contact, status: SubmissionStatus, extra: Partial<Submission> & { fields: Record<string, string> }) => {
    subs.push({
      ts,
      type,
      status,
      receivedAt: clock.iso(ts),
      name: fullName(c),
      email: c.email,
      phone: c.phone,
      contactId: c.id,
      orgId: c.orgId,
      slaDueAt: clock.iso(ts + 48 * HOUR),
      utm: c.utm,
      consent: { gdpr: true, marketing: c.consent.marketing, marketingAt: c.consent.marketing ? clock.iso(ts) : undefined, source: `Formulaire ${type}` },
      idempotencyKey: `lead_${r.alnum(12)}`,
      ...extra,
    });
  };

  // 1. Candidatures (tunnel de candidature du site).
  const nouvelles = sortBy(ctx.data.applications.filter((a) => a.status === "nouvelle"), (a) => a.submittedAt);
  for (const app of ctx.data.applications) {
    const ts = Date.parse(app.submittedAt);
    if (ts < windowStart) continue;
    const c = contact(app.contactId);
    const ev = ctx.data.events.find((e) => e.id === app.eventId)!;
    let status: SubmissionStatus = "convertie";
    let answeredAt: string | undefined = answered(ts, 2, 30);
    if (app.status === "nouvelle") {
      const age = clock.now - ts;
      const rank = nouvelles.indexOf(app);
      // Les candidatures « nouvelle » de plus de 48 h sont normalement prises en charge… sauf les 2 plus anciennes, oubliées (hors SLA).
      if (age > 48 * HOUR && rank >= 2) status = "en_cours";
      else {
        status = "nouvelle";
        answeredAt = undefined;
      }
    }
    push("candidature", ts, c, status, {
      subject: `Candidature — ${ev.name}`,
      message: app.motivation,
      fields: { session: ev.code, persona: app.persona, budget: app.budget, stade: r.pick(STADES), disponibilite: app.availability, heardFrom: app.heardFrom ?? "", intent: app.intent },
      applicationId: app.id,
      assigneeId: U.lea,
      answeredAt,
      idempotencyKey: app.idempotencyKey,
    });
  }

  // 2. Digital Starter Kit et newsletter (leads + candidats venus du kit).
  for (const c of ctx.data.contacts) {
    const ts = Date.parse(c.createdAt);
    if (ts < windowStart) continue;
    if (c.source === "digital_starter_kit") {
      push("digital_starter_kit", ts, c, c.lifecycle === "lead" ? r.pick(["archivee", "en_cours"] as const) : "convertie", {
        subject: "Téléchargement du Digital Starter Kit",
        fields: { stade: r.pick(STADES), prenom: c.firstName },
        answeredAt: answered(ts, 0, 0),
      });
    } else if (c.source === "newsletter" || c.source === "instagram") {
      push("newsletter", ts, c, "archivee", { subject: "Inscription newsletter", fields: { source: c.source === "instagram" ? "bio_instagram" : "footer" }, answeredAt: answered(ts, 0, 0) });
    }
  }

  // 3. Contact, accompagnement.
  const leads = ctx.data.contacts.filter((c) => c.source === "site_contact");
  const topics = ["Question sur le financement OPCO", "Différence entre session en ligne et en villa ?", "Proposition de collaboration podcast"];
  leads.forEach((c, i) => {
    const ts = i === 0 ? clock.ago(5 * HOUR) : Date.parse(c.createdAt);
    push("contact", ts, c, i === 0 ? "nouvelle" : i === 1 ? "en_cours" : "archivee", { subject: topics[i], message: `${topics[i]} — merci de me recontacter.`, fields: { topic: topics[i] }, assigneeId: U.lea, answeredAt: i === 0 ? undefined : answered(ts, 3, 20) });
  });
  // Spam (formulaire contact).
  subs.push({ ts: clock.ago(3 * DAY + 2 * HOUR), type: "contact", status: "spam", receivedAt: clock.iso(clock.ago(3 * DAY + 2 * HOUR)), name: "SEO Boost Agency", email: "offres.seo@example.org", subject: "Page 1 Google garantie !!!", message: "Nous pouvons classer votre site en page 1 en 7 jours…", fields: { topic: "autre" }, consent: { gdpr: true, marketing: false } });

  const accompagnement: [string, string, string, number, SubmissionStatus][] = [];
  const accLeads = ctx.data.contacts.filter((c) => c.source === "site_accompagnement");
  const invoiceContact = (label: string) => ctx.data.invoices.find((i) => i.lines[0]?.label.startsWith(label))?.contactId;
  const srContact = invoiceContact("Startup Ready")!;
  const ilContact = invoiceContact("Iteration Lab — Pack Standard")!;
  const suContact = invoiceContact("Séance unique")!;
  accompagnement.push([srContact, "Startup Ready", "idee", -24, "convertie"]);
  accompagnement.push([ilContact, "Pack Standard", "mvp", -48, "convertie"]);
  accompagnement.push([suContact, "Séance Unique", "lance", -7, "convertie"]);
  accompagnement.push([accLeads[0].id, "Pack Intensive", "prototype", -9, "qualifiee"]);
  accompagnement.push([accLeads[1].id, "Pack Light", "mvp", -1.5, "nouvelle"]);
  for (const [cid, serviceName, stage, days, status] of accompagnement) {
    const c = contact(cid);
    const ts = clock.now + days * DAY - r.between(1, 6) * HOUR;
    push("accompagnement", ts, c, status, {
      subject: `Demande d'accompagnement — ${serviceName}`,
      message: "Je souhaite être accompagné(e) pour avancer plus vite sur mon MVP.",
      fields: { serviceName, projectStage: stage, budget: serviceName === "Pack Intensive" ? "1500-3000" : "moins-990" },
      assigneeId: U.karim,
      answeredAt: status === "nouvelle" ? undefined : answered(ts, 2, 24),
    });
  }

  // 4. Entreprises (formulaire « Entreprise »).
  const b2b: [orgId: string, days: number, status: SubmissionStatus, fields: Record<string, string>, message: string][] = [
    [ORG.nexora, -35, "convertie", { companySize: "201-500", format: "AI Adoption Sprint", participantsNumber: "12", budget: "10000-20000", preferredDates: "Novembre 2026" }, "Nous voulons accélérer l'usage de l'IA dans l'équipe sinistres."],
    [ORG.kalia, -30, "convertie", { companySize: "51-200", format: "Innovation Sprint", participantsNumber: "10", budget: "10000-20000", preferredDates: "Janvier 2027" }, "Sprint d'innovation pour notre équipe produit et nos commerciaux."],
    [ORG.batimax, -18, "convertie", { companySize: "51-200", format: "Talent Sprint", participantsNumber: "16", budget: "5000-10000", preferredDates: "Début 2027" }, "Fidéliser nos jeunes conducteurs de travaux avec un défi intrapreneurial."],
    [ORG.helix, -25, "convertie", { companySize: "500+", format: "AI Adoption Sprint", participantsNumber: "24", budget: "plus-20000", preferredDates: "T1 2027" }, "Deux équipes (affaires réglementaires et marketing)."],
    [ORG.novatel, -6, "convertie", { companySize: "51-200", format: "StartupWeek (inscription salariés)", participantsNumber: "3", budget: "5000-10000", preferredDates: "Novembre 2026" }, "Trois collaborateurs intrapreneurs pour la session de Split, prise en charge OPCO Atlas."],
    [ORG.orfeo, -2.6, "nouvelle", { companySize: "500+", format: "AI Adoption Sprint", participantsNumber: "15", budget: "10000-20000", preferredDates: "Décembre 2026" }, "Automatiser la planification des tournées avec l'IA."],
    [ORG.solveo, -1.2, "nouvelle", { companySize: "201-500", format: "Séminaire innovation", participantsNumber: "30", budget: "plus-20000", preferredDates: "Printemps 2027" }, "Séminaire de direction orienté innovation et IA."],
    [ORG.xefi, -20, "qualifiee", { companySize: "51-200", format: "Atelier école", participantsNumber: "40", budget: "5000-10000", preferredDates: "Février 2027" }, "Atelier IA & no-code pour nos apprenants."],
  ];
  for (const [orgId, days, status, fields, message] of b2b) {
    const c = contact(mainContactOf(ctx, orgId));
    const ts = clock.now + days * DAY - r.between(0, 5) * HOUR;
    push("entreprise", ts, c, status, { subject: `Demande entreprise — ${fields.format}`, company: ctx.data.organizations.find((o) => o.id === orgId)!.name, message, fields, assigneeId: U.lea, answeredAt: status === "nouvelle" ? undefined : answered(ts, 1, 20) });
  }

  // 5. Partenariats.
  const partners: [orgId: string, days: number, status: SubmissionStatus, fields: Record<string, string>][] = [
    [ORG.quantik, -88, "archivee", { partnershipType: "Prestataire / agence", audience: "Startups early-stage" }],
    [ORG.trajectoire, -45, "qualifiee", { partnershipType: "Prescription", audience: "Personnes en reconversion" }],
    [ORG.seedlab, -32, "convertie", { partnershipType: "Sponsoring", audience: "Fondateurs pre-seed" }],
    [ORG.cloudiva, -52, "convertie", { partnershipType: "Sponsoring / outil", audience: "Makers no-code" }],
    [ORG.journalFondateurs, -9, "en_cours", { partnershipType: "Média", audience: "45 000 lecteurs entrepreneurs" }],
    [ORG.valrive, -60, "convertie", { partnershipType: "Collectivité / programme", audience: "Entrepreneures du territoire" }],
  ];
  for (const [orgId, days, status, fields] of partners) {
    const c = contact(mainContactOf(ctx, orgId));
    const ts = clock.now + days * DAY - r.between(0, 8) * HOUR;
    push("partenariat", ts, c, status, { subject: `Proposition de partenariat — ${fields.partnershipType}`, company: ctx.data.organizations.find((o) => o.id === orgId)!.name, message: "Nous aimerions explorer un partenariat avec StartupWeek.", fields, assigneeId: U.aurelien, answeredAt: answered(ts, 2, 40) });
  }
  // Lieu proposé par une collectivité (sans contact rattaché).
  {
    const ts = clock.ago(12 * DAY + 4 * HOUR);
    subs.push({ ts, type: "partenariat", status: "en_cours", receivedAt: clock.iso(ts), name: "Office de tourisme des Hautes-Vallées", email: "accueil.hautesvallees@example.fr", company: "Communauté de communes des Hautes-Vallées", subject: "Accueillir une StartupWeek sur notre territoire", message: "Nous disposons d'un domaine rénové (12 chambres) et souhaitons accueillir une session.", fields: { partnershipType: "Lieu d'accueil", audience: "Entrepreneurs", venueCity: "Saint-Aubrac" }, orgId: ORG.hautesVallees, assigneeId: U.aurelien, slaDueAt: clock.iso(ts + 48 * HOUR), answeredAt: answered(ts, 20, 30), consent: { gdpr: true, marketing: false } });
  }

  // 6. Réclamations déposées via le formulaire.
  for (const cpl of ctx.data.complaints.filter((c) => c.channel === "formulaire")) {
    const c = contact(cpl.contactId!);
    const ts = Date.parse(cpl.receivedAt);
    const ev = ctx.data.events.find((e) => e.id === cpl.eventId);
    push("reclamation", ts, c, cpl.status === "recue" ? "nouvelle" : cpl.status === "cloturee" ? "archivee" : "en_cours", { subject: cpl.subject, message: cpl.description, fields: { session: ev?.code ?? "", type: cpl.type }, complaintId: cpl.id, assigneeId: U.claire, answeredAt: cpl.ackAt });
  }

  ctx.data.submissions = sortBy(subs, (s) => s.ts).map(({ ts, ...s }, i) => ({ id: `sub_${pad(i + 1)}`, ...stamps(ctx, ts, s.answeredAt ? Date.parse(s.answeredAt) : ts), ...s }));
}

/* ───────────────────────────── Opportunités ───────────────────────────── */

function buildDeals(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("deals");
  const quoteByDeal = new Map(ctx.data.quotes.filter((q) => q.dealId).map((q) => [q.dealId!, q]));
  const subOf = (orgId: string, type: SubmissionType) => ctx.data.submissions.find((s) => s.orgId === orgId && s.type === type)?.id;
  const contactOfInvoice = (label: string) => ctx.data.invoices.find((i) => i.lines[0]?.label.startsWith(label))?.contactId;
  const person = (id: string | undefined) => {
    const c = ctx.data.contacts.find((x) => x.id === id);
    return c ? `${c.firstName} ${c.lastName}` : "";
  };

  type D = { id: string; title: string; type: DealType; stage: DealStage; amount?: number; orgId?: string; contactId?: string; owner?: string; eventId?: string; since: number; close?: number; lostReason?: string; nextStep?: string; source?: LeadSource; submissionId?: string };
  const d = (ymd: string) => clock.real(ymd, 11, 0);
  const specs: D[] = [
    { id: DEAL.epitechSv, title: "Epitech — Startup Village mai 2026", type: "ecole", stage: "gagne", orgId: ORG.epitech, eventId: evId("SV-0001"), since: d("2026-01-28"), close: d("2026-03-10"), source: "site_entreprise" },
    { id: DEAL.epitech2027, title: "Epitech — Startup Village multi-campus 2027", type: "ecole", stage: "negociation", orgId: ORG.epitech, since: clock.rel(-30), close: clock.rel(21), nextStep: "Point budget avec la direction des programmes", source: "recommandation" },
    { id: DEAL.epsiSv, title: "EPSI — Startup Village 2026", type: "ecole", stage: "perdu", orgId: ORG.epsi, since: d("2026-02-12"), close: d("2026-04-22"), lostReason: "Budget réaffecté à un hackathon interne", source: "linkedin" },
    { id: DEAL.nextuSv, title: "Next-U — Startup Village", type: "ecole", stage: "perdu", orgId: ORG.nextu, since: d("2026-05-14"), close: d("2026-07-10"), lostReason: "Devis expiré sans réponse (interlocutrice absente)", source: "evenement" },
    { id: DEAL.ynovSv, title: "Ynov Campus — Startup Village janvier 2027", type: "ecole", stage: "gagne", orgId: ORG.ynov, eventId: evId("SV-0002"), since: d("2026-06-20"), close: d("2026-09-15"), source: "site_entreprise" },
    { id: "deal_isegcom", title: "ISEGCOM — Startup Village printemps 2027", type: "ecole", stage: "rdv", amount: 1800000, orgId: ORG.isegcom, since: clock.rel(-27), close: clock.rel(45), nextStep: "Visio de découverte avec la responsable événements", source: "linkedin" },
    { id: "deal_xefi", title: "XEFI Academy — atelier IA & no-code", type: "ecole", stage: "qualification", amount: 600000, orgId: ORG.xefi, since: clock.rel(-20), close: clock.rel(60), nextStep: "Qualifier le format (1 ou 2 jours)", source: "site_entreprise" },
    { id: DEAL.verdalysIs, title: "Groupe Verdalys — Innovation Sprint", type: "entreprise", stage: "gagne", orgId: ORG.verdalys, eventId: evId("IS-0001"), since: d("2026-04-02"), close: d("2026-05-20"), source: "recommandation" },
    { id: "deal_verdalys_2027", title: "Groupe Verdalys — Innovation Sprint vague 2", type: "entreprise", stage: "qualification", amount: 1200000, orgId: ORG.verdalys, since: clock.rel(-15), close: clock.rel(75), nextStep: "Bilan de la vague 1 avec la DRH", source: "recommandation" },
    { id: DEAL.nexoraAi, title: "Nexora Assurances — AI Adoption Sprint", type: "entreprise", stage: "proposition", orgId: ORG.nexora, since: clock.rel(-35), close: clock.rel(14), nextStep: "Relancer le devis (J+14)", source: "site_entreprise" },
    { id: DEAL.kaliaIs, title: "Kalia Santé — Innovation Sprint", type: "entreprise", stage: "negociation", orgId: ORG.kalia, since: clock.rel(-30), close: clock.rel(10), nextStep: "Valider la remise et les dates de janvier", source: "site_entreprise" },
    { id: DEAL.batimaxTs, title: "Batimax Rénovation — Talent Sprint", type: "entreprise", stage: "qualification", orgId: ORG.batimax, since: clock.rel(-18), close: clock.rel(40), nextStep: "Finaliser le devis (brouillon)", source: "site_entreprise" },
    { id: "deal_orfeo", title: "Orféo Logistique — AI Adoption Sprint", type: "entreprise", stage: "nouveau", amount: 950000, orgId: ORG.orfeo, since: clock.rel(-2), close: clock.rel(70), nextStep: "Premier appel de découverte", source: "site_entreprise" },
    { id: "deal_helix", title: "Helix Pharma — AI Adoption Sprint (2 équipes)", type: "entreprise", stage: "rdv", amount: 1900000, orgId: ORG.helix, since: clock.rel(-25), close: clock.rel(50), nextStep: "Atelier de cadrage avec le L&D", source: "site_entreprise" },
    { id: "deal_arvel", title: "Groupe Arvel — Innovation Sprint", type: "entreprise", stage: "perdu", amount: 1200000, orgId: ORG.arvel, since: d("2026-02-16"), close: d("2026-04-30"), lostReason: "Projet gelé (réorganisation interne)", source: "linkedin" },
    { id: "deal_solveo", title: "Solvéo Mutuelle — séminaire innovation", type: "entreprise", stage: "nouveau", amount: 1500000, orgId: ORG.solveo, since: clock.rel(-1), close: clock.rel(90), nextStep: "Rappeler sous 48 h", source: "site_entreprise" },
    { id: DEAL.novatelSw, title: "Novatel — 3 collaborateurs StartupWeek Split", type: "session", stage: "proposition", orgId: ORG.novatel, eventId: evId("SW-0013"), since: clock.rel(-6), close: clock.rel(12), nextStep: "Accord de prise en charge OPCO Atlas", source: "site_entreprise" },
    { id: DEAL.lyonStartUp, title: "Lyon Start Up — promotion septembre 2026", type: "partenariat", stage: "gagne", orgId: ORG.lyonStartUp, since: d("2026-03-06"), close: d("2026-08-20"), source: "site_partenariat" },
    { id: "deal_stationf", title: "Station F — masterclass résidents", type: "partenariat", stage: "rdv", amount: 250000, orgId: ORG.stationF, since: clock.rel(-60), close: clock.rel(30), nextStep: "Proposer 2 dates de masterclass", source: "evenement" },
    { id: "deal_trajectoire", title: "Trajectoire Emploi — parcours reconversion entrepreneurs", type: "partenariat", stage: "proposition", amount: 600000, orgId: ORG.trajectoire, since: clock.rel(-44), close: clock.rel(20), nextStep: "Envoyer la convention de partenariat", source: "site_partenariat" },
    { id: "deal_journal", title: "Le Journal des Fondateurs — partenariat média", type: "partenariat", stage: "nouveau", amount: 150000, orgId: ORG.journalFondateurs, since: clock.rel(-9), close: clock.rel(30), nextStep: "Proposer un article sponsorisé + code promo", source: "site_partenariat" },
    { id: "deal_valrive", title: "Métropole de Valrive — programme Entreprendre au féminin", type: "partenariat", stage: "proposition", amount: 2800000, orgId: ORG.valrive, since: clock.rel(-58), close: clock.rel(35), nextStep: "Réponse à l'appel à projets (dépôt avant le 15)", source: "site_partenariat" },
    { id: "deal_quantik", title: "Quantik Growth — offre growth alumni", type: "partenariat", stage: "perdu", amount: 180000, orgId: ORG.quantik, since: clock.rel(-86), close: clock.rel(-50), lostReason: "Offre redondante avec les mentors internes", source: "site_partenariat" },
    { id: "deal_seedlab", title: "Seedlab Ventures — sponsoring Démo Day", type: "sponsoring", stage: "proposition", amount: 500000, orgId: ORG.seedlab, since: clock.rel(-30), close: clock.rel(25), nextStep: "Valider les contreparties (jury + visibilité)", source: "site_partenariat" },
    { id: "deal_cloudiva", title: "Cloudiva — sponsoring outils no-code", type: "sponsoring", stage: "rdv", amount: 300000, orgId: ORG.cloudiva, since: clock.rel(-50), close: clock.rel(20), nextStep: "Démo de l'outil à Karim", source: "site_partenariat" },
    { id: "deal_horizon", title: "Horizon Angels — dotation jury 2026", type: "sponsoring", stage: "gagne", amount: 250000, orgId: ORG.horizonAngels, since: d("2026-01-18"), close: d("2026-02-20"), source: "evenement" },
    { id: DEAL.startupReady, title: "Startup Ready", type: "accompagnement", stage: "gagne", amount: 99000, contactId: contactOfInvoice("Startup Ready"), since: clock.rel(-24), close: clock.rel(-20), source: "site_accompagnement" },
    { id: DEAL.ilStandard, title: "Iteration Lab — Pack Standard", type: "accompagnement", stage: "gagne", amount: 110000, contactId: contactOfInvoice("Iteration Lab — Pack Standard"), since: clock.rel(-48), close: clock.rel(-45), source: "site_accompagnement" },
    { id: "deal_il_intensive", title: "Iteration Lab — Pack Intensive", type: "accompagnement", stage: "proposition", amount: 150000, contactId: ctx.data.contacts.filter((c) => c.source === "site_accompagnement")[0].id, since: clock.rel(-9), close: clock.rel(7), nextStep: "Appel découverte avec Karim", source: "site_accompagnement" },
    { id: "deal_il_light", title: "Iteration Lab — Pack Light", type: "accompagnement", stage: "nouveau", amount: 60000, contactId: ctx.data.contacts.filter((c) => c.source === "site_accompagnement")[1].id, since: clock.ago(36 * HOUR), close: clock.rel(14), nextStep: "Répondre à la demande", source: "site_accompagnement" },
    { id: "deal_residency", title: "Startup Residency", type: "accompagnement", stage: "negociation", amount: 890000, contactId: ctx.data.applications.find((a) => a.eventId === evId("SW-0013") && a.status === "acceptee")!.contactId, eventId: evId("SW-0013"), since: clock.rel(-8), close: clock.rel(10), nextStep: "Proposer un paiement en 3 fois", source: "site_candidature" },
  ];

  ctx.data.deals = specs.map((s) => {
    const q = quoteByDeal.get(s.id);
    const amount = s.amount ?? (q ? q.lines.reduce((acc, l) => acc + Math.round(l.quantity * l.unitPriceCents), 0) : 0);
    const closed = s.stage === "gagne" || s.stage === "perdu";
    const contactId = s.contactId ?? (s.orgId ? mainContactOf(ctx, s.orgId) : undefined);
    const title = s.type === "accompagnement" ? `${s.title} — ${person(contactId)}` : s.title;
    return {
      id: s.id,
      ...stamps(ctx, s.since, closed ? s.close : clock.now - r.between(1, 10) * DAY),
      title,
      type: s.type,
      stage: s.stage,
      amountCents: amount,
      probability: DEAL_STAGE_PROBABILITY[s.stage],
      orgId: s.orgId,
      contactId,
      ownerId: s.type === "partenariat" || s.type === "sponsoring" ? U.aurelien : s.type === "accompagnement" ? U.karim : U.lea,
      eventId: s.eventId,
      quoteId: q?.id,
      expectedCloseAt: s.close ? clock.iso(s.close) : undefined,
      closedAt: closed && s.close ? clock.iso(clock.past(s.close)) : undefined,
      lostReason: s.lostReason,
      nextStep: closed ? undefined : s.nextStep,
      source: s.source,
      submissionId: s.orgId ? (subOf(s.orgId, s.type === "partenariat" || s.type === "sponsoring" ? "partenariat" : "entreprise") ?? undefined) : contactId ? ctx.data.submissions.find((x) => x.contactId === contactId && x.type === "accompagnement")?.id : undefined,
    } satisfies Deal;
  });
  // Liens retour demande → opportunité.
  for (const deal of ctx.data.deals) {
    const sub = ctx.data.submissions.find((s) => s.id === deal.submissionId);
    if (sub) sub.dealId = deal.id;
  }
}

/* ───────────────────────────── Tâches ───────────────────────────── */

function buildTasks(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("tasks");
  type T = Omit<Task, "id" | "createdAt" | "updatedAt" | "dueAt" | "doneAt"> & { due: number; done?: number; created?: number };
  const tasks: T[] = [];
  const add = (t: T) => tasks.push(t);
  const ref = (entity: EntityRef["entity"], id: string): EntityRef => ({ entity, id });
  const nameOf = (id?: string) => {
    const c = ctx.data.contacts.find((x) => x.id === id);
    return c ? `${c.firstName} ${c.lastName}` : "";
  };

  // 1. Opportunités ouvertes : prochaine étape.
  for (const deal of ctx.data.deals.filter((d) => d.stage !== "gagne" && d.stage !== "perdu")) {
    const kind: TaskKind = deal.stage === "rdv" ? "rdv" : deal.stage === "proposition" ? "relance" : deal.stage === "nouveau" ? "appel" : "email";
    const overdue = r.chance(0.25);
    add({ title: `${deal.nextStep ?? "Faire avancer l'opportunité"} — ${deal.title}`, kind, priority: deal.amountCents >= 1000000 ? "haute" : "normale", due: overdue ? clock.rel(-r.between(1, 4), 17) : clock.rel(r.between(0, 10), r.pick([10, 14, 16])), assigneeId: deal.ownerId, related: ref("deals", deal.id), automated: false });
  }
  // Devis envoyés : relances de la séquence.
  for (const q of ctx.data.quotes.filter((x) => x.status === "envoye")) {
    const sent = Date.parse(q.sentAt!);
    add({ title: `Appel de suivi du devis ${q.number}`, kind: "appel", priority: "normale", due: sent + 7 * DAY, done: sent + 7 * DAY < clock.now - DAY ? sent + 7 * DAY + 3 * HOUR : undefined, assigneeId: U.lea, related: ref("quotes", q.id), sequenceId: "seq_devis", automated: true, created: sent + 7 * DAY - 8 * HOUR });
  }

  // 2. Demandes sans réponse.
  for (const s of ctx.data.submissions.filter((x) => (x.status === "nouvelle" || x.status === "en_cours") && x.type !== "newsletter" && x.type !== "candidature")) {
    const late = !s.answeredAt && Date.parse(s.slaDueAt!) < clock.now;
    add({ title: `Répondre à la demande de ${s.name} (${s.type})`, kind: "email", priority: late ? "urgente" : "haute", due: Date.parse(s.slaDueAt!), done: s.answeredAt ? Date.parse(s.answeredAt) : undefined, assigneeId: s.assigneeId ?? U.lea, related: ref("submissions", s.id), sequenceId: late ? "seq_sla" : undefined, automated: late, created: Date.parse(s.receivedAt) + 5 * MIN });
  }

  // 3. Candidatures.
  for (const app of ctx.data.applications) {
    const ev = ctx.data.events.find((e) => e.id === app.eventId)!;
    const who = nameOf(app.contactId);
    if (app.status === "entretien" && app.interviewAt) {
      const at = Date.parse(app.interviewAt);
      add({ title: `Entretien de qualification — ${who} (${ev.code})`, kind: "rdv", priority: "normale", due: at, done: at < clock.now ? at + 45 * MIN : undefined, assigneeId: app.reviewerId ?? U.lea, related: ref("applications", app.id), automated: false, notes: at < clock.now ? "Entretien réalisé — décision à rendre." : undefined });
    } else if (app.status === "nouvelle") {
      const due = Date.parse(app.submittedAt) + 48 * HOUR;
      add({ title: `Qualifier la candidature #${app.number} — ${who}`, kind: "appel", priority: due < clock.now ? "haute" : "normale", due, assigneeId: U.lea, related: ref("applications", app.id), automated: true, created: Date.parse(app.submittedAt) + MIN });
    } else if (app.status === "acceptee" && app.decisionAt) {
      const due = Date.parse(app.decisionAt) + 5 * DAY;
      add({ title: `Appeler ${who} si l'acompte n'est pas réglé (${ev.code})`, kind: "paiement", priority: "haute", due, assigneeId: U.lea, related: ref("applications", app.id), sequenceId: "seq_acceptee", automated: true, created: Date.parse(app.decisionAt) });
    }
  }

  // 4. Factures en retard / partielles.
  for (const inv of ctx.data.invoices.filter((i) => i.status === "en_retard" || i.status === "partielle")) {
    const who = inv.orgId ? ctx.data.organizations.find((o) => o.id === inv.orgId)!.name : nameOf(inv.contactId);
    add({ title: `Relancer le paiement de la facture ${inv.number} (${who})`, kind: "paiement", priority: inv.status === "en_retard" ? "urgente" : "haute", due: inv.status === "en_retard" ? clock.rel(-1, 17) : clock.rel(2, 11), assigneeId: U.lea, related: ref("invoices", inv.id), sequenceId: inv.status === "en_retard" ? "seq_facture" : undefined, automated: inv.status === "en_retard", notes: inv.status === "en_retard" ? "Solde exigible à J-30 : sans règlement, la place peut être remise en vente (CGV)." : undefined });
  }
  add({ title: "Rapprocher les transactions Qonto en attente", kind: "admin", priority: "normale", due: clock.rel(0, 18), assigneeId: U.aurelien, automated: true, notes: "Plusieurs virements reçus correspondent à des factures ouvertes (montant ou référence identiques)." });

  // 5. Qualiopi.
  for (const a of ctx.data.improvementActions.filter((x) => x.status === "a_faire" || x.status === "en_cours")) {
    add({ title: a.title, kind: "qualiopi", priority: a.indicatorCodes.some((c) => c === 21 || c === 27) ? "haute" : "normale", due: Date.parse(a.dueAt!), assigneeId: a.ownerId, related: ref("improvementActions", a.id), automated: false });
  }
  const pending = ctx.data.complaints.find((c) => c.status === "recue");
  if (pending) add({ title: `Accuser réception de la réclamation ${pending.number} (engagement 48 h)`, kind: "qualiopi", priority: "urgente", due: Date.parse(pending.receivedAt) + 48 * HOUR, assigneeId: U.claire, related: ref("complaints", pending.id), automated: true, created: Date.parse(pending.receivedAt) + MIN });
  const analysing = ctx.data.complaints.find((c) => c.status === "analyse");
  if (analysing) add({ title: `Répondre à la réclamation ${analysing.number}`, kind: "qualiopi", priority: "haute", due: clock.rel(3, 17), assigneeId: U.claire, related: ref("complaints", analysing.id), automated: false });
  const qualiopiManual: [string, number, Priority, number?][] = [
    ["Audit blanc interne (critères 1 à 7)", -12, "haute", -12],
    ["Choisir l'organisme certificateur et planifier l'audit initial", 5, "haute"],
    ["Mettre à jour la page « Nos résultats » (T3 2026)", 12, "normale"],
    ["Exporter les émargements signés SW-0010", -10, "normale", -11],
    ["Revue qualité trimestrielle (réclamations, évaluations, actions)", 18, "normale"],
  ];
  for (const [title, days, priority, doneDays] of qualiopiManual) {
    add({ title, kind: "qualiopi", priority, due: clock.rel(days, 17), done: doneDays !== undefined ? clock.rel(doneDays, 16) : undefined, assigneeId: U.claire, automated: false });
  }

  // 6. Logistique & admin des sessions.
  const ev11 = evId("SW-0011");
  const ev12 = evId("SW-0012");
  const admin: [string, TaskKind, Priority, number, string | undefined, string, number?][] = [
    ["Confirmer la villa (Malaga ou Alicante) et signer le contrat", "admin", "urgente", 2, ev11, U.aurelien],
    ["Réserver les transferts aéroport SW-0011", "admin", "haute", 8, ev11, U.aurelien],
    ["Vérifier l'accessibilité et les aménagements SW-0011 (1 participant TDAH)", "qualiopi", "haute", 10, ev11, U.claire],
    ["Envoyer les accès à la plateforme live SW-0012", "email", "haute", 3, ev12, U.karim],
    ["Planifier les diagnostics MVP individuels SW-0012", "rdv", "haute", -2, ev12, U.karim, -3],
    ["Préparer les supports adaptés (dyslexie) SW-0012", "qualiopi", "normale", 4, ev12, U.claire],
    ["Brief intervenants SW-0012", "rdv", "normale", 6, ev12, U.claire],
    ["Générer et envoyer les certificats de réalisation SW-0010", "qualiopi", "normale", -12, evId("SW-0010"), U.claire, -12],
    ["Payer les factures intervenants SW-0010", "admin", "normale", -10, evId("SW-0010"), U.aurelien, -9],
    ["Bilan de session SW-0010 (satisfaction, incidents, actions)", "qualiopi", "normale", -8, evId("SW-0010"), U.claire, -7],
    ["Commander les kits welcome SW-0013", "admin", "basse", 20, evId("SW-0013"), U.aurelien],
    ["Préparer le webinaire financement (WEB-0002)", "admin", "normale", 12, evId("WEB-0002"), U.lea],
    ["Envoyer le replay du webinaire WEB-0001", "email", "normale", -15, evId("WEB-0001"), U.lea, -15],
  ];
  for (const [title, kind, priority, days, eventId, assigneeId, doneDays] of admin) {
    add({ title, kind, priority, due: clock.rel(days, 17), done: doneDays !== undefined ? clock.rel(doneDays, 15) : undefined, assigneeId, related: eventId ? ref("events", eventId) : undefined, automated: false });
  }

  // 7. Historique de tâches terminées (relances et appels des semaines passées).
  const recentApps = ctx.data.applications.filter((a) => a.decisionAt && Date.parse(a.decisionAt) > clock.now - 40 * DAY && Date.parse(a.decisionAt) < clock.now - DAY);
  for (const app of r.pickN(recentApps, 8)) {
    const ts = Date.parse(app.decisionAt!) - r.between(4, 30) * HOUR;
    add({ title: `Appel de qualification — ${nameOf(app.contactId)}`, kind: "appel", priority: "normale", due: ts, done: ts + r.between(0, 3) * HOUR, assigneeId: app.reviewerId ?? U.lea, related: ref("applications", app.id), automated: false, created: Date.parse(app.submittedAt) + HOUR });
  }

  ctx.data.tasks = sortBy(tasks, (t) => t.due).map((t, i) => {
    const created = Math.min(t.created ?? t.due - r.between(2, 10) * DAY, clock.now - HOUR);
    return {
      id: `tsk_${pad(i + 1)}`,
      ...stamps(ctx, created, t.done ?? created),
      title: t.title,
      kind: t.kind,
      priority: t.priority,
      dueAt: clock.iso(t.due),
      doneAt: t.done ? clock.iso(clock.past(t.done)) : undefined,
      assigneeId: t.assigneeId,
      related: t.related,
      sequenceId: t.sequenceId,
      automated: t.automated,
      notes: t.notes,
    };
  });
}

/* ───────────────────────────── Journal des emails ───────────────────────────── */

function buildEmails(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("emails");
  const tpl = new Map(ctx.data.emailTemplates.map((t) => [t.id, t]));
  const rows: (Omit<EmailMessage, "id" | "createdAt" | "updatedAt"> & { ts: number })[] = [];
  // Formateurs Intl mis en cache (les appels toLocale* répétés sont coûteux au démarrage du store).
  const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  const eurFmt = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt = (iso: string) => dateFmt.format(new Date(iso));
  const money = (c: number) => `${eurFmt.format(c / 100)} €`;

  const send = (templateId: string, to: Contact | { email: string; firstName: string }, vars: Record<string, string>, ts: number, related?: EntityRef, sequenceId?: string, scheduled = false) => {
    const t = tpl.get(templateId)!;
    const all = { prenom: to.firstName, ...vars };
    let status: EmailStatus;
    if (scheduled || ts > clock.now) status = "programme";
    else status = r.weighted([["ouvert", 55], ["clique", 17], ["envoye", 25], ["erreur", 3]] as const);
    const sent = clock.past(ts, 2 * MIN);
    rows.push({
      ts,
      to: to.email,
      subject: render(t.subject, all),
      body: render(t.body, all),
      templateId,
      status,
      scheduledAt: status === "programme" ? clock.iso(ts) : undefined,
      sentAt: status === "programme" ? undefined : clock.iso(sent),
      openedAt: status === "ouvert" || status === "clique" ? clock.iso(clock.past(sent + r.between(3, 600) * MIN)) : undefined,
      related,
      sequenceId,
    });
  };
  const contact = (id: string) => ctx.data.contacts.find((c) => c.id === id)!;
  const since = clock.now - 45 * DAY;
  const ackSince = clock.now - 30 * DAY;

  // Accusés de réception des formulaires (30 derniers jours).
  const ackTpl: Record<SubmissionType, string> = {
    candidature: "tpl_ack_candidature",
    contact: "tpl_ack_contact",
    entreprise: "tpl_ack_entreprise",
    accompagnement: "tpl_ack_accompagnement",
    partenariat: "tpl_ack_partenariat",
    digital_starter_kit: "tpl_dsk",
    reclamation: "tpl_ack_reclamation",
    newsletter: "tpl_newsletter",
  };
  for (const s of ctx.data.submissions) {
    const ts = Date.parse(s.receivedAt);
    if (ts < ackSince || s.status === "spam") continue;
    const to = s.contactId ? contact(s.contactId) : { email: s.email, firstName: s.name.split(" ")[0] };
    const app = ctx.data.applications.find((a) => a.id === s.applicationId);
    const ev = app ? ctx.data.events.find((e) => e.id === app.eventId) : undefined;
    const cpl = ctx.data.complaints.find((c) => c.id === s.complaintId);
    send(ackTpl[s.type], to, { session: ev?.name ?? "", date_debut: ev ? fmt(ev.startAt) : "", entreprise: s.company ?? "", offre: s.fields.serviceName ?? "", numero_reclamation: cpl?.number ?? "", lien_kit: "https://storage.startupweek.tech/public/digital-starter-kit.zip" }, ts + r.between(1, 3) * MIN, { entity: "submissions", id: s.id }, s.type === "digital_starter_kit" ? "seq_dsk" : undefined);
    if (s.type === "digital_starter_kit") {
      send("tpl_dsk_j3", to, { session: "Session en ligne — Novembre 2026" }, ts + 3 * DAY + 2 * HOUR, { entity: "submissions", id: s.id }, "seq_dsk");
    }
  }

  // Acceptations + factures d'acompte (décisions des 30 derniers jours).
  for (const app of ctx.data.applications.filter((a) => (a.status === "acceptee" || a.status === "inscrite") && a.decisionAt && Date.parse(a.decisionAt) > ackSince)) {
    const ev = ctx.data.events.find((e) => e.id === app.eventId)!;
    const c = contact(app.contactId);
    const deposit = ctx.data.invoices.find((i) => i.applicationId === app.id && i.kind === "acompte");
    const vars = { session: ev.name, montant_acompte: deposit ? money(Math.round(app.amountDueCents * 0.3)) : "", lien_paiement: deposit?.stripePaymentLink ?? "https://www.startupweek.tech/paiement", numero_facture: deposit?.number ?? "", montant: deposit ? money(Math.round(app.amountDueCents * 0.3)) : "" };
    const ts = Date.parse(app.decisionAt!);
    send(ev.mode === "distanciel" ? "tpl_accept_distanciel" : "tpl_accept_presentiel", c, vars, ts + MIN, { entity: "applications", id: app.id }, "seq_acceptee");
    if (deposit) send("tpl_facture_acompte", c, vars, ts + 6 * MIN, { entity: "invoices", id: deposit.id }, "seq_acceptee");
  }
  // Refus récents.
  for (const app of ctx.data.applications.filter((a) => a.status === "refusee" && a.decisionAt && Date.parse(a.decisionAt) > since)) {
    send("tpl_refus", contact(app.contactId), {}, Date.parse(app.decisionAt!) + 2 * MIN, { entity: "applications", id: app.id });
  }

  // Convocations envoyées et rappels J-7 programmés (session imminente).
  for (const app of ctx.data.applications.filter((a) => a.status === "inscrite" && a.convocationSentAt && Date.parse(a.convocationSentAt) > since)) {
    const ev = ctx.data.events.find((e) => e.id === app.eventId)!;
    const c = contact(app.contactId);
    const vars = { session: ev.name, date_debut: fmt(ev.startAt), date_fin: fmt(ev.endAt) };
    send("tpl_convocation", c, vars, Date.parse(app.convocationSentAt!), { entity: "applications", id: app.id });
    const j7 = Date.parse(ev.startAt) - 7 * DAY;
    if (j7 > clock.now) send("tpl_rappel_j7", c, vars, j7, { entity: "applications", id: app.id }, "seq_j7", true);
  }

  // Clôture de la dernière session terminée : questionnaire à chaud, certificat, upsell Iteration Lab.
  const lastPast = sortBy(ctx.data.events.filter((e) => e.kind === "startup_week" && Date.parse(e.endAt) < clock.now), (e) => Date.parse(e.endAt)).at(-1)!;
  for (const app of ctx.data.applications.filter((a) => a.eventId === lastPast.id && a.status === "inscrite")) {
    const c = contact(app.contactId);
    const E = Date.parse(lastPast.endAt);
    send("tpl_eval_chaud", c, { session: lastPast.name, lien_questionnaire: "https://www.startupweek.tech/avis" }, E + 2 * HOUR, { entity: "applications", id: app.id }, "seq_j1");
    send("tpl_certificat", c, { session: lastPast.name, duree: String(lastPast.durationHours) }, Date.parse(app.certificateIssuedAt ?? lastPast.endAt), { entity: "applications", id: app.id }, "seq_j1");
    if (r.chance(0.4)) send("tpl_upsell_il", c, {}, E + 15 * DAY, { entity: "contacts", id: c.id });
  }

  // Relances de factures et de devis.
  for (const inv of ctx.data.invoices.filter((i) => i.remindersSent > 0 && i.lastReminderAt)) {
    const c = inv.contactId ? contact(inv.contactId) : undefined;
    if (!c) continue;
    const vars = { numero_facture: inv.number, montant: money(linesTotalCents(inv.lines) - inv.paidCents), date_echeance: fmt(inv.dueAt), lien_paiement: inv.stripePaymentLink ?? "Virement : IBAN sur la facture" };
    const last = Date.parse(inv.lastReminderAt!);
    if (inv.remindersSent >= 2) send("tpl_relance_facture_j3", c, vars, last - 7 * DAY, { entity: "invoices", id: inv.id }, "seq_facture");
    send(inv.remindersSent >= 2 ? "tpl_relance_facture_j10" : "tpl_relance_facture_j3", c, vars, last, { entity: "invoices", id: inv.id }, "seq_facture");
  }
  for (const q of ctx.data.quotes.filter((x) => x.status === "envoye")) {
    const c = contact(q.contactId!);
    const sent = Date.parse(q.sentAt!);
    for (const delay of [3, 14]) {
      if (sent + delay * DAY < clock.now) send("tpl_relance_devis", c, { numero_devis: q.number }, sent + delay * DAY + 9 * HOUR, { entity: "quotes", id: q.id }, "seq_devis");
    }
  }
  // Accusés formels des réclamations récentes.
  for (const cpl of ctx.data.complaints.filter((c) => c.ackAt && Date.parse(c.ackAt) > since)) {
    send("tpl_reclamation_48h", contact(cpl.contactId!), { numero_reclamation: cpl.number }, Date.parse(cpl.ackAt!), { entity: "complaints", id: cpl.id });
  }

  ctx.data.emails = sortBy(rows, (e) => e.ts).map(({ ts, ...e }, i) => ({ id: `mail_${pad(i + 1)}`, ...stamps(ctx, Math.min(ts, clock.now - MIN), e.openedAt ? Date.parse(e.openedAt) : ts), ...e }));
}
