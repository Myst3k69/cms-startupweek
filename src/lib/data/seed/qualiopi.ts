/**
 * Qualiopi : indicateurs (statut « audit initial en préparation »), preuves, actions d'amélioration,
 * veille, réclamations, émargements et évaluations.
 */
import type {
  Attendance,
  AttendanceStatus,
  Complaint,
  Evaluation,
  Evidence,
  ImprovementAction,
  IndicatorStatus,
  QualiopiIndicator,
  WatchItem,
} from "../../domain/types";
import { NEWCOMER_DEFERRED, QUALIOPI_REFERENTIEL } from "../qualiopi-referentiel";
import { type SeedContext, stamps } from "./context";
import { DAY, HOUR, MIN, pad, sortBy } from "./helpers";
import { SPK, evId, trainingDays } from "./events";
import { ORG } from "./organizations";
import { mainContactOf } from "./people";
import { U } from "./team";

/* ───────────────────────────── Indicateurs ───────────────────────────── */

const STATUS: Record<number, [IndicatorStatus, string?]> = {
  1: ["conforme", "Pages sessions complètes (prérequis, objectifs, durée, délais, tarifs, accessibilité). Vérifier la mention du délai d'accès sur les sessions en ligne."],
  2: ["partiel", "Satisfaction et nombre de participants publiés ; manquent le taux d'abandon et le taux de réalisation (action en cours)."],
  4: ["conforme", "Formulaire de candidature + entretien de qualification tracés dans le CRM."],
  5: ["conforme"],
  6: ["conforme"],
  8: ["partiel", "Positionnement systématique seulement depuis SW-0006 (mars 2026) : sessions antérieures sans trace."],
  9: ["conforme", "Convocations envoyées à J-10 et tracées ; livret d'accueil et règlement intérieur joints."],
  10: ["partiel", "Suivi individuel réel (mentorat, review J+15) mais comptes rendus pas toujours saisis."],
  11: ["partiel", "Grille des acquis utilisée depuis mars 2026 ; formaliser l'auto-évaluation de fin de session pour toutes les sessions."],
  12: ["conforme", "Émargements numériques par demi-journée, relance des absents le jour même."],
  17: ["conforme"],
  18: ["partiel", "Brief intervenants oral : formaliser un compte rendu de préparation par session."],
  19: ["conforme", "Espace ressources participants + statistiques de téléchargement."],
  21: ["non_conforme", "2 intervenants sans CV au dossier (Victor Lambert, Élise Caron) — à régulariser avant l'audit."],
  22: ["a_faire", "Plan de développement des compétences 2026 en brouillon, entretiens professionnels non planifiés."],
  23: ["partiel", "Veille légale tenue mais exploitation (actions) peu tracée."],
  24: ["a_faire", "Aucune source de veille métiers formalisée : définir sources et revue trimestrielle."],
  25: ["conforme", "Tests réguliers des nouveaux outils no-code / IA, évolutions du programme tracées."],
  26: ["conforme", "Référente handicap nommée, procédure publiée, 4 aménagements tracés en 2026."],
  27: ["non_conforme", "Freelances sans contrat de sous-traitance ni charte signée (3/10) : risque de non-conformité majeure."],
  30: ["conforme", "Questionnaires à chaud (taux de réponse ≈ 95 %) et à froid J+60 ; retours financeurs et écoles collectés."],
  31: ["partiel", "Procédure en place ; une réclamation récente sans accusé de réception à traiter."],
  32: ["partiel", "Actions d'amélioration suivies dans le CRM ; mesurer l'efficacité des actions clôturées."],
};

export function buildQualiopi(ctx: SeedContext): void {
  buildIndicators(ctx);
  buildImprovementAndWatch(ctx);
  buildComplaints(ctx);
  buildEvidences(ctx);
  buildAttendances(ctx);
  buildEvaluations(ctx);
}

function buildIndicators(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("indicators");
  ctx.data.indicators = QUALIOPI_REFERENTIEL.map((ref) => {
    const [status, notes] = ref.applicableToStartupWeek ? (STATUS[ref.code] ?? ["a_faire"]) : (["non_applicable", `Non applicable : ${ref.applicability.toLowerCase()}.`] as [IndicatorStatus, string]);
    const reviewed = status !== "non_applicable" && status !== "a_faire";
    const created = clock.real("2026-01-20", 10, 0);
    const reviewedTs = clock.now - r.between(2, 50) * DAY - r.between(1, 8) * HOUR;
    const indicator: QualiopiIndicator = {
      id: `ind_${pad(ref.code, 2)}`,
      ...stamps(ctx, created, reviewed ? reviewedTs : created + DAY),
      code: ref.code,
      criterion: ref.criterion,
      title: ref.title,
      expectation: ref.expectation,
      evidenceHints: ref.evidenceHints,
      status,
      ownerId: !ref.applicableToStartupWeek ? undefined : [1, 2, 17].includes(ref.code) ? U.aurelien : U.claire,
      notes,
      lastReviewedAt: reviewed ? clock.iso(reviewedTs) : undefined,
      newcomerDeferred: NEWCOMER_DEFERRED.includes(ref.code),
      autoSource: ref.autoSource,
    };
    return indicator;
  });
}

/* ───────────────────────────── Actions d'amélioration & veille ───────────────────────────── */

function buildImprovementAndWatch(ctx: SeedContext): void {
  const { clock } = ctx;
  const d = (ymd: string, hh = 10) => clock.real(ymd, hh, 0);
  type A = Omit<ImprovementAction, "createdAt" | "updatedAt"> & { since: number };
  const actions: A[] = [
    { id: "act_001", since: clock.rel(-12), title: "Collecter les CV manquants des intervenants", description: "Obtenir et archiver les CV à jour de Victor Lambert et Élise Caron, vérifier les justificatifs de qualification.", origin: "audit_blanc", indicatorCodes: [21], ownerId: U.claire, dueAt: clock.iso(clock.rel(10, 18)), status: "en_cours" },
    { id: "act_002", since: clock.rel(-12), title: "Contrats de sous-traitance et charte qualité des freelances", description: "Faire signer un contrat de sous-traitance et la charte qualité à chaque intervenant freelance (10 personnes).", origin: "audit_blanc", indicatorCodes: [27, 21], ownerId: U.claire, dueAt: clock.iso(clock.rel(30, 18)), status: "en_cours" },
    { id: "act_003", since: d("2026-02-20"), title: "Positionnement d'entrée systématique à J-10", description: "Envoi automatique du questionnaire de positionnement et du diagnostic MVP individuel avant chaque session.", origin: "interne", indicatorCodes: [8], ownerId: U.claire, dueAt: clock.iso(d("2026-03-15")), doneAt: clock.iso(d("2026-03-10")), status: "fait", impact: "100 % des participants positionnés depuis SW-0006." },
    { id: "act_004", since: clock.rel(-12), title: "Publier le taux d'abandon et le taux de réalisation", description: "Compléter la page « Nos résultats » avec le taux d'abandon, le taux de réalisation et la date de mise à jour.", origin: "audit_blanc", indicatorCodes: [2], ownerId: U.aurelien, dueAt: clock.iso(clock.rel(20, 18)), status: "a_faire" },
    { id: "act_005", since: d("2026-06-10"), title: "Sous-titrage automatique des sessions live", description: "Activer le sous-titrage en direct et envoyer les supports la veille pour toutes les sessions en ligne.", origin: "reclamation", indicatorCodes: [26, 10], ownerId: U.karim, dueAt: clock.iso(d("2026-06-20")), doneAt: clock.iso(d("2026-06-12")), status: "fait", impact: "Aucun incident d'accessibilité depuis ; retour positif de la participante concernée." },
    { id: "act_006", since: d("2026-03-16"), title: "Test du Wi-Fi et du débit avant chaque session en villa", description: "Check-list logistique : test de débit, routeur 4G/5G de secours, validation 72 h avant l'arrivée.", origin: "reclamation", indicatorCodes: [17], ownerId: U.aurelien, dueAt: clock.iso(d("2026-03-31")), doneAt: clock.iso(d("2026-03-19")), status: "fait", impact: "Box 5G de secours emportée à chaque session depuis SW-0006." },
    { id: "act_007", since: d("2026-09-08"), title: "Guide pratique du lieu envoyé à J-15 avec les transferts", description: "Généraliser le guide pratique (accès, horaires des navettes, contacts sur place) à tous les lieux et l'envoyer à J-15.", origin: "reclamation", indicatorCodes: [9], ownerId: U.aurelien, dueAt: clock.iso(clock.rel(14, 18)), status: "en_cours" },
    { id: "act_008", since: clock.rel(-16), title: "Plan de développement des compétences 2026", description: "Formaliser le plan (formations IA, accessibilité numérique, pédagogie) et planifier les entretiens professionnels.", origin: "interne", indicatorCodes: [22], ownerId: U.claire, dueAt: clock.iso(clock.rel(40, 18)), status: "a_faire" },
    { id: "act_009", since: clock.rel(-9), title: "Organiser la veille métiers et compétences", description: "Choisir 5 sources (France Travail BMO, Bpifrance Le Lab, études sectorielles) et instaurer une revue trimestrielle.", origin: "veille", indicatorCodes: [24], ownerId: U.claire, dueAt: clock.iso(clock.rel(35, 18)), status: "a_faire" },
    { id: "act_010", since: d("2026-07-02"), title: "Module « IA responsable & AI Act » dans la journée IA", description: "Ajouter 45 minutes sur les obligations de l'AI Act, la maîtrise de l'IA et les bonnes pratiques de données.", origin: "veille", indicatorCodes: [25, 6], ownerId: U.karim, dueAt: clock.iso(clock.rel(8, 18)), status: "en_cours" },
    { id: "act_011", since: d("2026-04-14"), title: "Recrutement des testeurs en amont de la journée J5", description: "Suite aux évaluations à chaud : recruter les testeurs dès J2 pour allonger le temps de tests.", origin: "evaluation", indicatorCodes: [6, 10], ownerId: U.claire, dueAt: clock.iso(d("2026-04-24")), doneAt: clock.iso(d("2026-04-22")), status: "fait", impact: "Nombre moyen de tests par participant passé de 3 à 6 (SW-0008)." },
    { id: "act_012", since: clock.rel(-10), title: "Débrief intervenants systématique en fin de session", description: "Questionnaire intervenant + réunion de 30 min le dernier jour, compte rendu dans le CRM.", origin: "intervenant", indicatorCodes: [18, 30], ownerId: U.claire, dueAt: clock.iso(clock.rel(9, 18)), status: "en_cours" },
  ];
  ctx.data.improvementActions = actions.map(({ since, ...a }) => ({ ...a, ...stamps(ctx, since, a.doneAt ? Date.parse(a.doneAt) : since + 2 * DAY) }));

  type W = Omit<WatchItem, "createdAt" | "updatedAt" | "publishedAt"> & { published: number; logged: number };
  const watch: W[] = [
    { id: "wat_001", kind: "legale", title: "CPF : participation forfaitaire obligatoire du titulaire (100 €)", source: "Décret n° 2024-394 du 29 avril 2024", url: "https://www.legifrance.gouv.fr", published: d("2024-05-02"), logged: d("2026-01-22"), summary: "Reste à charge de 100 € sur chaque achat CPF (sauf exceptions). Sans impact direct : les sessions StartupWeek ne sont pas éligibles au CPF.", impact: "faible" },
    { id: "wat_002", kind: "legale", title: "AI Act : obligation de maîtrise de l'IA (art. 4) pour les déployeurs", source: "Règlement (UE) 2024/1689", url: "https://eur-lex.europa.eu", published: d("2025-02-02"), logged: d("2026-07-01"), summary: "Les organisations qui déploient des systèmes d'IA doivent assurer un niveau suffisant de maîtrise de l'IA de leur personnel. Opportunité pour l'AI Adoption Sprint et contenu à intégrer au programme.", impact: "moyen", actionId: "act_010" },
    { id: "wat_003", kind: "legale", title: "Qualiopi : attendus sur la publication des indicateurs de résultats", source: "Guide de lecture du Référentiel National Qualité", url: "https://travail-emploi.gouv.fr", published: d("2026-03-02"), logged: clock.rel(-13), summary: "Les indicateurs publiés doivent être datés, adaptés aux prestations et mis à jour. Notre page résultats ne mentionne ni taux d'abandon ni date de mise à jour.", impact: "moyen", actionId: "act_004" },
    { id: "wat_004", kind: "legale", title: "Facturation électronique : réception obligatoire au 1er septembre 2026", source: "impots.gouv.fr — réforme de la facturation électronique", url: "https://www.impots.gouv.fr", published: d("2026-09-01"), logged: clock.rel(-24), summary: "Toutes les entreprises doivent pouvoir recevoir des factures électroniques ; l'émission devient obligatoire pour les PME en septembre 2027. Choisir une plateforme agréée et adapter le module de facturation.", impact: "fort" },
    { id: "wat_005", kind: "metiers", title: "Besoins en main-d'œuvre 2026 : tensions sur les métiers du numérique", source: "France Travail — enquête BMO", url: "https://www.francetravail.org", published: d("2026-04-15"), logged: d("2026-05-05"), summary: "Forte demande de profils produit, data et automatisation : argument pour les profils en reconversion.", impact: "faible" },
    { id: "wat_006", kind: "metiers", title: "Adoption de l'IA générative dans les PME : besoins de formation des dirigeants", source: "Bpifrance Le Lab", url: "https://lelab.bpifrance.fr", published: d("2026-06-18"), logged: d("2026-07-03"), summary: "Les dirigeants de TPE/PME expriment un fort besoin d'accompagnement concret sur les cas d'usage IA : confirme le positionnement de l'AI Adoption Sprint.", impact: "moyen" },
    { id: "wat_007", kind: "pedagogique", title: "Agents IA intégrés aux outils no-code et d'automatisation", source: "Veille interne — tests de Karim Haddad", published: d("2026-08-20"), logged: d("2026-08-28"), summary: "Les agents IA natifs (n8n, Make, Bubble) permettent de livrer des fonctionnalités IA en quelques heures. À intégrer dans la journée J3.", impact: "fort", actionId: "act_010" },
    { id: "wat_008", kind: "pedagogique", title: "Mentorat asynchrone par vidéo courte", source: "Communauté de pratique pédagogique (webinaire)", published: d("2026-05-12"), logged: d("2026-05-20"), summary: "Retours vidéo de 3 minutes sur les maquettes entre deux sessions live : à tester en distanciel.", impact: "faible" },
    { id: "wat_009", kind: "pedagogique", title: "Sous-titrage automatique en direct dans les outils de visio", source: "Veille outils", published: d("2026-06-01"), logged: d("2026-06-10"), summary: "Sous-titrage FR fiable disponible nativement : activé pour les sessions en ligne.", impact: "moyen", actionId: "act_005" },
    { id: "wat_010", kind: "handicap", title: "European Accessibility Act : accessibilité des services numériques", source: "Directive (UE) 2019/882", url: "https://eur-lex.europa.eu", published: d("2025-06-28"), logged: d("2026-02-05"), summary: "Exigences d'accessibilité applicables à certains services numériques depuis le 28 juin 2025 : audit RGAA du site et de l'espace participant à prévoir.", impact: "moyen" },
    { id: "wat_011", kind: "handicap", title: "Aides de l'Agefiph pour la formation des personnes en situation de handicap", source: "Agefiph", url: "https://www.agefiph.fr", published: d("2026-01-15"), logged: d("2026-02-05"), summary: "Aides mobilisables pour compenser le handicap en formation (aides techniques, humaines) : à mentionner dans la procédure handicap.", impact: "faible" },
    { id: "wat_012", kind: "handicap", title: "Accueillir un stagiaire avec TDAH : bonnes pratiques", source: "Ressource Handicap Formation (webinaire)", published: d("2026-09-08"), logged: clock.rel(-15), summary: "Planning communiqué à l'avance, pauses courtes, consignes écrites : appliqué pour un participant de la session d'octobre (Espagne).", impact: "moyen" },
  ];
  ctx.data.watchItems = watch.map(({ published, logged, ...w }) => ({ ...w, publishedAt: clock.iso(published), ...stamps(ctx, logged) }));
}

/* ───────────────────────────── Réclamations ───────────────────────────── */

function buildComplaints(ctx: SeedContext): void {
  const { clock } = ctx;
  const inscrit = (code: string, rank: number) =>
    sortBy(ctx.data.applications.filter((a) => a.eventId === evId(code) && a.status === "inscrite"), (a) => a.number)[rank].contactId;
  const desisted = ctx.data.applications.find((a) => a.eventId === evId("SW-0011") && a.status === "desistee")!;
  const hearing = ctx.data.applications.find((a) => a.eventId === evId("SW-0009") && a.accessibilityNeeds)!;

  type C = Omit<Complaint, "id" | "number" | "createdAt" | "updatedAt" | "receivedAt" | "ackAt" | "closedAt"> & { received: number; ack?: number; closed?: number };
  const specs: C[] = [
    { received: clock.real("2026-03-12", 21, 40), ack: clock.real("2026-03-13", 9, 15), closed: clock.real("2026-03-24", 11, 0), channel: "evaluation", type: "organisation", severity: "mineure", status: "cloturee", contactId: inscrit("SW-0005", 2), eventId: evId("SW-0005"), subject: "Connexion internet instable à la villa", description: "Le Wi-Fi coupait plusieurs fois par jour, difficile de travailler sur le build les jours 3 et 4.", analysis: "Box du lieu sous-dimensionnée pour 12 personnes ; aucun test préalable du débit.", response: "Excuses présentées, séance de mentorat de rattrapage offerte (1 h).", correctiveAction: "Test de débit systématique 72 h avant + box 5G de secours.", improvementActionId: "act_006", ownerId: U.aurelien, satisfiedWithResponse: true },
    { received: clock.real("2026-06-08", 19, 5), ack: clock.real("2026-06-09", 8, 30), closed: clock.real("2026-06-16", 10, 0), channel: "email", type: "accessibilite", severity: "majeure", status: "cloturee", contactId: hearing.contactId, eventId: evId("SW-0009"), subject: "Sous-titres absents lors de la première session live", description: "Malgré ma demande à l'inscription, la session live du J1 n'était pas sous-titrée.", analysis: "Aménagement validé mais non transmis à l'intervenant du J1 (pas de fiche de liaison).", response: "Sous-titrage activé dès le J2, replay sous-titré du J1 fourni, appel de la référente handicap.", correctiveAction: "Sous-titrage automatique activé par défaut + fiche de liaison des aménagements transmise aux intervenants.", improvementActionId: "act_005", ownerId: U.claire, satisfiedWithResponse: true },
    { received: clock.real("2026-09-06", 22, 10), ack: clock.real("2026-09-07", 9, 0), channel: "oral", type: "organisation", severity: "mineure", status: "action", contactId: inscrit("SW-0010", 5), eventId: evId("SW-0010"), subject: "Navette aéroport non présente à l'arrivée", description: "Arrivée à 20 h à l'aéroport de Split : personne pour le transfert, taxi payé de ma poche (45 €).", analysis: "Horaire d'arrivée modifié par le participant et non répercuté au transporteur.", response: "Taxi remboursé, excuses présentées.", correctiveAction: "Guide pratique envoyé à J-15 avec formulaire de confirmation des horaires.", improvementActionId: "act_007", ownerId: U.aurelien },
    { received: clock.rel(-14, 18, 20), ack: clock.rel(-13, 10, 0), closed: clock.rel(-7, 16, 0), channel: "formulaire", type: "remboursement", severity: "mineure", status: "cloturee", contactId: desisted.contactId, eventId: evId("SW-0011"), subject: "Délai de remboursement de l'acompte", description: "Je me suis désisté(e) plus de 30 jours avant la session, quand serai-je remboursé(e) de mon acompte ?", analysis: "Demande conforme aux CGV (désistement > J-30).", response: "Avoir émis et remboursement Stripe effectué sous 5 jours ouvrés.", ownerId: U.lea, satisfiedWithResponse: true },
    { received: clock.rel(-10, 12, 30), ack: clock.rel(-9, 9, 30), channel: "evaluation", type: "qualite", severity: "mineure", status: "analyse", contactId: inscrit("SW-0010", 6), eventId: evId("SW-0010"), subject: "Journée acquisition trop rapide", description: "La journée landing & acquisition allait trop vite pour les profils non-tech, on n'a pas eu le temps de lancer une campagne.", analysis: "Retour partagé par 2 participants sur 8 : à croiser avec l'évaluation intervenant.", ownerId: U.claire },
    { received: clock.ago(30 * HOUR), channel: "formulaire", type: "paiement", severity: "majeure", status: "recue", contactId: inscrit("SW-0014", 0), eventId: evId("SW-0014"), subject: "Acompte prélevé deux fois", description: "Mon acompte a été débité deux fois sur ma carte. Merci de corriger rapidement.", ownerId: U.lea },
  ];
  ctx.data.complaints = sortBy(specs, (c) => c.received).map((c, i) => {
    const { received, ack, closed, ...rest } = c;
    const last = Math.max(received, ack ?? 0, closed ?? 0);
    return {
      id: `rec_${pad(i + 1, 3)}`,
      number: `REC-${clock.year(received)}-${pad(i + 1, 3)}`,
      ...stamps(ctx, received, last),
      ...rest,
      receivedAt: clock.iso(received),
      ackAt: ack ? clock.iso(ack) : undefined,
      closedAt: closed ? clock.iso(closed) : undefined,
    };
  });
  // Lien retour action → réclamation.
  for (const c of ctx.data.complaints) {
    const a = ctx.data.improvementActions.find((x) => x.id === c.improvementActionId);
    if (a) a.originRef = { entity: "complaints", id: c.id };
  }
}

/* ───────────────────────────── Preuves ───────────────────────────── */

function buildEvidences(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("evidences");
  type E = [code: number, title: string, kind: Evidence["kind"], resourceId?: string, url?: string, validMonths?: number, note?: string];
  const specs: E[] = [
    [1, "Pages sessions du site (programme, tarifs, délais, accessibilité)", "lien", undefined, "https://www.startupweek.tech"],
    [1, "Conditions générales de vente publiées", "document", "res_cgv"],
    [1, "Programme détaillé téléchargeable", "document", "res_programme"],
    [2, "Page « Nos résultats » (satisfaction, participants, assiduité)", "lien", "res_resultats", undefined, undefined, "Taux d'abandon à ajouter."],
    [4, "Formulaire de candidature (analyse du besoin)", "enregistrement", undefined, undefined, undefined, "Réponses archivées dans chaque candidature."],
    [4, "Trame d'entretien de qualification", "procedure"],
    [5, "Objectifs opérationnels et évaluables du programme", "document", "res_programme"],
    [6, "Déroulé pédagogique J1 → J7 et supports", "document", "res_programme"],
    [6, "Canevas de scope MVP et protocole de tests", "document", "res_scope_mvp"],
    [8, "Questionnaire de positionnement d'entrée", "document", "res_positionnement"],
    [8, "Résultats de positionnement par participant (CRM)", "enregistrement"],
    [9, "Modèle de convocation", "document", "res_modele_convocation"],
    [9, "Livret d'accueil participant", "document", "res_livret"],
    [9, "Règlement intérieur", "document", "res_reglement"],
    [10, "Fiches de suivi projet et reviews J+15 (CRM)", "enregistrement"],
    [11, "Grille d'évaluation des acquis (démo & pitch)", "document", "res_grille_acquis"],
    [11, "Modèle de certificat de réalisation", "document", "res_attestation"],
    [12, "Émargements numériques par demi-journée", "enregistrement", undefined, undefined, undefined, "Export PDF signé disponible pour chaque session."],
    [17, "Check-list logistique des lieux (Wi-Fi, accessibilité, sécurité)", "procedure"],
    [17, "Contrats de location des villas 2026-2027", "document", undefined, undefined, 12],
    [18, "Planning des intervenants par session (CRM)", "enregistrement"],
    [19, "Espace ressources participants (kits et templates)", "document", "res_bp_template"],
    [19, "Statistiques de téléchargement des ressources", "enregistrement"],
    [21, "CV des intervenants (11 / 13 au dossier)", "document", undefined, undefined, 24, "Manquants : Victor Lambert, Élise Caron."],
    [21, "Charte qualité des intervenants", "document", "res_charte_formateurs"],
    [22, "Plan de développement des compétences 2026 (brouillon)", "document", "res_plan_competences"],
    [23, "Registre de veille légale et réglementaire", "enregistrement", "res_registre_veille"],
    [25, "Registre de veille pédagogique et technologique", "enregistrement", "res_registre_veille"],
    [25, "Guide des outils no-code & IA mis à jour", "document", "res_stack_nocode"],
    [26, "Procédure d'accueil des personnes en situation de handicap", "procedure", "res_proc_handicap"],
    [26, "Lettre de nomination de la référente handicap", "document"],
    [26, "Aménagements réalisés (4 situations en 2026)", "enregistrement"],
    [27, "Charte qualité des intervenants (3 / 10 signées)", "document", "res_charte_formateurs"],
    [27, "Modèle de contrat de sous-traitance", "document", undefined, undefined, undefined, "À faire valider par le cabinet Rivière Avocats."],
    [30, "Questionnaires de satisfaction à chaud et à froid", "lien", "res_questionnaire_satisfaction"],
    [30, "Synthèse satisfaction T3 2026", "enregistrement"],
    [30, "Retours financeurs et écoles (OPCO Atlas, France Travail, Epitech)", "enregistrement"],
    [31, "Procédure de traitement des réclamations", "procedure", "res_proc_reclamations"],
    [31, "Registre des réclamations (CRM)", "enregistrement"],
    [31, "Formulaire de réclamation en ligne", "lien", undefined, "https://www.startupweek.tech/reclamation"],
    [32, "Plan d'amélioration continue (CRM)", "enregistrement"],
  ];
  ctx.data.evidences = specs.map(([code, title, kind, resourceId, url, validMonths, note], i) => {
    const created = clock.now - r.between(5, 200) * DAY;
    return {
      id: `evd_${pad(i + 1, 3)}`,
      ...stamps(ctx, created, created + r.between(0, 4) * DAY),
      indicatorCode: code,
      title,
      kind,
      resourceId,
      url,
      ownerId: [1, 2, 17].includes(code) ? U.aurelien : U.claire,
      validUntil: validMonths ? clock.iso(clock.rel(validMonths * 30 - r.between(0, 90), 23, 0)) : undefined,
      note,
    };
  });
}

/* ───────────────────────────── Émargements ───────────────────────────── */

function buildAttendances(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("attendances");
  const rows: Attendance[] = [];
  // 3 dernières sessions terminées (+ session en cours s'il y en a une).
  const sessions = sortBy(
    ctx.data.events.filter((e) => e.kind === "startup_week" && (e.status === "termine" || e.status === "en_cours")),
    (e) => Date.parse(e.startAt),
  ).slice(-3);
  let n = 0;
  for (const ev of sessions) {
    const participants = sortBy(ctx.data.applications.filter((a) => a.eventId === ev.id && a.status === "inscrite"), (a) => a.number);
    const days = trainingDays(ev);
    // Un·e participant·e excusé·e une journée (maladie), quelques retards.
    const sick = participants[r.between(0, participants.length - 1)].contactId;
    const sickDay = r.between(2, days.length - 2);
    for (const app of participants) {
      days.forEach((dayTs, di) => {
        (["matin", "apres_midi"] as const).forEach((half) => {
          let status: AttendanceStatus = "present";
          if (app.contactId === sick && di === sickDay) status = "excuse";
          else if (r.chance(0.035)) status = "retard";
          else if (r.chance(0.006)) status = "absent";
          const baseHour = half === "matin" ? 9 : 14;
          const minute = status === "retard" ? r.between(45, 75) : r.between(15, 35);
          const signed = dayTs + (baseHour - 2) * HOUR + minute * MIN;
          if (signed > clock.now) return;
          rows.push({
            id: `att_${pad(++n, 4)}`,
            ...stamps(ctx, signed),
            eventId: ev.id,
            contactId: app.contactId,
            date: clock.ymd(dayTs),
            halfDay: half,
            status,
            signedAt: status === "present" || status === "retard" ? clock.iso(signed) : undefined,
            method: ev.mode === "presentiel" && ev.code === "SW-0008" && r.chance(0.3) ? "papier" : "numerique",
          });
        });
      });
    }
  }
  ctx.data.attendances = rows;
}

/* ───────────────────────────── Évaluations ───────────────────────────── */

const HOT_COMMENTS = [
  "Semaine intense et ultra concrète : je repars avec un MVP en ligne et des retours de vrais utilisateurs.",
  "Les mentors sont disponibles et bienveillants, le rythme est soutenu mais tenable.",
  "Le cadre de la villa aide énormément à se concentrer. Mention spéciale pour la journée tests.",
  "J'ai enfin compris comment enchaîner maquette, build et tests. Le pitch final m'a fait gagner en confiance.",
  "Très bon équilibre entre ateliers collectifs et mentorat individuel.",
  "La journée IA a changé ma façon de concevoir le produit.",
  "Groupe très soudé, beaucoup d'entraide entre les profils tech et non-tech.",
  "Un peu court sur le financement, mais le reste était parfait.",
];
const COLD_COMMENTS = [
  "Deux mois après, le MVP a 40 utilisateurs actifs et j'ai signé mon premier client.",
  "J'utilise encore le canevas de scope et la roadmap 30 jours chaque semaine.",
  "J'ai mis le projet en pause mais la méthode me sert dans mon poste actuel.",
  "La review J+15 a été décisive pour prioriser les bonnes fonctionnalités.",
  "Le réseau alumni m'a permis de trouver un associé technique.",
];
const SPEAKER_COMMENTS = [
  "Groupe engagé, niveau hétérogène bien géré grâce aux binômes.",
  "Conditions de travail excellentes ; prévoir un second écran pour les ateliers build.",
  "Très bonne préparation des participants grâce au diagnostic pré-event.",
  "Temps de mentorat individuel un peu juste le J4, à rallonger.",
];

function buildEvaluations(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("evaluations");
  const rows: Evaluation[] = [];
  let n = 0;
  const push = (e: Omit<Evaluation, "id" | "createdAt" | "updatedAt" | "submittedAt">, ts: number) => {
    const t = clock.past(ts, HOUR);
    rows.push({ id: `eva_${pad(++n, 4)}`, ...stamps(ctx, t), submittedAt: clock.iso(t), ...e });
  };
  const s15 = () => r.weighted([[5, 62], [4, 35], [3, 3]] as const);
  const nps = () => r.weighted([[10, 35], [9, 30], [8, 20], [7, 10], [6, 5]] as const);

  // Participants ayant formulé une réclamation via le questionnaire à chaud : leur évaluation négative est ajoutée plus bas.
  const negative = new Set(ctx.data.complaints.filter((c) => c.channel === "evaluation").map((c) => `${c.eventId}|${c.contactId}`));
  const swEvents = sortBy(ctx.data.events.filter((e) => e.kind === "startup_week"), (e) => Date.parse(e.startAt));
  for (const ev of swEvents) {
    const S = Date.parse(ev.startAt);
    const E = Date.parse(ev.endAt);
    const past = E < clock.now;
    const participants = sortBy(ctx.data.applications.filter((a) => a.eventId === ev.id && a.status === "inscrite"), (a) => a.number);

    for (const app of participants) {
      // Positionnement d'entrée (dès que le score est renseigné).
      if (app.positioningScore !== undefined) {
        const p = app.positioningScore;
        const ts = Math.min(Date.parse(app.agreementSignedAt ?? app.submittedAt) + r.between(1, 5) * DAY, S - 2 * DAY);
        if (ts < clock.now) {
          push({ eventId: ev.id, contactId: app.contactId, kind: "positionnement", scores: { autonomie_numerique: clamp10(p + r.between(-2, 2)), maturite_projet: clamp10(p + r.between(-2, 1)), outils_nocode: clamp10(p + r.between(-3, 1)), aisance_pitch: clamp10(p + r.between(-2, 2)) }, objectivesReached: undefined, comment: undefined }, ts);
        }
      }
      if (!past) continue;
      const code = ev.code;
      // Évaluation des acquis (grille utilisée depuis SW-0006).
      if (code >= "SW-0006") {
        const scores = { scope: r.between(3, 5), maquette: r.between(3, 5), build: r.between(2, 5), tests: r.between(3, 5), pitch: r.between(3, 5) };
        const avg = Math.round((Object.values(scores).reduce((a, b) => a + b, 0) / 5) * 10) / 10;
        push({ eventId: ev.id, contactId: app.contactId, kind: "acquis", objectivesReached: Math.round(avg), scores }, E - 3 * HOUR);
      }
      // Satisfaction à chaud (J+0), ≈ 95 % de réponses.
      if (!negative.has(`${ev.id}|${app.contactId}`) && r.chance(0.95)) {
        const satisfaction = s15();
        push(
          {
            eventId: ev.id,
            contactId: app.contactId,
            kind: "a_chaud",
            satisfaction,
            nps: satisfaction === 3 ? r.between(5, 7) : nps(),
            objectivesReached: satisfaction >= 4 ? r.between(4, 5) : 3,
            scores: { contenu: s15(), intervenants: s15(), organisation: s15(), lieu: ev.mode === "distanciel" ? 4 : s15(), rythme: r.between(3, 5) },
            comment: r.chance(0.6) ? r.pick(HOT_COMMENTS) : undefined,
          },
          E + r.between(0, 20) * HOUR,
        );
      }
      // Satisfaction à froid (J+60), ≈ 60 % de réponses.
      const cold = E + 60 * DAY + r.between(0, 12) * DAY;
      if (cold < clock.now && r.chance(0.6)) {
        push({ eventId: ev.id, contactId: app.contactId, kind: "a_froid", satisfaction: s15(), nps: nps(), objectivesReached: r.between(3, 5), scores: { mise_en_pratique: r.between(3, 5), avancement_projet: r.between(2, 5), utilite_ressources: r.between(3, 5) }, comment: r.chance(0.5) ? r.pick(COLD_COMMENTS) : undefined }, cold);
      }
    }
    // Appréciation des intervenants (2 par session terminée).
    if (past) {
      for (const spk of r.pickN(ev.speakerIds.filter((s) => s !== SPK.aurelien), 2)) {
        push({ eventId: ev.id, speakerId: spk, kind: "intervenant", satisfaction: r.between(4, 5), scores: { organisation: r.between(3, 5), niveau_groupe: r.between(3, 5), conditions: r.between(3, 5) }, comment: r.pick(SPEAKER_COMMENTS) }, E + r.between(1, 3) * DAY);
      }
    }
  }

  // Évaluations négatives rattachées aux réclamations (Wi-Fi SW-0005, journée acquisition SW-0010).
  for (const c of ctx.data.complaints.filter((x) => x.channel === "evaluation")) {
    push(
      {
        eventId: c.eventId!,
        contactId: c.contactId,
        kind: "a_chaud",
        satisfaction: 3,
        nps: c.type === "qualite" ? 5 : 6,
        objectivesReached: 3,
        scores: { contenu: c.type === "qualite" ? 2 : 4, intervenants: 3, organisation: c.type === "organisation" ? 2 : 4, lieu: 3, rythme: 2 },
        comment: c.description,
      },
      Date.parse(c.receivedAt) - 10 * MIN,
    );
  }

  // Financeurs et clients B2B.
  const funders: [string, string, number, string][] = [
    ["SW-0008", ORG.atlas, 4, "Dossier complet (convention, émargements, certificat) reçu dans les délais. Programme adapté aux salariés en projet intrapreneurial."],
    ["SW-0009", ORG.franceTravail, 5, "Retour très positif de la bénéficiaire, pièces justificatives conformes pour le paiement de l'AIF."],
  ];
  for (const [code, orgId, sat, comment] of funders) {
    const ev = ctx.data.events.find((e) => e.id === evId(code))!;
    push({ eventId: ev.id, contactId: mainContactOf(ctx, orgId), kind: "financeur", satisfaction: sat, scores: { conformite_administrative: sat, adequation_besoin: r.between(4, 5) }, comment }, Date.parse(ev.endAt) + r.between(25, 40) * DAY);
  }
  const clients: [string, string, number, number, string][] = [
    ["SV-0001", ORG.epitech, 5, 9, "Les étudiants ont adoré le format immersif ; 16 prototypes présentés au jury. Nous souhaitons étendre à 3 campus en 2027."],
    ["IS-0001", ORG.verdalys, 4, 8, "Trois prototypes utiles, dont un déjà en test en usine. Prévoir plus de temps de cadrage avec les managers en amont."],
  ];
  for (const [code, orgId, sat, score, comment] of clients) {
    const ev = ctx.data.events.find((e) => e.id === evId(code))!;
    push({ eventId: ev.id, contactId: mainContactOf(ctx, orgId), kind: "entreprise", satisfaction: sat, nps: score, objectivesReached: sat, scores: { organisation: 5, contenu: sat, encadrement: 5 }, comment }, Date.parse(ev.endAt) + r.between(4, 10) * DAY);
  }
  ctx.data.evaluations = rows;
}

function clamp10(n: number): number {
  return Math.max(1, Math.min(10, n));
}
