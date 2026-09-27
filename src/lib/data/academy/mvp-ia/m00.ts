import type { SeedModule } from "../authoring";

export const M00: SeedModule = {
  key: "m00",
  title: "Bienvenue et positionnement",
  summary:
    "Comprendre le fonctionnement de la formation, faire le point sur votre profil et votre projet, et préparer un environnement de travail sûr et opérationnel.",
  objectives: [
    "Être capable d’expliquer le fonctionnement de la formation : progression séquentielle, assistance, évaluations et conditions d’obtention du certificat de réalisation.",
    "Être capable d’identifier ses points forts et ses points d’attention de départ (numérique, IA, notions produit, maturité du projet) grâce au positionnement.",
    "Être capable de présenter son projet, son profil et ses attentes de façon structurée.",
    "Être capable de configurer un environnement de travail sécurisé et adapté à son profil : comptes, double authentification, gestionnaire de mots de passe, dossier projet.",
  ],
  lessons: [
    // ─────────────────────────────────────────────────────────────
    {
      key: "m00-l01",
      title: "Bienvenue dans StartupWeek Academy",
      summary:
        "Découvrir le fonctionnement de la formation : parcours, progression, assistance, évaluations et certificat.",
      estimatedMinutes: 15,
      isPreview: true,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez comment fonctionne la formation, ce que l’on attend de vous et à qui vous adresser à chaque étape. Prenez un quart d’heure : ces repères vous feront gagner beaucoup de temps ensuite.

## Une formation par projet

StartupWeek Academy propose la version en ligne du bootcamp StartupWeek, qui permet de construire un MVP en 7 jours. Un MVP (*minimum viable product*, ou produit minimum viable) est la plus petite version de votre produit qui permet de vérifier, auprès de vrais utilisateurs, qu’il résout bien leur problème.

Ici, vous ne suivez pas des cours « pour savoir ». Vous construisez **votre** MVP, étape par étape. Chaque module se termine par des livrables qui font avancer votre projet : un problème cadré, un cahier des charges, des maquettes, une application en ligne, des retours d’utilisateurs, une page de lancement, un pitch. À la fin, vous repartez avec un produit testé et un plan pour la suite, pas seulement avec des notes.

## Le fil rouge : Créno

Pour illustrer chaque notion, nous suivons un projet fictif, **Créno** : une application web de réservation et de paiement de séances pour coachs sportifs indépendants.

- Le **coach** publie ses créneaux, gère ses clients et voit ses paiements.
- Le **client** réserve une séance, la paie en ligne et peut l’annuler.
- Le MVP de Créno se limite à l’essentiel : le coach publie ses créneaux, le client réserve et paie, un rappel automatique part la veille de la séance.

Créno vous montre à quoi ressemble une réponse attendue. Ce n’est pas un modèle à copier : votre projet a sa propre cible et ses propres contraintes.

## Le parcours en 10 modules

| Module | Thème | Ce que vous produisez |
| --- | --- | --- |
| 0 | Bienvenue et positionnement | Votre présentation, un environnement de travail prêt |
| 1 | Cadrer son problème et son MVP | Énoncé de problème, synthèse d’entretiens, PRD, backlog |
| 2 | Bien prompter | Vos prompts de travail réutilisables |
| 3 | Choisir sa stack | Le choix argumenté de vos outils |
| 4 | Architecturer son app | Votre modèle de données et vos règles d’accès |
| 5 | Parcours utilisateur et maquettes | Les maquettes de votre parcours clé |
| 6 | Construire avec l’IA | Votre MVP en ligne |
| 7 | Tester avec de vrais utilisateurs | Une synthèse de tests et des corrections |
| 8 | Lancer | Une page de lancement et un plan d’acquisition |
| 9 | Pitch, roadmap et évaluation finale | Deck, pitch vidéo, roadmap à 30 jours |

## Comment se déroule votre progression

- **Environ 50 heures d’activités**, estimées leçon par leçon : la durée affichée comprend la lecture, les vidéos, les exercices et les quiz.
- **Une progression séquentielle** : la leçon suivante se débloque quand la leçon en cours est terminée. Cet ordre n’est pas arbitraire : chaque étape s’appuie sur la précédente.
- **6 mois d’accès** à partir de l’ouverture de votre formation. À raison de 5 heures par semaine, vous terminez en une dizaine de semaines, ce qui laisse de la marge pour les imprévus.

> [!tip] Bloquez dès aujourd’hui deux ou trois créneaux fixes par semaine dans votre agenda. La régularité compte davantage que la durée de chaque séance.

## Des contenus adaptés à votre profil

Certains contenus existent en plusieurs versions selon votre profil, défini lors de votre inscription :

- **technique** (développeur, ingénieur, data…) : davantage de code et d’autonomie sur les outils de développement ;
- **non technique** (entrepreneur, expert métier) : des outils sans code et des repères pour piloter l’IA sans programmer ;
- **reconversion** : davantage de pas-à-pas, de vocabulaire expliqué et de points d’étape.

Le tronc commun est identique pour tous : les variantes le complètent, elles ne le remplacent pas. Si votre profil ne vous semble pas adapté, signalez-le à votre formateur.

## Assistance pédagogique et technique

Un **formateur référent** vous accompagne pendant toute la formation. Vous le contactez depuis la **messagerie de Mon espace**, pour une question sur le contenu, un blocage technique ou un problème d’accès. Il vous répond **sous 48 heures ouvrées**.

Pour obtenir une réponse utile du premier coup, précisez la leçon concernée, ce que vous cherchiez à faire, ce que vous avez essayé et le message d’erreur exact, sans jamais y inclure de mot de passe ni de clé secrète.

## Comment vous êtes évalué

- **Les quiz d’auto-vérification**, dans les leçons : non notés, ils vous permettent de vérifier votre compréhension.
- **Les quiz de fin de module** : notés, ils mesurent vos acquis. Le score attendu est indiqué dans le livret d’accueil.
- **Les livrables corrigés** : certains exercices sont relus par votre formateur, selon des critères de réussite affichés avec chaque consigne.
- **L’évaluation finale** (module 9) : un quiz transversal et vos livrables finaux (MVP en ligne, deck, vidéo de pitch, roadmap).

## Le certificat de réalisation

Le certificat de réalisation atteste que vous avez suivi la formation. Il est délivré lorsque vous atteignez la progression minimale précisée dans le livret d’accueil. Pour une formation à distance, l’organisme doit pouvoir prouver ce suivi : vos connexions et vos activités (leçons terminées, quiz, exercices remis) sont donc tracées.

## Accessibilité et réclamations

Vous êtes en situation de handicap ou avez besoin d’un aménagement (rythme, format des contenus, outils) ? Contactez la **référente handicap** : ses coordonnées figurent dans le livret d’accueil. Plus tôt vous en parlez, plus tôt une solution peut être étudiée.

Une difficulté ou une insatisfaction que votre formateur n’a pas pu résoudre ? Le livret d’accueil décrit la **procédure de réclamation** : chaque réclamation est enregistrée et reçoit une réponse.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Votre parcours en tant que profil technique

Vous savez coder : c’est un atout, et un piège. Le piège, c’est de passer trop vite à la construction, ou de bâtir une architecture trop ambitieuse pour un MVP. Les modules 1 à 5 vous demandent de cadrer avant de coder : jouez le jeu, ils vous éviteront de réécrire votre application.

Au module 6, vous travaillerez avec Next.js, Supabase et Vercel, assisté par des agents de code comme Claude Code, Codex ou Cursor. Votre valeur ajoutée sera de bien les piloter : découper les demandes, relire le code produit, tester, sécuriser.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Votre parcours en tant que profil non technique

Vous n’avez pas besoin de savoir programmer pour suivre cette formation. Vous apprendrez à décrire précisément ce que vous voulez, puis à faire construire votre application par un outil comme Bolt.new, relié à une base de données Supabase.

Votre expertise métier est votre meilleur atout : vous connaissez vos futurs utilisateurs et leurs problèmes. Les modules de cadrage (1 à 5) sont ceux où vous ferez la différence. Au module 6, suivez les pas-à-pas et sollicitez votre formateur dès qu’un blocage dure.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Votre parcours en tant que personne en reconversion

Beaucoup de mots vont vous sembler nouveaux : c’est normal. Chaque terme est défini la première fois qu’il apparaît, et plusieurs leçons vous proposent un petit glossaire. Vous n’avez pas à tout retenir d’un coup.

Avancez régulièrement, même par petites séances, et notez vos questions au fil de l’eau pour les poser à votre formateur. Votre parcours antérieur compte : la connaissance d’un métier, d’un public ou d’un secteur est souvent le point de départ des meilleurs projets.
`,
        },
        {
          type: "video",
          title: "Bienvenue : comment se déroule votre formation",
          durationMinutes: 5,
          script: `
- Accueil face caméra : présentation de StartupWeek et de l’objectif de la formation (repartir avec un MVP testé et un plan pour la suite).
- Le principe de la formation par projet : chaque module fait avancer le produit de l’apprenant, pas un exercice abstrait.
- Présentation rapide de Créno, le fil rouge : les deux rôles (coach, client) et le parcours clé du MVP.
- Démonstration à l’écran de Mon espace : progression séquentielle, durée estimée des leçons, exercices, messagerie.
- L’assistance : formateur référent, réponse sous 48 heures ouvrées, comment rédiger une question efficace.
- Évaluations et certificat de réalisation en une minute, renvoi vers le livret d’accueil.
- Conseil de rythme : deux à trois créneaux fixes par semaine ; rendez-vous à la leçon suivante.
`,
        },
        {
          type: "ressource",
          resourceId: "res_livret",
          note: "Le livret d’accueil rassemble les informations pratiques : contacts, référente handicap, règles de fonctionnement, seuils d’évaluation et de certificat, procédure de réclamation. Gardez-le à portée de main.",
        },
        {
          type: "checklist",
          title: "Avant de commencer",
          items: [
            "J’ai lu le livret d’accueil et je sais où trouver le contact de la référente handicap.",
            "J’ai bloqué deux ou trois créneaux fixes par semaine dans mon agenda.",
            "J’ai repéré la messagerie de Mon espace pour contacter mon formateur référent.",
            "Je sais que chaque leçon débloque la suivante une fois terminée.",
            "Je connais la date de fin de mon accès (6 mois après l’ouverture).",
            "J’ai une idée de projet, même floue, sur laquelle travailler tout au long de la formation.",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m00-l02",
      title: "Votre positionnement de départ",
      summary:
        "Faire le point sur vos acquis de départ avec un quiz non évalué et présenter votre projet à votre formateur.",
      estimatedMinutes: 30,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez où vous en êtes au départ sur quatre axes (numérique, intelligence artificielle, notions produit, maturité du projet), et vous aurez présenté votre projet à votre formateur.

## Pourquoi un positionnement ?

Les apprenants arrivent avec des profils très différents : certains codent depuis dix ans, d’autres n’ont jamais utilisé d’assistant IA ; certains ont déjà des clients, d’autres une simple intuition. Le positionnement sert à deux choses :

- **pour vous** : repérer vos points forts et les notions à consolider, afin d’y consacrer plus de temps quand elles arriveront ;
- **pour votre formateur** : adapter son accompagnement. Il lira votre présentation et vos points d’attention avant de corriger vos premiers livrables.

## Un quiz non évalué

Le quiz de cette leçon **ne compte pas dans votre évaluation**. Chaque question a une réponse attendue, mais ici la « bonne réponse » sert d’**auto-diagnostic** : si vous la trouvez, la notion est probablement acquise ; sinon, c’est un point à surveiller. Après chaque réponse, lisez l’explication : elle précise où la notion est travaillée dans la formation.

Répondez spontanément, sans chercher sur internet ni demander à une IA. Un positionnement « gonflé » ne vous servirait à rien : c’est votre point de départ réel qui compte.

| Axe | Ce que l’on vérifie | Où c’est travaillé |
| --- | --- | --- |
| Autonomie numérique | Partager un document, sécuriser un compte, lire une adresse web | Module 0, puis tout au long de la formation |
| Intelligence artificielle | Savoir ce qu’est un prompt, connaître les limites et les risques d’un assistant IA | Modules 0 et 2 |
| Notions produit | MVP, user story | Module 1 |
| Maturité du projet | Distinguer ce qui est prouvé de ce qui reste une hypothèse | Module 1 |

## Lire votre résultat

Comptez vos réponses attendues sur les 10 questions :

- **8 à 10** : vous avez de bonnes bases. Profitez-en pour aller plus loin dans les exercices et soigner vos livrables.
- **5 à 7** : c’est un point de départ courant. Notez les notions manquées : elles seront traitées en détail dans les modules indiqués.
- **0 à 4** : vous découvrez beaucoup de notions, et la formation est faite pour cela. Suivez les leçons dans l’ordre, prenez le temps des variantes pas-à-pas et écrivez à votre formateur dès qu’un point reste flou.

Aucun résultat n’est « mauvais ». Un projet encore au stade de l’idée, par exemple, n’est pas un handicap : le module 1 vous apprend précisément à le cadrer.

## Présenter votre projet

Après le quiz, vous rédigerez une courte présentation. Elle a trois objectifs : clarifier votre projet pour vous-même, donner à votre formateur le contexte dont il a besoin, et formuler vos attentes pour pouvoir mesurer, à la fin, le chemin parcouru.

Pas besoin d’un texte parfait. Écrivez comme vous parleriez à quelqu’un qui découvre votre projet : phrases courtes, exemples concrets, pas de superlatifs. Si votre idée est encore floue, dites-le : c’est une information utile.

Voici, à titre d’exemple fictif, le début de la présentation de la porteuse de projet de Créno :

> [!info] « Je suis ancienne coach sportive, sans compétence en code. Je veux aider les coachs indépendants à gérer leurs réservations et leurs paiements sans passer leurs soirées sur leur téléphone. J’ai parlé du problème avec quatre collègues, mais rien n’est encore construit. J’attends de la formation qu’elle m’aide à réduire mon idée à l’essentiel et à mettre en ligne une première version que je pourrai tester. »
`,
        },
        {
          type: "quiz",
          title: "Quiz de positionnement (non évalué)",
          graded: false,
          questions: [
            {
              prompt:
                "Vous devez transmettre à votre formateur un document de travail, consultable en ligne et toujours à jour. Quelle est la meilleure option ?",
              options: [
                { label: "Un lien de partage en lecture seule vers le document (Notion, Google Docs…)", correct: true },
                { label: "Une capture d’écran de chaque page" },
                { label: "Le fichier en pièce jointe, renvoyé à chaque modification" },
                { label: "Vos identifiants de connexion, pour qu’il aille le consulter lui-même" },
              ],
              explanation:
                "Un lien en lecture seule donne toujours accès à la dernière version, sans exposer vos identifiants. Si vous avez hésité, retenez ce réflexe : vous l’utiliserez pour la plupart des livrables de la formation.",
            },
            {
              prompt: "Qu’est-ce que la double authentification ?",
              options: [
                { label: "Une seconde preuve d’identité (code, notification, clé) demandée en plus du mot de passe", correct: true },
                { label: "Le fait d’avoir deux comptes sur le même service" },
                { label: "Un mot de passe deux fois plus long" },
                { label: "La connexion simultanée sur deux appareils" },
              ],
              explanation:
                "La double authentification protège vos comptes même si votre mot de passe est dérobé. Vous l’activerez dans la leçon suivante.",
            },
            {
              prompt: "Dans l’adresse https://app.exemple.fr/reservations, que désigne « app.exemple.fr » ?",
              options: [
                { label: "Le nom de domaine (ici un sous-domaine) du site", correct: true },
                { label: "Un dossier de votre ordinateur" },
                { label: "Le nom du navigateur utilisé" },
                { label: "Le nom de l’utilisateur connecté" },
              ],
              explanation:
                "Le nom de domaine identifie le site ; « /reservations » est le chemin d’une page. Ces notions reviennent au module 6, quand vous mettrez votre application en ligne.",
            },
            {
              prompt: "Qu’est-ce qu’un prompt ?",
              options: [
                { label: "La consigne, rédigée en langage naturel, que l’on donne à un assistant IA", correct: true },
                { label: "Un langage de programmation réservé aux développeurs" },
                { label: "Un abonnement payant à un service d’IA" },
                { label: "Un message d’erreur affiché par un logiciel" },
              ],
              explanation:
                "Le prompt est la consigne donnée à l’IA. Savoir le rédiger avec précision est l’objet du module 2.",
            },
            {
              prompt:
                "Un assistant IA vous répond avec assurance, en citant un chiffre de marché et une source. Quelle attitude adopter ?",
              options: [
                { label: "Vérifier le chiffre et la source, car un modèle de langage peut produire des informations fausses de façon convaincante", correct: true },
                { label: "L’utiliser tel quel : une IA ne cite pas de source inexistante" },
                { label: "Le reformuler pour qu’il ait l’air plus fiable" },
                { label: "Poser la même question une seconde fois : si la réponse est identique, elle est juste" },
              ],
              explanation:
                "Les modèles de langage peuvent « halluciner », c’est-à-dire produire des faits ou des sources inventés. Tout chiffre destiné à un livrable doit être vérifié à sa source. Vous approfondirez ce point au module 2.",
            },
            {
              prompt: "Parmi ces informations, laquelle pouvez-vous coller sans risque dans un prompt ?",
              options: [
                { label: "La description anonymisée du parcours de votre utilisateur type", correct: true },
                { label: "La clé secrète de votre compte de paiement" },
                { label: "Le fichier de vos contacts avec noms et téléphones" },
                { label: "Le mot de passe de votre messagerie" },
              ],
              explanation:
                "Secrets et données personnelles ne doivent jamais figurer dans un prompt. La leçon suivante détaille les bons réflexes.",
            },
            {
              prompt: "Quel élément constitue la meilleure preuve qu’un problème est réel pour votre cible ?",
              options: [
                { label: "Des personnes de la cible décrivent spontanément le problème et ce qu’elles font déjà pour le contourner", correct: true },
                { label: "Vos proches trouvent l’idée excellente" },
                { label: "Vous n’avez trouvé aucun concurrent" },
                { label: "Un assistant IA confirme que le marché est très important" },
              ],
              explanation:
                "Ce que les gens font vaut plus que ce qu’ils disent. Si vous avez hésité, le module 1 vous apprend à distinguer signaux forts et signaux faibles.",
            },
            {
              prompt: "Lequel de ces projets est le plus prêt à entrer en phase de construction ?",
              options: [
                { label: "Le problème, la cible et un parcours principal sont écrits, et plusieurs utilisateurs potentiels ont été interrogés", correct: true },
                { label: "L’idée est claire dans la tête du porteur de projet, mais rien n’est écrit" },
                { label: "Le nom et le logo sont trouvés" },
                { label: "La liste des fonctionnalités compte déjà une cinquantaine d’éléments" },
              ],
              explanation:
                "Un projet prêt à construire a un problème écrit, une cible précise et des premiers retours. Si ce n’est pas encore votre cas, pas d’inquiétude : c’est l’objet du module 1.",
            },
            {
              prompt: "Que désigne un MVP (produit minimum viable) ?",
              options: [
                { label: "La plus petite version du produit qui permet d’apprendre auprès de vrais utilisateurs", correct: true },
                { label: "Une version complète du produit, mais à prix réduit" },
                { label: "Une maquette non fonctionnelle destinée aux investisseurs" },
                { label: "Le meilleur produit du marché dans sa catégorie" },
              ],
              explanation:
                "Le MVP sert à apprendre vite, avec un minimum d’effort. Vous en définirez le périmètre au module 1.",
            },
            {
              prompt: "Qu’est-ce qu’une user story ?",
              options: [
                { label: "Une phrase qui décrit un besoin du point de vue d’un utilisateur : « En tant que…, je veux…, afin de… »", correct: true },
                { label: "Le témoignage d’un client satisfait publié sur un site" },
                { label: "L’historique des connexions d’un utilisateur" },
                { label: "Le récit de la création de l’entreprise" },
              ],
              explanation:
                "Les user stories structurent votre cahier des charges et votre backlog. Vous les rédigerez au module 1.",
            },
          ],
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Conseils pour votre présentation (profil technique)

Précisez vos langages et frameworks, votre expérience des agents de code et des outils de déploiement. Surtout, dites aussi ce que vous n’avez jamais fait : entretiens avec des clients, maquettage, rédaction d’une page de vente, acquisition. C’est souvent là que se joue la réussite d’un MVP, et c’est là que votre formateur pourra vous être le plus utile.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Conseils pour votre présentation (profil non technique)

Décrivez votre expertise métier et votre réseau : combien de futurs utilisateurs pouvez-vous contacter facilement ? Citez les outils que vous maîtrisez déjà (tableur, Notion, outils sans code, assistants IA) et ceux qui vous inquiètent. Votre formateur saura ainsi où vous accompagner au moment de la construction.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Conseils pour votre présentation (profil reconversion)

Dites d’où vous venez et ce qui motive votre changement. Listez vos compétences transférables : gestion de projet, relation client, organisation, connaissance d’un secteur ou d’un public. Nommez aussi ce qui vous inquiète (la technique, le temps, la légitimité) : votre formateur ne peut vous aider que sur ce qu’il connaît.
`,
        },
        {
          type: "exercice",
          title: "Présentez votre projet, votre profil et vos attentes",
          instructions: `
Rédigez une présentation de 250 à 400 mots, en quatre parties, directement dans le champ de réponse.

1. **Votre projet** : le problème que vous voulez résoudre, pour qui, et votre idée de solution (5 lignes maximum). Indiquez son stade : simple idée, idée déjà discutée avec de futurs utilisateurs, prototype, produit déjà utilisé.
2. **Votre profil** : votre parcours en deux ou trois phrases, les outils numériques et IA que vous utilisez déjà, et le temps que vous pouvez consacrer à la formation chaque semaine.
3. **Votre positionnement** : votre nombre de réponses attendues au quiz et les deux ou trois notions que vous voulez consolider.
4. **Vos attentes** : trois résultats concrets que vous attendez de la formation, et vos éventuelles contraintes (agenda, matériel, besoin d’aménagement).

Si vous travaillez en binôme, chacun remet sa propre présentation et mentionne son binôme.

> [!tip] Un besoin d’aménagement lié à un handicap peut aussi être adressé directement, et en toute confidentialité, à la référente handicap : ses coordonnées figurent dans le livret d’accueil.
`,
          deliverable: "texte",
          estimatedMinutes: 15,
          review: "formateur",
          rubric: [
            "Le problème, la cible et l’idée de solution sont décrits concrètement.",
            "Le stade du projet est indiqué honnêtement.",
            "Le profil, le temps disponible et les notions à consolider sont précisés.",
            "Au moins trois attentes concrètes sont formulées.",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m00-l03",
      title: "Préparer vos outils",
      summary:
        "Créer et sécuriser les comptes utiles à la formation, puis organiser votre espace de travail selon votre profil.",
      estimatedMinutes: 45,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous aurez créé les comptes utiles à la formation, sécurisé vos accès et organisé votre espace de travail. Ce temps investi maintenant vous évitera d’être bloqué au moment où vous voudrez avancer sur votre projet.

## Les comptes à créer, et pourquoi

Vous n’avez pas besoin de tout maîtriser aujourd’hui. L’objectif est d’ouvrir les comptes, pas d’apprendre les outils : chacun sera présenté dans le module où il sert.

| Outil | À quoi il sert dans la formation | Quand |
| --- | --- | --- |
| Claude | Assistant IA pour réfléchir, rédiger, analyser et, avec Claude Code, écrire du code | Dès le module 1 |
| ChatGPT | Second assistant IA, utile pour comparer les réponses ; Codex en est la déclinaison pour le code | Dès le module 1 |
| Notion | Espace de travail du projet : notes, entretiens, PRD, backlog | Dès le module 1 |
| GitHub | Hébergement du code et historique de ses versions | Module 6 |
| Supabase | Base de données, authentification des utilisateurs, règles d’accès | Modules 4 et 6 |
| Vercel | Mise en ligne de votre application | Module 6 |
| Cursor ou Bolt.new | Construire l’application avec l’IA : Cursor est un éditeur de code (profil technique), Bolt.new fonctionne dans le navigateur (autres profils) | Module 6 |

D’autres outils viendront plus tard, inutile de les créer maintenant : **Airtable** (une base de données qui ressemble à un tableur) et **n8n** (automatisation de tâches, comme l’envoi de rappels) au module 6, **Gamma** (création de présentations) au module 9.

La plupart de ces outils proposent une formule gratuite ou d’essai suffisante pour démarrer. Les conditions changent souvent : consultez la page tarifs de chaque outil au moment de créer votre compte, et ne souscrivez un abonnement que lorsque vous en avez réellement besoin.

## Comptes professionnels ou personnels ?

Créez vos comptes avec une **adresse e-mail dédiée au projet** : une adresse professionnelle si vous en avez une, sinon une nouvelle adresse. Vos outils seront ainsi regroupés, faciles à transmettre à un futur associé, et séparés de votre vie privée.

Si vous utilisez l’ordinateur ou les comptes de votre employeur, vérifiez d’abord ses règles : certaines entreprises interdisent les outils d’IA externes ou l’installation de logiciels.

## Sécuriser vos accès

### Un gestionnaire de mots de passe

Un gestionnaire de mots de passe est un logiciel qui génère et mémorise un mot de passe long et différent pour chaque service. Vous ne retenez plus qu’un seul mot de passe, le « mot de passe maître ». Votre navigateur en intègre un ; des applications dédiées existent aussi. L’essentiel : ne jamais réutiliser le même mot de passe sur deux services.

### La double authentification

La double authentification (on dit aussi 2FA, ou authentification à deux facteurs) ajoute une seconde preuve d’identité au mot de passe : un code affiché par une application d’authentification, une notification sur votre téléphone ou une clé physique. Activez-la en priorité sur votre adresse e-mail, qui permet de réinitialiser tout le reste, puis sur GitHub, Supabase et Vercel, qui hébergeront votre code et vos données. Conservez les codes de secours dans votre gestionnaire de mots de passe.

### Ce que vous ne collez jamais dans un prompt

Tout ce que vous collez dans un prompt quitte votre ordinateur et est traité par un service externe. N’y mettez donc jamais :

- **des secrets** : mots de passe, clés d’API (codes qui donnent accès à un service ou à vos données), jetons de connexion, fichiers de configuration qui en contiennent ;
- **des données personnelles de tiers** : noms, e-mails, téléphones ou notes d’entretien nominatives de vos clients, testeurs ou contacts ;
- **des informations confidentielles** : contrats, chiffres d’un partenaire, données de votre employeur.

Remplacez-les par des marqueurs neutres : [CLIENT_1], [CLÉ_MASQUÉE], « une coach de 35 ans ». Vérifiez aussi, dans les paramètres de confidentialité de chaque assistant, si vos conversations peuvent servir à améliorer les modèles, et réglez cette option selon vos besoins.

> [!warning] Si une clé secrète a été collée dans un prompt, un message ou un dépôt de code public, considérez-la comme compromise : révoquez-la et générez-en une nouvelle depuis le tableau de bord du service concerné.

## Organiser votre espace de travail

Un projet de MVP produit vite beaucoup de fichiers : notes d’entretien, captures, exports, maquettes, textes. Mettez en place dès maintenant une organisation simple.

**Sur votre ordinateur**, créez un dossier projet avec un sous-dossier par grande étape :

\`\`\`text
mon-projet/
  01-cadrage/
  02-maquettes/
  03-produit/
  04-tests/
  05-lancement/
  06-pitch/
\`\`\`

Nommez vos fichiers avec la date en tête, au format AAAA-MM-JJ (par exemple « AAAA-MM-JJ_synthese-entretiens_v1 ») : ils se trieront d’eux-mêmes dans l’ordre chronologique.

**Dans Notion**, créez une page « Mon MVP » avec cinq sous-pages : Journal de bord, Entretiens, PRD, Backlog et Ressources. Vous les remplirez au fil des modules ; le backlog sera construit au module 1.

**Un journal de bord** : à la fin de chaque séance de travail, notez en trois lignes ce que vous avez fait, ce qui vous bloque et la prochaine action. C’est le meilleur moyen de reprendre vite après une pause, et une matière précieuse pour vos échanges avec votre formateur.
`,
        },
        {
          type: "video",
          title: "Votre boîte à outils : à quoi sert chaque compte",
          durationMinutes: 6,
          script: `
- Pourquoi préparer ses outils avant de commencer : éviter de perdre une séance de travail en création de comptes au module 6.
- Démonstration à l’écran : création d’un compte avec l’adresse du projet, puis activation de la double authentification.
- Le gestionnaire de mots de passe en pratique : générer, enregistrer et retrouver un mot de passe.
- Tour rapide des outils et de leur rôle dans Créno : Claude et ChatGPT, Notion, GitHub, Supabase, Vercel.
- Les deux chemins de construction : Cursor et Claude Code (profil technique), Bolt.new dans le navigateur (autres profils).
- Ce que l’on ne colle jamais dans un prompt : démonstration du masquage d’une clé et d’un nom avant envoi.
- Mise en place du dossier projet et de la page Notion « Mon MVP ».
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : votre environnement de développement

Installez ou mettez à jour les outils suivants, en suivant la documentation officielle de chacun :

1. **Git**, le logiciel de gestion de versions ([git-scm.com](https://git-scm.com)).
2. **Node.js**, dans sa version LTS (version à support long, la plus stable), qui fournit aussi npm.
3. **Cursor**, éditeur de code intégrant l’IA ([cursor.com](https://cursor.com)). Vous pouvez rester sur votre éditeur habituel : les principes restent les mêmes.
4. **Claude Code**, l’agent de code d’Anthropic qui s’utilise en ligne de commande : suivez la procédure d’installation de sa documentation officielle, puis connectez-vous avec votre compte. Codex, chez OpenAI, joue un rôle comparable ; la formation montre surtout Claude Code, mais les méthodes sont transposables.

Vérifiez ensuite que tout répond dans un terminal :

\`\`\`bash
git --version
node --version
npm --version
claude --version
\`\`\`

Configurez enfin votre identité Git, qui apparaîtra dans l’historique de vos commits :

\`\`\`bash
git config --global user.name "Prénom Nom"
git config --global user.email "adresse-du-projet@exemple.fr"
\`\`\`

Reliez votre poste à GitHub (clé SSH ou authentification HTTPS, selon la documentation de GitHub) et testez en clonant un dépôt. Aucun secret ne doit jamais être commité : prenez dès maintenant l’habitude d’un fichier \`.env\` listé dans le \`.gitignore\`.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Profil non technique : rien à installer

Vous construirez votre application avec **Bolt.new**, directement dans votre navigateur : aucune installation n’est nécessaire. Vous décrivez ce que vous voulez en langage naturel, l’outil génère l’application et vous en montre un aperçu.

Pour aujourd’hui :

1. Utilisez un navigateur récent et à jour, sur un ordinateur plutôt que sur une tablette.
2. Créez votre compte sur [bolt.new](https://bolt.new) avec l’adresse e-mail du projet.
3. Faites un premier essai sans enjeu : demandez une page d’accueil simple pour votre projet, observez le résultat, puis supprimez ce projet d’essai si vous le souhaitez.
4. Créez vos comptes Supabase et GitHub, même si vous ne les utiliserez qu’au module 6 : Bolt.new propose de s’y connecter pour stocker vos données et sauvegarder votre code, ce que vous mettrez en place à ce moment-là.

Comme pour tout assistant IA, ne décrivez jamais de vraies personnes dans vos demandes à Bolt.new : utilisez des exemples fictifs.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Profil reconversion : pas à pas et glossaire

Procédez dans cet ordre, un outil à la fois, en comptant quelques minutes par compte.

1. Choisissez ou créez l’adresse e-mail du projet, et activez-y la double authentification.
2. Installez ou activez un gestionnaire de mots de passe, puis enregistrez-y le mot de passe de cette adresse.
3. Créez vos comptes Claude et ChatGPT. Posez une première question simple à chacun, par exemple : « Explique-moi ce qu’est un MVP en cinq lignes. »
4. Créez votre compte Notion et la page « Mon MVP ».
5. Créez vos comptes GitHub, Supabase et Vercel. Vous n’avez rien à y faire pour l’instant.
6. Créez votre compte Bolt.new.
7. Notez dans votre journal de bord ce qui a fonctionné et ce qui vous a posé problème.

| Mot | Signification |
| --- | --- |
| Compte | Votre accès personnel à un service en ligne, protégé par un identifiant et un mot de passe |
| Navigateur | Le logiciel qui affiche les sites web (Chrome, Edge, Firefox, Safari…) |
| Prompt | La consigne écrite que vous donnez à un assistant IA |
| Base de données | L’endroit où une application range ses informations (utilisateurs, réservations…) |
| Dépôt | Le dossier d’un projet de code hébergé sur GitHub, avec tout son historique (on dit aussi *repository*) |
| Déploiement | L’action de mettre une application en ligne, accessible par une adresse web |
| Clé d’API | Un code secret qui permet à un logiciel d’utiliser un service : à protéger comme un mot de passe |

Un compte vous résiste ? Notez l’étape exacte et le message affiché, puis écrivez à votre formateur.
`,
        },
        {
          type: "checklist",
          title: "Mon environnement est prêt",
          items: [
            "Mon gestionnaire de mots de passe est en place et je connais mon mot de passe maître.",
            "La double authentification est activée sur l’adresse e-mail du projet.",
            "Mes comptes Claude et ChatGPT sont créés et j’ai vérifié leurs paramètres de confidentialité.",
            "Mes comptes GitHub, Notion, Supabase et Vercel sont créés, avec la double authentification quand elle est proposée.",
            "Mon outil de construction est prêt : Cursor et Claude Code (profil technique) ou Bolt.new (autres profils).",
            "Mon dossier projet et ma page Notion « Mon MVP » existent.",
            "Mon journal de bord est commencé.",
          ],
        },
        {
          type: "exercice",
          title: "Confirmez que votre environnement est prêt",
          instructions: `
Vérifiez que votre environnement est prêt, puis confirmez-le en quelques lignes.

1. Cochez chaque point de la checklist ci-dessus.
2. Dans le champ de réponse, indiquez : les comptes créés, l’outil de construction retenu (Cursor et Claude Code, ou Bolt.new), l’emplacement de votre dossier projet et le nom de votre page Notion.
3. Signalez tout blocage : compte refusé, installation impossible, matériel inadapté. Si un blocage persiste, écrivez aussi à votre formateur via la messagerie de Mon espace : n’attendez pas le module 6 pour le résoudre.

Ne communiquez ici aucun mot de passe, code de secours ou clé.
`,
          deliverable: "texte",
          estimatedMinutes: 20,
          review: "auto",
          rubric: [
            "Les comptes nécessaires à la formation sont créés.",
            "La double authentification est activée sur les comptes critiques (e-mail, GitHub, Supabase, Vercel).",
            "Le dossier projet et l’espace Notion existent.",
            "Les éventuels blocages sont signalés, sans aucun secret dans la réponse.",
          ],
        },
        {
          type: "quiz",
          title: "Quiz : le fonctionnement de la formation",
          graded: true,
          questions: [
            {
              prompt: "Vous venez de terminer une leçon. Comment la leçon suivante devient-elle accessible ?",
              options: [
                { label: "Elle se débloque quand la leçon en cours est terminée", correct: true },
                { label: "Toutes les leçons sont ouvertes dès le premier jour" },
                { label: "Votre formateur l’ouvre manuellement chaque semaine" },
                { label: "Elle s’ouvre automatiquement après sept jours" },
              ],
              explanation:
                "La progression est séquentielle : chaque étape s’appuie sur la précédente, la leçon suivante se débloque donc quand la leçon en cours est terminée.",
            },
            {
              prompt: "Vous êtes bloqué depuis une heure sur une erreur. Quelle est la meilleure démarche ?",
              options: [
                { label: "Écrire à votre formateur référent via la messagerie de Mon espace, en précisant la leçon, ce que vous avez essayé et le message d’erreur, sans aucun secret", correct: true },
                { label: "Attendre la fin du module pour en parler" },
                { label: "Envoyer votre mot de passe à votre formateur pour qu’il se connecte à votre place" },
                { label: "Sauter l’exercice et passer au module suivant" },
              ],
              explanation:
                "La messagerie de Mon espace est le canal d’assistance. Une question précise (contexte, essais, message d’erreur) obtient une réponse utile du premier coup. Ne transmettez jamais vos identifiants.",
            },
            {
              prompt: "Dans quel délai votre formateur référent s’engage-t-il à vous répondre ?",
              options: [
                { label: "Sous 48 heures ouvrées", correct: true },
                { label: "Dans l’heure, sept jours sur sept" },
                { label: "Uniquement lors d’une séance collective mensuelle" },
                { label: "À la fin de la formation" },
              ],
              explanation:
                "Le formateur référent répond sous 48 heures ouvrées. Anticipez : posez votre question dès qu’un blocage dure, sans attendre la veille d’une échéance.",
            },
            {
              prompt: "Qu’est-ce qui conditionne la délivrance du certificat de réalisation ?",
              options: [
                { label: "Atteindre la progression minimale indiquée dans le livret d’accueil, vos connexions et activités étant tracées", correct: true },
                { label: "Obtenir la note maximale à tous les quiz" },
                { label: "Avoir levé des fonds pour son projet" },
                { label: "Être inscrit, même sans jamais se connecter" },
              ],
              explanation:
                "Le certificat de réalisation atteste le suivi de la formation. Il repose sur une progression minimale, prouvée par les connexions et activités tracées.",
            },
            {
              prompt: "Lequel de ces prompts respecte les règles de sécurité vues dans cette leçon ?",
              options: [
                { label: "« Voici l’erreur affichée : Invalid API key [CLÉ_MASQUÉE]. Que dois-je vérifier ? »", correct: true },
                { label: "« Voici ma clé secrète de paiement complète, dis-moi si elle est valide. »" },
                { label: "« Résume ces notes : Mme Martin, avec son téléphone et son e-mail, m’a dit que… »" },
                { label: "« Voici le mot de passe de mon compte Supabase, connecte-toi pour moi. »" },
              ],
              explanation:
                "Seul le premier prompt masque le secret. Les autres exposent une clé, des données personnelles ou un mot de passe à un service externe.",
            },
            {
              prompt: "Vous avez collé par erreur une clé secrète dans une conversation avec un assistant IA. Que faites-vous ?",
              options: [
                { label: "Vous révoquez la clé et en générez une nouvelle depuis le service concerné", correct: true },
                { label: "Vous supprimez la conversation : cela suffit" },
                { label: "Rien : les assistants IA sont sécurisés" },
                { label: "Vous changez le mot de passe de votre messagerie" },
              ],
              explanation:
                "Une clé exposée doit être considérée comme compromise. Supprimer la conversation ne garantit pas qu’elle n’a pas été conservée ailleurs : seule la révocation la rend inutilisable.",
            },
          ],
        },
      ],
    },
  ],
};
