"use client";

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import type { Tone } from "@/lib/domain/constants";

const INTEGRATIONS: { name: string; status: string; tone: Tone; detail: string; action?: string }[] = [
  {
    name: "Vercel Web Analytics",
    status: "Actif",
    tone: "success",
    detail: "Mesure d'audience sans cookie (exemptée de consentement). Source des visiteurs / pages vues de ce tableau.",
  },
  {
    name: "Google Analytics 4",
    status: "Consent Mode v2",
    tone: "success",
    detail: "Chargé avec analytics_storage / ad_storage « denied » par défaut, mis à jour au choix de l'utilisateur.",
  },
  {
    name: "Meta Pixel",
    status: "⚠ Sans consentement",
    tone: "danger",
    detail: "Chargé sans condition : non conforme RGPD / ePrivacy (traceur publicitaire soumis à consentement préalable).",
    action: "Ne charger fbq qu'après consentement « marketing » (ou fbq('consent','revoke') par défaut puis 'grant'), et doubler par l'API Conversions côté serveur depuis le CRM.",
  },
  {
    name: "Crisp (chat)",
    status: "Actif",
    tone: "info",
    detail: "Cookies de session du chat : à déclarer dans la politique cookies ; pas de ciblage publicitaire.",
  },
];

const EVENTS: { name: string; when: string; where: string; source: string }[] = [
  { name: "PageView", when: "Chaque page vue", where: "GA4 page_view · Meta", source: "Site (client)" },
  { name: "ViewContent", when: "Page session / offre consultée", where: "GA4 view_item · Meta", source: "Site (client)" },
  { name: "Lead", when: "Candidature, contact, accompagnement, Digital Starter Kit envoyés", where: "GA4 generate_lead · Meta", source: "Site → /api/intake (200)" },
  { name: "InitiateCheckout", when: "Candidat qualifié (statut « Qualifiée »)", where: "Meta CAPI", source: "CRM (serveur)" },
  { name: "Schedule", when: "Entretien réservé (statut « Entretien planifié »)", where: "Meta CAPI · GA4", source: "CRM (serveur)" },
  { name: "CompleteRegistration", when: "Acompte payé (statut « Inscrite »)", where: "Meta CAPI · GA4 purchase", source: "Webhook Stripe" },
];

/** État des intégrations de mesure + plan de marquage (référence statique, maintenue avec le site). */
export function TrackingCard() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Tracking & conformité</CardTitle>
          <CardDescription>Intégrations de mesure de startupweek.tech et plan de marquage des conversions</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-2">
        <ul className="space-y-2">
          {INTEGRATIONS.map((i) => (
            <li key={i.name} className="rounded-md border border-border px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{i.name}</p>
                <Badge tone={i.tone} dot>
                  {i.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{i.detail}</p>
              {i.action ? <p className="mt-1.5 rounded bg-danger-soft px-2 py-1.5 text-xs text-danger-text">À faire : {i.action}</p> : null}
            </li>
          ))}
        </ul>
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Plan de mesure</p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[480px] text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-2/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-3 py-2 text-left font-semibold">Événement</th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">Déclencheur</th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">Plateformes</th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">Émis par</th>
                </tr>
              </thead>
              <tbody>
                {EVENTS.map((e) => (
                  <tr key={e.name} className="border-b border-border last:border-0">
                    <th scope="row" className="px-3 py-2 text-left font-mono font-medium text-foreground">{e.name}</th>
                    <td className="px-3 py-2 text-muted-foreground">{e.when}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.where}</td>
                    <td className="px-3 py-2 text-foreground">{e.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Les conversions « profondes » (qualifié, entretien, inscription payée) partent désormais du CRM côté serveur : elles ne dépendent plus du navigateur ni des bloqueurs, et respectent le consentement enregistré sur la fiche contact.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
