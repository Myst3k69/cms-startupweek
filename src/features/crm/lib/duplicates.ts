/**
 * Détection et fusion des doublons de contacts.
 *
 * Airtable + n8n faisaient un upsert sur l'email EXACT (casse comprise) : les doublons
 * « Jean.Dupont@Gmail.com » / « jean.dupont@gmail.com » se sont accumulés. Ici :
 * même email normalisé OU même prénom + nom (sans accents ni casse).
 */
import { crm, findById, useCrm } from "@/lib/store";
import type { Contact, ContactLifecycle, ID } from "@/lib/domain/types";
import { contactName } from "@/lib/domain/selectors";
import { normalizeEmail } from "@/lib/utils";
import { normText } from "./format";

export interface DuplicateGroup {
  key: string;
  reason: "email" | "nom";
  contacts: Contact[]; // triés du plus ancien au plus récent (le premier est conservé)
}

const byAge = (a: Contact, b: Contact) => a.createdAt.localeCompare(b.createdAt);

export function findDuplicateGroups(contacts: Contact[]): DuplicateGroup[] {
  const byEmail = new Map<string, Contact[]>();
  const byName = new Map<string, Contact[]>();
  for (const c of contacts) {
    const e = normalizeEmail(c.email || "");
    if (e) byEmail.set(e, [...(byEmail.get(e) ?? []), c]);
    const n = normText(`${c.firstName} ${c.lastName}`);
    if (n && c.lastName.trim()) byName.set(n, [...(byName.get(n) ?? []), c]);
  }
  const groups: DuplicateGroup[] = [];
  const seen = new Set<string>();
  for (const [k, list] of byEmail) {
    if (list.length < 2) continue;
    const sorted = [...list].sort(byAge);
    groups.push({ key: `email:${k}`, reason: "email", contacts: sorted });
    seen.add(sorted.map((c) => c.id).join("|"));
  }
  for (const [k, list] of byName) {
    if (list.length < 2) continue;
    const sorted = [...list].sort(byAge);
    const sig = sorted.map((c) => c.id).join("|");
    if (seen.has(sig)) continue; // déjà signalé via l'email
    groups.push({ key: `nom:${k}`, reason: "nom", contacts: sorted });
  }
  return groups;
}

/** Nombre de contacts « en trop » (ceux qui disparaîtraient après fusion). */
export function duplicateCount(groups: DuplicateGroup[]): number {
  return groups.reduce((s, g) => s + g.contacts.length - 1, 0);
}

const LIFECYCLE_RANK: Record<ContactLifecycle, number> = { lead: 0, prospect: 1, candidat: 2, participant: 3, alumni: 4, client: 4, partenaire: 4 };

/**
 * Fusionne `removeId` dans `keepId` : réaffecte candidatures, demandes, opportunités,
 * devis, factures, tâches, emails, réclamations, émargements, évaluations, projets
 * et l'historique ; union des tags ; complète les champs vides ; supprime le doublon.
 */
export function mergeContacts(keepId: ID, removeId: ID): { moved: number } | undefined {
  if (keepId === removeId) return undefined;
  const s = crm();
  const keep = findById("contacts", keepId);
  const drop = findById("contacts", removeId);
  if (!keep || !drop) return undefined;
  let moved = 0;

  s.applications.filter((x) => x.contactId === drop.id).forEach((x) => { s.update("applications", x.id, { contactId: keep.id }); moved++; });
  s.submissions.filter((x) => x.contactId === drop.id).forEach((x) => { s.update("submissions", x.id, { contactId: keep.id }); moved++; });
  s.deals.filter((x) => x.contactId === drop.id).forEach((x) => { s.update("deals", x.id, { contactId: keep.id }); moved++; });
  s.quotes.filter((x) => x.contactId === drop.id).forEach((x) => { s.update("quotes", x.id, { contactId: keep.id }); moved++; });
  s.invoices.filter((x) => x.contactId === drop.id).forEach((x) => { s.update("invoices", x.id, { contactId: keep.id }); moved++; });
  s.complaints.filter((x) => x.contactId === drop.id).forEach((x) => { s.update("complaints", x.id, { contactId: keep.id }); moved++; });
  s.attendances.filter((x) => x.contactId === drop.id).forEach((x) => { s.update("attendances", x.id, { contactId: keep.id }); moved++; });
  s.evaluations.filter((x) => x.contactId === drop.id).forEach((x) => { s.update("evaluations", x.id, { contactId: keep.id }); moved++; });
  s.tasks
    .filter((x) => x.related?.entity === "contacts" && x.related.id === drop.id)
    .forEach((x) => { s.update("tasks", x.id, { related: { entity: "contacts", id: keep.id } }); moved++; });
  s.emails
    .filter((x) => x.related?.entity === "contacts" && x.related.id === drop.id)
    .forEach((x) => { s.update("emails", x.id, { related: { entity: "contacts", id: keep.id } }); moved++; });
  s.projects
    .filter((p) => p.founderIds.includes(drop.id))
    .forEach((p) => { s.update("projects", p.id, { founderIds: Array.from(new Set(p.founderIds.map((f) => (f === drop.id ? keep.id : f)))) }); moved++; });

  // Historique : les événements du doublon rejoignent la fiche conservée.
  useCrm.setState((st) => ({ activities: st.activities.map((a) => (a.entity === "contacts" && a.entityId === drop.id ? { ...a, entityId: keep.id } : a)) }));

  const pick = <K extends keyof Contact>(k: K) => (keep[k] === undefined || keep[k] === "" ? drop[k] : keep[k]);
  const lastContactAt = [keep.lastContactAt, drop.lastContactAt].filter(Boolean).sort().at(-1);
  const marketing = keep.consent.marketing || drop.consent.marketing;
  s.update(
    "contacts",
    keep.id,
    {
      phone: pick("phone"),
      city: pick("city"),
      country: pick("country"),
      age: pick("age"),
      jobTitle: pick("jobTitle"),
      orgId: pick("orgId"),
      linkedin: pick("linkedin"),
      ownerId: pick("ownerId"),
      utm: pick("utm"),
      notes: [keep.notes, drop.notes].filter(Boolean).join("\n\n") || undefined,
      tags: Array.from(new Set([...keep.tags, ...drop.tags])),
      lifecycle: LIFECYCLE_RANK[drop.lifecycle] > LIFECYCLE_RANK[keep.lifecycle] ? drop.lifecycle : keep.lifecycle,
      score: Math.max(keep.score, drop.score),
      lastContactAt,
      consent: {
        gdpr: keep.consent.gdpr || drop.consent.gdpr,
        marketing,
        marketingAt: marketing ? [keep.consent.marketingAt, drop.consent.marketingAt].filter(Boolean).sort().at(-1) : undefined,
        unsubscribedAt: [keep.consent.unsubscribedAt, drop.consent.unsubscribedAt].filter(Boolean).sort().at(-1),
        source: keep.consent.source ?? drop.consent.source,
      },
    },
    { log: `Fusion avec le doublon ${contactName(drop)} <${drop.email}> — ${moved} élément${moved > 1 ? "s" : ""} réaffecté${moved > 1 ? "s" : ""}`, kind: "modification" },
  );
  s.remove("contacts", drop.id);
  return { moved };
}
