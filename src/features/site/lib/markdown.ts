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

/** Encadrés du blog (`> [!info] texte`), rendus en couleur sur le site. */
export type CalloutKind = "info" | "warning" | "success" | "tip";

export type Block =
  | { t: "h"; level: 1 | 2 | 3 | 4; c: Inline[] }
  | { t: "p"; c: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; start: number; items: Inline[][] }
  | { t: "quote"; c: Inline[] }
  | { t: "callout"; kind: CalloutKind; c: Inline[] }
  | { t: "table"; headers: Inline[][]; rows: Inline[][][] }
  | { t: "image"; src: string; caption: string }
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
    const tok = m[0];
    // « _ » intra-mot (snake_case) : pas d'italique.
    if (m[3] && tok.startsWith("_") && (/\w/.test(rest[m.index - 1] ?? "") || /\w/.test(rest[m.index + tok.length] ?? ""))) {
      out.push({ t: "text", v: rest.slice(0, m.index + 1) });
      rest = rest.slice(m.index + 1);
      continue;
    }
    if (m.index > 0) out.push({ t: "text", v: rest.slice(0, m.index) });
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
      blocks.push({ t: "h", level: h[1].length as 1 | 2 | 3 | 4, c: parseInline(stripAnchor(h[2])) });
      continue;
    }
    const img = /^!\[((?:[^\]\\]|\\.)*)\]\((\S*)\)\s*$/.exec(line.trim());
    if (img) {
      flush();
      blocks.push({ t: "image", src: img[2], caption: img[1].replace(/\\\]/g, "]") });
      continue;
    }
    if (line.startsWith("|")) {
      flush();
      const rowsSrc: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) rowsSrc.push(lines[i++]);
      i--;
      const [head, ...rest] = rowsSrc;
      blocks.push({
        t: "table",
        headers: splitRow(head).map(parseInline),
        rows: rest.filter((l) => !/^\|\s*:?-{3,}/.test(l)).map((l) => splitRow(l).map(parseInline)),
      });
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
      const callout = /^\[!(info|warning|success|tip)\]\s?([\s\S]*)$/.exec(q.join("\n"));
      if (callout) blocks.push({ t: "callout", kind: callout[1] as CalloutKind, c: parseInline(callout[2].replace(/\n/g, " ").trim()) });
      else blocks.push({ t: "quote", c: parseInline(q.join(" ").trim()) });
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
    para.push(line.trim().replace(/^\\/, ""));
  }
  flush();
  return blocks;
}

/** Retire l'ancre explicite d'un titre : « Titre {#h2-ancre} » → « Titre ». */
export function stripAnchor(text: string): string {
  return text.replace(/\s*\{#[^}\s]+\}\s*$/, "");
}

/** Cellules d'une ligne de tableau (« \| » = barre verticale littérale). */
function splitRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let cur = "";
  for (let k = 0; k < inner.length; k++) {
    const ch = inner[k];
    if (ch === "\\" && k + 1 < inner.length) {
      cur += inner[k + 1] === "n" ? "\n" : inner[k + 1];
      k++;
    } else if (ch === "|") {
      cells.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

/** Titres de niveau 2 du corps (aperçu du sommaire de l'article). */
export function headingsOf(src: string): string[] {
  return src
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => /^##\s+(.+?)\s*$/.exec(l))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => stripAnchor(m[1]));
}

/** Texte brut (comptage de mots, extrait auto). */
export function plainText(src: string): string {
  return src
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\{#[^}\s]+\}/g, " ")
    .replace(/\[!(info|warning|success|tip)\]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(src: string): number {
  const txt = plainText(src);
  return txt ? txt.split(" ").length : 0;
}
