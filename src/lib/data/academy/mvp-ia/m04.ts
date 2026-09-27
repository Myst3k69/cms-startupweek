import type { SeedModule } from "../authoring";

export const M04: SeedModule = {
  key: "m04",
  title: "Architecturer son app",
  summary:
    "Concevoir le plan de votre application avant de la construire : couches, modèle de données, rôles et règles d'accès, intégrations, sécurité, RGPD, et une documentation que vos outils IA sauront exploiter.",
  objectives: [
    "Être capable de décrire l'architecture de son MVP (front, back, base de données, services externes) et le trajet d'une requête clé.",
    "Être capable de modéliser les données de son MVP (entités, types, relations, contraintes) en tableau, puis en SQL ou dans Airtable.",
    "Être capable de définir les rôles, le mode d'authentification et les règles d'accès (RLS) de son application.",
    "Être capable d'identifier les intégrations, les secrets et les obligations de sécurité et de RGPD de son MVP.",
    "Être capable de rédiger un dossier d'architecture (ARCHITECTURE.md, instructions pour agents, décisions) exploitable par les outils IA.",
  ],
  lessons: [
    // ---------------------------------------------------------------------------
    // L01 — Penser en architecture
    // ---------------------------------------------------------------------------
    {
      key: "m04-l01",
      title: "Penser en architecture",
      summary:
        "Découper votre application en quatre couches, suivre le trajet d'une requête et décider ce qui doit rester côté serveur.",
      estimatedMinutes: 45,
      blocks: [
        {
          type: "texte",
          markdown: `
**À la fin de cette leçon**, vous saurez décrire votre application en quatre couches, suivre le trajet d'une action utilisateur de l'écran jusqu'à la base de données, et décider ce qui doit impérativement rester côté serveur.

## Pourquoi penser l'architecture avant de générer du code

Un outil d'IA peut produire un écran fonctionnel en quelques minutes. Mais sans plan d'ensemble, les problèmes arrivent vite : données dupliquées dans deux tables, prix calculé dans le navigateur, clé secrète copiée dans du code visible par tous, règles métier dispersées. Chaque correction en provoque une autre.

L'**architecture** est le plan de votre application : ses grandes parties, le rôle de chacune et la façon dont elles communiquent. C'est le plan de l'architecte avant le chantier : on ne décide pas de l'emplacement des canalisations une fois les murs montés. Pour un MVP, ce plan tient sur une page. Il vous sert à prendre de bonnes décisions, à donner du contexte aux outils IA (leçon 6) et à expliquer votre produit à un développeur ou à un investisseur.

## Les quatre couches d'une application web

| Couche | Rôle | Chez Créno | Question à se poser |
| --- | --- | --- | --- |
| Front (interface) | Ce que l'utilisateur voit et manipule : pages, boutons, formulaires | Pages Next.js / React : agenda du coach, page de réservation | Que voit et que fait l'utilisateur ? |
| Back (logique serveur) | Applique les règles métier, vérifie les droits, orchestre les échanges | Code serveur Next.js, réception des notifications de Stripe | Quelles règles doivent être garanties, quoi qu'il arrive ? |
| Base de données | Stocke les informations durablement | Supabase (Postgres) : profils, créneaux, réservations, paiements | Que doit-on retrouver demain, dans un an ? |
| Services externes | Spécialistes branchés à votre application | Stripe (paiement), service d'email, n8n (rappels), Supabase Auth (connexion) | Qu'est-ce qu'on ne construit pas soi-même ? |

Une image aide à fixer les idées : le restaurant. La **salle** est le front : le client y lit la carte et commande. La **cuisine** est le back : on y applique les recettes et les règles d'hygiène, et le client n'y entre jamais. La **réserve** est la base de données. Les **fournisseurs** sont les services externes.

Trois mots reviennent sans cesse. Un **serveur** est un ordinateur qui exécute votre code et répond aux demandes. Une **requête** est un message envoyé par un programme à un autre pour demander quelque chose (« donne-moi les créneaux de mardi »). Une **API** (interface de programmation) est l'ensemble des requêtes qu'un service accepte, avec leur format : c'est la carte du restaurant.

## Le trajet d'une requête : le client de Créno réserve un créneau

Suivons Léa, cliente de Julie, coach sportive, qui réserve une séance depuis son téléphone.

1. Léa ouvre le lien de réservation de Julie. Son navigateur demande la page à l'hébergeur (Vercel), qui renvoie l'interface.
2. La page affiche les créneaux ouverts, lus dans la base Supabase. La base ne renvoie que les lignes que Léa a le droit de voir (leçon 3).
3. Léa touche « Réserver mardi 18 h ». Le front envoie au back une requête : « je souhaite le créneau n° X ». Il n'envoie pas le prix.
4. Le back vérifie que Léa est connectée, que le créneau est ouvert et qu'il reste une place. Il lit le prix dans la base.
5. Le back enregistre une réservation « en attente », crée une session de paiement chez Stripe et redirige Léa vers la page de paiement.
6. Léa paie. Stripe prévient alors le back par un **webhook** : un message automatique envoyé à une adresse de votre application (« paiement confirmé »).
7. Le back vérifie l'authenticité du message, passe le paiement à « réussi » et la réservation à « confirmée », puis déclenche l'email de confirmation.
8. La veille de la séance, un scénario n8n interroge la base, trouve la réservation et envoie le rappel.

> [!tip] Pourquoi le front n'envoie-t-il pas le prix à l'étape 3 ? Parce que tout ce qui part du navigateur peut être modifié par l'utilisateur. Si le back acceptait un prix venu du front, n'importe qui pourrait payer 1 € une séance à 35 €.

## Le schéma textuel de l'architecture de Créno

Inutile d'avoir un logiciel de dessin : un schéma en texte suffit. Il se versionne avec le code, se colle dans un prompt et reste lisible par les outils IA.

\`\`\`text
[Navigateur du client ou du coach]
        |  HTTPS
        v
[Front : Next.js + React, hébergé sur Vercel]
        |  actions serveur / routes API
        v
[Back : code serveur Next.js] ----> [Stripe : paiement en ligne]
        |        ^                          |
        |        +---- webhook « paiement confirmé »
        v
[Supabase : base Postgres + Auth + règles RLS]
        ^
        |  lecture planifiée chaque soir
[n8n : rappel la veille] ----> [Service d'email]
\`\`\`

## Client ou serveur : ce qui doit rester côté serveur

Le **client** est le navigateur (ou l'application mobile) de l'utilisateur. Tout ce qui s'y trouve est visible et modifiable : le code, les données, les requêtes envoyées. Les outils de développement intégrés à chaque navigateur le montrent en deux clics. Le **serveur** est la machine que vous contrôlez.

Doivent rester côté serveur :

- les clés secrètes (Stripe, clé secrète Supabase, clés d'API des modèles d'IA) ;
- le calcul des montants, des remises et des remboursements ;
- la vérification des droits (« ce créneau appartient-il bien à ce coach ? »), en complément des règles de la base ;
- la confirmation d'un paiement, uniquement à partir du webhook de Stripe, jamais à partir de la page « Merci » affichée dans le navigateur ;
- l'envoi d'emails et les appels payants à des API, sinon n'importe qui peut les déclencher en boucle.

Peuvent rester côté client : l'affichage, la navigation, l'état de l'interface (un menu ouvert, un onglet actif) et la validation des formulaires pour le confort de l'utilisateur, à condition de la refaire côté serveur.

> [!warning] Règle d'or : le front vérifie pour le confort, le back vérifie pour la sécurité.
`,
        },
        {
          type: "video",
          title: "Le trajet d'une réservation dans Créno",
          durationMinutes: 6,
          script: `
- Ouverture (30 s) : l'application Créno à l'écran, sur mobile. Question posée : « que se passe-t-il vraiment quand Léa touche Réserver ? »
- Présenter les quatre couches à partir du schéma textuel, en surlignant chaque bloc au fur et à mesure.
- Dérouler les étapes 1 à 5 : le navigateur, puis le code serveur qui vérifie la session, le statut du créneau et lit le prix en base.
- Montrer la page de paiement Stripe en mode test, puis l'arrivée du webhook dans les journaux du serveur.
- Démonstration du risque : modifier une requête dans les outils de développement du navigateur pour changer le prix, et constater que le back l'ignore.
- Montrer le scénario n8n du rappel de la veille et la colonne qui évite les doubles envois.
- Conclusion : trois règles à retenir (secrets côté serveur, prix lu en base, paiement confirmé par webhook).
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Le vocabulaire de l'architecture, sans jargon

Vous découvrez ces notions ? Il est normal de se sentir un peu perdu au début. Retenez d'abord ces huit mots : ils reviendront dans tous les modules suivants.

| Terme | En une phrase | Dans Créno |
| --- | --- | --- |
| Front-end (front) | La partie visible de l'application | La page où Léa choisit son créneau |
| Back-end (back) | La partie invisible qui applique les règles | Le code qui vérifie qu'il reste une place |
| Base de données | Le classeur où tout est rangé durablement | Les tables des créneaux et des réservations |
| Serveur | Un ordinateur allumé en permanence qui exécute le back | Les serveurs de l'hébergeur Vercel |
| Requête | Une demande envoyée d'un programme à un autre | « Donne-moi les créneaux de mardi » |
| API | La liste des demandes qu'un service accepte | L'API de Stripe pour créer un paiement |
| Webhook | Un message automatique qu'un service vous envoie quand un événement se produit | Stripe signale « paiement confirmé » |
| Hébergement | Le service qui rend votre application accessible sur Internet | Vercel pour Créno |

Vous n'avez pas besoin de savoir programmer ces couches pour les décrire. Votre rôle, à ce stade, est de savoir **qui fait quoi**. C'est exactement ce que vous demanderez ensuite aux outils IA de réaliser, et c'est ce qui vous permettra de vérifier leur travail.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Où sont les couches si vous ne codez pas ?

Les quatre couches existent dans toutes les applications, y compris celles construites sans écrire de code. Seuls les outils changent.

| Couche | Avec Bolt.new + Supabase | En mode « concierge » (Airtable + n8n) |
| --- | --- | --- |
| Front | L'application générée par Bolt.new | Une page de réservation simple (formulaire) |
| Back | Les fonctions serveur de Supabase (Edge Functions) et les règles de la base | Les scénarios n8n qui traitent chaque demande |
| Base de données | Supabase | Airtable |
| Services externes | Stripe, service d'email | Stripe (lien de paiement), service d'email |

Le piège fréquent avec les générateurs d'applications : tout mettre dans le front, parce que « ça marche ». Quand vous demandez une fonctionnalité sensible (paiement, calcul de prix, envoi d'email), précisez dans votre prompt : « cette logique doit s'exécuter côté serveur, pas dans le navigateur, et aucune clé secrète ne doit apparaître dans le code du front ».
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Pour les profils techniques : où s'exécute chaque morceau dans Next.js

- Les **composants serveur** (par défaut dans l'App Router) lisent les données côté serveur : ni clé ni requête n'apparaissent dans le navigateur.
- Les **composants client** (directive \`"use client"\`) gèrent l'interactivité. Tout ce qu'ils importent part dans le navigateur : aucune variable secrète ne doit y transiter.
- Les **actions serveur** et les **routes API** (\`route.ts\`) sont des points d'entrée publics : la documentation de Next.js rappelle qu'on peut les appeler directement par une requête POST. Vérifiez l'authentification et les droits dans chacune.
- Côté Supabase, distinguez trois clients : le client navigateur (clé publique, soumis à la RLS), le client serveur qui porte la session de l'utilisateur via les cookies (paquet \`@supabase/ssr\`, toujours soumis à la RLS) et le client administrateur (clé secrète, qui contourne la RLS), réservé au webhook Stripe et aux tâches planifiées.
- Faites passer les écritures sensibles (réservation, annulation) par une action serveur plutôt que par un appel direct depuis le navigateur : vous y centralisez validation, contrôle des places et journalisation.
`,
        },
        {
          type: "exercice",
          title: "Le schéma d'architecture de votre MVP",
          instructions: `
Appliquez la leçon à **votre projet**.

1. Listez les éléments de chacune des quatre couches : front, back, base de données, services externes. Nommez les outils envisagés au module 3, même provisoirement.
2. Dessinez le schéma textuel de votre architecture sur le modèle de celui de Créno (blocs entre crochets, flèches, nature des échanges).
3. Choisissez l'action la plus importante de votre MVP, celle qui apporte la valeur. Décrivez son trajet en 6 à 10 étapes numérotées, de l'écran jusqu'à la base et aux services externes.
4. Listez au moins quatre éléments qui doivent rester côté serveur dans votre projet, en justifiant chacun en une phrase.
5. Relisez : chaque flèche de votre schéma correspond-elle à une étape de votre trajet ? Chaque étape à une flèche ?

Exemple attendu pour Créno (étape 3 du trajet) : « Le front envoie l'identifiant du créneau choisi, sans le prix. Le back relit le prix en base. »
`,
          deliverable: "texte",
          estimatedMinutes: 25,
          review: "auto",
          rubric: [
            "Les quatre couches sont renseignées, avec des outils identifiés.",
            "Le schéma textuel est lisible et cohérent avec le trajet décrit.",
            "Le trajet de l'action clé comporte 6 à 10 étapes précises, du clic à la confirmation.",
            "Les éléments à garder côté serveur sont justifiés (secrets, calculs, droits, paiements).",
          ],
        },
        {
          type: "quiz",
          title: "Vérifiez vos acquis",
          questions: [
            {
              prompt: "Dans Créno, qui détermine le montant que Léa va payer ?",
              options: [
                { label: "Le front, qui l'affiche et l'envoie au back" },
                { label: "Le back, à partir du prix enregistré en base", correct: true },
                { label: "Stripe, qui le devine à partir du créneau" },
                { label: "Léa, qui le saisit dans un champ" },
              ],
              explanation:
                "Tout ce qui vient du navigateur peut être modifié. Le back relit le prix dans la base avant de créer le paiement.",
            },
            {
              prompt: "Comment l'application sait-elle de façon fiable qu'un paiement a réussi ?",
              options: [
                { label: "Quand Léa arrive sur la page « Merci »" },
                { label: "Quand Léa clique sur « Payer »" },
                { label: "Grâce au webhook envoyé par Stripe et vérifié par le back", correct: true },
                { label: "Grâce à un email envoyé par Léa" },
              ],
              explanation:
                "La page « Merci » peut ne jamais s'afficher (onglet fermé) ou être ouverte sans paiement. Seul le webhook signé est une source fiable.",
            },
            {
              prompt: "Laquelle de ces tâches peut s'exécuter côté client ?",
              options: [
                { label: "Appeler l'API de Stripe avec la clé secrète" },
                { label: "Afficher un message si l'email saisi est mal formé", correct: true },
                { label: "Calculer une remise de fidélité" },
                { label: "Confirmer une réservation" },
              ],
              explanation:
                "La validation de confort peut se faire dans le navigateur, à condition d'être refaite côté serveur. Les secrets, calculs et confirmations restent côté serveur.",
            },
            {
              prompt: "Dans l'analogie du restaurant, à quoi correspond la base de données ?",
              options: [
                { label: "À la salle" },
                { label: "À la cuisine" },
                { label: "À la réserve", correct: true },
                { label: "Aux fournisseurs" },
              ],
              explanation:
                "La salle est le front, la cuisine le back, la réserve la base de données, les fournisseurs les services externes.",
            },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------------------
    // L02 — Modéliser ses données
    // ---------------------------------------------------------------------------
    {
      key: "m04-l02",
      title: "Modéliser ses données",
      summary:
        "Transformer les « choses » que gère votre produit en tables, colonnes, relations et contraintes, puis les écrire en SQL pour Supabase ou les construire dans Airtable.",
      estimatedMinutes: 80,
      blocks: [
        {
          type: "texte",
          markdown: `
**À la fin de cette leçon**, vous saurez construire le modèle de données de votre MVP (tables, colonnes, relations, contraintes) et l'écrire en SQL pour Supabase ou le reproduire dans Airtable.

## Le vocabulaire du modèle de données

Un **modèle de données** décrit ce que votre application mémorise et comment ces informations sont reliées. Cinq notions suffisent pour commencer.

- **Entité** : une « chose » que l'application gère (un créneau, une réservation). Chaque entité devient une **table**.
- **Attribut** : une caractéristique de l'entité (l'heure de début d'un créneau). Chaque attribut devient une **colonne** ; chaque élément enregistré est une **ligne**.
- **Type** : la nature de la valeur : texte (\`text\`), nombre entier (\`integer\`), vrai / faux (\`boolean\`), date et heure (\`timestamptz\`), identifiant unique (\`uuid\`).
- **Identifiant** (ou clé primaire) : une valeur unique et stable qui désigne une ligne. Utilisez un identifiant technique, jamais un nom ou un email, qui peuvent changer ou se répéter.
- **Relation** : un lien entre deux tables, matérialisé par une **clé étrangère**, une colonne qui contient l'identifiant d'une ligne d'une autre table (\`coach_id\` dans la table des créneaux).

Méthode pratique : relisez vos user stories du module 1. Les **noms** récurrents (coach, créneau, réservation) sont vos entités candidates ; les **compléments** (« un créneau d'une heure à 35 € ») sont vos attributs.

## Les relations : 1-n et n-n

**Un à plusieurs (1-n).** Un coach publie plusieurs créneaux ; un créneau appartient à un seul coach. La clé étrangère se place du côté « plusieurs » : la table des créneaux contient \`coach_id\`.

**Plusieurs à plusieurs (n-n).** Un client réserve plusieurs créneaux ; un créneau collectif accueille plusieurs clients. Aucune colonne ne peut porter ce lien seule : on crée une **table de liaison**. Chez Créno, c'est la table des réservations : chaque ligne relie un client à un créneau, et porte ses propres informations (statut, annulation, rappel envoyé).

## Les contraintes : laisser la base protéger vos données

Une **contrainte** est une règle que la base refuse de violer, quel que soit le programme qui écrit : votre front, un scénario n8n ou du code généré par l'IA.

- \`not null\` : valeur obligatoire (un créneau a toujours une heure de début) ;
- \`unique\` : pas de doublon (un client ne réserve pas deux fois le même créneau) ;
- \`check\` : condition à respecter (la fin après le début, un statut dans une liste fermée) ;
- \`references\` : la clé étrangère pointe vers une ligne existante ;
- \`default\` : valeur par défaut (statut « en attente », date de création).

## Dates et montants : deux pièges classiques

**Les montants en centimes.** Les ordinateurs représentent mal certains nombres à virgule : en JavaScript, \`0.1 + 0.2\` donne \`0.30000000000000004\`. Stockez les montants en **centimes**, sous forme d'entier (3500 pour 35,00 €), avec la devise. Stripe utilise lui aussi la plus petite unité de la devise.

**Les dates avec fuseau horaire.** Utilisez \`timestamptz\` : Postgres enregistre un instant précis (en temps universel, UTC) et le convertit à l'affichage. Une séance à 18 h à Paris correspond à 16 h UTC en été et à 17 h UTC en hiver : stockez « 18:00 » sans fuseau, et vos rappels seront décalés d'une heure une partie de l'année. Enregistrez aussi le fuseau d'affichage de chaque utilisateur.

## Le modèle de Créno en tableau

| Table | Colonnes principales | Relations | Contraintes clés |
| --- | --- | --- | --- |
| \`profiles\` (profils) | id, role, full_name, phone, timezone | 1-1 avec le compte de connexion | rôle « coach » ou « client » |
| \`slots\` (créneaux) | id, coach_id, starts_at, ends_at, price_cents, capacity, status | n-1 vers profiles (le coach) | fin après début, prix positif ou nul |
| \`bookings\` (réservations) | id, slot_id, client_id, status, reminder_sent_at, cancelled_at | table de liaison clients / créneaux | une seule réservation par client et par créneau |
| \`payments\` (paiements) | id, booking_id, amount_cents, currency, status, provider_payment_id, paid_at | n-1 vers bookings | identifiant Stripe unique |

Les noms sont en anglais, au pluriel, en minuscules séparées par des tirets bas (\`snake_case\`). C'est une convention courante, que les outils IA suivent spontanément ; l'important est de la choisir et de s'y tenir.

## Le même modèle en SQL (Supabase / Postgres)

Le **SQL** est le langage standard des bases de données relationnelles. Voici le modèle de Créno, à exécuter dans l'éditeur SQL de Supabase ou à placer dans une migration.

\`\`\`sql
-- Profils : un par compte (le compte lui-même est géré par Supabase Auth)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('coach', 'client')),
  full_name text not null,
  phone text,                                     -- facultatif (minimisation)
  timezone text not null default 'Europe/Paris',  -- fuseau d'affichage
  created_at timestamptz not null default now()
);

-- Créneaux publiés par un coach
create table public.slots (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price_cents integer not null check (price_cents >= 0),  -- 3500 = 35,00 €
  capacity integer not null default 1 check (capacity >= 1),
  status text not null default 'open' check (status in ('open', 'cancelled')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Réservations : table de liaison entre clients et créneaux
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.slots (id),
  client_id uuid not null references public.profiles (id),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled')),
  reminder_sent_at timestamptz,  -- rempli par n8n : évite les doubles rappels
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (slot_id, client_id)
);

-- Paiements : une réservation peut connaître plusieurs tentatives
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'eur',
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  provider_payment_id text unique,  -- identifiant Stripe
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.slots (coach_id, starts_at);
create index on public.bookings (client_id);
\`\`\`

Deux choix à remarquer. Par défaut, la base refuse de supprimer une ligne encore référencée : on **annule** un créneau (\`status\`) au lieu de le supprimer, et l'historique des paiements est préservé. Et le nombre de places restantes se contrôle dans le back au moment de réserver : une simple contrainte ne suffit pas.

## L'équivalent dans Airtable

Pour un MVP « concierge », créez quatre tables : Profils, Créneaux, Réservations, Paiements. Les relations deviennent des champs **« lien vers un autre enregistrement »** ; les champs **recherche** (lookup) affichent une information de la table liée, les champs **cumul** (rollup) calculent à partir des liens, par exemple le nombre de réservations confirmées d'un créneau. Airtable accepte un lien direct n-n entre clients et créneaux, mais gardez une vraie table Réservations : c'est elle qui porte le statut et le paiement.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Si vous débutez : un modèle de données, c'est un classeur bien rangé

Imaginez un classeur de tableur. Chaque **onglet** est une table (Créneaux, Réservations). Chaque **colonne** est un attribut (date, prix). Chaque **ligne** est un élément (le créneau de mardi 18 h). L'**identifiant** fonctionne comme un numéro de dossier : il ne change jamais, même si le client change d'email.

La différence avec un tableur ordinaire : la base de données **refuse** les erreurs que vous lui avez interdites (un prix négatif, un créneau sans date). C'est un filet de sécurité précieux quand plusieurs outils écrivent dans les mêmes tables.

Le SQL vous impressionne ? Lisez-le comme une phrase : \`create table public.slots\` signifie « crée la table des créneaux » ; \`price_cents integer not null\` signifie « le prix en centimes est un nombre entier obligatoire ». Vous n'avez pas à l'écrire de mémoire. Vous devez être capable de le **relire** et de vérifier qu'il correspond à votre tableau.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Pour les profils non techniques : construire le modèle sans écrire de SQL

- **Avec Bolt.new + Supabase.** Collez votre tableau dans le prompt et demandez : « Crée les tables Supabase correspondant exactement à ce modèle, avec les contraintes indiquées, les montants en centimes et les dates avec fuseau horaire. Montre-moi le SQL et explique chaque table avant de l'appliquer. » Relisez ensuite le SQL avec le tableau de cette leçon : noms de tables, colonnes obligatoires, statuts autorisés.
- **Avec Airtable.** Créez d'abord les quatre tables, puis les champs simples, puis les liens. Utilisez un champ « sélection unique » pour les statuts et un champ devise pour les montants, et vérifiez l'option de fuseau horaire des champs date. Donnez au premier champ de chaque table (le champ principal) une valeur lisible : par exemple une formule qui assemble la date et le nom du coach pour un créneau.

Dans les deux cas, une règle : une information n'est saisie qu'à un seul endroit. Si le nom du coach apparaît dans la table des créneaux, il doit venir d'un lien, pas d'une recopie.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Pour les profils techniques : aller plus loin avec Postgres

- **Migrations.** Une fois le projet lancé, ne modifiez plus le schéma à la main : créez des migrations versionnées (\`supabase migration new create_bookings\` avec la CLI Supabase) et appliquez-les dans chaque environnement.
- **Types générés.** La CLI génère les types TypeScript de votre schéma (\`supabase gen types typescript\`) : votre code et vos agents travaillent sur des noms de colonnes exacts.
- **Listes fermées.** Une contrainte \`check (status in (...))\` évolue plus facilement qu'un type \`enum\` Postgres, dont les valeurs sont délicates à renommer ou à supprimer.
- **Chevauchements.** Pour empêcher un coach de publier deux créneaux ouverts qui se recouvrent, utilisez une contrainte d'exclusion :

\`\`\`sql
create extension if not exists btree_gist with schema extensions;

alter table public.slots
  add constraint slots_no_overlap
  exclude using gist (coach_id with =, tstzrange(starts_at, ends_at) with &&)
  where (status = 'open');
\`\`\`

- **Concurrence.** Deux clients peuvent réserver la dernière place au même instant. Faites la réservation dans une fonction SQL appelée par le back, qui verrouille le créneau (\`select ... for update\`), compte les réservations actives, puis insère ou refuse.
`,
        },
        {
          type: "prompt",
          title: "Faire relire son modèle de données par l'IA",
          tool: "Claude",
          prompt: `
Tu es un architecte de bases de données qui accompagne un porteur de projet sur son MVP.

Contexte du produit : [décrivez votre produit en 3 phrases : utilisateurs, problème, fonctionnalité principale]
Outil de base de données : [Supabase (Postgres) ou Airtable]
Parcours principal : [décrivez l'action clé en 5 étapes]

Voici mon modèle de données :
[collez votre tableau ou votre SQL, sans aucune donnée réelle ni clé d'API]

Relis ce modèle et réponds en quatre parties :
1. Les entités ou relations manquantes pour réaliser le parcours principal.
2. Les erreurs de type ou de contrainte : montants, dates et fuseaux horaires, identifiants, valeurs obligatoires, doublons possibles.
3. Les risques pour la suite : données personnelles non nécessaires, informations dupliquées, suppressions qui casseraient l'historique.
4. Les 3 corrections prioritaires, avec le SQL (ou la structure Airtable) corrigé.

Si une règle métier n'est pas claire, pose-moi d'abord jusqu'à 3 questions. Ne propose pas de fonctionnalités hors du périmètre du MVP.
`,
          tips:
            "Testez ensuite votre modèle avec trois questions concrètes que l'application devra résoudre (par exemple « combien de places reste-t-il sur ce créneau ? »). Si la réponse exige du bricolage, le modèle doit évoluer. Relisez chaque correction proposée : l'IA ajoute parfois des tables inutiles.",
        },
        {
          type: "exercice",
          title: "Le modèle de données de votre MVP",
          instructions: `
Construisez le modèle de données de **votre projet**. Il servira de base à tout le module 6.

1. **Entités.** À partir de vos user stories (module 1), listez 3 à 6 entités. Au-delà, demandez-vous si chacune est vraiment nécessaire au MVP.
2. **Tableau.** Pour chaque entité : nom de table, colonnes, type de chaque colonne, colonnes obligatoires, valeurs uniques, valeurs autorisées (statuts).
3. **Relations.** Indiquez chaque relation (1-n ou n-n) et créez une table de liaison pour chaque relation n-n.
4. **Dates et montants.** Vérifiez : montants en centimes (entier) avec la devise, dates en \`timestamptz\`, fuseau d'affichage prévu.
5. **Traduction.** Écrivez le SQL (\`create table\`) de votre modèle **ou** construisez-le dans Airtable (captures d'écran de chaque table et de ses champs).
6. **Relecture par l'IA.** Utilisez le prompt de cette leçon. Notez les corrections retenues et celles que vous avez refusées, avec une phrase de justification pour chacune.
7. **Test.** Écrivez trois questions que votre application devra résoudre et expliquez comment le modèle y répond.

Livrable : un seul document (PDF ou Markdown) regroupant le tableau, le SQL ou les captures Airtable, et vos notes de relecture. Aucune donnée réelle de clients.
`,
          deliverable: "fichier",
          estimatedMinutes: 55,
          review: "formateur",
          rubric: [
            "Les entités couvrent le parcours clé du MVP, sans table superflue.",
            "Types, identifiants et contraintes sont adaptés (montants en centimes, dates avec fuseau, statuts en liste fermée).",
            "Les relations sont correctes, avec une table de liaison pour chaque relation n-n.",
            "Le SQL est valide, ou la structure Airtable est cohérente avec le tableau.",
            "La relecture par l'IA est exploitée de façon critique (corrections justifiées).",
          ],
        },
        {
          type: "quiz",
          title: "Vérifiez vos acquis",
          questions: [
            {
              prompt: "Comment représenter la relation entre les clients et les créneaux de Créno ?",
              options: [
                { label: "Une colonne client_id dans la table des créneaux" },
                { label: "Une table de liaison (les réservations) qui relie un client à un créneau", correct: true },
                { label: "Une liste de noms de clients dans une colonne texte du créneau" },
                { label: "Une table par coach" },
              ],
              explanation:
                "C'est une relation n-n : un client réserve plusieurs créneaux, un créneau accueille plusieurs clients. La table de liaison porte aussi le statut de la réservation.",
            },
            {
              prompt: "Comment stocker un prix de 35,00 € ?",
              options: [
                { label: "Le texte « 35 € »" },
                { label: "Le nombre décimal 35.0" },
                { label: "L'entier 3500 dans une colonne en centimes, avec la devise", correct: true },
                { label: "L'entier 35, en supposant les euros" },
              ],
              explanation:
                "Les entiers en centimes évitent les erreurs d'arrondi des nombres à virgule. La devise est enregistrée à part.",
            },
            {
              prompt: "Pourquoi ne pas utiliser l'email comme identifiant d'un profil ?",
              options: [
                { label: "Parce qu'un email peut changer, alors qu'un identifiant doit rester stable", correct: true },
                { label: "Parce qu'un email est trop long pour une base de données" },
                { label: "Parce que Supabase interdit les emails dans les tables" },
                { label: "Parce qu'un email ne peut pas être unique" },
              ],
              explanation:
                "Un identifiant technique (uuid) ne change jamais, ce qui garantit que toutes les relations restent valides.",
            },
            {
              prompt: "Où placer la clé étrangère d'une relation 1-n entre un coach et ses créneaux ?",
              options: [
                { label: "Dans la table des profils (colonne slot_id)" },
                { label: "Dans la table des créneaux (colonne coach_id)", correct: true },
                { label: "Dans une table de liaison obligatoire" },
                { label: "Dans les deux tables" },
              ],
              explanation: "La clé étrangère se place toujours du côté « plusieurs » de la relation.",
            },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------------------
    // L03 — Utilisateurs, rôles et authentification
    // ---------------------------------------------------------------------------
    {
      key: "m04-l03",
      title: "Utilisateurs, rôles et authentification",
      summary:
        "Choisir un mode de connexion, définir les rôles et traduire « qui a le droit de voir quoi » en règles de sécurité appliquées par la base (RLS).",
      estimatedMinutes: 65,
      blocks: [
        {
          type: "texte",
          markdown: `
**À la fin de cette leçon**, vous saurez choisir un mode de connexion, définir les rôles de votre application et traduire « qui a le droit de voir quoi » en règles appliquées par la base de données elle-même.

## Authentification et autorisation : deux questions différentes

L'**authentification** répond à « qui êtes-vous ? » : l'utilisateur prouve son identité. L'**autorisation** répond à « avez-vous le droit de faire cela ? ». Dans un immeuble de bureaux, le badge vous authentifie ; les portes qu'il ouvre relèvent de l'autorisation. Une application peut avoir une authentification parfaite et une autorisation désastreuse : chacun est bien connecté… et voit les données de tout le monde.

## Trois façons de se connecter

| Méthode | Principe | Forces | Limites |
| --- | --- | --- | --- |
| Lien magique | L'utilisateur saisit son email et reçoit un lien de connexion à usage unique | Aucun mot de passe à retenir ni à protéger | Dépend de la réception des emails (délais, courrier indésirable) |
| Email et mot de passe | Méthode classique | Familière, ne dépend pas de la boîte mail | Mots de passe faibles ou réutilisés, parcours « mot de passe oublié » à prévoir |
| Connexion via un fournisseur | « Continuer avec Google » ou un autre fournisseur (protocole OAuth) | Rapide, pas de mot de passe supplémentaire | Configuration chez chaque fournisseur, dépendance à un tiers |

Pour Créno, l'usage guide le choix : les clients réservent quelques fois par mois, le lien magique leur évite un mot de passe de plus ; les coachs se connectent tous les jours, un mot de passe ou un fournisseur leur convient mieux.

## Supabase Auth en bref

Supabase Auth gère les comptes, les sessions (la preuve de connexion conservée par le navigateur), les emails de connexion et les fournisseurs externes. Les comptes sont stockés dans une table interne, \`auth.users\`, que vous ne modifiez pas directement. Vos propres informations (nom, rôle, fuseau) vivent dans \`public.profiles\`, reliée au compte par le même identifiant. Dans vos règles SQL, la fonction \`auth.uid()\` renvoie l'identifiant de l'utilisateur connecté.

Deux réglages à ne pas oublier : déclarer les adresses de redirection autorisées (votre site en local et en production) et, avant le lancement, brancher votre propre service d'envoi d'emails ; le service intégré est prévu pour les tests. Vérifiez ses limites et les réglages à jour dans la [documentation Supabase](https://supabase.com/docs).

## Rôles : la matrice des droits

Un **rôle** regroupe des droits. Créno en a deux, enregistrés dans \`profiles.role\`. Avant d'écrire la moindre règle, remplissez une **matrice des droits** :

| Donnée | Client | Coach | Serveur (clé secrète) |
| --- | --- | --- | --- |
| Son propre profil | Lire, modifier (sauf le rôle) | Lire, modifier (sauf le rôle) | Tout |
| Créneaux | Lire les créneaux ouverts | Créer, lire, modifier les siens uniquement | Tout |
| Réservations | Créer, lire et annuler les siennes | Lire celles de ses créneaux | Confirmer après paiement |
| Paiements | Lire les siens | Lire ceux de ses séances | Créer et mettre à jour |

## La sécurité au niveau des lignes (RLS)

Avec Supabase, le front peut interroger la base directement, avec une clé publique visible dans le navigateur. C'est pratique, mais la base doit alors filtrer elle-même ce que chacun peut voir. C'est le rôle de la **Row Level Security** (RLS, sécurité au niveau des lignes) : pour chaque table, des **politiques** (policies) disent à quelles lignes un utilisateur a accès, et pour quelles opérations.

- Une table avec RLS activée et **sans politique** n'est accessible à personne via l'API : c'est un refus par défaut.
- La clause \`using\` filtre les lignes existantes (lecture, modification, suppression).
- La clause \`with check\` valide les lignes écrites (création, modification).

\`\`\`sql
-- 1. Activer la RLS sur toutes les tables, dès leur création
alter table public.profiles enable row level security;
alter table public.slots    enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;

-- 2. L'utilisateur connecté est-il coach ? (security definer : lit profiles
--    sans déclencher ses politiques, ce qui évite les boucles entre règles)
create or replace function public.is_coach()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'coach'
  );
$$;

-- 3. Profils : chacun lit et modifie le sien ; les profils coach sont visibles
create policy "lire son profil" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "modifier son profil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "lire les profils coach" on public.profiles
  for select to authenticated using (role = 'coach');

-- 4. Créneaux : un coach ne voit et ne gère que les siens
create policy "coach : gérer ses créneaux" on public.slots
  for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and public.is_coach());
create policy "client : voir les créneaux ouverts" on public.slots
  for select to authenticated
  using (status = 'open' and not public.is_coach());

-- 5. Réservations : un client ne voit que les siennes
create policy "client : voir ses réservations" on public.bookings
  for select to authenticated using (client_id = auth.uid());
create policy "client : réserver pour lui-même" on public.bookings
  for insert to authenticated
  with check (client_id = auth.uid() and status = 'pending' and not public.is_coach());
create policy "client : annuler sa réservation" on public.bookings
  for update to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid() and status = 'cancelled');
create policy "coach : voir les réservations de ses créneaux" on public.bookings
  for select to authenticated
  using (exists (
    select 1 from public.slots s
    where s.id = bookings.slot_id and s.coach_id = auth.uid()
  ));
\`\`\`

Lisez chaque politique comme une phrase : « sur la table des réservations, en lecture, un utilisateur connecté voit les lignes dont il est le client ». Les politiques d'une même opération s'additionnent. La table des paiements suit la même logique en lecture (le prompt de cette leçon vous aidera à écrire ces politiques) ; aucune politique d'écriture n'y est créée, car seul le serveur y écrit.

## Les pièges à éviter

- **Une table sans RLS.** Dans Supabase, une table du schéma public sans RLS peut être lue, voire modifiée, par quiconque possède la clé publique, qui se trouve dans votre front. Activez la RLS à la création de chaque table.
- **Une clé secrète exposée.** La clé secrète (\`service_role\` dans les projets plus anciens) contourne toutes les politiques. Jamais dans le front, jamais dans une variable préfixée \`NEXT_PUBLIC_\`, jamais dans un dépôt Git ni dans un prompt. En cas de fuite, régénérez-la immédiatement.
- **Oublier que la RLS filtre des lignes, pas des colonnes.** Si une ligne est visible, toutes ses colonnes le sont : le téléphone d'un coach dont le profil est public est public.
- **Laisser l'utilisateur modifier son rôle.** Une politique de mise à jour trop large permet à un client de devenir coach.
- **Tester uniquement en administrateur.** L'éditeur SQL du tableau de bord ignore la RLS. Testez avec deux comptes réels (un coach, un client) dans deux navigateurs.
`,
        },
        {
          type: "video",
          title: "La RLS en pratique : deux comptes, deux vues",
          durationMinutes: 7,
          script: `
- Rappel (30 s) : authentification et autorisation, avec l'image du badge et des portes.
- Dans un projet Supabase de démonstration, créer la table des réservations sans RLS et montrer qu'une requête avec la clé publique renvoie toutes les lignes.
- Activer la RLS : la même requête ne renvoie plus rien (refus par défaut).
- Ajouter la politique « client : voir ses réservations » et se connecter avec deux comptes clients dans deux navigateurs : chacun ne voit que ses lignes.
- Se connecter en coach : il voit les réservations de ses créneaux, pas celles des autres coachs.
- Montrer une erreur fréquente : une politique \`using (true)\` qui rouvre tout, puis la corriger.
- Conclusion : la matrice des droits comme point de départ, le test à deux comptes comme vérification.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Si vous débutez : la RLS, ce sont les portes de l'immeuble

Reprenons l'immeuble de bureaux. La connexion vous donne un badge. La RLS, ce sont les portes programmées : votre badge ouvre votre bureau et la salle de réunion commune, pas le bureau du voisin. Si une porte n'a pas été programmée (une table sans RLS), elle reste grande ouverte. Si quelqu'un vole le passe-partout du gardien (la clé secrète), il entre partout.

Vous n'avez pas besoin de retenir la syntaxe SQL. Retenez trois réflexes : **une matrice des droits avant tout**, **la RLS activée sur chaque table**, **un test avec deux comptes différents**. Ces trois réflexes vous protègent déjà des erreurs les plus graves.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Pour les profils non techniques : obtenir des règles fiables sans les écrire

- **Avec Bolt.new + Supabase**, donnez votre matrice des droits à l'outil et demandez explicitement : « Active la RLS sur toutes les tables et crée les politiques correspondant exactement à cette matrice. Explique chaque politique en une phrase. » Vérifiez ensuite avec deux comptes de test, un par rôle : chaque compte ne doit voir que ce que la matrice autorise.
- **Avec Airtable (MVP concierge)**, il n'existe pas de RLS : ne partagez jamais la base entière par un lien public. Faites entrer les données par un formulaire et donnez à chaque personne de l'équipe un accès limité aux vues ou interfaces dont elle a besoin. Les clients ne se connectent pas à Airtable : ils reçoivent des emails envoyés par n8n.
- Dans tous les cas, demandez à l'IA de relire ses propres règles avec cette question : « Quel utilisateur pourrait voir ou modifier une donnée qui ne lui appartient pas ? »
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Pour les profils techniques : compléter et durcir les politiques

Les paiements et la visibilité des clients pour leur coach s'écrivent avec des sous-requêtes :

\`\`\`sql
create policy "client : voir ses paiements" on public.payments
  for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = payments.booking_id and b.client_id = auth.uid()
  ));

create policy "coach : voir les paiements de ses séances" on public.payments
  for select to authenticated
  using (exists (
    select 1 from public.bookings b
    join public.slots s on s.id = b.slot_id
    where b.id = payments.booking_id and s.coach_id = auth.uid()
  ));

create policy "coach : voir ses clients" on public.profiles
  for select to authenticated
  using (exists (
    select 1 from public.bookings b
    join public.slots s on s.id = b.slot_id
    where b.client_id = profiles.id and s.coach_id = auth.uid()
  ));

-- Interdire la modification du rôle : droits par colonne
revoke update on public.profiles from authenticated;
grant update (full_name, phone, timezone) on public.profiles to authenticated;
\`\`\`

- **Récursion.** Si la politique d'une table A interroge une table B dont la politique interroge A, Postgres renvoie une erreur de récursion infinie. D'où \`is_coach()\` en \`security definer\` : elle lit \`profiles\` sans déclencher ses politiques. Si vous multipliez ces fonctions, placez-les dans un schéma non exposé par l'API.
- **Performance.** La documentation Supabase recommande d'écrire \`(select auth.uid())\` dans les politiques, pour que la valeur soit évaluée une fois par requête, et d'indexer les colonnes filtrées (\`client_id\`, \`coach_id\`).
- **Tests.** Écrivez un test par rôle : un client de test tente de lire la réservation d'un autre client, le résultat doit être vide.
- **Écritures sensibles.** Pas de politique d'écriture sur \`payments\` : seul le webhook Stripe, exécuté côté serveur avec la clé secrète, y écrit. Le passage d'une réservation à « confirmed » suit le même chemin.
`,
        },
        {
          type: "prompt",
          title: "Générer les politiques RLS à partir de votre matrice des droits",
          tool: "Claude",
          prompt: `
Tu es expert en sécurité Supabase (Postgres, Row Level Security).

Voici mon modèle de données (SQL, sans aucune donnée réelle) :
[collez vos instructions create table]

Voici ma matrice des droits :
[collez votre tableau : rôles, tables, opérations autorisées et sur quelles lignes]

1. Écris le SQL qui active la RLS sur toutes les tables et crée les politiques correspondant exactement à la matrice, avec auth.uid() pour l'utilisateur connecté.
2. Si une politique doit consulter une autre table protégée, évite les récursions entre politiques (fonction security definer si nécessaire).
3. Ajoute au-dessus de chaque politique un commentaire d'une phrase en français.
4. Liste ensuite les cas où un utilisateur pourrait encore voir ou modifier une donnée qui ne lui appartient pas.
5. Propose un plan de test avec deux comptes par rôle, dont des tests qui doivent échouer.

N'utilise jamais la clé secrète côté navigateur.
`,
          tips:
            "Ne collez jamais de clé d'API ni de données réelles. Relisez chaque politique comme une phrase, puis testez avec de vrais comptes : une politique générée par l'IA peut être trop permissive.",
        },
        {
          type: "exercice",
          title: "Rôles, connexion et règles d'accès de votre MVP",
          instructions: `
Définissez qui a le droit de faire quoi dans **votre projet**.

1. **Rôles.** Listez les rôles de votre application (deux ou trois au maximum pour un MVP) et décrivez chacun en une phrase.
2. **Connexion.** Choisissez une méthode d'authentification par rôle et justifiez-la par l'usage : fréquence de connexion, aisance numérique de vos utilisateurs.
3. **Matrice des droits.** Pour chaque table de votre modèle (leçon 2) et chaque rôle : lire, créer, modifier, supprimer, et sur quelles lignes.
4. **Règles.** Traduisez la matrice en politiques : en SQL si vous utilisez Supabase, ou en phrases précises du type « sur la table X, pour l'opération Y, un utilisateur accède aux lignes où Z » (vous les ferez générer au module 6).
5. **Plan de test.** Décrivez trois tests avec deux comptes différents, dont au moins un qui doit **échouer** (exemple Créno : un client tente de lire la réservation d'un autre client).
6. **Données sensibles.** Signalez les colonnes qu'il ne faut pas rendre visibles à d'autres utilisateurs.
`,
          deliverable: "texte",
          estimatedMinutes: 30,
          review: "auto",
          rubric: [
            "Les rôles sont peu nombreux et clairement définis.",
            "La méthode de connexion est justifiée par l'usage.",
            "La matrice couvre toutes les tables et toutes les opérations.",
            "Les politiques (SQL ou phrases) correspondent à la matrice, sans règle trop large.",
            "Le plan de test inclut au moins un test d'accès interdit.",
          ],
        },
        {
          type: "quiz",
          title: "Vérifiez vos acquis",
          questions: [
            {
              prompt: "Léa est bien connectée, mais elle voit les réservations de tous les clients. Quel est le problème ?",
              options: [
                { label: "Un problème d'authentification" },
                { label: "Un problème d'autorisation", correct: true },
                { label: "Un problème d'hébergement" },
                { label: "Un problème de lien magique" },
              ],
              explanation:
                "L'identité de Léa est vérifiée (authentification), mais les règles d'accès (autorisation) sont trop larges.",
            },
            {
              prompt: "Que se passe-t-il pour une table dont la RLS est activée mais qui n'a aucune politique ?",
              options: [
                { label: "Tout le monde peut tout lire" },
                { label: "Seuls les utilisateurs connectés peuvent lire" },
                { label: "Personne n'y accède via l'API, sauf avec la clé secrète", correct: true },
                { label: "Supabase crée automatiquement des politiques" },
              ],
              explanation: "La RLS fonctionne en refus par défaut : sans politique, aucune ligne n'est accessible.",
            },
            {
              prompt: "Quelle clause vérifie les lignes qu'un utilisateur crée ou modifie ?",
              options: [
                { label: "using" },
                { label: "with check", correct: true },
                { label: "references" },
                { label: "default" },
              ],
              explanation:
                "using filtre les lignes existantes ; with check valide les nouvelles valeurs écrites (création, modification).",
            },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------------------
    // L04 — Intégrations et API
    // ---------------------------------------------------------------------------
    {
      key: "m04-l04",
      title: "Intégrations et API",
      summary:
        "Comprendre les API, les webhooks, les emails transactionnels et les automatisations n8n, protéger les secrets et rendre les échanges robustes grâce à l'idempotence.",
      estimatedMinutes: 45,
      blocks: [
        {
          type: "texte",
          markdown: `
**À la fin de cette leçon**, vous saurez décrire les échanges entre votre application et les services externes (API, webhooks, emails, automatisations), protéger les secrets qu'ils nécessitent et rendre ces échanges robustes aux répétitions.

## Une API, c'est un contrat entre deux programmes

Une **API** définit les demandes qu'un service accepte, leur format et les réponses qu'il renvoie. Votre application en consomme (Stripe, service d'email) et en expose (votre back). Une requête HTTP comporte :

- une **méthode**, qui dit l'intention : \`GET\` (lire), \`POST\` (créer), \`PATCH\` (modifier), \`DELETE\` (supprimer) ;
- une **URL**, l'adresse de la ressource ;
- des **en-têtes**, dont l'authentification (souvent une clé d'API) ;
- un **corps**, les données envoyées, généralement en **JSON** (un texte structuré en paires « clé : valeur »).

La réponse contient un **code de statut** (\`200\` succès, \`201\` créé, \`400\` requête invalide, \`401\` non authentifié, \`403\` interdit, \`404\` introuvable, \`500\` erreur du serveur) et, le plus souvent, un corps JSON.

\`\`\`text
POST https://api.fournisseur-email.example/v1/emails
Authorization: Bearer CLE_SECRETE   (lue dans une variable d'environnement côté serveur)
Content-Type: application/json

{ "to": "lea@example.com", "subject": "Votre séance de mardi 18 h est confirmée" }
\`\`\`

## Les webhooks : quand le service vous appelle

Avec une API, c'est vous qui demandez. Avec un **webhook**, c'est le service qui vous prévient : vous lui donnez une adresse de votre back, et il y envoie une requête dès qu'un événement se produit. Chez Créno, Stripe envoie un événement quand un paiement est finalisé (par exemple \`checkout.session.completed\`).

Pourquoi ne pas confirmer la réservation quand Léa revient sur la page « Merci » ? Parce qu'elle peut fermer l'onglet avant, perdre le réseau, ou ouvrir cette page sans avoir payé. Le webhook est la source fiable, à quatre conditions :

1. **Vérifier la signature** : Stripe signe chaque message avec un secret partagé ; le back rejette tout message dont la signature est invalide.
2. **Répondre vite** avec un code de succès, sans traitement long, sinon le service considère l'envoi comme un échec et réessaie.
3. **Accepter les répétitions** : le même événement peut arriver plusieurs fois.
4. **Journaliser** chaque événement reçu, pour comprendre ce qui s'est passé en cas de litige.

## L'idempotence, expliquée simplement

Une opération est **idempotente** si la faire deux fois produit le même résultat que la faire une fois. Appuyer cinq fois sur le bouton d'appel d'un ascenseur ne fait pas venir cinq ascenseurs. Chez Créno, trois situations l'exigent :

- Stripe renvoie deux fois « paiement confirmé » : la réservation est confirmée une fois, et Léa reçoit un seul email.
- Léa double-clique sur « Réserver » : une seule réservation est créée, grâce à la contrainte \`unique (slot_id, client_id)\`.
- Le scénario de rappel est relancé après une erreur : personne ne reçoit deux rappels, grâce à la colonne \`reminder_sent_at\`.

Trois techniques : un **identifiant unique** protégé par une contrainte (l'identifiant du paiement chez Stripe) ; **vérifier l'état avant d'agir** (« si le paiement est déjà confirmé, ne rien faire ») ; **marquer ce qui a été fait** (date d'envoi du rappel). Stripe accepte aussi une clé d'idempotence à la création d'un paiement, pour qu'une requête répétée ne crée pas deux paiements.

## Les emails transactionnels

Un email **transactionnel** est déclenché par une action ou un événement : lien de connexion, confirmation, rappel, reçu, annulation. Il se distingue de l'email marketing (newsletter, promotion), soumis à des règles de consentement. Envoyez-les via un fournisseur spécialisé, par API ou par SMTP (le protocole standard d'envoi d'emails). Configurez l'authentification de votre domaine (enregistrements SPF, DKIM et DMARC, que le fournisseur vous indique) pour limiter le classement en courrier indésirable, et n'y mettez aucune donnée sensible.

## Automatiser avec n8n : le rappel de la veille

**n8n** enchaîne des étapes (des nœuds) dans un scénario (un workflow). Le rappel de Créno tient en quatre nœuds :

1. Un déclencheur planifié, chaque jour à 18 h, avec le bon fuseau horaire.
2. Une requête à Supabase : les réservations confirmées dont le créneau commence le lendemain et dont \`reminder_sent_at\` est vide.
3. L'envoi de l'email de rappel pour chaque réservation.
4. La mise à jour de \`reminder_sent_at\` avec l'heure d'envoi.

n8n a besoin d'un accès à la base : enregistrez-le dans ses identifiants (credentials) chiffrés, jamais en clair dans un nœud, et protégez l'accès à votre instance n8n. Les nœuds disponibles sont décrits dans la [documentation n8n](https://docs.n8n.io).

## Variables d'environnement et secrets

Une **variable d'environnement** est un paramètre fourni au programme par l'environnement où il tourne (votre ordinateur, la préproduction, la production) au lieu d'être écrit dans le code. Les **secrets** (clés d'API, mots de passe) passent toujours par elles.

\`\`\`bash
# .env.local : jamais versionné (vérifiez qu'il figure dans .gitignore)
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=cle-publique   # visible dans le navigateur : normal
SUPABASE_SECRET_KEY=cle-secrete                     # serveur uniquement
STRIPE_SECRET_KEY=cle-secrete-stripe                # serveur uniquement
STRIPE_WEBHOOK_SECRET=secret-de-signature           # serveur uniquement
\`\`\`

Avec Next.js, toute variable préfixée \`NEXT_PUBLIC_\` est envoyée au navigateur : n'y mettez que des valeurs publiques. En production, les secrets se saisissent dans les réglages du projet Vercel (un jeu de valeurs par environnement), dans les secrets des fonctions Supabase ou dans les identifiants n8n.

## La carte des intégrations de Créno

| Intégration | Déclencheur | Données échangées | Secret | Si ça échoue |
| --- | --- | --- | --- | --- |
| Paiement Stripe | Le client clique « Payer » | Montant, identifiant de réservation | Clé secrète Stripe | La réservation reste « en attente » puis expire |
| Webhook Stripe | Paiement finalisé | Identifiant de session, statut | Secret de signature | Stripe renvoie l'événement plus tard |
| Email de confirmation | Réservation confirmée | Email, date, lieu | Clé du fournisseur d'email | Journaliser et réessayer |
| Rappel n8n | Chaque jour à 18 h | Réservations du lendemain | Accès Supabase stocké dans n8n | Alerte, envoi manuel |
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Si vous débutez : appeler ou être rappelé

Une **API**, c'est comme téléphoner à un service client : vous appelez, vous posez une question dans les termes attendus, on vous répond. Un **webhook**, c'est l'inverse : vous laissez votre numéro, et le service vous rappelle quand votre commande est prête. Vous n'avez pas à appeler toutes les cinq minutes pour savoir si le paiement est passé.

Une **variable d'environnement**, c'est un coffre posé à côté de votre application : le code dit « prends la clé dans le coffre », sans jamais écrire la clé elle-même. Si quelqu'un lit votre code, il ne trouve pas la clé.

Ces notions vous paraîtront plus concrètes au module 6, quand vous brancherez vos premiers services. Pour l'instant, l'objectif est de savoir les nommer et de repérer où elles interviennent dans votre projet.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Pour les profils non techniques : intégrer sans coder

- **Rappels et notifications avec n8n.** Le scénario de rappel se construit avec un déclencheur planifié, un nœud Supabase (ou Airtable) pour lire les réservations, un nœud d'envoi d'email et un nœud de mise à jour. Testez d'abord avec des données fictives, consultez l'historique des exécutions, puis activez le scénario.
- **Paiement en mode concierge.** Un lien de paiement Stripe suffit pour démarrer. Pour mettre à jour Airtable automatiquement après paiement, n8n peut recevoir les événements de Stripe (déclencheur dédié ou nœud Webhook générique) ; sinon, un rapprochement manuel quotidien reste acceptable au tout début.
- **Avec Bolt.new + Supabase**, demandez explicitement que le webhook Stripe soit traité par une fonction serveur (Edge Function) qui vérifie la signature, et que les clés secrètes soient stockées dans les secrets du projet, jamais dans le code du front.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Pour les profils techniques : un webhook Stripe idempotent avec Next.js

Exemple simplifié de route \`app/api/stripe/webhook/route.ts\`. Adaptez-le à la version de vos bibliothèques et relisez la documentation de Stripe.

\`\`\`ts
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
// Client administrateur : clé secrète, uniquement dans ce code serveur
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text(); // corps brut, indispensable pour vérifier la signature
  const signature = req.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    // Idempotent : ne met à jour que si le paiement n'est pas déjà confirmé
    const { data: payment } = await admin
      .from("payments")
      .update({ status: "succeeded", paid_at: new Date().toISOString() })
      .eq("provider_payment_id", session.id)
      .neq("status", "succeeded")
      .select("booking_id")
      .maybeSingle();

    if (payment) {
      await admin.from("bookings").update({ status: "confirmed" }).eq("id", payment.booking_id);
      // Envoyer ici l'email de confirmation : une seule fois, grâce au filtre ci-dessus
    }
  }
  return new Response("ok", { status: 200 });
}
\`\`\`

Pour tester en local, l'outil en ligne de commande de Stripe peut relayer les événements vers votre machine. Journalisez l'identifiant de chaque événement reçu.
`,
        },
        {
          type: "prompt",
          title: "Concevoir une intégration robuste",
          tool: "Claude",
          prompt: `
Tu es développeur back-end senior. Je construis [décrivez votre MVP en 2 phrases] avec [votre stack].

Je dois intégrer [service : paiement, email, calendrier, IA…] pour [objectif]. Déclencheur : [événement].

Propose :
1. Le trajet complet des échanges (requêtes et webhooks), étape par étape.
2. Les secrets nécessaires et l'endroit où les stocker (jamais dans le navigateur).
3. Les cas d'échec (service indisponible, événement reçu deux fois, délai dépassé) et la réponse prévue pour chacun.
4. La technique d'idempotence à mettre en place.
5. La liste des tests à réaliser dans le mode test du service.

Réponds d'abord par le plan, sans code. Je te demanderai le code ensuite.
`,
          tips:
            "Demander le plan avant le code vous permet de vérifier la logique. N'indiquez que les noms de vos variables d'environnement, jamais leurs valeurs.",
        },
        {
          type: "exercice",
          title: "La carte des intégrations de votre MVP",
          instructions: `
Cartographiez les échanges de **votre projet** avec l'extérieur.

1. Listez tous les services externes de votre MVP : paiement, email, automatisation, IA, calendrier, stockage de fichiers…
2. Pour chacun, remplissez une ligne du tableau de Créno : déclencheur, données échangées, secret utilisé et endroit où il est stocké, comportement en cas d'échec.
3. Identifiez les événements qui arrivent par webhook et, pour chacun, la manière de vérifier qu'il est authentique.
4. Pour chaque opération qui pourrait être répétée (double clic, renvoi d'événement, relance d'un scénario), décrivez la technique d'idempotence retenue.
5. Rédigez la liste de vos variables d'environnement (les noms seulement, jamais les valeurs), en séparant les publiques et les secrètes.
`,
          deliverable: "texte",
          estimatedMinutes: 20,
          review: "auto",
          rubric: [
            "Toutes les intégrations nécessaires au parcours clé sont identifiées.",
            "Chaque secret a un emplacement côté serveur clairement indiqué.",
            "Les webhooks prévoient une vérification d'authenticité.",
            "Les opérations répétables ont une protection d'idempotence.",
          ],
        },
        {
          type: "quiz",
          title: "Vérifiez vos acquis",
          questions: [
            {
              prompt: "Qu'est-ce qu'un webhook ?",
              options: [
                { label: "Une requête que votre application envoie à un service toutes les minutes" },
                { label: "Une requête qu'un service envoie à votre application quand un événement se produit", correct: true },
                { label: "Une clé d'API publique" },
                { label: "Un type de base de données" },
              ],
              explanation:
                "Le service vous prévient lui-même (par exemple « paiement confirmé »), à une adresse de votre back.",
            },
            {
              prompt: "Stripe envoie deux fois le même événement « paiement confirmé ». Que doit faire une intégration idempotente ?",
              options: [
                { label: "Confirmer deux fois la réservation et envoyer deux emails" },
                { label: "Renvoyer une erreur à Stripe" },
                { label: "Constater que le paiement est déjà confirmé et ne rien refaire", correct: true },
                { label: "Rembourser le second paiement" },
              ],
              explanation:
                "Rejouer l'opération ne doit pas changer le résultat : on vérifie l'état avant d'agir.",
            },
            {
              prompt: "Dans un projet Next.js, où peut-on placer la clé publique Supabase ?",
              options: [
                { label: "Dans une variable préfixée NEXT_PUBLIC_, car elle est prévue pour le navigateur", correct: true },
                { label: "Nulle part : elle ne doit jamais être visible" },
                { label: "Directement dans le code, versionné sur GitHub, avec la clé secrète" },
                { label: "Dans un prompt, pour que l'IA configure le projet" },
              ],
              explanation:
                "La clé publique est faite pour le front (la RLS la limite). La clé secrète, elle, ne doit jamais porter ce préfixe.",
            },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------------------
    // L05 — Sécurité, RGPD et bonnes pratiques
    // ---------------------------------------------------------------------------
    {
      key: "m04-l05",
      title: "Sécurité, RGPD et bonnes pratiques",
      summary:
        "Appliquer les règles de sécurité essentielles d'un MVP (secrets, validation, moindre privilège, sauvegardes) et vérifier les grands principes du RGPD.",
      estimatedMinutes: 50,
      blocks: [
        {
          type: "texte",
          markdown: `
**À la fin de cette leçon**, vous saurez appliquer les règles de sécurité essentielles d'un MVP et vérifier les grands principes du RGPD pour votre projet, à l'aide de deux checklists.

> [!info] Les éléments juridiques de cette leçon sont des informations générales, pas un conseil juridique. Référez-vous au site de la CNIL ([cnil.fr](https://www.cnil.fr)) et, en cas de doute, à un professionnel du droit.

## Les secrets : clé publique ou clé secrète

| Clé | Où elle vit | Ce qu'elle permet | En cas de fuite |
| --- | --- | --- | --- |
| Clé publique Supabase (publishable, ou anon dans les projets plus anciens) | Front, visible par tous | Agir en visiteur ou en utilisateur connecté, dans les limites de la RLS | Peu de risque si la RLS est correcte |
| Clé secrète Supabase (secret, ou service_role) | Serveur uniquement | Tout lire et tout modifier, en contournant la RLS | Accès total aux données : régénérer immédiatement |
| Clé publiable Stripe | Front | Afficher les éléments de paiement | Risque faible |
| Clé secrète Stripe | Serveur uniquement | Créer des paiements, rembourser, lire les clients | Critique : révoquer immédiatement |

Trois réflexes : les secrets vivent dans des variables d'environnement côté serveur ; ils ne sont jamais versionnés dans Git, jamais collés dans un prompt, jamais envoyés par messagerie ; une clé exposée se **régénère**, elle ne se « cache » pas après coup, car l'historique Git la conserve.

## Valider toutes les données entrantes

Tout ce qui arrive au back (formulaires, paramètres d'URL, webhooks) peut avoir été fabriqué. **Validez côté serveur** : le type (un nombre est un nombre), le format (un email ressemble à un email), la longueur (un nom de 5 000 caractères est suspect), les valeurs autorisées (un statut de la liste) et l'**appartenance** (la réservation annulée appartient bien à l'utilisateur connecté). Les contraintes de la base (leçon 2) forment le dernier filet.

Pour une réservation Créno : le créneau existe, il est ouvert, il n'est pas passé, il reste une place, et le prix est lu en base. À l'affichage, n'insérez jamais un contenu saisi par un utilisateur sous forme de HTML brut : React protège par défaut le texte affiché, tant que vous ne contournez pas ce mécanisme.

## Le principe du moindre privilège

Chaque personne et chaque programme ne reçoit que les droits nécessaires à sa tâche. Concrètement : des comptes nominatifs (jamais de mot de passe partagé) ; la double authentification activée sur vos comptes d'outils (GitHub, Supabase, Vercel, Stripe, n8n…) dès qu'elle est proposée ; des accès retirés à la fin de la mission d'un prestataire ; la clé secrète utilisée seulement là où elle est indispensable (webhook, tâches planifiées).

## Sauvegardes : prévoir le pire

Une erreur de manipulation ou un script généré par l'IA qui supprime une table, et vos données disparaissent. Vérifiez ce que votre offre Supabase inclut en matière de sauvegardes automatiques et de restauration. Faites un export régulier, par exemple avec la commande \`supabase db dump\` de la CLI, stocké hors de Supabase. **Testez une restauration** au moins une fois avant le lancement. Le code, lui, est sauvegardé par Git et GitHub. Sur Airtable, renseignez-vous sur les instantanés (snapshots) de base et exportez régulièrement vos tables en CSV.

## RGPD : les principes utiles pour un MVP

Le RGPD (Règlement général sur la protection des données) s'applique dès que vous traitez des **données personnelles** : toute information se rapportant à une personne identifiée ou identifiable (nom, email, téléphone, adresse IP, historique de réservations). En tant qu'éditeur de Créno, vous êtes **responsable de traitement** : vous décidez pourquoi et comment ces données sont utilisées.

- **Minimisation** : ne collectez que ce qui est nécessaire à la finalité. Créno demande un nom et un email ; le téléphone est facultatif ; aucune date de naissance. Attention aux **données de santé** (blessures, pathologies) : elles font partie des catégories particulières de données, soumises à un régime renforcé. Le MVP de Créno n'en collecte pas.
- **Base légale** : chaque traitement repose sur l'une des six bases prévues par le RGPD. Pour Créno : l'exécution du contrat (gérer la réservation), l'obligation légale (conserver les pièces comptables), le consentement (une éventuelle newsletter).
- **Information** : une politique de confidentialité claire, accessible au moment de la collecte : qui vous êtes, pourquoi vous collectez, sur quelle base, pour combien de temps, à qui les données sont transmises, quels droits existent et comment les exercer.
- **Durée de conservation** : fixez une durée pour chaque catégorie de données, puis supprimez ou anonymisez. Par exemple : compte supprimé après une période d'inactivité définie, pièces comptables conservées pendant la durée légale.
- **Droits des personnes** : accès, rectification, effacement, opposition, limitation, portabilité. Prévoyez une adresse de contact et une procédure : la réponse est due en principe dans un délai d'un mois.
- **Sous-traitants et localisation** : hébergeur, base de données, paiement, emails, automatisation, IA traitent des données de vos utilisateurs. Vérifiez le rôle de chacun, ses engagements contractuels (accord de traitement des données, souvent appelé DPA), le lieu d'hébergement et les garanties en cas de transfert hors de l'Union européenne. Supabase permet par exemple de choisir la région du projet à sa création.
- **Registre des traitements** : un document qui liste vos traitements. La dispense prévue pour les petites structures ne couvre pas les traitements réguliers, comme la gestion des comptes clients : considérez que vous devez en tenir un. La CNIL propose un modèle.
- **Violation de données** : en cas de fuite présentant un risque pour les personnes, la notification à la CNIL est obligatoire, en principe dans les 72 heures.

Le paiement par carte est entièrement géré par Stripe : Créno ne voit ni ne stocke jamais les numéros de carte. C'est un choix d'architecture qui réduit fortement vos risques.

## L'IA et les données personnelles

Ne collez jamais de données réelles de clients dans un prompt : utilisez des données fictives. Si votre produit envoie des données à une API d'IA (module 6), ce fournisseur devient un destinataire à mentionner dans votre politique de confidentialité et dans votre registre.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Si vous débutez : le RGPD sans panique

Le RGPD peut sembler intimidant. Pour un MVP, il se résume à une posture : **collecter peu, expliquer clairement, protéger sérieusement, supprimer à temps**. Vous n'avez pas besoin d'être juriste pour appliquer ces principes. Commencez par le registre : lister vos traitements vous oblige à vous poser les bonnes questions. La CNIL publie des guides pratiques destinés aux petites entreprises et aux développeurs : c'est la meilleure porte d'entrée, gratuite et à jour.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Pour les profils non techniques : faire auditer sans être expert

- Demandez à l'IA un audit ciblé de votre projet Bolt.new : « Liste les tables sans RLS, les clés présentes dans le code du navigateur et les données personnelles collectées. » Vérifiez ensuite chaque point dans le tableau de bord de Supabase.
- Dans Airtable, n'activez pas de lien de partage public sur la base, limitez les collaborateurs et utilisez des formulaires pour la collecte.
- Pour la politique de confidentialité, partez des ressources de la CNIL plutôt que d'un texte générique généré par l'IA, et adaptez-la à vos traitements réels.
- Faites relire votre checklist par une personne technique de votre entourage ou lors d'un point avec votre formateur.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Pour les profils techniques : automatiser les contrôles

- Validez les entrées avec un schéma (par exemple avec une bibliothèque comme Zod en TypeScript) dans chaque action serveur et route API, et refusez les champs inattendus.
- Consultez les conseillers de sécurité et de performance du tableau de bord Supabase : ils signalent notamment les tables sans RLS.
- Activez l'analyse des secrets et des dépendances sur GitHub, et lancez régulièrement \`pnpm audit\` (ou l'équivalent de votre gestionnaire de paquets).
- Limitez le débit (rate limiting) des routes sensibles : connexion, réservation, envoi d'emails.
- Séparez les environnements : un projet Supabase et des clés Stripe de test pour le développement, d'autres pour la production.
- Pour le droit à l'effacement, écrivez une fonction qui anonymise un profil (nom, email, téléphone) tout en conservant les paiements exigés par la comptabilité.
`,
        },
        {
          type: "checklist",
          title: "Checklist sécurité du MVP",
          items: [
            "La RLS est activée sur toutes les tables, avec des politiques testées avec deux comptes différents.",
            "Aucune clé secrète dans le front, dans une variable NEXT_PUBLIC_ ou dans le dépôt Git.",
            "Le fichier .env.local est ignoré par Git ; les secrets de production sont saisis chez l'hébergeur.",
            "Les montants et les droits sont vérifiés côté serveur, jamais repris du navigateur.",
            "Les paiements sont confirmés uniquement par un webhook dont la signature est vérifiée.",
            "Chaque action serveur vérifie l'authentification et l'appartenance des données.",
            "La double authentification est activée sur tous les comptes d'outils qui la proposent.",
            "Une sauvegarde récente existe hors de l'outil principal, et une restauration a été testée.",
            "Le code généré par l'IA a été relu et les dépendances sont à jour.",
            "Les journaux ne contiennent ni mot de passe, ni clé, ni donnée de carte.",
          ],
        },
        {
          type: "checklist",
          title: "Checklist RGPD du MVP",
          items: [
            "Chaque donnée collectée est justifiée par une finalité (minimisation).",
            "Aucune donnée de santé ou autre donnée sensible n'est collectée sans analyse préalable.",
            "Une base légale est identifiée pour chaque traitement.",
            "Une politique de confidentialité est accessible au moment de la collecte.",
            "Une durée de conservation est fixée pour chaque catégorie de données.",
            "Une adresse de contact et une procédure permettent d'exercer les droits.",
            "Les sous-traitants sont listés, avec le lieu d'hébergement et leurs engagements contractuels.",
            "Le registre des traitements est rédigé.",
            "Les cookies non essentiels ne sont déposés qu'après consentement.",
            "Les prompts envoyés aux outils IA ne contiennent aucune donnée réelle.",
          ],
        },
        {
          type: "exercice",
          title: "Audit sécurité et RGPD de votre MVP",
          instructions: `
Passez **votre projet** au crible, avant d'écrire la moindre ligne de code de production.

1. Parcourez les deux checklists. Pour chaque item non coché, écrivez l'action corrective et la date à laquelle vous la réaliserez.
2. Rédigez un extrait de registre pour vos trois principaux traitements : finalité, base légale, données concernées, durée de conservation, destinataires et sous-traitants (avec le lieu d'hébergement).
3. Relisez votre modèle de données (leçon 2) : supprimez ou rendez facultative au moins une donnée non indispensable, ou justifiez que toutes le sont.
4. Listez vos secrets (les noms uniquement) et l'endroit exact où chacun est stocké.
5. Classez vos trois actions prioritaires avant l'ouverture aux premiers utilisateurs.

Exemple Créno pour l'étape 2 : « Gestion des réservations — finalité : permettre la réservation et le suivi des séances — base légale : exécution du contrat — données : nom, email, téléphone facultatif, historique des réservations — conservation : durée du compte, puis suppression après une période d'inactivité définie — sous-traitants : Supabase (région UE), Vercel, fournisseur d'email. »
`,
          deliverable: "texte",
          estimatedMinutes: 25,
          review: "auto",
          rubric: [
            "Les deux checklists sont complétées, avec des actions correctives datées.",
            "Le registre couvre au moins trois traitements, avec base légale et durée de conservation.",
            "La minimisation est appliquée concrètement au modèle de données.",
            "Les secrets sont inventoriés sans que leur valeur apparaisse.",
          ],
        },
        {
          type: "quiz",
          title: "Vérifiez vos acquis",
          questions: [
            {
              prompt: "Une clé secrète a été poussée par erreur sur GitHub puis supprimée dans le commit suivant. Que faire ?",
              options: [
                { label: "Rien : elle n'est plus visible dans la dernière version" },
                { label: "La régénérer immédiatement, car l'historique Git la conserve", correct: true },
                { label: "Rendre le dépôt privé, cela suffit" },
                { label: "Ajouter un commentaire pour signaler qu'elle est obsolète" },
              ],
              explanation:
                "Une clé exposée doit être considérée comme compromise : on la régénère et on met à jour les variables d'environnement.",
            },
            {
              prompt: "Laquelle de ces pratiques applique le principe de minimisation du RGPD ?",
              options: [
                { label: "Demander la date de naissance « au cas où »" },
                { label: "Rendre le téléphone facultatif quand l'email suffit à gérer la réservation", correct: true },
                { label: "Conserver toutes les données sans limite de durée" },
                { label: "Collecter les pathologies de chaque client pour personnaliser les séances du MVP" },
              ],
              explanation:
                "On ne collecte que ce qui est nécessaire à la finalité. Les données de santé relèvent en plus d'un régime renforcé.",
            },
            {
              prompt: "Que signifie le principe du moindre privilège ?",
              options: [
                { label: "Donner les droits d'administrateur à toute l'équipe pour aller plus vite" },
                { label: "Chaque personne et chaque programme n'a que les droits nécessaires à sa tâche", correct: true },
                { label: "Ne jamais donner d'accès à un prestataire" },
                { label: "Utiliser la clé secrète partout pour éviter les erreurs de droits" },
              ],
              explanation:
                "Limiter les droits limite les dégâts en cas d'erreur, de fuite ou de compte compromis.",
            },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------------------
    // L06 — Documenter son architecture pour l'IA
    // ---------------------------------------------------------------------------
    {
      key: "m04-l06",
      title: "Documenter son architecture pour l'IA",
      summary:
        "Rédiger ARCHITECTURE.md, un fichier d'instructions pour vos agents de code et des décisions d'architecture courtes, pour que les outils IA travaillent dans votre cadre.",
      estimatedMinutes: 55,
      blocks: [
        {
          type: "texte",
          markdown: `
**À la fin de cette leçon**, vous saurez rédiger la documentation d'architecture de votre projet (un fichier ARCHITECTURE.md, des instructions pour vos agents de code et des décisions d'architecture courtes) pour que les outils IA travaillent dans le cadre que vous avez fixé.

## Pourquoi les outils IA ont besoin de contexte

Un assistant IA ne connaît de votre projet que ce qu'on lui donne à lire, et il ne se souvient pas de vos conversations précédentes, sauf fonction de mémoire explicite. Un agent de code (Claude Code, Cursor, Codex) peut explorer votre dépôt, mais il ne devine ni vos intentions ni vos décisions. Sans contexte, il comble les vides : il crée une nouvelle table au lieu d'utiliser la vôtre, stocke un montant en euros décimaux, ajoute une bibliothèque de plus, oublie la RLS.

Documenter, c'est préparer l'arrivée d'un nouveau collègue très rapide mais sans mémoire. Le même document sert aux humains : un développeur freelance, un associé, vous-même dans trois mois.

## Deux niveaux de documentation

**ARCHITECTURE.md** donne la vue d'ensemble : le produit, la stack, le schéma, le modèle de données, les flux principaux, les règles de sécurité et les décisions. Il répond à « comment le projet est-il construit, et pourquoi ».

**Les fichiers d'instructions pour agents** sont courts et impératifs : ce que l'agent doit faire et ne jamais faire dans ce dépôt, les commandes utiles, les conventions. Chaque outil a son format :

- \`CLAUDE.md\`, lu automatiquement par Claude Code au début de chaque session ;
- \`AGENTS.md\`, convention ouverte reconnue par plusieurs agents, dont Codex ;
- les règles de projet de Cursor, stockées dans le dépôt (la [documentation de Cursor](https://cursor.com) indique l'emplacement actuel).

Pour éviter de maintenir trois textes, gardez une seule source : par exemple un \`AGENTS.md\` complet et un \`CLAUDE.md\` qui se contente de l'importer (Claude Code accepte la syntaxe \`@AGENTS.md\`). Avec les outils sans dépôt (Bolt.new, projets Claude ou ChatGPT), placez ces instructions dans les réglages du projet ou collez-les au début de chaque nouvelle conversation.

## Les conventions de nommage

Une convention n'a de valeur que si elle est écrite et suivie. Celles de Créno :

| Élément | Convention | Exemple |
| --- | --- | --- |
| Tables | anglais, pluriel, snake_case | \`bookings\` |
| Colonnes | snake_case | \`starts_at\` |
| Clés étrangères | nom au singulier suivi de _id | \`coach_id\` |
| Dates | suffixe _at, type timestamptz | \`paid_at\` |
| Montants | suffixe _cents, entier | \`price_cents\` |
| Statuts | liste fermée, en anglais | \`pending\`, \`confirmed\` |
| Composants React | PascalCase | \`SlotCard\` |
| Fonctions | camelCase, commençant par un verbe | \`createBooking\` |
| Branches Git | type/description | \`feat/booking-payment\` |

## Les décisions d'architecture (ADR)

Un **ADR** (Architecture Decision Record) est une fiche courte qui consigne une décision importante : le contexte, la décision, les conséquences. Il évite de rediscuter sans fin les mêmes sujets et empêche un agent de « corriger » un choix délibéré. Écrivez-en un chaque fois que vous tranchez entre plusieurs options sérieuses.

\`\`\`markdown
## ADR-002 — Paiements confirmés uniquement par webhook
Statut : acceptée
Contexte : le retour du client sur la page « Merci » n'est pas fiable
(onglet fermé, page ouverte sans paiement).
Décision : une réservation passe à confirmed uniquement à réception du webhook
Stripe signé, vérifié côté serveur.
Conséquences : l'interface doit gérer l'état pending ; le webhook doit être
testé en local avec les outils de test de Stripe.
\`\`\`

## Exemple complet : les fichiers de Créno

\`\`\`markdown
# Créno — Architecture

## Produit
Réservation et paiement de séances pour coachs sportifs indépendants.
Rôles : coach (publie ses créneaux, suit réservations et paiements),
client (réserve, paie, annule).

## Stack
- Next.js (App Router) + React + TypeScript, hébergé sur Vercel
- Supabase : Postgres, Auth (lien magique), RLS
- Stripe Checkout + webhook ; n8n pour les rappels ; fournisseur d'email

## Schéma
Navigateur -> Next.js (Vercel) -> Supabase
Next.js -> Stripe ; Stripe -> /api/stripe/webhook -> Supabase
n8n (chaque jour à 18 h) -> Supabase -> email de rappel

## Modèle de données (référence : supabase/migrations/)
- profiles : id = auth.users.id, role, full_name, phone, timezone
- slots : coach_id, starts_at, ends_at, price_cents, capacity, status
- bookings : slot_id, client_id, status, reminder_sent_at
- payments : booking_id, amount_cents, currency, status, provider_payment_id

## Règles non négociables
- RLS sur toutes les tables ; toute nouvelle table arrive avec ses politiques.
- Clés secrètes (Supabase, Stripe) uniquement côté serveur.
- Montants en centimes, dates en timestamptz, affichage dans le fuseau du profil.
- Le prix est lu en base, jamais reçu du navigateur.
- Une réservation n'est confirmée que par le webhook Stripe vérifié.

## Flux principal
1. Le client choisit un créneau ouvert.
2. Action serveur : session, statut, places ; booking et payment en pending.
3. Redirection vers Stripe Checkout.
4. Webhook : payment succeeded, booking confirmed, email (idempotent).
5. n8n : rappel la veille, puis reminder_sent_at renseigné.

## Décisions : docs/adr/
\`\`\`

\`\`\`markdown
# AGENTS.md — Créno
Lis ARCHITECTURE.md avant toute modification.

## Toujours
- Respecter les conventions de nommage d'ARCHITECTURE.md.
- Faire évoluer le schéma par une nouvelle migration, avec RLS et politiques.
- Vérifier la session et les droits dans chaque action serveur.
- Avant de terminer : pnpm typecheck, pnpm lint, pnpm build.

## Jamais
- Exposer une clé secrète au navigateur ou dans une variable NEXT_PUBLIC_.
- Modifier une migration déjà appliquée.
- Confirmer un paiement ailleurs que dans le webhook Stripe.
- Ajouter une dépendance sans la justifier.
\`\`\`

## Faire vivre la documentation

- Mettez à jour ARCHITECTURE.md à chaque décision structurante, en même temps que le code.
- En fin de tâche, demandez à l'agent de signaler ce qui, dans la documentation, est devenu inexact, puis relisez sa proposition.
- Gardez les instructions courtes : dix règles claires sont mieux suivies que cinquante.
- Quand un agent répète une erreur, ajoutez la règle qui l'aurait évitée.
`,
        },
        {
          type: "texte",
          personas: ["reconversion"],
          markdown: `
## Si vous débutez : un livret d'accueil pour vos outils

Vous avez sans doute déjà reçu un livret d'accueil en arrivant dans une organisation : qui fait quoi, les règles de la maison, les usages. Le dossier d'architecture joue ce rôle pour vos outils IA. Commencez modestement : une page, cinq sections, des phrases simples. Il s'enrichira au fil du module 6, chaque fois qu'un outil fera une erreur que vous ne voulez plus revoir.
`,
        },
        {
          type: "texte",
          personas: ["non_tech"],
          markdown: `
## Pour les profils non techniques : documenter pour Bolt.new et les assistants

- Dans Bolt.new, repérez l'emplacement prévu pour les instructions de projet persistantes (voir la documentation de l'outil) et collez-y vos règles non négociables ; à défaut, collez-les au début de chaque nouvelle conversation importante.
- Dans Claude ou ChatGPT, créez un projet dédié à votre MVP : ajoutez ARCHITECTURE.md aux documents du projet et vos règles à ses instructions.
- Rédigez vos règles avec vos mots, mais de façon vérifiable : « chaque table doit avoir la RLS activée » plutôt que « fais attention à la sécurité ».
- Gardez une version datée de votre dossier dans Notion : c'est aussi un excellent support pour briefer un développeur freelance.
`,
        },
        {
          type: "texte",
          personas: ["tech"],
          markdown: `
## Pour les profils techniques : outiller la documentation

- Claude Code propose une commande \`/init\` qui génère un premier \`CLAUDE.md\` à partir de l'analyse du dépôt : prenez-le comme brouillon, puis réduisez et corrigez.
- Rangez les ADR dans \`docs/adr/\`, numérotés, et référencez-les depuis ARCHITECTURE.md.
- Indiquez dans les instructions les commandes de vérification exactes (typage, lint, tests, build) : l'agent pourra valider son propre travail.
- Quand une zone du code a ses propres règles (par exemple \`supabase/\`), un fichier d'instructions local peut s'y ajouter ; vérifiez dans la documentation de chaque outil comment il est pris en compte.
- Traitez ces fichiers comme du code : relus en revue, modifiés dans le même commit que le changement qu'ils décrivent.
`,
        },
        {
          type: "prompt",
          title: "Rédiger le premier jet d'ARCHITECTURE.md",
          tool: "Claude",
          prompt: `
Tu es architecte logiciel. Aide-moi à rédiger le fichier ARCHITECTURE.md de mon MVP, destiné à la fois aux humains et aux agents de code IA.

Voici mes éléments (sans aucune clé ni donnée réelle) :
- Produit et rôles : [description]
- Stack : [outils choisis au module 3]
- Schéma d'architecture : [votre schéma textuel de la leçon 1]
- Modèle de données : [votre tableau de la leçon 2]
- Matrice des droits : [votre matrice de la leçon 3]
- Intégrations : [votre carte de la leçon 4]

Produis un fichier Markdown avec les sections : Produit, Stack, Schéma, Modèle de données, Règles non négociables, Flux principal, Conventions, Décisions.
Contraintes : moins de 600 mots, phrases courtes, règles formulées à l'impératif et vérifiables. Signale entre crochets toute information manquante au lieu de l'inventer.

Propose ensuite deux ADR courts (contexte, décision, conséquences) pour les deux décisions les plus structurantes que tu repères.
`,
          tips:
            "Relisez chaque règle : si elle est vague (« écrire du code propre »), rendez-la vérifiable (« chaque action serveur vérifie la session »).",
        },
        {
          type: "exercice",
          title: "Le dossier d'architecture de votre MVP",
          instructions: `
Assemblez les travaux des leçons précédentes en un dossier que vos outils IA utiliseront dès le module 6.

1. **ARCHITECTURE.md** : produit, stack, schéma, modèle de données, règles non négociables, flux principal, conventions de nommage.
2. **Un fichier d'instructions** pour votre outil principal : AGENTS.md et CLAUDE.md (dépôt de code), règles Cursor, ou texte d'instructions de projet (Bolt.new, Claude, ChatGPT).
3. **Deux ADR au minimum**, sur vos décisions les plus structurantes (contexte, décision, conséquences).
4. **Test.** Ouvrez une nouvelle conversation avec votre outil, fournissez le dossier et demandez : « Résume les règles que tu dois respecter dans ce projet et pose-moi les questions qui te manquent. » Corrigez le dossier en fonction de la réponse.

Livrable : un fichier (Markdown, PDF ou archive regroupant les fichiers). Indiquez à la fin ce que le test de l'étape 4 vous a conduit à corriger. Aucune clé ni donnée réelle.
`,
          deliverable: "fichier",
          estimatedMinutes: 35,
          review: "formateur",
          rubric: [
            "ARCHITECTURE.md couvre stack, schéma, données, règles et flux principal, en cohérence avec les leçons précédentes.",
            "Le fichier d'instructions est court, impératif et adapté à l'outil utilisé.",
            "Les ADR exposent clairement contexte, décision et conséquences.",
            "Le test avec l'outil IA a été réalisé et a conduit à des corrections.",
            "Aucune clé ni donnée réelle ne figure dans le dossier.",
          ],
        },
      ],
    },

    // ---------------------------------------------------------------------------
    // L07 — Évaluation du module
    // ---------------------------------------------------------------------------
    {
      key: "m04-l07",
      title: "Évaluation du module",
      summary: "Valider vos acquis sur l'architecture, les données, la sécurité et la documentation de votre MVP.",
      estimatedMinutes: 20,
      blocks: [
        {
          type: "texte",
          markdown: `
**Cette évaluation** vérifie que vous savez prendre les principales décisions d'architecture de votre MVP : couches, modèle de données, règles d'accès, intégrations, sécurité, RGPD et documentation.

Dix questions, une seule bonne réponse par question. Prenez le temps de lire chaque proposition : les erreurs les plus fréquentes viennent d'une lecture trop rapide. Chaque explication renvoie à la leçon concernée si vous souhaitez revoir un point.
`,
        },
        {
          type: "quiz",
          title: "Évaluation — Architecturer son app",
          graded: true,
          questions: [
            {
              prompt: "Où doit se trouver la clé secrète Stripe de Créno ?",
              options: [
                { label: "Dans une variable NEXT_PUBLIC_ pour que le front puisse créer le paiement" },
                { label: "Dans une variable d'environnement lue uniquement côté serveur", correct: true },
                { label: "Dans le code du composant de paiement, en commentaire" },
                { label: "Dans la table profiles, pour chaque coach" },
              ],
              explanation:
                "Les secrets restent côté serveur, dans des variables d'environnement. Le préfixe NEXT_PUBLIC_ les enverrait au navigateur (leçons 1 et 4).",
            },
            {
              prompt: "Pourquoi le front de Créno n'envoie-t-il pas le prix lors d'une réservation ?",
              options: [
                { label: "Pour réduire la taille de la requête" },
                { label: "Parce que Stripe refuse les prix envoyés par un navigateur" },
                { label: "Parce que tout ce qui vient du navigateur peut être modifié : le back relit le prix en base", correct: true },
                { label: "Parce que le prix est confidentiel" },
              ],
              explanation: "Le front vérifie pour le confort, le back vérifie pour la sécurité (leçon 1).",
            },
            {
              prompt: "Un client peut réserver plusieurs créneaux, et un créneau collectif accueille plusieurs clients. Comment le modéliser ?",
              options: [
                { label: "Avec une table de liaison bookings qui relie client_id et slot_id", correct: true },
                { label: "Avec une colonne client_id dans slots" },
                { label: "Avec une colonne slot_id dans profiles" },
                { label: "Avec un champ texte contenant la liste des clients" },
              ],
              explanation: "Une relation n-n passe par une table de liaison, qui porte aussi le statut de la réservation (leçon 2).",
            },
            {
              prompt: "Quel type de colonne choisir pour l'heure de début d'une séance ?",
              options: [
                { label: "text, par exemple « 18:00 »" },
                { label: "integer, en minutes depuis minuit" },
                { label: "timestamptz, qui enregistre un instant précis et gère les fuseaux horaires", correct: true },
                { label: "date, qui suffit pour les séances" },
              ],
              explanation:
                "Sans fuseau, les heures se décalent au changement d'heure. timestamptz stocke un instant précis, converti à l'affichage (leçon 2).",
            },
            {
              prompt: "La RLS est activée sur la table payments, sans aucune politique. Que se passe-t-il pour un utilisateur connecté ?",
              options: [
                { label: "Il voit tous les paiements" },
                { label: "Il ne voit que ses paiements" },
                { label: "Il ne voit aucun paiement : la RLS refuse par défaut", correct: true },
                { label: "Il reçoit une erreur à la connexion" },
              ],
              explanation: "Sans politique, aucune ligne n'est accessible via l'API ; seule la clé secrète contourne la RLS (leçon 3).",
            },
            {
              prompt: "Dans une politique RLS, quel est le rôle de la clause with check ?",
              options: [
                { label: "Filtrer les lignes existantes en lecture" },
                { label: "Valider les valeurs des lignes créées ou modifiées", correct: true },
                { label: "Vérifier le mot de passe de l'utilisateur" },
                { label: "Créer un index" },
              ],
              explanation:
                "using filtre les lignes existantes ; with check contrôle ce qui est écrit, par exemple qu'un client ne passe sa réservation qu'à l'état cancelled (leçon 3).",
            },
            {
              prompt: "Stripe renvoie une deuxième fois l'événement « paiement confirmé » pour la même session. Quel comportement est correct ?",
              options: [
                { label: "Créer une seconde réservation" },
                { label: "Envoyer un second email de confirmation" },
                { label: "Détecter que le paiement est déjà confirmé et ne rien refaire", correct: true },
                { label: "Ignorer tous les webhooks suivants de ce client" },
              ],
              explanation:
                "C'est l'idempotence : rejouer l'opération ne change pas le résultat. On vérifie l'état avant d'agir (leçon 4).",
            },
            {
              prompt: "Quelle affirmation sur le RGPD est exacte pour un MVP comme Créno ?",
              options: [
                { label: "Le RGPD ne s'applique qu'à partir d'un certain chiffre d'affaires" },
                { label: "Il faut collecter un maximum de données pour personnaliser le service plus tard" },
                { label: "Chaque traitement doit reposer sur une base légale et avoir une durée de conservation définie", correct: true },
                { label: "Les données de santé peuvent être collectées librement si le client est d'accord oralement" },
              ],
              explanation:
                "Base légale, minimisation, information, durée de conservation et droits des personnes s'appliquent dès le MVP. Renseignez-vous sur cnil.fr (leçon 5).",
            },
            {
              prompt: "Quel est le rôle d'un fichier comme CLAUDE.md ou AGENTS.md dans un dépôt ?",
              options: [
                { label: "Stocker les clés d'API utilisées par l'agent" },
                { label: "Donner à l'agent de code des instructions courtes : conventions, règles, commandes de vérification", correct: true },
                { label: "Remplacer les migrations de la base de données" },
                { label: "Documenter l'historique des commits" },
              ],
              explanation:
                "Ces fichiers fournissent le contexte que l'agent ne peut pas deviner ; ils ne contiennent jamais de secrets (leçon 6).",
            },
            {
              prompt: "Que contient un ADR (Architecture Decision Record) ?",
              options: [
                { label: "La liste des tâches du sprint" },
                { label: "Le contexte, la décision prise et ses conséquences", correct: true },
                { label: "Le code source d'une fonctionnalité" },
                { label: "Les identifiants de connexion des outils" },
              ],
              explanation:
                "Un ADR consigne une décision importante pour éviter de la rediscuter et empêcher un agent de la « corriger » (leçon 6).",
            },
          ],
        },
      ],
    },
  ],
};
