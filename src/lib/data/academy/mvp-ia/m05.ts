import type { SeedModule } from "../authoring";

export const M05: SeedModule = {
  key: "m05",
  title: "Parcours utilisateur et maquettes",
  summary:
    "Décrire le parcours clé de votre MVP, le dessiner en wireframes, appliquer les bases d'une interface claire et accessible, puis générer un prototype cliquable avec l'IA et le tester rapidement.",
  objectives: [
    "Être capable de décrire le parcours utilisateur clé de son MVP, avec son chemin nominal, les états de chaque écran et ses cas limites.",
    "Être capable de produire des wireframes basse fidélité des écrans du parcours clé, sur papier, dans Figma ou avec l'aide de l'IA.",
    "Être capable d'appliquer les bases d'interface (hiérarchie, typographie, espacements, contraste, accessibilité) et de définir un système de design minimal.",
    "Être capable de générer et d'améliorer par itérations un prototype cliquable avec un outil d'IA.",
    "Être capable de conduire trois tests rapides de maquette et d'en tirer une liste de frictions priorisées.",
  ],
  lessons: [
    // ---------------------------------------------------------------------------
    // L01 — Le parcours utilisateur clé
    // ---------------------------------------------------------------------------
    {
      key: "m05-l01",
      title: "Le parcours utilisateur clé",
      summary:
        "Décrire le parcours qui délivre la valeur de votre MVP : chemin nominal, états de chaque écran et cas limites.",
      estimatedMinutes: 45,
      blocks: [
        {
          type: "texte",
          markdown: `
**À la fin de cette leçon**, vous saurez décrire le parcours clé de votre MVP étape par étape, avec les états de chaque écran (vide, chargement, erreur, succès) et ses cas limites, avant de dessiner le moindre écran.

## Qu'est-ce qu'un parcours utilisateur ?

Un **parcours utilisateur** (user flow) est la suite d'écrans et d'actions qu'une personne accomplit pour atteindre un objectif précis, par exemple « réserver et payer une séance ». Il se distingue de l'expérience client globale (découverte, achat, fidélisation), plus large : ici, on zoome sur un objectif et sur ce qui se passe à l'écran.

Votre MVP a un **parcours clé** : celui qui délivre la valeur promise. S'il échoue, rien d'autre ne compte. Chez Créno, c'est « le client réserve et paie un créneau ». La publication des créneaux par le coach est indispensable, mais c'est la réservation payée qui prouve la valeur. Reprenez vos user stories du module 1 : le parcours clé en assemble plusieurs, dans l'ordre où l'utilisateur les vit.

## Le chemin nominal d'abord

Le **chemin nominal** (en anglais « happy path ») est le déroulé idéal, sans erreur ni hésitation. On le décrit en premier, avec un point d'entrée, une suite d'étapes et un point de sortie. Voici le parcours « réserver et payer un créneau » de Créno :

1. **Entrée** : Léa ouvre le lien de réservation que Julie, sa coach, partage sur ses réseaux ou par SMS.
2. Elle voit la présentation de Julie et les créneaux ouverts de la semaine.
3. Elle choisit « mardi 18 h - 19 h, renforcement musculaire, 35 € ».
4. Si elle n'est pas connectée, elle saisit son prénom et son email, puis clique sur le lien magique reçu.
5. Elle vérifie le récapitulatif (date, lieu, prix, conditions d'annulation) et touche « Payer 35 € ».
6. Elle paie sur la page sécurisée de Stripe.
7. Elle revient sur Créno : « Réservation confirmée », avec un bouton pour l'ajouter à son agenda.
8. **Sortie** : elle reçoit l'email de confirmation, puis le rappel la veille.

\`\`\`text
[Lien du coach]
      v
[Page du coach + créneaux ouverts]
      v
[Choix du créneau] --(non connectée)--> [Prénom + email] --> [Lien magique]
      |                                                            |
      v (déjà connectée)                                           |
[Récapitulatif] <--------------------------------------------------+
      v
[Paiement Stripe] --> [Confirmation] --> (email de confirmation, rappel la veille)
\`\`\`

Comptez les étapes : chacune est une occasion d'abandonner. Pour chaque étape, demandez-vous si elle peut être **supprimée**, **fusionnée** avec une autre ou **reportée** après le moment de valeur. Chez Créno, le téléphone (facultatif) est demandé après le premier paiement, pas avant : le prénom et l'email suffisent pour réserver.

## Les quatre états de chaque écran

Un écran n'est jamais figé : il passe par plusieurs **états**. Les oublier donne des écrans blancs, des boutons qui semblent morts et des utilisateurs perdus.

| État | Quand | Page « créneaux » de Créno |
| --- | --- | --- |
| Vide | Il n'y a encore aucune donnée | « Julie n'a pas de créneau ouvert cette semaine. » et un bouton « Voir la semaine prochaine » |
| Chargement | Les données arrivent | Des silhouettes grisées à la place de la liste |
| Erreur | Quelque chose a échoué | « Impossible de charger les créneaux. Vérifiez votre connexion. » et un bouton « Réessayer » |
| Succès | Tout va bien | La liste des créneaux, triée par date et heure |

Trois principes. Un **état vide** explique pourquoi c'est vide et propose une action. Un **message d'erreur** dit ce qui s'est passé et quoi faire, sans jargon technique. Une **action** reçoit toujours une réponse visible : un bouton qui passe à « Paiement en cours… », un message de succès.

## Les cas limites

Un **cas limite** est une situation moins fréquente mais réaliste, qui sort du chemin nominal. Listez-les étape par étape, puis décidez de leur traitement dans le MVP.

| Cas limite | Ce que voit l'utilisateur | Priorité MVP |
| --- | --- | --- |
| Le créneau est pris par quelqu'un d'autre pendant que Léa hésite | « Ce créneau vient d'être réservé » et des créneaux proches proposés, sans aucun débit | Indispensable |
| Le paiement est refusé ou abandonné | Retour au récapitulatif avec un message clair ; la place est libérée après un délai | Indispensable |
| Double clic sur « Payer » | Bouton désactivé pendant le traitement ; une seule réservation | Indispensable |
| Le lien magique a expiré ou n'arrive pas | « Renvoyer le lien » et le conseil de vérifier le courrier indésirable | Indispensable |
| Annulation tardive | Les conditions d'annulation de la coach sont affichées avant le paiement | Important |
| La coach annule le créneau | Email au client, remboursement à traiter | Important |
| Réseau coupé pendant le parcours | Message d'erreur et possibilité de reprendre | Plus tard (message simple) |

Priorisez avec une question simple : ce cas peut-il **faire perdre de l'argent** ou **une réservation** ? Si oui, il est indispensable dès le MVP. Sinon, un message clair suffit pour commencer.
`,
        },
        {
          type: "video",
          title: "Dessiner le parcours « réserver et payer » de Créno",
          durationMinutes: 5,
          script: `
- Ouverture : pourquoi le parcours clé est celui qui délivre la valeur, et pas le plus spectaculaire.
- Au tableau blanc, placer le point d'entrée (le lien partagé par la coach) et le point de sortie (la confirmation).
- Écrire les étapes du chemin nominal, puis les compter à voix haute.
- Supprimer ou reporter une étape en direct : le téléphone demandé après le premier paiement.
- Ajouter l'embranchement « connectée / non connectée ».
- Passer l'écran des créneaux aux quatre états : vide, chargement, erreur, succès.
- Lister les cas limites et les classer avec la question « peut-on perdre de l'argent ou une réservation ? ».
- Conclusion : ce parcours devient la base des wireframes de la leçon suivante.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Si vous débutez : pensez à votre GPS

Vous utilisez déjà un parcours sans le savoir : l'itinéraire d'un GPS. Le **trajet principal** est le chemin nominal. Les **déviations** sont les embranchements (connecté ou non). Les **bouchons et routes fermées** sont les cas limites. Et le GPS affiche toujours un état : « calcul de l'itinéraire… » (chargement), « aucun itinéraire trouvé » (erreur), « vous êtes arrivé » (succès).

Décrire un parcours ne demande aucune compétence technique : un stylo, une feuille, et l'effort de se mettre à la place de votre utilisateur. C'est même l'un des moments où votre connaissance du métier compte le plus.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Pour les profils non techniques : outils et méthode

- Commencez sur papier ou avec des post-its, une étape par post-it : vous pouvez les déplacer, en retirer, en ajouter.
- Si vous travaillez à distance, un tableau blanc en ligne (FigJam, Miro ou équivalent) fait le même travail.
- Écrivez chaque étape avec un verbe d'action du point de vue de l'utilisateur : « choisit un créneau », pas « page créneaux ».
- Gardez le schéma textuel : c'est lui que vous collerez dans vos prompts pour Bolt.new à la leçon 4.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Pour les profils techniques : du parcours au code

- **Routes.** Chaque écran du parcours devient une route : par exemple \`/c/[coachSlug]\`, \`/book/[slotId]\`, \`/book/[slotId]/confirmation\`.
- **États.** L'App Router de Next.js propose des fichiers de convention pour les états : \`loading.tsx\` (chargement), \`error.tsx\` (erreur), \`not-found.tsx\` (introuvable). L'état vide reste à votre charge dans le composant.
- **Machine à états.** Décrivez le cycle de vie d'une réservation (\`pending\`, \`confirmed\`, \`cancelled\`, expiration d'une réservation non payée) et les transitions autorisées : c'est la même liste que les contraintes de votre modèle (module 4).
- **Cas limites.** Transformez chaque cas « indispensable » en critère d'acceptation, puis en test de bout en bout au module 6.
`,
        },
        {
          type: "prompt",
          title: "Débusquer les cas limites de votre parcours",
          tool: "Tout assistant IA",
          prompt: `
Tu es designer UX et testeur expérimenté.

Voici le parcours clé de mon MVP, [nom du produit], pour [type d'utilisateur] :
[collez vos étapes numérotées]

1. Pour chaque étape, liste les cas limites réalistes : erreurs de l'utilisateur, problèmes techniques, actions simultanées de deux utilisateurs, délais, annulations.
2. Pour chaque cas, propose ce que l'utilisateur doit voir à l'écran (texte exact du message et action proposée).
3. Classe les cas en trois niveaux : indispensable (risque de perte d'argent ou de réservation), important, plus tard.
4. Signale les étapes qui pourraient être supprimées, fusionnées ou reportées.

Présente le résultat sous forme de tableau.
`,
          tips:
            "Vérifiez chaque cas proposé : l'IA en invente parfois d'improbables. Gardez ceux que vous pouvez imaginer arriver à un vrai client la première semaine.",
        },
        {
          type: "exercice",
          title: "Le parcours clé de votre MVP",
          instructions: `
Décrivez le parcours clé de **votre projet**.

1. Formulez l'objectif du parcours en une phrase, du point de vue de l'utilisateur (« réserver et payer une séance »).
2. Décrivez le chemin nominal en 5 à 10 étapes, avec un point d'entrée et un point de sortie.
3. Dessinez le schéma textuel du parcours (blocs et flèches), avec au moins un embranchement.
4. Pour les trois écrans principaux, décrivez les quatre états (vide, chargement, erreur, succès) avec le texte exact affiché.
5. Listez au moins cinq cas limites, avec ce que voit l'utilisateur, et classez-les : indispensable, important, plus tard.
6. Supprimez, fusionnez ou reportez au moins une étape, et expliquez pourquoi.
`,
          deliverable: "texte",
          estimatedMinutes: 25,
          review: "auto",
          rubric: [
            "L'objectif est formulé du point de vue de l'utilisateur.",
            "Le chemin nominal est complet, de l'entrée à la sortie, en 5 à 10 étapes.",
            "Les quatre états sont décrits pour les écrans principaux, avec des messages utiles.",
            "Les cas limites sont réalistes et priorisés.",
            "Au moins une simplification du parcours est proposée et justifiée.",
          ],
        },
        {
          type: "quiz",
          title: "Vérifiez vos acquis",
          questions: [
            {
              prompt: "Qu'est-ce que le chemin nominal d'un parcours ?",
              options: [
                { label: "La liste de toutes les erreurs possibles" },
                { label: "Le déroulé idéal, sans erreur ni hésitation, de l'entrée à la sortie", correct: true },
                { label: "Le parcours le plus long de l'application" },
                { label: "Le nom technique de la page d'accueil" },
              ],
              explanation: "On décrit d'abord le chemin nominal, puis les états et les cas limites qui s'en écartent.",
            },
            {
              prompt: "Quel est le meilleur état vide pour la page des créneaux de Créno ?",
              options: [
                { label: "Une page blanche" },
                { label: "« Erreur 404 »" },
                { label: "« Julie n'a pas de créneau ouvert cette semaine » avec un bouton « Voir la semaine prochaine »", correct: true },
                { label: "Une liste de créneaux fictifs" },
              ],
              explanation: "Un état vide explique la situation et propose une action.",
            },
            {
              prompt: "Pourquoi le cas « le créneau est pris pendant que Léa hésite » est-il indispensable dès le MVP ?",
              options: [
                { label: "Parce qu'il est très fréquent" },
                { label: "Parce qu'il peut faire perdre de l'argent ou une réservation", correct: true },
                { label: "Parce qu'il est facile à coder" },
                { label: "Parce que Stripe l'exige" },
              ],
              explanation:
                "Un double paiement pour une seule place ou une réservation perdue abîme immédiatement la confiance : ce cas doit être traité.",
            },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------------------
    // L02 — Wireframes rapides
    // ---------------------------------------------------------------------------
    {
      key: "m05-l02",
      title: "Wireframes rapides",
      summary:
        "Dessiner rapidement les écrans du parcours clé en basse fidélité : papier, zoning, hiérarchie de l'information et propositions générées par l'IA.",
      estimatedMinutes: 45,
      blocks: [
        {
          type: "texte",
          markdown: `
**À la fin de cette leçon**, vous saurez produire rapidement des wireframes basse fidélité des écrans de votre parcours clé, sur papier ou avec l'aide de l'IA, en organisant les zones et la hiérarchie de l'information.

## Pourquoi commencer en basse fidélité

Un **wireframe** (maquette fil de fer) est le squelette d'un écran : ses zones, ses contenus et ses actions, sans couleurs, sans images, sans typographie soignée. On parle de **basse fidélité** parce qu'il ressemble peu au produit final, et c'est voulu.

| Niveau | À quoi ça ressemble | Temps par écran | Sert à |
| --- | --- | --- | --- |
| Croquis papier | Rectangles et mots au feutre | Quelques minutes | Explorer plusieurs idées |
| Wireframe numérique | Blocs gris, vrais textes | 15 à 30 minutes | Fixer la structure et la partager |
| Maquette haute fidélité | Couleurs, typographie, images | Plusieurs heures | Valider l'apparence |
| Prototype cliquable | Écrans reliés, interactions | Variable | Tester le parcours (leçon 4) |

La basse fidélité a trois avantages : elle coûte peu, donc on accepte de jeter ; elle concentre les retours sur la structure et le parcours, pas sur la couleur d'un bouton ; elle se modifie en direct pendant une discussion.

## Le papier d'abord : huit idées en huit minutes

La méthode **Crazy 8s** oblige à explorer au lieu de tomber amoureux de sa première idée. Pliez une feuille A4 en huit cases et réglez un minuteur sur huit minutes. Dessinez une variante de l'écran le plus important dans chaque case, une minute par case. Utilisez un feutre plutôt qu'un stylo fin : il empêche d'entrer dans les détails. Choisissez ensuite la meilleure idée, ou combinez-en deux, et redessinez-la au format d'un téléphone.

Faites ensuite un croquis par écran du parcours clé (leçon 1), un écran par feuille ou par post-it. Posez-les dans l'ordre sur une table : vous voyez le parcours entier, et les trous apparaissent.

## Le zoning : découper l'écran en zones

Le **zoning** consiste à placer les grandes zones fonctionnelles avant tout contenu : en-tête, identité, navigation, contenu principal, action principale, informations secondaires. Pour l'écran « Choisir un créneau » de Créno : un en-tête avec retour, la carte d'identité de la coach, un sélecteur de jour, la liste des créneaux, le bouton d'action.

Quatre règles simples :

- **Une action principale par écran**, clairement identifiable (« Réserver ce créneau », « Payer 35 € »).
- **Mobile d'abord** : si vos utilisateurs réservent depuis leur téléphone, dessinez d'abord en une colonne étroite. Élargir ensuite est facile ; l'inverse l'est beaucoup moins.
- **L'action principale à portée de pouce** : sur mobile, le bas de l'écran s'atteint plus facilement que le haut.
- **L'ordre de lecture** : on lit généralement de haut en bas ; placez les informations dans l'ordre où l'utilisateur en a besoin pour décider.

## La hiérarchie de l'information

Tous les contenus n'ont pas la même importance. Classez-les selon la décision que l'utilisateur doit prendre sur l'écran. Pour choisir un créneau, Léa a besoin, dans l'ordre : du jour et de l'heure, du type de séance, du prix, des places restantes, puis du lieu. La biographie détaillée de Julie est secondaire sur cet écran.

Test rapide : si l'utilisateur ne pouvait voir que trois éléments, lesquels garderiez-vous ? Ceux-là doivent dominer. Et utilisez de **vrais contenus** (vrais libellés, vrais prix, vraies durées), jamais de faux texte latin : les problèmes de longueur, de clarté et de vocabulaire n'apparaissent qu'avec le vrai texte.

## Exemple : l'écran « Choisir un créneau » de Créno

\`\`\`text
+--------------------------------------+
| < Retour                      Créno  |
+--------------------------------------+
| [photo]  Julie M.                    |
|          Coach renforcement, Lyon    |
+--------------------------------------+
| [ Lun 14 ]  [ Mar 15 ]  [ Mer 16 ] > |
+--------------------------------------+
| 07:00 - 08:00  Renforcement   35 EUR |
|                2 places restantes    |
|--------------------------------------|
| 18:00 - 19:00  Renforcement   35 EUR |
|                Complet               |
|--------------------------------------|
| 19:15 - 20:15  Mobilité       30 EUR |
|                1 place restante      |
+--------------------------------------+
| [       Réserver ce créneau        ] |
+--------------------------------------+
\`\`\`

## Générer des propositions de wireframes avec l'IA

Un assistant IA ne dessine pas à votre place, mais il aide à **diverger**. Décrivez l'écran en texte (objectif, contenus par ordre d'importance, action principale), puis demandez trois propositions de zoning réellement différentes, sous forme de liste de zones et de schéma en caractères, comme ci-dessus. Comparez-les à vos croquis papier, gardez les bonnes idées, puis dessinez vous-même la version retenue.

L'IA propose, vous décidez : c'est vous qui connaissez vos utilisateurs. Méfiez-vous des propositions qui ajoutent des fonctionnalités hors du périmètre de votre MVP (filtres avancés, messagerie, avis) : elles sont souvent séduisantes et presque toujours prématurées.
`,
        },
        {
          type: "ressource",
          resourceId: "res_figma_kit",
          note: "Kit de maquettage Figma : composants basse fidélité (en-têtes, listes, cartes, boutons, champs de formulaire) au format mobile, pour passer du croquis papier au wireframe numérique partageable.",
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Si vous débutez : vous ne savez pas dessiner ? Tant mieux

Un wireframe n'est pas un concours de dessin. Des rectangles, des traits pour le texte, une croix dans un rectangle pour une image, un rectangle arrondi pour un bouton : c'est tout. Moins c'est joli, plus vos interlocuteurs parleront du fond (« je ne trouve pas le prix ») plutôt que de la forme (« je n'aime pas ce bleu »). Écrivez en revanche les vrais textes, lisiblement : ce sont eux qui font comprendre l'écran.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Pour les profils non techniques : du papier au numérique avec le kit Figma

- Créez un cadre (frame) au format téléphone pour chaque écran du parcours, dans l'ordre, de gauche à droite.
- Copiez les composants du kit (en-tête, liste, carte, bouton) plutôt que de les redessiner : vous gagnez du temps et restez cohérent.
- Restez en niveaux de gris et remplacez tous les textes d'exemple par vos vrais contenus.
- Partagez le fichier en lecture seule avec votre formateur ou vos premiers testeurs : ils pourront commenter directement sur l'écran.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Pour les profils techniques : du wireframe à l'arborescence de composants

Avant de coder, traduisez chaque wireframe en arborescence de composants, avec les données dont chacun a besoin. Pour l'écran « Choisir un créneau » :

\`\`\`text
BookingPage              (charge le coach et ses créneaux ouverts)
  CoachHeader            coach.full_name, spécialité, ville
  DayPicker              jours de la semaine, jour sélectionné
  SlotList               slots du jour ; états vide, chargement, erreur
    SlotCard             starts_at, ends_at, price_cents, places restantes
  StickyCta              « Réserver ce créneau » (désactivé sans sélection)
\`\`\`

Vérifiez que chaque donnée affichée existe dans votre modèle (module 4) ou se calcule à partir de lui : « places restantes » se déduit de la capacité et des réservations actives. Cette arborescence servira directement à vos prompts pour Claude Code ou Cursor.
`,
        },
        {
          type: "prompt",
          title: "Obtenir trois propositions de wireframes textuels",
          tool: "Claude",
          prompt: `
Tu es designer UX spécialisé dans les applications mobiles simples.

Produit : [décrivez votre MVP en 2 phrases]
Utilisateur : [qui, dans quel contexte, sur quel appareil]
Écran à concevoir : [nom de l'écran], étape [n] du parcours [nom du parcours]
Objectif de l'écran : [la décision ou l'action que l'utilisateur doit accomplir]
Contenus disponibles, par ordre d'importance : [liste]
Action principale : [libellé du bouton]

Propose 3 wireframes basse fidélité réellement différents pour un écran de téléphone. Pour chacun :
1. La liste des zones, de haut en bas.
2. Un schéma en caractères ASCII de 40 caractères de large au maximum, avec de vrais textes (pas de faux texte latin).
3. Un point fort et un point faible.

Termine par ta recommandation et sa raison. Pas de couleurs ni de choix graphiques à ce stade, et aucune fonctionnalité hors de la liste ci-dessus.
`,
          tips:
            "Demandez des organisations vraiment différentes (par jour, par type de séance, par disponibilité…) : l'intérêt est d'explorer. Recopiez ensuite la version retenue sur papier ou dans Figma, en l'adaptant.",
        },
        {
          type: "exercice",
          title: "Les wireframes de votre parcours clé",
          instructions: `
Dessinez les écrans du parcours clé de **votre projet** (leçon 1).

1. Faites un Crazy 8s sur l'écran le plus important de votre parcours (huit minutes, huit variantes).
2. Utilisez le prompt de la leçon pour obtenir trois propositions de l'IA sur ce même écran et comparez-les à vos croquis.
3. Dessinez la version retenue de chaque écran du parcours (3 à 6 écrans), au format mobile, avec de vrais contenus, sur papier ou avec le kit Figma.
4. Sur chaque écran, entourez l'action principale et numérotez les trois informations les plus importantes.
5. Photographiez ou exportez les écrans, dans l'ordre du parcours, en un seul fichier.
`,
          deliverable: "fichier",
          estimatedMinutes: 25,
          review: "auto",
          rubric: [
            "Tous les écrans du parcours clé sont représentés, dans l'ordre.",
            "Chaque écran a une seule action principale, clairement identifiée.",
            "La hiérarchie de l'information correspond à la décision à prendre sur l'écran.",
            "Les contenus sont réels (libellés, prix, messages), sans faux texte.",
          ],
        },
      ],
    },

    // ---------------------------------------------------------------------------
    // L03 — Bases d'interface utiles
    // ---------------------------------------------------------------------------
    {
      key: "m05-l03",
      title: "Bases d'interface utiles",
      summary:
        "Appliquer les règles essentielles d'une interface claire et accessible, et définir un système de design minimal pour garder vos écrans cohérents.",
      estimatedMinutes: 45,
      blocks: [
        {
          type: "texte",
          markdown: `
**À la fin de cette leçon**, vous saurez appliquer les bases d'une interface claire et accessible (hiérarchie visuelle, typographie, espacements, couleurs, composants) et définir un système de design minimal pour que vos écrans restent cohérents.

## La hiérarchie visuelle

La **hiérarchie visuelle** guide l'œil vers ce qui compte. Cinq leviers la créent : la **taille**, la **graisse** (l'épaisseur du texte), la **couleur** et le contraste, la **position** et l'**espace** autour d'un élément. Sur chaque écran, un seul élément doit dominer : le titre ou l'action principale.

Test du plissement des yeux : plissez les yeux devant votre écran jusqu'à ce que le texte devienne flou. Ce qui ressort encore est ce que l'utilisateur verra en premier. Si c'est un détail décoratif plutôt que l'action principale, la hiérarchie est à revoir.

## La typographie

- **Une police**, deux au maximum. Une police système ou une police libre bien lisible suffit pour un MVP.
- **Une échelle de tailles** limitée, par exemple 14, 16, 20, 24 et 32 pixels, utilisée partout.
- **Au moins 16 pixels** pour le texte courant sur mobile ; en dessous, certains navigateurs mobiles zooment aussi automatiquement sur les champs de formulaire.
- **Une hauteur de ligne** d'environ 1,5 fois la taille du texte pour les paragraphes.
- **Des lignes de longueur raisonnable** : un repère courant est de 45 à 75 caractères.
- **Un texte aligné à gauche** ; évitez le texte justifié et les longs passages en majuscules.

## Les espacements

L'espace n'est pas du vide : il regroupe et il sépare. Des éléments proches sont perçus comme liés (principe de proximité). Laissez donc **moins d'espace à l'intérieur d'un groupe qu'entre deux groupes** : l'horaire et le prix d'un créneau sont proches, deux créneaux sont nettement séparés.

Adoptez une **échelle d'espacement** fondée sur un multiple de 4 ou 8 pixels (4, 8, 12, 16, 24, 32, 48) et n'utilisez que ces valeurs. Sur mobile, prévoyez des zones tactiles confortables : les guides d'interface mobile recommandent couramment au moins 44 × 44 pixels.

## Couleurs et contraste

Une palette de MVP tient en trois familles :

- **une couleur principale**, réservée aux actions et aux éléments interactifs ;
- **des neutres** (gris) pour les textes, les bordures et les fonds ;
- **des couleurs d'état** : vert pour le succès, rouge pour l'erreur, orange pour l'avertissement.

Le **contraste** entre un texte et son fond conditionne la lisibilité, en plein soleil comme pour une personne malvoyante. Les règles internationales d'accessibilité du web (WCAG, niveau AA) demandent un rapport d'au moins **4,5:1** pour le texte courant, et **3:1** pour le grand texte et les éléments d'interface (bordures de champs, icônes utiles). Les outils de développement des navigateurs et de nombreux vérificateurs en ligne calculent ce rapport. Enfin, ne transmettez **jamais une information par la couleur seule** : un statut « Annulé » s'écrit en toutes lettres, pas seulement en rouge.

## Les composants de base

- **Boutons.** Un bouton principal par écran (plein, couleur principale), des boutons secondaires plus discrets, un style distinct pour les actions destructrices. Le libellé commence par un verbe et dit ce qui va se passer : « Payer 35 € », « Annuler la réservation », jamais « OK » ou « Valider ». Prévoyez les états : normal, survolé, focus, désactivé, en cours.
- **Formulaires.** Un libellé visible au-dessus de chaque champ : le texte d'exemple grisé à l'intérieur disparaît à la saisie, ce n'est pas un libellé. Le bon type de champ (email, téléphone) affiche le bon clavier sur mobile. Demandez le minimum et signalez les champs facultatifs.
- **Listes.** Des éléments comparables, alignés et triés de façon logique (les créneaux par date et heure).
- **Cartes.** Elles regroupent un objet (un créneau) avec ses informations et son action. Toute la carte peut être cliquable, à condition que ce soit évident.
- **Messages.** Une confirmation après chaque action, l'erreur à côté du champ concerné, l'information sans bloquer l'écran.

## L'accessibilité : les bases non négociables

L'**accessibilité** consiste à rendre l'interface utilisable par tous, y compris les personnes en situation de handicap visuel, moteur, auditif ou cognitif. Elle profite à tout le monde : en plein soleil, d'une seule main, avec une connexion lente.

- **Libellés** : chaque champ, bouton et icône a un nom compréhensible, y compris pour les lecteurs d'écran.
- **Contraste** : les rapports ci-dessus sont respectés.
- **Clavier** : tout se fait sans souris (Tab pour avancer, Entrée ou Espace pour activer) et l'élément actif est visiblement encadré : c'est le « focus ».
- **Messages d'erreur** : en texte, à côté du champ, avec la solution (« Saisissez un email au format nom@domaine.fr »), pas seulement un cadre rouge.
- **Images** : une alternative textuelle pour celles qui portent une information.
- **Zoom** : l'interface reste utilisable quand l'utilisateur agrandit le texte.

Selon votre activité, des obligations légales d'accessibilité peuvent s'appliquer ; en France, le référentiel de référence est le RGAA. Renseignez-vous avant votre lancement.

## La cohérence : un système de design minimal

Un **système de design** est l'ensemble des règles et des composants réutilisés dans toute l'application. Pour un MVP, une page suffit : des **jetons** (design tokens), c'est-à-dire les couleurs, tailles de texte, espacements et arrondis, nommés et en nombre limité ; et une **dizaine de composants** (bouton, champ, carte, liste, badge de statut, message, en-tête, fenêtre de confirmation). Chaque nouvel écran assemble ces briques au lieu d'en inventer. C'est aussi ce qui permet aux outils IA de produire des écrans cohérents : donnez-leur ce système dans chaque prompt d'interface (leçon 4).

Pour un projet React, deux familles d'outils facilitent cette cohérence. Les **bibliothèques de composants** fournissent des boutons, formulaires, fenêtres et menus déjà construits, souvent pensés pour l'accessibilité (clavier, lecteurs d'écran). **Tailwind CSS** propose des classes utilitaires appliquées directement dans le code des composants, avec des échelles de tailles, d'espacements et de couleurs configurables : un moyen simple d'imposer vos jetons partout. Les outils IA génèrent volontiers ce type de code ; précisez vos choix dans vos prompts.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Si vous débutez : pas besoin d'être graphiste

Une interface utile n'a pas besoin d'être originale : elle doit être claire. Les règles de cette leçon suffisent pour un MVP propre. Un bon exercice : ouvrez deux applications que vous utilisez tous les jours (banque, transport, réservation) et observez leurs boutons, leurs formulaires et leurs messages d'erreur. Vous y retrouverez les mêmes principes : une action principale par écran, des libellés clairs, beaucoup d'espace. Inspirez-vous de ces conventions : vos utilisateurs les connaissent déjà.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Pour les profils non techniques : transmettre votre système de design à l'IA

- Rédigez votre système de design en quelques lignes que vous collerez dans chaque prompt Bolt.new : « Couleur principale #1D4ED8 réservée aux actions ; texte #111827 sur fond blanc ; texte courant 16 px ; espacements multiples de 8 px ; arrondis de 8 px ; un seul bouton principal par écran. »
- Après chaque génération, vérifiez les contrastes avec un vérificateur en ligne et demandez une correction précise si besoin.
- Dans Figma, définissez vos couleurs et vos styles de texte une fois pour toutes, puis appliquez-les à tous les écrans.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Pour les profils techniques : des jetons au code

Déclarez vos jetons une seule fois, puis référencez-les partout (dans votre CSS ou dans la configuration de thème de Tailwind CSS, selon sa version) :

\`\`\`css
:root {
  --color-primary: #1d4ed8;   /* actions uniquement */
  --color-text: #111827;
  --color-muted: #4b5563;
  --color-surface: #ffffff;
  --color-danger: #b91c1c;
  --space-1: 4px;
  --space-2: 8px;
  --space-4: 16px;
  --radius: 8px;
}
\`\`\`

- Utilisez les éléments HTML sémantiques : un \`button\` pour une action, un lien pour une navigation, un \`label\` relié à chaque champ.
- Reliez les messages d'erreur à leur champ (attribut \`aria-describedby\`) et signalez le champ invalide (\`aria-invalid\`).
- Préférez une bibliothèque de composants accessibles pour les éléments complexes (fenêtres, menus, sélecteurs de date) plutôt que de les réécrire.
- Testez au clavier, puis avec les audits d'accessibilité intégrés aux outils de développement du navigateur ou une extension dédiée.
`,
        },
        {
          type: "checklist",
          title: "Passer un écran au crible",
          items: [
            "Un seul élément domine l'écran : le titre ou l'action principale.",
            "L'action principale est un verbe explicite, à portée de pouce sur mobile.",
            "Le texte courant fait au moins 16 pixels et les tailles suivent l'échelle définie.",
            "Les espacements suivent l'échelle et séparent clairement les groupes.",
            "Le contraste atteint 4,5:1 pour le texte courant, 3:1 pour le grand texte et les éléments d'interface.",
            "Aucune information n'est transmise par la couleur seule.",
            "Chaque champ a un libellé visible au-dessus.",
            "Les messages d'erreur sont en texte, à côté du champ, avec la solution.",
            "Tout est utilisable au clavier, avec un focus visible.",
            "Les composants réutilisent le système de design, sans style improvisé.",
          ],
        },
        {
          type: "exercice",
          title: "Audit et système de design de votre MVP",
          instructions: `
Appliquez la leçon à **votre projet**.

1. Choisissez deux écrans de votre parcours clé (wireframes de la leçon 2 ou premières maquettes).
2. Passez chacun au crible de la checklist. Pour chaque point non respecté, notez la correction prévue.
3. Rédigez votre système de design minimal : couleur principale, neutres et couleurs d'état (avec leurs codes) ; échelle typographique ; échelle d'espacements ; arrondis ; liste de 6 à 10 composants avec leurs états.
4. Vérifiez le contraste de votre couleur principale avec du texte blanc et avec votre fond, à l'aide d'un vérificateur de contraste, et notez les rapports obtenus.
5. Réécrivez trois libellés de boutons et deux messages d'erreur de votre parcours selon les règles de la leçon.

Exemple Créno pour l'étape 5 : « Valider » devient « Payer 35 € » ; « Erreur de saisie » devient « Saisissez un email au format nom@domaine.fr ».
`,
          deliverable: "texte",
          estimatedMinutes: 25,
          review: "auto",
          rubric: [
            "Les deux écrans sont audités, avec des corrections précises.",
            "Le système de design est complet et volontairement limité (jetons et composants).",
            "Les rapports de contraste sont mesurés et conformes, ou corrigés.",
            "Les libellés et messages réécrits sont explicites et orientés action.",
          ],
        },
        {
          type: "quiz",
          title: "Vérifiez vos acquis",
          questions: [
            {
              prompt: "Pourquoi le texte d'exemple grisé dans un champ ne remplace-t-il pas un libellé ?",
              options: [
                { label: "Parce qu'il est trop long" },
                { label: "Parce qu'il disparaît dès que l'utilisateur commence à saisir", correct: true },
                { label: "Parce qu'il est interdit par la loi" },
                { label: "Parce qu'il ralentit la page" },
              ],
              explanation:
                "Une fois la saisie commencée, l'utilisateur ne sait plus ce qu'on lui demande. Le libellé doit rester visible au-dessus du champ.",
            },
            {
              prompt: "Quel rapport de contraste minimal les règles WCAG (niveau AA) demandent-elles pour le texte courant ?",
              options: [
                { label: "2:1" },
                { label: "3:1" },
                { label: "4,5:1", correct: true },
                { label: "10:1" },
              ],
              explanation: "4,5:1 pour le texte courant ; 3:1 pour le grand texte et les éléments d'interface.",
            },
            {
              prompt: "Quel libellé de bouton est le plus explicite sur l'écran de récapitulatif de Créno ?",
              options: [
                { label: "« OK »" },
                { label: "« Valider »" },
                { label: "« Payer 35 € »", correct: true },
                { label: "« Continuer »" },
              ],
              explanation: "Un bon libellé commence par un verbe et dit exactement ce qui va se passer.",
            },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------------------
    // L04 — Prototyper avec l'IA
    // ---------------------------------------------------------------------------
    {
      key: "m05-l04",
      title: "Prototyper avec l'IA",
      summary:
        "Générer un prototype cliquable du parcours clé avec Bolt.new ou un assistant IA, rédiger des prompts d'interface précis et itérer à partir de captures d'écran.",
      estimatedMinutes: 50,
      blocks: [
        {
          type: "texte",
          markdown: `
**À la fin de cette leçon**, vous saurez générer un prototype cliquable de votre parcours clé avec un outil d'IA, rédiger des prompts d'interface précis et l'améliorer par itérations courtes à partir de captures d'écran.

## À quoi sert un prototype

Un **prototype cliquable** simule le parcours : on peut toucher les boutons, passer d'un écran à l'autre, voir les états. Il n'a besoin ni de vraie base de données ni de vrai paiement : les données sont **fictives** et les actions simulées. Son but est de vérifier que le parcours est compris et fluide avant d'investir dans la construction (module 6).

Deux règles : **aucun vrai paiement** et **aucune donnée réelle** ; affichez clairement « Prototype, données fictives ». Si vous prototypez avec Bolt.new, une partie du code pourra servir de point de départ au MVP, mais ce n'est pas l'objectif : ici, la vitesse prime sur la qualité du code.

## Trois façons de prototyper avec l'IA

| Option | Principe | Forces | Limites |
| --- | --- | --- | --- |
| Bolt.new | Vous décrivez l'application ; l'outil génère une application web qui s'exécute dans le navigateur, puis vous l'améliorez en conversant | Très rapide, réellement cliquable, partageable | Beaucoup de code généré d'un coup, difficile à contrôler finement ; consommation d'usage à surveiller |
| Claude ou ChatGPT (composant React) | Vous demandez un écran sous forme de composant React ; selon l'outil, un aperçu s'affiche dans la conversation | Contrôle précis, écran par écran, code lisible | La navigation entre écrans demande plus de travail ; le partage dépend de l'outil |
| Figma avec le kit de maquettage | Vous reliez vos écrans à la main pour créer un parcours cliquable | Maîtrise totale du rendu, aucun code | Plus lent, pas de génération automatique dans ce flux |

Choisissez selon votre profil et la stack retenue au module 3. L'essentiel est d'obtenir un parcours testable en quelques heures, pas un produit.

## Écrire un bon prompt d'interface

Un prompt d'interface efficace contient huit éléments :

1. **Le contexte** : le produit, l'utilisateur, l'appareil (le téléphone d'abord).
2. **Le parcours et l'écran** : où l'on se trouve et ce que l'utilisateur doit accomplir.
3. **Les contenus** : des données fictives mais réalistes (prénoms, horaires, prix).
4. **La structure** : les zones de votre wireframe, dans l'ordre.
5. **Les états** : vide, chargement, erreur, succès.
6. **Le style** : votre système de design minimal (leçon 3).
7. **Les contraintes** : accessibilité, aucune vraie API, aucun vrai paiement.
8. **Ce qu'il ne faut pas faire** : fonctionnalités hors périmètre, dépendances inutiles.

Commencez petit : un écran, puis le suivant. Un prompt qui demande dix écrans d'un coup produit un résultat approximatif et difficile à corriger.

## Itérer à partir de captures d'écran et de retours précis

La plupart des assistants IA acceptent des images. Faites une capture de l'écran généré, entourez ou fléchez ce qui ne va pas, et joignez-la à un retour **précis** : quoi, où, ce que vous attendez, pourquoi.

| Retour vague | Retour précis |
| --- | --- |
| « C'est moche. » | « Sur mobile, le bouton Payer est sous la ligne de flottaison. Place-le en bas de l'écran, fixe, pleine largeur. » |
| « Mets plus de couleur. » | « Réserve la couleur principale à l'action principale. Affiche les statuts avec un badge texte : Confirmé en vert, Annulé en gris. » |
| « Ça ne marche pas. » | « Quand je touche Réserver sans être connecté, rien ne se passe. Attendu : afficher l'écran de saisie de l'email. » |
| « Refais tout. » | « Garde la structure. Change uniquement la liste : un créneau par carte, horaire en gras à gauche, prix à droite. » |

Trois habitudes. **Un changement à la fois**, pour savoir ce qui a fonctionné. **Des versions** : utilisez l'historique de l'outil ou dupliquez le projet avant un gros changement. **Une limite de temps**, par exemple deux sessions de travail : au-delà, vous peaufinez au lieu d'apprendre.

## Partager le prototype

Publiez ou partagez le prototype par un lien, selon les options de l'outil (vérifiez-les dans sa documentation). Testez-le vous-même sur un vrai téléphone avant de l'envoyer : un prototype conçu sur grand écran réserve souvent des surprises sur mobile. Ce lien servira à la leçon suivante et à votre formateur.
`,
        },
        {
          type: "video",
          title: "Du wireframe au prototype cliquable avec Bolt.new",
          durationMinutes: 6,
          script: `
- Point de départ : le wireframe de l'écran « Choisir un créneau » de Créno et son système de design minimal.
- Rédiger le prompt en direct en suivant les huit éléments de la leçon.
- Lancer la génération, puis tester le résultat en affichage téléphone dans le navigateur.
- Faire une capture, annoter deux problèmes et envoyer un retour précis pour chacun, l'un après l'autre.
- Ajouter l'écran de récapitulatif et relier les deux écrans.
- Ajouter l'état d'erreur « Ce créneau vient d'être réservé », avec des données fictives.
- Partager le lien et ouvrir le prototype sur un vrai téléphone.
- Conclusion : un écran à la fois, un retour précis à la fois, et une limite de temps.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Si vous débutez : votre premier prototype pas à pas

1. Ouvrez l'outil choisi : Bolt.new si vous ne codez pas, c'est le plus direct.
2. Copiez le prompt adapté à votre profil et remplissez les crochets avec votre parcours et vos wireframes.
3. Ne demandez que les deux premiers écrans.
4. Testez sur votre téléphone et notez trois choses à améliorer.
5. Envoyez un seul retour précis à la fois, avec une capture annotée.
6. Ajoutez l'écran suivant quand les deux premiers vous conviennent.

Le résultat du premier prompt est rarement parfait : c'est normal, l'itération fait partie de la méthode. Si l'outil part dans une mauvaise direction, revenez à la version précédente plutôt que d'accumuler les corrections.
`,
        },
        {
          type: "prompt",
          title: "Prompt d'interface pour un écran (composant React)",
          tool: "Claude",
          prompt: `
Tu es designer produit et développeur front-end React.

Contexte : [produit en 2 phrases]. Utilisateur : [qui], principalement sur téléphone.
Parcours : [nom du parcours]. Écran : [nom], étape [n]. Objectif : [ce que l'utilisateur doit accomplir].

Structure, du haut vers le bas : [zones de votre wireframe]
Contenus fictifs réalistes : [exemples de données]
Action principale : [libellé du bouton]
États à prévoir : vide, chargement, erreur, succès. Ajoute un sélecteur discret pour afficher chaque état.

Système de design : couleur principale [code] réservée aux actions ; neutres [codes] ; couleurs d'état [codes] ; texte courant 16 px ; espacements multiples de 8 px ; arrondis [valeur].
Contraintes : un seul composant React, données fictives dans le fichier, aucun appel réseau, accessible (libellés visibles, contraste AA, navigation au clavier, focus visible).
À ne pas faire : [fonctionnalités hors périmètre].

Donne le composant complet, puis explique en 3 points les choix de hiérarchie visuelle que tu as faits.
`,
          tips:
            "Joignez une photo de votre wireframe papier : de nombreux assistants savent s'en servir. Pour itérer, renvoyez une capture annotée avec un seul retour précis à la fois.",
        },
        {
          type: "prompt",
          personas: ["non_tech", "reconversion"],
          title: "Prototype cliquable complet avec Bolt.new",
          tool: "Bolt.new",
          prompt: `
Crée un prototype cliquable, pensé d'abord pour mobile, de [nom du produit] : [description en 2 phrases].

Parcours à prototyper : [étapes 1 à n de votre parcours clé]
Écrans : [liste des écrans avec, pour chacun, les zones de votre wireframe]

Données : uniquement des données fictives écrites en dur. Aucun backend, aucune base de données, aucun vrai paiement : simule le paiement par un écran « Paiement réussi ».
États : pour chaque liste, prévois un état vide et un état d'erreur ; affiche un message de confirmation après chaque action.
Style : [votre système de design minimal : couleurs, typographie, espacements, arrondis]
Accessibilité : libellés visibles au-dessus des champs, contraste suffisant, boutons d'au moins 44 px de haut.
Affiche en haut de chaque écran un bandeau discret « Prototype, données fictives ».

Commence uniquement par les deux premiers écrans et la navigation entre eux. J'ajouterai la suite ensuite.
`,
          tips:
            "Vérifiez les options de partage et de publication dans la documentation de Bolt.new. Si une génération dégrade le prototype, revenez à la version précédente au lieu d'empiler les corrections.",
        },
        {
          type: "prompt",
          personas: ["tech"],
          title: "Prototype du parcours dans votre projet Next.js",
          tool: "Claude Code",
          prompt: `
Dans ce projet Next.js (App Router, TypeScript), crée un prototype du parcours [nom du parcours] dans un groupe de routes séparé, app/(prototype)/, avec des données fictives.

- Écrans : [liste des écrans], une route par écran.
- Données : un fichier lib/mock-data.ts typé selon le modèle de données d'ARCHITECTURE.md (mêmes noms de champs).
- Aucun appel à Supabase ni à Stripe. Simule le chargement, l'état vide et l'erreur avec un paramètre d'URL (par exemple ?state=empty).
- Composants réutilisables : [liste issue de votre système de design], avec les jetons définis dans [fichier de styles].
- Accessibilité : éléments HTML sémantiques, libellés reliés aux champs, focus visible.
- N'ajoute aucune dépendance sans me le demander.

Propose d'abord le plan des fichiers et attends ma validation avant d'implémenter.
`,
          tips:
            "Relisez le plan avant de valider, puis le code généré. Gardez le prototype isolé dans son groupe de routes : vous pourrez le supprimer ou le réutiliser proprement au module 6.",
        },
        {
          type: "exercice",
          title: "Le prototype cliquable de votre parcours clé",
          instructions: `
Construisez le prototype du parcours clé de **votre projet**.

1. Choisissez votre outil (Bolt.new, Claude ou ChatGPT, Figma avec le kit) selon votre profil et votre stack.
2. Rédigez votre prompt d'interface avec les huit éléments de la leçon, à partir de vos wireframes (leçon 2) et de votre système de design (leçon 3).
3. Générez les écrans un par un et reliez-les : le parcours clé doit être entièrement cliquable, de l'entrée à la confirmation.
4. Ajoutez au moins un état vide, un état d'erreur et un cas limite prioritaire (leçon 1).
5. Faites au moins trois itérations à partir de captures d'écran ; notez le retour envoyé à chaque fois.
6. Testez le prototype sur un vrai téléphone, puis partagez le lien.

Livrable : le lien du prototype. Si possible, ajoutez en commentaire votre prompt initial et vos trois retours d'itération.
`,
          deliverable: "lien",
          estimatedMinutes: 30,
          review: "formateur",
          rubric: [
            "Le parcours clé est entièrement cliquable, de l'entrée à la confirmation.",
            "Les écrans respectent les wireframes et le système de design (hiérarchie, action principale, cohérence).",
            "Un état vide, un état d'erreur et au moins un cas limite sont représentés.",
            "Les itérations montrent des retours précis et une amélioration visible.",
            "Aucune donnée réelle ni vrai paiement ; le prototype s'affiche correctement sur mobile.",
          ],
        },
      ],
    },

    // ---------------------------------------------------------------------------
    // L05 — Tester la maquette
    // ---------------------------------------------------------------------------
    {
      key: "m05-l05",
      title: "Tester la maquette",
      summary:
        "Conduire trois tests rapides sur votre prototype (5 secondes, tâche guidée, préférence) avec des consignes neutres, et noter les frictions.",
      estimatedMinutes: 35,
      blocks: [
        {
          type: "texte",
          markdown: `
**À la fin de cette leçon**, vous saurez conduire trois tests rapides sur votre prototype (test des 5 secondes, tâche guidée, test de préférence), avec des consignes neutres, et transformer vos observations en liste de frictions priorisées.

## Pourquoi tester maintenant

Modifier un prototype coûte quelques minutes ; modifier une application construite coûte des jours. Et vous êtes le plus mauvais testeur de votre produit : vous savez déjà où cliquer. Quelques sessions courtes suffisent pour repérer les blocages les plus visibles. Le module 7 approfondira les tests utilisateurs sur votre MVP ; ici, on vérifie la compréhension et le parcours.

**Qui recruter ?** Trois à cinq personnes proches de votre cible (pour Créno : des personnes qui pratiquent un sport avec un coach, ou qui y songent) et qui ne connaissent pas votre projet dans le détail. Évitez de ne tester qu'avec des proches bienveillants : ils ont tendance à vous encourager plutôt qu'à buter sur les problèmes.

## Test 1 : le test des 5 secondes

Il mesure la **première impression** : l'écran fait-il comprendre en un instant à quoi il sert ?

1. Montrez l'écran pendant 5 secondes, puis masquez-le.
2. Demandez : « De quoi parlait cet écran ? », « Que pouviez-vous y faire ? », « Qu'avez-vous retenu ? ».
3. Notez les mots exacts de la personne.

Chez Créno, on le fait passer sur la page de la coach. Réussite : « Je peux réserver une séance avec cette coach, il y a des horaires et des prix. » Échec : « C'est un site de sport ? »

## Test 2 : la tâche guidée

Il vérifie que le **parcours** fonctionne. Donnez un scénario réaliste, sans employer les mots de l'interface : « Vous voulez faire une séance avec Julie mardi après le travail. Organisez-vous. » plutôt que « Cliquez sur Réserver ».

- Demandez à la personne de **penser à voix haute** : dire ce qu'elle cherche, ce qu'elle comprend, ce qu'elle attend.
- **Observez sans aider.** Si elle bloque, laissez-lui du temps ; si elle abandonne, notez l'endroit et passez à la suite.
- Notez les hésitations, les erreurs, les retours en arrière et les commentaires spontanés.
- Terminez par : « Qu'est-ce qui vous a surpris ou gêné ? »

## Test 3 : le test de préférence

Il aide à **choisir entre deux versions** d'un écran. Montrez la version A et la version B (par exemple, créneaux classés par jour ou par type de séance), puis demandez : « Laquelle utiliseriez-vous pour réserver, et pourquoi ? » Alternez l'ordre de présentation d'une personne à l'autre : la première version vue peut être avantagée. Attention, une préférence déclarée n'est pas une preuve d'efficacité. Le « pourquoi » compte plus que le choix, et une tâche guidée sur chaque version reste plus fiable.

## Des consignes neutres

| À éviter | À dire plutôt |
| --- | --- |
| « C'est clair, non ? » | « Qu'est-ce que vous comprenez de cet écran ? » |
| « Cliquez sur Réserver. » | « Montrez-moi comment vous feriez pour réserver. » |
| « Vous aimez ? » | « Qu'est-ce qui vous aide ou vous gêne ici ? » |
| « Ce bouton sert à payer. » | « À votre avis, que se passe-t-il si vous touchez ce bouton ? » |
| « Vous utiliseriez l'application ? » | « Comment réservez-vous vos séances aujourd'hui ? » |

Avant de commencer, rassurez : « On teste la maquette, pas vous. Il n'y a pas de mauvaise réponse. » Demandez l'accord de la personne si vous prenez des notes détaillées ou enregistrez l'écran, et n'utilisez que des données fictives.

## Noter les frictions

Une **friction** est tout ce qui ralentit, trompe ou bloque l'utilisateur. Notez chaque observation dans une grille, en séparant le **fait observé** de votre interprétation.

| Testeur | Étape | Fait observé | Verbatim | Gravité | Piste |
| --- | --- | --- | --- | --- | --- |
| T2 | Choix du créneau | Touche le prix en pensant réserver | « Ah, ce n'est pas là ? » | 2 (gênant) | Rendre toute la carte cliquable |
| T3 | Récapitulatif | Cherche les conditions d'annulation, sans les trouver | « Et si j'annule ? » | 1 (bloquant) | Afficher les conditions au-dessus du bouton Payer |

Gravité : 1 = bloquant (la tâche échoue), 2 = gênant (la tâche réussit avec difficulté), 3 = mineur (simple inconfort). Après les sessions, regroupez les frictions par étape, comptez combien de personnes ont rencontré chacune, corrigez d'abord les bloquantes, puis testez à nouveau l'écran modifié.
`,
        },
        {
          type: "ressource",
          resourceId: "res_protocole_tests",
          note: "Protocole de tests utilisateurs : script d'accueil, consignes, grille d'observation et modèle de synthèse. Adaptez-le à vos trois tests rapides.",
        },
        {
          type: "texte",
          personas: ["non_tech", "reconversion"],
          markdown: `
## Recruter vos premiers testeurs

Trouver trois personnes est souvent plus simple qu'on ne le croit. Pensez aux collègues d'anciens collègues, aux associations et clubs liés à votre sujet, aux groupes et communautés en ligne de votre cible, aux participants de votre promotion. Un message court suffit : « Je conçois une application pour [cible] qui [bénéfice]. Accepteriez-vous de m'accorder 10 minutes pour tester une maquette ? Il n'y a rien à préparer, et vos remarques m'aideront beaucoup. »

Pendant la session, votre seul travail est d'écouter et de noter. Le silence est votre allié : s'il dure, la personne finit presque toujours par dire ce qui la gêne.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Pour les profils techniques : tester à distance et tracer les frictions

- En visioconférence, faites partager l'écran du testeur plutôt que le vôtre : vous observez ses gestes réels. Enregistrez uniquement avec son accord explicite.
- Pour chaque tâche guidée, notez le succès ou l'échec et le temps approximatif : vous pourrez comparer après correction.
- Transformez chaque friction retenue en ticket de votre backlog (Notion ou GitHub), avec l'étape, le fait observé, la gravité et un lien vers la note de session.
`,
        },
        {
          type: "checklist",
          title: "Avant chaque session de test",
          items: [
            "Le prototype fonctionne sur l'appareil qu'utilisera le testeur.",
            "Toutes les données affichées sont fictives.",
            "Le script d'accueil et les scénarios sont écrits à l'avance.",
            "Les questions sont neutres et n'emploient pas les mots de l'interface.",
            "La grille d'observation est prête.",
            "L'accord du testeur pour la prise de notes ou l'enregistrement est demandé.",
            "Une personne anime ; une autre prend des notes si possible.",
            "Quelques minutes sont prévues juste après la session pour compléter les notes.",
          ],
        },
        {
          type: "exercice",
          title: "Trois tests rapides sur votre prototype",
          instructions: `
Testez le prototype de **votre projet** (leçon 4).

1. Préparez : l'écran du test des 5 secondes, un scénario de tâche guidée rédigé sans les mots de l'interface, deux versions d'un écran pour le test de préférence, et votre grille d'observation (ressource de la leçon).
2. Menez les trois tests avec au moins trois personnes proches de votre cible, en sessions courtes de 5 à 10 minutes.
3. Remplissez la grille des frictions : étape, fait observé, verbatim, gravité, piste.
4. Synthétisez : les trois frictions les plus graves, le nombre de personnes concernées par chacune, la correction envisagée.
5. Corrigez au moins une friction bloquante ou gênante dans votre prototype et indiquez ce que vous avez changé.
`,
          deliverable: "texte",
          estimatedMinutes: 25,
          review: "auto",
          rubric: [
            "Les trois tests ont été menés avec au moins trois personnes de la cible.",
            "Les consignes sont neutres et n'emploient pas les mots de l'interface.",
            "Les frictions sont décrites par des faits observés, avec verbatim et gravité.",
            "La synthèse priorise les frictions et au moins une correction a été apportée.",
          ],
        },
      ],
    },

    // ---------------------------------------------------------------------------
    // L06 — Évaluation du module
    // ---------------------------------------------------------------------------
    {
      key: "m05-l06",
      title: "Évaluation du module",
      summary: "Valider vos acquis sur le parcours utilisateur, les wireframes, les bases d'interface, le prototypage et les tests rapides.",
      estimatedMinutes: 20,
      blocks: [
        {
          type: "texte",
          markdown: `
**Cette évaluation** vérifie que vous savez concevoir le parcours clé de votre MVP, le maquetter, appliquer les bases d'interface, prototyper avec l'IA et tester vos écrans.

Dix questions, une seule bonne réponse par question. Lisez chaque proposition jusqu'au bout avant de répondre. Chaque explication renvoie à la leçon concernée si vous souhaitez revoir un point.
`,
        },
        {
          type: "quiz",
          title: "Évaluation — Parcours utilisateur et maquettes",
          graded: true,
          questions: [
            {
              prompt: "Quel est le parcours clé d'un MVP ?",
              options: [
                { label: "Le parcours qui comporte le plus d'écrans" },
                { label: "Le parcours qui délivre la valeur promise à l'utilisateur", correct: true },
                { label: "Le parcours d'inscription" },
                { label: "Le parcours d'administration" },
              ],
              explanation:
                "Chez Créno, c'est « réserver et payer un créneau » : s'il échoue, rien d'autre ne compte (leçon 1).",
            },
            {
              prompt: "Lequel de ces éléments n'est pas l'un des quatre états d'un écran vus dans le module ?",
              options: [
                { label: "Vide" },
                { label: "Chargement" },
                { label: "Brouillon", correct: true },
                { label: "Erreur" },
              ],
              explanation: "Les quatre états sont : vide, chargement, erreur, succès (leçon 1).",
            },
            {
              prompt: "Comment prioriser les cas limites d'un parcours pour le MVP ?",
              options: [
                { label: "Traiter tous les cas avant le lancement" },
                { label: "Traiter d'abord ceux qui peuvent faire perdre de l'argent ou une réservation", correct: true },
                { label: "Traiter uniquement ceux que l'IA a identifiés" },
                { label: "Ne traiter aucun cas limite dans un MVP" },
              ],
              explanation:
                "Les cas à risque financier ou de perte de réservation sont indispensables ; les autres peuvent attendre avec un message simple (leçon 1).",
            },
            {
              prompt: "Quel est le principal intérêt d'un wireframe basse fidélité ?",
              options: [
                { label: "Valider les couleurs de la marque" },
                { label: "Concentrer les retours sur la structure et le parcours, à faible coût", correct: true },
                { label: "Remplacer les tests utilisateurs" },
                { label: "Générer automatiquement le code final" },
              ],
              explanation:
                "Rapide et jetable, il évite les débats sur l'apparence et fait porter les retours sur l'essentiel (leçon 2).",
            },
            {
              prompt: "Pourquoi utiliser de vrais contenus plutôt que du faux texte dans un wireframe ?",
              options: [
                { label: "Pour que le wireframe soit plus joli" },
                { label: "Parce que les problèmes de longueur, de clarté et de vocabulaire n'apparaissent qu'avec le vrai texte", correct: true },
                { label: "Parce que le faux texte est interdit dans Figma" },
                { label: "Pour gagner du temps de dessin" },
              ],
              explanation: "Un libellé réel révèle immédiatement s'il est trop long, ambigu ou technique (leçon 2).",
            },
            {
              prompt: "Quelle pratique respecte les bases de l'accessibilité ?",
              options: [
                { label: "Signaler un statut « Annulé » uniquement par la couleur rouge" },
                { label: "Utiliser le texte grisé dans le champ comme seul libellé" },
                { label: "Afficher le message d'erreur en texte, à côté du champ, avec la solution", correct: true },
                { label: "Masquer le contour de focus pour un rendu plus épuré" },
              ],
              explanation:
                "Une erreur explicite, placée près du champ, aide tout le monde, y compris les utilisateurs de lecteurs d'écran (leçon 3).",
            },
            {
              prompt: "Qu'est-ce qu'un système de design minimal pour un MVP ?",
              options: [
                { label: "Un logo et une charte graphique complète" },
                { label: "Un ensemble limité de jetons (couleurs, tailles, espacements, arrondis) et une dizaine de composants réutilisés", correct: true },
                { label: "Une bibliothèque de cent composants" },
                { label: "Un choix de police uniquement" },
              ],
              explanation:
                "Il garantit la cohérence des écrans et se transmet facilement aux outils IA dans les prompts (leçon 3).",
            },
            {
              prompt: "Quel retour à un outil de prototypage IA est le plus efficace ?",
              options: [
                { label: "« Refais tout, ce n'est pas ce que je veux. »" },
                { label: "« Mets plus de couleur. »" },
                { label: "« Sur mobile, le bouton Payer est sous la ligne de flottaison : place-le en bas, fixe, pleine largeur. »", correct: true },
                { label: "« Améliore le design. »" },
              ],
              explanation: "Un bon retour dit quoi, où, ce qui est attendu et pourquoi, un changement à la fois (leçon 4).",
            },
            {
              prompt: "Que mesure le test des 5 secondes ?",
              options: [
                { label: "La vitesse de chargement de la page" },
                { label: "La première impression : l'écran fait-il comprendre à quoi il sert ?", correct: true },
                { label: "Le temps nécessaire pour payer" },
                { label: "La préférence entre deux couleurs" },
              ],
              explanation:
                "On montre l'écran 5 secondes, puis on demande ce que la personne a compris et retenu (leçon 5).",
            },
            {
              prompt: "Quelle consigne est neutre pendant une tâche guidée ?",
              options: [
                { label: "« Cliquez sur Réserver. »" },
                { label: "« C'est simple, non ? »" },
                { label: "« Montrez-moi comment vous feriez pour réserver une séance mardi soir. »", correct: true },
                { label: "« Ce bouton sert à payer, allez-y. »" },
              ],
              explanation:
                "Une consigne neutre décrit l'objectif sans employer les mots de l'interface ni suggérer la réponse (leçon 5).",
            },
          ],
        },
      ],
    },
  ],
};
