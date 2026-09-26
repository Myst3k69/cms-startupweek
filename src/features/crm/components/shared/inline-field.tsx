"use client";

import * as React from "react";
import { Check, Pencil, X } from "lucide-react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Champ éditable « en place » (fiches) : affichage + crayon → saisie → Entrée / ✓ pour enregistrer, Échap pour annuler.
 */
export function InlineField({
  label,
  value,
  display,
  onSave,
  kind = "text",
  options,
  placeholder,
  disabled,
  validate,
  className,
}: {
  label: string;
  value: string;
  display?: React.ReactNode;
  onSave: (v: string) => void;
  kind?: "text" | "email" | "tel" | "url" | "textarea" | "select" | "date";
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  validate?: (v: string) => string | undefined;
  className?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [error, setError] = React.useState<string>();
  const id = React.useId();

  const start = () => {
    setDraft(value);
    setError(undefined);
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setError(undefined);
  };
  const save = (v = draft) => {
    const err = validate?.(v.trim());
    if (err) {
      setError(err);
      return;
    }
    if (v.trim() !== value) onSave(v.trim());
    setEditing(false);
  };

  return (
    <div className={cn("group min-w-0", className)}>
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      {editing ? (
        <div className="mt-1 space-y-1">
          <div className="flex items-start gap-1.5">
            {kind === "select" ? (
              <Select
                id={id}
                value={draft}
                autoFocus
                onChange={(e) => {
                  setDraft(e.target.value);
                  save(e.target.value);
                }}
                onKeyDown={(e) => e.key === "Escape" && cancel()}
                options={options ?? []}
                placeholder={placeholder ?? "—"}
                className="flex-1"
              />
            ) : kind === "textarea" ? (
              <Textarea id={id} value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Escape" && cancel()} className="min-h-20 flex-1" placeholder={placeholder} />
            ) : (
              <Input
                id={id}
                type={kind}
                value={draft}
                autoFocus
                placeholder={placeholder}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    save();
                  }
                  if (e.key === "Escape") cancel();
                }}
                className="h-8 flex-1"
              />
            )}
            {kind !== "select" ? (
              <Button size="icon-sm" variant="subtle" onClick={() => save()} aria-label={`Enregistrer ${label}`}>
                <Check />
              </Button>
            ) : null}
            <Button size="icon-sm" variant="ghost" onClick={cancel} aria-label="Annuler">
              <X />
            </Button>
          </div>
          {error ? <p className="text-xs text-danger-text">{error}</p> : null}
        </div>
      ) : (
        <div className="mt-0.5 flex min-h-8 items-start gap-1">
          <div className={cn("min-w-0 flex-1 break-words py-1 text-sm text-foreground", kind === "textarea" && "whitespace-pre-wrap")}>{display ?? (value || <span className="text-faint">{placeholder ?? "—"}</span>)}</div>
          {!disabled ? (
            <Button size="icon-xs" variant="ghost" onClick={start} aria-label={`Modifier ${label}`} className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100">
              <Pencil />
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
