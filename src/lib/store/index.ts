"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Activity,
  ActivityKind,
  Collections,
  ContentStatDay,
  EntityMap,
  EntityName,
  ID,
  Settings,
  TrafficDay,
} from "@/lib/domain/types";
import { uid } from "@/lib/utils";
import { buildSeed, SEED_VERSION } from "@/lib/data/seed";
import { remoteSync, type RemoteData } from "@/lib/data/sync";
import { DATA_MODE } from "@/lib/data/supabase";

/** Préfixes d'identifiants par collection (confort de lecture en démo). */
export const ID_PREFIX: Record<EntityName, string> = {
  users: "usr",
  organizations: "org",
  contacts: "ct",
  submissions: "sub",
  deals: "deal",
  tasks: "tsk",
  sequences: "seq",
  emailTemplates: "tpl",
  emails: "mail",
  events: "ev",
  speakers: "spk",
  applications: "app",
  projects: "prj",
  attendances: "att",
  evaluations: "eva",
  complaints: "rec",
  indicators: "ind",
  evidences: "evd",
  improvementActions: "act",
  watchItems: "wat",
  quotes: "quo",
  invoices: "inv",
  payments: "pay",
  resources: "res",
  contents: "cnt",
  automations: "aut",
  offers: "off",
  courses: "crs",
  courseModules: "mod",
  lessons: "les",
  academyPaths: "pth",
  enrollments: "enr",
  lessonProgress: "lpr",
  assignments: "liv",
  learnerConnections: "cnx",
  cohorts: "coh",
  courseComments: "rvc",
};

export type NewEntity<K extends EntityName> = Omit<EntityMap[K], "id" | "createdAt" | "updatedAt"> & { id?: ID };

interface MutationOptions {
  /** Résumé ajouté à la timeline d'activité (sinon message générique). */
  log?: string | false;
  kind?: ActivityKind;
}

export interface CrmState extends Collections {
  hydrated: boolean;
  seedVersion: number;
  /** Horloge partagée (ms) — rafraîchie chaque minute : permet des rendus purs (pas de Date.now() dans le rendu). */
  now: number;
  sessionUserId?: ID;
  /** Mode supabase : message à afficher sur /connexion (compte non rattaché, schéma non exposé…). */
  authNotice?: string;
  settings: Settings;
  activities: Activity[];
  traffic: TrafficDay[];
  /** Audience quotidienne des articles du blog (mesurée sur le site). */
  contentStats: ContentStatDay[];

  create: <K extends EntityName>(collection: K, data: NewEntity<K>, opts?: MutationOptions) => EntityMap[K];
  update: <K extends EntityName>(collection: K, id: ID, patch: Partial<EntityMap[K]>, opts?: MutationOptions) => void;
  remove: <K extends EntityName>(collection: K, id: ID, opts?: MutationOptions) => void;
  log: (entry: Omit<Activity, "id" | "at"> & { at?: string }) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  login: (userId: ID) => void;
  logout: () => void;
  /** Mode supabase : remplace les données par celles de la base, pour le membre connecté. */
  hydrateRemote: (data: RemoteData, memberId: ID) => void;
  /** Mode supabase : vide les données (déconnexion, session expirée), avec un message éventuel. */
  clearRemote: (notice?: string) => void;
  tick: () => void;
  resetDemo: () => void;
}

const ENTITY_LABEL: Partial<Record<EntityName, string>> = {
  contacts: "Contact",
  organizations: "Organisation",
  deals: "Opportunité",
  tasks: "Tâche",
  applications: "Candidature",
  events: "Session",
  invoices: "Facture",
  quotes: "Devis",
  payments: "Paiement",
  complaints: "Réclamation",
  projects: "Projet",
  contents: "Contenu",
  resources: "Ressource",
  submissions: "Demande",
  courses: "Formation",
  lessons: "Leçon",
  academyPaths: "Parcours",
  enrollments: "Inscription Academy",
  assignments: "Livrable",
  cohorts: "Cohorte",
  courseComments: "Commentaire de relecture",
};

/** Paramètres par défaut (remplacés par le seed de démo ou la base). */
const DEFAULT_SETTINGS: Settings = {
  legalName: "INTERSTELLABS SASU",
  brand: "StartupWeek",
  siret: "",
  nda: "",
  address: "",
  email: "contact@startupweek.tech",
  phone: "",
  website: "https://www.startupweek.tech",
  iban: "",
  vatExempt: false,
  invoicePrefix: "F",
  quotePrefix: "D",
  paymentTermsDays: 30,
  latePenaltyText: "",
  newcomer: false,
  complaintAckHours: 48,
  slaHours: 48,
  stripeConnected: false,
  emailProvider: "smtp",
  siteFormEmails: false,
  satisfactionFormUrl: "",
  dataMode: "demo",
  depositPercent: 30,
  balanceDaysBefore: 30,
};

/** État vide : utilisé côté serveur et avant hydratation (le seed n'est généré que dans le navigateur). */
function emptyState(): Collections & Pick<CrmState, "settings" | "activities" | "traffic" | "contentStats"> {
  const collections = Object.fromEntries((Object.keys(ID_PREFIX) as EntityName[]).map((k) => [k, []])) as unknown as Collections;
  return { ...collections, settings: DEFAULT_SETTINGS, activities: [], traffic: [], contentStats: [] };
}

function freshSeed() {
  return buildSeed(Date.now());
}

export const useCrm = create<CrmState>()(
  persist(
    (set, get) => ({
      ...emptyState(),
      hydrated: false,
      seedVersion: SEED_VERSION,
      now: Date.now(),
      sessionUserId: undefined,

      create: (collection, data, opts) => {
        const ts = new Date().toISOString();
        const entity = { ...data, id: data.id ?? uid(ID_PREFIX[collection]), createdAt: ts, updatedAt: ts } as unknown as EntityMap[typeof collection];
        set((s) => ({ [collection]: [entity, ...(s[collection] as unknown[])] }) as Partial<CrmState>);
        // Écriture distante avant le journal : la file est ordonnée, l'activité suit la ligne créée.
        remoteSync.insert(collection, entity, {
          sentUpdatedAt: entity.updatedAt,
          rollback: () => set((s) => ({ [collection]: (s[collection] as { id: ID }[]).filter((r) => r.id !== entity.id) }) as Partial<CrmState>),
        });
        if (opts?.log !== false) {
          get().log({
            kind: opts?.kind ?? "creation",
            entity: collection,
            entityId: entity.id,
            actorId: get().sessionUserId,
            summary: opts?.log || `${ENTITY_LABEL[collection] ?? "Élément"} créé`,
          });
        }
        return entity;
      },

      update: (collection, id, patch, opts) => {
        const ts = new Date().toISOString();
        let prev: EntityMap[typeof collection] | undefined;
        set((s) => ({
          [collection]: (s[collection] as EntityMap[typeof collection][]).map((row) => {
            if (row.id !== id) return row;
            prev = row;
            return { ...row, ...patch, updatedAt: ts };
          }),
        }) as Partial<CrmState>);
        if (prev) {
          const before = prev;
          remoteSync.update(collection, id, { ...patch, updatedAt: ts }, {
            sentUpdatedAt: ts,
            // Refus de la base : on remet la ligne d'avant, sauf si elle a été modifiée depuis.
            rollback: () =>
              set((s) => ({
                [collection]: (s[collection] as EntityMap[typeof collection][]).map((row) => (row.id === id && row.updatedAt === ts ? before : row)),
              }) as Partial<CrmState>),
          });
        }
        if (opts?.log) {
          get().log({ kind: opts.kind ?? "modification", entity: collection, entityId: id, actorId: get().sessionUserId, summary: opts.log });
        }
      },

      remove: (collection, id, opts) => {
        const before = (get()[collection] as { id: ID }[]).find((row) => row.id === id);
        set((s) => ({ [collection]: (s[collection] as { id: ID }[]).filter((row) => row.id !== id) }) as Partial<CrmState>);
        remoteSync.remove(collection, id, {
          rollback: () =>
            before &&
            set((s) => ((s[collection] as { id: ID }[]).some((r) => r.id === id) ? s : ({ [collection]: [before, ...(s[collection] as unknown[])] } as Partial<CrmState>))),
        });
        if (opts?.log) {
          get().log({ kind: "modification", entity: collection, entityId: id, actorId: get().sessionUserId, summary: opts.log });
        }
      },

      log: (entry) => {
        const activity: Activity = { id: uid("evt"), at: entry.at ?? new Date().toISOString(), ...entry };
        set((s) => ({ activities: [activity, ...s.activities].slice(0, 1500) }));
        remoteSync.insertActivity(activity);
      },

      updateSettings: (patch) => {
        const before = get().settings;
        set((s) => ({ settings: { ...s.settings, ...patch } }));
        remoteSync.updateSettings(patch, { rollback: () => set({ settings: before }) });
      },
      login: (userId) => set({ sessionUserId: userId }),
      logout: () => set({ sessionUserId: undefined }),
      hydrateRemote: (data, memberId) =>
        set({
          ...emptyState(),
          ...data.collections,
          activities: data.activities,
          traffic: data.traffic,
          contentStats: data.contentStats,
          settings: { ...DEFAULT_SETTINGS, ...data.settings, dataMode: "supabase" },
          sessionUserId: memberId,
          authNotice: undefined,
          hydrated: true,
          now: Date.now(),
        }),
      clearRemote: (notice) => set({ ...emptyState(), sessionUserId: undefined, authNotice: notice, hydrated: true, now: Date.now() }),
      tick: () => set({ now: Date.now() }),
      resetDemo: () => {
        if (DATA_MODE === "supabase") return;
        const keepUser = get().sessionUserId;
        set({ ...freshSeed(), seedVersion: SEED_VERSION, now: Date.now(), sessionUserId: keepUser });
      },
    }),
    {
      // Mode supabase : rien n'est conservé dans le navigateur (données personnelles, source de vérité = base).
      name: DATA_MODE === "supabase" ? "startupweek-os-remote" : "startupweek-os",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => {
        if (DATA_MODE === "supabase") return {};
        // On ne persiste que les données (pas les fonctions, l'horloge ni les messages de connexion).
        const { hydrated, now, authNotice, create, update, remove, log, updateSettings, login, logout, hydrateRemote, clearRemote, tick, resetDemo, ...data } = s;
        void hydrated; void now; void authNotice; void create; void update; void remove; void log; void updateSettings; void login; void logout; void hydrateRemote; void clearRemote; void tick; void resetDemo;
        return data;
      },
      merge: (persisted, current) => {
        if (DATA_MODE === "supabase") return current;
        const p = persisted as Partial<CrmState> | undefined;
        // Premier chargement (ou nouvelle version du jeu de démo) : génération du seed dans le navigateur.
        if (!p || p.seedVersion !== SEED_VERSION) return { ...current, ...freshSeed(), seedVersion: SEED_VERSION, sessionUserId: p?.sessionUserId };
        return { ...current, ...p, settings: { ...current.settings, ...p.settings } };
      },
      onRehydrateStorage: () => (_state, error) => {
        // En cas d'erreur (stockage corrompu, seed invalide) on débloque l'interface plutôt que de rester sur le squelette.
        if (error) console.error("[store] réhydratation impossible", error);
        useCrm.setState({ hydrated: true, now: Date.now() });
      },
    },
  ),
);

/**
 * Mode supabase : la ligne enregistrée par la base (numéro attribué, statut recalculé par
 * trigger…) remplace la ligne locale, sauf si celle-ci a été modifiée depuis l'envoi.
 */
remoteSync.setRowListener((collection, row, sentUpdatedAt) => {
  useCrm.setState((s) => {
    const rows = s[collection] as { id: ID; updatedAt?: string }[];
    const i = rows.findIndex((r) => r.id === row.id);
    if (i < 0 || (sentUpdatedAt && rows[i].updatedAt !== sentUpdatedAt)) return s;
    const next = rows.slice();
    next[i] = row as unknown as (typeof rows)[number];
    return { [collection]: next } as Partial<CrmState>;
  });
});

/** Accès hors React (actions métier, automatisations). */
export const crm = () => useCrm.getState();

export function findById<K extends EntityName>(collection: K, id: ID | undefined | null): EntityMap[K] | undefined {
  if (!id) return undefined;
  return (useCrm.getState()[collection] as EntityMap[K][]).find((r) => r.id === id);
}
