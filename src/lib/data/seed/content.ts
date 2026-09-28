/**
 * Contenus (blog, pages sessions, témoignages, FAQ, newsletters, réseaux sociaux)
 * et règles d'automatisation (remplacement des workflows n8n + nouvelles règles).
 */
import type { AutomationRule, AutomationTrigger, Channel, ContentItem, ContentStatus, ContentType } from "../../domain/types";
import { type SeedContext, dayRel, stamps } from "./context";
import { DAY, HOUR, MIN, slug } from "./helpers";
import { evId } from "./events";
import { U } from "./team";

/* ───────────────────────────── Contenus ───────────────────────────── */

interface ContentSpec {
  title: string;
  type: ContentType;
  status: ContentStatus;
  channel: Channel;
  day: number; // publication (≤ 0) ou planification (> 0), en jours relatifs
  excerpt: string;
  body?: string;
  tags: string[];
  author?: string;
  eventCode?: string;
  cover?: string;
  weight?: number; // audience relative (métriques des contenus publiés)
}

const md = (title: string, intro: string, points: string[]) => `# ${title}\n\n${intro}\n\n${points.map((p) => `- ${p}`).join("\n")}\n`;

const ARTICLES: ContentSpec[] = [
  { title: "Lancer son MVP en 7 jours : la méthode StartupWeek", type: "article", status: "publie", channel: "blog", day: -160, tags: ["MVP", "Méthode"], excerpt: "Scope, maquette, build, tests, landing, pitch : le déroulé jour par jour pour passer de l'idée à un produit testé.", weight: 3.2 },
  { title: "No-code en 2026 : quel outil pour quel MVP ?", type: "article", status: "publie", channel: "blog", day: -131, tags: ["No-code", "Outils"], excerpt: "Bubble, Webflow, Glide, Softr ou Supabase : notre grille de choix selon votre produit.", weight: 2.6 },
  { title: "IA générative : 5 fonctionnalités à intégrer dans votre MVP", type: "article", status: "publie", channel: "blog", day: -102, tags: ["IA", "MVP"], excerpt: "Assistant, extraction de documents, recherche sémantique… cinq briques IA à forte valeur, faciles à brancher.", weight: 2.9 },
  { title: "Financer sa formation d'entrepreneur : OPCO, France Travail, employeur", type: "article", status: "publie", channel: "blog", day: -88, tags: ["Financement"], excerpt: "Qui peut financer une StartupWeek et comment monter le dossier sans y passer des semaines.", weight: 2.1 },
  { title: "Choisir son stack no-code : Bubble, Webflow, Supabase ou Airtable ?", type: "article", status: "publie", channel: "blog", day: -66, tags: ["No-code", "Stack"], excerpt: "Les critères qui comptent vraiment : données, logique métier, coûts à l'échelle et réversibilité.", weight: 1.8 },
  { title: "Valider son idée avant de coder : 7 tests à faire cette semaine", type: "article", status: "publie", channel: "blog", day: -45, tags: ["Validation", "Tests utilisateurs"], excerpt: "Entretiens, smoke test, pré-vente : sept expériences rapides pour réduire le risque.", weight: 2.4 },
  { title: "Du salariat à l'entrepreneuriat : réussir sa reconversion", type: "article", status: "publie", channel: "blog", day: -24, tags: ["Reconversion"], excerpt: "Témoignages et conseils pratiques pour tester son projet sans tout quitter.", weight: 1.5 },
  { title: "Pitcher en 5 minutes : la structure qui convainc", type: "article", status: "publie", channel: "blog", day: -9, tags: ["Pitch"], excerpt: "Problème, solution, preuve, marché, équipe, demande : la trame utilisée au Démo Day.", weight: 1.1 },
  { title: "Automatiser son back-office avec n8n : guide pour fondateurs non-tech", type: "article", status: "planifie", channel: "blog", day: 5, tags: ["Automatisation", "No-code"], excerpt: "Formulaires, CRM, emails, factures : les 5 automatisations à mettre en place dès le premier client." },
  { title: "Agents IA : ce qui change pour les MVP", type: "article", status: "planifie", channel: "blog", day: 12, tags: ["IA", "Agents"], excerpt: "Les agents IA intégrés aux outils no-code réduisent le temps de build : exemples concrets." },
  { title: "Combien coûte un MVP en 2026 ?", type: "article", status: "relecture", channel: "blog", day: 20, tags: ["MVP", "Budget"], excerpt: "Agence, freelance, no-code ou bootcamp : comparatif des coûts et des délais." },
  { title: "Tests utilisateurs : recruter 10 testeurs en 48 h", type: "article", status: "redaction", channel: "blog", day: 30, tags: ["Tests utilisateurs"], excerpt: "Les canaux qui fonctionnent pour trouver vos premiers testeurs, même sans audience." },
  { title: "Étude : que deviennent les MVP 6 mois après la StartupWeek ?", type: "etude_de_cas", status: "idee", channel: "blog", day: 45, tags: ["Résultats", "Alumni"], excerpt: "Analyse des suivis J+90 des alumni : lancements, premiers revenus, pivots." },
];

const TESTIMONIALS: ContentSpec[] = [
  { title: "Nelson C. — Next-Elec", type: "temoignage", status: "publie", channel: "site", day: -150, tags: ["Témoignage", "Greentech"], excerpt: "« En 7 jours, j'ai construit l'outil de devis que j'imaginais depuis deux ans, et signé mes premiers clients dans la foulée. »", eventCode: "SW-0004", weight: 1.4 },
  { title: "Caroline B. — WePilot", type: "temoignage", status: "publie", channel: "site", day: -120, tags: ["Témoignage", "SaaS B2B"], excerpt: "« Je ne suis pas technique : la semaine m'a donné la méthode et la confiance pour lancer WePilot. »", eventCode: "SW-0007", weight: 1.3 },
  { title: "Mathieu T. — DeltaConcept", type: "temoignage", status: "publie", channel: "site", day: -95, tags: ["Témoignage", "IA"], excerpt: "« Le Démo Day a été un déclic : prix du jury et deux rendez-vous investisseurs la semaine suivante. »", eventCode: "SW-0008", weight: 1.2 },
  { title: "Epitech : un Startup Village pour 80 étudiants", type: "etude_de_cas", status: "publie", channel: "site", day: -110, tags: ["École", "Startup Village", "Cas client"], excerpt: "Format immersif de 4 jours, 16 prototypes, un jury de professionnels : retour sur le partenariat avec Epitech (300 étudiants accompagnés sur 12 campus).", eventCode: "SV-0001", weight: 1.6 },
];

const PAGES: ContentSpec[] = [
  { title: "FAQ — Financement et paiement (acompte, solde, OPCO)", type: "faq", status: "publie", channel: "site", day: -140, tags: ["FAQ", "Financement"], excerpt: "Acompte de 30 % à l'inscription, solde à J-30, prises en charge OPCO et France Travail, remboursement en cas de désistement.", weight: 1.7 },
  { title: "FAQ — Accessibilité et handicap", type: "faq", status: "relecture", channel: "site", day: 8, tags: ["FAQ", "Accessibilité", "Qualiopi"], excerpt: "Lieux accessibles, aménagements possibles, contact de la référente handicap." },
  { title: "Nos résultats", type: "page", status: "publie", channel: "site", day: -170, tags: ["Qualiopi", "Résultats"], excerpt: "Satisfaction moyenne 4,6/5, 75 participants, 96 % d'assiduité, 100 % de MVP présentés au Démo Day.", weight: 0.9 },
];

const NEWSLETTERS: ContentSpec[] = [
  { title: "Newsletter d'avril — Deauville, Marrakech et la méthode du scope MVP", type: "newsletter", status: "publie", channel: "newsletter", day: -170, tags: ["Newsletter"], excerpt: "Retour sur la session de Marrakech, places Deauville, outil du mois.", weight: 1 },
  { title: "Newsletter de mai — Podcast Build in Public et session en ligne de juin", type: "newsletter", status: "publie", channel: "newsletter", day: -140, tags: ["Newsletter"], excerpt: "L'épisode avec Aurélien, dernières places en ligne.", weight: 1 },
  { title: "Newsletter de juin — Nouvelles destinations 2026-2027", type: "newsletter", status: "publie", channel: "newsletter", day: -110, tags: ["Newsletter"], excerpt: "Split, Cyclades, Santorin, Tivat : le calendrier complet.", weight: 1 },
  { title: "Newsletter de juillet — IA générative et Iteration Lab", type: "newsletter", status: "publie", channel: "newsletter", day: -80, tags: ["Newsletter"], excerpt: "5 fonctionnalités IA à intégrer, lancement de l'Iteration Lab.", weight: 1 },
  { title: "Newsletter d'août — Founder Edition d'octobre", type: "newsletter", status: "publie", channel: "newsletter", day: -52, tags: ["Newsletter"], excerpt: "Tarif fondateur sur les sessions d'octobre (en ligne et Espagne).", weight: 1 },
  { title: "Newsletter de septembre — Retour sur Split et webinaire financement", type: "newsletter", status: "publie", channel: "newsletter", day: -18, tags: ["Newsletter"], excerpt: "Les projets de la session de Split, inscription au webinaire du 15 octobre.", weight: 1 },
  { title: "Newsletter d'octobre — Dernières places Espagne & novembre en ligne", type: "newsletter", status: "planifie", channel: "newsletter", day: 6, tags: ["Newsletter"], excerpt: "Dernières places pour l'Espagne, ouverture de la session en ligne de novembre." },
];

const SOCIAL: ContentSpec[] = [
  { title: "Carrousel : les 7 jours d'une StartupWeek", type: "post_linkedin", status: "publie", channel: "linkedin", day: -60, tags: ["LinkedIn", "MVP"], excerpt: "J1 scope, J2 maquette… J7 Démo Day : le carrousel qui résume la semaine.", weight: 1.3 },
  { title: "Retour sur la StartupWeek de Split", type: "post_linkedin", status: "publie", channel: "linkedin", day: -12, tags: ["LinkedIn", "Session"], excerpt: "8 fondateurs, 8 MVP, 1 prix du jury : merci à toute la promo de Split !", eventCode: "SW-0010", weight: 1.5 },
  { title: "Témoignage vidéo : Caroline (WePilot)", type: "post_linkedin", status: "publie", channel: "linkedin", day: -33, tags: ["LinkedIn", "Témoignage"], excerpt: "Comment une fondatrice non-tech a lancé son SaaS B2B.", weight: 1.1 },
  { title: "Annonce du webinaire financement du 15 octobre", type: "post_linkedin", status: "publie", channel: "linkedin", day: -5, tags: ["LinkedIn", "Webinaire"], excerpt: "OPCO, France Travail, employeur : comment financer sa StartupWeek.", eventCode: "WEB-0002", weight: 0.8 },
  { title: "Dernières places : StartupWeek Espagne (Founder Edition)", type: "post_linkedin", status: "planifie", channel: "linkedin", day: 3, tags: ["LinkedIn", "Session"], excerpt: "Plus que quelques places pour la session du 24 octobre.", eventCode: "SW-0011" },
  { title: "Ce qu'on a appris en 10 sessions", type: "post_linkedin", status: "planifie", channel: "linkedin", day: 17, tags: ["LinkedIn", "Retour d'expérience"], excerpt: "Les 5 erreurs les plus fréquentes des fondateurs qui lancent un MVP." },
  { title: "Reel : une journée type en villa", type: "post_instagram", status: "publie", channel: "instagram", day: -40, tags: ["Instagram", "Villa"], excerpt: "Stand-up du matin, build, tests, coucher de soleil et pitch.", weight: 1.9 },
  { title: "Reel : le Démo Day de Split", type: "post_instagram", status: "publie", channel: "instagram", day: -13, tags: ["Instagram", "Session"], excerpt: "Les meilleurs moments des pitchs finaux.", eventCode: "SW-0010", weight: 2.2 },
  { title: "Story : quiz no-code", type: "post_instagram", status: "publie", channel: "instagram", day: -3, tags: ["Instagram", "No-code"], excerpt: "Bubble ou Webflow ? Teste tes connaissances.", weight: 0.7 },
  { title: "Reel : J-9 avant la session en ligne d'octobre", type: "post_instagram", status: "planifie", channel: "instagram", day: 2, tags: ["Instagram", "Session"], excerpt: "Les coulisses de la préparation de la session en ligne.", eventCode: "SW-0012" },
];

export function buildContents(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("contents");
  const specs: ContentSpec[] = [...ARTICLES, ...TESTIMONIALS, ...PAGES, ...NEWSLETTERS, ...SOCIAL];

  // Pages des sessions à venir (publiées) + deux pages de sessions passées archivées.
  const upcoming = ctx.data.events.filter((e) => e.kind === "startup_week" && e.status === "inscriptions_ouvertes");
  for (const ev of upcoming) {
    const isLast = ev.code === "SW-0023";
    specs.push({
      title: `Page session — ${ev.name}`,
      type: "page_session",
      status: isLast ? "redaction" : "publie",
      channel: "site",
      // Page publiée après la création de la session dans le back-office.
      day: isLast ? 10 : Math.max(dayRel(ctx, Date.parse(ev.createdAt)) + 2, -r.between(25, 110)),
      tags: ["Session", ev.mode === "distanciel" ? "En ligne" : ev.region],
      excerpt: ev.description,
      eventCode: ev.code,
      cover: ev.imageUrl,
      weight: ev.code === "SW-0012" || ev.code === "SW-0011" ? 3 : 1.2,
    });
  }
  for (const code of ["SW-0009", "SW-0010"]) {
    const ev = ctx.data.events.find((e) => e.id === evId(code))!;
    specs.push({ title: `Page session — ${ev.name}`, type: "page_session", status: "archive", channel: "site", day: -150, tags: ["Session", "Archive"], excerpt: ev.description, eventCode: code, cover: ev.imageUrl, weight: 1 });
  }

  ctx.data.contents = specs.map((s, i) => {
    const s0 = slug(s.title).slice(0, 70);
    const eventId = s.eventCode ? evId(s.eventCode) : undefined;
    const published = s.status === "publie" || s.status === "archive";
    const planned = s.status === "planifie";
    const pubTs = clock.rel(s.day, r.pick([8, 9, 12, 18]), r.pick([0, 15, 30]));
    const created = published ? pubTs - r.between(5, 25) * DAY : clock.now - r.between(3, 30) * DAY;
    const ageDays = published ? Math.max(1, (clock.now - pubTs) / DAY) : 0;
    const views = published ? Math.round((s.weight ?? 1) * (s.channel === "newsletter" ? 900 : s.channel === "linkedin" ? 60 : s.channel === "instagram" ? 90 : 25) * Math.sqrt(ageDays) * r.float(0.8, 1.25)) : 0;
    const clicks = Math.round(views * (s.channel === "newsletter" ? r.float(0.08, 0.14) : r.float(0.02, 0.07)));
    const leads = Math.round(clicks * r.float(0.04, 0.12));
    const item: ContentItem = {
      id: `cnt_${String(i + 1).padStart(3, "0")}`,
      ...stamps(ctx, created, published ? pubTs + r.between(0, 20) * DAY : clock.now - r.between(0, 3) * DAY - HOUR),
      title: s.title,
      slug: s0,
      type: s.type,
      status: s.status,
      channel: s.channel,
      authorId: s.author ?? (s.type === "faq" || s.tags.includes("Qualiopi") ? U.claire : s.type === "post_instagram" ? U.lea : U.aurelien),
      excerpt: s.excerpt,
      body: s.body ?? md(s.title, s.excerpt, bodyPoints(s.type)),
      tags: s.tags,
      seoTitle: s.channel === "blog" || s.channel === "site" ? `${s.title} | StartupWeek` : undefined,
      seoDescription: s.channel === "blog" || s.channel === "site" ? s.excerpt.slice(0, 155) : undefined,
      coverUrl: s.cover ?? (s.channel === "blog" ? `https://www.startupweek.tech/blog/${s0}.webp` : undefined),
      eventId,
      scheduledAt: planned ? clock.iso(pubTs) : undefined,
      publishedAt: published ? clock.iso(clock.past(pubTs)) : undefined,
      metrics: { views, clicks, leads },
    };
    return item;
  });
}

function bodyPoints(type: ContentType): string[] {
  switch (type) {
    case "article":
    case "etude_de_cas":
      return ["Le contexte et le problème à résoudre", "La méthode pas à pas, avec des exemples d'alumni", "Les outils recommandés (no-code, IA, automatisation)", "Les erreurs à éviter", "👉 Prochaine session : [voir le calendrier](https://www.startupweek.tech/sessions)"];
    case "temoignage":
      return ["Le projet avant la StartupWeek", "Ce qui a changé pendant la semaine", "Les résultats quelques mois après"];
    case "newsletter":
      return ["L'actu des sessions", "L'outil du mois", "Le témoignage alumni", "Les prochaines dates"];
    case "page_session":
      return ["Programme J1 → J7", "Tarifs, acompte et solde", "Accessibilité et aménagements", "Candidater en 5 minutes"];
    case "faq":
      return ["Questions fréquentes", "Contact : contact@startupweek.tech"];
    default:
      return ["Accroche", "Message clé", "Appel à l'action"];
  }
}

/* ───────────────────────────── Automatisations ───────────────────────────── */

type Rule = [id: string, name: string, description: string, trigger: AutomationTrigger, conditions: string, actions: string[], replacesN8n: string[] | undefined, runs: number, lastRunHoursAgo: number, errors: number, active?: boolean];

const RULES: Rule[] = [
  ["aut_form_candidature", "Candidature reçue", "Crée ou met à jour le contact (email normalisé), la candidature et la demande ; accusé de réception ; tâche de qualification.", "formulaire_recu", "Type = candidature (clé d'idempotence = Lead ID du tunnel)", ["Upsert contact (email normalisé)", "Créer la candidature", "Email « Candidature reçue - StartupWeek »", "Tâche « Qualifier la candidature » à 48 h"], ["Candidature event"], 312, 3, 2],
  ["aut_form_contact", "Formulaire contact", "Enregistre la demande, envoie l'accusé de réception et assigne la demande.", "formulaire_recu", "Type = contact (filtre anti-spam)", ["Upsert contact", "Email « Message reçu - StartupWeek »", "Assigner à Léa"], ["Contact"], 58, 5, 0],
  ["aut_form_entreprise", "Demande entreprise", "Crée l'organisation, le contact et une opportunité B2B au stade « Nouveau ».", "formulaire_recu", "Type = entreprise", ["Upsert organisation + contact", "Créer l'opportunité", "Email « Demande entreprise reçue - StartupWeek »", "Notifier Léa"], ["Entreprise"], 41, 30, 1],
  ["aut_form_accompagnement", "Demande d'accompagnement", "Crée la demande et l'opportunité accompagnement (Startup Ready, Iteration Lab…).", "formulaire_recu", "Type = accompagnement", ["Upsert contact", "Créer l'opportunité accompagnement", "Email « Demande d'accompagnement reçue - StartupWeek »"], ["Accompagnements"], 27, 36, 0],
  ["aut_form_partenariat", "Proposition de partenariat", "Enregistre la proposition, crée l'organisation et notifie Aurélien.", "formulaire_recu", "Type = partenariat", ["Upsert organisation + contact", "Email « Proposition de partenariat reçue - StartupWeek »", "Notifier Aurélien"], ["Partenariats"], 19, 290, 0],
  ["aut_reclamation", "Réclamation reçue", "Ouvre une réclamation numérotée (REC-AAAA-NNN), accusé automatique et tâche d'accusé formel sous 48 h.", "reclamation_recue", "Formulaire réclamation ou saisie manuelle", ["Créer la réclamation", "Email « Réclamation reçue »", "Tâche urgente pour la référente qualité (48 h)"], ["Reclamation"], 6, 30, 0],
  ["aut_dsk", "Digital Starter Kit", "Envoie le kit, tag « Digital Starter Kit » et inscription à la séquence de nurturing.", "formulaire_recu", "Type = digital_starter_kit", ["Upsert contact + tag", "Email « 🎁 Ton Digital Starter Kit StartupWeek est prêt »", "Inscrire à la séquence Nurturing DSK"], ["Digital Starter Kit"], 214, 20, 3],
  ["aut_newsletter", "Consentement newsletter", "Enregistre le consentement (preuve : formulaire, date) et gère les désinscriptions.", "formulaire_recu", "Case newsletter cochée ou désinscription", ["Mettre à jour le consentement marketing", "Email de bienvenue", "Synchroniser la liste newsletter"], ["Consent Newsletter"], 388, 26, 0],
  ["aut_session_sync", "Publication des sessions sur le site", "Publie les sessions (places restantes, prix, statut) sur le site à chaque modification — fin du polling Airtable.", "planifie", "À chaque enregistrement d'une session (temps réel)", ["Mettre à jour la table event du site", "Recalculer les places restantes"], ["Sync Airtable -> Supabase (polling, remplace automatisations Airtable)", "Create or update Event"], 1460, 1, 4],
  ["aut_resources", "Attribution des ressources aux sessions", "Associe automatiquement kits et documents aux sessions selon le type et le format.", "planifie", "Création ou modification d'une session / ressource", ["Lier les ressources par défaut", "Publier l'espace ressources participants"], ["Ressources copy", "add  ressources for event(s)"], 96, 50, 0],
  ["aut_errors", "Journal des erreurs d'automatisation", "Centralise les erreurs (email en échec, webhook refusé) et alerte l'admin.", "planifie", "Toute exécution en erreur", ["Journaliser l'erreur", "Notifier Aurélien si 3 erreurs en 1 h"], ["Error workflow"], 12, 70, 0],
  ["aut_acompte", "Acompte à l'acceptation", "À l'acceptation d'une candidature : facture d'acompte 30 %, lien Stripe et email d'acceptation.", "candidature_statut", "Statut → acceptée", ["Générer la facture d'acompte (30 %)", "Créer le lien de paiement Stripe", "Email d'acceptation (présentiel / distanciel)", "Inscrire à la séquence « Candidature acceptée »"], undefined, 97, 50, 0],
  ["aut_paiement", "Paiement reçu → inscription", "À réception de l'acompte : candidature « inscrite », contrat signé, bascule « Complet » si la capacité est atteinte.", "paiement_recu", "Paiement Stripe réussi ou virement enregistré", ["Marquer la facture payée", "Candidature → inscrite", "Recalculer les places / statut Complet"], undefined, 181, 22, 1],
  ["aut_solde", "Relance du solde à J-30", "Émet la facture de solde à J-45 et relance à J+3 / J+10 si elle n'est pas réglée à J-30.", "facture_echeance", "Facture de solde non payée", ["Émettre la facture de solde (J-45)", "Relance J+3 et J+10", "Tâche d'appel à J+12"], undefined, 88, 9, 0],
  ["aut_convocation", "Convocation J-7", "Envoie la convocation (si non envoyée) et le rappel pratique à J-7 ; vérifie les aménagements déclarés.", "session_date", "Session dans 7 jours", ["Email de convocation + livret d'accueil", "Rappel J-7", "Tâche « Vérifier aménagements » si besoin déclaré"], undefined, 13, 26, 0],
  ["aut_eval_chaud", "Questionnaire à chaud (J+0)", "Envoie le questionnaire de satisfaction le dernier jour et le certificat de réalisation.", "session_date", "Fin de session", ["Email questionnaire à chaud", "Générer les certificats de réalisation", "Relance J+3 des non-répondants"], undefined, 10, 340, 0],
  ["aut_eval_froid", "Questionnaire à froid (J+60)", "Envoie le questionnaire à froid 60 jours après la session.", "session_date", "Fin de session + 60 jours", ["Email questionnaire à froid", "Relance à J+67"], undefined, 9, 1030, 0],
  ["aut_sla", "Alerte SLA 48 h", "Signale les demandes sans réponse depuis 48 h et crée une tâche urgente.", "planifie", "Toutes les heures : demandes « nouvelle » > 48 h", ["Tâche urgente", "Email d'alerte interne"], undefined, 2180, 1, 0],
  ["aut_upsell", "Upsell Iteration Lab (alumni)", "Propose l'Iteration Lab aux alumni 15 jours après la session.", "session_date", "Fin de session + 15 jours", ["Email Iteration Lab", "Tâche d'appel si clic"], undefined, 7, 170, 0, false],
];

export function buildAutomations(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("automations");
  ctx.data.automations = RULES.map(([id, name, description, trigger, conditions, actions, replacesN8n, runs, lastRunHoursAgo, errors, active]) => {
    const rule: AutomationRule = {
      id,
      ...stamps(ctx, clock.real("2026-06-01", 10, 0) - r.between(0, 30) * DAY, clock.now - r.between(1, 6) * DAY),
      name,
      description,
      trigger,
      conditions,
      actions,
      active: active ?? true,
      replacesN8n,
      runs,
      lastRunAt: clock.iso(clock.now - Math.round(lastRunHoursAgo * 60) * MIN - r.between(0, 30) * MIN),
      errors,
    };
    return rule;
  });
}
