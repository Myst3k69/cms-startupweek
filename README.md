# StartupWeek OS — CRM & back-office 100 % custom

Le back-office de **StartupWeek** (bootcamp MVP 7 jours) : CRM, demandes entrantes, pipeline, relances, candidatures, sessions & émargement, projets des candidats, intervenants, **Qualiopi**, **facturation (acompte / solde, Stripe, Qonto)**, ressources, contenus du site, **StartupWeek Academy (e-learning)**, **marketing (campagnes Meta / LinkedIn, A/B tests, promotion des sessions)**, analytics et automatisations — pour remplacer Airtable + les workflows n8n.

➡️ Pourquoi et comment : **[docs/PROPOSITION.md](docs/PROPOSITION.md)** (analyse de l'existant, bénéfices, limites, plan de mise en production).
➡️ E-learning : **[docs/ACADEMY.md](docs/ACADEMY.md)** (création des formations, accès des candidats, API pour « Mon espace » du site, vente Stripe, formation type de 50 h).

## Démarrer

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Aucune variable d'environnement n'est requise : l'application démarre en **mode démo** (données fictives réalistes générées localement et persistées dans le navigateur — réinitialisables dans *Paramètres → Données*). En mode `supabase` (`NEXT_PUBLIC_CRM_DATA_MODE=supabase`), `/connexion` demande l'email et envoie un **lien magique** ; voir [docs/SUPABASE.md](docs/SUPABASE.md).

Sur `/connexion`, choisissez un profil pour voir les droits changer :

| Profil | Rôle | Accès |
|---|---|---|
| Aurélien Chiren | Admin | Tout |
| Commerciale | `commercial` | Demandes, contacts, pipeline, relances, candidatures, facturation, marketing |
| Responsable pédagogique & qualité | `pedagogie` | Sessions, Qualiopi, candidatures, projets, contenus |
| Formateur / mentor | `formateur` | Sessions (émargement, évaluations), projets ; lecture des contacts et candidatures |
| Expert-comptable | `lecture` | Consultation |

Le profil peut être changé à tout moment depuis le menu utilisateur (bas de la barre latérale).

## Les 3 designs du tableau de bord

Comme pour buildclub, la page d'accueil existe en **trois designs** activables par le **switch 3 positions** en bas à droite :

| Design | Intention |
|---|---|
| **Cockpit** (défaut) | « Mission control » dense : bandeau sombre néon StartupWeek, KPI + sparklines, encaissements, alertes, sessions, entonnoir |
| **Focus** | La journée priorisée : une seule liste d'actions (terminer, accuser réception, relancer en 1 clic) + agenda 7 jours |
| **Studio** | Brief éditorial de la semaine : grands titres serif, récit généré depuis les données, grille bento (affiche de session, projet à la une, verbatim, saison, Qualiopi) |

Priorité : paramètre `?home=cockpit|focus|studio` (partageable) → choix mémorisé (localStorage) → `cockpit`. Code : `src/features/home/`.

## Marketing (`/marketing`)

| Onglet | Contenu |
|---|---|
| **Vue d'ensemble** | Dépense, clics, leads déclarés par les régies **et** leads / inscriptions / CA réellement attribués dans le CRM (utm_campaign, dernier clic), coût par inscription, ROAS, comparaison Meta / LinkedIn, points d'attention calculés (campagne active sur une session close, budget consommé, coût par lead anormal, attribution cassée, test à conclure) |
| **Campagnes** | Liste filtrable ; fiche avec publicités, courbes quotidiennes, leads attribués, paramètres d'URL à coller dans la régie |
| **A/B tests** | Créas publicitaires (chiffres de la régie), pages du site (`/api/experiments`), objets / contenus d'emails ; test z contre le contrôle, taille d'échantillon calculée à l'avance, correction multi-variantes, contrôle SRM, conclusion tracée |
| **Promotion des sessions** | Sessions publiques des 120 prochains jours : remplissage face à un repère, campagnes et contenus actifs, action conseillée |
| **Audiences** | Segments (candidats non inscrits, alumni, Digital Starter Kit, newsletter, exclusion des inscrits) exportés pour Meta / LinkedIn — consentement marketing obligatoire, hachage SHA-256, export journalisé |
| **Liens UTM** | Générateur et convention de nommage ; utm_campaign reçues sans campagne correspondante |

Synchro API Meta Ads / LinkedIn Ads : `/api/ads/sync`, cron quotidien dans `vercel.json` — configuration dans [docs/SUPABASE.md § 5 septies](docs/SUPABASE.md). ROAS : CA HT facturé dans le CRM, ou estimé au prix de l'offre / de la session pour un inscrit facturé dans un autre outil (affiché « ≈ »).

## Scripts

| Commande | Rôle |
|---|---|
| `pnpm dev` | Serveur de développement (Turbopack) |
| `pnpm build` / `pnpm start` | Build et serveur de production |
| `pnpm lint` | ESLint (flat config Next 16) |
| `pnpm typecheck` | `tsc --noEmit` |

## Architecture

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 (tokens) · zustand 5 (persist) · lucide-react · date-fns · zod · Supabase (mode production). Graphiques SVG maison (aucune dépendance), conformes aux règles dataviz (palette validée daltonisme, clair/sombre).

```
src/
  app/(crm)/…            une route par section (Server Component minimal + <Guard section>)
  app/print/…            documents imprimables A4 (facture, devis, convention, convocation, attestation, émargement, programme)
  app/api/…              intake des formulaires du site, webhook Stripe, synchro Qonto, health
  components/            ui (primitives), charts, layout (AppShell, ⌘K, alertes), shared
  features/<domaine>/    home, crm, programmes, qualiopi, documents, billing, site, academy, marketing, analytics, system
  lib/domain/            types (contrat de données), constantes, sélecteurs, actions métier, alertes
  lib/store/             store zustand (CRUD générique + journal d'activité)
  lib/data/              seed de démo, référentiel Qualiopi, synchro Supabase
  lib/server/            sécurité (HMAC, rate-limit, signature Stripe), intake, client admin
supabase/migrations/     schéma `crm`, RLS par rôle, fonctions & triggers, référentiel Qualiopi
docs/                    PROPOSITION, CONVENTIONS, SUPABASE
```

- **Données** : `src/lib/domain/types.ts` est le contrat unique, traduit 1-pour-1 en SQL (camelCase ↔ snake_case).
- **Mode production** : `NEXT_PUBLIC_CRM_DATA_MODE=supabase` → chaque mutation est répercutée dans le schéma `crm` (RLS avec la session utilisateur). Voir **[docs/SUPABASE.md](docs/SUPABASE.md)** — **la production (https://cms-startupweek.vercel.app) tourne en mode `supabase` depuis le 26/09/2026** : connexion par lien magique, données lues et écrites dans le schéma `crm` ; sessions gérées dans le CRM depuis le 26/09/2026 (import Airtable effectué — la base ne contenait que 13 sessions et 2 ressources réelles).
- **Conventions de code** : **[docs/CONVENTIONS.md](docs/CONVENTIONS.md)**.

## Statut

| Élément | État |
|---|---|
| Interface complète (20 sections, 42 pages back-office, 7 documents imprimables, 11 routes API) | ✅ fonctionnelle en mode démo |
| Automatisations (acompte à l'acceptation, inscription au paiement, solde, emails, tâches, convocations, accusés de réclamation, garde de capacité) | ✅ exécutées côté client en démo — chaîne complète vérifiée dans le navigateur |
| Qualité | ✅ `pnpm typecheck`, `pnpm lint`, `pnpm build` sans erreur ; 53 écrans vérifiés en clair / sombre / mobile 390 px (aucune erreur console, aucun débordement) |
| Marketing (campagnes, A/B tests, audiences, promotion des sessions) | ✅ interface et données de démo ; migration `20260927105800` **écrite et testée en local, non appliquée** ; synchro Meta / LinkedIn écrite d'après la documentation officielle, **non testée avec de vrais comptes** |
| Schéma SQL, RLS, triggers, vues | ✅ appliqués sur le projet Supabase « startupweek » le 26/09/2026 et vérifiés sur la vraie base (empreintes identiques au test local, tables du site inchangées, scénario facture / paiement / synchro `public.event` / droits exécuté puis annulé) — schéma `crm` vide |
| Connexion de l'équipe (mode `supabase`) | ✅ lien magique Supabase Auth (PKCE), chargement des données depuis la base, écritures ordonnées avec annulation si la base refuse — testé de bout en bout en local (PostgREST + faux service Auth + Chromium) ; migration `20260926122058` (rattachement automatique des membres, journal sans doublon) **appliquée en production le 26/09/2026** |
| Bascule effective sur Supabase | ✅ le 26/09/2026 : schéma `crm` exposé, URL de redirection, variables Vercel, deux administrateurs ; première connexion réelle réussie — voir [docs/SUPABASE.md § 3-4](docs/SUPABASE.md). Emails déclenchés depuis l'interface pas encore réellement envoyés |
| Import des données Airtable | ✅ 26/09/2026 : 13 sessions et 2 ressources (le reste n'était que des tests) ; synchro n8n des sessions coupée, le CRM publie le site — [docs/SUPABASE.md § 8](docs/SUPABASE.md). Formulaires du site encore vers Airtable (phase 2) |
| Analytics du site (trafic + statistiques par article) | ✅ 26/09/2026 : mesure sans cookie écrite par le site dans `crm.traffic_days` / `crm.content_stats_days` (migration `20260926220247` appliquée en production) — [docs/SUPABASE.md § 5 quinquies](docs/SUPABASE.md). Les chiffres arrivent dès le déploiement du site (`/api/event`) ; posts LinkedIn / Instagram / newsletter : saisie manuelle |
| Endpoints `/api/intake`, Stripe, Qonto | ✍️ écrits et testés en local (*dry-run* sans variables d'environnement) — à tester en préproduction avec les vraies API |
| Envoi réel des emails (Resend) | ⏳ prévu côté serveur (intake) ; les emails déclenchés depuis l'interface sont journalisés en démo |
| StartupWeek Academy (e-learning) | ✅ 26/09/2026 : back-office complet (formations, parcours, éditeur de leçons à 7 types de blocs et variantes par profil, aperçu apprenant en 3 directions artistiques, apprenants, livrables, cohortes, certificat FOAD), accès automatique des inscrits, API apprenant et vente Stripe testées de bout en bout en local (PostgreSQL + PostgREST) ; migration `20260926220123_crm_academy` **appliquée en production** ; formation type « Construire son MVP avec l'IA » (50 h). « Mon espace » du site reste à construire — [docs/ACADEMY.md](docs/ACADEMY.md) |
| Documents légaux (convention, CGV, attestation) | ⚠️ modèles à faire valider juridiquement (voir le point L.6353-6 dans la proposition) |
