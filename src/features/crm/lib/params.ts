/** Première valeur d'un paramètre de recherche Next (string | string[] | undefined). */
export function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v || undefined;
}
