import type { SeedModule } from "../authoring";

export const M08: SeedModule = {
  key: "m08",
  title: "Lancer",
  summary:
    "Positionner votre offre, mettre en ligne une landing page qui convertit, écrire des messages justes, lancer vos premières expériences d’acquisition, piloter chaque semaine et poser les bases juridiques du lancement.",
  objectives: [
    "Être capable de formuler le positionnement de votre MVP en une phrase, appuyée par des preuves honnêtes.",
    "Être capable de construire et de mettre en ligne une landing page à objectif unique, avec un formulaire de capture respectueux du RGPD.",
    "Être capable de rédiger et de tester des messages orientés bénéfices, dans les mots de votre cible, avec l’aide de l’IA.",
    "Être capable de concevoir, mener et trancher des expériences d’acquisition à petit budget, suivies dans un tableau de bord hebdomadaire.",
    "Être capable d’identifier les obligations juridiques de base d’un lancement en France et les sources officielles à consulter.",
  ],
  lessons: [
    // ─────────────────────────────────────────────────────────────
    {
      key: "m08-l01",
      title: "Positionnement et message",
      summary:
        "Définir pour qui, contre quelle alternative et avec quelle différence vous lancez votre MVP, puis le dire en une phrase appuyée par des preuves.",
      estimatedMinutes: 45,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez formuler le positionnement de votre MVP en une phrase claire, et rassembler des preuves honnêtes pour l’appuyer.

## Positionner, c’est choisir

Le **positionnement** est la place que votre produit occupe dans l’esprit de votre cible, par rapport aux solutions qu’elle connaît déjà. Ce n’est pas un slogan : c’est un ensemble de choix. Choisir une cible, c’est renoncer aux autres pour un temps. Choisir un problème, c’est accepter de ne pas tout résoudre.

Un MVP qui s’adresse « à tout le monde » ne parle à personne : son message est vague, ses canaux sont flous, et chaque retour tire le produit dans une direction différente. À l’inverse, un positionnement étroit permet d’écrire un message précis, de savoir où trouver ses premiers utilisateurs et de distinguer un retour utile d’un retour hors sujet.

## Les quatre questions

Votre travail des modules précédents contient déjà presque toutes les réponses : entretiens de découverte et proposition de valeur (M01), tests utilisateurs (M07).

1. **Pour qui ?** Le segment le plus précis possible et, à l’intérieur, les **premiers adoptants** : ceux qui ont le problème le plus fort, en sont conscients et bricolent déjà une solution.
2. **Quel problème ?** Décrit avec les mots de la cible, pas avec les vôtres.
3. **Quelle alternative actuelle ?** Ce que la cible fait aujourd’hui à la place : un autre outil, un tableur, des messages, une personne qui s’en charge… ou rien du tout. Votre vrai concurrent est souvent cette habitude.
4. **Pourquoi vous ?** Ce qui vous différencie **sur un point qui compte pour la cible**, et ce qui vous rend crédible pour le faire.

| Question | Réponse de Créno |
| --- | --- |
| Pour qui ? | Coachs sportifs indépendants qui suivent des clients en séances individuelles ou en petits groupes et gèrent seuls leur planning |
| Quel problème ? | « Je passe mes soirées à caler les séances par messages et à relancer ceux qui n’ont pas payé. » |
| Alternative actuelle | Messages, agenda papier ou tableur, paiement en espèces ou par virement, relances à la main |
| Pourquoi vous ? | Réservation et paiement en un seul parcours, pensé pour un coach seul, avec rappel automatique la veille |

## Le message en une phrase

Une structure éprouvée, popularisée par Geoffrey Moore, aide à assembler ces réponses :

> [!info] Pour [cible] qui [problème], [produit] est un [catégorie] qui [bénéfice principal]. Contrairement à [alternative actuelle], [différence qui compte].

Pour Créno : « Pour les coachs sportifs indépendants qui perdent leurs soirées à organiser leurs séances et à se faire payer, Créno est une application de réservation qui remplit leur planning et encaisse les paiements à leur place. Contrairement aux messages et aux virements à relancer, le client réserve et paie en une fois, et reçoit un rappel la veille. »

Cette phrase est un outil interne, pas le titre de votre landing page. Vous en tirerez une version courte à la leçon suivante, par exemple : « Vos clients réservent et paient seuls. Vous coachez. »

Testez-la : lisez-la à une personne de votre cible, puis demandez-lui de la reformuler avec ses mots. Si elle n’y arrive pas, ou reformule autre chose, votre message n’est pas encore clair.

## Les preuves : honnêtes ou rien

Un message convainc davantage quand il s’appuie sur des **preuves**. Au stade du MVP, vous n’avez pas des milliers de clients. Ce n’est pas grave : d’autres preuves existent.

- **Des citations réelles** issues de vos entretiens ou de vos tests, reproduites avec l’accord de la personne (prénom et métier, ou de façon anonyme).
- **Des résultats de tests** formulés honnêtement : « Lors de notre deuxième série de tests, 5 coachs sur 5 ont publié leurs créneaux sans aide. »
- **Une démonstration** : une courte vidéo ou un parcours cliquable qui montre le vrai produit.
- **Votre légitimité** : votre expérience du métier, du problème ou de la technique.
- **Vos premiers utilisateurs**, s’ils acceptent d’être cités.

À proscrire absolument : faux témoignages, logos de clients qui n’en sont pas, chiffres inventés ou arrondis à la hausse, « déjà adopté par des centaines de professionnels » sans réalité derrière. C’est malhonnête, cela se découvre vite dans une petite communauté, et cela peut constituer une pratique commerciale trompeuse.

## Les erreurs fréquentes

- **Décrire la technologie** (« une plateforme propulsée par l’IA ») au lieu du résultat pour l’utilisateur.
- **Élargir la cible** par peur de manquer des clients.
- **Ignorer l’alternative actuelle**, en se comparant à un grand acteur plutôt qu’à l’habitude réelle de la cible.
- **Revendiquer une différence qui ne compte pas** pour la cible, comme « un design moderne ».
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Votre parcours est un argument

Si vous venez d’un autre métier, la question « pourquoi vous ? » a souvent une réponse que vous sous-estimez : votre expérience. Une ancienne coach qui lance Créno connaît de l’intérieur les annulations de dernière minute et les impayés ; un ancien comptable qui lance un outil de facturation connaît les erreurs de ses clients. Écrivez-le simplement et de façon vérifiable (« dix ans de coaching en salle, puis en indépendant ») : c’est une preuve de légitimité que ni l’IA ni un concurrent ne peuvent copier.
`,
        },
        {
          type: "prompt",
          title: "Challenger votre positionnement",
          tool: "Claude",
          prompt: `
Tu es un conseiller en stratégie produit, exigeant et factuel. Voici le positionnement de mon MVP.

- Cible et premiers adoptants : [...]
- Problème, avec les mots de la cible (citations anonymisées de mes entretiens) : [...]
- Alternative actuelle : [...]
- Différence revendiquée : [...]
- Preuves dont je dispose : [...]
- Phrase de positionnement : [...]

1. Évalue chaque élément : est-il précis, vérifiable, important pour la cible ?
2. Pose-moi les 5 questions les plus dérangeantes qu’un client sceptique me poserait.
3. Propose 3 reformulations de ma phrase de positionnement, plus concrètes, sans superlatif ni jargon.
4. Signale toute affirmation qui n’est pas étayée par mes preuves.

N’invente aucune donnée de marché : si une information manque, dis-le.
`,
          tips: "Ne gardez pas les reformulations telles quelles : reprenez les mots qui sonnent juste, puis vérifiez-les auprès de votre cible avec le test de reformulation.",
        },
        {
          type: "exercice",
          title: "Votre fiche de positionnement",
          instructions: `
Rédigez la fiche de positionnement de **votre projet** :

1. Les quatre réponses (pour qui, quel problème, alternative actuelle, pourquoi vous), sous forme de tableau.
2. Votre phrase de positionnement, selon la structure de la leçon.
3. Une version courte, de dix mots au maximum, qui servira de titre.
4. La liste de vos preuves disponibles, avec pour chacune sa source : entretien, test, démonstration ou expérience.
5. Le résultat du test de reformulation auprès d’au moins deux personnes de votre cible : ce qu’elles ont compris, en leurs mots.

Exemple attendu : la fiche Créno de la leçon. Cette fiche alimentera directement votre landing page (leçon suivante) et votre pitch (M09).
`,
          deliverable: "texte",
          estimatedMinutes: 30,
          review: "formateur",
          rubric: [
            "La cible est précise et les premiers adoptants sont identifiés",
            "Le problème est exprimé avec les mots de la cible",
            "L’alternative actuelle est réaliste et la différence revendiquée compte pour la cible",
            "Les preuves sont réelles, sourcées et formulées honnêtement",
            "Le test de reformulation a été réalisé et ses enseignements sont exploités",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m08-l02",
      title: "Construire sa landing page",
      summary:
        "Concevoir une landing page à objectif unique, avec un formulaire de capture conforme, la construire avec Bolt.new ou Next.js et la déployer sur Vercel.",
      estimatedMinutes: 60,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous aurez mis en ligne une landing page à objectif unique, avec un formulaire de capture conforme, construite avec Bolt.new ou Next.js et déployée sur Vercel.

## À quoi sert une landing page

Une **landing page** (page d’atterrissage) est une page web conçue pour une seule action : celle que vous attendez du visiteur. Cette action s’appelle la **conversion** : s’inscrire sur une liste d’attente, créer un compte d’essai, précommander, réserver un appel. Le **taux de conversion** est la part des visiteurs qui l’accomplissent.

Au stade du MVP, la landing page a deux rôles : présenter votre offre à ceux qui arrivent par vos canaux d’acquisition (leçon 4) et mesurer l’intérêt réel. Une inscription sur liste d’attente est un signal plus faible qu’une précommande, mais bien plus fort qu’un « j’adore l’idée ».

## La structure qui fonctionne

Dans l’ordre de lecture, de haut en bas :

1. **L’accroche** (en anglais, *hero*) : un titre qui dit le bénéfice principal, un sous-titre qui précise pour qui et comment, et le bouton d’action. Tout doit être compris sans faire défiler la page.
2. **Le problème** : la situation actuelle de la cible, décrite avec ses mots. Le visiteur doit s’y reconnaître.
3. **La solution** : comment votre produit résout ce problème, en trois bénéfices au maximum.
4. **La démonstration** : captures d’écran du vrai produit, courte vidéo ou parcours en trois étapes.
5. **Les preuves honnêtes** : citations réelles, résultats de tests, votre légitimité (leçon précédente).
6. **Le prix ou la liste d’attente** : si vous vendez déjà, un prix clair ; sinon, une liste d’attente et ce qu’elle apporte, comme un accès en avant-première.
7. **La FAQ** : cinq à huit objections entendues en entretien ou en test, avec des réponses franches.
8. **L’appel à l’action final** : le même bouton, avec le même verbe qu’en haut de page.

Pour Créno, côté coachs : titre « Vos clients réservent et paient seuls. Vous coachez. », sous-titre « L’application de réservation et de paiement pour coachs sportifs indépendants, avec rappel automatique la veille », bouton « Rejoindre la liste d’attente ».

## Un seul objectif de conversion

Chaque élément de la page doit servir cette action unique. Concrètement : pas de menu de navigation qui mène ailleurs, pas de liens vers vos réseaux sociaux en haut de page, un seul type de bouton répété à plusieurs endroits, toujours avec le même libellé. Si vous avez deux cibles, comme Créno (coachs et clients), faites deux pages, ou commencez par celle qui conditionne l’autre : les coachs.

## Le formulaire de capture et le consentement

Le formulaire recueille des données personnelles : le RGPD s’applique.

- **Demandez le minimum** : une adresse e-mail, éventuellement un prénom et une question de qualification (« Combien de clients suivez-vous ? »). Chaque champ supplémentaire décourage des visiteurs.
- **Informez sous le formulaire** : qui collecte, pour quoi faire, pendant combien de temps, et comment exercer ses droits, avec un lien vers votre politique de confidentialité (leçon 6).
- **Séparez les finalités** : l’inscription à la liste d’attente n’emporte pas l’accord pour recevoir une newsletter. Pour cela, ajoutez une case à cocher **non cochée par défaut**.
- **Envoyez un e-mail de confirmation** : la double validation, où l’inscrit clique sur un lien pour confirmer, est une bonne pratique qui garantit aussi que l’adresse est valide.
- **Stockez proprement** : dans une table Supabase protégée ou une base Airtable à accès restreint, jamais dans un tableur largement partagé.

## Construire : deux chemins

**Avec Bolt.new**, vous décrivez la page et ses sections dans un prompt, puis vous itérez en conversation. C’est le chemin le plus rapide sans compétence en code. Relisez chaque texte généré, supprimez les contenus fictifs (témoignages, chiffres, logos) que l’outil peut ajouter pour « remplir », et vérifiez où sont envoyées les données du formulaire.

**Avec Next.js**, vous ajoutez la landing page à votre projet existant (M06), avec l’aide de Claude Code ou de Cursor. L’inscription est traitée côté serveur et enregistrée dans Supabase. C’est le chemin le plus souple si votre MVP repose déjà sur cette stack.

Dans les deux cas, déployez sur Vercel comme au M06, ou utilisez l’option de publication de l’outil en vérifiant ce qu’elle propose, puis reliez votre nom de domaine. Une adresse à votre nom inspire davantage confiance qu’une adresse technique.

## Avant de publier

Vérifiez l’affichage sur mobile : une bonne partie de vos visiteurs arrivera depuis un téléphone, notamment par les réseaux sociaux. Contrôlez la vitesse de chargement, ainsi que le titre et la description de la page, qui apparaîtront dans les moteurs de recherche et lors des partages. Ajoutez l’événement de conversion à votre plan de marquage (M07). Enfin, ne diffusez pas largement le lien avant d’avoir publié vos pages légales, que vous rédigerez à la leçon 6.
`,
        },
        {
          type: "video",
          title: "Anatomie d’une landing page",
          durationMinutes: 6,
          script: `
- Ouverture : la landing page coachs de Créno, parcourue de haut en bas en vingt secondes.
- L’accroche passée au test des cinq secondes : ce qu’un coach retient après un coup d’œil.
- Problème, solution, démonstration : comment les citations des entretiens deviennent des titres de section.
- Les preuves honnêtes : exemples acceptables, puis exemples interdits (faux témoignages, chiffres inventés).
- Le formulaire : champs minimaux, mention d’information, case non cochée, e-mail de confirmation.
- Démonstration rapide des deux chemins (Bolt.new, puis Next.js avec Claude Code) et déploiement sur Vercel.
- Vérifications finales sur mobile, puis test d’une inscription de bout en bout.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Chemin Next.js et Supabase

Créez une table dédiée, en insertion seule pour les visiteurs anonymes :

\`\`\`sql
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  profil text,
  consent_newsletter boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

create policy "inscription publique"
  on public.waitlist for insert
  to anon
  with check (true);
-- Aucune politique select : la liste n'est lisible que côté serveur.
\`\`\`

Traitez le formulaire côté serveur (Server Action ou route API) : validez l’adresse, ajoutez une protection contre les robots (champ caché ou service anti-spam) et renvoyez un message neutre en cas de doublon, pour ne pas révéler qui est inscrit. Déclenchez l’e-mail de confirmation depuis le serveur ou via un scénario n8n. Pour la syntaxe à jour des formulaires et des métadonnées de page, référez-vous à la [documentation Next.js](https://nextjs.org/docs).
`,
        },
        {
          type: "prompt",
          personas: ["tech"],
          title: "Ajouter la landing page à votre projet Next.js",
          tool: "Claude Code",
          prompt: `
Dans ce projet Next.js, crée une landing page à l’adresse /coachs.

Contenu (textes fournis, n’en invente aucun) :
[collez vos textes : accroche, problème, solution, démonstration, preuves, liste d’attente, FAQ]

Contraintes :
- Un seul objectif : l’inscription à la liste d’attente. Pas de menu de navigation vers d’autres pages.
- Formulaire : e-mail obligatoire, question de qualification facultative, case newsletter non cochée par défaut, mention d’information avec un lien vers /confidentialite.
- Traitement côté serveur, insertion dans la table Supabase public.waitlist (schéma ci-dessous), validation de l’e-mail, message neutre en cas de doublon.
- Aucune clé secrète côté client.
- Page rapide et lisible sur mobile, titre et description de page renseignés.
- Réutilise les composants et le style existants du projet.

Schéma : [collez le SQL de la table]

Avant de coder, propose un plan en quelques étapes et attends ma validation.
`,
          tips: "Relisez le diff avant de l’accepter. Testez le formulaire (inscription, doublon, adresse invalide) sur l’aperçu de déploiement Vercel avant la mise en production.",
        },
        {
          type: "prompt",
          personas: ["non_tech", "reconversion"],
          title: "Générer la landing page avec Bolt.new",
          tool: "Bolt.new",
          prompt: `
Crée une landing page en français, sobre et lisible sur mobile, pour [nom du produit], destinée à [cible].

Objectif unique : l’inscription à la liste d’attente. Pas de menu de navigation.

Sections, dans cet ordre, avec exactement ces textes :
1. Accroche : titre « [titre] », sous-titre « [sous-titre] », bouton « [libellé] ».
2. Problème : [texte]
3. Solution : [3 bénéfices]
4. Démonstration : 3 étapes, avec des emplacements d’images que je remplacerai par mes captures d’écran.
5. Preuves : [citations réelles]. N’ajoute aucun autre témoignage, logo ni chiffre.
6. Liste d’attente : [ce qu’elle apporte]
7. FAQ : [questions et réponses]
8. Appel à l’action final : le même bouton qu’en haut.

Formulaire : e-mail obligatoire, une question « [question de qualification] », une case non cochée « J’accepte de recevoir des nouvelles de [produit] », et sous le bouton un texte d’information avec un lien vers la page « Politique de confidentialité ». Enregistre les inscriptions dans [Supabase ou Airtable].
`,
          tips: "Si l’outil ajoute de lui-même des témoignages ou des chiffres, supprimez-les. Faites une inscription de test et vérifiez que la ligne apparaît bien dans votre base.",
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Le vocabulaire de la landing page

| Terme | Signification |
| --- | --- |
| Landing page | Page conçue pour une seule action du visiteur |
| Accroche (hero) | Le haut de la page, visible sans faire défiler |
| CTA (call to action) | L’appel à l’action : le bouton principal |
| Conversion | L’action attendue, accomplie par le visiteur |
| Taux de conversion | La part des visiteurs qui accomplissent cette action |
| Nom de domaine | L’adresse de votre site, réservée auprès d’un bureau d’enregistrement |

Avancez dans cet ordre : d’abord les textes, dans un simple document ; ensuite la construction ; enfin la publication. Construire avant d’avoir écrit fait perdre beaucoup de temps en allers-retours.
`,
        },
        {
          type: "exercice",
          title: "Votre landing page en ligne",
          instructions: `
Construisez et publiez la landing page de **votre projet**.

1. Rédigez d’abord les textes des huit sections dans un document, à partir de votre fiche de positionnement.
2. Construisez la page avec Bolt.new ou Next.js (voir les éléments propres à votre profil).
3. Mettez en place le formulaire : champs minimaux, mention d’information, case non cochée pour toute communication marketing, enregistrement dans votre base.
4. Déployez la page, puis testez vous-même une inscription de bout en bout, sur ordinateur et sur mobile.
5. Ajoutez l’événement de conversion à votre plan de marquage.

Déposez le lien public de la page. Tant que vos pages légales ne sont pas prêtes (leçon 6), ne diffusez pas largement ce lien.
`,
          deliverable: "lien",
          estimatedMinutes: 40,
          review: "formateur",
          rubric: [
            "Structure complète et un seul objectif de conversion, visible dès l’accroche",
            "Textes concrets, orientés bénéfices, sans preuve inventée",
            "Formulaire minimal, avec information des personnes et consentement distinct non pré-coché",
            "Page déployée, fonctionnelle de bout en bout et lisible sur mobile",
            "Événement de conversion mesuré",
          ],
        },
        {
          type: "checklist",
          title: "Avant de partager votre landing page",
          items: [
            "Titre compris en cinq secondes par une personne de la cible",
            "Un seul bouton d’action, avec le même libellé partout",
            "Aucun témoignage, logo ou chiffre inventé",
            "Formulaire testé : inscription, doublon, adresse invalide",
            "Mention d’information et lien vers la politique de confidentialité",
            "Affichage vérifié sur mobile",
            "Titre et description de page renseignés",
            "Événement de conversion enregistré",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m08-l03",
      title: "Copywriting avec l’IA",
      summary:
        "Écrire des textes orientés bénéfices, dans les mots de votre cible, avec l’aide de l’IA mais sans son ton générique, et tester vos titres.",
      estimatedMinutes: 40,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez écrire des textes qui parlent le langage de votre cible, avec l’aide de l’IA mais sans son ton générique, et tester vos titres.

## Le copywriting, c’est quoi ?

Le **copywriting** est l’écriture de textes destinés à provoquer une action : s’inscrire, acheter, répondre. Ce n’est pas de la littérature. Un bon texte de landing page est clair avant d’être original, précis avant d’être brillant.

## Deux cadres utiles

Un **cadre** est une structure qui vous évite la page blanche. Deux cadres classiques suffisent pour un MVP.

**AIDA** : Attention, Intérêt, Désir, Action.

- **Attention** : un titre qui arrête le lecteur parce qu’il parle de lui. « Fini les soirées à caler vos séances par messages. »
- **Intérêt** : un détail qui donne envie d’en savoir plus. « Vos clients voient vos créneaux libres et réservent eux-mêmes. »
- **Désir** : le bénéfice projeté. « Le paiement est encaissé à la réservation, et chaque client reçoit un rappel la veille. »
- **Action** : une demande claire. « Rejoignez la liste d’attente. »

**PAS** : Problème, Agitation, Solution.

- **Problème** : « Organiser ses séances par messages prend un temps fou. »
- **Agitation** : rendre le problème concret, sans dramatiser. « Un client annule la veille, un autre oublie de payer, et votre dimanche soir y passe. »
- **Solution** : « Avec Créno, vos clients réservent, paient et reçoivent un rappel, sans que vous ayez à intervenir. »

AIDA convient bien à une page complète ; PAS, à un post, un e-mail ou une section « problème ».

## Bénéfices, pas fonctionnalités

Une **fonctionnalité** est ce que fait le produit. Un **bénéfice** est ce que l’utilisateur y gagne. Les visiteurs s’engagent pour des bénéfices.

| Fonctionnalité | Bénéfice | Preuve possible |
| --- | --- | --- |
| Paiement en ligne à la réservation | Vous n’avez plus à relancer les impayés | Démonstration du parcours |
| Rappel automatique la veille | Vos clients n’oublient plus leur séance | Citations de coachs testeurs |
| Page de réservation personnelle | Vos clients réservent sans vous écrire | Capture de la page |

Une technique simple : après chaque fonctionnalité, demandez-vous « et alors ? » jusqu’à tomber sur quelque chose que la cible veut vraiment.

## Parler comme votre cible

Les meilleurs textes reprennent les mots exacts de la cible. Vous les avez déjà : dans vos notes d’entretiens de découverte (M01) et dans les citations de vos tests (M07). Relisez-les et surlignez les expressions qui reviennent. Si trois coachs parlent de « caler les séances » et aucun de « gérer son agenda », écrivez « caler les séances ».

Faites de même avec les objections : chaque doute exprimé en entretien mérite une réponse dans votre FAQ.

## Éviter le ton générique de l’IA

Un assistant IA produit vite un texte correct. Mais un texte généré sans matière ressemble à tous les autres : il se repère, et il inspire moins confiance. Les signes à traquer :

- les superlatifs vides : « révolutionnaire », « ultime », « incroyable » ;
- les promesses abstraites : « libérez votre potentiel », « simplifiez votre quotidien » ;
- les ouvertures toutes faites : « Dans un monde où… » ;
- les énumérations systématiques par trois et les émojis décoratifs ;
- l’absence de tout détail concret propre à votre cible.

Pour l’éviter, donnez à l’IA vos citations, votre fiche de positionnement et des contraintes précises : vocabulaire à utiliser, mots interdits, longueur. Demandez plusieurs versions, choisissez, puis **réécrivez vous-même**. Relisez à voix haute : si une phrase ne pourrait pas sortir de votre bouche devant un client, retirez-la. Vérifiez enfin chaque affirmation, car l’IA peut ajouter un chiffre ou une promesse que votre produit ne tient pas.

## Tester ses titres

Un **test A/B** consiste à montrer deux versions d’un même élément, par exemple le titre, à deux groupes de visiteurs comparables, puis à comparer leur taux de conversion. Pour conclure avec confiance, il faut un volume de visiteurs suffisant, que vous n’aurez souvent pas au lancement. Adaptez la méthode :

- **Test des cinq secondes** : montrez la page cinq secondes à une personne de la cible, cachez-la, et demandez-lui ce qu’elle a retenu.
- **Tests successifs** : une version une semaine, l’autre la semaine suivante, sur le même canal, en gardant en tête que d’autres facteurs peuvent varier.
- **Tests par message** : deux accroches dans deux posts ou deux annonces, puis comparaison des clics vers la page.

Dans tous les cas, ne changez qu’un élément à la fois, et ne tirez pas de conclusion définitive de quelques dizaines de visites.
`,
        },
        {
          type: "prompt",
          title: "Générer des titres à partir de vos citations",
          tool: "Claude",
          prompt: `
Tu es un rédacteur qui écrit en français simple et concret. Tu évites les superlatifs et le jargon marketing.

Ma fiche de positionnement : [collez-la]
Citations de ma cible, anonymisées : [collez 10 à 20 citations d’entretiens et de tests]
Expressions à privilégier : [expressions récurrentes de la cible]
Mots interdits : révolutionnaire, innovant, ultime, libérer, booster, « dans un monde où »

1. Propose 10 titres d’accroche de 10 mots au maximum, chacun centré sur un bénéfice ou une formulation différente, en réutilisant les mots de la cible.
2. Pour les 3 meilleurs, propose un sous-titre qui précise pour qui et comment.
3. Pour chaque proposition, cite la citation dont elle s’inspire.

N’ajoute aucun chiffre ni aucune promesse absente de ma fiche.
`,
          tips: "Retenez pour vos tests deux titres vraiment différents (deux bénéfices, deux angles), pas deux variantes d’un même mot.",
        },
        {
          type: "prompt",
          title: "Traquer le ton générique dans vos textes",
          tool: "Tout assistant IA",
          prompt: `
Voici le texte de ma landing page : [collez le texte]

Agis comme un relecteur exigeant. Pour chaque phrase :
1. Indique si elle est générique (elle pourrait figurer sur n’importe quel site), abstraite, exagérée ou invérifiable.
2. Propose une réécriture plus concrète, en t’appuyant uniquement sur ces éléments réels : [fonctionnalités, preuves, citations de la cible].
3. Si aucun élément réel ne permet de réécrire la phrase, recommande de la supprimer.

Termine par la liste des affirmations de mon texte que je dois être capable de prouver.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Résistez à la liste de fonctionnalités

Vous savez comment le produit est construit, et c’est tentant de le dire : « temps réel », « sécurisé par RLS », « Next.js et Supabase ». Vos visiteurs n’en ont pas besoin. Traduisez : « temps réel » devient « vos créneaux se mettent à jour dès qu’un client réserve ». Si vous implémentez un vrai test A/B, attribuez la variante de façon stable (le même visiteur voit toujours la même version) et enregistrez la variante vue avec l’événement de conversion, sans quoi vous ne pourrez rien comparer.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Votre expertise métier, votre meilleur atout d’écriture

Vous parlez déjà la langue de votre cible : ses expressions, ses irritations, ses habitudes. Ne laissez pas l’IA lisser ce vocabulaire. Quand une proposition générée remplace un mot du métier par un terme plus « marketing », revenez au mot du métier. C’est lui qui fera dire au visiteur : « c’est fait pour moi ».
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Écrire sans être rédacteur

Vous n’avez pas besoin d’un talent d’écriture particulier. Trois gestes suffisent :

1. Écrivez comme si vous parliez à une seule personne de votre cible, assise en face de vous.
2. Recopiez ses mots à elle, tirés de vos notes, plutôt que d’en chercher de plus beaux.
3. Lisez votre texte à voix haute et coupez tout ce qui vous gêne à l’oral.

Le premier jet sera imparfait, et c’est normal : l’important est de le confronter vite à de vrais lecteurs.
`,
        },
        {
          type: "exercice",
          title: "Réécrire vos textes clés",
          instructions: `
Sur **votre landing page** :

1. Listez trois fonctionnalités et transformez chacune en bénéfice (technique du « et alors ? »).
2. Relevez au moins cinq expressions récurrentes de votre cible dans vos notes d’entretiens et de tests.
3. Réécrivez votre accroche (titre et sous-titre) avec ces expressions.
4. Rédigez une section « problème » selon le cadre PAS.
5. Choisissez deux titres vraiment différents à tester, et indiquez comment vous les testerez : test des cinq secondes, tests successifs ou tests par message.

Rendez vos textes avant et après, ainsi que vos deux titres à tester.
`,
          deliverable: "texte",
          estimatedMinutes: 25,
          review: "auto",
          rubric: [
            "Les bénéfices sont concrets et désirables pour la cible",
            "Les mots de la cible sont réellement réutilisés",
            "Le texte est débarrassé des formules génériques et de toute affirmation invérifiable",
            "Les deux titres à tester sont réellement différents et la méthode de test est adaptée au trafic",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m08-l04",
      title: "Premiers canaux d’acquisition",
      summary:
        "Choisir vos premiers canaux d’acquisition et les tester avec une méthode d’expérimentation rigoureuse, à petit budget.",
      estimatedMinutes: 60,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez choisir vos premiers canaux d’acquisition et les tester avec une méthode d’expérimentation rigoureuse, sans dépenser plus que nécessaire.

## Commencer là où votre cible se trouve déjà

L’**acquisition** désigne l’ensemble des moyens par lesquels de nouveaux utilisateurs découvrent votre produit. Un **canal** est l’un de ces moyens : un réseau social, une communauté, un partenaire, un moteur de recherche.

Au lancement, deux principes :

- **Peu de canaux, bien travaillés.** Deux ou trois canaux testés sérieusement valent mieux que dix effleurés.
- **Faire des choses qui ne passent pas à l’échelle.** L’expression, popularisée par Paul Graham, désigne les actions manuelles et personnelles (écrire à chaque prospect, accompagner chaque inscrit) impossibles avec des milliers d’utilisateurs, mais très efficaces pour les premiers.

Si votre produit a deux faces, comme Créno, concentrez-vous d’abord sur celle qui attire l’autre. Chaque coach inscrit apporte ses propres clients : l’acquisition des clients passe donc par les coachs.

## Les principaux canaux

### LinkedIn

Utile si votre cible est professionnelle. Commencez par votre **profil** : un titre qui dit ce que vous construisez et pour qui, une section « Infos » qui raconte le problème. Publiez ensuite **régulièrement**, par exemple une fois par semaine, des posts utiles : un apprentissage de vos entretiens, un problème de la cible, une coulisse du produit. Commentez aussi les publications de votre cible. Évitez les outils d’automatisation de messages : ils peuvent enfreindre les conditions d’utilisation de la plateforme et abîment votre image.

### Communautés en ligne

Groupes, forums, serveurs de discussion où votre cible échange. Règle d’or : **contribuer avant de parler de soi**. Lisez les règles de chaque communauté, répondez aux questions, partagez vos apprentissages, et ne présentez votre produit que là où c’est autorisé.

### Réseau et bouche-à-oreille

Votre réseau personnel, les personnes interrogées au M01, vos testeurs du M07. Demandez-leur une **mise en relation précise** (« Connaissez-vous deux coachs indépendants qui gèrent seuls leur planning ? ») plutôt qu’un partage vague. Le bouche-à-oreille se provoque : rendez le partage facile, et demandez-le aux utilisateurs satisfaits.

### Emailing, avec consentement

L’e-mail reste un canal direct et maîtrisé. N’écrivez qu’aux personnes qui l’ont accepté, par exemple les inscrits de votre liste d’attente. Pour la prospection par e-mail, les règles diffèrent selon que vous écrivez à des particuliers (consentement préalable, en principe) ou à des professionnels (message en rapport avec leur activité, possibilité de s’opposer) : vérifiez-les sur [cnil.fr](https://www.cnil.fr). Chaque e-mail doit permettre de se désinscrire simplement.

### Partenariats

Repérez les acteurs qui parlent déjà à votre cible sans être vos concurrents : pour Créno, des salles de sport, des vendeurs de matériel, des organismes qui forment les coachs. Proposez un échange concret et équilibré : une offre pour leurs membres, un contenu commun, une présentation lors d’un événement.

### Publicité, en test à petit budget

Les régies publicitaires de Meta (Facebook, Instagram) ou de LinkedIn permettent de cibler une audience selon ses centres d’intérêt, son métier ou son secteur. Au lancement, la publicité sert à **apprendre vite** (quel message fait cliquer, quelle audience s’inscrit), pas à croître. Principes : un budget plafonné fixé à l’avance, une audience précise, un seul message par annonce, une landing page cohérente avec l’annonce et un critère d’arrêt. Vérifiez les coûts et les règles de chaque régie au moment de lancer votre test.

### SEO de base

Le **SEO** (référencement naturel) vise à apparaître dans les résultats des moteurs de recherche sans payer. Les bases : des **contenus utiles** qui répondent aux questions réelles de votre cible (« comment limiter les annulations de dernière minute quand on est coach »), des **pages rapides** et lisibles sur mobile, un titre et une description propres à chaque page. Le SEO produit ses effets lentement : c’est un investissement, rarement le canal de vos premières semaines.

## La méthode d’expérimentation

Une **expérience d’acquisition** est un test limité dans le temps, conçu pour répondre à une question. Chacune se décrit en cinq éléments, fixés **avant** de commencer :

1. **Hypothèse** : « Nous pensons que [action sur ce canal] auprès de [audience] produira [résultat], parce que [raison]. »
2. **Canal** : un seul par expérience.
3. **Métrique** : le chiffre qui tranchera, idéalement proche de la conversion (des inscriptions plutôt que des vues).
4. **Durée** : fixe, par exemple deux ou trois semaines.
5. **Décision** : les seuils qui mèneront à arrêter, continuer ou amplifier.

| Élément | Exemple Créno |
| --- | --- |
| Hypothèse | Publier chaque semaine dans deux groupes de coachs indépendants, en partageant nos apprentissages, amènera des coachs sur la liste d’attente, parce qu’ils y posent souvent des questions d’organisation |
| Canal | Communautés en ligne |
| Métrique | Inscriptions de coachs provenant de ces groupes |
| Durée | 3 semaines |
| Décision | Moins de 3 inscriptions : arrêter. De 3 à 10 : continuer en changeant le message. Plus de 10 : amplifier à d’autres groupes |

Les seuils sont les vôtres : ils dépendent de votre cible et de vos objectifs. L’essentiel est de les écrire avant, pour ne pas réinterpréter les résultats après coup. Pour savoir d’où viennent vos inscrits, ajoutez à chaque lien partagé des **paramètres de suivi** (souvent appelés UTM) qui indiquent la source, et enregistrez-les avec l’événement d’inscription.
`,
        },
        {
          type: "video",
          title: "Mener une expérience d’acquisition",
          durationMinutes: 6,
          script: `
- Pourquoi peu de canaux au lancement, et la logique d’un produit à deux faces illustrée avec Créno (les coachs amènent leurs clients).
- Tour rapide des canaux : pour chacun, quand l’utiliser et son principal piège.
- Construction en direct d’une fiche d’expérience : hypothèse, canal, métrique, durée, décision.
- Création d’un lien avec paramètres de suivi, puis vérification que la source est bien enregistrée avec l’inscription.
- Trois semaines plus tard : lecture des résultats et application de la décision prévue.
- Les erreurs à éviter : changer plusieurs choses à la fois, prolonger une expérience qui ne marche pas, conclure trop tôt.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## La tentation de coder au lieu de vendre

Face à un canal qui démarre lentement, le réflexe d’un profil technique est d’ajouter une fonctionnalité ou d’automatiser. Au lancement, c’est rarement le bon levier. Bloquez dans votre semaine un temps fixe pour l’acquisition, au même titre que le développement. Côté technique, limitez-vous à l’essentiel : capturer les paramètres de suivi à l’inscription, renseigner titre et description de chaque page, soigner la vitesse de chargement. Le reste attendra que vous sachiez quel canal fonctionne.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Votre réseau métier, un canal prioritaire

Si vous êtes expert du domaine, vous connaissez déjà l’écosystème : associations professionnelles, événements, fournisseurs, prescripteurs. C’est souvent votre canal le plus rapide et le plus crédible. Commencez par lister vingt personnes ou organisations de ce réseau, classez-les selon leur proximité avec votre cible, et contactez les cinq premières cette semaine avec une demande précise.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Parler de son projet quand on débute

Parler de son projet peut mettre mal à l’aise, surtout au début d’une reconversion. Changez de posture : vous ne vendez pas, vous partagez ce que vous apprenez et vous cherchez des personnes concernées par un problème. Votre ancien réseau professionnel est une ressource précieuse, même s’il est éloigné de votre nouvelle activité : chacun connaît quelqu’un. Commencez par un seul canal, tenez-le trois semaines, puis ajoutez-en un deuxième.
`,
        },
        {
          type: "prompt",
          title: "Transformer un apprentissage en post LinkedIn",
          tool: "Claude",
          prompt: `
Aide-moi à écrire un post LinkedIn en français, sobre et concret, à partir d’un apprentissage réel de mon projet.

Ma cible : [...]
L’apprentissage, tiré de mes entretiens ou de mes tests (anonymisé) : [...]
Ce que j’ai changé dans le produit en conséquence : [...]
Ton : direct, sans émoji, sans superlatif, sans formule d’accroche artificielle.

Propose 2 versions de 120 à 180 mots :
1. une version récit : ce que j’ai observé, ce que j’ai compris, ce que je change ;
2. une version qui se termine par une question ouverte à la communauté.

Termine chaque version par une invitation discrète à rejoindre la liste d’attente. N’invente ni chiffre ni anecdote.
`,
          tips: "Retouchez le texte pour qu’il sonne comme vous, puis répondez à chaque commentaire : les échanges comptent autant que le post.",
        },
        {
          type: "exercice",
          title: "Votre plan de trois expériences",
          instructions: `
Concevez **trois expériences d’acquisition** pour votre projet, sur trois canaux différents.

1. Pour chaque expérience, remplissez les cinq éléments : hypothèse, canal, métrique, durée, décision (avec des seuils chiffrés fixés à l’avance).
2. Précisez les moyens nécessaires : temps par semaine, budget éventuel (avec un plafond), contenus à produire.
3. Indiquez comment vous mesurerez la source des inscriptions : paramètres de suivi, question dans le formulaire, ou les deux.
4. Vérifiez la conformité : consentement pour les e-mails, règles des communautés, conditions des plateformes.
5. Fixez la date de démarrage de la première expérience, dans les sept jours.

Exemple attendu : la fiche Créno de la leçon.
`,
          deliverable: "texte",
          estimatedMinutes: 40,
          review: "formateur",
          rubric: [
            "Chaque hypothèse est précise et réfutable (action, audience, résultat, raison)",
            "Une métrique proche de la conversion est choisie pour chaque expérience",
            "Durée et seuils de décision sont fixés avant le démarrage",
            "Les canaux sont cohérents avec les endroits où se trouve la cible",
            "Les règles de consentement et des plateformes sont respectées",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m08-l05",
      title: "Mesurer et itérer",
      summary:
        "Piloter le lancement avec un indicateur principal, l’entonnoir AARRR et une revue hebdomadaire, pour décider d’arrêter, continuer ou amplifier.",
      estimatedMinutes: 35,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez piloter votre lancement avec un tableau de bord hebdomadaire et décider, chaque semaine, d’arrêter, de continuer ou d’amplifier.

## Un indicateur principal, pas vingt

Au M07, vous avez défini votre indicateur principal : le chiffre qui résume la valeur délivrée (pour Créno, les séances réservées et payées par semaine). C’est lui qui dit si le lancement fonctionne. Les autres chiffres servent à comprendre pourquoi il bouge, ou pourquoi il ne bouge pas.

Méfiez-vous des **indicateurs de vanité** : nombre d’abonnés, vues d’un post, visites totales. Ils montent facilement et donnent une impression de progrès, mais ne disent pas si le produit apporte de la valeur. Un bon indicateur est **actionnable** : quand il bouge, vous savez quoi faire.

## L’entonnoir AARRR

L’**entonnoir AARRR**, popularisé par Dave McClure, découpe le parcours d’un utilisateur en cinq étapes. Il aide à repérer celle où vous perdez le plus de monde.

| Étape | Question | Exemple d’indicateur Créno |
| --- | --- | --- |
| Acquisition | Les gens nous découvrent-ils ? | Visiteurs de la landing coachs, par source |
| Activation | Vivent-ils la première valeur ? | Coachs ayant reçu une première réservation payée |
| Rétention | Reviennent-ils ? | Coachs actifs trois semaines de suite |
| Recommandation | En parlent-ils ? | Coachs inscrits grâce à un autre coach |
| Revenu | Paient-ils ? | Montant des paiements traités ou des abonnements |

Au lancement, concentrez-vous sur **l’activation et la rétention**. Acheter du trafic pour un produit que personne n’adopte revient à remplir un seau percé.

## Le tableau de bord hebdomadaire

Un **tableau de bord** regroupe vos chiffres clés, mis à jour à intervalle régulier. Au lancement, une base Notion ou Airtable suffit, avec une ligne par semaine :

| Colonne | Exemple |
| --- | --- |
| Semaine | Du lundi au dimanche, toujours la même convention |
| Indicateur principal | Séances réservées et payées |
| Acquisition | Visiteurs, inscriptions par source |
| Activation | Nouveaux coachs activés |
| Rétention | Coachs actifs trois semaines de suite |
| Expériences en cours | Lien vers les fiches d’expérience |
| Décisions prises | Arrêter, continuer ou amplifier, avec la raison |
| Apprentissage de la semaine | Une phrase |

Ajoutez une seconde base pour vos **expériences d’acquisition** (leçon précédente), avec leur statut et leur résultat. Remplir le tableau à la main pendant quelques semaines n’est pas un problème : c’est même un bon moyen de vraiment regarder vos chiffres. Automatisez ensuite, quand la structure est stable.

## La revue hebdomadaire

Bloquez chaque semaine un créneau fixe de 30 à 45 minutes, seul ou avec vos associés. Gardez le même ordre du jour :

1. Mettre à jour le tableau de bord.
2. Lire l’évolution de l’indicateur principal sur plusieurs semaines, pas seulement la dernière.
3. Identifier l’étape la plus faible de l’entonnoir.
4. Passer en revue chaque expérience en cours et appliquer la décision prévue.
5. Relire les retours qualitatifs de la semaine : messages, appels, demandes d’aide.
6. Choisir une à trois actions pour la semaine suivante et les ajouter au backlog Notion.

Si vous travaillez en Scrum (M01), articulez cette revue avec votre revue de sprint : l’une regarde le produit livré, l’autre ses effets.

## Arrêter, continuer ou amplifier

À la fin de chaque expérience, trois décisions sont possibles :

- **Arrêter** : le résultat est sous le seuil fixé. Notez ce que vous avez appris, puis consacrez ce temps à autre chose. Arrêter n’est pas un échec : c’est une information.
- **Continuer** : le résultat est encourageant mais pas net. Changez **un seul** paramètre (le message, l’audience ou le format) et relancez pour une durée fixe.
- **Amplifier** : le résultat dépasse le seuil. Augmentez progressivement l’effort ou le budget, en vérifiant que le résultat se maintient.

Gardez en tête que les chiffres montrent **ce qui** se passe. Pour comprendre **pourquoi**, retournez parler à vos utilisateurs, comme au M07.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Alimenter le tableau automatiquement

Si vous avez créé la table d’événements du M07, une requête hebdomadaire suffit à remplir l’essentiel :

\`\`\`sql
select
  date_trunc('week', created_at) as semaine,
  count(*) filter (where name = 'paiement_reussi') as seances_payees,
  count(distinct user_id) filter (where name = 'creneau_publie') as coachs_publiant
from public.events
where created_at >= now() - interval '8 weeks'
group by 1
order by 1;
\`\`\`

Un scénario n8n planifié chaque lundi peut exécuter cette requête et créer la ligne de la semaine dans Notion ou Airtable. Stockez les identifiants de connexion dans le gestionnaire d’identifiants de n8n, jamais en clair dans le scénario, et utilisez un accès en lecture seule à la base.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Un tableau de bord sans code

Dans Notion ou Airtable, créez une base « Semaines » avec les colonnes de la leçon, et une base « Expériences » reliée à la première. Ajoutez une formule simple pour les taux de passage (inscrits divisés par visiteurs, par exemple). Chaque lundi, relevez vos chiffres dans l’outil d’analytics et dans votre base de données, puis remplissez la ligne. Quand ce rituel sera bien installé, un scénario n8n pourra automatiser la collecte.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Des petits chiffres, et c’est normal

Au début, vos chiffres seront petits : trois inscriptions, un coach activé. C’est normal, et ce n’est pas un verdict sur votre projet. À cette échelle, regardez les tendances sur plusieurs semaines et, surtout, l’histoire derrière chaque chiffre : qui s’est inscrit, d’où venait cette personne, qu’a-t-elle fait ensuite ? Un rituel tenu chaque semaine, même court, vaut mieux qu’une grande analyse une fois par mois.
`,
        },
        {
          type: "checklist",
          title: "Votre revue hebdomadaire",
          items: [
            "Tableau de bord mis à jour, indicateur principal en premier",
            "Évolution lue sur plusieurs semaines, pas seulement la dernière",
            "Étape la plus faible de l’entonnoir identifiée",
            "Décision appliquée pour chaque expérience arrivée à échéance",
            "Retours qualitatifs de la semaine relus",
            "Une à trois actions choisies et ajoutées au backlog Notion",
            "Apprentissage de la semaine noté en une phrase",
          ],
        },
        {
          type: "exercice",
          title: "Votre tableau de bord hebdomadaire",
          instructions: `
Construisez le tableau de bord de **votre projet** dans Notion ou Airtable :

1. Une base « Semaines » avec l’indicateur principal en première colonne, puis au moins un indicateur par étape de l’entonnoir pertinente pour vous.
2. Une base « Expériences » reliée à la première, qui reprend vos trois expériences de la leçon précédente avec leur statut.
3. La première ligne remplie, même si les chiffres sont à zéro.
4. Un créneau de revue hebdomadaire bloqué dans votre agenda pour les six prochaines semaines.

Déposez le lien de partage du tableau en lecture seule. Il ne doit contenir aucune donnée personnelle : uniquement des chiffres agrégés.
`,
          deliverable: "lien",
          estimatedMinutes: 25,
          review: "auto",
          rubric: [
            "L’indicateur principal figure en premier et mesure une valeur délivrée",
            "Les étapes clés de l’entonnoir ont chacune au moins un indicateur",
            "Les expériences sont suivies avec statut, résultat et décision",
            "Une revue hebdomadaire est planifiée à créneau fixe",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m08-l06",
      title: "Les bases juridiques du lancement",
      summary:
        "Repérer les documents et démarches juridiques de base d’un lancement en France, et savoir où trouver l’information officielle à jour.",
      estimatedMinutes: 40,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez identifier les documents et démarches juridiques de base avant de lancer votre MVP en France, et où trouver les informations officielles à jour.

> [!warning] Cette leçon donne des **informations générales**, pas un conseil juridique. Les règles évoluent et dépendent de votre situation (activité, clientèle, statut). Vérifiez toujours sur les sites officiels cités et faites-vous accompagner par un professionnel (avocat, expert-comptable) pour les décisions qui vous engagent.

## Les mentions légales

Un site édité dans un cadre professionnel doit afficher des **mentions légales**, accessibles depuis chaque page, généralement en pied de page. Elles identifient notamment l’éditeur du site (nom ou dénomination sociale, adresse, coordonnées, numéro d’immatriculation le cas échéant), le directeur de la publication et l’hébergeur (nom, adresse, contact). Votre landing page est concernée dès sa mise en ligne. Le détail des informations attendues est présenté sur [service-public.fr](https://www.service-public.fr) et [economie.gouv.fr](https://www.economie.gouv.fr).

## CGU et CGV

Les **conditions générales d’utilisation** (CGU) fixent les règles d’usage du service : création de compte, comportements interdits, responsabilités, suspension. Elles sont particulièrement utiles dès que des utilisateurs publient des contenus ou interagissent entre eux.

Les **conditions générales de vente** (CGV) encadrent la relation commerciale : prix, modalités de paiement, exécution, annulation et remboursement. Leur contenu dépend de votre clientèle :

- **Avec des consommateurs**, vous devez fournir avant l’achat une série d’informations précontractuelles ; pour un contrat conclu à distance, un droit de rétractation s’applique en principe, avec des exceptions ; et un dispositif de médiation de la consommation doit être proposé.
- **Avec des professionnels**, les CGV doivent notamment être communiquées à tout acheteur professionnel qui les demande.

Si votre produit met en relation des vendeurs et des acheteurs, comme Créno entre coachs et clients, des obligations d’information propres aux plateformes en ligne peuvent s’ajouter. Il faut aussi préciser qui vend quoi à qui : le coach vend la séance, Créno fournit le service de réservation et de paiement.

## La politique de confidentialité

Dès que vous collectez des données personnelles (liste d’attente, comptes, paiements), vous devez **informer** les personnes clairement : qui est responsable du traitement, pour quelles finalités et sur quelle base légale, quelles données sont collectées, qui les reçoit (y compris vos prestataires), combien de temps elles sont conservées, si elles sortent de l’Union européenne, et comment exercer ses droits, dont celui de saisir la CNIL. C’est le rôle de la **politique de confidentialité**, accessible depuis chaque formulaire.

## Cookies et traceurs

Comme vu au M07, les traceurs non indispensables (publicité, la plupart des outils d’analytics, certains boutons de partage) nécessitent un **consentement préalable**. Le refus doit être aussi simple que l’acceptation, et le choix doit pouvoir être modifié à tout moment. Moins vous utilisez de traceurs, plus c’est simple : c’est un argument de plus pour une mesure d’audience sobre.

## RGPD : registre, droits, prestataires

Le **RGPD** (Règlement général sur la protection des données) vous demande de pouvoir démontrer votre conformité. Au M04, vous avez conçu votre architecture en limitant les données collectées. Pour le lancement :

- **Tenez un registre des traitements** : une fiche par traitement (liste d’attente, comptes, paiements, rappels) avec finalité, données, personnes concernées, destinataires, durée de conservation et mesures de sécurité. La CNIL propose des modèles et des guides pour vous aider.
- **Préparez l’exercice des droits** : accès, rectification, effacement, opposition, limitation, portabilité. Prévoyez une adresse de contact et une procédure pour répondre dans le délai prévu, en principe un mois.
- **Encadrez vos prestataires** (hébergement, base de données, e-mails, automatisation) : ils sont souvent vos **sous-traitants** au sens du RGPD. Vérifiez qu’ils proposent un accord de traitement des données (souvent appelé DPA) et où les données sont hébergées.
- **Anticipez les incidents** : une violation de données présentant un risque pour les personnes doit être notifiée à la CNIL rapidement, en principe dans les 72 heures.

## Statut juridique et démarches

Pour vendre, vous devez exercer dans un cadre légal. Les grandes familles, en termes généraux :

- **L’entreprise individuelle**, y compris sous le régime de la micro-entreprise : des démarches simples, adaptées pour tester une activité seul, avec des plafonds de chiffre d’affaires et des règles fiscales et sociales propres.
- **La société** (par exemple SAS, SASU, SARL, EURL) : une personne morale distincte, adaptée pour s’associer ou accueillir des investisseurs, avec davantage de formalités.

Le choix dépend de nombreux critères : seul ou à plusieurs, protection du patrimoine, régime social du dirigeant, fiscalité, projet de levée de fonds. Les formalités de création se font en ligne via le **guichet unique** des formalités d’entreprises, opéré par l’INPI. Faites valider votre choix par un expert-comptable ou un avocat.

## Propriété intellectuelle : nom et marque

Avant de communiquer largement, vérifiez que votre nom est **disponible** : recherche parmi les marques déposées (bases de l’INPI), les dénominations de sociétés et les noms de domaine. Un nom déjà protégé pour des services similaires peut vous obliger à tout renommer. Pour protéger le vôtre, vous pouvez **déposer une marque** auprès de l’INPI, pour les classes de produits et services qui correspondent à votre activité.

Pensez aussi aux droits sur ce que vous utilisez : licences des bibliothèques open source, images, polices, conditions d’utilisation des outils d’IA pour les contenus générés. Si un prestataire développe pour vous, prévoyez par écrit la cession des droits sur son travail.

## Les sources officielles

- [cnil.fr](https://www.cnil.fr) : RGPD, cookies, prospection, registre.
- [service-public.fr](https://www.service-public.fr) : création d’entreprise, statuts, obligations des professionnels.
- [economie.gouv.fr](https://www.economie.gouv.fr) : droit de la consommation, vente en ligne, mentions obligatoires.
- [inpi.fr](https://www.inpi.fr) : marques, recherche d’antériorité, formalités d’entreprise.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Choisir un statut quand on vient du salariat

Si vous quittez ou avez quitté un emploi salarié, certaines questions sont propres à votre situation : effet de la création d’entreprise sur vos droits en cours, possibilité de cumuler temporairement une activité salariée et une activité indépendante, aides à la création. Renseignez-vous auprès de France Travail si vous êtes inscrit, sur [service-public.fr](https://www.service-public.fr), et auprès des réseaux d’accompagnement à la création (chambres consulaires, réseaux associatifs). Prenez ces rendez-vous tôt : ils conditionnent souvent le bon moment pour immatriculer votre activité.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Le versant technique de la conformité

- **Localisation des données** : Supabase et Vercel permettent de choisir des régions d’hébergement. Vérifiez celles de votre projet, et documentez-les dans votre registre.
- **Journaux** : les logs contiennent souvent des adresses IP et des identifiants. Limitez leur durée de conservation et leur accès.
- **Droits des personnes** : prévoyez dès maintenant une suppression de compte effective (y compris dans les tables liées) et un export des données d’un utilisateur.
- **Licences** : listez les dépendances de votre projet et vérifiez leurs licences, en particulier celles qui imposent des obligations de redistribution.
- **Code généré par l’IA** : relisez-le, et consultez les conditions d’utilisation des outils (Claude Code, Codex, Cursor) sur la propriété et l’usage du code produit.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Utiliser des modèles sans vous mettre en risque

Des modèles de mentions légales, de CGU ou de politique de confidentialité existent en ligne, y compris sur des sites officiels. Utilisez-les comme point de départ, jamais tels quels : partez de la liste réelle de vos outils (Bolt.new, Airtable, n8n, hébergeur, paiement) et des données que vous collectez vraiment, puis adaptez chaque rubrique. Ne copiez jamais les documents d’un concurrent : ils ne correspondent pas à votre activité et sont eux-mêmes protégés. Faites relire l’ensemble par un professionnel avant d’encaisser vos premiers paiements.
`,
        },
        {
          type: "checklist",
          title: "Juridique : avant de diffuser votre lancement",
          items: [
            "Mentions légales publiées et accessibles depuis chaque page",
            "Politique de confidentialité liée à chaque formulaire",
            "Consentement recueilli pour les traceurs qui l’exigent, ou aucun traceur concerné",
            "CGU rédigées et, si vous vendez, CGV adaptées à votre clientèle",
            "Registre des traitements commencé",
            "Adresse de contact prévue pour l’exercice des droits",
            "Accords de traitement des données de vos prestataires vérifiés",
            "Disponibilité du nom vérifiée : marques, sociétés, nom de domaine",
            "Statut juridique choisi, ou démarche planifiée avec un professionnel",
          ],
        },
        {
          type: "exercice",
          title: "L’inventaire juridique de votre lancement",
          instructions: `
Faites l’inventaire juridique de **votre projet** avant de diffuser votre landing page :

1. Listez vos traitements de données personnelles (par exemple liste d’attente, comptes, paiements) et, pour chacun, les données, la finalité, la durée de conservation et les prestataires concernés.
2. Pour chaque document (mentions légales, politique de confidentialité, CGU, CGV), indiquez s’il est nécessaire dans votre cas, son état (à faire, brouillon, publié) et la source officielle consultée.
3. Indiquez si vous utilisez des traceurs soumis à consentement, et comment vous recueillez ce consentement.
4. Notez le résultat de votre recherche de disponibilité du nom.
5. Listez les trois questions que vous poserez à un professionnel (avocat, expert-comptable).

Cet inventaire est un document de travail : il ne remplace pas l’avis d’un professionnel.
`,
          deliverable: "texte",
          estimatedMinutes: 25,
          review: "auto",
          rubric: [
            "Les traitements de données sont identifiés avec finalité, durée de conservation et prestataires",
            "L’état de chaque document est clair et réaliste",
            "La question des traceurs et du consentement est traitée",
            "Les sources officielles sont consultées et les questions pour un professionnel sont pertinentes",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────
    {
      key: "m08-l07",
      title: "Évaluation du module",
      summary: "Vérifier vos acquis sur le positionnement, la landing page, le copywriting, l’acquisition, le pilotage et les bases juridiques du lancement.",
      estimatedMinutes: 20,
      blocks: [
        {
          type: "texte",
          markdown: `
Cette évaluation porte sur l’ensemble du module : positionnement, landing page, copywriting, acquisition, pilotage hebdomadaire et bases juridiques. Répondez d’abord sans relire vos notes, puis lisez chaque explication : elles complètent le cours.
`,
        },
        {
          type: "quiz",
          title: "Évaluation — Lancer",
          graded: true,
          questions: [
            {
              prompt: "Dans le positionnement de Créno, qu’est-ce que « l’alternative actuelle » ?",
              options: [
                { label: "Le concurrent le plus connu du marché de la réservation" },
                { label: "Les messages, le tableur et les relances à la main qu’utilisent aujourd’hui les coachs", correct: true },
                { label: "La future version de Créno" },
                { label: "Le prestataire de paiement utilisé" },
              ],
              explanation:
                "L’alternative actuelle est ce que la cible fait aujourd’hui à la place de votre produit. C’est souvent une habitude, et non un concurrent direct.",
            },
            {
              prompt: "Quelle preuve pouvez-vous afficher sur votre landing page ?",
              options: [
                { label: "« Déjà adopté par des centaines de coachs », pour rassurer les premiers visiteurs" },
                { label: "Des témoignages rédigés par l’IA à partir de ce que les coachs pourraient dire" },
                { label: "« Lors de nos tests, 5 coachs sur 5 ont publié leurs créneaux sans aide », si c’est exact", correct: true },
                { label: "Les logos de salles de sport que vous aimeriez avoir comme partenaires" },
              ],
              explanation:
                "Seules des preuves réelles et formulées honnêtement sont acceptables. Les autres sont trompeuses et peuvent constituer une pratique commerciale trompeuse.",
            },
            {
              prompt: "Quelle pratique est conforme pour le formulaire de votre liste d’attente ?",
              options: [
                { label: "Une case « J’accepte la newsletter » cochée par défaut" },
                { label: "L’inscription vaut automatiquement accord pour recevoir des offres commerciales" },
                { label: "Une case non cochée par défaut pour la newsletter, distincte de l’inscription, et une mention d’information", correct: true },
                { label: "Aucune mention : la politique de confidentialité suffit, même sans lien" },
              ],
              explanation:
                "Chaque finalité fait l’objet d’un choix distinct, sans case pré-cochée, et les personnes sont informées au moment de la collecte.",
            },
            {
              prompt: "Laquelle de ces phrases exprime un bénéfice plutôt qu’une fonctionnalité ?",
              options: [
                { label: "« Paiement en ligne intégré »" },
                { label: "« Vous n’avez plus à relancer les impayés »", correct: true },
                { label: "« Tableau de bord des réservations »" },
                { label: "« Application construite avec Next.js et Supabase »" },
              ],
              explanation:
                "Un bénéfice décrit ce que l’utilisateur y gagne. La technique du « et alors ? » permet de passer de la fonctionnalité au bénéfice.",
            },
            {
              prompt: "Votre landing page reçoit peu de visites. Comment tester deux titres ?",
              options: [
                { label: "Lancer un test A/B et conclure après une vingtaine de visites" },
                { label: "Changer le titre, les images et le bouton en même temps pour aller plus vite" },
                { label: "Combiner tests des cinq secondes auprès de la cible et tests successifs, sans conclusion définitive", correct: true },
                { label: "Demander à l’IA quel titre convertira le mieux" },
              ],
              explanation:
                "Avec peu de trafic, un test A/B ne permet pas de conclure. On combine des méthodes qualitatives et des tests successifs, en changeant un seul élément à la fois.",
            },
            {
              prompt: "Pourquoi fixer les seuils de décision d’une expérience d’acquisition avant de la lancer ?",
              options: [
                { label: "Pour ne pas réinterpréter les résultats après coup", correct: true },
                { label: "Parce que les régies publicitaires l’exigent" },
                { label: "Pour pouvoir prolonger l’expérience indéfiniment" },
                { label: "Ce n’est pas utile : on décide mieux en voyant les résultats" },
              ],
              explanation:
                "Écrire les seuils avant protège contre le biais qui pousse à trouver « encourageant » n’importe quel résultat.",
            },
            {
              prompt: "Au lancement, sur quelles étapes de l’entonnoir AARRR concentrer vos efforts en priorité ?",
              options: [
                { label: "Acquisition et revenu" },
                { label: "Activation et rétention", correct: true },
                { label: "Recommandation uniquement" },
                { label: "Toutes, avec le même effort" },
              ],
              explanation:
                "Tant que les utilisateurs n’obtiennent pas la valeur promise et ne reviennent pas, acheter du trafic revient à remplir un seau percé.",
            },
            {
              prompt: "Quelle affirmation sur l’emailing est exacte ?",
              options: [
                { label: "On peut écrire à toute adresse trouvée publiquement sur internet" },
                { label: "Les règles de prospection diffèrent entre particuliers et professionnels, et chaque e-mail doit permettre de se désinscrire", correct: true },
                { label: "Le consentement n’est jamais nécessaire pour un MVP" },
                { label: "Un lien de désinscription n’est utile qu’au-delà d’un certain volume d’envois" },
              ],
              explanation:
                "La prospection auprès des particuliers suppose en principe leur consentement préalable ; auprès des professionnels, le message doit concerner leur activité et permettre de s’opposer. Détails sur cnil.fr.",
            },
            {
              prompt: "Avant de communiquer largement sous votre nom de produit, que devez-vous vérifier ?",
              options: [
                { label: "Que le nom de domaine en .com est libre, rien d’autre" },
                { label: "Sa disponibilité parmi les marques déposées, les dénominations de sociétés et les noms de domaine", correct: true },
                { label: "Qu’aucun compte de réseau social ne porte déjà ce nom" },
                { label: "Rien : le premier qui publie un nom en devient propriétaire" },
              ],
              explanation:
                "Un nom déjà protégé pour des activités similaires peut vous obliger à renommer votre produit. La recherche d’antériorité se fait notamment dans les bases de l’INPI.",
            },
            {
              prompt: "Quel document informe les personnes de l’usage fait de leurs données personnelles ?",
              options: [
                { label: "Les mentions légales" },
                { label: "Les conditions générales de vente" },
                { label: "La politique de confidentialité", correct: true },
                { label: "Le registre des traitements" },
              ],
              explanation:
                "La politique de confidentialité informe les personnes. Le registre est un document interne qui documente vos traitements ; les mentions légales identifient l’éditeur et l’hébergeur du site.",
            },
          ],
        },
      ],
    },
  ],
};
