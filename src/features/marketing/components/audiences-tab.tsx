"use client";

import * as React from "react";
import { Download, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, FormField, Select, useToast } from "@/components/ui";
import { useActions, useCollection, useSession } from "@/lib/hooks";
import { LEAD_SOURCES, LIFECYCLES, labelOf } from "@/lib/domain/constants";
import type { Application, Contact } from "@/lib/domain/types";
import { number } from "@/lib/format";
import { Hint } from "./parts";

const DAY = 86_400_000;
const PENDING: Application["status"][] = ["nouvelle", "qualifiee", "entretien", "acceptee", "liste_attente"];

interface Segment {
  key: string;
  label: string;
  use: string;
  match: (c: Contact, ctx: { apps: Map<string, Application[]>; upcoming: Set<string>; now: number }) => boolean;
}

const SEGMENTS: Segment[] = [
  {
    key: "candidats",
    label: "Candidats non inscrits (6 derniers mois)",
    use: "Retargeting : relancer les candidatures en cours ou en liste d'attente avec une date proche.",
    match: (c, { apps, now }) => (apps.get(c.id) ?? []).some((a) => PENDING.includes(a.status) && now - new Date(a.submittedAt).getTime() < 180 * DAY),
  },
  {
    key: "alumni",
    label: "Alumni et participants",
    use: "Source d'audience similaire (lookalike) : des profils qui ressemblent à ceux qui sont venus.",
    match: (c) => c.lifecycle === "alumni" || c.lifecycle === "participant",
  },
  {
    key: "dsk",
    label: "Téléchargeurs du Digital Starter Kit (non candidats)",
    use: "Nurturing : ils connaissent la méthode, pas encore l'offre.",
    match: (c, { apps }) => (c.source === "digital_starter_kit" || c.tags.includes("Digital Starter Kit")) && !(apps.get(c.id) ?? []).length,
  },
  {
    key: "newsletter",
    label: "Abonnés newsletter",
    use: "Annonce des nouvelles dates auprès d'une audience déjà engagée.",
    match: (c) => c.source === "newsletter" || c.tags.includes("Newsletter"),
  },
  {
    key: "exclusion",
    label: "Exclusion : inscrits aux sessions à venir",
    use: "Liste d'exclusion à ajouter à toutes les campagnes de conversion : ne payez pas pour toucher des personnes déjà inscrites.",
    match: (c, { apps, upcoming }) => (apps.get(c.id) ?? []).some((a) => a.status === "inscrite" && upcoming.has(a.eventId)),
  },
];

const COUNTRY_ISO: Record<string, string> = { France: "FR", Belgique: "BE", Suisse: "CH", Canada: "CA", Luxembourg: "LU", Maroc: "MA", Espagne: "ES", Allemagne: "DE", Italie: "IT", "Royaume-Uni": "GB", Portugal: "PT", Tunisie: "TN", Sénégal: "SN" };

const normName = (s?: string) => (s ?? "").trim().toLowerCase();

/** CSV séparé par des virgules, sans BOM : format attendu par les outils d'import des régies. */
function downloadPlainCsv(filename: string, headers: string[], rows: string[][]) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const blob = new Blob([[headers, ...rows].map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function sha256(value: string): Promise<string> {
  if (!value) return "";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Listes de clients pour les régies (Meta « Audience personnalisée », LinkedIn « Matched Audiences »).
 * Uniquement les contacts ayant donné leur consentement marketing et non désinscrits ; chaque export est journalisé.
 */
export function AudiencesTab({ now }: { now: number }) {
  const contacts = useCollection("contacts");
  const applications = useCollection("applications");
  const events = useCollection("events");
  const { log } = useActions();
  const { canEdit, can, user } = useSession();
  const toast = useToast();
  const canExport = canEdit("marketing") && can("contacts");
  const [segmentKey, setSegmentKey] = React.useState(SEGMENTS[0].key);
  const [source, setSource] = React.useState("");
  const [hash, setHash] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const segment = SEGMENTS.find((s) => s.key === segmentKey)!;

  const ctx = React.useMemo(() => {
    const apps = new Map<string, Application[]>();
    for (const a of applications) {
      const list = apps.get(a.contactId);
      if (list) list.push(a);
      else apps.set(a.contactId, [a]);
    }
    const upcoming = new Set(events.filter((e) => new Date(e.startAt).getTime() > now && e.status !== "annule").map((e) => e.id));
    return { apps, upcoming, now };
  }, [applications, events, now]);

  const result = React.useMemo(() => {
    const matched = contacts.filter((c) => segment.match(c, ctx) && (!source || c.source === source));
    const eligible = matched.filter((c) => c.consent.marketing && !c.consent.unsubscribedAt && c.email);
    return { matched, eligible, excluded: matched.length - eligible.length };
  }, [contacts, segment, ctx, source]);

  const exportFor = async (platform: "meta" | "linkedin") => {
    setBusy(true);
    try {
      const rows = await Promise.all(
        result.eligible.map(async (c) => {
          const email = c.email.trim().toLowerCase();
          const fn = normName(c.firstName);
          const ln = normName(c.lastName);
          const country = COUNTRY_ISO[c.country ?? ""] ?? "";
          if (platform === "meta") {
            const phone = (c.phone ?? "").replace(/[^\d+]/g, "").replace(/^0(\d{9})$/, "+33$1").replace(/^\+/, "");
            return hash ? [await sha256(email), await sha256(phone), await sha256(fn), await sha256(ln), await sha256(country.toLowerCase())] : [email, phone, fn, ln, country];
          }
          return hash ? [await sha256(email), c.firstName, c.lastName, c.jobTitle ?? "", country] : [email, c.firstName, c.lastName, c.jobTitle ?? "", country];
        }),
      );
      const headers = platform === "meta" ? ["email", "phone", "fn", "ln", "country"] : ["email", "firstname", "lastname", "jobtitle", "country"];
      downloadPlainCsv(`audience-${platform}-${segment.key}-${new Date().toISOString().slice(0, 10)}`, headers, rows);
      log({
        kind: "document",
        entity: "contacts",
        entityId: "audience-export",
        actorId: user?.id,
        summary: `Export d'audience ${platform === "meta" ? "Meta" : "LinkedIn"} « ${segment.label} » : ${rows.length} contacts consentants${hash ? " (emails hachés SHA-256)" : ""}`,
        meta: { segment: segment.key, platform, count: rows.length, hashed: hash },
      });
      toast({ title: "Audience exportée", description: `${rows.length} contacts · à importer dans ${platform === "meta" ? "Meta Ads Manager → Audiences" : "LinkedIn Campaign Manager → Audiences"}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <div>
            <CardTitle>Construire une audience</CardTitle>
            <CardDescription>Listes à importer dans les régies pour cibler, exclure ou créer des audiences similaires</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Segment" htmlFor="aud-segment">
              <Select id="aud-segment" value={segmentKey} onChange={(e) => setSegmentKey(e.target.value)} options={SEGMENTS.map((s) => ({ value: s.key, label: s.label }))} />
            </FormField>
            <FormField label="Source d'acquisition" htmlFor="aud-source" hint="Optionnel">
              <Select id="aud-source" value={source} onChange={(e) => setSource(e.target.value)} options={LEAD_SOURCES} placeholder="Toutes les sources" />
            </FormField>
          </div>
          <Hint>{segment.use}</Hint>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md bg-surface-2/70 px-3 py-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">Contacts du segment</p>
              <p className="tabular text-lg font-semibold text-foreground">{number(result.matched.length)}</p>
            </div>
            <div className="rounded-md bg-success-soft px-3 py-2.5">
              <p className="text-[11px] font-medium text-success-text">Exportables (consentement)</p>
              <p className="tabular text-lg font-semibold text-foreground">{number(result.eligible.length)}</p>
            </div>
            <div className="rounded-md bg-surface-2/70 px-3 py-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">Écartés (sans consentement)</p>
              <p className="tabular text-lg font-semibold text-foreground">{number(result.excluded)}</p>
            </div>
          </div>
          {result.eligible.length < 100 ? (
            <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-text">
              Moins de 100 contacts : Meta et LinkedIn exigent un minimum (≈ 100 correspondances pour Meta, 300 membres pour LinkedIn) avant de diffuser sur une liste. Utilisez-la plutôt comme source d'audience similaire ou comme exclusion.
            </p>
          ) : null}

          {canExport ? (
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <Checkbox label="Hacher les identifiants (SHA-256)" checked={hash} onChange={(e) => setHash(e.target.checked)} />
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Button variant="secondary" disabled={!result.eligible.length} loading={busy} onClick={() => exportFor("meta")}>
                  <Download /> CSV Meta
                </Button>
                <Button variant="secondary" disabled={!result.eligible.length} loading={busy} onClick={() => exportFor("linkedin")}>
                  <Download /> CSV LinkedIn
                </Button>
              </div>
            </div>
          ) : (
            <p className="border-t border-border pt-4 text-xs text-muted-foreground">Export réservé aux membres ayant le droit d'écriture Marketing et l'accès aux contacts.</p>
          )}

          {result.eligible.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <caption className="mb-2 text-left text-xs text-muted-foreground">Aperçu (10 premiers contacts exportables)</caption>
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-semibold">Contact</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Cycle de vie</th>
                    <th scope="col" className="py-2 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {result.eligible.slice(0, 10).map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3">
                        <span className="text-foreground">
                          {c.firstName} {c.lastName}
                        </span>
                        <span className="block text-xs text-muted-foreground">{c.email}</span>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{labelOf(LIFECYCLES, c.lifecycle)}</td>
                      <td className="py-2 text-muted-foreground">{labelOf(LEAD_SOURCES, c.source)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent-text" aria-hidden="true" /> Cadre RGPD
            </CardTitle>
            <CardDescription>Ce que fait cet export, et ce qu'il ne fait pas</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5 text-sm text-foreground">
            <li>
              <Badge tone="success" dot>
                Filtré
              </Badge>{" "}
              Seuls les contacts avec consentement marketing (case newsletter / prospection) et non désinscrits sont exportés.
            </li>
            <li>
              <Badge tone="info" dot>
                Haché
              </Badge>{" "}
              Option SHA-256 : emails, téléphones et noms normalisés puis hachés dans le navigateur, avant téléchargement (format accepté par Meta ; LinkedIn accepte l'email haché).
            </li>
            <li>
              <Badge tone="accent" dot>
                Tracé
              </Badge>{" "}
              Chaque export est inscrit au journal d'activité (segment, régie, nombre de contacts).
            </li>
            <li className="text-muted-foreground">
              À vérifier de votre côté : mention de ce ciblage publicitaire dans la politique de confidentialité, conditions d'utilisation des listes de clients de chaque régie, suppression du fichier après import.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
