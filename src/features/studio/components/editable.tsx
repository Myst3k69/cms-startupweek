"use client";

import * as React from "react";
import { parseMarkdown } from "@/features/site/lib/markdown";
import { cn } from "@/lib/utils";
import { blocksToHtml, domToBlocks, serializeMarkdown } from "../lib/rich-text";

/**
 * Texte mis en forme éditable sur place : rendu comme l'apprenant le verra, stocké en Markdown.
 * Le DOM n'est jamais réécrit pendant la frappe (le curseur reste en place) : il n'est remplacé
 * que si le Markdown change de l'extérieur (autre leçon, annulation, IA…).
 */
export function RichEditable({
  markdown,
  onChange,
  placeholder,
  disabled,
  className,
  label,
}: {
  markdown: string;
  onChange: (md: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const emitted = React.useRef<string | null>(null);
  const timer = React.useRef<number | undefined>(undefined);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || markdown === emitted.current) return;
    el.innerHTML = blocksToHtml(parseMarkdown(markdown));
    emitted.current = markdown;
  }, [markdown]);

  const flush = React.useCallback(() => {
    window.clearTimeout(timer.current);
    const el = ref.current;
    if (!el) return;
    const md = serializeMarkdown(domToBlocks(el));
    if (md !== emitted.current) {
      emitted.current = md;
      onChangeRef.current(md);
    }
  }, []);
  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    // Markdown collé (ChatGPT, Notion, un article…) : converti en mise en forme ; sinon texte brut.
    if (/^(#{1,4}\s|[-*+]\s|\d+[.)]\s|>\s|\|)/m.test(text) || /\*\*[^*]+\*\*/.test(text)) document.execCommand("insertHTML", false, blocksToHtml(parseMarkdown(text)));
    else document.execCommand("insertText", false, text);
  };

  return (
    <div
      ref={ref}
      role="textbox"
      aria-multiline="true"
      aria-label={label}
      data-rich-root=""
      data-placeholder={placeholder}
      contentEditable={!disabled}
      suppressContentEditableWarning
      onFocus={() => document.execCommand("defaultParagraphSeparator", false, "p")}
      onInput={() => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(flush, 350);
      }}
      onBlur={flush}
      onPaste={onPaste}
      className={cn("studio-rich outline-none", className)}
    />
  );
}

/**
 * Texte d'une ligne (ou de quelques lignes) éditable sur place, sans mise en forme :
 * titres, énoncés de quiz, réponses, étapes de checklist, prompts.
 */
export function PlainEditable({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  label,
  multiline,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label: string;
  multiline?: boolean;
  /** Entrée sur un champ d'une ligne : ex. ajouter l'étape suivante. */
  onEnter?: () => void;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const normalize = React.useCallback(
    (raw: string) => {
      const t = raw.replace(/\u00a0/g, " ");
      return multiline ? t.replace(/\n+$/, "") : t.replace(/\s*\n\s*/g, " ");
    },
    [multiline],
  );
  // Le DOM n'est réécrit que si la valeur change vraiment de l'extérieur (sinon le curseur sauterait).
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el && normalize(el.innerText) !== value) el.innerText = value;
  }, [value, normalize]);
  const read = () => normalize(ref.current?.innerText ?? "");
  return (
    <span
      ref={ref}
      role="textbox"
      aria-label={label}
      aria-multiline={multiline || undefined}
      data-placeholder={placeholder}
      contentEditable={disabled ? false : "plaintext-only"}
      suppressContentEditableWarning
      onInput={() => onChange(read())}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          onEnter?.();
        }
      }}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, multiline ? text : text.replace(/\s*\n\s*/g, " "));
      }}
      className={cn("studio-plain outline-none", multiline && "whitespace-pre-wrap", className)}
    />
  );
}

/* ───────────────────────────── Barre de mise en forme flottante ───────────────────────────── */

function currentRoot(): HTMLElement | null {
  const sel = document.getSelection();
  const node = sel?.anchorNode;
  const el = node ? (node.nodeType === 1 ? (node as Element) : node.parentElement) : null;
  return (el?.closest("[data-rich-root]") as HTMLElement | null) ?? null;
}

function closestBlock(): HTMLElement | null {
  const sel = document.getSelection();
  const node = sel?.anchorNode;
  let el = node ? (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement) : null;
  const root = currentRoot();
  while (el && el !== root && el.parentElement !== root) el = el.parentElement;
  return el && el !== root ? el : null;
}

function replaceBlockTag(block: HTMLElement, tag: string, attrs: Record<string, string> = {}) {
  const next = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => next.setAttribute(k, v));
  while (block.firstChild) next.appendChild(block.firstChild);
  block.replaceWith(next);
  const range = document.createRange();
  range.selectNodeContents(next);
  range.collapse(false);
  const sel = document.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

type Cmd = "bold" | "italic" | "code" | "h2" | "h3" | "p" | "ul" | "ol" | "quote" | "info" | "tip" | "warning" | "link" | "clear";

function run(cmd: Cmd) {
  const root = currentRoot();
  if (!root) return;
  const sel = document.getSelection();
  switch (cmd) {
    case "bold":
    case "italic":
      document.execCommand(cmd);
      break;
    case "code": {
      const text = sel?.toString() ?? "";
      if (text) document.execCommand("insertHTML", false, `<code>${text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</code>&#8203;`);
      break;
    }
    case "h2":
    case "h3":
    case "p":
      document.execCommand("formatBlock", false, cmd);
      break;
    case "ul":
      document.execCommand("insertUnorderedList");
      break;
    case "ol":
      document.execCommand("insertOrderedList");
      break;
    case "quote":
    case "info":
    case "tip":
    case "warning": {
      const block = closestBlock();
      if (!block) break;
      if (cmd === "quote") replaceBlockTag(block, "blockquote");
      else replaceBlockTag(block, "aside", { "data-callout": cmd });
      root.dispatchEvent(new Event("input", { bubbles: true }));
      break;
    }
    case "link": {
      const url = window.prompt("Adresse du lien (https://…)");
      if (url && /^(https?:\/\/|mailto:|\/)/i.test(url.trim())) document.execCommand("createLink", false, url.trim());
      break;
    }
    case "clear":
      document.execCommand("removeFormat");
      document.execCommand("unlink");
      document.execCommand("formatBlock", false, "p");
      break;
  }
}

const BUTTONS: { cmd: Cmd; label: string; title: string; sep?: boolean }[] = [
  { cmd: "bold", label: "G", title: "Gras (Ctrl+B)" },
  { cmd: "italic", label: "I", title: "Italique (Ctrl+I)" },
  { cmd: "code", label: "</>", title: "Code" },
  { cmd: "link", label: "Lien", title: "Lien" },
  { cmd: "h2", label: "Titre", title: "Titre de section", sep: true },
  { cmd: "h3", label: "Sous-titre", title: "Sous-titre" },
  { cmd: "p", label: "Texte", title: "Paragraphe" },
  { cmd: "ul", label: "• Liste", title: "Liste à puces", sep: true },
  { cmd: "ol", label: "1. Liste", title: "Liste numérotée" },
  { cmd: "info", label: "Info", title: "Encadré information", sep: true },
  { cmd: "tip", label: "Astuce", title: "Encadré astuce" },
  { cmd: "warning", label: "Attention", title: "Encadré attention" },
  { cmd: "quote", label: "Citation", title: "Citation" },
  { cmd: "clear", label: "Effacer", title: "Retirer la mise en forme", sep: true },
];

/** Barre affichée au-dessus d'une sélection de texte dans un RichEditable. */
export function FormatToolbar() {
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const onSel = () => {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount || !currentRoot()) return setPos(null);
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const w = ref.current?.offsetWidth ?? 520;
      setPos({ top: Math.max(8, r.top - 44), left: Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) });
    };
    document.addEventListener("selectionchange", onSel);
    window.addEventListener("scroll", onSel, true);
    return () => {
      document.removeEventListener("selectionchange", onSel);
      window.removeEventListener("scroll", onSel, true);
    };
  }, []);
  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Mise en forme"
      hidden={!pos}
      style={pos ? { top: pos.top, left: pos.left } : undefined}
      onMouseDown={(e) => e.preventDefault()}
      className="fixed z-50 flex max-w-[calc(100vw-16px)] items-center gap-0.5 overflow-x-auto rounded-lg border border-border-strong bg-surface p-1 shadow-lg"
    >
      {BUTTONS.map((b) => (
        <React.Fragment key={b.cmd}>
          {b.sep ? <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" /> : null}
          <button
            type="button"
            title={b.title}
            onClick={() => run(b.cmd)}
            className={cn(
              "h-7 shrink-0 rounded-md px-2 text-xs font-medium text-foreground hover:bg-surface-2",
              b.cmd === "bold" && "font-bold",
              b.cmd === "italic" && "italic",
              b.cmd === "code" && "font-mono",
            )}
          >
            {b.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
