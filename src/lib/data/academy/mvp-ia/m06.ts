import type { SeedModule } from "../authoring";

export const M06: SeedModule = {
  key: "m06",
  title: "Construire avec l'IA",
  summary:
    "Le module de production : vous organisez vos sprints de build, versionnez votre code, mettez en place Supabase, construisez le parcours clé avec un outil ou un agent de code IA, automatisez avec n8n, intégrez un LLM côté serveur et mettez votre MVP en ligne sur Vercel.",
  objectives: [
    "Être capable de planifier deux sprints de build en user stories livrables, avec une définition de « fini » explicite et vérifiable.",
    "Être capable de versionner son projet avec Git et GitHub sans jamais exposer de secret, et de revenir à une version qui fonctionne.",
    "Être capable de mettre en place une base Supabase sécurisée (tables, RLS, authentification) et d'en vérifier les règles avec deux comptes de test.",
    "Être capable de construire et de débugger le parcours clé de son MVP en pilotant un outil ou un agent de code IA, en relisant chaque modification.",
    "Être capable de déployer son MVP sur Vercel avec au moins une automatisation n8n et, si c'est pertinent, une fonctionnalité LLM appelée côté serveur.",
  ],
  lessons: [
    // ─────────────────────────────────────────────────────────────── L01
    {
      key: "m06-l01",
      title: "Organiser le build",
      summary:
        "Transformer votre backlog en deux sprints de build faits de user stories livrables, avec une définition de « fini » et un rituel quotidien de dix minutes.",
      estimatedMinutes: 40,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez découper votre backlog en user stories livrables, les répartir sur deux sprints de build et vérifier chaque jour que vous avancez sur ce qui compte.

## Pourquoi organiser avant de coder

Avec un outil d'IA, produire du code est rapide. Produire un produit qui fonctionne l'est beaucoup moins. Le piège classique : générer dix écrans à moitié finis, dont aucun ne permet encore à un utilisateur d'aller au bout de son besoin. L'organisation sert à une seule chose : **finir** des morceaux utilisables, un par un.

Vous avez construit au M01 un PRD (le document qui décrit votre produit) et un backlog (la liste priorisée de tout ce qu'il faudrait faire). Au M04, vous avez défini votre modèle de données et votre architecture. Vous allez maintenant transformer tout cela en **sprints de build** : des périodes courtes et fixes (une à deux semaines selon votre disponibilité) à la fin desquelles quelque chose de nouveau fonctionne vraiment.

## Découper en user stories livrables

Une **user story** décrit un besoin du point de vue de l'utilisateur : « En tant que [rôle], je veux [action] afin de [bénéfice] ». Pour le build, une bonne story est **livrable** : une fois terminée, un utilisateur peut faire quelque chose de plus qu'avant.

Découpez en **tranches verticales** : chaque story traverse toutes les couches (écran, logique, base de données), mais sur un périmètre étroit. L'inverse, le découpage horizontal (« faire toute la base », puis « faire tous les écrans »), ne livre rien d'utilisable avant la fin.

Exemples pour Créno :

| Story trop large | Stories livrables |
| --- | --- |
| « Gérer les créneaux » | Le coach publie un créneau (date, heure, prix, capacité) ; le coach voit la liste de ses créneaux à venir ; le coach supprime un créneau sans réservation |
| « Réserver et payer » | Le client voit les créneaux disponibles ; le client réserve un créneau ; le client paie sa réservation ; le client voit « confirmée » après paiement |
| « Rappels » | La veille de la séance, le client reçoit un email de rappel |

Chaque story porte des **critères d'acceptation** : deux à cinq conditions vérifiables. Par exemple, pour « le client réserve un créneau » : le bouton est désactivé si le créneau est complet ; la réservation apparaît dans « Mes réservations » ; un client ne voit jamais les réservations d'un autre client.

> [!tip] Règle pratique : si une story vous semble demander plus d'une journée de travail, découpez-la encore. Une petite story finie vaut mieux que trois grosses « presque finies ».

## Définir « fini »

La **définition de « fini »** (en Scrum, *Definition of Done*) est la liste des conditions qu'une story doit remplir pour être déplacée dans la colonne « Fini ». Elle est la même pour toutes les stories. Pour ce module, retenez trois conditions minimales :

1. **Fonctionne en ligne** : la story marche dans l'aperçu de votre outil ou en local tant que vous n'avez pas déployé, puis sur l'URL publique dès la leçon 9.
2. **Testée** : vous avez déroulé les critères d'acceptation à la main, avec les bons rôles (un compte coach, un compte client), y compris un cas d'erreur.
3. **Commitée** : le code est enregistré dans Git et envoyé sur GitHub (leçon 2), avec un message qui explique le changement.

Vous pouvez ajouter vos propres conditions : « aucune erreur dans la console du navigateur », « lisible sur mobile », « règles de sécurité vérifiées ». Moins de conditions bien tenues valent mieux qu'une longue liste ignorée.

## Deux sprints de build

Pour un MVP, deux sprints suffisent généralement si le périmètre a été bien réduit au M01 :

| Sprint | Objectif (une phrase) | Contenu type pour Créno |
| --- | --- | --- |
| Build 1 | « Le parcours clé fonctionne de bout en bout, sans paiement réel » | Dépôt Git, base Supabase et règles de sécurité, connexion, publication de créneaux, réservation, « Mes réservations » |
| Build 2 | « Le MVP est en ligne et utilisable par de vrais utilisateurs » | Paiement, rappel automatique la veille, finitions, gestion des erreurs, déploiement Vercel, démo |

L'**objectif de sprint** tient en une phrase et sert d'arbitre : quand une idée surgit en cours de route (« et si j'ajoutais un chat ? »), vous la notez dans le backlog et vous vous demandez si elle sert l'objectif. Si ce n'est pas le cas, elle attend.

## Le tableau Notion

Reprenez votre backlog Notion du M01 (une base de données) et ajoutez-y une vue **Tableau** (Kanban) groupée par statut : *À faire*, *En cours*, *À tester*, *Fini*. Ajoutez trois propriétés : **Sprint** (Build 1, Build 2, Plus tard), **Critères d'acceptation** (texte) et **Commit / lien** (URL). Filtrez la vue sur le sprint en cours : vous ne voyez que ce qui compte maintenant.

Limitez la colonne *En cours* à une ou deux stories. Commencer beaucoup de choses donne une impression d'avancement, mais seule la colonne *Fini* compte.

## Le rituel quotidien : dix minutes

Seul ou en binôme, prenez dix minutes au début de chaque session de travail, sur le modèle de la mêlée quotidienne de Scrum (*Daily Scrum*) :

- Qu'ai-je terminé depuis la dernière session (au sens de la définition de « fini ») ?
- Quelle story vais-je terminer aujourd'hui ?
- Qu'est-ce qui me bloque, et qui ou quoi peut m'aider ?

Notez les réponses en deux lignes dans un journal de bord (une page Notion suffit). Ce journal vous servira pour la revue de sprint (leçon 10) et pour expliquer vos choix au formateur.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Si vous découvrez la gestion de projet digital

Estimer la durée d'une tâche que l'on n'a jamais faite est difficile, pour tout le monde. Ne cherchez pas la précision : classez simplement chaque story en **petite** (une session), **moyenne** (deux sessions) ou **grosse** (à redécouper). Après le premier sprint, comparez avec ce qui s'est réellement passé : c'est ainsi que l'on apprend à estimer.

Prévoyez aussi du temps d'apprentissage dans vos sprints. Dans ce module, vous découvrez plusieurs outils à la fois ; il est normal que les premières stories prennent deux à trois fois plus de temps que les dernières. Si votre disponibilité est réduite, allongez la durée des sprints plutôt que de charger chaque journée.
`,
        },
        {
          type: "ressource",
          resourceId: "res_scope_mvp",
          note: "Reprenez votre canevas de scope MVP : seules les fonctionnalités de la colonne « indispensable » entrent dans les sprints de build.",
        },
        {
          type: "checklist",
          title: "Votre définition de « fini »",
          items: [
            "La story fonctionne dans l'aperçu de l'outil ou en local, puis sur l'URL publique une fois déployée",
            "Chaque critère d'acceptation a été vérifié à la main avec le bon rôle",
            "Au moins un cas d'erreur a été testé (champ vide, accès interdit, créneau complet…)",
            "Aucune erreur rouge dans la console du navigateur sur les écrans concernés",
            "Le code est commité avec un message clair et envoyé sur GitHub",
            "La carte Notion est passée en « Fini » avec le lien du commit",
          ],
        },
        {
          type: "exercice",
          title: "Planifier vos deux sprints de build",
          instructions: `
Préparez le tableau de build de **votre projet** dans Notion.

1. Rédigez l'objectif de chacun des deux sprints en une phrase (inspirez-vous du tableau Créno).
2. Découpez votre backlog en **8 à 15 user stories livrables**, au format « En tant que…, je veux…, afin de… ».
3. Pour chaque story du sprint Build 1, écrivez 2 à 5 critères d'acceptation vérifiables.
4. Classez chaque story : Build 1, Build 2 ou Plus tard. Soyez sévère : tout ce qui ne sert pas le parcours clé part dans « Plus tard ».
5. Écrivez votre définition de « fini » en haut de la page (au moins les trois conditions de la leçon).
6. Fixez les dates de début et de fin de chaque sprint dans votre agenda.

Livrable : le lien de votre page Notion (partagée en lecture) ou, à défaut, une copie texte de votre tableau.
`,
          deliverable: "lien",
          estimatedMinutes: 25,
          review: "auto",
          rubric: [
            "Chaque sprint a un objectif formulé en une phrase",
            "Les stories sont des tranches verticales livrables, pas des couches techniques",
            "Les stories du sprint Build 1 ont des critères d'acceptation vérifiables",
            "La définition de « fini » contient au minimum : fonctionne en ligne, testé, commité",
            "Le périmètre est réaliste : les fonctionnalités secondaires sont classées « Plus tard »",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── L02
    {
      key: "m06-l02",
      title: "Git et GitHub pour ne jamais perdre son travail",
      summary:
        "Versionner votre projet avec Git, le sauvegarder sur GitHub, protéger vos secrets et revenir en arrière quand l'IA a tout cassé.",
      estimatedMinutes: 60,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, votre projet sera versionné sur GitHub, vos secrets seront protégés et vous saurez revenir à une version qui fonctionne en quelques minutes.

## Pourquoi c'est indispensable avec l'IA

Un outil d'IA peut modifier vingt fichiers en une seule réponse. Quand le résultat est bon, tant mieux. Quand il casse ce qui marchait, vous devez pouvoir revenir en arrière **immédiatement**. C'est le rôle de Git : un historique complet de votre projet, où chaque étape validée est enregistrée et restaurable.

## Le vocabulaire en une table

| Terme | Définition |
| --- | --- |
| **Git** | Logiciel de gestion de versions, installé sur votre ordinateur ou intégré à vos outils |
| **Dépôt** (*repository*, *repo*) | Le dossier du projet et tout son historique |
| **Commit** | Un instantané enregistré du projet, avec un message qui explique le changement |
| **Branche** | Une ligne de travail parallèle ; la branche principale s'appelle souvent \`main\` |
| **GitHub** | Service en ligne qui héberge vos dépôts : sauvegarde, collaboration, déploiement |
| **Push / pull** | Envoyer vos commits vers GitHub / récupérer ceux qui y sont |
| **Pull request** (PR) | Une demande de fusion d'une branche dans une autre, avec la liste des modifications à relire |
| **Merge** | La fusion effective d'une branche dans une autre |

## Les commandes essentielles

Si vous utilisez un terminal (seul, dans Cursor ou avec Claude Code), voici l'essentiel. Les outils graphiques font exactement la même chose avec des boutons.

\`\`\`bash
git init                          # transformer un dossier en dépôt (une seule fois)
git status                        # voir ce qui a changé depuis le dernier commit
git diff                          # voir le détail ligne à ligne des changements
git add .                         # préparer tous les changements pour le prochain commit
git commit -m "feat: le coach publie un créneau"   # enregistrer l'instantané
git log --oneline                 # lister l'historique des commits
git switch -c reservation-client  # créer une branche et s'y placer
git switch main                   # revenir sur la branche principale
git push -u origin main           # envoyer la branche vers GitHub (la 1re fois)
git push                          # envoyer les commits suivants
git pull                          # récupérer les changements depuis GitHub
\`\`\`

Avant chaque \`git add .\`, lancez \`git status\` et lisez la liste : c'est là que vous repérez un fichier qui n'a rien à faire dans le dépôt.

## Le fichier .gitignore et le fichier .env

Le fichier \`.gitignore\`, à la racine du projet, liste ce que Git doit ignorer. Pour un projet Next.js, il contient au minimum :

\`\`\`text
node_modules/
.next/
.env
.env*.local
\`\`\`

Le fichier \`.env\` (ou \`.env.local\`) contient vos **variables d'environnement** : l'adresse de votre projet Supabase, vos clés d'API, vos secrets de webhook. **Il ne doit jamais être versionné.** Un dépôt peut devenir public par erreur, être partagé avec un prestataire ou lu par un outil tiers : tout ce qui est dans l'historique doit être considéré comme potentiellement exposé.

> [!warning] Si un secret a été commité, le supprimer du fichier ne suffit pas : il reste dans l'historique. Régénérez immédiatement la clé concernée dans le service d'origine (Supabase, Stripe, fournisseur de LLM…), puis mettez à jour vos variables d'environnement.

Bonne pratique : versionnez un fichier \`.env.example\` qui liste les noms des variables, sans leurs valeurs. N'importe qui (vous dans six mois, un agent de code, un associé) sait alors quoi configurer.

## Des messages de commit utiles

Un message de commit se lit dans six semaines, quand vous cherchez à comprendre pourquoi quelque chose a cassé. Écrivez ce qui change **et** pourquoi, en une ligne :

- Mauvais : « update », « fix », « modifs Claude ».
- Bon : « feat: le client annule une réservation confirmée », « fix: les créneaux passés ne s'affichent plus », « chore: ajoute .env.example ».

Le préfixe (\`feat\`, \`fix\`, \`chore\`, \`docs\`) suit une convention répandue appelée *Conventional Commits* ; elle est facultative mais rend l'historique lisible. Commitez **souvent** : à chaque story terminée, et avant chaque demande importante à l'IA.

## Revenir en arrière

| Situation | Commande | Effet |
| --- | --- | --- |
| Vous voulez annuler des modifications non commitées d'un fichier | \`git restore chemin/du/fichier\` | Le fichier revient à son état du dernier commit |
| Vous voulez tout annuler depuis le dernier commit | \`git restore .\` | Tous les fichiers suivis reviennent au dernier commit |
| Un commit déjà envoyé a introduit un bug | \`git revert IDENTIFIANT\` | Crée un nouveau commit qui annule le précédent, sans réécrire l'historique |
| Vous voulez juste regarder une ancienne version | \`git switch --detach IDENTIFIANT\` puis \`git switch main\` | Vous consultez sans rien modifier |

L'identifiant d'un commit s'obtient avec \`git log --oneline\`. Méfiez-vous de \`git reset --hard\` et de \`git push --force\` : ils effacent du travail. Si un outil d'IA vous les propose, demandez-lui d'abord ce qui sera perdu.

## Relier votre outil de build à GitHub

- **Bolt.new** : selon les options disponibles au moment où vous l'utilisez, l'outil permet d'exporter le projet (téléchargement des fichiers) et/ou de le connecter à un dépôt GitHub. Cherchez ces options dans le menu du projet et consultez la documentation de Bolt.
- **Cursor** : c'est un éditeur de code ; il intègre un panneau de gestion de versions (voir les changements, commiter, pousser) et un terminal où vous pouvez taper les commandes ci-dessus.
- **Claude Code** et **Codex** : ces agents peuvent exécuter les commandes Git pour vous (commit, branche, parfois pull request). Gardez la validation : lisez le message de commit proposé et la liste des fichiers avant d'accepter.

Dans tous les cas, votre dépôt GitHub est **privé** par défaut pour un projet commercial. Vous l'ouvrirez éventuellement plus tard, en connaissance de cause.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Votre parcours sans terminal

Vous n'êtes pas obligé d'apprendre les commandes. Votre objectif : **une sauvegarde versionnée sur GitHub à chaque story terminée**.

1. Créez un compte sur [GitHub](https://github.com). Si Bolt.new propose de créer le dépôt lui-même lors de la connexion, laissez-le faire et vérifiez qu'il est **privé** ; sinon, créez un dépôt privé depuis GitHub (bouton « New repository »).
2. Dans Bolt.new, cherchez l'option de connexion à GitHub ou d'export du projet. Si la connexion directe est disponible, chaque sauvegarde pourra être envoyée au dépôt ; sinon, téléchargez le projet et déposez les fichiers via l'interface web de GitHub (« Add file », puis « Upload files »).
3. Avant tout envoi, vérifiez qu'aucun fichier \`.env\` ne fait partie du lot. S'il y en a un, retirez-le et vérifiez que le \`.gitignore\` contient bien la ligne \`.env\`.
4. Sur GitHub, l'onglet des commits vous montre l'historique ; cliquer sur un commit affiche les lignes ajoutées (en vert) et supprimées (en rouge). Prenez l'habitude d'y jeter un œil : vous comprendrez vite ce que l'IA a changé.

Si vous préférez une application à l'interface web, **GitHub Desktop** propose les mêmes opérations (commit, push, historique, retour arrière) avec des boutons.

> [!tip] Avant de demander à Bolt.new une modification importante, sauvegardez l'état actuel (commit ou export). Si la modification tourne mal, vous repartez de cette version au lieu de demander à l'outil de « réparer » en boucle.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Un flux de branches simple et discipliné

Même seul, travaillez comme en équipe : c'est ce qui rend la collaboration avec un agent de code maîtrisable.

1. \`main\` reste **toujours déployable**. Personne n'y commite directement, ni vous ni l'agent. Si votre offre GitHub le permet pour un dépôt privé, activez une règle de protection de branche (fusion via PR obligatoire) ; sinon, tenez-vous-en à la discipline.
2. Une **branche par story** : \`git switch -c feat/reservation-client\`. L'agent travaille sur cette branche, par petits commits.
3. Une **PR par story** : vous relisez le diff complet dans l'interface de GitHub, comme si un collègue l'avait écrit. La description de la PR reprend les critères d'acceptation et la façon de tester.
4. Quand Vercel sera branché (leçon 9), chaque PR aura son **déploiement de prévisualisation** : vous testez la story en ligne avant de fusionner.
5. Fusionnez en *squash* (tous les commits de la branche regroupés en un seul) pour garder un \`main\` lisible, puis supprimez la branche.

La CLI \`gh\` de GitHub permet de créer et consulter les PR depuis le terminal ; Claude Code et Codex savent l'utiliser si elle est installée et authentifiée. Ajoutez un fichier \`.env.example\` et, si possible, une vérification automatique (lint, typecheck, build) déclenchée sur chaque PR avec GitHub Actions : c'est votre filet de sécurité contre les régressions introduites par l'IA.
`,
        },
        {
          type: "quiz",
          title: "Vérifiez vos acquis sur Git",
          questions: [
            {
              prompt: "Vous venez de commiter et de pousser un fichier .env contenant votre clé secrète Supabase. Que faites-vous en priorité ?",
              options: [
                { label: "Je supprime le fichier et je fais un nouveau commit" },
                { label: "Je régénère la clé dans Supabase, je mets à jour mes variables, puis je retire le fichier et je complète le .gitignore", correct: true },
                { label: "Je passe le dépôt en privé, cela suffit" },
                { label: "Rien, le dépôt est privé" },
              ],
              explanation:
                "La clé reste lisible dans l'historique Git même après suppression du fichier. Seule sa régénération la rend inutilisable.",
            },
            {
              prompt: "Un commit déjà poussé sur GitHub a cassé la réservation. Quelle est l'option la plus sûre ?",
              options: [
                { label: "git revert suivi de l'identifiant du commit fautif", correct: true },
                { label: "git reset --hard puis git push --force" },
                { label: "Supprimer le dépôt et en recréer un" },
                { label: "Demander à l'IA de corriger sans regarder l'historique" },
              ],
              explanation:
                "git revert crée un nouveau commit qui annule le précédent sans réécrire l'historique partagé : rien n'est perdu.",
            },
            {
              prompt: "Quel message de commit est le plus utile ?",
              options: [
                { label: "update" },
                { label: "modifs Claude du mardi" },
                { label: "fix: un créneau complet n'est plus réservable", correct: true },
                { label: "wip" },
              ],
              explanation: "Un bon message dit ce qui change et pourquoi, pour être compris des semaines plus tard.",
            },
            {
              prompt: "À quoi sert une pull request ?",
              options: [
                { label: "À télécharger le code depuis GitHub" },
                { label: "À proposer la fusion d'une branche, avec un diff à relire avant de l'intégrer", correct: true },
                { label: "À supprimer une branche" },
                { label: "À déployer automatiquement en production" },
              ],
              explanation:
                "La PR présente les modifications d'une branche pour relecture et discussion avant leur fusion.",
            },
          ],
        },
        {
          type: "exercice",
          title: "Mettre votre projet sous Git et sur GitHub",
          instructions: `
Mettez **votre projet** à l'abri, avec le parcours adapté à votre outil.

1. Créez un dépôt **privé** sur GitHub.
2. Reliez-y votre projet (export ou connexion depuis Bolt.new, panneau Git de Cursor, commandes dans le terminal, ou Claude Code / Codex en validant chaque commande).
3. Vérifiez le \`.gitignore\` : \`.env\`, \`.env*.local\`, \`node_modules/\` et \`.next/\` (si Next.js) doivent y figurer. Créez un \`.env.example\` avec les noms des variables, sans valeurs.
4. Réalisez au moins **trois commits** avec des messages utiles (par exemple : initialisation, ajout du \`.env.example\`, première story).
5. Entraînez-vous au retour arrière : modifiez un fichier, puis annulez la modification (\`git restore\`, bouton « Discard » de votre outil ou restauration d'une version précédente).
6. Si vous êtes à l'aise : créez une branche, faites-y un commit et ouvrez une pull request vers \`main\`.

Livrable : collez l'URL de votre dépôt, la liste de vos derniers commits (sortie de \`git log --oneline\` ou copie de l'onglet des commits sur GitHub) et le contenu de votre \`.gitignore\`.
`,
          deliverable: "texte",
          estimatedMinutes: 35,
          review: "auto",
          rubric: [
            "Le dépôt existe, il est privé et contient le projet",
            "Aucun fichier .env n'est versionné ; le .gitignore couvre les secrets et les dossiers générés",
            "Un .env.example liste les variables sans leurs valeurs",
            "Au moins trois commits avec des messages explicites",
            "Le retour arrière a été pratiqué au moins une fois",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── L03
    {
      key: "m06-l03",
      title: "Mettre en place Supabase",
      summary:
        "Créer votre projet Supabase, traduire votre modèle de données en tables, activer la RLS avec des politiques relues, configurer l'authentification et prouver avec deux comptes que chacun ne voit que ce qu'il doit voir.",
      estimatedMinutes: 80,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, votre base Supabase contiendra les tables de votre modèle de données, protégées par des règles de sécurité que vous aurez relues et testées avec deux comptes.

## Créer le projet

Sur [Supabase](https://supabase.com/docs), créez un projet. Trois choix comptent :

- **La région** : choisissez-la proche de vos utilisateurs. Pour des utilisateurs en France, une région européenne simplifie aussi la conformité RGPD (M08).
- **Le mot de passe de la base** : générez-le, rangez-le dans un gestionnaire de mots de passe. Jamais dans un prompt ni dans le code.
- **Un projet suffit** pour démarrer. Avec de vrais utilisateurs, ajoutez un projet « de test » pour ne pas expérimenter sur leurs données.

## Les clés : publique ou secrète

Supabase fournit deux types de clés (leur nom exact dépend de l'ancienneté du projet) :

| Clé | Nom selon les projets | Où l'utiliser |
| --- | --- | --- |
| Publique | *anon* ou *publishable* | Navigateur et serveur. Elle peut être visible : ce sont les politiques RLS qui protègent les données |
| Secrète | *service_role* ou *secret* | Serveur uniquement (routes serveur, n8n, webhooks). Elle **ignore la RLS** : elle donne accès à tout |

Une clé secrète dans le navigateur, c'est votre base entière offerte à n'importe quel visiteur : régénérez-la aussitôt.

## Des tables à partir de votre modèle de données

Voici la traduction en SQL du modèle de Créno (M04). Les **contraintes** (clés étrangères, valeurs autorisées, prix positifs) empêchent des données incohérentes, même si l'interface a un bug.

\`\`\`sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('coach', 'client')),
  full_name text not null
);

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  price_cents integer not null check (price_cents >= 0),
  capacity integer not null default 1 check (capacity > 0)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.slots (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled'))
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  provider_ref text,
  status text not null default 'pending'
);
\`\`\`

Montants en **centimes** (entiers, sans erreur d'arrondi), dates en \`timestamptz\` (avec fuseau horaire). La table \`profiles\` prolonge \`auth.users\`, où Supabase Auth range les comptes.

## Activer la RLS et écrire les politiques

La **RLS** (*Row Level Security*, sécurité au niveau des lignes) est un mécanisme de PostgreSQL : pour chaque table, des **politiques** décident quelles lignes chaque utilisateur peut lire ou modifier. Dans Supabase, \`auth.uid()\` renvoie l'identifiant de l'utilisateur connecté.

RLS activée sans politique : personne n'accède à rien avec la clé publique. RLS désactivée : **tout le monde** accède à tout. Activez-la sur chaque table, sans exception.

\`\`\`sql
alter table public.profiles enable row level security;
alter table public.slots    enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;

-- Profils : chacun lit le sien (les autres cas seront ajoutés ensuite)
create policy "profiles_select_self" on public.profiles
  for select to authenticated using (id = auth.uid());

-- Créneaux : lisibles par les utilisateurs connectés, créés et modifiés par leur coach
create policy "slots_select" on public.slots
  for select to authenticated using (true);
create policy "slots_insert_coach" on public.slots
  for insert to authenticated with check (
    coach_id = auth.uid()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.role = 'coach')
  );
create policy "slots_update_own" on public.slots
  for update to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- Réservations : le client voit les siennes, le coach celles de ses créneaux
create policy "bookings_select" on public.bookings
  for select to authenticated using (
    client_id = auth.uid()
    or exists (select 1 from public.slots s
               where s.id = bookings.slot_id and s.coach_id = auth.uid())
  );
create policy "bookings_insert_own" on public.bookings
  for insert to authenticated
  with check (client_id = auth.uid() and status = 'pending');
\`\`\`

Sans la vérification du rôle dans \`slots_insert_coach\`, un client pourrait publier un créneau à son nom : c'est l'oubli typique que seul un test révèle. Ce qui **manque volontairement** : aucune écriture utilisateur sur \`payments\`, ni de passage d'une réservation à \`confirmed\`. Ces opérations se feront côté serveur, avec la clé secrète, après vérification du paiement. Complétez le reste (profils, annulation, lecture des paiements) avec l'IA, puis relisez.

## Générer le SQL avec l'IA, puis le relire

Donnez à l'IA votre modèle de données (M04) et la matrice des droits : qui peut lire, créer, modifier, supprimer quoi. Puis relisez chaque politique en vous posant quatre questions :

1. Chaque table a-t-elle la RLS activée ?
2. Chaque politique \`insert\` ou \`update\` a-t-elle un \`with check\` qui empêche d'écrire au nom de quelqu'un d'autre ?
3. Un utilisateur peut-il modifier une colonne sensible (son rôle, un statut, un montant) ?
4. Y a-t-il une politique \`using (true)\` sur des données personnelles ?

## Configurer l'authentification

Dans la configuration des URL de la section Authentification :

- **Site URL** : l'adresse de votre application (pour l'instant \`http://localhost:3000\` ou l'URL d'aperçu de votre outil).
- **Redirect URLs** : les adresses autorisées après connexion ou clic dans un email. Une adresse absente de la liste fait échouer la connexion. Vous ajouterez l'URL de production à la leçon 9.
- **Fournisseurs** : commencez par l'email (mot de passe ou lien magique). Le service d'envoi d'emails intégré est prévu pour les tests : pour la production, la documentation recommande de configurer votre propre service SMTP.
`,
        },
        {
          type: "video",
          title: "Supabase pas à pas : tables, RLS et test avec deux comptes",
          durationMinutes: 7,
          script: `
- Ouverture : le schéma de données de Créno (profils, créneaux, réservations, paiements) et la matrice des droits coach / client.
- Création du projet : région, mot de passe rangé dans un gestionnaire, repérage des clés publique et secrète.
- Exécution du script de création des tables ; lecture des contraintes dans l'éditeur de tables.
- Activation de la RLS et ajout des politiques ; démonstration d'une table sans politique qui renvoie une liste vide.
- Configuration de l'authentification : Site URL, Redirect URLs, fournisseur email.
- Test en direct : connexion coach, publication d'un créneau ; connexion client dans une fenêtre privée, réservation ; le client tente de lire une réservation d'un autre compte et échoue.
- Conclusion : les quatre questions de relecture d'une politique générée par l'IA.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Des migrations versionnées avec la CLI Supabase

Une **migration** est un fichier SQL horodaté qui décrit une évolution du schéma. Versionnées dans Git, les migrations permettent de reconstruire la base à l'identique (nouvel environnement, projet de test, collègue) et de relire chaque changement dans une PR. Règle d'or : on n'édite jamais une migration déjà appliquée ; on en crée une nouvelle.

\`\`\`bash
npx supabase init                         # crée le dossier supabase/ dans le projet
npx supabase login                        # authentifie la CLI
npx supabase link --project-ref VOTRE_REF # relie le dossier au projet distant
npx supabase migration new creer_tables   # crée supabase/migrations/HORODATAGE_creer_tables.sql
# écrivez (ou faites écrire) le SQL dans ce fichier, relisez-le, commitez-le
npx supabase db push                      # applique au projet distant les migrations manquantes
npx supabase gen types typescript --linked > lib/database.types.ts
\`\`\`

Les types générés donnent à TypeScript (et à votre agent de code) la forme exacte de vos tables : les requêtes vers une colonne inexistante sont signalées avant l'exécution. Pour développer sans toucher au projet distant, la CLI peut aussi lancer une pile Supabase locale (elle nécessite Docker) et rejouer toutes les migrations ; consultez le guide *Local development* de la documentation. Vérifiez les options exactes des commandes avec \`npx supabase --help\` : elles évoluent.
`,
        },
        {
          type: "texte",
          personas: ["non_tech", "reconversion"],
          markdown: `
## Sans terminal : l'éditeur SQL et Bolt.new

Vous pouvez tout faire depuis le tableau de bord Supabase :

1. Ouvrez l'**éditeur SQL**, collez le script relu, exécutez-le. Vérifiez ensuite dans l'**éditeur de tables** que les tables et colonnes existent, et que chacune est marquée comme protégée par la RLS.
2. **Versionnez quand même vos scripts** : enregistrez chaque script exécuté, dans l'ordre, dans un dossier \`supabase/migrations\` de votre projet (\`001_tables.sql\`, \`002_rls.sql\`…) ou, à défaut, dans une page Notion datée. Ne modifiez jamais un ancien script : si vous devez changer une table, écrivez un nouveau script.
3. Si vous utilisez **Bolt.new**, son intégration avec Supabase permet de relier votre projet à votre base ; l'outil peut alors proposer de créer ou modifier des tables et générer le SQL correspondant. **Lisez chaque script avant de l'accepter**, avec les quatre questions de relecture. Consultez la documentation de Bolt pour la procédure de connexion à jour.

> [!info] Le tableau de bord et l'éditeur SQL agissent avec des droits d'administrateur : ils ignorent la RLS. Voir une ligne dans l'éditeur ne prouve rien sur ce que voit un utilisateur. Les tests de sécurité se font depuis l'application, connecté avec chaque compte.
`,
        },
        {
          type: "prompt",
          title: "Générer le schéma et les politiques RLS à partir de votre modèle",
          tool: "Tout assistant IA",
          prompt: `
Tu es expert PostgreSQL et Supabase. Génère le SQL de création de mon schéma et de ses politiques RLS.

Contexte produit : [décrivez votre produit en 2 phrases].

Modèle de données (issu de mon architecture) :
[collez vos entités, leurs champs, leurs types et leurs relations — sans aucune donnée réelle ni clé]

Matrice des droits :
[pour chaque rôle et chaque table : lire / créer / modifier / supprimer, et à quelles conditions]

Contraintes :
- tables dans le schéma public, identifiants uuid, dates en timestamptz, montants en centimes (integer) ;
- contraintes check et clés étrangères partout où c'est pertinent ;
- RLS activée sur TOUTES les tables ; une politique par opération, nommée clairement ;
- chaque insert/update a un with check qui empêche d'écrire au nom d'un autre utilisateur ;
- les opérations sensibles (paiements, changement de statut après paiement) ne sont PAS ouvertes aux utilisateurs : elles seront faites côté serveur.

Livre : 1) le script des tables, 2) le script RLS, 3) un tableau « politique → ce qu'elle autorise → ce qu'elle interdit », 4) la liste des risques ou choix que je dois valider moi-même.
`,
          tips:
            "Relisez la liste des risques en premier : c'est là que l'IA signale ce qu'elle n'a pas pu décider. Testez ensuite chaque ligne du tableau avec vos deux comptes.",
        },
        {
          type: "texte",
          markdown: `
## Tester avec deux comptes

Une politique non testée est une hypothèse. Créez au moins deux comptes (idéalement trois) : un coach et deux clients pour Créno. Utilisez une fenêtre de navigation privée ou un second navigateur pour être connecté avec deux comptes en même temps.

| Test | Résultat attendu |
| --- | --- |
| Le coach A publie un créneau | Le créneau apparaît |
| Le client B réserve ce créneau | La réservation apparaît dans « Mes réservations » de B |
| Le client C consulte ses réservations | Il ne voit pas celle de B |
| Le coach A consulte ses réservations | Il voit celle de B sur son créneau |
| Le client B tente de créer un créneau | Refus |
| Le client B tente de passer sa réservation en « confirmée » | Refus |

Notez chaque résultat. Un refus ne ressemble pas toujours à une erreur : en lecture ou en modification, la RLS renvoie souvent **aucune ligne** (liste vide, zéro ligne modifiée) ; en création, une erreur mentionne la *row-level security*. Les deux sont normaux quand le test attend un refus ; vérifiez donc toujours l'état réel des données après un test de modification.

Si votre interface n'existe pas encore, notez ces tests comme critères d'acceptation dans Notion et déroulez-les après la leçon 4.

> [!tip] Après chaque changement de schéma, consultez les conseillers (*advisors*) de sécurité du tableau de bord Supabase : ils signalent notamment les tables sans RLS.
`,
        },
        {
          type: "checklist",
          title: "Supabase prêt pour le build",
          items: [
            "Projet créé dans une région adaptée, mot de passe de base rangé dans un gestionnaire",
            "Tables créées à partir du modèle de données, avec contraintes et clés étrangères",
            "RLS activée sur toutes les tables, politiques relues avec les quatre questions",
            "Aucune écriture utilisateur possible sur les paiements ni sur les statuts sensibles",
            "Clé publique dans les variables de l'application ; clé secrète réservée au serveur",
            "Site URL et Redirect URLs configurées pour l'environnement local ou d'aperçu",
            "Scripts SQL versionnés dans l'ordre (migrations ou dossier dédié)",
            "Matrice de tests à deux comptes écrite et, si possible, déjà déroulée",
          ],
        },
        {
          type: "exercice",
          title: "Votre base Supabase sécurisée",
          instructions: `
Mettez en place la base de **votre projet**.

1. Créez le projet Supabase et configurez l'authentification (Site URL, Redirect URLs, fournisseur email).
2. Générez avec l'IA le SQL des tables et des politiques RLS à partir de votre modèle de données du M04 (prompt ci-dessus). Relisez-le avec les quatre questions et corrigez ce qui doit l'être.
3. Appliquez-le (migration via la CLI, éditeur SQL ou intégration de Bolt.new) et versionnez les scripts.
4. Écrivez votre matrice de tests à deux comptes (au moins 6 lignes, dont au moins 3 refus attendus) et déroulez tout ce qui peut déjà l'être.

Livrable (texte) :
- le script SQL final (tables + RLS), **sans aucune clé ni donnée réelle** ;
- votre matrice de tests avec les résultats obtenus (ou « à tester après la leçon 4 ») ;
- en 3 à 5 lignes : ce que vous avez corrigé dans le SQL proposé par l'IA, et pourquoi.
`,
          deliverable: "texte",
          estimatedMinutes: 45,
          review: "formateur",
          rubric: [
            "Les tables traduisent fidèlement le modèle de données, avec contraintes et clés étrangères",
            "La RLS est activée sur toutes les tables et chaque écriture a un with check pertinent",
            "Les opérations sensibles (paiements, statuts) ne sont pas ouvertes aux utilisateurs",
            "La matrice de tests couvre au moins deux rôles et des cas de refus",
            "L'apprenant explique au moins une correction apportée au SQL généré par l'IA",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── L04
    {
      key: "m06-l04",
      title: "Construire le parcours clé",
      summary:
        "Construire, story par story, le parcours clé de votre MVP avec la boucle spécification, plan, génération, relecture, test et commit, dans l'outil adapté à votre profil.",
      estimatedMinutes: 100,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, le parcours clé de votre MVP fonctionnera en local ou dans l'aperçu de votre outil, construit story par story avec une méthode qui vous garde maître du code produit.

## Le parcours clé d'abord

Le **parcours clé** est l'enchaînement minimal d'écrans et d'actions qui délivre la promesse de votre produit. Pour Créno : le coach se connecte et publie un créneau ; le client se connecte, voit les créneaux disponibles, réserve, puis retrouve sa réservation dans « Mes réservations ». Le paiement et le rappel s'y ajouteront ensuite (sprint Build 2), sur la base de votre plan d'intégration du M04 et de la leçon 7.

Tout ce qui n'est pas sur ce chemin attend : page « À propos », profil détaillé, tableau de bord statistique, mode sombre. Un parcours clé qui fonctionne de bout en bout, même austère, vaut plus que dix écrans soignés qui ne mènent nulle part.

## La boucle de build

Chaque story passe par la même boucle. Elle paraît lente au début ; elle est en réalité le chemin le plus court, parce qu'elle évite les longues séances de réparation.

| Étape | Ce que vous faites | Exemple Créno : « le client réserve un créneau » |
| --- | --- | --- |
| 1. Spécification | Vous écrivez la story, ses critères d'acceptation et ses contraintes | « Bouton Réserver sur chaque créneau futur ; réservation créée au statut pending ; message de confirmation ; erreur claire si non connecté » |
| 2. Plan | Vous demandez à l'IA un plan **sans code** et vous le validez | Fichiers touchés, requête à la base, cas d'erreur prévus |
| 3. Génération | L'IA produit le code, **une étape du plan à la fois** | D'abord l'action de réservation, puis le bouton |
| 4. Relecture | Vous lisez ce qui a changé et demandez des explications sur ce que vous ne comprenez pas | « Pourquoi ce fichier a-t-il été modifié ? » |
| 5. Test | Vous déroulez les critères d'acceptation, avec les bons comptes, et un cas d'erreur | Réserver avec le client B ; vérifier que le client C ne voit rien |
| 6. Commit | Vous enregistrez la version qui fonctionne (leçon 2) | « feat: le client réserve un créneau » |

Si le test échoue, vous revenez à l'étape 3 avec l'erreur exacte (leçon 6). Si l'échec persiste, vous revenez à l'étape 2 : le plan était peut-être mauvais.

## Écrire une bonne spécification

La qualité du code généré dépend d'abord de la clarté de la demande. Une spécification de story contient :

- **Le contexte** : le produit en une phrase, la stack, les tables concernées (avec leurs vrais noms de colonnes).
- **La story et ses critères d'acceptation**, copiés depuis votre tableau Notion.
- **Les contraintes** : ne pas créer de nouvelle table, ne pas ajouter de bibliothèque sans demander, respecter la RLS, textes de l'interface en français.
- **Ce qui est hors périmètre** : « ne touche pas à la page de connexion ».

Vous avez appris au M02 à structurer un prompt pour du code : c'est le moment de l'appliquer à chaque story.

## Relire sans être développeur, relire en tant que développeur

Relire ne veut pas dire tout comprendre ligne à ligne. Pour chaque génération, vérifiez au minimum :

- **Le périmètre** : les fichiers modifiés correspondent-ils à la story ? Un changement inattendu dans un fichier sans rapport est un signal d'alerte.
- **Les données** : les noms de tables et de colonnes existent-ils vraiment dans votre base ?
- **Les secrets** : aucune clé écrite en dur, aucune clé secrète côté navigateur.
- **Les erreurs** : que se passe-t-il si la base ne répond pas, si l'utilisateur n'est pas connecté, si le champ est vide ?

Quand un point vous échappe, demandez : « Explique-moi en langage simple ce que fait ce fichier et pourquoi tu l'as modifié. » Une IA qui ne sait pas justifier une modification vous indique souvent qu'elle n'était pas nécessaire.

## Quand l'outil tourne en rond

Tous les outils, quel que soit votre profil, finissent un jour par boucler : la même erreur revient après plusieurs corrections, chaque réparation casse autre chose, des fichiers entiers sont réécrits pour un petit changement. La règle : **après deux ou trois tentatives infructueuses sur le même problème, arrêtez de demander « corrige ».**

1. Revenez à la dernière version qui fonctionnait (commit, historique de l'outil).
2. Demandez un **diagnostic sans modification** : « Liste les causes possibles et comment vérifier chacune ; ne modifie aucun fichier. »
3. Redécoupez la story en une étape plus petite.
4. Ouvrez une nouvelle conversation avec un résumé propre : le but, ce qui marche, l'erreur exacte, ce qui a été tenté.
5. Si le blocage dépasse une session, sollicitez le formateur ou la communauté, avec votre journal de bord.
`,
        },
        {
          type: "video",
          title: "Une story de Créno de bout en bout avec la boucle de build",
          durationMinutes: 8,
          script: `
- Point de départ : la carte Notion « le client réserve un créneau » et ses critères d'acceptation.
- Rédaction de la spécification : contexte, tables et colonnes, contraintes, hors périmètre.
- Demande de plan sans code ; correction d'une étape inutile proposée par l'IA (ajout d'une bibliothèque).
- Génération de la première étape ; relecture des fichiers modifiés ; question « pourquoi ce fichier ? ».
- Test avec deux comptes dans deux fenêtres ; découverte d'un cas d'erreur non géré (utilisateur déconnecté) ; retour à la génération avec l'erreur exacte.
- Test réussi, commit avec un message clair, carte déplacée en « Fini » avec le lien du commit.
- Montage en parallèle : la même story dans Bolt.new puis avec un agent de code, pour montrer que la boucle est identique.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Votre parcours avec Bolt.new : des prompts successifs

Avec Bolt.new, vous construisez par **prompts successifs**, un par story. Ne demandez jamais « crée-moi toute l'application Créno » : vous obtiendriez une coquille brillante, difficile à corriger.

Commencez par un **prompt de contexte**, que vous reprendrez en tête de chaque nouvelle conversation (voir le modèle ci-dessous). Puis enchaînez, en testant et en sauvegardant entre chaque étape :

1. **Connexion** : « Mets en place l'inscription et la connexion par email avec Supabase Auth. À l'inscription, l'utilisateur choisit coach ou client ; crée sa ligne dans la table profiles (id, role, full_name). Ne crée aucune autre page. »
2. **Publication d'un créneau** : « Crée la page Mes créneaux, visible uniquement par les coachs : un formulaire (date, heure de début, heure de fin, prix en euros, capacité) qui insère dans slots (prix converti en centimes dans price_cents), puis la liste des créneaux à venir du coach connecté. »
3. **Liste pour le client** : « Crée la page Créneaux disponibles pour les clients : créneaux futurs triés par date, avec heure, durée et prix en euros. »
4. **Réservation** : « Ajoute un bouton Réserver sur chaque créneau : il insère dans bookings (slot_id, client_id = utilisateur connecté, status pending) et affiche un message de confirmation. Affiche une erreur claire si l'insertion échoue. »
5. **Mes réservations** : « Crée la page Mes réservations du client : date, heure, statut en français, bouton Annuler qui passe le statut à cancelled. »

Après chaque prompt : lisez le résumé des modifications, ouvrez l'aperçu, testez avec vos deux comptes, sauvegardez (leçon 2), déplacez la carte Notion.

## Reprendre la main dans Bolt.new

Trois réflexes spécifiques :

- **Revenez en arrière plutôt que d'empiler les corrections.** Utilisez la version sauvegardée ou l'historique du projet si l'outil en propose un.
- **Faites diagnostiquer avant de faire corriger.** Si l'outil propose un mode discussion sans modification du code, utilisez-le pour comprendre la cause ; sinon, écrivez explicitement « ne modifie rien, explique d'abord ».
- **Faites vous-même les petits changements.** Un texte, une couleur, un libellé se modifient directement dans le code affiché : vous économisez une génération et vous apprenez à vous repérer dans les fichiers.

Si l'outil insiste pour créer une table ou modifier une politique de sécurité, refusez tant que vous n'avez pas relu le SQL proposé (leçon 3).
`,
        },
        {
          type: "prompt",
          personas: ["non_tech"],
          title: "Prompt de contexte pour chaque conversation Bolt.new",
          tool: "Bolt.new",
          prompt: `
Contexte du projet (à respecter pour toute la conversation) :
- Produit : [nom], [promesse en une phrase]. Utilisateurs : [rôles].
- Base de données : Supabase, déjà connecté. Tables existantes (ne crée AUCUNE autre table sans me le demander) :
[table 1 : colonnes et types]
[table 2 : colonnes et types]
- Sécurité : la RLS est activée. N'utilise jamais de clé secrète dans le navigateur. Ne désactive jamais la RLS.
- Interface : en français, sobre, lisible sur mobile.
- Méthode : une seule story par demande. Avant de coder, présente un plan en 3 à 6 étapes et la liste des fichiers que tu vas modifier, puis attends mon accord.

Story du jour : [copiez la story et ses critères d'acceptation depuis Notion].
Hors périmètre : [ce qu'il ne faut pas toucher].
`,
          tips:
            "Gardez ce prompt dans une page Notion et mettez à jour la liste des tables à chaque migration. Collez-le en tête de chaque nouvelle conversation.",
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Votre parcours avec Next.js, React et Supabase

Stack : Next.js (App Router), React, TypeScript, Supabase, code assisté par Cursor ou Claude Code. Une structure lisible pour Créno :

\`\`\`text
app/
  layout.tsx                  structure commune (en-tête, navigation)
  login/page.tsx              connexion
  coach/creneaux/page.tsx     le coach publie et liste ses créneaux
  creneaux/page.tsx           le client voit les créneaux disponibles
  creneaux/actions.ts         actions serveur : réserver, annuler
  creneaux/book-button.tsx    composant client : formulaire de réservation
  reservations/page.tsx       « Mes réservations »
lib/supabase/server.ts        client Supabase côté serveur
lib/supabase/client.ts        client Supabase côté navigateur
lib/database.types.ts         types générés (leçon 3)
\`\`\`

Les fichiers \`lib/supabase/*\` et la gestion de session : **copiez-les depuis le guide officiel Supabase pour Next.js** (rendu côté serveur, paquet \`@supabase/ssr\`), ne les faites pas inventer. Le guide inclut un fichier à la racine qui rafraîchit la session ; selon votre version de Next.js, il s'appelle \`middleware.ts\` ou \`proxy.ts\`. Pointez votre agent vers ces guides et vers la documentation de votre version de Next.js.

### Charger les données côté serveur

Les pages sont des **composants serveur** par défaut : la requête part du serveur avec la session de l'utilisateur, donc la RLS s'applique, et aucune clé secrète n'est nécessaire.

\`\`\`tsx
// app/creneaux/page.tsx
import { createClient } from "@/lib/supabase/server";
import { BookButton } from "./book-button";

export default async function CreneauxPage() {
  const supabase = await createClient();
  const { data: slots, error } = await supabase
    .from("slots")
    .select("id, starts_at, ends_at, price_cents")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw new Error("Chargement des créneaux impossible"); // capté par error.tsx
  if (!slots?.length) return <p>Aucun créneau disponible pour le moment.</p>;

  return (
    <ul>
      {slots.map((slot) => (
        <li key={slot.id}>
          {new Date(slot.starts_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} ·{" "}
          {(slot.price_cents / 100).toFixed(2)} €
          <BookButton slotId={slot.id} />
        </li>
      ))}
    </ul>
  );
}
\`\`\`

### Modifier les données avec une action serveur

\`\`\`ts
// app/creneaux/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type State = { error?: string; ok?: boolean };

export async function bookSlot(_prev: State, formData: FormData): Promise<State> {
  const slotId = formData.get("slotId");
  if (typeof slotId !== "string" || !slotId) return { error: "Créneau manquant." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Connectez-vous pour réserver." };

  const { error } = await supabase
    .from("bookings")
    .insert({ slot_id: slotId, client_id: user.id, status: "pending" });

  if (error) {
    console.error("bookSlot", error.message); // visible dans les logs serveur
    return { error: "La réservation a échoué. Réessayez." };
  }
  revalidatePath("/reservations");
  return { ok: true };
}
\`\`\`

\`\`\`tsx
// app/creneaux/book-button.tsx
"use client";

import { useActionState } from "react";
import { bookSlot } from "./actions";

export function BookButton({ slotId }: { slotId: string }) {
  const [state, formAction, pending] = useActionState(bookSlot, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="slotId" value={slotId} />
      <button disabled={pending}>{pending ? "Réservation…" : "Réserver"}</button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.ok && <p>Réservation enregistrée.</p>}
    </form>
  );
}
\`\`\`

### Les règles qui comptent

- **Une action serveur est un point d'entrée public** : elle peut être appelée directement par une requête POST. Vérifiez l'utilisateur et ses droits dans chaque action, même si l'interface masque le bouton. La RLS reste votre seconde ligne de défense.
- **Erreurs attendues** (champ invalide, non connecté) : renvoyées comme état et affichées dans le formulaire. **Erreurs inattendues** : levées et captées par un fichier \`error.tsx\` (composant client) ; ajoutez \`loading.tsx\` pour l'attente. Les props exactes de ces fichiers varient selon les versions : vérifiez la documentation de la vôtre.
- **Validez les entrées** côté serveur (manuellement ou avec une bibliothèque de schémas si elle est déjà dans le projet).
- **Dates** : formatez-les avec un fuseau explicite (\`Europe/Paris\`, comme ci-dessus) ; le serveur de production ne tourne pas forcément dans votre fuseau.
- **Piège de la capacité** : avec la session du client, la RLS ne lui montre que ses propres réservations ; il ne peut donc pas compter les places restantes. Il faut une fonction SQL dédiée ou une vue qui n'expose que ce nombre, ajoutée par migration et relue avec soin.
- Lancez \`npm run lint\` et \`npm run build\` (ou leurs équivalents) avant chaque commit : le build attrape beaucoup d'erreurs de types introduites par l'IA.
`,
        },
        {
          type: "prompt",
          personas: ["tech"],
          title: "Implémenter une story avec un agent de code",
          tool: "Claude Code",
          prompt: `
Story : [copiez la story et ses critères d'acceptation].

Contexte : lis d'abord CLAUDE.md (ou AGENTS.md), docs/architecture.md et lib/database.types.ts. Stack : Next.js App Router, React, TypeScript, Supabase avec RLS.

Contraintes :
- données chargées dans des composants serveur ; mutations dans des actions serveur qui vérifient l'utilisateur ;
- aucune nouvelle dépendance, aucune modification du schéma (si c'est nécessaire, propose une migration séparée et arrête-toi) ;
- aucune clé secrète côté client ; textes d'interface en français ;
- hors périmètre : [fichiers ou pages à ne pas toucher].

Étape 1 : propose un plan (fichiers créés ou modifiés, requêtes, cas d'erreur) sans écrire de code, puis attends ma validation.
Étape 2 (après validation) : implémente l'étape 1 du plan seulement, lance le lint et le build, et résume le diff.
`,
          tips:
            "Le même prompt fonctionne dans le mode agent de Cursor ou avec Codex : remplacez simplement le nom du fichier de contexte. Refusez tout plan qui touche des fichiers hors de la story.",
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Votre rythme et vos points de contrôle

Construire son premier produit en même temps qu'on apprend ses outils demande de l'endurance plus que du génie. Organisez-vous en **sessions de 45 à 60 minutes**, une story par session, avec une pause entre deux.

| Point de contrôle | Vous pouvez le cocher quand… |
| --- | --- |
| 1. Connexion | Vous vous connectez avec deux comptes de rôles différents |
| 2. Création | Le rôle « fournisseur » (le coach, pour Créno) crée l'objet principal |
| 3. Consultation | Le rôle « client » voit ces objets, et seulement ceux qu'il doit voir |
| 4. Action clé | Le client réalise l'action principale (réserver, pour Créno) |
| 5. Suivi | Le client retrouve le résultat de son action |

Si vous restez bloqué plus de 30 minutes sur un même problème, appliquez la méthode de la leçon 6, puis demandez de l'aide avec votre journal de bord : ce n'est pas un échec, c'est la façon normale de travailler, y compris pour les développeurs expérimentés. Notez aussi chaque point de contrôle franchi : vous mesurerez vos progrès semaine après semaine.
`,
        },
        {
          type: "ressource",
          personas: ["non_tech", "reconversion"],
          resourceId: "res_stack_nocode",
          note: "Pour retrouver les forces et limites de Bolt.new, Supabase et des autres outils au moment de bloquer ou d'arbitrer.",
        },
        {
          type: "checklist",
          title: "Avant de passer une story en « Fini »",
          items: [
            "La spécification et le plan ont été écrits avant la génération",
            "Les fichiers modifiés correspondent au périmètre de la story",
            "Les noms de tables et de colonnes utilisés existent dans la base",
            "Aucune clé en dur, aucune clé secrète côté navigateur",
            "Les critères d'acceptation passent avec les deux rôles, cas d'erreur compris",
            "Le commit est fait avec un message clair et la carte Notion est à jour",
          ],
        },
        {
          type: "exercice",
          title: "Votre parcours clé fonctionnel en local",
          instructions: `
Construisez le parcours clé de **votre projet**, story par story, avec la boucle de build.

1. Listez les stories du parcours clé (issues de votre sprint Build 1) : 3 à 6 en général.
2. Pour chacune : spécification, plan validé, génération par étapes, relecture, test avec les bons comptes, commit.
3. Tenez votre journal de bord : pour chaque story, une ligne sur ce qui a bien marché et une sur ce qui a bloqué.
4. Quand le parcours complet fonctionne, déroulez-le une dernière fois d'une traite, avec deux comptes, en commençant par une base propre (ou des données de test réalistes).

Livrable : **un lien**, au choix :
- le lien de votre dépôt GitHub (accès en lecture donné au formateur si le dépôt est privé), avec dans le fichier README les étapes pour tester le parcours ;
- ou le lien d'une capture vidéo de 2 à 4 minutes qui montre le parcours complet avec les deux rôles.

Ajoutez en commentaire la liste de vos stories avec leur statut, et une difficulté rencontrée avec la façon dont vous l'avez résolue.
`,
          deliverable: "lien",
          estimatedMinutes: 65,
          review: "formateur",
          rubric: [
            "Le parcours clé fonctionne de bout en bout avec au moins deux rôles distincts",
            "Chaque rôle ne voit et ne modifie que ce qui le concerne",
            "Les erreurs courantes (non connecté, champ vide, échec d'enregistrement) sont gérées avec un message clair",
            "L'historique Git montre des commits réguliers, un par story, avec des messages utiles",
            "La difficulté rencontrée est analysée et la solution est expliquée",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── L05
    {
      key: "m06-l05",
      title: "Travailler avec un agent de code",
      summary:
        "Piloter Claude Code, Codex ou le mode agent de Cursor comme un développeur junior très rapide : contexte, plan, petites tâches, relecture de chaque diff, tests et permissions maîtrisées.",
      estimatedMinutes: 70,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez confier une tâche à un agent de code, contrôler ce qu'il fait à chaque étape et repérer les erreurs qu'il commet le plus souvent.

## Qu'est-ce qu'un agent de code ?

Un assistant conversationnel vous propose du code que vous copiez. Un **agent de code** agit lui-même dans votre projet : il lit les fichiers, les modifie, exécute des commandes (installation, tests, build), lit les résultats et recommence jusqu'à atteindre l'objectif. Il est donc beaucoup plus productif, et beaucoup plus capable de faire des dégâts s'il est mal encadré.

Pensez-le comme un **développeur junior très rapide** : compétent, infatigable, mais sans mémoire de votre projet, parfois trop sûr de lui, et prêt à « simplifier » une règle de sécurité pour que ça marche.

| Outil | Où il travaille | Points forts | Points de vigilance |
| --- | --- | --- | --- |
| Claude Code | Terminal, extensions d'éditeur, interfaces web ou de bureau selon les options | Lit tout le dépôt, exécute commandes et tests, mode plan, permissions réglables, fichier de contexte \`CLAUDE.md\` | Les permissions doivent être réglées avec soin ; les longues sessions accumulent du contexte |
| Codex | Ligne de commande, extension d'éditeur, agent dans le cloud relié à GitHub | Peut travailler sur plusieurs tâches en parallèle et proposer des pull requests ; fichier \`AGENTS.md\` | Une tâche lancée dans le cloud doit être relue comme une PR d'un inconnu |
| Cursor (mode agent) | Dans l'éditeur | Diff affiché dans l'éditeur, acceptation fichier par fichier, choix du modèle, règles de projet | Il est tentant de tout accepter d'un clic |

Les capacités de ces outils évoluent très vite : vérifiez leur documentation au moment de les utiliser. Les principes ci-dessous, eux, restent valables.

## 1. Donner du contexte

L'agent ne sait rien de votre projet au démarrage. Donnez-lui un **fichier de contexte** à la racine du dépôt, lu automatiquement : \`CLAUDE.md\` pour Claude Code, \`AGENTS.md\` pour Codex (et d'autres outils), règles de projet pour Cursor. Il pointe vers vos documents du M01 et du M04 (PRD, architecture, modèle de données), que vous rangez dans un dossier \`docs/\`.

\`\`\`markdown
## Projet
Créno : réservation et paiement de séances pour coachs sportifs indépendants.
Rôles : coach (publie des créneaux), client (réserve, paie, annule).

## Stack
Next.js (App Router), React, TypeScript, Supabase (Postgres, Auth, RLS), Vercel.

## Règles
- Lire docs/architecture.md et docs/data-model.md avant toute tâche.
- Données chargées côté serveur ; mutations dans des actions serveur qui vérifient l'utilisateur.
- Jamais de clé secrète côté client ; ne jamais désactiver la RLS.
- Toute évolution du schéma = nouvelle migration dans supabase/migrations.
- Aucune nouvelle dépendance sans accord explicite.
- Avant de rendre la main : npm run lint, npm run build, npm test.
\`\`\`

Court et précis vaut mieux que long : l'agent relit ce fichier à chaque session. Ajoutez-y une règle chaque fois que vous corrigez deux fois la même erreur.

> [!tip] Certains frameworks fournissent leur propre fichier pour agents. Next.js, dans ses versions récentes, peut générer un \`AGENTS.md\` qui renvoie l'agent vers la documentation installée avec le projet, donc correspondant à votre version. Vérifiez dans la documentation de Next.js.

## 2. Demander un plan avant le code

Exigez un plan avant toute modification : fichiers touchés, étapes, risques. Claude Code propose un mode plan ; avec les autres outils, écrivez simplement « propose un plan, ne modifie rien ». Un plan se corrige en trente secondes ; un code parti dans la mauvaise direction coûte une heure.

## 3. Des tâches petites et vérifiables

Une tâche est bien dimensionnée si vous pouvez vérifier le résultat en quelques minutes : une story, voire une étape de story. « Ajoute le bouton Annuler dans Mes réservations » est vérifiable ; « améliore l'application » ne l'est pas.

## 4. Relire chaque diff

Un **diff** est la liste des lignes ajoutées et supprimées. Lisez-le entièrement avant d'accepter ou de commiter, avec la checklist de cette leçon. Si le diff est trop long pour être relu, la tâche était trop grosse : annulez et redécoupez.

## 5. Faire écrire et lancer les tests

Un **test automatisé** est un petit programme qui vérifie qu'une fonction ou un parcours se comporte comme prévu. Demandez à l'agent d'écrire les tests correspondant aux critères d'acceptation, de les lancer et de vous montrer le résultat. Surveillez un travers classique : pour « faire passer » un test, un agent peut modifier le test lui-même ou supprimer une vérification. Interdisez-le explicitement.

## 6. Garder la main sur les permissions

Ces outils demandent votre accord avant de modifier des fichiers ou d'exécuter des commandes, et permettent d'automatiser certaines autorisations. Autorisez sans confirmation les commandes sans risque (lint, tests, build) ; gardez la confirmation pour tout le reste : installation de paquets, suppression de fichiers, commandes Git qui réécrivent l'historique, accès au réseau, déploiement. Ne lancez jamais un agent en mode entièrement automatique dans un dossier qui contient des secrets de production.

## 7. Repartir d'une conversation propre

Plus une conversation est longue, plus l'agent mélange les consignes anciennes et récentes. Après chaque story terminée et commitée, ouvrez une nouvelle conversation (\`/clear\` dans Claude Code, nouvelle conversation dans Cursor ou Codex). Si vous devez reprendre un travail en cours, demandez d'abord un résumé de l'état, puis collez-le dans la nouvelle conversation.

## Les erreurs typiques et comment les repérer

| Erreur | Signal dans le diff | Parade |
| --- | --- | --- |
| Modifications trop larges | Des fichiers sans rapport avec la tâche sont modifiés ou reformatés | Hors périmètre explicite ; refusez et redécoupez |
| API inventées ou périmées | Fonction ou option introuvable dans la documentation ; erreur au build | Pointez vers la documentation officielle de votre version ; exigez le build |
| Dépendances inutiles | Nouveau paquet dans \`package.json\` pour trois lignes de code | Règle « aucune dépendance sans accord » |
| Failles de sécurité | Clé secrète côté client, RLS désactivée, politique \`using (true)\`, action sans vérification de l'utilisateur | Checklist de relecture, question « quel utilisateur peut appeler ceci ? » |
| Tests truqués | Test modifié ou supprimé dans le même diff que le code | Interdiction explicite ; relire les fichiers de test |
`,
        },
        {
          type: "prompt",
          title: "Démarrer une session : faire lire le contexte",
          tool: "Claude Code",
          prompt: `
Avant toute chose, lis CLAUDE.md, docs/PRD.md, docs/architecture.md et docs/data-model.md, puis parcours la structure du dépôt.

Ne modifie aucun fichier. Réponds avec :
1. un résumé du projet en 5 lignes ;
2. la stack et les conventions que tu devras respecter ;
3. les incohérences ou manques que tu repères entre la documentation et le code ;
4. les questions que tu me poses avant de commencer.
`,
          tips:
            "Si le résumé est faux ou incomplet, corrigez le fichier de contexte plutôt que la conversation : la correction servira à toutes les sessions suivantes.",
        },
        {
          type: "prompt",
          title: "Confier une petite tâche vérifiable avec ses tests",
          tool: "Codex",
          prompt: `
Tâche : [une story ou une étape de story, avec ses critères d'acceptation].

1. Propose d'abord un plan : fichiers créés ou modifiés, étapes, risques. Attends ma validation.
2. Après validation, écris les tests qui traduisent les critères d'acceptation, puis le code.
3. Lance le lint, les tests et le build ; montre-moi les résultats.
4. Règles : ne modifie ni ne supprime aucun test existant ; n'ajoute aucune dépendance ; ne touche pas au schéma de la base ; ne modifie aucun fichier hors de ce périmètre : [liste].
5. Termine par un résumé du diff : fichier par fichier, ce qui a changé et pourquoi.
`,
          tips:
            "Ce prompt vaut aussi pour Claude Code et le mode agent de Cursor. Si l'agent propose une dépendance, demandez-lui ce qu'il faudrait écrire sans elle avant d'accepter.",
        },
        {
          type: "prompt",
          title: "Faire relire un diff sous l'angle de la sécurité",
          tool: "Cursor",
          prompt: `
Relis les modifications non commitées de ce projet comme un relecteur exigeant, sans rien modifier.

Pour chaque fichier modifié, indique :
- si la modification est nécessaire à la tâche [décrivez la tâche] ;
- les risques de sécurité : clé secrète exposée au navigateur, action serveur ou route sans vérification de l'utilisateur et de ses droits, politique RLS trop permissive, données personnelles envoyées à un service externe ;
- les appels d'API ou options dont tu n'es pas certain qu'ils existent dans les versions installées (vérifie dans package.json) ;
- les cas d'erreur non gérés.

Classe tes remarques : bloquant, à corriger, suggestion.
`,
          tips:
            "Une seconde lecture par une IA ne remplace pas la vôtre, mais attrape souvent ce qu'on ne voit plus après une longue session. Idéalement, faites-la dans une conversation neuve.",
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Industrialiser le travail avec l'agent

- **Tests d'abord** : écrivez vous-même (ou faites écrire puis relisez) un test qui échoue, puis demandez à l'agent de le faire passer sans le modifier. Un test unitaire (par exemple avec Vitest) pour la logique pure — calcul de places restantes, conversion de prix — et un test de parcours dans le navigateur (par exemple avec Playwright) pour le parcours clé.
- **Vérification automatique sur chaque PR** : lint, typecheck, tests et build dans GitHub Actions. L'agent voit l'échec et le corrige ; vous ne fusionnez qu'au vert.
- **Permissions en liste blanche** : autorisez explicitement les commandes de vérification, bloquez la lecture des fichiers \`.env\` si votre outil le permet, gardez la confirmation pour le reste.
- **Parallélisme maîtrisé** : deux agents sur deux branches (ou deux copies de travail) pour deux stories indépendantes, jamais sur les mêmes fichiers.
- **Types générés** depuis Supabase (leçon 3) dans le contexte : c'est le meilleur antidote aux colonnes inventées.
`,
        },
        {
          type: "texte",
          personas: ["non_tech", "reconversion"],
          markdown: `
## Un agent de code sans être développeur ?

C'est possible, avec une condition : **ne jamais accepter ce que vous ne pouvez pas vérifier**. Vous ne relirez pas chaque ligne comme un développeur, mais vous pouvez toujours contrôler le périmètre (quels fichiers ?), les secrets (aucune clé en dur), les dépendances (nouveau paquet ?) et le résultat (les critères d'acceptation passent-ils ?).

Certains agents s'utilisent depuis une interface web reliée à GitHub : ils travaillent sur une branche et vous proposent une pull request que vous relisez sur GitHub avant de la fusionner. C'est une façon confortable de profiter d'un agent sans terminal, à condition de tester la branche avant la fusion.

Si vous construisez avec Bolt.new, les mêmes principes s'appliquent : contexte en tête de conversation, plan avant le code, une story à la fois, relecture du résumé des modifications.
`,
        },
        {
          type: "checklist",
          title: "Relire un diff d'agent en cinq minutes",
          items: [
            "Chaque fichier modifié a un lien direct avec la tâche demandée",
            "Aucun test existant n'a été modifié ou supprimé sans raison validée",
            "Aucune nouvelle dépendance n'apparaît dans package.json sans accord",
            "Aucune clé ni URL secrète écrite en dur, aucune clé secrète côté navigateur",
            "Chaque action serveur ou route vérifie l'utilisateur et ses droits",
            "Aucune politique RLS désactivée ou élargie à using (true) sur des données personnelles",
            "Le lint, les tests et le build passent",
            "Vous savez expliquer en une phrase ce que fait chaque fichier modifié",
          ],
        },
        {
          type: "quiz",
          title: "Vérifiez vos réflexes avec un agent de code",
          questions: [
            {
              prompt: "L'agent a fait passer un test qui échouait. Dans le diff, vous voyez que le fichier de test a été modifié. Que faites-vous ?",
              options: [
                { label: "J'accepte : les tests passent" },
                { label: "Je lis la modification du test ; si elle affaiblit la vérification, je refuse et j'interdis explicitement de modifier les tests", correct: true },
                { label: "Je supprime tous les tests pour éviter le problème" },
                { label: "Je relance l'agent avec la même demande" },
              ],
              explanation:
                "Modifier le test pour le faire passer est un travers connu des agents. Le test doit refléter les critères d'acceptation, pas le code.",
            },
            {
              prompt: "Le diff proposé touche 23 fichiers pour ajouter un bouton Annuler. Quelle est la meilleure réaction ?",
              options: [
                { label: "Accepter, l'agent sait ce qu'il fait" },
                { label: "Accepter puis tester" },
                { label: "Refuser, revenir à l'état précédent et redemander avec un périmètre explicite et un plan", correct: true },
                { label: "Accepter seulement les fichiers que je comprends" },
              ],
              explanation:
                "Un diff impossible à relire signale une tâche mal cadrée. Accepter partiellement peut laisser le projet incohérent.",
            },
            {
              prompt: "Quelle commande pouvez-vous raisonnablement autoriser sans confirmation ?",
              options: [
                { label: "L'installation de nouveaux paquets" },
                { label: "Le lancement du lint et des tests", correct: true },
                { label: "Un push forcé sur la branche principale" },
                { label: "Le déploiement en production" },
              ],
              explanation:
                "Les commandes de vérification n'ont pas d'effet de bord. Tout ce qui modifie l'environnement, l'historique ou la production doit rester sous votre contrôle.",
            },
            {
              prompt: "Pourquoi repartir d'une conversation propre après chaque story ?",
              options: [
                { label: "Parce que l'agent oublie tout au bout d'une heure" },
                { label: "Parce qu'une longue conversation mélange consignes anciennes et récentes et dégrade la précision", correct: true },
                { label: "Parce que c'est obligatoire pour commiter" },
                { label: "Pour effacer l'historique Git" },
              ],
              explanation:
                "Le contexte accumulé brouille les consignes. Le fichier de contexte et un résumé suffisent à redémarrer proprement.",
            },
          ],
        },
        {
          type: "exercice",
          title: "Votre fichier de contexte et une story avec un agent",
          instructions: `
1. Rédigez le fichier de contexte de **votre projet** (\`CLAUDE.md\`, \`AGENTS.md\` ou règles Cursor ; ou, avec Bolt.new, votre prompt de contexte de la leçon 4) : projet, rôles, stack, règles, commandes de vérification, liens vers vos documents. 15 à 30 lignes.
2. Faites-le lire à l'agent avec le prompt de démarrage de session ; corrigez le fichier d'après son résumé.
3. Confiez-lui une story de votre sprint en cours avec le prompt « petite tâche vérifiable ».
4. Relisez le diff avec la checklist. Notez tout ce que vous avez refusé ou fait corriger.
5. Testez, commitez, ouvrez une nouvelle conversation.

Livrable (texte) : votre fichier de contexte, le plan proposé par l'agent (et vos corrections), et la liste de ce que vous avez refusé ou fait corriger lors de la relecture, avec la raison.
`,
          deliverable: "texte",
          estimatedMinutes: 40,
          review: "auto",
          rubric: [
            "Le fichier de contexte est court, précis et contient des règles vérifiables",
            "Un plan a été demandé et amendé avant toute génération",
            "La tâche confiée est petite et vérifiable",
            "La relecture du diff a conduit à au moins une décision argumentée (refus, correction ou validation motivée)",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── L06
    {
      key: "m06-l06",
      title: "Débugger avec l'IA",
      summary:
        "Une méthode pour résoudre un bug au lieu de le subir : lire l'erreur, reproduire, isoler avec les bons outils, puis donner à l'IA exactement le contexte dont elle a besoin.",
      estimatedMinutes: 60,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez localiser l'origine d'un bug avec la console, l'onglet réseau et les logs, et rédiger une demande de débogage qui aboutit du premier coup plus souvent qu'autrement.

## Un bug, c'est un écart

Un **bug** est un écart entre ce qui devrait se passer et ce qui se passe. Le décrire ainsi (« attendu : … ; observé : … ») est déjà la moitié du travail. « Ça ne marche pas » ne permet à personne, humain ou IA, de vous aider.

La méthode tient en cinq temps : **lire, reproduire, isoler, diagnostiquer, corriger et vérifier.** Le réflexe à perdre : coller « corrige » dans la conversation à chaque erreur. Il mène tout droit à la boucle décrite à la leçon 4.

## 1. Lire le message d'erreur

Un message d'erreur contient presque toujours trois informations : le **type** d'erreur, le **message** lui-même et l'**emplacement** (fichier et numéro de ligne). Sous le message, la **pile d'appels** (*stack trace*) liste les fonctions traversées : cherchez-y la première ligne qui concerne **vos** fichiers plutôt que ceux des bibliothèques.

Les erreurs les plus fréquentes sur un projet comme Créno :

| Symptôme | Cause probable |
| --- | --- |
| Erreur mentionnant « row-level security » à la création d'une ligne | Politique d'insertion manquante, ou \`with check\` non respecté (mauvais \`client_id\`, rôle non autorisé) |
| Liste vide alors que les données existent dans le tableau de bord | Politique de lecture manquante, utilisateur non connecté côté serveur, ou mauvais filtre |
| Clé invalide, URL manquante, variable \`undefined\` | Variable d'environnement absente, mal nommée, ou serveur non redémarré après modification |
| Table ou colonne « does not exist » | Nom inventé par l'IA ou migration non appliquée |
| Après connexion, retour vers une mauvaise adresse ou erreur de redirection | URL absente des *Redirect URLs* de Supabase |
| Erreur d'hydratation (rendu serveur et navigateur différents) | Souvent une date ou une heure formatée différemment sur le serveur et dans le navigateur |

## 2. Reproduire

Un bug que vous ne savez pas reproduire ne peut pas être corrigé de façon fiable. Notez les **étapes exactes** : quel compte, quelles données, quelle page, quelle action, quel navigateur. Refaites-les. Si le bug n'apparaît qu'une fois sur deux, notez ce qui change entre les essais (compte, heure, données).

## 3. Isoler : où le problème se situe-t-il ?

Une application web a plusieurs couches : l'interface dans le navigateur, le serveur (actions, routes), la base de données, les services externes. Vos outils pour savoir laquelle est en cause :

- **La console du navigateur** (outils de développement, touche F12 ou clic droit puis « Inspecter », onglet *Console*) : erreurs JavaScript et messages de l'interface.
- **L'onglet Réseau** (*Network*) : chaque requête envoyée, son **code de statut** et sa réponse. Les codes \`2xx\` indiquent un succès, \`401\` une absence d'authentification, \`403\` une interdiction, \`404\` une ressource introuvable, \`5xx\` une erreur côté serveur. Cliquez sur la requête en erreur et lisez la réponse : le vrai message s'y trouve souvent.
- **Les logs serveur** : le terminal où tourne votre application en local, puis les logs d'exécution de Vercel une fois déployé (leçon 9). C'est là qu'apparaissent vos \`console.error\` côté serveur.
- **Les logs Supabase** : le tableau de bord donne accès aux journaux de l'API, de la base de données et de l'authentification. Utile quand l'interface n'affiche qu'une erreur générique.

Deux techniques d'isolement très efficaces :

- **Revenir au dernier état qui marchait** : grâce à Git, testez le commit précédent. Si le bug disparaît, il a été introduit par les changements entre les deux : le diff vous montre où chercher.
- **Réduire** : retirez ce qui n'est pas nécessaire pour reproduire (autre page, autre donnée) jusqu'au cas minimal.

## 4. Diagnostiquer avec l'IA : le bon contexte

L'IA diagnostique bien quand elle a les bons éléments, et invente quand elle ne les a pas. Fournissez toujours :

1. **L'erreur exacte**, copiée telle quelle (pas résumée), avec la pile d'appels.
2. **Les étapes** pour reproduire, et « attendu / observé ».
3. **Le code concerné** : les fichiers en cause (ou leur chemin, pour un agent qui peut les lire), la politique RLS ou la requête si la base est en jeu.
4. **Ce que vous avez déjà tenté** et le résultat, pour éviter qu'elle vous propose la même chose.
5. **L'environnement** : local ou déployé, et les versions des bibliothèques principales (dans \`package.json\`).

Demandez d'abord un **diagnostic** (causes possibles classées, et comment vérifier chacune), pas une correction. Vérifiez la cause, puis demandez le correctif le plus petit possible.

> [!warning] Avant de coller des logs ou une configuration, masquez les clés, jetons, mots de passe et données personnelles (emails, noms, téléphones). Remplacez-les par des valeurs fictives : l'IA n'en a pas besoin pour diagnostiquer.

## 5. Corriger et vérifier

Après la correction : refaites les étapes de reproduction, puis les critères d'acceptation de la story concernée (une correction casse parfois autre chose). Commitez avec un message \`fix:\` qui décrit le bug. Notez-le dans votre journal : cause, symptôme, solution. Si le même type d'erreur revient, ajoutez une règle dans votre fichier de contexte (leçon 5).
`,
        },
        {
          type: "prompt",
          title: "Gabarit de demande de débogage",
          tool: "Tout assistant IA",
          prompt: `
Je débogue une application [stack : ex. Next.js + Supabase / Bolt.new + Supabase].

Attendu : [ce qui devrait se passer]
Observé : [ce qui se passe]

Étapes pour reproduire :
1. [compte utilisé (rôle), page, action]
2. […]

Erreur exacte (copiée telle quelle, secrets et données personnelles masqués) :
[message + pile d'appels, ou réponse de la requête dans l'onglet Réseau, ou extrait de log]

Code concerné :
[fichiers, fonction, requête ou politique RLS en cause]

Déjà tenté :
- [tentative 1] → [résultat]
- [tentative 2] → [résultat]

Environnement : [local / déployé], versions : [bibliothèques principales].

Ne corrige rien pour l'instant. Donne-moi :
1. les causes possibles, de la plus probable à la moins probable ;
2. pour chacune, comment vérifier en moins de 5 minutes ;
3. les informations qui te manquent.
`,
          tips:
            "Une fois la cause confirmée, demandez « le correctif le plus petit possible, sans toucher à d'autres fichiers ». Avec un agent de code, remplacez le code collé par les chemins des fichiers.",
        },
        {
          type: "texte",
          personas: ["non_tech", "reconversion"],
          markdown: `
## Déboguer dans Bolt.new ou un outil similaire

- **Où voir les erreurs** : l'outil affiche en général les erreurs de construction et d'exécution dans son propre panneau ou terminal. Pour la console et l'onglet Réseau, ouvrez l'aperçu dans un nouvel onglet puis ouvrez les outils de développement du navigateur (F12).
- **La correction automatique** : si l'outil propose de corriger une erreur d'un clic, essayez une fois. Si l'erreur revient ou se transforme, arrêtez et appliquez la méthode de cette leçon.
- **Les erreurs Supabase** : quand un écran reste vide, regardez dans l'onglet Réseau la requête vers Supabase. Une réponse vide avec un statut \`200\` signifie souvent « la RLS a filtré » : relisez la politique de lecture (leçon 3), vérifiez que vous êtes connecté avec le bon compte.
- **Écrire vous-même les faits** : même si vous ne comprenez pas le message, vous pouvez toujours le copier exactement, décrire vos étapes et ce que vous avez tenté. C'est ce qui fait la différence.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Outils du développeur

- **Erreurs Supabase** : l'objet \`error\` renvoyé par le client contient en général un code, un message et parfois des détails et un indice. Loggez-les côté serveur (jamais la clé) ; le code \`42501\` de PostgreSQL correspond à un refus de privilège, typiquement la RLS.
- **Débogueur** : l'éditeur (Cursor comme VS Code) permet de poser des points d'arrêt dans le code serveur ; la documentation Next.js décrit la configuration de débogage. Plus fiable qu'une série de \`console.log\`.
- **\`git bisect\`** : une commande qui teste automatiquement l'historique par dichotomie pour trouver le commit qui a introduit le bug. Précieuse quand l'agent a fait beaucoup de petits commits.
- **Reproduire hors de l'interface** : appelez vos routes avec \`curl\` ou un client HTTP ; testez vos politiques RLS avec deux jetons d'utilisateurs différents.
- **Faire écrire un test qui reproduit le bug** avant de le corriger : il échoue, le correctif le fait passer, et la régression ne reviendra pas silencieusement.
`,
        },
        {
          type: "checklist",
          title: "La méthode de débogage",
          items: [
            "J'ai écrit « attendu / observé » en une phrase chacun",
            "Je sais reproduire le bug avec des étapes précises",
            "J'ai regardé la console, l'onglet Réseau et les logs concernés",
            "J'ai identifié la couche en cause (interface, serveur, base, service externe)",
            "J'ai fourni à l'IA l'erreur exacte, les étapes, le code et ce que j'ai déjà tenté, sans secret",
            "J'ai demandé un diagnostic avant une correction",
            "Après correction, j'ai retesté la story entière et commité avec un message fix:",
          ],
        },
        {
          type: "exercice",
          title: "Votre journal de débogage",
          instructions: `
Pendant votre build, documentez la résolution de **deux bugs réels** de votre projet (si vous n'en avez pas encore rencontré, provoquez-en un : retirez temporairement une politique RLS de lecture, ou renommez une variable d'environnement, puis diagnostiquez-le comme si vous ne connaissiez pas la cause).

Pour chaque bug, rédigez :
1. Attendu / observé.
2. Étapes de reproduction.
3. Ce que vous avez observé dans la console, l'onglet Réseau ou les logs (message exact, secrets masqués).
4. La demande envoyée à l'IA (gabarit de la leçon).
5. La cause réelle et le correctif appliqué.
6. Ce que vous ajoutez à votre fichier de contexte ou à vos critères d'acceptation pour éviter qu'il revienne.

Livrable (texte) : vos deux fiches de bug.
`,
          deliverable: "texte",
          estimatedMinutes: 35,
          review: "auto",
          rubric: [
            "Chaque bug est décrit en attendu / observé avec des étapes reproductibles",
            "Au moins un outil d'observation (console, réseau, logs) a été utilisé et son résultat est cité",
            "La demande à l'IA contient l'erreur exacte, le code concerné et les tentatives, sans secret",
            "La cause réelle est identifiée et une mesure de prévention est proposée",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── L07
    {
      key: "m06-l07",
      title: "Automatiser avec n8n (et Airtable)",
      summary:
        "Construire des workflows n8n fiables — déclencheurs, nœuds, données, erreurs — avec l'exemple du rappel la veille de la séance, un suivi dans Airtable et des webhooks sécurisés.",
      estimatedMinutes: 70,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous aurez construit un workflow n8n qui s'exécute tout seul, gère ses erreurs et ne laisse passer aucun appel non autorisé.

## Quand automatiser plutôt que coder

**n8n** est un outil d'automatisation : vous assemblez visuellement des **workflows**, des enchaînements d'étapes qui relient vos services (base de données, email, Airtable, API). Il existe en version hébergée par l'éditeur ou auto-hébergée ; consultez [la documentation](https://docs.n8n.io) pour les options à jour.

Automatisez avec n8n ce qui se passe **autour** de votre application : rappels, notifications, synchronisation vers un outil de suivi, rapports. Gardez dans le code de l'application ce qui fait partie de l'expérience utilisateur immédiate (réserver, payer, afficher). Pour Créno, le rappel de la veille est un cas d'école : il ne dépend d'aucune action de l'utilisateur au moment où il part.

## Les concepts

- **Déclencheur** (*trigger*) : ce qui démarre le workflow. Les deux plus utiles : la **planification** (tous les jours à 18 h) et le **webhook** (une adresse web que votre application appelle quand un événement survient).
- **Nœud** : une étape. Lire une base (nœud Postgres ou Supabase), appeler une API (HTTP Request), envoyer un email, écrire dans Airtable, tester une condition (IF), transformer des données (Code).
- **Données entre étapes** : chaque nœud reçoit une liste d'**éléments** (*items*), chacun étant un objet JSON, et la plupart des nœuds s'exécutent une fois par élément. Dans un champ, une **expression** comme \`{{ $json.full_name }}\` insère une valeur de l'élément en cours.
- **Exécutions** : l'historique de chaque lancement, avec les données en entrée et en sortie de chaque nœud. C'est votre premier outil de débogage.
- **Gestion d'erreurs** : chaque nœud peut réessayer en cas d'échec (*Retry On Fail*) ou continuer malgré une erreur ; un **workflow d'erreur**, démarré par le nœud *Error Trigger*, peut vous alerter quand un autre workflow échoue.

## Exemple Créno : le rappel la veille de la séance

**Objectif** : chaque jour à 18 h, chaque client qui a une réservation confirmée le lendemain reçoit un email de rappel.

1. **Schedule Trigger** : tous les jours à 18 h. Réglez le fuseau horaire du workflow sur Europe/Paris dans ses paramètres : sinon « 18 h » et « demain » risquent d'être calculés dans un autre fuseau.
2. **Requête des réservations du lendemain** : un nœud Postgres connecté à la base Supabase (les informations de connexion sont dans le tableau de bord Supabase), avec cette requête :

\`\`\`sql
select b.id as booking_id,
       u.email,
       p.full_name,
       to_char(s.starts_at at time zone 'Europe/Paris', 'HH24:MI') as heure
from public.bookings b
join public.slots s    on s.id = b.slot_id
join public.profiles p on p.id = b.client_id
join auth.users u      on u.id = b.client_id
where b.status = 'confirmed'
  and s.starts_at >= (date_trunc('day', now() at time zone 'Europe/Paris') + interval '1 day') at time zone 'Europe/Paris'
  and s.starts_at <  (date_trunc('day', now() at time zone 'Europe/Paris') + interval '2 days') at time zone 'Europe/Paris';
\`\`\`

3. **Email** : un nœud d'envoi d'email (SMTP, Gmail ou le service de votre choix) avec pour destinataire \`{{ $json.email }}\`, pour objet « Rappel : votre séance demain à {{ $json.heure }} » et un corps court qui commence par « Bonjour {{ $json.full_name }} » et rappelle comment annuler.
4. **Suivi** (facultatif) : un nœud Airtable qui ajoute une ligne par rappel envoyé (date, identifiant de réservation, statut).

Si la requête ne renvoie aucune ligne, les nœuds suivants ne reçoivent rien et ne font rien : c'est le comportement attendu. Activez *Retry On Fail* sur le nœud email et branchez un workflow d'erreur qui vous prévient par email.

> [!warning] Ce workflow lit la base avec des droits élevés (il contourne la RLS). Ses identifiants se rangent dans le gestionnaire d'identifiants (*credentials*) de n8n, chiffré, jamais en clair dans un nœud. Ne sélectionnez que les colonnes nécessaires.

Pour éviter d'envoyer deux fois le même rappel (workflow relancé à la main, par exemple), ajoutez une colonne \`reminder_sent_at\` à \`bookings\` par une nouvelle migration, filtrez sur les réservations où elle est vide et remplissez-la après l'envoi.

## Airtable pour le suivi opérationnel

**Airtable** est une base de données en ligne à l'interface de tableur, pratique pour suivre l'activité sans ouvrir Supabase : rappels envoyés, incidents, demandes de support, retours clients. Règle : **une seule source de vérité**. Pour Créno, les réservations vivent dans Supabase ; Airtable n'en reçoit qu'une copie de suivi, sans y être modifiée. (Pour un MVP concierge, voir le M03, c'est l'inverse : Airtable est la base principale.)

## Sécuriser les webhooks

Un **webhook** est une adresse web qui déclenche le workflow quand on l'appelle. Quiconque connaît l'adresse peut l'appeler : il faut donc la protéger.

- **Secret partagé** : configurez l'authentification du nœud Webhook par en-tête (*Header Auth*) ; votre application envoie le même secret dans cet en-tête. Le secret est une variable d'environnement côté serveur, jamais dans le navigateur.
- **Données minimales** : envoyez un identifiant, pas de données personnelles ; le workflow relit le reste dans la base.
- **Idempotence** : le même événement peut arriver deux fois. Vérifiez qu'il n'a pas déjà été traité avant d'agir.
- **URL de test et URL de production** : n8n fournit une adresse pour tester depuis l'éditeur et une autre pour le workflow activé. Utilisez la bonne dans chaque environnement.

\`\`\`ts
// Côté serveur uniquement, par exemple après la confirmation d'un paiement
const res = await fetch(process.env.N8N_BOOKING_WEBHOOK_URL!, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Creno-Secret": process.env.N8N_WEBHOOK_SECRET!, // même valeur que dans n8n
  },
  body: JSON.stringify({ event: "booking.confirmed", bookingId: booking.id }),
});
if (!res.ok) console.error("webhook n8n", res.status);
\`\`\`

## Tester avant d'activer

Créez des données de test (un créneau demain, une réservation confirmée avec votre propre adresse email), lancez le workflow manuellement, inspectez chaque nœud dans l'exécution, puis activez-le. Surveillez les exécutions des premiers jours.
`,
        },
        {
          type: "texte",
          personas: ["non_tech", "reconversion"],
          markdown: `
## Si votre MVP est « concierge » ou construit sur Airtable

Si vos données vivent dans Airtable (option C du M03), le principe est identique ; seule la source change :

1. Déclencheur **planifié** chaque jour, puis un nœud Airtable qui **recherche** les enregistrements du lendemain avec une formule de filtre, ou un déclencheur Airtable qui réagit aux nouveaux enregistrements.
2. Un nœud email pour chaque enregistrement trouvé.
3. Un nœud Airtable qui **met à jour** l'enregistrement (case « Rappel envoyé » cochée) pour ne jamais envoyer deux fois.

Airtable propose aussi ses propres automatisations (par exemple l'envoi d'un email quand un enregistrement correspond à une condition). Elles suffisent pour un besoin simple ; n8n devient utile dès que vous enchaînez plusieurs services ou une logique conditionnelle. Comparez les limites de chaque offre dans leur documentation.

Pour construire le workflow, décrivez-le en langage naturel à un assistant IA (étapes, champs, conditions) et demandez-lui la configuration de chaque nœud : c'est plus fiable que de lui demander un workflow complet à importer.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Pour aller plus loin

- **Versionner les workflows** : exportez-les en JSON dans le dépôt (\`automations/\`). Vérifiez avant chaque commit qu'aucun secret n'y figure en clair : les identifiants doivent rester dans le gestionnaire de n8n.
- **Auto-hébergement** : si vous hébergez n8n vous-même, vous êtes responsable des mises à jour de sécurité, des sauvegardes, du HTTPS et de la clé de chiffrement des identifiants. Pesez-le face à une version hébergée.
- **Alternative dans la base** : Supabase permet aussi de planifier des tâches (extension \`pg_cron\`) et d'exécuter du code côté serveur (Edge Functions). C'est pertinent pour une tâche purement « base de données » ; n8n reste plus lisible pour un enchaînement multi-services que vous voulez montrer à un associé non technique.
- **Signature plutôt que secret simple** : pour un webhook exposé, une signature HMAC du corps de la requête (calculée avec le secret) protège aussi contre la modification du contenu. Vérifiez comment la mettre en place dans la documentation de n8n.
`,
        },
        {
          type: "prompt",
          title: "Concevoir un workflow n8n nœud par nœud",
          tool: "Tout assistant IA",
          prompt: `
Aide-moi à concevoir un workflow n8n. Ne me donne pas de fichier à importer : décris-moi la configuration de chaque nœud, un par un.

Objectif : [ex. envoyer un rappel par email la veille de chaque séance confirmée].
Déclencheur : [planification quotidienne à 18 h, fuseau Europe/Paris / webhook appelé par mon application].
Source des données : [Supabase via Postgres / Airtable], structure : [tables et colonnes utiles, sans aucune donnée réelle].
Actions attendues : [email, mise à jour, ligne de suivi Airtable…].

Pour chaque nœud : son rôle, ses paramètres, les expressions à utiliser pour les champs dynamiques, et ce qui se passe si la liste est vide ou si le nœud échoue.
Termine par : la gestion des erreurs (réessais, workflow d'erreur), le moyen d'éviter les doublons, et un plan de test avec des données fictives.
`,
          tips:
            "Vérifiez chaque nom de nœud et d'option dans votre instance n8n : l'interface évolue et l'IA peut décrire une version antérieure. En cas d'écart, fiez-vous à la documentation officielle.",
        },
        {
          type: "exercice",
          title: "Votre première automatisation en production",
          instructions: `
Construisez une automatisation utile à **votre projet** : le rappel de la veille pour Créno, ou son équivalent chez vous (notification au fournisseur, relance, synthèse quotidienne…).

1. Décrivez-la en une phrase : déclencheur, données, action.
2. Construisez le workflow dans n8n, avec les identifiants rangés dans le gestionnaire d'identifiants.
3. Ajoutez la gestion d'erreurs (au moins les réessais sur le nœud le plus fragile) et un mécanisme anti-doublon.
4. Si votre workflow reçoit un webhook : protégez-le par un secret partagé.
5. Testez avec des données fictives, inspectez l'exécution, puis activez le workflow.

Livrable (fichier) : l'export JSON du workflow (vérifiez qu'aucun secret n'y figure en clair) **ou** une capture de l'éditeur et d'une exécution réussie, accompagné de 3 à 5 lignes expliquant le déclencheur, la gestion d'erreurs et l'anti-doublon.
`,
          deliverable: "fichier",
          estimatedMinutes: 45,
          review: "auto",
          rubric: [
            "Le workflow a un déclencheur adapté et produit une action utile au projet",
            "Les identifiants sont stockés dans le gestionnaire de n8n, aucun secret en clair",
            "Une gestion d'erreurs et un mécanisme anti-doublon sont en place",
            "Un test avec des données fictives a été réalisé et vérifié dans l'historique des exécutions",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── L08
    {
      key: "m06-l08",
      title: "Intégrer un LLM dans son produit",
      summary:
        "Ajouter une fonctionnalité d'IA générative utile et sûre : appel côté serveur uniquement, consignes système, sortie JSON validée, gestion des erreurs, maîtrise des coûts, garde-fous et évaluation sur un jeu d'exemples.",
      estimatedMinutes: 70,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous saurez choisir un cas d'usage pertinent pour un LLM dans votre produit, l'appeler de façon sûre depuis votre serveur et mesurer la qualité de ses réponses.

## Choisir un cas d'usage qui a du sens

Un **LLM** (*large language model*, grand modèle de langage) génère du texte à partir d'une consigne. Il excelle à **rédiger un brouillon, résumer, reformuler, classer ou extraire** des informations d'un texte. Il est mauvais pour les calculs exacts, les faits qu'il ne peut pas vérifier et les décisions à fort enjeu.

Pour Créno, deux cas pertinents :

- **Rédiger une description de séance** à partir des notes brèves du coach (« renfo haut du corps, 45 min, tous niveaux, prévoir tapis ») : le coach relit et modifie avant de publier.
- **Résumer les retours clients** du mois pour le coach : thèmes récurrents, points à améliorer.

Dans les deux cas, un humain valide le résultat. Si l'erreur du modèle ne peut pas être rattrapée par une relecture (un prix, une disponibilité, un conseil de santé), ce n'est pas un bon cas d'usage pour un MVP.

## L'architecture : toujours par votre serveur

Le navigateur appelle **votre** serveur (une route ou une action serveur), qui vérifie l'utilisateur, prépare la requête, appelle le fournisseur du LLM avec la clé d'API, valide la réponse et la renvoie. **La clé d'API ne quitte jamais le serveur** : dans le navigateur, n'importe quel visiteur pourrait la lire et l'utiliser à vos frais.

## Consignes système et sortie structurée

Les **consignes système** (*system prompt*) sont des instructions permanentes, séparées de la demande de l'utilisateur : rôle, ton, limites, format de sortie. Mettez-y au point votre prompt (M02) dans Claude ou ChatGPT avant de l'intégrer au code.

Demandez une **sortie structurée** : un objet JSON aux champs définis plutôt qu'un texte libre. La plupart des fournisseurs proposent un mode de sortie JSON ou « structuré » (voir leur documentation). Dans tous les cas, **validez la réponse côté serveur** : un modèle peut renvoyer un JSON invalide, incomplet ou trop long.

## Exemple : une route serveur générique

Ce code est volontairement **générique** : chaque fournisseur a son adresse d'API, son format de requête et de réponse. Remplacez \`ENDPOINT\`, \`MODEL\` et la structure du corps d'après la documentation officielle de votre fournisseur, ou utilisez son SDK officiel.

\`\`\`ts
// app/api/description/route.ts — exécuté uniquement sur le serveur
import { createClient } from "@/lib/supabase/server";

const ENDPOINT = process.env.LLM_ENDPOINT!; // URL de l'API : voir la doc du fournisseur
const MODEL = process.env.LLM_MODEL!;       // identifiant du modèle choisi
const API_KEY = process.env.LLM_API_KEY!;   // secrète : jamais préfixée NEXT_PUBLIC_

const SYSTEM =
  "Tu rédiges des descriptions de séances de coaching sportif, en français, ton clair et motivant. " +
  "Aucune promesse de résultat, aucun conseil médical. " +
  'Réponds uniquement avec un objet JSON : {"title": "...", "description": "..."}, description de 400 caractères maximum.';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Non connecté" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  if (!notes || notes.length > 1000) {
    return Response.json({ error: "Notes manquantes ou trop longues" }, { status: 400 });
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + API_KEY }, // schéma d'authentification : selon le fournisseur
      body: JSON.stringify({ model: MODEL, system: SYSTEM, input: notes }), // PSEUDO-CODE : champs réels dans la doc
      signal: AbortSignal.timeout(20_000), // délai maximal : 20 secondes
    });
    if (!res.ok) return Response.json({ error: "Service indisponible, réessayez" }, { status: 502 });

    const text = extractText(await res.json()); // à écrire selon le format de réponse du fournisseur
    const out = safeParse(text);
    if (typeof out?.title !== "string" || typeof out?.description !== "string" || out.description.length > 400) {
      return Response.json({ error: "Réponse inexploitable, réessayez" }, { status: 502 });
    }
    return Response.json({ title: out.title, description: out.description });
  } catch {
    return Response.json({ error: "Délai dépassé, réessayez" }, { status: 504 });
  }
}

function safeParse(text: string) {
  try { return JSON.parse(text); } catch { return null; }
}
function extractText(_payload: unknown): string {
  // PSEUDO-CODE : chaque fournisseur place le texte généré à un endroit différent
  // de sa réponse. Lisez sa documentation, puis implémentez et testez cette fonction.
  throw new Error("À implémenter selon le fournisseur");
}
\`\`\`

Remarquez les quatre protections : utilisateur vérifié, entrée validée et bornée, délai maximal, sortie validée avant d'être renvoyée. Ajoutez la vérification du rôle (seul un coach peut générer une description) et une limite d'appels par utilisateur et par jour.

## Erreurs, délais et coûts

Un appel à un LLM peut être **lent** (plusieurs secondes) et **échouer** (service saturé, quota atteint, réponse invalide). Affichez un état « génération en cours », prévoyez un message clair et laissez toujours l'utilisateur continuer sans l'IA (saisie manuelle).

Les fournisseurs facturent en général **au volume de texte** traité, en entrée comme en sortie, mesuré en *tokens* (des fragments de mots). Pour maîtriser la facture : bornez la longueur des entrées et des sorties, limitez le nombre d'appels par utilisateur, ne régénérez pas ce qui a déjà été généré, et suivez la consommation dans le tableau de bord du fournisseur (avec une alerte ou un plafond si c'est proposé). Consultez sa page tarifs au moment de votre choix.

## Garde-fous

- **Données personnelles** : n'envoyez que le strict nécessaire. Pas de données de santé des clients de Créno, pas d'email ni de téléphone. Vérifiez dans les conditions du fournisseur l'usage et la durée de conservation des données envoyées ; vous le mentionnerez dans votre politique de confidentialité (M08).
- **Contenus inappropriés** : bornez le sujet dans les consignes système, filtrez les entrées abusives, et gardez la validation humaine avant toute publication.
- **Injection de consignes** : un texte saisi par un utilisateur peut contenir des instructions (« ignore tes consignes… »). Traitez-le comme une donnée, ne donnez au modèle aucun pouvoir d'action (pas d'accès à la base, pas d'envoi d'email) sans contrôle côté serveur.

## Évaluer la qualité sur un jeu d'exemples

« Ça a l'air bien » sur deux essais ne suffit pas. Constituez un **jeu d'évaluation** de 10 à 20 entrées représentatives, anonymisées : cas courants, cas limites (notes vides, très longues, en anglais, hors sujet, agressives). Définissez 3 à 5 critères (respect du format, exactitude par rapport aux notes, ton, longueur, absence de promesse). Passez tout le jeu à chaque modification du prompt ou de modèle, et notez les résultats dans un tableau : vous saurez si le changement améliore ou dégrade.
`,
        },
        {
          type: "texte",
          personas: ["non_tech", "reconversion"],
          markdown: `
## Avec Bolt.new : exiger un appel côté serveur

Les outils de génération d'applications peuvent, si vous ne précisez rien, appeler l'API du LLM directement depuis le navigateur. Exigez explicitement le contraire :

1. Demandez la création d'une **fonction côté serveur** (par exemple une Edge Function Supabase, qui s'exécute sur les serveurs de Supabase) qui reçoit les notes, appelle le LLM et renvoie le JSON validé.
2. Rangez la clé d'API dans les **secrets** de cette fonction (dans le tableau de bord Supabase), jamais dans un fichier du projet ni dans le prompt.
3. Vérifiez : cherchez dans le code de l'interface le nom de la variable de la clé et le mot « Bearer ». S'ils apparaissent dans un fichier affiché par le navigateur, la clé est exposée.
4. Testez le jeu d'exemples depuis l'interface et notez les résultats dans un tableau.

Commencez par mettre au point vos consignes système dans Claude ou ChatGPT, sur vos exemples, avant de les confier à Bolt.new.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Industrialiser l'intégration

- **SDK officiel ou \`fetch\`** : le SDK du fournisseur gère souvent les réessais, les types et le streaming ; \`fetch\` évite une dépendance. Dans les deux cas, isolez l'appel dans un module \`lib/llm.ts\` pour pouvoir changer de fournisseur.
- **Validation par schéma** : si une bibliothèque de validation est déjà dans le projet, décrivez la sortie attendue par un schéma et utilisez-le à la fois pour valider et pour générer la consigne de format.
- **Streaming** : pour les textes longs, l'affichage progressif améliore la perception du délai ; il complique la validation (on ne valide qu'à la fin). Pour un JSON court, préférez une réponse complète.
- **Limitation de débit** : un compteur par utilisateur et par jour dans une table Supabase suffit pour un MVP.
- **Journalisation** : enregistrez la durée, le statut et le volume consommé (renvoyé par la plupart des API), jamais le contenu personnel ni la clé.
- **Évaluation automatisée** : un script qui passe le jeu d'exemples et vérifie les critères mesurables (format, longueur, mots interdits), lancé à chaque changement de prompt.
`,
        },
        {
          type: "prompt",
          title: "Mettre au point les consignes système et le jeu d'évaluation",
          tool: "Claude",
          prompt: `
Je veux intégrer un LLM dans mon produit : [produit en une phrase].
Cas d'usage : [ex. rédiger une description de séance à partir des notes du coach]. Un humain relit toujours le résultat avant publication.

1. Rédige des consignes système : rôle, ton, limites (sujets interdits, aucune promesse, aucun conseil médical ou juridique), format de sortie JSON strict avec les champs [liste] et leurs longueurs maximales.
2. Propose un jeu d'évaluation de 15 entrées fictives : 8 cas courants, 7 cas limites (vide, trop long, autre langue, hors sujet, tentative de détourner les consignes, contenu inapproprié).
3. Propose 4 critères d'évaluation notés de 0 à 2, et le résultat attendu pour chaque cas limite.

N'utilise aucune donnée réelle.
`,
          tips:
            "Testez ensuite vous-même les consignes sur les 15 entrées et notez les résultats. N'intégrez au code qu'une version qui passe les cas limites.",
        },
        {
          type: "exercice",
          title: "Votre fonctionnalité LLM, sûre et évaluée",
          instructions: `
Concevez, et si possible intégrez, une fonctionnalité LLM dans **votre projet**. Si votre MVP n'en a pas besoin, choisissez un usage interne (par exemple résumer les retours de vos premiers utilisateurs) : l'objectif est de maîtriser la méthode.

1. **Fiche de cas d'usage** : le besoin, l'entrée, la sortie, qui valide le résultat, ce qui se passe si l'IA échoue.
2. **Consignes système** et **format JSON** attendu (champs, types, longueurs).
3. **Architecture** : où la clé est stockée, quelle route ou fonction serveur appelle le fournisseur, quelles vérifications elle fait (utilisateur, entrée, délai, sortie).
4. **Évaluation** : passez au moins 10 exemples (dont 4 cas limites) et notez-les selon vos critères dans un tableau.
5. **Garde-fous** : données envoyées au fournisseur (et celles que vous refusez d'envoyer), limites d'usage par utilisateur.

Livrable (texte) : votre fiche, vos consignes, votre tableau d'évaluation et, si vous l'avez intégrée, le chemin du fichier serveur dans votre dépôt.
`,
          deliverable: "texte",
          estimatedMinutes: 40,
          review: "auto",
          rubric: [
            "Le cas d'usage est pertinent, avec une validation humaine et une alternative sans IA",
            "La clé d'API reste côté serveur et l'appel vérifie l'utilisateur, l'entrée, le délai et la sortie",
            "La sortie est structurée et validée",
            "Au moins 10 exemples, dont des cas limites, sont évalués selon des critères explicites",
            "Les données personnelles envoyées au fournisseur sont minimisées et justifiées",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── L09
    {
      key: "m06-l09",
      title: "Déployer sur Vercel",
      summary:
        "Mettre votre MVP en ligne depuis GitHub : variables d'environnement par environnement, déploiements de prévisualisation, domaine, URL de redirection Supabase et checklist de mise en production.",
      estimatedMinutes: 50,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, votre MVP sera accessible à une adresse publique, chaque modification poussée sur GitHub sera déployée automatiquement, et vous aurez vérifié les points qui séparent une démo d'un produit utilisable.

## Ce que fait Vercel

**Vercel** est une plateforme d'hébergement conçue pour les applications web modernes, et en particulier pour Next.js (développé par la même entreprise). Relié à votre dépôt GitHub, il **construit** (*build*) et **déploie** votre application à chaque push. D'autres plateformes fonctionnent de façon comparable, et Bolt.new propose son propre déploiement ; les principes de cette leçon restent valables partout. Référence : [documentation Vercel](https://vercel.com/docs).

## Étape 1 : relier le dépôt

Depuis le tableau de bord Vercel, importez votre dépôt GitHub (Vercel demande l'autorisation d'y accéder). Le framework est détecté automatiquement ; les réglages de build par défaut conviennent en général à un projet Next.js. Ne lancez pas le premier déploiement avant d'avoir renseigné les variables d'environnement : il échouerait ou, pire, fonctionnerait à moitié.

## Étape 2 : les variables d'environnement

Les variables de votre \`.env.local\` n'existent pas sur Vercel : vous les saisissez dans les réglages du projet. Chaque variable est attribuée à un ou plusieurs **environnements** :

| Environnement | Quand | Usage |
| --- | --- | --- |
| **Production** | Déploiement de la branche principale | Vos vrais utilisateurs |
| **Preview** (prévisualisation) | Déploiement de toute autre branche ou pull request | Tester avant de fusionner |
| **Development** | Votre machine, si vous récupérez les variables depuis Vercel | Développement local |

Trois règles :

- Seules les variables préfixées \`NEXT_PUBLIC_\` sont envoyées au navigateur. **Aucun secret ne porte ce préfixe** : clé secrète Supabase, clé d'API du LLM, secret de webhook n8n, clé secrète de paiement.
- Une variable modifiée n'est prise en compte **qu'au déploiement suivant** : redéployez après chaque changement.
- Idéalement, la prévisualisation utilise une base de test distincte de la production, pour ne jamais tester sur les données de vrais clients.

## Étape 3 : premier déploiement et lecture des logs

Lancez le déploiement. S'il échoue, ouvrez les **logs de build** : l'erreur y est écrite, souvent une variable manquante ou une erreur de type que le mode développement tolérait. Appliquez la méthode de la leçon 6. Une fois l'application en ligne, les **logs d'exécution** du tableau de bord montrent les erreurs serveur (vos \`console.error\`).

## Étape 4 : les déploiements de prévisualisation

Chaque branche poussée et chaque pull request obtient sa propre **URL de prévisualisation**. C'est l'outil idéal pour tester une story en conditions réelles avant de la fusionner dans \`main\`, ou pour montrer une nouveauté à un testeur sans toucher à la production. Vous pouvez restreindre l'accès à ces URL ; consultez la documentation pour les options disponibles.

Si un déploiement de production pose problème, Vercel permet de revenir rapidement à un déploiement précédent depuis le tableau de bord, le temps de corriger.

## Étape 5 : le domaine

Votre projet reçoit une adresse en \`.vercel.app\`. Pour un domaine à vous (\`creno.fr\`, par exemple), ajoutez-le dans les réglages du projet et configurez les enregistrements DNS chez votre registraire en suivant les instructions affichées. Le certificat HTTPS est géré automatiquement. La propagation DNS peut prendre un certain temps : faites-le quelques jours avant une démo importante.

## Étape 6 : mettre à jour Supabase et les intégrations

C'est l'oubli le plus fréquent : la connexion marche en local, pas en production.

- **Supabase, configuration des URL d'authentification** : remplacez la **Site URL** par votre adresse de production et ajoutez-la aux **Redirect URLs**. Pour les prévisualisations, Supabase accepte des motifs avec caractères génériques : suivez la section *Redirect URLs* de sa documentation. Vérifiez que les liens des emails (confirmation, lien magique, réinitialisation) mènent bien à la production.
- **Emails d'authentification** : configurez votre propre service SMTP et traduisez les modèles d'emails en français.
- **Paiement** : l'adresse du webhook de votre prestataire de paiement doit pointer vers la production. Restez en mode test tant que vous n'avez pas validé le parcours complet et vos mentions légales (M08).
- **n8n** : l'URL de production des webhooks (et non l'URL de test) dans les variables de Vercel ; le workflow activé.

## Étape 7 : tester en production

Déroulez tout le parcours clé sur l'URL publique, avec deux comptes, dans une fenêtre de navigation privée, puis sur un téléphone. Vérifiez la console et l'onglet Réseau. Déroulez à nouveau votre matrice de tests RLS de la leçon 3 : ce qui était sûr en local doit l'être en ligne.
`,
        },
        {
          type: "texte",
          personas: ["non_tech", "reconversion"],
          markdown: `
## Si vous avez construit avec Bolt.new

Deux chemins possibles :

1. **Le déploiement intégré** de Bolt.new : le plus rapide pour une première mise en ligne. Vérifiez dans sa documentation comment sont gérés le domaine et les variables d'environnement.
2. **GitHub puis Vercel** : si votre projet est relié à GitHub (leçon 2), importez le dépôt dans Vercel comme décrit ci-dessus. Vous gagnez les déploiements de prévisualisation et un historique de versions indépendant de l'outil de génération.

Dans les deux cas, l'étape 6 est indispensable : sans mise à jour des URL dans Supabase, vos utilisateurs ne pourront pas se connecter.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Côté développeur

- La CLI Vercel permet de relier le dossier local au projet et de récupérer les variables de l'environnement de développement dans un fichier local (voir la documentation de la CLI). Évitez les copier-coller de clés.
- Exigez que les vérifications (lint, typecheck, tests, build) et le déploiement de prévisualisation réussissent avant toute fusion dans \`main\` (règles de protection de branche GitHub si votre offre les propose, discipline personnelle sinon).
- Donnez à la prévisualisation son propre projet Supabase, alimenté par vos migrations : vous testez les migrations avant de les appliquer en production.
- Appliquez les migrations de production (\`supabase db push\`) **avant** de fusionner le code qui en dépend, et préférez des migrations compatibles avec l'ancienne version du code (ajouter une colonne avant de l'utiliser, supprimer après).
`,
        },
        {
          type: "checklist",
          title: "Checklist de mise en production",
          items: [
            "Clés : aucun secret préfixé NEXT_PUBLIC_, aucune clé en dur dans le code, clés de production distinctes des clés de test",
            "RLS : activée sur toutes les tables et matrice de tests à deux comptes rejouée sur l'URL de production",
            "Authentification : Site URL et Redirect URLs de production configurées, liens des emails vérifiés",
            "Emails : service SMTP configuré, modèles en français, envoi testé vers une vraie boîte",
            "Erreurs : messages clairs pour l'utilisateur, logs d'exécution consultés, console du navigateur sans erreur",
            "Intégrations : webhooks de paiement et n8n pointant vers la production, workflows activés",
            "Données : comptes et données de test supprimés ou clairement identifiés",
            "Mentions légales, CGU et politique de confidentialité : prévues au M08, notées dans le backlog",
          ],
        },
        {
          type: "exercice",
          title: "Mettre votre MVP en ligne",
          instructions: `
1. Déployez **votre projet** (Vercel relié à GitHub, ou déploiement intégré de votre outil).
2. Renseignez les variables d'environnement par environnement, en vérifiant qu'aucun secret n'est exposé au navigateur.
3. Mettez à jour la configuration d'authentification Supabase et vos intégrations (paiement en mode test, n8n).
4. Déroulez la checklist de mise en production et le parcours clé complet sur l'URL publique, avec deux comptes, sur ordinateur et sur téléphone.
5. Ouvrez une pull request (ou une branche) de test et vérifiez son URL de prévisualisation, si votre configuration le permet.

Livrable : l'URL publique de votre MVP, accompagnée en commentaire des points de la checklist encore ouverts et de la date prévue pour les traiter.
`,
          deliverable: "lien",
          estimatedMinutes: 30,
          review: "auto",
          rubric: [
            "Le MVP est accessible à une URL publique et le parcours clé y fonctionne",
            "Aucun secret n'est exposé au navigateur ; les variables sont réparties par environnement",
            "La connexion fonctionne en production (URL Supabase mises à jour)",
            "La checklist de mise en production a été déroulée et les points ouverts sont planifiés",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── L10
    {
      key: "m06-l10",
      title: "Revue de sprint : démo de votre MVP",
      summary:
        "Préparer et enregistrer une démo convaincante du parcours clé, rédiger vos notes de version et tirer les leçons de vos sprints de build.",
      estimatedMinutes: 40,
      blocks: [
        {
          type: "texte",
          markdown: `
À la fin de cette leçon, vous aurez une démo de votre MVP prête à montrer, des notes de version qui décrivent honnêtement ce qui fonctionne, et une rétrospective qui améliore votre façon de travailler pour la suite.

## La revue de sprint

En Scrum (M01), la **revue de sprint** (*Sprint Review*) clôt chaque sprint : on inspecte ce qui a été réellement produit, l'**incrément**, avec les personnes concernées, et on ajuste le backlog en conséquence. Ce n'est pas une présentation commerciale : c'est un point de vérité. On montre ce qui fonctionne, on dit ce qui ne fonctionne pas encore, on décide de la suite.

Pour vous, la revue de ce module prend la forme d'une démo enregistrée et d'un dossier de livraison évalué par le formateur. Si vous avez un associé, un mentor ou des futurs utilisateurs sous la main, montrez-leur aussi : leurs réactions préparent le M07.

## Construire la démo : cinq minutes maximum

| Séquence | Durée | Contenu (exemple Créno) |
| --- | --- | --- |
| 1. Le problème | 30 s | « Les coachs indépendants gèrent leurs réservations par messages et se font payer en retard. » |
| 2. L'objectif du sprint | 30 s | « Objectif : un coach publie ses créneaux, un client réserve et paie en ligne. » |
| 3. Le parcours clé en direct | 2 à 3 min | Le coach publie un créneau ; le client le réserve et paie (en mode test) ; la réservation apparaît des deux côtés |
| 4. Les limites connues | 30 s | « Pas encore d'annulation avec remboursement ; le rappel part à 18 h pour toutes les séances. » |
| 5. La suite | 30 s | Ce que vous voulez vérifier en tests utilisateurs (M07) et les stories suivantes |

Montrez le produit, pas le code ni l'outil. Suivez le point de vue de l'utilisateur : « Je suis Julie, coach ; je publie mon créneau de mardi. » Un parcours complet et simple convainc davantage qu'une visite de tous les écrans.

## Préparer l'environnement

Une démo échoue rarement à cause du produit, et souvent à cause de la préparation :

- **Comptes de démo** créés à l'avance (un coach, un client), mots de passe à portée de main, et session ouverte dans deux fenêtres (dont une de navigation privée).
- **Données réalistes** : des noms plausibles et fictifs, des créneaux cohérents. Jamais « test test » ni de vraies données personnelles.
- **Écran propre** : notifications coupées, onglets inutiles fermés, zoom du navigateur augmenté pour la lisibilité.
- **Plan B** : une vidéo du parcours enregistrée à l'avance, au cas où la connexion ou un service tiers vous lâcherait.
- **Répétition** : déroulez la démo deux fois, chronomètre en main.

## Les notes de version

Les **notes de version** (*release notes*) décrivent, pour une version donnée, ce qui est disponible, ce qui a changé et ce qui est connu comme limité. Elles servent à vos testeurs, à vos futurs associés et à vous-même. Restez factuel : une limite annoncée inspire confiance, une limite découverte en démo la détruit.

\`\`\`markdown
## Créno — version 0.1 (MVP), [date]

### Disponible
- Le coach crée son compte et publie des créneaux (date, heure, prix, capacité).
- Le client réserve un créneau et paie en ligne (paiement en mode test).
- Rappel automatique par email la veille de la séance.

### Limites connues
- Annulation possible, mais sans remboursement automatique.
- Interface testée sur ordinateur et un modèle de téléphone.

### Technique
- Next.js + Supabase (RLS testée avec deux rôles), déployé sur Vercel, rappels via n8n.

### Prochaines étapes
- Tests utilisateurs avec 5 coachs (M07).
\`\`\`

## La rétrospective

La **rétrospective** (*Sprint Retrospective*) porte sur la façon de travailler, pas sur le produit. Trois questions, dix minutes, notées dans votre journal :

- **Ce que je garde** : ce qui a bien marché (par exemple : un commit par story, le prompt de contexte).
- **Ce que j'arrête** : ce qui m'a fait perdre du temps (par exemple : demander « corrige » en boucle).
- **Ce que j'essaie** : une seule amélioration concrète pour la suite.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Montrer un travail imparfait

Présenter un premier produit, encore incomplet, est inconfortable. C'est pourtant exactement ce que font toutes les équipes produit à chaque revue de sprint : montrer tôt, pour apprendre tôt. Personne n'attend de votre MVP qu'il soit parfait ; on attend qu'il fonctionne sur le parcours promis et que vous sachiez dire ce qui manque. Si la démo en direct vous stresse, enregistrez-la en plusieurs prises : c'est accepté pour ce livrable.
`,
        },
        {
          type: "checklist",
          title: "Avant d'enregistrer la démo",
          items: [
            "Le parcours clé fonctionne sur l'URL publique avec les comptes de démo",
            "Les données de démo sont réalistes et entièrement fictives",
            "Le déroulé en cinq séquences tient en cinq minutes, chronométré deux fois",
            "Les limites connues sont listées et seront annoncées",
            "Une vidéo de secours du parcours est enregistrée",
            "Les notes de version sont rédigées et à jour",
          ],
        },
        {
          type: "ressource",
          resourceId: "res_protocole_tests",
          note: "Parcourez dès maintenant le protocole de tests utilisateurs : la section « La suite » de votre démo annonce ce que vous testerez au M07.",
        },
        {
          type: "exercice",
          title: "Livraison du MVP : démo, dépôt et notes de version",
          instructions: `
Préparez votre dossier de livraison dans une page unique (Notion ou document partagé en lecture), qui contient :

1. **Le lien du MVP en ligne** et, si l'accès est restreint, les identifiants de deux comptes de démo **fictifs** (un par rôle).
2. **Le lien du dépôt GitHub** (accès en lecture donné au formateur si le dépôt est privé), avec un README qui explique en quelques lignes comment lancer le projet et tester le parcours clé. Si vous avez construit avec un outil sans dépôt, l'export du projet.
3. **La vidéo de démo** (2 à 5 minutes, parcours clé en cinq séquences).
4. **Les notes de version** sur le modèle de la leçon.
5. **Votre rétrospective** : garder, arrêter, essayer.

Livrable : le lien de cette page.
`,
          deliverable: "lien",
          estimatedMinutes: 30,
          review: "formateur",
          rubric: [
            "Le MVP est en ligne et le parcours clé fonctionne de bout en bout avec deux rôles, sans erreur bloquante",
            "Le dépôt est accessible, versionné régulièrement, sans aucun secret, avec un README permettant de tester",
            "La démo est structurée, centrée sur l'utilisateur, tient dans le temps et annonce honnêtement les limites",
            "Les notes de version sont factuelles : fonctionnalités disponibles, limites connues, prochaines étapes",
            "La rétrospective identifie une amélioration concrète et réaliste",
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────── L11
    {
      key: "m06-l11",
      title: "Évaluation du module",
      summary: "Quiz évalué de dix questions sur l'ensemble du module « Construire avec l'IA ».",
      estimatedMinutes: 20,
      blocks: [
        {
          type: "texte",
          markdown: `
Ce quiz évalue les acquis du module : organisation du build, Git et GitHub, Supabase et la RLS, travail avec un agent de code, débogage, automatisation, intégration d'un LLM et déploiement.

Dix questions, une seule bonne réponse par question. Prenez le temps de lire chaque option : plusieurs semblent plausibles, une seule correspond aux bonnes pratiques vues dans le module. En cas de doute, relisez la leçon concernée avant de répondre.
`,
        },
        {
          type: "quiz",
          title: "Évaluation — Construire avec l'IA",
          graded: true,
          questions: [
            {
              prompt: "Quelle story est la mieux découpée pour un sprint de build de Créno ?",
              options: [
                { label: "Créer toutes les tables de la base de données" },
                { label: "Faire tous les écrans de l'application" },
                { label: "Améliorer l'expérience utilisateur" },
                { label: "Le client réserve un créneau et retrouve sa réservation dans « Mes réservations »", correct: true },
              ],
              explanation:
                "Une story livrable est une tranche verticale : elle traverse interface, logique et données sur un périmètre étroit, et un utilisateur peut en tirer un bénéfice.",
            },
            {
              prompt: "Où doit se trouver la clé secrète (service_role ou secret) de Supabase ?",
              options: [
                { label: "Dans une variable NEXT_PUBLIC_ pour être accessible partout" },
                { label: "Dans le fichier .env versionné sur GitHub, le dépôt étant privé" },
                { label: "Uniquement côté serveur (variables d'environnement du serveur, identifiants n8n), jamais dans le navigateur ni dans Git", correct: true },
                { label: "Dans le prompt de contexte de l'agent de code, pour qu'il puisse tester" },
              ],
              explanation:
                "La clé secrète contourne la RLS : elle donne accès à toute la base. Elle ne quitte jamais le serveur et n'est jamais versionnée ni collée dans un prompt.",
            },
            {
              prompt: "Une table Supabase a la RLS activée mais aucune politique. Que se passe-t-il pour un utilisateur connecté qui la lit avec la clé publique ?",
              options: [
                { label: "Il n'obtient aucune ligne", correct: true },
                { label: "Il voit toutes les lignes" },
                { label: "Il ne voit que ses propres lignes" },
                { label: "La requête modifie automatiquement les politiques" },
              ],
              explanation:
                "Avec la RLS activée, tout ce qui n'est pas explicitement autorisé par une politique est refusé : la lecture renvoie une liste vide.",
            },
            {
              prompt: "Votre politique d'insertion sur slots vérifie seulement coach_id = auth.uid(). Quel risque reste-t-il ?",
              options: [
                { label: "Aucun, la politique est complète" },
                { label: "Un client peut publier un créneau à son propre nom, car son rôle n'est pas vérifié", correct: true },
                { label: "Un coach ne peut plus lire ses créneaux" },
                { label: "Les créneaux passés sont supprimés" },
              ],
              explanation:
                "L'identifiant correspond, mais rien ne vérifie que l'utilisateur est un coach. Il faut ajouter une condition sur le rôle dans profiles, et le tester avec un compte client.",
            },
            {
              prompt: "Un agent de code vous propose un diff de 30 fichiers pour ajouter un bouton. Quelle est la meilleure décision ?",
              options: [
                { label: "Accepter, puis tester" },
                { label: "Accepter uniquement les fichiers que vous comprenez" },
                { label: "Demander à l'agent de commiter directement sur main" },
                { label: "Refuser, revenir à l'état précédent, et redemander avec un plan et un périmètre explicite", correct: true },
              ],
              explanation:
                "Un diff impossible à relire signale une tâche mal cadrée. Un plan préalable et un périmètre explicite évitent les modifications trop larges.",
            },
            {
              prompt: "Après deux corrections infructueuses de la même erreur par l'IA, que faites-vous ?",
              options: [
                { label: "Je redemande « corrige » jusqu'à ce que cela fonctionne" },
                { label: "Je reviens à la dernière version qui marchait et je demande un diagnostic sans modification, avec l'erreur exacte et ce qui a été tenté", correct: true },
                { label: "Je désactive la RLS pour voir si cela vient de là, et je la laisse désactivée si cela marche" },
                { label: "Je recommence le projet de zéro" },
              ],
              explanation:
                "Empiler les corrections aggrave souvent la situation. Revenir à un état stable et fournir un contexte précis mène plus vite à la cause réelle.",
            },
            {
              prompt: "Un écran de Créno reste vide. Dans l'onglet Réseau, la requête vers Supabase renvoie un statut 200 et une liste vide, alors que les données existent. Quelle est la cause la plus probable ?",
              options: [
                { label: "Le serveur de Supabase est en panne" },
                { label: "Une erreur de syntaxe dans le CSS" },
                { label: "Une politique RLS de lecture manquante ou un utilisateur non connecté côté requête", correct: true },
                { label: "Un problème de nom de domaine" },
              ],
              explanation:
                "Une réponse réussie mais vide est la signature typique d'un filtrage par la RLS : la requête est autorisée, mais aucune ligne n'est visible pour cet utilisateur.",
            },
            {
              prompt: "Comment sécuriser le webhook n8n que votre application appelle quand une réservation est confirmée ?",
              options: [
                { label: "Exiger un secret partagé dans un en-tête, envoyé depuis le serveur, et ne transmettre qu'un identifiant", correct: true },
                { label: "Garder l'URL secrète suffit" },
                { label: "Envoyer toutes les données du client dans l'appel pour éviter une requête supplémentaire" },
                { label: "Appeler le webhook depuis le navigateur du client" },
              ],
              explanation:
                "Le secret partagé authentifie l'appelant ; l'envoi depuis le serveur protège le secret ; un simple identifiant limite l'exposition des données personnelles.",
            },
            {
              prompt: "Pour intégrer un LLM qui rédige des descriptions de séance, quelle architecture est correcte ?",
              options: [
                { label: "Le navigateur appelle directement l'API du fournisseur avec la clé" },
                { label: "La clé est stockée dans une variable NEXT_PUBLIC_ pour simplifier" },
                { label: "Le texte généré est publié automatiquement sans relecture" },
                { label: "Le navigateur appelle une route serveur qui vérifie l'utilisateur, appelle le fournisseur avec la clé et valide la sortie JSON avant de la renvoyer", correct: true },
              ],
              explanation:
                "La clé reste côté serveur, l'entrée et la sortie sont validées, et le coach relit avant publication.",
            },
            {
              prompt: "Votre MVP est déployé sur Vercel, mais la connexion échoue en production alors qu'elle fonctionne en local. Que vérifiez-vous en premier ?",
              options: [
                { label: "La couleur du bouton de connexion" },
                { label: "La Site URL et les Redirect URLs dans la configuration d'authentification de Supabase, et les variables d'environnement de production", correct: true },
                { label: "Le nombre de commits du dépôt" },
                { label: "Le fichier .gitignore" },
              ],
              explanation:
                "Une adresse de production absente des URL autorisées de Supabase, ou une variable manquante en production, sont les causes les plus fréquentes de ce symptôme.",
            },
          ],
        },
      ],
    },
  ],
};
