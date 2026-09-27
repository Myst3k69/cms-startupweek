"use client";

import { getSupabase } from "@/lib/data/supabase";
import type { LessonBlock, Persona } from "@/lib/domain/types";

export type AiMode = "lecon" | "quiz" | "variante" | "ameliorer";

export interface AiPayload {
  mode: AiMode;
  course: { title: string; subtitle: string; audience: string; level: string; objectives: string[] };
  module?: { title: string; summary: string };
  lesson: { title: string; summary: string; estimatedMinutes: number; text: string };
  persona?: Persona;
  sourceText?: string;
  instructions?: string;
}

export type AiResponse = { ok: true; blocks: LessonBlock[]; model: string } | { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  SUPABASE_NOT_CONFIGURED: "L'aide à la rédaction n'est disponible qu'en production (connexion Supabase), ou en local avec ALLOW_DEMO_API=1.",
  MISSING_TOKEN: "Session expirée : reconnectez-vous.",
  INVALID_TOKEN: "Session expirée : reconnectez-vous.",
  NOT_A_TEAM_MEMBER: "Compte non rattaché à l'équipe.",
  FORBIDDEN: "Votre rôle ne permet pas de modifier les formations.",
};

/** Appelle /api/academy/ai avec le jeton de la session du back-office. */
export async function requestDraft(payload: AiPayload): Promise<AiResponse> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.auth.getSession();
    if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`;
  }
  try {
    const res = await fetch("/api/academy/ai", { method: "POST", headers, body: JSON.stringify(payload) });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; blocks?: LessonBlock[]; model?: string; error?: string; message?: string };
    if (res.ok && json.ok && json.blocks) return { ok: true, blocks: json.blocks, model: json.model ?? "" };
    return { ok: false, message: json.message ?? MESSAGES[json.error ?? ""] ?? `Échec de la génération (${res.status}).` };
  } catch {
    return { ok: false, message: "Réseau indisponible : réessayez." };
  }
}
