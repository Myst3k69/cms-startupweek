import type { ZodError } from "zod";

/** Premier message d'erreur par champ (validation zod des formulaires). */
export function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function userOptions(users: { id: string; name: string; active: boolean }[]) {
  return users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }));
}
