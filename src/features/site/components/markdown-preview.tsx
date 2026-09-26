"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { parseMarkdown, type Block, type Inline } from "../lib/markdown";

/**
 * Aperçu Markdown rendu en éléments React (le texte est échappé par React,
 * aucun `dangerouslySetInnerHTML`, liens filtrés par `safeHref`).
 */
export function MarkdownPreview({ source, className }: { source: string; className?: string }) {
  const blocks = React.useMemo(() => parseMarkdown(source), [source]);
  if (!blocks.length) {
    return <p className={cn("text-sm italic text-faint", className)}>Rien à afficher pour l'instant — commencez à écrire dans l'onglet « Écrire ».</p>;
  }
  return <div className={cn("space-y-3 text-sm leading-relaxed text-foreground", className)}>{blocks.map((b, i) => renderBlock(b, i))}</div>;
}

function renderInline(nodes: Inline[]): React.ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.t) {
      case "text":
        return <React.Fragment key={i}>{n.v}</React.Fragment>;
      case "strong":
        return (
          <strong key={i} className="font-semibold">
            {renderInline(n.c)}
          </strong>
        );
      case "em":
        return <em key={i}>{renderInline(n.c)}</em>;
      case "code":
        return (
          <code key={i} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em]">
            {n.v}
          </code>
        );
      case "link":
        return (
          <a
            key={i}
            href={n.href}
            className="text-accent-text underline underline-offset-2 hover:opacity-80"
            {...(n.external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
          >
            {renderInline(n.c)}
          </a>
        );
    }
  });
}

function renderBlock(b: Block, key: number): React.ReactNode {
  switch (b.t) {
    case "h": {
      const cls = {
        1: "text-xl font-semibold tracking-tight",
        2: "mt-5 text-lg font-semibold tracking-tight",
        3: "mt-4 text-base font-semibold",
        4: "mt-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground",
      }[b.level];
      const Tag = (`h${b.level}` as "h1" | "h2" | "h3" | "h4");
      return (
        <Tag key={key} className={cls}>
          {renderInline(b.c)}
        </Tag>
      );
    }
    case "p":
      return <p key={key}>{renderInline(b.c)}</p>;
    case "ul":
      return (
        <ul key={key} className="list-disc space-y-1 pl-5 marker:text-faint">
          {b.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} start={b.start} className="list-decimal space-y-1 pl-5 marker:text-faint">
          {b.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote key={key} className="border-l-2 border-primary pl-3 text-muted-foreground italic">
          {renderInline(b.c)}
        </blockquote>
      );
    case "callout": {
      const tone = { info: "border-info bg-info-soft", warning: "border-warning bg-warning-soft", success: "border-success bg-success-soft", tip: "border-primary bg-accent-soft" }[b.kind];
      const label = { info: "Info", warning: "Attention", success: "À retenir", tip: "Astuce" }[b.kind];
      return (
        <aside key={key} className={`rounded-md border-l-2 px-3 py-2 ${tone}`}>
          <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
          {renderInline(b.c)}
        </aside>
      );
    }
    case "table":
      return (
        <div key={key} className="scrollbar-thin overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-surface-2">
              <tr>
                {b.headers.map((h, i) => (
                  <th key={i} className="border-b border-border px-2 py-1.5 font-semibold">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci} className="border-b border-border px-2 py-1.5 align-top">
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "image":
      return (
        <figure key={key} className="space-y-1">
          <div className="rounded-md border border-dashed border-border bg-surface-2 px-3 py-6 text-center font-mono text-xs text-muted-foreground">{b.src || "image sans adresse"}</div>
          {b.caption ? <figcaption className="text-center text-xs text-muted-foreground">{b.caption}</figcaption> : null}
        </figure>
      );
    case "hr":
      return <hr key={key} className="border-border" />;
    case "code":
      return (
        <pre key={key} className="scrollbar-thin overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-xs">
          <code>{b.v}</code>
        </pre>
      );
  }
}
