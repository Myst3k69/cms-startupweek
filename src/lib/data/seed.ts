/**
 * Jeu de données de démo StartupWeek OS — point d'entrée.
 *
 * - Déterministe : PRNG seedé (mulberry32), aucun Math.random / Date.now ; même `now` ⇒ mêmes données.
 * - Dates relatives à `now` : le calendrier réel (sessions Airtable…) est exprimé par rapport au 2026-09-26
 *   et recalé sur `now`, pour que la démo corresponde à la réalité aujourd'hui et reste « vivante » ensuite.
 * - Montants en centimes ; prix B2C TTC (lignes de facture HT = TTC / 1,2, TVA 20 %).
 * - Emails fictifs uniquement (example.com / example.org / example.fr).
 *
 * Construction par modules (src/lib/data/seed/*), dans l'ordre des dépendances.
 */
import type { Activity, Collections, ContentStatDay, Settings, TrafficDay } from "../domain/types";
import type { SeedContext } from "./seed/context";
import { Clock, Rng } from "./seed/helpers";
import { buildTeam } from "./seed/team";
import { buildOrganizations } from "./seed/organizations";
import { buildEvents, buildSpeakers } from "./seed/events";
import { buildPeople } from "./seed/people";
import { buildProjects } from "./seed/projects";
import { buildBilling } from "./seed/billing";
import { buildResources } from "./seed/resources";
import { buildQualiopi } from "./seed/qualiopi";
import { buildCrm } from "./seed/crm";
import { buildAutomations, buildContents } from "./seed/content";
import { buildActivities, buildContentStats, buildTraffic } from "./seed/analytics";
import { buildAcademy } from "./seed/academy";

/** À incrémenter à chaque évolution du jeu de démo (force la régénération du store local). */
export const SEED_VERSION = 4;

export interface SeedData extends Collections {
  settings: Settings;
  activities: Activity[];
  traffic: TrafficDay[];
  contentStats: ContentStatDay[];
}

/** Graine fixe : les données ne dépendent que de `now` (pour les dates). */
const SEED = 20260926;

function emptyData(): SeedData {
  return {
    users: [],
    organizations: [],
    contacts: [],
    submissions: [],
    deals: [],
    tasks: [],
    sequences: [],
    emailTemplates: [],
    emails: [],
    events: [],
    speakers: [],
    applications: [],
    projects: [],
    attendances: [],
    evaluations: [],
    complaints: [],
    indicators: [],
    evidences: [],
    improvementActions: [],
    watchItems: [],
    quotes: [],
    invoices: [],
    payments: [],
    resources: [],
    contents: [],
    automations: [],
    offers: [],
    courses: [],
    courseModules: [],
    lessons: [],
    academyPaths: [],
    enrollments: [],
    lessonProgress: [],
    assignments: [],
    learnerConnections: [],
    cohorts: [],
    courseComments: [],
    settings: undefined as unknown as Settings, // renseigné par buildTeam
    activities: [],
    traffic: [],
    contentStats: [],
  };
}

export function buildSeed(now: number): SeedData {
  const ctx: SeedContext = {
    clock: new Clock(now),
    rng: new Rng(SEED),
    data: emptyData(),
    scratch: { appPlans: new Map() },
  };

  buildTeam(ctx); // users, settings, offers
  buildOrganizations(ctx);
  buildSpeakers(ctx);
  buildEvents(ctx);
  buildPeople(ctx); // contacts + applications (+ échéanciers de paiement)
  buildProjects(ctx);
  buildBilling(ctx); // quotes, invoices, payments
  buildResources(ctx); // + event.resourceIds
  buildQualiopi(ctx); // indicators, evidences, improvementActions, watchItems, complaints, attendances, evaluations
  buildCrm(ctx); // emailTemplates, sequences, submissions, deals, tasks, emails
  buildContents(ctx);
  buildAcademy(ctx); // formations, parcours, cohorte, inscriptions et progression (StartupWeek Academy)
  buildAutomations(ctx);
  buildTraffic(ctx);
  buildContentStats(ctx); // après buildContents : audience quotidienne des articles du blog
  buildActivities(ctx);

  return ctx.data;
}
