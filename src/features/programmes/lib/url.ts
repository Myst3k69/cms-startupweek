/**
 * Synchronise un paramètre d'URL (vue, onglet, filtre) sans navigation serveur :
 * Next 16 intègre l'API History native (pas de re-rendu serveur, partage du lien possible).
 * À appeler uniquement depuis un gestionnaire d'événement.
 */
export function replaceQuery(patch: Record<string, string | undefined | null>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === "") url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

/** Premier élément d'un paramètre de recherche Next (string | string[] | undefined). */
export function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
