"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Liste de tags compacte (« +2 » au-delà de `max`). */
export function TagList({ tags, max = 2, className }: { tags: string[]; max?: number; className?: string }) {
  if (!tags.length) return <span className="text-xs text-faint">—</span>;
  const shown = tags.slice(0, max);
  const rest = tags.length - shown.length;
  return (
    <span className={cn("inline-flex max-w-full flex-wrap items-center gap-1", className)}>
      {shown.map((t) => (
        <Badge key={t} className="max-w-36">
          {t}
        </Badge>
      ))}
      {rest > 0 ? (
        <span className="text-xs text-muted-foreground" title={tags.slice(max).join(", ")}>
          +{rest}
        </span>
      ) : null}
    </span>
  );
}

/** Éditeur de tags (Entrée ou virgule pour ajouter). */
export function TagEditor({ value, onChange, suggestions = [], disabled, id }: { value: string[]; onChange: (tags: string[]) => void; suggestions?: string[]; disabled?: boolean; id?: string }) {
  const [draft, setDraft] = React.useState("");
  const listId = React.useId();
  const add = (raw: string) => {
    const t = raw.trim().replace(/,$/, "");
    if (!t || value.some((v) => v.toLowerCase() === t.toLowerCase())) return;
    onChange([...value, t]);
  };
  return (
    <div className="space-y-2">
      {value.length ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <Badge key={t} tone="accent" className="pr-1">
              {t}
              {!disabled ? (
                <button type="button" aria-label={`Retirer le tag ${t}`} onClick={() => onChange(value.filter((v) => v !== t))} className="rounded-full p-0.5 hover:bg-accent-soft-strong">
                  <X className="size-3" />
                </button>
              ) : null}
            </Badge>
          ))}
        </div>
      ) : null}
      {!disabled ? (
        <>
          <Input
            id={id}
            value={draft}
            list={listId}
            placeholder="Ajouter un tag puis Entrée"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add(draft);
                setDraft("");
              }
            }}
            onBlur={() => {
              if (draft.trim()) {
                add(draft);
                setDraft("");
              }
            }}
          />
          <datalist id={listId}>
            {suggestions.filter((s) => !value.includes(s)).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </>
      ) : null}
    </div>
  );
}
