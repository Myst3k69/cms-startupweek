/**
 * Intervenants et sessions (StartupWeek réelles issues d'Airtable, sessions passées,
 * Startup Village écoles, Innovation Sprint entreprise, webinaires gratuits).
 */
import type { EventKind, EventMode, EventSession, EventStatus, ProgramSlot, Region, Speaker } from "../../domain/types";
import { type SeedContext, stamps } from "./context";
import { DAY } from "./helpers";
import { ORG } from "./organizations";

/* ───────────────────────────── Intervenants ───────────────────────────── */

export const SPK = {
  aurelien: "spk_aurelien",
  karim: "spk_karim",
  julie: "spk_julie",
  thomas: "spk_thomas",
  amina: "spk_amina",
  victor: "spk_victor",
  sofia: "spk_sofia",
  antoine: "spk_antoine",
  elise: "spk_elise",
  david: "spk_david",
  hannah: "spk_hannah",
  yanis: "spk_yanis",
  margaux: "spk_margaux",
} as const;

type SpeakerSpec = Omit<Speaker, "id" | "createdAt" | "updatedAt" | "lastTrainingAt"> & { id: string; since: string; lastTraining?: string };

const SPEAKERS: SpeakerSpec[] = [
  { id: SPK.aurelien, firstName: "Aurélien", lastName: "Chiren", email: "aurelien.chiren@example.fr", kind: "formateur", expertise: ["Stratégie produit", "MVP", "Pitch", "Animation de bootcamp"], bio: "Fondateur de StartupWeek. Accompagne des porteurs de projet de l'idée au MVP en 7 jours ; anime les kick-off, les points d'étape et les roadmaps post-MVP.", cvOnFile: true, lastTraining: "2026-05-14", qualifications: ["Fondateur de plusieurs produits digitaux", "Facilitateur Design Sprint"], rating: 4.8, contractType: "salarie", city: "Paris", since: "2025-06-02" },
  { id: SPK.karim, firstName: "Karim", lastName: "Haddad", email: "karim.haddad@example.fr", kind: "formateur", expertise: ["No-code", "Bubble", "Automatisations n8n / Make", "IA générative"], bio: "Formateur-mentor no-code & IA. Ex-développeur full-stack, il a livré plus de 60 MVP no-code pour des startups et PME.", cvOnFile: true, lastTraining: "2026-06-20", qualifications: ["Bubble Certified Developer", "Titre RNCP Concepteur développeur d'applications"], rating: 4.7, contractType: "salarie", city: "Lyon", since: "2025-09-15" },
  { id: SPK.julie, firstName: "Julie", lastName: "Marchand", email: "julie.marchand@example.org", kind: "formateur", expertise: ["Product management", "Discovery", "Tests utilisateurs"], bio: "Product manager freelance (10 ans en scale-up). Anime le scope MVP et les tests utilisateurs.", dailyRateCents: 65000, cvOnFile: true, lastTraining: "2026-02-10", qualifications: ["Certification Product Owner (PSPO I)", "Master école de commerce"], rating: 4.9, contractType: "freelance", city: "Paris", since: "2025-09-20" },
  { id: SPK.thomas, firstName: "Thomas", lastName: "Nguyen", email: "thomas.nguyen@example.org", kind: "formateur", expertise: ["Webflow", "Supabase", "Airtable", "Bubble"], bio: "Développeur no-code / low-code, spécialiste des back-offices Supabase et Airtable.", dailyRateCents: 60000, cvOnFile: true, lastTraining: "2025-11-08", qualifications: ["Webflow Expert", "Supabase certified"], rating: 4.6, contractType: "freelance", city: "Bordeaux", since: "2025-10-01" },
  { id: SPK.amina, firstName: "Amina", lastName: "Diallo", email: "amina.diallo@example.org", kind: "coach", expertise: ["Pitch", "Prise de parole", "Storytelling"], bio: "Coach pitch et prise de parole, ancienne journaliste radio. Prépare les démos finales.", dailyRateCents: 70000, cvOnFile: true, lastTraining: "2026-03-18", qualifications: ["Coach certifiée RNCP", "Formatrice prise de parole"], rating: 4.8, contractType: "freelance", city: "Paris", since: "2025-10-10" },
  { id: SPK.victor, firstName: "Victor", lastName: "Lambert", email: "victor.lambert@example.org", kind: "mentor", expertise: ["Growth", "Meta Ads", "Landing pages", "Acquisition"], bio: "Growth marketer, ex-head of growth d'une app grand public. Anime la journée landing & acquisition.", dailyRateCents: 80000, cvOnFile: false, qualifications: ["Meta Blueprint"], rating: 4.4, contractType: "freelance", city: "Marseille", since: "2026-04-15" },
  { id: SPK.sofia, firstName: "Sofia", lastName: "Martínez", email: "sofia.martinez@example.org", kind: "expert", expertise: ["UX/UI", "Figma", "Design system"], bio: "Product designer basée à Barcelone, intervient en français, anglais et espagnol sur le maquettage.", dailyRateCents: 60000, cvOnFile: true, lastTraining: "2026-01-22", qualifications: ["Master design d'interaction", "Figma Community Advocate"], rating: 4.7, contractType: "freelance", city: "Barcelone", since: "2025-10-05" },
  { id: SPK.antoine, firstName: "Antoine", lastName: "Mercier", email: "antoine.mercier@example.org", kind: "expert", expertise: ["Finance", "Levée de fonds", "Prêts d'honneur", "BPI"], bio: "Ancien chargé d'affaires en capital-risque, accompagne le modèle financier et la stratégie de financement.", dailyRateCents: 90000, cvOnFile: true, lastTraining: "2025-06-30", qualifications: ["DSCG", "Ex-analyste VC"], rating: 4.5, contractType: "freelance", city: "Paris", since: "2025-11-01" },
  { id: SPK.elise, firstName: "Élise", lastName: "Caron", email: "elise.caron@example.org", kind: "jury", expertise: ["Business angel", "SaaS B2B", "Go-to-market"], bio: "Business angel (réseau Horizon Angels), membre du jury des Démo Days.", cvOnFile: false, qualifications: ["Fondatrice d'un SaaS revendu en 2021"], rating: 4.6, contractType: "benevole", city: "Paris", since: "2026-01-15" },
  { id: SPK.david, firstName: "David", lastName: "Cohen", email: "david.cohen@example.org", kind: "mentor", expertise: ["SaaS B2B", "Pricing", "Vente"], bio: "Serial entrepreneur SaaS, mentor sur le pricing et les premières ventes B2B.", dailyRateCents: 75000, cvOnFile: true, lastTraining: "2026-04-02", qualifications: ["3 SaaS B2B fondés", "Mentor réseau d'accélération"], rating: 4.6, contractType: "freelance", city: "Lille", since: "2025-12-01" },
  { id: SPK.hannah, firstName: "Hannah", lastName: "Schmidt", email: "hannah.schmidt@example.org", kind: "mentor", expertise: ["IA générative", "LLM", "Agents IA", "Prompt engineering"], bio: "Ingénieure IA basée à Berlin, spécialiste des agents et de l'intégration des LLM dans les produits.", dailyRateCents: 85000, cvOnFile: true, lastTraining: "2026-08-28", qualifications: ["MSc Machine Learning", "Formatrice IA générative"], rating: 4.9, contractType: "freelance", city: "Berlin", since: "2026-02-01" },
  { id: SPK.yanis, firstName: "Yanis", lastName: "Belkacem", email: "yanis.belkacem@example.org", kind: "coach", expertise: ["Posture entrepreneuriale", "Gestion du stress", "Organisation"], bio: "Coach de dirigeants, anime les ateliers posture et prévention de l'épuisement.", dailyRateCents: 55000, cvOnFile: true, lastTraining: "2025-09-12", qualifications: ["Coach certifié ICF (ACC)"], rating: 4.5, contractType: "freelance", city: "Nantes", since: "2026-01-05" },
  { id: SPK.margaux, firstName: "Margaux", lastName: "Petit", email: "margaux.petit@example.org", kind: "formateur", expertise: ["Copywriting", "Landing pages", "Webflow"], bio: "Copywriter et conceptrice de landing pages orientées conversion.", dailyRateCents: 55000, cvOnFile: true, lastTraining: "2026-05-06", qualifications: ["Formation copywriting CRO"], rating: 4.6, contractType: "freelance", city: "Rennes", since: "2025-11-20" },
];

export function buildSpeakers(ctx: SeedContext): void {
  const { clock } = ctx;
  ctx.data.speakers = SPEAKERS.map(({ since, lastTraining, ...rest }) => ({
    ...rest,
    ...stamps(ctx, clock.real(since), clock.rel(-ctx.rng.between(3, 60))),
    lastTrainingAt: lastTraining ? clock.iso(clock.real(lastTraining)) : undefined,
  }));
}

/* ───────────────────────────── Programme pédagogique ───────────────────────────── */

type Role = "host" | "product" | "nocode" | "ux" | "ia" | "growth" | "pitch" | "mentor" | "jury";
interface SlotTpl {
  day: number;
  start: string;
  end: string;
  title: string;
  role: Role;
}

/** Bootcamp StartupWeek : 7 jours, 3 créneaux par jour. */
const SW_PROGRAM: SlotTpl[] = [
  { day: 1, start: "09:30", end: "10:30", title: "Kick-off : objectifs, règles du jeu et binômes", role: "host" },
  { day: 1, start: "10:30", end: "12:30", title: "Scope MVP : problème, cible, proposition de valeur", role: "product" },
  { day: 1, start: "14:00", end: "17:30", title: "Architecture produit & choix du stack no-code", role: "nocode" },
  { day: 2, start: "09:30", end: "12:30", title: "Parcours utilisateur & wireframes", role: "ux" },
  { day: 2, start: "14:00", end: "16:30", title: "Maquettage no-code haute fidélité (Figma)", role: "ux" },
  { day: 2, start: "16:30", end: "18:00", title: "Mentorat individuel : revue des maquettes", role: "mentor" },
  { day: 3, start: "09:30", end: "12:30", title: "IA générative : intégrer un LLM dans son produit", role: "ia" },
  { day: 3, start: "14:00", end: "16:30", title: "Automatisations (n8n, Make) et back-office", role: "nocode" },
  { day: 3, start: "16:30", end: "17:30", title: "Point d'étape collectif", role: "host" },
  { day: 4, start: "09:30", end: "12:30", title: "Build : base de données et logique métier", role: "nocode" },
  { day: 4, start: "14:00", end: "16:30", title: "Build : front no-code et parcours clé", role: "nocode" },
  { day: 4, start: "16:30", end: "18:00", title: "Mentorat individuel : débloquer le build", role: "mentor" },
  { day: 5, start: "09:30", end: "11:00", title: "Préparer un protocole de tests utilisateurs", role: "product" },
  { day: 5, start: "11:00", end: "16:00", title: "Tests utilisateurs terrain (5 tests minimum)", role: "product" },
  { day: 5, start: "16:00", end: "17:30", title: "Débrief des tests & priorisation des itérations", role: "host" },
  { day: 6, start: "09:30", end: "12:30", title: "Landing page & copywriting", role: "growth" },
  { day: 6, start: "14:00", end: "16:00", title: "Premières campagnes d'acquisition (Meta Ads, LinkedIn)", role: "growth" },
  { day: 6, start: "16:00", end: "18:00", title: "Construire son pitch", role: "pitch" },
  { day: 7, start: "09:30", end: "12:00", title: "Répétition générale du pitch", role: "pitch" },
  { day: 7, start: "14:00", end: "16:30", title: "Démo Day : démo du MVP et pitch devant le jury", role: "jury" },
  { day: 7, start: "16:30", end: "18:00", title: "Roadmap post-MVP à 30 jours & clôture", role: "host" },
];

/** Startup Village (écoles) : 4 jours / 3 nuits. */
const VILLAGE_PROGRAM: SlotTpl[] = [
  { day: 1, start: "10:00", end: "12:30", title: "Ouverture, constitution des équipes et idéation", role: "host" },
  { day: 1, start: "14:00", end: "18:00", title: "Problème, cible et proposition de valeur", role: "product" },
  { day: 2, start: "09:30", end: "12:30", title: "Prototyper sans coder : maquettes et outils no-code", role: "nocode" },
  { day: 2, start: "14:00", end: "18:00", title: "IA générative au service du prototype", role: "ia" },
  { day: 3, start: "09:30", end: "12:30", title: "Tests terrain et business model", role: "product" },
  { day: 3, start: "14:00", end: "18:00", title: "Préparation du pitch", role: "pitch" },
  { day: 4, start: "09:30", end: "12:30", title: "Finale : pitchs devant le jury", role: "jury" },
  { day: 4, start: "14:00", end: "15:30", title: "Remise des prix et clôture", role: "host" },
];

/** Innovation Sprint entreprise : 3 jours. */
const SPRINT_PROGRAM: SlotTpl[] = [
  { day: 1, start: "09:00", end: "12:30", title: "Cadrage des irritants métier et choix des défis", role: "host" },
  { day: 1, start: "14:00", end: "17:30", title: "Discovery : interviews utilisateurs internes", role: "product" },
  { day: 2, start: "09:00", end: "12:30", title: "Prototypage no-code et IA", role: "nocode" },
  { day: 2, start: "14:00", end: "17:30", title: "Automatisations et intégration des données", role: "ia" },
  { day: 3, start: "09:00", end: "12:30", title: "Tests avec les équipes terrain", role: "product" },
  { day: 3, start: "14:00", end: "17:00", title: "Restitution au comité de direction et feuille de route", role: "pitch" },
];

const WEBINAR_PROGRAM: SlotTpl[] = [{ day: 1, start: "18:30", end: "19:45", title: "Webinaire live + questions / réponses", role: "host" }];

/** Candidats par rôle (le premier disponible à la date de la session est privilégié, puis rotation). */
const ROLE_POOL: Record<Role, string[]> = {
  host: [SPK.aurelien],
  product: [SPK.julie, SPK.david],
  nocode: [SPK.karim, SPK.thomas],
  ux: [SPK.sofia, SPK.thomas],
  ia: [SPK.hannah, SPK.karim],
  growth: [SPK.victor, SPK.margaux],
  pitch: [SPK.amina, SPK.yanis],
  mentor: [SPK.david, SPK.yanis, SPK.antoine, SPK.karim],
  jury: [SPK.elise, SPK.antoine, SPK.david],
};

/* ───────────────────────────── Sessions ───────────────────────────── */

interface EventSpec {
  code: string;
  name: string;
  kind: EventKind;
  mode: EventMode;
  status: EventStatus;
  region: Region;
  city: string;
  venue?: string;
  start: string; // date réelle YYYY-MM-DD
  end: string;
  capacity: number;
  price: number; // centimes (TTC B2C ; HT/étudiant pour Startup Village)
  publicPrice?: number;
  founder?: boolean;
  early?: boolean;
  image?: string;
  orgId?: string;
  pmr: "oui" | "partiel" | "non" | "en_ligne";
}

const IMG = (name: string) => `https://www.startupweek.tech/session-${name}.webp`;

/** Sessions passées (terminées) SW-0001 → SW-0010. */
const PAST_SW: EventSpec[] = [
  { code: "SW-0001", name: "Villa Riad Marrakech — Novembre 2025", kind: "startup_week", mode: "presentiel", status: "termine", region: "Hors Europe", city: "Marrakech", venue: "Riad Dar Amane", start: "2025-11-08", end: "2025-11-15", capacity: 10, price: 249000, publicPrice: 290000, founder: true, image: IMG("marrakech"), pmr: "partiel" },
  { code: "SW-0002", name: "Château Renaissance, région parisienne — Décembre 2025", kind: "startup_week", mode: "presentiel", status: "termine", region: "France", city: "Rambouillet", venue: "Château de la Brèche", start: "2025-12-06", end: "2025-12-13", capacity: 10, price: 290000, image: IMG("paris"), pmr: "partiel" },
  { code: "SW-0003", name: "Chalet Alpes — Janvier 2026", kind: "startup_week", mode: "presentiel", status: "termine", region: "France", city: "Morzine", venue: "Chalet Les Mélèzes", start: "2026-01-17", end: "2026-01-24", capacity: 10, price: 290000, image: IMG("alpes"), pmr: "non" },
  { code: "SW-0004", name: "Domaine viticole Bordeaux — Février 2026", kind: "startup_week", mode: "presentiel", status: "termine", region: "France", city: "Saint-Émilion", venue: "Domaine du Clos Saint-Vincent", start: "2026-02-07", end: "2026-02-14", capacity: 10, price: 290000, image: IMG("bordeaux"), pmr: "oui" },
  { code: "SW-0005", name: "Villa Koh Samui - Thaïlande — Mars 2026", kind: "startup_week", mode: "presentiel", status: "termine", region: "Hors Europe", city: "Koh Samui", venue: "Villa Baan Talay", start: "2026-03-07", end: "2026-03-14", capacity: 10, price: 290000, image: IMG("koh-samui"), pmr: "non" },
  { code: "SW-0006", name: "Chalet Alpes — Mars 2026", kind: "startup_week", mode: "presentiel", status: "termine", region: "France", city: "Morzine", venue: "Chalet Les Mélèzes", start: "2026-03-21", end: "2026-03-28", capacity: 10, price: 290000, image: IMG("alpes"), pmr: "non" },
  { code: "SW-0007", name: "Villa Riad Marrakech — Avril 2026", kind: "startup_week", mode: "presentiel", status: "termine", region: "Hors Europe", city: "Marrakech", venue: "Riad Dar Amane", start: "2026-04-04", end: "2026-04-11", capacity: 10, price: 290000, image: IMG("marrakech"), pmr: "partiel" },
  { code: "SW-0008", name: "Villa Belle Époque Deauville — Avril 2026", kind: "startup_week", mode: "presentiel", status: "termine", region: "France", city: "Deauville", venue: "Villa Belle Époque", start: "2026-04-25", end: "2026-05-02", capacity: 10, price: 290000, image: IMG("deauville"), pmr: "oui" },
  { code: "SW-0009", name: "Session en ligne — Juin 2026", kind: "startup_week", mode: "distanciel", status: "termine", region: "France", city: "En ligne", start: "2026-06-08", end: "2026-06-15", capacity: 10, price: 129000, publicPrice: 179000, image: IMG("en-ligne"), pmr: "en_ligne" },
  { code: "SW-0010", name: "Split - Croatie — Septembre 2026", kind: "startup_week", mode: "presentiel", status: "termine", region: "Europe", city: "Split", venue: "Villa Adriatica", start: "2026-09-05", end: "2026-09-12", capacity: 10, price: 290000, image: IMG("split"), pmr: "partiel" },
];

/** Sessions à venir — données réelles Airtable (toutes « Inscriptions ouvertes », 10 places). */
const UPCOMING_SW: EventSpec[] = [
  { code: "SW-0012", name: "Session en ligne — 5-12 Octobre 2026", kind: "startup_week", mode: "distanciel", status: "inscriptions_ouvertes", region: "France", city: "En ligne", start: "2026-10-05", end: "2026-10-12", capacity: 10, price: 99000, publicPrice: 129000, founder: true, early: true, image: IMG("en-ligne"), pmr: "en_ligne" },
  { code: "SW-0011", name: "Malaga ou Alicante - Espagne — 24-31 Octobre 2026", kind: "startup_week", mode: "presentiel", status: "inscriptions_ouvertes", region: "Europe", city: "Malaga / Alicante", venue: "Villa à confirmer (Costa del Sol / Costa Blanca)", start: "2026-10-24", end: "2026-10-31", capacity: 10, price: 235000, publicPrice: 290000, founder: true, image: IMG("espagne"), pmr: "partiel" },
  { code: "SW-0014", name: "Session en ligne — Novembre 2026", kind: "startup_week", mode: "distanciel", status: "inscriptions_ouvertes", region: "France", city: "En ligne", start: "2026-11-02", end: "2026-11-09", capacity: 10, price: 129000, publicPrice: 149000, image: IMG("en-ligne"), pmr: "en_ligne" },
  { code: "SW-0013", name: "Split - Croatie — Novembre 2026", kind: "startup_week", mode: "presentiel", status: "inscriptions_ouvertes", region: "Europe", city: "Split", venue: "Villa Adriatica", start: "2026-11-14", end: "2026-11-21", capacity: 10, price: 290000, image: IMG("split"), pmr: "partiel" },
  { code: "SW-0015", name: "Cyclades - Grèce — Décembre 2026", kind: "startup_week", mode: "presentiel", status: "inscriptions_ouvertes", region: "Europe", city: "Cyclades", venue: "Villa à confirmer (Paros)", start: "2026-12-05", end: "2026-12-12", capacity: 10, price: 290000, image: IMG("grece-cyclades"), pmr: "non" },
  { code: "SW-0016", name: "Session en ligne — Janvier 2027", kind: "startup_week", mode: "distanciel", status: "inscriptions_ouvertes", region: "France", city: "En ligne", start: "2027-01-11", end: "2027-01-18", capacity: 10, price: 149000, publicPrice: 179000, image: IMG("en-ligne"), pmr: "en_ligne" },
  { code: "SW-0017", name: "Bordeaux — Février 2027", kind: "startup_week", mode: "presentiel", status: "inscriptions_ouvertes", region: "France", city: "Saint-Émilion", venue: "Domaine du Clos Saint-Vincent", start: "2027-02-06", end: "2027-02-13", capacity: 10, price: 290000, image: IMG("bordeaux"), pmr: "oui" },
  { code: "SW-0018", name: "Deauville - Normandie — Mars 2027", kind: "startup_week", mode: "presentiel", status: "inscriptions_ouvertes", region: "France", city: "Deauville", venue: "Villa Belle Époque", start: "2027-03-13", end: "2027-03-20", capacity: 10, price: 290000, image: IMG("deauville"), pmr: "oui" },
  { code: "SW-0019", name: "Session en ligne — Mars 2027", kind: "startup_week", mode: "distanciel", status: "inscriptions_ouvertes", region: "France", city: "En ligne", start: "2027-03-22", end: "2027-03-29", capacity: 10, price: 179000, image: IMG("en-ligne"), pmr: "en_ligne" },
  { code: "SW-0020", name: "Koh Samui - Thaïlande — Mai 2027", kind: "startup_week", mode: "presentiel", status: "inscriptions_ouvertes", region: "Hors Europe", city: "Koh Samui", venue: "Villa Baan Talay", start: "2027-05-08", end: "2027-05-15", capacity: 10, price: 290000, image: IMG("koh-samui"), pmr: "non" },
  { code: "SW-0021", name: "Gorges de l'Ardèche — Juin 2027", kind: "startup_week", mode: "presentiel", status: "inscriptions_ouvertes", region: "France", city: "Vallon-Pont-d'Arc", venue: "Mas à confirmer", start: "2027-06-12", end: "2027-06-19", capacity: 10, price: 290000, image: IMG("ardeche"), pmr: "partiel" },
  { code: "SW-0022", name: "Santorin - Grèce — Juillet 2027", kind: "startup_week", mode: "presentiel", status: "inscriptions_ouvertes", region: "Europe", city: "Santorin", venue: "Villa à confirmer (Oia)", start: "2027-07-10", end: "2027-07-17", capacity: 10, price: 290000, image: IMG("santorini"), pmr: "non" },
  { code: "SW-0023", name: "Tivat - Monténégro — Septembre 2027", kind: "startup_week", mode: "presentiel", status: "inscriptions_ouvertes", region: "Europe", city: "Tivat", venue: "Villa à confirmer (baie de Kotor)", start: "2027-09-11", end: "2027-09-18", capacity: 10, price: 290000, image: IMG("montenegro"), pmr: "partiel" },
];

/** B2B et événements gratuits. */
const OTHER_EVENTS: EventSpec[] = [
  { code: "SV-0001", name: "Startup Village Epitech — Mai 2026", kind: "startup_village", mode: "presentiel", status: "termine", region: "France", city: "Lamotte-Beuvron", venue: "Domaine des Grands Chênes — Sologne", start: "2026-05-18", end: "2026-05-21", capacity: 80, price: 39000, orgId: ORG.epitech, pmr: "oui" },
  { code: "SV-0002", name: "Startup Village Ynov Campus — Janvier 2027", kind: "startup_village", mode: "presentiel", status: "prevu", region: "France", city: "Lamotte-Beuvron", venue: "Domaine des Grands Chênes — Sologne", start: "2027-01-26", end: "2027-01-29", capacity: 60, price: 39000, orgId: ORG.ynov, pmr: "oui" },
  { code: "IS-0001", name: "Innovation Sprint — Groupe Verdalys", kind: "evenement_entreprise", mode: "presentiel", status: "termine", region: "France", city: "Rennes", venue: "Siège Verdalys (salle innovation)", start: "2026-06-23", end: "2026-06-25", capacity: 14, price: 1200000, orgId: ORG.verdalys, pmr: "oui" },
  { code: "WEB-0001", name: "Webinaire — Lancer son MVP en 7 jours grâce au no-code et à l'IA", kind: "webinaire", mode: "distanciel", status: "termine", region: "France", city: "En ligne", start: "2026-09-10", end: "2026-09-10", capacity: 300, price: 0, pmr: "en_ligne" },
  { code: "WEB-0002", name: "Webinaire — Financer sa StartupWeek : OPCO, France Travail, employeur", kind: "webinaire", mode: "distanciel", status: "inscriptions_ouvertes", region: "France", city: "En ligne", start: "2026-10-15", end: "2026-10-15", capacity: 300, price: 0, pmr: "en_ligne" },
];

export const evId = (code: string) => `ev_${code.toLowerCase().replace(/-/g, "")}`;

const SW_OBJECTIVES = [
  "Définir le périmètre d'un MVP (problème, cible, proposition de valeur, fonctionnalités clés) et le formaliser dans un document de scope.",
  "Concevoir un parcours utilisateur et une maquette interactive testables avec un outil no-code.",
  "Construire et mettre en ligne un MVP fonctionnel combinant outils no-code, automatisations et IA générative.",
  "Conduire au moins 5 tests utilisateurs et prioriser les itérations à partir des retours.",
  "Présenter son projet dans un pitch de 5 minutes et élaborer une roadmap post-MVP à 30 jours.",
];
const VILLAGE_OBJECTIVES = [
  "Identifier un problème réel et formuler une proposition de valeur en équipe.",
  "Prototyper une solution sans coder à l'aide d'outils no-code et d'IA générative.",
  "Confronter le prototype à des utilisateurs et construire un business model simple.",
  "Pitcher le projet en 3 minutes devant un jury de professionnels.",
];
const SPRINT_OBJECTIVES = [
  "Qualifier trois irritants métier prioritaires avec les équipes terrain.",
  "Prototyper une solution no-code / IA pour chaque irritant retenu.",
  "Tester les prototypes auprès des utilisateurs internes et mesurer le gain attendu.",
  "Présenter une feuille de route de déploiement au comité de direction.",
];

const PREREQ = "Aucun prérequis technique. Avoir un projet ou une idée de produit digital.";
const EVAL_METHODS =
  "Positionnement d'entrée (questionnaire + diagnostic MVP individuel), évaluation continue par les mentors (grille de compétences), démo du MVP et pitch devant jury en fin de session, auto-évaluation des acquis, questionnaires de satisfaction à chaud et à froid (J+60). Certificat de réalisation délivré à l'issue de la formation.";

function accessibilityText(pmr: EventSpec["pmr"]): string {
  const base =
    "Formation ouverte aux personnes en situation de handicap. Aménagements possibles : supports adaptés (police, contrastes, transcription), rythme et pauses, binôme dédié. Notre référente handicap, Claire Dumas, étudie chaque situation avant l'inscription (contact@startupweek.tech).";
  switch (pmr) {
    case "oui":
      return `Lieu accessible PMR (plain-pied, chambre adaptée). ${base}`;
    case "partiel":
      return `Lieu partiellement accessible PMR (espaces communs de plain-pied, chambres à l'étage) : à valider avec la référente. ${base}`;
    case "non":
      return `Lieu non accessible aux personnes à mobilité réduite (escaliers, terrain en pente) : une session en ligne ou un autre lieu est proposé. ${base}`;
    default:
      return `Session 100 % en ligne : sous-titrage des sessions live, replays et supports accessibles. ${base}`;
  }
}

export function buildEvents(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("events");
  const speakers = ctx.data.speakers;
  const since = new Map(speakers.map((s) => [s.id, Date.parse(s.createdAt)]));

  const all = [...PAST_SW, ...UPCOMING_SW, ...OTHER_EVENTS];
  ctx.data.events = all.map((spec, index) => {
    const id = evId(spec.code);
    const startTs = clock.real(spec.start, spec.kind === "webinaire" ? 18 : 9, spec.kind === "webinaire" ? 30 : 30);
    const endTs = clock.real(spec.end, spec.kind === "webinaire" ? 19 : 12, spec.kind === "webinaire" ? 45 : 0);
    const isSW = spec.kind === "startup_week";
    const tpl = isSW ? SW_PROGRAM : spec.kind === "startup_village" ? VILLAGE_PROGRAM : spec.kind === "evenement_entreprise" ? SPRINT_PROGRAM : WEBINAR_PROGRAM;

    // Affectation des intervenants disponibles à la date de la session (rotation par session).
    const assign = (role: Role, slotIndex: number): string => {
      const pool = ROLE_POOL[role].filter((sid) => (since.get(sid) ?? 0) < startTs - 14 * DAY);
      const list = pool.length ? pool : [SPK.aurelien];
      return list[(index + slotIndex) % list.length];
    };
    const program: ProgramSlot[] = tpl.map((s, i) => ({
      id: `${id}_j${s.day}_${i + 1}`,
      day: s.day,
      start: s.start,
      end: s.end,
      title: s.title,
      speakerId: assign(s.role, s.role === "mentor" ? i : 0),
    }));
    const speakerIds = Array.from(new Set(program.map((p) => p.speakerId!)));

    const distanciel = spec.mode === "distanciel";
    const highlights = isSW
      ? distanciel
        ? [
            "Programme complet en ligne sur 7 jours",
            "Sessions live interactives quotidiennes",
            "Bonus : Diagnostic MVP individuel pré-event (1h)",
            "Bonus : Review MVP individuelle J+15 (1h)",
            "Bonus : Roadmap MVP 30 jours personnalisée",
            "Bonus : Permanence collective J+30 (90 min)",
          ]
        : [
            "7 jours en villa, hébergement et repas inclus",
            "Mentorat quotidien par des experts no-code & IA",
            "Démo Day devant un jury d'entrepreneurs et d'investisseurs",
            "Bonus : Diagnostic MVP individuel pré-event (1h)",
            "Bonus : Review MVP individuelle J+15 (1h)",
            ...(spec.founder ? ["Founder Edition : tarif fondateur limité aux 10 premières places"] : ["Communauté alumni à vie"]),
          ]
      : spec.kind === "startup_village"
        ? ["4 jours / 3 nuits en immersion", "Équipes de 5 étudiants encadrées par des mentors", "Finale de pitchs devant un jury", "Kit d'acculturation digitale remis avant l'événement"]
        : spec.kind === "evenement_entreprise"
          ? ["3 jours sur site", "3 prototypes testés avec les équipes terrain", "Restitution au comité de direction"]
          : ["Live gratuit de 75 minutes", "Questions / réponses en direct", "Replay envoyé aux inscrits"];

    const description = isSW
      ? distanciel
        ? "7 jours en ligne pour passer de l'idée à un MVP testé : sessions live chaque jour, mentorat individuel, outils no-code et IA, démo finale devant un jury."
        : `7 jours en immersion à ${spec.city} pour construire ton MVP avec des experts no-code et IA : scope, maquette, build, tests utilisateurs, landing et pitch.`
      : spec.kind === "startup_village"
        ? "Séminaire entrepreneurial clé en main pour une promotion d'étudiants : idéation, prototypage no-code, tests terrain et finale de pitchs."
        : spec.kind === "evenement_entreprise"
          ? "Sprint d'innovation intrapreneuriale de 3 jours : trois irritants métier transformés en prototypes testés."
          : "Webinaire gratuit animé par l'équipe StartupWeek, ouvert à tous les porteurs de projet.";

    const budget = isSW
      ? distanciel
        ? 250000
        : spec.region === "Hors Europe"
          ? 1250000
          : spec.region === "Europe"
            ? 1100000
            : 950000
      : spec.kind === "startup_village"
        ? spec.capacity * 21000
        : spec.kind === "evenement_entreprise"
          ? 450000
          : 20000;

    const isPast = spec.status === "termine";
    // Session créée 3 à 5 mois avant son début (et au moins 45 jours avant aujourd'hui).
    const createdTs = Math.min(startTs - r.between(90, 160) * DAY, clock.now - r.between(45, 120) * DAY);
    const updatedTs = isPast ? endTs + r.between(1, 6) * DAY : clock.now - r.between(1, 20) * DAY;

    const event: EventSession = {
      id,
      ...stamps(ctx, createdTs, updatedTs),
      code: spec.code,
      name: spec.name,
      kind: spec.kind,
      mode: spec.mode,
      format: spec.kind === "webinaire" ? "journee" : "semaine",
      status: spec.status,
      region: spec.region,
      city: spec.city,
      venue: spec.venue,
      startAt: clock.iso(startTs),
      endAt: clock.iso(endTs),
      registrationDeadline: clock.iso(startTs - 7 * DAY), // CGV : clôture des inscriptions à J-7
      capacity: spec.capacity,
      minCapacity: isSW ? (distanciel ? 5 : 6) : spec.kind === "startup_village" ? 40 : spec.kind === "evenement_entreprise" ? 8 : 20,
      priceCents: spec.price,
      publicPriceCents: spec.publicPrice,
      founderEdition: spec.founder ?? false,
      earlyBird: spec.early ?? false,
      highlights,
      description,
      imageUrl: spec.image,
      isTraining: spec.kind !== "webinaire",
      durationHours: isSW ? (distanciel ? 35 : 42) : spec.kind === "startup_village" ? 28 : spec.kind === "evenement_entreprise" ? 21 : 1.25,
      objectives: isSW ? SW_OBJECTIVES : spec.kind === "startup_village" ? VILLAGE_OBJECTIVES : spec.kind === "evenement_entreprise" ? SPRINT_OBJECTIVES : ["Comprendre la démarche MVP et les financements possibles."],
      prerequisites: spec.kind === "startup_village" ? "Aucun prérequis : étudiants de la promotion concernée." : spec.kind === "evenement_entreprise" ? "Collaborateurs volontaires, sans prérequis technique." : PREREQ,
      evaluationMethods: spec.kind === "webinaire" ? "Sans évaluation (événement d'information)." : EVAL_METHODS,
      accessibility: accessibilityText(spec.pmr),
      program,
      speakerIds,
      resourceIds: [], // complété par le module ressources
      orgId: spec.orgId,
      budgetCents: budget,
      publishedOnSite: (spec.kind === "startup_week" || spec.kind === "webinaire") && !isPast,
    };
    return event;
  });
}

/** Jours de formation d'une session (J1…Jn), en timestamps minuit UTC. */
export function trainingDays(ev: EventSession): number[] {
  const start = Math.floor(Date.parse(ev.startAt) / DAY) * DAY;
  const n = Math.max(1, ...ev.program.map((p) => p.day));
  return Array.from({ length: n }, (_, i) => start + i * DAY);
}
