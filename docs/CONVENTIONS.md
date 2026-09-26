# Conventions — StartupWeek OS

Back-office Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind v4 · zustand 5 (persist) · lucide-react · date-fns (fr).
Même philosophie que `buildclub` : `features/<domaine>/`, primitives UI neutres, tokens uniquement.

## Architecture
```
src/
  app/(crm)/<section>/page.tsx      Server Component minimal : metadata + rend le composant client de la feature, enveloppé dans <Guard section="…">
  app/print/<doc>/[id]/page.tsx     Documents imprimables (facture, convention, attestation, émargement…)
  app/api/…                         Route handlers (intake formulaires, Stripe, Qonto, health)
  components/ui/                    Primitives (Button, Badge, Card, DataTable, Kanban, Modal, Drawer, Tabs, StatCard…)
  components/charts/                Graphiques SVG maison (LineChart, ColumnChart, BarList, DonutChart, Funnel, Sparkline, CalendarHeatmap)
  components/shared/                Liens d'entités (ContactLink, SessionLink…), ActivityTimeline, StatusSelect
  components/layout/                AppShell (sidebar, topbar, ⌘K, alertes), guards, nav
  features/<domaine>/               Composants + logique d'un module (ex : features/billing/…)
  lib/domain/types.ts               CONTRAT de données (source de vérité, traduit 1-pour-1 en SQL)
  lib/domain/constants.ts           Libellés + tonalités des statuts (options pour selects/badges)
  lib/domain/selectors.ts           Dérivations pures partagées (stats session, soldes, SLA, score Qualiopi…)
  lib/domain/actions.ts             Actions métier transverses (= automatisations) : factures acompte/solde, paiements, emails, tâches, statuts candidature, convocations, réclamations
  lib/store/                        Store zustand persistant (CRUD générique + journal d'activité)
  lib/hooks.ts                      useCollection, useLookup, useEntity, useNow, useSession, useActions
  lib/format.ts                     money(), date(), dateRange(), relative(), totals()…
```

## Règles
1. **Tokens uniquement** : aucune couleur en dur (`bg-surface`, `text-muted-foreground`, `border-border`, `bg-accent-soft`, `text-accent-text`, `bg-primary`, `text-success-text`, `bg-danger-soft`…). Graphiques : `var(--series-N)` via `seriesColor(i)`. Clair ET sombre doivent fonctionner.
2. **zustand v5** : un sélecteur ne crée jamais d'objet/tableau (`useCrm(s => s.contacts)` ✅, `useCrm(s => s.contacts.filter(...))` ❌ boucle infinie). Dériver avec `useMemo`. Utiliser `useCollection` / `useLookup`.
3. **Rendu pur** : jamais `Date.now()` / `new Date()` dans le rendu — utiliser `const now = useNow()` (horloge du store). Les handlers d'événements peuvent utiliser `Date.now()`.
4. **Hydratation** : les pages sont rendues sous `RequireSession` (store hydraté garanti). Pas besoin de skeleton supplémentaire.
5. **Mutations** : `const { create, update, remove } = useActions()` ; `update("contacts", id, patch, { log: "Résumé lisible", kind: "statut" })` alimente la timeline. Pour les enchaînements métier, utiliser/étendre `lib/domain/actions.ts`.
6. **Droits** : envelopper chaque page dans `<Guard section="…">` ; masquer/désactiver les actions d'écriture si `!canEdit(section)` (`useSession()`).
7. **Next 16** : `params` / `searchParams` sont des Promises (`const { id } = await params`). `useSearchParams()` côté client doit être sous `<Suspense>`.
8. **Formulaires** : `FormField` + `Input`/`Select`/`Textarea` ; validation zod pour les formulaires significatifs ; toasts de confirmation (`useToast()`).
9. **Montants en centimes** (`money(cents)`), dates ISO (`date(iso)`, `relative(iso, now)`).
10. **Accessibilité** : libellés explicites (`aria-label`), statut jamais porté par la seule couleur (Badge = point + libellé), focus visible, cibles ≥ 32px.
11. **Mobile** : layouts en grille responsive (`sm:`/`lg:`), tables scrollables horizontalement, pas de débordement de page.
12. Textes en **français**, ton direct et concret (vouvoiement côté client).
