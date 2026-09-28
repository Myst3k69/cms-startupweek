"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpenCheck, CalendarDays, ClipboardCheck, Copy, Eye, FileSearch, Info, KeyRound, Link2, PenLine, Save, ShoppingCart, Trash2, Users, X } from "lucide-react";
import {
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
import { useActions, useCollection, useEntity, useNow, useSession } from "@/lib/hooks";
import { COURSE_STATUSES } from "@/lib/domain/constants";
import { formatDuration, totalMinutes } from "@/lib/domain/academy";
import { syncCourseEnrollments } from "@/lib/domain/actions";
import type { Course, ID } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { uid } from "@/lib/utils";
import { useCourseOutline } from "../lib/use-academy";
import { EnrollmentTable, GrantAccessModal } from "./learners-tab";
import { AssignmentList } from "./assignments-tab";

type Tab = "acces" | "informations" | "apprenants";
const TABS: Tab[] = ["acces", "informations", "apprenants"];
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
/* ───────────────────────────── Informations ───────────────────────────── */

/** Fiche Academy : réglages Qualiopi / FOAD et équipe. La présentation publique se règle dans le Studio (fiche catalogue). */
type Info = Pick<Course, "tags" | "authorIds" | "speakerIds" | "isTraining" | "evaluationMethods" | "assistance" | "accessibility" | "passingScore" | "certificateMinProgress" | "sequential" | "accessDays">;

function pickInfo(c: Course): Info {
  const { tags, authorIds, speakerIds, isTraining, evaluationMethods, assistance, accessibility, passingScore, certificateMinProgress, sequential, accessDays } = c;
  return { tags, authorIds, speakerIds, isTraining, evaluationMethods, assistance, accessibility, passingScore, certificateMinProgress, sequential, accessDays };
}

function InfoTab({ course, editable }: { course: Course; editable: boolean }) {
  const users = useCollection("users");
  const speakers = useCollection("speakers");
  const { update } = useActions();
  const toast = useToast();
  const [d, setD] = React.useState<Info>(() => pickInfo(course));
  const [tags, setTags] = React.useState(course.tags.join(", "));
  const set = <K extends keyof Info>(k: K, v: Info[K]) => setD((p) => ({ ...p, [k]: v }));
  const save = () => {
    const patch: Info = { ...d, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) };
    update("courses", course.id, patch, { log: "Informations de la formation modifiées" });
    toast({ title: "Informations enregistrées" });
  };
  const toggle = (k: "authorIds" | "speakerIds", v: string) => set(k, (d[k] as string[]).includes(v) ? (d[k] as string[]).filter((x) => x !== v) : ([...(d[k] as string[]), v] as never));
  const dis = !editable;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        <p className="flex items-start gap-2 rounded-lg bg-surface-2 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Titre, accroche, description, objectifs, prérequis, prix et mise au catalogue se règlent dans le{" "}
            <Link href={`/studio/${course.id}?vue=catalogue`} className="text-accent-text hover:underline">
              Studio (fiche catalogue)
            </Link>
            .
          </span>
        </p>
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
            <FormField label="Mots-clés" htmlFor="ci-tags" hint="Séparés par des virgules">
              <Input id="ci-tags" value={tags} onChange={(e) => setTags(e.target.value)} disabled={dis} />
            </FormField>
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
            <Save /> Enregistrer
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

  const linked = events.filter((e) => course.eventIds.includes(e.id)).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const missing = applications.filter((a) => a.status === "inscrite" && course.eventIds.includes(a.eventId) && !enrollments.some((e) => e.courseId === course.id && e.contactId === a.contactId)).length;
  const upcomingSw = events.filter((e) => e.kind === "startup_week" && new Date(e.endAt).getTime() > now && !course.eventIds.includes(e.id));

  const setEvents = (ids: ID[], log: string) => update("courses", course.id, { eventIds: ids }, { log });



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
            <CardDescription>Paiement Stripe depuis la page catalogue du site : crée le contact, la facture et ouvre l&apos;accès ({course.accessDays} jours).</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Prix : <strong className="tabular">{course.priceCents ? `${money(course.priceCents)} TTC` : "non renseigné"}</strong>
          </p>
          <p className="flex items-center gap-2">
            <StatusBadge options={[{ value: "oui", label: "Au catalogue", tone: "success" }, { value: "non", label: "Pas au catalogue", tone: "neutral" }]} value={course.inCatalog ? "oui" : "non"} />
            {course.status !== "publiee" ? <span className="text-xs text-muted-foreground">Publication requise (Studio → Relecture)</span> : null}
          </p>
          <LinkButton href={`/studio/${course.id}?vue=catalogue`} size="sm" variant="secondary">
            <ShoppingCart /> Modifier la fiche catalogue et le prix
          </LinkButton>
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
  const { create, remove } = useActions();
  const toast = useToast();
  const { modules, lessons, byModule } = useCourseOutline(course.id);
  const enrollments = useCollection("enrollments");
  const assignments = useCollection("assignments");
  const rawTab = searchParams.get("onglet");
  const [tab, setTab] = React.useState<Tab>(isTab(rawTab) ? rawTab : "acces");
  const [granting, setGranting] = React.useState(false);
  const minutes = totalMinutes(lessons);
  const courseEnrollments = React.useMemo(() => enrollments.filter((e) => e.courseId === course.id), [enrollments, course.id]);
  const courseAssignments = React.useMemo(() => assignments.filter((a) => a.courseId === course.id), [assignments, course.id]);

  const changeTab = (t: Tab) => {
    setTab(t);
    setQuery({ onglet: t === "acces" ? null : t });
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
            <LinkButton href={`/academy/formations/${course.id}/apercu`} variant="ghost" size="sm">
              <Eye /> Aperçu apprenant
            </LinkButton>
            <LinkButton href={`/studio/${course.id}`} size="sm">
              <PenLine /> Ouvrir dans le Studio
            </LinkButton>
            {editable ? (
              <>
                <Menu
                  trigger={(p) => (
                    <Button size="sm" variant="ghost" {...p} aria-label="Plus d'actions">
                      •••
                    </Button>
                  )}
                  items={[
                    { label: "Dupliquer la formation", icon: Copy, onSelect: duplicate },
                    { label: "Supprimer la formation", icon: Trash2, danger: true, onSelect: deleteCourse },
                  ]}
                />
              </>
            ) : null}
          </>
        }
      >
        <p className="text-xs text-muted-foreground">
          Contenu, fiche catalogue, relecture et publication :{" "}
          <Link href={`/studio/${course.id}`} className="text-accent-text hover:underline">
            Studio
          </Link>
          . Ici : accès, suivi des apprenants et réglages Qualiopi.
        </p>
      </PageHeader>

      <Tabs<Tab>
        value={tab}
        onChange={changeTab}
        className="mb-5"
        tabs={[
          { value: "acces", label: "Accès & vente", icon: ShoppingCart },
          { value: "informations", label: "Qualiopi & équipe", icon: Info },
          { value: "apprenants", label: "Apprenants", icon: Users, count: courseEnrollments.length },
        ]}
      />

      {tab === "informations" ? <InfoTab key={course.updatedAt} course={course} editable={editable} /> : null}
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
