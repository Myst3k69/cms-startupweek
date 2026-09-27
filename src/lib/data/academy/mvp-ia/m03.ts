import type { SeedModule } from "../authoring";

export const M03: SeedModule = {
  key: "m03",
  title: "Choisir sa stack",
  summary:
    "Découvrir les familles d'outils pour construire un MVP, les critères de choix, trois stacks de référence et la méthode pour estimer coûts et limites. Vous repartez avec une fiche stack argumentée pour votre projet.",
  objectives: [
    "Être capable de situer un outil dans sa famille (base no-code, automatisation, générateur d'application, code assisté, framework, backend, hébergement, pilotage) et d'expliquer son rôle dans une application.",
    "Être capable de comparer des options techniques à l'aide d'une matrice de décision pondérée adaptée à son projet.",
    "Être capable de choisir une stack de départ parmi trois stacks de référence selon son profil, son délai et l'hypothèse à valider.",
    "Être capable de construire un tableau de coûts prévisionnels à partir des pages tarifs officielles, en identifiant coûts à l'usage et coûts cachés.",
    "Être capable de rédiger et de justifier la fiche stack de son MVP, avec sa trajectoire d'évolution.",
  ],
  lessons: [
    // ------------------------------------------------------------------ L01
    {
      key: "m03-l01",
      title: "Les grandes familles d'outils",
      summary:
        "Les briques d'une application web et les familles d'outils qui les couvrent, d'Airtable à Vercel en passant par Supabase et les agents de code.",
      estimatedMinutes: 40,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez situer chaque outil de la formation dans sa famille, expliquer son rôle dans une application, et repérer les briques dont votre projet a besoin.

## Ce dont une application web a besoin

Quelle que soit la façon de la construire, une application comme Créno repose sur les mêmes briques :

- **l'interface** (le *front-end*) : ce que l'utilisateur voit et manipule dans son navigateur, comme la liste des créneaux ou le bouton « Réserver » ;
- **la logique** (le *back-end*) : les règles exécutées sur un serveur, comme vérifier qu'un créneau est encore libre ou déclencher le paiement ;
- **la base de données** : l'endroit où les informations sont stockées durablement (profils, créneaux, réservations, paiements) ;
- **l'authentification** : la gestion des comptes et des connexions, pour savoir qui est coach et qui est client ;
- **les intégrations** : les services externes branchés à l'application (paiement, envoi d'e-mails, calendrier) ;
- **l'hébergement** : le serveur, toujours allumé, qui rend l'application accessible sur Internet à une adresse web.

Autour de ces briques, il vous faut des outils pour **construire** (écrire ou générer l'application) et pour **piloter** le projet (documenter, planifier, versionner).
`,
        },
        {
          type: "video",
          title: "Anatomie d'une application web",
          durationMinutes: 6,
          script: `
- Accroche : la page de réservation de Créno à l'écran. Que se passe-t-il quand on clique sur « Réserver » ?
- Schéma animé : navigateur (interface) → serveur (logique) → base de données → réponse affichée.
- Où interviennent l'authentification, le paiement et l'e-mail de confirmation.
- Les familles d'outils posées sur le schéma : React et Next.js, Supabase, Vercel, n8n.
- La même application en version « concierge » : formulaire, table Airtable, workflow n8n, et ce qui reste fait à la main.
- La même application générée avec Bolt.new : ce qui est produit automatiquement, ce qu'il faut vérifier.
- Conclusion : raisonner en briques avant de choisir des outils.
`,
        },
        {
          type: "texte",
          markdown: `
## Les familles d'outils

### Bases de données « tableur » et no-code : Airtable
Le **no-code** désigne les outils qui permettent de construire par configuration, sans écrire de code. Airtable ressemble à un tableur, mais chaque tableau est une vraie table de base de données : types de champs, liens entre tables, vues filtrées, formulaires, interfaces simples et automatisations. Idéal pour gérer des données et un processus rapidement. Limite : il n'est pas conçu pour une application grand public sur mesure.

### Automatisation : n8n
Un outil d'automatisation enchaîne des actions entre applications sous forme de **workflows** (scénarios) : « la veille de la séance, envoyer un rappel au client ». n8n se configure visuellement, avec des blocs (appelés nœuds) reliés entre eux, se connecte à de nombreux services, accepte du code quand c'est nécessaire, et peut être utilisé en version hébergée ou installé sur votre propre serveur.

### Générateurs d'applications par IA : Bolt.new
Vous décrivez l'application en langage naturel ; l'outil génère un projet complet, l'exécute dans le navigateur et vous permet de l'améliorer par prompts. C'est la voie la plus rapide vers un prototype cliquable. Le code produit est un vrai code que vous pouvez récupérer : un point essentiel pour ne pas rester bloqué.

### Code assisté par IA : Cursor, Claude Code, Codex
Vous (ou un agent) travaillez directement dans le code du projet. Cursor est un éditeur de code avec une IA intégrée ; Claude Code et Codex sont des agents qui lisent le dépôt, modifient les fichiers et lancent des commandes. Plus de contrôle, plus d'exigence : il faut savoir relire et tester (module 2, leçon 4).

### Bibliothèques et frameworks front : React, Next.js
Une **bibliothèque** fournit des briques de code réutilisables ; un **framework** fournit en plus une structure et des conventions. React sert à construire des interfaces à partir de composants (un bouton, une carte de créneau, un calendrier). Next.js est un framework construit sur React qui ajoute les pages, la navigation et l'exécution de code côté serveur. Ce sont des technologies très répandues, donc bien connues des outils d'IA.

### Backend as a service : Supabase
Un **backend as a service** fournit « clés en main » ce qu'il faudrait sinon développer côté serveur. Supabase propose une base de données **Postgres** (un système de base de données relationnelle open source, très répandu), l'**authentification** des utilisateurs, le **stockage** de fichiers et la **sécurité par lignes** (*Row Level Security*, ou RLS) : des règles écrites dans la base qui déterminent quelles lignes chaque utilisateur peut lire ou modifier (« un client ne voit que ses propres réservations »).

### Hébergement : Vercel
Vercel héberge des applications web, en particulier celles construites avec Next.js, dont il est l'éditeur. Il se connecte à votre dépôt GitHub : à chaque modification envoyée, il construit et publie une nouvelle version, avec des adresses de prévisualisation pour tester avant la mise en production.

### Outils de pilotage : Notion, GitHub
Notion sert à documenter et à organiser : PRD, backlog, comptes rendus, bibliothèque de prompts. GitHub héberge le code et son historique (géré avec Git), et offre des outils de collaboration : tickets, revues de code, automatisations.
`,
        },
        {
          type: "texte",
          markdown: `
## Tableau récapitulatif

| Famille | Outil de la formation | Briques couvertes | Niveau technique | Rôle dans Créno |
| --- | --- | --- | --- | --- |
| Base no-code | Airtable | Données, formulaires | Faible | MVP concierge : créneaux et réservations gérés à la main |
| Automatisation | n8n | Intégrations, tâches planifiées | Faible à moyen | Rappel automatique la veille de la séance |
| Générateur d'application | Bolt.new | Interface, logique, prototype | Faible au départ | Prototype rapide pour un profil non technique |
| Code assisté | Cursor, Claude Code, Codex | Tout le code | Moyen à élevé | Construction de la version robuste |
| Front | React, Next.js | Interface, logique serveur | Moyen à élevé | Pages coach et client |
| Backend as a service | Supabase | Base, authentification, stockage, sécurité | Moyen | Profils, créneaux, réservations, paiements |
| Hébergement | Vercel | Mise en ligne | Faible à moyen | Publication de l'application |
| Pilotage | Notion, GitHub | Documentation, code, suivi | Faible | PRD, backlog, dépôt de code |

Le paiement (Stripe pour Créno) et l'envoi d'e-mails relèvent de services spécialisés que l'on branche en intégration : vous les verrez aux modules 4 et 6.

> [!info] Un même outil peut couvrir plusieurs familles, et les frontières bougent vite : les générateurs ajoutent des bases de données, les éditeurs ajoutent des agents, les outils no-code ajoutent de l'IA. Raisonnez d'abord en briques (de quoi ai-je besoin ?), ensuite en outils.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Une image pour tout retenir : le restaurant

- La **salle**, où les clients s'installent et commandent, c'est l'interface.
- La **cuisine**, où les commandes sont préparées selon des règles, c'est la logique.
- La **réserve**, où sont rangés les ingrédients, c'est la base de données.
- L'**accueil**, qui vérifie la réservation au nom du client, c'est l'authentification.
- Les **fournisseurs** livrés automatiquement, ce sont les intégrations et les automatisations.
- Le **local** loué dans une rue passante, c'est l'hébergement.
- Le **cahier de l'équipe** et le planning, ce sont les outils de pilotage.

Quand un terme technique vous échappe, demandez-vous à quelle pièce du restaurant il correspond.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Profil non technique : vos familles prioritaires

Quatre familles vous permettent d'aller loin sans coder : la base no-code (Airtable), l'automatisation (n8n), le générateur d'application (Bolt.new) et le backend as a service (Supabase), que Bolt.new peut utiliser pour vous. Vous n'avez pas besoin de maîtriser React ou Next.js, mais savoir ce qu'ils sont vous permettra de dialoguer avec un développeur ou un prestataire, et de comprendre ce que génèrent vos outils.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : les vraies questions

Vous connaissez probablement ces briques. Les questions utiles pour un MVP sont ailleurs : quelle part de la logique métier vit dans la base (contraintes, fonctions, RLS) plutôt que dans le code applicatif ; comment les générateurs structurent le code (à relire avant de le reprendre) ; quels services vous enferment. Supabase repose sur un Postgres standard, ce qui facilite une migration éventuelle ; les fonctions propres à une plateforme se remplacent moins facilement. Gardez ce critère de portabilité en tête pour la leçon suivante.
`,
        },
        {
          type: "quiz",
          title: "Auto-évaluation : à chaque outil sa famille",
          questions: [
            {
              prompt: "Quel outil fournit une base Postgres, l'authentification, le stockage de fichiers et la sécurité par lignes ?",
              options: [
                { label: "Vercel" },
                { label: "Supabase", correct: true },
                { label: "n8n" },
                { label: "Notion" },
              ],
              explanation: "Supabase est un backend as a service : base Postgres, authentification, stockage et règles RLS.",
            },
            {
              prompt: "Vous voulez envoyer automatiquement un rappel la veille de chaque séance, sans coder. Quelle famille d'outils ?",
              options: [
                { label: "Un framework front comme React" },
                { label: "Un hébergeur comme Vercel" },
                { label: "Un outil d'automatisation comme n8n", correct: true },
                { label: "Un outil de pilotage comme GitHub" },
              ],
              explanation: "Un workflow d'automatisation (déclencheur planifié, puis envoi d'un message) est exactement le rôle de n8n.",
            },
            {
              prompt: "Qu'est-ce que Next.js ?",
              options: [
                { label: "Une base de données relationnelle" },
                { label: "Un générateur d'applications par IA" },
                { label: "Un service d'envoi d'e-mails" },
                { label: "Un framework construit sur React qui ajoute pages, navigation et code côté serveur", correct: true },
              ],
              explanation: "React construit les interfaces à partir de composants ; Next.js ajoute une structure de projet, les pages et l'exécution côté serveur.",
            },
            {
              prompt: "Quel est le rôle principal de Vercel dans une stack ?",
              options: [
                { label: "Héberger et publier l'application à partir du dépôt de code", correct: true },
                { label: "Stocker les réservations" },
                { label: "Rédiger le code à votre place" },
                { label: "Gérer le backlog du projet" },
              ],
              explanation: "Vercel construit et publie l'application à chaque modification du dépôt, avec des adresses de prévisualisation.",
            },
            {
              prompt: "Quelle affirmation sur Bolt.new est juste ?",
              options: [
                { label: "Il ne produit que des maquettes non fonctionnelles" },
                { label: "Il génère un projet de code à partir d'une description, que l'on peut récupérer", correct: true },
                { label: "Il remplace la nécessité de vérifier la sécurité" },
                { label: "Il sert uniquement à héberger des sites" },
              ],
              explanation: "Bolt.new génère un vrai projet de code, exécuté dans le navigateur et récupérable. La sécurité reste à vérifier.",
            },
          ],
        },
        {
          type: "exercice",
          title: "Cartographier les briques de votre projet",
          instructions: `
1. Listez les briques nécessaires à votre MVP : interface, logique, données, authentification, intégrations (paiement, e-mail, calendrier…), hébergement.
2. Pour chaque brique, écrivez en une phrase ce qu'elle doit faire dans votre projet. Exemple Créno : « intégration paiement : encaisser la séance au moment de la réservation ».
3. Indiquez pour chacune les familles d'outils possibles (pas encore le choix final).
4. Repérez les briques dont vous pourriez vous passer au départ, en les remplaçant par une action manuelle (exemple : confirmer les réservations à la main pendant les premières semaines).

Livrable (texte) : un tableau brique / besoin / familles possibles / faisable à la main au début ?
`,
          deliverable: "texte",
          estimatedMinutes: 20,
          review: "auto",
          rubric: [
            "Toutes les briques nécessaires au MVP sont identifiées",
            "Chaque besoin est formulé concrètement pour le projet",
            "Les familles d'outils proposées correspondent aux briques",
            "Au moins une brique « faisable à la main » est identifiée ou explicitement écartée",
          ],
        },
      ],
    },

    // ------------------------------------------------------------------ L02
    {
      key: "m03-l02",
      title: "Les critères de choix",
      summary:
        "Huit critères pour évaluer une stack et une matrice de décision pondérée pour choisir en connaissance de cause.",
      estimatedMinutes: 45,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez évaluer des options techniques selon huit critères et les comparer avec une matrice de décision pondérée, pour choisir en connaissance de cause plutôt que par effet de mode.

## Il n'y a pas de meilleure stack, seulement une stack adaptée

Une **stack** est l'ensemble des outils et technologies utilisés pour construire et faire fonctionner votre produit. La bonne stack de MVP est celle qui vous permet de **tester votre hypothèse principale le plus vite possible, avec une qualité suffisante, sans vous enfermer**. Elle dépend de vous, de votre projet et de votre contexte.

## Les huit critères

### 1. Compétences disponibles
Qui va construire ? Vous seul, un associé technique, un prestataire ? Un outil que personne ne maîtrise coûte des semaines d'apprentissage. L'IA abaisse la barrière sans la supprimer : il faut toujours savoir relire, tester et corriger ce qui est produit.

### 2. Délai
Combien de temps avant de mettre le produit entre les mains d'utilisateurs ? Un délai court favorise le no-code et les générateurs ; un délai plus long permet d'investir dans une base plus solide.

### 3. Budget
Ce que vous pouvez dépenser chaque mois en abonnements et services, et en prestations éventuelles. Beaucoup d'outils de cette formation proposent une offre gratuite ou d'essai pour démarrer : vérifiez ce qu'elle inclut (leçon 4).

### 4. Données et conformité
Quelles données allez-vous traiter ? Des données personnelles (noms, e-mails, téléphones) impliquent le respect du RGPD : minimisation, sécurité, information des personnes, encadrement contractuel des prestataires qui les hébergent. Vérifiez où les données sont hébergées (certains services permettent de choisir la région), quelles garanties sont proposées, et si des données sensibles (de santé, par exemple) sont en jeu. Ce sont des informations générales, pas un conseil juridique : consultez [cnil.fr](https://www.cnil.fr).

### 5. Montée en charge
La capacité à supporter davantage d'utilisateurs, de données et de trafic sans tout refaire. Pour un MVP, c'est rarement le critère principal : mieux vaut valider la demande avec dix utilisateurs que préparer une architecture pour cent mille. Évitez seulement les impasses connues, comme un outil dont les limites seraient atteintes dès les premiers mois de succès.

### 6. Dépendance et portabilité
Pouvez-vous **récupérer votre code et vos données** si vous changez d'outil ? Un outil qui permet d'exporter le code (vers un dépôt GitHub, par exemple) et les données dans des formats standards vous laisse libre. Un outil fermé peut vous obliger à tout reconstruire le jour où il ne suffit plus, change ses conditions ou disparaît.

### 7. Coût à l'usage
Au-delà de l'abonnement, certains coûts augmentent avec l'activité : appels à un modèle d'IA, stockage, e-mails envoyés, exécutions d'automatisations, commissions de paiement. Un outil bon marché au départ peut devenir coûteux avec le succès, et inversement.

### 8. Écosystème et communauté
Documentation, tutoriels, forums, intégrations disponibles, développeurs qui connaissent l'outil. Un outil très répandu a aussi l'avantage d'être bien connu des assistants IA, ce qui tend à améliorer la qualité de leur aide.
`,
        },
        {
          type: "texte",
          markdown: `
## La matrice de décision pondérée

Une **matrice de décision pondérée** compare plusieurs options sur plusieurs critères, en tenant compte de leur importance relative :

1. Listez deux à quatre options.
2. Donnez à chaque critère un **poids** de 1 (secondaire) à 5 (décisif), selon *votre* situation.
3. Notez chaque option sur chaque critère, de 1 (mauvais) à 5 (excellent).
4. Multipliez chaque note par le poids du critère et additionnez : c'est le score de l'option.
5. Relisez le résultat d'un œil critique : la matrice éclaire la décision, elle ne la prend pas.

Exemple : la fondatrice de Créno ne code pas, dispose de six semaines et veut vérifier que dix coachs sont prêts à utiliser le service. Elle compare trois options, détaillées à la leçon suivante. Les notes sont ses appréciations pour ce cas précis, pas une évaluation générale des outils. Entre parenthèses : note × poids.

| Critère | Poids | A. Bolt.new + Supabase | B. Next.js + Supabase + Vercel | C. Concierge Airtable + n8n |
| --- | --- | --- | --- | --- |
| Compétences disponibles | 5 | 4 (20) | 1 (5) | 5 (25) |
| Délai | 4 | 4 (16) | 2 (8) | 5 (20) |
| Budget | 3 | 4 (12) | 4 (12) | 4 (12) |
| Données et conformité | 3 | 4 (12) | 4 (12) | 3 (9) |
| Montée en charge | 1 | 3 (3) | 5 (5) | 1 (1) |
| Portabilité | 2 | 4 (8) | 5 (10) | 2 (4) |
| Coût à l'usage | 2 | 3 (6) | 3 (6) | 3 (6) |
| Écosystème | 2 | 4 (8) | 5 (10) | 4 (8) |
| **Score** | | **85** | **68** | **85** |

Égalité entre A et C : c'est fréquent, et instructif. Ce qui départage, c'est l'**hypothèse à valider en premier**. Ici, la question est « les coachs veulent-ils ce service ? », pas « sait-on construire l'application ? ». La fondatrice choisit C pour les premières semaines, puis A dès que la demande est confirmée. L'option B reste la cible si Créno grandit ou accueille un profil technique.

> [!warning] Pièges classiques : ajuster les poids après coup pour retrouver l'option que l'on préférait déjà, choisir un outil parce qu'il est à la mode, sous-estimer le critère « compétences disponibles ».
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Votre critère décisif : l'autonomie

Pour un profil non technique, la question clé est souvent : **puis-je faire évoluer le produit seul, sans attendre quelqu'un ?** Une stack que vous comprenez vous permet d'avancer au rythme des retours utilisateurs. Donnez un poids fort aux compétences et au délai, et un poids réel à la portabilité : si un développeur vous rejoint plus tard, il devra pouvoir reprendre le code et les données. Méfiez-vous des outils qui ne permettent aucun export.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : résister à la sur-ingénierie

Votre risque n'est pas de ne pas savoir construire, mais de trop construire : architecture en microservices, files de messages, infrastructure sur mesure pour dix utilisateurs. Au stade du MVP, donnez un poids faible à la montée en charge et un poids fort au délai. Préférez les services gérés (base, authentification, hébergement) à l'auto-hébergement, sauf contrainte forte sur les données. Votre avantage technique doit vous servir à apprendre plus vite du marché, pas à peaufiner une stack.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Si vous hésitez sur une note

Il est normal de ne pas savoir noter certains critères au départ. Mettez 3 (neutre) et posez la question à votre formateur. Un bon réflexe : pour chaque option, suivez pendant trente minutes le tutoriel officiel de démarrage. Votre ressenti (clair, confus, bloquant) est une information précieuse pour le critère « compétences disponibles ».
`,
        },
        {
          type: "prompt",
          title: "Faire challenger sa matrice de décision",
          tool: "Tout assistant IA",
          prompt: `
Je dois choisir la stack technique du MVP de mon projet.
Projet : [DESCRIPTION EN 3 PHRASES]
Mon profil et mon équipe : [COMPÉTENCES]
Délai avant les premiers utilisateurs : [DÉLAI]
Hypothèse principale à valider : [HYPOTHÈSE]
Données traitées : [TYPES DE DONNÉES, SANS AUCUNE DONNÉE RÉELLE]

Voici ma matrice de décision pondérée :
[COLLEZ LE TABLEAU]

1. Signale les poids qui te semblent incohérents avec ma situation, et explique pourquoi.
2. Signale les notes qui mériteraient d'être vérifiées, et comment les vérifier (documentation officielle, test rapide).
3. Indique les critères importants que j'aurais oubliés.

Ne choisis pas à ma place et ne cite aucun prix : je vérifierai les tarifs sur les sites officiels.
`,
          tips: "L'IA peut avoir des informations dépassées sur les outils : utilisez ses remarques comme des questions à vérifier, pas comme des faits.",
        },
        {
          type: "exercice",
          title: "Votre matrice de décision pondérée",
          instructions: `
1. Décrivez votre situation en quelques lignes : profil et compétences de l'équipe, délai, hypothèse principale à valider, types de données traitées.
2. Retenez deux ou trois options de stack. Les trois stacks de la leçon suivante sont un bon point de départ ; vous pourrez ajuster votre choix pendant l'atelier de la leçon 5.
3. Pondérez les huit critères de 1 à 5, en justifiant d'une phrase chaque poids de 4 ou 5.
4. Notez chaque option, puis calculez les scores.
5. Soumettez votre matrice au prompt « Faire challenger sa matrice de décision » et corrigez ce qui doit l'être.
6. Concluez en trois lignes : quelle option, pour quelle étape du projet, et ce qui vous ferait changer d'avis.

Livrable (texte) : la matrice, les justifications et la conclusion.
`,
          deliverable: "texte",
          estimatedMinutes: 30,
          review: "auto",
          rubric: [
            "La situation du projet est décrite (profil, délai, hypothèse, données)",
            "Les huit critères sont pondérés et les poids forts justifiés",
            "Les scores sont correctement calculés",
            "La conclusion relie le choix à l'hypothèse à valider",
          ],
        },
      ],
    },

    // ------------------------------------------------------------------ L03
    {
      key: "m03-l03",
      title: "Trois stacks de référence",
      summary:
        "Bolt.new + Supabase, Next.js + Supabase + Vercel, et le MVP concierge Airtable + n8n : cas d'usage, forces, limites et trajectoires.",
      estimatedMinutes: 60,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous connaîtrez trois stacks de référence pour un MVP, leurs forces et leurs limites, et vous saurez laquelle choisir pour démarrer selon votre profil et votre hypothèse.

## Trois stacks, trois intentions

- **Stack A — Bolt.new + Supabase** : obtenir vite un prototype fonctionnel sans coder, avec un code que l'on peut récupérer.
- **Stack B — Next.js + React + Supabase + Vercel, avec Cursor, Claude Code ou Codex** : garder le contrôle total sur un produit destiné à durer.
- **Stack C — Airtable + n8n + une page simple** : valider la demande avec un MVP « concierge » avant de construire.

Ces stacks ne s'opposent pas : ce sont souvent les étapes successives d'un même projet.
`,
        },
        {
          type: "video",
          title: "Trois stacks, un même projet : Créno",
          durationMinutes: 8,
          script: `
- Accroche : le même besoin (« un client réserve un créneau et paie ») construit trois fois.
- Stack C : page de présentation et formulaire, table Airtable des réservations, workflow n8n de rappel ; ce qui reste manuel.
- Stack A : prompt dans Bolt.new, génération de l'application, tables créées dans Supabase ; vérification rapide des règles d'accès ; récupération du code.
- Stack B : dépôt GitHub, fichier de contexte, agent de code, migration Supabase avec règles RLS, déploiement sur Vercel avec prévisualisation.
- Tableau comparatif à l'écran : délai, contrôle, portabilité, risques.
- Trajectoires : de C vers A puis B, et les signaux qui déclenchent le passage à l'étape suivante.
- Conclusion : choisir sa stack de départ selon son profil et l'hypothèse à valider.
`,
        },
        {
          type: "texte",
          markdown: `
## Stack A — Bolt.new + Supabase

**Principe.** Vous décrivez votre application dans Bolt.new ; il génère l'interface et la logique, et s'appuie sur Supabase pour la base de données et l'authentification. Vous l'améliorez par prompts, en voyant le résultat en direct dans le navigateur.

**Cas d'usage.** Prototype fonctionnel pour des tests utilisateurs, démonstration à des partenaires, premier MVP d'un profil non technique.

**Forces.**
- Délai très court entre l'idée et une application cliquable.
- Une vraie base de données relationnelle dès le départ.
- Du code standard, que vous pouvez récupérer et confier plus tard à un développeur ou à un agent de code.

**Limites.**
- Le code généré n'est pas toujours bien structuré : quand l'application grossit, les modifications par prompts deviennent moins fiables.
- La sécurité (règles RLS, clés, validation des données) doit être vérifiée : elle n'est pas garantie par la génération.
- L'usage de la génération par IA est limité selon l'offre choisie : vérifiez les conditions sur la page tarifs.

**Parcours de Créno.** Un prompt décrit les rôles, les écrans et les données ; Bolt.new génère l'application et les tables dans Supabase (profils, créneaux, réservations). La fondatrice teste chaque écran, corrige par petits prompts, vérifie les règles d'accès avec la checklist du module 4, puis récupère le code (export ou synchronisation avec GitHub, selon les options disponibles). Le paiement vient dans un second temps.

## Stack B — Next.js + React + Supabase + Vercel, avec un outil de code assisté

**Principe.** Le code vit dans un dépôt GitHub : Next.js et React pour l'interface et la logique serveur, Supabase pour la base, l'authentification et la sécurité, Vercel pour l'hébergement. Cursor, Claude Code ou Codex accélèrent l'écriture, sous votre contrôle : plan, petites étapes, tests, relecture des diffs.

**Cas d'usage.** Produit appelé à durer, logique métier spécifique (règles d'annulation, paiements, rôles), profil technique ou très motivé pour apprendre, équipe avec un développeur.

**Forces.**
- Contrôle total sur le code, l'architecture et la sécurité.
- Technologies très répandues : documentation abondante, recrutement facilité, assistants IA à l'aise.
- Portabilité : le code vous appartient, la base est un Postgres standard, l'hébergeur peut être changé.
- Déploiement continu : chaque modification envoyée sur GitHub peut être publiée automatiquement par Vercel, avec une version de prévisualisation.

**Limites.**
- Courbe d'apprentissage réelle : Git, terminal, structure d'un projet, variables d'environnement.
- Plus de décisions à prendre, donc plus de risques de s'éparpiller.
- Vous êtes responsable de la qualité : tests, sécurité, mises à jour des dépendances.

**Parcours de Créno.** C'est la stack de démonstration de la formation. Le dépôt contient un fichier de contexte ; les tables sont créées par des migrations Supabase avec leurs règles RLS ; les écrans coach et client sont développés un par un avec un agent de code ; Stripe gère les paiements et n8n les rappels ; Vercel publie chaque version. Vous suivrez ce parcours au module 6.

## Stack C — Airtable + n8n + page simple (MVP concierge)

**Principe.** Un **MVP concierge** rend le service en grande partie à la main, en coulisses, pour vérifier que des clients en veulent avant d'automatiser. L'utilisateur voit une page simple et un formulaire ; vous gérez le reste avec une base Airtable et quelques automatisations n8n.

**Cas d'usage.** Demande non encore validée, délai très court, service que l'on peut rendre manuellement pour quelques dizaines d'utilisateurs.

**Forces.**
- Mise en place en quelques jours, sans code.
- Contact direct avec les premiers utilisateurs : chaque demande traitée vous apprend quelque chose.
- Investissement minimal : si l'hypothèse est invalidée, presque rien n'est à jeter.

**Limites.**
- Ne passe pas à l'échelle : le travail manuel augmente avec chaque utilisateur.
- Expérience utilisateur limitée (pas d'espace personnel, peu d'interactivité).
- Données réparties entre plusieurs outils : soignez la conformité (qui a accès, où sont les données) et prévoyez l'export.

**Parcours de Créno.** Une page par coach avec un formulaire de réservation. Chaque demande arrive dans une table Airtable « Réservations ». La fondatrice confirme à la main et envoie un lien de paiement ; un workflow n8n envoie le rappel la veille. Après quelques semaines, elle sait si coachs et clients utilisent vraiment le service, quelles règles d'annulation sont nécessaires, et quoi automatiser en priorité.

## En résumé

| | A. Bolt.new + Supabase | B. Next.js + Supabase + Vercel | C. Concierge Airtable + n8n |
| --- | --- | --- | --- |
| Objectif | Prototype fonctionnel rapide | Produit robuste et durable | Valider la demande |
| Profil | Non technique à intermédiaire | Technique ou très motivé | Tous profils |
| Mise en place | Courte | Plus longue | Très courte |
| Contrôle et portabilité | Moyens à bons (code récupérable) | Maximaux | Faibles |
| Principal risque | Code difficile à maintenir, sécurité non vérifiée | S'éparpiller, construire trop tôt | Travail manuel, expérience limitée |

La **trajectoire** typique va de C vers A ou B : valider la demande, puis construire. Passer de A à B est aussi naturel : le code récupéré depuis Bolt.new est repris dans un éditeur et restructuré avec un agent de code. Si les deux étapes utilisent le même projet Supabase, les données restent en place pendant la transition.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Votre point de départ recommandé : C, puis A

Commencez par la stack C si la demande n'est pas encore validée : vous la mettez en place seul, en quelques jours. Dès que la demande est confirmée, passez à la stack A pour offrir une vraie expérience applicative. Deux précautions : récupérez le code sur GitHub dès les premières versions, et faites relire la sécurité (règles RLS, clés) par une personne technique avant d'ouvrir l'application à de vrais clients. Trajectoire à moyen terme : la stack B, avec un associé technique ou un prestataire qui reprend le code existant.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Votre point de départ recommandé : B, précédée de C si la demande est incertaine

Vous pouvez aller directement vers la stack B : c'est elle qui vous donnera le plus de levier à moyen terme. Mais si la demande n'est pas validée, la meilleure décision technique est parfois de ne pas coder : une ou deux semaines de MVP concierge peuvent vous éviter des semaines de développement inutile. Utilisez Bolt.new comme outil d'esquisse pour tester des parcours, sans vous sentir obligé d'en garder le code. Trajectoire : B dès que la demande est confirmée, en gardant n8n pour les automatisations périphériques.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Votre point de départ recommandé : C, puis A, en apprenant au passage

La stack C vous permet de démarrer sans bloquer sur la technique, tout en rencontrant vos premiers utilisateurs. Profitez-en pour vous familiariser avec les notions de tables, de champs et d'automatisations : ce sont exactement celles que vous retrouverez dans Supabase. Passez ensuite à la stack A. Si vous visez un métier du numérique, la stack B est une excellente trajectoire d'apprentissage : vous la découvrirez progressivement au module 6, avec l'aide des agents de code.
`,
        },
        {
          type: "checklist",
          title: "Ma stack de départ est adaptée si…",
          items: [
            "Je peux la mettre en place avant la date prévue de mes premiers tests utilisateurs.",
            "Au moins une personne de l'équipe sait la faire évoluer.",
            "Elle me permet de tester mon hypothèse principale.",
            "Je peux récupérer mon code et mes données.",
            "Je sais où sont hébergées les données personnelles de mes utilisateurs.",
            "Je connais l'étape suivante de ma trajectoire, et le signal qui la déclenchera.",
          ],
        },
        {
          type: "exercice",
          title: "Votre projet dans chacune des trois stacks",
          instructions: `
1. Pour chacune des trois stacks, décrivez en 5 à 8 lignes le parcours de votre projet, sur le modèle de Créno : pages ou écrans, emplacement des données, ce qui est automatisé, ce qui reste manuel.
2. Pour chaque stack, identifiez la limite qui vous gênerait le plus, et à quel moment elle apparaîtrait.
3. Indiquez la stack de départ qui vous semble la plus adaptée et la trajectoire envisagée : étape suivante et signal mesurable qui la déclenche (par exemple, pour Créno : « vingt réservations payées en un mois »).

Livrable (texte) : les trois parcours, les limites et votre recommandation. Vous la consoliderez dans la fiche stack de la leçon 5.
`,
          deliverable: "texte",
          estimatedMinutes: 35,
          review: "auto",
          rubric: [
            "Les trois parcours sont décrits concrètement pour le projet",
            "Les limites identifiées sont spécifiques au projet, pas génériques",
            "La stack de départ est cohérente avec le profil et l'hypothèse à valider",
            "La trajectoire comporte un signal de passage mesurable",
          ],
        },
      ],
    },

    // ------------------------------------------------------------------ L04
    {
      key: "m03-l04",
      title: "Estimer les coûts et les limites",
      summary:
        "Coûts fixes, coûts à l'usage et coûts cachés : une méthode pour construire votre tableau de coûts à partir des pages tarifs officielles.",
      estimatedMinutes: 35,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez construire le tableau de coûts de votre stack à partir des pages tarifs officielles, en anticipant les coûts qui augmentent avec l'usage et ceux que l'on oublie.

> [!info] Cette leçon ne donne volontairement aucun prix : tarifs et offres changent souvent. Vous apprenez une méthode, et vous relevez les chiffres vous-même, à la date de votre décision.

## Trois natures de coûts

### Les coûts fixes : offres et paliers
La plupart des outils fonctionnent par **paliers** : une offre gratuite limitée, puis des offres payantes, souvent mensuelles, avec des limites plus élevées et des fonctions supplémentaires (collaboration, sauvegardes, assistance). Le passage au palier supérieur est généralement déclenché par une limite : nombre d'utilisateurs, de projets, de lignes de données, d'exécutions.

### Les coûts à l'usage
Ils varient avec l'activité de votre produit :

- **Appels à un modèle d'IA** : si votre produit utilise un modèle (Claude, ou les modèles d'OpenAI, par exemple) via une **API** (une interface qui permet à un programme d'utiliser un service), la facturation dépend du volume de texte traité, mesuré en tokens : en entrée (ce que vous envoyez) et en sortie (ce que le modèle génère). Le tarif varie selon le modèle choisi.
- **Stockage et transfert** : volume de la base de données, fichiers stockés (photos de profil, documents), données transférées.
- **E-mails et SMS** : les services d'envoi facturent généralement au-delà d'un volume inclus.
- **Paiements** : les prestataires de paiement prélèvent généralement une commission sur chaque transaction.
- **Automatisations et fonctions serveur** : nombre d'exécutions, temps de calcul.
- **Outils de construction assistée par IA** : l'usage des générateurs et des agents de code est souvent encadré par des quotas ou des crédits, selon l'offre.

Pour Créno, chaque réservation peut déclencher : une écriture en base, un paiement (et sa commission), un e-mail de confirmation, une exécution n8n et un e-mail de rappel. Multiplié par le nombre de réservations attendues, cela donne une première idée du coût à l'usage.

### Les coûts cachés
- **Votre temps** : apprentissage, construction, support aux utilisateurs, tâches manuelles (surtout dans un MVP concierge).
- **La maintenance** : mises à jour, corrections, surveillance, sauvegardes.
- **Les coûts de sortie** : migrer vers un autre outil quand le premier ne suffit plus.
- **Les à-côtés** : nom de domaine, adresse e-mail professionnelle, outils de conception, conseil juridique ou comptable.
`,
        },
        {
          type: "texte",
          markdown: `
## Lire une page tarifs avec méthode

Les pages tarifs sont conçues pour vendre : lisez-les avec une grille. Pour chaque outil, cherchez :

1. **ce qu'inclut l'offre gratuite**, et ses limites exactes (volumes, nombre de projets, fonctions exclues) ;
2. **ce qui se passe quand une limite est atteinte** : blocage, mise en pause, facturation du dépassement ;
3. **les conditions d'usage** : l'offre autorise-t-elle un usage commercial ? Les projets inactifs peuvent-ils être suspendus ?
4. **le mode de facturation** : par utilisateur, par projet, à l'usage, mensuel ou annuel, avec ou sans engagement ;
5. **les garde-fous** : peut-on fixer un plafond de dépenses ou recevoir des alertes ?
6. **la conformité** : région d'hébergement, et existence d'un accord de traitement des données (le contrat qui encadre, au sens du RGPD, ce que le prestataire fait de vos données).

Notez la **date de consultation** à côté de chaque information : dans quelques mois, elle aura peut-être changé.

## Construire son tableau de coûts

1. Listez tous les outils et services de votre stack, y compris ceux de pilotage (Notion, GitHub) et de construction (Bolt.new, Cursor, Claude Code, Codex…).
2. Définissez **trois scénarios d'usage** : test (vos premiers utilisateurs), lancement, succès. Exprimez-les en unités concrètes : utilisateurs, réservations par mois, e-mails, appels à l'IA.
3. Pour chaque outil, relevez sur la page tarifs l'offre nécessaire dans chaque scénario.
4. Ajoutez les coûts à l'usage, calculés à partir de vos unités.
5. Ajoutez une ligne « temps » (heures par mois) et une ligne « imprévus ».
6. Repérez les **seuils** : à partir de quel volume passez-vous au palier supérieur ?

| Outil ou service | Rôle | Offre (test) | Offre (lancement) | Offre (succès) | Coûts à l'usage | Seuil de changement de palier | Source et date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Supabase | Base, authentification | À relever | À relever | À relever | Stockage, transfert | À relever | Page tarifs, date |
| n8n | Rappels | À relever | À relever | À relever | Exécutions | À relever | Page tarifs, date |
| … | … | … | … | … | … | … | … |

Ce tableau alimente votre modèle financier et vos décisions de stack : un seuil proche de votre scénario de lancement est un risque à anticiper.
`,
        },
        {
          type: "ressource",
          resourceId: "res_modele_financier",
          note: "Reportez les coûts de votre scénario « lancement » dans les charges du modèle financier : vous y reviendrez lors de la préparation de votre lancement et de votre pitch.",
        },
        {
          type: "prompt",
          title: "Préparer la lecture des pages tarifs",
          tool: "Tout assistant IA",
          prompt: `
Voici la stack envisagée pour mon MVP : [LISTE DES OUTILS ET DE LEUR RÔLE].
Mes scénarios d'usage : [TEST], [LANCEMENT], [SUCCÈS] (utilisateurs, actions par mois, e-mails, appels à l'IA…).

Pour chaque outil :
1. Liste les unités de facturation probables à vérifier (par utilisateur, par projet, à l'usage…).
2. Liste les questions précises à me poser en lisant sa page tarifs officielle : limites de l'offre gratuite, dépassements, usage commercial, plafond de dépenses, région d'hébergement.
3. Indique les coûts à l'usage que mes scénarios risquent de déclencher.

N'indique aucun prix ni aucun nom d'offre : tes informations peuvent être dépassées. Je relèverai moi-même les tarifs sur les sites officiels.
`,
          tips: "Utilisez les questions obtenues comme grille de lecture, page tarifs par page tarifs. Si l'assistant cite malgré tout des chiffres, ignorez-les.",
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : estimer le coût d'une fonction d'IA

Si votre produit appelle un modèle, estimez le coût par action utilisateur : nombre moyen de tokens envoyés (consignes, contexte, données) et générés, multiplié par le tarif du modèle choisi, multiplié par le nombre d'actions par mois. Mesurez ensuite le réel : l'estimation initiale reste approximative, et les éditeurs fournissent en général un suivi de consommation. Leviers : un modèle plus léger pour les tâches simples, des consignes plus courtes, la mise en cache quand l'éditeur la propose, des limites par utilisateur. Configurez plafonds ou alertes de dépenses dès la création de la clé d'API, et gardez cette clé côté serveur.
`,
        },
        {
          type: "texte",
          personas: ["non_tech", "reconversion"],
          markdown: `
## Votre temps a une valeur

Au démarrage, on a tendance à ne compter que ce que l'on paie. Pourtant, une stack gratuite qui vous impose de longues manipulations manuelles chaque semaine coûte cher en temps : celui que vous ne passez pas avec vos clients. Estimez vos heures mensuelles dans chaque scénario et donnez-leur une valeur, par exemple le tarif horaire que vous factureriez à un client. Le bon choix n'est pas toujours le moins cher sur la facture.
`,
        },
        {
          type: "checklist",
          title: "Vérifier une page tarifs",
          items: [
            "J'ai noté ce qu'inclut l'offre gratuite et ses limites.",
            "Je sais ce qui se passe quand une limite est atteinte.",
            "J'ai vérifié que l'usage commercial est autorisé dans l'offre retenue.",
            "J'ai identifié les coûts à l'usage et leur unité de facturation.",
            "J'ai cherché s'il existe un plafond de dépenses ou des alertes.",
            "J'ai noté la région d'hébergement et l'existence d'un accord de traitement des données.",
            "J'ai noté l'adresse de la page et la date de consultation.",
          ],
        },
        {
          type: "exercice",
          title: "Votre tableau de coûts",
          instructions: `
1. Reprenez la stack que vous envisagez (leçon 3).
2. Définissez vos trois scénarios d'usage en unités concrètes.
3. Construisez le tableau de coûts sur le modèle ci-dessus, dans un tableur, en relevant chaque information sur la page tarifs officielle, avec l'adresse et la date de consultation.
4. Ajoutez une ligne « temps » et une ligne « imprévus ».
5. Surlignez les trois seuils les plus proches de votre scénario de lancement.

Livrable (fichier) : votre tableau, au format tableur ou PDF.
`,
          deliverable: "fichier",
          estimatedMinutes: 25,
          review: "auto",
          rubric: [
            "Tous les outils de la stack figurent, y compris pilotage et construction",
            "Les trois scénarios sont exprimés en unités concrètes",
            "Chaque information tarifaire est sourcée et datée",
            "Coûts à l'usage, temps et seuils sont identifiés",
          ],
        },
      ],
    },

    // ------------------------------------------------------------------ L05
    {
      key: "m03-l05",
      title: "Atelier : choisir et justifier sa stack",
      summary:
        "Rédiger la fiche stack de votre MVP : outils retenus, justifications, coûts, données, portabilité, trajectoire et risques.",
      estimatedMinutes: 40,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cet atelier, vous aurez rédigé la fiche stack de votre MVP : un document court qui présente vos outils, justifie vos choix et prévoit leur évolution. Relue par votre formateur, elle servira de référence aux modules 4 à 6.

## Ce que contient une fiche stack

1. **Contexte** : le projet en deux lignes, l'hypothèse principale à valider, le profil de l'équipe, le délai.
2. **Stack retenue** : un tableau brique / outil / rôle / justification.
3. **Options écartées** : ce que vous n'avez pas retenu, et pourquoi, en une ligne chacune.
4. **Matrice de décision** : la version finale de votre matrice pondérée (leçon 2).
5. **Coûts et limites** : le résumé de votre tableau de coûts (leçon 4) et les seuils à surveiller.
6. **Données et conformité** : quelles données personnelles, où elles sont hébergées, comment vous les protégez.
7. **Portabilité** : comment vous récupérez votre code et vos données.
8. **Trajectoire** : la prochaine évolution de la stack et le signal qui la déclenchera.
9. **Risques** : les trois principaux risques et la parade prévue.

## Exemple : la fiche stack de Créno (extraits)

Quelques semaines ont passé. Le MVP concierge a montré que plusieurs coachs utilisent le service chaque semaine, et un associé développeur a rejoint le projet à temps partiel. La fiche stack est mise à jour pour la version applicative.

**Contexte.** Réservation et paiement de séances pour coachs sportifs indépendants. Hypothèse : les coachs testeurs et leurs clients adoptent la réservation avec paiement en ligne. Équipe : une fondatrice non technique, un associé développeur à temps partiel. Ouverture aux coachs testeurs prévue dans six semaines.

| Brique | Outil | Rôle | Justification |
| --- | --- | --- | --- |
| Interface et logique | Next.js + React | Pages coach et client | Maîtrisés par l'associé, très répandus, bien connus des outils d'IA |
| Base, authentification, sécurité | Supabase | Profils, créneaux, réservations, paiements ; règles RLS | Postgres standard (portabilité), sécurité au niveau des données |
| Paiement | Stripe | Paiement à la réservation | Intégration documentée, aucune donnée bancaire stockée par Créno |
| Automatisation | n8n | Rappel la veille | La fondatrice peut modifier les workflows sans coder |
| Hébergement | Vercel | Publication, prévisualisations | Intégration directe avec GitHub et Next.js |
| Construction | Claude Code, Cursor | Écriture du code | Plan, petites étapes, tests, relecture des diffs |
| Pilotage | Notion, GitHub | PRD, backlog, code | Déjà en place depuis le module 1 |

**Option écartée.** Stack A (Bolt.new + Supabase) : rapide, mais l'associé préfère structurer le code dès le départ. Bolt.new reste utilisé pour esquisser des écrans avant de les coder.

**Trajectoire.** Si au moins la moitié des coachs testeurs utilisent Créno chaque semaine après un mois, ajout de l'annulation en libre-service et des statistiques du coach. Sinon, entretiens pour comprendre les freins avant tout nouveau développement.

**Risques.** Règles RLS mal écrites (parade : tests d'accès systématiques, relecture au module 4) ; dépendance à l'associé (parade : fichier de contexte et documentation à jour) ; commissions de paiement mal anticipées (parade : intégration au modèle financier).

## Les erreurs fréquentes

- **La liste d'outils sans justification** : « Supabase, Vercel, n8n » ne dit rien de vos besoins ni de vos contraintes.
- **La stack choisie pour impressionner** : une architecture complexe pour un MVP qui doit d'abord trouver ses utilisateurs.
- **L'oubli des briques invisibles** : e-mails de confirmation, sauvegardes, gestion des clés secrètes.
- **La trajectoire sans signal** : « on changera plus tard » n'est pas une trajectoire ; précisez quand, et sur quel constat.

> [!tip] Une bonne fiche stack tient sur une à deux pages. Si la vôtre est plus longue, vous êtes probablement en train de concevoir l'architecture détaillée : c'est l'objet du module 4.
`,
        },
        {
          type: "ressource",
          resourceId: "res_stack_nocode",
          note: "Le guide des outils no-code & IA récapitule les outils de ce module : appuyez-vous dessus pour compléter les colonnes « rôle » et « justification » de votre fiche.",
        },
        {
          type: "prompt",
          title: "Faire challenger sa fiche stack",
          tool: "Claude",
          prompt: `
Tu es un directeur technique expérimenté qui accompagne des fondateurs de startups en phase de MVP. Voici la fiche stack de mon projet :

<fiche>
[COLLEZ VOTRE FICHE STACK]
</fiche>

Relis-la de façon critique :
1. Les choix sont-ils cohérents avec l'hypothèse à valider, le délai et les compétences de l'équipe ?
2. Manque-t-il une brique (authentification, e-mails, paiement, sauvegardes…) ?
3. Les risques de sécurité et de conformité des données sont-ils traités ?
4. La portabilité (récupération du code et des données) est-elle réelle ?
5. La trajectoire a-t-elle un signal de passage mesurable ?

Termine par les trois améliorations prioritaires. Ne cite aucun prix, et signale les points à vérifier dans la documentation officielle des outils.
`,
          tips: "Fonctionne aussi avec ChatGPT. Gardez votre jugement : intégrez les remarques pertinentes, et notez celles que vous écartez, avec la raison.",
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Profil non technique : une fiche qui servira de brief

Si un développeur ou un prestataire vous rejoint, votre fiche stack sera le premier document qu'il lira. Rédigez les justifications avec vos mots, mais soyez précis sur les besoins : « le coach doit pouvoir modifier ses créneaux depuis son téléphone » est plus utile que « application moderne ». Indiquez aussi ce que vous voulez pouvoir faire seul après la livraison : modifier un texte, un workflow, un prix.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : ajoutez les décisions structurantes

Complétez la fiche par une courte section « décisions d'architecture » : où vit la logique métier (base ou code applicatif), stratégie d'authentification, gestion des secrets et des environnements (développement, prévisualisation, production), stratégie de tests. Une ligne par décision, avec l'alternative écartée. Vous les détaillerez au module 4, mais les poser maintenant évite qu'un agent de code fasse ces choix implicitement à votre place.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Si vous doutez de votre choix

C'est normal : aucun choix de stack n'est définitif au stade du MVP. Votre formateur évalue la cohérence de votre raisonnement, pas le prestige des outils. Une stack C bien justifiée vaut mieux qu'une stack B choisie pour impressionner. Notez vos doutes dans la section « risques » : c'est un signe de lucidité, et votre formateur pourra vous aider à les lever.
`,
        },
        {
          type: "checklist",
          title: "Ma fiche stack est prête",
          items: [
            "Chaque brique nécessaire au MVP a un outil et une justification.",
            "Le choix est relié à l'hypothèse à valider et au délai.",
            "Les options écartées sont mentionnées, avec leur raison.",
            "Les coûts et les seuils principaux sont résumés et sourcés.",
            "La localisation et la protection des données personnelles sont traitées.",
            "La récupération du code et des données est prévue.",
            "La trajectoire comporte un signal de passage mesurable.",
          ],
        },
        {
          type: "exercice",
          title: "Votre fiche stack",
          instructions: `
Rédigez la fiche stack de votre MVP en suivant les neuf rubriques de cette leçon, sur une à deux pages. Appuyez-vous sur vos livrables précédents : cartographie des briques (leçon 1), matrice de décision (leçon 2), parcours dans les trois stacks (leçon 3), tableau de coûts (leçon 4).

Avant de rendre votre fiche :

- faites-la challenger avec le prompt proposé et intégrez les remarques pertinentes ;
- vérifiez chaque point de la checklist ;
- relisez-la pour vous assurer qu'elle ne contient aucune donnée personnelle réelle ni aucun secret.

Livrable (texte) : votre fiche stack. Votre formateur vous répondra par des questions et des recommandations ; vous pourrez l'ajuster avant le module 4.
`,
          deliverable: "texte",
          estimatedMinutes: 30,
          review: "formateur",
          rubric: [
            "Cohérence entre la stack, l'hypothèse à valider, le délai et les compétences de l'équipe",
            "Justifications concrètes et options écartées explicitées",
            "Coûts, limites et conformité des données traités de façon sourcée",
            "Portabilité et trajectoire d'évolution avec un signal mesurable",
            "Risques identifiés, chacun avec une parade réaliste",
          ],
        },
      ],
    },

    // ------------------------------------------------------------------ L06
    {
      key: "m03-l06",
      title: "Évaluation du module",
      summary: "Dix questions pour valider vos acquis sur les familles d'outils, les critères de choix, les trois stacks de référence et l'estimation des coûts.",
      estimatedMinutes: 20,
      blocks: [
        {
          type: "texte",
          markdown: `
Cette évaluation vérifie que vous savez situer les outils, comparer des options avec méthode, choisir une stack de départ et anticiper ses coûts.

## Consignes

- Dix questions, une seule bonne réponse par question.
- Plusieurs questions décrivent une situation : raisonnez comme pour votre propre projet.
- Une explication s'affiche après chaque réponse : lisez-la, même quand vous avez juste.
- Le score minimal attendu est indiqué dans votre espace. En cas d'échec, relisez les leçons concernées avant de retenter.
`,
        },
        {
          type: "quiz",
          title: "Évaluation — Choisir sa stack",
          graded: true,
          questions: [
            {
              prompt: "Quel outil de la formation fournit à la fois une base Postgres, l'authentification, le stockage de fichiers et la sécurité par lignes (RLS) ?",
              options: [
                { label: "Vercel" },
                { label: "n8n" },
                { label: "Supabase", correct: true },
                { label: "Airtable" },
              ],
              explanation:
                "Supabase est un backend as a service. Vercel héberge, n8n automatise, Airtable est une base no-code de type tableur.",
            },
            {
              prompt: "Qu'est-ce qu'un MVP « concierge » ?",
              options: [
                { label: "Une application entièrement automatisée dès le premier jour" },
                { label: "Un service rendu en grande partie à la main, en coulisses, pour valider la demande avant d'automatiser", correct: true },
                { label: "Une maquette non cliquable présentée à des investisseurs" },
                { label: "Une application générée par IA sans intervention humaine" },
              ],
              explanation:
                "Le MVP concierge (par exemple Airtable + n8n + page simple) teste la demande avec un investissement minimal ; l'automatisation vient ensuite.",
            },
            {
              prompt: "Dans votre matrice de décision pondérée, deux options obtiennent le même score. Que faites-vous ?",
              options: [
                { label: "Vous modifiez les poids jusqu'à ce que votre option préférée gagne" },
                { label: "Vous tirez au sort" },
                { label: "Vous choisissez l'outil le plus populaire du moment" },
                { label: "Vous départagez selon l'hypothèse à valider en premier : la matrice éclaire, elle ne décide pas", correct: true },
              ],
              explanation:
                "Ajuster les poids après coup est un piège classique. L'hypothèse prioritaire (la demande existe-t-elle ? sait-on construire ?) oriente le choix.",
            },
            {
              prompt: "Que recouvre le critère « dépendance et portabilité » ?",
              options: [
                { label: "La capacité à récupérer son code et ses données pour changer d'outil si nécessaire", correct: true },
                { label: "La possibilité d'utiliser l'outil sur un téléphone" },
                { label: "La vitesse de chargement des pages" },
                { label: "Le nombre de fonctionnalités de l'outil" },
              ],
              explanation:
                "Un outil qui permet d'exporter le code (vers GitHub, par exemple) et les données dans des formats standards évite de devoir tout reconstruire.",
            },
            {
              prompt: "Une fondatrice non technique veut vérifier en deux semaines que des clients sont prêts à payer son service. Quelle stack de départ est la plus cohérente ?",
              options: [
                { label: "Next.js + Supabase + Vercel, développée seule avec un agent de code" },
                { label: "Airtable + n8n + une page simple (MVP concierge)", correct: true },
                { label: "Une architecture en microservices" },
                { label: "Aucune : attendre d'avoir recruté un développeur" },
              ],
              explanation:
                "Délai très court, profil non technique, hypothèse de demande : le MVP concierge permet de tester vite, sans code, avant d'investir.",
            },
            {
              prompt: "Quel est le principal point de vigilance de la stack Bolt.new + Supabase avant d'ouvrir l'application à de vrais utilisateurs ?",
              options: [
                { label: "Il est impossible de récupérer le code" },
                { label: "Supabase ne permet pas de créer des comptes utilisateurs" },
                { label: "Vérifier la sécurité (règles RLS, clés) et la structure du code généré", correct: true },
                { label: "L'application ne peut pas s'afficher sur mobile" },
              ],
              explanation:
                "La génération par IA ne garantit ni la sécurité ni une bonne structure. Les règles d'accès et la gestion des clés doivent être vérifiées.",
            },
            {
              prompt: "Comment l'utilisation d'un modèle d'IA via une API est-elle généralement facturée ?",
              options: [
                { label: "Au nombre d'utilisateurs inscrits sur votre application" },
                { label: "Au volume de texte traité, mesuré en tokens, en entrée et en sortie, selon le modèle choisi", correct: true },
                { label: "Par un forfait unique à vie" },
                { label: "Au nombre de pages de votre site" },
              ],
              explanation:
                "Les API de modèles facturent le volume de texte envoyé et généré (tokens) ; le tarif dépend du modèle. Vérifiez toujours la page tarifs officielle.",
            },
            {
              prompt: "Lequel de ces éléments est un coût caché typique d'un MVP ?",
              options: [
                { label: "L'abonnement mensuel affiché sur la page tarifs" },
                { label: "La commission indiquée par le prestataire de paiement" },
                { label: "Le prix du nom de domaine affiché à l'achat" },
                { label: "Le temps passé en tâches manuelles et en maintenance", correct: true },
              ],
              explanation:
                "Le temps (apprentissage, gestion manuelle, maintenance, support) ne figure sur aucune facture, mais pèse lourdement sur un projet de MVP.",
            },
            {
              prompt: "Votre MVP stockera les noms et les téléphones de clients. Que vérifiez-vous au titre du critère « données et conformité » ?",
              options: [
                { label: "La région d'hébergement, les garanties contractuelles du prestataire et la limitation des données collectées au nécessaire", correct: true },
                { label: "Uniquement la couleur de l'interface" },
                { label: "Rien : le RGPD ne concerne que les grandes entreprises" },
                { label: "Uniquement que l'outil soit gratuit" },
              ],
              explanation:
                "Le RGPD s'applique aussi aux petites structures. Hébergement, contrat de traitement des données et minimisation sont les premiers points à vérifier (sources : cnil.fr).",
            },
            {
              prompt: "Quel est le rôle de Vercel dans la stack Next.js + React + Supabase + Vercel ?",
              options: [
                { label: "Stocker les réservations et gérer les règles RLS" },
                { label: "Envoyer les rappels la veille des séances" },
                { label: "Héberger et publier l'application, avec des versions de prévisualisation à chaque modification", correct: true },
                { label: "Rédiger le code à partir des user stories" },
              ],
              explanation:
                "Vercel se connecte au dépôt GitHub, construit et publie chaque version. Supabase gère les données, n8n les rappels, les agents de code l'écriture.",
            },
          ],
        },
      ],
    },
  ],
};
