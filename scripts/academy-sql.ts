/**
 * Génère le SQL d'insertion de la formation « Construire son MVP avec l'IA » dans crm.academy_*.
 *
 *   npx tsx scripts/academy-sql.ts > supabase/data/academy_mvp_ia.sql
 *
 * - Idempotent et non destructif : `on conflict (id) do nothing` (une formation déjà
 *   insérée, puis modifiée dans le CRM, n'est jamais écrasée).
 * - Statut « relecture » : à relire puis publier depuis Academy → Formations.
 * - Sessions liées : toutes les sessions StartupWeek (kind = startup_week) présentes en base.
 * - Blocs « ressource » pointant vers une ressource absente de la base : retirés.
 */
import { mvpIaCourse } from "../src/lib/data/academy/mvp-ia";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const snake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** Littéral SQL : texte en dollar-quoting, listes de textes en text[], objets en jsonb. */
function lit(v: unknown): string {
  if (v === undefined || v === null) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return quote(v);
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v.length ? `array[${v.map(quote).join(", ")}]::text[]` : "'{}'::text[]";
  return `${quote(JSON.stringify(v as Json))}::jsonb`;
}
function quote(s: string): string {
  let tag = "q";
  while (s.includes(`$${tag}$`)) tag += "q";
  return `$${tag}$${s}$${tag}$`;
}

function insert(table: string, row: Record<string, unknown>, overrides: Record<string, string> = {}): string {
  const entries = Object.entries(row).filter(([, v]) => v !== undefined);
  const cols = entries.map(([k]) => snake(k));
  const vals = entries.map(([k, v]) => overrides[snake(k)] ?? lit(v));
  return `insert into crm.${table} (${cols.join(", ")})\nvalues (${vals.join(", ")})\non conflict (id) do nothing;`;
}

const built = mvpIaCourse();
const course = { ...built.course, status: "relecture" as const, publishedAt: undefined, inCatalog: false };
const out: string[] = [
  "-- Formation type StartupWeek Academy : « Construire son MVP avec l'IA » (générée par scripts/academy-sql.ts).",
  `-- ${built.modules.length} modules, ${built.lessons.length} leçons, ${built.lessons.reduce((s, l) => s + l.estimatedMinutes, 0)} minutes.`,
  "begin;",
  insert("academy_courses", course, {
    event_ids: "(select coalesce(array_agg(id order by start_at), '{}'::text[]) from crm.sessions where kind = 'startup_week')",
    author_ids: "(select coalesce(array_agg(id order by created_at), '{}'::text[]) from crm.team_members where role = 'admin' and active)",
  }),
  ...built.modules.map((m) => insert("academy_modules", m)),
  ...built.lessons.map((l) => insert("academy_lessons", l)),
  `-- Blocs « ressource » sans ressource correspondante en base : retirés.
update crm.academy_lessons l
set blocks = (select coalesce(jsonb_agg(b order by ord), '[]'::jsonb)
              from jsonb_array_elements(l.blocks) with ordinality as e(b, ord)
              where b ->> 'type' <> 'ressource' or exists (select 1 from crm.resources r where r.id = b ->> 'resourceId'))
where l.course_id = ${quote(course.id)}
  and exists (select 1 from jsonb_array_elements(l.blocks) b where b ->> 'type' = 'ressource' and not exists (select 1 from crm.resources r where r.id = b ->> 'resourceId'));`,
  "commit;",
];
console.log(out.join("\n\n"));
