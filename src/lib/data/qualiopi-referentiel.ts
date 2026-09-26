/**
 * Référentiel National Qualité (RNQ — « Qualiopi ») : 7 critères, 32 indicateurs.
 *
 * Source : décret n° 2019-564 du 6 juin 2019 et arrêté du 6 juin 2019 (modifié),
 * intitulés repris du référentiel ; « niveau attendu » résumé d'après le guide de lecture.
 *
 * Périmètre StartupWeek (INTERSTELLABS SASU) :
 * - catégorie d'action : actions de formation (art. L.6313-1 1° du Code du travail) ;
 * - aucune certification RNCP / RS préparée → indicateurs 3, 7 et 16 non applicables ;
 * - pas d'apprentissage ni de CFA → indicateurs 13, 14, 15, 20 et 29 non applicables ;
 * - pas de formation en situation de travail (AFEST) → indicateur 28 non applicable ;
 * - formateurs freelances = sous-traitance → indicateur 27 applicable.
 */
import type { AutoEvidenceSource } from "../domain/types";

export interface ReferentielIndicator {
  code: number; // 1…32
  criterion: number; // 1…7
  title: string; // intitulé de l'indicateur
  expectation: string; // niveau attendu (résumé)
  evidenceHints: string[]; // exemples de preuves typiques
  applicability: string; // à qui s'applique l'indicateur
  applicableToStartupWeek: boolean;
  autoSource?: AutoEvidenceSource; // preuve produite automatiquement par le CRM
}

/**
 * Indicateurs dont la mise en œuvre n'est pas auditée lors de l'audit initial
 * d'un nouvel entrant (preuve de la disposition seulement, mise en œuvre vérifiée à l'audit de surveillance).
 * ⚠️ Liste à confirmer avec l'organisme certificateur retenu (le guide de lecture évolue selon les versions).
 */
export const NEWCOMER_DEFERRED: number[] = [2, 3, 11, 13, 19, 22, 24, 25, 26, 32];

const ALL = "Tous les prestataires";
const CERTIF = "Uniquement les prestations préparant à une certification professionnelle (RNCP / RS)";
const APPRENTISSAGE = "Uniquement les formations par apprentissage (CFA)";

export const QUALIOPI_REFERENTIEL: ReferentielIndicator[] = [
  /* ── Critère 1 — Information du public ── */
  {
    code: 1,
    criterion: 1,
    title:
      "Le prestataire diffuse une information accessible au public, détaillée et vérifiable sur les prestations proposées : prérequis, objectifs, durée, modalités et délais d'accès, tarifs, contacts, méthodes mobilisées et modalités d'évaluation, accessibilité aux personnes handicapées.",
    expectation:
      "Une information exhaustive, à jour et accessible (site, catalogue) couvre chaque prestation : prérequis, objectifs, durée, délais d'accès, tarifs, contacts, méthodes, évaluation et accessibilité.",
    evidenceHints: ["Pages sessions du site", "Programme détaillé téléchargeable", "Catalogue / plaquette", "Mentions accessibilité et contact référent handicap", "CGV publiées"],
    applicability: ALL,
    applicableToStartupWeek: true,
  },
  {
    code: 2,
    criterion: 1,
    title: "Le prestataire diffuse des indicateurs de résultats adaptés à la nature des prestations mises en œuvre et des publics accueillis.",
    expectation:
      "Des indicateurs de résultats chiffrés et datés (satisfaction, taux de réalisation, taux d'abandon, MVP livrés…) sont publiés et mis à jour régulièrement.",
    evidenceHints: ["Page « Nos résultats » du site", "Taux de satisfaction publié", "Nombre de participants et taux d'assiduité", "Historique de mise à jour des indicateurs"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "resultats_publies",
  },
  {
    code: 3,
    criterion: 1,
    title:
      "Lorsque le prestataire met en œuvre des prestations conduisant à une certification professionnelle, il informe sur les taux d'obtention des certifications préparées, les possibilités de valider un/ou des blocs de compétences, ainsi que sur les équivalences, passerelles, suites de parcours et les débouchés.",
    expectation: "Les taux d'obtention, blocs de compétences, équivalences, passerelles et débouchés de la certification sont publiés.",
    evidenceHints: ["Taux d'obtention publiés", "Fiche RNCP / RS référencée", "Informations passerelles et débouchés"],
    applicability: CERTIF,
    applicableToStartupWeek: false,
  },

  /* ── Critère 2 — Objectifs et conception ── */
  {
    code: 4,
    criterion: 2,
    title: "Le prestataire analyse le besoin du bénéficiaire en lien avec l'entreprise et/ou le financeur concerné(s).",
    expectation: "Le besoin de chaque bénéficiaire (et le cas échéant de l'entreprise ou du financeur) est recueilli, analysé et tracé avant l'entrée en formation.",
    evidenceHints: ["Formulaire de candidature détaillé", "Compte rendu d'entretien de qualification", "Questionnaire d'analyse du besoin", "Cahier des charges client B2B"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "analyse_besoin",
  },
  {
    code: 5,
    criterion: 2,
    title: "Le prestataire définit les objectifs opérationnels et évaluables de la prestation.",
    expectation: "Chaque prestation affiche des objectifs opérationnels, formulés en compétences observables et évaluables.",
    evidenceHints: ["Programme avec objectifs opérationnels", "Grille d'évaluation liée aux objectifs", "Fiche pédagogique par session"],
    applicability: ALL,
    applicableToStartupWeek: true,
  },
  {
    code: 6,
    criterion: 2,
    title: "Le prestataire établit les contenus et les modalités de mise en œuvre de la prestation, adaptés aux objectifs définis et aux publics bénéficiaires.",
    expectation: "Les contenus, séquences, méthodes et modalités (présentiel / distanciel) sont formalisés et cohérents avec les objectifs et les publics.",
    evidenceHints: ["Déroulé pédagogique J1 → J7", "Scénarios pédagogiques", "Supports de cours", "Planning des sessions live (distanciel)"],
    applicability: ALL,
    applicableToStartupWeek: true,
  },
  {
    code: 7,
    criterion: 2,
    title:
      "Lorsque le prestataire met en œuvre des prestations conduisant à une certification professionnelle, il s'assure de l'adéquation du ou des contenus de la prestation aux exigences de la certification visée.",
    expectation: "Le contenu de la formation couvre le référentiel de compétences de la certification préparée.",
    evidenceHints: ["Tableau de correspondance programme / référentiel", "Convention avec le certificateur", "Grille d'évaluation alignée sur le référentiel de certification"],
    applicability: CERTIF,
    applicableToStartupWeek: false,
  },
  {
    code: 8,
    criterion: 2,
    title: "Le prestataire détermine les procédures de positionnement et d'évaluation des acquis à l'entrée de la prestation.",
    expectation: "Un positionnement d'entrée (auto-diagnostic, test, entretien) est réalisé pour chaque bénéficiaire et exploité pour adapter le parcours.",
    evidenceHints: ["Questionnaire de positionnement", "Diagnostic MVP individuel pré-event", "Résultats de positionnement archivés", "Vérification des prérequis"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "positionnement",
  },

  /* ── Critère 3 — Accueil, accompagnement, suivi et évaluation ── */
  {
    code: 9,
    criterion: 3,
    title: "Le prestataire informe les publics bénéficiaires des conditions de déroulement de la prestation.",
    expectation: "Chaque bénéficiaire reçoit avant l'entrée les informations pratiques : convocation, horaires, lieu, règlement intérieur, contacts, livret d'accueil.",
    evidenceHints: ["Convocations envoyées", "Livret d'accueil", "Règlement intérieur", "Guide pratique du lieu"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "convocations",
  },
  {
    code: 10,
    criterion: 3,
    title: "Le prestataire met en œuvre et adapte la prestation, l'accompagnement et le suivi aux publics bénéficiaires.",
    expectation: "Le parcours est individualisé (mentorat, points de suivi) et les adaptations sont tracées.",
    evidenceHints: ["Fiches de suivi projet", "Planning mentorat individuel", "Comptes rendus de points d'étape", "Review MVP J+15"],
    applicability: ALL,
    applicableToStartupWeek: true,
  },
  {
    code: 11,
    criterion: 3,
    title: "Le prestataire évalue l'atteinte par les publics bénéficiaires des objectifs de la prestation.",
    expectation: "L'atteinte des objectifs est évaluée (démo, pitch, grille de compétences) en cours et en fin de prestation.",
    evidenceHints: ["Grilles d'évaluation des acquis", "Démo MVP et pitch final", "Auto-évaluation fin de session", "Certificat de réalisation"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "evaluations_acquis",
  },
  {
    code: 12,
    criterion: 3,
    title: "Le prestataire décrit et met en œuvre les mesures pour favoriser l'engagement des bénéficiaires et prévenir les ruptures de parcours.",
    expectation: "L'assiduité est suivie (émargements) et des mesures de prévention des abandons sont décrites et appliquées.",
    evidenceHints: ["Feuilles d'émargement par demi-journée", "Procédure de relance des absents", "Suivi de l'assiduité", "Rituels d'engagement (daily, binômes)"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "emargements",
  },
  {
    code: 13,
    criterion: 3,
    title:
      "Pour les formations en alternance, le prestataire, en lien avec l'entreprise, anticipe avec l'apprenant les missions confiées, à court, moyen et long terme, et assure la coordination et la progressivité des apprentissages réalisés en centre de formation et en entreprise.",
    expectation: "Coordination formalisée entre centre de formation et entreprise pour les parcours en alternance.",
    evidenceHints: ["Livret d'apprentissage", "Comptes rendus tuteur / formateur", "Calendrier d'alternance"],
    applicability: "Uniquement les formations en alternance",
    applicableToStartupWeek: false,
  },
  {
    code: 14,
    criterion: 3,
    title: "Le prestataire met en œuvre un accompagnement socio-professionnel, éducatif et relatif à l'exercice de la citoyenneté.",
    expectation: "Accompagnement socio-professionnel des apprentis formalisé.",
    evidenceHints: ["Actions d'accompagnement socio-professionnel", "Partenariats associatifs", "Suivi individuel des apprentis"],
    applicability: APPRENTISSAGE,
    applicableToStartupWeek: false,
  },
  {
    code: 15,
    criterion: 3,
    title:
      "Le prestataire informe les apprentis de leurs droits et devoirs en tant qu'apprentis et salariés ainsi que des règles applicables en matière de santé et de sécurité en milieu professionnel.",
    expectation: "Information des apprentis sur leurs droits, devoirs et règles de santé-sécurité.",
    evidenceHints: ["Livret d'accueil apprenti", "Émargement séance d'information", "Règlement intérieur remis à l'apprenti"],
    applicability: APPRENTISSAGE,
    applicableToStartupWeek: false,
  },
  {
    code: 16,
    criterion: 3,
    title:
      "Lorsque le prestataire met en œuvre des formations conduisant à une certification professionnelle, il s'assure que les conditions de présentation des bénéficiaires à la certification respectent les exigences formelles de l'autorité de certification.",
    expectation: "Les modalités d'inscription et de passage de la certification respectent les exigences du certificateur.",
    evidenceHints: ["Procédure d'inscription à la certification", "Échanges avec le certificateur", "Dossiers de candidature à la certification"],
    applicability: CERTIF,
    applicableToStartupWeek: false,
  },

  /* ── Critère 4 — Moyens pédagogiques, techniques et d'encadrement ── */
  {
    code: 17,
    criterion: 4,
    title:
      "Le prestataire met à disposition ou s'assure de la mise à disposition des moyens humains et techniques adaptés et d'un environnement approprié (conditions, locaux, équipements, plateaux techniques…).",
    expectation: "Les lieux (villas, plateforme visio), équipements et outils no-code / IA sont adaptés et vérifiés pour chaque session.",
    evidenceHints: ["Check-list logistique par lieu", "Contrats de location des villas", "Licences outils (Bubble, Figma, IA)", "Organigramme de l'équipe pédagogique"],
    applicability: ALL,
    applicableToStartupWeek: true,
  },
  {
    code: 18,
    criterion: 4,
    title: "Le prestataire mobilise et coordonne les différents intervenants internes et/ou externes (pédagogiques, administratifs, logistiques, commerciaux…).",
    expectation: "Les rôles de chaque intervenant sont définis et la coordination est organisée (réunions de préparation, planning partagé).",
    evidenceHints: ["Planning intervenants par session", "Réunion de brief pré-session", "Fiches de rôle", "Outil de coordination (CRM)"],
    applicability: ALL,
    applicableToStartupWeek: true,
  },
  {
    code: 19,
    criterion: 4,
    title: "Le prestataire met à disposition du bénéficiaire des ressources pédagogiques et permet à celui-ci de se les approprier.",
    expectation: "Les ressources (kits, templates, replays) sont accessibles aux bénéficiaires et leur appropriation est accompagnée.",
    evidenceHints: ["Espace ressources participants", "Templates business plan / pitch / Figma", "Statistiques de téléchargement", "Replays des sessions live"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "ressources",
  },
  {
    code: 20,
    criterion: 4,
    title:
      "Le prestataire dispose d'un personnel dédié à l'appui à la mobilité nationale et internationale, d'un référent handicap et d'un conseil de perfectionnement.",
    expectation: "Référent mobilité, référent handicap et conseil de perfectionnement en place (CFA).",
    evidenceHints: ["Nomination du référent mobilité", "Comptes rendus du conseil de perfectionnement", "Lettre de nomination du référent handicap"],
    applicability: APPRENTISSAGE,
    applicableToStartupWeek: false,
  },

  /* ── Critère 5 — Compétences des intervenants ── */
  {
    code: 21,
    criterion: 5,
    title: "Le prestataire détermine, mobilise et évalue les compétences des différents intervenants internes et/ou externes, adaptées aux prestations.",
    expectation: "Les compétences requises sont définies, vérifiées (CV, diplômes, références) et évaluées pour chaque intervenant.",
    evidenceHints: ["CV à jour de chaque intervenant", "Grille de compétences requises", "Évaluations des intervenants par les participants", "Justificatifs de qualification"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "intervenants_cv",
  },
  {
    code: 22,
    criterion: 5,
    title: "Le prestataire entretient et développe les compétences de ses salariés, adaptées aux prestations qu'il délivre.",
    expectation: "Un plan de développement des compétences est formalisé et suivi (formations, veille, conférences) pour l'équipe.",
    evidenceHints: ["Plan de développement des compétences", "Attestations de formation", "Entretiens professionnels", "Participation à des conférences"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "intervenants_formation",
  },

  /* ── Critère 6 — Environnement professionnel ── */
  {
    code: 23,
    criterion: 6,
    title: "Le prestataire réalise une veille légale et réglementaire sur le champ de la formation professionnelle et en exploite les enseignements.",
    expectation: "Une veille légale est organisée (sources identifiées) et ses impacts sont analysés et exploités.",
    evidenceHints: ["Registre de veille légale", "Abonnements (Centre Inffo, Légifrance…)", "Actions issues de la veille"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "veille",
  },
  {
    code: 24,
    criterion: 6,
    title:
      "Le prestataire réalise une veille sur les évolutions des compétences, des métiers et des emplois dans ses secteurs d'intervention et en exploite les enseignements.",
    expectation: "Une veille métiers / compétences (entrepreneuriat, produit, no-code, IA) est tenue et fait évoluer l'offre.",
    evidenceHints: ["Registre de veille métiers", "Études sectorielles", "Évolutions du programme issues de la veille"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "veille",
  },
  {
    code: 25,
    criterion: 6,
    title: "Le prestataire réalise une veille sur les innovations pédagogiques et technologiques permettant une évolution de ses prestations et en exploite les enseignements.",
    expectation: "Une veille pédagogique et technologique (outils no-code, IA, formats) est tenue et exploitée.",
    evidenceHints: ["Registre de veille pédagogique", "Tests de nouveaux outils", "Évolutions des supports et formats"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "veille",
  },
  {
    code: 26,
    criterion: 6,
    title:
      "Le prestataire mobilise l'expertise, les outils et les réseaux nécessaires pour accueillir, accompagner/former ou orienter les publics en situation de handicap.",
    expectation: "Un référent handicap est identifié, un réseau (Agefiph, Cap Emploi, RHF) est mobilisable et les adaptations sont tracées.",
    evidenceHints: ["Nomination du référent handicap", "Procédure d'accueil PSH", "Contacts réseau (Agefiph, Cap Emploi, Ressource Handicap Formation)", "Aménagements réalisés"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "handicap",
  },
  {
    code: 27,
    criterion: 6,
    title: "Lorsque le prestataire fait appel à la sous-traitance ou au portage salarial, il s'assure du respect de la conformité au présent référentiel.",
    expectation: "Les intervenants sous-traitants (formateurs freelances) sont sélectionnés, contractualisés et contrôlés au regard du référentiel.",
    evidenceHints: ["Contrats de sous-traitance", "Charte qualité formateurs signée", "Procédure de sélection et d'évaluation des freelances"],
    applicability: "Prestataires recourant à la sous-traitance ou au portage salarial",
    applicableToStartupWeek: true,
  },
  {
    code: 28,
    criterion: 6,
    title:
      "Lorsque les prestations dispensées au bénéficiaire comprennent des périodes de formation en situation de travail, le prestataire mobilise son réseau de partenaires socio-économiques pour co-construire l'ingénierie de formation et favoriser l'accueil en entreprise.",
    expectation: "Réseau de partenaires socio-économiques mobilisé pour les périodes en situation de travail.",
    evidenceHints: ["Conventions avec entreprises d'accueil", "Ingénierie co-construite", "Planning des périodes en entreprise"],
    applicability: "Uniquement les formations en situation de travail (alternance, AFEST)",
    applicableToStartupWeek: false,
  },
  {
    code: 29,
    criterion: 6,
    title:
      "Le prestataire développe des actions qui concourent à l'insertion professionnelle ou la poursuite d'étude par la voie de l'apprentissage ou par toute autre voie permettant de développer leurs connaissances et leurs compétences.",
    expectation: "Actions favorisant l'insertion professionnelle ou la poursuite d'études des apprentis.",
    evidenceHints: ["Actions d'insertion", "Suivi des sorties", "Partenariats avec entreprises et écoles"],
    applicability: APPRENTISSAGE,
    applicableToStartupWeek: false,
  },

  /* ── Critère 7 — Appréciations et réclamations ── */
  {
    code: 30,
    criterion: 7,
    title: "Le prestataire recueille les appréciations des parties prenantes : bénéficiaires, financeurs, équipes pédagogiques et entreprises concernées.",
    expectation: "Les appréciations de toutes les parties prenantes sont recueillies (à chaud, à froid, intervenants, financeurs, clients) et analysées.",
    evidenceHints: ["Questionnaires à chaud et à froid", "Synthèse des résultats de satisfaction", "Retours financeurs et écoles", "Débriefs intervenants"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "satisfaction",
  },
  {
    code: 31,
    criterion: 7,
    title:
      "Le prestataire met en œuvre des modalités de traitement des difficultés rencontrées par les parties prenantes, des réclamations exprimées par ces dernières, des aléas survenus en cours de prestation.",
    expectation: "Une procédure de traitement des réclamations et aléas existe, est connue des parties prenantes et chaque réclamation est tracée jusqu'à sa clôture.",
    evidenceHints: ["Procédure de traitement des réclamations", "Registre des réclamations", "Accusés de réception et réponses", "Formulaire de réclamation en ligne"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "reclamations",
  },
  {
    code: 32,
    criterion: 7,
    title: "Le prestataire met en œuvre des mesures d'amélioration à partir de l'analyse des appréciations et des réclamations.",
    expectation: "Un plan d'amélioration continue exploite les appréciations et réclamations ; les actions sont suivies et leur efficacité mesurée.",
    evidenceHints: ["Plan d'amélioration continue", "Revue qualité périodique", "Actions correctives tracées", "Communication des améliorations"],
    applicability: ALL,
    applicableToStartupWeek: true,
    autoSource: "amelioration",
  },
];

export function getReferentielIndicator(code: number): ReferentielIndicator | undefined {
  return QUALIOPI_REFERENTIEL.find((i) => i.code === code);
}

export function isNewcomerDeferred(code: number): boolean {
  return NEWCOMER_DEFERRED.includes(code);
}
