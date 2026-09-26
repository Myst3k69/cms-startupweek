"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  CalendarClock,
  Copy,
  ExternalLink,
  FileSearch,
  MoreHorizontal,
  RotateCcw,
  Save,
  Send,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  FormField,
  Input,
  Menu,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  useToast,
} from "@/components/ui";
import { ActivityTimeline } from "@/components/shared/timeline";
import { SessionLink } from "@/components/shared/entity-links";
import { useActions, useCollection, useEntity, useNow, useSession, useSettings } from "@/lib/hooks";
import { CHANNELS, CONTENT_STATUSES, CONTENT_TYPES, labelOf } from "@/lib/domain/constants";
import type { Channel, ContentItem, ContentMeta, ContentType } from "@/lib/domain/types";
import { dateTime, number, percent, relative } from "@/lib/format";
import { slugify } from "@/lib/utils";
import { CHANNEL_COLOR, fromLocalInput, publicPath, siteHost, splitTags, toLocalInput } from "../lib/content";
import { plainText, wordCount } from "../lib/markdown";
import { MarkdownEditor } from "./markdown-editor";
import { SeoPanel } from "./seo-panel";
import { cleanMeta, SitePublicationPanel, siteKind } from "./site-publication-panel";

interface Draft {
  title: string;
  slug: string;
  type: ContentType;
  channel: Channel;
  authorId: string;
  excerpt: string;
  body: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  eventId: string;
  scheduledAt: string; // datetime-local
  /** Publication sur le site (blog / FAQ) */
  category: string;
  sortOrder: string;
  coverUrl: string;
  meta: ContentMeta;
}

function toDraft(c: ContentItem): Draft {
  return {
    title: c.title,
    slug: c.slug,
    type: c.type,
    channel: c.channel,
    authorId: c.authorId ?? "",
    excerpt: c.excerpt,
    body: c.body,
    tags: c.tags.join(", "),
    seoTitle: c.seoTitle ?? "",
    seoDescription: c.seoDescription ?? "",
    eventId: c.eventId ?? "",
    scheduledAt: toLocalInput(c.scheduledAt),
    category: c.category ?? "",
    sortOrder: String(c.sortOrder ?? 0),
    coverUrl: c.coverUrl ?? "",
    meta: c.meta ?? {},
  };
}

function fromDraft(d: Draft): Partial<ContentItem> {
  return {
    title: d.title.trim(),
    slug: d.slug.trim(),
    type: d.type,
    channel: d.channel,
    authorId: d.authorId || undefined,
    excerpt: d.excerpt.trim(),
    body: d.body,
    tags: splitTags(d.tags),
    seoTitle: d.seoTitle.trim() || undefined,
    seoDescription: d.seoDescription.trim() || undefined,
    eventId: d.eventId || undefined,
    scheduledAt: fromLocalInput(d.scheduledAt),
    category: d.category.trim(),
    sortOrder: Number.parseInt(d.sortOrder, 10) || 0,
    coverUrl: d.coverUrl.trim() || undefined,
    meta: cleanMeta(d.meta),
  };
}

export function ContentEditor({ id }: { id: string }) {
  const item = useEntity("contents", id);
  if (!item) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Contenu introuvable"
        description="Il a peut-être été supprimé, ou le lien est erroné."
        action={
          <Link href="/contenus" className="text-sm font-medium text-accent-text hover:underline">
            Retour aux contenus
          </Link>
        }
        className="mt-10"
      />
    );
  }
  return <EditorInner key={item.id} item={item} />;
}

function EditorInner({ item }: { item: ContentItem }) {
  const router = useRouter();
  const toast = useToast();
  const now = useNow();
  const settings = useSettings();
  const { create, update, remove } = useActions();
  const { canEdit } = useSession();
  const editable = canEdit("contenus");
  const contents = useCollection("contents");
  const users = useCollection("users");
  const events = useCollection("events");

  const [draft, setDraft] = React.useState<Draft>(() => toDraft(item));
  const [slugManual, setSlugManual] = React.useState(() => item.slug !== slugify(item.title));
  const [errors, setErrors] = React.useState<Partial<Record<keyof Draft, string>>>({});
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [confirmSite, setConfirmSite] = React.useState<{ title: string; message: string; action: string; run: () => void } | null>(null);

  const saved = React.useMemo(() => toDraft(item), [item]);
  const dirty = React.useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);

  React.useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onTitle = (v: string) => {
    setDraft((d) => ({ ...d, title: v, slug: slugManual ? d.slug : slugify(v) }));
    setErrors((e) => ({ ...e, title: undefined, slug: undefined }));
  };

  const words = React.useMemo(() => wordCount(draft.body), [draft.body]);
  const tags = React.useMemo(() => splitTags(draft.tags), [draft.tags]);
  const path = publicPath({ type: draft.type, channel: draft.channel, slug: draft.slug });
  const host = siteHost(settings.website);
  const eventOptions = React.useMemo(
    () => [...events].sort((a, b) => b.startAt.localeCompare(a.startAt)).map((e) => ({ value: e.id, label: `${e.code} · ${e.name}` })),
    [events],
  );

  const kind = siteKind(draft.type, draft.channel);
  /** Page du site où le contenu enregistré est en ligne (blog / FAQ), sinon null. */
  const onSite = item.status === "publie" ? siteKind(item.type, item.channel) : null;
  /** Ce que l'enregistrement du brouillon retirerait du site (null = rien). */
  const siteLoss = !onSite
    ? null
    : kind !== onSite
      ? `« ${item.title} » ne sera plus affiché sur le site (${onSite === "blog" ? `/blog/${item.slug}` : "/faq"}).`
      : onSite === "blog" && draft.slug.trim() !== item.slug
        ? `L'adresse /blog/${item.slug} ne fonctionnera plus : l'article passera sur /blog/${draft.slug.trim()}.`
        : null;
  const blogSlugs = React.useMemo(
    () => contents.filter((c) => c.id !== item.id && c.type === "article" && c.channel === "blog" && c.slug).map((c) => c.slug).sort(),
    [contents, item.id],
  );

  const validate = (publishing = false): boolean => {
    const next: Partial<Record<keyof Draft, string>> = {};
    if (publishing && kind === "faq" && !draft.category) next.category = "Choisissez la catégorie de la FAQ où afficher la question.";
    if (draft.title.trim().length < 3) next.title = "Titre requis (3 caractères minimum).";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug.trim())) next.slug = "Slug invalide : minuscules, chiffres et tirets uniquement.";
    else if (contents.some((c) => c.id !== item.id && c.slug === draft.slug.trim())) next.slug = "Ce slug est déjà utilisé par un autre contenu.";
    if (draft.scheduledAt && !fromLocalInput(draft.scheduledAt)) next.scheduledAt = "Date invalide.";
    setErrors(next);
    if (Object.keys(next).length) toast({ title: "Vérifiez le formulaire", description: Object.values(next)[0], tone: "danger" });
    return Object.keys(next).length === 0;
  };

  /** Enregistre le brouillon (+ éventuel changement de statut) en une seule mutation journalisée. */
  const persist = (extra: Partial<ContentItem> = {}, log = "Contenu enregistré", logKind: "modification" | "statut" = "modification") => {
    // « Planifié » vaut publication : le planificateur (pg_cron) le mettra en ligne tel quel.
    const target = extra.status ?? item.status;
    if (!editable || !validate(target === "publie" || target === "planifie")) return false;
    update("contents", item.id, { ...fromDraft(draft), ...extra }, { log, kind: logKind });
    setDraft((d) => ({ ...d, meta: cleanMeta(d.meta) }));
    return true;
  };

  const save = () => {
    if (!dirty) return;
    const run = () => {
      if (persist()) toast({ title: "Modifications enregistrées" });
    };
    if (siteLoss) setConfirmSite({ title: kind === onSite ? "Changer l'adresse de l'article ?" : "Retirer ce contenu du site ?", message: siteLoss, action: "Enregistrer", run });
    else run();
  };

  const toReview = () => {
    if (persist({ status: "relecture" }, `Statut : ${labelOf(CONTENT_STATUSES, item.status)} → Relecture`, "statut")) toast({ title: "Envoyé en relecture" });
  };

  const schedule = () => {
    const iso = fromLocalInput(draft.scheduledAt);
    if (!iso) {
      setErrors((e) => ({ ...e, scheduledAt: "Choisissez une date et une heure de publication." }));
      toast({ title: "Date de publication manquante", description: "Renseignez « Programmation » dans le panneau Publication.", tone: "danger" });
      return;
    }
    if (new Date(iso).getTime() <= Date.now()) {
      setErrors((e) => ({ ...e, scheduledAt: "La date doit être dans le futur (sinon : Publier)." }));
      toast({ title: "Date passée", description: "Choisissez une date future ou publiez maintenant.", tone: "danger" });
      return;
    }
    if (persist({ status: "planifie", scheduledAt: iso }, `Planifié pour le ${dateTime(iso)}`, "statut")) {
      toast(
        kind
          ? { title: "Publication programmée", description: `Mise en ligne automatique le ${dateTime(iso)}.` }
          : { title: "Rappel programmé", description: `Le ${dateTime(iso)}, une tâche « Publier sur ${labelOf(CHANNELS, draft.channel)} » sera créée : le CRM ne publie pas ce contenu lui-même.` },
      );
    }
  };

  const publish = () => {
    const at = new Date().toISOString();
    if (persist({ status: "publie", publishedAt: at }, `Publié sur ${labelOf(CHANNELS, draft.channel)}`, "statut")) {
      toast({ title: "Contenu publié", description: kind && path ? `En ligne sur ${host}${path} (revalidation du site sous 60 s).` : `Marqué publié sur ${labelOf(CHANNELS, draft.channel)}.` });
    }
  };

  const backToDraft = () => {
    const run = () => {
      if (persist({ status: "redaction" }, `Statut : ${labelOf(CONTENT_STATUSES, item.status)} → Rédaction`, "statut")) toast({ title: "Repassé en rédaction", tone: "info" });
    };
    if (onSite) setConfirmSite({ title: "Retirer ce contenu du site ?", message: `Repasser en rédaction retire « ${item.title} » du site.`, action: "Repasser en rédaction", run });
    else run();
  };

  const archive = () => {
    if (persist({ status: "archive" }, "Contenu archivé (retiré du site)", "statut")) toast({ title: "Contenu archivé", tone: "info" });
  };

  const duplicate = () => {
    const base = `${item.slug}-copie`;
    let slug = base;
    for (let n = 2; contents.some((c) => c.slug === slug); n++) slug = `${base}-${n}`;
    const copy = create(
      "contents",
      { ...item, ...fromDraft(draft), title: `${draft.title.trim()} (copie)`, slug, status: "idee", scheduledAt: undefined, publishedAt: undefined, metrics: { views: 0, clicks: 0, leads: 0 }, id: undefined },
      { log: `Dupliqué depuis « ${item.title} »` },
    );
    toast({ title: "Contenu dupliqué" });
    router.push(`/contenus/${copy.id}`);
  };

  const destroy = () => {
    remove("contents", item.id, { log: `Contenu supprimé : « ${item.title} »` });
    toast({ title: "Contenu supprimé", tone: "info" });
    router.push("/contenus");
  };

  const autoExcerpt = () => {
    const txt = plainText(draft.body);
    if (!txt) return;
    const cut = txt.length > 200 ? `${txt.slice(0, 197).replace(/\s+\S*$/, "")}…` : txt;
    set("excerpt", cut);
  };

  const m = item.metrics;
  const ctr = m.views ? (m.clicks / m.views) * 100 : 0;
  const conv = m.clicks ? (m.leads / m.clicks) * 100 : 0;
  const rank = React.useMemo(() => {
    const sorted = contents.filter((c) => c.status === "publie").sort((a, b) => b.metrics.leads - a.metrics.leads);
    const i = sorted.findIndex((c) => c.id === item.id);
    return i >= 0 ? { pos: i + 1, of: sorted.length } : null;
  }, [contents, item.id]);

  const canReview = item.status === "idee" || item.status === "redaction";
  const isPublished = item.status === "publie";

  return (
    <div
      className="page-enter"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          save();
        }
      }}
    >
      <PageHeader
        breadcrumbs={[{ label: "Contenus", href: "/contenus" }, { label: draft.title || "Sans titre" }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 break-words">{draft.title || "Sans titre"}</span>
            <StatusBadge options={CONTENT_STATUSES} value={item.status} />
            {dirty ? <Badge tone="warning">Non enregistré</Badge> : null}
          </span>
        }
        description={
          <>
            {labelOf(CONTENT_TYPES, item.type)} · {labelOf(CHANNELS, item.channel)} · modifié {relative(item.updatedAt, now)}
            {isPublished && item.publishedAt ? ` · publié le ${dateTime(item.publishedAt)}` : ""}
            {item.status === "planifie" && item.scheduledAt
              ? new Date(item.scheduledAt).getTime() > now
                ? ` · programmé le ${dateTime(item.scheduledAt)}`
                : siteKind(item.type, item.channel)
                  ? " · mise en ligne en cours (rechargez la page d'ici une minute)"
                  : " · heure passée : à publier puis marquer « Publié » (tâche de rappel créée)"
              : ""}
          </>
        }
        actions={
          <>
            {isPublished && path ? (
              <a
                href={`${settings.website.replace(/\/+$/, "")}${path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-foreground shadow-sm hover:bg-surface-2"
              >
                <ExternalLink className="size-4" /> Voir en ligne
              </a>
            ) : null}
            {editable ? (
              <>
                <Button variant="secondary" size="sm" onClick={save} disabled={!dirty} title="Enregistrer (Ctrl/⌘ + S)">
                  <Save /> Enregistrer
                </Button>
                {canReview ? (
                  <Button variant="secondary" size="sm" onClick={toReview}>
                    <FileSearch /> Passer en relecture
                  </Button>
                ) : null}
                {!isPublished ? (
                  <Button variant="secondary" size="sm" onClick={schedule}>
                    <CalendarClock /> Planifier
                  </Button>
                ) : null}
                {!isPublished ? (
                  <Button size="sm" onClick={publish}>
                    <Send /> Publier
                  </Button>
                ) : null}
                <Menu
                  trigger={(p) => (
                    <Button variant="ghost" size="icon-sm" aria-label="Plus d'actions" {...p}>
                      <MoreHorizontal />
                    </Button>
                  )}
                  items={[
                    ...(item.status !== "redaction" ? [{ label: "Repasser en rédaction", icon: RotateCcw, onSelect: backToDraft }] : []),
                    { label: "Dupliquer", icon: Copy, onSelect: duplicate },
                    ...(item.status !== "archive" ? [{ label: "Archiver", icon: Archive, onSelect: archive }] : []),
                    "separator" as const,
                    { label: "Supprimer", icon: Trash2, onSelect: () => setConfirmDelete(true), danger: true },
                  ]}
                />
              </>
            ) : null}
          </>
        }
      />

      {!editable ? (
        <p className="mb-4 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-muted-foreground">Lecture seule : votre rôle ne permet pas de modifier les contenus.</p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-5">
              <FormField label="Titre" htmlFor="ct-title" error={errors.title}>
                <Input id="ct-title" value={draft.title} disabled={!editable} onChange={(e) => onTitle(e.target.value)} className="h-10 text-base font-medium" />
              </FormField>
              <FormField label="Slug (URL)" htmlFor="ct-slug" error={errors.slug} hint={path ? `${host}${path}` : "Contenu diffusé hors site (réseau social / newsletter)."}>
                <div className="flex gap-2">
                  <Input
                    id="ct-slug"
                    value={draft.slug}
                    disabled={!editable}
                    className="font-mono text-xs"
                    onChange={(e) => {
                      setSlugManual(true);
                      set("slug", slugify(e.target.value) || e.target.value.toLowerCase());
                    }}
                  />
                  {editable ? (
                    <Button
                      variant="secondary"
                      size="icon"
                      title="Régénérer depuis le titre"
                      aria-label="Régénérer le slug depuis le titre"
                      onClick={() => {
                        setSlugManual(false);
                        set("slug", slugify(draft.title));
                      }}
                    >
                      <Wand2 />
                    </Button>
                  ) : null}
                </div>
              </FormField>
              <FormField label="Extrait" htmlFor="ct-excerpt" hint={`${draft.excerpt.length} caractères — affiché sur les cartes du blog et les partages.`}>
                <div className="space-y-1.5">
                  <Textarea id="ct-excerpt" value={draft.excerpt} disabled={!editable} className="min-h-20" onChange={(e) => set("excerpt", e.target.value)} placeholder="En 1 à 2 phrases, pourquoi lire ce contenu ?" />
                  {editable && !draft.excerpt && draft.body ? (
                    <Button variant="link" size="xs" onClick={autoExcerpt}>
                      Générer depuis le corps
                    </Button>
                  ) : null}
                </div>
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Corps (Markdown)</CardTitle>
                <CardDescription>
                  {number(words)} mot{words > 1 ? "s" : ""} · lecture ≈ {Math.max(1, Math.round(words / 220))} min
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <MarkdownEditor id="ct-body" value={draft.body} disabled={!editable} onChange={(v) => set("body", v)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline entity="contents" id={item.id} limit={20} />
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 xl:grid-cols-2">
                <FormField label="Type" htmlFor="ct-type">
                  <Select id="ct-type" value={draft.type} disabled={!editable} options={CONTENT_TYPES} onChange={(e) => set("type", e.target.value as ContentType)} />
                </FormField>
                <FormField label="Canal" htmlFor="ct-channel">
                  <div className="relative">
                    <Select id="ct-channel" value={draft.channel} disabled={!editable} options={CHANNELS} onChange={(e) => set("channel", e.target.value as Channel)} className="[&_select]:pl-7" />
                    <span className="pointer-events-none absolute left-2.5 top-1/2 size-2 -translate-y-1/2 rounded-full" style={{ background: CHANNEL_COLOR[draft.channel] }} aria-hidden="true" />
                  </div>
                </FormField>
              </div>
              <FormField label="Auteur" htmlFor="ct-author">
                <Select id="ct-author" value={draft.authorId} disabled={!editable} placeholder="Non attribué" options={users.map((u) => ({ value: u.id, label: u.name }))} onChange={(e) => set("authorId", e.target.value)} />
              </FormField>
              <FormField
                label="Programmation"
                htmlFor="ct-when"
                error={errors.scheduledAt}
                hint={
                  kind
                    ? "Mise en ligne automatique à cette heure (fuseau local), à la minute près, via « Planifier »."
                    : "À cette heure, une tâche de rappel est créée pour l'auteur : le CRM ne publie pas ce contenu lui-même."
                }
              >
                <Input id="ct-when" type="datetime-local" value={draft.scheduledAt} disabled={!editable} onChange={(e) => set("scheduledAt", e.target.value)} />
              </FormField>
              <FormField label="Session liée" htmlFor="ct-event" hint="Affiche le contenu sur la page de la session et trace les leads générés.">
                <div className="space-y-1.5">
                  <Select id="ct-event" value={draft.eventId} disabled={!editable} placeholder="Aucune" options={eventOptions} onChange={(e) => set("eventId", e.target.value)} />
                  {draft.eventId ? <SessionLink id={draft.eventId} className="text-xs" /> : null}
                </div>
              </FormField>
              <FormField label="Tags" htmlFor="ct-tags" hint="Séparés par des virgules.">
                <div className="space-y-2">
                  <Input id="ct-tags" value={draft.tags} disabled={!editable} onChange={(e) => set("tags", e.target.value)} placeholder="no-code, MVP, financement" />
                  {tags.length ? (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((t) => (
                        <Badge key={t}>#{t}</Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </FormField>
              <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
                {kind === "blog"
                  ? "Publication automatique : un article de blog « Publié » est en ligne sur startupweek.tech/blog sous 60 s ; le repasser en rédaction ou l'archiver le retire."
                  : kind === "faq"
                    ? "Publication automatique : une question « Publiée » apparaît sur startupweek.tech/faq sous 60 s."
                    : "Seuls les articles (canal Blog) et les questions de FAQ sont publiés automatiquement sur le site. Les autres contenus servent au planning éditorial : planifiés, ils créent une tâche de rappel à l'heure prévue."}
              </p>
            </CardContent>
          </Card>

          {kind ? (
            <SitePublicationPanel
              kind={kind}
              value={{ category: draft.category, sortOrder: draft.sortOrder, coverUrl: draft.coverUrl, meta: draft.meta }}
              body={draft.body}
              words={words}
              users={users}
              blogSlugs={blogSlugs}
              disabled={!editable}
              error={errors.category}
              onChange={(p) => {
                setDraft((d) => ({ ...d, ...p }));
                setErrors((e) => ({ ...e, category: undefined }));
              }}
            />
          ) : null}

          <SeoPanel
            title={draft.title}
            excerpt={draft.excerpt}
            seoTitle={draft.seoTitle}
            seoDescription={draft.seoDescription}
            slug={draft.slug}
            host={host}
            path={path}
            bodyWords={words}
            tags={tags}
            disabled={!editable}
            onChange={(p) => setDraft((d) => ({ ...d, ...p }))}
          />

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Statistiques</CardTitle>
                <CardDescription>{isPublished ? "Cumul depuis la publication (Vercel Analytics + UTM des formulaires)." : "Disponibles après publication."}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Vues", value: number(m.views) },
                  { label: "Clics", value: number(m.clicks) },
                  { label: "Leads", value: number(m.leads) },
                ].map((s) => (
                  <div key={s.label} className="rounded-md bg-surface-2 px-2 py-2.5">
                    <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
                    <dd className="tabular mt-0.5 text-lg font-semibold text-foreground">{s.value}</dd>
                  </div>
                ))}
              </dl>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li className="flex justify-between">
                  <span>Taux de clic</span>
                  <span className="tabular font-medium text-foreground">{m.views ? percent(ctr, 1) : "—"}</span>
                </li>
                <li className="flex justify-between">
                  <span>Clic → lead</span>
                  <span className="tabular font-medium text-foreground">{m.clicks ? percent(conv, 1) : "—"}</span>
                </li>
                {rank && isPublished ? (
                  <li className="flex justify-between">
                    <span>Classement (leads)</span>
                    <span className="tabular font-medium text-foreground">
                      {rank.pos}ᵉ / {rank.of}
                    </span>
                  </li>
                ) : null}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Supprimer ce contenu ?"
        description="Action définitive. Pour simplement le retirer du site, préférez « Archiver »."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={destroy}>
              <Trash2 /> Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground">« {item.title} »</p>
      </Modal>

      <Modal
        open={confirmSite !== null}
        onClose={() => setConfirmSite(null)}
        title={confirmSite?.title ?? ""}
        description={confirmSite?.message}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmSite(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                confirmSite?.run();
                setConfirmSite(null);
              }}
            >
              {confirmSite?.action}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Le site se met à jour sous 60 s. C&apos;est réversible : rétablir le canal, le type ou le slug d&apos;origine avec le statut « Publié » le remet en ligne.
        </p>
      </Modal>
    </div>
  );
}
