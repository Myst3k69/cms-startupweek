import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { fromRow, pick } from "@/lib/server/rows";
import { PublicDocument, type PublicDocumentData } from "@/features/billing/components/public-document";
import type { Contact, Deal, EventSession, Invoice, Organization, Quote, Settings } from "@/lib/domain/types";

/**
 * Facture ou devis envoyé par email ({{lien_document}}) : lien personnel par jeton non
 * devinable (64 caractères hexadécimaux), sans compte. Les brouillons ne sont jamais
 * servis ; seules les données imprimées sur le document sont transmises à la page.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Votre document — StartupWeek" }, robots: { index: false, follow: false } };

type Row = Record<string, unknown>;

const CONTACT_KEYS = ["id", "firstName", "lastName", "email", "phone", "city", "country"] as const;
const ORG_KEYS = ["id", "name", "address", "city", "country", "siret", "vatNumber", "billingEmail"] as const;
const EVENT_KEYS = ["id", "name", "code", "startAt", "endAt", "mode", "city", "isTraining", "durationHours"] as const;

async function one<T>(table: string, id: string | undefined): Promise<T | undefined> {
  const db = getSupabaseAdmin();
  if (!db || !id) return undefined;
  const { data } = await db.from(table).select("*").eq("id", id).maybeSingle();
  return data ? fromRow<T>(data as Row) : undefined;
}

async function load(token: string): Promise<PublicDocumentData | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data: settingsRow } = await db.from("settings").select("*").limit(1).maybeSingle();
  if (!settingsRow) return null;
  const settings = fromRow<Settings>(settingsRow as Row);

  const { data: invRow } = await db.from("invoices").select("*").eq("public_token", token).maybeSingle();
  if (invRow) {
    const invoice = fromRow<Invoice>(invRow as Row);
    if (invoice.status === "brouillon" || !invoice.number) return null;
    const related: Invoice[] = [];
    if (invoice.applicationId) {
      const { data } = await db.from("invoices").select("*").eq("application_id", invoice.applicationId).neq("status", "brouillon");
      related.push(...((data ?? []) as Row[]).map((r) => fromRow<Invoice>(r)));
    }
    if (invoice.creditedInvoiceId && !related.some((i) => i.id === invoice.creditedInvoiceId)) {
      const credited = await one<Invoice>("invoices", invoice.creditedInvoiceId);
      if (credited) related.push(credited);
    }
    const [contact, org, ev] = await Promise.all([one<Contact>("contacts", invoice.contactId), one<Organization>("organizations", invoice.orgId), one<EventSession>("sessions", invoice.eventId)]);
    return {
      kind: "invoice",
      invoice,
      invoices: related,
      settings,
      contact: pick(contact, CONTACT_KEYS) as Contact | undefined,
      org: pick(org, ORG_KEYS) as Organization | undefined,
      ev: pick(ev, EVENT_KEYS) as EventSession | undefined,
    };
  }

  const { data: quoteRow } = await db.from("quotes").select("*").eq("public_token", token).maybeSingle();
  if (quoteRow) {
    const quote = fromRow<Quote>(quoteRow as Row);
    if (quote.status === "brouillon" || !quote.number) return null;
    const [contact, org, ev, deal] = await Promise.all([
      one<Contact>("contacts", quote.contactId),
      one<Organization>("organizations", quote.orgId),
      one<EventSession>("sessions", quote.eventId),
      one<Deal>("deals", quote.dealId),
    ]);
    return {
      kind: "quote",
      quote,
      settings,
      contact: pick(contact, CONTACT_KEYS) as Contact | undefined,
      org: pick(org, ORG_KEYS) as Organization | undefined,
      ev: pick(ev, EVENT_KEYS) as EventSession | undefined,
      deal: deal ? ({ id: deal.id, title: deal.title } as Deal) : undefined,
    };
  }
  return null;
}

export default async function PublicDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const data = await load(token);
  if (!data) notFound();
  return <PublicDocument data={data} />;
}
