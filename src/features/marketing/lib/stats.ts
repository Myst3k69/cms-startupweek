/**
 * Statistiques des A/B tests — fonctions pures, sans dépendance.
 *
 * Méthode (fréquentiste, classique et explicable) :
 * - chaque variante est comparée au contrôle (variante A) par un test z de deux proportions (bilatéral) ;
 * - au-delà de deux variantes, le seuil est corrigé (Bonferroni) pour ne pas multiplier les faux positifs ;
 * - la taille d'échantillon nécessaire est calculée AVANT de conclure (puissance 80 %, effet minimal
 *   détectable choisi) : un résultat « significatif » obtenu avant est affiché comme provisoire ;
 * - la probabilité « d'être meilleur que A » (approximation bayésienne, a priori uniforme) est
 *   donnée à titre indicatif, plus lisible pour l'équipe ;
 * - test de déséquilibre d'échantillon (SRM, χ²) quand la répartition du trafic est connue :
 *   un écart anormal signale un problème de mise en place, pas un résultat.
 */
import type { AdStatDay, Experiment, ExperimentMetric, ExperimentVariant } from "@/lib/domain/types";

/* ───────────── Lois de probabilité ───────────── */

/** Fonction d'erreur (Abramowitz & Stegun 7.1.26, erreur < 1,5e-7). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** Fonction de répartition de la loi normale centrée réduite. */
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** Quantile de la loi normale centrée réduite (algorithme d'Acklam, erreur relative < 1,2e-9). */
export function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) return -normalQuantile(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** p-valeur d'un χ² à `df` degrés de liberté (approximation de Wilson–Hilferty, suffisante pour un signal SRM). */
export function chiSquarePValue(x: number, df: number): number {
  if (x <= 0 || df <= 0) return 1;
  const k = df;
  const z = (Math.cbrt(x / k) - (1 - 2 / (9 * k))) / Math.sqrt(2 / (9 * k));
  return 1 - normalCdf(z);
}

/** Intervalle de confiance de Wilson d'une proportion. */
export function wilson(conversions: number, exposures: number, confidence = 0.95): [number, number] {
  if (exposures <= 0) return [0, 0];
  const z = normalQuantile(1 - (1 - confidence) / 2);
  const p = conversions / exposures;
  const z2 = z * z;
  const denom = 1 + z2 / exposures;
  const center = (p + z2 / (2 * exposures)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / exposures + z2 / (4 * exposures * exposures))) / denom;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

/** Test z bilatéral de deux proportions (variance poolée). */
export function twoProportionTest(c1: number, n1: number, c2: number, n2: number): { z: number; pValue: number } {
  if (n1 <= 0 || n2 <= 0) return { z: 0, pValue: 1 };
  const pooled = (c1 + c2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  if (!se) return { z: 0, pValue: 1 };
  const z = (c2 / n2 - c1 / n1) / se;
  return { z, pValue: 2 * (1 - normalCdf(Math.abs(z))) };
}

/** Probabilité que B > A (lois Beta a posteriori, a priori uniforme, approximées par des normales). */
export function probabilityToBeat(cA: number, nA: number, cB: number, nB: number): number {
  const post = (c: number, n: number) => {
    const m = (c + 1) / (n + 2);
    return { m, v: (m * (1 - m)) / (n + 3) };
  };
  const a = post(cA, nA);
  const b = post(cB, nB);
  const sd = Math.sqrt(a.v + b.v);
  return sd ? normalCdf((b.m - a.m) / sd) : 0.5;
}

/**
 * Taille d'échantillon PAR VARIANTE pour détecter un effet relatif `mdePct` sur un taux de base `baseline`
 * (test bilatéral au seuil `alpha`, puissance `power`).
 */
export function sampleSizePerVariant(baseline: number, mdePct: number, alpha = 0.05, power = 0.8): number {
  const p1 = Math.min(Math.max(baseline, 1e-4), 0.99);
  const p2 = Math.min(p1 * (1 + mdePct / 100), 0.999);
  if (p2 === p1) return Infinity;
  const za = normalQuantile(1 - alpha / 2);
  const zb = normalQuantile(power);
  const pbar = (p1 + p2) / 2;
  const n = (za * Math.sqrt(2 * pbar * (1 - pbar)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / (p2 - p1) ** 2;
  return Math.ceil(n);
}

/* ───────────── Analyse d'une expérience ───────────── */

/** Taux de référence par défaut (avant d'avoir des données sur le contrôle). */
export const DEFAULT_BASELINE: Record<ExperimentMetric, number> = {
  ctr: 0.012,
  taux_lead: 0.08,
  conversion: 0.03,
  ouverture: 0.35,
  clic: 0.03,
};

/** Seuils minimaux avant toute lecture des résultats. */
const MIN_EXPOSURES = 100;
const MIN_CONVERSIONS = 10;

export interface VariantCounts {
  variant: ExperimentVariant;
  exposures: number;
  conversions: number;
  /** Données issues de la régie (synchro API) plutôt que saisies / remontées par le site. */
  fromAds: boolean;
}

/**
 * Expositions / conversions d'une variante :
 * - publicité liée à une création → somme des statistiques synchronisées de la régie ;
 * - sinon → compteurs de la variante (site : remontés par /api/experiments ; email : saisis).
 */
export function variantCounts(exp: Experiment, adStats: AdStatDay[]): VariantCounts[] {
  return exp.variants.map((v) => {
    if (exp.channel === "publicite" && v.creativeId) {
      let impressions = 0;
      let clicks = 0;
      let leads = 0;
      for (const s of adStats) {
        if (s.creativeId !== v.creativeId) continue;
        if (exp.startAt && s.date < exp.startAt.slice(0, 10)) continue;
        if (exp.endAt && s.date > exp.endAt.slice(0, 10)) continue;
        impressions += s.impressions;
        clicks += s.clicks;
        leads += s.leads;
      }
      return exp.metric === "taux_lead"
        ? { variant: v, exposures: clicks, conversions: leads, fromAds: true }
        : { variant: v, exposures: impressions, conversions: clicks, fromAds: true };
    }
    return { variant: v, exposures: v.exposures, conversions: v.conversions, fromAds: false };
  });
}

export interface VariantResult {
  key: string;
  name: string;
  exposures: number;
  conversions: number;
  rate: number; // 0-1
  ci: [number, number];
  isControl: boolean;
  /** Écart relatif au contrôle (%). */
  upliftPct?: number;
  pValue?: number;
  significant: boolean;
  probBeatControl?: number;
}

export type Verdict = "vide" | "insuffisant" | "en_cours" | "gagnant" | "controle" | "sans_difference";

export interface ExperimentAnalysis {
  variants: VariantResult[];
  /** Seuil de significativité effectif (corrigé si plus de deux variantes). */
  alpha: number;
  baseline: number;
  requiredPerVariant: number;
  /** Avancement vers la taille d'échantillon (0-1, sur la variante la moins exposée). */
  progress: number;
  verdict: Verdict;
  winner?: VariantResult;
  srm?: { pValue: number; suspicious: boolean };
  headline: string;
  detail: string;
}

const pctFmt = (v: number, digits = 1) => `${(v * 100).toLocaleString("fr-FR", { maximumFractionDigits: digits })} %`;

export function analyzeExperiment(exp: Experiment, adStats: AdStatDay[]): ExperimentAnalysis {
  const counts = variantCounts(exp, adStats);
  const confidence = Math.min(Math.max(exp.confidenceTarget || 95, 80), 99.9) / 100;
  const comparisons = Math.max(1, counts.length - 1);
  const alpha = (1 - confidence) / comparisons;
  const control = counts[0];

  const base = control && control.exposures > 0 && control.conversions >= MIN_CONVERSIONS ? control.conversions / control.exposures : DEFAULT_BASELINE[exp.metric];
  const requiredPerVariant = sampleSizePerVariant(base, exp.minDetectableEffect || 20, alpha);

  const variants: VariantResult[] = counts.map((c, i) => {
    const rate = c.exposures ? c.conversions / c.exposures : 0;
    const res: VariantResult = {
      key: c.variant.key,
      name: c.variant.name,
      exposures: c.exposures,
      conversions: c.conversions,
      rate,
      ci: wilson(c.conversions, c.exposures, confidence),
      isControl: i === 0,
      significant: false,
    };
    if (i > 0 && control && control.exposures > 0 && c.exposures > 0) {
      const controlRate = control.conversions / control.exposures;
      const { pValue } = twoProportionTest(control.conversions, control.exposures, c.conversions, c.exposures);
      res.pValue = pValue;
      res.significant = pValue < alpha;
      res.upliftPct = controlRate ? ((rate - controlRate) / controlRate) * 100 : undefined;
      res.probBeatControl = probabilityToBeat(control.conversions, control.exposures, c.conversions, c.exposures);
    }
    return res;
  });

  // Déséquilibre d'échantillon (SRM) : uniquement quand le trafic est réparti par nous (site, email).
  let srm: ExperimentAnalysis["srm"];
  const totalExp = counts.reduce((s, c) => s + c.exposures, 0);
  const totalWeight = counts.reduce((s, c) => s + (c.variant.weight || 0), 0);
  if (exp.channel !== "publicite" && totalExp >= 200 && totalWeight > 0 && counts.length > 1) {
    const chi = counts.reduce((s, c) => {
      const expected = (totalExp * (c.variant.weight || 0)) / totalWeight;
      return expected > 0 ? s + (c.exposures - expected) ** 2 / expected : s;
    }, 0);
    const pValue = chiSquarePValue(chi, counts.length - 1);
    srm = { pValue, suspicious: pValue < 0.001 };
  }

  const minExposures = counts.length ? Math.min(...counts.map((c) => c.exposures)) : 0;
  const totalConv = counts.reduce((s, c) => s + c.conversions, 0);
  const progress = Number.isFinite(requiredPerVariant) && requiredPerVariant > 0 ? Math.min(1, minExposures / requiredPerVariant) : 0;
  const challengers = variants.slice(1);
  const best = challengers.reduce<VariantResult | undefined>((b, v) => (!b || v.rate > b.rate ? v : b), undefined);
  const sigWinners = challengers.filter((v) => v.significant && (v.upliftPct ?? 0) > 0);
  const winner = sigWinners.sort((a, b) => b.rate - a.rate)[0];
  const controlWins = challengers.length > 0 && challengers.every((v) => v.significant && (v.upliftPct ?? 0) < 0);
  const ctrl = variants[0];

  let verdict: Verdict;
  let headline: string;
  let detail: string;
  if (!counts.length || totalExp === 0) {
    verdict = "vide";
    headline = "Aucune donnée pour l'instant";
    detail = exp.channel === "publicite" ? "Liez chaque variante à une publicité de la campagne : les chiffres arrivent avec la synchro de la régie." : exp.channel === "site" ? "Le site remonte les expositions et conversions dès que le test est « En cours »." : "Saisissez les envois, ouvertures et clics de chaque variante.";
  } else if (minExposures < MIN_EXPOSURES || totalConv < MIN_CONVERSIONS) {
    verdict = "insuffisant";
    headline = "Données insuffisantes";
    detail = `Il faut au moins ${MIN_EXPOSURES} expositions par variante et ${MIN_CONVERSIONS} conversions au total avant toute lecture. Objectif : ${requiredPerVariant.toLocaleString("fr-FR")} par variante.`;
  } else if (progress < 1) {
    verdict = "en_cours";
    headline = winner ? `Tendance : ${winner.key} devant (provisoire)` : best ? `Pas d'écart significatif à ce stade` : "Test en cours";
    detail = `${Math.round(progress * 100)} % de l'échantillon nécessaire (${requiredPerVariant.toLocaleString("fr-FR")} par variante pour détecter +${exp.minDetectableEffect} %). Ne concluez pas avant : un écart vu trop tôt est souvent un faux positif.`;
  } else if (winner) {
    verdict = "gagnant";
    headline = `${winner.key} gagne : ${pctFmt(winner.rate, 2)} contre ${pctFmt(ctrl.rate, 2)} (${(winner.upliftPct ?? 0) > 0 ? "+" : ""}${(winner.upliftPct ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %)`;
    detail = `Écart significatif au seuil de ${Math.round(confidence * 100)} %${comparisons > 1 ? ` (corrigé pour ${comparisons} comparaisons)` : ""} — p = ${winner.pValue?.toLocaleString("fr-FR", { maximumSignificantDigits: 2 })}.`;
  } else if (controlWins) {
    verdict = "controle";
    headline = `Le contrôle (${ctrl.key}) reste le meilleur`;
    detail = "Toutes les variantes font significativement moins bien : gardez la version actuelle.";
  } else {
    verdict = "sans_difference";
    headline = "Pas de différence significative";
    detail = `Échantillon atteint sans écart détectable de ${exp.minDetectableEffect} % ou plus : gardez la version la plus simple ou testez une idée plus tranchée.`;
  }

  return { variants, alpha, baseline: base, requiredPerVariant, progress, verdict, winner: verdict === "gagnant" ? winner : undefined, srm, headline, detail };
}
