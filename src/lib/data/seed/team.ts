/**
 * Équipe, paramètres de l'organisme et catalogue d'offres.
 */
import type { Offer, Settings, User } from "../../domain/types";
import { type SeedContext, stamps } from "./context";
import { htFromTtc } from "./helpers";

/** Identifiants de l'équipe (réutilisés partout comme owner / assignee / reviewer). */
export const U = {
  aurelien: "usr_aurelien", // fondateur & président (admin)
  lea: "usr_lea", // business developer (commercial)
  claire: "usr_claire", // responsable pédagogique & qualité, référente handicap
  karim: "usr_karim", // formateur-mentor no-code / IA
  philippe: "usr_philippe", // expert-comptable externe (lecture)
} as const;

export function buildTeam(ctx: SeedContext): void {
  const { clock } = ctx;
  const users: User[] = [
    {
      id: U.aurelien,
      ...stamps(ctx, clock.real("2025-06-02"), clock.rel(-2)),
      name: "Aurélien Chiren",
      email: "aurelien.chiren@example.fr",
      role: "admin",
      title: "Fondateur & Président",
      color: "#FF5A36",
      active: true,
    },
    {
      id: U.lea,
      ...stamps(ctx, clock.real("2025-10-06"), clock.rel(-5)),
      name: "Léa Fontaine",
      email: "lea.fontaine@example.fr",
      role: "commercial",
      title: "Business Developer B2B & B2C",
      color: "#2563EB",
      active: true,
    },
    {
      id: U.claire,
      ...stamps(ctx, clock.real("2025-11-03"), clock.rel(-1)),
      name: "Claire Dumas",
      email: "claire.dumas@example.fr",
      role: "pedagogie",
      title: "Responsable pédagogique & qualité · Référente handicap",
      color: "#7C3AED",
      active: true,
    },
    {
      id: U.karim,
      ...stamps(ctx, clock.real("2025-09-15"), clock.rel(-12)),
      name: "Karim Haddad",
      email: "karim.haddad@example.fr",
      role: "formateur",
      title: "Formateur-mentor no-code & IA",
      color: "#059669",
      active: true,
    },
    {
      id: U.philippe,
      ...stamps(ctx, clock.real("2026-01-12"), clock.rel(-40)),
      name: "Philippe Garnier",
      email: "philippe.garnier@example.org",
      role: "lecture",
      title: "Expert-comptable (cabinet externe)",
      color: "#64748B",
      active: true,
    },
  ];
  ctx.data.users = users;
  ctx.data.settings = buildSettings(ctx);
  ctx.data.offers = buildOffers(ctx);
}

function buildSettings(ctx: SeedContext): Settings {
  return {
    legalName: "INTERSTELLABS SASU",
    brand: "StartupWeek",
    siret: "981 714 686 00012",
    nda: "À compléter (déclaration d'activité)",
    address: "9 rue des Colonnes, 75002 Paris",
    email: "contact@startupweek.tech",
    phone: "+33 7 71 80 02 78",
    website: "https://www.startupweek.tech",
    iban: "FR76 •••• •••• •••• •••• (Qonto)",
    vatExempt: false,
    invoicePrefix: "F",
    quotePrefix: "D",
    paymentTermsDays: 30,
    latePenaltyText:
      "En cas de retard de paiement, des pénalités de retard sont exigibles de plein droit au taux égal à trois fois le taux d'intérêt légal en vigueur (art. L.441-10 du Code de commerce), ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (art. D.441-5) pour les clients professionnels. Pas d'escompte pour paiement anticipé.",
    qualityLeadId: U.claire,
    disabilityLeadId: U.claire,
    auditDate: ctx.clock.iso(ctx.clock.rel(75, 9, 0)),
    auditBody: "Organisme certificateur accrédité COFRAC (à choisir)",
    newcomer: false,
    complaintAckHours: 48,
    slaHours: 48,
    stripeConnected: true,
    qontoConnected: true,
    emailProvider: "smtp",
    siteFormEmails: false,
    satisfactionFormUrl: "",
    depositPercent: 30,
    balanceDaysBefore: 30,
    dataMode: "demo",
  };
}

/**
 * Catalogue. Convention `priceCents` : prix public tel qu'affiché —
 * TTC pour le B2C (sessions, accompagnements, mentorat, kit ; comme sur le site),
 * HT pour le B2B (écoles, entreprises : devis).
 */
function buildOffers(ctx: SeedContext): Offer[] {
  const created = ctx.clock.real("2025-09-01");
  const updated = ctx.clock.rel(-18);
  const o = (id: string, rest: Omit<Offer, "id" | "createdAt" | "updatedAt">): Offer => ({ id, ...stamps(ctx, created, updated), ...rest });
  return [
    o("off_dsk", {
      name: "Digital Starter Kit",
      kind: "kit",
      code: "PRD-DSK",
      priceCents: 0,
      vatRate: 20,
      description: "Kit gratuit en 6 modules (idée, cible, maquette, outils no-code, IA, lancement) — porte d'entrée du tunnel.",
      active: true,
    }),
    o("off_startup_ready", {
      name: "Startup Ready",
      kind: "accompagnement",
      code: "PRC-SR",
      priceCents: 99000,
      vatRate: 20,
      description: "4 sessions individuelles (1:1) pour cadrer le projet, prioriser le MVP et préparer la StartupWeek. 990 € TTC.",
      durationHours: 4,
      active: true,
    }),
    o("off_sw_distanciel", {
      name: "StartupWeek Distanciel",
      kind: "session",
      code: "BLD-SWD",
      priceCents: 179000,
      vatRate: 20,
      description: "Bootcamp MVP de 7 jours en ligne : sessions live quotidiennes, mentorat, démo finale. Prix public 1 790 € TTC.",
      durationHours: 35,
      active: true,
    }),
    o("off_sw_presentiel", {
      name: "StartupWeek Présentiel",
      kind: "session",
      code: "BLD-SWP",
      priceCents: 290000,
      vatRate: 20,
      description: "Bootcamp MVP de 7 jours en villa (hébergement et repas inclus) : on sort avec un MVP testé et un pitch. 2 900 € TTC.",
      durationHours: 42,
      active: true,
    }),
    o("off_sw_signature", {
      name: "StartupWeek Signature",
      kind: "session",
      code: "BLD-SIG",
      priceCents: 449000,
      vatRate: 20,
      description: "Présentiel + chambre individuelle, 3 sessions de mentorat 1:1 et review MVP à J+15 et J+45. 4 490 € TTC.",
      durationHours: 48,
      active: true,
    }),
    o("off_residency", {
      name: "Startup Residency",
      kind: "accompagnement",
      code: "BLD-RES",
      priceCents: 890000,
      vatRate: 20,
      description: "Programme de 3 mois : StartupWeek Signature + accompagnement hebdomadaire jusqu'au lancement. 8 900 € TTC.",
      durationHours: 90,
      active: true,
    }),
    o("off_il_light", {
      name: "Iteration Lab — Pack Light",
      kind: "mentorat",
      code: "PRD-IL4",
      priceCents: 60000,
      vatRate: 20,
      description: "4 séances de mentorat produit (1 h) après la StartupWeek pour itérer sur le MVP. 600 € TTC.",
      durationHours: 4,
      active: true,
    }),
    o("off_il_standard", {
      name: "Iteration Lab — Pack Standard",
      kind: "mentorat",
      code: "PRD-IL8",
      priceCents: 110000,
      vatRate: 20,
      description: "8 séances de mentorat produit & growth (1 h). 1 100 € TTC.",
      durationHours: 8,
      active: true,
    }),
    o("off_il_intensive", {
      name: "Iteration Lab — Pack Intensive",
      kind: "mentorat",
      code: "PRD-IL12",
      priceCents: 150000,
      vatRate: 20,
      description: "12 séances de mentorat (1 h) + revue hebdomadaire des métriques. 1 500 € TTC.",
      durationHours: 12,
      active: true,
    }),
    o("off_il_single", {
      name: "Séance unique de mentorat",
      kind: "mentorat",
      code: "PRD-IL1",
      priceCents: 18000,
      vatRate: 20,
      description: "1 séance d'1 h avec un mentor (produit, no-code, IA, growth ou pitch). 180 € TTC.",
      durationHours: 1,
      active: true,
    }),
    o("off_startup_village", {
      name: "Startup Village (écoles)",
      kind: "ecole",
      code: "INT-SV",
      priceCents: 39000,
      vatRate: 20,
      description: "Séminaire entrepreneurial de 4 jours / 3 nuits pour promotions d'étudiants (40 à 300). Prix par étudiant, HT, hébergement inclus.",
      durationHours: 28,
      active: true,
    }),
    o("off_innovation_sprint", {
      name: "Innovation Sprint (entreprise)",
      kind: "entreprise",
      code: "INT-IS",
      priceCents: 1200000,
      vatRate: 20,
      description: "3 jours pour transformer un irritant métier en prototype testé avec une équipe intrapreneuriale. Sur devis — base 12 000 € HT.",
      durationHours: 21,
      active: true,
    }),
    o("off_ai_adoption", {
      name: "AI Adoption Sprint (entreprise)",
      kind: "entreprise",
      code: "IA-AAS",
      priceCents: 950000,
      vatRate: 20,
      description: "2 jours + suivi à J+30 pour identifier et automatiser 3 cas d'usage IA dans une équipe. Sur devis — base 9 500 € HT.",
      durationHours: 14,
      active: true,
    }),
    o("off_talent_sprint", {
      name: "Talent Sprint (entreprise)",
      kind: "entreprise",
      code: "INT-TS",
      priceCents: 850000,
      vatRate: 20,
      description: "Programme de fidélisation des talents : défi intrapreneurial de 5 demi-journées. Sur devis — base 8 500 € HT.",
      durationHours: 17,
      active: true,
    }),
  ];
}

/** Prix HT d'une offre B2C (TTC → HT) — utile pour les lignes de facture. */
export function offerHtCents(offer: Offer): number {
  return offer.kind === "ecole" || offer.kind === "entreprise" ? offer.priceCents : htFromTtc(offer.priceCents);
}
