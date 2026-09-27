/**
 * Formation type livrée avec StartupWeek Academy : la StartupWeek (format semaine)
 * en e-learning — mêmes thèmes que le bootcamp, ~50 h à suivre sur 6 mois.
 */
import type { SeedCourse } from "../authoring";

export const MVP_IA_COURSE_ID = "crs_mvp_ia";

export const MVP_IA_META: SeedCourse = {
  id: MVP_IA_COURSE_ID,
  title: "Construire son MVP avec l'IA",
  slug: "construire-son-mvp-avec-l-ia",
  subtitle: "De l'idée au lancement : la StartupWeek en e-learning, à votre rythme",
  description: `La StartupWeek en ligne : les mêmes thèmes que le bootcamp de 7 jours, dans un parcours de 50 heures à suivre à votre rythme pendant 6 mois.

Vous construisez **votre propre MVP** du premier au dernier module : cadrage, prompts, choix de la stack, architecture, maquettes, construction avec les outils d'IA, tests utilisateurs, lancement et pitch. Un projet fil rouge, Créno, illustre chaque étape.

## Ce que vous allez faire
- Cadrer votre problème, votre cible et le périmètre de votre MVP dans un cahier des charges léger.
- Rédiger des prompts efficaces et piloter les assistants et agents IA (Claude, ChatGPT, Claude Code, Codex, Cursor, Bolt.new).
- Choisir votre stack et concevoir l'architecture de votre application (Supabase, Next.js, Vercel, Airtable, n8n).
- Construire, versionner (Git, GitHub) et mettre en ligne votre MVP.
- Le tester avec de vrais utilisateurs, préparer son lancement et le présenter dans un pitch (Gamma).

## Adaptée à votre profil
Les contenus s'adaptent à votre profil : technique, non technique ou en reconversion. Les exemples, les outils conseillés et les exercices changent ; les objectifs restent les mêmes.`,
  status: "publiee",
  level: "debutant",
  personas: [],
  audience:
    "Porteurs de projet, entrepreneurs, intrapreneurs et personnes en reconversion qui veulent concevoir, construire et lancer un MVP numérique avec les outils d'IA — avec ou sans compétences en code.",
  objectives: [
    "Cadrer un problème, une cible et le périmètre d'un MVP dans un cahier des charges léger (PRD).",
    "Rédiger des prompts efficaces et piloter des assistants et agents IA pour produire du contenu et du code.",
    "Choisir une stack adaptée et concevoir l'architecture d'une application (données, authentification, sécurité, intégrations).",
    "Construire, versionner et déployer en ligne un MVP fonctionnel.",
    "Tester le MVP avec des utilisateurs, préparer son lancement et présenter son projet dans un pitch.",
  ],
  prerequisites:
    "Aucun prérequis technique. Savoir utiliser un ordinateur et un navigateur web, disposer d'une connexion internet stable et d'un projet, même à l'état d'idée. Un questionnaire de positionnement est proposé au démarrage.",
  durationHours: 50,
  priceCents: 0,
  vatRate: 20,
  inCatalog: false,
  accessDays: 183,
  sequential: true,
  eventIds: [],
  tags: ["MVP", "IA", "No-code", "Supabase", "Next.js", "Prompt"],
  authorIds: [],
  speakerIds: [],
  isTraining: true,
  evaluationMethods:
    "Questionnaire de positionnement à l'entrée ; quiz évalués à la fin de chaque module ; livrables corrigés par un formateur (cahier des charges, fiche stack, modèle de données, dossier d'architecture, prototype, MVP en ligne, protocole et grille de tests, landing page, pitch vidéo, roadmap) ; évaluation finale des acquis (quiz transversal et revue des livrables).",
  assistance:
    "Assistance pédagogique : un formateur référent répond aux questions posées depuis Mon espace sous 48 h ouvrées et corrige les livrables. Assistance technique (accès, vidéos, compte) : contact@startupweek.tech, réponse sous 48 h ouvrées. Les connexions et les activités réalisées sont enregistrées pour le suivi de la progression et le certificat de réalisation.",
  accessibility:
    "Accès en ligne 24 h/24 pendant 6 mois, sur ordinateur (recommandé) ou tablette. Vidéos sous-titrées avec transcription. Rythme libre. Adaptations possibles (durée d'accès, format des évaluations, accompagnement renforcé) : contactez la référente handicap avant ou pendant la formation.",
  passingScore: 70,
  certificateMinProgress: 80,
};
