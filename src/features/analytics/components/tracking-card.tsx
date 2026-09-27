"use client";

import * as React from "react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import type { Tone } from "@/lib/domain/constants";
import { useCrm } from "@/lib/store";
import { date, number } from "@/lib/format";

type Integration = { name: string; status: string; tone: Tone; detail: string; action?: string };

const THIRD_PARTY: Integration[] = [
  {
    name: "Vercel Web Analytics",
    status: "Actif · tableau séparé",
    tone: "info",
    detail: "Mesure d'audience sans cookie, consultable dans le tableau de bord Vercel. Ses données ne sont pas importées ici.",
  },
  {
    name: "Google Analytics 4",
    status: "Consent Mode v2",
    tone: "success",
    detail: "Chargé avec analytics_storage / ad_storage « denied » par défaut, mis à jour au choix de l'utilisateur. Données non importées ici.",
  },
  {
    name: "Meta Pixel",
    status: "⚠ Sans consentement",
    tone: "danger",
    detail: "Chargé sans condition : non conforme RGPD / ePrivacy (traceur publicitaire soumis à consentement préalable).",
    action: "Ne charger fbq qu'après consentement « marketing » (ou fbq('consent','revoke') par défaut puis 'grant').",
  },
  {
    name: "Crisp (chat)",
    status: "Actif",
    tone: "info",
    detail: "Cookies de session du chat : à déclarer dans la politique cookies ; pas de ciblage publicitaire.",
  },
];

const EVENTS: { name: string; when: string; feeds: string; source: string }[] = [
  { name: "Page vue", when: "Chaque page du site (hors espace membre)", feeds: "Visiteurs, pages vues, sources · vues et lecteurs de l'article", source: "Navigateur → /api/event" },
  { name: "Clic", when: "Lien cliqué dans un article du blog", feeds: "Clics de l'article", source: "Navigateur → /api/event" },
  { name: "Formulaire commencé", when: "Premier champ touché (une fois par page)", feeds: "Formulaires démarrés", source: "Navigateur → /api/event" },
  { name: "Formulaire envoyé", when: "Candidature, contact, entreprise, partenaire, accompagnement, newsletter, kit", feeds: "Formulaires envoyés · lead du dernier article lu", source: "Serveur du site (route du formulaire)" },
];

const DAY = 86_400_000;

/** État réel de la mesure du site (dernière donnée reçue) + intégrations tierces et plan de mesure. */
export function TrackingCard({ now }: { now: number }) {
  const traffic = useCrm((s) => s.traffic);
  const contentStats = useCrm((s) => s.contentStats);

  const own = React.useMemo<Integration>(() => {
    const last = traffic.reduce((m, d) => (d.pageviews > 0 && d.date.slice(0, 10) > m ? d.date.slice(0, 10) : m), "");
    const views30 = traffic
      .filter((d) => new Date(d.date).getTime() >= now - 30 * DAY)
      .reduce((s, d) => s + d.pageviews, 0);
    const articles = new Set(contentStats.map((r) => r.contentId)).size;
    const name = "Mesure du site → CRM";
    if (!last) {
      return {
        name,
        status: "En attente de données",
        tone: "warning",
        detail: "Aucune page vue reçue pour l'instant. Le site doit envoyer ses événements à la base (route /api/event du site, clé Supabase secrète).",
      };
    }
    const age = Math.floor((now - new Date(`${last}T12:00:00`).getTime()) / DAY);
    const detail = `Dernière page vue le ${date(last, "d MMM yyyy")} · ${number(views30)} pages vues sur 30 j · ${number(articles)} article${articles > 1 ? "s" : ""} du blog lu${articles > 1 ? "s" : ""}. Sans cookie : empreinte quotidienne anonyme, supprimée sous 48 h.`;
    return age > 2
      ? { name, status: "Interrompue ?", tone: "warning", detail, action: "Plus aucune donnée depuis plus de 2 jours : vérifier la route /api/event du site et ses variables Supabase." }
      : { name, status: "Active", tone: "success", detail };
  }, [traffic, contentStats, now]);

  const integrations = [own, ...THIRD_PARTY];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Tracking & conformité</CardTitle>
          <CardDescription>Source des chiffres de cette page, intégrations de mesure de startupweek.tech et événements collectés</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ul className="space-y-2">
          {integrations.map((i) => (
            <li key={i.name} className="rounded-md border border-border px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{i.name}</p>
                <Badge tone={i.tone} dot>
                  {i.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{i.detail}</p>
              {i.action ? (
                <p className={`mt-1.5 rounded px-2 py-1.5 text-xs ${i.tone === "danger" ? "bg-danger-soft text-danger-text" : "bg-warning-soft text-warning-text"}`}>À faire : {i.action}</p>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Événements collectés (site → CRM)</p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[480px] text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-2/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-3 py-2 text-left font-semibold">Événement</th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">Déclencheur</th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">Alimente</th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">Émis par</th>
                </tr>
              </thead>
              <tbody>
                {EVENTS.map((e) => (
                  <tr key={e.name} className="border-b border-border last:border-0">
                    <th scope="row" className="px-3 py-2 text-left font-medium text-foreground">{e.name}</th>
                    <td className="px-3 py-2 text-muted-foreground">{e.when}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.feeds}</td>
                    <td className="px-3 py-2 text-foreground">{e.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            <li>Visiteurs = visiteurs uniques par jour, additionnés sur la période (un visiteur revenu deux jours différents compte deux fois).</li>
            <li>Source = paramètres UTM de la première page vue du jour, sinon site référent (Google et moteurs, LinkedIn, Instagram, messagerie…), sinon « Direct ».</li>
            <li>Lead d&apos;un article = formulaire envoyé par un visiteur qui a lu cet article le jour même ou la veille (dernier article lu).</li>
            <li>Non implémenté à ce jour : envoi des conversions vers Meta (API Conversions) et GA4 depuis le CRM.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
