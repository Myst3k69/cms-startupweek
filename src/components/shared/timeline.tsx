"use client";

import * as React from "react";
import { CircleDollarSign, FilePlus2, FileText, Mail, MessageSquare, Pencil, Phone, RefreshCw, Sparkles } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useNow, useSession } from "@/lib/hooks";
import { relative } from "@/lib/format";
import type { ActivityKind, EntityName, ID } from "@/lib/domain/types";
import { Avatar, Button, Textarea } from "@/components/ui";

const ICONS: Record<ActivityKind, React.ComponentType<{ className?: string }>> = {
  creation: FilePlus2,
  modification: Pencil,
  statut: RefreshCw,
  note: MessageSquare,
  email: Mail,
  appel: Phone,
  paiement: CircleDollarSign,
  document: FileText,
  systeme: Sparkles,
};

/** Historique d'une fiche + ajout de note (remplace l'absence d'historique d'Airtable). */
export function ActivityTimeline({ entity, id, extra = [], limit = 30 }: { entity: EntityName; id: ID; extra?: { entity: EntityName; id: ID }[]; limit?: number }) {
  const activities = useCrm((s) => s.activities);
  const users = useCrm((s) => s.users);
  const log = useCrm((s) => s.log);
  const now = useNow();
  const { user } = useSession();
  const [note, setNote] = React.useState("");
  const refs = React.useMemo(() => [{ entity, id }, ...extra], [entity, id, extra]);
  const items = React.useMemo(
    () => activities.filter((a) => refs.some((r) => r.entity === a.entity && r.id === a.entityId)).slice(0, limit),
    [activities, refs, limit],
  );
  const byId = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) return;
          log({ kind: "note", entity, entityId: id, actorId: user?.id, summary: note.trim() });
          setNote("");
        }}
        className="space-y-2"
      >
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter une note, un compte rendu d'appel…" className="min-h-16" aria-label="Nouvelle note" />
        <div className="flex justify-end">
          <Button type="submit" size="sm" variant="secondary" disabled={!note.trim()}>
            Ajouter la note
          </Button>
        </div>
      </form>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">Aucune activité pour l'instant.</p> : null}
      <ol className="relative space-y-4 border-l border-border pl-5">
        {items.map((a) => {
          const Icon = ICONS[a.kind] ?? Pencil;
          const actor = a.actorId ? byId.get(a.actorId) : undefined;
          return (
            <li key={a.id} className="relative">
              <span className="absolute -left-[29px] top-0 inline-flex size-[18px] items-center justify-center rounded-full border border-border bg-surface text-muted-foreground">
                <Icon className="size-3" />
              </span>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {actor ? (
                  <span className="inline-flex items-center gap-1">
                    <Avatar name={actor.name} color={actor.color} size="xs" />
                    {actor.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-accent-text">
                    <Sparkles className="size-3" /> Automatisation
                  </span>
                )}
                <span>·</span>
                <time dateTime={a.at}>{relative(a.at, now)}</time>
              </div>
              <p className={a.kind === "note" ? "mt-1 rounded-md bg-surface-2 px-3 py-2 text-sm text-foreground" : "mt-0.5 text-sm text-foreground"}>{a.summary}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
