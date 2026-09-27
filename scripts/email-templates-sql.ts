/**
 * Génère le SQL d'insertion des modèles d'emails et de la séquence Digital Starter Kit
 * depuis src/lib/data/email-templates.ts (source unique), pour une migration.
 *   node --experimental-strip-types scripts/email-templates-sql.ts
 * Insertion « on conflict do nothing » : un modèle déjà modifié en base n'est pas écrasé.
 */
import { DSK_SEQUENCE, EMAIL_TEMPLATES, templateVariables } from "../src/lib/data/email-templates.ts";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const arr = (a: string[]) => (a.length ? `array[${a.map(q).join(", ")}]::text[]` : "'{}'::text[]");

const rows = EMAIL_TEMPLATES.map(
  (t) => `  (${q(t.id)}, ${q(t.name)}, ${q(t.category)},\n   ${q(t.subject)},\n   ${q(t.body)},\n   ${arr(templateVariables(`${t.subject} ${t.body}`))}, ${t.replacesN8n ? q(t.replacesN8n) : "null"})`,
);

console.log(`insert into crm.email_templates (id, name, category, subject, body, variables, replaces_n8n) values
${rows.join(",\n")}
on conflict (id) do nothing;

insert into crm.sequences (id, name, description, trigger, active, steps) values
  (${q(DSK_SEQUENCE.id)}, ${q(DSK_SEQUENCE.name)}, ${q(DSK_SEQUENCE.description)}, ${q(DSK_SEQUENCE.trigger)}, true,
   ${q(JSON.stringify(DSK_SEQUENCE.steps))}::jsonb)
on conflict (id) do nothing;`);
