/**
 * Contacts (B2B, candidats / participants / alumni, leads) et candidatures.
 *
 * La chronologie de chaque candidature (soumission → entretien → décision → acompte → solde → convocation → certificat)
 * est calculée ici avec son échéancier de paiement (`ctx.scratch.appPlans`), consommé ensuite par la facturation.
 * Règles : inscrites ≤ capacité ; participants d'une session = candidatures « inscrite » ; alumni = inscrits des sessions passées.
 */
import type {
  Application,
  ApplicationStatus,
  Contact,
  ContactLifecycle,
  EventSession,
  FundingSource,
  LeadSource,
  Persona,
  PaymentMethod,
  Utm,
} from "../../domain/types";
import { type AppPlan, type SeedContext, dayRel, stamps } from "./context";
import { DAY, HOUR, MIN, Rng, emailPart, pad, sortBy } from "./helpers";
import { AVAILABILITY, CITIES_FR, FIRST_F, FIRST_M, HEARD_FROM, INTERNATIONAL, JOBS, LAST, MOTIVATIONS } from "./names";
import { ORG } from "./organizations";
import { U } from "./team";
import { evId } from "./events";

/* ───────────────────────────── Générateur d'identités fictives ───────────────────────────── */

const DOMAINS: [string, number][] = [
  ["example.com", 5],
  ["example.fr", 3],
  ["example.org", 2],
];

class Identities {
  private names = new Set<string>();
  private emails = new Set<string>();
  constructor(private r: Rng) {}

  reserve(first: string, last: string) {
    this.names.add(`${first}|${last}`);
  }

  name(): { first: string; last: string; female: boolean } {
    for (let i = 0; i < 200; i++) {
      const female = this.r.chance(0.5);
      const first = this.r.pick(female ? FIRST_F : FIRST_M);
      const last = this.r.pick(LAST);
      const key = `${first}|${last}`;
      if (!this.names.has(key)) {
        this.names.add(key);
        return { first, last, female };
      }
    }
    throw new Error("[seed] vivier de noms épuisé");
  }

  email(first: string, last: string): string {
    const base = `${emailPart(first)}.${emailPart(last)}`;
    for (let n = 0; n < 50; n++) {
      const candidate = `${base}${n ? n + 1 : ""}@${this.r.weighted(DOMAINS)}`;
      if (!this.emails.has(candidate)) {
        this.emails.add(candidate);
        return candidate;
      }
    }
    throw new Error("[seed] email en double");
  }
}

/** Numéros fictifs : plage réservée à la fiction par l'ARCEP (06 39 98 xx xx). */
const fakePhone = (r: Rng) => `+33 6 39 98 ${r.digits(2)} ${r.digits(2)}`;

/* ───────────────────────────── Contacts B2B (organisations) ───────────────────────────── */

const B2B_CONTACTS: [orgId: string, first: string, last: string, job: string][] = [
  [ORG.epitech, "Nathalie", "Vasseur", "Directrice des programmes innovation"],
  [ORG.epitech, "Julien", "Aubry", "Responsable pédagogique — campus Lyon"],
  [ORG.epsi, "Cédric", "Maillard", "Responsable relations entreprises"],
  [ORG.ynov, "Sonia", "Bensaïd", "Directrice du campus de Bordeaux"],
  [ORG.ynov, "Axel", "Fleury", "Responsable vie étudiante"],
  [ORG.nextu, "Audrey", "Lecomte", "Directrice pédagogique"],
  [ORG.isegcom, "Maëlle", "Rolland", "Responsable événements & partenariats"],
  [ORG.xefi, "Franck", "Deschamps", "Directeur de l'académie"],
  [ORG.lyonStartUp, "Coralie", "Berger", "Directrice des programmes"],
  [ORG.lyonStartUp, "Malik", "Traoré", "Chargé de promotion"],
  [ORG.stationF, "Victoire", "Lemaire", "Program manager"],
  [ORG.bpifrance, "Hervé", "Colin", "Chargé d'affaires création"],
  [ORG.atlas, "Justine", "Picard", "Conseillère formation entreprises"],
  [ORG.akto, "Gaëtan", "Royer", "Conseiller entreprises"],
  [ORG.franceTravail, "Estelle", "Marty", "Conseillère emploi — création d'entreprise"],
  [ORG.riadMarrakech, "Karima", "Alaoui", "Gérante du riad"],
  [ORG.chaletAlpes, "Loïc", "Dupuy", "Propriétaire"],
  [ORG.domaineBordeaux, "Hélène", "Fabre", "Responsable séminaires"],
  [ORG.villaDeauville, "Agathe", "Huet", "Gérante"],
  [ORG.villaSplit, "Ivan", "Horvat", "Property manager"],
  [ORG.domaineSologne, "Grégory", "Barbier", "Directeur commercial"],
  [ORG.verdalys, "Isabelle", "Moulin", "Directrice innovation"],
  [ORG.verdalys, "Rémi", "Dufour", "DRH groupe"],
  [ORG.nexora, "Samir", "Cherif", "Head of Data & IA"],
  [ORG.batimax, "Nathan", "Guyot", "DRH"],
  [ORG.kalia, "Lina", "Pham", "CEO & co-fondatrice"],
  [ORG.orfeo, "Jonathan", "Renaud", "Directeur de la transformation"],
  [ORG.helix, "Aurore", "Lacroix", "Responsable Learning & Development"],
  [ORG.novatel, "Sophie", "Arnaud", "Responsable formation"],
  [ORG.cloudiva, "Tristan", "Hubert", "Head of Marketing"],
  [ORG.trajectoire, "Céline", "Rivière", "Fondatrice"],
  [ORG.journalFondateurs, "Noémie", "Carré", "Rédactrice en chef"],
  [ORG.horizonAngels, "Jeanne", "Poirier", "Présidente"],
  [ORG.seedlab, "Benjamin", "Kowalski", "Partner"],
  [ORG.valrive, "Damien", "Roche", "Chargé de mission entrepreneuriat"],
  [ORG.pixelune, "Zoé", "Bourgeois", "Directrice artistique"],
  [ORG.fabrique, "Paul", "Breton", "Directeur"],
  [ORG.solveo, "Estelle", "Brun", "Directrice de l'innovation"],
  [ORG.quantik, "Adrien", "Joly", "Co-fondateur"],
  [ORG.arvel, "Olivier", "Lemoine", "Directeur général délégué"],
];

/* ───────────────────────────── Plan des candidatures ───────────────────────────── */

/** Répartition des candidatures par session (ordre chronologique). */
const PLAN: [code: string, counts: [ApplicationStatus, number][]][] = [
  ["SW-0001", [["inscrite", 6], ["refusee", 1], ["desistee", 1], ["hors_cible", 1]]],
  ["SW-0002", [["inscrite", 7], ["refusee", 1], ["hors_cible", 1]]],
  ["SW-0003", [["inscrite", 6], ["desistee", 1], ["refusee", 1]]],
  ["SW-0004", [["inscrite", 8], ["hors_cible", 1]]],
  ["SW-0005", [["inscrite", 7], ["desistee", 1]]],
  ["SW-0006", [["inscrite", 6], ["refusee", 1]]],
  ["SW-0007", [["inscrite", 9], ["refusee", 1], ["hors_cible", 1]]],
  ["SW-0008", [["inscrite", 8], ["desistee", 1]]],
  ["SW-0009", [["inscrite", 10], ["liste_attente", 1], ["refusee", 1], ["hors_cible", 1]]],
  ["SW-0010", [["inscrite", 8], ["desistee", 1], ["refusee", 1]]],
  ["SW-0012", [["inscrite", 7], ["acceptee", 1], ["entretien", 1], ["qualifiee", 1], ["nouvelle", 1]]],
  ["SW-0011", [["inscrite", 5], ["acceptee", 1], ["entretien", 1], ["nouvelle", 1], ["refusee", 1], ["desistee", 1]]],
  ["SW-0014", [["inscrite", 3], ["acceptee", 1], ["entretien", 2], ["qualifiee", 2], ["nouvelle", 1], ["hors_cible", 1]]],
  ["SW-0013", [["inscrite", 2], ["acceptee", 1], ["entretien", 1], ["qualifiee", 1], ["nouvelle", 1]]],
  ["SW-0015", [["inscrite", 1], ["entretien", 1], ["qualifiee", 2], ["nouvelle", 1]]],
  ["SW-0016", [["entretien", 1], ["qualifiee", 1], ["nouvelle", 2]]],
  ["SW-0017", [["qualifiee", 1], ["nouvelle", 1]]],
  ["SW-0018", [["nouvelle", 1], ["hors_cible", 1]]],
  ["SW-0019", [["nouvelle", 1]]],
  ["SW-0020", [["qualifiee", 1], ["nouvelle", 1]]],
  ["SW-0021", [["nouvelle", 1]]],
  ["SW-0022", [["nouvelle", 1]]],
  ["SW-0023", [["nouvelle", 1]]],
];

const ACCESS_NEEDS: [needs: string, accommodations: string][] = [
  ["Mobilité réduite (fauteuil roulant)", "Lieu de plain-pied vérifié avec la villa, chambre adaptée au rez-de-chaussée, transferts en véhicule adapté."],
  ["Malentendance (appareillée)", "Sous-titrage automatique des sessions live, supports écrits envoyés la veille, micro-cravate pour les intervenants."],
  ["Dyslexie", "Supports en police adaptée et contrastée, consignes orales doublées à l'écrit, temps supplémentaire sur les exercices écrits."],
  ["Trouble du déficit de l'attention (TDAH)", "Planning détaillé communiqué à l'avance, pauses supplémentaires, mentor référent pour les points de suivi."],
];

interface Special {
  name?: [string, string, boolean]; // prénom, nom, féminin
  offerId?: string;
  funding?: FundingSource;
  payerOrgId?: string;
  funder?: { name: string; orgId: string; prefix: string };
  access?: number;
  reuse?: string; // clé d'une candidature antérieure du même contact
  balance?: "retard1" | "retard2" | "partielle";
  stale?: boolean; // candidature « nouvelle » oubliée (hors SLA 48 h)
}

/** Cas particuliers (clé = « code#statut#rang »). */
const SPECIAL: Record<string, Special> = {
  // Témoignages du site (Nelson C. — Next-Elec, Caroline B. — WePilot, Mathieu T. — DeltaConcept) : noms complets fictifs.
  "SW-0004#inscrite#0": { name: ["Nelson", "Charpentier", false] },
  "SW-0007#inscrite#0": { name: ["Caroline", "Blanchard", true] },
  "SW-0008#inscrite#0": { name: ["Mathieu", "Thibault", false] },
  // Offres premium
  "SW-0007#inscrite#1": { offerId: "off_residency" },
  "SW-0010#inscrite#0": { offerId: "off_sw_signature" },
  "SW-0011#inscrite#3": { offerId: "off_sw_signature" },
  "SW-0013#acceptee#0": { offerId: "off_sw_signature" },
  // Financements
  "SW-0004#inscrite#5": { funding: "entreprise", payerOrgId: ORG.novatel },
  "SW-0008#inscrite#3": { funding: "opco", payerOrgId: ORG.novatel, funder: { name: "OPCO Atlas", orgId: ORG.atlas, prefix: "ATL" } },
  "SW-0009#inscrite#4": { funding: "france_travail", funder: { name: "France Travail (AIF)", orgId: ORG.franceTravail, prefix: "AIF" } },
  "SW-0010#inscrite#2": { funding: "opco", funder: { name: "AKTO", orgId: ORG.akto, prefix: "AKT" } },
  "SW-0012#inscrite#5": { funding: "entreprise", payerOrgId: ORG.novatel },
  // Situations de handicap déclarées (ind. 26)
  "SW-0008#inscrite#4": { access: 0 },
  "SW-0009#inscrite#6": { access: 1 },
  "SW-0012#inscrite#1": { access: 2 },
  "SW-0011#inscrite#4": { access: 3 },
  // Même contact, nouvelle candidature
  "SW-0008#inscrite#7": { reuse: "SW-0003#refusee#0" }, // refusé(e) en janvier (projet trop tôt), revenu(e) en avril
  "SW-0012#inscrite#6": { reuse: "SW-0009#liste_attente#0" }, // liste d'attente juin → inscrit(e) en octobre
  "SW-0013#inscrite#0": { reuse: "SW-0010#desistee#0" }, // désisté(e) en septembre → reporté(e) en novembre
  // Soldes à J-30
  "SW-0011#inscrite#0": { balance: "retard1" },
  "SW-0011#inscrite#1": { balance: "retard2" },
  "SW-0012#inscrite#2": { balance: "partielle" },
  // Deux candidatures « nouvelle » restées sans réponse au-delà du SLA de 48 h.
  "SW-0012#nouvelle#0": { stale: true },
  "SW-0016#nouvelle#0": { stale: true },
};

const LEAD_STAGE: Record<ApplicationStatus, Application["leadStage"]> = {
  nouvelle: "capture",
  qualifiee: "qualification",
  entretien: "booking",
  acceptee: "booking",
  inscrite: "enrichment",
  liste_attente: "booking",
  refusee: "qualification",
  hors_cible: "out_of_scope",
  desistee: "booking",
};

const SCORE_RANGE: Record<ApplicationStatus, [number, number]> = {
  nouvelle: [30, 75],
  qualifiee: [50, 80],
  entretien: [60, 85],
  acceptee: [70, 90],
  inscrite: [68, 96],
  liste_attente: [62, 78],
  refusee: [25, 55],
  hors_cible: [5, 28],
  desistee: [60, 85],
};

const CAMPAIGNS = ["sw_oct26_founder", "sw_automne26", "retargeting_dsk", "webinaire_mvp", "sw_printemps26", "lookalike_alumni"];

function utmFor(r: Rng, source: LeadSource): Utm | undefined {
  if (source === "site_candidature" || source === "digital_starter_kit") {
    const channel = r.weighted([
      ["meta_ads", 40],
      ["instagram", 20],
      ["google", 20],
      ["linkedin", 12],
      ["direct", 8],
    ] as const);
    if (channel === "direct") return undefined;
    const medium = channel === "meta_ads" ? "paid_social" : channel === "google" ? r.pick(["cpc", "organic"]) : "social";
    const referrer = { meta_ads: "https://www.facebook.com/", instagram: "https://www.instagram.com/", google: "https://www.google.com/", linkedin: "https://www.linkedin.com/" }[channel];
    return { source: channel, medium, campaign: medium === "organic" ? undefined : r.pick(CAMPAIGNS), referrer };
  }
  if (source === "linkedin") return { source: "linkedin", medium: "social", referrer: "https://www.linkedin.com/" };
  if (source === "instagram") return { source: "instagram", medium: "social", referrer: "https://www.instagram.com/" };
  if (source === "newsletter") return { source: "newsletter", medium: "email", campaign: "newsletter_mensuelle" };
  return undefined;
}

interface Draft {
  key: string;
  event: EventSession;
  status: ApplicationStatus;
  contact: Contact;
  persona: Persona;
  special: Special;
  app: Omit<Application, "id" | "number" | "createdAt" | "updatedAt">;
  submittedTs: number;
  updatedTs: number;
  plan?: AppPlan;
}

/* ───────────────────────────── Construction ───────────────────────────── */

export function buildPeople(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("people");
  const ids = new Identities(r);
  const contacts: Contact[] = [];
  let seq = 0;
  const nextContactId = () => `ct_${pad(++seq)}`;

  // Réserve les noms imposés pour éviter les homonymes.
  for (const [, first, last] of B2B_CONTACTS) ids.reserve(first, last);
  for (const s of Object.values(SPECIAL)) if (s.name) ids.reserve(s.name[0], s.name[1]);
  for (const [first, last] of INTERNATIONAL) ids.reserve(first, last);

  /* ── 1. Contacts B2B ── */
  for (const [orgId, first, last, job] of B2B_CONTACTS) {
    const org = ctx.data.organizations.find((o) => o.id === orgId)!;
    const created = Date.parse(org.createdAt) + r.between(0, 3) * DAY;
    const lifecycle: ContactLifecycle = org.status === "client" ? "client" : org.status === "partenaire" ? "partenaire" : "prospect";
    const source: LeadSource =
      org.type === "ecole" ? r.pick(["site_entreprise", "linkedin", "evenement"] as const)
      : org.type === "incubateur" || org.type === "media" ? "site_partenariat"
      : org.type === "entreprise" ? r.pick(["site_entreprise", "linkedin", "recommandation"] as const)
      : org.type === "investisseur" ? "evenement"
      : "autre";
    const marketing = r.chance(0.45);
    contacts.push({
      id: nextContactId(),
      ...stamps(ctx, created, clock.now - r.between(1, 40) * DAY),
      firstName: first,
      lastName: last,
      email: ids.email(first, last),
      phone: org.country === "France" ? fakePhone(r) : undefined,
      city: org.city,
      country: org.country,
      jobTitle: job,
      orgId,
      lifecycle,
      source,
      tags: [...(org.type === "investisseur" ? ["Investor"] : []), ...(org.status === "client" ? ["VIP"] : []), ...(marketing ? ["Newsletter"] : [])],
      ownerId: org.ownerId,
      consent: { gdpr: true, marketing, marketingAt: marketing ? clock.iso(clock.past(created)) : undefined, source: "Formulaire du site / échange commercial" },
      score: lifecycle === "client" ? r.between(70, 95) : lifecycle === "partenaire" ? r.between(55, 85) : r.between(25, 65),
      lastContactAt: clock.iso(clock.now - r.between(1, 45) * DAY - r.between(1, 9) * HOUR),
    });
  }

  /* ── 2. Candidats / participants / alumni + candidatures ── */
  const drafts: Draft[] = [];
  const byKey = new Map<string, Draft>();
  const plans = ctx.scratch.appPlans;

  const at = (day: number, hMin = 8, hMax = 22) => clock.rel(day, r.between(hMin, hMax), r.pick([0, 5, 10, 15, 20, 30, 40, 45, 50]));

  for (const [code, counts] of PLAN) {
    const event = ctx.data.events.find((e) => e.id === evId(code))!;
    const S = Date.parse(event.startAt);
    const E = Date.parse(event.endAt);
    const sDay = dayRel(ctx, S);
    const eDay = dayRel(ctx, E);
    const createdDay = dayRel(ctx, Date.parse(event.createdAt));
    const past = S < clock.now;
    const defaultOffer = event.mode === "distanciel" ? "off_sw_distanciel" : "off_sw_presentiel";

    for (const [status, n] of counts) {
      for (let idx = 0; idx < n; idx++) {
        const key = `${code}#${status}#${idx}`;
        const special = SPECIAL[key] ?? {};
        const persona: Persona = r.weighted([
          ["tech", 40],
          ["non_tech", 45],
          ["reconversion", 15],
        ] as const);

        /* Chronologie (jours relatifs à aujourd'hui) */
        let subDay: number;
        let submittedTs: number;
        let interviewTs: number | undefined;
        let decisionTs: number | undefined;
        let plan: AppPlan | undefined;
        const offerId = special.offerId ?? defaultOffer;
        const priceCents = offerId === "off_sw_signature" ? 449000 : offerId === "off_residency" ? 890000 : event.priceCents;
        const funding: FundingSource = special.funding ?? "personnel";
        const method: PaymentMethod = special.funder ? "opco" : special.payerOrgId ? "virement" : r.chance(0.65) ? "stripe" : "virement";

        if (past) {
          subDay = Math.max(sDay - r.between(25, 80), createdDay + 1);
          submittedTs = at(subDay);
          const interviewDay = subDay + r.between(2, 6);
          if (status !== "hors_cible" && !(status === "refusee" && r.chance(0.5))) interviewTs = clock.rel(interviewDay, r.pick([10, 11, 14, 15, 16, 17, 18]), r.pick([0, 30]));
          decisionTs = status === "hors_cible" ? at(subDay + r.between(1, 3), 9, 19) : at((interviewTs ? interviewDay : subDay) + r.between(1, 3), 9, 19);
        } else {
          // Sessions à venir : fenêtres de soumission selon l'avancement.
          const window: Record<ApplicationStatus, [number, number]> = {
            inscrite: [16, 75],
            desistee: [55, 70],
            acceptee: [6, 20],
            entretien: [3, 12],
            qualifiee: [2, 15],
            refusee: [8, 40],
            hors_cible: [3, 30],
            liste_attente: [10, 30],
            nouvelle: [0, 0],
          };
          // Soldes en retard / partiels : inscriptions anciennes (solde émis à J-45, relances déjà parties).
          const [a, b] = special.balance ? [45, 70] : window[status];
          // Jamais avant la création de la session ni plus de 5 mois avant son début ; toujours dans le passé.
          subDay = Math.min(Math.max(-r.between(a, b), createdDay + 1, sDay - 150), -1);
          submittedTs = status === "nouvelle" ? clock.ago((special.stale ? r.between(100, 130) : r.between(1, 68)) * HOUR + r.between(0, 59) * MIN) : at(subDay);
          if (status === "inscrite" || status === "desistee") {
            const interviewDay = subDay + r.between(2, 4);
            interviewTs = clock.rel(interviewDay, r.pick([10, 11, 14, 17, 18]), r.pick([0, 30]));
            decisionTs = at(interviewDay + r.between(1, 2), 9, 19);
          } else if (status === "acceptee") {
            const decisionDay = -r.between(1, 4);
            interviewTs = clock.rel(Math.min(subDay + 2, decisionDay - 1), r.pick([11, 15, 18]), 0);
            decisionTs = at(decisionDay, 9, 12);
          } else if (status === "entretien") {
            interviewTs = r.chance(0.7) ? clock.rel(r.between(1, 6), r.pick([10, 11, 14, 16, 18]), r.pick([0, 30])) : clock.rel(-1, 17, 30);
          } else if (status === "refusee" || status === "hors_cible") {
            decisionTs = at(subDay + r.between(1, 4), 9, 19);
          }
        }

        /* Échéancier de paiement (inscrites, acceptées, désistée remboursée) */
        if (status === "inscrite" || status === "acceptee" || (status === "desistee" && !past)) {
          plan = { priceCents, method, funding, payerOrgId: special.payerOrgId };
          if (special.funder) {
            // Financeur en subrogation : facture unique après accord de prise en charge, réglée après la session.
            const issued = clock.rel(sDay - r.between(15, 20), 10, 0);
            const paid = clock.rel(eDay + r.between(20, 40), 11, 0);
            plan.funder = { name: special.funder.name, orgId: special.funder.orgId, agreementRef: `${special.funder.prefix}-2026-${r.digits(6)}` };
            plan.single = { issuedTs: issued, dueTs: clock.rel(eDay + 30, 12, 0), paidTs: paid < clock.now - DAY ? paid : undefined };
          } else {
            const depIssued = decisionTs! + 5 * MIN;
            const depPaid = status === "acceptee" ? undefined : clock.past(depIssued + r.between(1, 60) * HOUR, HOUR);
            plan.deposit = { issuedTs: depIssued, dueTs: depIssued + 7 * DAY, paidTs: depPaid };
            if (status === "inscrite") {
              const balIssued = Math.max(depPaid! + 2 * HOUR, clock.rel(sDay - 45, 9, 0));
              if (balIssued <= clock.now) {
                const j30 = clock.rel(sDay - 30, 12, 0);
                const due = balIssued < j30 ? j30 : balIssued + 5 * DAY;
                const bal: NonNullable<AppPlan["balance"]> = { issuedTs: balIssued, dueTs: due, reminders: 0 };
                if (special.balance === "retard1" || special.balance === "retard2") {
                  bal.reminders = special.balance === "retard1" ? 1 : 2;
                  bal.lastReminderTs = clock.past(balIssued + (bal.reminders === 1 ? 3 : 10) * DAY + 9 * HOUR);
                } else if (special.balance === "partielle") {
                  bal.partialCents = Math.round((priceCents - Math.round(priceCents * 0.3)) / 2);
                  bal.paidTs = clock.past(balIssued + 2 * DAY + 3 * HOUR);
                  bal.reminders = 1;
                  bal.lastReminderTs = clock.past(due + 3 * DAY + 9 * HOUR);
                } else if (due <= clock.now) {
                  if (past && r.chance(0.15)) {
                    // Solde réglé en retard après une relance (toujours avant la session).
                    bal.paidTs = Math.min(due + r.between(1, 5) * DAY + r.between(1, 8) * HOUR, S - 2 * DAY);
                    bal.reminders = 1;
                    bal.lastReminderTs = Math.min(due + DAY + 9 * HOUR, bal.paidTs - HOUR);
                  } else {
                    bal.paidTs = Math.max(balIssued + 3 * HOUR, due - r.between(0, 10) * DAY - r.between(1, 10) * HOUR);
                  }
                } else if (r.chance(0.5)) {
                  bal.paidTs = clock.past(balIssued + r.between(1, 5) * DAY + r.between(1, 8) * HOUR, HOUR);
                }
                plan.balance = bal;
              }
            }
            if (status === "desistee") {
              // Désistement plus de 30 jours avant la session : acompte remboursé par avoir.
              const avoirTs = clock.rel(-r.between(8, 12), 10, 30);
              plan.refund = { avoirTs, refundTs: avoirTs + 2 * DAY };
            }
          }
        }

        /* Contact (nouveau ou réutilisé) */
        let contact: Contact;
        const reused = special.reuse ? byKey.get(special.reuse) : undefined;
        if (reused) {
          contact = reused.contact;
        } else {
          const intl = !special.name && r.chance(0.08) ? INTERNATIONAL.find((p) => !contacts.some((c) => c.firstName === p[0] && c.lastName === p[1])) : undefined;
          const who = special.name ? { first: special.name[0], last: special.name[1], female: special.name[2] } : intl ? { first: intl[0], last: intl[1], female: false } : ids.name();
          const source: LeadSource = code <= "SW-0003" && r.chance(0.5)
            ? "import_airtable"
            : r.weighted([
                ["site_candidature", 70],
                ["digital_starter_kit", 10],
                ["recommandation", 7],
                ["linkedin", 5],
                ["instagram", 4],
                ["newsletter", 3],
                ["ecole", 1],
              ] as const);
          const created = source === "digital_starter_kit" || source === "newsletter" ? submittedTs - r.between(12, 60) * DAY : submittedTs;
          const marketing = r.chance(0.65);
          const age = persona === "reconversion" ? r.between(32, 54) : persona === "tech" ? r.between(24, 45) : r.between(22, 58);
          contact = {
            id: nextContactId(),
            ...stamps(ctx, created, submittedTs),
            firstName: who.first,
            lastName: who.last,
            email: ids.email(who.first, who.last),
            phone: intl ? undefined : fakePhone(r),
            city: intl ? intl[2] : r.pick(CITIES_FR),
            country: intl ? intl[3] : "France",
            age,
            jobTitle: r.pick(JOBS[persona]),
            orgId: special.payerOrgId,
            lifecycle: "candidat",
            source,
            utm: utmFor(r, source),
            tags: [...(source === "digital_starter_kit" ? ["Digital Starter Kit"] : []), ...(marketing ? ["Newsletter"] : [])],
            ownerId: r.chance(0.7) ? U.lea : U.aurelien,
            consent: {
              gdpr: true,
              marketing,
              marketingAt: marketing ? clock.iso(clock.past(created)) : undefined,
              source: source === "digital_starter_kit" ? "Formulaire Digital Starter Kit" : "Formulaire de candidature (case newsletter)",
            },
            score: 0,
          };
          contacts.push(contact);
        }

        const [sMin, sMax] = SCORE_RANGE[status];
        const score = r.between(sMin, sMax);
        const parts = splitScore(r, score);
        const access = special.access !== undefined ? ACCESS_NEEDS[special.access] : undefined;
        const budget = special.funder || special.payerOrgId
          ? "finance"
          : status === "hors_cible"
            ? "moins-990"
            : priceCents >= 890000
              ? "plus-6000"
              : priceCents >= 400000
                ? "3000-6000"
                : priceCents >= 150000
                  ? r.chance(0.8) ? "1500-3000" : "3000-6000"
                  : r.chance(0.75) ? "990-1500" : "1500-3000";
        const realized = status === "inscrite";
        const positioned = realized && (!past || code >= "SW-0006");

        const app: Draft["app"] = {
          eventId: event.id,
          contactId: contact.id,
          offerId,
          status,
          leadStage: LEAD_STAGE[status],
          intent: (status === "nouvelle" || status === "qualifiee" || status === "entretien") && r.chance(0.15) ? "diagnostic" : "candidature",
          persona,
          submittedAt: clock.iso(submittedTs),
          reviewerId: status === "nouvelle" ? undefined : access ? U.claire : r.chance(0.6) ? U.lea : U.aurelien,
          score,
          scoreDetail: parts,
          motivation: r.pick(MOTIVATIONS[persona]),
          entrepreneurialXp: r.weighted(persona === "reconversion" ? ([["aucune", 5], ["premiere", 4], ["quelques", 1]] as const) : ([["aucune", 3], ["premiere", 4], ["quelques", 3], ["experimente", 1], ["serial", 0.3]] as const)),
          technicalXp: r.weighted(persona === "tech" ? ([["intermediaire", 3], ["avance", 4], ["expert", 2]] as const) : ([["debutant", 5], ["basique", 4], ["intermediaire", 1]] as const)),
          availability: r.pick(AVAILABILITY),
          budget,
          heardFrom: r.pick(HEARD_FROM),
          interviewAt: interviewTs ? clock.iso(interviewTs) : undefined,
          decisionAt: decisionTs ? clock.iso(clock.past(decisionTs)) : undefined,
          funding,
          funderName: special.funder?.name,
          needsAnalysisDone: ["inscrite", "acceptee", "entretien", "liste_attente", "desistee", "refusee"].includes(status) || (status === "qualifiee" && r.chance(0.5)),
          positioningScore: positioned || (status === "acceptee" && r.chance(0.5)) ? r.between(3, 9) : undefined,
          prerequisitesOk: status !== "hors_cible" && status !== "nouvelle",
          accessibilityNeeds: access?.[0],
          accommodations: access?.[1],
          convocationSentAt: realized && (past || sDay <= 10) ? clock.iso(clock.past(clock.rel(sDay - (past ? r.between(7, 10) : 10), 10, r.pick([0, 15, 30])))) : undefined,
          agreementSignedAt: realized ? clock.iso((plan?.deposit?.paidTs ?? plan?.single?.issuedTs ?? decisionTs!) + 20 * MIN) : undefined,
          certificateIssuedAt: realized && past ? clock.iso(clock.past(clock.rel(eDay + r.between(1, 4), 11, 0))) : undefined,
          amountDueCents: status === "inscrite" || status === "acceptee" ? priceCents : 0,
          amountPaidCents: 0, // renseigné par la facturation
          idempotencyKey: `lead_${r.alnum(12)}`,
          utm: contact.utm,
        };

        const lastTs = Math.max(submittedTs, decisionTs ?? 0, plan?.deposit?.paidTs ?? 0, plan?.balance?.paidTs ?? 0, plan?.refund?.refundTs ?? 0);
        const draft: Draft = { key, event, status, contact, persona, special, app, submittedTs, updatedTs: clock.past(lastTs), plan };
        drafts.push(draft);
        byKey.set(key, draft);
      }
    }
  }

  /* Numérotation #1…#N par date de soumission, identifiants stables. */
  const ordered = sortBy(drafts, (d) => d.submittedTs);
  ctx.data.applications = ordered.map((d, i) => {
    const number = i + 1;
    const id = `app_${pad(number)}`;
    if (d.plan) plans.set(id, d.plan);
    return { id, number, ...stamps(ctx, d.submittedTs, d.updatedTs), ...d.app };
  });

  /* Cycle de vie des contacts candidats d'après leur candidature la plus récente. */
  for (const c of contacts) {
    const apps = ctx.data.applications.filter((a) => a.contactId === c.id);
    if (!apps.length) continue;
    const rank = (a: Application) => {
      const ev = ctx.data.events.find((e) => e.id === a.eventId)!;
      return Date.parse(ev.startAt);
    };
    const latest = sortBy(apps, rank).at(-1)!;
    const ev = ctx.data.events.find((e) => e.id === latest.eventId)!;
    const pastEv = Date.parse(ev.startAt) < clock.now;
    const everAlumni = apps.some((a) => a.status === "inscrite" && Date.parse(ctx.data.events.find((e) => e.id === a.eventId)!.startAt) < clock.now);
    let lifecycle: ContactLifecycle;
    if (latest.status === "inscrite") lifecycle = pastEv ? "alumni" : "participant";
    else if (everAlumni) lifecycle = "alumni";
    else if (["nouvelle", "qualifiee", "entretien", "acceptee", "liste_attente"].includes(latest.status)) lifecycle = pastEv ? "prospect" : "candidat";
    else if (latest.status === "hors_cible") lifecycle = "lead";
    else lifecycle = "prospect";
    c.lifecycle = lifecycle;
    if (lifecycle === "alumni") c.tags = uniq([...c.tags, "Startup Founder", "Event Attendee"]);
    if (lifecycle === "participant") c.tags = uniq([...c.tags, "Startup Founder"]);
    const best = Math.max(...apps.map((a) => a.score));
    c.score = Math.min(100, lifecycle === "alumni" ? best + r.between(0, 8) : lifecycle === "participant" ? best + r.between(0, 5) : Math.round(best * 0.8));
    const lastTs = Math.max(...apps.map((a) => Date.parse(a.updatedAt)));
    c.lastContactAt = clock.iso(lastTs);
    c.updatedAt = clock.iso(Math.max(Date.parse(c.updatedAt), lastTs));
  }

  // Quelques désinscriptions (droit d'opposition) et contacts VIP.
  const alumni = contacts.filter((c) => c.lifecycle === "alumni");
  for (const c of r.pickN(alumni, 3)) {
    c.consent = { ...c.consent, marketing: false, unsubscribedAt: clock.iso(clock.now - r.between(5, 90) * DAY) };
    c.tags = c.tags.filter((t) => t !== "Newsletter");
  }
  for (const c of r.pickN(alumni.filter((c) => c.consent.marketing), 5)) c.tags = uniq([...c.tags, "VIP"]);

  /* ── 3. Leads (Digital Starter Kit, newsletter, formulaire de contact) ── */
  const leadSpecs: [LeadSource, ContactLifecycle, string[]][] = [
    ...Array.from({ length: 8 }, () => ["digital_starter_kit", "lead", ["Digital Starter Kit"]] as [LeadSource, ContactLifecycle, string[]]),
    ...Array.from({ length: 4 }, () => ["newsletter", "lead", ["Newsletter"]] as [LeadSource, ContactLifecycle, string[]]),
    ...Array.from({ length: 3 }, () => ["site_contact", "prospect", []] as [LeadSource, ContactLifecycle, string[]]),
    ["site_accompagnement", "prospect", []],
    ["site_accompagnement", "prospect", []],
    ["instagram", "lead", ["Newsletter"]],
  ];
  for (const [source, lifecycle, tags] of leadSpecs) {
    const who = ids.name();
    const created = clock.now - r.between(1, 118) * DAY - r.between(0, 20) * HOUR;
    const marketing = source === "newsletter" || source === "digital_starter_kit" ? r.chance(0.85) : r.chance(0.4);
    contacts.push({
      id: nextContactId(),
      ...stamps(ctx, created, created + r.between(0, 10) * DAY),
      firstName: who.first,
      lastName: who.last,
      email: ids.email(who.first, who.last),
      phone: r.chance(0.5) ? fakePhone(r) : undefined,
      city: r.pick(CITIES_FR),
      country: "France",
      lifecycle,
      source,
      utm: utmFor(r, source),
      tags: uniq([...tags, ...(marketing ? ["Newsletter"] : [])]),
      ownerId: lifecycle === "prospect" ? U.lea : undefined,
      consent: {
        gdpr: true,
        marketing,
        marketingAt: marketing ? clock.iso(clock.past(created)) : undefined,
        source: source === "digital_starter_kit" ? "Formulaire Digital Starter Kit" : source === "newsletter" ? "Inscription newsletter (double opt-in)" : "Formulaire du site",
      },
      score: source === "digital_starter_kit" ? r.between(20, 55) : r.between(10, 45),
      lastContactAt: clock.iso(clock.past(created + r.between(0, 12) * DAY)),
    });
  }
  // Un lead désinscrit de la newsletter.
  const unsub = contacts.find((c) => c.source === "newsletter")!;
  unsub.consent = { ...unsub.consent, marketing: false, unsubscribedAt: clock.iso(clock.now - 6 * DAY - 3 * HOUR) };
  unsub.tags = unsub.tags.filter((t) => t !== "Newsletter");

  ctx.data.contacts = contacts;
}

function splitScore(r: Rng, score: number): Application["scoreDetail"] {
  // Répartit le score (0-100) en 4 sous-scores de 0 à 25.
  const parts = [0, 0, 0, 0];
  let rest = score;
  for (let i = 0; i < 4; i++) {
    const remainingSlots = 3 - i;
    const min = Math.max(0, rest - remainingSlots * 25);
    const max = Math.min(25, rest);
    const v = i === 3 ? rest : r.between(min, Math.max(min, Math.min(max, Math.round(rest / (4 - i)) + 4)));
    parts[i] = v;
    rest -= v;
  }
  return { motivation: parts[0], projet: parts[1], disponibilite: parts[2], adequation: parts[3] };
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

/** Premier contact rattaché à une organisation (interlocuteur principal). */
export function mainContactOf(ctx: SeedContext, orgId: string): string {
  const c = ctx.data.contacts.find((x) => x.orgId === orgId && x.lifecycle !== "candidat" && x.lifecycle !== "participant" && x.lifecycle !== "alumni");
  if (!c) throw new Error(`[seed] aucun contact pour ${orgId}`);
  return c.id;
}
