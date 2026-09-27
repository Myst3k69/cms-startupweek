/**
 * Accès aux données Academy côté serveur (API apprenant, achats Stripe).
 *
 * - SupabaseRepo : schéma `crm` via le client service_role (RLS contournée : les
 *   contrôles d'accès sont faits par la couche appelante, cf. learner.ts).
 * - MemoryRepo : jeu de démo en mémoire (aucune persistance) — mode démo et tests locaux.
 *
 * Conversion camelCase ↔ snake_case des clés de premier niveau, comme src/lib/data/sync.ts.
 */
import type { Assignment, Contact, Course, CourseModule, Enrollment, EntityName, Invoice, LearnerConnection, Lesson, LessonProgress } from "@/lib/domain/types";
import type { CrmAdminClient } from "../supabase-admin";

type Row = Record<string, unknown>;
const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const toDb = (o: object): Row => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [toSnake(k), v]));
const toPatch = (o: object): Row => Object.fromEntries(Object.entries(o).map(([k, v]) => [toSnake(k), v === undefined ? null : v]));
const fromDb = <T>(r: Row): T => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null).map(([k, v]) => [toCamel(k), v])) as T;

export type ContactLite = Pick<Contact, "id" | "firstName" | "lastName" | "email" | "lifecycle">;

export interface AcademyRepo {
  readonly dryRun: boolean;
  contactByEmail(email: string): Promise<ContactLite | null>;
  createContact(c: Omit<Contact, "id" | "createdAt" | "updatedAt">): Promise<ContactLite>;
  course(id: string): Promise<Course | null>;
  courseBySlug(slug: string): Promise<Course | null>;
  catalog(): Promise<Course[]>;
  outline(courseId: string): Promise<{ modules: CourseModule[]; lessons: Lesson[] }>;
  enrollmentsOf(contactId: string): Promise<Enrollment[]>;
  enrollment(id: string): Promise<Enrollment | null>;
  enrollmentFor(courseId: string, contactId: string): Promise<Enrollment | null>;
  insertEnrollment(e: Omit<Enrollment, "id" | "createdAt" | "updatedAt">): Promise<Enrollment>;
  updateEnrollment(id: string, patch: Partial<Enrollment>): Promise<void>;
  progressOf(enrollmentId: string): Promise<LessonProgress[]>;
  saveProgress(p: Omit<LessonProgress, "createdAt" | "updatedAt">, isNew: boolean): Promise<void>;
  assignmentsOf(enrollmentId: string): Promise<Assignment[]>;
  saveAssignment(a: Omit<Assignment, "createdAt" | "updatedAt">, isNew: boolean): Promise<void>;
  lastConnection(enrollmentId: string): Promise<LearnerConnection | null>;
  saveConnection(c: Omit<LearnerConnection, "createdAt" | "updatedAt">, isNew: boolean): Promise<void>;
  paymentExists(reference: string): Promise<boolean>;
  insertInvoice(i: Omit<Invoice, "id" | "createdAt" | "updatedAt" | "number"> & { number?: string }): Promise<{ id: string; number: string }>;
  insertPayment(p: { invoiceId: string; amountCents: number; receivedAt: string; reference: string; feeCents?: number }): Promise<"ok" | "duplicate">;
  log(entity: EntityName, entityId: string, summary: string, meta?: Record<string, string | number | boolean>): Promise<void>;
}

export const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;

/* ───────────────────────────── Supabase ───────────────────────────── */

export class SupabaseRepo implements AcademyRepo {
  readonly dryRun = false;
  constructor(private db: CrmAdminClient) {}

  private async one<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T | null> {
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ? fromDb<T>(data as Row) : null;
  }
  private async many<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map((r) => fromDb<T>(r));
  }
  private async write(q: PromiseLike<{ error: { message: string; code?: string } | null }>) {
    const { error } = await q;
    if (error) throw Object.assign(new Error(error.message), { code: error.code });
  }

  contactByEmail(email: string) {
    return this.one<ContactLite>(this.db.from("contacts").select("id, first_name, last_name, email, lifecycle").eq("email", email.trim().toLowerCase()).maybeSingle());
  }
  async createContact(c: Omit<Contact, "id" | "createdAt" | "updatedAt">) {
    const row = await this.one<ContactLite>(this.db.from("contacts").insert(toDb({ ...c, id: newId("ct") })).select("id, first_name, last_name, email, lifecycle").single());
    return row!;
  }
  course(id: string) {
    return this.one<Course>(this.db.from("academy_courses").select("*").eq("id", id).maybeSingle());
  }
  courseBySlug(slug: string) {
    return this.one<Course>(this.db.from("academy_courses").select("*").eq("slug", slug).maybeSingle());
  }
  catalog() {
    return this.many<Course>(this.db.from("academy_courses").select("*").eq("status", "publiee").eq("in_catalog", true).gt("price_cents", 0).order("title"));
  }
  async outline(courseId: string) {
    const [modules, lessons] = await Promise.all([
      this.many<CourseModule>(this.db.from("academy_modules").select("*").eq("course_id", courseId)),
      this.many<Lesson>(this.db.from("academy_lessons").select("*").eq("course_id", courseId)),
    ]);
    return { modules, lessons };
  }
  enrollmentsOf(contactId: string) {
    return this.many<Enrollment>(this.db.from("academy_enrollments").select("*").eq("contact_id", contactId));
  }
  enrollment(id: string) {
    return this.one<Enrollment>(this.db.from("academy_enrollments").select("*").eq("id", id).maybeSingle());
  }
  enrollmentFor(courseId: string, contactId: string) {
    return this.one<Enrollment>(this.db.from("academy_enrollments").select("*").eq("course_id", courseId).eq("contact_id", contactId).maybeSingle());
  }
  async insertEnrollment(e: Omit<Enrollment, "id" | "createdAt" | "updatedAt">) {
    return (await this.one<Enrollment>(this.db.from("academy_enrollments").insert(toDb({ ...e, id: newId("enr") })).select("*").single()))!;
  }
  updateEnrollment(id: string, patch: Partial<Enrollment>) {
    return this.write(this.db.from("academy_enrollments").update(toPatch(patch)).eq("id", id));
  }
  progressOf(enrollmentId: string) {
    return this.many<LessonProgress>(this.db.from("academy_progress").select("*").eq("enrollment_id", enrollmentId));
  }
  saveProgress(p: Omit<LessonProgress, "createdAt" | "updatedAt">, isNew: boolean) {
    return isNew ? this.write(this.db.from("academy_progress").insert(toDb(p))) : this.write(this.db.from("academy_progress").update(toPatch(p)).eq("id", p.id));
  }
  assignmentsOf(enrollmentId: string) {
    return this.many<Assignment>(this.db.from("academy_assignments").select("*").eq("enrollment_id", enrollmentId));
  }
  saveAssignment(a: Omit<Assignment, "createdAt" | "updatedAt">, isNew: boolean) {
    return isNew ? this.write(this.db.from("academy_assignments").insert(toDb(a))) : this.write(this.db.from("academy_assignments").update(toPatch(a)).eq("id", a.id));
  }
  lastConnection(enrollmentId: string) {
    return this.one<LearnerConnection>(this.db.from("academy_connections").select("*").eq("enrollment_id", enrollmentId).order("ended_at", { ascending: false }).limit(1).maybeSingle());
  }
  saveConnection(c: Omit<LearnerConnection, "createdAt" | "updatedAt">, isNew: boolean) {
    return isNew ? this.write(this.db.from("academy_connections").insert(toDb(c))) : this.write(this.db.from("academy_connections").update(toPatch(c)).eq("id", c.id));
  }
  async paymentExists(reference: string) {
    const { data, error } = await this.db.from("payments").select("id").eq("reference", reference).maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
  }
  async insertInvoice(i: Omit<Invoice, "id" | "createdAt" | "updatedAt" | "number"> & { number?: string }) {
    const row = await this.one<{ id: string; number: string }>(this.db.from("invoices").insert(toDb({ ...i, id: newId("inv") })).select("id, number").single());
    return row!;
  }
  async insertPayment(p: { invoiceId: string; amountCents: number; receivedAt: string; reference: string; feeCents?: number }) {
    const { error } = await this.db.from("payments").insert(toDb({ id: newId("pay"), method: "stripe", status: "reussi", ...p }));
    if (error?.code === "23505") return "duplicate";
    if (error) throw new Error(error.message);
    return "ok";
  }
  async log(entity: EntityName, entityId: string, summary: string, meta?: Record<string, string | number | boolean>) {
    const { error } = await this.db.from("activities").insert({ kind: "systeme", entity, entity_id: entityId, summary, meta: meta ?? null });
    if (error) console.error("[academy] journal", error.message);
  }
}

/* ───────────────────────────── Mémoire (démo) ───────────────────────────── */

export interface MemoryData {
  contacts: Contact[];
  courses: Course[];
  courseModules: CourseModule[];
  lessons: Lesson[];
  enrollments: Enrollment[];
  lessonProgress: LessonProgress[];
  assignments: Assignment[];
  learnerConnections: LearnerConnection[];
  invoices: Invoice[];
  payments: { reference: string }[];
}

/** Données de démo en mémoire : les écritures ne sont PAS persistées (réponses « dryRun »). */
export class MemoryRepo implements AcademyRepo {
  readonly dryRun = true;
  constructor(private d: MemoryData) {}
  private stamp = () => ({ createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  async contactByEmail(email: string) {
    return this.d.contacts.find((c) => c.email.toLowerCase() === email.trim().toLowerCase()) ?? null;
  }
  async createContact(c: Omit<Contact, "id" | "createdAt" | "updatedAt">) {
    const row = { ...c, id: newId("ct"), ...this.stamp() };
    this.d.contacts.push(row);
    return row;
  }
  async course(id: string) {
    return this.d.courses.find((c) => c.id === id) ?? null;
  }
  async courseBySlug(slug: string) {
    return this.d.courses.find((c) => c.slug === slug) ?? null;
  }
  async catalog() {
    return this.d.courses.filter((c) => c.status === "publiee" && c.inCatalog && c.priceCents > 0);
  }
  async outline(courseId: string) {
    return { modules: this.d.courseModules.filter((m) => m.courseId === courseId), lessons: this.d.lessons.filter((l) => l.courseId === courseId) };
  }
  async enrollmentsOf(contactId: string) {
    return this.d.enrollments.filter((e) => e.contactId === contactId);
  }
  async enrollment(id: string) {
    return this.d.enrollments.find((e) => e.id === id) ?? null;
  }
  async enrollmentFor(courseId: string, contactId: string) {
    return this.d.enrollments.find((e) => e.courseId === courseId && e.contactId === contactId) ?? null;
  }
  async insertEnrollment(e: Omit<Enrollment, "id" | "createdAt" | "updatedAt">) {
    const row = { ...e, id: newId("enr"), ...this.stamp() };
    this.d.enrollments.push(row);
    return row;
  }
  async updateEnrollment(id: string, patch: Partial<Enrollment>) {
    const i = this.d.enrollments.findIndex((e) => e.id === id);
    if (i >= 0) this.d.enrollments[i] = { ...this.d.enrollments[i], ...patch };
  }
  async progressOf(enrollmentId: string) {
    return this.d.lessonProgress.filter((p) => p.enrollmentId === enrollmentId);
  }
  async saveProgress(p: Omit<LessonProgress, "createdAt" | "updatedAt">) {
    const i = this.d.lessonProgress.findIndex((x) => x.id === p.id);
    if (i >= 0) this.d.lessonProgress[i] = { ...this.d.lessonProgress[i], ...p };
    else this.d.lessonProgress.push({ ...p, ...this.stamp() });
  }
  async assignmentsOf(enrollmentId: string) {
    return this.d.assignments.filter((a) => a.enrollmentId === enrollmentId);
  }
  async saveAssignment(a: Omit<Assignment, "createdAt" | "updatedAt">) {
    const i = this.d.assignments.findIndex((x) => x.id === a.id);
    if (i >= 0) this.d.assignments[i] = { ...this.d.assignments[i], ...a };
    else this.d.assignments.push({ ...a, ...this.stamp() });
  }
  async lastConnection(enrollmentId: string) {
    return this.d.learnerConnections.filter((c) => c.enrollmentId === enrollmentId).sort((a, b) => b.endedAt.localeCompare(a.endedAt))[0] ?? null;
  }
  async saveConnection(c: Omit<LearnerConnection, "createdAt" | "updatedAt">) {
    const i = this.d.learnerConnections.findIndex((x) => x.id === c.id);
    if (i >= 0) this.d.learnerConnections[i] = { ...this.d.learnerConnections[i], ...c };
    else this.d.learnerConnections.push({ ...c, ...this.stamp() });
  }
  async paymentExists(reference: string) {
    return this.d.payments.some((p) => p.reference === reference);
  }
  async insertInvoice(i: Omit<Invoice, "id" | "createdAt" | "updatedAt" | "number"> & { number?: string }) {
    const row = { ...i, id: newId("inv"), number: i.number ?? `F-DEMO-${this.d.invoices.length + 1}`, ...this.stamp() } as Invoice;
    this.d.invoices.push(row);
    return { id: row.id, number: row.number };
  }
  async insertPayment(p: { reference: string }) {
    if (this.d.payments.some((x) => x.reference === p.reference)) return "duplicate" as const;
    this.d.payments.push({ reference: p.reference });
    return "ok" as const;
  }
  async log() {
    /* démo : pas de journal */
  }
}
