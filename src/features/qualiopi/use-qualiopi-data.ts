"use client";

import { useMemo } from "react";
import { useCollection, useSettings } from "@/lib/hooks";
import type { Collections, Settings } from "@/lib/domain/types";

/** Sous-ensemble du store utilisé par les preuves automatiques et les tableaux de bord qualité. */
export type QualiopiData = Pick<
  Collections,
  | "applications"
  | "events"
  | "attendances"
  | "evaluations"
  | "complaints"
  | "improvementActions"
  | "speakers"
  | "watchItems"
  | "resources"
  | "evidences"
  | "users"
  | "indicators"
> & { settings: Settings };

/** Références stables (collections brutes) regroupées dans un objet mémoïsé. */
export function useQualiopiData(): QualiopiData {
  const applications = useCollection("applications");
  const events = useCollection("events");
  const attendances = useCollection("attendances");
  const evaluations = useCollection("evaluations");
  const complaints = useCollection("complaints");
  const improvementActions = useCollection("improvementActions");
  const speakers = useCollection("speakers");
  const watchItems = useCollection("watchItems");
  const resources = useCollection("resources");
  const evidences = useCollection("evidences");
  const users = useCollection("users");
  const indicators = useCollection("indicators");
  const settings = useSettings();
  return useMemo(
    () => ({ applications, events, attendances, evaluations, complaints, improvementActions, speakers, watchItems, resources, evidences, users, indicators, settings }),
    [applications, events, attendances, evaluations, complaints, improvementActions, speakers, watchItems, resources, evidences, users, indicators, settings],
  );
}
