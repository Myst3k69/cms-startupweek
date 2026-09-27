import type { SeedModule } from "../authoring";

export const M07: SeedModule = {
  key: "m07",
  title: "Tester avec de vrais utilisateurs",
  summary:
    "Préparer, mener et analyser des tests utilisateurs sur votre MVP, puis mesurer l’usage réel pour décider quoi améliorer en priorité.",
  objectives: [
    "Être capable de distinguer un test d’utilisabilité d’un test de valeur et de choisir le test adapté à ce que vous voulez apprendre.",
    "Être capable de rédiger un protocole de test complet : objectifs, hypothèses, tâches, script neutre, recrutement et consentement conforme au RGPD.",
    "Être capable de mener cinq tests sans influencer les testeurs et de consigner les observations dans une grille exploitable.",
    "Être capable de synthétiser les résultats, d’évaluer la gravité des problèmes et de les prioriser dans votre backlog Notion.",
    "Être capable de définir un plan de marquage minimal, un entonnoir d’activation et un indicateur principal pour mesurer l’usage réel de votre MVP.",
  ],
  lessons: [
    // ─────────────────────────────────────────────────────────────
    {
      key: "m07-l01",
      title: "Pourquoi tester maintenant",
      summary:
        "Comprendre ce que des tests utilisateurs peuvent (et ne peuvent pas) vous apprendre, et pourquoi il faut les mener avant d’aller plus loin.",
      estimatedMinutes: 30,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez distinguer un test d’utilisabilité d’un test de valeur, et formuler précisément ce que vos premiers tests doivent vous apprendre.

## Le moment de confronter votre MVP au réel

Au M01, vos entretiens de découverte portaient sur le **problème** : comment vos futurs utilisateurs s’organisent aujourd’hui, ce qui leur coûte, ce qu’ils ont déjà essayé. Depuis, vous avez maquetté (M05), puis construit et déployé une première version (M06). Vous avez donc des convictions sur la **solution**. Ce module sert à les confronter à des personnes réelles, avant d’investir davantage.

Un **test utilisateur** consiste à observer une personne de votre cible pendant qu’elle utilise votre produit pour accomplir des tâches réalistes. On ne lui demande pas son avis sur le produit : on regarde ce qu’elle fait. La nuance est essentielle. Les gens prédisent mal leur propre comportement, et ils sont souvent trop polis pour vous dire qu’ils ne comprennent rien. Leurs actions, elles, sont fiables.

## Deux questions différentes : « peuvent-ils ? » et « veulent-ils ? »

| Critère | Test d’utilisabilité | Test de valeur |
| --- | --- | --- |
| Question | Les utilisateurs arrivent-ils à se servir du produit ? | Les utilisateurs veulent-ils s’en servir, voire payer ? |
| Ce qu’on observe | Réussite des tâches, hésitations, erreurs, temps | Engagement réel : usage répété, invitation d’autres personnes, paiement |
| Exemple Créno | Un coach parvient-il à publier ses créneaux de la semaine sans aide ? | Un coach invite-t-il réellement ses clients à réserver via Créno la semaine suivante ? |
| Format | Séance observée de 20 à 45 minutes | Usage suivi sur plusieurs jours ou semaines, parfois une précommande |
| Piège | Tester sur des proches qui connaissent déjà le produit | Prendre un « j’adorerais » pour un engagement |

Les deux sont complémentaires. Un produit parfaitement utilisable mais dont personne ne veut ne sert à rien. Un produit désiré mais inutilisable perd ses utilisateurs dès le premier écran. Dans ce module, les leçons 2 à 4 se concentrent sur l’utilisabilité, par des séances observées ; la leçon 5 installe la mesure de l’usage réel, qui renseigne sur la valeur dans la durée.

> [!tip] Pour savoir quel test mener, posez-vous une question simple : « Qu’est-ce qui me ferait changer d’avis cette semaine ? » Si la réponse est « ils n’y arrivent pas », testez l’utilisabilité. Si c’est « ils n’en ont pas vraiment besoin », cherchez un signal d’engagement réel.

## Le coût d’une erreur découverte tard

Plus un problème est découvert tard, plus il coûte cher à corriger. Une incompréhension repérée sur une maquette se corrige en dix minutes. La même incompréhension découverte après le lancement coûte bien davantage : du code à réécrire, des données à migrer, des utilisateurs perdus qui ne reviendront pas, parfois une réputation abîmée dans une communauté où tout le monde se connaît.

Prenons Créno. L’équipe a supposé que les coachs publieraient leurs créneaux un par un. Pendant les tests, trois coachs sur cinq cherchent spontanément un moyen de répéter le même créneau chaque semaine. Découvert maintenant, c’est une user story de plus dans le backlog. Découvert après le lancement, c’est une vague d’abandons dès la deuxième semaine, parce que la saisie est trop fastidieuse.

## Ce que quelques tests permettent d’apprendre

Une recommandation classique en ergonomie, popularisée par Jakob Nielsen, veut qu’environ cinq testeurs suffisent à faire apparaître l’essentiel des problèmes d’utilisabilité d’un parcours, à condition qu’ils appartiennent au même profil. Au-delà, on revoit surtout les mêmes difficultés. D’où une règle de conduite : mieux vaut plusieurs petites séries de tests, entrecoupées de corrections, qu’une seule grande série.

Avec cinq séances, vous pouvez raisonnablement apprendre :

- où les utilisateurs bloquent, hésitent ou se trompent ;
- quels mots de votre interface ne sont pas compris ;
- ce qu’ils s’attendaient à trouver et n’ont pas trouvé ;
- quelles fonctionnalités ils ignorent complètement ;
- les mots qu’ils emploient eux-mêmes pour décrire leur besoin, précieux pour vos textes au M08.

## Ce qu’un test ne prouve pas

Soyez lucide sur les limites de l’exercice :

- **Ce n’est pas une statistique.** « 3 testeurs sur 5 » décrit ce que vous avez vu, pas une proportion de votre marché. Ne l’écrivez jamais sous forme de pourcentage.
- **Ce n’est pas une preuve de demande.** Réussir une tâche ne signifie pas vouloir le produit.
- **Ce n’est pas une promesse d’achat.** « Je paierais pour ça » n’engage à rien ; seuls un paiement, une précommande ou un usage répété sont des signaux forts.
- **Ce n’est pas neutre.** Une personne observée se comporte un peu autrement que seule chez elle, et un proche sera toujours trop indulgent.
- **Ce n’est pas un test technique.** Les tests utilisateurs ne remplacent ni la relecture du code, ni les tests de sécurité, ni la vérification de vos règles d’accès aux données.

> [!info] Ce que vous rapporterez de ce module : un protocole, cinq grilles d’observation remplies, une liste de problèmes priorisés dans votre backlog Notion et un plan de marquage. Ce sont des preuves concrètes que vous mobiliserez au M09 pour votre pitch.
`,
        },
        {
          type: "video",
          title: "Utilisabilité ou valeur : que tester en premier ?",
          durationMinutes: 5,
          script: `
- Ouverture : l’écran de publication de créneaux de Créno, et une question posée face caméra : « Un coach peut-il publier sa semaine sans aide ? »
- Définir le test d’utilisabilité, avec un extrait de séance à distance : écran partagé, testeur qui pense à voix haute.
- Définir le test de valeur : opposer une opinion (« c’est génial ») à un engagement réel (un coach qui envoie son lien de réservation à ses clients).
- Illustrer le coût d’une erreur tardive avec l’exemple des créneaux récurrents découverts avant, puis après le lancement.
- Expliquer la logique des petites séries d’environ cinq testeurs, entrecoupées de corrections.
- Rappeler ce qu’un test ne prouve pas, et pourquoi on n’écrit jamais « 60 % » après cinq séances.
- Conclusion : annoncer la préparation du protocole dans la leçon suivante.
`,
        },
        {
          type: "quiz",
          title: "Vérifiez votre compréhension",
          questions: [
            {
              prompt: "Vous voulez savoir si les coachs comprennent comment publier un créneau dans Créno. Quel test menez-vous ?",
              options: [
                { label: "Un test d’utilisabilité : observer des coachs accomplir cette tâche", correct: true },
                { label: "Un sondage en ligne demandant si la fonctionnalité leur plaît" },
                { label: "Une campagne publicitaire pour mesurer les clics" },
                { label: "Un entretien de découverte sur leur organisation actuelle" },
              ],
              explanation:
                "La question est « peuvent-ils ? » : c’est de l’utilisabilité. On l’observe en les regardant faire, pas en leur demandant leur avis.",
            },
            {
              prompt: "Lequel de ces signaux indique le mieux la valeur perçue du produit ?",
              options: [
                { label: "Un testeur déclare qu’il utiliserait sûrement l’application" },
                { label: "Un coach partage spontanément son lien de réservation avec ses clients", correct: true },
                { label: "Un testeur trouve le design agréable" },
                { label: "Un testeur réussit toutes les tâches en moins d’une minute" },
              ],
              explanation:
                "Un engagement réel, qui a un coût pour la personne (ici, exposer son image auprès de ses clients), vaut bien plus qu’une déclaration d’intention.",
            },
            {
              prompt: "Après cinq tests, trois testeurs ont bloqué sur le paiement. Comment le rapportez-vous ?",
              options: [
                { label: "« 60 % des utilisateurs bloquent sur le paiement »" },
                { label: "« La majorité du marché ne comprend pas le paiement »" },
                { label: "« 3 testeurs sur 5 ont bloqué sur le paiement »", correct: true },
                { label: "Vous ne le rapportez pas : cinq tests ne suffisent pas" },
              ],
              explanation:
                "On décrit ce qu’on a observé, sans extrapoler. Un pourcentage sur cinq personnes donne une fausse impression de précision.",
            },
          ],
        },
        {
          type: "exercice",
          title: "Ce que vos tests doivent vous apprendre",
          instructions: `
Avant de préparer votre protocole, clarifiez ce que vous cherchez à apprendre sur **votre projet**.

1. Écrivez **trois questions d’utilisabilité** portant sur les parcours essentiels de votre MVP (« Les utilisateurs arrivent-ils à… ? »).
2. Écrivez **deux questions de valeur** (« Les utilisateurs veulent-ils… ? », « Sont-ils prêts à… ? ») et, pour chacune, le signal d’engagement réel qui vous convaincrait.
3. Pour chaque question, notez ce qui vous ferait **changer d’avis** ou modifier le produit.
4. Classez les cinq questions de la plus risquée à la moins risquée pour votre projet.

Exemple Créno : « Les coachs arrivent-ils à publier une semaine de créneaux sans aide ? Si deux testeurs ou plus n’y arrivent pas seuls, nous revoyons l’écran de publication avant tout autre développement. »
`,
          deliverable: "texte",
          estimatedMinutes: 15,
          review: "auto",
          rubric: [
            "Les questions d’utilisabilité portent sur les parcours essentiels du MVP",
            "Les questions de valeur sont associées à un signal d’engagement réel, pas à une opinion",
            "Chaque question précise ce qui ferait changer d’avis",
            "Le classement par risque est justifié",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m07-l02",
      title: "Préparer son protocole",
      summary:
        "Rédiger un protocole de test complet : objectifs, hypothèses, tâches, script neutre, recrutement, consentement et matériel.",
      estimatedMinutes: 50,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous aurez un protocole de test complet, prêt à servir pour cinq séances avec des personnes de votre cible.

## Pourquoi écrire un protocole

Un **protocole de test** est le document qui décrit ce que vous testez, avec qui, comment et dans quel ordre. Il sert trois objectifs. D’abord, garantir que les cinq séances se déroulent de la même façon ; sinon, vous ne pourrez pas comparer les résultats. Ensuite, vous obliger à décider *avant* ce que vous cherchez à apprendre, pour ne pas voir dans les résultats ce que vous avez envie d’y voir. Enfin, permettre à une autre personne (associé, formateur) de relire votre démarche et d’y repérer des biais.

Le modèle fourni plus bas contient toutes les rubriques. Voici comment remplir chacune.

## 1. Objectifs et hypothèses

Partez des questions formulées à la leçon précédente. Un **objectif** dit ce que vous voulez apprendre ; une **hypothèse** est une affirmation que le test peut confirmer ou infirmer, avec un **critère de réussite** fixé à l’avance.

| Objectif | Hypothèse | Critère de réussite |
| --- | --- | --- |
| Vérifier que la publication de créneaux est compréhensible | Un coach publie ses créneaux de la semaine sans aide | Au moins 4 testeurs sur 5 y parviennent seuls |
| Vérifier le parcours de réservation | Un client réserve et paie une séance en moins de trois minutes | Au moins 4 testeurs sur 5 |
| Vérifier la règle d’annulation | Les clients comprennent jusqu’à quand ils peuvent annuler | Aucun testeur ne se trompe sur le délai |

Limitez-vous à trois ou quatre hypothèses. Au-delà, la séance s’allonge et la fatigue fausse les résultats.

## 2. Les tâches à confier

Une **tâche** est une mission réaliste confiée au testeur, formulée comme un scénario de sa vie, pas comme une instruction d’interface. Quatre règles :

- **Donnez un but, pas un chemin.** « Réservez une séance mardi soir » plutôt que « Cliquez sur Réserver puis choisissez un créneau ».
- **N’utilisez pas les mots de l’interface.** Si le menu s’appelle « Créneaux », dites « vos disponibilités ». Sinon, vous testez la capacité à repérer un mot, pas la compréhension.
- **Donnez un contexte.** « Vous êtes coach, vous reprenez vos séances la semaine prochaine, trois soirs par semaine. »
- **Prévoyez 3 à 5 tâches**, de la plus simple à la plus complexe, chacune avec une fin claire : le testeur doit savoir quand il a terminé.

Pour Créno, côté coach : créer son compte, publier ses disponibilités de la semaine, retrouver les réservations d’un client, vérifier qu’un paiement a bien été reçu. Côté client : réserver et payer une séance, puis l’annuler.

## 3. Le script neutre

Le **script** est le texte que vous lirez, presque mot pour mot, à chaque séance. Il garantit la neutralité et vous évite d’improviser des phrases qui orientent. Il comprend cinq parties :

1. **Accueil** : remercier, présenter le déroulé et la durée, rappeler qu’on teste le produit et non la personne.
2. **Consentement** : expliquer l’usage des données, demander l’accord pour l’enregistrement.
3. **Échauffement** : deux ou trois questions sur le contexte (« Comment organisez-vous vos séances aujourd’hui ? »).
4. **Tâches** : lire chaque scénario, puis se taire et observer.
5. **Débrief** : questions ouvertes, puis remerciements.

## 4. Recruter cinq testeurs dans la cible

Les testeurs doivent ressembler à vos futurs utilisateurs. Un ami développeur qui teste une application pour coachs sportifs vous apprendra peu de choses. Où les trouver :

- parmi les personnes interrogées au M01 qui ont accepté d’être recontactées ;
- dans les communautés où votre cible échange (groupes professionnels, associations, forums) ;
- dans votre réseau, en demandant une recommandation plutôt qu’un service.

Rédigez deux ou trois **questions de sélection** pour vérifier que la personne appartient bien à la cible (« Êtes-vous coach indépendant ? Combien de clients suivez-vous par semaine ? »). Évitez les proches, les collègues et les personnes qui ont vu naître le projet. Contactez six ou sept personnes pour obtenir cinq séances : il y aura des désistements. Une contrepartie modeste, comme un accès gratuit au service, est une marque de respect pour le temps donné.

Si votre produit a deux rôles, comme Créno, testez d’abord celui qui conditionne l’autre : sans créneaux publiés par les coachs, aucun client ne peut réserver.

## 5. Consentement et RGPD

Un test utilisateur collecte des **données personnelles** : nom, voix, visage à l’écran, opinions. Le RGPD s’applique, comme vous l’avez vu au M04. Concrètement :

- **Informez** avant la séance, par écrit : qui organise le test, dans quel but, quelles données sont recueillies, qui y aura accès, combien de temps elles seront conservées, comment exercer ses droits (accès, suppression).
- **Demandez un accord explicite pour l’enregistrement**, distinct de l’accord pour participer. Un refus d’enregistrement ne doit pas empêcher de participer : vous prendrez des notes.
- **Anonymisez** : dans vos notes et vos grilles, remplacez les noms par des codes (T1 à T5). Gardez la table de correspondance à part, ou ne la gardez pas du tout.
- **Fixez une durée de conservation** et tenez-la : par exemple, supprimer les enregistrements une fois l’analyse terminée et ne conserver que les notes anonymisées.
- **Limitez l’accès** aux enregistrements aux seules personnes qui analysent les tests.
- **N’utilisez aucune vraie donnée bancaire** : servez-vous du mode test de votre prestataire de paiement et de comptes de démonstration.

> [!warning] Ces repères sont des informations générales, pas un conseil juridique. Pour le détail des obligations d’information et des droits des personnes, référez-vous au site de la CNIL : [cnil.fr](https://www.cnil.fr).

## 6. Le matériel

- Un lien vers une **version stable** du produit, qui ne changera pas pendant la série de tests.
- Des **comptes de test** et des **données de démonstration** crédibles : des créneaux déjà publiés pour tester la réservation, par exemple.
- Un outil de **visioconférence avec partage d’écran** si le test a lieu à distance, et l’enregistrement uniquement si la personne a donné son accord.
- La **grille d’observation** (leçon suivante), un chronomètre et le script, imprimé ou ouvert sur un second écran.

## 7. Les rôles et le planning

Idéalement, deux personnes : un **animateur** qui lit le script et relance, et un **observateur** silencieux qui remplit la grille. Si vous êtes seul, enregistrez (avec accord) ou gardez des séances courtes. Comptez 30 à 45 minutes par séance et au moins 15 minutes entre deux séances pour noter vos impressions à chaud. Faites enfin un **test pilote** avec une personne hors cible : il sert à vérifier le script, le matériel et la durée, et ne compte pas parmi les cinq.
`,
        },
        {
          type: "ressource",
          resourceId: "res_protocole_tests",
          note: "Modèle de protocole de tests utilisateurs : objectifs, hypothèses, tâches, script, recrutement, consentement et grille d’observation. Dupliquez-le pour votre projet.",
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Si c’est votre premier test utilisateur

Quelques mots de vocabulaire, pour être à l’aise :

- **Testeur** : la personne de votre cible qui utilise le produit pendant la séance.
- **Animateur** : vous, qui lisez le script et posez les questions.
- **Observateur** : la personne qui note ce qui se passe, sans intervenir.
- **Hypothèse** : ce que vous croyez vrai et que le test va confirmer ou non.
- **Test pilote** : une séance d’entraînement, avec une personne hors cible, pour roder le déroulé.

Vous n’avez pas besoin d’être expert en ergonomie pour mener un bon test. Un protocole simple, suivi avec rigueur, vous apprendra beaucoup plus qu’une absence de test. Prenez le temps de faire le test pilote : c’est lui qui vous donnera confiance pour les vraies séances.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Préparer un environnement de test propre

- **Figez la version testée** : créez une branche Git dédiée aux tests et utilisez l’aperçu de déploiement Vercel de cette branche, sans y pousser de modification pendant la série.
- **Préparez des données de démonstration** avec un script SQL que vous pouvez rejouer entre deux séances, pour que chaque testeur parte du même état.
- **Activez le mode test** de votre prestataire de paiement et vérifiez qu’aucune clé de production n’est utilisée dans cet environnement.
- **Neutralisez les envois réels** : les rappels n8n et les e-mails doivent partir vers des adresses de test, jamais vers de vrais clients.
- **Gardez les journaux ouverts** (Vercel, Supabase) pendant la séance, mais consultez-les après : pendant la séance, votre attention appartient au testeur.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Préparer sans écrire de code

- Si votre MVP est construit avec Bolt.new, gardez une **version publiée stable** pour les tests et faites vos modifications à côté, sans republier pendant la série.
- Créez vous-même des **comptes de démonstration** (un coach, un client, par exemple) et remplissez-les avec des données fictives crédibles.
- Si votre MVP est en mode « concierge » (par exemple une page de réservation et une base Airtable que vous gérez à la main avec n8n), testez quand même : le testeur voit la page, vous jouez le rôle du système en coulisse. Ce que vous observez reste valable.
- Demandez à une personne de confiance de jouer l’observateur : vous pourrez vous concentrer sur l’animation.
`,
        },
        {
          type: "prompt",
          title: "Rédiger un script de test neutre",
          tool: "Claude",
          prompt: `
Tu es un chercheur UX expérimenté. Aide-moi à rédiger le script d’un test d’utilisabilité modéré de 30 à 40 minutes.

Contexte (sans aucune donnée personnelle) :
- Produit : [description en 2 phrases]
- Profil des testeurs : [cible]
- Hypothèses à vérifier : [liste]
- Libellés exacts des menus et boutons de mon interface : [liste]

Rédige :
1. Un texte d’accueil de moins de 150 mots, qui rappelle qu’on teste le produit et non la personne, et qui explique le principe de penser à voix haute.
2. Un paragraphe d’information et de demande d’accord pour l’enregistrement, distinct de l’accord pour participer.
3. Trois questions d’échauffement ouvertes sur la façon dont le testeur s’organise aujourd’hui.
4. Pour chaque hypothèse, une tâche formulée comme un scénario réaliste, sans utiliser les libellés de mon interface et sans indiquer le chemin.
5. Cinq questions de débrief ouvertes et neutres.

Ensuite, relis ton propre script et signale chaque formulation qui pourrait orienter le testeur.
`,
          tips: "Fournir les libellés exacts de votre interface permet à l’IA de les éviter dans les consignes. Relisez ensuite le script à voix haute : ce qui sonne faux à l’oral sera mal lu en séance.",
        },
        {
          type: "exercice",
          title: "Votre protocole de test",
          instructions: `
Rédigez le protocole de test de **votre projet** à partir du modèle fourni, ou dans une page Notion qui en reprend les rubriques.

1. **Objectifs et hypothèses** : trois ou quatre hypothèses, chacune avec un critère de réussite fixé à l’avance.
2. **Tâches** : trois à cinq scénarios réalistes, sans les mots de votre interface.
3. **Script** : accueil, consentement, échauffement, consignes des tâches, débrief.
4. **Recrutement** : profil visé, deux ou trois questions de sélection, sources de recrutement. Aucun nom dans le document rendu : écrivez « contact 1, communauté X ».
5. **Consentement et RGPD** : texte d’information remis au testeur, façon de recueillir l’accord pour l’enregistrement, mode d’anonymisation, durée de conservation.
6. **Matériel et planning** : version testée, comptes de démonstration, dates prévues du test pilote et des cinq séances.

Déposez le protocole au format PDF (export de Notion, d’un traitement de texte ou d’un document en ligne). Il ne doit contenir aucune donnée personnelle.
`,
          deliverable: "fichier",
          estimatedMinutes: 35,
          review: "formateur",
          rubric: [
            "Les hypothèses sont vérifiables et accompagnées d’un critère de réussite fixé à l’avance",
            "Les tâches sont des scénarios réalistes qui ne dévoilent ni le chemin ni les mots de l’interface",
            "Le script est neutre et couvre accueil, consentement, échauffement, tâches et débrief",
            "Le recrutement vise réellement la cible (questions de sélection, sources identifiées)",
            "Le volet RGPD précise l’information, l’accord pour l’enregistrement, l’anonymisation et la durée de conservation",
          ],
        },
        {
          type: "checklist",
          title: "Avant la première séance",
          items: [
            "Hypothèses et critères de réussite écrits avant de rencontrer le premier testeur",
            "Test pilote réalisé avec une personne hors cible pour vérifier le script et la durée",
            "Version du produit figée, comptes et données de démonstration prêts",
            "Paiement en mode test : aucune vraie carte bancaire utilisée",
            "Texte d’information envoyé et accord pour l’enregistrement recueilli",
            "Cinq séances planifiées, avec au moins un contact de réserve",
            "Grille d’observation prête, codes T1 à T5 attribués",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m07-l03",
      title: "Mener les tests",
      summary:
        "Animer cinq séances sans influencer les testeurs, et consigner les observations dans une grille exploitable.",
      estimatedMinutes: 60,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez animer une séance de test sans influencer le testeur, et consigner ce que vous observez dans une grille exploitable.

## Votre rôle : faire parler, pas convaincre

Pendant une séance, vous n’êtes ni vendeur, ni formateur, ni support technique. Vous êtes un observateur curieux. Votre réussite ne se mesure pas au nombre de tâches accomplies par le testeur, mais à ce que vous apprenez. Une séance où tout se passe bien et où vous n’apprenez rien est une séance ratée.

Trois principes guident toute la séance : faire penser à voix haute, ne pas aider, relancer de façon neutre.

## Faire penser à voix haute

La **pensée à voix haute** consiste à demander au testeur de dire tout ce qui lui passe par la tête pendant qu’il utilise le produit : ce qu’il cherche, ce qu’il comprend, ce qui le surprend. C’est la seule façon d’accéder à son raisonnement, et pas seulement à ses clics.

Ce n’est pas naturel. Expliquez le principe en début de séance, puis montrez l’exemple en trente secondes sur un site sans rapport avec votre produit : « Je cherche les horaires… je vois un menu… je pense que c’est dans Contact. » Quand le testeur se tait, relancez doucement : « Qu’est-ce que vous vous dites, là ? »

## Ne pas aider

C’est la règle la plus difficile. Quand un testeur bloque, tout votre corps veut lui montrer le bouton. Résistez. Si vous aidez, vous ne saurez jamais s’il aurait trouvé seul ; et le jour du lancement, vous ne serez pas à côté de chaque utilisateur.

Quand le testeur vous pose une question, renvoyez-la : « Que feriez-vous si je n’étais pas là ? », « À votre avis ? ». Acceptez les silences. Dix secondes paraissent longues, mais c’est souvent là que le testeur trouve, ou abandonne. Les deux sont des informations.

Fixez une limite dans votre protocole : après deux ou trois minutes de blocage complet, notez la tâche comme échouée et proposez de passer à la suivante. Vous pouvez alors montrer la solution, pour que la suite de la séance reste possible. Notez-le dans la grille.

## Relancer de façon neutre

| À éviter | Pourquoi | À préférer |
| --- | --- | --- |
| « C’est facile, non ? » | Suggère la réponse attendue | « Comment ça s’est passé pour vous ? » |
| « Vous avez vu le bouton en haut ? » | Donne la solution | « Qu’est-ce que vous cherchez ? » |
| « Vous aimez ce design ? » | Invite à la politesse | « Qu’est-ce que vous vous attendiez à trouver ici ? » |
| « Vous utiliseriez cette fonction ? » | Demande une prédiction | « La dernière fois que vous avez eu ce besoin, comment avez-vous fait ? » |
| « C’est normal, c’est parce que… » | Justifie le produit | « D’accord. Continuez comme vous le feriez chez vous. » |

Une technique utile : **l’écho**. Répétez les derniers mots du testeur sur un ton interrogatif (« Bizarre ? ») : il développe, sans que vous ayez orienté quoi que ce soit.

## La grille d’observation

La **grille d’observation** est un tableau rempli pendant ou juste après chaque séance. Une ligne par tâche, les mêmes colonnes pour tous les testeurs :

| Testeur et tâche | Réussite | Temps | Erreurs et hésitations | Citations exactes |
| --- | --- | --- | --- | --- |
| T3 — Publier ses disponibilités | Avec aide | 4 min 10 | Cherche une option de répétition, revient deux fois à l’accueil | « Je dois vraiment refaire ça chaque semaine ? » |
| T3 — Retrouver un paiement | Seul | 40 s | Aucune | « Ah, ça c’est clair. » |

Codez la réussite en trois niveaux : **seul**, **avec aide**, **échec**. Chronométrez de la fin de la consigne jusqu’au moment où le testeur dit avoir terminé. Notez les **citations mot pour mot**, entre guillemets : ce sont les éléments les plus précieux pour l’analyse, et pour vos textes au M08. Séparez clairement ce que vous avez **observé** (« a cliqué trois fois sur le titre ») de ce que vous **interprétez** (« pense que le titre est cliquable »).

Dans cet exemple, « T3 » désigne le testeur 3 : aucun nom n’apparaît dans la grille.

## Le débrief

Après les tâches, gardez cinq à dix minutes pour des questions ouvertes :

1. « Pouvez-vous me dire en une phrase à quoi sert ce produit ? » Cette question vérifie la compréhension de votre proposition de valeur.
2. « Qu’est-ce qui vous a paru le plus difficile ? Et le plus simple ? »
3. « Qu’est-ce qui manquerait pour que vous l’utilisiez vraiment ? »
4. « Comment faites-vous aujourd’hui, sans ce produit ? »

Vous pouvez aussi demander, après chaque tâche, une note de facilité de 1 (très difficile) à 7 (très facile). Elle aide à comparer les tâches entre elles, jamais à produire une statistique.

Remerciez, rappelez ce que vous ferez des données, puis prenez dix minutes seul pour noter vos impressions à chaud : les trois choses qui vous ont le plus surpris.

## Organiser la série

Gardez la même version du produit pour les cinq séances : si vous corrigez entre deux séances, vous ne comparez plus la même chose. Seule exception, un bug bloquant qui empêche toute la suite du test : corrigez-le, notez-le, et tenez-en compte dans l’analyse. Espacez les séances sur une à deux semaines, pas davantage, pour garder une vision d’ensemble.
`,
        },
        {
          type: "video",
          title: "Une séance de test commentée",
          durationMinutes: 6,
          script: `
- Mise en situation : un animateur et une coach testeuse en visioconférence, Créno affiché en partage d’écran, un observateur hors champ.
- Accueil et consentement lus depuis le script, avec la demande d’accord pour l’enregistrement.
- Démonstration de la pensée à voix haute sur un site sans rapport avec le produit.
- Tâche « publier ses disponibilités » : la testeuse bloque, l’animateur renvoie la question au lieu d’aider.
- Arrêt sur image : comparer une relance orientée et une relance neutre sur le même moment.
- L’observateur remplit la grille en direct : réussite, temps, citation exacte, observation distinguée de l’interprétation.
- Débrief, remerciements, puis notes à chaud de l’animateur après le départ de la testeuse.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Préparez votre fiche de relances

Si vous n’avez jamais animé d’entretien, le plus difficile est de trouver des mots neutres dans l’instant. Préparez une fiche d’une page, posée à côté de votre écran, avec vos relances :

- « Qu’est-ce que vous vous dites, là ? »
- « Qu’est-ce que vous cherchez ? »
- « Qu’est-ce que vous vous attendiez à voir ? »
- « Que feriez-vous si je n’étais pas là ? »
- « Vous pouvez m’en dire plus ? »
- « Continuez comme vous le feriez chez vous. »
- « Il n’y a pas de mauvaise réponse, c’est le produit qu’on teste. »

Vous serez moins à l’aise à la première séance qu’à la cinquième : c’est normal, et c’est précisément pour cela qu’on prépare un script. Si une relance vous échappe, un silence attentif fonctionne très bien.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Résistez à l’envie d’expliquer

Vous connaissez chaque ligne du code : pendant un test, c’est un handicap. Trois réflexes à neutraliser :

- **Expliquer le fonctionnement** (« en fait, le créneau est créé quand vous validez la fenêtre »). L’utilisateur n’aura pas cette explication chez lui.
- **Déboguer en direct.** Si une erreur survient, notez l’heure, l’action et le message, puis continuez. Vous consulterez les journaux après la séance.
- **Justifier un choix technique** (« c’est une limite de l’API »). Pour le testeur, un problème est un problème, quelle qu’en soit la cause.

Si vous avez un associé non technique, confiez-lui l’animation et prenez le rôle d’observateur. Sinon, écrivez en gros sur votre fiche : « Je ne suis pas là pour expliquer. »
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Votre expertise métier, à tenir en laisse

Vous connaissez le métier de vos utilisateurs, parfois mieux qu’eux. Pendant le test, ne corrigez pas leur façon de travailler (« normalement, un coach devrait… ») : observez-la. Si un testeur utilise le produit d’une manière imprévue, c’est une information sur le produit, pas une erreur du testeur. Et si un bug survient, notez précisément l’écran, l’action et le message affiché : c’est ce qui permettra de le faire corriger ensuite, par vous avec Bolt.new ou par la personne qui développe.
`,
        },
        {
          type: "exercice",
          title: "Menez vos cinq tests",
          instructions: `
Menez **cinq séances de test** sur votre projet, en suivant votre protocole.

Le temps indiqué couvre la mise au propre de vos grilles et de vos notes. Les séances elles-mêmes (cinq fois 30 à 45 minutes) sont à planifier dans votre agenda, idéalement sur une à deux semaines.

1. Pour chaque séance, remplissez la grille : une ligne par tâche, avec réussite (seul, avec aide, échec), temps, erreurs et hésitations, citations exactes.
2. Juste après chaque séance, notez vos trois surprises principales.
3. Rassemblez les cinq grilles dans un seul document, avec un onglet ou une section par testeur (T1 à T5).
4. Ajoutez en tête un court bilan : dates des séances, version testée, écarts par rapport au protocole (désistement, aide apportée, bug bloquant).

Déposez le fichier (tableur ou PDF). Vérifiez avant l’envoi qu’il ne contient ni nom, ni adresse e-mail, ni capture permettant d’identifier un testeur.

Exemple Créno : T2, coach, tâche « publier ses disponibilités » : avec aide, 4 min 10, cherche une option de répétition, citation « Je dois vraiment refaire ça chaque semaine ? ».
`,
          deliverable: "fichier",
          estimatedMinutes: 45,
          review: "formateur",
          rubric: [
            "Cinq séances menées avec des testeurs appartenant à la cible",
            "Grille complète et homogène : réussite, temps, erreurs et citations pour chaque tâche",
            "Observations factuelles clairement distinguées des interprétations",
            "Citations exactes rapportées entre guillemets",
            "Données anonymisées : codes T1 à T5, aucune information identifiante",
          ],
        },
        {
          type: "checklist",
          title: "Pendant chaque séance",
          items: [
            "Script lu tel quel, accord pour l’enregistrement confirmé",
            "Pensée à voix haute expliquée et démontrée",
            "Aucune aide donnée avant la limite de blocage fixée",
            "Relances neutres uniquement, silences acceptés",
            "Grille remplie pour chaque tâche, citations mot pour mot",
            "Impressions à chaud notées dans les dix minutes qui suivent",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m07-l04",
      title: "Analyser et prioriser",
      summary:
        "Transformer cinq grilles d’observation en une liste courte de problèmes priorisés, reportés dans votre backlog Notion.",
      estimatedMinutes: 50,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez transformer cinq grilles d’observation en une liste courte de problèmes priorisés, reportés dans votre backlog Notion.

## De la grille aux observations

Commencez par **dépouiller** vos grilles : relisez chaque séance et extrayez des **observations atomiques**, c’est-à-dire un seul fait par ligne, avec sa source.

- « T2 cherche une option de répétition dans le formulaire de créneau. »
- « T4 pense que le prix affiché correspond à un forfait de plusieurs séances. »
- « T1, T3 et T5 retrouvent un paiement seuls, en moins d’une minute. »

N’oubliez pas ce qui **fonctionne** : c’est ce qu’il ne faudra pas casser en corrigeant le reste. Un tableur ou une base Notion suffit, avec une ligne par observation et les colonnes testeur, tâche, observation, citation.

## Regrouper par thèmes

Le **regroupement par affinités** consiste à rassembler les observations qui parlent du même sujet, sans catégories décidées à l’avance. Lisez les observations une à une et placez chacune avec celles qui lui ressemblent. Nommez ensuite chaque groupe par une phrase qui décrit le problème du point de vue de l’utilisateur : « La publication de créneaux récurrents est fastidieuse. »

Pour Créno, après cinq tests côté coach, on obtient par exemple quatre thèmes : la récurrence des créneaux, la compréhension du prix, le paiement sur mobile et, côté positif, un suivi des paiements très clair.

Comptez pour chaque thème combien de testeurs sont concernés : « 3 testeurs sur 5 ». C’est la **fréquence**.

## Évaluer la gravité

La fréquence ne suffit pas : un problème rencontré par un seul testeur peut être grave s’il empêche de payer. Attribuez une **gravité** à chaque problème :

| Gravité | Définition | Exemple Créno |
| --- | --- | --- |
| Bloquant | Empêche d’accomplir la tâche | Le client ne trouve pas le bouton de paiement sur mobile |
| Majeur | La tâche aboutit, mais avec difficulté, erreur ou aide | Le coach publie ses créneaux un par un, en s’agaçant |
| Mineur | Gêne passagère sans conséquence sur la réussite | Le libellé « Slots » est incompris quelques secondes |
| Cosmétique | Détail visuel sans effet sur l’usage | Un bouton mal aligné |

Un problème bloquant, même rencontré une seule fois, passe en tête de liste.

## Du constat au problème à résoudre

Formulez chaque thème comme un **problème**, pas comme une solution. « Ajouter un bouton Répéter » est une solution parmi d’autres ; « Les coachs doivent ressaisir chaque semaine des créneaux identiques » est le problème. Cette formulation vous laisse chercher la meilleure réponse, parfois plus simple que la première idée : dupliquer la semaine précédente peut suffire.

## Prioriser : impact, effort et ICE

Deux méthodes simples, combinables.

La **matrice impact / effort** classe chaque problème selon l’impact de sa résolution sur l’usage et l’effort nécessaire. Traitez d’abord les problèmes à fort impact et faible effort, planifiez les forts impacts coûteux, et laissez de côté les faibles impacts.

La **méthode ICE** note chaque problème de 1 à 10 sur trois critères : **Impact** (effet attendu sur l’usage ou l’activation), **Confiance** (êtes-vous sûr de cet impact, au vu de vos preuves ?) et **Facilité** (l’inverse de l’effort). Selon les équipes, on multiplie les trois notes ou on en fait la moyenne : l’important est d’appliquer toujours la même règle.

| Problème | Gravité | Fréquence | I | C | E | ICE (produit) |
| --- | --- | --- | --- | --- | --- | --- |
| Paiement introuvable sur mobile | Bloquant | 2/5 | 9 | 8 | 7 | 504 |
| Ressaisie des créneaux chaque semaine | Majeur | 3/5 | 8 | 7 | 5 | 280 |
| Libellé « Slots » incompris | Mineur | 2/5 | 3 | 8 | 10 | 240 |
| Prix perçu comme un forfait | Majeur | 1/5 | 6 | 4 | 9 | 216 |

Les notes restent des jugements : le score sert à discuter et à trancher, pas à remplacer la réflexion. Ici, l’équipe corrigera le libellé en même temps que le paiement, car la modification prend quelques minutes.

## Mettre à jour le backlog Notion

Reportez chaque problème retenu dans le backlog créé au M01, sous forme de user story ou de bug, avec la gravité, le score ICE, un lien vers les observations et une ou deux citations. Ajoutez une étiquette « test utilisateur » pour retrouver l’origine. Les problèmes écartés restent dans le backlog avec une priorité basse : ils reviendront peut-être lors de la série suivante. Au prochain sprint planning, ces éléments entrent en concurrence avec vos autres priorités, selon les règles de Scrum vues au M01.

## Se faire aider par l’IA, sur des notes anonymisées

Un assistant IA peut accélérer le regroupement par thèmes, proposer des formulations de problèmes ou repérer des doublons. Trois règles :

- **Anonymisez avant de coller** : codes T1 à T5, aucun nom, e-mail, numéro de téléphone, nom d’entreprise ou détail permettant d’identifier quelqu’un. Ne transmettez jamais d’enregistrement audio ou vidéo.
- **Vérifiez les paramètres de confidentialité** de l’outil utilisé (conservation des conversations, utilisation pour l’entraînement) dans sa documentation.
- **Contrôlez chaque affirmation** : l’IA peut inventer une citation ou exagérer une fréquence. Toute conclusion doit pouvoir être rattachée à une ligne de vos grilles.

L’IA propose, vous décidez : c’est vous qui étiez présent pendant les séances.
`,
        },
        {
          type: "prompt",
          title: "Regrouper des observations anonymisées par thèmes",
          tool: "Claude",
          prompt: `
Tu es un chercheur UX. Voici des observations issues de 5 tests d’utilisabilité de mon produit. Elles sont anonymisées : les testeurs sont codés T1 à T5.

Produit : [description en 2 phrases]
Tâches testées : [liste]

Observations (une par ligne, au format « testeur — tâche — observation — citation ») :
[collez ici vos observations anonymisées]

1. Regroupe ces observations en thèmes (8 au maximum). Pour chaque thème, donne un titre formulé comme un problème du point de vue de l’utilisateur, la liste des observations concernées et les codes des testeurs concernés.
2. Liste séparément ce qui fonctionne bien.
3. Signale les observations contradictoires ou ambiguës.
4. N’invente aucune citation et n’extrapole aucune proportion. Si une information ne figure pas dans mes notes, dis-le.

Ne propose pas encore de solutions.
`,
          tips: "Vérifiez que chaque testeur cité dans un thème apparaît bien dans les observations correspondantes. Demandez des pistes de solutions dans un second temps seulement, et pour les trois problèmes prioritaires.",
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Pas besoin d’outil spécial

L’analyse peut se faire avec du papier et une table. Écrivez chaque observation sur un post-it (avec le code du testeur), étalez-les, puis rapprochez ceux qui se ressemblent. Donnez un titre à chaque tas. Comptez les codes testeurs différents dans chaque tas : vous avez votre fréquence. Prenez une photo, puis recopiez le résultat dans votre backlog Notion.

Ne cherchez pas l’analyse parfaite. Si deux thèmes vous semblent proches, fusionnez-les. L’objectif est de décider quoi corriger en premier, pas de produire un rapport.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Bugs et problèmes d’usage : deux files distinctes

Séparez les **bugs** (le produit ne fait pas ce qu’il est censé faire) des **problèmes d’usage** (le produit fonctionne, mais l’utilisateur ne s’en sort pas). Un bug se documente de façon reproductible : environnement, étapes, résultat attendu, résultat obtenu, capture ou message d’erreur.

Pour les problèmes d’usage, méfiez-vous du réflexe de la refonte : cherchez la **plus petite modification** qui résout le problème (un libellé, un ordre d’écran, une valeur par défaut), puis retestez. Vous pouvez demander à Claude Code ou Cursor de proposer plusieurs options de correction, mais relisez chaque changement avant de l’intégrer.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Transformer un problème en demande de modification précise

Que vous corrigiez vous-même avec Bolt.new ou que vous confiiez la correction à quelqu’un, rédigez chaque demande en quatre parties :

1. **Contexte** : l’écran et le rôle concernés (« coach, écran de publication des créneaux »).
2. **Problème observé** : les faits, avec une citation (« 3 testeurs sur 5 ont ressaisi leurs créneaux un par un »).
3. **Comportement attendu** : ce que l’utilisateur doit pouvoir faire (« dupliquer la semaine précédente en une action »).
4. **Critère d’acceptation** : comment vérifier que c’est réglé (« un coach publie une semaine identique à la précédente en moins de trente secondes »).

Une demande précise donne un résultat précis, que ce soit pour un outil d’IA ou pour un développeur.
`,
        },
        {
          type: "exercice",
          title: "Synthèse et priorisation de vos tests",
          instructions: `
À partir de vos cinq grilles :

1. Dépouillez-les en observations atomiques : un fait par ligne, avec le code du testeur.
2. Regroupez-les en quatre à huit thèmes, formulés comme des problèmes du point de vue de l’utilisateur.
3. Pour chaque thème, indiquez la fréquence (x testeurs sur 5), la gravité et le score ICE.
4. Listez ce qui fonctionne bien et qu’il ne faut pas casser.
5. Mettez à jour votre backlog Notion avec les problèmes retenus.

Rendez ici votre tableau de synthèse (thème, fréquence, gravité, I, C, E, score, décision), suivi de deux ou trois phrases : ce que vous corrigez au prochain sprint, et pourquoi.
`,
          deliverable: "texte",
          estimatedMinutes: 35,
          review: "formateur",
          rubric: [
            "Les thèmes sont formulés comme des problèmes utilisateur, pas comme des solutions",
            "Chaque thème est rattaché à des observations précises (codes testeurs)",
            "Gravité et fréquence sont distinguées et cohérentes",
            "La priorisation est appliquée de la même façon à tous les thèmes et aboutit à des décisions claires",
            "Les décisions sont reportées dans le backlog Notion",
          ],
        },
        {
          type: "checklist",
          title: "Avant de modifier le produit",
          items: [
            "Chaque problème retenu est relié à au moins une observation",
            "Les problèmes bloquants sont en tête de liste",
            "Ce qui fonctionne est listé, pour ne pas le casser",
            "Aucune donnée personnelle n’a été transmise à un outil d’IA",
            "Le backlog Notion est à jour : étiquette « test utilisateur », gravité, score",
            "Une nouvelle série de tests est prévue après les corrections",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m07-l05",
      title: "Mesurer l’usage",
      summary:
        "Définir les événements clés, l’entonnoir d’activation et l’indicateur principal de votre MVP, dans le respect des règles sur les cookies.",
      estimatedMinutes: 30,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez définir les événements à mesurer, l’entonnoir d’activation et l’indicateur principal de votre MVP, dans le respect des règles sur les cookies.

## Tester et mesurer : deux sources complémentaires

Les tests utilisateurs vous disent **pourquoi** les gens bloquent, sur cinq personnes. La mesure de l’usage vous dit **combien** de personnes vont jusqu’au bout, et si elles reviennent, sur l’ensemble de vos utilisateurs. L’une sans l’autre est trompeuse : des chiffres sans observation ne s’expliquent pas, des observations sans chiffres ne se généralisent pas.

## Les événements clés

Un **événement** est une action significative d’un utilisateur, enregistrée avec sa date : un créneau publié, une réservation payée. Ne mesurez pas tout : chaque événement doit répondre à une question que vous vous posez vraiment.

Donnez-leur des noms stables, en minuscules, sous la forme objet_action : \`creneau_publie\`, \`reservation_creee\`, \`paiement_reussi\`. Ajoutez des **propriétés** utiles (rôle, source d’acquisition), mais **jamais de donnée personnelle** : pas de nom, pas d’e-mail, pas de texte libre saisi par l’utilisateur. Un identifiant technique suffit.

## L’entonnoir d’activation

L’**activation** est le moment où un nouvel utilisateur obtient pour la première fois la valeur promise. Pour un coach sur Créno, ce n’est pas la création du compte : c’est la première réservation payée par un client. L’**entonnoir d’activation** décrit les étapes qui y mènent, et le nombre de personnes qui franchissent chacune d’elles :

1. Compte coach créé
2. Profil complété
3. Premier créneau publié
4. Lien de réservation partagé
5. Première réservation payée reçue

Le **taux de passage** d’une étape à la suivante montre où l’on perd des utilisateurs. Si beaucoup de coachs créent un compte mais peu publient un créneau, c’est cette étape qu’il faut travailler, et vos tests de la leçon 3 vous disent sans doute pourquoi.

## L’indicateur principal

L’**indicateur principal** (souvent appelé North Star Metric) est le chiffre unique qui résume la valeur que votre produit apporte. Un bon indicateur principal :

- mesure une valeur reçue par l’utilisateur, pas une activité de votre part ;
- évolue quand le produit s’améliore ;
- se suit chaque semaine.

Pour Créno : le **nombre de séances réservées et payées par semaine**. Le nombre de visiteurs ou de comptes créés est un **indicateur de vanité** : il flatte, mais ne dit rien de la valeur délivrée. Vous suivrez cet indicateur dans votre tableau de bord hebdomadaire au M08.

## Les outils, en termes généraux

Plusieurs familles d’outils existent, souvent combinables :

- **Les analytics de l’hébergeur** : des plateformes comme Vercel proposent une mesure d’audience intégrée (pages vues, provenance des visites). Simple à activer, mais limitée au trafic.
- **Les outils d’analytics produit** : ils suivent des événements, des entonnoirs et la rétention. Certains sont open source et peuvent être hébergés par vos soins.
- **Les outils de mesure d’audience respectueux de la vie privée** : conçus pour limiter la collecte de données personnelles, parfois sans cookie.
- **Votre propre table d’événements** dans votre base de données (Supabase, Airtable) : entièrement maîtrisée, idéale pour les événements critiques confirmés côté serveur, comme un paiement.

Critères de choix : lieu d’hébergement des données, besoin ou non de consentement, capacité à construire un entonnoir, coût. Consultez la documentation et la page tarifs de chaque outil au moment de votre choix.

## Consentement et cookies

En France, le dépôt de cookies ou d’autres traceurs non indispensables au fonctionnement du service (publicité, suivi entre sites, la plupart des outils d’analytics) requiert le **consentement préalable** de l’utilisateur. Refuser doit être aussi simple qu’accepter, et aucun traceur concerné ne doit être déposé avant le choix. Certains outils de mesure d’audience peuvent être exemptés de consentement s’ils respectent des conditions strictes définies par la CNIL. Consultez les recommandations à jour sur [cnil.fr](https://www.cnil.fr). Ces éléments sont des informations générales, pas un conseil juridique ; le sujet est repris au M08.

## Le plan de marquage minimal de Créno

Un **plan de marquage** est le tableau qui liste les événements à enregistrer. Voici celui de Créno : six événements, pas davantage.

| Événement | Déclencheur | Propriétés | Où | Question à laquelle il répond |
| --- | --- | --- | --- | --- |
| \`compte_cree\` | Fin de l’inscription | rôle, source | Serveur | D’où viennent les inscrits ? |
| \`creneau_publie\` | Créneau enregistré | nombre de créneaux | Serveur | Les coachs publient-ils ? |
| \`lien_partage\` | Clic sur « copier mon lien » | aucune | Navigateur | Les coachs diffusent-ils leur page ? |
| \`reservation_creee\` | Réservation enregistrée | identifiant du créneau | Serveur | Les clients réservent-ils ? |
| \`paiement_reussi\` | Confirmation de paiement reçue | montant | Serveur | Les réservations vont-elles jusqu’au paiement ? |
| \`reservation_annulee\` | Annulation confirmée | délai avant la séance | Serveur | Les annulations posent-elles problème ? |

Enregistrez de préférence côté serveur : c’est plus fiable, car les bloqueurs de publicité n’interviennent pas, et vous maîtrisez exactement les données envoyées.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Une table d’événements dans Supabase

Pour les événements critiques, une table dédiée suffit au début :

\`\`\`sql
create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
-- Aucune politique pour anon et authenticated :
-- seules les écritures côté serveur passent.
\`\`\`

Écrivez les événements depuis le serveur (Server Action, route API, webhook de paiement), avec une clé qui ne quitte jamais le serveur. Puis lisez votre entonnoir de la semaine :

\`\`\`sql
select name, count(distinct user_id) as utilisateurs
from public.events
where created_at >= now() - interval '7 days'
group by name
order by utilisateurs desc;
\`\`\`

Avec \`on delete set null\`, les événements d’un utilisateur qui supprime son compte sont détachés de celui-ci. Fixez aussi une durée de conservation et purgez régulièrement les événements anciens.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Mesurer sans écrire de code

- Activez la mesure d’audience proposée par votre hébergeur ou par l’outil avec lequel vous avez construit votre MVP, pour suivre les visites et leur provenance. Vérifiez dans sa documentation si elle dépose des cookies.
- Pour les événements clés, votre base de données est déjà une source : chaque créneau publié ou réservation payée y est enregistré avec une date. Une vue filtrée par semaine, dans Airtable ou dans l’éditeur de tables de Supabase, vous donne les chiffres de l’entonnoir.
- Pour un événement qui n’existe pas encore dans la base, demandez à Bolt.new de l’enregistrer en lui fournissant votre plan de marquage, puis vérifiez dans la base qu’il apparaît bien.
- Un scénario n8n hebdomadaire pourra compter ces lignes et vous envoyer un résumé : vous le relierez à votre tableau de bord au M08.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Le vocabulaire de la mesure

| Terme | En clair |
| --- | --- |
| Événement | Une action enregistrée, par exemple une réservation payée |
| Entonnoir | La suite d’étapes vers la valeur, avec le nombre de personnes à chaque étape |
| Taux de passage | La part des personnes qui passent d’une étape à la suivante |
| Activation | Le moment où l’utilisateur obtient pour la première fois la valeur promise |
| Rétention | Le fait de revenir utiliser le produit après la première fois |
| Cohorte | Un groupe d’utilisateurs arrivés la même semaine, suivis ensemble |

Commencez avec trois événements seulement. Un petit tableau tenu à jour vaut mieux qu’un outil sophistiqué que personne ne regarde.
`,
        },
        {
          type: "quiz",
          title: "Vérifiez votre compréhension",
          questions: [
            {
              prompt: "Pour un coach sur Créno, quel moment correspond le mieux à l’activation ?",
              options: [
                { label: "La création de son compte" },
                { label: "La visite de la page d’accueil" },
                { label: "La réception de sa première réservation payée", correct: true },
                { label: "L’ouverture de l’e-mail de bienvenue" },
              ],
              explanation:
                "L’activation correspond à la première valeur réellement reçue. Pour un coach, c’est une séance réservée et payée par un client.",
            },
            {
              prompt: "Quelle propriété ne doit pas être enregistrée avec un événement ?",
              options: [
                { label: "Le rôle de l’utilisateur (coach ou client)" },
                { label: "La source d’acquisition" },
                { label: "L’adresse e-mail du client", correct: true },
                { label: "Le montant du paiement" },
              ],
              explanation:
                "Les événements ne doivent contenir aucune donnée personnelle directe. Un identifiant technique suffit pour relier les actions.",
            },
            {
              prompt: "Vous ajoutez un outil d’analytics qui dépose des cookies de suivi. Que devez-vous faire ?",
              options: [
                { label: "Rien, tant que le site est un MVP" },
                { label: "Recueillir le consentement préalable, avec un refus aussi simple que l’acceptation", correct: true },
                { label: "Mentionner l’outil en bas de page, sans autre démarche" },
                { label: "Déposer les cookies, puis demander l’accord à la page suivante" },
              ],
              explanation:
                "Les traceurs non indispensables nécessitent en principe un consentement préalable, sauf exemptions strictes définies par la CNIL pour certaines mesures d’audience.",
            },
          ],
        },
        {
          type: "exercice",
          title: "Votre plan de marquage minimal",
          instructions: `
Définissez la mesure de l’usage de **votre projet** :

1. Décrivez en une phrase le moment d’**activation** de votre utilisateur principal.
2. Listez les étapes de votre **entonnoir d’activation** (quatre à six étapes).
3. Choisissez votre **indicateur principal** et expliquez en une phrase pourquoi il reflète la valeur délivrée.
4. Rédigez votre **plan de marquage** : cinq à huit événements, avec déclencheur, propriétés, côté (serveur ou navigateur) et question à laquelle chacun répond.
5. Indiquez l’outil choisi et si son usage nécessite le consentement des visiteurs.

Exemple attendu : le plan de marquage de Créno présenté dans la leçon. Vérifiez qu’aucune propriété ne contient de donnée personnelle.
`,
          deliverable: "texte",
          estimatedMinutes: 20,
          review: "auto",
          rubric: [
            "L’activation correspond à une valeur réellement reçue par l’utilisateur",
            "L’indicateur principal mesure une valeur délivrée, pas une activité",
            "Chaque événement répond à une question explicite",
            "Aucune propriété ne contient de donnée personnelle",
            "Le besoin de consentement a été vérifié pour l’outil choisi",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m07-l06",
      title: "Évaluation du module",
      summary: "Vérifier vos acquis sur la préparation, la conduite et l’analyse des tests utilisateurs, et sur la mesure de l’usage.",
      estimatedMinutes: 20,
      blocks: [
        {
          type: "texte",
          markdown: `
Cette évaluation porte sur l’ensemble du module : types de tests, protocole, conduite des séances, analyse et priorisation, mesure de l’usage. Répondez d’abord sans relire vos notes, puis prenez le temps de lire chaque explication : elles complètent le cours.
`,
        },
        {
          type: "quiz",
          title: "Évaluation — Tester avec de vrais utilisateurs",
          graded: true,
          questions: [
            {
              prompt: "Quelle question relève d’un test de valeur plutôt que d’un test d’utilisabilité ?",
              options: [
                { label: "Les coachs trouvent-ils le bouton de publication ?" },
                { label: "Combien de temps faut-il pour réserver une séance ?" },
                { label: "Les coachs invitent-ils réellement leurs clients à réserver via Créno ?", correct: true },
                { label: "Les clients comprennent-ils le libellé du bouton d’annulation ?" },
              ],
              explanation:
                "Le test de valeur cherche un engagement réel (« veulent-ils ? »). Les trois autres questions portent sur la capacité à utiliser le produit (« peuvent-ils ? »).",
            },
            {
              prompt: "Pourquoi recommande-t-on souvent des séries d’environ cinq testeurs ?",
              options: [
                { label: "C’est le minimum légal pour un test utilisateur" },
                { label: "Au-delà, on retrouve surtout les mêmes problèmes : mieux vaut corriger puis refaire une série", correct: true },
                { label: "Cinq testeurs donnent un résultat statistiquement représentatif du marché" },
                { label: "Les outils de visioconférence limitent le nombre de participants" },
              ],
              explanation:
                "Pour un même profil, les problèmes d’utilisabilité principaux apparaissent vite. Plusieurs petites séries entrecoupées de corrections apprennent davantage qu’une grande série. Cela ne constitue jamais une statistique.",
            },
            {
              prompt: "Quelle consigne de tâche est la mieux formulée pour un coach ?",
              options: [
                { label: "« Cliquez sur Créneaux, puis sur Ajouter un créneau récurrent. »" },
                { label: "« Utilisez la fonction de créneaux récurrents. »" },
                { label: "« Vous reprenez vos séances la semaine prochaine, trois soirs par semaine : rendez ces horaires disponibles pour vos clients. »", correct: true },
                { label: "« Trouvez-vous facile de publier des créneaux ? »" },
              ],
              explanation:
                "Une bonne tâche donne un but et un contexte réalistes, sans indiquer le chemin ni reprendre les mots de l’interface.",
            },
            {
              prompt: "Un testeur accepte de participer mais refuse d’être enregistré. Que faites-vous ?",
              options: [
                { label: "Vous annulez la séance" },
                { label: "Vous enregistrez quand même, en supprimant le fichier ensuite" },
                { label: "Vous menez la séance sans enregistrer et prenez des notes", correct: true },
                { label: "Vous lui demandez de signer une décharge" },
              ],
              explanation:
                "L’accord pour l’enregistrement est distinct de l’accord pour participer. Un refus doit être respecté sans pénaliser la participation.",
            },
            {
              prompt: "En pleine tâche, le testeur vous demande : « Je clique où ? ». Quelle réponse est la plus adaptée ?",
              options: [
                { label: "« Sur le bouton vert, en haut à droite. »" },
                { label: "« Que feriez-vous si je n’étais pas là ? »", correct: true },
                { label: "« C’est pourtant simple, regardez bien. »" },
                { label: "« Ne vous inquiétez pas, tout le monde bloque ici. »" },
              ],
              explanation:
                "Renvoyer la question permet d’observer ce que la personne ferait seule. Les autres réponses aident, jugent ou orientent.",
            },
            {
              prompt: "Laquelle de ces notes est une observation, et non une interprétation ?",
              options: [
                { label: "T4 pense que le titre de la carte est cliquable" },
                { label: "T4 n’aime pas la page de réservation" },
                { label: "T4 a cliqué trois fois sur le titre de la carte", correct: true },
                { label: "T4 n’est pas à l’aise avec le numérique" },
              ],
              explanation:
                "Une observation décrit un fait vérifiable. Les interprétations sont utiles, mais doivent être notées séparément.",
            },
            {
              prompt: "Un seul testeur sur cinq n’a pas pu payer sur mobile. Comment traitez-vous ce problème ?",
              options: [
                { label: "Vous l’ignorez : un cas sur cinq n’est pas significatif" },
                { label: "Vous le classez bloquant et le placez en tête de liste", correct: true },
                { label: "Vous le classez cosmétique, puisqu’il est rare" },
                { label: "Vous attendez une deuxième série de tests pour décider" },
              ],
              explanation:
                "La gravité compte autant que la fréquence. Un problème qui empêche de payer est bloquant, même rencontré une seule fois.",
            },
            {
              prompt: "Dans la méthode ICE, que mesure la lettre C ?",
              options: [
                { label: "Le coût financier de la correction" },
                { label: "La confiance dans l’impact estimé, au vu des preuves disponibles", correct: true },
                { label: "Le nombre de clients concernés" },
                { label: "La complexité du code à modifier" },
              ],
              explanation:
                "ICE signifie Impact, Confiance, Facilité. La confiance reflète la solidité des preuves qui fondent votre estimation d’impact.",
            },
            {
              prompt: "Avant de demander à un assistant IA de regrouper vos notes de test, que devez-vous faire ?",
              options: [
                { label: "Transmettre les enregistrements vidéo pour plus de précision" },
                { label: "Remplacer noms et détails identifiants par des codes, et ne transmettre aucun enregistrement", correct: true },
                { label: "Demander à l’IA de supprimer elle-même les données personnelles" },
                { label: "Rien : les assistants IA ne conservent jamais les données" },
              ],
              explanation:
                "L’anonymisation se fait avant l’envoi, par vous. Vérifiez aussi les paramètres de confidentialité de l’outil dans sa documentation.",
            },
            {
              prompt: "Quel est le meilleur indicateur principal pour Créno ?",
              options: [
                { label: "Le nombre de visiteurs de la page d’accueil" },
                { label: "Le nombre de comptes créés depuis le lancement" },
                { label: "Le nombre de séances réservées et payées par semaine", correct: true },
                { label: "Le nombre d’abonnés sur les réseaux sociaux" },
              ],
              explanation:
                "L’indicateur principal mesure une valeur réellement délivrée et se suit chaque semaine. Visiteurs, comptes créés et abonnés sont des indicateurs de vanité.",
            },
          ],
        },
      ],
    },
  ],
};
