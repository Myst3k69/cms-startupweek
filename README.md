# StartupWeek OS — CRM & back-office 100 % custom

Le back-office de **StartupWeek** (bootcamp MVP 7 jours) : CRM, demandes entrantes, pipeline, relances, candidatures, sessions & émargement, projets des candidats, intervenants, **Qualiopi**, **facturation (acompte / solde, Stripe, Qonto)**, ressources, contenus du site, analytics et automatisations — pour remplacer Airtable + les workflows n8n.

➡️ Pourquoi et comment : **[docs/PROPOSITION.md](docs/PROPOSITION.md)** (analyse de l'existant, bénéfices, limites, plan de mise en production).

## Démarrer

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Aucune variable d'environnement n'est requise : l'application démarre en **mode démo** (données fictives réalistes générées localement et persistées dans le navigateur — réinitialisables dans *Paramètres → Données*).

Sur `/connexion`, choisissez un profil pour voir les droits changer :

| Profil | Rôle | Accès |
|---|---|---|
| Aurélien Chiren | Admin | Tout |
| Commerciale | `commercial` | Demandes, contacts, pipeline, relances, candidatures, facturation |
| Responsable pédagogique & qualité | `pedagogie` | Sessions, Qualiopi, candidatures, projets, contenus |
| Formateur / mentor | `formateur` | Ses sessions (émargement, évaluations), projets |
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
  features/<domaine>/    home, crm, programmes, qualiopi, documents, billing, site, analytics, system
  lib/domain/            types (contrat de données), constantes, sélecteurs, actions métier, alertes
  lib/store/             store zustand (CRUD générique + journal d'activité)
  lib/data/              seed de démo, référentiel Qualiopi, synchro Supabase
  lib/server/            sécurité (HMAC, rate-limit, signature Stripe), intake, client admin
supabase/migrations/     schéma `crm`, RLS par rôle, fonctions & triggers, référentiel Qualiopi
docs/                    PROPOSITION, CONVENTIONS, SUPABASE
```

- **Données** : `src/lib/domain/types.ts` est le contrat unique, traduit 1-pour-1 en SQL (camelCase ↔ snake_case).
- **Mode production** : `NEXT_PUBLIC_CRM_DATA_MODE=supabase` → chaque mutation est répercutée dans le schéma `crm` (RLS avec la session utilisateur). Voir **[docs/SUPABASE.md](docs/SUPABASE.md)** — les migrations n'ont **pas** été appliquées sur le projet Supabase de production.
- **Conventions de code** : **[docs/CONVENTIONS.md](docs/CONVENTIONS.md)**.

## Statut

| Élément | État |
|---|---|
| Interface complète (18 sections + documents) | ✅ fonctionnelle en mode démo |
| Automatisations (acompte à l'acceptation, solde, emails, tâches, convocations, accusés de réclamation) | ✅ exécutées côté client en démo |
| Schéma SQL, RLS, triggers, vues | ✍️ écrits, à appliquer sur une branche Supabase |
| Endpoints `/api/intake`, Stripe, Qonto | ✍️ écrits (mode *dry-run* sans variables d'environnement), à tester en préproduction |
| Envoi réel des emails (Resend) | ⏳ à brancher côté serveur |
| Documents légaux (convention, CGV, attestation) | ⚠️ modèles à faire valider juridiquement |
