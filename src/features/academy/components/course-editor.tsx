"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpenCheck, CalendarDays, ClipboardCheck, Copy, Eye, FileSearch, Info, KeyRound, Link2, ListTree, Rocket, Save, ShoppingCart, Trash2, Users, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  LinkButton,
  Menu,
  PageHeader,
  Select,
  StatusBadge,
  Switch,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import { SessionLink } from "@/components/shared/entity-links";
import { MarkdownEditor } from "@/features/site/components/markdown-editor";
import { useActions, useCollection, useEntity, useNow, useSession } from "@/lib/hooks";
import { COURSE_LEVELS, COURSE_STATUSES, PERSONAS, labelOf } from "@/lib/domain/constants";
import { formatDuration, slugify, totalMinutes } from "@/lib/domain/academy";
import { syncCourseEnrollments } from "@/lib/domain/actions";
import type { Course, CourseLevel, CourseStatus, ID } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { cn, uid } from "@/lib/utils";
import { FocusModeButton } from "@/components/layout/focus-mode";
import { useCourseOutline } from "../lib/use-academy";
import { Outline } from "./outline";
import { LessonEditor } from "./lesson-editor";
import { EnrollmentTable, GrantAccessModal } from "./learners-tab";
import { AssignmentList } from "./assignments-tab";

type Tab = "programme" | "informations" | "acces" | "apprenants";
const TABS: Tab[] = ["programme", "informations", "acces", "apprenants"];
const isTab = (v: string | null): v is Tab => !!v && (TABS as string[]).includes(v);

function setQuery(patch: Record<string, string | null>) {
  const params = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) params.delete(k);
    else params.set(k, v);
  }
  const qs = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
}

/** Points bloquants / à compléter avant publication (structure + informations Qualiopi / FOAD). */
export function publicationIssues(course: Course, lessons: number, modules: number): { blocking: string[]; warnings: string[] } {
  const blocking: string[] = [];
  const warnings: string[] = [];
  if (!modules || !lessons) blocking.push("Au moins un module et une leçon");
  if (!course.subtitle.trim()) warnings.push("Sous-titre (promesse)");
  if (course.objectives.length < 2) warnings.push("Objectifs opérationnels (indicateur 5)");
  if (!course.prerequisites.trim()) warnings.push("Prérequis (indicateur 1)");
  if (!course.evaluationMethods.trim()) warnings.push("Modalités d'évaluation (indicateur 11)");
  if (!course.assistance.trim()) warnings.push("Assistance technique et pédagogique (FOAD)");
  if (!course.accessibility.trim()) warnings.push("Accessibilité (indicateur 26)");
  return { blocking, warnings };
}

/* ───────────────────────────── Informations ───────────────────────────── */

type Info = Pick<
  Course,
  | "title"
  | "slug"
  | "subtitle"
  | "description"
  | "level"
  | "personas"
  | "audience"
  | "objectives"
  | "prerequisites"
  | "durationHours"
  | "tags"
  | "authorIds"
  | "speakerIds"
  | "isTraining"
  | "evaluationMethods"
  | "assistance"
  | "accessibility"
  | "passingScore"
  | "certificateMinProgress"
  | "sequential"
  | "accessDays"
>;

function pickInfo(c: Course): Info {
  const { title, slug, subtitle, description, level, personas, audience, objectives, prerequisites, durationHours, tags, authorIds, speakerIds, isTraining, evaluationMethods, assistance, accessibility, passingScore, certificateMinProgress, sequential, accessDays } = c;
  return { title, slug, subtitle, description, level, personas, audience, objectives, prerequisites, durationHours, tags, authorIds, speakerIds, isTraining, evaluationMethods, assistance, accessibility, passingScore, certificateMinProgress, sequential, accessDays };
}

function InfoTab({ course, editable, minutes }: { course: Course; editable: boolean; minutes: number }) {
  const users = useCollection("users");
  const speakers = useCollection("speakers");
  const { update } = useActions();
  const toast = useToast();
  const [d, setD] = React.useState<Info>(() => pickInfo(course));
  const [objectives, setObjectives] = React.useState(course.objectives.join("\n"));
  const [tags, setTags] = React.useState(course.tags.join(", "));
  const set = <K extends keyof Info>(k: K, v: Info[K]) => setD((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (d.title.trim().length < 4) return toast({ title: "Titre trop court", tone: "danger" });
    const patch: Info = {
      ...d,
      title: d.title.trim(),
      slug: slugify(d.slug || d.title),
      objectives: objectives.split("\n").map((o) => o.trim()).filter(Boolean),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    update("courses", course.id, patch, { log: "Informations de la formation modifiées" });
    toast({ title: "Informations enregistrées" });
  };
  const toggle = (k: "authorIds" | "speakerIds" | "personas", v: string) => set(k, (d[k] as string[]).includes(v) ? (d[k] as string[]).filter((x) => x !== v) : ([...(d[k] as string[]), v] as never));
  const dis = !editable;
  const hoursGap = Math.abs(minutes / 60 - d.durationHours) > Math.max(1, d.durationHours * 0.1);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Présentation</CardTitle>
              <CardDescription>Affichée sur la page catalogue du site et dans Mon espace (information du public — indicateur 1).</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Titre" htmlFor="ci-title">
                <Input id="ci-title" value={d.title} onChange={(e) => set("title", e.target.value)} disabled={dis} />
              </FormField>
              <FormField label="Adresse (slug)" htmlFor="ci-slug" hint={`/academy/${slugify(d.slug || d.title)}`}>
                <Input id="ci-slug" value={d.slug} onChange={(e) => set("slug", e.target.value)} disabled={dis} />
              </FormField>
            </div>
            <FormField label="Sous-titre (promesse)" htmlFor="ci-sub">
              <Input id="ci-sub" value={d.subtitle} onChange={(e) => set("subtitle", e.target.value)} disabled={dis} />
            </FormField>
            <FormField label="Description">
              <MarkdownEditor value={d.description} onChange={(v) => set("description", v)} disabled={dis} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Niveau" htmlFor="ci-level">
                <Select id="ci-level" value={d.level} onChange={(e) => set("level", e.target.value as CourseLevel)} options={COURSE_LEVELS} disabled={dis} />
              </FormField>
              <FormField label="Durée annoncée (h)" htmlFor="ci-hours" hint={`Contenu actuel : ${formatDuration(minutes)}`} error={hoursGap ? `Écart avec le contenu (${formatDuration(minutes)})` : undefined}>
                <Input id="ci-hours" type="number" min={1} value={d.durationHours} onChange={(e) => set("durationHours", Math.max(1, Number(e.target.value) || 1))} disabled={dis} />
              </FormField>
              <FormField label="Mots-clés" htmlFor="ci-tags" hint="Séparés par des virgules">
                <Input id="ci-tags" value={tags} onChange={(e) => setTags(e.target.value)} disabled={dis} />
              </FormField>
            </div>
            <FormField label="Profils visés (variantes de contenu)" hint="Aucun coché = tous les profils.">
              <div className="flex flex-wrap gap-4">
                {PERSONAS.map((p) => (
                  <Checkbox key={p.value} label={p.label} checked={d.personas.includes(p.value)} onChange={() => toggle("personas", p.value)} disabled={dis} />
                ))}
              </div>
            </FormField>
            <FormField label="Public visé" htmlFor="ci-aud">
              <Textarea id="ci-aud" value={d.audience} onChange={(e) => set("audience", e.target.value)} className="min-h-16" disabled={dis} />
            </FormField>
            <FormField label="Objectifs opérationnels et évaluables (un par ligne)" htmlFor="ci-obj" hint="« Être capable de… » — indicateur 5.">
              <Textarea id="ci-obj" value={objectives} onChange={(e) => setObjectives(e.target.value)} className="min-h-28" disabled={dis} />
            </FormField>
            <FormField label="Prérequis" htmlFor="ci-pre">
              <Textarea id="ci-pre" value={d.prerequisites} onChange={(e) => set("prerequisites", e.target.value)} className="min-h-16" disabled={dis} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Formation à distance (FOAD) & Qualiopi</CardTitle>
              <CardDescription>Mentions exigées pour une action de formation à distance (art. D.6313-3-1 du Code du travail) et preuves du certificat de réalisation.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={d.isTraining} onChange={(v) => set("isTraining", v)} disabled={dis} label="Action de formation" />
              Action de formation (certificat de réalisation, suivi Qualiopi)
            </label>
            <FormField label="Assistance technique et pédagogique" htmlFor="ci-assist" hint="Qui répond, par quel canal, sous quel délai.">
              <Textarea id="ci-assist" value={d.assistance} onChange={(e) => set("assistance", e.target.value)} className="min-h-20" disabled={dis} />
            </FormField>
            <FormField label="Modalités d'évaluation" htmlFor="ci-eval">
              <Textarea id="ci-eval" value={d.evaluationMethods} onChange={(e) => set("evaluationMethods", e.target.value)} className="min-h-20" disabled={dis} />
            </FormField>
            <FormField label="Accessibilité et adaptations" htmlFor="ci-acc">
              <Textarea id="ci-acc" value={d.accessibility} onChange={(e) => set("accessibility", e.target.value)} className="min-h-16" disabled={dis} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Seuil de réussite des quiz (%)" htmlFor="ci-pass">
                <Input id="ci-pass" type="number" min={0} max={100} value={d.passingScore} onChange={(e) => set("passingScore", Math.min(100, Math.max(0, Number(e.target.value) || 0)))} disabled={dis} />
              </FormField>
              <FormField label="Progression pour le certificat (%)" htmlFor="ci-cert">
                <Input id="ci-cert" type="number" min={0} max={100} value={d.certificateMinProgress} onChange={(e) => set("certificateMinProgress", Math.min(100, Math.max(0, Number(e.target.value) || 0)))} disabled={dis} />
              </FormField>
              <FormField label="Durée d'accès (jours)" htmlFor="ci-days" hint="6 mois = 183 jours">
                <Input id="ci-days" type="number" min={1} value={d.accessDays} onChange={(e) => set("accessDays", Math.max(1, Number(e.target.value) || 1))} disabled={dis} />
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={d.sequential} onChange={(v) => set("sequential", v)} disabled={dis} label="Progression séquentielle" />
              Progression séquentielle (la leçon suivante se débloque quand la précédente est terminée)
            </label>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Équipe pédagogique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Auteurs">
              <div className="flex flex-col gap-2">
                {users.filter((u) => u.active).map((u) => (
                  <Checkbox key={u.id} label={u.name} checked={d.authorIds.includes(u.id)} onChange={() => toggle("authorIds", u.id)} disabled={dis} />
                ))}
              </div>
            </FormField>
            <FormField label="Formateurs référents (assistance, corrections)">
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                {speakers.filter((s) => s.kind === "formateur" || s.kind === "mentor" || s.kind === "coach").map((s) => (
                  <Checkbox key={s.id} label={`${s.firstName} ${s.lastName}`} checked={d.speakerIds.includes(s.id)} onChange={() => toggle("speakerIds", s.id)} disabled={dis} />
                ))}
              </div>
            </FormField>
          </CardContent>
        </Card>
        {editable ? (
          <Button className="w-full" onClick={save}>
            <Save /> Enregistrer les informations
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/* ───────────────────────────── Accès & vente ───────────────────────────── */

function AccessTab({ course, editable }: { course: Course; editable: boolean }) {
  const events = useCollection("events");
  const applications = useCollection("applications");
  const enrollments = useCollection("enrollments");
  const cohorts = useCollection("cohorts");
  const now = useNow();
  const { update } = useActions();
  const toast = useToast();
  const [price, setPrice] = React.useState(course.priceCents ? String(course.priceCents / 100) : "");
  const [stripe, setStripe] = React.useState(course.stripePriceId ?? "");

  const linked = events.filter((e) => course.eventIds.includes(e.id)).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const missing = applications.filter((a) => a.status === "inscrite" && course.eventIds.includes(a.eventId) && !enrollments.some((e) => e.courseId === course.id && e.contactId === a.contactId)).length;
  const upcomingSw = events.filter((e) => e.kind === "startup_week" && new Date(e.endAt).getTime() > now && !course.eventIds.includes(e.id));

  const setEvents = (ids: ID[], log: string) => update("courses", course.id, { eventIds: ids }, { log });

  const saveSale = (patch: Partial<Course>, msg: string) => {
    update("courses", course.id, patch, { log: msg });
    toast({ title: msg });
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Sessions liées</CardTitle>
            <CardDescription>Chaque candidature qui passe « Inscrite » dans une de ces sessions reçoit automatiquement l&apos;accès ({course.accessDays} jours après la fin de la session).</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {linked.length ? (
            <ul className="divide-y divide-border rounded-md border border-border">
              {linked.map((e) => {
                const n = applications.filter((a) => a.eventId === e.id && a.status === "inscrite").length;
                return (
                  <li key={e.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <CalendarDays className="size-4 shrink-0 text-faint" aria-hidden="true" />
                    <SessionLink id={e.id} />
                    <span className="ml-auto text-xs text-muted-foreground">
                      {date(e.startAt)} · {n} inscrit{n > 1 ? "s" : ""}
                    </span>
                    {editable ? (
                      <Button size="icon-xs" variant="ghost" aria-label={`Délier ${e.code}`} onClick={() => setEvents(course.eventIds.filter((x) => x !== e.id), `Session ${e.code} déliée`)}>
                        <X />
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune session liée : la formation n&apos;est accessible que par achat, cohorte ou accès manuel.</p>
          )}
          {editable ? (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Lier une session"
                className="min-w-56 flex-1"
                value=""
                placeholder="+ Lier une session…"
                onChange={(ev) => {
                  const e = events.find((x) => x.id === ev.target.value);
                  if (e) setEvents([...course.eventIds, e.id], `Session ${e.code} liée`);
                }}
                options={events.filter((e) => !course.eventIds.includes(e.id)).map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` }))}
              />
              {upcomingSw.length ? (
                <Button size="sm" variant="secondary" onClick={() => setEvents([...course.eventIds, ...upcomingSw.map((e) => e.id)], `${upcomingSw.length} sessions StartupWeek liées`)}>
                  <Link2 /> Lier les {upcomingSw.length} StartupWeek à venir
                </Button>
              ) : null}
            </div>
          ) : null}
          {missing > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-warning-soft p-3 text-sm text-warning-text">
              <span>
                {missing} inscrit{missing > 1 ? "s" : ""} de ces sessions n&apos;{missing > 1 ? "ont" : "a"} pas encore l&apos;accès.
              </span>
              {editable ? (
                <Button
                  size="sm"
                  onClick={() => {
                    const n = syncCourseEnrollments(course.id);
                    toast({ title: `${n} accès ouverts` });
                  }}
                >
                  <KeyRound /> Ouvrir les accès
                </Button>
              ) : null}
            </div>
          ) : null}
          {cohorts.some((c) => c.courseIds.includes(course.id)) ? (
            <p className="text-xs text-muted-foreground">
              Cohortes : {cohorts.filter((c) => c.courseIds.includes(course.id)).map((c) => c.name).join(", ")} —{" "}
              <Link href="/academy?onglet=cohortes" className="text-accent-text hover:underline">
                gérer
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Vente en ligne</CardTitle>
            <CardDescription>Paiement Stripe depuis le catalogue du site : le paiement crée le contact, la facture, le paiement et ouvre l&apos;accès ({course.accessDays} jours).</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Prix TTC (€)" htmlFor="sale-price" hint="Vide = non vendue seule.">
              <Input id="sale-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} disabled={!editable} />
            </FormField>
            <FormField label="TVA" htmlFor="sale-vat">
              <Select
                id="sale-vat"
                value={String(course.vatRate)}
                onChange={(e) => editable && saveSale({ vatRate: Number(e.target.value) }, "Taux de TVA modifié")}
                options={[
                  { value: "20", label: "20 %" },
                  { value: "0", label: "Exonérée (art. 261-4-4° CGI)" },
                ]}
                disabled={!editable}
              />
            </FormField>
          </div>
          <FormField label="Identifiant de prix Stripe (facultatif)" htmlFor="sale-stripe" hint="price_… ; sinon le prix ci-dessus est utilisé au moment du paiement.">
            <Input id="sale-stripe" value={stripe} onChange={(e) => setStripe(e.target.value)} placeholder="price_…" disabled={!editable} className="font-mono text-xs" />
          </FormField>
          {editable ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const cents = Math.round((Number(price.replace(",", ".")) || 0) * 100);
                saveSale({ priceCents: cents, stripePriceId: stripe.trim() || undefined, inCatalog: cents > 0 ? course.inCatalog : false }, cents ? `Prix : ${money(cents)} TTC` : "Prix retiré");
              }}
            >
              <Save /> Enregistrer le prix
            </Button>
          ) : null}
          <div className="flex items-center gap-2 border-t border-border pt-4 text-sm">
            <Switch
              checked={course.inCatalog}
              onChange={(v) => {
                if (v && (!course.priceCents || course.status !== "publiee")) return toast({ title: "Publiez la formation et définissez un prix d'abord", tone: "danger" });
                saveSale({ inCatalog: v }, v ? "Formation ajoutée au catalogue" : "Formation retirée du catalogue");
              }}
              disabled={!editable}
              label="Au catalogue"
            />
            Proposée à l&apos;achat sur le site{course.inCatalog ? ` — ${money(course.priceCents)} TTC` : ""}
          </div>
          <div className="flex gap-2 rounded-md bg-surface-2 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Le site appelle <code className="font-mono">POST /api/academy/checkout</code> (appel signé) pour ouvrir le paiement Stripe ; voir docs/ACADEMY.md. Variables serveur nécessaires : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SECRET_KEY, ACADEMY_API_SECRET.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────────────────────────── Page ───────────────────────────── */

export function CourseEditor({ id }: { id: ID }) {
  const course = useEntity("courses", id);
  if (!course) {
    return <EmptyState icon={FileSearch} title="Formation introuvable" description="Elle a peut-être été supprimée, ou le lien est erroné." action={<LinkButton href="/academy">Retour à l&apos;Academy</LinkButton>} className="mt-10" />;
  }
  return <CourseEditorInner course={course} />;
}

function CourseEditorInner({ course }: { course: Course }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canEdit } = useSession();
  const editable = canEdit("academy");
  const { update, create, remove } = useActions();
  const toast = useToast();
  const { modules, lessons, byModule } = useCourseOutline(course.id);
  const enrollments = useCollection("enrollments");
  const assignments = useCollection("assignments");
  const rawTab = searchParams.get("onglet");
  const [tab, setTab] = React.useState<Tab>(isTab(rawTab) ? rawTab : "programme");
  const [selected, setSelected] = React.useState<ID | undefined>(() => searchParams.get("lecon") ?? lessons[0]?.id);
  const [dirty, setDirty] = React.useState(false);
  const [granting, setGranting] = React.useState(false);
  const lesson = lessons.find((l) => l.id === selected) ?? lessons[0];
  const minutes = totalMinutes(lessons);
  const courseEnrollments = React.useMemo(() => enrollments.filter((e) => e.courseId === course.id), [enrollments, course.id]);
  const courseAssignments = React.useMemo(() => assignments.filter((a) => a.courseId === course.id), [assignments, course.id]);
  const issues = publicationIssues(course, lessons.length, modules.length);

  const select = (lessonId: ID) => {
    if (dirty && lessonId !== lesson?.id && !window.confirm("Des modifications de la leçon ne sont pas enregistrées. Les abandonner ?")) return;
    setSelected(lessonId);
    setDirty(false);
    setQuery({ lecon: lessonId });
  };
  const changeTab = (t: Tab) => {
    setTab(t);
    setQuery({ onglet: t === "programme" ? null : t });
  };

  const setStatus = (status: CourseStatus) => {
    if (status === course.status) return;
    if (status === "publiee" && issues.blocking.length) return toast({ title: "Publication impossible", description: issues.blocking.join(" · "), tone: "danger" });
    const patch: Partial<Course> = { status };
    if (status === "publiee" && !course.publishedAt) patch.publishedAt = new Date().toISOString();
    if (status !== "publiee" && course.inCatalog) patch.inCatalog = false;
    update("courses", course.id, patch, { log: `Statut : ${labelOf(COURSE_STATUSES, course.status)} → ${labelOf(COURSE_STATUSES, status)}`, kind: "statut" });
    toast({
      title: `Formation ${labelOf(COURSE_STATUSES, status).toLowerCase()}`,
      description: status === "publiee" && issues.warnings.length ? `À compléter : ${issues.warnings.join(", ")}.` : undefined,
    });
  };

  const duplicate = () => {
    const copyId = uid("crs");
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = course;
    void _id; void _c; void _u;
    create("courses", { ...rest, id: copyId, title: `${course.title} (copie)`, slug: `${course.slug}-copie`, status: "brouillon", inCatalog: false, eventIds: [], publishedAt: undefined, stripePriceId: undefined }, { log: `Copie de « ${course.title} »` });
    for (const m of modules) {
      const mid = uid("mod");
      create("courseModules", { courseId: copyId, position: m.position, title: m.title, summary: m.summary, objectives: m.objectives, id: mid }, { log: false });
      for (const l of byModule.get(m.id) ?? []) {
        create("lessons", { courseId: copyId, moduleId: mid, position: l.position, title: l.title, summary: l.summary, estimatedMinutes: l.estimatedMinutes, isPreview: l.isPreview, blocks: l.blocks }, { log: false });
      }
    }
    toast({ title: "Formation dupliquée", description: "La copie est en brouillon, sans session liée." });
    router.push(`/academy/formations/${copyId}`);
  };

  const deleteLesson = () => {
    if (!lesson) return;
    if (!window.confirm(`Supprimer la leçon « ${lesson.title} » ? La progression des apprenants sur cette leçon sera perdue.`)) return;
    remove("lessons", lesson.id, { log: `Leçon « ${lesson.title} » supprimée` });
    setDirty(false);
    setSelected(undefined);
    toast({ title: "Leçon supprimée", tone: "info" });
  };

  const deleteCourse = () => {
    if (courseEnrollments.length) return toast({ title: "Suppression impossible", description: "Des apprenants sont inscrits : archivez la formation.", tone: "danger" });
    if (!window.confirm(`Supprimer définitivement « ${course.title} » et tout son contenu ?`)) return;
    lessons.forEach((l) => remove("lessons", l.id));
    modules.forEach((m) => remove("courseModules", m.id));
    remove("courses", course.id, { log: `Formation « ${course.title} » supprimée` });
    router.push("/academy");
  };

  return (
    <div className="pb-10">
      <PageHeader
        breadcrumbs={[{ label: "Academy", href: "/academy" }, { label: "Formations", href: "/academy" }, { label: course.title }]}
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <BookOpenCheck className="size-3.5" aria-hidden="true" /> {modules.length} modules · {lessons.length} leçons · {formatDuration(minutes)}
          </span>
        }
        title={course.title}
        description={course.subtitle || undefined}
        actions={
          <>
            <StatusBadge options={COURSE_STATUSES} value={course.status} />
            <LinkButton href={`/academy/formations/${course.id}/apercu${lesson ? `?lecon=${lesson.id}` : ""}`} variant="secondary" size="sm">
              <Eye /> Aperçu apprenant
            </LinkButton>
            <FocusModeButton scope={`/academy/formations/${course.id}`} />
            {editable ? (
              <>
                {course.status !== "publiee" ? (
                  <Button size="sm" onClick={() => setStatus("publiee")}>
                    <Rocket /> Publier
                  </Button>
                ) : null}
                <Menu
                  trigger={(p) => (
                    <Button size="sm" variant="ghost" {...p} aria-label="Plus d'actions">
                      •••
                    </Button>
                  )}
                  items={[
                    ...COURSE_STATUSES.filter((s) => s.value !== course.status).map((s) => ({ label: `Passer en « ${s.label} »`, onSelect: () => setStatus(s.value) })),
                    "separator" as const,
                    { label: "Dupliquer la formation", icon: Copy, onSelect: duplicate },
                    { label: "Supprimer la formation", icon: Trash2, danger: true, onSelect: deleteCourse },
                  ]}
                />
              </>
            ) : null}
          </>
        }
      >
        {issues.warnings.length || issues.blocking.length ? (
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>À compléter :</span>
            {[...issues.blocking, ...issues.warnings].map((w) => (
              <Badge key={w} tone={issues.blocking.includes(w) ? "danger" : "warning"} className="text-[11px]">
                {w}
              </Badge>
            ))}
          </p>
        ) : null}
      </PageHeader>

      <Tabs<Tab>
        value={tab}
        onChange={changeTab}
        className="mb-5"
        tabs={[
          { value: "programme", label: "Programme", icon: ListTree, count: lessons.length },
          { value: "informations", label: "Informations", icon: Info },
          { value: "acces", label: "Accès & vente", icon: ShoppingCart },
          { value: "apprenants", label: "Apprenants", icon: Users, count: courseEnrollments.length },
        ]}
      />

      {tab === "programme" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
            <Outline course={course} modules={modules} byModule={byModule} selectedId={lesson?.id} onSelect={select} editable={editable} />
          </aside>
          <section className={cn("min-w-0 rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5")}>
            {lesson ? (
              <LessonEditor
                key={lesson.id}
                lesson={lesson}
                course={course}
                module={modules.find((m) => m.id === lesson.moduleId)}
                editable={editable}
                onDirtyChange={setDirty}
                onDelete={editable ? deleteLesson : undefined}
              />
            ) : (
              <EmptyState icon={ListTree} title="Aucune leçon" description="Ajoutez un module puis une leçon dans le programme." />
            )}
          </section>
        </div>
      ) : null}
      {tab === "informations" ? <InfoTab key={course.updatedAt} course={course} editable={editable} minutes={minutes} /> : null}
      {tab === "acces" ? <AccessTab course={course} editable={editable} /> : null}
      {tab === "apprenants" ? (
        <div className="space-y-6">
          {editable ? (
            <Button size="sm" onClick={() => setGranting(true)}>
              <KeyRound /> Donner un accès
            </Button>
          ) : null}
          <EnrollmentTable rows={courseEnrollments} showCourse={false} />
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ClipboardCheck className="size-4" aria-hidden="true" /> Livrables
            </h2>
            <AssignmentList rows={courseAssignments} />
          </div>
          <GrantAccessModal open={granting} onClose={() => setGranting(false)} courseId={course.id} />
        </div>
      ) : null}
    </div>
  );
}
