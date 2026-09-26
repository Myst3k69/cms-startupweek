/**
 * Projets des participants (startups fictives), rattachés aux candidatures « inscrite ».
 * Inspirés des témoignages du site : Next-Elec, WePilot, DeltaConcept.
 */
import type { Application, Project, ProjectMilestone, ProjectStage } from "../../domain/types";
import { type SeedContext, dayRel, stamps } from "./context";
import { DAY, HOUR, slug, sortBy } from "./helpers";
import { PROJECT_IDEAS } from "./names";
import { SPK } from "./events";

/** Fondateurs des témoignages → projet imposé et prix obtenu. */
const NAMED: Record<string, { project: string; award: string }> = {
  "Nelson Charpentier": { project: "Next-Elec", award: "Coup de cœur des mentors SW-0004" },
  "Caroline Blanchard": { project: "WePilot", award: "Prix du public SW-0007" },
  "Mathieu Thibault": { project: "DeltaConcept", award: "Prix du jury SW-0008" },
};

/** Sessions où deux inscrits co-fondent le même projet. */
const DUO_SESSIONS = new Set(["SW-0006", "SW-0009"]);

/** Nombre de projets suivis par session. */
const PER_SESSION: Record<string, number> = {
  "SW-0001": 2, "SW-0002": 3, "SW-0003": 3, "SW-0004": 3, "SW-0005": 3, "SW-0006": 3, "SW-0007": 4, "SW-0008": 4, "SW-0009": 3, "SW-0010": 3,
  "SW-0012": 2, "SW-0011": 2, "SW-0014": 1,
};

const GOALS = [
  "Atteindre 100 utilisateurs actifs et signer 3 premiers clients payants.",
  "Valider le prix auprès de 20 prospects et atteindre 2 000 € de MRR.",
  "Obtenir la Bourse French Tech et recruter un CTO associé.",
  "Lancer la V2 avec paiement intégré et ouvrir une deuxième ville.",
  "Convertir la liste d'attente (≥ 30 %) et préparer une levée pre-seed.",
  "Signer un partenariat de distribution et automatiser l'onboarding client.",
];

const NOTES = [
  "Point mensuel : 3 nouveaux clients, churn nul. Travail en cours sur l'onboarding.",
  "Review J+15 réalisée : priorisation du paiement en ligne et d'un tableau de bord client.",
  "Bloqué sur l'intégration bancaire (API partenaire), mentor sollicité.",
  "Pause de 2 mois (reprise d'un emploi salarié), reprise prévue au trimestre prochain.",
  "Démo faite à un réseau de BA, deuxième rendez-vous calé.",
  "Landing refaite après tests : taux d'inscription passé de 4 % à 11 %.",
  "Premier client payant signé la semaine dernière.",
];

export function buildProjects(ctx: SeedContext): void {
  const { clock } = ctx;
  const r = ctx.rng.fork("projects");
  const projects: Project[] = [];
  const ideas = PROJECT_IDEAS.filter((i) => !Object.values(NAMED).some((n) => n.project === i.name));
  let ideaIdx = 0;
  let seq = 0;

  const eventsByCode = new Map(ctx.data.events.map((e) => [e.code, e]));
  for (const [code, count] of Object.entries(PER_SESSION)) {
    const ev = eventsByCode.get(code)!;
    const S = Date.parse(ev.startAt);
    const E = Date.parse(ev.endAt);
    const past = S < clock.now;
    const monthsSince = past ? (clock.now - E) / (30 * DAY) : 0;
    const inscrites = sortBy(
      ctx.data.applications.filter((a) => a.eventId === ev.id && a.status === "inscrite"),
      (a) => a.number,
    );
    const fullName = (a: Application) => {
      const c = ctx.data.contacts.find((x) => x.id === a.contactId)!;
      return `${c.firstName} ${c.lastName}`;
    };
    // Fondateurs imposés d'abord, puis les premiers inscrits.
    const ordered = [...inscrites.filter((a) => NAMED[fullName(a)]), ...inscrites.filter((a) => !NAMED[fullName(a)])];
    const groups: Application[][] = [];
    let i = 0;
    while (groups.length < count && i < ordered.length) {
      const duo = DUO_SESSIONS.has(code) && groups.length === 0 && !NAMED[fullName(ordered[i])];
      groups.push(duo ? ordered.slice(i, i + 2) : [ordered[i]]);
      i += duo ? 2 : 1;
    }

    groups.forEach((founders, gi) => {
      const named = NAMED[fullName(founders[0])];
      const idea = named ? PROJECT_IDEAS.find((p) => p.name === named.project)! : ideas[ideaIdx++ % ideas.length];
      const id = `prj_${String(++seq).padStart(3, "0")}`;
      const stage: ProjectStage = !past
        ? r.pick(["idee", "cadrage", "prototype"] as const)
        : monthsSince > 6
          ? r.weighted([["traction", 3], ["lance", 4], ["mvp", 1]] as const)
          : monthsSince > 2
            ? r.weighted([["lance", 4], ["mvp", 3], ["traction", 1]] as const)
            : r.weighted([["mvp", 5], ["lance", 2]] as const);
      const health = !past
        ? "on_track"
        : r.weighted([["on_track", 6], ["a_risque", 2], ["bloque", 1], ["en_pause", 1]] as const);
      const advanced = stage === "lance" || stage === "traction";
      const users = past ? (stage === "traction" ? r.between(300, 2500) : advanced ? r.between(40, 400) : r.between(5, 60)) : undefined;
      const mrr = stage === "traction" ? r.between(15, 90) * 10000 : stage === "lance" && r.chance(0.6) ? r.between(2, 20) * 10000 : undefined;
      const funding = stage === "traction" && r.chance(0.5) ? r.pick([3000000, 5000000, 15000000, 30000000]) : advanced && r.chance(0.3) ? r.pick([1500000, 3000000]) : undefined;
      const mentors = ev.speakerIds.filter((s) => s !== SPK.aurelien);
      const endDay = dayRel(ctx, E);

      const milestones: ProjectMilestone[] = past
        ? [
            { id: `${id}_m1`, label: "Scope MVP validé", doneAt: clock.iso(S + 8 * HOUR) },
            { id: `${id}_m2`, label: "MVP en ligne", doneAt: clock.iso(E - DAY) },
            { id: `${id}_m3`, label: "10 premiers utilisateurs", ...(users && users >= 10 ? { doneAt: clock.iso(clock.past(E + r.between(8, 30) * DAY)) } : { dueAt: clock.iso(clock.rel(r.between(10, 40))) }) },
            { id: `${id}_m4`, label: "Premier client payant", ...(mrr ? { doneAt: clock.iso(clock.past(E + r.between(30, 90) * DAY)) } : { dueAt: clock.iso(clock.rel(r.between(20, 90))) }) },
          ]
        : [
            { id: `${id}_m1`, label: "Diagnostic MVP individuel pré-event", ...(dayRel(ctx, S) < 20 ? { doneAt: clock.iso(clock.rel(-r.between(2, 8), 18, 0)) } : { dueAt: clock.iso(clock.rel(dayRel(ctx, S) - 10, 18, 0)) }) },
            { id: `${id}_m2`, label: "MVP en ligne", dueAt: clock.iso(E - DAY) },
            { id: `${id}_m3`, label: "Review MVP J+15", dueAt: clock.iso(clock.rel(endDay + 15, 18, 0)) },
          ];

      const followUps = [30, 90, 180, 365].map((d) => clock.rel(endDay + d, 10, 0)).filter((ts) => ts > clock.now);
      const awards = named ? [named.award] : past && gi === groups.length - 1 && code !== "SW-0004" && code !== "SW-0007" && code !== "SW-0008" ? [`Prix du jury ${code}`] : [];
      if (stage === "traction" && funding && funding >= 3000000) awards.push("Lauréat Bourse French Tech (Bpifrance)");

      const s = slug(idea.name);
      const lastUpdate = past ? clock.now - r.between(2, 45) * DAY - r.between(1, 10) * HOUR : Date.parse(founders[0].submittedAt) + r.between(1, 5) * DAY;
      projects.push({
        id,
        ...stamps(ctx, Date.parse(founders[0].submittedAt) + HOUR, lastUpdate),
        name: idea.name,
        tagline: idea.tagline,
        description: `${idea.tagline}. Projet porté par ${founders.length > 1 ? "deux co-fondateurs" : "un·e fondateur·rice"} accompagné·e lors de la ${ev.code} (${ev.city}). Cible : ${idea.market.toLowerCase()}.`,
        stage,
        sector: idea.sector,
        targetMarket: idea.market,
        founderIds: founders.map((a) => a.contactId),
        eventIds: [ev.id],
        mentorIds: r.pickN(mentors, r.between(1, 2)),
        sixMonthGoals: r.pick(GOALS),
        mvpUrl: stage === "idee" || stage === "cadrage" ? undefined : `https://${s}.example.com`,
        deckUrl: past ? `https://storage.startupweek.tech/projets/${s}/pitch-deck.pdf` : undefined,
        milestones,
        metrics: {
          users,
          waitlist: stage === "idee" || stage === "cadrage" ? r.between(0, 60) : r.between(20, 600),
          mrrCents: mrr,
          fundingCents: funding,
        },
        health,
        lastUpdateAt: clock.iso(clock.past(lastUpdate)),
        lastUpdateNote: past ? (health === "bloque" ? NOTES[2] : health === "en_pause" ? NOTES[3] : r.pick([NOTES[0], NOTES[1], NOTES[4], NOTES[5], NOTES[6]])) : "Candidature validée, diagnostic MVP pré-event planifié.",
        awards,
        followUpAt: followUps.length ? clock.iso(followUps[0]) : undefined,
      });
      for (const a of founders) a.projectId = id;
    });
  }
  ctx.data.projects = projects;
}
