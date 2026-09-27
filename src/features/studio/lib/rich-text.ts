/**
 * Édition « sur place » du Studio : le Markdown stocké (sous-ensemble du blog,
 * cf. features/site/lib/markdown.ts) est affiché en HTML éditable, puis relu depuis
 * le DOM et re-sérialisé en Markdown. L'auteur ne voit jamais de Markdown.
 *
 *   Markdown ──parseMarkdown──▶ Block[] ──blocksToHtml──▶ contenteditable
 *   contenteditable ──domToBlocks──▶ Block[] ──serializeMarkdown──▶ Markdown
 *
 * Garantie vérifiée par scripts/check-studio-markdown.ts sur tous les contenus livrés :
 * parseMarkdown(serializeMarkdown(parseMarkdown(md))) ≡ parseMarkdown(md).
 * Le Markdown d'un bloc n'est réécrit que si l'auteur modifie ce bloc.
 */
import { parseInline, safeHref, type Block, type CalloutKind, type Inline } from "@/features/site/lib/markdown";

/* ───────────────────────────── Block[] → Markdown ───────────────────────────── */

function inlineMd(nodes: Inline[]): string {
  return nodes
    .map((n) => {
      switch (n.t) {
        case "text":
          return n.v;
        case "strong":
          return `**${inlineMd(n.c)}**`;
        case "em":
          return `*${inlineMd(n.c)}*`;
        case "code":
          return `\`${n.v}\``;
        case "link":
          return `[${inlineMd(n.c)}](${n.href})`;
      }
    })
    .join("");
}

/** Une ligne de texte : pas de retour à la ligne dans un paragraphe, un titre ou un élément de liste. */
const oneLine = (s: string) => s.replace(/\s*\n\s*/g, " ").trim();

function cellMd(nodes: Inline[]): string {
  return inlineMd(nodes).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, "\\n");
}

/** Un paragraphe qui ressemblerait à une autre construction est protégé (« \ » initial, retiré à la lecture). */
function paragraphMd(text: string): string {
  const t = oneLine(text);
  if (/^(#{1,4}\s|>|[-*+]\s|\d+[.)]\s|\||```|!\[)/.test(t) || /^([-*_])(\s*\1){2,}\s*$/.test(t)) return `\\${t}`;
  return t;
}

export function serializeMarkdown(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.t) {
        case "h":
          return `${"#".repeat(b.level)} ${oneLine(inlineMd(b.c))}`;
        case "p":
          return paragraphMd(inlineMd(b.c));
        case "ul":
          return b.items.map((it) => `- ${oneLine(inlineMd(it))}`).join("\n");
        case "ol":
          return b.items.map((it, i) => `${b.start + i}. ${oneLine(inlineMd(it))}`).join("\n");
        case "quote":
          return `> ${oneLine(inlineMd(b.c))}`;
        case "callout":
          return `> [!${b.kind}] ${oneLine(inlineMd(b.c))}`;
        case "table": {
          const head = `| ${b.headers.map(cellMd).join(" | ")} |`;
          const sep = `| ${b.headers.map(() => "---").join(" | ")} |`;
          const rows = b.rows.map((r) => `| ${r.map(cellMd).join(" | ")} |`);
          return [head, sep, ...rows].join("\n");
        }
        case "image":
          return `![${b.caption.replace(/\]/g, "\\]")}](${b.src})`;
        case "hr":
          return "---";
        case "code":
          return `\`\`\`\n${b.v}\n\`\`\``;
      }
    })
    .filter((s) => s.trim().length > 0)
    .join("\n\n");
}

/* ───────────────────────────── Block[] → HTML éditable ───────────────────────────── */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inlineHtml(nodes: Inline[]): string {
  return nodes
    .map((n) => {
      switch (n.t) {
        case "text":
          return esc(n.v);
        case "strong":
          return `<strong>${inlineHtml(n.c)}</strong>`;
        case "em":
          return `<em>${inlineHtml(n.c)}</em>`;
        case "code":
          return `<code>${esc(n.v)}</code>`;
        case "link":
          return `<a href="${esc(n.href)}">${inlineHtml(n.c)}</a>`;
      }
    })
    .join("");
}

export const CALLOUT_LABELS: Record<CalloutKind, string> = { info: "Info", tip: "Astuce", warning: "Attention", success: "À retenir" };

export function blocksToHtml(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.t) {
        case "h":
          return `<h${b.level}>${inlineHtml(b.c)}</h${b.level}>`;
        case "p":
          return `<p>${inlineHtml(b.c)}</p>`;
        case "ul":
          return `<ul>${b.items.map((it) => `<li>${inlineHtml(it)}</li>`).join("")}</ul>`;
        case "ol":
          return `<ol${b.start !== 1 ? ` start="${b.start}"` : ""}>${b.items.map((it) => `<li>${inlineHtml(it)}</li>`).join("")}</ol>`;
        case "quote":
          return `<blockquote>${inlineHtml(b.c)}</blockquote>`;
        case "callout":
          return `<aside data-callout="${b.kind}">${inlineHtml(b.c)}</aside>`;
        case "table":
          return `<table><thead><tr>${b.headers.map((h) => `<th>${inlineHtml(h)}</th>`).join("")}</tr></thead><tbody>${b.rows
            .map((r) => `<tr>${r.map((c) => `<td>${inlineHtml(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`;
        case "image":
          return `<figure contenteditable="false" data-src="${esc(b.src)}" data-caption="${esc(b.caption)}"><img src="${esc(b.src)}" alt="${esc(b.caption)}"><figcaption>${esc(b.caption)}</figcaption></figure>`;
        case "hr":
          return `<hr>`;
        case "code":
          return `<pre>${esc(b.v)}</pre>`;
      }
    })
    .join("");
}

/* ───────────────────────────── DOM → Block[] ───────────────────────────── */

type El = Element;

/** Fusionne les textes adjacents et retire les nœuds vides (l'éditeur en crée beaucoup). */
function normalizeInline(nodes: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const n of nodes) {
    if (n.t === "text") {
      if (!n.v) continue;
      const prev = out[out.length - 1];
      if (prev?.t === "text") prev.v += n.v;
      else out.push({ t: "text", v: n.v });
    } else if (n.t === "strong" || n.t === "em" || n.t === "link") {
      const c = normalizeInline(n.c);
      if (!c.length) continue;
      const prev = out[out.length - 1];
      // <b>a</b><b>b</b> → **ab** (sinon « ****» illisible au re-parsage)
      if (prev && prev.t === n.t && n.t !== "link") (prev as { c: Inline[] }).c = normalizeInline([...(prev as { c: Inline[] }).c, ...c]);
      else out.push({ ...n, c } as Inline);
    } else if (n.t === "code") {
      if (n.v) out.push(n);
    }
  }
  return out;
}

/** Espaces en début / fin d'une marque déplacés à l'extérieur (« ** mot** » n'est pas du gras en Markdown). */
function hoistSpaces(nodes: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const n of nodes) {
    if (n.t === "strong" || n.t === "em" || n.t === "link") {
      let c = hoistSpaces(n.c);
      let lead = "";
      let trail = "";
      const first = c[0];
      if (first?.t === "text") {
        const m = /^\s+/.exec(first.v);
        if (m) {
          lead = m[0];
          c = [{ t: "text", v: first.v.slice(lead.length) }, ...c.slice(1)];
        }
      }
      const last = c[c.length - 1];
      if (last?.t === "text") {
        const m = /\s+$/.exec(last.v);
        if (m) {
          trail = m[0];
          c = [...c.slice(0, -1), { t: "text", v: last.v.slice(0, last.v.length - trail.length) }];
        }
      }
      if (lead) out.push({ t: "text", v: " " });
      out.push({ ...n, c: normalizeInline(c) } as Inline);
      if (trail) out.push({ t: "text", v: " " });
    } else out.push(n);
  }
  return normalizeInline(out);
}

function readInline(node: Node): Inline[] {
  const out: Inline[] = [];
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      out.push({ t: "text", v: (child.textContent ?? "").replace(/​/g, "").replace(/ /g, " ").replace(/\s+/g, " ") });
      return;
    }
    if (child.nodeType !== 1) return;
    const el = child as El;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") out.push({ t: "text", v: " " });
    else if (tag === "strong" || tag === "b") out.push({ t: "strong", c: readInline(el) });
    else if (tag === "em" || tag === "i") out.push({ t: "em", c: readInline(el) });
    else if (tag === "code") out.push({ t: "code", v: (el.textContent ?? "").replace(/`/g, "'") });
    else if (tag === "a") {
      const safe = safeHref(el.getAttribute("href") ?? "");
      if (safe) out.push({ t: "link", href: safe.href, external: safe.external, c: readInline(el) });
      else out.push(...readInline(el));
    } else out.push(...readInline(el)); // span, font… : on garde le texte
  });
  return out;
}

/** Contenu inline nettoyé : espaces normalisés, rien de vide. */
function inlineOf(el: Node): Inline[] {
  const nodes = hoistSpaces(normalizeInline(readInline(el)));
  // espaces de début / fin du bloc
  const first = nodes[0];
  if (first?.t === "text") first.v = first.v.replace(/^\s+/, "");
  const last = nodes[nodes.length - 1];
  if (last?.t === "text") last.v = last.v.replace(/\s+$/, "");
  return normalizeInline(nodes);
}

const hasText = (nodes: Inline[]) => inlineMd(nodes).trim().length > 0;

const BLOCK_TAGS = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "blockquote", "aside", "table", "figure", "hr", "pre", "section"]);

export function domToBlocks(root: El): Block[] {
  const out: Block[] = [];
  let loose: Node[] = []; // texte / inline hors bloc (tapé directement dans la racine)
  const flushLoose = () => {
    if (!loose.length) return;
    const holder = root.ownerDocument.createElement("p");
    loose.forEach((n) => holder.appendChild(n.cloneNode(true)));
    const c = inlineOf(holder);
    if (hasText(c)) out.push({ t: "p", c });
    loose = [];
  };
  const visit = (el: El) => {
    const tag = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      const c = inlineOf(el);
      if (hasText(c)) out.push({ t: "h", level: Math.min(4, Math.max(2, Number(tag[1]))) as 2 | 3 | 4, c });
    } else if (tag === "ul" || tag === "ol") {
      const items = [...el.children].filter((li) => li.tagName.toLowerCase() === "li").map((li) => inlineOf(li)).filter(hasText);
      if (items.length) out.push(tag === "ul" ? { t: "ul", items } : { t: "ol", start: Number(el.getAttribute("start")) || 1, items });
    } else if (tag === "blockquote") {
      const c = inlineOf(el);
      if (hasText(c)) out.push({ t: "quote", c });
    } else if (tag === "aside") {
      const kind = el.getAttribute("data-callout");
      const c = inlineOf(el);
      if (hasText(c)) out.push({ t: "callout", kind: kind === "tip" || kind === "warning" || kind === "success" ? kind : "info", c });
    } else if (tag === "table") {
      const rows = [...el.querySelectorAll("tr")].map((tr) => [...tr.children].map((cell) => inlineOf(cell)));
      const headRow = el.querySelector("thead tr");
      const headers = headRow ? [...headRow.children].map((cell) => inlineOf(cell)) : (rows.shift() ?? []);
      const body = headRow ? rows.slice(1) : rows;
      if (headers.length) out.push({ t: "table", headers, rows: body.filter((r) => r.some(hasText)) });
    } else if (tag === "figure") {
      const src = el.getAttribute("data-src") ?? el.querySelector("img")?.getAttribute("src") ?? "";
      if (src) out.push({ t: "image", src, caption: el.getAttribute("data-caption") ?? el.querySelector("figcaption")?.textContent ?? "" });
    } else if (tag === "hr") out.push({ t: "hr" });
    else if (tag === "pre") {
      const v = (el.textContent ?? "").replace(/ /g, " ").replace(/\n+$/, "");
      if (v.trim()) out.push({ t: "code", v: v.replace(/```/g, "'''") });
    } else if (tag === "div" || tag === "section") {
      // Conteneur générique (souvent créé par « Entrée » dans certains navigateurs) : ses enfants blocs, sinon un paragraphe.
      if ([...el.children].some((c) => BLOCK_TAGS.has(c.tagName.toLowerCase()))) walk(el);
      else {
        const c = inlineOf(el);
        if (hasText(c)) out.push({ t: "p", c });
      }
    } else if ([...el.children].some((c) => BLOCK_TAGS.has(c.tagName.toLowerCase()))) {
      // Ex. Chrome qui place une liste dans un paragraphe (<p><ol>…</ol></p>) : on lit les blocs contenus.
      walk(el);
    } else {
      const c = inlineOf(el);
      if (hasText(c)) out.push({ t: "p", c });
    }
  };
  const walk = (parent: El) => {
    parent.childNodes.forEach((n) => {
      if (n.nodeType === 1 && BLOCK_TAGS.has((n as El).tagName.toLowerCase())) {
        flushLoose();
        visit(n as El);
      } else if (n.nodeType === 1 && (n as El).tagName.toLowerCase() === "br") {
        flushLoose();
      } else if (n.nodeType === 1 || n.nodeType === 3) loose.push(n);
    });
    flushLoose();
  };
  walk(root);
  return out;
}

/** Texte simple d'une ligne (titres, libellés) : mise en forme inline conservée en Markdown. */
export function inlineToHtml(md: string): string {
  return inlineHtml(parseInline(md));
}
export function inlineFromDom(el: El): string {
  return oneLine(inlineMd(inlineOf(el)));
}
