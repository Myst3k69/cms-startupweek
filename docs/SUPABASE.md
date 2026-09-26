# StartupWeek OS — mise en service Supabase

Ce document décrit comment passer le back-office du mode démo (données dans le navigateur) à Supabase, brancher le site, Stripe et Qonto, migrer les données Airtable et arrêter les workflows n8n. Il est volontairement opérationnel : chaque étape est vérifiable et réversible.

> **État au 26/09/2026 (lire avant toute mise en production)**
>
> **Bascule effectuée le 26/09/2026** : le back-office de production (https://cms-startupweek.vercel.app) tourne en mode `supabase`. Première connexion réelle par lien magique réussie (email reçu, retour sur `/auth/callback`, compte rattaché à son membre `crm.team_members`). Administrateurs créés : Aurélien Chiren (rattaché) et Caroline Borja (rattachée automatiquement à sa première connexion). Le schéma `crm` ne contient pas encore de données métier : **import Airtable à faire (§ 8)**.
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

- **Emails déclenchés depuis l'interface** (acceptation, refus, relances, convocations…) : enregistrés dans `crm.email_messages` et le journal, **mais pas envoyés** — aucun envoi réel n'est branché côté interface (seuls les accusés de réception de `/api/intake` passent par Resend). À brancher avant de s'y fier. Par ailleurs `crm.email_templates` est **vide** en base (les modèles n'existent que dans le jeu de démo) : à créer dans *Emails → Modèles* ou à importer.
- **Numéros de facture** : l'interface calcule le prochain numéro à partir des factures chargées et la base l'accepte en réalignant son compteur. Deux personnes émettant une facture au même instant obtiendraient le même numéro : la seconde est refusée par la base (doublon, index unique) et annulée à l'écran — à réémettre. Une facture émise ne peut plus changer de numéro ni être supprimée (émettre un avoir).
- `invoices.paid_cents` / `status` et `applications.amount_paid_cents` sont recalculés par trigger à chaque paiement.
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
RESEND_API_KEY=re_…            # accusés de réception (sinon : pas d'email, la tâche SLA est créée quand même)
EMAIL_FROM=StartupWeek <contact@startupweek.tech>
```

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

## 9. Ordre de décommissionnement des workflows n8n

Ne rien supprimer : **désactiver** (bouton *Active*) et garder 30 jours pour le retour arrière.

1. **Phase 0 — migrations** (§ 2) : ✅ faite le 26/09/2026 ; aucun impact sur le site tant que `crm.sessions` / `crm.resources` / `crm.applications` sont vides.
2. **Phase 1 — sessions & ressources** (le CRM devient la source de vérité du site) :
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

- Envoi réel des emails déclenchés depuis l'interface (§ 3.4) et modèles d'emails en base (`crm.email_templates` vide).
- Numérotation des factures attribuée par la base plutôt que par l'interface (supprime le risque de doublon simultané, § 3.4).
- Synchronisation en temps réel entre collègues (Supabase Realtime) — aujourd'hui : bouton *Recharger depuis la base*.
- Envoi des emails programmés (`crm.email_messages` au statut `programme`, ex. séquence Digital Starter Kit) : un cron d'envoi reste à écrire ; seuls les accusés de réception sont envoyés immédiatement.
- Types TypeScript générés (`supabase gen types typescript --schema crm`) pour supprimer les casts du client service_role.
- Script d'import Airtable (§ 8).
