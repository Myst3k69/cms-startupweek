import { format, parseISO, isValid } from "date-fns";
import { seriesColor } from "@/components/charts";
import { CHANNELS } from "@/lib/domain/constants";
import type { Channel, ContentItem, ContentStatus, ContentType } from "@/lib/domain/types";

/** Couleur fixe par canal (palette catégorielle, ordre de CHANNELS — jamais recyclée). */
export const CHANNEL_COLOR: Record<Channel, string> = Object.fromEntries(CHANNELS.map((c, i) => [c.value, seriesColor(i)])) as Record<Channel, string>;

/** Canal par défaut selon le type de contenu. */
export const DEFAULT_CHANNEL: Record<ContentType, Channel> = {
  article: "blog",
  page_session: "site",
  temoignage: "site",
  faq: "site",
  newsletter: "newsletter",
  post_linkedin: "linkedin",
  post_instagram: "instagram",
  etude_de_cas: "blog",
  page: "site",
};

/** Colonnes du pipeline éditorial (l'archive est hors pipeline). */
export const CONTENT_PIPELINE: ContentStatus[] = ["idee", "redaction", "relecture", "planifie", "publie"];

/** Date de référence d'un contenu dans le calendrier : publication, sinon programmation. */
export function contentDate(c: Pick<ContentItem, "status" | "publishedAt" | "scheduledAt">): string | undefined {
  if (c.status === "publie") return c.publishedAt ?? c.scheduledAt;
  return c.scheduledAt;
}

/** ISO → valeur d'un <input type="datetime-local"> (heure locale). */
export function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "yyyy-MM-dd'T'HH:mm") : "";
}

/** Valeur d'un <input type="datetime-local"> → ISO (undefined si vide / invalide). */
export function fromLocalInput(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isValid(d) ? d.toISOString() : undefined;
}

export function dayKey(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd");
}

/** URL publique du contenu sur le site (undefined pour les réseaux sociaux / newsletter). */
export function publicPath(c: Pick<ContentItem, "type" | "channel" | "slug">): string | undefined {
  if (c.channel === "linkedin" || c.channel === "instagram" || c.channel === "newsletter") return undefined;
  switch (c.type) {
    case "article":
      return `/blog/${c.slug}`;
    case "etude_de_cas":
      return `/etudes-de-cas/${c.slug}`;
    case "page_session":
      return `/sessions/${c.slug}`;
    case "faq":
      return `/faq#${c.slug}`;
    case "temoignage":
      return `/temoignages#${c.slug}`;
    case "page":
      return `/${c.slug}`;
    default:
      return c.channel === "blog" ? `/blog/${c.slug}` : `/${c.slug}`;
  }
}

export function siteHost(website: string): string {
  return website.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export function splitTags(input: string): string[] {
  return Array.from(new Set(input.split(",").map((t) => t.trim()).filter(Boolean)));
}

export const SEO_TITLE_MAX = 60;
export const SEO_DESC_MAX = 155;
