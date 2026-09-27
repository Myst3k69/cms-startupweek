# StartupWeek OS — mise en service Supabase

Ce document décrit comment passer le back-office du mode démo (données dans le navigateur) à Supabase, brancher le site, Stripe et Qonto, migrer les données Airtable et arrêter les workflows n8n. Il est volontairement opérationnel : chaque étape est vérifiable et réversible.

> **État au 26/09/2026 (lire avant toute mise en production)**
>
> **Bascule effectuée le 26/09/2026** : le back-office de production (https://cms-startupweek.vercel.app) tourne en mode `supabase`. Première connexion réelle par lien magique réussie (email reçu, retour sur `/auth/callback`, compte rattaché à son membre `crm.team_members`). Administrateurs créés : Aurélien Chiren (rattaché) et Caroline Borja (rattachée automatiquement à sa première connexion). Le schéma `crm` ne contient pas encore de données métier : **import Airtable à faire (§ 8)**.
>
> **Import et phase 1 effectués le 26/09/2026 (§ 8.4, § 9)** : la base Airtable ne contenait, hors tests, que les 13 sessions SW-0011 → SW-0023 et 2 ressources — importées. **Les sessions se gèrent désormais dans le CRM** (qui publie `public.event`) : workflows n8n « Sync Airtable -> Supabase » et « Create or update Event » désactivés. Les candidatures arrivent encore dans Airtable (phase 2 à faire) : une inscription payée doit être saisie dans le CRM pour que les places restantes du site soient à jour.
>
> **Migrations appliquées sur le projet Supabase « startupweek »** (production, PostgreSQL 17), directement et non sur une branche (les branches exigent l'offre Pro ; l'organisation est en offre gratuite) — versions `20260926103012`, `20260926103117`, `20260926103336`, `20260926103516`. Au moment de la migration, le schéma `crm` était **vide** (hors référentiel Qualiopi et ligne `settings`). Vérifications faites sur la vraie base :
> - avant : colonnes, enums et contrainte `event_code` de `public.event` / `template` / `administrative_resource(_event)` identiques à ce qu'attend la migration 3 ; empreinte des tables `public.*` du site relevée ;
> - après : empreintes des objets `crm` (colonnes, contraintes, index, triggers, fonctions, policies, vues, RLS, droits `anon` / `authenticated` / `service_role`, données du référentiel) **identiques** à celles d'une base locale ayant reçu les mêmes fichiers ; tables, triggers, policies et fonctions du schéma `public` inchangés (seules les lignes de `public.event` ont bougé, réécrites par le workflow n8n `mRWu02E5EofDrUf2` qui tourne toutes les 5 min) ;
> - scénario exécuté dans un bloc annulé (aucune écriture conservée) : normalisation d'un contact, facture `F-2026-0001` attribuée à l'émission, paiement → `payee`, renumérotation d'une facture émise refusée, session publiée → ligne `public.event` créée (`publie`, places, lieu, format) puis dépubliée → `brouillon`, aucun incident de synchro ; utilisateur `authenticated` non rattaché : 0 ligne, insertion et appel de `crm.next_document_number()` refusés ; `anon` : accès au schéma refusé ;
> - *advisors* : sécurité — seulement `rls_enabled_no_policy` (INFO) sur `crm.document_counters` et `crm.site_links`, voulu (accès par fonctions `SECURITY DEFINER` / service_role uniquement) ; performance — clés étrangères sans index et index inutilisés (INFO, tables vides), politiques permissives multiples en lecture sur `team_members` / `offers` / `settings` (WARN, tables de quelques lignes).
>
> Validé **localement** auparavant, sur une base jetable avec émulation Supabase : RLS par rôle (formateur, commercial, lecture, admin, utilisateur Auth non rattaché, anon), numérotation F/D/REC sans trou, paiements, places restantes et bascule `inscriptions_ouvertes ↔ complet`, synchro ressources, vues d'analytics ; matrice `crm.section_access()` comparée à `PERMISSIONS` (**90/90 combinaisons identiques**) ; les 4 routes API exécutées avec supabase-js contre PostgREST 12.2.3 local (Stripe, Qonto et Resend **simulés**).
>
> **Connexion par lien magique (§ 3)** : codée et testée de bout en bout **en local** — PostgreSQL 16 avec les 5 migrations, PostgREST 12.2.3, un faux service Supabase Auth (flux PKCE, jetons signés, codes d'erreur identiques) et Chromium. Scénarios validés : demande de lien (`create_user=false`, adresse normalisée, redirection `/auth/callback?next=…`), échange du code, rattachement automatique par email (migration 5) et repli sans migration 5, chargement des données, création d'un contact écrite en base avec une seule activité, refus RLS annulé à l'écran, rechargement, lien déjà utilisé, lien ouvert dans un autre navigateur, lien expiré, adresse inconnue (réponse neutre, aucun compte créé), compte hors équipe (session fermée), déconnexion, `next=//site-externe` ignoré, enchaînement acceptation → acompte → inscription → solde (écritures liées dans l'ordre, numéros cohérents, rien publié sur le site) ; mode démo inchangé.
>
> **Testé en production le 26/09/2026** : le vrai service Supabase Auth (envoi réel de l'email, modèle *Magic Link*, URL de redirection autorisée — § 3.2). **Non testé** : clés `sb_secret_…`, vraies API Qonto / Stripe / Resend, runtime Next.js des routes API, import Airtable (aucun script fourni). Migration `20260926122058` (5) **appliquée en production le 26/09/2026** : empreintes identiques au test local, tables du site inchangées, rattachement / membre désactivé / anonyme / journal sans doublon vérifiés dans un bloc annulé sur la vraie base.

---

## 1. Architecture cible

```
Site (startupweek-v2)                     StartupWeek OS (ce repo, Vercel)                  Supabase
/api/submit-*  ── POST signé HMAC ──►  /api/intake/<form>  ── service_role ──►  schéma crm (RLS)
                                         /api/stripe/webhook ◄── Stripe                 │
                                         /api/qonto/sync     ◄── Vercel Cron            │ triggers SQL
                                         back-office (session Supabase Auth + RLS) ──►  │
                                                                                         ▼
Site ◄──────────────── lit ─────────────────────────────────────────────  public.event, public.template,
                                                                           public.administrative_resource(_event)
```

| Fichier | Rôle |
| --- | --- |
| `supabase/migrations/20260926103012_crm_schema.sql` | Schéma `crm` (1 table par collection de `src/lib/data/sync.ts` + `activities`, `settings`, `traffic_days`), CHECK, FK, index, `updated_at`, audit |
| `supabase/migrations/20260926103117_crm_rls.sql` | `team_members.auth_user_id`, `crm.current_role()`, `crm.has_access(section, level)`, RLS + policies |
| `supabase/migrations/20260926103336_crm_functions.sql` | Numérotation légale, paiements, places restantes, synchro CRM → site, vues |
| `supabase/migrations/20260926103516_qualiopi_referentiel.sql` | 32 indicateurs Qualiopi |
| `supabase/migrations/20260926122058_crm_auth_membership.sql` | `crm.claim_team_membership()` (rattachement du compte Auth au membre de même email vérifié) ; audit automatique limité aux écritures hors session d'un membre — appliquée le 26/09/2026 |
| `src/lib/data/supabase.ts`, `src/lib/data/sync.ts` | Client navigateur (PKCE, schéma `crm`) ; chargement paginé et écritures ordonnées avec annulation en cas de refus |
| `src/lib/auth/supabase-auth.ts`, `src/lib/store/remote-session.ts` | Lien magique, retour `/auth/callback`, membre de l'équipe, ouverture / fermeture de l'espace de travail |

Les noms de fichiers reprennent les versions enregistrées dans l'historique distant (`supabase_migrations.schema_migrations`) lors de l'application du 26/09/2026 : la CLI les reconnaît comme déjà appliquées. Toute évolution passe par une **nouvelle** migration.
| `src/lib/server/*.ts` | Client service_role, sécurité (HMAC, Stripe, rate-limit, honeypot, CORS), intake |
| `src/app/api/**/route.ts` | Route Handlers |

Ce que remplacent les triggers SQL (plus aucun polling) :

| Avant (n8n / Airtable) | Après |
| --- | --- |
| « Sync Airtable -> Supabase (polling) » (chaque minute) + « Create or update Event » | trigger `sessions_site_sync` → `crm.push_session_to_site()` (upsert `public.event` sur `event_code`) |
| « Ressources copy » + « add  ressources for event(s) » | trigger `resources_site_sync` → `crm.push_resource_to_site()` (+ liaisons reconstruites) |
| Formule Airtable « Places restantes » + schedule 5 min « Complet » | trigger `applications_capacity` → `crm.refresh_session_capacity()` |
| 8 workflows de formulaires | `POST /api/intake/<form>` |

---

## 2. Appliquer les migrations

> ✅ **Fait le 26/09/2026** sur le projet « startupweek » (voir l'état en tête de document). Les § 2.1 à 2.3 restent la procédure de référence pour un autre environnement (projet de test, reconstruction) ; le § 2.4 (exposition du schéma) est fait également.

### 2.1 Sur une branche d'abord (offre Pro requise)

1. Sauvegarde : Dashboard → Database → Backups (vérifier qu'un backup récent existe) ou `supabase db dump --linked -f backup-avant-crm.sql`.
2. Créer une branche : Dashboard → Branches → *Create branch* (ou CLI `supabase branches create crm-test`).
3. **Attention** : une branche est construite en rejouant l'historique des migrations. Or `public.event`, `public.template`, etc. ont été créées **hors migrations** (l'historique distant ne contient que `20260925012830 event_code_format_sw`, `20260925015205 event_places_remaining`, `20260925111004 event_site_display_fields`). Sur une branche vierge ces tables peuvent donc manquer. Les migrations CRM s'appliquent quand même (toutes les références à `public.*` sont gardées par `to_regclass()`), mais pour **tester la synchro vers le site** il faut d'abord recopier le schéma public :
   ```bash
   supabase db dump --linked --schema public -f public_schema.sql   # depuis la prod (lecture)
   psql "$BRANCH_DB_URL" -f public_schema.sql                        # sur la branche
   ```

### 2.2 Avec la CLI

```bash
supabase link --project-ref <project-ref>
# L'historique distant contient 3 migrations absentes de ce repo : les récupérer d'abord,
# sinon `db push` refuse (« Remote migration versions not found in local migrations directory »).
supabase migration fetch            # télécharge les migrations de l'historique distant dans supabase/migrations
supabase db push --dry-run          # sur « startupweek » : rien à appliquer (les 4 migrations CRM y sont déjà)
supabase db push
```

(Si `migration fetch` n'est pas disponible dans votre version de la CLI : copier les 3 migrations distantes à la main ou utiliser `supabase migration repair`.)

### 2.3 Avec le SQL Editor

Coller et exécuter **dans l'ordre** les 4 fichiers `20260926103012` → `20260926103516`. Chaque fichier est autonome ; la migration 4 est ré-exécutable (upsert des libellés, sans toucher aux statuts saisis).

### 2.4 Exposer le schéma `crm` à l'API

Dashboard → Project Settings → **Data API** → *Exposed schemas* : ajouter `crm`. Sans cela, supabase-js reçoit `PGRST106 The schema must be one of the following…`. ✅ **Fait le 26/09/2026.** Exposer le schéma ne l'ouvre pas au public : `anon` n'a aucun droit sur `crm` et un compte connecté non rattaché à `crm.team_members` ne voit aucune ligne (vérifié sur la base réelle).

### 2.5 Vérifications après migration

```sql
-- 1. Matrice de droits (doit reproduire src/lib/auth/permissions.ts)
select crm.section_access('formateur', 'contacts'), crm.section_access('commercial', 'facturation');  -- read | write

-- 2. Référentiel Qualiopi
select * from crm.v_qualiopi_readiness order by criterion;   -- 32 indicateurs, 9 non applicables

-- 3. Pré-requis de la synchro site (voir § 9)
select c.relname, c.relowner::regrole as owner, c.relrowsecurity, c.relforcerowsecurity
from pg_class c where c.oid in ('public.event'::regclass, 'public.template'::regclass, 'public.administrative_resource'::regclass);
select t.typname, n.nspname from pg_type t join pg_namespace n on n.oid = t.typnamespace
where t.typname in ('event_format', 'event_type', 'event_status', 'template_format', 'template_category',
                    'subscription_tier', 'administrative_document_format', 'administrative_document_category', 'administrative_document_status');

-- 4. Test de synchro sans effet de bord
begin;
insert into crm.sessions (code, name, start_at, end_at, capacity, status, published_on_site)
values ('SW-9999', 'Test synchro', now() + interval '30 days', now() + interval '36 days', 10, 'inscriptions_ouvertes', true);
select event_code, status, places_remaining from public.event where event_code = 'SW-9999';
select summary, meta from crm.activities where kind = 'systeme';   -- doit être vide
rollback;
```

Lancer aussi les *advisors* Supabase (Dashboard → Advisors : Security et Performance).

---

## 3. Basculer le back-office en mode Supabase

### 3.1 Ce que fait l'interface en mode `supabase`

- **Connexion par lien magique** (`/connexion` → email → lien → `/auth/callback`), flux PKCE de Supabase Auth, sans mot de passe. `shouldCreateUser: false` : la page de connexion du CRM ne crée **jamais** de compte (le projet héberge aussi les comptes du site). Une adresse inconnue reçoit le même message qu'une adresse valide (on ne révèle pas qui est membre). Le lien ne fonctionne que dans le navigateur où il a été demandé (le vérificateur PKCE y est stocké).
- Après connexion, le compte doit correspondre à un **membre actif** de `crm.team_members` (sinon : message explicite et session fermée). Grâce à la migration `20260926122058_crm_auth_membership.sql` (appliquée), un membre créé dans *Paramètres → Équipe* est **rattaché automatiquement** à sa première connexion (même email, email vérifié).
- **Données** : chargées depuis la base à la connexion (pagination par 1 000 lignes), rien n'est conservé dans le navigateur (seule la session Supabase y est stockée, clé `sw-crm-auth`). Pas de jeu de démo.
- **Écritures** : exécutées une par une dans l'ordre (les clés étrangères sont respectées pour les enchaînements « acceptation → facture d'acompte → tâche ») ; création = INSERT, modification = UPDATE des seuls champs modifiés (un champ vidé devient NULL) ; la ligne renvoyée par la base (numéro, statut recalculé par trigger) remplace la ligne affichée. **Si la base refuse** (droits RLS, contrainte), la modification est annulée à l'écran et une notification l'explique.
- Journal d'activité et paramètres (`crm.activities`, `crm.settings`) lus et écrits en base ; *Paramètres → Données → Recharger depuis la base* pour voir les modifications des collègues (pas de temps réel).
- Déconnexion : menu utilisateur → *Se déconnecter* (ce navigateur uniquement).

### 3.2 Réglages Supabase (Dashboard du projet « startupweek »)

1. ✅ **Data API → Exposed schemas** : ajouter `crm` (§ 2.4) — fait le 26/09/2026.
2. ✅ **Authentication → URL Configuration → Redirect URLs** : ajouter l'adresse de retour du CRM — toujours exactement `<adresse du CRM>/auth/callback` (la page à rouvrir après connexion est mémorisée dans le navigateur, pas dans l'URL). **Ne pas modifier le *Site URL*** (c'est celui du site). Fait le 26/09/2026 :
   ```
   https://cms-startupweek.vercel.app/auth/callback        # adresse du CRM retenue (production Vercel)
   http://localhost:3000/auth/callback                     # développement (facultatif)
   ```
   Sans cela, Supabase renvoie le lien vers le *Site URL* (le site public, `https://www.startupweek.tech/?code=…`) et la connexion échoue. **Même effet si le CRM est ouvert depuis une autre adresse** que celle de la liste — par exemple l'adresse propre à un déploiement (`cms-startupweek-<hash>-….vercel.app`, bouton *Visit* de Vercel) : l'adresse de retour est construite à partir de l'adresse affichée dans le navigateur. Toujours ouvrir `https://cms-startupweek.vercel.app/connexion`. Éviter d'autoriser les aperçus par un joker (`cms-startupweek-*….vercel.app`) : n'importe quel compte Vercel peut créer un projet dont l'adresse correspond au motif. Un sous-domaine (ex. `crm.startupweek.tech`) pourra être ajouté plus tard : l'ajouter au projet Vercel (Settings → Domains) et à cette liste, sans rien changer au code.
3. **Authentication → Emails → SMTP** (email reçu par le premier admin le 26/09/2026 ; à confirmer pour les membres qui ne font pas partie de l'organisation Supabase — première connexion de Caroline Borja) : le serveur d'envoi par défaut de Supabase n'envoie qu'aux **membres de l'organisation Supabase** (« Email address not authorized » sinon), avec un plafond horaire bas. Configurer un SMTP personnalisé (ex. Resend, déjà utilisé par le site) — puis ajuster *Rate Limits* si besoin (30 emails / heure par défaut avec un SMTP personnalisé). Si le site envoie déjà ses emails Auth par un SMTP personnalisé, rien à faire.
4. ✅ **Authentication → Emails → Templates → Magic Link** (vérifié le 26/09/2026 : le lien passe bien par `/auth/v1/verify`) : le modèle doit utiliser `{{ .ConfirmationURL }}` (modèle par défaut). S'il a été personnalisé pour le site avec une URL fixe (`{{ .SiteURL }}/…`), les liens du CRM arriveraient sur le site : utiliser `{{ .RedirectTo }}`, ou `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=magiclink` (géré par `/auth/callback`, fonctionne alors depuis n'importe quel navigateur).
5. ✅ Migration `20260926122058_crm_auth_membership.sql` (rattachement automatique + journal sans doublon) — appliquée le 26/09/2026.

### 3.3 Variables Vercel (Production, et Preview si besoin)

```
NEXT_PUBLIC_CRM_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
SUPABASE_SECRET_KEY=sb_secret_…          # serveur uniquement (routes /api/*)
```

✅ Renseignées en Production le 26/09/2026 (`SUPABASE_SECRET_KEY` pas encore : routes `/api/*` inactives). Les variables `NEXT_PUBLIC_*` sont intégrées **au build** : redéployer après les avoir modifiées. Saisir la **valeur** (`https://…supabase.co`), pas le nom de la variable : une adresse invalide affiche désormais un message explicite sur `/connexion` et `supabasePublic: false` dans `/api/health` (auparavant : page « This page couldn't load »).

### 3.4 Limites connues du mode `supabase` (à lire avant usage réel)

- **Emails** : envoi réel par la file `crm.email_messages` (§ 5 quater) — actif dès que SMTP et le secret de la route d'envoi sont configurés ; d'ici là, les emails restent « Programmé » et l'interface le signale.
- **Numéros de facture** : l'interface calcule le prochain numéro à partir des factures chargées et la base l'accepte en réalignant son compteur. Deux personnes émettant une facture au même instant obtiendraient le même numéro : la seconde est refusée par la base (doublon, index unique) et annulée à l'écran — à réémettre. Une facture émise ne peut plus changer de numéro ni être supprimée (émettre un avoir).
- `invoices.paid_cents` / `status` et `applications.amount_paid_cents` sont recalculés par trigger à chaque paiement.
- **Numéro de candidature** : attribué par la base (séquence), réalignée automatiquement quand un numéro est saisi à la main ou importé (migration `20260926173332_crm_applications_number_sync.sql`, **appliquée en production le 26/09/2026** et vérifiée : numéro manuel 50 → suivant 51 dans un bloc annulé, séquence remise ensuite sur le dernier numéro réel). Sans elle, la 1re étape d'une candidature du site a échoué le 26/09/2026 (numéro 1 déjà pris par une candidature créée par la simulation). La simulation de formulaires (*Automatisations → Testeur*) est désactivée en mode `supabase` : elle écrivait de fausses demandes dans la base réelle.
- Les sessions passent seules de `inscriptions_ouvertes` à `complet` (et inversement) quand les candidatures `inscrite` ou la capacité changent. Pour **fermer manuellement** les inscriptions alors qu'il reste des places, avancer la date limite (`registration_deadline`).
- Pas de synchronisation en temps réel entre collègues : bouton *Recharger depuis la base*.
- L'import JSON (*Paramètres → Données*) ne modifie que l'affichage local.

---

## 4. Créer les comptes de l'équipe

Le projet Supabase héberge aussi les comptes des participants du site : le rôle `authenticated` inclut donc des personnes extérieures. La RLS ne donne accès au schéma `crm` **qu'aux utilisateurs présents et actifs dans `crm.team_members`** (vérifié sur la base réelle : un compte Auth non rattaché voit 0 ligne).

1. **Compte Auth** de chaque membre (la page de connexion n'en crée pas) : Dashboard → Authentication → Users → *Add user* → *Create new user* (email, « Auto Confirm User » coché, mot de passe aléatoire jamais utilisé) — ou *Invite user*. NB : le trigger `handle_new_user` du site crée aussi un profil côté site pour ce compte.
2. ✅ **Premier administrateur** (fait le 26/09/2026 : Aurélien Chiren et Caroline Borja, rôle `admin`) — SQL Editor :
   ```sql
   insert into crm.team_members (name, email, role, title, auth_user_id)
   select 'Prénom Nom', u.email, 'admin', 'Fondateur', u.id
   from auth.users u where lower(u.email) = 'prenom@startupweek.tech';
   ```
3. **Autres membres** : l'admin les ajoute dans *Paramètres → Équipe* (nom, email, rôle : `admin`, `commercial`, `pedagogie`, `formateur`, `lecture`) ; il faut aussi leur compte Auth (point 1). Leur compte est rattaché à leur première connexion (migration `20260926122058`).
4. Désactiver un accès : *Paramètres → Équipe* ou `update crm.team_members set active = false where email = '…';` (effet à la prochaine requête).
5. Renseigner les référents dans *Paramètres* (`quality_lead_id`, `disability_lead_id`, `siret`, `nda`, `iban`, `address`).

---

## 5. Brancher le site (remplacer les webhooks n8n)

### 5.1 Côté CRM

```
INTAKE_SIGNING_SECRET=<openssl rand -hex 32>
ALLOWED_ORIGINS=https://www.startupweek.tech
# Emails : voir § 5 quater (SMTP_*, EMAIL_FROM, EMAIL_DISPATCH_SECRET…)
```

Accusés de réception et Digital Starter Kit : envoyés par le CRM **seulement** si *Paramètres → Intégrations → Emails des formulaires du site* est activé (réponse `ack: "n8n"` sinon) — à activer en même temps que la désactivation des workflows n8n des formulaires, pour ne pas envoyer deux fois.

Contrat de `POST /api/intake/<form>` (`form` ∈ `candidature`, `contact`, `entreprise`, `partenaire`, `reclamation`, `accompagnement`, `newsletter`, `starter-kit`) :

| Code | Signification |
| --- | --- |
| 202 | `{ ok: true, submissionId, contactId, applicationId?, complaintNumber?, dealId?, taskId?, duplicate, ack }` |
| 200 | mode démo (Supabase non configuré) : `{ ok: true, dryRun: true, normalized }` |
| 400 | `VALIDATION_ERROR` (`issues[]`), `INVALID_JSON`, `CONSENT_REQUIRED` (newsletter sans consentement explicite) |
| 401 | `INVALID_SIGNATURE` (signature absente ou fausse alors que le secret est défini) |
| 403 | `ORIGIN_NOT_ALLOWED` (en-tête Origin hors `ALLOWED_ORIGINS`) |
| 409 | `SESSION_CLOSED` : session complète, annulée, commencée ou date limite passée. **La demande est conservée** (contact + soumission + tâche « proposer une autre date ») mais aucune candidature n'est créée |
| 413 | corps > 64 Ko |
| 429 | rate-limit (10 soumissions / minute / internaute ; 120 / minute / IP de transport), en-tête `Retry-After` |

Idempotence : `leadId` (candidature, chaque étape du tunnel met à jour la même candidature), sinon en-tête `Idempotency-Key`, sinon empreinte du contenu du jour (double clic / rejeu réseau → `duplicate: true`).

### 5.2 Côté site (startupweek-v2)

> **Mise en œuvre retenue (26/09/2026) : double écriture.** Branche `claude/crm-double-ecriture` du site : `lib/server/crmMirror.ts` (`mirrorToCrm`) recopie chaque formulaire vers le CRM **après** la réponse à l'internaute (`after()` de Next), sans rien changer au parcours n8n (Airtable, emails, envoi du kit) ; un échec est journalisé et signalé par email (`notifyApiErrorByEmail`). Inactif tant que `CRM_INTAKE_URL` / `CRM_INTAKE_SECRET` ne sont pas définis. Côté CRM, **ne pas définir `RESEND_API_KEY`** pendant cette période (sinon deux accusés de réception). L'utilitaire `forwardToCrm` ci-dessous reste la cible pour la bascule définitive.

Remplacer les variables `N8N_WEBHOOK_*` par :

```
CRM_INTAKE_URL=https://cms-startupweek.vercel.app/api/intake
CRM_INTAKE_SECRET=<même valeur que INTAKE_SIGNING_SECRET>
```

Utilitaire à ajouter (ex. `src/lib/crm-intake.ts`) :

```ts
import { createHmac } from "node:crypto";

export type CrmForm =
  | "candidature" | "contact" | "entreprise" | "partenaire"
  | "reclamation" | "accompagnement" | "newsletter" | "starter-kit";

/** Transmet un formulaire au CRM, corps signé HMAC-SHA256 (en-tête x-sw-signature). */
export async function forwardToCrm(form: CrmForm, payload: Record<string, unknown>, req: Request) {
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  // Le corps signé doit être EXACTEMENT le corps envoyé : on sérialise une seule fois.
  const body = JSON.stringify({
    ...payload,
    submittedAt: new Date().toISOString(),
    origin: req.headers.get("referer") ?? undefined,
    ipAddress: clientIp,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  const signature = "sha256=" + createHmac("sha256", process.env.CRM_INTAKE_SECRET!).update(body).digest("hex");
  const res = await fetch(`${process.env.CRM_INTAKE_URL}/${form}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sw-signature": signature,
      ...(clientIp ? { "x-sw-client-ip": clientIp } : {}),
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, data };
}
```

Dans chaque route `/api/submit-*` (ex. `app/api/submit-contact/route.ts`) — adapter la forme de réponse à ce qu'attend déjà le front du site :

```ts
import { forwardToCrm } from "@/lib/crm-intake";

export async function POST(req: Request) {
  const payload = (await req.json()) as Record<string, unknown>;
  const { status, data } = await forwardToCrm("contact", payload, req);
  if (status === 202 || status === 200) return Response.json({ success: true });
  if (status === 409) return Response.json({ success: false, error: "SESSION_CLOSED", message: data.message }, { status: 409 });
  if (status === 400) return Response.json({ success: false, error: data.error, issues: data.issues }, { status: 400 });
  if (status === 429) return Response.json({ success: false, error: "RATE_LIMITED" }, { status: 429 });
  return Response.json({ success: false, error: "UPSTREAM_ERROR" }, { status: 502 });
}
```

Correspondance supposée (à confirmer dans le repo du site) : `submit-candidature → candidature`, `submit-contact → contact`, `submit-entreprise → entreprise`, `submit-partenaire → partenaire`, `submit-reclamation → reclamation`, `submit-accompagnement → accompagnement`, `submit-newsletter → newsletter`, `submit-starter-kit → starter-kit`.

Points d'attention côté site :
- **Ne jamais forcer** `consentRGPD` / `consentNewsletter` / `consent` à `true` : envoyer la valeur réelle de la case. Le CRM refuse une inscription newsletter sans `consentNewsletter: true`.
- Honeypot : ajouter un champ caché `_hp` (ou `_gotcha`) au formulaire et le transmettre tel quel ; s'il est rempli, le CRM répond 202 sans rien enregistrer. (`website` n'est **pas** un honeypot : c'est un vrai champ du formulaire partenaire.)
- **Période de double écriture recommandée** (1 à 2 semaines) : appeler le CRM **et** l'ancien webhook n8n, comparer les données, puis retirer n8n.

---

## 5 bis. Blog et FAQ du site pilotés par le back-office

Migration `20260926184846_crm_contents_site_sync.sql`, **appliquée en production le 26/09/2026** (empreinte des fonctions, colonnes, trigger et RLS identique au test local). Reprise faite le même jour : 34 articles et 41 questions importés dans `crm.contents` (fonction Edge à usage unique `crm-import-contenus`, neutralisée — réponse 410 — et supprimable depuis le Dashboard) ; contenu de `public.blog_post` / `public.faq_item` identique (empreintes) à la copie locale sur laquelle le rendu du site a été comparé. Même principe que les sessions : le CRM écrit dans des tables publiques que le site lit côté serveur (clé secrète, revalidation 60 s).

| Contenu CRM (*Contenus*) | Condition | Table lue par le site | Page |
| --- | --- | --- | --- |
| Type « Article de blog », canal **Blog**, slug renseigné | statut **Publié** | `public.blog_post` | `/blog` et `/blog/<slug>` |
| Type « FAQ » (question = titre, réponse = corps) | statut **Publié** | `public.faq_item` | `/faq` (catégorie + ordre) |

- Tout autre statut (rédaction, relecture, planifié, archivé) ou la suppression retire la ligne publique. **Planification** : un article de blog ou une question de FAQ « Planifié » passe seul en « Publié » à l'heure prévue (§ 5 ter).
- **Changement de canal, de type ou de slug** d'un contenu en ligne : l'éditeur demande confirmation (l'article sort du site, ou son ancienne adresse `/blog/<slug>` ne répond plus). Même chose pour « Repasser en rédaction ». Un contenu = un canal : pour annoncer un article sur LinkedIn, créer un second contenu « Post LinkedIn » (bouton *Dupliquer*).
- Deux articles publiés avec le même slug : le second n'est pas publié, un incident `systeme` l'indique dans le journal ; il est repris dès que le slug se libère.
- `crm.contents` gagne `category` (rubrique du blog / clé de catégorie FAQ), `sort_order` et `meta` (jsonb : temps de lecture, auteur, points clés, FAQ de l'article, appel à l'action, articles liés, sommaire, image mobile). Éditeur : panneau « Article du blog » / « Page FAQ du site ».
- **Format du corps** (Markdown étendu, converti en blocs par le site — `lib/blog/markdown.ts` du site) : `## Titre {#h2-ancre}`, paragraphes, `**gras**`, liens `[texte](/url)`, listes `- `, citations `> `, encadrés `> [!info|warning|success|tip] texte`, tableaux `| a | b |`, images `![légende](/image.webp)`.
- `public.blog_post` / `public.faq_item` : RLS active sans policy, droits retirés à `anon` / `authenticated` ; seul le serveur du site (service_role) les lit.
- **Repli du site** : tant que la table est vide, non configurée ou en erreur, le site affiche les articles et questions livrés avec son code.
- **Reprise initiale** : `npx tsx scripts/export-content-for-crm.ts` (dépôt du site) exporte les 34 articles et 41 questions actuels en lignes `crm.contents` (identifiants `cnt_blog_<slug>` / `cnt_faq_<id>`, import rejouable). Vérifié en local (PostgreSQL 16 + PostgREST, site construit sur la base) : 34 articles et la FAQ rendus **à l'identique** (HTML comparé page à page) ; seule la liste `/blog` change l'ordre de deux cartes, désormais triée strictement par date (l'article du 19/08 était placé après celui du 18/08).

## 5 ter. Planificateur (Supabase Cron)

Migration `20260926205030_crm_scheduler.sql`, **appliquée en production le 26/09/2026** : définitions des 4 fonctions identiques (empreintes) à la base de test locale ; première exécution automatique réussie ; scénario rejoué sur la vraie base dans un bloc annulé (article publié et recopié dans `public.blog_post`, post LinkedIn resté « Planifié » avec sa tâche de rappel, rien de conservé) ; aucun nouvel avertissement des *advisors*.

| Tâche `cron.job` | Fréquence (UTC) | Rôle |
| --- | --- | --- |
| `crm-scheduler` | chaque minute | `select crm.run_scheduler()` — point d'entrée unique des traitements périodiques du CRM |
| `crm-cron-purge` | 03:23 chaque jour | efface l'historique `cron.job_run_details` de plus de 7 jours (pg_cron ne purge jamais seul) |

Traitements de `crm.run_scheduler()` (contenus « Planifié » dont l'heure est passée) :

- `crm.publish_due_contents()` — **article de blog (canal Blog) et FAQ**, les seuls contenus que le CRM met lui-même en ligne : statut → « Publié », date de publication = date programmée ; le trigger `contents_site_sync` les recopie vers le site (visible sous 60 s, soit ~2 min au plus après l'heure prévue). Une FAQ sans catégorie ou un article sans slug repasse en « Relecture » avec une trace `systeme` (l'éditeur l'empêche déjà).
- `crm.remind_due_contents()` — **tous les autres** (LinkedIn, Instagram, newsletter, études de cas…), que le CRM ne publie pas : tâche « Publier sur LinkedIn : « titre » » (priorité haute, assignée à l'auteur, rattachée au contenu, échéance = heure prévue) ; le contenu reste « Planifié » jusqu'à ce qu'on le marque « Publié ». Un seul rappel ouvert par contenu : reprogrammé, le rappel suit la nouvelle date ; publié, archivé, repassé en rédaction ou supprimé, le rappel est clos automatiquement.

Chaque traitement est isolé (un échec n'empêche pas les autres) ; un échec est journalisé dans `crm.activities` (`automations` / `crm-scheduler`), une fois par heure au plus. Coût : une requête indexée par minute, sans appel réseau ni facturation à l'usage ; seul l'historique pg_cron occupe de la place (purgé chaque nuit).

**Ajouter un traitement** (ex. envoi des emails programmés, § 12) : écrire sa fonction dans une nouvelle migration et l'appeler dans `crm.run_scheduler()` (même bloc `begin … exception` que les autres, avec `crm.scheduler_failure('<nom>', sqlerrm, sqlstate)`). Un traitement qui doit appeler l'application (Resend…) passe par `pg_net` (déjà actif) vers une route API protégée.

**Surveiller** (SQL Editor, ou *Integrations → Cron* dans le Dashboard) :

```sql
select jobname, schedule, active from cron.job;
select start_time, status, return_message from cron.job_run_details order by start_time desc limit 20;
select at, summary, meta from crm.activities where entity_id = 'crm-scheduler' order by at desc limit 20;
```

Si les exécutions s'arrêtent (processus « pg_cron scheduler » absent de `pg_stat_activity`), Supabase recommande un redémarrage rapide du projet (*Settings → General*).

## 5 quater. Envoi des emails

Migration `20260926215925_crm_email_delivery.sql`, **appliquée en production le 26/09/2026** : définitions des 6 fonctions, contenu des 25 modèles, séquence, colonnes et triggers identiques (empreintes) à la base de test locale ; aucun nouvel avertissement des *advisors*. URL et secret de la route rangés dans Vault (`crm_email_dispatch_url`, `crm_email_dispatch_secret`) le même jour.

**Principe.** Tout email du CRM passe par la file `crm.email_messages` :

1. l'interface (réponse, facture, devis, relance, candidature, convocation, questionnaire…) ou le serveur (formulaires du site, séquence Digital Starter Kit) insère un message **« programme »** (heure d'envoi = maintenant ou plus tard) ;
2. la base appelle `POST /api/emails/dispatch` du back-office via `pg_net` : trigger sur `crm.email_messages` pour un envoi immédiat, et le planificateur (§ 5 ter, chaque minute) pour les envois programmés, les nouveaux essais et le rattrapage ;
3. la route réserve les messages dus (`crm.claim_due_emails`, verrou + tentative comptée), complète les liens personnels, contrôle le message, envoie en **SMTP** (boîte `contact@startupweek.tech`, comme n8n) et note le résultat.

| Résultat | Statut | Détail |
| --- | --- | --- |
| Envoyé | `envoye` | horodatage, Message-ID (`provider_id`), trace « Email envoyé » sur l'élément lié et sur le contact |
| Refus / panne SMTP | `programme` puis `erreur` | nouvel essai à +5 puis +10 min ; `erreur` au 3e échec, raison dans `error` (visible dans le journal) |
| Variable non remplie (`{{…}}`) | `erreur` | jamais envoyé avec une variable brute ; la fenêtre de rédaction bloque déjà |
| Email marketing (catégorie « nurturing ») sans consentement | `brouillon` | raison dans `error` ; contrôle au moment de l'envoi |

**Liens personnels complétés à l'envoi.** `{{lien_document}}` → `/documents/<jeton>` : la facture ou le devis lié, consultable et imprimable en PDF sans compte (jeton non devinable `public_token`, brouillons jamais servis, seules les données imprimées sont transmises). Emails marketing : lien de désinscription en pied (`/desinscription/<jeton>`) et en-têtes `List-Unsubscribe` / `List-Unsubscribe-Post` (désinscription en un clic des messageries, `POST /api/unsubscribe/<jeton>`) → consentement marketing du contact à faux, horodaté.

**Modèles.** 25 modèles de production insérés par la migration (source : `src/lib/data/email-templates.ts`, formulations reprises des emails n8n, vouvoiement sauf Digital Starter Kit) : accusés des 6 formulaires, Digital Starter Kit + suite J+3, entretien, acceptation présentiel / distanciel, refus, convocation, accusé de réclamation, questionnaire à chaud, facture, facture d'acompte, avoir, rappel avant échéance, relances J+3 / J+10, mise en demeure, devis, relances manuelles. Modifiables dans *Emails → Modèles* (un modèle modifié n'est jamais écrasé par une migration). Séquence `seq_dsk` (kit à J0, suite à J+3).

**Configuration (une fois).**

1. Vercel, projet `cms-startupweek` → *Settings → Environment Variables* (Production), puis redéployer :
   ```
   SMTP_HOST=<hôte SMTP de la boîte contact@ — identifiant n8n « smtp-startupweek »>
   SMTP_PORT=465                  # 587 si le serveur utilise STARTTLS (SMTP_SECURE=false)
   SMTP_USER=contact@startupweek.tech
   SMTP_PASSWORD=<mot de passe de la boîte>
   EMAIL_FROM=StartupWeek <contact@startupweek.tech>
   EMAIL_DISPATCH_SECRET=<valeur du secret Vault crm_email_dispatch_secret, point 2>
   EMAIL_BCC=aurelien.chiren@gmail.com   # facultatif : copie de chaque email (n8n mettait cette adresse en copie)
   PUBLIC_APP_URL=https://…              # facultatif : domaine des liens envoyés (défaut : URL de production Vercel)
   ```
2. Secret partagé : créé dans Vault le 26/09/2026 (valeur aléatoire tirée par la base, jamais écrite ailleurs). Pour le lire et le copier dans `EMAIL_DISPATCH_SECRET` : Supabase → SQL Editor :
   ```sql
   select decrypted_secret from vault.decrypted_secrets where name = 'crm_email_dispatch_secret';
   ```
   (Nouvel environnement : `select vault.create_secret('<URL>/api/emails/dispatch', 'crm_email_dispatch_url');` et `select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'crm_email_dispatch_secret');`.)
3. *Paramètres → Intégrations* : « Emails transactionnels » doit afficher les voyants email et route d'envoi au vert ; *Emails → Modèles → Envoyer un test*.
4. *Paramètres → Organisation* : SIRET, adresse, téléphone, n° de déclaration d'activité et **IBAN** (mentions des factures, règlement par virement dans les emails). *Paramètres → Qualiopi* : lien du questionnaire de satisfaction (sinon l'envoi du questionnaire à chaud est bloqué).

**Surveiller.**

```sql
select status, count(*) from crm.email_messages group by status;
select "to", subject, attempts, error, scheduled_at from crm.email_messages where status in ('erreur', 'programme') order by scheduled_at desc limit 20;
select id, status_code, left(content::text, 200), created from net._http_response order by created desc limit 10;  -- réponses de la route d'envoi
```

**Limites.** Pas de suivi d'ouverture ni de clic (SMTP) ; un rebond différé (boîte pleine, adresse morte signalée plus tard) arrive dans la boîte `contact@`, pas dans le CRM. Les séquences autres que Digital Starter Kit (J-7, J+1, relances automatiques de devis / factures…) ne sont pas exécutées automatiquement : leurs emails s'envoient depuis les fiches (boutons) ou la fenêtre de rédaction. Les réponses au questionnaire de satisfaction restent dans l'outil de formulaire choisi.

## 5 quinquies. Mesure d'audience du site (sans cookie)

Migration `20260926220247_crm_site_analytics.sql`, **appliquée en production le 26/09/2026** : droits vérifiés (`service_role` seul peut appeler la fonction ; `anon` et `authenticated` refusés ; tables d'empreintes illisibles hors service_role) ; scénario rejoué sur la vraie base dans un bloc annulé (page vue d'un article venant de Google, seconde vue, clic, formulaire commencé puis envoyé → 1 visiteur, 2 pages vues, 1 lecteur, 1 clic, 1 lead ; `crm.contents` et `public.blog_post` intacts ; rien de conservé) ; *advisors* : seulement `rls_enabled_no_policy` (INFO) sur `crm.site_salts` / `crm.site_visitors`, voulu. Validée auparavant en local : PostgreSQL 16 + PostgREST 12.2.3, site construit et piloté dans Chromium (visiteurs, sources, lecteurs uniques, clics, leads du jour et de la veille, opt-out, robots, requêtes d'un autre site, étapes du tunnel de candidature).

**Avant** : `crm.traffic_days` vide et `crm.contents.metrics` à 0 pour les 75 contenus publiés — rien ne les alimentait ; la carte « Tracking » affirmait que Vercel Web Analytics était la source des chiffres (aucun import n'existait).

| Événement | Émis par | Alimente |
| --- | --- | --- |
| Page vue | navigateur → `POST /api/event` du site (`components/SiteAnalytics.tsx`) | `crm.traffic_days` (visiteurs, pages vues, sources) ; pour `/blog/<slug>` : `crm.content_stats_days` (vues, lecteurs, sources) |
| Clic sur un lien d'un article | navigateur → `/api/event` | `content_stats_days.clicks` |
| Formulaire commencé (1er champ, une fois par page) | navigateur → `/api/event` | `traffic_days.form_starts` |
| Formulaire envoyé | **serveur du site** (`mirrorToCrm`, toutes les routes `/api/submit-*` sauf réclamation ; tunnel de candidature : étape « capture » seulement) | `traffic_days.form_submits` ; `content_stats_days.leads` du dernier article lu (le jour même ou la veille) |

- **Point d'entrée** : `crm.track_site_event(kind, path, ip, user_agent, referrer_host, utm_source, utm_medium)`, appelée par le site avec sa clé secrète (même client que le blog, aucune nouvelle variable). La route `/api/event` n'accepte pas « formulaire envoyé » : un lead ne peut pas être fabriqué depuis un navigateur.
- **Vie privée** : aucun cookie ni stockage sur l'appareil. Un visiteur = `sha256(sel du jour | IP | user-agent)` calculé en base ; IP et user-agent ne sont pas enregistrés ; sels et empreintes (`crm.site_salts`, `crm.site_visitors`) effacés après 48 h par la tâche horaire `crm-site-visitors-purge`. Seuls restent des compteurs. Ignorés : robots, IP de `EXCLUDED_ANALYTICS_IPS` (cookie `analytics-excluded` posé par `proxy.ts`), navigateurs passés par `/disable-analytics`, préproduction, previews Vercel, localhost, espace membre.
- **Définitions** : visiteurs = uniques **par jour**, additionnés sur une période ; source = UTM de la première page vue du jour, sinon domaine référent (Google et moteurs, LinkedIn, Instagram, messageries → newsletter, autres sites → « Partenaires & autres sites »), sinon « Direct » ; Meta Ads = `utm_source` meta… / *_ads, ou facebook / instagram avec `utm_medium` payant (cpc, paid…) — **les campagnes Meta doivent porter ces UTM** pour être reconnues.
- **Articles** : un article est reconnu par son slug publié (`public.blog_post.slug` → `crm_id`) ; les statistiques restent attachées au contenu si le slug change ensuite. `crm.contents` n'est jamais modifié par la mesure (sinon : recopie vers le site et date « modifié le » à chaque vue). `contents.metrics` devient la **saisie manuelle** (posts LinkedIn / Instagram, newsletter : bouton « Mettre à jour les chiffres » dans l'éditeur) ; le CRM affiche saisie + mesure (`contentPerformance()`).
- **CRM** : `content_stats_days` lisible par les sections Contenus et Analytics (aucune écriture depuis l'interface), chargée à la connexion avec `traffic_days` (les chiffres s'actualisent au rechargement). Fiche d'un article : vues, lecteurs, clics, leads sur 30 j / 90 j / 12 mois, histogramme, lecteurs par source. Page Analytics : la carte « Tracking » affiche la date de la dernière donnée reçue.
- **Limites** : une partie des visiteurs échappe à toute mesure côté navigateur (bloqueurs, JavaScript désactivé) ; plusieurs personnes derrière la même IP avec le même navigateur comptent pour un ; la FAQ et les autres pages ne sont pas mesurées contenu par contenu (seulement dans le trafic global). Conversions vers Meta (API Conversions) / GA4 depuis le CRM : non implémentées.
- **Politique de confidentialité du site** : elle ne mentionne aujourd'hui que Google Analytics — à compléter (mesure d'audience interne, sans cookie, base légale intérêt légitime, conservation des empreintes 48 h).

```sql
-- Contrôle rapide (SQL Editor)
select date, visitors, pageviews, sources, form_starts, form_submits from crm.traffic_days order by date desc limit 7;
select c.title, s.date, s.views, s.visitors, s.clicks, s.leads from crm.content_stats_days s join crm.contents c on c.id = s.content_id order by s.date desc, s.views desc limit 20;
```

## 6. Brancher Stripe

1. Dashboard Stripe → Developers → Webhooks → *Add endpoint* : `https://cms-startupweek.vercel.app/api/stripe/webhook`.
2. Événements à cocher :
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `payment_intent.succeeded`
   - `charge.refunded`
3. Copier le *Signing secret* (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET`. Optionnel : `STRIPE_SECRET_KEY` (clé restreinte en lecture PaymentIntents/Charges/Balance) pour enregistrer les frais Stripe (`fee_cents`).
4. Rattacher chaque paiement à une facture du CRM :
   - Payment Link : ajouter `?client_reference_id=<id de la facture crm>` à l'URL (stocker ce lien dans `invoices.stripe_payment_link`) ;
   - Checkout / PaymentIntent créés par API : `metadata.invoice_id = <id de la facture crm>` (sur le PaymentIntent via `payment_intent_data.metadata` pour que `payment_intent.succeeded` le porte aussi).
5. Tester : `stripe listen --forward-to localhost:3000/api/stripe/webhook` puis `stripe trigger checkout.session.completed`. Les événements de test n'ont pas d'`invoice_id` : ils sont journalisés (`crm.activities`, kind `systeme`) et ignorés — c'est le comportement attendu.

Comportement : un paiement = une ligne `crm.payments` (référence `pi_…` unique, donc `checkout.session.completed` + `payment_intent.succeeded` ne comptent qu'une fois) ; un remboursement = une ligne négative au statut `rembourse` (delta de `amount_refunded`, cumulatif chez Stripe) ; le trigger recalcule `paid_cents` et le statut `partielle` / `payee` de la facture. Réponse 200 même pour un événement ignoré (pas de rejeu inutile), 500 en cas d'erreur (Stripe rejoue, sans doublon).

---

## 7. Brancher Qonto (Vercel Cron)

1. Qonto → Paramètres → Intégrations & partenaires → Clé API : `QONTO_ORGANIZATION_SLUG` et `QONTO_SECRET_KEY`.
2. Identifiant du compte : `curl -H "Authorization: $SLUG:$SECRET" https://thirdparty.qonto.com/v2/organization` → `bank_accounts[].id` → `QONTO_BANK_ACCOUNT_ID`.
3. `CRON_SECRET=<openssl rand -hex 32>` dans Vercel (Vercel l'envoie automatiquement en `Authorization: Bearer …` aux crons). Sans ce secret, la route refuse de synchroniser (503).
4. Ajouter dans `vercel.json` du CRM :
   ```json
   { "crons": [{ "path": "/api/qonto/sync", "schedule": "17 * * * *" }] }
   ```
   (Plan Vercel Hobby : un cron au maximum par jour — utiliser alors `"17 6 * * *"` et `?days=3` couvre les week-ends.)
5. Test manuel : `curl -X POST -H "Authorization: Bearer $CRON_SECRET" "https://cms-startupweek.vercel.app/api/qonto/sync?days=30"`.

Rapprochement automatique volontairement prudent : transaction créditrice dont le libellé/la référence contient **un seul** numéro `F-AAAA-NNNN` (préfixe = `settings.invoice_prefix`), facture émise non soldée, montant **exactement** égal au solde (ou au total TTC si rien n'est encore payé). Tout le reste reste « à rapprocher » dans l'interface. Les transactions déjà importées ne sont jamais réécrites (un rapprochement manuel n'est pas écrasé).

---

## 8. Migration des données Airtable

Base : « CRM Startup Week ». Aucun script d'import n'est livré ; recommandation : export via l'API Airtable → transformation (script Node ponctuel) → insertion avec le client service_role, **table par table dans l'ordre ci-dessous**, en renseignant `airtable_record_id` (colonne unique prévue sur les tables importées) pour pouvoir rejouer l'import sans doublon (`upsert … on conflict (airtable_record_id)`).

### 8.0 Résultat de l'analyse (26/09/2026)

| Table Airtable | Contenu | Traitement |
| --- | --- | --- |
| Events | 13 sessions réelles | importées (§ 8.4) |
| Ressources | 2 réelles, 1 test, 1 vide | 2 importées, test et vide supprimés |
| Contacts, Candidature, Form Submissions | 1 enregistrement de test chacun | supprimés |
| Digital Starter Kit | 6 tests | supprimés |
| Companies, Reclamation, Partenariats, Accompagnements, Messages contact, Demandes entreprise | vides | — |

La base « CRM Startup Week backup » (44 contacts factices) n'est pas importée. Les correspondances ci-dessous restent la référence si des données devaient être reprises plus tard.

### 8.1 Correspondance

| Ordre | Airtable | → `crm` | Points clés |
| --- | --- | --- | --- |
| 1 | — | `team_members` | Créer l'équipe d'abord (§ 4). `Assignee` Airtable → `owner_id` / `assignee_id` par email. |
| 2 | **Companies** | `organizations` | `Company Name`→`name` (la clé `name_key` dédoublonne « ACME SAS » = « Acmé ») ; `Industry`→`sector` ; `Notes` (+ `Phone Number`) → `notes` ; `type` = `entreprise`. |
| 3 | **Contacts** | `contacts` | `Email Address`→`email` (trim + minuscules ; **fusionner** les doublons avant import : l'index unique est sur `lower(email)`) ; `First/Last Name` ; `Phone Number` ; `Age` (texte → entier ou null) ; `Location`→`city` ; `Job Title` ; `Company`→`org_id` ; `GDPR Consent`→`consent.gdpr` ; `Marketing Consent`/`Marketing Consent Date`/`Marketing unsubscribed date` → `consent.marketing` / `marketingAt` / `unsubscribedAt` ; `source = import_airtable`. `Contact Type` et `Tags` : voir 8.2. |
| 4 | **Events** | `sessions` | `Code session`→`code` ; `Event Name`→`name` ; `Event Type`→`mode` ; `format`→`format` ; `Event Date - debut/fin` → `start_at`/`end_at` (date + heure Europe/Paris) ; `Registration_deadline` (vide → début − 7 j, automatique) ; `Nb places total/min` → `capacity`/`min_capacity` ; `Tarif`×100 → `price_cents` ; `Prix public cible`×100 → `public_price_cents` ; `Points forts` (une ligne = un élément) → `highlights` ; `Founder Edition`, `Early Bird` ; `Region` → `France` / `Europe` / `Hors Europe` ; `Image URL site` (sinon ré-héberger `Image_event_url`, lien Airtable expirant) → `image_url` ; `Event Description` → `description` ; `Status` → `status` (« Ouvert aux inscriptions » → `inscriptions_ouvertes`, « Complet » → `complet`, …) ; `published_on_site = true` pour les sessions actuellement visibles ; `recordID` → `airtable_record_id`. `Detail_programme` n'a pas d'équivalent structuré (`program` jsonb) : laisser `program` vide conserve le `program_details` actuel du site (la synchro ne l'écrase pas quand le programme CRM est vide). |
| 5 | **Ressources** | `resources` | `Name`, `Description`, `Categorie`→`category`, `format`, `Niveau_contenu` → `visibility` (premium → `premium`, gratuit → `participants`) ; `url ressource` : **ré-héberger dans Supabase Storage** (les URLs Airtable expirent) → `url` ; `events` → `event_ids` ; record id → `airtable_record_id` (permet à la synchro de **reprendre** les lignes `public.template` / `public.administrative_resource` déjà créées par n8n au lieu de les dupliquer). |
| 6 | **Candidature** (+ `Project Name`, `Description`, `Development Stage`, `Target Market`, `6-Month Objectives`) | `projects` puis `applications` | `Id Candidature`→`number` (conservé) ; `Contacts`→`contact_id` ; `session`→`event_id` ; `Lead ID`→`idempotency_key` ; `Statut candidature` → `status` (Nouvelle/Qualifiée/Hors cible/Entretien planifié/Acceptée/Inscrite/Refusée/Désistée → `nouvelle`/`qualifiee`/`hors_cible`/`entretien`/`acceptee`/`inscrite`/`refusee`/`desistee`) ; `Lead Stage`, `Intent`, `Offer` ; `Reason to Join…`→`motivation` ; `Budget disponible`, `Disponibilités`, `Comment avez-vous…`→`heard_from` ; `Expérience entrepreneuriale/technique` → enums ; `Booking Confirmed At` → `interview_at` si c'est bien la date d'entretien ; `Montant payé`×100 → `amount_paid_cents` (les factures historiques restent hors CRM ou sont ressaisies). |
| 7 | **Form Submissions** + **Messages contact** + **Demandes entreprise** + **Partenariats** + **Accompagnements** + **Digital Starter Kit** + **Reclamation** | `submissions` (historique, statut `archivee` ou `convertie`) + objets métier | Messages contact → `submissions(type contact)` ; Demandes entreprise → `deals(type entreprise)` + `organizations` ; Partenariats → `organizations` + `deals(type partenariat)` ; Accompagnements → `deals(type accompagnement)` ; Digital Starter Kit → `submissions(type digital_starter_kit)` + tag `stade:<valeur>` ; Reclamation → `complaints` avec un numéro explicite `REC-<année de création>-NNN` (le compteur se réaligne seul). `received_at` = `createdTime` de l'enregistrement Airtable. |

**Consentements historiques** : n8n forçait `GDPR Consent` à `true` dans *Form Submissions* ; ces valeurs ne sont pas une preuve. Les importer avec `consent.source = "import_airtable (valeur non vérifiable)"` et ne s'appuyer que sur `Marketing Consent` (case réelle des contacts) pour l'emailing.

### 8.2 Nettoyage des champs pollués

`Contact Type` et `Tags` ont été écrasés par les upserts n8n successifs : ne pas les reprendre tels quels.
- `lifecycle` : **recalculer à partir des liens** plutôt que de `Contact Type` — candidature « Inscrite » sur une session terminée → `alumni` ; « Inscrite » → `participant` ; autre candidature → `candidat` ; demande entreprise gagnée → `client` ; partenariat actif → `partenaire` ; demande entreprise / accompagnement ouverte → `prospect` ; sinon `lead`.
- `tags` : minuscules, trim, dédoublonnage, fusion des synonymes (lister les valeurs avec l'outil Airtable « get_table_schema » / l'API meta), suppression des valeurs techniques ; conserver au besoin l'ancienne valeur sous la forme `airtable:<valeur>`.
- Selects libres (`Budget estimé`, `Nombre participants`, `Format souhaité`, `Type organisation`…) → valeurs brutes dans `submissions.fields`, jamais dans une colonne à CHECK.

### 8.3 Exécution de l'import

```sql
-- Pendant l'import en masse : désactiver les triggers (audit, synchro site, numérotation).
set session_replication_role = replica;   -- si refusé (rôle non superuser) : pour chaque table importée,
                                          -- alter table crm.<table> disable trigger user;  (puis enable trigger user)
-- … inserts …
set session_replication_role = origin;

-- Puis rejouer les traitements dérivés :
update crm.contacts set email = lower(btrim(email));
update crm.organizations set name = name;                                   -- recalcule name_key
select setval(pg_get_serial_sequence('crm.applications', 'number'), coalesce((select max(number) from crm.applications), 1));
select crm.sync_document_counter('invoice', number)   from crm.invoices   where number <> '';
select crm.sync_document_counter('complaint', number) from crm.complaints where number <> '';
select crm.sync_document_counter('quote', number)     from crm.quotes     where number <> '';
select crm.refresh_session_capacity(id) from crm.sessions;                  -- statuts complet / ouvert
select crm.resync_site();                                                   -- seulement APRÈS l'arrêt de la synchro n8n (§ 9)
```

Contrôle de parité avant `resync_site()` :

```sql
select s.code,
       e.title = s.name                                              as titre_ok,
       e.total_places = s.capacity                                   as places_ok,
       e.price_cents = s.price_cents                                 as prix_ok,
       e.start_date = (s.start_at at time zone 'Europe/Paris')::date as debut_ok,
       e.status::text, s.status, s.published_on_site
from crm.sessions s
full join public.event e on e.event_code = s.code
order by 1;
```

---

### 8.4 Import réalisé le 26/09/2026

- **Sessions** : `insert … select` depuis `public.event` (copie exacte d'Airtable par n8n : 234 champs comparés, 0 écart), heures fixées à 09:00 (début), 18:00 (fin) et 23:59 (date limite), heure de Paris ; `inscriptions_ouvertes`, publiées. Essai préalable dans une transaction annulée. Après import, le CRM a republié `public.event` : seuls changements, `min_places` vide → 0 (non affiché par le site) et SW-0011 9 → 10 places (la candidature de test n'est plus comptée).
- **Ressources** : l'unique fichier réel (PDF « Ressource d'acculturation digitale pour étudiants admis », 139 603 octets) est hébergé dans Supabase Storage, bucket public `ressources` (PDF uniquement, 20 Mo max) : `…/storage/v1/object/public/ressources/acculturation-digitale.pdf`. « Acculturation digitale » (premium) importée et reliée à sa ligne `public.administrative_resource` ; le modèle `public.template` du même nom (hors CRM) pointe vers le même fichier. « guide pratique marrakech » importée **sans fichier** (elle pointait vers ce même PDF) : non publiée, à compléter dans le CRM.
- **Nettoyage du site** : liens Airtable expirés remplacés ; supprimés : 3 doublons « Acculturation digitale » et 3 modèles factices (`public.template`), ressources « TEST CLAUDE (maj) », « Informations pratiques — Lisbonne 2026 » (`example.com`) et « guide pratique marrakech » (`public.administrative_resource`). **Restent** « Maquette Landing Page » et « Pitch Deck Startup », dont le lien est expiré : `public.content` les référence (`on delete cascade`, 2 contenus d'un compte interne) — à traiter à part.
- **Ajouter un fichier** : depuis le CRM, *Ressources* → *Ajouter une ressource* (ou « Déposez la nouvelle version » sur une ressource existante) : le fichier est envoyé dans le bucket `ressources` avec la session de l'utilisateur et son URL publique est enregistrée. PDF, Markdown, texte et ZIP, 20 Mo maximum ; dépôt réservé aux rôles ayant l'écriture sur « ressources » (admin, pédagogie) — migration `20260926214726_crm_resources_storage.sql`, **appliquée en production le 26/09/2026** (policies vérifiées : dépôt accepté pour l'admin, refusé pour un utilisateur Auth non rattaché). Un fichier envoyé puis abandonné (formulaire annulé) est supprimé ; un fichier enregistré ne l'est jamais (l'ancienne version garde son URL). Le bucket est public : quiconque a le lien peut télécharger, y compris un contenu premium (comme auparavant avec les liens Airtable). Une fonction Edge `crm-import-ressource` a servi au dépôt initial ; elle est neutralisée (réponse 410) et peut être supprimée depuis le Dashboard.

## 9. Ordre de décommissionnement des workflows n8n

Ne rien supprimer : **désactiver** (bouton *Active*) et garder 30 jours pour le retour arrière.

1. **Phase 0 — migrations** (§ 2) : ✅ faite le 26/09/2026 ; aucun impact sur le site tant que `crm.sessions` / `crm.resources` / `crm.applications` sont vides.
2. **Phase 1 — sessions & ressources** (le CRM devient la source de vérité du site) — ✅ **faite le 26/09/2026** : points 2 et 5 réalisés, point 3 pour « Create or update Event » (les deux webhooks de ressources restent actifs mais ne sont plus appelés), point 4 inclus dans le workflow de synchro désactivé ; point 1 (geler Airtable) à faire par l'équipe. Retour arrière : réactiver les deux workflows dans n8n.
   1. geler les modifications dans Airtable *Events* / *Ressources* ;
   2. désactiver « Sync Airtable -> Supabase (polling, remplace automatisations Airtable) » (`mRWu02E5EofDrUf2`) — sinon Airtable et le CRM écrivent tous deux `public.event` ;
   3. désactiver « Create or update Event » (`qZ1uM01BISgdzSIw`), « Ressources copy » (`y5Giw9ESoq1cqNFN`), « add  ressources for event(s) » (`WwrQLJOswqX2fjLI`) ;
   4. désactiver le calcul planifié « Complet / places restantes » (schedule de 5 min) là où il tourne ;
   5. import final Events/Ressources (§ 8), contrôle de parité, `select crm.resync_site();`, vérification visuelle du site.
3. **Phase 2 — formulaires** : déployer le CRM avec `INTAKE_SIGNING_SECRET`, brancher le site (§ 5, idéalement en double écriture), puis désactiver : « Candidature event » (`PCVx4VkskfoI4VWP`), « Contact » (`YYJ69jSnnZvNFkHa`), « Entreprise » (`K1CHfFqlhFh7zRly`), « Partenariats » (`wUQLk9hNTk1MDnVU`), « Reclamation » (`UiCmWkkDvx1WsjqT`), « Accompagnements » (`QS9PaGrTewx75S4f`), « Consent Newsletter » (`DEC8qpIBbudcIaHC`), « Digital Starter Kit » (`ElSer8yPoJi69Axz`). Vérifier dans les variables `N8N_WEBHOOK_*` du site que chaque URL correspond bien à ces workflows, puis supprimer ces variables.
4. **Phase 3** : import du delta des formulaires reçus par n8n avant la bascule ; Airtable en lecture seule ; archivage au bout de 3 mois.
5. **En dernier** : « Error workflow » (`xJkNu25LAqEwShBW`). Hors périmètre, à vérifier séparément : « formulaire contact » (autre dossier), « contact interstellabs », « Snow White Cocoon — Automatisation Meta ».

---

## 10. Retour arrière

| Niveau | Action |
| --- | --- |
| Formulaires | Remettre les URLs `N8N_WEBHOOK_*` dans le site et réactiver les 8 workflows. Effet immédiat. |
| Synchro site | `alter table crm.sessions disable trigger sessions_site_sync; alter table crm.resources disable trigger resources_site_sync; alter table crm.applications disable trigger applications_capacity;` puis réactiver le polling n8n (il réécrit `public.event` depuis Airtable). |
| Paiements | Désactiver l'endpoint dans Stripe ; retirer le cron Qonto de `vercel.json`. |
| Emails | Retirer `EMAIL_DISPATCH_SECRET` (ou les variables SMTP) dans Vercel : plus rien ne part, les emails restent en file « Programmé ». Revenir à n8n pour les formulaires : désactiver *Emails des formulaires du site*. |
| Planificateur | `select cron.unschedule('crm-scheduler');` (plus de publication ni de rappel automatiques ; les contenus « Planifié » attendent) ; `select cron.unschedule('crm-cron-purge');` ; `drop extension pg_cron;` supprime toutes les tâches. |
| Tout le CRM | `drop schema crm cascade;` — supprime tables, fonctions et triggers du CRM ; **aucune table `public.*` n'est modifiée structurellement** (seules leurs lignes ont pu être mises à jour par la synchro). Puis `supabase migration repair --status reverted 20260926103012 20260926103117 20260926103336 20260926103516`. |
| Données | Restauration du backup / PITR pris avant la migration (§ 2.1). |

---

## 11. Points à vérifier sur la vraie base

1. ✅ **Propriétaire / RLS des tables du site** (vérifié le 26/09/2026 : une session publiée crée bien sa ligne `public.event`, sans incident `systeme`). Les fonctions de synchro sont `SECURITY DEFINER` (propriétaire = rôle qui applique la migration, normalement `postgres`) ; si les droits changent côté site, l'échec est journalisé dans `crm.activities` (kind `systeme`) sans bloquer le CRM.
2. ✅ **Enums** (vérifié le 26/09/2026) : `public.event_format`, `public.event_type`, `public.event_status`, `public.template_format`, `public.template_category`, `public.subscription_tier`, `public.administrative_document_*` existent dans `public` avec les valeurs attendues.
3. ✅ **Contrainte `event_code ~ '^SW-[0-9]{4}$'`** (NOT VALID, présente) : les sessions dont le code ne respecte pas ce format ne sont pas publiées (trace `systeme`).
4. **Correspondances de valeurs vers le site** (limitations des enums du site) : `format` `journee` / `mois` → `semaine` ; `mode` `hybride` → `presentiel` ; statut `brouillon` / `prevu` ou `published_on_site = false` → `brouillon` ; `inscriptions_ouvertes` / `complet` / `en_cours` → `publie`. Ressources : catégories business_plan / pitch_deck / maquette / financier / digital → `public.template` ; les autres → `public.administrative_resource` (n8n n'envoyait que `digital` vers `template`) ; `juridique` → catégorie `contrat`.
5. **Clés `sb_secret_…`** avec supabase-js (testé uniquement avec un JWT service_role local).
6. **Qonto v2** : champs `id`, `amount_cents`, `side`, `settled_at`, `reference`, pagination `meta.next_page` et filtre `status[]=completed` (d'après la documentation ; non appelés réellement).
7. **Rate-limit** en mémoire : par instance serverless (suffisant contre le spam ; pas une limite globale).
8. Jours fériés non gérés dans le calcul « 48 h ouvrées » des réclamations (samedi/dimanche seulement).
9. **Migration `20260926122058`** (appliquée le 26/09/2026) : testée localement puis sur la vraie base (bloc annulé) — compte à email vérifié rattaché au membre de même email (casse ignorée), email non vérifié / membre désactivé / compte sans membre → rien, `anon` refusé ; écriture d'un membre connecté → pas d'audit automatique (l'interface journalise), écriture service_role → audit conservé. `auth.users.email_confirmed_at` est supposée présente (colonne standard de Supabase Auth).
10. **Advisors après exposition du schéma `crm`** (26/09/2026) : `authenticated_security_definer_function_executable` (WARN) liste 8 fonctions `crm` appelables en RPC par tout compte connecté. Voulu pour `claim_team_membership`, `current_member_id`, `current_role`, `has_access`, `has_any_access`, `is_team_member` (elles ne renvoient que des informations sur l'appelant ; un compte du site obtient `null` / `false`). `session_places_remaining` et `session_registered_count` n'ont pas besoin de ce droit (seules des fonctions `SECURITY DEFINER` les appellent) : elles exposent un nombre de places, sans donnée personnelle — droit à retirer par une migration si l'on veut un advisor propre.

## 12. Reste à faire (hors de ce lot)

- Numérotation des factures attribuée par la base plutôt que par l'interface (supprime le risque de doublon simultané, § 3.4).
- Synchronisation en temps réel entre collègues (Supabase Realtime) — aujourd'hui : bouton *Recharger depuis la base*.
- Exécution automatique des séquences autres que Digital Starter Kit (J-7, J+1, relances de devis / factures) : déclencheurs à ajouter au planificateur (§ 5 ter) — les emails eux-mêmes partent déjà (§ 5 quater).
- Publication réelle sur LinkedIn / Instagram (aujourd'hui : tâche de rappel, § 5 ter) — via n8n ou les API des réseaux (LinkedIn exige une application validée pour publier sur une page entreprise).
- Types TypeScript générés (`supabase gen types typescript --schema crm`) pour supprimer les casts du client service_role.
- Phase 2 : formulaires du site → CRM (§ 5, § 9) ; d'ici là, les candidatures arrivent dans Airtable.
