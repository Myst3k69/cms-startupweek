/**
 * Recommandations factuelles générées par règles simples (pas d'IA) à partir des données de la période.
 * Chaque règle ne se déclenche que si les volumes sont suffisants pour être significatifs.
 */
import type { Tone } from "@/lib/domain/constants";
import type { Application, ContentItem, EventSession, ID, Submission } from "@/lib/domain/types";
import { daysUntil, slaState, type ContentPerformance } from "@/lib/domain/selectors";
import { percent } from "@/lib/format";
import type { ConversionRow, TrafficTotals } from "./metrics";

export interface Recommendation {
  id: string;
  tone: Extract<Tone, "danger" | "warning" | "info" | "success">;
  title: string;
  detail: string;
  href?: string;
  cta?: string;
}

const ORDER: Record<Recommendation["tone"], number> = { danger: 0, warning: 1, info: 2, success: 3 };

export function buildRecommendations(input: {
  now: number;
  sources: ConversionRow[];
  below: { ev: EventSession; enrolled: number }[];
  submissions: Submission[]; // de la période
  allSubmissions: Submission[];
  slaHours: number;
  traffic: TrafficTotals;
  contents: ContentItem[];
  contentPerf: Map<ID, ContentPerformance>;
  npsCur?: number;
  npsPrev?: number;
  applications: Application[];
}): Recommendation[] {
  const out: Recommendation[] = [];
  const { now } = input;

  // 1. Meilleure / pire source d'acquisition (≥ 3 candidatures).
  const eligible = input.sources.filter((s) => s.total >= 3);
  const totalApps = input.sources.reduce((s, r) => s + r.total, 0);
  const totalEnrolled = input.sources.reduce((s, r) => s + r.enrolled, 0);
  const avg = totalApps ? (totalEnrolled / totalApps) * 100 : 0;
  if (eligible.length >= 2) {
    const best = [...eligible].sort((a, b) => b.rate - a.rate)[0];
    if (best.rate > 0) {
      out.push({
        id: "best-source",
        tone: "success",
        title: `Meilleure source : ${best.label} (${percent(best.rate)} d'inscrits)`,
        detail: `${best.enrolled} inscrit${best.enrolled > 1 ? "s" : ""} sur ${best.total} candidatures, contre ${percent(avg)} en moyenne. Renforcez ce canal (budget, fréquence de publication).`,
      });
    }
    const worst = [...eligible].filter((s) => s.total >= 5 && s.enrolled === 0).sort((a, b) => b.total - a.total)[0];
    if (worst) {
      out.push({
        id: "worst-source",
        tone: "warning",
        title: `${worst.label} : ${worst.total} candidatures, aucune inscription`,
        detail: `Vérifiez le ciblage et le message de ce canal : ${worst.qualified} qualifiée${worst.qualified > 1 ? "s" : ""}, ${worst.interviews} entretien${worst.interviews > 1 ? "s" : ""}.`,
      });
    }
  }

  // 2. Sessions sous le seuil minimum (départ < 60 j).
  for (const { ev, enrolled } of input.below) {
    const d = daysUntil(ev.startAt, now);
    if (d > 60) continue;
    out.push({
      id: `below-${ev.id}`,
      tone: d <= 21 ? "danger" : "warning",
      title: `${ev.code} · ${ev.city} : ${enrolled} inscrit${enrolled > 1 ? "s" : ""} / minimum ${ev.minCapacity}`,
      detail: `Départ dans ${d} jour${d > 1 ? "s" : ""}. ${d <= 21 ? "Décider du maintien ou du report, prévenir les inscrits." : "Relancer les candidatures en cours et la liste d'attente."}`,
      href: `/sessions/${ev.id}`,
      cta: "Ouvrir la session",
    });
  }

  // 3. Délai de réponse moyen aux demandes vs engagement.
  const answered = input.submissions.filter((s) => s.answeredAt && s.type !== "newsletter");
  if (answered.length >= 3) {
    const avgH = answered.reduce((sum, s) => sum + (new Date(s.answeredAt!).getTime() - new Date(s.receivedAt).getTime()), 0) / answered.length / 3_600_000;
    const late = input.allSubmissions.filter((s) => slaState(s, now) === "depasse").length;
    const h = Math.round(avgH * 10) / 10;
    out.push({
      id: "response-time",
      tone: avgH > input.slaHours ? "danger" : late ? "warning" : "success",
      title: `Délai de réponse moyen : ${h.toLocaleString("fr-FR")} h (engagement ${input.slaHours} h)`,
      detail: late ? `${late} demande${late > 1 ? "s" : ""} actuellement hors délai — à traiter en priorité.` : "Aucune demande en retard actuellement.",
      href: late ? "/demandes" : undefined,
      cta: late ? "Voir les demandes" : undefined,
    });
  }

  // 4. Abandon de formulaire.
  if (input.traffic.formStarts >= 20) {
    const completion = (input.traffic.formSubmits / input.traffic.formStarts) * 100;
    if (completion < 60) {
      out.push({
        id: "form-abandon",
        tone: "warning",
        title: `${percent(100 - completion)} des formulaires commencés sont abandonnés`,
        detail: `${input.traffic.formSubmits} envois pour ${input.traffic.formStarts} démarrages. Raccourcir le formulaire de candidature (étapes, champs facultatifs) et sauvegarder la saisie.`,
      });
    }
  }

  // 5. Contenu le plus générateur de leads.
  const leadsOf = (c: ContentItem) => input.contentPerf.get(c.id)?.leads ?? 0;
  const topLead = input.contents.filter((c) => c.status === "publie" && leadsOf(c) > 0).sort((a, b) => leadsOf(b) - leadsOf(a))[0];
  if (topLead) {
    out.push({
      id: "top-content",
      tone: "info",
      title: `« ${topLead.title} » : ${leadsOf(topLead)} leads`,
      detail: "Contenu le plus performant : décliner en post LinkedIn, newsletter et page session liée.",
      href: `/contenus/${topLead.id}`,
      cta: "Ouvrir le contenu",
    });
  }

  // 6. Évolution du NPS.
  if (input.npsCur !== undefined && input.npsPrev !== undefined) {
    const diff = input.npsCur - input.npsPrev;
    if (diff <= -10) {
      out.push({ id: "nps-drop", tone: "warning", title: `NPS en baisse : ${input.npsCur} (${diff} pts)`, detail: "Analyser les verbatims des évaluations à chaud et ouvrir une action d'amélioration (Qualiopi ind. 32).", href: "/qualiopi", cta: "Qualiopi" });
    } else if (diff >= 10) {
      out.push({ id: "nps-up", tone: "success", title: `NPS en hausse : ${input.npsCur} (+${diff} pts)`, detail: "Solliciter des témoignages auprès des promoteurs (note 9-10) pour le site." });
    }
  }

  // 7. Candidats acceptés sans paiement de l'acompte depuis 7 jours.
  const unpaid = input.applications.filter((a) => a.status === "acceptee" && a.amountPaidCents === 0 && a.decisionAt && now - new Date(a.decisionAt).getTime() > 7 * 86_400_000);
  if (unpaid.length) {
    out.push({
      id: "unpaid",
      tone: "warning",
      title: `${unpaid.length} candidat${unpaid.length > 1 ? "s" : ""} accepté${unpaid.length > 1 ? "s" : ""} sans acompte depuis plus de 7 jours`,
      detail: "Relancer par téléphone : la place n'est confirmée qu'au paiement de l'acompte (CGV).",
      href: "/candidatures",
      cta: "Candidatures",
    });
  }

  // 8. Conformité tracking (constat permanent tant que non corrigé).
  out.push({
    id: "meta-pixel",
    tone: "danger",
    title: "Meta Pixel chargé sans consentement",
    detail: "Non conforme RGPD / ePrivacy : conditionner le chargement au consentement « marketing » (voir l'encart Tracking).",
  });

  return out.sort((a, b) => ORDER[a.tone] - ORDER[b.tone]);
}
