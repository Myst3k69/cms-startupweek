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
