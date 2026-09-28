"use client";

import * as React from "react";
import { ExternalLink, Info, Plus, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, FormField, Input, Select, Switch, Textarea } from "@/components/ui";
import { useActions, useSettings } from "@/lib/hooks";
import { COURSE_LEVELS, PERSONAS, labelOf } from "@/lib/domain/constants";
import { formatDuration, orderedLessons, slugify, totalMinutes } from "@/lib/domain/academy";
import type { Course, Persona } from "@/lib/domain/types";
import { money } from "@/lib/format";
import { MarkdownPreview } from "@/features/site/components/markdown-preview";
import { DaScope } from "@/features/academy/components/da";
import { useCourseOutline } from "@/features/academy/lib/use-academy";
import { PlainEditable, RichEditable } from "./editable";

type Fields = Pick<Course, "title" | "slug" | "subtitle" | "description" | "level" | "personas" | "audience" | "objectives" | "prerequisites" | "durationHours" | "priceCents" | "vatRate" | "accessDays" | "stripePriceId" | "inCatalog">;
const pick = (c: Course): Fields => ({
  title: c.title,
  slug: c.slug,
  subtitle: c.subtitle,
  description: c.description,
  level: c.level,
  personas: c.personas,
  audience: c.audience,
  objectives: c.objectives,
  prerequisites: c.prerequisites,
  durationHours: c.durationHours,
  priceCents: c.priceCents,
  vatRate: c.vatRate,
  accessDays: c.accessDays,
  stripePriceId: c.stripePriceId,
  inCatalog: c.inCatalog,
});

/** Champs de la fiche catalogue, enregistrés automatiquement (0,8 s après la dernière frappe). */
function useCourseFields(course: Course, editable: boolean) {
  const { update } = useActions();
  const [fields, setFields] = React.useState<Fields>(() => pick(course));
  const [dirty, setDirty] = React.useState(false);
  const [base, setBase] = React.useState(course.updatedAt);
  if (course.updatedAt !== base && !dirty) {
    setBase(course.updatedAt);
    setFields(pick(course));
  }
  const latest = React.useRef(fields);
  React.useEffect(() => {
    latest.current = fields;
  }, [fields]);
  React.useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(() => {
      const f = latest.current;
      update("courses", course.id, { ...f, title: f.title.trim() || course.title, slug: slugify(f.slug || f.title) || course.slug, objectives: f.objectives.map((o) => o.trim()).filter(Boolean) }, { log: false });
      setDirty(false);
    }, 800);
    return () => window.clearTimeout(t);
  }, [dirty, fields, update, course.id, course.title, course.slug]);
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => {
    if (!editable) return;
    setFields((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };
  return { fields, set, dirty };
}

export function CatalogView({ course, editable }: { course: Course; editable: boolean }) {
  const { fields: f, set, dirty } = useCourseFields(course, editable);
  const { modules, lessons, byModule } = useCourseOutline(course.id);
  const settings = useSettings();
  const [price, setPrice] = React.useState(f.priceCents ? String(f.priceCents / 100) : "");
  const minutes = totalMinutes(lessons);
  const ordered = orderedLessons(course.id, modules, lessons);
  const sortedModules = [...modules].sort((a, b) => a.position - b.position);
  const canList = course.status === "publiee" && f.priceCents > 0;
  const site = (settings.website || "https://startupweek.tech").replace(/\/$/, "");
  const publicUrl = `${site}/academy/${slugify(f.slug || f.title)}`;
  const dis = !editable;
  const togglePersona = (p: Persona) => set("personas", f.personas.includes(p) ? f.personas.filter((x) => x !== p) : [...f.personas, p]);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[26rem_minmax(0,1fr)]">
      <div className="space-y-5 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:self-start xl:overflow-y-auto xl:pr-1">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Présentation</CardTitle>
              <CardDescription>Publiée sur le site avec la formation (information du public — indicateur 1). {dirty ? "Enregistrement…" : "Enregistré automatiquement."}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Titre" htmlFor="cat-title">
              <Input id="cat-title" value={f.title} onChange={(e) => set("title", e.target.value)} disabled={dis} />
            </FormField>
            <FormField label="Adresse de la page" htmlFor="cat-slug" hint={`/academy/${slugify(f.slug || f.title)}`}>
              <Input id="cat-slug" value={f.slug} onChange={(e) => set("slug", e.target.value)} disabled={dis} />
            </FormField>
            <FormField label="Accroche" htmlFor="cat-sub" hint="Une phrase : ce que l'apprenant saura faire.">
              <Textarea id="cat-sub" value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} className="min-h-16" disabled={dis} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Niveau" htmlFor="cat-level">
                <Select id="cat-level" value={f.level} onChange={(e) => set("level", e.target.value as Course["level"])} options={COURSE_LEVELS} disabled={dis} />
              </FormField>
              <FormField label="Durée annoncée (h)" htmlFor="cat-hours" hint={`Contenu : ${formatDuration(minutes)}`}>
                <Input id="cat-hours" type="number" min={1} value={f.durationHours} onChange={(e) => set("durationHours", Math.max(1, Number(e.target.value) || 1))} disabled={dis} />
              </FormField>
            </div>
            <FormField label="Profils visés" hint="Aucun coché = tous les profils.">
              <div className="flex flex-wrap gap-4">
                {PERSONAS.map((p) => (
                  <Checkbox key={p.value} label={p.label} checked={f.personas.includes(p.value)} onChange={() => togglePersona(p.value)} disabled={dis} />
                ))}
              </div>
            </FormField>
            <FormField label="Public visé" htmlFor="cat-aud">
              <Textarea id="cat-aud" value={f.audience} onChange={(e) => set("audience", e.target.value)} className="min-h-16" disabled={dis} />
            </FormField>
            <FormField label="Prérequis" htmlFor="cat-pre">
              <Textarea id="cat-pre" value={f.prerequisites} onChange={(e) => set("prerequisites", e.target.value)} className="min-h-16" disabled={dis} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Vente en ligne</CardTitle>
              <CardDescription>Paiement Stripe depuis la page : crée le contact, la facture et ouvre l&apos;accès automatiquement.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prix TTC (€)" htmlFor="cat-price" hint="Vide = non vendue seule.">
                <Input
                  id="cat-price"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    const cents = Math.round((Number(e.target.value.replace(",", ".").replace(/\s/g, "")) || 0) * 100);
                    set("priceCents", Math.max(0, cents));
                    if (!cents && f.inCatalog) set("inCatalog", false);
                  }}
                  disabled={dis}
                  className="tabular"
                />
              </FormField>
              <FormField label="TVA" htmlFor="cat-vat">
                <Select
                  id="cat-vat"
                  value={String(f.vatRate)}
                  onChange={(e) => set("vatRate", Number(e.target.value))}
                  options={[
                    { value: "20", label: "20 %" },
                    { value: "0", label: "Exonérée (formation)" },
                  ]}
                  disabled={dis}
                />
              </FormField>
            </div>
            <FormField label="Durée d'accès (jours)" htmlFor="cat-days" hint="6 mois = 183 jours">
              <Input id="cat-days" type="number" min={1} value={f.accessDays} onChange={(e) => set("accessDays", Math.max(1, Number(e.target.value) || 1))} disabled={dis} className="w-32" />
            </FormField>
            <FormField label="Identifiant de prix Stripe (facultatif)" htmlFor="cat-stripe" hint="price_… ; sinon le prix ci-dessus est utilisé.">
              <Input id="cat-stripe" value={f.stripePriceId ?? ""} onChange={(e) => set("stripePriceId", e.target.value.trim() || undefined)} placeholder="price_…" disabled={dis} className="font-mono text-xs" />
            </FormField>
            <label className="flex items-center justify-between gap-3 border-t border-border pt-4 text-sm">
              <span>
                Proposée à l&apos;achat sur le site
                {!canList ? <span className="block text-xs text-muted-foreground">Disponible une fois la formation publiée et un prix renseigné.</span> : null}
              </span>
              <Switch checked={f.inCatalog} onChange={(v) => set("inCatalog", v)} disabled={dis || (!canList && !f.inCatalog)} label="Au catalogue" />
            </label>
            {course.inCatalog ? (
              <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-accent-text hover:underline">
                Voir la page en ligne <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 space-y-3">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Aperçu de la page publique ({publicUrl.replace(/^https?:\/\//, "")}). Le texte de présentation et les objectifs s&apos;écrivent directement dans l&apos;aperçu.
        </p>
        <DaScope da="neon" className="overflow-hidden rounded-2xl border border-da-line">
          <div className="grid gap-6 bg-[radial-gradient(900px_300px_at_85%_-40%,var(--da-accent-soft),transparent_60%)] px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0">
              <p className="eyebrow text-da-accent">Formation en ligne · StartupWeek Academy</p>
              <h2 className="mt-2 text-balance font-da-title text-3xl font-bold tracking-tight">{f.title || "Titre de la formation"}</h2>
              <p className="mt-3 max-w-prose text-da-muted">{f.subtitle || "Accroche de la formation."}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                {[
                  `${f.durationHours} h de contenu`,
                  `Accès ${f.accessDays >= 365 ? `${Math.round(f.accessDays / 365)} an` : `${Math.round(f.accessDays / 30.5)} mois`}`,
                  `${modules.length} modules · ${ordered.length} leçons`,
                  labelOf(COURSE_LEVELS, f.level),
                  "100 % en ligne",
                  ...(course.isTraining ? ["Certificat de réalisation"] : []),
                ].map((t) => (
                  <span key={t} className="rounded-full border border-da-line px-3 py-1 text-da-ink">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="h-fit space-y-3 rounded-da border border-da-accent/30 bg-da-card p-4">
              <p className="font-da-title text-3xl font-bold">
                {f.priceCents ? money(f.priceCents) : "— €"} <span className="text-sm font-normal text-da-muted">TTC</span>
              </p>
              <span className="block rounded-lg bg-da-accent py-2.5 text-center text-sm font-semibold text-da-accent-ink">S&apos;inscrire maintenant</span>
              <ul className="space-y-1 text-sm text-da-muted">
                <li>✓ Contenus adaptés à votre profil</li>
                <li>✓ Accès immédiat après paiement</li>
                <li>✓ Suivi dans Mon espace</li>
              </ul>
              {!f.priceCents ? <p className="text-xs text-warning-text">Prix à renseigner (formulaire à gauche).</p> : null}
            </div>
          </div>
          <section className="border-t border-da-line px-5 py-6 sm:px-8">
            <h3 className="mb-3 font-da-title text-xl font-semibold">Présentation</h3>
            {editable ? (
              <RichEditable markdown={f.description} onChange={(v) => set("description", v)} placeholder="Présentez la formation : à qui elle s'adresse, ce qu'on y fait, ce qu'on en retire." label="Description de la formation" className="text-da-ink" />
            ) : (
              <MarkdownPreview source={f.description} />
            )}
          </section>
          <section className="border-t border-da-line px-5 py-6 sm:px-8">
            <h3 className="mb-3 font-da-title text-xl font-semibold">Objectifs</h3>
            <ul className="space-y-1.5 text-sm">
              {f.objectives.map((o, i) => (
                <li key={i} className="group/o flex items-start gap-2">
                  <span className="mt-0.5 text-da-accent" aria-hidden="true">
                    ✓
                  </span>
                  <PlainEditable value={o} onChange={(v) => set("objectives", f.objectives.map((x, k) => (k === i ? v : x)))} placeholder="Être capable de…" label={`Objectif ${i + 1}`} disabled={dis} className="block min-w-0 flex-1" onEnter={() => set("objectives", [...f.objectives, ""])} />
                  {editable ? (
                    <button type="button" onClick={() => set("objectives", f.objectives.filter((_, k) => k !== i))} className="invisible rounded p-0.5 text-da-muted hover:text-danger-text group-hover/o:visible" aria-label={`Supprimer l'objectif ${i + 1}`}>
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            {editable ? (
              <button type="button" onClick={() => set("objectives", [...f.objectives, ""])} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-da-accent hover:underline">
                <Plus className="size-3.5" /> Objectif
              </button>
            ) : null}
          </section>
          <section className="border-t border-da-line px-5 py-6 sm:px-8">
            <h3 className="mb-3 font-da-title text-xl font-semibold">Programme</h3>
            <div className="space-y-2">
              {sortedModules.map((m, i) => {
                const list = byModule.get(m.id) ?? [];
                return (
                  <details key={m.id} className="rounded-lg border border-da-line px-4 py-2.5" open={i === 0}>
                    <summary className="flex cursor-pointer items-baseline gap-3 text-sm font-medium">
                      <span className="font-mono text-xs text-da-accent">{String(i).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1">{m.title}</span>
                      <span className="shrink-0 text-xs text-da-muted">{formatDuration(totalMinutes(list))}</span>
                    </summary>
                    <ul className="mt-2 space-y-1 pl-8 text-sm text-da-muted">
                      {list.map((l) => (
                        <li key={l.id} className="flex gap-2">
                          <span className="min-w-0 flex-1">{l.title}</span>
                          {l.isPreview ? <span className="text-xs text-da-accent">Aperçu gratuit</span> : null}
                          <span className="tabular text-xs">{l.estimatedMinutes}′</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
            </div>
          </section>
          <section className="border-t border-da-line px-5 py-6 text-sm text-da-muted sm:px-8">
            <h3 className="mb-2 font-da-title text-xl font-semibold text-da-ink">Prérequis et modalités</h3>
            <p>{f.prerequisites || "Prérequis à renseigner."}</p>
            <p className="mt-2">{course.accessibility}</p>
            <p className="mt-2">{course.assistance}</p>
          </section>
        </DaScope>
      </div>
    </div>
  );
}
