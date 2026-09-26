"use client";

import * as React from "react";
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";
import { Segmented } from "@/components/ui";
import { cn } from "@/lib/utils";
import { MarkdownPreview } from "./markdown-preview";

type Mode = "ecrire" | "apercu" | "cote";

/** Éditeur Markdown : barre d'outils, modes écrire / aperçu / côte à côte. */
export function MarkdownEditor({ value, onChange, disabled, id }: { value: string; onChange: (v: string) => void; disabled?: boolean; id?: string }) {
  const [mode, setMode] = React.useState<Mode>(disabled ? "apercu" : "ecrire");
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const apply = (fn: (sel: string, before: string, after: string) => { text: string; selStart: number; selEnd: number }) => {
    const el = ref.current;
    if (!el || disabled) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const res = fn(value.slice(s, e), value.slice(0, s), value.slice(e));
    onChange(res.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(res.selStart, res.selEnd);
    });
  };

  const wrap = (mark: string, placeholder: string) =>
    apply((sel, before, after) => {
      const inner = sel || placeholder;
      return { text: `${before}${mark}${inner}${mark}${after}`, selStart: before.length + mark.length, selEnd: before.length + mark.length + inner.length };
    });

  const prefix = (make: (i: number) => string, placeholder: string) =>
    apply((sel, before, after) => {
      const lineStart = before.lastIndexOf("\n") + 1;
      const head = before.slice(0, lineStart);
      const block = before.slice(lineStart) + (sel || placeholder);
      const next = block
        .split("\n")
        .map((l, i) => make(i) + l)
        .join("\n");
      return { text: head + next + after, selStart: head.length, selEnd: head.length + next.length };
    });

  const link = () =>
    apply((sel, before, after) => {
      const label = sel || "texte du lien";
      const md = `[${label}](https://)`;
      const urlStart = before.length + label.length + 3;
      return { text: before + md + after, selStart: urlStart, selEnd: urlStart + 8 };
    });

  const tools = [
    { icon: Heading2, label: "Intertitre", run: () => prefix(() => "## ", "Intertitre") },
    { icon: Bold, label: "Gras", run: () => wrap("**", "texte en gras") },
    { icon: Italic, label: "Italique", run: () => wrap("*", "texte en italique") },
    { icon: List, label: "Liste à puces", run: () => prefix(() => "- ", "élément") },
    { icon: ListOrdered, label: "Liste numérotée", run: () => prefix((i) => `${i + 1}. `, "étape") },
    { icon: Quote, label: "Citation", run: () => prefix(() => "> ", "citation") },
    { icon: Link2, label: "Lien", run: link },
  ];

  const textarea = (
    <textarea
      id={id}
      ref={ref}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      spellCheck
      placeholder={"## Intertitre\n\nÉcrivez en Markdown : **gras**, *italique*, [lien](https://…), listes « - »…"}
      className="min-h-[420px] w-full resize-y rounded-md border border-border-strong bg-surface px-3 py-2 font-mono text-[13px] leading-relaxed text-foreground shadow-sm placeholder:text-faint focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
    />
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={cn("flex flex-wrap items-center gap-0.5", mode === "apercu" && "invisible")} role="toolbar" aria-label="Mise en forme">
          {tools.map((t) => (
            <button
              key={t.label}
              type="button"
              title={t.label}
              aria-label={t.label}
              disabled={disabled}
              onClick={t.run}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
            >
              <t.icon className="size-4" />
            </button>
          ))}
        </div>
        <Segmented<Mode>
          size="xs"
          value={mode}
          onChange={setMode}
          options={[
            { value: "ecrire", label: "Écrire" },
            { value: "apercu", label: "Aperçu" },
            { value: "cote", label: <span className="hidden lg:inline">Côte à côte</span> },
          ]}
          className="[&>button:last-child]:hidden lg:[&>button:last-child]:inline-flex"
        />
      </div>
      {mode === "ecrire" ? (
        textarea
      ) : mode === "apercu" ? (
        <div className="min-h-[420px] rounded-md border border-border bg-surface px-4 py-3">
          <MarkdownPreview source={value} />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {textarea}
          <div className="max-h-[640px] min-h-[420px] overflow-y-auto rounded-md border border-border bg-surface px-4 py-3">
            <MarkdownPreview source={value} />
          </div>
        </div>
      )}
    </div>
  );
}
