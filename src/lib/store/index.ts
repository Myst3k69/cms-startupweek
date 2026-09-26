"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Activity,
  ActivityKind,
  Collections,
  EntityMap,
  EntityName,
  ID,
  Settings,
  TrafficDay,
} from "@/lib/domain/types";
import { uid } from "@/lib/utils";
import { buildSeed, SEED_VERSION } from "@/lib/data/seed";
import { remoteSync } from "@/lib/data/sync";

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
  bankTransactions: "btx",
  resources: "res",
  contents: "cnt",
  automations: "aut",
  offers: "off",
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
  settings: Settings;
  activities: Activity[];
  traffic: TrafficDay[];

  create: <K extends EntityName>(collection: K, data: NewEntity<K>, opts?: MutationOptions) => EntityMap[K];
  update: <K extends EntityName>(collection: K, id: ID, patch: Partial<EntityMap[K]>, opts?: MutationOptions) => void;
  remove: <K extends EntityName>(collection: K, id: ID, opts?: MutationOptions) => void;
  log: (entry: Omit<Activity, "id" | "at"> & { at?: string }) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  login: (userId: ID) => void;
  logout: () => void;
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
};

function emptySeed() {
  return buildSeed(Date.now());
}

export const useCrm = create<CrmState>()(
  persist(
    (set, get) => ({
      ...emptySeed(),
      hydrated: false,
      seedVersion: SEED_VERSION,
      now: Date.now(),
      sessionUserId: undefined,

      create: (collection, data, opts) => {
        const ts = new Date().toISOString();
        const entity = { ...data, id: data.id ?? uid(ID_PREFIX[collection]), createdAt: ts, updatedAt: ts } as unknown as EntityMap[typeof collection];
        set((s) => ({ [collection]: [entity, ...(s[collection] as unknown[])] }) as Partial<CrmState>);
        if (opts?.log !== false) {
          get().log({
            kind: opts?.kind ?? "creation",
            entity: collection,
            entityId: entity.id,
            actorId: get().sessionUserId,
            summary: opts?.log || `${ENTITY_LABEL[collection] ?? "Élément"} créé`,
          });
        }
        remoteSync.upsert(collection, entity);
        return entity;
      },

      update: (collection, id, patch, opts) => {
        const ts = new Date().toISOString();
        let next: EntityMap[typeof collection] | undefined;
        set((s) => ({
          [collection]: (s[collection] as EntityMap[typeof collection][]).map((row) => {
            if (row.id !== id) return row;
            next = { ...row, ...patch, updatedAt: ts };
            return next;
          }),
        }) as Partial<CrmState>);
        if (opts?.log) {
          get().log({ kind: opts.kind ?? "modification", entity: collection, entityId: id, actorId: get().sessionUserId, summary: opts.log });
        }
        if (next) remoteSync.upsert(collection, next);
      },

      remove: (collection, id, opts) => {
        set((s) => ({ [collection]: (s[collection] as { id: ID }[]).filter((row) => row.id !== id) }) as Partial<CrmState>);
        if (opts?.log) {
          get().log({ kind: "modification", entity: collection, entityId: id, actorId: get().sessionUserId, summary: opts.log });
        }
        remoteSync.remove(collection, id);
      },

      log: (entry) => {
        const activity: Activity = { id: uid("evt"), at: entry.at ?? new Date().toISOString(), ...entry };
        set((s) => ({ activities: [activity, ...s.activities].slice(0, 1500) }));
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      login: (userId) => set({ sessionUserId: userId }),
      logout: () => set({ sessionUserId: undefined }),
      tick: () => set({ now: Date.now() }),
      resetDemo: () => {
        const keepUser = get().sessionUserId;
        set({ ...emptySeed(), seedVersion: SEED_VERSION, now: Date.now(), sessionUserId: keepUser });
      },
    }),
    {
      name: "startupweek-os",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => {
        // On ne persiste que les données (pas les fonctions ni l'horloge).
        const { hydrated, now, create, update, remove, log, updateSettings, login, logout, tick, resetDemo, ...data } = s;
        void hydrated; void now; void create; void update; void remove; void log; void updateSettings; void login; void logout; void tick; void resetDemo;
        return data;
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<CrmState> | undefined;
        // Seed régénéré si la version du jeu de démo a changé.
        if (!p || p.seedVersion !== SEED_VERSION) return { ...current, sessionUserId: p?.sessionUserId };
        return { ...current, ...p, settings: { ...current.settings, ...p.settings } };
      },
      onRehydrateStorage: () => (state) => {
        if (state) useCrm.setState({ hydrated: true, now: Date.now() });
      },
    },
  ),
);

/** Accès hors React (actions métier, automatisations). */
export const crm = () => useCrm.getState();

export function findById<K extends EntityName>(collection: K, id: ID | undefined | null): EntityMap[K] | undefined {
  if (!id) return undefined;
  return (useCrm.getState()[collection] as EntityMap[K][]).find((r) => r.id === id);
}
