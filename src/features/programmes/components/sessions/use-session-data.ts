"use client";

import * as React from "react";
import { ACTIVE_PIPELINE, invoiceTotal, sessionStats } from "@/lib/domain/selectors";
import type { Application, EventSession } from "@/lib/domain/types";
import { useCollection } from "@/lib/hooks";
import { satisfactionOf } from "../../lib/sessions";

/** Données dérivées d'une session (candidatures, factures, évaluations, émargements). */
export function useSessionData(ev: EventSession) {
  const applications = useCollection("applications");
  const invoices = useCollection("invoices");
  const evaluations = useCollection("evaluations");
  const attendances = useCollection("attendances");

  const apps = React.useMemo(() => applications.filter((a) => a.eventId === ev.id), [applications, ev.id]);
  const groups = React.useMemo(() => {
    const enrolled: Application[] = [];
    const pipeline: Application[] = [];
    const exits: Application[] = [];
    apps.forEach((a) => {
      if (a.status === "inscrite") enrolled.push(a);
      else if (ACTIVE_PIPELINE.includes(a.status)) pipeline.push(a);
      else exits.push(a);
    });
    return { enrolled, pipeline, exits };
  }, [apps]);
  const stats = React.useMemo(() => sessionStats(ev, applications), [ev, applications]);

  const sessionInvoices = React.useMemo(() => {
    const ids = new Set(apps.map((a) => a.id));
    return invoices.filter((i) => i.status !== "annulee" && (i.eventId === ev.id || (i.applicationId && ids.has(i.applicationId))));
  }, [invoices, apps, ev.id]);

  const finance = React.useMemo(() => {
    const unlinked = sessionInvoices.filter((i) => !i.applicationId && i.kind !== "avoir").reduce((s, i) => s + invoiceTotal(i).ttc, 0);
    const credits = sessionInvoices.filter((i) => i.kind === "avoir").reduce((s, i) => s + invoiceTotal(i).ttc, 0);
    const expected = stats.revenue + unlinked + credits;
    const collected = sessionInvoices.filter((i) => i.kind !== "avoir").reduce((s, i) => s + i.paidCents, 0);
    return { expected, collected, remaining: Math.max(0, expected - collected) };
  }, [sessionInvoices, stats.revenue]);

  const evals = React.useMemo(() => evaluations.filter((e) => e.eventId === ev.id), [evaluations, ev.id]);
  const satisfaction = React.useMemo(() => satisfactionOf(evals, ev.id), [evals, ev.id]);
  const attendance = React.useMemo(() => attendances.filter((a) => a.eventId === ev.id), [attendances, ev.id]);

  return { apps, ...groups, stats, sessionInvoices, finance, evals, satisfaction, attendance };
}

export type SessionData = ReturnType<typeof useSessionData>;
