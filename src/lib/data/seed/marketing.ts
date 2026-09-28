/**
 * Marketing : campagnes Meta / LinkedIn, statistiques quotidiennes par publicité et A/B tests.
 *
 * Cohérent avec le reste du jeu de démo :
 * - les fenêtres des campagnes Meta recoupent les pics « meta_ads » du trafic (seed/analytics.ts) ;
 * - les utm_campaign reprennent celles des candidatures (seed/people.ts) → l'attribution CRM fonctionne ;
 * - les écarts entre créations sont réalistes (CTR Meta ~1 %, LinkedIn ~0,5 %) et les tests
 *   couvrent les cas utiles : gagnant net, test en cours, résultat non significatif, brouillon.
 */
import type { AdCampaign, AdCreative, AdPlatform, AdStatDay, CampaignObjective, CampaignStatus, Experiment, ExperimentVariant } from "../../domain/types";
import { type SeedContext, stamps } from "./context";
import { DAY } from "./helpers";
import { evId } from "./events";
import { U } from "./team";

interface CreativeSpec {
  name: string;
  headline: string;
  text: string;
  cta: string;
  format: AdCreative["format"];
  /** Multiplicateur de CTR (écart entre créations). */
  ctr: number;
  /** Multiplicateur du taux de lead par clic. */
  lead?: number;
  share?: number; // part du budget (défaut : égale)
  active?: boolean;
}

interface CampaignSpec {
  id: string;
  name: string;
  platform: AdPlatform;
  objective: CampaignObjective;
  status: CampaignStatus;
  eventCode?: string;
  audience: string;
  start: number; // jours relatifs
  end?: number;
  budget: number; // €
  daily?: number; // €
  utm: string;
  landing: string;
  owner: string;
  notes?: string;
  externalId?: string;
  creatives: CreativeSpec[];
}

const SITE = "https://www.startupweek.tech";

const CAMPAIGNS: CampaignSpec[] = [
  {
    id: "cmp_printemps26",
    name: "Printemps 2026 — Deauville & Marrakech",
    platform: "meta",
    objective: "conversions",
    status: "terminee",
    eventCode: "SW-0008",
    audience: "France, 25-45 ans · intérêts entrepreneuriat, no-code, reconversion · exclusion des inscrits",
    start: -155,
    end: -136,
    budget: 1500,
    utm: "sw_printemps26",
    landing: `${SITE}/sessions`,
    owner: U.aurelien,
    externalId: "120210000000001",
    creatives: [
      { name: "A — Villa (visuel lieu)", headline: "7 jours dans une villa pour lancer ton MVP", text: "Deauville ou Marrakech : une semaine en immersion avec des mentors pour passer de l'idée au produit testé.", cta: "En savoir plus", format: "image", ctr: 0.92 },
      { name: "B — Groupe au travail", headline: "Ils ont lancé leur MVP en 7 jours", text: "10 porteurs de projet, 5 mentors, 1 MVP en ligne à la fin de la semaine. Et toi ?", cta: "Candidater", format: "image", ctr: 1.24 },
    ],
  },
  {
    id: "cmp_lookalike",
    name: "Lookalike alumni — toutes sessions",
    platform: "meta",
    objective: "leads",
    status: "terminee",
    audience: "Audience similaire 1 % des alumni (liste consentie) · France",
    start: -121,
    end: -62,
    budget: 1200,
    utm: "lookalike_alumni",
    landing: `${SITE}/digital-starter-kit`,
    owner: U.lea,
    externalId: "120210000000002",
    creatives: [
      { name: "Digital Starter Kit — carrousel", headline: "Le kit gratuit pour démarrer ton projet", text: "6 modules pour clarifier ton idée et préparer ton MVP. Gratuit.", cta: "Télécharger", format: "carrousel", ctr: 1.05, lead: 1.2 },
    ],
  },
  {
    id: "cmp_retargeting_dsk",
    name: "Retargeting Digital Starter Kit",
    platform: "meta",
    objective: "retargeting",
    status: "active",
    audience: "Visiteurs du site 30 j + téléchargeurs du kit, hors candidats",
    start: -170,
    daily: 8,
    budget: 2400,
    utm: "retargeting_dsk",
    landing: `${SITE}/candidature`,
    owner: U.lea,
    externalId: "120210000000003",
    notes: "Budget quotidien plafonné : audience restreinte, fréquence à surveiller (> 4 = fatigue).",
    creatives: [
      { name: "Rappel — prochaines dates", headline: "Prêt·e à passer à l'action ?", text: "Tu as téléchargé le kit : les prochaines StartupWeek démarrent bientôt. Places limitées à 10.", cta: "Voir les dates", format: "image", ctr: 1.6, lead: 0.8 },
    ],
  },
  {
    id: "cmp_webinaire_mvp",
    name: "Webinaire « MVP en 7 jours » — LinkedIn",
    platform: "linkedin",
    objective: "leads",
    status: "terminee",
    eventCode: "WEB-0001",
    audience: "France · salariés cadres, fonctions produit / marketing / tech · 28-50 ans",
    start: -36,
    end: -17,
    budget: 900,
    utm: "webinaire_mvp",
    landing: `${SITE}/webinaires`,
    owner: U.aurelien,
    externalId: "urn:li:sponsoredCampaign:410000001",
    creatives: [
      { name: "Document — programme du webinaire", headline: "Lancer son MVP en 7 jours grâce au no-code et à l'IA", text: "Webinaire gratuit de 45 min : méthode, outils, exemples réels.", cta: "S'inscrire", format: "image", ctr: 0.9, lead: 1.15 },
      { name: "Vidéo — témoignage alumni", headline: "« J'ai testé mon idée en une semaine »", text: "Retour d'expérience d'une alumni en reconversion.", cta: "S'inscrire", format: "video", ctr: 0.75, lead: 0.9 },
    ],
  },
  {
    id: "cmp_oct26_founder",
    name: "Founder Edition octobre — session en ligne",
    platform: "meta",
    objective: "conversions",
    status: "active",
    eventCode: "SW-0012",
    audience: "France · 25-50 ans · intérêts startup, freelance, no-code, IA · exclusion des inscrits",
    start: -46,
    end: 8,
    budget: 2000,
    utm: "sw_oct26_founder",
    landing: `${SITE}/sessions/en-ligne-octobre-2026`,
    owner: U.aurelien,
    externalId: "120210000000004",
    creatives: [
      { name: "A — Témoignage vidéo", headline: "« Mon MVP était en ligne le vendredi »", text: "Session en ligne du 5 au 12 octobre : méthode, mentors et outils no-code & IA.", cta: "Candidater", format: "video", ctr: 0.95 },
      { name: "B — Prix barré Founder", headline: "Founder Edition : 990 € au lieu de 1 290 €", text: "Dernières places pour la session en ligne d'octobre. Acompte 30 %, finançable OPCO.", cta: "Candidater", format: "image", ctr: 1.32 },
    ],
  },
  {
    id: "cmp_automne26",
    name: "Automne 2026 — Espagne & Split",
    platform: "meta",
    objective: "conversions",
    status: "active",
    eventCode: "SW-0011",
    audience: "France, Belgique, Suisse · 27-50 ans · intérêts entrepreneuriat, télétravail, voyage",
    start: -12,
    end: 25,
    budget: 1800,
    utm: "sw_automne26",
    landing: `${SITE}/sessions/espagne-octobre-2026`,
    owner: U.lea,
    externalId: "120210000000005",
    creatives: [
      { name: "A — Villa + mer", headline: "Une semaine en Espagne pour lancer ton projet", text: "Du 24 au 31 octobre : 10 porteurs de projet, une villa, un MVP à la fin.", cta: "Candidater", format: "image", ctr: 1.0 },
      { name: "B — Planning jour par jour", headline: "J1 idée → J7 démo : le programme", text: "Scope, maquette, build no-code, tests, landing, pitch. Tout est prévu.", cta: "Voir le programme", format: "carrousel", ctr: 1.12 },
      { name: "C — Question directe", headline: "Ton idée mérite mieux qu'un fichier Notion", text: "Passe à l'action cet automne avec StartupWeek.", cta: "Candidater", format: "image", ctr: 0.97 },
    ],
  },
  {
    id: "cmp_webinaire_opco",
    name: "Webinaire financement OPCO — LinkedIn",
    platform: "linkedin",
    objective: "leads",
    status: "active",
    eventCode: "WEB-0002",
    audience: "France · salariés en poste, RH et managers · entreprises 50-5 000 salariés",
    start: -5,
    end: 19,
    budget: 700,
    utm: "webinaire_financement",
    landing: `${SITE}/webinaires/financement`,
    owner: U.lea,
    externalId: "urn:li:sponsoredCampaign:410000002",
    creatives: [
      { name: "A — Formulaire Lead Gen", headline: "Faire financer sa StartupWeek : OPCO, employeur, France Travail", text: "Webinaire gratuit le 15 octobre — les démarches pas à pas.", cta: "S'inscrire", format: "image", ctr: 0.62, lead: 1.25 },
      { name: "B — Vers la landing", headline: "Votre formation d'entrepreneur peut être financée", text: "45 minutes pour comprendre les dispositifs et monter le dossier.", cta: "En savoir plus", format: "image", ctr: 0.7, lead: 0.7 },
    ],
  },
  {
    id: "cmp_b2b_sprint",
    name: "Offre entreprises — Innovation Sprint",
    platform: "linkedin",
    objective: "leads",
    status: "en_pause",
    audience: "France · DRH, directeurs innovation, responsables formation · entreprises 200+ salariés",
    start: -58,
    budget: 1500,
    utm: "b2b_innovation_sprint",
    landing: `${SITE}/entreprises`,
    owner: U.lea,
    externalId: "urn:li:sponsoredCampaign:410000003",
    notes: "Mise en pause à J-30 : coût par lead trop élevé (> 150 €) — retravailler l'offre avant de relancer.",
    creatives: [
      { name: "Étude de cas Verdalys", headline: "3 jours pour prototyper 4 projets d'intrapreneuriat", text: "Retour sur l'Innovation Sprint du groupe Verdalys.", cta: "Télécharger", format: "image", ctr: 0.48, lead: 0.55, active: false },
    ],
  },
  {
    id: "cmp_split_nov26",
    name: "Split novembre — lancement",
    platform: "meta",
    objective: "conversions",
    status: "brouillon",
    eventCode: "SW-0013",
    audience: "À définir : lookalike candidats 2026 + intérêts voyage / télétravail",
    start: 3,
    end: 40,
    budget: 1500,
    utm: "sw_split_nov26",
    landing: `${SITE}/sessions/split-novembre-2026`,
    owner: U.lea,
    creatives: [
      { name: "A — Adriatique", headline: "Split, 14-21 novembre : ton MVP face à la mer", text: "Une semaine pour construire et tester ton produit.", cta: "Candidater", format: "image", ctr: 1 },
    ],
  },
];

/** Repères par régie : CPM (€), CTR (%), taux de lead par clic, bruit quotidien. */
const PLATFORM = {
  meta: { cpm: [6.5, 9.5], ctr: 1.05, lead: 0.07 },
  linkedin: { cpm: [32, 44], ctr: 0.55, lead: 0.11 },
} as const;

export function buildMarketing(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("marketing");
  const campaigns: AdCampaign[] = [];
  const stats: AdStatDay[] = [];
  // Arrondi aléatoire (petits volumes LinkedIn : 0,4 lead / jour ne doit pas toujours donner 0).
  const draw = (x: number) => Math.floor(x) + (r.chance(x - Math.floor(x)) ? 1 : 0);

  for (const spec of CAMPAIGNS) {
    const startTs = clock.rel(spec.start, 9);
    const endTs = spec.end !== undefined ? clock.rel(spec.end, 23, 59) : undefined;
    const creatives: AdCreative[] = spec.creatives.map((c, i) => ({
      id: `${spec.id}_cr${i + 1}`,
      externalId: spec.externalId ? (spec.platform === "meta" ? `${spec.externalId.slice(0, -1)}${i + 5}` : `urn:li:sponsoredCreative:52000${spec.externalId.slice(-1)}${i + 1}`) : undefined,
      name: c.name,
      headline: c.headline,
      primaryText: c.text,
      callToAction: c.cta,
      format: c.format,
      active: c.active ?? spec.status !== "terminee",
    }));

    // Statistiques : de la veille du début jusqu'à hier (ou la fin / la mise en pause).
    const lastDay = spec.status === "en_pause" ? -30 : Math.min(spec.end ?? -1, -1);
    const days = spec.status === "brouillon" ? 0 : Math.max(0, lastDay - spec.start + 1);
    const dailySpend = spec.daily ?? (days ? spec.budget / Math.max(days, (spec.end ?? lastDay) - spec.start + 1) : 0);
    const p = PLATFORM[spec.platform];
    const totalShare = spec.creatives.reduce((s, c) => s + (c.share ?? 1), 0);
    for (let d = spec.start; d <= lastDay && days; d++) {
      const dayTs = clock.rel(d, 12);
      const weekly = [0.85, 1.05, 1.08, 1.04, 1.0, 0.92, 0.8][new Date(dayTs).getUTCDay()];
      const spendDay = dailySpend * weekly * r.float(0.82, 1.12);
      spec.creatives.forEach((c, i) => {
        const spend = (spendDay * (c.share ?? 1)) / totalShare;
        const impressions = Math.round((spend / r.float(p.cpm[0], p.cpm[1])) * 1000);
        const clicks = draw(impressions * (p.ctr / 100) * c.ctr * r.float(0.85, 1.15));
        const leads = draw(clicks * p.lead * (c.lead ?? 1) * r.float(0.6, 1.4));
        stats.push({
          id: `ads_${spec.id.slice(4)}_${i + 1}_${clock.ymd(dayTs).replace(/-/g, "")}`,
          campaignId: spec.id,
          creativeId: creatives[i].id,
          date: clock.ymd(dayTs),
          spendCents: Math.round(spend * 100),
          impressions,
          clicks,
          leads,
        });
      });
    }

    campaigns.push({
      id: spec.id,
      ...stamps(ctx, startTs - 3 * DAY, clock.now - r.between(1, 20) * 3_600_000),
      name: spec.name,
      platform: spec.platform,
      externalId: spec.externalId,
      objective: spec.objective,
      status: spec.status,
      eventId: spec.eventCode ? evId(spec.eventCode) : undefined,
      audience: spec.audience,
      startAt: clock.iso(startTs),
      endAt: endTs ? clock.iso(endTs) : undefined,
      budgetCents: spec.budget * 100,
      dailyBudgetCents: spec.daily ? spec.daily * 100 : undefined,
      utmCampaign: spec.utm,
      landingUrl: spec.landing,
      creatives,
      ownerId: spec.owner,
      notes: spec.notes,
      lastSyncedAt: spec.externalId && spec.status !== "brouillon" ? clock.iso(clock.now - 3 * 3_600_000) : undefined,
    });
  }

  ctx.data.adCampaigns = campaigns;
  ctx.data.adStats = stats;
  ctx.data.experiments = buildExperiments(ctx);
  realignUtm(ctx, campaigns);
}

/**
 * Les utm_campaign des candidatures (seed/people.ts) sont tirées au hasard sur toute l'année :
 * on les recale sur la campagne réellement en ligne à la date de la candidature (celle de la
 * session visée d'abord, puis une campagne de marque de la même régie). Sans campagne payante
 * en cours, le lead redevient organique. Les autres modules du seed ne sont pas modifiés (nouvel
 * objet utm, flux aléatoire propre).
 */
function realignUtm(ctx: SeedContext, campaigns: AdCampaign[]): void {
  const r = ctx.rng.fork("marketing-utm");
  // La campagne B2B (entreprises) ne génère pas de candidatures individuelles.
  const live = campaigns.filter((c) => c.status !== "brouillon" && c.id !== "cmp_b2b_sprint");
  const window = (c: AdCampaign) => [Date.parse(c.startAt) - DAY, c.endAt ? Date.parse(c.endAt) + 30 * DAY : Infinity] as const;
  const pick = (platform: AdPlatform, ts: number, eventId?: string) => {
    const open = live.filter((c) => c.platform === platform && ts >= window(c)[0] && ts <= window(c)[1]);
    return open.find((c) => c.eventId && c.eventId === eventId) ?? (open.length ? r.pick(open) : undefined);
  };
  for (const app of ctx.data.applications) {
    const utm = app.utm;
    if (!utm?.campaign) continue;
    const ts = Date.parse(app.submittedAt);
    if (utm.source === "meta_ads") {
      const c = pick("meta", ts, app.eventId);
      app.utm = c ? { ...utm, campaign: c.utmCampaign, content: r.pick(c.creatives).externalId } : { source: "instagram", medium: "social", referrer: utm.referrer };
    } else if (utm.source === "linkedin") {
      const c = pick("linkedin", ts, app.eventId);
      app.utm = c ? { ...utm, source: "linkedin_ads", medium: "paid_social", campaign: c.utmCampaign } : { source: "linkedin", medium: "social", referrer: utm.referrer };
    } else if (utm.medium === "cpc") {
      app.utm = { ...utm, campaign: "search_marque" }; // Google Ads hors CRM : apparaît comme utm « non reliée »
    } else {
      app.utm = { source: utm.source, medium: utm.medium, referrer: utm.referrer }; // organique
    }
  }
  for (const sub of ctx.data.submissions) {
    const utm = sub.utm;
    if (!utm?.campaign || sub.type === "candidature" || utm.source !== "meta_ads") continue;
    const c = pick("meta", Date.parse(sub.receivedAt));
    sub.utm = c ? { ...utm, campaign: c.utmCampaign } : { source: "instagram", medium: "social", referrer: utm.referrer };
  }
}

function variant(key: string, name: string, description: string, extra: Partial<ExperimentVariant> = {}): ExperimentVariant {
  return { id: `var_${key.toLowerCase()}`, key, name, description, weight: 50, exposures: 0, conversions: 0, ...extra };
}

function buildExperiments(ctx: SeedContext): Experiment[] {
  const { clock } = ctx;
  const at = (d: number, h = 10) => clock.iso(clock.rel(d, h));
  const withStamps = (id: string, created: number, e: Omit<Experiment, "id" | "createdAt" | "updatedAt">): Experiment => ({ id, ...stamps(ctx, clock.rel(created, 9)), ...e });

  return [
    withStamps("abt_printemps_visuel", -156, {
      name: "Visuel : la villa ou le groupe au travail ?",
      key: "meta-printemps-visuel",
      hypothesis: "Montrer des participants en train de construire (preuve sociale) donne plus envie de cliquer que le lieu seul.",
      channel: "publicite",
      status: "termine",
      metric: "ctr",
      eventId: evId("SW-0008"),
      campaignId: "cmp_printemps26",
      variants: [
        variant("A", "Villa (contrôle)", "Visuel du lieu, accroche « 7 jours dans une villa »", { creativeId: "cmp_printemps26_cr1" }),
        variant("B", "Groupe au travail", "Photo d'une promo en atelier, accroche « Ils ont lancé leur MVP »", { creativeId: "cmp_printemps26_cr2" }),
      ],
      confidenceTarget: 95,
      minDetectableEffect: 20,
      startAt: at(-155, 9),
      endAt: at(-136, 23),
      winnerKey: "B",
      conclusion: "Le visuel « groupe au travail » l'emporte nettement : il devient la base des campagnes suivantes (Founder Edition, automne).",
      ownerId: U.aurelien,
    }),
    withStamps("abt_founder_accroche", -47, {
      name: "Accroche Founder Edition : témoignage ou prix barré ?",
      key: "meta-founder-accroche",
      hypothesis: "Afficher le prix barré (990 € au lieu de 1 290 €) augmente le taux de clic par rapport au témoignage vidéo.",
      channel: "publicite",
      status: "en_cours",
      metric: "ctr",
      eventId: evId("SW-0012"),
      campaignId: "cmp_oct26_founder",
      variants: [
        variant("A", "Témoignage vidéo (contrôle)", "Vidéo 20 s d'une alumni", { creativeId: "cmp_oct26_founder_cr1" }),
        variant("B", "Prix barré Founder", "Visuel prix barré + « dernières places »", { creativeId: "cmp_oct26_founder_cr2" }),
      ],
      confidenceTarget: 95,
      minDetectableEffect: 15,
      startAt: at(-46, 9),
      ownerId: U.aurelien,
    }),
    withStamps("abt_automne_creas", -13, {
      name: "Automne : villa, programme ou question directe ?",
      key: "meta-automne-creas",
      hypothesis: "Le carrousel « programme jour par jour » rassure et fait mieux cliquer que le visuel de la villa.",
      channel: "publicite",
      status: "en_cours",
      metric: "ctr",
      eventId: evId("SW-0011"),
      campaignId: "cmp_automne26",
      variants: [
        variant("A", "Villa + mer (contrôle)", "Visuel du lieu", { creativeId: "cmp_automne26_cr1", weight: 34 }),
        variant("B", "Planning jour par jour", "Carrousel J1 → J7", { creativeId: "cmp_automne26_cr2", weight: 33 }),
        variant("C", "Question directe", "« Ton idée mérite mieux qu'un fichier Notion »", { creativeId: "cmp_automne26_cr3", weight: 33 }),
      ],
      confidenceTarget: 95,
      minDetectableEffect: 20,
      startAt: at(-12, 9),
      ownerId: U.lea,
    }),
    withStamps("abt_hero_sw0012", -21, {
      name: "Page session en ligne : titre orienté résultat",
      key: "hero-sw0012",
      hypothesis: "Un titre qui promet le résultat (« Ton MVP en ligne en 7 jours ») convertit mieux que le titre descriptif actuel.",
      channel: "site",
      status: "en_cours",
      metric: "conversion",
      eventId: evId("SW-0012"),
      pageUrl: `${SITE}/sessions/en-ligne-octobre-2026`,
      variants: [
        variant("A", "Titre descriptif (contrôle)", "« StartupWeek en ligne — 5-12 octobre »", { exposures: 1842, conversions: 51 }),
        variant("B", "Titre résultat", "« Ton MVP en ligne en 7 jours — depuis chez toi »", { exposures: 1796, conversions: 68 }),
      ],
      confidenceTarget: 95,
      minDetectableEffect: 20,
      startAt: at(-20, 8),
      ownerId: U.aurelien,
    }),
    withStamps("abt_cta_candidature", -95, {
      name: "Bouton principal : « Candidater » ou « Réserver mon appel » ?",
      key: "cta-candidature",
      hypothesis: "Proposer un appel de découverte fait moins peur qu'une candidature et génère plus de leads qualifiés.",
      channel: "site",
      status: "termine",
      metric: "conversion",
      pageUrl: `${SITE}/`,
      variants: [
        variant("A", "« Candidater » (contrôle)", "Bouton vers le formulaire de candidature", { exposures: 5321, conversions: 122 }),
        variant("B", "« Réserver mon appel »", "Bouton vers la prise de rendez-vous (diagnostic)", { exposures: 5288, conversions: 176 }),
      ],
      confidenceTarget: 95,
      minDetectableEffect: 40,
      startAt: at(-94, 8),
      endAt: at(-60, 20),
      winnerKey: "B",
      conclusion: "« Réserver mon appel » retenu sur tout le site. À surveiller : la part de rendez-vous qui débouche sur une candidature complète.",
      ownerId: U.aurelien,
    }),
    withStamps("abt_newsletter_objet", -40, {
      name: "Objet de la newsletter de septembre",
      key: "newsletter-sept-objet",
      hypothesis: "Un objet chiffré (« 7 jours, 1 MVP ») est plus ouvert qu'une question.",
      channel: "email",
      status: "termine",
      metric: "ouverture",
      templateId: "tpl_newsletter",
      variants: [
        variant("A", "Question (contrôle)", "« Et si ton MVP était prêt en 7 jours ? »", { exposures: 1210, conversions: 460 }),
        variant("B", "Chiffre", "« 7 jours, 1 MVP : les dates d'automne »", { exposures: 1205, conversions: 498 }),
      ],
      confidenceTarget: 95,
      minDetectableEffect: 15,
      startAt: at(-38, 8),
      endAt: at(-36, 8),
      conclusion: "Écart trop faible pour conclure : on garde l'alternance question / chiffre et on teste plutôt l'heure d'envoi.",
      ownerId: U.lea,
    }),
    withStamps("abt_prix_barre_sw0013", -2, {
      name: "Split novembre : afficher le prix barré ?",
      key: "prix-barre-sw0013",
      hypothesis: "Sans session Founder, un prix barré « early bird » jusqu'au 15 octobre accélère les candidatures.",
      channel: "site",
      status: "brouillon",
      metric: "conversion",
      eventId: evId("SW-0013"),
      pageUrl: `${SITE}/sessions/split-novembre-2026`,
      variants: [variant("A", "Prix public (contrôle)", "2 900 €"), variant("B", "Prix early bird barré", "2 590 € au lieu de 2 900 € jusqu'au 15/10")],
      confidenceTarget: 95,
      minDetectableEffect: 25,
      ownerId: U.lea,
    }),
  ];
}
