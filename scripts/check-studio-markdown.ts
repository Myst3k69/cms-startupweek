/**
 * Vérifie que l'édition « sur place » du Studio ne perd rien : pour chaque contenu
 * Markdown des formations livrées (blocs texte, consignes d'exercice, descriptions),
 *   parseMarkdown(serializeMarkdown(parseMarkdown(md))) ≡ parseMarkdown(md)
 * et le texte visible est identique.
 *
 *   npx tsx scripts/check-studio-markdown.ts
 *
 * (La conversion HTML ↔ Markdown côté navigateur est testée dans Chromium avec le même corpus.)
 */
import { parseMarkdown, plainText } from "../src/features/site/lib/markdown";
import { serializeMarkdown } from "../src/features/studio/lib/rich-text";
import { mvpIaCourse } from "../src/lib/data/academy/mvp-ia";
import { iterationLabDraft } from "../src/lib/data/academy/iteration-lab";

const courses = [mvpIaCourse(), iterationLabDraft()];
const sources: { where: string; md: string }[] = [];
for (const c of courses) {
  sources.push({ where: `${c.course.id} · description`, md: c.course.description });
  for (const l of c.lessons)
    for (const b of l.blocks) {
      if (b.type === "texte") sources.push({ where: `${l.id} · ${b.id}`, md: b.markdown });
      if (b.type === "exercice") sources.push({ where: `${l.id} · ${b.id} (consigne)`, md: b.instructions });
    }
}

let failures = 0;
for (const { where, md } of sources) {
  const once = parseMarkdown(md);
  const again = parseMarkdown(serializeMarkdown(once));
  const same = JSON.stringify(once) === JSON.stringify(again);
  const words = (s: string) => plainText(s).replace(/\s+/g, " ").trim();
  const textSame = words(serializeMarkdown(once)) === words(serializeMarkdown(again));
  if (!same || !textSame) {
    failures++;
    if (failures <= 5) {
      console.error(`✗ ${where}`);
      const a = JSON.stringify(once), b = JSON.stringify(again);
      let i = 0;
      while (i < a.length && a[i] === b[i]) i++;
      console.error(`  avant : …${a.slice(Math.max(0, i - 80), i + 120)}`);
      console.error(`  après : …${b.slice(Math.max(0, i - 80), i + 120)}`);
    }
  }
}
console.log(`${sources.length} contenus Markdown vérifiés, ${failures} écart(s).`);
process.exit(failures ? 1 : 0);
