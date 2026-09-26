/**
 * Remplissage des modèles d'emails (navigateur et serveur).
 *
 * - `{{variable}}` → valeur, en texte brut (l'échappement HTML se fait à l'envoi) ;
 * - une ligne « Libellé : {{variable}} » dont la valeur fournie est vide disparaît
 *   (ex. « Lieu : » d'une session en ligne) ;
 * - une variable fournie mais vide devient une chaîne vide ; une variable NON fournie
 *   reste `{{variable}}` : complétée par le serveur à l'envoi (SERVER_VARIABLES) ou
 *   signalée — un email n'est jamais envoyé avec une variable non remplie.
 */
export type TemplateVars = Record<string, string | number | null | undefined>;

/** Variables complétées au moment de l'envoi, par le serveur (liens personnels). */
export const SERVER_VARIABLES = ["lien_document", "lien_desinscription"] as const;

const VAR = /\{\{\s*([\w.]+)\s*\}\}/g;
const LABEL_LINE = /^[^{}\n]*:\s*\{\{\s*([\w.]+)\s*\}\}\s*$/;

const isEmpty = (v: TemplateVars[string]) => v === undefined || v === null || String(v).trim() === "";

export function fillEmailTemplate(text: string, vars: TemplateVars): string {
  const lines = text.split("\n").filter((line) => {
    const m = LABEL_LINE.exec(line);
    return !(m && m[1] in vars && isEmpty(vars[m[1]]));
  });
  return lines
    .join("\n")
    .replace(VAR, (whole, key: string) => (key in vars ? (isEmpty(vars[key]) ? "" : String(vars[key])) : whole))
    .replace(/ +,/g, ",")
    .replace(/\n{3,}/g, "\n\n");
}

/** Variables encore présentes (non remplies) dans un texte. */
export function unfilledVariables(...texts: string[]): string[] {
  return Array.from(new Set(texts.flatMap((t) => Array.from(t.matchAll(VAR), (m) => m[1]))));
}

/** Variables non remplies, hors celles que le serveur complète à l'envoi. */
export function missingVariables(...texts: string[]): string[] {
  return unfilledVariables(...texts).filter((v) => !(SERVER_VARIABLES as readonly string[]).includes(v));
}
