"use client";

import { useCallback, useMemo } from "react";
import { useCrm } from "@/lib/store";
import type { EntityRef } from "@/lib/domain/types";
import { entityHref, entityLabel, ENTITY_KIND_LABEL } from "../../lib/entity-ref";

/** Options de sélection des membres actifs de l'équipe. */
export function useUserOptions() {
  const users = useCrm((s) => s.users);
  return useMemo(() => users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name })), [users]);
}

export function useOrgOptions() {
  const orgs = useCrm((s) => s.organizations);
  return useMemo(() => [...orgs].sort((a, b) => a.name.localeCompare(b.name, "fr")).map((o) => ({ value: o.id, label: o.name })), [orgs]);
}

/** Résout n'importe quelle référence d'entité en { libellé, lien, type }. */
export function useRefResolver() {
  const contacts = useCrm((s) => s.contacts);
  const organizations = useCrm((s) => s.organizations);
  const deals = useCrm((s) => s.deals);
  const submissions = useCrm((s) => s.submissions);
  const applications = useCrm((s) => s.applications);
  const invoices = useCrm((s) => s.invoices);
  const quotes = useCrm((s) => s.quotes);
  const events = useCrm((s) => s.events);
  const projects = useCrm((s) => s.projects);
  const complaints = useCrm((s) => s.complaints);
  const lookup = useMemo(
    () => ({ contacts, organizations, deals, submissions, applications, invoices, quotes, events, projects, complaints }),
    [contacts, organizations, deals, submissions, applications, invoices, quotes, events, projects, complaints],
  );
  return useCallback(
    (ref: EntityRef) => ({ label: entityLabel(ref, lookup), href: entityHref(ref), kind: ENTITY_KIND_LABEL[ref.entity] ?? "Élément" }),
    [lookup],
  );
}
