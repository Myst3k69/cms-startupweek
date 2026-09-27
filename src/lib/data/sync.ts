/**
 * Synchronisation distante (Supabase) — « write-through » optimiste.
 *
 * Mode démo (par défaut) : no-op, tout vit dans le store local persistant.
 * Mode supabase : le store est chargé par `loadAll()` après connexion, puis chaque
 * mutation est écrite dans le schéma `crm` avec la session de l'utilisateur (RLS) :
 *   • écritures exécutées une par une, dans l'ordre (une candidature n'arrive jamais
 *     avant son contact : les clés étrangères sont respectées) ;
 *   • création → INSERT, modification → UPDATE des seuls champs modifiés (un champ
 *     vidé devient NULL), suppression → DELETE ;
 *   • la ligne renvoyée par la base (numéro attribué, statut recalculé par trigger…)
 *     remplace la ligne locale si celle-ci n'a pas changé entre-temps ;
 *   • refus de la base (droits, contrainte) → la modification locale est annulée
 *     et l'erreur est signalée à l'interface.
 */
import type { Activity, Collections, ContentStatDay, EntityName, ID, Settings, TrafficDay } from "@/lib/domain/types";
import { DATA_MODE, getSupabase, supabaseConfigured } from "./supabase";

/** Nom des tables SQL (schéma crm) pour chaque collection du store. */
export const TABLES: Record<EntityName, string> = {
  users: "team_members",
  organizations: "organizations",
  contacts: "contacts",
  submissions: "submissions",
  deals: "deals",
  tasks: "tasks",
  sequences: "sequences",
  emailTemplates: "email_templates",
  emails: "email_messages",
  events: "sessions",
  speakers: "speakers",
  applications: "applications",
  projects: "projects",
  attendances: "attendances",
  evaluations: "evaluations",
  complaints: "complaints",
  indicators: "qualiopi_indicators",
  evidences: "qualiopi_evidences",
  improvementActions: "improvement_actions",
  watchItems: "watch_items",
  quotes: "quotes",
  invoices: "invoices",
  payments: "payments",
  bankTransactions: "bank_transactions",
  resources: "resources",
  contents: "contents",
  automations: "automation_rules",
  offers: "offers",
  courses: "academy_courses",
  courseModules: "academy_modules",
  lessons: "academy_lessons",
  academyPaths: "academy_paths",
  enrollments: "academy_enrollments",
  lessonProgress: "academy_progress",
  assignments: "academy_assignments",
  learnerConnections: "academy_connections",
  cohorts: "academy_cohorts",
};

type Row = Record<string, unknown>;

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Vers la base, création : clés en snake_case, champs absents omis (les valeurs par défaut SQL s'appliquent). */
function toInsert(row: object): Row {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined).map(([k, v]) => [toSnake(k), v]));
}

/** Vers la base, modification : un champ explicitement vidé (undefined) est mis à NULL. */
function toPatch(patch: object): Row {
  return Object.fromEntries(Object.entries(patch).map(([k, v]) => [toSnake(k), v === undefined ? null : v]));
}

/** Depuis la base : clés de premier niveau en camelCase (les jsonb restent tels quels), NULL → champ absent. */
function fromDb(row: Row): Row {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null).map(([k, v]) => [toCamel(k), v]));
}

/* ─────────────────────────── Erreurs & écouteurs ─────────────────────────── */

export type SyncError = { collection: EntityName | "activities" | "settings"; message: string; at: string };
type ErrorListener = (e: SyncError) => void;
type RowListener = (collection: EntityName, row: Row, sentUpdatedAt: string | undefined) => void;

const errors: SyncError[] = [];
const errorListeners = new Set<ErrorListener>();
let rowListener: RowListener | null = null;

/** Traduction lisible des erreurs PostgREST / Postgres les plus courantes. */
export function describeDbError(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "PGRST106":
      return "Le schéma « crm » n'est pas exposé par l'API Supabase (Project Settings → Data API → Exposed schemas).";
    case "PGRST116":
    case "42501":
      return "Action refusée : vos droits ne permettent pas cette modification.";
    case "23505":
      return "Doublon : un enregistrement avec la même valeur unique existe déjà.";
    case "23503":
      return "Lien invalide : l'élément lié n'existe pas (ou plus) en base.";
    case "23514":
      return `Valeur refusée par la base : ${error.message}`;
    default:
      return error.message;
  }
}

function report(collection: SyncError["collection"], message: string) {
  const e: SyncError = { collection, message, at: new Date().toISOString() };
  errors.unshift(e);
  if (errors.length > 50) errors.length = 50;
  console.error(`[sync:${collection}]`, message);
  errorListeners.forEach((l) => l(e));
}

/* ─────────────────────────── File d'écriture séquentielle ─────────────────────────── */

let chain: Promise<unknown> = Promise.resolve();
let pending = 0;

function enqueue(op: () => Promise<void>) {
  pending++;
  const run = async () => {
    try {
      await op();
    } catch (e) {
      console.error("[sync] écriture interrompue", e);
    } finally {
      pending--;
    }
  };
  chain = chain.then(run, run);
}

type WriteOptions = { rollback?: () => void; sentUpdatedAt?: string };

async function fetchAll(table: string, order: { column: string; ascending: boolean } = { column: "id", ascending: true }, max = 20_000) {
  const c = getSupabase()!;
  const page = 1000; // plafond par requête de PostgREST sur Supabase (max-rows)
  const rows: Row[] = [];
  for (let from = 0; from < max; from += page) {
    let query = c.from(table).select("*").order(order.column, { ascending: order.ascending });
    // Départage par id : sans ordre total, la pagination peut sauter ou doubler des lignes de même date.
    if (order.column !== "id") query = query.order("id", { ascending: true });
    const { data, error } = await query.range(from, from + page - 1);
    if (error) return { rows, error };
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < page) break;
  }
  return { rows: rows.slice(0, max), error: null };
}

export interface RemoteData {
  collections: Partial<Collections>;
  activities: Activity[];
  settings?: Partial<Settings>;
  traffic: TrafficDay[];
  contentStats: ContentStatDay[];
  /** Erreur bloquante (ex. schéma non exposé) : rien n'a pu être chargé. */
  fatal?: string;
}

export const remoteSync = {
  mode: DATA_MODE,
  get configured() {
    return supabaseConfigured;
  },
  get active() {
    return getSupabase() !== null;
  },
  /** Écritures en attente (avertissement avant de quitter la page). */
  get pending() {
    return pending;
  },
  errors,
  onError(listener: ErrorListener) {
    errorListeners.add(listener);
    return () => errorListeners.delete(listener);
  },
  /** Le store s'abonne pour recevoir les lignes telles qu'enregistrées par la base. */
  setRowListener(listener: RowListener | null) {
    rowListener = listener;
  },

  insert(collection: EntityName, row: object, opts: WriteOptions = {}) {
    const c = getSupabase();
    if (!c) return;
    const payload = toInsert(row);
    enqueue(async () => {
      const { data, error } = await c.from(TABLES[collection]).insert(payload).select().single();
      if (error) {
        opts.rollback?.();
        return report(collection, describeDbError(error));
      }
      if (data) rowListener?.(collection, fromDb(data as Row), opts.sentUpdatedAt);
    });
  },

  update(collection: EntityName, id: ID, patch: object, opts: WriteOptions = {}) {
    const c = getSupabase();
    if (!c) return;
    const payload = toPatch(patch);
    delete payload.id;
    enqueue(async () => {
      const { data, error } = await c.from(TABLES[collection]).update(payload).eq("id", id).select().maybeSingle();
      if (error || !data) {
        opts.rollback?.();
        // 0 ligne modifiée sans erreur = ligne invisible ou non modifiable pour ce rôle (RLS).
        return report(collection, error ? describeDbError(error) : describeDbError({ code: "42501", message: "" }));
      }
      rowListener?.(collection, fromDb(data as Row), opts.sentUpdatedAt);
    });
  },

  remove(collection: EntityName, id: ID, opts: WriteOptions = {}) {
    const c = getSupabase();
    if (!c) return;
    enqueue(async () => {
      const { data, error } = await c.from(TABLES[collection]).delete().eq("id", id).select("id");
      if (error || !data?.length) {
        opts.rollback?.();
        return report(collection, error ? describeDbError(error) : describeDbError({ code: "42501", message: "" }));
      }
    });
  },

  /** Relit des lignes en base et met le store à jour (ex. statut d'un email envoyé par le serveur). */
  async refresh(collection: EntityName, ids: ID[]) {
    const c = getSupabase();
    if (!c || !ids.length) return;
    const { data, error } = await c.from(TABLES[collection]).select("*").in("id", ids);
    if (error) return report(collection, describeDbError(error));
    for (const row of (data ?? []) as Row[]) rowListener?.(collection, fromDb(row), undefined);
  },

  /** Journal d'activité : ajout seul (immuable côté base, sauf admin). */
  insertActivity(activity: Activity) {
    const c = getSupabase();
    if (!c) return;
    const payload = toInsert(activity);
    enqueue(async () => {
      const { error } = await c.from("activities").insert(payload);
      if (error) report("activities", describeDbError(error));
    });
  },

  /** Paramètres (ligne unique id = true). */
  updateSettings(patch: Partial<Settings>, opts: WriteOptions = {}) {
    const c = getSupabase();
    if (!c) return;
    const payload = toPatch(patch);
    enqueue(async () => {
      const { data, error } = await c.from("settings").update(payload).eq("id", true).select().maybeSingle();
      if (error || !data) {
        opts.rollback?.();
        report("settings", error ? describeDbError(error) : describeDbError({ code: "42501", message: "" }));
      }
    });
  },

  /** Charge toutes les collections visibles pour l'utilisateur connecté (RLS : une section non autorisée revient vide). */
  async loadAll(): Promise<RemoteData> {
    const c = getSupabase();
    if (!c) return { collections: {}, activities: [], traffic: [], contentStats: [] };
    const collections: Partial<Record<EntityName, unknown[]>> = {};
    let fatal: string | undefined;

    await Promise.all(
      (Object.keys(TABLES) as EntityName[]).map(async (name) => {
        const { rows, error } = await fetchAll(TABLES[name]);
        if (error) {
          if (error.code === "PGRST106") fatal = describeDbError(error);
          return report(name, describeDbError(error));
        }
        collections[name] = rows.map(fromDb);
      }),
    );
    if (fatal) return { collections: {}, activities: [], traffic: [], contentStats: [], fatal };

    const [acts, settings, traffic, contentStats] = await Promise.all([
      fetchAll("activities", { column: "at", ascending: false }, 1500),
      c.from("settings").select("*").eq("id", true).maybeSingle(),
      fetchAll("traffic_days", { column: "date", ascending: true }, 2000),
      // Plus récents d'abord : si le plafond est atteint, ce sont les plus anciens jours qui manquent.
      fetchAll("content_stats_days", { column: "date", ascending: false }, 20_000),
    ]);
    if (acts.error) report("activities", describeDbError(acts.error));
    if (settings.error) report("settings", describeDbError(settings.error));

    let s: Partial<Settings> | undefined;
    if (settings.data) {
      const { id, createdAt, updatedAt, ...rest } = fromDb(settings.data as Row);
      void id; void createdAt; void updatedAt;
      s = rest as Partial<Settings>;
    }
    return {
      collections: collections as Partial<Collections>,
      activities: acts.rows.map(fromDb) as unknown as Activity[],
      settings: s,
      traffic: traffic.rows.map(fromDb) as unknown as TrafficDay[],
      contentStats: contentStats.rows.map(fromDb) as unknown as ContentStatDay[],
    };
  },
};
