/**
 * Point d'entrée serveur Academy : dépôt de données (Supabase en production,
 * jeu de démo en mémoire sinon) et vérification des appels signés du site.
 */
import { buildSeed } from "@/lib/data/seed";
import { verifyIntakeSignature } from "../security";
import { getSupabaseAdmin } from "../supabase-admin";
import { MemoryRepo, SupabaseRepo, type AcademyRepo } from "./repo";

let demo: MemoryRepo | null = null;

/** Supabase si SUPABASE_SECRET_KEY est défini, sinon démo en mémoire (écritures non persistées). */
export function getAcademyRepo(): AcademyRepo {
  const db = getSupabaseAdmin();
  if (db) return new SupabaseRepo(db);
  if (!demo) {
    const s = buildSeed(Date.now());
    demo = new MemoryRepo({
      contacts: s.contacts,
      courses: s.courses,
      courseModules: s.courseModules,
      lessons: s.lessons,
      enrollments: s.enrollments,
      lessonProgress: s.lessonProgress,
      assignments: s.assignments,
      learnerConnections: s.learnerConnections,
      invoices: s.invoices,
      payments: s.payments,
    });
  }
  return demo;
}

/** Secret partagé avec le site (ACADEMY_API_SECRET, à défaut celui des formulaires). */
export function academySecret(): string | undefined {
  return process.env.ACADEMY_API_SECRET || process.env.INTAKE_SIGNING_SECRET || undefined;
}

export type SignedCheck = { ok: true } | { ok: false; status: 401 | 503; error: string };

/**
 * Appel serveur à serveur signé : `x-sw-signature: sha256=HMAC(secret, corps brut)` et
 * horodatage `ts` (ms) dans le corps, à ± 5 minutes (anti-rejeu).
 * Sans secret : refusé en production (Supabase configuré), accepté en démo.
 */
export function checkSignedCall(raw: string, header: string | null, ts: unknown, nowMs = Date.now()): SignedCheck {
  const secret = academySecret();
  if (!secret) return getSupabaseAdmin() ? { ok: false, status: 503, error: "ACADEMY_API_SECRET_MISSING" } : { ok: true };
  if (!verifyIntakeSignature(raw, header, secret)) return { ok: false, status: 401, error: "INVALID_SIGNATURE" };
  if (typeof ts !== "number" || Math.abs(nowMs - ts) > 5 * 60_000) return { ok: false, status: 401, error: "STALE_REQUEST" };
  return { ok: true };
}
