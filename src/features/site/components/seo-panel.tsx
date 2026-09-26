"use client";

import { CheckCircle2, CircleAlert, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, FormField, Input, Textarea } from "@/components/ui";
import { cn, truncate } from "@/lib/utils";
import { SEO_DESC_MAX, SEO_TITLE_MAX } from "../lib/content";

function Counter({ value, max, min }: { value: number; max: number; min: number }) {
  const over = value > max;
  const short = value > 0 && value < min;
  return (
    <span className={cn("tabular text-[11px] font-medium", over ? "text-danger-text" : short ? "text-warning-text" : value ? "text-success-text" : "text-faint")} aria-live="polite">
      {value}/{max}
      <span className="sr-only">{over ? " — trop long" : short ? " — un peu court" : ""}</span>
    </span>
  );
}

/**
 * Panneau SEO : titre ≤ 60 caractères, description ≤ 155, aperçu type Google
 * et check-list (mêmes règles que l'audit Lighthouse/Search Console du site).
 */
export function SeoPanel({
  title,
  excerpt,
  seoTitle,
  seoDescription,
  slug,
  host,
  path,
  bodyWords,
  tags,
  disabled,
  onChange,
}: {
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  host: string;
  path?: string;
  bodyWords: number;
  tags: string[];
  disabled?: boolean;
  onChange: (patch: { seoTitle?: string; seoDescription?: string }) => void;
}) {
  const effTitle = (seoTitle || title).trim();
  const effDesc = (seoDescription || excerpt).trim();
  const crumbs = (path ?? `/${slug}`).split(/[/#]/).filter(Boolean);

  const checks = [
    { ok: effTitle.length > 0 && effTitle.length <= SEO_TITLE_MAX, label: `Titre SEO de 1 à ${SEO_TITLE_MAX} caractères` },
    { ok: effDesc.length >= 70 && effDesc.length <= SEO_DESC_MAX, label: `Description de 70 à ${SEO_DESC_MAX} caractères` },
    { ok: slug.length > 0 && slug.length <= 60 && /^[a-z0-9-]+$/.test(slug), label: "Slug court, en minuscules, sans accents" },
    { ok: excerpt.trim().length > 0, label: "Extrait renseigné (cartes du blog, partages)" },
    { ok: tags.length > 0, label: "Au moins un tag (maillage interne)" },
    { ok: bodyWords >= 300, label: "Corps d'au moins 300 mots" },
  ];
  const score = checks.filter((c) => c.ok).length;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Référencement (SEO)</CardTitle>
          <CardDescription>Vide = repli sur le titre et l'extrait.</CardDescription>
        </div>
        <span className="tabular rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted-foreground" aria-label={`${score} critères sur ${checks.length}`}>
          {score}/{checks.length}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Titre SEO" htmlFor="seo-title">
          <div className="space-y-1">
            <Input id="seo-title" value={seoTitle} disabled={disabled} placeholder={title} onChange={(e) => onChange({ seoTitle: e.target.value })} />
            <div className="flex justify-end">
              <Counter value={effTitle.length} max={SEO_TITLE_MAX} min={30} />
            </div>
          </div>
        </FormField>
        <FormField label="Méta-description" htmlFor="seo-desc">
          <div className="space-y-1">
            <Textarea id="seo-desc" value={seoDescription} disabled={disabled} placeholder={excerpt || "Résumé incitatif affiché dans Google…"} className="min-h-20" onChange={(e) => onChange({ seoDescription: e.target.value })} />
            <div className="flex justify-end">
              <Counter value={effDesc.length} max={SEO_DESC_MAX} min={70} />
            </div>
          </div>
        </FormField>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Aperçu dans Google</p>
          <div className="rounded-md border border-border bg-surface p-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2">
                <Globe className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-xs text-foreground">StartupWeek</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {host}
                  {crumbs.map((c) => ` › ${c}`).join("")}
                </p>
              </div>
            </div>
            <p className="mt-1.5 line-clamp-1 text-base text-info-text">{truncate(effTitle || "Titre de la page", SEO_TITLE_MAX + 1)}</p>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{effDesc ? truncate(effDesc, SEO_DESC_MAX + 1) : "Ajoutez une méta-description pour contrôler l'extrait affiché."}</p>
          </div>
        </div>

        <ul className="space-y-1.5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2 text-xs">
              {c.ok ? <CheckCircle2 className="mt-px size-3.5 shrink-0 text-success-text" aria-label="OK" /> : <CircleAlert className="mt-px size-3.5 shrink-0 text-warning-text" aria-label="À améliorer" />}
              <span className={c.ok ? "text-muted-foreground" : "text-foreground"}>{c.label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
