/**
 * Carte de migration des 13 workflows n8n « StartupWeek » vers le CRM.
 * Référence statique (audit de l'instance n8n) — les liens vers les règles du CRM
 * sont résolus dynamiquement via AutomationRule.replacesN8n.
 */
import type { Tone } from "@/lib/domain/constants";

export type MigrationStatus = "remplace" | "a_decommissionner" | "hors_perimetre";

export const MIGRATION_STATUS: Record<MigrationStatus, { label: string; tone: Tone }> = {
  remplace: { label: "Remplacé", tone: "success" },
  a_decommissionner: { label: "À décommissionner après bascule", tone: "warning" },
  hors_perimetre: { label: "Hors périmètre", tone: "neutral" },
};

export interface N8nWorkflow {
  name: string;
  role: string;
  weaknesses: string[];
  replacedBy: { kind: "endpoint" | "regle" | "trigger" | "module"; label: string; href?: string }[];
  status: MigrationStatus;
}

const FORM_WEAKNESSES = ["Webhook public sans signature", "Consentement forcé à true", "Upsert Airtable qui écrase les données", "Aucune relance si pas de réponse"];

export const N8N_WORKFLOWS: N8nWorkflow[] = [
  {
    name: "Candidature event",
    role: "Formulaire de candidature → Airtable (Candidatures) → email d'accusé SMTP",
    weaknesses: [...FORM_WEAKNESSES, "Pas d'idempotence (doublons au rechargement)"],
    replacedBy: [
      { kind: "endpoint", label: "POST /api/intake/candidature" },
      { kind: "module", label: "Candidatures (statuts + emails automatiques)", href: "/candidatures" },
    ],
    status: "a_decommissionner",
  },
  {
    name: "Contact",
    role: "Formulaire de contact → Airtable → accusé SMTP",
    weaknesses: FORM_WEAKNESSES,
    replacedBy: [
      { kind: "endpoint", label: "POST /api/intake/contact" },
      { kind: "module", label: "Demandes entrantes (SLA 48 h)", href: "/demandes" },
    ],
    status: "a_decommissionner",
  },
  {
    name: "Entreprise",
    role: "Demande entreprise / école → Airtable → accusé SMTP",
    weaknesses: [...FORM_WEAKNESSES, "Organisations en doublon (nom exact)"],
    replacedBy: [
      { kind: "endpoint", label: "POST /api/intake/entreprise" },
      { kind: "module", label: "Pipeline B2B", href: "/pipeline" },
    ],
    status: "a_decommissionner",
  },
  {
    name: "Accompagnements",
    role: "Demande d'accompagnement (Startup Ready, Residency…) → Airtable → accusé",
    weaknesses: FORM_WEAKNESSES,
    replacedBy: [{ kind: "endpoint", label: "POST /api/intake/accompagnement" }],
    status: "a_decommissionner",
  },
  {
    name: "Partenariats",
    role: "Proposition de partenariat / lieu → Airtable → accusé",
    weaknesses: FORM_WEAKNESSES,
    replacedBy: [{ kind: "endpoint", label: "POST /api/intake/partenaire" }],
    status: "a_decommissionner",
  },
  {
    name: "Reclamation",
    role: "Formulaire de réclamation → Airtable → accusé SMTP",
    weaknesses: [...FORM_WEAKNESSES.slice(0, 3), "Pas de numérotation ni de suivi du délai de 48 h (Qualiopi ind. 31)"],
    replacedBy: [
      { kind: "endpoint", label: "POST /api/intake/reclamation" },
      { kind: "module", label: "Qualiopi · réclamations", href: "/qualiopi" },
    ],
    status: "a_decommissionner",
  },
  {
    name: "Digital Starter Kit",
    role: "Téléchargement du kit gratuit → Airtable → email avec lien",
    weaknesses: [...FORM_WEAKNESSES.slice(0, 3), "Aucune séquence de nurturing après l'envoi"],
    replacedBy: [
      { kind: "endpoint", label: "POST /api/intake/starter-kit" },
      { kind: "module", label: "Séquence « Digital Starter Kit »", href: "/relances" },
    ],
    status: "a_decommissionner",
  },
  {
    name: "Consent Newsletter",
    role: "Inscription newsletter → Airtable (consentement)",
    weaknesses: ["Consentement forcé à true (non conforme RGPD)", "Pas de preuve horodatée du consentement", "Webhook public sans signature"],
    replacedBy: [{ kind: "endpoint", label: "POST /api/intake/newsletter (consentement explicite requis)" }],
    status: "a_decommissionner",
  },
  {
    name: "Sync Airtable -> Supabase",
    role: "Polling toutes les minutes d'Airtable pour alimenter public.event (site)",
    weaknesses: ["~4 300 appels Airtable / jour", "Jusqu'à 1 min de décalage", "Upserts qui écrasent les modifications"],
    replacedBy: [{ kind: "trigger", label: "Trigger SQL crm.sessions → public.event (temps réel, 0 appel)" }],
    status: "remplace",
  },
  {
    name: "Create or update Event",
    role: "Création / mise à jour d'une session dans Airtable et Supabase",
    weaknesses: ["Double saisie Airtable ↔ Supabase", "Aucun historique des modifications"],
    replacedBy: [
      { kind: "module", label: "Sessions & événements", href: "/sessions" },
      { kind: "trigger", label: "Trigger SQL de synchronisation site" },
    ],
    status: "remplace",
  },
  {
    name: "Ressources copy",
    role: "Copie des pièces jointes Airtable vers les tables ressources",
    weaknesses: ["URLs Airtable qui expirent (liens cassés sur le site)", "Fichiers dupliqués sans version"],
    replacedBy: [{ kind: "module", label: "Ressources (Supabase Storage, URL stable)", href: "/ressources" }],
    status: "remplace",
  },
  {
    name: "add ressources for event(s)",
    role: "Rattachement des ressources aux sessions",
    weaknesses: ["Envoie un email « test » à chaque exécution", "Rattachement écrasé à chaque passage"],
    replacedBy: [{ kind: "module", label: "Ressources ↔ sessions liées", href: "/ressources" }],
    status: "remplace",
  },
  {
    name: "Error workflow",
    role: "Alerte en cas d'échec d'un workflow de l'instance n8n",
    weaknesses: ["Alerte générique sans contexte métier"],
    replacedBy: [
      { kind: "module", label: "Journal des exécutions + alertes du CRM" },
      { kind: "endpoint", label: "GET /api/health (supervision)" },
    ],
    status: "hors_perimetre",
  },
];

/** Étapes de bascule du site vers le CRM (double écriture puis coupure de n8n). */
export const CUTOVER_STEPS: { title: string; detail: string }[] = [
  { title: "Partager le secret de signature", detail: "Générer INTAKE_SIGNING_SECRET côté CRM et le déclarer en CRM_INTAKE_SECRET dans le projet Vercel du site." },
  { title: "Rebrancher les routes /api/submit-*", detail: "Chaque route du site appelle /api/intake/<form> (signé), en parallèle du webhook n8n pendant 7 jours." },
  { title: "Comparer les deux flux", detail: "Vérifier dans le journal ci-dessous que chaque soumission arrive une fois (idempotence) avec le bon consentement." },
  { title: "Couper les webhooks n8n", detail: "Désactiver les 8 workflows de formulaire, puis le polling « Sync Airtable -> Supabase »." },
  { title: "Archiver Airtable", detail: "Export CSV de la base « CRM Startup Week » (preuve), puis passage en lecture seule." },
];
