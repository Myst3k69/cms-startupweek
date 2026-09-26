/**
 * Ressources : kits participants, documents administratifs et documents Qualiopi.
 * URL stables sur le stockage (plus d'URL Airtable expirantes). Met à jour `event.resourceIds`.
 */
import type { EventSession, Resource, ResourceCategory, ResourceFormat, Visibility } from "../../domain/types";
import { type SeedContext, stamps } from "./context";
import { DAY, slug } from "./helpers";
import { evId } from "./events";
import { U } from "./team";

type Scope = "sw" | "sw_distanciel" | "villages" | "marrakech" | "none";

interface ResSpec {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  format: ResourceFormat;
  visibility: Visibility;
  scope: Scope;
  indicators: number[];
  version: string;
  sizeKb?: number;
  owner: string;
  since: string;
}

const EXT: Record<ResourceFormat, string> = { pdf: ".pdf", docx: ".docx", xlsx: ".xlsx", figma: ".fig", notion: "", video: "", lien: "", zip: ".zip", texte: ".txt" };

const SPECS: ResSpec[] = [
  // Kits et templates participants
  { id: "res_bp_template", title: "Template business plan (lean canvas + prévisionnel)", description: "Lean canvas, hypothèses clés et prévisionnel simplifié à compléter pendant la semaine.", category: "business_plan", format: "docx", visibility: "participants", scope: "sw", indicators: [19], version: "2.1", sizeKb: 420, owner: U.karim, since: "2025-10-12" },
  { id: "res_pitch_deck", title: "Template pitch deck investisseurs (12 slides)", description: "Structure de pitch éprouvée : problème, solution, marché, traction, équipe, demande.", category: "pitch_deck", format: "figma", visibility: "participants", scope: "sw", indicators: [19], version: "3.0", owner: U.aurelien, since: "2025-10-12" },
  { id: "res_figma_kit", title: "Kit de maquettage Figma (composants UI)", description: "Bibliothèque de composants et d'écrans types pour maquetter un MVP en quelques heures.", category: "maquette", format: "figma", visibility: "participants", scope: "sw", indicators: [19], version: "1.4", owner: U.karim, since: "2025-10-20" },
  { id: "res_modele_financier", title: "Modèle financier 3 ans (SaaS & marketplace)", description: "Tableur de prévisionnel avec hypothèses de conversion, CAC, churn et besoin de financement.", category: "financier", format: "xlsx", visibility: "participants", scope: "sw", indicators: [19], version: "2.0", sizeKb: 180, owner: U.aurelien, since: "2025-11-02" },
  { id: "res_scope_mvp", title: "Canevas de scope MVP", description: "Document guidé pour prioriser les fonctionnalités (MoSCoW) et définir le parcours clé.", category: "pedagogique", format: "notion", visibility: "participants", scope: "sw", indicators: [6, 19], version: "1.3", owner: U.claire, since: "2025-10-12" },
  { id: "res_stack_nocode", title: "Guide des outils no-code & IA 2026", description: "Comparatif Bubble, Webflow, Supabase, Airtable, n8n, Make et des briques IA, avec tarifs et cas d'usage.", category: "digital", format: "notion", visibility: "participants", scope: "sw", indicators: [19, 25], version: "2026.2", owner: U.karim, since: "2025-12-01" },
  { id: "res_protocole_tests", title: "Protocole de tests utilisateurs + grille d'observation", description: "Script d'entretien, consignes de test et grille d'observation pour la journée J5.", category: "pedagogique", format: "docx", visibility: "participants", scope: "sw", indicators: [6, 19], version: "1.2", sizeKb: 95, owner: U.claire, since: "2026-01-10" },
  { id: "res_replays", title: "Replays des sessions live", description: "Enregistrements sous-titrés des sessions live, disponibles 6 mois.", category: "pedagogique", format: "video", visibility: "participants", scope: "sw_distanciel", indicators: [19, 26], version: "—", owner: U.karim, since: "2026-06-08" },
  { id: "res_roadmap30", title: "Template roadmap MVP 30 jours", description: "Plan d'action post-MVP : itérations, acquisition, premiers clients, indicateurs à suivre.", category: "pedagogique", format: "notion", visibility: "participants", scope: "sw", indicators: [10, 19], version: "1.0", owner: U.aurelien, since: "2026-02-15" },
  { id: "res_dsk", title: "Digital Starter Kit (6 modules)", description: "Kit gratuit : clarifier son idée, définir sa cible, maquetter, choisir ses outils no-code, utiliser l'IA, préparer son lancement.", category: "digital", format: "zip", visibility: "public", scope: "none", indicators: [1], version: "2.3", sizeKb: 14800, owner: U.aurelien, since: "2025-09-15" },
  { id: "res_programme", title: "Programme détaillé StartupWeek (J1 → J7)", description: "Objectifs opérationnels, déroulé jour par jour, modalités d'évaluation, prérequis et accessibilité.", category: "pedagogique", format: "pdf", visibility: "public", scope: "sw", indicators: [1, 5, 6], version: "2026.3", sizeKb: 860, owner: U.claire, since: "2025-10-01" },
  { id: "res_acculturation", title: "Ressource d'acculturation digitale pour étudiants admis", description: "Parcours de préparation (2 h) envoyé aux étudiants avant le Startup Village : vocabulaire produit, outils no-code, IA.", category: "pedagogique", format: "pdf", visibility: "participants", scope: "villages", indicators: [19], version: "1.1", sizeKb: 2300, owner: U.claire, since: "2026-04-20" },
  // Documents administratifs
  { id: "res_cgv", title: "Conditions générales de vente", description: "CGV : acompte de 30 % à l'inscription, solde à J-30, conditions d'annulation et de report.", category: "juridique", format: "pdf", visibility: "public", scope: "none", indicators: [1], version: "2026.1", sizeKb: 210, owner: U.aurelien, since: "2025-09-01" },
  { id: "res_reglement", title: "Règlement intérieur", description: "Règles de vie, hygiène et sécurité, discipline, représentation des stagiaires.", category: "administratif", format: "pdf", visibility: "participants", scope: "sw", indicators: [9], version: "1.2", sizeKb: 150, owner: U.claire, since: "2025-10-01" },
  { id: "res_livret", title: "Livret d'accueil participant", description: "Équipe, contacts, déroulé, accessibilité, référente handicap, procédure de réclamation.", category: "administratif", format: "pdf", visibility: "participants", scope: "sw", indicators: [9, 26, 31], version: "2026.2", sizeKb: 1900, owner: U.claire, since: "2025-10-15" },
  { id: "res_guide_marrakech", title: "Guide pratique Marrakech", description: "Accès, transferts depuis l'aéroport, météo, trousseau, change et contacts utiles au riad.", category: "administratif", format: "pdf", visibility: "participants", scope: "marrakech", indicators: [9], version: "1.1", sizeKb: 3200, owner: U.aurelien, since: "2025-10-25" },
  // Documents Qualiopi
  { id: "res_proc_reclamations", title: "Procédure de traitement des réclamations", description: "Canaux de réclamation, accusé de réception sous 48 h, analyse, réponse, action corrective et clôture.", category: "qualiopi", format: "pdf", visibility: "public", scope: "none", indicators: [31, 32], version: "1.1", sizeKb: 120, owner: U.claire, since: "2026-01-20" },
  { id: "res_proc_handicap", title: "Procédure d'accueil des personnes en situation de handicap", description: "Rôle de la référente handicap, recueil des besoins, aménagements, réseau (Agefiph, Cap Emploi, RHF).", category: "qualiopi", format: "pdf", visibility: "public", scope: "none", indicators: [26], version: "1.0", sizeKb: 140, owner: U.claire, since: "2026-02-03" },
  { id: "res_charte_formateurs", title: "Charte qualité des intervenants", description: "Engagements des formateurs et mentors (sous-traitants) au regard du référentiel Qualiopi.", category: "qualiopi", format: "pdf", visibility: "interne", scope: "none", indicators: [21, 27], version: "0.9", sizeKb: 90, owner: U.claire, since: "2026-08-25" },
  { id: "res_questionnaire_satisfaction", title: "Questionnaires de satisfaction (à chaud & à froid J+60)", description: "Questionnaires en ligne envoyés automatiquement en fin de session et à J+60.", category: "qualiopi", format: "lien", visibility: "interne", scope: "none", indicators: [30], version: "2.0", owner: U.claire, since: "2025-11-10" },
  { id: "res_modele_convention", title: "Modèle de contrat / convention de formation", description: "Contrat de formation professionnelle (particulier) et convention (entreprise / financeur).", category: "juridique", format: "docx", visibility: "interne", scope: "none", indicators: [9], version: "1.3", sizeKb: 70, owner: U.claire, since: "2025-10-05" },
  { id: "res_modele_convocation", title: "Modèle de convocation", description: "Convocation envoyée à J-10 : dates, horaires, lieu, accès, contacts, documents à lire.", category: "qualiopi", format: "docx", visibility: "interne", scope: "none", indicators: [9], version: "1.1", sizeKb: 45, owner: U.claire, since: "2025-10-05" },
  { id: "res_attestation", title: "Modèle de certificat de réalisation", description: "Certificat de réalisation (modèle ministériel) généré automatiquement à la clôture de la session.", category: "qualiopi", format: "docx", visibility: "interne", scope: "none", indicators: [11], version: "1.0", sizeKb: 40, owner: U.claire, since: "2025-11-14" },
  { id: "res_positionnement", title: "Questionnaire de positionnement d'entrée", description: "Auto-diagnostic (autonomie numérique, maturité du projet, outils no-code, pitch) complété avant la session.", category: "qualiopi", format: "lien", visibility: "interne", scope: "none", indicators: [8], version: "1.2", owner: U.claire, since: "2026-03-10" },
  { id: "res_grille_acquis", title: "Grille d'évaluation des acquis (démo & pitch)", description: "Grille critériée utilisée par le jury et les mentors pour évaluer l'atteinte des 5 objectifs.", category: "qualiopi", format: "pdf", visibility: "interne", scope: "none", indicators: [11], version: "1.1", sizeKb: 60, owner: U.claire, since: "2026-03-01" },
  { id: "res_plan_competences", title: "Plan de développement des compétences 2026 (brouillon)", description: "Formations prévues pour l'équipe et les intervenants réguliers (IA, accessibilité, pédagogie).", category: "qualiopi", format: "docx", visibility: "interne", scope: "none", indicators: [22], version: "0.3", sizeKb: 35, owner: U.claire, since: "2026-09-10" },
  { id: "res_registre_veille", title: "Registre de veille (légale, métiers, pédagogique, handicap)", description: "Registre alimenté depuis le CRM : sources, synthèse, impact et actions décidées.", category: "qualiopi", format: "notion", visibility: "interne", scope: "none", indicators: [23, 24, 25, 26], version: "—", owner: U.claire, since: "2026-01-20" },
  { id: "res_resultats", title: "Indicateurs de résultats publiés (page du site)", description: "Satisfaction moyenne, nombre de participants, taux d'assiduité et MVP livrés, mis à jour chaque trimestre.", category: "qualiopi", format: "lien", visibility: "public", scope: "none", indicators: [2], version: "T3 2026", owner: U.aurelien, since: "2026-04-01" },
];

function inScope(scope: Scope, ev: EventSession): boolean {
  switch (scope) {
    case "sw":
      return ev.kind === "startup_week";
    case "sw_distanciel":
      return ev.kind === "startup_week" && ev.mode === "distanciel";
    case "villages":
      return ev.kind === "startup_village";
    case "marrakech":
      return ev.id === evId("SW-0001") || ev.id === evId("SW-0007");
    default:
      return false;
  }
}

export function buildResources(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("resources");
  const resources: Resource[] = SPECS.map((s) => {
    const eventIds = ctx.data.events.filter((ev) => inScope(s.scope, ev)).map((ev) => ev.id);
    const created = clock.real(s.since, 10, 0);
    const folder = s.visibility === "public" ? "public" : s.visibility === "interne" ? "interne" : "participants";
    const base = s.format === "lien" ? "liens" : s.format === "video" ? "videos" : s.format === "notion" ? "notion" : s.format === "figma" ? "figma" : folder;
    const downloads = s.visibility === "public" ? r.between(300, 2600) : s.visibility === "participants" ? r.between(20, 90) * Math.max(1, Math.ceil(eventIds.length / 6)) : r.between(0, 25);
    return {
      id: s.id,
      ...stamps(ctx, created, Math.max(created, clock.now - r.between(3, 80) * DAY)),
      title: s.title,
      description: s.description,
      category: s.category,
      format: s.format,
      visibility: s.visibility,
      url: `https://storage.startupweek.tech/${base}/${slug(s.title).slice(0, 60)}${EXT[s.format]}`,
      sizeKb: s.sizeKb,
      version: s.version,
      eventIds,
      indicatorCodes: s.indicators,
      downloads,
      ownerId: s.owner,
    };
  });
  ctx.data.resources = resources;
  for (const ev of ctx.data.events) {
    ev.resourceIds = resources.filter((res) => res.eventIds.includes(ev.id)).map((res) => res.id);
  }
}
