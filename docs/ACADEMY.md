# StartupWeek Academy — plateforme e-learning

StartupWeek Academy est la partie « formations en ligne » du back-office : on y **crée, publie, vend et suit** des formations e-learning. Les **apprenants** suivent ces formations dans **« Mon espace » du site** (`startupweek-v2`), qui passe par l'API décrite ici.

```
Back-office (ce dépôt)                                      Site startupweek-v2 (Mon espace)
/academy : formations, parcours, apprenants,        ◄───    POST /api/academy/learner   (signé HMAC)
           livrables, cohortes, aperçu apprenant             POST /api/academy/checkout  (signé HMAC)
/api/academy/ai : aide à la rédaction (Claude)
/api/stripe/webhook : achat → facture + accès        ◄───    Stripe Checkout
Supabase schéma crm : academy_* (source de vérité, RLS équipe)
```

## 1. Ce que fait le back-office

Deux espaces dans la section « StartupWeek Academy » du menu :
- **Studio** (`/studio`) : **créer et publier le contenu** — plan, leçons, fiche catalogue, relecture, publication ;
- **Academy** (`/academy`) : **gérer les accès et suivre les apprenants** — formations, parcours, inscriptions, livrables, cohortes, sessions liées, réglages Qualiopi / FOAD.

### 1.1 Studio (`/studio`)

| Écran | Rôle |
| --- | --- |
| **Accueil** | Les formations par étape : brouillon, en relecture, validée, publiée (archivées à part), avec commentaires ouverts et points bloquants. « Nouvelle formation » ouvre directement le Studio. |
| **Édition** | Plan (modules → leçons) à gauche ; la leçon au centre, **telle que l'apprenant la verra**, éditable sur place : on clique dans le texte et on écrit, une barre de mise en forme apparaît sur une sélection (gras, italique, code, lien, titre, sous-titre, listes, encadrés info / astuce / attention, citation) ; un texte Markdown collé est converti. « + » entre deux blocs pour insérer l'un des 7 types. Quiz : on écrit questions et réponses dans la leçon et on clique sur le rond de la bonne réponse. Panneau de droite : réglages du bloc sélectionné (profils qui le voient, lien vidéo et plan de tournage, notation, livrable, ressource, outil du prompt) ou de la leçon (durée, accès libre, **assistant IA**), et commentaires de relecture. « Voir comme » : estompe les blocs réservés à d'autres profils. **Enregistrement automatique** 0,8 s après la dernière frappe (indicateur « Enregistrement… / Enregistré »). |
| **Vue stagiaire** | L'aperçu apprenant (progression simulée, profil, 3 directions artistiques). |
| **Fiche catalogue** | Champs publics (titre, adresse, accroche, niveau, durée, profils, public, prérequis), présentation et objectifs écrits directement dans l'aperçu de la page du site, prix TTC, TVA, durée d'accès, prix Stripe, « Proposée à l'achat sur le site » (formation publiée et payante). Enregistrement automatique. |
| **Relecture** | Circuit **brouillon → relecture → validée → publiée** : envoi en relecture avec un relecteur désigné ; le relecteur commente (sur la formation, une leçon ou un bloc), puis **demande des corrections** (retour en brouillon) ou **valide le contenu** (possible une fois tous les commentaires résolus) ; **publication** possible une fois validée et sans point bloquant. Dépublier / archiver. **Vérifications automatiques** : *bloquant* (leçon vide, quiz sans bonne réponse ou avec moins de deux réponses, question sans énoncé, exercice sans consigne, prompt vide, checklist sans étape, lien vidéo non reconnu, prix manquant pour la vente) ; *à vérifier* (vidéos sans lien — masquées pour les apprenants —, ressource manquante, textes vides, critères de réussite, mentions Qualiopi / FOAD, fiche catalogue incomplète). Chaque point mène à l'endroit à corriger. |

Une formation **publiée** reste modifiable : les modifications sont visibles immédiatement (bandeau d'avertissement dans l'édition).

**Stockage** : le contenu reste en Markdown (sous-ensemble du blog) ; l'éditeur convertit Markdown ↔ HTML éditable (`features/studio/lib/rich-text.ts`). Garantie vérifiée par `npx tsx scripts/check-studio-markdown.ts` et par un test Chromium sur les 268 contenus de la formation type : aucune perte ni modification à l'aller-retour. Le Markdown d'un bloc n'est réécrit que si l'auteur le modifie.

### 1.2 Academy (`/academy`)

| Écran | Rôle |
| --- | --- |
| **Tableau de bord** | Formations publiées, apprenants actifs, temps d'apprentissage, quiz, livrables à corriger, certificats. |
| **Formations** | Catalogue interne (statuts brouillon / en relecture / validée / publiée / archivée). |
| **Fiche formation** | *Accès & vente* (sessions liées, ouverture des accès, résumé du prix et du catalogue), *Qualiopi & équipe* (FOAD : assistance, évaluation, accessibilité, seuils, durée d'accès, progression séquentielle ; auteurs, formateurs référents, mots-clés), *Apprenants* (inscriptions, livrables). Bouton **« Ouvrir dans le Studio »** pour le contenu. |
| **Blocs de leçon** | 7 types : texte, vidéo YouTube, quiz, exercice / livrable, ressource de la bibliothèque, prompt à copier, checklist. Chaque bloc peut être **réservé à un profil** (tech, non-tech, reconversion) : c'est l'hyper-personnalisation. Édition dans le Studio. |
| **Aperçu apprenant** | La leçon telle que la voit l'apprenant, avec la progression séquentielle simulée, le choix du profil et **3 directions artistiques** (sélecteur en bas à droite : Néon, Campus, Atelier). Bouton **Plein écran** (ici et dans l'éditeur) : menu et en-tête masqués, page en pleine largeur ; reste actif entre l'éditeur et l'aperçu d'une même formation, Échap pour quitter. |
| **Parcours** | Enchaînement recommandé de plusieurs formations. |
| **Apprenants** | Toutes les inscriptions (origine, profil, progression, temps, quiz, dernière activité, fin d'accès) ; fiche apprenant avec la progression par module, le relevé de connexions et le certificat. |
| **Livrables** | File de correction des exercices (retour + note sur 20). |
| **Cohortes** | Accès collectif école / entreprise (import d'une liste « Prénom;Nom;email »). |
| **Session → onglet Academy** | Formations liées à la session et progression de ses participants. |
| **Contact / Candidature** | Carte « StartupWeek Academy » (accès et progression). |
| **Document imprimable** | `/print/academy/<inscription>` : certificat de réalisation (formation à distance) et relevé de connexions / activités. |

Droits (section `academy`, Studio compris) : écriture pour admin, pédagogie et formateur (création, relecture, correction des livrables) ; lecture pour commercial et lecture.

### Les 3 directions artistiques
Même contenu, présentation différente. Le choix est mémorisé dans le navigateur et partageable par l'URL (`?da=neon|campus|atelier`). Elles servent à choisir le rendu de « Mon espace » :
- **Néon** : l'énergie StartupWeek (fond sombre, cyan, grille, progression en anneau lumineux) ;
- **Campus** : éditorial (papier chaud, titres serif, colonne de lecture étroite, « chapitres ») ;
- **Atelier** : outil de travail (minimal, dense, accent violet, métadonnées en police mono).

Les couleurs sont des tokens (`--da-*` dans `src/styles/tokens.css`), en clair comme en sombre.

## 2. Qui a accès, et jusqu'à quand

| Origine | Déclencheur | Fin d'accès |
| --- | --- | --- |
| **Session** | Une candidature passe **« Inscrite »** dans une session liée à la formation (*Accès & vente → Sessions liées*). Rattrapage : bouton « Ouvrir les accès ». | 6 mois (183 j, réglable) **après la fin de la session** |
| **Achat en ligne** | Paiement Stripe Checkout confirmé (webhook). | 183 j après le paiement |
| **Cohorte** | « Ouvrir les accès » sur la cohorte. | Date de fin de la cohorte |
| **Manuel** | « Donner un accès » (invité, geste commercial…). | 183 j |

Une inscription est **unique par couple formation × contact** : un nouvel accès prolonge l'existant. Un désistement suspend l'accès obtenu par la session. La formation doit être **publiée** pour être lisible par l'apprenant.

**Progression séquentielle** : la leçon N+1 se débloque quand la leçon N est terminée. Une leçon ne peut être terminée que si ses **quiz évalués** ont été passés et ses **livrables corrigés par un formateur** remis.

**Certificat de réalisation** : progression ≥ seuil (80 % par défaut) et moyenne des quiz évalués ≥ seuil de réussite (70 % par défaut). La durée réalisée est calculée à partir des activités terminées (durée estimée des leçons) ; le relevé de connexions est joint (preuve d'assiduité en formation à distance).

## 3. API pour « Mon espace » (site)

### 3.1 Authentification
Appels **serveur à serveur** uniquement (jamais depuis le navigateur de l'apprenant) :
- corps JSON contenant `ts` (horodatage en millisecondes, tolérance ± 5 min) ;
- en-tête `x-sw-signature: sha256=<HMAC-SHA256(ACADEMY_API_SECRET, corps brut)>` ;
- `email` = email **vérifié** de l'utilisateur connecté au site (Supabase Auth du site). C'est le lien avec le contact du CRM.

Sans `ACADEMY_API_SECRET` (ni `INTAKE_SIGNING_SECRET`) en production, l'API répond 503. En démo (Supabase non configuré), l'API répond sur le jeu de démo sans rien enregistrer (`dryRun: true`).

```ts
// startupweek-v2 : lib/server/academy.ts
import { createHmac } from "node:crypto";

export async function academy<T>(body: Record<string, unknown>): Promise<{ status: number; data: T }> {
  const raw = JSON.stringify({ ts: Date.now(), ...body });
  const signature = "sha256=" + createHmac("sha256", process.env.ACADEMY_API_SECRET!).update(raw).digest("hex");
  const res = await fetch(`${process.env.CRM_URL}/api/academy/learner`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-sw-signature": signature },
    body: raw,
    cache: "no-store",
  });
  return { status: res.status, data: (await res.json()) as T };
}
```

### 3.2 `POST /api/academy/learner`

| `action` | Corps | Réponse |
| --- | --- | --- |
| `catalog` | — | `courses[]` publiées, au catalogue et payantes : présentation (titre, sous-titre, description Markdown, objectifs, prérequis, durée, prix TTC en centimes, accès, assistance, accessibilité) et programme (modules → leçons, `isPreview`). |
| `overview` | `email` | `learner`, `enrollments[]` : `open`, formation, `persona`, `expiresAt`, `progressPercent`, `timeSpentMinutes`, `quizAverage`, `certificateIssuedAt`, `nextLessonId`, `modules[].lessons[]` avec `state` (`terminee` · `en_cours` · `disponible` · `verrouillee`). Une inscription expirée / suspendue est renvoyée avec `open: false`. |
| `lesson` | `email`, `enrollmentId`, `lessonId` | `lesson` (blocs **filtrés par profil**, réponses des quiz et scripts vidéo retirés, vidéos sans lien masquées, blocs « ressource » complétés par `resource: { title, description, format, url }` — non servis si la ressource est introuvable ou interne), `progress`, `assignments` (retours du formateur), `previousLessonId`, `nextLessonId`. Ouvrir une leçon la passe « en cours ». 423 si verrouillée. |
| `track` | `email`, `enrollmentId`, `event` | Voir ci-dessous. |
| `set_persona` | `email`, `enrollmentId`, `persona` (`tech` · `non_tech` · `reconversion`) | Change la variante de contenu servie à l'apprenant (choix proposé dans Mon espace). |
| `preview` | `courseSlug`, `lessonId`, `persona?` | Sans compte : leçon marquée « accès libre » d'une formation publiée au catalogue (même format que `lesson`, sans progression). 404 sinon. |
| `certificate` | `email`, `enrollmentId` | Certificat de réalisation **une fois délivré par l'équipe** (même après la fin de l'accès) : référence, apprenant, formation, dates de début / fin (connexions), durée réalisée (temps estimé des leçons terminées), temps connecté, progression, moyenne des quiz, mentions de l'organisme (raison sociale, SIRET, NDA, adresse). 404 `CERTIFICATE_NOT_ISSUED` sinon. |

Événements `track` :

| `event.type` | Champs | Effet |
| --- | --- | --- |
| `heartbeat` | `seconds` (1-300), `lessonId?`, `device?` | Temps passé : prolonge la connexion en cours (nouvelle connexion après 15 min d'inactivité) et le temps de la leçon. **Envoyer toutes les 60 s tant que l'onglet est visible.** |
| `quiz` | `lessonId`, `blockId`, `answers: { [questionId]: optionId[] }` | Correction côté serveur : `score`, `bestScore`, `passed`, `questions[]` (`correct`, `expected`, `explanation`). Meilleur score conservé. |
| `checklist` | `lessonId`, `blockId`, `itemIds[]` | Items cochés (les ids inconnus sont ignorés). |
| `submit` | `lessonId`, `blockId`, `content`, `url?` | Livrable remis (« à corriger », ou validé d'office si l'exercice est en correction automatique). Re-soumission possible tant qu'il n'est pas validé. |
| `complete_lesson` | `lessonId` | Termine la leçon ; 409 `LESSON_INCOMPLETE` avec `missing[]` si un quiz évalué ou un livrable manque. Renvoie `progressPercent`, `completed`, `nextLessonId`. |

Codes : 400 validation · 401 signature / horodatage · 403 accès fermé / formation indisponible · 404 inscription, leçon ou bloc introuvable · 409 · 423 leçon verrouillée · 429 limite (240 appels / 10 min / apprenant).

**Rendu des blocs** : le Markdown suit le même sous-ensemble que le blog (`src/features/site/lib/markdown.ts`). Vidéos : intégrer `https://www.youtube-nocookie.com/embed/<id>` (vidéos non répertoriées).

### 3.3 `POST /api/academy/checkout`
Corps signé : `{ ts, courseSlug | courseId, email, firstName?, lastName?, persona?, successUrl, cancelUrl }`. Les URL de retour doivent appartenir à `ALLOWED_ORIGINS`. Réponse : `{ ok, url }` → rediriger l'internaute vers `url` (Stripe Checkout). Sans `STRIPE_SECRET_KEY` : `{ ok: true, dryRun: true }`.

L'accès n'est **jamais** ouvert par cette route : c'est le webhook Stripe (`checkout.session.completed`, `metadata.academy_course_id`) qui crée ou retrouve le contact, émet la facture (numéro légal attribué par la base), enregistre le paiement (idempotent sur la référence `pi_…`) et ouvre l'accès. Événement à activer dans Stripe : `checkout.session.completed` (déjà utilisé pour les factures).

## 4. Aide à la rédaction (Claude)
`POST /api/academy/ai`, réservé aux membres de l'équipe ayant l'écriture sur Academy (jeton de session du back-office). Quatre usages : premier jet d'une leçon, quiz à partir du contenu, variante d'un bloc pour un profil, relecture d'un bloc. Le résultat est inséré comme brouillon dans l'éditeur ; rien n'est enregistré sans relecture. Modèle par défaut `claude-opus-5` (`ACADEMY_AI_MODEL`), sortie structurée, relance automatique côté serveur si le modèle décline (`fallbacks: "default"`), limite de 20 générations / 10 min par membre. Variable : `ANTHROPIC_API_KEY`.

## 5. Formation type : « Construire son MVP avec l'IA »
La StartupWeek (format semaine) en e-learning : **10 modules, 65 leçons, 50 h** (3 000 min), environ 47 000 mots de contenu commun plus les variantes par profil, 20 vidéos à tourner (plan de tournage fourni dans chaque bloc, masquées tant qu'il n'y a pas de lien), 10 quiz évalués (un par module, dont l'évaluation finale de 20 questions) et 15 quiz d'auto-vérification, 56 exercices dont 26 livrables corrigés par un formateur, 48 prompts prêts à copier, 30 checklists et 143 blocs de variantes par profil. Fil rouge : **Créno** (réservation de séances pour coachs sportifs). Stack : Supabase, Claude (Claude Code, Claude Cowork), ChatGPT et Codex, Cursor, Bolt.new, Airtable, n8n, Gamma, Vercel, React, Next.js, Git / GitHub, Notion, gestion de projet digital et Scrum.

| Module | Durée |
| --- | --- |
| 0. Bienvenue et positionnement | 1 h 30 |
| 1. Cadrer son problème et son MVP | 5 h |
| 2. Bien prompter | 6 h |
| 3. Choisir sa stack | 4 h |
| 4. Architecturer son app | 6 h |
| 5. Parcours utilisateur et maquettes | 4 h |
| 6. Construire avec l'IA | 11 h |
| 7. Tester avec de vrais utilisateurs | 4 h |
| 8. Lancer | 5 h |
| 9. Pitch, roadmap et évaluation finale | 3 h 30 |

Sources : `src/lib/data/academy/mvp-ia/m00.ts` → `m09.ts` (format `SeedModule`, `src/lib/data/academy/authoring.ts`). Insertion en base : `npx tsx scripts/academy-sql.ts > supabase/data/academy_mvp_ia.sql`, puis exécuter le fichier (idempotent, n'écrase jamais une formation déjà présente ; statut « relecture » ; liée à toutes les sessions StartupWeek ; blocs « ressource » sans ressource en base retirés).

## 6. Mise en service

1. Migrations `supabase/migrations/*_crm_academy.sql` (tables `crm.academy_*`, RLS, section `academy`) et `*_crm_academy_studio.sql` (statut « validée », relecteur, commentaires de relecture `crm.academy_comments`).
2. Formation type : `supabase/data/academy_mvp_ia.sql`.
3. Variables Vercel : `ACADEMY_API_SECRET` (aussi côté site), `SUPABASE_SECRET_KEY` (routes API), `ANTHROPIC_API_KEY` (aide IA), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (vente), `ALLOWED_ORIGINS`.
4. Dans le Studio : relire la formation (onglet Relecture), renseigner le prix (Fiche catalogue), valider, publier, puis cocher « Proposée à l'achat sur le site » pour la vendre.
5. Site : pages Mon espace (sommaire, lecteur de leçon, quiz, livrables, heartbeat) et catalogue (§ 3).

## 7. Limites connues
- **Mon espace n'est pas encore construit** côté site : l'API est prête et testée, les pages restent à faire dans `startupweek-v2`.
- **Vidéos** : aucune n'est tournée ; les blocs vidéo contiennent le plan de tournage et restent masqués pour les apprenants tant qu'il n'y a pas de lien YouTube.
- **Emails** (accès ouvert, livrable corrigé) : journalisés, pas envoyés (comme le reste de l'interface, cf. SUPABASE.md § 3.4).
- **Prix** de la formation e-learning : à définir (non vendue tant qu'il est vide).
- Contenu rédigé avec l'aide de l'IA : **à relire** avant publication (exactitude des outils cités, ton, cohérence avec vos pratiques). Les engagements de service (délais d'assistance, seuils du certificat) sont des valeurs par défaut à valider.
- Le certificat de réalisation « formation à distance » reprend le modèle ministériel ; la méthode de calcul de la durée réalisée est à valider avec votre certificateur Qualiopi.
