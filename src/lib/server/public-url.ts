/**
 * Base des liens publics envoyés par email (documents, désinscription).
 * PUBLIC_APP_URL (ex. un domaine personnalisé https://crm.startupweek.tech), sinon
 * l'URL de production Vercel, sinon l'origine de la requête.
 */
export function publicBaseUrl(request?: Request): string {
  const configured = process.env.PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production}`;
  return request ? new URL(request.url).origin : "http://localhost:3000";
}
