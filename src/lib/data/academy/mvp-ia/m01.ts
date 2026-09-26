import type { SeedModule } from "../authoring";

export const M01: SeedModule = {
  key: "m01",
  title: "Cadrer son problème et son MVP",
  summary:
    "Passer d’une idée à un MVP cadré : un problème étayé, une cible précise, une proposition de valeur claire, un périmètre réduit à un parcours clé, un PRD léger et une organisation agile du projet.",
  objectives: [
    "Être capable de formuler un énoncé de problème étayé par des preuves et d’identifier ses hypothèses les plus risquées.",
    "Être capable de définir une cible et ses early adopters, puis de mener et synthétiser des entretiens de découverte en limitant les biais.",
    "Être capable de rédiger une proposition de valeur, un one-liner et une différenciation crédibles.",
    "Être capable de délimiter le périmètre d’un MVP (type de MVP, parcours clé, MoSCoW, hors périmètre) et de le formaliser dans un PRD d’une à deux pages.",
    "Être capable d’organiser son projet en sprints d’une semaine à l’aide d’un backlog dans Notion.",
  ],
  lessons: [
    // ─────────────────────────────────────────────────────────────
    {
      key: "m01-l01",
      title: "Du problème à l’opportunité",
      summary:
        "Transformer une idée en énoncé de problème étayé et repérer les hypothèses qui peuvent faire échouer le projet.",
      estimatedMinutes: 35,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez écrire un énoncé de problème précis, le relier à ce que votre cible cherche vraiment à accomplir, et repérer les hypothèses qui peuvent faire échouer votre projet.

## Partir du problème, pas de la solution

La plupart des projets naissent d’une idée de solution : « une application qui… ». C’est naturel, mais risqué. Une solution n’a de valeur que si elle résout un problème **réel**, **fréquent** ou **coûteux** pour un groupe de personnes identifiable. Construire d’abord, puis chercher des utilisateurs, c’est prendre le risque de passer des semaines sur un produit dont personne n’a besoin.

Un problème, au sens où nous l’entendons, a quatre composantes : **une personne** précise, **une situation** dans laquelle il se produit, **une cause**, et **une conséquence** qui coûte quelque chose (du temps, de l’argent, du stress, une opportunité perdue).

## Écrire un énoncé de problème

Utilisez cette trame :

> [!info] [Cible] a du mal à [objectif] quand [situation], parce que [cause]. Aujourd’hui, elle [solution de contournement], ce qui lui coûte [conséquence].

Exemple pour Créno : « Les coachs sportifs indépendants ont du mal à remplir et à organiser leur planning de séances, parce que chaque réservation passe par des échanges de messages. Aujourd’hui, ils confirment les créneaux un par un, relancent les paiements et subissent des annulations de dernière minute, ce qui leur coûte des soirées de travail non facturé et des séances perdues. »

| Énoncé flou | Ce qui manque |
| --- | --- |
| « Les gens ont du mal à faire du sport. » | Qui exactement ? Dans quelle situation ? Avec quelle conséquence ? |
| « Les coachs ont besoin d’une application de réservation. » | C’est une solution, pas un problème : que vit le coach aujourd’hui ? |
| « Le marché du fitness est énorme. » | C’est un contexte, pas un problème, et un chiffre à sourcer. |

## Les « jobs to be done »

L’approche des *jobs to be done* (littéralement « tâches à accomplir ») part d’une idée simple : une personne n’achète pas un produit pour lui-même, elle l’« embauche » pour progresser dans une situation donnée. Un job se formule ainsi :

> [!info] Quand [situation], je veux [motivation], pour [résultat attendu].

Un job a souvent trois dimensions : **fonctionnelle** (ce qu’il faut faire), **émotionnelle** (ce que la personne veut ressentir ou éviter) et **sociale** (l’image qu’elle veut donner).

Pour Créno :

- **Le coach** : « Quand un client veut réserver une séance, je veux qu’il le fasse seul et paie d’avance, pour ne plus gérer mon agenda le soir ni courir après les paiements. » Dimension émotionnelle : ne plus se sentir débordé. Dimension sociale : paraître professionnel.
- **Le client** : « Quand je décide de m’entraîner, je veux réserver en quelques secondes un créneau qui me convient, pour ne pas attendre une réponse par message. »

Les jobs vous montrent contre quoi vous êtes réellement en concurrence. Pour le coach, ce n’est pas seulement un autre logiciel : c’est aussi le carnet et les messages, qui « font le job » aujourd’hui, même mal.

## Des preuves, pas des opinions

Un problème n’est pas prouvé parce qu’il vous semble évident, ni parce que votre entourage trouve l’idée « géniale ». Classez vos indices selon leur force :

| Signal | Force |
| --- | --- |
| Des personnes de la cible décrivent spontanément le problème, avec un exemple récent | Forte |
| Elles ont déjà bricolé une solution (tableur, messages, outil détourné) | Forte |
| Elles dépensent déjà du temps ou de l’argent pour le résoudre | Très forte |
| Elles s’engagent : rendez-vous, inscription sur une liste d’attente, précommande | Très forte |
| « Bonne idée, je l’utiliserais sûrement » | Faible |
| L’enthousiasme de vos proches | Faible |
| Un article qui affirme que le marché est « énorme » | Faible, et à vérifier |

La règle : ce que les gens **font** vaut plus que ce qu’ils **disent** qu’ils feront.

## Identifier vos hypothèses risquées

Une hypothèse est une affirmation que vous tenez pour vraie sans l’avoir encore prouvée. Votre projet en contient des dizaines. On les classe en trois familles :

- **Désirabilité** : la cible veut-elle vraiment cette solution ?
- **Viabilité** : le modèle économique tient-il ? Quelqu’un paiera-t-il, et assez ?
- **Faisabilité** : pouvez-vous la construire, avec vos moyens et dans vos délais ?

Pour chaque hypothèse, posez deux questions : **si elle est fausse, le projet s’effondre-t-il ?** et **quelle preuve ai-je déjà ?** Les hypothèses à tester en premier sont à la fois **critiques** et **peu prouvées**.

Les hypothèses de Créno, de la plus risquée à la moins risquée :

1. Les coachs acceptent de publier leurs créneaux dans un outil plutôt que de tout gérer par messages (désirabilité, critique, peu prouvée).
2. Les clients acceptent de payer en ligne au moment de réserver (désirabilité, critique).
3. Les coachs paieront pour l’outil, par abonnement ou par commission (viabilité, critique).
4. Un rappel la veille réduit les oublis de séance (désirabilité, importante mais secondaire).
5. Réservation, paiement et rappels peuvent être construits en quelques semaines avec les outils de la formation (faisabilité, moins risquée : des produits comparables existent).

> [!tip] L’IA peut vous aider à lister vos hypothèses et à repérer vos angles morts. Elle ne peut pas les valider : seuls vos futurs utilisateurs le peuvent. Vous les rencontrerez dès la leçon suivante.
`,
        },
        {
          type: "video",
          title: "Du problème aux hypothèses : l’exemple de Créno",
          durationMinutes: 6,
          script: `
- Accroche : une idée de solution (« une app de réservation ») face à un problème réellement vécu par les coachs.
- Les quatre composantes d’un problème (personne, situation, cause, conséquence), appliquées aux coachs indépendants.
- Réécriture en direct d’un énoncé flou en énoncé exploitable.
- Le job du coach et le job du client : dimensions fonctionnelle, émotionnelle et sociale.
- Signaux forts et signaux faibles : exemples de phrases entendues et de ce qu’elles prouvent vraiment.
- Les hypothèses de Créno classées en désirabilité, viabilité et faisabilité ; choix des trois plus risquées.
- Transition vers la leçon suivante : aller vérifier ces hypothèses auprès de vrais coachs.
`,
        },
        {
          type: "prompt",
          title: "Faire challenger votre énoncé de problème",
          tool: "Tout assistant IA",
          prompt: `
Tu es un coach en entrepreneuriat exigeant. Voici l’énoncé de problème de mon projet :

[COLLEZ VOTRE ÉNONCÉ, SANS AUCUNE DONNÉE PERSONNELLE]

1. Dis-moi si la cible, la situation, la cause et la conséquence sont précises. Pour chaque élément flou, propose une question à poser à de vrais utilisateurs pour le préciser.
2. Liste 8 hypothèses implicites contenues dans cet énoncé, classées en désirabilité, viabilité et faisabilité.
3. Pour chacune, indique ce qui la rendrait fausse et quel comportement observable la confirmerait.
4. Désigne les 3 hypothèses qui te semblent à la fois critiques et les moins prouvées, en expliquant pourquoi.

Ne me donne aucun chiffre de marché : je vérifierai moi-même les données dont j’ai besoin.
`,
          tips: "Soumettez ensuite votre énoncé corrigé une seconde fois. Gardez les questions proposées : elles alimenteront votre script d’entretien à la leçon suivante.",
        },
        {
          type: "exercice",
          title: "Votre énoncé de problème et vos hypothèses",
          instructions: `
Appliquez la leçon à votre projet. Répondez dans le champ de texte.

1. **Énoncé de problème** : rédigez-le avec la trame de la leçon (5 lignes maximum).
2. **Job to be done** : formulez le job principal de votre cible (« Quand…, je veux…, pour… ») et précisez ses dimensions émotionnelle et sociale.
3. **Preuves actuelles** : listez ce que vous savez déjà, en indiquant pour chaque élément s’il s’agit d’un signal fort ou faible.
4. **Hypothèses** : listez au moins 6 hypothèses (désirabilité, viabilité, faisabilité), puis désignez les 3 plus risquées (critiques et peu prouvées) en justifiant votre choix.

Vous pouvez utiliser le prompt ci-dessus pour challenger votre premier jet, mais le texte remis doit être le vôtre, relu et assumé.
`,
          deliverable: "texte",
          estimatedMinutes: 20,
          review: "auto",
          rubric: [
            "L’énoncé précise la cible, la situation, la cause et la conséquence.",
            "Le job est formulé du point de vue de la cible, sans décrire de solution.",
            "Les preuves distinguent les faits observés des opinions.",
            "Au moins 6 hypothèses sont classées, dont 3 prioritaires justifiées.",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m01-l02",
      title: "Définir sa cible et ses early adopters",
      summary:
        "Délimiter votre cible, repérer vos early adopters et mener des entretiens de découverte en limitant les biais.",
      estimatedMinutes: 45,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez délimiter votre cible, repérer vos early adopters et mener des entretiens de découverte qui produisent des faits plutôt que des politesses.

## Segmenter : de « tout le monde » à un segment

« Mon produit s’adresse à tout le monde » est l’une des phrases les plus dangereuses pour un projet naissant. Un **segment** est un groupe de personnes qui partagent le même problème, dans la même situation, et que l’on peut atteindre par les mêmes canaux.

Pour segmenter, l’âge ou le revenu comptent souvent moins que :

- **la situation** : dans quel contexte le problème apparaît-il ?
- **le comportement** : que font ces personnes aujourd’hui ?
- **l’intensité du besoin** : à quel point le problème est-il douloureux ou fréquent ?
- **l’accessibilité** : où les trouver, comment leur parler ?

Créno affine sa cible ainsi : « les gens qui font du sport » → « les coachs sportifs » → « les coachs indépendants qui donnent des séances individuelles ou en petit groupe, gèrent seuls leur planning et se font payer à la séance ».

## Vos early adopters

Les **early adopters** (premiers utilisateurs) sont les personnes du segment qui adopteront votre MVP en premier, malgré ses imperfections. On les reconnaît à cinq traits :

1. elles ont le problème ;
2. elles savent qu’elles l’ont ;
3. elles cherchent déjà une solution, ou en ont bricolé une ;
4. elles ont les moyens (budget, temps) de changer d’habitude ;
5. vous pouvez les joindre facilement.

Pour Créno : des coachs installés depuis peu, déjà débordés par les messages, qui ont essayé un agenda partagé sans en être satisfaits et qui sont actifs sur des réseaux où vous pouvez les contacter.

## Persona utile ou persona cliché

Un **persona** est la description d’un utilisateur type. Il est utile s’il aide à prendre des décisions, inutile s’il décrit une caricature.

| Persona cliché | Persona utile |
| --- | --- |
| Julie, 32 ans, aime le yoga et les voyages | Coach indépendante, une vingtaine de clients réguliers, gère tout depuis son téléphone |
| « Active sur les réseaux sociaux » | Reçoit ses demandes de réservation par messages, souvent le soir |
| « Veut une application simple » | A essayé un agenda partagé, abandonné car ses clients ne l’utilisaient pas |
| Photo et citation inventées | Critères de choix : rapidité, paiement garanti, image professionnelle |

Un persona se construit à partir des entretiens, pas de l’imagination. Avant vos entretiens, écrivez-le comme une hypothèse ; après, corrigez-le avec ce que vous avez appris.

## Les entretiens de découverte

L’entretien de découverte sert à **comprendre le problème**, pas à présenter votre solution. Visez au moins **5 entretiens** de 20 à 30 minutes avec des personnes de votre segment : c’est assez pour voir des tendances se dessiner, pas pour tirer des conclusions définitives.

### Un script type

1. **Introduction (2 min)** : remerciez, expliquez que vous cherchez à comprendre leur quotidien et non à vendre ; demandez l’autorisation de prendre des notes ou d’enregistrer.
2. **Contexte (5 min)** : « Parlez-moi de votre activité. À quoi ressemble une semaine type ? »
3. **Le problème (10 min)** : « Racontez-moi la dernière fois que [situation] s’est produite. Qu’avez-vous fait ? Qu’est-ce qui a été le plus pénible ? Qu’est-ce que cela vous a coûté ? »
4. **Les solutions actuelles (5 min)** : « Qu’utilisez-vous aujourd’hui ? Qu’avez-vous déjà essayé ? Pourquoi avez-vous arrêté ? »
5. **Clôture (3 min)** : « Qui d’autre devrais-je rencontrer ? Puis-je revenir vers vous quand j’aurai quelque chose à vous montrer ? »

### Les biais à éviter

- **Les questions orientées** : « Ne trouvez-vous pas que les messages font perdre du temps ? » suggère la réponse. Préférez : « Comment gérez-vous vos réservations ? »
- **Les questions hypothétiques** : « Utiliseriez-vous une application qui… ? » produit des « oui » polis. Interrogez le passé : ce que la personne a réellement fait.
- **Le biais de complaisance** : dès que vous présentez votre idée, votre interlocuteur veut vous faire plaisir. Gardez la solution pour la fin, ou pour un autre rendez-vous.
- **Le biais de confirmation** : vous retenez ce qui confirme votre idée. Notez aussi, et surtout, ce qui la contredit.
- **L’échantillon de proches** : amis et famille sont rarement votre cible, et toujours bienveillants.
- **La généralisation** : un entretien est une anecdote ; une tendance, c’est ce qui revient chez plusieurs personnes.

### Synthétiser

Juste après chaque entretien, prenez 10 minutes pour remplir une fiche : contexte de la personne, faits marquants, phrases citées mot pour mot, solutions actuelles, intensité du problème (de 1 à 5), signaux d’engagement. Après vos cinq entretiens, comparez les fiches : ce qui revient chez au moins trois personnes, ce qui vous a surpris, les hypothèses confirmées ou fragilisées.

> [!warning] Vos notes d’entretien contiennent des données personnelles. Demandez le consentement avant d’enregistrer, ne collectez que ce qui est utile, anonymisez vos fiches (« Coach A », « Coach B ») et ne collez jamais de notes nominatives dans un assistant IA. Des repères généraux sont disponibles sur [cnil.fr](https://www.cnil.fr) ; ceci n’est pas un conseil juridique.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : parler avant de coder

Votre réflexe sera peut-être de lancer un prototype pour « voir si ça plaît ». Résistez : un prototype présenté trop tôt transforme l’entretien en démonstration, et vous n’apprenez plus rien sur le problème.

Traitez vos entretiens comme une collecte de données : même script pour tous, fiche de synthèse identique, tableau comparatif (par exemple une base Notion avec une ligne par entretien et une colonne par question). Si vous utilisez un outil de transcription, informez la personne et obtenez son accord, puis anonymisez la transcription avant toute analyse par une IA.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Profil non technique : votre réseau, un atout à manier avec précaution

Votre expérience métier vous donne un accès direct à votre cible : collègues, clients, fournisseurs, groupes professionnels. Utilisez-le, mais diversifiez : une bonne partie de vos entretiens devrait se faire avec des personnes qui ne vous connaissent pas, pour limiter la complaisance.

Autre piège : votre expertise vous pousse à « savoir » ce dont les gens ont besoin. Pendant l’entretien, mettez-la de côté et posez vos questions comme si vous découvriez le métier.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Profil reconversion : un message pour décrocher vos premiers entretiens

Demander un entretien à un inconnu intimide. Voici un message court à adapter :

> [!tip] « Bonjour [prénom], je travaille sur un projet autour de [thème] et je cherche à comprendre comment les [cible] gèrent [situation]. Je ne vends rien : j’aimerais simplement vous poser quelques questions pendant 20 minutes, par téléphone ou en visio, au moment qui vous arrange. Seriez-vous d’accord ? Merci d’avance ! »

Contactez nettement plus de personnes que le nombre d’entretiens visé : beaucoup ne répondront pas, et ce n’est pas un jugement sur votre projet. Pour votre tout premier entretien, entraînez-vous avec une personne bienveillante, puis passez à votre vraie cible.
`,
        },
        {
          type: "prompt",
          title: "Synthétiser vos fiches d’entretien anonymisées",
          tool: "Claude",
          prompt: `
Tu es chercheur en expérience utilisateur. Voici les fiches anonymisées de mes entretiens de découverte (aucun nom, e-mail ni téléphone) :

[COLLEZ VOS FICHES ANONYMISÉES]

Mon hypothèse principale était : [VOTRE HYPOTHÈSE]

1. Liste les problèmes cités, en indiquant pour chacun combien de personnes l’ont mentionné et une phrase citée à l’appui.
2. Liste les solutions de contournement actuelles.
3. Indique ce qui confirme mon hypothèse, ce qui la contredit et ce qui reste incertain.
4. Propose une version corrigée de mon persona, uniquement à partir de ces fiches.

N’invente aucune information absente des fiches. Si un point n’est pas couvert, écris « non couvert ».
`,
          tips: "Fonctionne aussi dans ChatGPT. Relisez la synthèse en la confrontant à vos fiches : une IA peut surpondérer une phrase marquante ou lisser une contradiction.",
        },
        {
          type: "exercice",
          title: "Mener et synthétiser vos entretiens de découverte",
          instructions: `
1. **Votre segment et vos early adopters** : décrivez-les en 5 lignes maximum, en reprenant les cinq traits vus dans la leçon.
2. **Votre persona hypothèse** : situation, objectifs, frustrations, solutions actuelles, critères de choix, où le trouver.
3. **Votre script** : adaptez le script type à votre projet (8 à 12 questions, tournées vers le passé).
4. **Vos entretiens** : menez au moins 5 entretiens avec des personnes de votre segment, dont une majorité hors de votre cercle proche.
5. **Votre synthèse** : les 3 enseignements principaux, les phrases citées les plus parlantes (anonymisées), les hypothèses confirmées ou fragilisées, et votre persona corrigé.

Les 30 minutes estimées couvrent la préparation et la synthèse. Les entretiens eux-mêmes se planifient en parallèle des leçons suivantes. S’ils ne sont pas tous réalisés au moment du dépôt, remettez votre script et les synthèses disponibles, en indiquant les dates prévues pour les suivants.
`,
          deliverable: "texte",
          estimatedMinutes: 30,
          review: "formateur",
          rubric: [
            "Le segment et les early adopters sont précis et atteignables.",
            "Le script ne contient ni question orientée ni question hypothétique.",
            "La synthèse s’appuie sur des faits et des citations anonymisées, pas sur des opinions.",
            "Les hypothèses sont explicitement confirmées, fragilisées ou laissées ouvertes.",
            "Le persona a été corrigé à la lumière des entretiens.",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m01-l03",
      title: "Formuler sa proposition de valeur",
      summary: "Formuler une proposition de valeur, un one-liner et une différenciation crédibles.",
      estimatedMinutes: 35,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez formuler votre proposition de valeur, la résumer en une phrase et expliquer ce qui vous distingue des alternatives existantes.

## Qu’est-ce qu’une proposition de valeur ?

La proposition de valeur est la promesse que vous faites à votre cible : **le bénéfice concret** qu’elle obtiendra avec votre produit, **par rapport à ce qu’elle fait aujourd’hui**. Ce n’est pas une liste de fonctionnalités. « Réservation en ligne » est une fonctionnalité ; « ne plus passer ses soirées à caler des rendez-vous par message » est un bénéfice.

## Le canevas de proposition de valeur

Le canevas de proposition de valeur, popularisé par Alexander Osterwalder et Strategyzer, aide à vérifier l’adéquation entre ce que vit votre cible et ce que vous proposez. Il a deux côtés.

**Le profil client**, à remplir à partir de vos entretiens :

- **les tâches** : ce que la personne cherche à accomplir (ses jobs) ;
- **les problèmes** : ce qui la gêne, la bloque, lui coûte ou l’inquiète ;
- **les gains** : ce qu’elle espère obtenir, y compris au-delà de la tâche elle-même.

**L’offre**, ce que vous proposez :

- **les produits et services** : ce que vous proposez concrètement ;
- **les solutions aux problèmes** : comment votre offre supprime ou réduit chaque problème ;
- **les créateurs de gains** : comment elle produit les gains attendus.

L’adéquation existe quand vos solutions répondent aux problèmes **les plus importants** de votre cible, pas à des problèmes secondaires.

| Profil du coach | Offre de Créno |
| --- | --- |
| Tâche : remplir son planning et être payé | Une page de réservation avec paiement en ligne |
| Problème : des soirées à répondre aux messages | Le client réserve seul, sans échange de messages |
| Problème : les impayés et les relances | Le paiement a lieu au moment de la réservation |
| Problème : les oublis de séance | Un rappel automatique part la veille |
| Gain : paraître professionnel | Une page de réservation soignée, au nom du coach |

## Le one-liner

Le one-liner résume votre proposition de valeur en une phrase. Une trame simple :

> [!info] [Produit] aide [cible] à [résultat] grâce à [mécanisme], sans [irritant actuel].

Pour Créno : « Créno aide les coachs sportifs indépendants à remplir leur planning et à être payés d’avance, grâce à une page de réservation en ligne, sans passer leurs soirées à échanger des messages. »

Un bon one-liner :

- se comprend en dix secondes par quelqu’un qui ne connaît pas votre secteur ;
- nomme une cible précise ;
- promet un résultat, pas une technologie (« grâce à l’IA » n’est pas un bénéfice) ;
- évite les superlatifs : « révolutionnaire », « unique », « le meilleur ».

## Se différencier

Vos concurrents ne sont pas seulement les produits similaires au vôtre. Pensez à **toutes les alternatives** : ne rien faire, les messages et le carnet, un tableur, un outil généraliste de prise de rendez-vous, une plateforme qui met en relation coachs et clients.

« Nous n’avons pas de concurrent » est presque toujours faux, et c’est un signal inquiétant pour un investisseur ou un jury : soit le problème n’existe pas, soit l’analyse n’a pas été faite.

| Alternative | Force | Limite pour notre cible |
| --- | --- | --- |
| Messages et carnet | Gratuit, déjà en place | Chronophage, pas de paiement garanti |
| Tableur ou agenda partagé | Simple, flexible | Le client ne peut ni réserver ni payer seul |
| Outil généraliste de prise de rendez-vous | Complet, éprouvé | Pensé pour de nombreux métiers, à paramétrer soi-même |
| Plateforme de mise en relation | Apporte des clients | Le coach dépend de la plateforme et de ses conditions |

Pour un MVP, la différenciation vient rarement d’une fonctionnalité que personne d’autre n’a. Elle vient plus souvent d’une **cible plus précise**, d’un **parcours plus simple** pour cette cible, ou d’une **combinaison** mieux pensée. La différenciation de Créno (la simplicité pour le coach qui travaille seul) est elle-même une hypothèse, que vous vérifierez avec vos testeurs au module 7.
`,
        },
        {
          type: "prompt",
          title: "Challenger votre proposition de valeur",
          tool: "Claude",
          prompt: `
Joue successivement deux rôles critiques.

Rôle 1 : [DÉCRIVEZ VOTRE EARLY ADOPTER, par exemple « un coach sportif indépendant, débordé, méfiant envers les nouveaux outils »].
Rôle 2 : un membre exigeant du jury d’un incubateur.

Voici ma proposition de valeur :
- Cible : [...]
- Problèmes principaux, issus de mes entretiens : [...]
- Offre et bénéfices : [...]
- One-liner : [...]
- Alternatives utilisées aujourd’hui par ma cible : [...]

Pour chaque rôle :
1. Donne les 5 objections les plus sérieuses, formulées comme cette personne les dirait.
2. Indique quelles objections pourraient être levées par un fait vérifiable, et comment le vérifier.
3. Propose 3 reformulations de mon one-liner, plus claires et plus concrètes, sans superlatif.

Ne cite aucun chiffre de marché et n’invente aucun concurrent précis.
`,
          tips: "Soumettez le même prompt à ChatGPT et comparez les objections. Gardez celles que vous pouvez vérifier auprès de vrais utilisateurs ; les autres ne sont que des opinions.",
        },
        {
          type: "quiz",
          title: "Auto-vérification : proposition de valeur",
          questions: [
            {
              prompt: "Lequel de ces éléments est un bénéfice, et non une fonctionnalité ?",
              options: [
                { label: "Ne plus passer ses soirées à caler des rendez-vous par message", correct: true },
                { label: "La réservation en ligne" },
                { label: "Le paiement par carte" },
                { label: "Un tableau de bord" },
              ],
              explanation:
                "Un bénéfice décrit ce qui change pour la personne. Les trois autres réponses décrivent des moyens (des fonctionnalités) qui produisent ce bénéfice.",
            },
            {
              prompt: "Quand y a-t-il adéquation entre le profil client et l’offre ?",
              options: [
                { label: "Quand l’offre répond aux problèmes les plus importants de la cible", correct: true },
                { label: "Quand l’offre contient plus de fonctionnalités que la concurrence" },
                { label: "Quand le canevas est entièrement rempli" },
                { label: "Quand l’équipe est convaincue par son idée" },
              ],
              explanation:
                "Le canevas n’a de valeur que s’il relie vos solutions aux problèmes réellement prioritaires pour la cible, tels qu’ils ressortent de vos entretiens.",
            },
            {
              prompt: "Que révèle généralement la phrase « nous n’avons pas de concurrent » ?",
              options: [
                { label: "Une analyse insuffisante des alternatives utilisées par la cible", correct: true },
                { label: "Un avantage décisif qu’il faut mettre en avant" },
                { label: "Un marché forcément très rentable" },
                { label: "Un projet prêt à lever des fonds" },
              ],
              explanation:
                "Votre cible fait déjà quelque chose pour régler son problème, même mal. Ces alternatives sont vos vrais concurrents.",
            },
          ],
        },
        {
          type: "exercice",
          title: "Votre canevas de proposition de valeur et votre one-liner",
          instructions: `
1. Remplissez le canevas de proposition de valeur de votre projet sous forme de tableau à deux colonnes, comme l’exemple de Créno, à partir de vos entretiens et non de votre intuition.
2. Rédigez trois versions de votre one-liner, puis choisissez-en une et expliquez votre choix en une phrase.
3. Listez au moins quatre alternatives utilisées aujourd’hui par votre cible, avec leur force et leur limite.
4. Formulez votre différenciation en une phrase, ainsi que l’hypothèse qu’elle suppose.
`,
          deliverable: "texte",
          estimatedMinutes: 20,
          review: "auto",
          rubric: [
            "Le profil client s’appuie sur des éléments issus des entretiens.",
            "Chaque problème important a une réponse dans l’offre.",
            "Le one-liner nomme une cible, un résultat et un mécanisme, sans superlatif.",
            "Au moins quatre alternatives sont analysées honnêtement.",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m01-l04",
      title: "Scoper son MVP",
      summary: "Choisir le bon type de MVP et réduire votre produit à un parcours clé priorisé.",
      estimatedMinutes: 55,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez choisir le type de MVP adapté à votre hypothèse principale, réduire votre produit à un seul parcours clé et écrire noir sur blanc ce que votre MVP ne fera pas.

## Un MVP sert à apprendre

Le « minimum » du MVP porte sur l’effort : ce qui est nécessaire, et rien de plus, pour tester votre hypothèse la plus risquée. Le « viable » porte sur la valeur : sur son parcours principal, le produit doit réellement rendre le service promis. Un MVP n’est donc ni une maquette qui ne fonctionne pas, ni une version complète « en plus petit ».

La question à se poser n’est pas « qu’est-ce que je peux construire ? » mais « **quelle est la façon la plus économique de vérifier mon hypothèse la plus risquée ?** »

## Quatre types de MVP

| Type | Principe | Ce qu’il teste | Exemple Créno |
| --- | --- | --- | --- |
| Landing page | Une page qui présente l’offre et propose une action (liste d’attente, précommande) | L’intérêt pour la promesse | Une page « Créno arrive bientôt » avec inscription des coachs |
| Concierge | Vous rendez le service à la main, et le client sait qu’une personne s’en occupe | La valeur du service et son déroulé réel | Vous gérez les réservations de trois coachs avec Airtable, n8n et une page de réservation simple |
| Magicien d’Oz | L’utilisateur voit un produit qui semble automatique, mais une personne agit en coulisses | L’expérience utilisateur, avant d’automatiser | Le client réserve via un formulaire, vous confirmez et envoyez vous-même le lien de paiement |
| Fonction unique | Une seule fonctionnalité, réellement construite | L’usage réel du cœur du produit | Réserver et payer un créneau, rien d’autre |

Ces types se combinent : une landing page peut précéder un concierge, qui précède une fonction unique. Dans cette formation, vous construirez une **fonction unique** qui couvre votre parcours clé, parce que c’est ce qui permet de tester l’usage réel. Rien ne vous empêche de lancer en parallèle une landing page ou un concierge pour apprendre plus vite.

> [!warning] Le magicien d’Oz ne doit pas tromper vos utilisateurs sur ce qui compte pour eux : sécurité, paiement, données personnelles. Si une étape est faite à la main, le service rendu doit être réel, et vous devez pouvoir l’expliquer honnêtement si on vous le demande.

## Un seul parcours clé

Le **parcours clé** est la suite d’étapes par laquelle un utilisateur obtient la valeur principale de votre produit, du début à la fin. Pour Créno :

1. Le coach crée son compte et publie un créneau.
2. Le client ouvre la page de réservation du coach.
3. Il choisit un créneau disponible.
4. Il paie en ligne.
5. Il reçoit une confirmation ; le coach voit la réservation.
6. La veille, le client reçoit un rappel automatique.

Tout ce qui n’est pas indispensable à ce parcours attend. Pour chaque idée de fonctionnalité, posez la question : **si je la retire, le parcours clé fonctionne-t-il encore ?** Si oui, elle n’est pas prioritaire.

## Prioriser avec MoSCoW

La méthode MoSCoW classe chaque fonctionnalité en quatre catégories :

- **Must have** (indispensable) : sans elle, le parcours clé ne fonctionne pas ;
- **Should have** (important) : forte valeur, mais un contournement existe ;
- **Could have** (souhaitable) : agréable, si le temps le permet ;
- **Won’t have this time** (pas cette fois) : exclu du MVP, consciemment.

| Catégorie | Créno |
| --- | --- |
| Must | Compte coach, publication de créneaux, page de réservation, paiement en ligne, confirmation, rappel la veille |
| Should | Annulation par le client selon une règle simple, liste des réservations côté coach |
| Could | Packs de séances, séances collectives, statistiques |
| Won’t | Application mobile à installer, messagerie intégrée, synchronisation avec d’autres agendas, facturation avancée |

Gardez la catégorie Must courte : elle doit pouvoir être construite pendant le module 6. Si elle déborde, c’est que certains Must sont en réalité des Should.

## La liste « ce que le MVP ne fera pas »

Écrire explicitement ce que votre MVP ne fera pas vous protège de la **dérive du périmètre** (en anglais *scope creep*) : cette tendance à ajouter « juste une petite fonctionnalité » à chaque étape, jusqu’à ne jamais terminer. Cette liste vous sert aussi face aux testeurs : quand l’un d’eux réclame une fonctionnalité exclue, vous la notez pour plus tard, sans renégocier votre périmètre.

Dans son MVP, Créno ne proposera pas d’application mobile à installer, de messagerie entre coach et client, de gestion d’abonnements ou de packs, de séances collectives, de synchronisation avec d’autres agendas ni de programmes d’entraînement.

## Valider votre périmètre

Votre périmètre est bon si :

- il se teste en un seul parcours, de bout en bout ;
- chaque Must est relié à une hypothèse que vous voulez vérifier ;
- il est réaliste au regard du temps dont vous disposez ;
- vous savez à l’avance quel signal vous dira que le test est réussi (par exemple, un nombre de réservations payées fixé avant le lancement).
`,
        },
        {
          type: "video",
          title: "Quatre façons de tester une idée",
          durationMinutes: 5,
          script: `
- Rappel : un MVP sert à apprendre, pas à construire « petit ».
- Landing page, concierge, magicien d’Oz, fonction unique : principe et exemple Créno pour chacun.
- Comment choisir le type de MVP selon l’hypothèse à tester.
- Le parcours clé de Créno dessiné en six étapes au tableau.
- Tri MoSCoW en direct d’une douzaine d’idées de fonctionnalités.
- La liste « ce que Créno ne fera pas » et son usage face aux testeurs.
`,
        },
        {
          type: "ressource",
          resourceId: "res_scope_mvp",
          note: "Le canevas de scope MVP reprend les étapes de cette leçon : hypothèse testée, type de MVP, parcours clé, tableau MoSCoW, liste « ne fera pas » et signal de réussite. Utilisez-le pour l’exercice.",
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : le risque de trop construire

Votre risque principal n’est pas de ne pas y arriver : c’est de construire trop. Quelques règles pour un MVP :

- n’écrivez pas votre propre système d’authentification : utilisez celui de Supabase ;
- pour le paiement, préférez une page de paiement hébergée par votre prestataire (par exemple Stripe Checkout) à un formulaire de carte bancaire intégré à votre application ;
- une seule application, une seule base de données : pas de microservices ni d’architecture « prête pour un million d’utilisateurs » ;
- chaque ligne de code doit servir le parcours clé.

Estimez chaque Must en demi-journées. Si le total dépasse le temps dont vous disposerez au module 6, recoupez.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Profil non technique : construire ou commencer en concierge

Deux chemins s’offrent à vous. Le premier : construire votre parcours clé avec Bolt.new et Supabase au module 6. Le second : démarrer par un MVP concierge (Airtable pour les données, n8n pour les automatisations, une page de réservation simple), plus rapide à mettre en place et très riche en apprentissages. Dans les deux cas, votre parcours clé devra être accessible en ligne à l’issue du module 6.

Gardez un périmètre encore plus étroit que vous ne le pensez : chaque fonctionnalité générée par l’IA est une fonctionnalité que vous devrez comprendre, tester et maintenir. Mieux vaut trois écrans qui fonctionnent parfaitement que dix écrans fragiles.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Profil reconversion : réduire n’est pas renoncer

Un peu de vocabulaire : le **scope** (ou périmètre) est l’ensemble de ce que votre produit fera ; **scoper**, c’est décider de ce périmètre. Une **fonctionnalité** est une chose que le produit permet de faire : réserver, payer, annuler.

Couper des fonctionnalités peut donner l’impression d’abandonner une partie de votre projet. Ce n’est pas le cas : vous les rangez dans la catégorie « pas cette fois ». Elles reviendront si vos utilisateurs les réclament. Un MVP réduit, terminé et testé vaut mieux qu’un projet ambitieux qui n’est jamais mis en ligne.
`,
        },
        {
          type: "exercice",
          title: "Scoper votre MVP",
          instructions: `
À l’aide du canevas de scope MVP, rédigez le périmètre de votre MVP :

1. **Hypothèse principale** : l’hypothèse la plus risquée que votre MVP doit tester (issue de la leçon 1, corrigée après vos entretiens).
2. **Type de MVP** : landing page, concierge, magicien d’Oz ou fonction unique (éventuellement une combinaison), et pourquoi.
3. **Parcours clé** : 5 à 8 étapes numérotées, du point de vue de l’utilisateur.
4. **Tableau MoSCoW** : au moins 10 fonctionnalités réparties dans les quatre catégories.
5. **Ce que le MVP ne fera pas** : au moins 5 exclusions explicites.
6. **Signal de réussite** : ce que vous devrez observer pour considérer le test comme réussi, fixé avant de lancer.

Copiez le contenu de votre canevas complété dans le champ de réponse.
`,
          deliverable: "texte",
          estimatedMinutes: 30,
          review: "formateur",
          rubric: [
            "L’hypothèse testée est bien la plus risquée, et le type de MVP est cohérent avec elle.",
            "Le parcours clé est complet, de bout en bout, en 5 à 8 étapes.",
            "La catégorie Must ne contient que l’indispensable au parcours clé.",
            "Au moins 5 exclusions explicites sont listées.",
            "Le signal de réussite est observable et fixé à l’avance.",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m01-l05",
      title: "Rédiger un cahier des charges léger (PRD)",
      summary: "Rédiger un PRD d’une à deux pages avec l’aide de l’IA, puis le relire de façon critique.",
      estimatedMinutes: 50,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez rédiger un cahier des charges léger d’une à deux pages, le faire produire en premier jet par une IA et le relire d’un œil critique. Ce document servira de contexte à tous vos outils IA pendant la construction.

## Pourquoi un PRD, même quand on est seul

Un PRD (*Product Requirements Document*, ou document d’exigences produit) décrit **ce que** le produit doit faire et **pourquoi**, sans détailler **comment** le construire. Dans une grande entreprise, il coordonne des équipes. Pour vous, il a trois usages :

- **clarifier votre pensée** : ce qui n’est pas écrit clairement n’est pas encore décidé ;
- **servir de référence** : quand un doute surgit pendant la construction (« est-ce qu’on gère l’annulation ? »), la réponse est dans le PRD ;
- **nourrir vos outils IA** : un agent de code, un générateur d’application ou un assistant produit un bien meilleur résultat quand il reçoit un contexte précis. Votre PRD sera ce contexte.

Un PRD léger tient en une à deux pages. Au-delà, personne ne le relit, vous compris.

## La structure

1. **Problème et contexte** : votre énoncé de problème, en 3 à 5 lignes.
2. **Cible et early adopters** : qui, dans quelle situation.
3. **Proposition de valeur** : votre one-liner.
4. **Parcours clé** : les étapes numérotées.
5. **User stories** : 5 à 10 besoins, chacun formulé du point de vue d’un utilisateur.
6. **Critères d’acceptation** : pour chaque user story, les conditions vérifiables qui disent qu’elle est terminée.
7. **Hors périmètre** : votre liste « ce que le MVP ne fera pas ».
8. **Métriques de succès** : les indicateurs que vous suivrez et votre signal de réussite.
9. **Contraintes et questions ouvertes** : données personnelles, paiement, délais, points non tranchés.

### User stories et critères d’acceptation

Une **user story** décrit un besoin avec la formule « En tant que [rôle], je veux [action], afin de [bénéfice] ». Elle reste courte et parle de l’utilisateur, pas de la technique.

Un **critère d’acceptation** est une condition que l’on peut vérifier par un test, avec une réponse par oui ou par non. La formule « Étant donné… quand… alors… » aide à les écrire sans ambiguïté.

Extrait du PRD de Créno :

- **US1** : en tant que coach, je veux publier un créneau (date, heure, durée, lieu, prix, nombre de places) afin que mes clients le réservent sans m’écrire.
- **US2** : en tant que client, je veux voir les créneaux disponibles d’un coach afin de choisir celui qui me convient.
- **US3** : en tant que client, je veux réserver et payer en ligne afin de garantir ma place.
- **US4** : en tant que client, je veux recevoir un rappel la veille afin de ne pas oublier ma séance.
- **US5** : en tant que coach, je veux voir mes réservations et leur statut de paiement afin de préparer mes séances.

Critères d’acceptation de l’US3 :

- Étant donné un créneau avec une place libre, quand le client paie avec succès, alors la réservation est confirmée et le nombre de places restantes diminue d’une unité.
- Étant donné un créneau complet, quand un client ouvre la page, alors il ne peut pas le réserver.
- Étant donné un paiement échoué ou abandonné, alors aucune réservation n’est confirmée et la place reste disponible.

Métriques de Créno : nombre de réservations payées par coach et par semaine ; part des créneaux publiés qui sont réservés ; nombre de coachs qui publient des créneaux deux semaines de suite.

## Générer avec l’IA, puis relire en critique

Un assistant IA produit en une minute un PRD bien présenté. C’est un gain de temps réel, à une condition : le **relire comme s’il avait été écrit par un stagiaire brillant qui n’a jamais rencontré vos utilisateurs**.

La méthode :

1. Rassemblez vos matériaux : énoncé de problème, synthèse anonymisée des entretiens, canevas de proposition de valeur, périmètre MoSCoW.
2. Demandez un PRD dans la structure ci-dessus, en précisant de ne rien inventer (voir le prompt ci-dessous).
3. Relisez ligne par ligne : chaque affirmation est-elle vraie, vérifiable, issue de vos matériaux ?
4. Coupez : visez une à deux pages.
5. Datez et numérotez : « PRD v1 », avec la date. Le document évoluera ; gardez les versions successives.

Les défauts les plus fréquents d’un PRD généré sont des **fonctionnalités ajoutées** que vous n’aviez pas prévues (l’IA a tendance à compléter), des **chiffres inventés** (« augmenter la rétention de 30 % »), des **critères non testables** (« l’interface est intuitive »), du **jargon** et une longueur excessive.
`,
        },
        {
          type: "prompt",
          title: "Générer le premier jet de votre PRD",
          tool: "Claude",
          prompt: `
Tu es un product manager expérimenté, habitué aux MVP. À partir de mes notes ci-dessous, rédige un PRD d’une à deux pages maximum, en français, au format Markdown.

Structure imposée :
1. Problème et contexte
2. Cible et early adopters
3. Proposition de valeur (one-liner)
4. Parcours clé (étapes numérotées)
5. User stories (formule « En tant que…, je veux…, afin de… », 5 à 10, numérotées US1, US2…)
6. Critères d’acceptation (formule « Étant donné… quand… alors… », 2 à 3 par user story)
7. Hors périmètre
8. Métriques de succès
9. Contraintes et questions ouvertes

Règles :
- N’ajoute aucune fonctionnalité absente de mon périmètre ; si tu en suggères, place-les dans une section séparée « Suggestions non retenues ».
- N’invente aucun chiffre ; si une valeur manque, écris [À DÉFINIR].
- Chaque critère d’acceptation doit pouvoir être vérifié par un test (oui ou non).
- Pas de jargon technique : ce document décrit le quoi et le pourquoi, pas le comment.

Mes notes :
- Énoncé de problème : [...]
- Synthèse anonymisée des entretiens : [...]
- Proposition de valeur et one-liner : [...]
- Périmètre MoSCoW et liste « ne fera pas » : [...]
- Signal de réussite : [...]
`,
          tips: "Fonctionne aussi dans ChatGPT. Après la réponse, demandez : « Liste tout ce que tu as ajouté qui ne figurait pas dans mes notes. » Supprimez ou validez chaque ajout. Ne collez aucune donnée personnelle.",
        },
        {
          type: "checklist",
          title: "Relecture critique de votre PRD",
          items: [
            "Le PRD tient en une à deux pages.",
            "Chaque affirmation provient de mes notes ou de mes entretiens.",
            "Aucune fonctionnalité hors de mon périmètre MoSCoW n’a été ajoutée.",
            "Aucun chiffre n’est inventé : les valeurs inconnues sont marquées [À DÉFINIR].",
            "Chaque user story suit la formule « En tant que…, je veux…, afin de… ».",
            "Chaque critère d’acceptation se vérifie par oui ou par non.",
            "La section hors périmètre reprend ma liste « ne fera pas ».",
            "Le document est daté et numéroté (v1).",
          ],
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : votre PRD dans le dépôt

Au module 6, votre PRD deviendra un fichier Markdown de votre dépôt, par exemple \`docs/PRD.md\`. Vous le référencerez dans les instructions de votre agent de code : le fichier \`CLAUDE.md\` pour Claude Code, les règles de projet dans Cursor, le fichier \`AGENTS.md\` pour Codex. L’agent disposera ainsi du contexte à chaque session, sans que vous ayez à réexpliquer le projet.

Soignez vos critères d’acceptation : ils se transforment presque directement en tests automatisés. Résistez en revanche à l’envie d’ajouter une section technique détaillée : l’architecture fera l’objet du module 4, dans un document séparé.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Profil non technique : votre PRD comme brief pour Bolt.new

Au module 6, votre PRD sera la base de vos demandes à Bolt.new. Vous ne le collerez pas d’un bloc : vous donnerez d’abord le contexte (problème, cible, parcours clé), puis vous ferez construire l’application **une user story à la fois**, en vérifiant les critères d’acceptation avant de passer à la suivante.

C’est pourquoi la qualité de vos user stories compte autant : une user story claire donne une demande claire, et une demande claire donne un résultat que vous pouvez vérifier.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Profil reconversion : le vocabulaire du PRD

| Mot | Signification |
| --- | --- |
| PRD | Document qui décrit ce que le produit doit faire, et pourquoi |
| User story | Un besoin d’utilisateur, en une phrase : « En tant que…, je veux…, afin de… » |
| Critère d’acceptation | Une condition vérifiable qui dit si une user story est terminée |
| Hors périmètre | Ce que le produit ne fera pas dans cette version |
| Métrique | Un chiffre que l’on suit pour savoir si le produit atteint son but |

Votre premier PRD n’a pas besoin d’être parfait : c’est une version 1, que vous améliorerez après les maquettes et les tests. Ce qui compte, c’est qu’il soit clair et honnête.
`,
        },
        {
          type: "exercice",
          title: "Votre PRD v1",
          instructions: `
Rédigez le PRD v1 de votre MVP.

1. Générez un premier jet avec le prompt ci-dessus, à partir de vos livrables des leçons précédentes.
2. Relisez-le avec la checklist de relecture critique et corrigez-le à la main.
3. Publiez-le dans votre page Notion « Mon MVP » (sous-page PRD), sous le titre « PRD v1 » suivi de la date.
4. En fin de document, ajoutez une courte note : ce que vous avez modifié par rapport au premier jet de l’IA, et pourquoi.
5. Rendez la page accessible en lecture seule par lien (option de partage ou de publication de Notion), vérifiez que le lien s’ouvre dans une fenêtre de navigation privée, puis collez-le dans le champ de réponse.
`,
          deliverable: "lien",
          estimatedMinutes: 30,
          review: "formateur",
          rubric: [
            "Les neuf sections sont présentes et le document tient en une à deux pages.",
            "Les user stories suivent la formule et couvrent tout le parcours clé.",
            "Chaque user story a des critères d’acceptation testables.",
            "Le hors périmètre et les métriques sont cohérents avec le scope du MVP.",
            "La note de relecture montre un regard critique sur le premier jet de l’IA.",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m01-l06",
      title: "Piloter son projet en mode agile",
      summary:
        "Organiser votre projet en sprints d’une semaine avec un backlog Notion et une définition de « fini ».",
      estimatedMinutes: 60,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez organiser votre projet en sprints d’une semaine, tenir un backlog dans Notion et planifier votre construction jusqu’à la fin de la formation.

## La gestion de projet digital en bref

Un projet se définit par un **objectif**, un **périmètre** (ce qui sera fait), un **délai**, des **ressources** (votre temps, votre budget, vos outils) et un niveau de **qualité**. Ces éléments sont liés : si le périmètre grossit, le délai s’allonge ou la qualité baisse.

Pour un MVP, la règle est simple : **on fixe le délai et le niveau de qualité, et on ajuste le périmètre**. Votre parcours clé doit être fiable et en ligne à une date donnée ; ce qui ne tient pas dans ce délai passe dans la catégorie « pas cette fois ».

## Les rôles, même quand on est seul

| Rôle | Responsabilité | Seul | En binôme |
| --- | --- | --- | --- |
| Responsable produit | Définit et ordonne les priorités, tranche les arbitrages | Vous | L’un des deux, désigné à l’avance |
| Facilitateur | Protège le rythme, anime les rituels, lève les obstacles | Vous | À tour de rôle |
| Réalisation | Construit, teste, met en ligne, avec l’aide d’agents IA | Vous | Les deux |
| Parties prenantes | Donnent leur avis, testent, conseillent | Testeurs, formateur, mentors | Idem |

Seul, vous portez toutes les casquettes : séparez les moments. En début de semaine, vous êtes responsable produit et vous décidez ; le reste de la semaine, vous réalisez sans remettre en cause les priorités à chaque heure. En binôme, décidez dès maintenant qui tranche en cas de désaccord sur une priorité.

## Scrum, adapté à votre projet

Scrum est un cadre de travail agile : on avance par cycles courts, on livre quelque chose d’utilisable à chaque cycle, et on améliore sa façon de travailler en continu. Sa définition de référence est le Scrum Guide, disponible sur [scrum.org](https://www.scrum.org). Nous en utilisons ici une version allégée, adaptée à une ou deux personnes : ce n’est pas du Scrum au sens strict, mais ses principes sont conservés.

### Les éléments

- **Le sprint** : un cycle d’une semaine, avec un **objectif de sprint** en une phrase (« Le client peut réserver et payer un créneau »).
- **Le backlog produit** : la liste ordonnée de tout ce qui reste à faire (user stories, tâches, corrections). Le plus important est en haut.
- **Le backlog de sprint** : les éléments choisis pour la semaine, et seulement ceux-là.
- **L’estimation** : une taille simple par élément : S (moins d’une demi-journée), M (environ une journée), L (davantage, donc à découper).
- **La définition de « fini »** : une liste de conditions communes à tous les éléments. Un élément n’est « fait » que s’il les remplit toutes.

La définition de « fini » de Créno :

- les critères d’acceptation de la user story sont vérifiés ;
- le parcours fonctionne sur mobile et sur ordinateur ;
- le code est enregistré sur GitHub (ou le projet Bolt.new est sauvegardé) ;
- la fonctionnalité est déployée sur une adresse de test ;
- aucun secret n’apparaît dans le code ni dans les prompts.

### Les rituels

| Rituel | Quand | Durée | Question clé |
| --- | --- | --- | --- |
| Planification | Début de sprint | 30 min | Quel objectif cette semaine, et quels éléments pour l’atteindre ? |
| Point quotidien | Chaque séance de travail | 5 min | Qu’ai-je fait, que vais-je faire, qu’est-ce qui me bloque ? |
| Revue | Fin de sprint | 30 min | Qu’est-ce qui fonctionne réellement ? Montrez-le à quelqu’un. |
| Rétrospective | Après la revue | 15 min | Qu’est-ce qui a bien marché, mal marché, et que change-t-on ? |

Le point quotidien peut se faire dans votre journal de bord. La revue gagne à se faire devant une autre personne : un testeur, un proche, votre binôme. La rétrospective produit **une** action concrète pour le sprint suivant, pas dix.

## Votre tableau dans Notion

Notion permet de créer une base de données et de l’afficher sous forme de tableau Kanban (une colonne par statut) ou de liste. Créez une base « Backlog » avec ces propriétés :

| Propriété | Type | Valeurs |
| --- | --- | --- |
| Titre | Titre | La user story ou la tâche |
| Statut | Statut ou sélection | À faire, En cours, Fait |
| Priorité | Sélection | Must, Should, Could, Won’t |
| Taille | Sélection | S, M, L |
| Sprint | Sélection | Sprint 1, Sprint 2… |
| Critères d’acceptation | Texte | Copiés depuis le PRD |

Créez deux vues : un **tableau Kanban** filtré sur le sprint en cours (votre outil de la semaine) et une **liste** complète triée par priorité (votre backlog produit). D’autres outils font la même chose, comme GitHub Projects, Trello ou un simple tableur : l’important est d’en avoir **un seul**, et à jour.

## Planifier vos sprints sur la formation

Votre planning dépend du temps dont vous disposez chaque semaine. À titre d’exemple, avec 5 à 6 heures par semaine :

| Sprint | Objectif | Modules |
| --- | --- | --- |
| 1 | Problème et cible étayés, PRD v1 | 1 |
| 2 | Prompts de travail et stack choisie | 2 et 3 |
| 3 | Modèle de données et maquettes du parcours clé | 4 et 5 |
| 4 à 6 | Parcours clé construit et en ligne | 6 |
| 7 | Tests utilisateurs et corrections | 7 |
| 8 | Page de lancement et premières actions d’acquisition | 8 |
| 9 | Deck, pitch vidéo et roadmap | 9 |

Adaptez ce tableau à votre rythme et gardez de la marge : ne planifiez pas plus des deux tiers de votre temps disponible, les imprévus se chargeront du reste.

## Les pièges à éviter

- **Le sprint surchargé** : mieux vaut terminer trois éléments que d’en commencer huit.
- **Le backlog infini** : une liste de souhaits n’est pas un plan ; archivez ce qui ne sera jamais fait.
- **La priorité qui change tous les jours** : sauf urgence, les changements attendent la planification suivante.
- **La rétrospective sautée** : c’est pourtant elle qui rend le sprint suivant plus efficace.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : relier votre backlog et GitHub

Vous pouvez gérer vos tâches dans les issues de GitHub et GitHub Projects plutôt que dans Notion : c’est pertinent si vous travaillez surtout dans votre éditeur. Choisissez un seul outil de référence et tenez-vous-y.

Complétez votre définition de « fini » : le code généré par l’agent a été relu, les tests automatisés passent, et chaque user story correspond à une branche et à des commits aux messages explicites (par exemple « US3 : paiement de la réservation »). Vous mettrez cela en pratique au module 6.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Profil non technique : une user story, une demande

Dans Bolt.new, découpez votre travail comme votre backlog : une user story par demande, vérifiée avant de passer à la suivante. Si une user story est de taille L, découpez-la avant de la confier à l’outil.

Votre revue de fin de sprint est particulièrement précieuse : montrez votre parcours à une personne de votre cible, même s’il est incomplet. Vous verrez très tôt ce qui n’est pas clair.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Profil reconversion : commencer simple

Le vocabulaire de l’agilité est souvent anglais et abondant. Retenez l’essentiel : un **sprint** est une semaine de travail avec un objectif ; le **backlog** est votre liste de choses à faire, classée par importance ; la **revue** consiste à montrer ce qui fonctionne ; la **rétrospective**, à se demander comment mieux travailler.

Si Notion vous semble intimidant, commencez par un tableau à trois colonnes (À faire, En cours, Fait) et ajoutez les propriétés une par une. Un outil simple et à jour vaut mieux qu’un outil complet et abandonné.
`,
        },
        {
          type: "prompt",
          title: "Transformer votre PRD en backlog",
          tool: "Tout assistant IA",
          prompt: `
Voici les user stories, les critères d’acceptation et le périmètre MoSCoW de mon PRD :

[COLLEZ LES SECTIONS CONCERNÉES DE VOTRE PRD]

Je dispose d’environ [NOMBRE] heures par semaine, en sprints d’une semaine.

1. Transforme chaque user story en éléments de backlog de taille S ou M (découpe les plus gros), avec leur priorité MoSCoW.
2. Présente le résultat sous forme de tableau : Titre, Priorité, Taille, Dépendances.
3. Propose une répartition des éléments Must et Should en sprints, sans dépasser les deux tiers de mon temps disponible par sprint.
4. Signale les éléments dont l’estimation te paraît incertaine.

N’ajoute aucun élément qui ne découle pas de mes user stories.
`,
          tips: "Recopiez ensuite le tableau dans votre base Notion (ou importez-le au format CSV). Vérifiez les tailles proposées : l’IA ne connaît ni votre niveau ni vos outils.",
        },
        {
          type: "exercice",
          title: "Votre backlog Notion et votre planning de sprints",
          instructions: `
1. Créez la base « Backlog » dans votre page Notion « Mon MVP », avec les propriétés de la leçon.
2. Ajoutez au moins 10 éléments issus de votre PRD, avec leur priorité et leur taille ; découpez tout élément de taille L.
3. Créez les deux vues : tableau Kanban du sprint en cours et liste complète triée par priorité.
4. Rédigez votre définition de « fini » (4 à 6 conditions) en haut de la page.
5. Ajoutez votre planning de sprints jusqu’à la fin de la formation, adapté à votre temps disponible.
6. Préparez le sprint 1 : un objectif en une phrase et les éléments sélectionnés.

Partagez la page en lecture seule et collez le lien dans le champ de réponse. En binôme, précisez qui tient le rôle de responsable produit.
`,
          deliverable: "lien",
          estimatedMinutes: 35,
          review: "formateur",
          rubric: [
            "Le backlog contient au moins 10 éléments priorisés et dimensionnés, sans élément de taille L.",
            "Les deux vues (Kanban du sprint, liste complète) sont en place.",
            "La définition de « fini » est concrète et vérifiable.",
            "Le planning de sprints est réaliste au regard du temps disponible.",
            "Le sprint 1 a un objectif clair et un contenu cohérent avec cet objectif.",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m01-l07",
      title: "Évaluation du module",
      summary: "Valider vos acquis du module 1 avec un quiz évalué.",
      estimatedMinutes: 20,
      blocks: [
        {
          type: "texte",
          markdown: `
Ce quiz évalue vos acquis sur l’ensemble du module 1 : problème et hypothèses, cible et entretiens, proposition de valeur, périmètre du MVP, PRD et organisation agile. Il compte dans votre évaluation.

## Avant de commencer

- Prévoyez une quinzaine de minutes au calme.
- Chaque question a une seule bonne réponse.
- Chaque question est accompagnée d’une explication : lisez-la, même quand vous avez répondu juste.
- Le score attendu est indiqué dans le livret d’accueil. Si une notion vous a échappé, relisez la leçon correspondante et n’hésitez pas à interroger votre formateur via la messagerie de Mon espace.
`,
        },
        {
          type: "quiz",
          title: "Évaluation du module 1 : cadrer son problème et son MVP",
          graded: true,
          questions: [
            {
              prompt: "Lequel de ces énoncés de problème est le plus exploitable ?",
              options: [
                { label: "« Les coachs ont besoin d’une application de réservation. »" },
                { label: "« Le marché du sport est en pleine croissance. »" },
                { label: "« Les coachs indépendants passent leurs soirées à caler leurs séances par messages et à relancer les impayés, ce qui leur coûte du temps non facturé. »", correct: true },
                { label: "« Les gens veulent faire plus de sport. »" },
              ],
              explanation:
                "Un énoncé exploitable précise la cible, la situation, la cause et la conséquence. Les autres décrivent une solution, un contexte de marché ou une généralité.",
            },
            {
              prompt: "Quelle hypothèse faut-il tester en priorité ?",
              options: [
                { label: "Celle qui est critique pour le projet et pour laquelle vous avez le moins de preuves", correct: true },
                { label: "Celle qui est la plus facile à tester" },
                { label: "Celle que votre entourage trouve la plus convaincante" },
                { label: "Toujours celle qui concerne la faisabilité technique" },
              ],
              explanation:
                "On teste d’abord ce qui ferait s’effondrer le projet si c’était faux et que l’on n’a pas encore prouvé. Une hypothèse facile à tester mais secondaire peut attendre.",
            },
            {
              prompt: "Parmi ces personnes, laquelle correspond le mieux à un early adopter pour Créno ?",
              options: [
                { label: "Une coach indépendante débordée par les messages, qui a déjà essayé un agenda partagé sans succès et que vous pouvez joindre facilement", correct: true },
                { label: "Un coach salarié d’une grande salle de sport, dont le planning est géré par son employeur" },
                { label: "Un ami sportif qui trouve l’idée excellente" },
                { label: "Une coach satisfaite de son outil actuel, qui ne cherche rien d’autre" },
              ],
              explanation:
                "Un early adopter a le problème, en a conscience, cherche ou bricole déjà une solution, a les moyens de changer et est accessible.",
            },
            {
              prompt: "Quelle question respecte les bonnes pratiques d’un entretien de découverte ?",
              options: [
                { label: "« Utiliseriez-vous une application qui gère vos réservations ? »" },
                { label: "« Ne trouvez-vous pas que les messages font perdre beaucoup de temps ? »" },
                { label: "« Racontez-moi comment s’est passée la dernière réservation que vous avez gérée. »", correct: true },
                { label: "« Combien paieriez-vous pour mon application ? »" },
              ],
              explanation:
                "Les questions sur le passé concret produisent des faits. Les autres sont hypothétiques, orientées ou centrées sur votre solution, et suscitent des réponses de complaisance.",
            },
            {
              prompt: "Quel one-liner est le mieux formulé ?",
              options: [
                { label: "« Créno, la plateforme révolutionnaire du coaching propulsée par l’IA. »" },
                { label: "« Créno aide les coachs sportifs indépendants à remplir leur planning et à être payés d’avance, sans échanger de messages. »", correct: true },
                { label: "« Créno est une application web construite avec Next.js, Supabase et Stripe. »" },
                { label: "« Créno, pour tous ceux qui aiment le sport. »" },
              ],
              explanation:
                "Un bon one-liner nomme une cible précise et un résultat concret, sans superlatif ni jargon technique.",
            },
            {
              prompt: "Quelle est la différence entre un MVP concierge et un MVP magicien d’Oz ?",
              options: [
                { label: "Dans le concierge, le client sait qu’une personne rend le service ; dans le magicien d’Oz, le service semble automatique alors qu’une personne agit en coulisses", correct: true },
                { label: "Le concierge est entièrement automatisé, le magicien d’Oz est manuel" },
                { label: "Le magicien d’Oz est une landing page, le concierge une application" },
                { label: "Il n’y a aucune différence : ce sont deux noms pour le même type de MVP" },
              ],
              explanation:
                "Les deux sont réalisés à la main, mais le concierge l’assume auprès du client, alors que le magicien d’Oz présente une interface qui semble automatisée.",
            },
            {
              prompt:
                "Dans la méthode MoSCoW, où classez-vous une application mobile à installer pour Créno, alors que le parcours clé fonctionne déjà dans le navigateur ?",
              options: [
                { label: "Must have" },
                { label: "Should have" },
                { label: "Could have" },
                { label: "Won’t have this time", correct: true },
              ],
              explanation:
                "Le parcours clé fonctionne sans elle et elle demanderait un effort important : elle est consciemment exclue du MVP, quitte à revenir plus tard si les utilisateurs la réclament.",
            },
            {
              prompt: "Lequel de ces critères d’acceptation est correctement rédigé ?",
              options: [
                { label: "« L’interface de paiement est simple et intuitive. »" },
                { label: "« Étant donné un créneau complet, quand un client ouvre la page, alors il ne peut pas le réserver. »", correct: true },
                { label: "« Le paiement doit être rapide. »" },
                { label: "« Les utilisateurs aiment la page de réservation. »" },
              ],
              explanation:
                "Un critère d’acceptation se vérifie par oui ou par non. « Simple », « rapide » ou « aiment » ne sont pas vérifiables en l’état.",
            },
            {
              prompt: "Pour un MVP, quelle variable ajuste-t-on en priorité lorsque le temps manque ?",
              options: [
                { label: "Le délai : on repousse la mise en ligne" },
                { label: "La qualité : on accepte un parcours clé qui fonctionne mal" },
                { label: "Le périmètre : on retire ce qui n’est pas indispensable au parcours clé", correct: true },
                { label: "Les ressources : on ajoute des outils payants" },
              ],
              explanation:
                "On fixe le délai et le niveau de qualité, et on ajuste le périmètre. C’est tout l’intérêt de la priorisation MoSCoW.",
            },
            {
              prompt: "À quoi sert la rétrospective en fin de sprint ?",
              options: [
                { label: "À montrer le produit à des utilisateurs" },
                { label: "À choisir les éléments du prochain sprint" },
                { label: "À identifier une amélioration concrète de votre façon de travailler pour le sprint suivant", correct: true },
                { label: "À réécrire entièrement le PRD" },
              ],
              explanation:
                "La revue sert à montrer ce qui fonctionne, la planification à choisir les éléments du sprint ; la rétrospective porte sur la façon de travailler et produit une action concrète.",
            },
          ],
        },
      ],
    },
  ],
};
