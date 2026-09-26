"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, Eye, KanbanSquare, List, Megaphone, Plus, Send, UserPlus, X } from "lucide-react";
import { Button, PageHeader, Segmented, Select, StatCard, useToast } from "@/components/ui";
import { useActions, useCollection, useContentPerformance, useLookup, useNow, useSession } from "@/lib/hooks";
import { CHANNELS, CONTENT_STATUSES, CONTENT_TYPES, labelOf } from "@/lib/domain/constants";
import { inRange, lastWeeks } from "@/lib/domain/selectors";
import type { ContentItem, ContentStatus } from "@/lib/domain/types";
import { compactNumber, date, dateTime, number, percent } from "@/lib/format";
import { ContentCalendar } from "./content-calendar";
import { ContentPipeline } from "./content-pipeline";
import { ContentList } from "./content-list";
import { NewContentModal } from "./new-content-modal";
import { siteKind } from "./site-publication-panel";

type View = "calendrier" | "pipeline" | "liste";
const DAY = 86_400_000;

function pctDelta(cur: number, prev: number): number | undefined {
  if (!prev) return undefined;
  return Math.round(((cur - prev) / prev) * 100);
}

export function ContentsPage() {
  const contents = useCollection("contents");
  const users = useLookup("users");
  const userList = useCollection("users");
  const perf = useContentPerformance();
  const now = useNow();
  const toast = useToast();
  const { update } = useActions();
  const { canEdit } = useSession();
  const editable = canEdit("contenus");

  const [view, setView] = React.useState<View>("calendrier");
  const [type, setType] = React.useState("");
  const [channel, setChannel] = React.useState("");
  const [author, setAuthor] = React.useState("");
  const [creating, setCreating] = React.useState<{ date?: string } | null>(null);

  const filtered = React.useMemo(
    () => contents.filter((c) => (!type || c.type === type) && (!channel || c.channel === channel) && (!author || c.authorId === author)),
    [contents, type, channel, author],
  );

  const stats = React.useMemo(() => {
    const start = now - 30 * DAY;
    const prevStart = now - 60 * DAY;
    const published = contents.filter((c) => c.status === "publie");
    const pub30 = published.filter((c) => inRange(c.publishedAt, start, now + 1));
    const pubPrev = published.filter((c) => inRange(c.publishedAt, prevStart, start));
    const planned = contents.filter((c) => c.status === "planifie").sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
    const next = planned.find((c) => c.scheduledAt && new Date(c.scheduledAt).getTime() >= now);
    const sum = (list: ContentItem[], k: "views" | "clicks" | "leads") => list.reduce((s, c) => s + (perf.get(c.id)?.[k] ?? 0), 0);
    const views30 = sum(pub30, "views");
    const viewsAll = sum(published, "views");
    const leads = sum(contents, "leads");
    const clicks = sum(contents, "clicks");
    const weekly = lastWeeks(now, 12).map((w) => published.filter((c) => inRange(c.publishedAt, w.start, w.end)).length);
    return { pub30: pub30.length, pubDelta: pctDelta(pub30.length, pubPrev.length), planned: planned.length, next, views30, viewsAll, leads, clicks, weekly };
  }, [contents, perf, now]);

  const authorOptions = React.useMemo(
    () => userList.filter((u) => contents.some((c) => c.authorId === u.id)).map((u) => ({ value: u.id, label: u.name })),
    [userList, contents],
  );

  const moveTo = (item: ContentItem, to: ContentStatus) => {
    if (!editable || item.status === to) return;
    const kind = siteKind(item.type, item.channel);
    if (to === "publie" || to === "planifie") {
      const missing = kind === "faq" && !item.category ? "la catégorie de FAQ" : kind === "blog" && !item.slug ? "le slug" : null;
      if (missing) {
        toast({ title: "Publication impossible", description: `Renseignez ${missing} dans l'éditeur.`, tone: "danger" });
        return;
      }
    }
    const patch: Partial<ContentItem> = { status: to };
    let description: string | undefined;
    if (to === "planifie" && (!item.scheduledAt || new Date(item.scheduledAt).getTime() < Date.now())) {
      const d = new Date(Date.now() + DAY);
      d.setHours(9, 0, 0, 0);
      patch.scheduledAt = d.toISOString();
      description = kind
        ? `Mise en ligne automatique le ${dateTime(patch.scheduledAt)} (modifiable dans l'éditeur).`
        : `Tâche de rappel le ${dateTime(patch.scheduledAt)} (modifiable dans l'éditeur).`;
    }
    if (to === "publie" && !item.publishedAt) patch.publishedAt = new Date().toISOString();
    update("contents", item.id, patch, { log: `Statut : ${labelOf(CONTENT_STATUSES, item.status)} → ${labelOf(CONTENT_STATUSES, to)}`, kind: "statut" });
    toast({ title: `« ${item.title} » → ${labelOf(CONTENT_STATUSES, to)}`, description });
  };

  const reschedule = (id: string, day: string) => {
    const item = contents.find((c) => c.id === id);
    if (!item || !editable || item.status === "publie") return;
    const prev = item.scheduledAt ? parseISO(item.scheduledAt) : null;
    const d = parseISO(day);
    d.setHours(prev ? prev.getHours() : 9, prev ? prev.getMinutes() : 0, 0, 0);
    if (prev && format(prev, "yyyy-MM-dd") === day) return;
    const iso = d.toISOString();
    update("contents", id, { scheduledAt: iso }, { log: `Reprogrammé au ${dateTime(iso)}` });
    toast({ title: "Contenu reprogrammé", description: `${item.title} — ${date(iso, "EEEE d MMMM · HH:mm")}` });
  };

  const hasFilters = Boolean(type || channel || author);

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Site & réseaux"
        title="Contenus"
        description="Calendrier éditorial et CMS du site startupweek.tech : articles, pages sessions, témoignages, FAQ, newsletters et posts. Remplace les articles codés en dur dans le dépôt du site."
        actions={
          editable ? (
            <Button onClick={() => setCreating({})}>
              <Plus /> Nouveau contenu
            </Button>
          ) : null
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Publiés · 30 j" value={number(stats.pub30)} delta={stats.pubDelta} deltaLabel="vs 30 j préc." trend={stats.weekly} icon={Send} />
        <StatCard
          label="Planifiés"
          value={number(stats.planned)}
          hint={stats.next ? `Prochain : ${date(stats.next.scheduledAt, "d MMM · HH:mm")} · ${labelOf(CHANNELS, stats.next.channel)}` : "Aucune publication programmée"}
          icon={CalendarDays}
        />
        <StatCard label="Vues · publiés 30 j" value={compactNumber(stats.views30)} hint={`${compactNumber(stats.viewsAll)} vues cumulées sur tous les contenus`} icon={Eye} />
        <StatCard
          label="Leads générés"
          value={number(stats.leads)}
          hint={stats.clicks ? `${percent((stats.leads / stats.clicks) * 100, 1)} des clics deviennent des leads` : "Formulaires envoyés après lecture d'un article"}
          icon={UserPlus}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: "calendrier", label: (<><CalendarDays className="size-3.5" aria-hidden="true" /> Calendrier</>) },
            { value: "pipeline", label: (<><KanbanSquare className="size-3.5" aria-hidden="true" /> Pipeline</>) },
            { value: "liste", label: (<><List className="size-3.5" aria-hidden="true" /> Liste</>), count: filtered.length },
          ]}
        />
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <Select aria-label="Type de contenu" value={type} onChange={(e) => setType(e.target.value)} placeholder="Tous les types" options={CONTENT_TYPES} className="w-[calc(50%-4px)] sm:w-44" />
          <Select aria-label="Canal" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Tous les canaux" options={CHANNELS} className="w-[calc(50%-4px)] sm:w-40" />
          <Select aria-label="Auteur" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Tous les auteurs" options={authorOptions} className="w-[calc(50%-4px)] sm:w-44" />
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setType("");
                setChannel("");
                setAuthor("");
              }}
            >
              <X /> Effacer
            </Button>
          ) : null}
        </div>
      </div>

      {contents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong px-6 py-12 text-center">
          <Megaphone className="mx-auto mb-3 size-8 text-faint" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Aucun contenu pour l'instant</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Importez les 34 articles du site ou créez votre premier contenu.</p>
          {editable ? (
            <Button className="mt-4" onClick={() => setCreating({})}>
              <Plus /> Nouveau contenu
            </Button>
          ) : null}
        </div>
      ) : view === "calendrier" ? (
        <ContentCalendar items={filtered} now={now} editable={editable} onCreate={(day) => setCreating({ date: `${day}T09:00` })} onReschedule={reschedule} />
      ) : view === "pipeline" ? (
        <ContentPipeline items={filtered} editable={editable} onMove={moveTo} />
      ) : (
        <ContentList items={filtered} users={users} />
      )}

      {creating ? <NewContentModal key={creating.date ?? "new"} open onClose={() => setCreating(null)} defaultDate={creating.date} /> : null}
    </div>
  );
}
