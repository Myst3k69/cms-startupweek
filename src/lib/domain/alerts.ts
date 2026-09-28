/**
 * Alertes transverses (cloche de notifications + tableau de bord).
 * Remplace les promesses « réponse sous 24-48h » jamais suivies dans n8n.
 */
import type { CrmState } from "@/lib/store";
import { complaintAckLate, daysUntil, effectiveInvoiceStatus, invoiceBalance, isTaskOverdue, sessionStats, slaState } from "./selectors";
import { money } from "@/lib/format";
import type { Tone } from "./constants";

export interface Alert {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
  href: string;
  category: "commercial" | "qualite" | "finance" | "programme";
}

type AlertInput = Pick<CrmState, "submissions" | "complaints" | "invoices" | "tasks" | "events" | "applications" | "speakers" | "contacts" | "settings" | "sessionUserId"> &
  Partial<Pick<CrmState, "adCampaigns">>;

export function computeAlerts(s: AlertInput, now: number): Alert[] {
  const out: Alert[] = [];

  const lateSubs = s.submissions.filter((x) => slaState(x, now) === "depasse");
  if (lateSubs.length) {
    out.push({
      id: "sla",
      tone: "danger",
      title: `${lateSubs.length} demande${lateSubs.length > 1 ? "s" : ""} hors délai de réponse`,
      detail: `Engagement : réponse sous ${s.settings.slaHours} h — ${lateSubs.slice(0, 2).map((x) => x.name).join(", ")}${lateSubs.length > 2 ? "…" : ""}`,
      href: "/demandes?sla=depasse",
      category: "commercial",
    });
  }

  const lateComplaints = s.complaints.filter((c) => complaintAckLate(c, now, s.settings.complaintAckHours));
  lateComplaints.forEach((c) =>
    out.push({
      id: `rec-${c.id}`,
      tone: "danger",
      title: `Réclamation ${c.number} sans accusé de réception`,
      detail: `Reçue il y a plus de ${s.settings.complaintAckHours} h — indicateur Qualiopi 31`,
      href: `/qualiopi/reclamations?id=${c.id}`,
      category: "qualite",
    }),
  );

  const overdue = s.invoices.filter((i) => effectiveInvoiceStatus(i, now) === "en_retard");
  if (overdue.length) {
    const amount = overdue.reduce((a, i) => a + invoiceBalance(i), 0);
    out.push({
      id: "overdue",
      tone: "warning",
      title: `${overdue.length} facture${overdue.length > 1 ? "s" : ""} en retard`,
      detail: `${money(amount)} à encaisser — relances automatiques actives`,
      href: "/facturation?statut=en_retard",
      category: "finance",
    });
  }

  const myLate = s.tasks.filter((t) => isTaskOverdue(t, now) && (!s.sessionUserId || t.assigneeId === s.sessionUserId));
  if (myLate.length) {
    out.push({
      id: "tasks",
      tone: "warning",
      title: `${myLate.length} relance${myLate.length > 1 ? "s" : ""} en retard`,
      detail: myLate.slice(0, 2).map((t) => t.title).join(" · "),
      href: "/relances?vue=retard",
      category: "commercial",
    });
  }

  s.events
    .filter((e) => ["inscriptions_ouvertes", "prevu"].includes(e.status) && e.kind !== "webinaire")
    .forEach((e) => {
      const d = daysUntil(e.startAt, now);
      const st = sessionStats(e, s.applications);
      if (d > 0 && d <= 21 && st.belowMinimum && !e.orgId) {
        out.push({
          id: `min-${e.id}`,
          tone: "warning",
          title: `${e.code} sous le seuil minimum`,
          detail: `${st.enrolled}/${e.minCapacity} inscrits minimum à J-${d} — ${e.city}`,
          href: `/sessions/${e.id}`,
          category: "programme",
        });
      }
      const noConvoc = s.applications.filter((a) => a.eventId === e.id && a.status === "inscrite" && !a.convocationSentAt);
      if (d > 0 && d <= 7 && noConvoc.length) {
        out.push({
          id: `conv-${e.id}`,
          tone: "info",
          title: `Convocations à envoyer — ${e.code}`,
          detail: `${noConvoc.length} participant${noConvoc.length > 1 ? "s" : ""} sans convocation (indicateur 9)`,
          href: `/sessions/${e.id}?onglet=participants`,
          category: "qualite",
        });
      }
    });

  // Publicité qui continue de dépenser pour une session qui ne peut plus accueillir d'inscrits.
  const eventsById = new Map(s.events.map((e) => [e.id, e]));
  const wasted = (s.adCampaigns ?? []).filter((c) => {
    const e = c.status === "active" && c.eventId ? eventsById.get(c.eventId) : undefined;
    if (!e || e.kind === "webinaire") return false;
    return e.status === "complet" || e.status === "annule" || daysUntil(e.startAt, now) <= 0 || daysUntil(e.registrationDeadline, now) < 0 || sessionStats(e, s.applications).remaining === 0;
  });
  if (wasted.length) {
    out.push({
      id: "ads-closed",
      tone: "warning",
      title: `${wasted.length} campagne${wasted.length > 1 ? "s" : ""} active${wasted.length > 1 ? "s" : ""} sur une session close`,
      detail: `${wasted.map((c) => c.name).slice(0, 2).join(" · ")} — session complète, démarrée ou inscriptions closes`,
      href: wasted.length === 1 ? `/marketing/campagnes/${wasted[0].id}` : "/marketing?onglet=campagnes",
      category: "commercial",
    });
  }

  const noCv = s.speakers.filter((sp) => !sp.cvOnFile);
  if (noCv.length) {
    out.push({
      id: "cv",
      tone: "info",
      title: `${noCv.length} intervenant${noCv.length > 1 ? "s" : ""} sans CV au dossier`,
      detail: `${noCv.map((x) => `${x.firstName} ${x.lastName}`).join(", ")} — indicateur 21`,
      href: "/intervenants",
      category: "qualite",
    });
  }

  if (s.settings.auditDate) {
    const d = daysUntil(s.settings.auditDate, now);
    if (d > 0 && d <= 90) {
      out.push({ id: "audit", tone: "accent", title: `Audit Qualiopi dans ${d} jours`, detail: "Suivez le score de préparation et le plan d'actions", href: "/qualiopi", category: "qualite" });
    }
  }

  return out;
}
