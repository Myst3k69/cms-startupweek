/**
 * Points d'attention marketing — règles simples et vérifiables, calculées sur les données
 * (aucune « prédiction ») : argent dépensé pour rien, tests à conclure, attribution cassée…
 */
import type { Tone } from "@/lib/domain/constants";
import type { AdCampaign, AdStatDay, Application, EventSession, Experiment } from "@/lib/domain/types";
import { sessionStats } from "@/lib/domain/selectors";
import { money } from "@/lib/format";
import type { CampaignPerf, PromoRow } from "./metrics";
import { sumStats } from "./metrics";
import { analyzeExperiment } from "./stats";

export interface Insight {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
  href?: string;
}

const DAY = 86_400_000;

export function marketingInsights(
  input: {
    campaigns: AdCampaign[];
    perf: Map<string, CampaignPerf>;
    byCampaign: Map<string, AdStatDay[]>;
    experiments: Experiment[];
    adStats: AdStatDay[];
    events: EventSession[];
    applications: Application[];
    plan: PromoRow[];
  },
  now: number,
): Insight[] {
  const out: Insight[] = [];
  const events = new Map(input.events.map((e) => [e.id, e]));
  const active = input.campaigns.filter((c) => c.status === "active");

  // 1. Dépense sur une session qui ne peut plus accueillir d'inscrits.
  for (const c of active) {
    const ev = c.eventId ? events.get(c.eventId) : undefined;
    if (!ev || ev.kind === "webinaire") continue;
    const st = sessionStats(ev, input.applications);
    const started = new Date(ev.startAt).getTime() <= now;
    const closed = new Date(ev.registrationDeadline).getTime() < now;
    if (ev.status === "complet" || st.remaining === 0 || started || closed || ev.status === "annule") {
      const why = ev.status === "annule" ? "session annulée" : started ? "session démarrée" : st.remaining === 0 || ev.status === "complet" ? "session complète" : "inscriptions closes";
      out.push({ id: `stop-${c.id}`, tone: "danger", title: `Couper « ${c.name} »`, detail: `${ev.code} : ${why} — chaque euro dépensé maintenant est perdu. Basculez le budget sur la prochaine date.`, href: `/marketing/campagnes/${c.id}` });
    }
  }

  // 2. Budget presque consommé.
  for (const c of active) {
    const p = input.perf.get(c.id);
    if (p?.budgetUsedPct !== undefined && p.budgetUsedPct >= 90) {
      out.push({ id: `budget-${c.id}`, tone: "warning", title: `Budget consommé à ${Math.round(p.budgetUsedPct)} % — ${c.name}`, detail: `${money(p.spendCents)} dépensés sur ${money(c.budgetCents)} : prolongez ou arrêtez en connaissance de cause.`, href: `/marketing/campagnes/${c.id}` });
    }
  }

  // 3. Coût par lead anormalement élevé (30 derniers jours, par rapport aux autres campagnes de la même régie).
  const since = new Date(now - 30 * DAY).toISOString().slice(0, 10);
  const recent = new Map<string, ReturnType<typeof sumStats>>();
  for (const c of input.campaigns) recent.set(c.id, sumStats((input.byCampaign.get(c.id) ?? []).filter((s) => s.date >= since)));
  for (const platform of ["meta", "linkedin"] as const) {
    const rows = input.campaigns.filter((c) => c.platform === platform).map((c) => ({ c, t: recent.get(c.id)! })).filter((x) => x.t.leads > 0 && x.t.spendCents >= 10_000);
    if (rows.length < 2) continue;
    const cpls = rows.map((x) => x.t.spendCents / x.t.leads).sort((a, b) => a - b);
    const median = cpls[Math.floor(cpls.length / 2)];
    for (const { c, t } of rows) {
      const cpl = t.spendCents / t.leads;
      if (c.status === "active" && cpl > 2 * median) {
        out.push({ id: `cpl-${c.id}`, tone: "warning", title: `Coût par lead élevé — ${c.name}`, detail: `${money(cpl)} par lead sur 30 jours, plus du double de la médiane ${platform === "meta" ? "Meta" : "LinkedIn"} (${money(median)}). Testez une nouvelle créa ou resserrez le ciblage.`, href: `/marketing/campagnes/${c.id}` });
      }
    }
  }

  // 4. Attribution : campagne qui dépense sans aucun lead CRM, ou utm_campaign en double.
  for (const c of active) {
    const p = input.perf.get(c.id);
    const age = now - new Date(c.startAt).getTime();
    if (p && p.spendCents >= 20_000 && p.crmLeads === 0 && age >= 14 * DAY) {
      out.push({ id: `attr-${c.id}`, tone: "warning", title: `Aucun lead attribué — ${c.name}`, detail: `${money(p.spendCents)} dépensés, 0 candidature avec utm_campaign=${c.utmCampaign || "∅"}. Vérifiez les paramètres d'URL des publicités.`, href: `/marketing/campagnes/${c.id}` });
    }
  }
  const utmCount = new Map<string, number>();
  for (const c of input.campaigns) if (c.utmCampaign) utmCount.set(c.utmCampaign.toLowerCase(), (utmCount.get(c.utmCampaign.toLowerCase()) ?? 0) + 1);
  for (const [utm, n] of utmCount) {
    if (n > 1) out.push({ id: `dup-${utm}`, tone: "warning", title: `utm_campaign « ${utm} » partagée par ${n} campagnes`, detail: "Les candidatures sont comptées pour chacune : renommez-la pour que l'attribution reste juste.", href: "/marketing?onglet=campagnes" });
  }

  // 5. Tests A/B : gagnant à entériner, répartition anormale.
  for (const e of input.experiments.filter((x) => x.status === "en_cours")) {
    const a = analyzeExperiment(e, input.adStats);
    if (a.verdict === "gagnant" && a.winner) out.push({ id: `win-${e.id}`, tone: "success", title: `Test à conclure : ${e.name}`, detail: a.headline, href: `/marketing/tests/${e.id}` });
    if (a.srm?.suspicious) out.push({ id: `srm-${e.id}`, tone: "danger", title: `Répartition anormale du trafic — ${e.name}`, detail: "Les expositions ne respectent pas les pondérations (SRM) : vérifiez l'intégration sur le site avant de lire les résultats.", href: `/marketing/tests/${e.id}` });
  }

  // 6. Données de régie périmées.
  for (const c of active) {
    if (c.externalId && (!c.lastSyncedAt || now - new Date(c.lastSyncedAt).getTime() > 48 * 3_600_000)) {
      out.push({ id: `stale-${c.id}`, tone: "info", title: `Chiffres non synchronisés — ${c.name}`, detail: "Dernière synchro il y a plus de 48 h : lancez « Synchroniser les régies » ou vérifiez le cron.", href: `/marketing/campagnes/${c.id}` });
    }
  }

  // 7. Sessions en retard de remplissage sans campagne active.
  const late = input.plan.filter((p) => p.risk === "critique" && p.activeCampaigns === 0);
  if (late.length) {
    out.push({ id: "promo", tone: "danger", title: `${late.length} session${late.length > 1 ? "s" : ""} en retard sans campagne active`, detail: late.slice(0, 3).map((p) => `${p.event.code} (J-${p.daysLeft}, ${p.fillRate} %)`).join(" · "), href: "/marketing?onglet=promotion" });
  }

  const order: Record<Tone, number> = { danger: 0, warning: 1, success: 2, accent: 3, info: 4, violet: 5, neutral: 6 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}
