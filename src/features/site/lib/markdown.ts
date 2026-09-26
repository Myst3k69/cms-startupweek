/**
 * Mini-parseur Markdown (sous-ensemble) → arbre de nœuds sérialisable.
 *
 * Volontairement limité à ce que l'équipe utilise dans les articles du site :
 * titres, paragraphes, gras, italique, code, liens, listes, citations, séparateurs.
 * Aucun HTML n'est interprété : le rendu React échappe tout le texte, et les URLs
 * de liens sont filtrées (http(s), mailto, chemins relatifs, ancres).
 */

export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; external: boolean; c: Inline[] };

export type Block =
  | { t: "h"; level: 1 | 2 | 3 | 4; c: Inline[] }
  | { t: "p"; c: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; start: number; items: Inline[][] }
  | { t: "quote"; c: Inline[] }
  | { t: "hr" }
  | { t: "code"; v: string };

/** URL autorisée (sinon le lien est rendu comme simple texte). */
export function safeHref(raw: string): { href: string; external: boolean } | null {
  const href = raw.trim();
  if (/^https?:\/\/[^\s]+$/i.test(href)) return { href, external: true };
  if (/^mailto:[^\s]+$/i.test(href)) return { href, external: true };
  if (/^(\/(?!\/)|#)[^\s]*$/.test(href)) return { href, external: false };
  return null;
}

const INLINE_RE = /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*|__[^_\n]+?__)|(\*[^*\s][^*\n]*?\*|_[^_\s][^_\n]*?_)|(\[[^\]\n]+\]\([^)\s]+\))/;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let rest = src;
  while (rest.length) {
    const m = INLINE_RE.exec(rest);
    if (!m) {
      out.push({ t: "text", v: rest });
      break;
    }
    if (m.index > 0) out.push({ t: "text", v: rest.slice(0, m.index) });
    const tok = m[0];
    if (m[1]) out.push({ t: "code", v: tok.slice(1, -1) });
    else if (m[2]) out.push({ t: "strong", c: parseInline(tok.slice(2, -2)) });
    else if (m[3]) out.push({ t: "em", c: parseInline(tok.slice(1, -1)) });
    else if (m[4]) {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok);
      const safe = lm ? safeHref(lm[2]) : null;
      if (lm && safe) out.push({ t: "link", href: safe.href, external: safe.external, c: parseInline(lm[1]) });
      else out.push({ t: "text", v: lm ? lm[1] : tok });
    }
    rest = rest.slice(m.index + tok.length);
  }
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ t: "p", c: parseInline(para.join(" ").trim()) });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      flush();
      continue;
    }
    if (/^```/.test(line.trim())) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) code.push(lines[i++]);
      blocks.push({ t: "code", v: code.join("\n") });
      continue;
    }
    const h = /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) {
      flush();
      blocks.push({ t: "h", level: h[1].length as 1 | 2 | 3 | 4, c: parseInline(h[2]) });
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush();
      blocks.push({ t: "hr" });
      continue;
    }
    if (/^\s*>/.test(line)) {
      flush();
      const q: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ""));
      i--;
      blocks.push({ t: "quote", c: parseInline(q.join(" ").trim()) });
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      flush();
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) items.push(parseInline(lines[i++].replace(/^\s*[-*+]\s+/, "")));
      i--;
      blocks.push({ t: "ul", items });
      continue;
    }
    const ol = /^\s*(\d+)[.)]\s+/.exec(line);
    if (ol) {
      flush();
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(parseInline(lines[i++].replace(/^\s*\d+[.)]\s+/, "")));
      i--;
      blocks.push({ t: "ol", start: Number(ol[1]) || 1, items });
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return blocks;
}

/** Texte brut (comptage de mots, extrait auto). */
export function plainText(src: string): string {
  return src
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(src: string): number {
  const txt = plainText(src);
  return txt ? txt.split(" ").length : 0;
}
