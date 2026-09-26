/**
 * Synchronisation distante (Supabase) — « write-through ».
 *
 * Mode démo (par défaut) : no-op, tout vit dans le store local persistant.
 * Mode supabase (NEXT_PUBLIC_CRM_DATA_MODE=supabase) : chaque mutation du store
 * est répercutée dans le schéma `crm` (RLS appliquée avec la session de l'utilisateur),
 * et `loadAll()` hydrate le store au démarrage.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Collections, EntityName, ID } from "@/lib/domain/types";

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
};

const MODE = process.env.NEXT_PUBLIC_CRM_DATA_MODE === "supabase" ? "supabase" : "demo";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schéma `crm` non typé (types générés à venir : supabase gen types)
type CrmClient = SupabaseClient<any, "crm">;
let client: CrmClient | null = null;
function getClient(): CrmClient | null {
  if (MODE !== "supabase" || !URL || !KEY) return null;
  client ??= createClient(URL, KEY, { db: { schema: "crm" } });
  return client;
}

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Conversion des clés de premier niveau (les objets imbriqués — jsonb — restent en camelCase). */
function mapKeys(row: Record<string, unknown>, fn: (k: string) => string) {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [fn(k), v]));
}

type SyncError = { collection: EntityName; message: string; at: string };
const errors: SyncError[] = [];
function report(collection: EntityName, message: string) {
  errors.unshift({ collection, message, at: new Date().toISOString() });
  if (typeof console !== "undefined") console.error(`[sync:${collection}]`, message);
}

export const remoteSync = {
  mode: MODE as "demo" | "supabase",
  get configured() {
    return getClient() !== null;
  },
  errors,
  upsert(collection: EntityName, row: object) {
    const c = getClient();
    if (!c) return;
    void c
      .from(TABLES[collection])
      .upsert(mapKeys(row as Record<string, unknown>, toSnake))
      .then(({ error }) => error && report(collection, error.message));
  },
  remove(collection: EntityName, id: ID) {
    const c = getClient();
    if (!c) return;
    void c
      .from(TABLES[collection])
      .delete()
      .eq("id", id)
      .then(({ error }) => error && report(collection, error.message));
  },
  /** Charge toutes les collections (volumétrie d'un organisme de formation : quelques milliers de lignes). */
  async loadAll(): Promise<Partial<Collections>> {
    const c = getClient();
    if (!c) return {};
    const out: Partial<Record<EntityName, unknown[]>> = {};
    await Promise.all(
      (Object.keys(TABLES) as EntityName[]).map(async (name) => {
        const { data, error } = await c.from(TABLES[name]).select("*").limit(10000);
        if (error) return report(name, error.message);
        out[name] = (data ?? []).map((r) => mapKeys(r as Record<string, unknown>, toCamel));
      }),
    );
    return out as Partial<Collections>;
  },
};
