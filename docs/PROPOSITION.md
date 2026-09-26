# Proposition — un back-office 100 % custom pour StartupWeek

> Analyse réalisée le 26/09/2026 à partir de : le site `startupweek-v2` (Next.js 16 + Supabase), les 14 workflows n8n du dossier StartupWeek (instance `srv1055276`), la base Airtable « CRM Startup Week » (`appN2nYYPT0tCvLoU`) et le projet Supabase `startupweek`. Lecture seule : rien n'a été modifié sur ces systèmes.

## 1. Constat : l'existant en une image

```
Site startupweek.tech ──POST──► 8 webhooks n8n publics (sans signature, CORS *)
   │                              └─► Airtable : Form Submissions → Contacts (upsert email exact) → table métier
   │                              └─► SMTP : accusé de réception (+ CC fondateur)
   │
Airtable (sessions, ressources) ──polling toutes les minutes──► n8n ──► Supabase `event`, `administrative_resource`…
                                                                    └─► le site lit Supabase
Erreurs n8n ──► email
```

Airtable est la vraie source de vérité (CRM compris), Supabase n'est qu'une copie de lecture pour le site, et n8n fait la colle.

### Ce qui fonctionne
- Le tunnel de candidature est bien pensé (idempotence par `leadId`, étapes capture → qualification → booking → enrichment, contrôle `SESSION_CLOSED`).
- Le code session `SW-xxxx` est une clé commune propre entre Airtable, Supabase et le site.
- Les workflows sont actifs, sans erreur depuis le 25/09 (15 erreurs sur 303 exécutions, toutes pendant la mise en place).

### Ce qui pose problème (factuel)
| Domaine | Constat | Impact |
|---|---|---|
| **Sécurité** | Les 8 webhooks sont publics, sans signature, captcha ni limite de débit ; le HTML saisi est réinjecté non échappé dans les emails. `Create or update Event` est lui aussi public. | N'importe qui peut créer des leads, faire envoyer des emails StartupWeek piégés ou modifier les sessions du site. |
| **RGPD** | Consentement forcé à `true` dans 6 workflows sur 8. Le Meta Pixel du site se charge sans consentement (GA4 respecte le Consent Mode). Pas de désinscription traçable. | Risque de non-conformité CNIL. |
| **Qualité de données** | Upserts qui écrasent Tags / Contact Type / historique ; email non normalisé ; `typecast` qui pollue les listes (« bla », « TEST CLAUDE », doublons Weekend/weekend…) ; 3 référentiels différents pour le « stade du projet » ; projet saisi deux fois (Candidature + Accompagnements). | CRM peu fiable, reporting impossible. |
| **Relances** | Aucune relance ni SLA. Les emails promettent « réponse sous 24-48 h », « 2-3 jours ouvrés » : rien ne le suit. Aucun email d'acceptation/refus final. DSK sans nurturing. | Leads perdus, image. |
| **Finance** | Aucun devis, facture, acompte/solde, rapprochement. Seul « Montant payé » existe sur la candidature. CGV : acompte 30 % + solde J-30 non outillés. | Suivi de trésorerie manuel, risque d'impayés. |
| **Qualiopi** | Le site indique « certification en cours ». Il n'existe ni convocation, ni émargement, ni évaluation des acquis, ni questionnaires à chaud/froid, ni registre de réclamations avec délais, ni suivi handicap, ni veille, ni plan d'amélioration. | Audit initial impossible à passer en l'état : c'est le **bloquant n° 1**. |
| **Fiabilité / coût** | Polling Airtable ≈ 4 300 appels/jour ; jusqu'à 5 min de décalage sur les places restantes (risque de surbooking) ; URLs de pièces jointes Airtable qui expirent (liens cassés sur le site) ; suppressions non propagées ; un workflow envoie un email « test » à chaque exécution. | Fragilité, dette. |
| **Gouvernance** | Schéma Supabase non versionné ; pas d'historique des changements de statut ; pas d'assignation (Assignee jamais rempli). | Pas d'audit trail. |
| **Site (hors CRM)** | Grille mentorat incohérente entre `/offres` et `/mon-espace/mentorat` ; les CGV mentionnent le CPF alors que la FAQ dit « non éligible » ; chiffres « 92 % / 98 % de satisfaction » sans source. | À corriger — et le CRM produira des indicateurs de résultats sourcés (indicateur Qualiopi 2). |

## 2. La proposition : **StartupWeek OS**

Un back-office unique, construit sur **la même stack que le site** (Next.js 16 + Supabase), qui devient la source de vérité et supprime Airtable et la quasi-totalité de n8n.

### Modules livrés dans ce dépôt
| Section | Ce que ça fait | Remplace / comble |
|---|---|---|
| **Tableau de bord** (3 designs : Cockpit, Focus, Studio) | Indicateurs, alertes, priorités du jour, brief hebdo | — |
| **Demandes entrantes** | Boîte unifiée des 8 formulaires, SLA 48 h visible, triage, conversion en contact/opportunité | Form Submissions + 6 tables Airtable |
| **Contacts / Organisations** | Fiches 360°, dédoublonnage et fusion, consentements horodatés, timeline | Contacts, Companies |
| **Pipeline** | Opportunités B2B (écoles, entreprises, partenariats, accompagnements) en kanban, prévisionnel | Rien (inexistant) |
| **Relances & tâches** | Tâches, séquences automatiques (SLA, DSK, devis, impayés, J-7, J+60) | Rien |
| **Emails** | Templates versionnés et échappés, journal d'envoi | Templates HTML dupliqués dans n8n |
| **Candidatures** | Pipeline kanban, scoring, checklist Qualiopi, automatisations (acompte, emails, tâches) | Table Candidature |
| **Sessions** | Fiche session, participants, programme, **émargement**, évaluations, finances, documents | Events + sync polling |
| **Projets candidats** | Portefeuille, jalons, métriques, mentors, suivi J+30/J+90 | Projet saisi en double |
| **Intervenants** | Annuaire + conformité (CV, formation continue) | Rien (critère 5) |
| **Qualiopi** | 32 indicateurs, preuves automatiques calculées, réclamations, satisfaction, amélioration, veille, handicap, documents (convention, convocation, attestation, émargement, programme) | Rien |
| **Facturation** | Devis, factures acompte/solde/avoir, numérotation légale, Stripe, rapprochement Qonto, relances d'impayés, export comptable | Rien |
| **Ressources** | Bibliothèque (URLs stables), liens sessions + indicateurs Qualiopi | Ressources Airtable (URLs expirantes) |
| **Contenus du site** | CMS + calendrier éditorial + SEO | Articles en dur dans le code |
| **Analytics** | Acquisition, funnel, revenus, qualité, contenus, recommandations | Rien de consolidé |
| **Automatisations** | Règles actives, carte de migration n8n, endpoints, testeur de formulaire | n8n |
| **Paramètres** | Organisation, facturation, Qualiopi, équipe & rôles, intégrations, données | — |

### Architecture cible
```
Site startupweek.tech ──POST signé (HMAC)──► /api/intake/[form]  (validation zod, rate-limit, idempotence, consentement réel)
                                                  └─► Supabase schéma `crm` (source de vérité, RLS par rôle)
Stripe ──webhook signé──► /api/stripe/webhook  → paiements, statut facture
Qonto  ──cron──────────► /api/qonto/sync       → transactions, rapprochement auto
crm.sessions ──trigger SQL──► public.event (lu par le site)   ← remplace le polling
StartupWeek OS (Next.js) ◄──► Supabase (auth + RLS)  ; emails via Resend
```

## 3. Bénéfices attendus (et limites)

**Bénéfices**
- **Qualiopi** : les preuves sont produites par l'activité normale (émargement, convocations, questionnaires, réclamations horodatées) au lieu d'être reconstituées avant l'audit.
- **Trésorerie** : acompte/solde automatiques, relances, rapprochement → moins d'impayés, DSO mesuré.
- **Conversion** : aucune demande sans réponse (SLA visible), relances automatiques, funnel mesuré de bout en bout.
- **Sécurité & RGPD** : endpoints signés, consentement réel, journal d'activité, droits par rôle appliqués en base.
- **Coûts** : suppression du plan Airtable et du polling ; n8n n'est plus indispensable.
- **Un seul modèle de données** partagé avec le site (plus de synchro fragile).

**Limites et coûts à assumer (objectivement)**
- **Maintenance** : un outil custom se maintient (mises à jour Next/Supabase, évolutions). Compter du temps de dev récurrent ; Airtable offrait de la flexibilité sans code.
- **Ce dépôt est un socle fonctionnel en mode démo** : l'UI complète tourne sur des données fictives stockées dans le navigateur. Le schéma SQL, les politiques RLS, les triggers et les routes API sont écrits mais **n'ont pas été appliqués ni testés contre la vraie base** (volontairement, en attente de ton feu vert).
- **Emails** : en démo ils sont journalisés, pas envoyés. En production : brancher Resend (déjà utilisé par le site) côté serveur.
- **Documents** : convention, attestation, CGV générées sont des **modèles à faire valider** juridiquement.
- **Qualiopi** : l'outil structure et prouve ; il ne remplace ni l'organisme certificateur ni les procédures à rédiger (réclamations, handicap, charte formateurs…). La liste des indicateurs « nouvel entrant » est à confirmer avec le certificateur.
- **Alternatives considérées** : rester sur Airtable + n8n en corrigeant les workflows (moins cher à court terme, mais ne règle ni Qualiopi ni la facturation) ; un SaaS OF (Digiforma, Dendreo…) : couvre Qualiopi + facturation, mais pas le CRM/tunnel spécifique, les contenus du site ni l'intégration fine avec le site existant, et coûte un abonnement mensuel. Le custom se justifie parce que le site est déjà sur Next.js + Supabase et que le tunnel de candidature est un avantage à garder.

## 4. Plan de mise en production recommandé

| Étape | Contenu | Durée indicative |
|---|---|---|
| 0 | Validation de l'UI en démo (ce dépôt) + arbitrages (offres, grille mentorat, CGV/CPF) | 1 semaine |
| 1 | Appliquer les migrations sur une **branche Supabase**, créer les comptes équipe, basculer le CRM en `NEXT_PUBLIC_CRM_DATA_MODE=supabase` | 2-3 jours |
| 2 | Brancher les formulaires du site sur `/api/intake/*` (signature HMAC) **en double écriture** avec n8n pendant 2 semaines | 1 semaine |
| 3 | Import Airtable nettoyé (mapping dans `docs/SUPABASE.md`), activation du trigger `crm.sessions → public.event`, arrêt du polling | 2-3 jours |
| 4 | Stripe (webhook) + Qonto (cron) + Resend ; premières factures réelles | 1 semaine |
| 5 | Décommission de n8n workflow par workflow, puis d'Airtable | 1 semaine |
| 6 | Qualiopi : rédaction des procédures, audit blanc à J-30 via le module | continu |

## 5. À corriger sur le site, indépendamment du CRM
1. Conditionner le Meta Pixel au consentement « marketing » (comme GA4).
2. Retirer la mention CPF des CGV tant que la certification n'est pas obtenue.
3. Unifier la grille mentorat (`/offres` vs `/mon-espace/mentorat`).
4. Remplacer « 92 % / 98 % de satisfaction » par les indicateurs de résultats publiés par le CRM (sourcés).
5. Versionner le schéma Supabase du site (`supabase db dump`).
