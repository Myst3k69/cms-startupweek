# StartupWeek OS — mise en service Supabase

Ce document décrit comment passer le back-office du mode démo (données dans le navigateur) à Supabase, brancher le site, Stripe et Qonto, migrer les données Airtable et arrêter les workflows n8n. Il est volontairement opérationnel : chaque étape est vérifiable et réversible.

> **Statut des tests (lire avant toute mise en production)**
>
> Validé **localement uniquement**, sur une base jetable :
> - les 4 migrations appliquées sur PostgreSQL 16, avec émulation Supabase (rôles `anon` / `authenticated` / `service_role` BYPASSRLS, `auth.users`, `auth.uid()`) et **répliques** de `public.event`, `public.template`, `public.administrative_resource`, `public.administrative_resource_event` (colonnes et enums relevés via le MCP Supabase en lecture le 26/09/2026, projet `qrgvwunbswwdjjxoeuun`) ;
> - scénarios SQL : RLS par rôle (formateur, commercial, lecture, admin, utilisateur Auth non rattaché, anon), numérotation F/D/REC sans trou, immuabilité et non-suppression des factures émises, paiements → statut facture, places restantes et bascule `inscriptions_ouvertes ↔ complet`, synchro vers `public.event` / `template` / `administrative_resource(_event)`, vues d'analytics ;
> - matrice `crm.section_access()` comparée à `PERMISSIONS` (`src/lib/auth/permissions.ts`) : **90/90 combinaisons identiques** ;
> - les 4 routes (`/api/intake/[form]`, `/api/stripe/webhook`, `/api/qonto/sync`, `/api/health`) exécutées de bout en bout avec supabase-js contre **PostgREST 12.2.3** local ; les API Stripe, Qonto et Resend étaient **simulées**.
>
> **Non testé** : la vraie base Supabase (PostgreSQL 17, propriétaire réel des tables `public.*`, schéma des enums, clés `sb_secret_…`, exposition du schéma `crm`), les vraies API Qonto / Stripe / Resend, le runtime Next.js (`next dev` / `next build` : les handlers ont été appelés directement dans Node), l'import Airtable (aucun script fourni). Voir « Points à vérifier sur la vraie base » plus bas.

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
| `supabase/migrations/20260926000001_crm_schema.sql` | Schéma `crm` (1 table par collection de `src/lib/data/sync.ts` + `activities`, `settings`, `traffic_days`), CHECK, FK, index, `updated_at`, audit |
| `supabase/migrations/20260926000002_crm_rls.sql` | `team_members.auth_user_id`, `crm.current_role()`, `crm.has_access(section, level)`, RLS + policies |
| `supabase/migrations/20260926000003_crm_functions.sql` | Numérotation légale, paiements, places restantes, synchro CRM → site, vues |
| `supabase/migrations/20260926000004_qualiopi_referentiel.sql` | 32 indicateurs Qualiopi |
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

### 2.1 Toujours sur une branche d'abord

1. Sauvegarde : Dashboard → Database → Backups (vérifier qu'un backup récent existe) ou `supabase db dump --linked -f backup-avant-crm.sql`.
2. Créer une branche : Dashboard → Branches → *Create branch* (ou CLI `supabase branches create crm-test`).
3. **Attention** : une branche est construite en rejouant l'historique des migrations. Or `public.event`, `public.template`, etc. ont été créées **hors migrations** (l'historique distant ne contient que `20260925012830 event_code_format_sw`, `20260925015205 event_places_remaining`, `20260925111004 event_site_display_fields`). Sur une branche vierge ces tables peuvent donc manquer. Les migrations CRM s'appliquent quand même (toutes les références à `public.*` sont gardées par `to_regclass()`), mais pour **tester la synchro vers le site** il faut d'abord recopier le schéma public :
   ```bash
   supabase db dump --linked --schema public -f public_schema.sql   # depuis la prod (lecture)
   psql "$BRANCH_DB_URL" -f public_schema.sql                        # sur la branche
   ```

### 2.2 Avec la CLI

```bash
supabase link --project-ref qrgvwunbswwdjjxoeuun
# L'historique distant contient 3 migrations absentes de ce repo : les récupérer d'abord,
# sinon `db push` refuse (« Remote migration versions not found in local migrations directory »).
supabase migration fetch            # télécharge les migrations de l'historique distant dans supabase/migrations
supabase db push --dry-run          # doit lister uniquement les 4 fichiers 20260926…
supabase db push
```

(Si `migration fetch` n'est pas disponible dans votre version de la CLI : copier les 3 migrations distantes à la main ou utiliser `supabase migration repair`.)

### 2.3 Avec le SQL Editor

Coller et exécuter **dans l'ordre** les 4 fichiers `20260926000001` → `20260926000004`. Chaque fichier est autonome ; la migration 4 est ré-exécutable (upsert des libellés, sans toucher aux statuts saisis).

### 2.4 Exposer le schéma `crm` à l'API

Dashboard → Project Settings → **Data API** → *Exposed schemas* : ajouter `crm`. Sans cela, supabase-js reçoit `PGRST106 The schema must be one of the following…`.

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

Variables (voir `.env.example`) :

```
NEXT_PUBLIC_CRM_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://qrgvwunbswwdjjxoeuun.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
SUPABASE_SECRET_KEY=sb_secret_…          # serveur uniquement (routes /api/*)
```

⚠️ **Pré-requis côté interface (hors périmètre de ce lot)** : en mode `supabase`, `src/lib/data/sync.ts` utilise la clé publiable ; toutes les lectures/écritures passent par la RLS et **ne renvoient rien sans session Supabase Auth**. La connexion de démo (`login(userId)` du store) ne suffit pas : l'écran de connexion doit ouvrir une vraie session (`supabase.auth.signInWithOtp` / `signInWithPassword`) avant `loadAll()`.

Autres points à connaître :
- **Numéros de facture** : en mode Supabase, laisser `number` vide sur les brouillons ; la base attribue `F-AAAA-NNNN` au passage du statut `brouillon` → autre chose, dans la même transaction (sans trou). Un numéro fourni explicitement est accepté et le compteur est réaligné (`crm.sync_document_counter`). Une facture émise ne peut plus changer de numéro ni être supprimée (émettre un avoir).
- `invoices.paid_cents` / `status` et `applications.amount_paid_cents` sont recalculés par trigger à chaque paiement : l'interface peut les lire, inutile de les écrire.
- Les sessions passent seules de `inscriptions_ouvertes` à `complet` (et inversement) quand les candidatures `inscrite` ou la capacité changent, comme l'ancien schedule n8n. Une session sans place libre ne peut pas être (ré)ouverte. Pour **fermer manuellement** les inscriptions alors qu'il reste des places, avancer la date limite (`registration_deadline`) : aucune réouverture automatique n'a lieu après cette date.

---

## 4. Créer les comptes de l'équipe

Le projet Supabase héberge aussi les comptes des participants du site : le rôle `authenticated` inclut donc des personnes extérieures. La RLS ne donne accès au schéma `crm` **qu'aux utilisateurs présents et actifs dans `crm.team_members`** (vérifié : un compte Auth non rattaché voit 0 ligne).

1. Dashboard → Authentication → Users → *Invite user* (email de la personne).
2. Rattacher le compte à un membre et un rôle (`admin`, `commercial`, `pedagogie`, `formateur`, `lecture`) :
   ```sql
   insert into crm.team_members (name, email, role, title, auth_user_id)
   select 'Prénom Nom', u.email, 'admin', 'Fondateur', u.id
   from auth.users u where u.email = 'prenom@startupweek.tech';
   ```
3. Désactiver un accès : `update crm.team_members set active = false where email = '…';` (effet immédiat).
4. Renseigner les référents dans `crm.settings` (`quality_lead_id`, `disability_lead_id`, `siret`, `nda`, `iban`, `address`).

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
CRM_INTAKE_URL=https://<domaine-du-crm>/api/intake
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

1. Dashboard Stripe → Developers → Webhooks → *Add endpoint* : `https://<domaine-du-crm>/api/stripe/webhook`.
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
5. Test manuel : `curl -X POST -H "Authorization: Bearer $CRON_SECRET" "https://<crm>/api/qonto/sync?days=30"`.

Rapprochement automatique volontairement prudent : transaction créditrice dont le libellé/la référence contient **un seul** numéro `F-AAAA-NNNN` (préfixe = `settings.invoice_prefix`), facture émise non soldée, montant **exactement** égal au solde (ou au total TTC si rien n'est encore payé). Tout le reste reste « à rapprocher » dans l'interface. Les transactions déjà importées ne sont jamais réécrites (un rapprochement manuel n'est pas écrasé).

---

## 8. Migration des données Airtable

Base : « CRM Startup Week » (`appN2nYYPT0tCvLoU`). Aucun script d'import n'est livré ; recommandation : export via l'API Airtable → transformation (script Node ponctuel) → insertion avec le client service_role, **table par table dans l'ordre ci-dessous**, en renseignant `airtable_record_id` (colonne unique prévue sur les tables importées) pour pouvoir rejouer l'import sans doublon (`upsert … on conflict (airtable_record_id)`).

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

1. **Phase 0 — migrations** (§ 2) : aucun impact sur le site tant que `crm` est vide.
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
| Tout le CRM | `drop schema crm cascade;` — supprime tables, fonctions et triggers du CRM ; **aucune table `public.*` n'est modifiée structurellement** (seules leurs lignes ont pu être mises à jour par la synchro). Puis `supabase migration repair --status reverted 20260926000001 20260926000002 20260926000003 20260926000004`. |
| Données | Restauration du backup / PITR pris avant la migration (§ 2.1). |

---

## 11. Points à vérifier sur la vraie base

1. **Propriétaire / RLS des tables du site** : les fonctions de synchro sont `SECURITY DEFINER` (propriétaire = rôle qui applique la migration, normalement `postgres`). Elles écrivent `public.event` & co en contournant la RLS **si** ce rôle en est propriétaire (ou a `BYPASSRLS`) et si `relforcerowsecurity = false` (requête § 2.5). Sinon, l'échec est journalisé dans `crm.activities` (kind `systeme`) sans bloquer le CRM.
2. **Enums** : les casts utilisent `public.event_format`, `public.event_type`, `public.event_status`, `public.template_format`, `public.template_category`, `public.subscription_tier`, `public.administrative_document_*` (schéma supposé `public`, requête § 2.5).
3. **Contrainte `event_code ~ '^SW-[0-9]{4}$'`** (NOT VALID) : les sessions dont le code ne respecte pas ce format ne sont pas publiées (trace `systeme`).
4. **Correspondances de valeurs vers le site** (limitations des enums du site) : `format` `journee` / `mois` → `semaine` ; `mode` `hybride` → `presentiel` ; statut `brouillon` / `prevu` ou `published_on_site = false` → `brouillon` ; `inscriptions_ouvertes` / `complet` / `en_cours` → `publie`. Ressources : catégories business_plan / pitch_deck / maquette / financier / digital → `public.template` ; les autres → `public.administrative_resource` (n8n n'envoyait que `digital` vers `template`) ; `juridique` → catégorie `contrat`.
5. **Clés `sb_secret_…`** avec supabase-js (testé uniquement avec un JWT service_role local).
6. **Qonto v2** : champs `id`, `amount_cents`, `side`, `settled_at`, `reference`, pagination `meta.next_page` et filtre `status[]=completed` (d'après la documentation ; non appelés réellement).
7. **Rate-limit** en mémoire : par instance serverless (suffisant contre le spam ; pas une limite globale).
8. Jours fériés non gérés dans le calcul « 48 h ouvrées » des réclamations (samedi/dimanche seulement).

## 12. Reste à faire (hors de ce lot)

- Écran de connexion Supabase Auth dans le back-office (§ 3).
- Envoi des emails programmés (`crm.email_messages` au statut `programme`, ex. séquence Digital Starter Kit) : un cron d'envoi reste à écrire ; seuls les accusés de réception sont envoyés immédiatement.
- Types TypeScript générés (`supabase gen types typescript --schema crm`) pour supprimer les casts du client service_role.
- Script d'import Airtable (§ 8).
