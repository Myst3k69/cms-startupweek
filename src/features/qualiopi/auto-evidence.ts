/**
 * Preuves automatiques Qualiopi : calculées à partir des données du CRM (candidatures, émargements,
 * évaluations, réclamations…) selon la source `autoSource` de l'indicateur.
 * Fonctions pures — `now` est passé explicitement.
 */
import type { AutoEvidenceSource, WatchKind } from "@/lib/domain/types";
import { WATCH_KINDS, labelOf } from "@/lib/domain/constants";
import { pct } from "@/lib/utils";
import { date } from "@/lib/format";
import type { QualiopiData } from "./use-qualiopi-data";
import {
  DAY,
  attendanceStats,
  complaintStats,
  endedSessions,
  enrolledApplications,
  fmt1,
  fmtDays,
  fmtHours,
  fmtPct,
  isActionLate,
  isActionOpen,
  isTrainingSession,
  mean,
  ratingStats,
  resultIndicators,
  startedSessions,
} from "./metrics";

export type Verdict = "ok" | "a_ameliorer" | "sans_donnees";

export const VERDICTS: Record<Verdict, { label: string; tone: "success" | "warning" | "neutral" }> = {
  ok: { label: "OK", tone: "success" },
  a_ameliorer: { label: "À améliorer", tone: "warning" },
  sans_donnees: { label: "Données insuffisantes", tone: "neutral" },
};

export interface AutoEvidenceMetric {
  label: string;
  value: string;
  hint?: string;
}

export interface AutoEvidence {
  source: AutoEvidenceSource;
  label: string;
  verdict: Verdict;
  summary: string;
  /** 0-100 : taux de couverture principal (barre de progression). */
  score?: number;
  metrics: AutoEvidenceMetric[];
  href?: string;
  hrefLabel?: string;
}

export const AUTO_SOURCE_LABELS: Record<AutoEvidenceSource, string> = {
  resultats_publies: "Indicateurs de résultats à publier",
  analyse_besoin: "Analyse du besoin tracée",
  positionnement: "Positionnement d'entrée",
  convocations: "Convocations envoyées",
  emargements: "Feuilles d'émargement",
  evaluations_acquis: "Évaluations des acquis",
  ressources: "Ressources mises à disposition",
  intervenants_cv: "CV des intervenants",
  intervenants_formation: "Développement des compétences des intervenants",
  veille: "Veille documentée",
  handicap: "Accueil des personnes en situation de handicap",
  satisfaction: "Appréciations des parties prenantes",
  reclamations: "Traitement des réclamations",
  amelioration: "Plan d'amélioration continue",
};

const WATCH_BY_CODE: Record<number, WatchKind> = { 23: "legale", 24: "metiers", 25: "pedagogique", 26: "handicap" };

const ts = (iso?: string) => (iso ? Date.parse(iso) : NaN);

function coverage(done: number, total: number, threshold: number) {
  const score = total ? pct(done, total) : 0;
  const verdict: Verdict = !total ? "sans_donnees" : score >= threshold ? "ok" : "a_ameliorer";
  return { score, verdict };
}

export function computeAutoEvidence(source: AutoEvidenceSource, data: QualiopiData, now: number, indicatorCode?: number): AutoEvidence {
  const label = AUTO_SOURCE_LABELS[source];
  const enrolled = enrolledApplications(data.applications);
  const ended = endedSessions(data.events, now);
  const endedIds = new Set(ended.map((e) => e.id));
  const endedTrainees = enrolledApplications(data.applications, endedIds);

  switch (source) {
    case "analyse_besoin": {
      const done = enrolled.filter((a) => a.needsAnalysisDone).length;
      const { score, verdict } = coverage(done, enrolled.length, 90);
      const interviewed = enrolled.filter((a) => a.interviewAt).length;
      const b2b = enrolled.filter((a) => a.funding !== "personnel" && a.funding !== "gratuit").length;
      return {
        source,
        label,
        verdict,
        score,
        summary: enrolled.length
          ? `${score} % des inscrits ont une analyse du besoin tracée (${done}/${enrolled.length}).`
          : "Aucun inscrit pour l'instant : l'analyse du besoin sera tracée dès les premières inscriptions.",
        metrics: [
          { label: "Inscrits", value: String(enrolled.length) },
          { label: "Analyse tracée", value: String(done) },
          { label: "Manquantes", value: String(enrolled.length - done) },
          { label: "Entretiens réalisés", value: String(interviewed), hint: `${b2b} financement(s) tiers (entreprise, OPCO…)` },
        ],
        href: "/candidatures",
        hrefLabel: "Voir les candidatures",
      };
    }

    case "positionnement": {
      const withScore = enrolled.filter((a) => typeof a.positioningScore === "number");
      const { score, verdict } = coverage(withScore.length, enrolled.length, 90);
      const prereq = enrolled.filter((a) => a.prerequisitesOk).length;
      return {
        source,
        label,
        verdict,
        score,
        summary: enrolled.length
          ? `${score} % des inscrits ont un positionnement d'entrée (${withScore.length}/${enrolled.length}), prérequis vérifiés pour ${pct(prereq, enrolled.length)} %.`
          : "Aucun inscrit : le positionnement sera réalisé à l'inscription (questionnaire + diagnostic MVP).",
        metrics: [
          { label: "Positionnements", value: `${withScore.length}/${enrolled.length}` },
          { label: "Score moyen d'entrée", value: fmt1(mean(withScore.map((a) => a.positioningScore!)), " /10") },
          { label: "Prérequis vérifiés", value: fmtPct(enrolled.length ? pct(prereq, enrolled.length) : null) },
        ],
        href: "/candidatures",
        hrefLabel: "Voir les candidatures",
      };
    }

    case "convocations": {
      const target = data.events.filter((ev) => isTrainingSession(ev) && ts(ev.startAt) - 7 * DAY <= now);
      const ids = new Set(target.map((e) => e.id));
      const apps = enrolledApplications(data.applications, ids);
      const sent = apps.filter((a) => a.convocationSentAt);
      const { score, verdict } = coverage(sent.length, apps.length, 95);
      const byId = new Map(target.map((e) => [e.id, e]));
      const lead = mean(sent.map((a) => (ts(byId.get(a.eventId)?.startAt) - ts(a.convocationSentAt)) / DAY));
      return {
        source,
        label,
        verdict,
        score,
        summary: apps.length
          ? `${score} % des participants des sessions passées ou à J-7 ont reçu leur convocation (${sent.length}/${apps.length}).`
          : "Aucune session passée ou à moins de 7 jours : pas encore de convocation à contrôler.",
        metrics: [
          { label: "Sessions concernées", value: String(target.length) },
          { label: "Convocations envoyées", value: `${sent.length}/${apps.length}` },
          { label: "Envoi moyen", value: lead === null ? "—" : `J-${Math.max(0, Math.round(lead))}`, hint: "avant le début de session" },
        ],
        href: "/sessions",
        hrefLabel: "Voir les sessions",
      };
    }

    case "emargements": {
      const started = startedSessions(data.events, now);
      const startedIds = new Set(started.map((e) => e.id));
      const att = data.attendances.filter((a) => startedIds.has(a.eventId));
      const st = attendanceStats(att);
      const withSheets = new Set(att.map((a) => a.eventId));
      const missing = started.filter((e) => !withSheets.has(e.id));
      const verdict: Verdict = !started.length ? "sans_donnees" : missing.length === 0 && (st.rate ?? 0) >= 80 ? "ok" : "a_ameliorer";
      return {
        source,
        label,
        verdict,
        score: started.length ? pct(started.length - missing.length, started.length) : 0,
        summary: started.length
          ? `${st.sheets} feuille(s) d'émargement par demi-journée, assiduité ${fmtPct(st.rate)}${missing.length ? ` — ${missing.length} session(s) sans émargement : ${missing.map((m) => m.code).join(", ")}` : ""}.`
          : "Aucune session démarrée : les feuilles d'émargement seront générées dès la première session.",
        metrics: [
          { label: "Feuilles (demi-journées)", value: String(st.sheets) },
          { label: "Taux d'assiduité", value: fmtPct(st.rate) },
          { label: "Signatures numériques", value: fmtPct(st.present ? pct(st.signedDigital, st.present) : null) },
          { label: "Sessions sans émargement", value: String(missing.length) },
        ],
        href: "/sessions",
        hrefLabel: "Voir les sessions",
      };
    }

    case "evaluations_acquis": {
      const acquis = data.evaluations.filter((e) => e.kind === "acquis");
      const keys = new Set(acquis.map((e) => `${e.eventId}|${e.contactId}`));
      const covered = endedTrainees.filter((a) => keys.has(`${a.eventId}|${a.contactId}`)).length;
      const { score, verdict } = coverage(covered, endedTrainees.length, 80);
      return {
        source,
        label,
        verdict,
        score,
        summary: endedTrainees.length
          ? `${acquis.length} évaluation(s) des acquis — ${score} % des stagiaires des sessions terminées évalués (${covered}/${endedTrainees.length}).`
          : "Aucune session terminée : les acquis seront évalués en fin de session (démo MVP + pitch + grille).",
        metrics: [
          { label: "Évaluations « acquis »", value: String(acquis.length) },
          { label: "Stagiaires évalués", value: `${covered}/${endedTrainees.length}` },
          { label: "Atteinte moyenne des objectifs", value: fmt1(mean(acquis.map((e) => e.objectivesReached ?? NaN)), " /5") },
        ],
        href: "/qualiopi/satisfaction",
        hrefLabel: "Voir la progression",
      };
    }

    case "satisfaction": {
      const hot = data.evaluations.filter((e) => e.kind === "a_chaud" && endedIds.has(e.eventId));
      const rs = ratingStats(hot);
      const rate = endedTrainees.length ? Math.min(100, pct(hot.length, endedTrainees.length)) : 0;
      const cold = data.evaluations.filter((e) => e.kind === "a_froid").length;
      const others = data.evaluations.filter((e) => e.kind === "financeur" || e.kind === "entreprise" || e.kind === "intervenant").length;
      const verdict: Verdict = !endedTrainees.length ? "sans_donnees" : rate >= 60 && (rs.avg ?? 0) >= 4 && others > 0 ? "ok" : "a_ameliorer";
      return {
        source,
        label,
        verdict,
        score: rate,
        summary: endedTrainees.length
          ? `Note moyenne à chaud ${fmt1(rs.avg, "/5")}, NPS ${rs.nps ?? "—"}, taux de réponse ${rate} %${others ? `, ${others} retour(s) financeurs / entreprises / intervenants` : " — aucune appréciation des financeurs, entreprises ou intervenants"}.`
          : "Aucune session terminée : les questionnaires à chaud seront envoyés à J+1.",
        metrics: [
          { label: "Note moyenne à chaud", value: fmt1(rs.avg, " /5") },
          { label: "NPS", value: rs.nps === null ? "—" : String(rs.nps) },
          { label: "Taux de réponse", value: `${rate} %`, hint: `${hot.length} réponses / ${endedTrainees.length} stagiaires` },
          { label: "À froid · autres parties prenantes", value: `${cold} · ${others}` },
        ],
        href: "/qualiopi/satisfaction",
        hrefLabel: "Voir les appréciations",
      };
    }

    case "reclamations": {
      const st = complaintStats(data.complaints, now, data.settings.complaintAckHours);
      const verdict: Verdict = st.total === 0 ? "ok" : st.lateAck === 0 && (st.onTimePct ?? 100) >= 90 ? "ok" : "a_ameliorer";
      return {
        source,
        label,
        verdict,
        score: st.onTimePct === null ? undefined : Math.round(st.onTimePct),
        summary: st.total
          ? `${st.total} réclamation(s) enregistrée(s), ${st.open} ouverte(s) ; accusé moyen ${fmtHours(st.avgAckHours)} (engagement ${data.settings.complaintAckHours} h), clôture moyenne ${fmtDays(st.avgCloseDays)}.`
          : "Registre tenu, aucune réclamation enregistrée : conservez la procédure et le formulaire comme preuve.",
        metrics: [
          { label: "Réclamations", value: String(st.total), hint: `${st.open} ouverte(s)` },
          { label: "Délai moyen d'accusé", value: fmtHours(st.avgAckHours) },
          { label: "Délai moyen de clôture", value: fmtDays(st.avgCloseDays) },
          { label: "Accusés dans les délais", value: fmtPct(st.onTimePct), hint: st.lateAck ? `${st.lateAck} en retard` : undefined },
        ],
        href: "/qualiopi/reclamations",
        hrefLabel: "Ouvrir le registre",
      };
    }

    case "amelioration": {
      const acts = data.improvementActions;
      const open = acts.filter(isActionOpen);
      const done = acts.filter((a) => a.status === "fait");
      const late = acts.filter((a) => isActionLate(a, now));
      const fromFeedback = acts.filter((a) => a.origin === "reclamation" || a.origin === "evaluation").length;
      const verdict: Verdict = !acts.length ? "sans_donnees" : done.length > 0 && late.length === 0 ? "ok" : "a_ameliorer";
      return {
        source,
        label,
        verdict,
        score: acts.length ? pct(done.length, acts.filter((a) => a.status !== "abandonne").length) : 0,
        summary: acts.length
          ? `${open.length} action(s) ouverte(s), ${done.length} réalisée(s)${late.length ? `, ${late.length} en retard` : ""} — ${fromFeedback} issue(s) des réclamations et évaluations.`
          : "Aucune action d'amélioration : alimentez le plan à partir des réclamations, évaluations et de la veille.",
        metrics: [
          { label: "Ouvertes", value: String(open.length) },
          { label: "Réalisées", value: String(done.length) },
          { label: "En retard", value: String(late.length) },
          { label: "Issues des retours", value: String(fromFeedback) },
        ],
        href: "/qualiopi/amelioration",
        hrefLabel: "Ouvrir le plan d'actions",
      };
    }

    case "intervenants_cv": {
      const sp = data.speakers;
      const withCv = sp.filter((s) => s.cvOnFile).length;
      const { score, verdict } = coverage(withCv, sp.length, 100);
      const missing = sp.filter((s) => !s.cvOnFile);
      return {
        source,
        label,
        verdict,
        score,
        summary: sp.length
          ? `${withCv}/${sp.length} intervenants ont un CV au dossier${missing.length ? ` — manquants : ${missing.slice(0, 4).map((s) => `${s.firstName} ${s.lastName}`).join(", ")}${missing.length > 4 ? "…" : ""}` : ""}.`
          : "Aucun intervenant enregistré.",
        metrics: [
          { label: "Intervenants", value: String(sp.length) },
          { label: "CV au dossier", value: `${score} %` },
          { label: "Freelances (sous-traitance, ind. 27)", value: String(sp.filter((s) => s.contractType === "freelance").length) },
        ],
        href: "/intervenants",
        hrefLabel: "Voir les intervenants",
      };
    }

    case "intervenants_formation": {
      const sp = data.speakers;
      const recent = sp.filter((s) => s.lastTrainingAt && now - ts(s.lastTrainingAt) <= 365 * DAY).length;
      const { score, verdict } = coverage(recent, sp.length, 80);
      return {
        source,
        label,
        verdict,
        score,
        summary: sp.length
          ? `${score} % des intervenants ont suivi une action de développement des compétences dans les 12 derniers mois (${recent}/${sp.length}).`
          : "Aucun intervenant enregistré.",
        metrics: [
          { label: "Formés < 12 mois", value: `${recent}/${sp.length}` },
          { label: "Jamais renseigné", value: String(sp.filter((s) => !s.lastTrainingAt).length) },
          { label: "Note moyenne intervenants", value: fmt1(mean(sp.map((s) => s.rating ?? NaN)), " /5") },
        ],
        href: "/intervenants",
        hrefLabel: "Voir les intervenants",
      };
    }

    case "veille": {
      const focus = indicatorCode ? WATCH_BY_CODE[indicatorCode] : undefined;
      const year = data.watchItems.filter((w) => now - ts(w.publishedAt) <= 365 * DAY);
      const focusItems = focus ? year.filter((w) => w.kind === focus) : year;
      const last = [...(focus ? data.watchItems.filter((w) => w.kind === focus) : data.watchItems)].sort((a, b) => ts(b.publishedAt) - ts(a.publishedAt))[0];
      const fresh = last ? now - ts(last.publishedAt) <= 120 * DAY : false;
      const verdict: Verdict = !data.watchItems.length ? "sans_donnees" : focusItems.length >= 3 && fresh ? "ok" : "a_ameliorer";
      const kinds = (["legale", "metiers", "pedagogique", "handicap"] as WatchKind[]).map((k) => ({ k, n: year.filter((w) => w.kind === k).length }));
      return {
        source,
        label: focus ? `${label} — ${labelOf(WATCH_KINDS, focus).replace(/ \(ind\. \d+\)/, "")}` : label,
        verdict,
        score: Math.min(100, Math.round((focusItems.length / 4) * 100)),
        summary: `${focusItems.length} élément(s) de veille${focus ? ` ${labelOf(WATCH_KINDS, focus).replace(/ \(ind\. \d+\)/, "").toLowerCase()}` : ""} sur 12 mois${last ? `, dernier le ${date(last.publishedAt)}` : ""} ; ${year.filter((w) => w.actionId).length} transformé(s) en action.`,
        metrics: kinds.map(({ k, n }) => ({ label: labelOf(WATCH_KINDS, k).replace(/ \(ind\. \d+\)/, ""), value: String(n), hint: "12 mois" })),
        href: focus ? `/qualiopi/veille?type=${focus}` : "/qualiopi/veille",
        hrefLabel: "Ouvrir la veille",
      };
    }

    case "handicap": {
      const lead = data.users.find((u) => u.id === data.settings.disabilityLeadId);
      const declared = data.applications.filter((a) => a.accessibilityNeeds?.trim());
      const treated = declared.filter((a) => a.accommodations?.trim());
      const watch = data.watchItems.filter((w) => w.kind === "handicap" && now - ts(w.publishedAt) <= 365 * DAY).length;
      const verdict: Verdict = lead && treated.length === declared.length ? "ok" : "a_ameliorer";
      return {
        source,
        label,
        verdict,
        score: declared.length ? pct(treated.length, declared.length) : lead ? 100 : 0,
        summary: `${lead ? `Référent handicap désigné : ${lead.name}` : "Aucun référent handicap désigné"} — ${declared.length} besoin(s) déclaré(s), ${treated.length} traité(s) ; ${watch} élément(s) de veille handicap sur 12 mois.`,
        metrics: [
          { label: "Référent", value: lead ? lead.name : "À désigner" },
          { label: "Besoins déclarés", value: String(declared.length) },
          { label: "Traités", value: `${treated.length}/${declared.length}` },
          { label: "Veille handicap (12 mois)", value: String(watch) },
        ],
        href: "/qualiopi/handicap",
        hrefLabel: "Ouvrir le registre",
      };
    }

    case "ressources": {
      const forParticipants = data.resources.filter((r) => r.visibility !== "interne");
      const linked = forParticipants.filter((r) => r.eventIds.length > 0).length;
      const downloads = forParticipants.reduce((s, r) => s + r.downloads, 0);
      const verdict: Verdict = !data.resources.length ? "sans_donnees" : forParticipants.length >= 5 ? "ok" : "a_ameliorer";
      return {
        source,
        label,
        verdict,
        score: Math.min(100, forParticipants.length * 20),
        summary: `${forParticipants.length} ressource(s) accessibles aux participants (${linked} rattachée(s) à une session), ${downloads.toLocaleString("fr-FR")} téléchargement(s).`,
        metrics: [
          { label: "Ressources participants", value: String(forParticipants.length) },
          { label: "Rattachées à une session", value: String(linked) },
          { label: "Téléchargements", value: downloads.toLocaleString("fr-FR") },
          { label: "Pédagogiques", value: String(forParticipants.filter((r) => r.category === "pedagogique").length) },
        ],
        href: "/ressources",
        hrefLabel: "Voir les ressources",
      };
    }

    case "resultats_publies": {
      const r = resultIndicators(data, now);
      const published = data.evidences
        .filter((e) => e.indicatorCode === 2)
        .sort((a, b) => ts(b.createdAt) - ts(a.createdAt))[0];
      const recent = published ? now - ts(published.createdAt) <= 180 * DAY : false;
      const verdict: Verdict = !r.trainees || !r.responses ? "sans_donnees" : recent ? "ok" : "a_ameliorer";
      return {
        source,
        label,
        verdict,
        score: recent ? 100 : r.trainees ? 50 : 0,
        summary: r.trainees
          ? `Satisfaction ${fmtPct(r.satisfactionPct)}, assiduité ${fmtPct(r.attendanceRate)}, ${r.trainees} stagiaire(s) sur ${r.sessions} session(s) — ${recent ? `publiés le ${date(published!.createdAt)}` : "à publier sur le site"}.`
          : "Aucune session terminée : les indicateurs de résultats seront publiés après la première session.",
        metrics: [
          { label: "Taux de satisfaction", value: fmtPct(r.satisfactionPct), hint: `${r.responses} réponses` },
          { label: "Assiduité", value: fmtPct(r.attendanceRate) },
          { label: "Complétion (≥ 80 %)", value: fmtPct(r.completionRate) },
          { label: "Stagiaires formés", value: String(r.trainees), hint: `${r.sessions} session(s)` },
        ],
        href: "/qualiopi/satisfaction?publier=1",
        hrefLabel: "Préparer la publication",
      };
    }
  }
}
