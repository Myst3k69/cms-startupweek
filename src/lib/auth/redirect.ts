/** Chemin interne sûr pour la redirection après connexion (pas d'URL externe, ni « //hôte », ni boucle vers /connexion). */
export function safeNext(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (raw.startsWith("/connexion") || raw.startsWith("/auth/")) return "/";
  return raw;
}
