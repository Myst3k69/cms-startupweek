/** Ligne SQL → objet du contrat de données : clés de premier niveau en camelCase, NULL → champ absent. */
export function fromRow<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => [k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), v]),
  ) as T;
}

/** Ne garde que les clés listées (données transmises à une page publique). */
export function pick<T extends object, K extends keyof T>(obj: T | undefined, keys: readonly K[]): Pick<T, K> | undefined {
  if (!obj) return undefined;
  return Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]])) as Pick<T, K>;
}
