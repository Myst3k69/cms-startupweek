"use client";

import * as React from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FormField, Input, Select, Textarea } from "@/components/ui";
import { BLOG_CATEGORIES, FAQ_CATEGORIES } from "@/lib/domain/constants";
import type { BlogAuthor, BlogCta, ContentMeta, User } from "@/lib/domain/types";
import { headingsOf } from "../lib/markdown";

/** Champs de publication propres au site (blog et FAQ), édités dans le brouillon du contenu. */
export interface SiteDraft {
  category: string;
  sortOrder: string;
  coverUrl: string;
  meta: ContentMeta;
}

export type SiteKind = "blog" | "faq" | null;

export function siteKind(type: string, channel: string): SiteKind {
  if (type === "article" && channel === "blog") return "blog";
  if (type === "faq") return "faq";
  return null;
}

const EMPTY_AUTHOR: BlogAuthor = { name: "", role: "", image: "", bio: "" };
const EMPTY_CTA: BlogCta = { title: "", description: "", primaryLabel: "", primaryHref: "" };

/** Nettoie les métadonnées avant enregistrement (chaînes vides retirées). */
export function cleanMeta(meta: ContentMeta): ContentMeta {
  const out: ContentMeta = {};
  const t = (v?: string) => (v ?? "").trim();
  if (t(meta.readTime)) out.readTime = t(meta.readTime);
  if (t(meta.mobileImage)) out.mobileImage = t(meta.mobileImage);
  if (meta.author && (t(meta.author.name) || t(meta.author.role) || t(meta.author.image) || t(meta.author.bio))) {
    out.author = { name: t(meta.author.name), role: t(meta.author.role), image: t(meta.author.image), bio: t(meta.author.bio) };
  }
  const points = (meta.keyPoints ?? []).map((p) => p.trim()).filter(Boolean);
  if (points.length) out.keyPoints = points;
  const faq = (meta.faq ?? []).map((q) => ({ question: q.question.trim(), answer: q.answer.trim() })).filter((q) => q.question && q.answer);
  if (faq.length) out.faq = faq;
  if (meta.cta && t(meta.cta.title) && t(meta.cta.primaryLabel) && t(meta.cta.primaryHref)) {
    out.cta = {
      title: t(meta.cta.title),
      description: t(meta.cta.description),
      primaryLabel: t(meta.cta.primaryLabel),
      primaryHref: t(meta.cta.primaryHref),
      ...(t(meta.cta.secondaryLabel) && t(meta.cta.secondaryHref) ? { secondaryLabel: t(meta.cta.secondaryLabel), secondaryHref: t(meta.cta.secondaryHref) } : {}),
    };
  }
  const related = (meta.relatedPosts ?? []).map((s) => s.trim()).filter(Boolean);
  if (related.length) out.relatedPosts = related;
  if (meta.toc?.length) out.toc = meta.toc;
  return out;
}

export function SitePublicationPanel({
  kind,
  value,
  body,
  words,
  users,
  blogSlugs,
  disabled,
  error,
  onChange,
}: {
  kind: Exclude<SiteKind, null>;
  value: SiteDraft;
  body: string;
  words: number;
  users: User[];
  /** Slugs des autres articles du blog (articles liés). */
  blogSlugs: string[];
  disabled: boolean;
  error?: string;
  onChange: (next: SiteDraft) => void;
}) {
  const meta = value.meta;
  const setMeta = (patch: Partial<ContentMeta>) => onChange({ ...value, meta: { ...meta, ...patch } });

  if (kind === "faq") {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Page FAQ du site</CardTitle>
            <CardDescription>Question = titre · réponse = corps. En ligne sur /faq dès la publication.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Catégorie" htmlFor="site-faq-cat" error={error}>
            <Select id="site-faq-cat" value={value.category} disabled={disabled} placeholder="Choisir…" options={FAQ_CATEGORIES} onChange={(e) => onChange({ ...value, category: e.target.value })} />
          </FormField>
          <FormField label="Ordre dans la catégorie" htmlFor="site-faq-order" hint="Les plus petits en premier.">
            <Input id="site-faq-order" type="number" inputMode="numeric" value={value.sortOrder} disabled={disabled} onChange={(e) => onChange({ ...value, sortOrder: e.target.value })} />
          </FormField>
        </CardContent>
      </Card>
    );
  }

  const author = meta.author ?? EMPTY_AUTHOR;
  const cta = meta.cta ?? EMPTY_CTA;
  const faq = meta.faq ?? [];
  const related = meta.relatedPosts ?? [];
  const headings = headingsOf(body);
  const autoRead = `${Math.max(1, Math.round(words / 220))} min`;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Article du blog</CardTitle>
          <CardDescription>Affiché sur startupweek.tech/blog dès la publication (mise à jour sous 60 s).</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 xl:grid-cols-2">
          <FormField label="Rubrique" htmlFor="site-blog-cat">
            <>
              <Input id="site-blog-cat" list="site-blog-cats" value={value.category} disabled={disabled} onChange={(e) => onChange({ ...value, category: e.target.value })} placeholder="Méthodologie" />
              <datalist id="site-blog-cats">
                {BLOG_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </>
          </FormField>
          <FormField label="Temps de lecture" htmlFor="site-blog-read">
            <div className="flex gap-1.5">
              <Input id="site-blog-read" value={meta.readTime ?? ""} disabled={disabled} onChange={(e) => setMeta({ readTime: e.target.value })} placeholder={autoRead} />
              {!disabled ? (
                <Button variant="secondary" size="icon" title={`Estimer (${autoRead})`} aria-label="Estimer le temps de lecture" onClick={() => setMeta({ readTime: autoRead })}>
                  <Wand2 />
                </Button>
              ) : null}
            </div>
          </FormField>
        </div>
        <FormField label="Image de couverture" htmlFor="site-blog-cover" hint="Chemin du site (/blog/…webp) ou URL https.">
          <Input id="site-blog-cover" value={value.coverUrl} disabled={disabled} onChange={(e) => onChange({ ...value, coverUrl: e.target.value })} placeholder="/blog/mon-article.webp" />
        </FormField>
        <FormField label="Image mobile (facultatif)" htmlFor="site-blog-mobile">
          <Input id="site-blog-mobile" value={meta.mobileImage ?? ""} disabled={disabled} onChange={(e) => setMeta({ mobileImage: e.target.value })} />
        </FormField>

        <fieldset className="space-y-2 rounded-md border border-border p-3">
          <legend className="px-1 text-xs font-medium text-muted-foreground">Auteur affiché</legend>
          {!disabled && users.length ? (
            <Select
              aria-label="Reprendre un membre de l'équipe"
              value=""
              placeholder="Reprendre un membre de l'équipe…"
              options={users.map((u) => ({ value: u.id, label: u.name }))}
              onChange={(e) => {
                const u = users.find((x) => x.id === e.target.value);
                if (u) setMeta({ author: { ...author, name: u.name, role: u.title || author.role } });
              }}
            />
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Input aria-label="Nom de l'auteur" value={author.name} disabled={disabled} onChange={(e) => setMeta({ author: { ...author, name: e.target.value } })} placeholder="Nom" />
            <Input aria-label="Fonction de l'auteur" value={author.role} disabled={disabled} onChange={(e) => setMeta({ author: { ...author, role: e.target.value } })} placeholder="Fonction" />
          </div>
          <Input aria-label="Photo de l'auteur" value={author.image} disabled={disabled} onChange={(e) => setMeta({ author: { ...author, image: e.target.value } })} placeholder="/aurelien-chiren.webp" />
          <Textarea aria-label="Biographie de l'auteur" value={author.bio} disabled={disabled} className="min-h-16" onChange={(e) => setMeta({ author: { ...author, bio: e.target.value } })} placeholder="Courte biographie (bas d'article)" />
        </fieldset>

        <FormField label="Points clés" htmlFor="site-blog-points" hint="Un par ligne — encadré en tête d'article.">
          <Textarea
            id="site-blog-points"
            value={(meta.keyPoints ?? []).join("\n")}
            disabled={disabled}
            className="min-h-24"
            onChange={(e) => setMeta({ keyPoints: e.target.value.split("\n") })}
          />
        </FormField>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">FAQ de l&apos;article</span>
            {!disabled ? (
              <Button variant="ghost" size="xs" onClick={() => setMeta({ faq: [...faq, { question: "", answer: "" }] })}>
                <Plus /> Question
              </Button>
            ) : null}
          </div>
          {faq.length === 0 ? <p className="text-xs text-muted-foreground">Aucune question (affichée en fin d&apos;article, balisage FAQPage pour Google).</p> : null}
          {faq.map((q, i) => (
            <div key={i} className="space-y-1.5 rounded-md border border-border p-2">
              <div className="flex gap-1.5">
                <Input
                  aria-label={`Question ${i + 1}`}
                  value={q.question}
                  disabled={disabled}
                  onChange={(e) => setMeta({ faq: faq.map((x, k) => (k === i ? { ...x, question: e.target.value } : x)) })}
                  placeholder="Question"
                />
                {!disabled ? (
                  <Button variant="ghost" size="icon" aria-label={`Supprimer la question ${i + 1}`} onClick={() => setMeta({ faq: faq.filter((_, k) => k !== i) })}>
                    <Trash2 />
                  </Button>
                ) : null}
              </div>
              <Textarea
                aria-label={`Réponse ${i + 1}`}
                value={q.answer}
                disabled={disabled}
                className="min-h-16"
                onChange={(e) => setMeta({ faq: faq.map((x, k) => (k === i ? { ...x, answer: e.target.value } : x)) })}
                placeholder="Réponse"
              />
            </div>
          ))}
        </div>

        <FormField label="Articles liés" htmlFor="site-blog-related" hint="Slugs séparés par des virgules (3 conseillés).">
          <div className="space-y-1.5">
            <Input
              id="site-blog-related"
              list="site-blog-slugs"
              value={related.join(", ")}
              disabled={disabled}
              onChange={(e) => setMeta({ relatedPosts: e.target.value.split(",").map((s) => s.trim()) })}
            />
            <datalist id="site-blog-slugs">
              {blogSlugs.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {related.filter(Boolean).length ? (
              <div className="flex flex-wrap gap-1">
                {related.filter(Boolean).map((s) => (
                  <Badge key={s} tone={blogSlugs.includes(s) ? "neutral" : "warning"}>
                    {s}
                    {blogSlugs.includes(s) ? "" : " · inconnu"}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </FormField>

        <details className="rounded-md border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">Appel à l&apos;action de fin d&apos;article</summary>
          <p className="mt-1 text-xs text-muted-foreground">Vide : appel à l&apos;action par défaut du site (candidature).</p>
          <div className="mt-2 space-y-2">
            <Input aria-label="Titre de l'appel à l'action" value={cta.title} disabled={disabled} onChange={(e) => setMeta({ cta: { ...cta, title: e.target.value } })} placeholder="Titre" />
            <Textarea aria-label="Texte de l'appel à l'action" value={cta.description} disabled={disabled} className="min-h-14" onChange={(e) => setMeta({ cta: { ...cta, description: e.target.value } })} placeholder="Texte" />
            <div className="grid grid-cols-2 gap-2">
              <Input aria-label="Libellé du bouton principal" value={cta.primaryLabel} disabled={disabled} onChange={(e) => setMeta({ cta: { ...cta, primaryLabel: e.target.value } })} placeholder="Bouton principal" />
              <Input aria-label="Lien du bouton principal" value={cta.primaryHref} disabled={disabled} onChange={(e) => setMeta({ cta: { ...cta, primaryHref: e.target.value } })} placeholder="/candidature" />
              <Input aria-label="Libellé du bouton secondaire" value={cta.secondaryLabel ?? ""} disabled={disabled} onChange={(e) => setMeta({ cta: { ...cta, secondaryLabel: e.target.value } })} placeholder="Bouton secondaire" />
              <Input aria-label="Lien du bouton secondaire" value={cta.secondaryHref ?? ""} disabled={disabled} onChange={(e) => setMeta({ cta: { ...cta, secondaryHref: e.target.value } })} placeholder="/programmes" />
            </div>
          </div>
        </details>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Sommaire</span>
            {!disabled && meta.toc?.length ? (
              <Button variant="ghost" size="xs" onClick={() => setMeta({ toc: undefined })} title="Utiliser les titres ## du corps">
                Recalculer depuis les titres
              </Button>
            ) : null}
          </div>
          <ol className="list-decimal space-y-0.5 pl-5 text-xs text-muted-foreground">
            {(meta.toc?.length ? meta.toc.map((t) => t.title) : headings).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
          {!(meta.toc?.length || headings.length) ? <p className="text-xs text-muted-foreground">Ajoutez des titres « ## » dans le corps.</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
