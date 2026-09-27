import type { SeedModule } from "../authoring";

export const M09: SeedModule = {
  key: "m09",
  title: "Pitch, roadmap et évaluation finale",
  summary:
    "Présenter votre MVP de façon convaincante (deck, démo, pitch vidéo), planifier les 30 jours qui suivent la formation et valider l’ensemble de vos acquis lors de l’évaluation finale.",
  objectives: [
    "Être capable de construire un pitch structuré en 10 à 12 slides, appuyé sur des faits vérifiables.",
    "Être capable de produire un deck avec un outil de génération comme Gamma à partir de son PRD et de sa trame, puis de le corriger et de l’harmoniser à la main.",
    "Être capable d’enregistrer une démo du parcours clé intégrée à un pitch vidéo de 3 minutes.",
    "Être capable d’élaborer une roadmap à 30 jours avec des priorités, des indicateurs et des rituels de suivi.",
    "Être capable de mobiliser l’ensemble des acquis de la formation lors de l’évaluation finale.",
  ],
  lessons: [
    // ─────────────────────────────────────────────────────────────
    {
      key: "m09-l01",
      title: "Construire son pitch",
      summary:
        "Construire la trame d’un pitch en 10 à 12 slides, structurée comme un récit et appuyée sur des faits.",
      estimatedMinutes: 50,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez construire la trame d’un pitch en 10 à 12 slides, raconter votre projet comme une histoire et éviter les erreurs qui font décrocher un jury.

## À quoi sert votre pitch

Un pitch est une présentation courte de votre projet, destinée à obtenir quelque chose : un rendez-vous, une place dans un programme d’accompagnement, un financement, un partenariat, des premiers clients. Son but n’est pas de tout dire, mais de donner envie d’aller plus loin.

Le même projet se présente différemment selon l’audience. Un investisseur regarde le marché, la traction et l’équipe. Un jury d’incubateur regarde votre capacité à apprendre et à avancer. Un client regarde le bénéfice pour lui. Construisez une trame de référence, puis adaptez l’ordre et le niveau de détail.

## La structure en 10 à 12 slides

| N° | Slide | La question à laquelle elle répond | Pour Créno |
| --- | --- | --- | --- |
| 1 | Titre | Qui êtes-vous, en une phrase ? | Nom, one-liner |
| 2 | Problème | Quel problème, pour qui, avec quel coût ? | Les soirées passées à gérer les réservations par messages |
| 3 | Solution | Que proposez-vous ? | Une page de réservation avec paiement et rappel |
| 4 | Démo | Est-ce que ça fonctionne vraiment ? | Captures ou courte vidéo du parcours clé |
| 5 | Marché | Combien de clients potentiels, et comment l’estimez-vous ? | Estimation à partir du nombre de coachs indépendants, source citée |
| 6 | Modèle économique | Qui paie, combien, comment ? | Abonnement du coach ou commission par réservation |
| 7 | Traction | Quelles preuves avez-vous déjà ? | Entretiens, coachs testeurs, réservations réelles |
| 8 | Concurrence | Quelles alternatives, et pourquoi vous ? | Messages, agendas partagés, outils généralistes |
| 9 | Équipe | Pourquoi vous ? | Expérience du métier, compétences, ce qui manque encore |
| 10 | Roadmap | Quelles sont les prochaines étapes ? | Les 30 prochains jours, puis les mois suivants |
| 11 | Demande | Qu’attendez-vous de l’audience ? | Accompagnement, mises en relation, financement |
| 12 | Contact | Comment vous joindre ? | Nom, e-mail, lien vers le produit |

### Quelques précisions

**Le marché** : préférez une estimation ascendante (en anglais *bottom-up*) : le nombre de clients cibles que vous pouvez réellement atteindre, multiplié par ce que chacun paierait. Citez vos sources (statistiques publiques, organisations professionnelles) directement sur la slide. Un chiffre non sourcé fragilise tout le reste.

**Le modèle économique** : montrez qui paie, combien et à quelle fréquence, puis les grandes masses de coûts. Le modèle financier sur 3 ans proposé en ressource vous aide à vérifier que vos hypothèses tiennent debout ; sur la slide, ne gardez que l’essentiel.

**La traction** : soyez honnête et précis. « Cinq entretiens, trois coachs testeurs, douze réservations réelles » sont des faits ; « de nombreux utilisateurs enthousiastes » n’en est pas un. Distinguez toujours ce qui est **en ligne** de ce qui est **prévu**.

**La demande** : c’est la slide la plus souvent oubliée. Dites précisément ce que vous attendez : un montant et son usage, une mise en relation, des testeurs, une place dans un programme.

## Raconter une histoire

Un pitch qui se contente d’empiler des informations s’oublie vite. Structurez-le comme un récit en trois temps :

1. **La situation** : une personne concrète, dans un moment concret. « Il est 22 heures. Sarah, coach indépendante, répond encore aux messages de ses clients pour caler les séances de la semaine. » Sarah est un personnage type, construit à partir de vos entretiens : dites-le.
2. **La tension** : ce que ce problème lui coûte, et pourquoi les solutions actuelles ne suffisent pas.
3. **La résolution** : votre produit, montré en action, et ce qui change pour Sarah.

Quelques règles de forme : **une idée par slide** ; des **titres-messages**, qui énoncent la conclusion de la slide (« Les coachs perdent leurs soirées à gérer des messages » plutôt que « Le problème ») ; peu de texte, lisible de loin ; des chiffres sourcés ; de vraies captures de votre produit plutôt que des illustrations génériques.

## Les erreurs courantes

- **Commencer par la solution** : sans problème ressenti, la solution n’intéresse personne.
- **Mettre trop de texte** : si l’audience lit, elle ne vous écoute plus.
- **Brandir un marché gigantesque** : « si nous captons 1 % d’un marché de plusieurs milliards… » ne démontre rien. Montrez plutôt comment vous atteignez vos premiers clients.
- **Affirmer « nous n’avons pas de concurrent »** : cela signale une analyse insuffisante.
- **Faire une démo en direct sans filet** : prévoyez toujours une vidéo de secours.
- **Abuser du jargon technique** : votre stack n’intéresse l’audience que si elle constitue un avantage. Parlez bénéfices.
- **Promettre ce qui n’existe pas** : un jury pose des questions, et la confiance se perd en une réponse.
- **Oublier la demande** : l’audience ne sait alors pas comment vous aider.

## Adapter la durée

Préparez deux versions : un pitch court de 3 minutes, limité aux slides essentielles (problème, solution, démo, traction, demande), et une version longue d’une dizaine de minutes avec toutes les slides. La version courte est celle que vous enregistrerez en vidéo à la leçon 3.
`,
        },
        {
          type: "video",
          title: "Anatomie d’un pitch : le deck de Créno slide par slide",
          durationMinutes: 7,
          script: `
- Accroche : le même projet pitché deux fois, d’abord en listant des fonctionnalités, puis en racontant l’histoire de Sarah.
- La structure en 12 slides, parcourue sur le deck de Créno, avec la question à laquelle répond chaque slide.
- Zoom sur les titres-messages : réécriture en direct de trois titres génériques.
- La slide marché : construire une estimation ascendante et citer ses sources.
- Les slides traction et modèle économique : présenter honnêtement des débuts modestes, en s’appuyant sur le modèle financier.
- La slide demande : trois formulations, de la plus vague à la plus précise.
- Les cinq erreurs les plus fréquentes, illustrées par des contre-exemples.
`,
        },
        {
          type: "ressource",
          resourceId: "res_pitch_deck",
          note: "Template de pitch deck en 12 slides : il reprend la structure de cette leçon. Dupliquez-le pour construire votre trame.",
        },
        {
          type: "ressource",
          resourceId: "res_modele_financier",
          note: "Modèle financier sur 3 ans : renseignez vos hypothèses de prix, de volume et de coûts pour construire la slide modèle économique et vérifier sa cohérence.",
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : parler bénéfices, pas architecture

Votre tentation sera de consacrer une slide entière à la stack. Sauf devant un public technique, remplacez-la par une phrase : ce que vos choix techniques permettent (aller vite, coûter peu, être fiable). Gardez un schéma d’architecture en annexe, pour répondre aux questions.

Votre force à mettre en avant : vous avez construit le produit vous-même et vous pouvez le faire évoluer rapidement. Votre point de vigilance : la connaissance du marché et des clients. Montrez que vous avez parlé à vos utilisateurs.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Profil non technique : votre expertise est votre argument

Votre connaissance du métier et de la cible est votre avantage principal : placez-la au centre des slides problème et équipe. Présentez l’usage de l’IA comme une force (vous avez construit et testé vite, à faible coût), sans le cacher ni en faire l’argument principal.

Attendez-vous à la question « qui fera évoluer le produit techniquement ? ». Préparez une réponse claire : vous-même avec les outils de la formation, un associé technique recherché, un prestataire.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Profil reconversion : votre parcours est une histoire

Votre changement de parcours n’est pas une faiblesse à cacher. Si votre ancien métier vous a fait rencontrer le problème, c’est le début idéal de votre récit. Sur la slide équipe, montrez vos compétences transférables : gestion de projet, relation client, connaissance d’un secteur.

Pour gagner en aisance, répétez à voix haute, debout, chronomètre en main. Plusieurs répétitions complètes changent beaucoup de choses. Enregistrez-vous au moins une fois pour repérer vos tics de langage.
`,
        },
        {
          type: "exercice",
          title: "La trame de votre pitch",
          instructions: `
Construisez la trame de votre pitch à l’aide du template de pitch deck.

1. Pour chacune des 12 slides, écrivez un **titre-message** (la conclusion de la slide en une phrase) et 2 à 3 points de contenu.
2. Pour la slide modèle économique, reportez les hypothèses principales de votre modèle financier (prix, volume, coûts majeurs).
3. Pour chaque chiffre, indiquez sa source ou marquez-le [À VÉRIFIER].
4. Rédigez l’ouverture de votre récit (situation et tension) en 3 à 4 phrases.
5. Indiquez les slides que vous garderez dans la version courte de 3 minutes.

Remettez votre trame dans le champ de réponse. Elle servira de texte source pour votre deck à la leçon suivante.
`,
          deliverable: "texte",
          estimatedMinutes: 25,
          review: "auto",
          rubric: [
            "Les 12 slides ont un titre-message explicite.",
            "Le problème précède la solution et la démo.",
            "Chaque chiffre est sourcé ou signalé comme à vérifier.",
            "La traction est présentée honnêtement, en distinguant l’existant du prévu.",
            "La slide demande est précise.",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m09-l02",
      title: "Créer son deck avec Gamma",
      summary: "Produire un premier jet de deck avec Gamma, puis le reprendre à la main.",
      estimatedMinutes: 40,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez produire un premier jet de deck avec Gamma à partir de votre trame et de votre PRD, puis le reprendre à la main pour obtenir un support fiable, sobre et cohérent.

## Ce que fait Gamma, et ce qu’il ne fait pas

Gamma est un outil qui génère des présentations (ainsi que des documents et des pages web) à partir d’une consigne ou d’un texte fourni. Il propose une structure, une mise en page et un thème visuel, que vous modifiez ensuite dans un éditeur. Vous pouvez partager le résultat par lien ou l’exporter ; les formats d’export et les options disponibles évoluent, vérifiez-les dans l’outil et sur [gamma.app](https://gamma.app).

Ce que Gamma fait bien : transformer rapidement un texte structuré en slides lisibles, proposer des mises en page variées, vous faire gagner le temps de la mise en forme initiale.

Ce qu’il ne fait pas à votre place : connaître vos utilisateurs, vérifier vos chiffres, choisir vos arguments. Il produit un premier jet, pas un pitch.

D’autres outils conviennent aussi : un logiciel de présentation classique avec le template de pitch deck de la formation, ou un outil de design en ligne. Le choix de l’outil compte bien moins que la clarté du message.

## La méthode : premier jet par l’IA, reprise à la main

1. **Partez de votre trame**, pas d’un sujet vague. Une consigne comme « fais-moi un pitch pour une app de coaching » donne un deck générique. Votre trame de la leçon 1 (titres-messages, contenus, chiffres sourcés), complétée par votre PRD, donne un deck qui vous ressemble.
2. **Imposez la structure** : nombre de slides, ordre, un titre-message par slide, peu de texte.
3. **Générez**, puis parcourez le résultat sans rien corriger, pour juger l’ensemble.
4. **Reprenez chaque slide à la main** : titres, chiffres, formulations. Supprimez tout ce qui est générique.
5. **Remplacez les illustrations** par de vraies captures de votre MVP chaque fois que c’est possible.
6. **Harmonisez** : un thème, deux ou trois couleurs, une ou deux polices, des tailles de texte lisibles sur un écran de téléphone.
7. **Faites relire** par une personne qui ne connaît pas le projet : ce qu’elle comprend en deux minutes, c’est ce que votre audience retiendra.

## Les limites à connaître

### Le contenu générique

Les outils de génération ont tendance à produire des phrases qui sonnent bien mais ne disent rien : « une solution innovante qui révolutionne le secteur », « une expérience fluide et intuitive ». Chacune doit être remplacée par un fait, ou supprimée.

### Les chiffres

Un outil de génération peut ajouter des chiffres de marché, des pourcentages ou des tendances qui ne figurent pas dans votre texte. Ne gardez **aucun** chiffre que vous ne pouvez pas sourcer. Un seul chiffre faux repéré par un jury met en doute tout le reste.

### Les images

Les images proposées sont souvent décoratives et sans lien avec votre produit. Préférez vos propres captures. Si vous gardez une image, vérifiez que vous avez le droit de l’utiliser.

### La cohérence visuelle

La génération varie les mises en page d’une slide à l’autre. Ce qui semble dynamique donne vite une impression de désordre. Alignez les éléments, gardez la même position pour les titres, limitez les effets.

### La confidentialité

Comme avec tout outil d’IA, ne collez pas d’informations confidentielles (données de vos testeurs, chiffres d’un partenaire, contrats) dans votre texte source.
`,
        },
        {
          type: "prompt",
          title: "Générer le premier jet de votre deck",
          tool: "Gamma",
          prompt: `
Crée une présentation de pitch de 12 slides, en français, sobre et professionnelle, à partir du texte ci-dessous.

Consignes :
- Une slide par section, dans l’ordre donné.
- Le titre de chaque slide est le titre-message fourni, sans modification.
- 3 points maximum par slide, en phrases courtes.
- N’ajoute aucun chiffre, statistique ou nom de concurrent absent de mon texte.
- Style visuel épuré : fond clair, une seule couleur d’accent, pas d’images décoratives ; laisse des emplacements pour mes captures d’écran sur les slides Solution et Démo.

Texte :
1. Titre : [nom du projet et one-liner]
2. [Titre-message problème] : [contenus]
3. [Titre-message solution] : [contenus]
4. [Titre-message démo] : [emplacement pour les captures du parcours clé]
5. [Titre-message marché] : [estimation et sources]
6. [Titre-message modèle économique] : [contenus]
7. [Titre-message traction] : [faits]
8. [Titre-message concurrence] : [alternatives et différenciation]
9. [Titre-message équipe] : [contenus]
10. [Titre-message roadmap] : [étapes]
11. [Titre-message demande] : [demande précise]
12. Contact : [coordonnées professionnelles]
`,
          tips: "Si l’outil propose de générer à partir d’un texte que vous collez, utilisez cette option plutôt qu’une consigne courte : votre structure sera mieux respectée. Ce texte sert aussi de brief pour tout autre outil de présentation.",
        },
        {
          type: "checklist",
          title: "Avant de partager votre deck",
          items: [
            "Chaque slide a un titre-message.",
            "Aucun chiffre n’apparaît sans source.",
            "Aucune phrase générique ne subsiste (« innovant », « révolutionnaire », « intuitif »…).",
            "Les captures montrent le vrai produit.",
            "Le thème, les couleurs et les polices sont cohérents d’une slide à l’autre.",
            "Le texte reste lisible sur un écran de téléphone.",
            "La slide demande est présente et précise.",
            "Le deck a été relu par une personne extérieure au projet.",
          ],
        },
        {
          type: "exercice",
          title: "Votre deck v1",
          instructions: `
1. Générez un premier jet de votre deck avec Gamma (ou l’outil de votre choix), à partir de votre trame, de votre PRD et du prompt ci-dessus.
2. Reprenez-le à la main en suivant la checklist.
3. Notez dans votre journal de bord les trois corrections principales que vous avez apportées au premier jet.
4. Partagez le deck par lien en lecture seule, vérifiez l’accès dans une fenêtre de navigation privée, puis collez le lien dans le champ de réponse.
`,
          deliverable: "lien",
          estimatedMinutes: 25,
          review: "auto",
          rubric: [
            "Le deck suit la structure en 10 à 12 slides, avec des titres-messages.",
            "Aucun chiffre non sourcé ni aucune phrase générique ne subsiste.",
            "Le deck montre de vraies captures du produit.",
            "Le lien est accessible en lecture sans connexion.",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m09-l03",
      title: "Démo et pitch vidéo",
      summary: "Écrire le script de votre démo et enregistrer un pitch vidéo de 3 minutes.",
      estimatedMinutes: 40,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez écrire le script d’une démo de votre parcours clé, structurer un pitch de 3 minutes et l’enregistrer en vidéo avec un matériel simple.

## Une vidéo, deux fonctions

Votre vidéo de pitch dure **3 minutes maximum** et contient une **démo** de 60 à 90 secondes de votre parcours clé. Elle sert à l’évaluation finale, mais aussi bien au-delà : candidature à un programme d’accompagnement, premier contact avec un partenaire, présentation à des testeurs. Un lien vers une vidéo courte se regarde plus facilement qu’un long document envoyé en pièce jointe.

## Écrire le script de la démo

Une bonne démo montre le parcours clé **du point de vue de l’utilisateur**, comme une histoire, et non comme une visite de toutes les fonctionnalités.

- **Un seul scénario**, du début à la fin du parcours clé.
- **Des données de démonstration** réalistes mais fictives : jamais de vraies données personnelles de vos testeurs.
- **Un bénéfice à chaque étape** : ne dites pas « je clique sur Réserver », dites « en deux clics, le client a réservé, sans attendre de réponse ».
- **Pas de temps mort** : les chargements et les saisies longues se coupent au montage.

Le script de démo de Créno :

| Temps | À l’écran | Ce que vous dites |
| --- | --- | --- |
| 0:00 à 0:15 | Tableau de bord du coach | « Voici Sarah, coach indépendante. Elle publie ses créneaux de la semaine en une minute. » |
| 0:15 à 0:35 | Page de réservation, côté client | « Son client ouvre sa page, voit les créneaux libres et choisit le sien. » |
| 0:35 à 0:55 | Paiement en mode test, puis confirmation | « Il paie en ligne : la place est garantie, Sarah n’a rien à relancer. » |
| 0:55 à 1:10 | Réservations du coach, puis e-mail de rappel | « Sarah voit la réservation payée. La veille, le client reçoit un rappel automatique. » |

Préparez votre démo : un compte de démonstration, des créneaux déjà créés, le paiement en **mode test** de votre prestataire de paiement, les notifications désactivées, les onglets inutiles fermés et un zoom du navigateur suffisant pour que le texte soit lisible.

## Structurer le pitch de 3 minutes

| Temps | Contenu |
| --- | --- |
| 0:00 à 0:20 | Accroche : la situation de votre utilisateur type |
| 0:20 à 0:50 | Le problème, sa cible et ce qu’il coûte |
| 0:50 à 2:10 | La solution et la démo du parcours clé |
| 2:10 à 2:35 | La traction et le modèle économique |
| 2:35 à 3:00 | La suite (roadmap) et votre demande |

Écrivez votre texte en entier, puis lisez-le à voix haute avec un chronomètre : c’est la seule mesure fiable de votre durée. Si vous dépassez, coupez des idées plutôt que d’accélérer. Entraînez-vous ensuite jusqu’à ne plus avoir besoin de lire mot à mot.

## Enregistrer avec les moyens du bord

Pas besoin de studio : un ordinateur récent et un peu de préparation suffisent.

- **Le son compte plus que l’image** : utilisez un casque avec micro ou un micro externe, dans une pièce calme et peu résonnante (rideaux, canapé et livres absorbent l’écho).
- **La lumière** : face à vous, jamais dans votre dos. Une fenêtre devant vous fait très bien l’affaire.
- **Le cadrage** : caméra à hauteur des yeux, regard vers l’objectif.
- **L’écran** : enregistrez votre démo avec l’outil de capture d’écran de votre système ou un logiciel dédié. Votre visage en incrustation est un plus, pas une obligation.
- **Plusieurs prises** : enregistrez par séquences, gardez les meilleures et limitez le montage à l’essentiel (couper le début, la fin et les temps morts).
- **Les sous-titres** : ils rendent votre vidéo accessible et compréhensible sans le son. Si votre plateforme les génère automatiquement, relisez-les et corrigez-les.

## Publier en « non répertorié »

Mettez votre vidéo en ligne sur une plateforme de vidéo avec le statut **non répertorié** : elle n’apparaît pas dans les recherches, mais toute personne disposant du lien peut la voir. Vérifiez l’accès dans une fenêtre de navigation privée avant de partager le lien.

Si d’autres personnes apparaissent à l’image, ou si vous montrez les données d’un testeur, obtenez leur accord écrit ou floutez. Le plus simple reste de n’utiliser que des données fictives.
`,
        },
        {
          type: "video",
          title: "Tourner sa démo et son pitch avec les moyens du bord",
          durationMinutes: 5,
          script: `
- Avant / après : la même démo filmée sans préparation, puis avec un script, des données fictives et un navigateur zoomé.
- Préparer l’environnement de démo : compte de démonstration, paiement en mode test, notifications coupées.
- Installer son poste : micro, lumière face à soi, caméra à hauteur des yeux ; démonstration avec un matériel courant.
- Enregistrer l’écran et la voix, par séquences ; refaire une prise sans stress.
- Montage minimal : couper le début, la fin et les temps morts ; ajouter et relire les sous-titres.
- Publication en non répertorié et vérification du lien en navigation privée.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : montrer le produit, pas le code

Votre démo montre ce que vit l’utilisateur, pas votre éditeur de code ni votre base de données. Si vous souhaitez valoriser la technique, une phrase suffit (« construit et mis en ligne en quelques semaines, avec des agents de code »).

Vérifiez que la démo tourne sur votre adresse de production, pas en local, et que le paiement utilise bien les clés du mode test. Relisez chaque écran filmé : aucune clé, aucun identifiant, aucune variable d’environnement ne doit apparaître.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Profil non technique : ne montrer que ce qui fonctionne

Ne simulez pas une fonctionnalité qui n’existe pas. Si une étape de votre parcours est encore faite à la main (dans un MVP concierge par exemple), dites-le simplement : « aujourd’hui, cette étape est gérée manuellement ; elle sera automatisée ensuite ». C’est un choix d’apprentissage assumé, pas une faiblesse.

Avant d’enregistrer, parcourez trois fois votre démo à blanc : un outil généré par l’IA peut se comporter différemment d’une session à l’autre, et vous voulez connaître chaque écran par cœur.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Profil reconversion : apprivoiser la caméra

Le trac face à la caméra est normal, et il diminue avec la pratique. Quelques astuces : placez vos notes juste à côté de l’objectif ; parlez à une personne précise que vous imaginez en face de vous ; faites une première prise « pour rien », que vous vous autorisez à jeter.

Vous n’avez pas besoin d’être parfait : un ton sincère et un message clair comptent davantage qu’une diction impeccable.
`,
        },
        {
          type: "exercice",
          title: "Votre pitch vidéo de 3 minutes",
          instructions: `
1. Écrivez le script de votre démo (tableau Temps, À l’écran, Ce que vous dites) et le texte de votre pitch de 3 minutes.
2. Chronométrez-vous à voix haute et ajustez.
3. Enregistrez votre vidéo : 3 minutes maximum, démo du parcours clé de 60 à 90 secondes incluse.
4. Publiez-la en « non répertorié » et vérifiez l’accès dans une fenêtre de navigation privée.
5. Collez le lien dans le champ de réponse.

Les 30 minutes estimées couvrent l’écriture et une première prise. Prévoyez du temps supplémentaire si vous souhaitez plusieurs prises ou un montage plus poussé.
`,
          deliverable: "lien",
          estimatedMinutes: 30,
          review: "formateur",
          rubric: [
            "La vidéo dure 3 minutes maximum et le lien est accessible.",
            "Le problème est posé avant la solution, avec une accroche concrète.",
            "La démo montre le parcours clé de bout en bout, avec des données fictives.",
            "Le son est clair et le texte affiché à l’écran est lisible.",
            "La vidéo se termine par une demande précise.",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m09-l04",
      title: "Roadmap à 30 jours et suite du projet",
      summary:
        "Planifier les 30 jours qui suivent la formation : priorités, indicateurs, rituels et appuis possibles.",
      estimatedMinutes: 40,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez construire une roadmap à 30 jours avec un objectif, des priorités et des indicateurs, et installer des rituels hebdomadaires pour continuer à avancer après la formation.

## Après la formation, le vrai départ

À la fin de cette formation, votre MVP est en ligne, testé et présenté. C’est un point de départ, pas une arrivée : les semaines qui suivent décident souvent de la suite. Sans plan, l’élan retombe vite ; avec un plan simple et des rituels, vous continuez à apprendre de vos utilisateurs.

Une **roadmap** est un plan des prochaines étapes, ordonnées dans le temps. À 30 jours, elle doit être précise ; au-delà, elle reste indicative.

## Prioriser les 30 prochains jours

Partez de trois sources : les retours de vos tests utilisateurs (module 7), vos premiers indicateurs de lancement (module 8) et votre backlog.

1. **Fixez un objectif principal** pour les 30 jours, formulé comme un résultat observable. Pour Créno : « cinq coachs publient des créneaux chaque semaine et reçoivent des réservations payées ».
2. **Listez les actions possibles** : corrections, fonctionnalités, actions d’acquisition, rendez-vous.
3. **Évaluez chaque action** selon son impact sur l’objectif et l’effort qu’elle demande. Commencez par les actions à fort impact et faible effort ; méfiez-vous de celles qui demandent un gros effort pour un impact incertain.
4. **Retenez trois priorités au maximum.** Le reste attend dans le backlog.

Une méthode de notation simple, dite ICE, peut vous aider : notez chaque action de 1 à 10 selon son **Impact**, votre **Confiance** dans cet impact et sa **Facilité** de mise en œuvre (*Ease* en anglais), puis comparez les totaux. Ce n’est pas une science exacte : c’est un moyen de rendre vos arbitrages explicites.

## Choisir vos indicateurs

Un **indicateur** est une mesure suivie dans le temps pour savoir si vous avancez. Choisissez :

- **un indicateur principal**, directement lié à la valeur que reçoit votre utilisateur. Pour Créno : le nombre de réservations payées par semaine ;
- **deux ou trois indicateurs secondaires**, qui expliquent le principal : nombre de coachs actifs, part des créneaux publiés qui sont réservés, nombre de coachs qui reviennent d’une semaine sur l’autre.

Méfiez-vous des **indicateurs de vanité** : visites, abonnés, mentions « j’aime ». Ils flattent, mais ne disent pas si votre produit rend service. Pour chaque indicateur, notez une valeur de départ (mesurée aujourd’hui) et une cible à 30 jours.

## La structure de votre roadmap

| Semaine | Objectif de la semaine | Actions principales | Indicateur suivi |
| --- | --- | --- | --- |
| 1 | Corriger les irritants majeurs relevés en test | Simplifier l’annulation, clarifier la page de paiement | Parcours complétés sans aide |
| 2 | Recruter de nouveaux coachs | Messages ciblés, deux démonstrations individuelles | Coachs inscrits |
| 3 | Faire revenir les coachs | Relance hebdomadaire, amélioration de la liste des réservations | Coachs actifs deux semaines de suite |
| 4 | Préparer la suite | Bilan, mise à jour du pitch, décision sur le modèle de prix | Réservations payées par semaine |

## Des rituels hebdomadaires dans Notion

Gardez le rythme des sprints appris au module 1, en l’allégeant :

- **en début de semaine, 20 minutes** : choisir les actions de la semaine dans votre backlog Notion ;
- **à chaque séance** : une ligne dans le journal de bord ;
- **en fin de semaine, 30 minutes** : mettre à jour une base « Indicateurs » (date, indicateur, valeur), relire la semaine, noter une décision ou un apprentissage ;
- **toutes les quatre semaines** : faire le bilan de la roadmap, puis écrire la suivante.

Une base « Décisions » (date, décision, raison) est aussi très utile : dans trois mois, vous saurez pourquoi vous avez fait tel choix.

## Financement et accompagnement

Selon votre projet et votre situation, plusieurs types d’appuis existent. Voici des repères généraux, à vérifier au cas par cas :

- **l’autofinancement et les premiers clients** : des ventes ou des précommandes financent le projet et prouvent la demande ;
- **les structures d’accompagnement** : incubateurs, accélérateurs, couveuses, réseaux d’entrepreneurs, souvent liés à un territoire, une école ou un secteur ;
- **les prêts d’honneur** proposés par des réseaux associatifs d’aide à la création d’entreprise ;
- **les dispositifs publics** d’aide à la création et à l’innovation (État, collectivités, organismes publics) ;
- **les concours et appels à projets** ;
- **l’investissement** (proches, investisseurs individuels, fonds), en général pertinent une fois une traction démontrée.

Si vous êtes demandeur d’emploi, renseignez-vous auprès de France Travail sur les aides à la création d’entreprise. Pour des informations officielles, consultez [service-public.fr](https://www.service-public.fr) et [economie.gouv.fr](https://www.economie.gouv.fr). Ces repères sont généraux et ne constituent ni un conseil juridique ni un conseil financier.
`,
        },
        {
          type: "ressource",
          resourceId: "res_roadmap30",
          note: "Template de roadmap 30 jours : objectif, indicateurs, plan semaine par semaine et rituels. Dupliquez-le dans votre espace Notion pour l’exercice.",
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Profil technique : réserver du temps pour la solidité

Un MVP construit vite accumule de la dette technique : du code écrit rapidement, qu’il faudra reprendre. Réservez une part de chaque semaine (par exemple une séance sur quatre) à la solidité : relecture des règles d’accès (RLS) de Supabase, sauvegardes de la base, suivi des erreurs en production, tests du parcours clé, mise à jour des dépendances.

Ne vous laissez pas pour autant absorber par la technique : l’objectif des 30 jours reste un résultat auprès de vos utilisateurs.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Profil non technique : sécuriser la suite technique

Posez-vous dès maintenant la question de la continuité technique. Votre projet Bolt.new est-il sauvegardé sur GitHub ? Savez-vous où sont vos données dans Supabase, et qui y a accès ? Avez-vous documenté dans Notion comment le produit est construit ?

Si le projet décolle, trois options se présentent : continuer vous-même avec les outils de la formation, vous associer avec un profil technique, ou faire appel à un prestataire. Inscrivez dans votre roadmap une action pour explorer l’option la plus probable.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Profil reconversion : un rythme soutenable

La fin de la formation est un bon moment pour faire le point sur votre situation : temps disponible, ressources, statut envisagé pour votre activité. Pour les questions de statut juridique, les informations officielles de service-public.fr sont un bon point de départ, et les structures d’accompagnement peuvent vous orienter.

Fixez-vous un rythme soutenable, même modeste, plutôt qu’un effort intense suivi d’un arrêt. Et entourez-vous : un mentor, un binôme ou un réseau d’entrepreneurs rendent la suite beaucoup moins solitaire.
`,
        },
        {
          type: "prompt",
          title: "Challenger votre roadmap",
          tool: "Claude",
          prompt: `
Voici ma roadmap à 30 jours pour mon MVP :
- Objectif principal : [...]
- Indicateur principal (valeur actuelle, puis cible) : [...]
- Indicateurs secondaires : [...]
- Semaines 1 à 4 (objectif et actions) : [...]
- Temps disponible par semaine : [...]

1. Cette roadmap est-elle réaliste au regard de mon temps disponible ? Signale les semaines surchargées.
2. Chaque action contribue-t-elle à l’objectif principal ? Indique celles qui s’en éloignent.
3. Mes indicateurs mesurent-ils la valeur reçue par l’utilisateur, ou sont-ce des indicateurs de vanité ?
4. Propose une version resserrée, avec trois priorités au maximum.

N’invente aucun chiffre de marché ni aucune aide financière précise.
`,
          tips: "Fonctionne aussi dans ChatGPT. Gardez la main sur les arbitrages : l’IA ne connaît ni vos utilisateurs ni vos contraintes personnelles.",
        },
        {
          type: "exercice",
          title: "Votre roadmap à 30 jours",
          instructions: `
À l’aide du template de roadmap 30 jours :

1. Fixez votre objectif principal à 30 jours, formulé comme un résultat observable.
2. Choisissez un indicateur principal et deux ou trois indicateurs secondaires, avec leur valeur actuelle et leur cible.
3. Planifiez les quatre semaines : objectif, actions principales, indicateur suivi.
4. Décrivez vos rituels hebdomadaires dans Notion (moment, durée, contenu).
5. Ajoutez une rubrique « Appuis envisagés » : accompagnement, financement ou réseau que vous allez contacter, avec une date.

Publiez la roadmap dans votre espace Notion et collez le lien de partage en lecture seule dans le champ de réponse.
`,
          deliverable: "lien",
          estimatedMinutes: 25,
          review: "formateur",
          rubric: [
            "L’objectif à 30 jours est un résultat observable, lié à la valeur pour l’utilisateur.",
            "Les indicateurs ont une valeur de départ et une cible, sans indicateur de vanité.",
            "Le plan semaine par semaine compte trois priorités au maximum et reste réaliste.",
            "Les rituels hebdomadaires sont décrits précisément.",
            "Au moins un appui ou contact est identifié, avec une date.",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m09-l05",
      title: "Évaluation finale des acquis",
      summary: "Déposer vos livrables finaux et valider vos acquis avec le quiz transversal de la formation.",
      estimatedMinutes: 40,
      blocks: [
        {
          type: "texte",
          markdown: `
Cette dernière leçon clôt votre parcours : vous vérifiez que vos livrables finaux sont prêts, vous les déposez, puis vous passez le quiz final qui couvre toute la formation.

## Comment se déroule l’évaluation finale

L’évaluation finale mesure ce que vous savez **faire** à l’issue de la formation. Elle comporte deux parties complémentaires.

**1. Vos livrables finaux**, relus par votre formateur selon des critères de réussite :

| Livrable | Ce qui est regardé |
| --- | --- |
| MVP en ligne | Le parcours clé fonctionne de bout en bout, sur une adresse publique |
| Deck de pitch | Structure, clarté, honnêteté des chiffres et de la traction |
| Pitch vidéo de 3 minutes | Récit, démo du parcours clé, demande finale |
| Roadmap à 30 jours | Objectif, priorités, indicateurs et rituels |

**2. Un quiz transversal** de 20 questions, qui reprend les notions clés de chaque module : cadrage, prompting, choix de stack, architecture et sécurité des données, maquettes, Git et GitHub, construction avec des agents IA, automatisation, intégration d’un modèle de langage, mise en ligne, tests utilisateurs, lancement, RGPD, pitch et agilité. Il compte dans votre évaluation ; le score attendu est indiqué dans le livret d’accueil.

Vos résultats font l’objet d’un retour de votre formateur. Si un point n’est pas acquis, il vous indiquera quoi retravailler : vous gardez l’accès aux contenus jusqu’à la fin de vos 6 mois.

## Le certificat de réalisation

Le certificat de réalisation atteste que vous avez suivi la formation. Il est délivré lorsque vous avez atteint la progression minimale précisée dans le livret d’accueil, sur la base de vos connexions et activités tracées. Il est distinct de l’évaluation des acquis : l’un atteste votre suivi, l’autre mesure ce que vous avez appris.

## Préparer votre dépôt

Avant de déposer vos livrables, vérifiez chaque lien dans une fenêtre de navigation privée : c’est ce que verra votre formateur. Si votre MVP nécessite un compte pour accéder au parcours clé, créez un compte de démonstration avec des données fictives et transmettez ses identifiants à votre formateur par la messagerie de Mon espace. N’utilisez jamais vos identifiants personnels ni de vraies données de testeurs.

## Votre avis compte

À la fin de la formation, un questionnaire de satisfaction vous est proposé. Prenez quelques minutes pour y répondre franchement : ce qui vous a aidé, ce qui vous a manqué, ce qui devrait changer. Vos réponses servent directement à améliorer la formation pour les prochains apprenants. Un second questionnaire pourra vous être adressé quelques mois plus tard, pour mesurer ce que la formation vous a apporté dans la durée.

> [!success] Vous êtes arrivé au bout d’un parcours exigeant : un problème cadré, un produit en ligne, des utilisateurs rencontrés, un pitch et un plan. Bravo. La suite vous appartient.
`,
        },
        {
          type: "checklist",
          title: "Vos livrables finaux",
          items: [
            "Mon MVP est en ligne et le parcours clé fonctionne dans une fenêtre de navigation privée.",
            "Un compte de démonstration avec des données fictives est prêt, et ses identifiants sont transmis par la messagerie de Mon espace.",
            "Mon deck est partagé par lien en lecture seule.",
            "Ma vidéo de pitch est en ligne en « non répertorié » et dure 3 minutes maximum.",
            "Ma roadmap à 30 jours est publiée dans Notion et partagée en lecture seule.",
            "Mon PRD est à jour de ce qui a réellement été construit.",
            "Aucun lien ne donne accès à des données personnelles réelles ou à des secrets.",
          ],
        },
        {
          type: "exercice",
          title: "Déposer votre dossier final",
          instructions: `
Rassemblez vos livrables finaux sur une seule page Notion intitulée « Dossier final » suivi du nom de votre projet, avec :

1. le lien vers votre MVP en ligne, et la mention « identifiants de démonstration transmis par la messagerie » si un compte est nécessaire ;
2. le lien vers votre deck ;
3. le lien vers votre vidéo de pitch non répertoriée ;
4. le lien vers votre roadmap à 30 jours ;
5. le lien vers votre PRD à jour ;
6. trois lignes de bilan : ce que vous avez appris, ce dont vous êtes le plus fier, ce que vous feriez différemment.

Partagez la page en lecture seule et collez son lien dans le champ de réponse.
`,
          deliverable: "lien",
          estimatedMinutes: 10,
          review: "formateur",
          rubric: [
            "Les quatre livrables finaux (MVP, deck, vidéo, roadmap) sont accessibles.",
            "Le MVP en ligne permet de réaliser le parcours clé de bout en bout.",
            "Aucun secret ni aucune donnée personnelle réelle n’est exposé.",
            "Le bilan est personnel et réflexif.",
          ],
        },
        {
          type: "quiz",
          title: "Évaluation finale : quiz transversal",
          graded: true,
          questions: [
            {
              prompt: "Quel est l’objectif principal d’un MVP ?",
              options: [
                { label: "Tester l’hypothèse la plus risquée auprès de vrais utilisateurs, avec un minimum d’effort", correct: true },
                { label: "Livrer une première version complète, avec toutes les fonctionnalités prévues" },
                { label: "Impressionner des investisseurs avec une démo spectaculaire" },
                { label: "Remplacer les entretiens avec les utilisateurs" },
              ],
              explanation:
                "Le MVP sert à apprendre vite : il teste ce qui pourrait faire échouer le projet, sur un parcours clé réellement utilisable (module 1).",
            },
            {
              prompt: "Pendant un entretien de découverte, quelle attitude produit les informations les plus fiables ?",
              options: [
                { label: "Faire raconter des situations passées concrètes, sans présenter sa solution", correct: true },
                { label: "Présenter sa solution dès le début pour recueillir un avis" },
                { label: "Demander à la personne si elle utiliserait le produit" },
                { label: "Interroger surtout ses proches, plus disponibles" },
              ],
              explanation:
                "Le passé concret produit des faits ; les questions hypothétiques et la présentation de la solution suscitent des réponses de complaisance (module 1).",
            },
            {
              prompt: "Quels éléments rendent un prompt de travail plus efficace ?",
              options: [
                { label: "Un contexte précis, une tâche claire, des contraintes et le format de réponse attendu", correct: true },
                { label: "Une formulation la plus courte possible, sans contexte" },
                { label: "Des majuscules et des formules insistantes" },
                { label: "Des données personnelles réelles, pour une réponse plus juste" },
              ],
              explanation:
                "Un assistant IA répond d’autant mieux qu’il connaît le contexte, la tâche, les contraintes et la forme attendue ; les données personnelles n’ont jamais leur place dans un prompt (module 2).",
            },
            {
              prompt: "Quel critère doit primer dans le choix de la stack d’un MVP ?",
              options: [
                { label: "Pouvoir livrer et maintenir le parcours clé rapidement, avec ses compétences et son budget", correct: true },
                { label: "Utiliser la technologie la plus récente du moment" },
                { label: "Prévoir dès le départ une architecture pour des millions d’utilisateurs" },
                { label: "Choisir systématiquement l’outil qui a le plus de fonctionnalités" },
              ],
              explanation:
                "Pour un MVP, la bonne stack est celle qui vous permet de livrer et de faire évoluer le parcours clé vite, avec vos moyens (module 3).",
            },
            {
              prompt: "Dans le modèle de données de Créno, quelle relation est correcte ?",
              options: [
                { label: "Une réservation relie un client à un créneau, et un paiement se rattache à une réservation", correct: true },
                { label: "Un créneau contient directement les coordonnées bancaires du client" },
                { label: "Chaque client possède sa propre table de créneaux" },
                { label: "Le paiement remplace la réservation : inutile de stocker les deux" },
              ],
              explanation:
                "Chaque entité a son rôle : profils, créneaux, réservations, paiements. Les données bancaires restent chez le prestataire de paiement (module 4).",
            },
            {
              prompt: "Que permet la Row Level Security (RLS) dans Supabase ?",
              options: [
                { label: "Définir, dans la base de données, quelles lignes chaque utilisateur peut lire ou modifier", correct: true },
                { label: "Chiffrer automatiquement toutes les données affichées dans le navigateur" },
                { label: "Accélérer les requêtes grâce à un cache" },
                { label: "Sauvegarder la base chaque nuit" },
              ],
              explanation:
                "Les politiques RLS protègent les données au niveau de la base : par exemple, un coach ne voit que les réservations de ses propres créneaux (modules 4 et 6).",
            },
            {
              prompt:
                "Où doit se trouver une clé secrète, comme la clé secrète de votre prestataire de paiement ou la clé de service de Supabase ?",
              options: [
                { label: "Uniquement côté serveur, dans des variables d’environnement, jamais dans le code envoyé au navigateur ni dans le dépôt", correct: true },
                { label: "Dans le code du front-end, pour que l’application soit plus rapide" },
                { label: "Dans le fichier de présentation du dépôt GitHub, pour ne pas l’oublier" },
                { label: "Dans un prompt, pour que l’agent de code puisse la tester" },
              ],
              explanation:
                "Tout ce qui est envoyé au navigateur ou commité peut être lu. Les clés secrètes restent côté serveur, dans des variables d’environnement (module 6).",
            },
            {
              prompt: "Pourquoi maquetter le parcours clé avant de le construire ?",
              options: [
                { label: "Pour tester et corriger le parcours à moindre coût, avant d’écrire du code", correct: true },
                { label: "Pour remplacer les tests avec de vrais utilisateurs" },
                { label: "Parce que les outils d’IA refusent de générer une application sans maquette" },
                { label: "Pour fixer définitivement l’identité visuelle de la marque" },
              ],
              explanation:
                "Corriger une maquette coûte beaucoup moins cher que corriger une application construite (module 5).",
            },
            {
              prompt: "Qu’est-ce qu’un commit dans Git ?",
              options: [
                { label: "Un enregistrement des modifications à un instant donné, accompagné d’un message qui les décrit", correct: true },
                { label: "La mise en ligne automatique de l’application" },
                { label: "Une copie du dépôt sur un autre compte GitHub" },
                { label: "Une sauvegarde de la base de données" },
              ],
              explanation:
                "Chaque commit est un point de l’historique auquel vous pouvez revenir. Des commits petits et bien nommés facilitent le travail avec les agents IA (module 6).",
            },
            {
              prompt: "Un agent de code propose une modification importante de votre projet. Quelle est la bonne pratique ?",
              options: [
                { label: "Relire les changements proposés, tester le parcours concerné, puis enregistrer la modification dans un commit", correct: true },
                { label: "Accepter sans relire : l’agent connaît mieux le code que vous" },
                { label: "Lui demander de tout réécrire dès qu’un détail ne convient pas" },
                { label: "Désactiver Git pour aller plus vite" },
              ],
              explanation:
                "Le code généré par l’IA se relit et se teste comme n’importe quel code. Le commit permet de revenir en arrière si besoin (module 6).",
            },
            {
              prompt:
                "Qu’est-ce qui aide le plus un agent de code ou un générateur d’application à produire un résultat cohérent ?",
              options: [
                { label: "Un contexte écrit (PRD, conventions, structure du projet) et des demandes découpées, une user story à la fois", correct: true },
                { label: "Une seule demande très longue décrivant toute l’application" },
                { label: "Des demandes vagues, pour lui laisser de la créativité" },
                { label: "Changer d’outil à chaque demande" },
              ],
              explanation:
                "Le PRD rédigé au module 1 sert précisément de contexte ; des demandes découpées donnent des résultats vérifiables (modules 1 et 6).",
            },
            {
              prompt: "Dans Créno, quel usage de n8n est le plus adapté ?",
              options: [
                { label: "Déclencher chaque jour l’envoi d’un rappel aux clients qui ont une séance le lendemain", correct: true },
                { label: "Héberger la base de données des réservations" },
                { label: "Remplacer l’authentification des utilisateurs" },
                { label: "Concevoir les maquettes de l’application" },
              ],
              explanation:
                "n8n automatise des enchaînements de tâches entre services, comme un rappel planifié. Les données restent dans Supabase (module 6).",
            },
            {
              prompt: "Vous intégrez un modèle de langage (LLM) dans votre application. Quelle pratique est correcte ?",
              options: [
                { label: "Appeler l’API du modèle depuis le serveur, avec une clé stockée côté serveur, et prévoir le cas où la réponse est fausse ou inadaptée", correct: true },
                { label: "Appeler l’API directement depuis le navigateur, avec la clé dans le code" },
                { label: "Présenter la réponse du modèle comme une information certaine" },
                { label: "Envoyer au modèle toutes les données personnelles des utilisateurs pour qu’il réponde mieux" },
              ],
              explanation:
                "La clé reste côté serveur, les données envoyées sont limitées au nécessaire et les réponses sont encadrées, car un modèle peut se tromper (module 6).",
            },
            {
              prompt:
                "Votre projet Vercel est relié à votre dépôt GitHub. Que se passe-t-il généralement quand vous poussez une branche autre que la branche de production ?",
              options: [
                { label: "Vercel crée un déploiement de prévisualisation, accessible à sa propre adresse", correct: true },
                { label: "Le site de production est remplacé immédiatement" },
                { label: "Rien : il faut toujours déployer à la main" },
                { label: "Le dépôt GitHub est supprimé" },
              ],
              explanation:
                "Avec la configuration par défaut, chaque branche poussée obtient un déploiement de prévisualisation, ce qui permet de tester avant de mettre en production (module 6).",
            },
            {
              prompt: "Pendant un test utilisateur, quelle attitude adopter ?",
              options: [
                { label: "Donner une tâche réaliste, demander à la personne de penser à voix haute et observer sans l’aider", correct: true },
                { label: "Expliquer chaque écran avant qu’elle ne l’utilise" },
                { label: "L’aider dès qu’elle hésite, pour gagner du temps" },
                { label: "Lui demander seulement si elle aime le design" },
              ],
              explanation:
                "Chaque hésitation observée est une information précieuse. Si vous aidez, vous ne verrez pas les problèmes que rencontreront vos vrais utilisateurs (module 7).",
            },
            {
              prompt: "Quel est le rôle principal d’une landing page au lancement ?",
              options: [
                { label: "Présenter clairement la promesse à une cible précise et l’amener vers une action unique et mesurable", correct: true },
                { label: "Décrire toutes les fonctionnalités de façon exhaustive" },
                { label: "Remplacer le produit lui-même" },
                { label: "Afficher le plus de liens possible vers d’autres pages" },
              ],
              explanation:
                "Une landing page efficace a une promesse claire et un seul appel à l’action, dont vous mesurez le taux de conversion (module 8).",
            },
            {
              prompt: "Pour piloter le lancement de Créno, quel indicateur est le plus utile ?",
              options: [
                { label: "Le nombre de réservations payées par semaine", correct: true },
                { label: "Le nombre de mentions « j’aime » sur les réseaux sociaux" },
                { label: "Le nombre total de visites de la page d’accueil" },
                { label: "Le nombre d’abonnés au compte du projet" },
              ],
              explanation:
                "Les réservations payées mesurent la valeur réellement reçue par les utilisateurs. Les autres sont des indicateurs de vanité (modules 8 et 9).",
            },
            {
              prompt: "Quelle pratique est conforme aux principes du RGPD ?",
              options: [
                { label: "Ne collecter que les données nécessaires, informer les personnes de leur usage et définir une durée de conservation", correct: true },
                { label: "Collecter un maximum de données au cas où elles serviraient plus tard" },
                { label: "Conserver indéfiniment les données de tous les utilisateurs" },
                { label: "Transmettre la liste de vos utilisateurs à des partenaires sans les informer" },
              ],
              explanation:
                "Minimisation, transparence et limitation de la durée de conservation font partie des principes du RGPD. Pour les détails, référez-vous à cnil.fr ; ceci n’est pas un conseil juridique (module 8).",
            },
            {
              prompt: "Dans un pitch, à quoi sert la slide « demande » ?",
              options: [
                { label: "À dire précisément ce que vous attendez de l’audience : financement, accompagnement, mise en relation, testeurs", correct: true },
                { label: "À demander l’avis du public sur le design" },
                { label: "À lister les questions que vous vous posez encore" },
                { label: "À présenter la concurrence" },
              ],
              explanation:
                "Sans demande explicite, l’audience ne sait pas comment vous aider. C’est la slide la plus souvent oubliée (module 9).",
            },
            {
              prompt: "Dans un sprint, à quoi sert la définition de « fini » ?",
              options: [
                { label: "À fixer les conditions communes qu’un élément doit remplir pour être considéré comme terminé", correct: true },
                { label: "À fixer la date de fin de la formation" },
                { label: "À lister les fonctionnalités exclues du MVP" },
                { label: "À décrire l’objectif du sprint" },
              ],
              explanation:
                "La définition de « fini » évite les éléments « presque terminés » : critères d’acceptation vérifiés, code enregistré, fonctionnalité déployée, aucun secret exposé (module 1).",
            },
          ],
        },
      ],
    },
  ],
};
