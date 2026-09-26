import type { SeedModule } from "../authoring";

export const M02: SeedModule = {
  key: "m02",
  title: "Bien prompter",
  summary:
    "Comprendre ce que fait (et ne fait pas) un assistant IA, puis rédiger des prompts précis pour produire des textes, du code et des tâches déléguées à des agents. Vous repartez avec votre propre bibliothèque de prompts.",
  objectives: [
    "Être capable d'expliquer le fonctionnement et les limites d'un assistant IA (contexte, hallucinations, confidentialité) pour décider quoi lui confier.",
    "Être capable de rédiger un prompt structuré (rôle, contexte, tâche, contraintes, format, exemples, critères de qualité) et de l'améliorer par itérations.",
    "Être capable de piloter un outil de code assisté par IA à partir d'une spécification, en exigeant un plan, des étapes courtes, des tests et une relecture des modifications.",
    "Être capable de déléguer une tâche à un agent IA en appliquant des règles de sécurité (permissions minimales, absence de secrets, validation humaine).",
    "Être capable de constituer et de maintenir une bibliothèque de prompts réutilisables et versionnés pour son projet.",
  ],
  lessons: [
    // ------------------------------------------------------------------ L01
    {
      key: "m02-l01",
      title: "Comment fonctionne un assistant IA (et ce qu'il ne sait pas faire)",
      summary:
        "Modèle de langage, contexte, hallucinations, date de connaissance et confidentialité : les bases pour utiliser Claude ou ChatGPT en connaissance de cause.",
      estimatedMinutes: 40,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez expliquer simplement comment un assistant IA produit ses réponses, où il se trompe, et quelles précautions prendre avant de lui confier vos données. On guide mieux un outil dont on comprend le fonctionnement.

## Un modèle de langage, c'est quoi ?

Claude (édité par Anthropic) et ChatGPT (édité par OpenAI) reposent sur des **modèles de langage** (en anglais *large language models*, ou LLM). Un modèle de langage est un programme entraîné sur une très grande quantité de textes pour une tâche précise : prédire la suite la plus plausible d'un texte.

Quand vous posez une question, le modèle ne « cherche » pas la réponse dans une base de données. Il la génère morceau par morceau. Ces morceaux s'appellent des **tokens** : un token correspond à un mot, un bout de mot ou un signe de ponctuation. À chaque étape, le modèle calcule quels tokens sont les plus probables compte tenu de tout ce qui précède, en choisit un, puis recommence.

Deux conséquences pratiques :

- **La génération est probabiliste.** La même question posée deux fois peut donner deux réponses différentes. C'est normal : relancez, comparez, gardez la meilleure.
- **Le modèle produit du texte plausible, pas du texte vérifié.** Une réponse bien rédigée n'est pas forcément exacte.

## Le contexte : tout ce que le modèle « voit »

Le **contexte** est l'ensemble du texte que le modèle prend en compte pour répondre : vos consignes, l'historique de la conversation, les fichiers joints, les résultats d'une recherche web. En dehors des fonctions de mémoire ou de consignes persistantes (leçon 3), le modèle ne sait de vous que ce qui figure dans ce contexte.

Ce contexte a une taille maximale, la **fenêtre de contexte**, mesurée en tokens. Elle est large sur les assistants actuels, mais pas infinie. Dans une conversation très longue, les éléments anciens peuvent être moins bien pris en compte, résumés ou sortir de la fenêtre. D'où une règle simple : **ce qui compte doit être dit clairement, et redit si la conversation s'allonge.**

## Les « hallucinations »

On appelle **hallucination** une réponse fausse présentée avec assurance : une référence qui n'existe pas, une fonction de code inventée, un chiffre sorti de nulle part, un article de loi mal cité. Ce n'est pas un bug ponctuel, c'est une conséquence directe de la génération probabiliste : le modèle comble les trous avec du plausible.

Le risque augmente quand :

- la question porte sur un sujet pointu, récent ou peu documenté ;
- vous demandez des chiffres, des dates, des noms propres ou des sources précises ;
- le prompt est flou et laisse le modèle deviner ce que vous voulez ;
- vous insistez pour obtenir une réponse coûte que coûte.

Parades : fournir vous-même les documents de référence, autoriser explicitement la réponse « je ne sais pas », demander de distinguer ce qui est sûr de ce qui est supposé, et vérifier toute information factuelle qui compte.

## La date de connaissance

Un modèle est entraîné sur des données collectées jusqu'à une certaine date : sa **date de coupure des connaissances**. Il ignore ce qui s'est passé ensuite : nouvelles versions d'outils, changements de tarifs, nouvelles règles. Pour un projet qui s'appuie sur des outils qui évoluent vite (Supabase, Next.js, Bolt.new…), c'est une vigilance permanente : le code ou les conseils générés peuvent correspondre à une version dépassée.

## Recherche web et fichiers joints

Les assistants proposent en général deux moyens d'élargir le contexte :

- **la recherche web** : l'assistant lance des recherches, lit des pages et cite ses sources. Utile pour l'actualité et la documentation récente. Vérifiez que les sources citées existent et disent bien ce qui est annoncé ;
- **les fichiers joints** : PDF, tableur, capture d'écran, document de spécification. Le modèle travaille alors sur *vos* informations plutôt que sur sa mémoire générale. C'est le moyen le plus simple de réduire les hallucinations.

> [!tip] Réflexe à prendre : quand la réponse dépend d'une information précise (documentation d'un outil, conditions tarifaires, texte de loi), donnez la source à l'assistant ou demandez-lui de la chercher et de la citer, plutôt que de le croire sur parole.
`,
        },
        {
          type: "video",
          title: "Ce qui se passe quand vous envoyez un prompt",
          durationMinutes: 6,
          script: `
- Accroche : la même question sur Créno posée deux fois, deux réponses différentes à l'écran. Pourquoi ?
- Schéma animé : prompt → découpage en tokens → prédiction du token suivant → réponse. Insister sur « plausible » plutôt que « vrai ».
- La fenêtre de contexte : illustration d'une longue conversation dont le début « s'efface » progressivement.
- Démonstration d'une hallucination : demander une référence précise qui n'existe pas, puis montrer comment la débusquer (demander la source, vérifier).
- Même question avec la documentation jointe ou la recherche web activée : réponse sourcée, plus fiable.
- Confidentialité : où se trouvent les réglages de confidentialité d'un assistant (sans montrer d'offre ni de prix) ; remplacer des données réelles par des données fictives.
- Conclusion : trois réflexes — donner le contexte, vérifier, ne rien coller de sensible.
`,
        },
        {
          type: "texte",
          personas: ["non_tech", "reconversion"],
          markdown: `
## Le vocabulaire essentiel

| Terme | En clair |
| --- | --- |
| IA générative | Une IA qui produit un contenu nouveau : texte, code, image |
| Modèle de langage (LLM) | Le « moteur » de l'assistant, entraîné à prédire la suite d'un texte |
| Prompt | La consigne que vous écrivez à l'IA |
| Token | Un petit morceau de texte (mot ou bout de mot), l'unité de mesure des modèles |
| Contexte | Tout ce que l'IA a sous les yeux pour vous répondre |
| Hallucination | Une information fausse présentée avec assurance |
| Agent | Une IA qui agit (ouvre des fichiers, navigue, exécute des commandes) pour atteindre un objectif |

Vous n'avez pas besoin de comprendre les mathématiques des modèles pour bien les utiliser, pas plus qu'il ne faut être mécanicien pour bien conduire. Ce qui compte : savoir ce que l'outil fait bien, où il se trompe, et comment le guider. C'est exactement l'objet de ce module.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Pour les profils techniques

- **Tokens et coûts** : via une API (l'accès programmatique au modèle), la facturation et les limites se comptent en tokens d'entrée et de sortie. Un prompt verbeux ou un historique complet renvoyé à chaque appel a un coût direct.
- **API sans état** : un appel d'API ne se souvient de rien. C'est votre code qui renvoie l'historique utile à chaque requête ; les interfaces de chat le font pour vous.
- **Message système** : les API distinguent en général les consignes de cadrage (message système) des messages de l'utilisateur. C'est l'équivalent programmatique des consignes persistantes.
- **Paramètres d'échantillonnage** : la *température* et les paramètres voisins règlent la part d'aléatoire de la génération. Utile pour stabiliser une extraction de données, mais aucun réglage ne supprime les hallucinations.
- **Sorties structurées** : demandez du JSON conforme à un schéma, et validez-le toujours côté code.

Vous intégrerez un modèle de langage dans un produit au module 6.
`,
        },
        {
          type: "texte",
          markdown: `
## Confidentialité : ce que vous tapez n'est pas anodin

Tout ce que vous saisissez dans un assistant est envoyé aux serveurs de l'éditeur. Selon l'outil, le type de compte et vos réglages, ces échanges peuvent être conservés un certain temps, et parfois utilisés pour améliorer les modèles. Ces règles évoluent : lisez les paramètres de confidentialité et les conditions d'utilisation de l'outil au moment où vous l'utilisez.

Repères durables :

- **Réglages** : la plupart des assistants proposent des options sur l'historique et sur l'utilisation de vos conversations pour l'entraînement. Vérifiez-les dès la création du compte.
- **Comptes professionnels** : les offres destinées aux entreprises prévoient généralement des engagements contractuels plus stricts sur l'usage des données et l'administration des accès. Si vous devez traiter des données de clients, c'est ce type de compte qu'il faut examiner.
- **Données à ne jamais coller** : mots de passe, clés d'API (les codes secrets qui donnent accès à un service ou à votre base de données), données bancaires, données de santé, fichiers clients nominatifs. Remplacez-les par des données fictives ou anonymisées (« Client A, 34 ans, Lyon »).

## Et le RGPD ?

Le **RGPD** (Règlement général sur la protection des données) encadre le traitement des données personnelles des personnes situées dans l'Union européenne. Coller une liste de clients dans un assistant IA est un traitement de données personnelles : il faut une raison légitime (une « base légale »), informer les personnes, limiter les données au strict nécessaire et savoir où elles partent, y compris hors de l'Union européenne. La CNIL publie des recommandations sur l'IA et les données personnelles : consultez [cnil.fr](https://www.cnil.fr). Ces informations sont générales et ne constituent pas un conseil juridique ; pour un cas précis, faites-vous accompagner.

Pour Créno, concrètement : on fait travailler l'IA sur des profils de coachs et de clients **fictifs**, jamais sur l'export réel des réservations.

## Claude ou ChatGPT ?

Les deux assistants ont beaucoup en commun : conversation en langage naturel, analyse de fichiers, recherche web, génération de code, consignes persistantes, déclinaisons dédiées au code (Claude Code d'un côté, Codex de l'autre) et modes agents. Leurs forces relatives évoluent à chaque nouvelle version, et les comparatifs publiés vieillissent vite.

La méthode fiable : **tester sur vos propres tâches**. Choisissez trois tâches réelles de votre projet, soumettez le même prompt aux deux outils, et comparez selon des critères fixés à l'avance : exactitude, respect des consignes, clarté, temps de correction nécessaire. Rien n'empêche ensuite d'utiliser les deux, selon la tâche.
`,
        },
        {
          type: "checklist",
          title: "Avant de coller un contenu dans un assistant IA",
          items: [
            "Le contenu ne contient ni mot de passe, ni clé d'API, ni donnée bancaire.",
            "Les noms, e-mails et téléphones de personnes réelles ont été remplacés par des données fictives.",
            "J'ai vérifié les réglages de confidentialité de mon compte (historique, utilisation pour l'entraînement).",
            "Pour des données clients réelles, j'utilise un compte professionnel dont j'ai lu les engagements.",
            "Je sais quelles informations de la réponse je devrai vérifier (chiffres, dates, sources).",
            "Si la réponse dépend d'une information récente, j'active la recherche web ou je joins la source.",
          ],
        },
        {
          type: "quiz",
          title: "Auto-évaluation : les bases",
          questions: [
            {
              prompt: "Pourquoi la même question posée deux fois peut-elle donner deux réponses différentes ?",
              options: [
                { label: "Parce que l'assistant a appris de votre première question entre-temps" },
                { label: "Parce que la génération est probabiliste : le modèle choisit parmi des suites plausibles", correct: true },
                { label: "Parce que la première réponse était forcément fausse" },
                { label: "Parce que l'assistant consulte une base de données différente à chaque fois" },
              ],
              explanation:
                "Le modèle génère sa réponse token par token en choisissant parmi les suites les plus probables. Deux essais peuvent donc différer : c'est une occasion de comparer.",
            },
            {
              prompt: "Qu'appelle-t-on une « hallucination » ?",
              options: [
                { label: "Une réponse fausse présentée avec assurance", correct: true },
                { label: "Une réponse trop longue" },
                { label: "Un refus de répondre" },
                { label: "Une erreur d'affichage de l'interface" },
              ],
              explanation:
                "Une hallucination est un contenu plausible mais faux (source inventée, chiffre erroné, fonction inexistante). Elle se repère par la vérification sur des sources fiables.",
            },
            {
              prompt: "Vous voulez que l'assistant respecte la documentation actuelle de Supabase. Quelle est la meilleure approche ?",
              options: [
                { label: "Lui faire confiance : il connaît forcément la dernière version" },
                { label: "Lui demander de répondre plus vite" },
                { label: "Joindre la page de documentation ou activer la recherche web, et demander de citer la source", correct: true },
                { label: "Reposer la question jusqu'à obtenir la réponse attendue" },
              ],
              explanation:
                "Le modèle a une date de coupure des connaissances. Lui fournir la documentation récente (ou le laisser la chercher en citant ses sources) réduit le risque d'information dépassée.",
            },
            {
              prompt: "Quel contenu pouvez-vous coller dans un assistant sans risque particulier ?",
              options: [
                { label: "L'export de vos réservations avec les téléphones des clients" },
                { label: "La clé secrète de votre compte de paiement, pour qu'il configure l'intégration" },
                { label: "Le mot de passe de votre base de données" },
                { label: "Un profil client fictif (« Client A, 34 ans, Lyon ») pour tester un message", correct: true },
              ],
              explanation:
                "Les secrets et les données personnelles réelles ne doivent jamais être collés dans un prompt. Des données fictives ou anonymisées suffisent pour travailler.",
            },
          ],
        },
        {
          type: "exercice",
          title: "Tester deux assistants sur vos propres tâches",
          instructions: `
Objectif : choisir vos outils sur la base de vos propres observations, pas sur des comparatifs.

1. Choisissez **trois tâches réelles** de votre projet, de nature différente. Exemple Créno : rédiger le texte d'accueil de la page coach ; résumer cinq verbatims d'entretiens fictifs ; proposer la liste des informations à enregistrer pour une réservation.
2. Avant de tester, écrivez vos **critères de comparaison** (trois au maximum) : exactitude, respect des consignes, ton, temps de correction nécessaire…
3. Soumettez **exactement le même prompt** à Claude et à ChatGPT. Une version gratuite suffit généralement pour cet exercice. N'utilisez que des données fictives.
4. Notez chaque réponse de 1 à 5 par critère, et relevez les erreurs ou approximations éventuelles.
5. Ouvrez les paramètres de confidentialité de chaque outil et notez les réglages que vous avez choisis.

Livrable (texte) : un tableau tâche × outil × notes, vos réglages de confidentialité, et deux phrases de conclusion : quel outil pour quelle tâche, à ce stade.
`,
          deliverable: "texte",
          estimatedMinutes: 20,
          review: "auto",
          rubric: [
            "Trois tâches réelles et variées du projet",
            "Critères de comparaison définis avant le test",
            "Même prompt soumis aux deux outils, sans donnée personnelle réelle",
            "Réglages de confidentialité vérifiés et notés",
            "Conclusion appuyée sur les observations",
          ],
        },
      ],
    },

    // ------------------------------------------------------------------ L02
    {
      key: "m02-l02",
      title: "Anatomie d'un bon prompt",
      summary:
        "Les sept composantes d'un prompt efficace, un avant / après sur Créno et des gabarits prêts à copier pour votre projet.",
      estimatedMinutes: 60,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez construire un prompt complet en sept composantes et transformer une demande vague en consigne précise, testée sur votre projet.

## Le principe : briefer l'IA comme un prestataire compétent

Imaginez que vous confiez une mission à un freelance brillant qui ne connaît ni vous, ni votre projet, ni vos clients. Il fera ce que vous demandez, avec ce que vous lui donnez. Un **prompt** (la consigne que vous écrivez à l'IA) fonctionne de la même façon. La plupart des réponses décevantes viennent d'un brief incomplet, pas d'un outil défaillant.

## Les sept composantes

| Composante | Question à se poser | Exemple (Créno) |
| --- | --- | --- |
| Rôle | Quel expert doit répondre ? | « Tu es rédacteur web spécialisé dans les applications pour indépendants. » |
| Contexte | Que doit-il savoir de la situation ? | « Créno est une application de réservation pour coachs sportifs indépendants… » |
| Tâche | Qu'attend-on exactement ? | « Rédige le texte de la page d'accueil destinée aux coachs. » |
| Contraintes | Quelles limites respecter ? | « 150 mots maximum, vouvoiement, aucun superlatif. » |
| Format de sortie | Sous quelle forme ? | « Un titre, un sous-titre, trois bénéfices en liste, un bouton d'action. » |
| Exemples | À quoi ressemble un bon résultat ? | Une phrase dont vous aimez le ton. |
| Critères de qualité | Comment juger le résultat ? | « Un coach doit comprendre en cinq secondes ce qu'il y gagne. » |

Toutes les composantes ne sont pas utiles à chaque fois : « traduis cette phrase en anglais » n'en demande que deux. Mais dès que le résultat compte, passez la liste en revue.

- **Rôle.** Il oriente le vocabulaire, le niveau de détail et les réflexes de l'IA. « Tu es product manager » ne produit pas la même liste de fonctionnalités que « tu es développeur ». Un rôle ne donne pas de compétences magiques : il fixe un point de vue.
- **Contexte.** C'est la composante la plus sous-estimée. Qui sont vos utilisateurs ? Où en est le projet ? Qu'avez-vous déjà essayé ? Qu'est-ce qui est hors sujet ? Plus le contexte est précis, moins l'IA comble les trous avec des généralités.
- **Tâche.** Un verbe d'action et un livrable : rédige, liste, compare, corrige, propose trois options. Une seule tâche principale par prompt ; si vous en avez quatre, découpez (leçon suivante).
- **Contraintes.** Longueur, ton, public, vocabulaire interdit, technologies imposées. Préférez les contraintes mesurables (« phrases de moins de 20 mots ») aux formules vagues (« pas trop long »).
- **Format de sortie.** Tableau, liste, e-mail, plan en sections, JSON (un format de données structuré, lisible par un programme)… Le format rend la réponse directement utilisable et facilite la comparaison entre deux versions.
- **Exemples.** Un exemple vaut mieux qu'une longue description du ton attendu. Précisez s'il faut s'en inspirer ou le reproduire.
- **Critères de qualité.** Dites à l'IA comment vous jugerez sa réponse. Elle peut alors la vérifier avant de vous la rendre.

> [!info] Tutoyer ou vouvoyer l'IA n'a pas d'importance majeure. Dans cette formation, les prompts tutoient l'assistant ; choisissez votre convention et restez cohérent.
`,
        },
        {
          type: "texte",
          markdown: `
## Avant / après : le cas Créno

Voici un prompt typique de début de projet :

\`\`\`text
Écris-moi la page d'accueil de mon app de réservation pour coachs.
\`\`\`

Résultat probable : un texte générique (« Révolutionnez votre activité ! »), trop long, sans lien avec les vrais utilisateurs. Vous passerez plus de temps à corriger qu'à écrire.

La version structurée :

\`\`\`text
Rôle : tu es rédacteur web spécialisé dans les applications pour indépendants.

Contexte : Créno est une application web qui permet aux coachs sportifs
indépendants de publier leurs créneaux et d'être payés en ligne dès la
réservation. Nos premiers utilisateurs sont des coachs de fitness et de yoga
qui gèrent aujourd'hui leurs réservations par SMS et encaissent en espèces
ou par virement. Leurs irritants : les annulations de dernière minute et les
relances de paiement.

Tâche : rédige le texte de la page d'accueil destinée aux coachs.

Contraintes : 150 mots maximum, vouvoiement, ton direct et chaleureux,
aucun superlatif, aucune promesse chiffrée.

Format : un titre (8 mots max), un sous-titre (20 mots max), trois bénéfices
en liste (une ligne chacun), le libellé d'un bouton d'action.

Exemple de ton : « Vos créneaux en ligne, vos paiements à l'heure. »

Critères de qualité : un coach comprend en cinq secondes ce qu'il y gagne ;
chaque bénéfice répond à un irritant cité dans le contexte.
Propose deux versions différentes.
\`\`\`

Ce prompt est plus long, mais il se relit en une minute et produit un résultat exploitable dès le premier essai. Il est aussi **réutilisable** : changez le contexte, et il sert pour la page destinée aux clients.

> [!tip] Demander deux ou trois versions est une astuce simple : vous comparez au lieu de subir, et vous pouvez combiner le meilleur de chacune.

## Les erreurs les plus fréquentes

- **Le prompt télégraphique** : trois mots, et l'IA devine le reste.
- **Le prompt fourre-tout** : cinq tâches dans un seul message, dont aucune n'est bien traitée.
- **Le contexte implicite** : « comme on a dit » alors que l'information ne figure pas dans la conversation.
- **Le format oublié** : un pavé de texte là où il fallait un tableau.
- **L'absence de relecture** : copier-coller la réponse sans la vérifier.
`,
        },
        {
          type: "prompt",
          title: "Gabarit de prompt en sept composantes",
          tool: "Tout assistant IA",
          prompt: `
Rôle : tu es [EXPERTISE] qui s'adresse à [PUBLIC].

Contexte : [VOTRE PROJET EN 3 À 5 PHRASES : produit, utilisateurs, situation actuelle, ce qui a déjà été fait].

Tâche : [VERBE D'ACTION + LIVRABLE].

Contraintes :
- [LONGUEUR]
- [TON / REGISTRE]
- [CE QU'IL NE FAUT PAS FAIRE]

Format de sortie : [TABLEAU / LISTE / SECTIONS / JSON…].

Exemple de résultat attendu : [EXEMPLE, OU « aucun »].

Critères de qualité : [COMMENT JE JUGERAI LA RÉPONSE].

Si une information te manque pour bien répondre, pose-moi tes questions avant de commencer.
`,
          tips: "Remplacez chaque élément entre crochets. Supprimez les rubriques inutiles pour les demandes simples. Conservez ce gabarit dans votre bibliothèque de prompts (leçon 6).",
        },
        {
          type: "prompt",
          title: "Faire diagnostiquer un prompt existant",
          tool: "Tout assistant IA",
          prompt: `
Voici un prompt que j'utilise pour mon projet :
---
[COLLEZ VOTRE PROMPT]
---
Contexte du projet : [2 À 3 PHRASES].

Analyse ce prompt selon sept composantes : rôle, contexte, tâche, contraintes, format de sortie, exemples, critères de qualité. Pour chacune, indique si elle est présente, absente ou floue, et pourquoi c'est un problème.
Propose ensuite une version réécrite, en signalant entre crochets les informations que je dois compléter moi-même. N'invente aucune information sur mon projet.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Votre expertise métier est votre meilleur atout

Vous connaissez vos clients, leurs mots, leurs irritants : c'est exactement ce qui manque à l'IA. Avant de rédiger un prompt, notez trois éléments que vous seul connaissez : une phrase typique d'un client, une objection fréquente, une règle métier (pour Créno : « un coach refuse les annulations moins de 24 h avant la séance »). Glissez-les dans le contexte : la réponse passe de générique à pertinente. Pour bien prompter, vous n'avez pas besoin de vocabulaire technique, vous avez besoin de précision.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Un prompt est une spécification

Vous rédigez déjà des tickets, des contrats d'interface et des tests : appliquez les mêmes réflexes. Entrées explicites, sortie typée (un JSON conforme à un schéma que vous fournissez), cas limites énumérés, critères d'acceptation vérifiables. Un prompt à sortie structurée se teste : comparez deux versions d'un même prompt sur les mêmes entrées, comme un test de non-régression. Et méfiez-vous du biais « l'IA a compris » : ce qui n'est pas écrit n'existe pas pour elle.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Pas à pas : la méthode des trois questions

Si sept composantes vous semblent beaucoup, commencez par trois questions, toujours dans cet ordre : **pour qui ?** (qui lira le résultat), **quoi ?** (le livrable attendu), **sous quelle forme ?** (longueur, format). Exemple : « Pour des coachs sportifs indépendants, écris une présentation de mon service de réservation, en cinq phrases simples. » Quand ce réflexe est acquis, ajoutez le contexte, puis les exemples. Chaque prompt raté vous apprend quelle information manquait : c'est ainsi que l'on progresse.
`,
        },
        {
          type: "checklist",
          title: "Relire son prompt avant de l'envoyer",
          items: [
            "Le rôle attendu est précisé si le résultat dépend d'une expertise.",
            "Le contexte décrit le projet, les utilisateurs et la situation actuelle.",
            "La tâche tient en une phrase avec un verbe d'action.",
            "Les contraintes (longueur, ton, interdits) sont explicites et mesurables.",
            "Le format de sortie est indiqué.",
            "Un exemple est fourni quand le ton ou la structure comptent.",
            "Les critères de qualité sont écrits.",
            "Le prompt ne contient aucune donnée personnelle réelle ni aucun secret.",
          ],
        },
        {
          type: "exercice",
          title: "Réécrire trois prompts de votre projet",
          instructions: `
Objectif : transformer trois demandes réelles en prompts complets, et mesurer la différence.

1. Retrouvez (ou écrivez) **trois prompts courts** que vous avez utilisés ou utiliseriez pour votre projet, sur trois usages différents : un texte destiné à vos utilisateurs, une tâche d'analyse (résumer, comparer, prioriser), une tâche liée au produit (fonctionnalités, parcours, données).
2. Soumettez chaque prompt tel quel à un assistant et conservez la réponse.
3. Réécrivez chaque prompt avec le gabarit en sept composantes. Vous pouvez retirer une composante, à condition d'expliquer pourquoi.
4. Soumettez chaque version réécrite dans une **nouvelle conversation**, pour que l'historique n'influence pas le résultat.
5. Comparez les deux réponses : qu'est-ce qui s'est amélioré ? Qu'est-ce qui manque encore ?

Exemple Créno pour l'usage « produit » : le prompt initial « Quelles fonctionnalités pour mon app ? » devient un prompt qui précise les deux rôles (coach, client), le périmètre du MVP (publier des créneaux, réserver, payer, rappel la veille), la contrainte « huit fonctionnalités maximum, classées par priorité » et le format « tableau fonctionnalité / rôle / priorité / justification ».

Livrable (texte) : pour chacun des trois prompts, la version initiale, la version réécrite et trois lignes d'analyse.
`,
          deliverable: "texte",
          estimatedMinutes: 40,
          review: "formateur",
          rubric: [
            "Trois usages différents, tous liés au projet réel",
            "Les prompts réécrits contiennent au minimum rôle, contexte, tâche, contraintes et format",
            "Aucune donnée personnelle réelle ni secret dans les prompts",
            "L'analyse compare concrètement les réponses avant / après",
            "Les limites restantes sont identifiées",
          ],
        },
      ],
    },

    // ------------------------------------------------------------------ L03
    {
      key: "m02-l03",
      title: "Techniques avancées",
      summary:
        "Exemples, décomposition, questions préalables, itération, critique, balises, consignes persistantes et reprise des longues conversations.",
      estimatedMinutes: 60,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez utiliser huit techniques qui transforment un assistant IA en véritable partenaire de travail, et les combiner sur une tâche réelle de votre projet.

## 1. Donner des exemples (few-shot)

Le *few-shot* (« quelques exemples ») consiste à montrer à l'IA deux à cinq exemples du résultat attendu avant de lui en demander un nouveau. C'est souvent la technique la plus efficace quand le format ou le ton sont difficiles à décrire.

Exemple Créno : pour les messages de rappel envoyés la veille d'une séance, plutôt que de décrire le ton, donnez deux messages que vous jugez réussis, puis demandez-en trois nouveaux pour des cas différents (première séance, séance à domicile, séance en extérieur). Variez vos exemples, sinon l'IA les recopie presque à l'identique.

## 2. Décomposer une tâche

Une tâche complexe demandée en un seul prompt donne un résultat moyen partout. Découpez-la en étapes et validez chacune avant de passer à la suivante. Pour construire la liste des fonctionnalités de Créno, au lieu de « fais-moi le backlog », enchaînez :

1. lister les tâches que réalise un coach dans sa semaine ;
2. identifier celles que l'application doit prendre en charge au lancement ;
3. les transformer en user stories (module 1) ;
4. les prioriser selon la valeur et l'effort.

À chaque étape, vous corrigez le tir : les erreurs ne se propagent pas.

## 3. Faire poser des questions avant de répondre

Quand vous n'êtes pas sûr d'avoir tout dit, terminez votre prompt par : « Avant de répondre, pose-moi les questions nécessaires pour bien faire ce travail. » L'IA identifie les informations manquantes (public, contraintes, priorités…). C'est aussi un excellent moyen de découvrir ce que vous n'aviez pas pensé à préciser.

## 4. Itérer et affiner

Le premier résultat est un brouillon. Au lieu de tout reformuler, donnez un retour ciblé, comme à un collaborateur : « Garde la structure, raccourcis le deuxième paragraphe de moitié, remplace le jargon par des mots du quotidien. » Un retour précis (quoi garder, quoi changer, pourquoi) converge vite ; un retour vague (« refais, c'est pas terrible ») tourne en rond. Si le résultat ne progresse plus après trois ou quatre échanges, le problème vient souvent du prompt initial : repartez d'une nouvelle conversation avec un prompt corrigé.

## 5. Faire critiquer et vérifier

Critiquer un texte est souvent plus facile, pour l'IA comme pour nous, que le réussir du premier coup. Exploitez-le en deux temps : générer, puis demander une relecture critique selon des critères explicites (clarté, exactitude, cohérence avec le contexte, risques). Demandez aussi de lister les affirmations factuelles avec, pour chacune, un niveau de certitude et un moyen de la vérifier.

> [!warning] Une IA qui relit sa propre réponse peut confirmer ses propres erreurs. Pour une information importante (juridique, chiffrée, technique), la vérification finale se fait par vous, sur une source officielle.
`,
        },
        {
          type: "texte",
          markdown: `
## 6. Structurer un long prompt avec des balises

Quand un prompt mélange consignes, documents et exemples, l'IA peut confondre ce qui est une instruction et ce qui est une donnée. Des **balises** (des étiquettes qui encadrent chaque partie) lèvent l'ambiguïté. La documentation d'Anthropic recommande cette pratique pour Claude, et elle fonctionne aussi avec les autres assistants.

\`\`\`text
<contexte>
Créno : application de réservation et de paiement pour coachs sportifs
indépendants. MVP : publication de créneaux, réservation, paiement en ligne,
rappel automatique la veille.
</contexte>

<document>
[Notes d'entretiens anonymisées]
</document>

<consignes>
1. Identifie les cinq problèmes les plus cités par les coachs.
2. Pour chacun, cite une phrase du document qui l'illustre.
3. N'invente aucun problème absent du document.
</consignes>

<format>
Tableau : problème | citation | fréquence (souvent / parfois / rarement)
</format>
\`\`\`

Les noms des balises sont libres : choisissez des mots clairs, réutilisez-les d'un prompt à l'autre, et faites-y référence dans les consignes (« en t'appuyant uniquement sur le document »).

## 7. Les consignes persistantes

Répéter à chaque conversation « je travaille sur Créno, application pour coachs… » est fastidieux. La plupart des assistants permettent d'enregistrer des **consignes persistantes** : des instructions, et parfois des documents, pris en compte automatiquement dans toutes les conversations d'un espace de travail ou de votre compte. Selon l'outil, cela prend la forme d'un espace de projet avec ses fichiers de référence, d'instructions personnalisées ou d'une mémoire. Les noms et l'emplacement de ces réglages évoluent : consultez l'aide de votre assistant.

Que mettre dans ces consignes :

- le projet en cinq lignes (problème, cible, proposition de valeur) ;
- le périmètre du MVP, et ce qui est explicitement hors périmètre ;
- votre profil (« je ne code pas, explique les termes techniques » ou « je suis développeur, va droit au but ») ;
- vos préférences de ton et de format ;
- les documents de référence : PRD, glossaire, charte éditoriale.

Tenez-les à jour : une consigne obsolète est pire que pas de consigne.

## 8. Gérer une longue conversation

Au fil d'une longue conversation, les consignes du début se diluent et les versions successives se mélangent. Signes d'alerte : l'IA réintroduit une idée écartée, oublie une contrainte ou mélange deux versions d'un document.

La parade : **repartir d'un résumé**. Demandez un résumé de passation (décisions prises, état du livrable, points ouverts, contraintes), relisez-le, corrigez-le, puis collez-le dans une nouvelle conversation. Vous repartez avec un contexte propre et court. Faites-le à chaque changement de sujet, ou dès que la conversation devient difficile à suivre.
`,
        },
        {
          type: "prompt",
          title: "Faire poser les questions avant de répondre",
          tool: "Tout assistant IA",
          prompt: `
Je veux [OBJECTIF] pour mon projet : [DESCRIPTION EN 2 PHRASES].

Avant de produire quoi que ce soit, pose-moi les questions dont tu as besoin pour faire un travail de qualité : 10 au maximum, classées de la plus importante à la moins importante. Pour chaque question, explique en une ligne pourquoi elle compte.
Attends mes réponses avant de commencer.
`,
          tips: "Répondez à chaque question, même brièvement ; si une question ne vous concerne pas, dites-le. Les questions qui reviennent souvent indiquent ce qu'il faut ajouter à vos consignes persistantes.",
        },
        {
          type: "prompt",
          title: "Relecture critique en deux temps",
          tool: "Tout assistant IA",
          prompt: `
Relis ta réponse précédente comme un relecteur exigeant.

1. Évalue-la selon ces critères : [CRITÈRE 1], [CRITÈRE 2], [CRITÈRE 3]. Donne une note sur 5 et une justification pour chacun.
2. Liste les affirmations factuelles (chiffres, noms, fonctionnalités d'outils, règles juridiques) et indique pour chacune : certaine, probable ou à vérifier, avec la source officielle à consulter.
3. Propose une version corrigée qui règle les trois problèmes les plus importants.

Ne te contente pas de valider : cherche activement les faiblesses.
`,
        },
        {
          type: "prompt",
          title: "Résumé de passation pour repartir d'une conversation propre",
          tool: "Tout assistant IA",
          prompt: `
Nous allons poursuivre ce travail dans une nouvelle conversation. Rédige un résumé de passation autonome, compréhensible sans l'historique :
- Objectif du travail
- Contexte du projet (5 lignes maximum)
- Décisions prises, et pourquoi
- Pistes écartées (pour ne pas y revenir)
- État actuel du livrable (colle la dernière version complète)
- Contraintes à respecter
- Prochaines étapes et questions ouvertes

Sois factuel et n'ajoute rien qui n'a pas été décidé.
`,
          tips: "Relisez et corrigez ce résumé avant de le coller dans la nouvelle conversation : il devient votre nouvelle source de vérité.",
        },
        {
          type: "prompt",
          title: "Prompt long structuré par balises",
          tool: "Claude",
          prompt: `
<contexte>
[VOTRE PROJET EN 3 À 5 PHRASES]
</contexte>

<document>
[DOCUMENT À ANALYSER, ANONYMISÉ]
</document>

<consignes>
1. [PREMIÈRE ÉTAPE]
2. [DEUXIÈME ÉTAPE]
3. Appuie-toi uniquement sur le contenu de la balise document. Si une information manque, écris « non précisé ».
</consignes>

<format>
[FORMAT DE SORTIE ATTENDU]
</format>
`,
          tips: "Fonctionne aussi dans ChatGPT et dans les autres assistants. Gardez les mêmes noms de balises d'un prompt à l'autre.",
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : sorties structurées et chaînage

Le few-shot est particulièrement efficace pour l'extraction de données : donnez deux paires entrée / sortie en JSON, puis la nouvelle entrée. Exigez une sortie conforme à un schéma et validez-la dans votre code : ne supposez jamais que le JSON reçu est valide. La décomposition devient du **chaînage** : la sortie d'un prompt alimente le suivant, ce que vous automatiserez au module 6 avec n8n ou dans votre code. Versionnez ces prompts comme du code et testez-les sur un petit jeu d'entrées de référence.
`,
        },
        {
          type: "texte",
          personas: ["non_tech", "reconversion"],
          markdown: `
## Par où commencer ?

Huit techniques d'un coup, c'est beaucoup. Commencez par deux : **faire poser des questions** (technique 3) et **donner un retour précis** (technique 4). Elles améliorent déjà la plupart de vos échanges, sans rien à installer ni à apprendre. Ajoutez les balises le jour où vous collez un long document, et les consignes persistantes dès que vous travaillez plusieurs jours sur le même sujet.
`,
        },
        {
          type: "exercice",
          title: "Combiner les techniques sur une vraie tâche",
          instructions: `
Choisissez une tâche consistante de votre projet, que vous devez de toute façon réaliser : rédiger la description de votre offre, synthétiser des retours d'utilisateurs potentiels, lister les écrans de votre application…

1. **Consignes persistantes** : rédigez les consignes de votre projet (description, périmètre, profil, préférences) et enregistrez-les dans votre assistant si la fonction existe ; sinon, gardez-les dans un document à coller en début de conversation.
2. **Questions préalables** : lancez la tâche en demandant à l'IA de vous poser ses questions d'abord, puis répondez-y.
3. **Structure** : si vous fournissez un document (anonymisé), encadrez-le avec des balises.
4. **Itération** : faites au moins deux retours ciblés (quoi garder, quoi changer, pourquoi).
5. **Critique** : utilisez le prompt de relecture critique, puis vérifiez vous-même au moins une affirmation factuelle sur une source officielle.
6. **Passation** : terminez par un résumé de passation.

Livrable (texte) : vos consignes persistantes, les questions posées par l'IA (et ce qu'elles vous ont appris), vos deux retours d'itération, le résumé de passation, et trois lignes de bilan : quelle technique a le plus changé le résultat ?
`,
          deliverable: "texte",
          estimatedMinutes: 40,
          review: "formateur",
          rubric: [
            "Les consignes persistantes décrivent le projet, le périmètre et le profil de l'utilisateur",
            "Au moins quatre techniques de la leçon sont appliquées et identifiables",
            "Les retours d'itération sont précis (quoi garder, quoi changer, pourquoi)",
            "Au moins une affirmation factuelle est vérifiée sur une source externe",
            "Le bilan est personnel et argumenté",
          ],
        },
      ],
    },

    // ------------------------------------------------------------------ L04
    {
      key: "m02-l04",
      title: "Prompter pour produire du code",
      summary:
        "De la user story au code relu : spécification, fichiers de contexte, plan, petites étapes, tests et relecture des diffs, selon le type d'outil.",
      estimatedMinutes: 65,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez rédiger des prompts qui produisent du code utile et maîtrisé : à partir d'une spécification, avec un plan validé, par petites étapes testées, en relisant chaque modification avant de l'enregistrer.

## Le piège du « fais-moi l'appli »

Les outils de code assisté par IA peuvent générer en quelques minutes une application qui semble fonctionner. Le risque n'est pas qu'ils échouent, c'est qu'ils réussissent *en apparence*. Une page qui s'affiche peut cacher une faille de sécurité, une règle métier oubliée ou une base de données mal structurée. Plus le prompt est vague, plus l'outil prend de décisions à votre place, sans vous le dire.

La règle de cette leçon : **vous restez le chef de projet.** L'IA écrit le code ; vous décidez de ce qu'il doit faire et vous vérifiez qu'il le fait.

## Partir d'une spécification

Au module 1, vous avez rédigé un PRD (le document qui décrit le produit à construire) et des user stories. C'est le meilleur point de départ d'un prompt de code. Une **user story** décrit un besoin du point de vue de l'utilisateur ; les **critères d'acceptation** listent les conditions vérifiables pour considérer la fonctionnalité terminée.

\`\`\`text
User story : en tant que client, je veux annuler une réservation depuis
mon espace, afin de libérer le créneau si je ne peux pas venir.

Critères d'acceptation :
- Le bouton « Annuler » n'apparaît que sur mes réservations à venir.
- L'annulation est possible jusqu'à 24 h avant la séance ; au-delà, le
  bouton est désactivé et un message explique pourquoi.
- Après annulation, le créneau redevient disponible pour les autres clients.
- Le coach voit la réservation au statut « annulée ».
- Un client ne peut jamais annuler la réservation d'un autre client.
\`\`\`

Chaque critère est testable, automatiquement ou à la main. Donnez ce bloc tel quel à l'outil : il sait *quoi* construire et *comment* vérifier que c'est fait. Le dernier critère est une règle de sécurité : vous verrez au module 4 comment la garantir dans la base de données avec la sécurité par lignes (RLS) de Supabase.
`,
        },
        {
          type: "video",
          title: "De la user story au code relu",
          durationMinutes: 7,
          script: `
- Ouverture : le même besoin Créno (annuler une réservation) demandé de deux façons : « ajoute l'annulation » contre user story + critères d'acceptation.
- Présentation du fichier de contexte du projet (CLAUDE.md / AGENTS.md) : ce qu'il contient, pourquoi il est court.
- Demande d'un plan à un agent de code ; correction d'un point du plan à l'écran (la règle des 24 h avait été oubliée).
- Lancement de la première étape : tests générés à partir des critères, exécution des tests.
- Lecture commentée du diff : fichiers modifiés, repérage d'une modification non demandée, demande d'annulation.
- Demande d'explication du diff en langage courant (réflexe utile aux profils non techniques).
- Commit avec un message clair ; rappel : jamais de commit sans comprendre ce qu'il contient.
- Conclusion : les trois postures (générer, coécrire, déléguer) et renvoi au module 6.
`,
        },
        {
          type: "texte",
          markdown: `
## Les fichiers de contexte du projet

Un outil de code ne se souvient pas de la séance de la veille. Pour lui transmettre durablement les règles du projet, on place des **fichiers de contexte** dans le dépôt de code (le dossier du projet, versionné avec Git, que vous créerez au module 6) :

- \`CLAUDE.md\` : lu automatiquement par Claude Code au démarrage d'une session ;
- \`AGENTS.md\` : une convention ouverte, lue notamment par Codex et par d'autres outils ;
- **les règles de projet de Cursor** : des consignes enregistrées dans la configuration du projet et appliquées par l'assistant de l'éditeur (voir la documentation de Cursor pour leur format actuel).

Le principe est le même partout : un fichier texte, en Markdown, qui dit ce qu'un nouveau développeur devrait savoir avant de toucher au code. Exemple pour Créno :

\`\`\`markdown
## Projet
Créno : réservation et paiement de séances pour coachs sportifs indépendants.
Rôles : coach, client. Entités : profiles, slots, bookings, payments.

## Stack
Next.js, React, TypeScript, Supabase (Postgres, Auth, RLS), Stripe, Vercel.

## Règles
- Toute table a la sécurité par lignes (RLS) activée, avec des politiques explicites.
- Les clés secrètes (Stripe, clé de service Supabase) restent côté serveur.
- Toute nouvelle fonctionnalité est livrée avec ses tests.
- Aucune nouvelle dépendance sans validation.

## Commandes
- Lancer en local : pnpm dev
- Vérifier : pnpm typecheck && pnpm lint && pnpm test
\`\`\`

Rédigez-le court et factuel, et mettez-le à jour à chaque décision importante. Vous approfondirez l'art de documenter pour l'IA au module 4.

## La boucle de travail

1. **Demander un plan avant le code.** « Ne modifie rien. Propose un plan : fichiers concernés, étapes, tests, risques, questions. » Vous validez ou corrigez le plan avant qu'une seule ligne soit écrite : c'est le moment le moins coûteux pour rattraper un malentendu. Certains outils proposent un mode dédié à la planification ; la consigne « ne modifie rien » fonctionne partout.
2. **Avancer par petites étapes.** Une étape est une modification que vous pouvez comprendre et tester en quelques minutes : une table, un écran, une règle. Une grosse modification générée d'un coup est impossible à relire.
3. **Exiger des tests.** Demandez des tests automatiques (de petits programmes qui vérifient le comportement attendu) qui traduisent les critères d'acceptation, et leur exécution. Un test qui passe ne prouve pas tout, mais un critère sans test finit par casser sans que personne ne le remarque.
4. **Relire le diff.** Un **diff** affiche les différences entre l'ancienne et la nouvelle version du code. Quels fichiers ont été touchés ? Y a-t-il des changements non demandés ? Une clé écrite en dur ? Un test supprimé pour « faire passer » la vérification ?
5. **Ne jamais committer sans comprendre.** Un **commit** enregistre une version du code dans l'historique Git. Avant de committer, vous devez pouvoir dire en une phrase ce que fait la modification. Sinon, demandez : « Explique-moi ce diff fichier par fichier, comme à un débutant. »

## Trois approches, trois façons de prompter

| | Générateur d'application (Bolt.new) | Éditeur assisté (Cursor) | Agent de code (Claude Code, Codex) |
| --- | --- | --- | --- |
| Principe | Vous décrivez l'application dans le navigateur ; l'outil génère et exécute le projet | Un éditeur de code avec un assistant qui propose, modifie et explique | Un agent qui lit le dépôt, modifie les fichiers et lance des commandes, depuis un terminal ou une interface dédiée |
| Point fort | Aller très vite de l'idée au prototype visible | Travailler au plus près du code en gardant la main | Mener une tâche de bout en bout, en plusieurs étapes |
| Façon de prompter | Décrire produit, écrans et données ; corriger par retours visuels | Prompts ciblés sur un fichier ou une sélection de code | Prompts de mission : objectif, spécification, contraintes, critères de fin |
| Vigilance | Structure du code et sécurité à vérifier | Garder la vision d'ensemble | Permissions accordées, relecture des diffs et des commandes |

Ces frontières bougent : les éditeurs intègrent des agents, les agents existent aussi en extension d'éditeur ou dans le navigateur. Retenez trois postures : **générer** un prototype, **coécrire** du code, **déléguer** une mission. Vous les mettrez en pratique au module 6.
`,
        },
        {
          type: "prompt",
          title: "Demander un plan avant le code",
          tool: "Claude Code",
          prompt: `
Lis le fichier CLAUDE.md et la structure du projet.

Voici la user story à implémenter :
[COLLEZ LA USER STORY ET SES CRITÈRES D'ACCEPTATION]

Ne modifie aucun fichier pour l'instant. Propose un plan :
1. les fichiers à créer ou à modifier, avec le rôle de chacun ;
2. les étapes, dans l'ordre, chacune testable séparément ;
3. les tests à écrire pour chaque critère d'acceptation ;
4. les risques (sécurité, données, cas limites) ;
5. tes questions si quelque chose est ambigu.

Attends ma validation avant de coder.
`,
          tips: "Le même prompt fonctionne avec Codex (remplacez CLAUDE.md par AGENTS.md) et avec l'agent de Cursor. Validez ou corrigez le plan point par point avant de lancer l'étape 1.",
        },
        {
          type: "prompt",
          title: "Implémenter une étape, avec ses tests",
          tool: "Cursor",
          prompt: `
Implémente uniquement l'étape [NUMÉRO] du plan validé : [RAPPEL DE L'ÉTAPE].

Contraintes :
- Ne modifie que les fichiers nécessaires à cette étape.
- Écris les tests correspondant aux critères [LISTE DES CRITÈRES] et exécute-les.
- N'ajoute aucune dépendance sans me le demander.
- Aucune clé secrète dans le code : utilise les variables d'environnement.

À la fin, résume : fichiers modifiés, rôle de chaque modification, résultat des tests, points que je dois vérifier moi-même dans l'application.
`,
          tips: "Relisez le diff avant d'accepter. Si l'étape a touché des fichiers inattendus, demandez pourquoi avant de valider.",
        },
        {
          type: "prompt",
          personas: ["non_tech", "reconversion"],
          title: "Premier prototype dans Bolt.new",
          tool: "Bolt.new",
          prompt: `
Crée une application web de réservation de séances pour coachs sportifs indépendants.

Deux rôles :
- Coach : se connecte, publie des créneaux (date, heure, durée, lieu, prix), voit la liste de ses réservations.
- Client : consulte les créneaux disponibles d'un coach, réserve un créneau, voit et annule ses réservations (jusqu'à 24 h avant la séance).

Écrans : accueil, connexion / inscription, tableau de bord du coach, page publique d'un coach, espace client.
Données : profils (coach ou client), créneaux, réservations.

Pour cette première version : pas de paiement réel, uniquement des données de démonstration fictives, un design sobre et lisible sur mobile.
Avant de générer, résume ce que tu vas construire et pose-moi tes questions.
`,
          tips: "Remplacez Créno par votre projet. Avancez ensuite écran par écran, par petits prompts de correction. Le paiement et les rappels viendront plus tard (module 6).",
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Vous ne lisez pas le code ? Vous pouvez quand même le piloter

Vous n'avez pas à comprendre chaque ligne, mais vous devez contrôler le comportement. Trois réflexes :

- demandez systématiquement à l'outil d'expliquer ce qu'il a changé, en langage courant ;
- testez vous-même chaque critère d'acceptation dans l'application, comme un utilisateur, y compris les cas interdits (essayer d'annuler la réservation d'un autre compte) ;
- gardez une trace des versions qui fonctionnent, pour pouvoir revenir en arrière.

Pour tout ce qui touche à la sécurité et aux paiements, faites relire par une personne technique avant d'ouvrir l'application à de vrais utilisateurs.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : un développeur junior très rapide

Traitez les agents de code comme un collègue productif, mais sans mémoire ni responsabilité. Une branche par fonctionnalité, une pull request relue (même par vous seul), typage, linter et tests en intégration continue. Réglez les permissions de l'agent au plus juste : lecture et exécution des tests autorisées, confirmation exigée pour les commandes qui modifient l'environnement (installation, migration, suppression, push). Méfiez-vous des API inventées ou obsolètes sur les bibliothèques qui évoluent vite : exigez que l'agent s'appuie sur la documentation officielle ou sur le code existant du dépôt. Et gardez les fichiers de contexte courts : un fichier trop long dilue les règles importantes.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Le vocabulaire du code, en une minute

| Terme | En clair |
| --- | --- |
| Code source | Le texte, écrit dans un langage de programmation, qui fait fonctionner l'application |
| Dépôt | Le dossier du projet, avec tout l'historique de ses versions |
| Git / GitHub | Git enregistre les versions ; GitHub héberge le dépôt en ligne |
| Commit | Une version enregistrée, avec un message qui explique le changement |
| Diff | L'affichage de ce qui a changé entre deux versions |
| Test automatique | Un petit programme qui vérifie qu'une fonctionnalité se comporte comme prévu |
| Terminal | La fenêtre où l'on tape des commandes sous forme de texte |

Pas d'inquiétude : vous manipulerez tout cela pas à pas au module 6. Pour l'instant, retenez l'idée : on avance par petites versions enregistrées et vérifiées, que l'on peut toujours annuler.
`,
        },
        {
          type: "checklist",
          title: "Avant d'accepter du code généré par l'IA",
          items: [
            "Je peux expliquer en une phrase ce que fait la modification.",
            "Le diff ne touche que les fichiers attendus.",
            "Aucune clé secrète ni aucun mot de passe n'apparaît dans le code.",
            "Les tests correspondant aux critères d'acceptation existent et passent.",
            "Aucun test n'a été supprimé ou affaibli pour « faire passer » la vérification.",
            "Aucune dépendance n'a été ajoutée sans mon accord.",
            "J'ai testé le comportement dans l'application, y compris un cas interdit.",
          ],
        },
        {
          type: "exercice",
          title: "Préparer le prompt de votre première fonctionnalité",
          instructions: `
Objectif : préparer tout ce qu'il faut pour confier votre première fonctionnalité à un outil de code. Vous ne l'exécutez pas encore : ce sera l'objet du module 6.

1. Choisissez **une user story** prioritaire de votre backlog (module 1). Complétez-la avec 4 à 6 **critères d'acceptation** testables, dont au moins un critère de sécurité (qui a le droit de faire quoi).
2. Rédigez un **fichier de contexte** (\`CLAUDE.md\` ou \`AGENTS.md\`) de 15 à 30 lignes : projet, stack envisagée (vous la choisirez au module 3 : indiquez votre hypothèse actuelle), règles, commandes si vous les connaissez.
3. Rédigez le **prompt de plan** adapté à l'outil que vous pensez utiliser (Bolt.new, Cursor, Claude Code ou Codex).
4. Rédigez le **prompt d'implémentation** de la première étape, avec l'exigence de tests.
5. Listez **trois points** que vous vérifierez dans le diff ou dans l'application avant de valider.

La user story « annuler une réservation » de Créno montre le niveau de détail attendu.

Livrable (texte) : les cinq éléments ci-dessus.
`,
          deliverable: "texte",
          estimatedMinutes: 40,
          review: "formateur",
          rubric: [
            "Les critères d'acceptation sont testables et incluent une règle de sécurité",
            "Le fichier de contexte est court, factuel et spécifique au projet",
            "Le prompt de plan interdit de coder avant validation et demande tests et risques",
            "Le prompt d'implémentation limite le périmètre à une seule étape",
            "Les points de vérification sont concrets",
          ],
        },
      ],
    },

    // ------------------------------------------------------------------ L05
    {
      key: "m02-l05",
      title: "Les agents IA au quotidien",
      summary:
        "Comprendre ce qu'est un agent, lui confier une mission avec un brief précis, et appliquer les règles de sécurité qui évitent les mauvaises surprises.",
      estimatedMinutes: 60,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez confier une tâche en plusieurs étapes à un agent IA, avec un brief de mission clair et des règles de sécurité qui gardent la décision entre vos mains.

## Assistant ou agent : quelle différence ?

Un **assistant** répond à un message : vous demandez, il rédige, vous copiez. Un **agent** reçoit un objectif et agit pour l'atteindre. Il dispose d'**outils** (lire et écrire des fichiers, chercher sur le web, naviguer sur un site, exécuter des commandes, utiliser une application connectée) et fonctionne en **boucle** :

1. il analyse l'objectif et planifie ;
2. il choisit une action et utilise un outil ;
3. il observe le résultat (une page lue, une erreur, un fichier créé) ;
4. il décide de l'étape suivante, jusqu'à estimer la tâche terminée ou avoir besoin de vous.

Cette autonomie est précieuse : un agent peut enchaîner de nombreuses étapes pendant que vous faites autre chose. Elle a un revers : ses actions sont réelles. Un fichier supprimé est supprimé, un formulaire envoyé est envoyé.

## Les agents que vous rencontrerez

- **Claude Cowork** : Claude en mode agent pour le travail de bureau. Vous lui donnez accès à un périmètre (par exemple un dossier de votre ordinateur) et une mission ; il planifie, manipule les fichiers et produit des documents (synthèses, tableaux, rapports).
- **ChatGPT en mode agent** : ChatGPT enchaîne recherches, navigation sur des sites web et actions pour accomplir une tâche, en vous tenant informé de ce qu'il fait.
- **Claude Code et Codex** : des agents spécialisés dans le code, qui lisent un dépôt, modifient des fichiers et lancent des commandes (leçon précédente et module 6).

Capacités, conditions d'accès et réglages de ces outils évoluent souvent : vérifiez la documentation de l'éditeur avant de vous appuyer sur une fonction précise.

## Que déléguer ? Des exemples pour votre projet

| Mission | Exemple Créno | Outil adapté | Ce que vous vérifiez |
| --- | --- | --- | --- |
| Recherche documentaire | Recenser les obligations d'information pour la vente de prestations en ligne, sources officielles à l'appui | ChatGPT en mode agent, ou un assistant avec recherche web | Que chaque source existe et dit bien ce qui est résumé |
| Synthèse de fichiers | Synthétiser douze comptes rendus d'entretiens de coachs, anonymisés, rangés dans un dossier | Claude Cowork | Que les citations sont exactes et qu'aucune idée n'est inventée |
| Organisation de documents | Renommer et classer les documents du projet (PRD, maquettes, notes) selon une convention | Claude Cowork | Le résultat, sur une copie du dossier |
| Préparation d'un comparatif | Comparer cinq outils de prise de rendez-vous existants : cible, fonctionnalités, modèle économique affiché | ChatGPT en mode agent ou Claude Cowork | Les informations, sur les pages officielles |
| Tâche de code | Ajouter un test manquant, corriger un bug reproductible | Claude Code, Codex | Le diff, les tests, le comportement réel |

## Rédiger un brief de mission

Un agent prend des décisions seul : il a besoin d'un brief plus complet qu'un assistant. Un bon brief contient :

- **l'objectif** et le livrable final (format, emplacement) ;
- **le périmètre** : dossiers, sites ou outils autorisés, et ceux qui sont interdits ;
- **les étapes attendues**, ou au moins les points de passage ;
- **les points d'arrêt** : quand il doit s'arrêter et vous demander (avant tout envoi, achat, suppression ou publication) ;
- **les critères de fin** : à quoi il reconnaît que le travail est terminé ;
- **le compte rendu** : ce qu'il a fait, les sources utilisées, ce qui reste incertain.
`,
        },
        {
          type: "texte",
          markdown: `
## Les règles de sécurité

1. **Permissions minimales.** Donnez accès au strict nécessaire : un dossier précis plutôt que tout votre disque, une copie de travail plutôt que les originaux, un compte de test plutôt que le compte réel.
2. **Aucun secret.** Ne mettez jamais un mot de passe, une clé d'API ou des coordonnées bancaires dans un brief. Si une connexion à un service est nécessaire, passez par les mécanismes de connexion prévus par l'outil, avec les droits les plus limités possible.
3. **Validation humaine avant toute action irréversible.** Envoi d'un e-mail, paiement, suppression, publication, modification de données réelles : l'agent prépare, vous validez. Écrivez-le dans le brief, même si l'outil prévoit déjà des confirmations.
4. **Relecture systématique.** Le livrable d'un agent se relit comme celui d'un stagiaire : sources, chiffres, cohérence. Un agent peut se tromper à une étape, puis construire toute la suite sur cette erreur.
5. **Méfiance envers les contenus lus.** Une page web ou un document peut contenir des instructions cachées destinées à détourner l'agent : on parle d'**injection de prompt**. Limitez les sources consultées à des sites et documents de confiance, et surveillez les actions inattendues.

## Quand ne pas déléguer

- Quand la tâche engage votre responsabilité ou votre image sans relecture possible (message à un client, publication).
- Quand elle touche des données personnelles réelles ou des données sensibles.
- Quand vous ne savez pas vérifier le résultat : déléguer ce qu'on ne sait pas contrôler, c'est prendre un risque à l'aveugle.
- Quand la tâche est plus rapide à faire qu'à expliquer.
- Quand l'enjeu est d'apprendre : pendant cette formation, certaines décisions (votre PRD, votre stack) doivent rester les vôtres. L'agent prépare, vous décidez.
`,
        },
        {
          type: "prompt",
          title: "Brief de mission : synthèse d'un dossier de fichiers",
          tool: "Claude Cowork",
          prompt: `
Mission : synthétiser les comptes rendus d'entretiens du dossier [NOM DU DOSSIER] (fichiers anonymisés).

Périmètre : travaille uniquement dans ce dossier. Ne supprime, ne renomme et ne déplace aucun fichier existant. Crée ton livrable dans un sous-dossier « synthese ».

Étapes attendues :
1. Liste les fichiers que tu vas lire et signale ceux que tu ne peux pas ouvrir.
2. Pour chaque entretien, extrais les problèmes cités, avec une citation exacte.
3. Regroupe les problèmes par thème et compte le nombre d'entretiens qui mentionnent chaque thème.

Livrable : un document avec un tableau (thème | nombre d'entretiens | citations représentatives) et une conclusion de 10 lignes maximum.

Règles : n'invente aucune citation ; si une information est ambiguë, signale-la au lieu de trancher. Arrête-toi et demande-moi avant toute action non prévue dans ce brief.

Compte rendu final : fichiers lus, méthode suivie, limites de la synthèse.
`,
          tips: "Pour une première mission, travaillez sur une copie du dossier. Vérifiez ensuite trois citations au hasard dans les fichiers d'origine.",
        },
        {
          type: "prompt",
          title: "Brief de mission : comparatif de solutions existantes",
          tool: "ChatGPT",
          prompt: `
Mission : préparer un comparatif de [NOMBRE] solutions existantes qui répondent au même besoin que mon projet : [DESCRIPTION DU BESOIN EN 2 PHRASES].

Méthode :
- Utilise uniquement les sites officiels des solutions et leur documentation publique.
- Pour chaque solution : cible, fonctionnalités principales, modèle économique affiché (abonnement, commission, gratuit…), points faibles visibles.
- Indique pour chaque information l'adresse de la page consultée et la date de consultation.

Interdits : ne crée aucun compte, ne remplis aucun formulaire, n'accepte aucune condition d'utilisation, ne saisis aucune donnée personnelle.

Livrable : un tableau comparatif, puis cinq pistes de différenciation pour mon projet, en distinguant les faits observés de tes hypothèses.
`,
          tips: "À utiliser avec ChatGPT en mode agent ou avec tout assistant disposant de la recherche web. Contrôlez vous-même au moins deux lignes du tableau sur les sites cités.",
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Les agents, un levier pour tout ce qui n'est pas technique

Pour un profil non technique, les agents de bureau offrent souvent le gain de temps le plus immédiat : classer les documents du projet, transformer des notes en compte rendu structuré, préparer un tableau de veille concurrentielle, consolider les réponses d'un questionnaire exporté en tableur. Commencez par des missions dont vous savez vérifier le résultat en quelques minutes, sur des copies de fichiers. Gardez pour vous les échanges avec vos futurs clients et partenaires : l'agent prépare les brouillons, vous envoyez.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : connecteurs, bac à sable et traçabilité

Les agents gagnent en capacité quand on les connecte à des outils. Le **MCP** (Model Context Protocol), un protocole ouvert, permet de brancher un agent sur des services : base de données, gestion de tickets, documentation. Chaque connecteur élargit la surface d'attaque : préférez des accès en lecture seule, des environnements de développement plutôt que de production, et des jetons d'accès à portée limitée et révocables. Pour les agents de code, isolez l'exécution (conteneur, environnement distant de l'outil, branche dédiée) et gardez la main sur les commandes destructrices. Un agent dont on ne peut pas retracer les actions n'a rien à faire sur des données réelles.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Commencer sans risque

Si vous découvrez les agents, choisissez une première mission sans enjeu : sur une copie d'un dossier de documents non sensibles (vos notes de formation, par exemple), demandez un classement et un sommaire. Observez comment l'agent planifie, ce qu'il vous demande, où il se trompe. Une mission observée vous en apprendra plus que dix descriptions. Et rappelez-vous que ces outils permettent en général d'interrompre un agent en cours de route.
`,
        },
        {
          type: "checklist",
          title: "Avant de lancer un agent",
          items: [
            "L'objectif et le livrable final sont écrits.",
            "Le périmètre d'accès est limité au strict nécessaire (dossier, sites, outils).",
            "L'agent travaille sur des copies ou des données de test.",
            "Aucun mot de passe, aucune clé ni donnée bancaire ne figure dans le brief.",
            "Les actions irréversibles exigent ma validation, et c'est écrit dans le brief.",
            "Je sais comment je vais vérifier le résultat.",
            "Je sais comment interrompre l'agent en cours de route.",
          ],
        },
        {
          type: "exercice",
          title: "Votre première mission déléguée",
          instructions: `
1. Choisissez une mission utile à votre projet : recherche documentaire, synthèse de fichiers, organisation de documents ou préparation d'un comparatif.
2. Rédigez le brief complet : objectif, périmètre, étapes, points d'arrêt, critères de fin, compte rendu attendu.
3. Préparez l'environnement : copie des fichiers, données anonymisées, aucun secret.
4. Lancez la mission avec l'agent de votre choix (Claude Cowork, ChatGPT en mode agent ou un autre outil dont vous disposez). Si vous n'avez accès à aucun agent, réalisez la mission étape par étape avec un assistant classique, en suivant votre brief.
5. Vérifiez le livrable : relevez les erreurs, les oublis et les actions inattendues.

Livrable (texte) : votre brief, un résumé du résultat, la liste de ce que vous avez vérifié et corrigé, et vos règles personnelles de délégation (3 à 5 lignes).
`,
          deliverable: "texte",
          estimatedMinutes: 45,
          review: "formateur",
          rubric: [
            "Le brief contient objectif, périmètre, points d'arrêt et critères de fin",
            "Les règles de sécurité sont appliquées (copies, aucun secret, validation humaine)",
            "La vérification du livrable est concrète et documentée",
            "Les règles personnelles de délégation sont réalistes et adaptées au projet",
          ],
        },
      ],
    },

    // ------------------------------------------------------------------ L06
    {
      key: "m02-l06",
      title: "Construire sa bibliothèque de prompts",
      summary:
        "Organiser vos meilleurs prompts dans une base Notion, les transformer en gabarits à variables et les améliorer version après version.",
      estimatedMinutes: 55,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous disposerez d'une bibliothèque de prompts organisée dans Notion, avec des gabarits réutilisables et une méthode pour les améliorer tout au long du projet.

## Pourquoi une bibliothèque ?

Un bon prompt demande du travail : contexte, contraintes, format, itérations. Le perdre au fond d'un historique de conversation, c'est refaire ce travail la semaine suivante, en moins bien. Une bibliothèque de prompts vous permet de :

- **réutiliser** ce qui fonctionne, en quelques secondes ;
- **améliorer** vos prompts au lieu de repartir de zéro ;
- **partager** une méthode commune avec vos associés ou un prestataire ;
- **garder la cohérence** du ton et des règles de votre projet.

## Une base Notion en quinze minutes

Notion est un outil de documentation qui permet de créer des **bases de données** : des tableaux dont chaque ligne est une page, avec des **propriétés** (des colonnes typées : texte, choix dans une liste, date, nombre…). Vous l'avez utilisé au module 1 pour votre backlog. Créez une base « Bibliothèque de prompts » avec ces propriétés :

| Propriété | Type de propriété | Rôle | Exemples de valeurs |
| --- | --- | --- | --- |
| Nom | Titre | Identifier le prompt d'un coup d'œil | « Page d'accueil — cible coachs » |
| Usage | Choix unique | Classer par besoin | Rédaction, Analyse, Produit, Code, Agent |
| Outil | Choix multiples | Savoir où il a été testé | Claude, ChatGPT, Claude Code, Cursor, Bolt.new |
| Version | Texte | Suivre les évolutions | v1, v2, v3 |
| Qualité | Choix unique | Niveau de confiance | À tester, Correct, Fiable |
| Variables | Texte | Savoir quoi remplir | [CIBLE], [TON], [LONGUEUR] |
| Mise à jour | Date | Repérer les prompts anciens | Date du dernier test |

Dans le corps de chaque page, gardez toujours la même structure : le prompt complet (dans un bloc de code, pour le copier facilement), un exemple de résultat obtenu, les remarques d'usage (« meilleur avec un exemple de ton »), et l'historique des versions.

> [!tip] Créez des vues filtrées : « Code » pour vos sessions de développement, « Fiables » pour les prompts éprouvés, « À tester » pour les brouillons. Une bibliothèque où l'on ne retrouve rien en dix secondes n'est pas utilisée.

## Des gabarits avec variables

Un **gabarit** est un prompt dont les parties qui changent sont remplacées par des **variables** : des emplacements repérables, à remplir avant chaque utilisation. Convention simple : des majuscules entre crochets.

\`\`\`text
Rôle : tu es rédacteur web pour [CIBLE].
Contexte : [DESCRIPTION DU PROJET EN 3 PHRASES].
Tâche : rédige [TYPE DE CONTENU] sur [SUJET].
Contraintes : [LONGUEUR], [TON], vouvoiement, aucun superlatif.
Format : [STRUCTURE ATTENDUE].
\`\`\`

Trois règles :

- **Figez ce qui fait la qualité** (contraintes de ton, interdits, critères) et ne mettez en variable que ce qui change réellement.
- **Nommez les variables clairement** : [CIBLE] plutôt que [X].
- **Documentez un exemple rempli** dans la fiche, pour montrer le niveau de détail attendu.

Pour Créno, le même gabarit « message aux utilisateurs » sert pour le rappel de la veille, la confirmation de réservation et l'annonce d'une nouvelle fonctionnalité : seules les variables changent.
`,
        },
        {
          type: "texte",
          markdown: `
## Versionner et améliorer

Un prompt n'est jamais fini. Quand un résultat vous déçoit, demandez-vous : quelle information manquait ? Quelle contrainte a été ignorée ? Corrigez le prompt, testez la nouvelle version sur le même cas, et si elle est meilleure :

1. incrémentez la version (v1 devient v2) ;
2. notez en une ligne ce qui a changé et pourquoi (« v2 : ajout d'un exemple de ton, les textes étaient trop commerciaux ») ;
3. conservez l'ancienne version dans l'historique de la page, pour comparer ou revenir en arrière ;
4. mettez à jour la qualité et la date.

Toutes les deux semaines, prenez dix minutes pour faire le ménage : archivez les prompts jamais utilisés, fusionnez les doublons, passez en « Fiable » ceux qui ont fait leurs preuves. Quand vos outils évoluent, retestez vos prompts les plus importants : un prompt qui fonctionnait peut se comporter différemment après une mise à jour du modèle.

## Dix usages pour démarrer

Voici les usages que la plupart des projets de cette formation rencontrent, et la leçon où vous les avez travaillés :

1. consignes persistantes du projet (leçon 3) ;
2. texte destiné aux utilisateurs (leçon 2) ;
3. synthèse d'entretiens ou de retours utilisateurs (leçon 3) ;
4. transformation d'une idée en user stories avec critères d'acceptation (leçons 3 et 4) ;
5. relecture critique (leçon 3) ;
6. résumé de passation (leçon 3) ;
7. plan avant le code (leçon 4) ;
8. implémentation d'une étape avec tests (leçon 4) ;
9. explication d'un diff ou d'un message d'erreur (leçon 4) ;
10. brief de mission pour un agent (leçon 5).
`,
        },
        {
          type: "prompt",
          title: "Transformer un prompt réussi en gabarit",
          tool: "Tout assistant IA",
          prompt: `
Voici un prompt qui m'a donné un bon résultat :
---
[COLLEZ LE PROMPT]
---
Transforme-le en gabarit réutilisable :
1. Repère les éléments propres à ce cas (sujet, cible, longueur, exemples…) et remplace-les par des variables en majuscules entre crochets, avec des noms explicites.
2. Conserve tels quels les éléments qui font la qualité du résultat (contraintes, critères, format).
3. Sous le gabarit, liste chaque variable avec une ligne d'explication et un exemple de valeur.
4. Propose un nom court pour ce gabarit et un usage parmi : Rédaction, Analyse, Produit, Code, Agent.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : des prompts versionnés avec le code

Les prompts qui servent au développement (plan, implémentation, revue) et ceux qui seront intégrés à votre produit (module 6) ont leur place dans le dépôt Git : un dossier dédié, un fichier Markdown par prompt. Vous profitez de l'historique, des revues et des branches. Pour les prompts du produit, ajoutez un petit jeu d'entrées de référence et les sorties attendues : c'est votre test de non-régression quand vous modifiez le prompt ou changez de modèle. Notion reste utile pour les prompts non techniques partagés avec l'équipe.
`,
        },
        {
          type: "texte",
          personas: ["non_tech", "reconversion"],
          markdown: `
## Pas à pas dans Notion

1. Créez une nouvelle page, puis ajoutez-y une base de données en affichage tableau.
2. Renommez la colonne principale « Nom ».
3. Ajoutez les propriétés une par une, en choisissant le type indiqué dans le tableau ci-dessus.
4. Créez une première fiche avec le gabarit en sept composantes de la leçon 2.
5. Dans le corps de la fiche, collez le prompt dans un bloc de code.

Si une étape vous bloque, l'aide officielle de [Notion](https://www.notion.so) décrit la création de bases de données. Au tout début, une simple page avec des titres peut suffire : l'essentiel est de conserver vos prompts et de les améliorer.
`,
        },
        {
          type: "checklist",
          title: "Une fiche de prompt complète",
          items: [
            "Un nom explicite et un usage renseigné.",
            "Le prompt complet, prêt à copier.",
            "Les variables listées, avec un exemple de valeur.",
            "Le ou les outils sur lesquels il a été testé.",
            "Un exemple de résultat obtenu.",
            "Une version et une note sur le dernier changement.",
            "Un niveau de qualité à jour.",
          ],
        },
        {
          type: "exercice",
          title: "Votre bibliothèque de dix prompts",
          instructions: `
1. Créez votre base « Bibliothèque de prompts » dans Notion, avec au minimum les propriétés Usage, Outil, Version et Qualité.
2. Ajoutez **dix prompts pour votre projet**, en vous appuyant sur la liste des dix usages et sur les prompts produits aux leçons 2 à 5. Au moins cinq doivent être des gabarits à variables.
3. Testez-en au moins trois et renseignez leur qualité (À tester, Correct, Fiable) avec un exemple de résultat.
4. Améliorez-en au moins un et documentez sa v2 : ce qui a changé, et pourquoi.

Avant de partager, vérifiez qu'aucune fiche ne contient de donnée personnelle réelle ni de secret.

Livrable (texte) : le lien de partage de votre base Notion, avec un accès en lecture pour le formateur, ou, à défaut, le contenu des dix fiches collé en texte.
`,
          deliverable: "texte",
          estimatedMinutes: 45,
          review: "formateur",
          rubric: [
            "Dix prompts liés au projet, couvrant au moins quatre usages différents",
            "Propriétés Usage, Outil, Version et Qualité renseignées",
            "Au moins cinq gabarits avec des variables explicites",
            "Au moins une amélioration documentée (v1 vers v2)",
            "Aucune donnée personnelle réelle ni secret",
          ],
        },
      ],
    },

    // ------------------------------------------------------------------ L07
    {
      key: "m02-l07",
      title: "Évaluation du module",
      summary: "Dix questions pour valider vos acquis sur le fonctionnement des assistants, l'écriture de prompts, le code assisté et les agents.",
      estimatedMinutes: 20,
      blocks: [
        {
          type: "texte",
          markdown: `
Cette évaluation vérifie que vous savez choisir quoi confier à une IA, rédiger un prompt efficace, piloter un outil de code et déléguer une tâche à un agent en sécurité.

## Consignes

- Dix questions, une seule bonne réponse par question.
- Chaque question part d'une situation concrète : raisonnez comme sur votre propre projet.
- Une explication s'affiche après chaque réponse : lisez-la, même quand vous avez juste.
- Le score minimal attendu est indiqué dans votre espace. En cas d'échec, relisez les leçons concernées avant de retenter.
`,
        },
        {
          type: "quiz",
          title: "Évaluation — Bien prompter",
          graded: true,
          questions: [
            {
              prompt: "Un assistant vous propose d'utiliser une fonction d'une bibliothèque de code qui n'existe pas. Quelle est l'explication la plus juste ?",
              options: [
                { label: "La fonction a été supprimée pendant la conversation" },
                { label: "L'assistant copie systématiquement des forums non fiables" },
                { label: "Le modèle génère le texte le plus plausible, sans vérifier qu'il est exact", correct: true },
                { label: "Votre prompt était trop poli" },
              ],
              explanation:
                "C'est une hallucination : la génération probabiliste produit du plausible, pas du vérifié. Parade : fournir la documentation officielle et tester le code.",
            },
            {
              prompt: "Qu'est-ce que la fenêtre de contexte d'un modèle de langage ?",
              options: [
                { label: "La quantité maximale de texte que le modèle prend en compte pour répondre", correct: true },
                { label: "La liste des sites web lus pendant l'entraînement" },
                { label: "La durée de conservation de vos conversations" },
                { label: "La zone de l'écran où s'affiche la réponse" },
              ],
              explanation:
                "La fenêtre de contexte, mesurée en tokens, limite ce que le modèle « voit » : consignes, historique, fichiers joints. Dans une longue conversation, les éléments anciens peuvent être moins bien pris en compte.",
            },
            {
              prompt: "Vous voulez faire analyser par un assistant les retours de vos trente premiers clients. Que faites-vous ?",
              options: [
                { label: "Vous collez l'export complet : l'assistant est tenu au secret" },
                { label: "Vous anonymisez les données (noms, e-mails, téléphones) avant de les transmettre", correct: true },
                { label: "Vous ajoutez « merci de ne pas conserver ces données » à la fin du prompt" },
                { label: "Vous activez la recherche web pour protéger les données" },
              ],
              explanation:
                "Les données personnelles ne doivent pas être transmises sans nécessité (principe de minimisation du RGPD). Une consigne dans le prompt ne change rien à la façon dont le service traite les données.",
            },
            {
              prompt: "« Tu es rédacteur web. Rédige la page d'accueil de Créno en 150 mots, vouvoiement, avec un titre et trois bénéfices. » Quelle composante importante manque ?",
              options: [
                { label: "Le rôle" },
                { label: "Le format de sortie" },
                { label: "Les contraintes" },
                { label: "Le contexte (produit, utilisateurs, irritants)", correct: true },
              ],
              explanation:
                "Rôle, contraintes (150 mots, vouvoiement) et format (titre, trois bénéfices) sont présents. Sans contexte, l'IA ignore qui sont les coachs et ce qui les gêne : le texte sera générique.",
            },
            {
              prompt: "Au bout d'une longue conversation, l'assistant réintroduit une option que vous aviez écartée. Quelle est la meilleure réaction ?",
              options: [
                { label: "Répéter la demande en majuscules" },
                { label: "Continuer : l'assistant finira par s'en souvenir" },
                { label: "Demander un résumé de passation, le corriger, puis repartir d'une nouvelle conversation", correct: true },
                { label: "Supprimer vos consignes persistantes" },
              ],
              explanation:
                "Dans une conversation trop longue, les consignes se diluent. Un résumé relu et corrigé donne un contexte propre et court à une nouvelle conversation.",
            },
            {
              prompt: "À quoi sert un fichier CLAUDE.md ou AGENTS.md dans un dépôt de code ?",
              options: [
                { label: "À transmettre durablement à l'outil de code les règles, la stack et les commandes du projet", correct: true },
                { label: "À stocker les clés d'API du projet" },
                { label: "À remplacer les tests automatiques" },
                { label: "À enregistrer l'historique des conversations avec l'IA" },
              ],
              explanation:
                "Ces fichiers de contexte sont lus par les agents de code (Claude Code, Codex et d'autres outils). Ils ne doivent jamais contenir de secrets.",
            },
            {
              prompt: "Avant qu'un agent de code implémente une fonctionnalité, quelle pratique réduit le plus le risque de malentendu ?",
              options: [
                { label: "Lui demander d'écrire tout le code d'un coup pour gagner du temps" },
                { label: "Lui demander un plan et le valider avant toute modification", correct: true },
                { label: "Désactiver les tests pour aller plus vite" },
                { label: "Ne rien préciser pour lui laisser de la liberté" },
              ],
              explanation:
                "Le plan est le moment le moins coûteux pour corriger un malentendu : fichiers concernés, étapes, tests, risques. On code ensuite par petites étapes.",
            },
            {
              prompt: "Un agent de code vous présente un diff qui modifie aussi un fichier non mentionné et supprime un test existant. Que faites-vous ?",
              options: [
                { label: "Vous committez : si le reste fonctionne, c'est suffisant" },
                { label: "Vous supprimez le projet et recommencez" },
                { label: "Vous désactivez la relecture des diffs pour la suite" },
                { label: "Vous demandez pourquoi, et refusez la suppression du test sans justification valable", correct: true },
              ],
              explanation:
                "On ne committe jamais sans comprendre. Un test supprimé pour « faire passer » la vérification est un signal d'alerte classique.",
            },
            {
              prompt: "Parmi ces actions confiées à un agent, laquelle doit impérativement passer par votre validation ?",
              options: [
                { label: "Lire les fichiers d'un dossier de travail" },
                { label: "Rédiger un brouillon de synthèse" },
                { label: "Envoyer un e-mail à vos cinquante premiers inscrits", correct: true },
                { label: "Lister les sources consultées" },
              ],
              explanation:
                "L'envoi d'un e-mail est irréversible et engage votre image. Règle : l'agent prépare, vous validez toute action irréversible.",
            },
            {
              prompt: "Dans votre bibliothèque de prompts, pourquoi noter la version et ce qui a changé à chaque amélioration ?",
              options: [
                { label: "Pour pouvoir comparer, revenir en arrière et comprendre ce qui améliore les résultats", correct: true },
                { label: "Parce que Notion l'exige pour enregistrer une page" },
                { label: "Pour que l'IA reconnaisse le prompt" },
                { label: "Pour réduire la longueur du prompt" },
              ],
              explanation:
                "Versionner ses prompts, comme du code, permet de mesurer l'effet d'un changement et de revenir à une version qui fonctionnait.",
            },
          ],
        },
      ],
    },
  ],
};
