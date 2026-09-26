/**
 * Libellés FR des champs spécifiques des 8 formulaires du site (`Submission.fields`)
 * et « humanisation » des valeurs brutes (slugs, tranches, booléens).
 */
import { labelOf, PROJECT_STAGES } from "@/lib/domain/constants";
import type { LeadSource, SubmissionType } from "@/lib/domain/types";

export const FIELD_LABELS: Record<string, string> = {
  companySize: "Taille de l'entreprise",
  participantsNumber: "Nombre de participants",
  participants: "Nombre de participants",
  budget: "Budget",
  format: "Format souhaité",
  serviceName: "Prestation demandée",
  service: "Prestation demandée",
  projectStage: "Stade du projet",
  stade: "Stade du projet",
  partnershipType: "Type de partenariat",
  audience: "Public visé",
  venueCity: "Ville souhaitée",
  venue: "Lieu souhaité",
  dates: "Dates envisagées",
  preferredDate: "Date souhaitée",
  period: "Période souhaitée",
  timeline: "Échéance",
  deadline: "Échéance",
  eventCode: "Session",
  sessionCode: "Session",
  session: "Session",
  preferredDates: "Dates souhaitées",
  topic: "Sujet",
  intent: "Intention",
  disponibilite: "Disponibilités",
  prenom: "Prénom",
  type: "Catégorie",
  sessionName: "Session concernée",
  sector: "Secteur",
  industry: "Secteur",
  jobTitle: "Fonction",
  role: "Fonction",
  position: "Fonction",
  website: "Site web",
  city: "Ville",
  country: "Pays",
  objectives: "Objectifs",
  objective: "Objectif",
  goal: "Objectif",
  needs: "Besoins",
  pack: "Pack",
  packs: "Packs",
  offer: "Offre",
  offerName: "Offre",
  heardFrom: "Nous a connus via",
  source: "Provenance",
  linkedin: "LinkedIn",
  organization: "Organisation",
  orgName: "Organisation",
  schoolName: "École",
  school: "École",
  studentsCount: "Nombre d'étudiants",
  level: "Niveau",
  persona: "Profil",
  motivation: "Motivation",
  availability: "Disponibilités",
  funding: "Financement",
  frequency: "Fréquence",
  duration: "Durée",
  resource: "Ressource téléchargée",
  kitName: "Ressource téléchargée",
  complaintType: "Type de réclamation",
  leadId: "Identifiant du tunnel",
  projectName: "Nom du projet",
  projectDescription: "Description du projet",
  teamSize: "Taille de l'équipe",
  mode: "Modalité",
  language: "Langue",
  newsletter: "Inscription newsletter",
};

const VALUE_LABELS: Record<string, string> = {
  // formats
  presentiel: "Présentiel",
  distanciel: "Distanciel",
  hybride: "Hybride",
  en_ligne: "En ligne",
  online: "En ligne",
  villa: "En villa (résidentiel)",
  intra: "Intra-entreprise",
  inter: "Inter-entreprises",
  journee: "Journée",
  demi_journee: "Demi-journée",
  semaine: "Semaine (7 jours)",
  week_end: "Week-end",
  weekend: "Week-end",
  mois: "Mois",
  sur_mesure: "Sur mesure",
  atelier: "Atelier",
  conference: "Conférence",
  hackathon: "Hackathon",
  seminaire: "Séminaire",
  // tailles
  tpe: "TPE (< 10 salariés)",
  pme: "PME (10-249 salariés)",
  eti: "ETI (250-4 999 salariés)",
  grand_groupe: "Grand groupe (5 000+)",
  ge: "Grande entreprise",
  startup: "Startup",
  independant: "Indépendant",
  association: "Association",
  // partenariats
  sponsoring: "Sponsoring",
  mecenat: "Mécénat",
  media: "Partenariat média",
  ecole: "École / université",
  lieu: "Mise à disposition d'un lieu",
  jury: "Jury",
  mentor: "Mentorat",
  mentorat: "Mentorat",
  intervenant: "Intervention",
  co_organisation: "Co-organisation",
  financement: "Financement",
  distribution: "Distribution / prescription",
  institutionnel: "Institutionnel",
  technologique: "Partenariat technologique",
  // publics
  etudiants: "Étudiants",
  salaries: "Salariés",
  collaborateurs: "Collaborateurs",
  dirigeants: "Dirigeants",
  managers: "Managers",
  entrepreneurs: "Entrepreneurs",
  porteurs_de_projet: "Porteurs de projet",
  demandeurs_emploi: "Demandeurs d'emploi",
  grand_public: "Grand public",
  alumni: "Alumni",
  intrapreneurs: "Intrapreneurs",
  // accompagnement
  coaching: "Coaching individuel",
  accompagnement_mvp: "Accompagnement MVP",
  audit: "Audit / diagnostic",
  diagnostic: "Diagnostic MVP gratuit",
  formation: "Formation",
  atelier_ia: "Atelier IA",
  no_code: "No-code",
  // stades
  idea: "Idée",
  idee: "Idée",
  cadrage: "Cadrage",
  prototype: "Prototype",
  mvp: "MVP",
  lance: "Lancé",
  launched: "Lancé",
  traction: "Traction",
  // financement
  personnel: "Fonds personnels",
  entreprise: "Entreprise",
  opco: "OPCO",
  france_travail: "France Travail",
  cpf: "CPF",
  region: "Région",
  // stades déclarés (tunnel / DSK)
  commence: "Projet commencé",
  refonte: "Refonte d'un projet existant",
  incertain: "Pas encore sûr(e)",
  // profils & intentions
  tech: "Profil tech",
  non_tech: "Profil non-tech",
  reconversion: "Reconversion",
  candidature: "Candidature",
  // provenance newsletter
  bio_instagram: "Lien en bio Instagram",
  footer: "Pied de page du site",
  // budget déclaré
  finance: "Financement externe (OPCO, entreprise…)",
  // catégories de réclamation
  qualite: "Qualité pédagogique",
  paiement: "Paiement",
  remboursement: "Remboursement",
  annulation: "Annulation",
  accessibilite: "Accessibilité / handicap",
  autre: "Autre",
  // booléens
  true: "Oui",
  false: "Non",
  oui: "Oui",
  non: "Non",
  yes: "Oui",
  no: "Non",
};

/** Libellé lisible d'une clé de champ (repli : camelCase / snake_case → « Mots séparés »). */
export function fieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function euros(raw: string): string {
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n)) return raw;
  return `${n.toLocaleString("fr-FR")} €`;
}

/** Tranches « 5k-10k », « <5k », « 50000+ », « 10-20 » → texte FR. */
function humanizeRange(v: string, unit: string): string | undefined {
  const k = (s: string) => (/k$/i.test(s) ? String(Number(s.slice(0, -1)) * 1000) : s);
  const fmt = (s: string) => (unit === "€" ? euros(k(s)) : `${Number(k(s)).toLocaleString("fr-FR")}${unit ? ` ${unit}` : ""}`);
  let m = /^(\d+(?:[.,]\d+)?k?)\s*[-–à]\s*(\d+(?:[.,]\d+)?k?)$/i.exec(v);
  if (m) return unit === "€" ? `${euros(k(m[1])).replace(" €", "")} à ${fmt(m[2])}` : `${Number(k(m[1])).toLocaleString("fr-FR")} à ${fmt(m[2])}`;
  m = /^(?:<|lt_?|moins[-_](?:de[-_])?)\s*(\d+(?:[.,]\d+)?k?)$/i.exec(v);
  if (m) return `Moins de ${fmt(m[1])}`;
  m = /^(?:>|gt_?|plus[-_](?:de[-_])?)\s*(\d+(?:[.,]\d+)?k?)$/i.exec(v) ?? /^(\d+(?:[.,]\d+)?k?)\s*\+$/i.exec(v);
  if (m) return `Plus de ${fmt(m[1])}`;
  m = /^(\d+(?:[.,]\d+)?k?)$/i.exec(v);
  if (m) return fmt(m[1]);
  return undefined;
}

/** Valeur lisible d'un champ de formulaire. */
export function fieldValue(key: string, raw: string | undefined | null): string {
  if (raw === undefined || raw === null) return "—";
  const v = String(raw).trim();
  if (!v) return "—";
  if (key === "budget") return humanizeRange(v, "€") ?? humanizeSlug(v);
  if (key === "participantsNumber" || key === "participants" || key === "studentsCount") return humanizeRange(v, key === "studentsCount" ? "étudiants" : "participants") ?? humanizeSlug(v);
  if (key === "companySize" || key === "teamSize") {
    const r = humanizeRange(v, key === "companySize" ? "salariés" : "personnes");
    if (r) return r;
  }
  if (key === "projectStage" || key === "stade") {
    const opt = PROJECT_STAGES.find((o) => o.value === v);
    if (opt) return labelOf(PROJECT_STAGES, opt.value);
  }
  // Listes « a,b,c » (packs, publics…)
  if (/^[a-z0-9_]+(,\s*[a-z0-9_]+)+$/.test(v)) return v.split(/,\s*/).map((p) => humanizeSlug(p)).join(", ");
  return humanizeSlug(v);
}

function humanizeSlug(v: string): string {
  const lower = v.toLowerCase();
  if (VALUE_LABELS[lower]) return VALUE_LABELS[lower];
  // Uniquement les « slugs » : on ne touche pas au texte libre saisi par l'internaute.
  if (!/^[a-z0-9_+-]+$/.test(v)) return v;
  if (/^\d/.test(v)) return v.replace(/_/g, " ");
  const s = v.replace(/[_-]+/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Ordre d'affichage : champs connus d'abord (ordre du dictionnaire), puis les autres. */
export function orderedFields(fields: Record<string, string>): [string, string][] {
  const known = Object.keys(FIELD_LABELS);
  return Object.entries(fields)
    .filter(([k, v]) => k !== "leadId" && v !== undefined && v !== null && String(v).trim() !== "")
    .sort(([a], [b]) => {
      const ia = known.indexOf(a);
      const ib = known.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
}

/** Mot-clé de recherche du template d'accusé de réception par type de formulaire. */
export const ACK_KEYWORDS: Record<SubmissionType, string[]> = {
  candidature: ["candidature"],
  contact: ["contact"],
  entreprise: ["entreprise", "b2b"],
  accompagnement: ["accompagnement"],
  partenariat: ["partenariat", "partenaire"],
  digital_starter_kit: ["starter", "kit", "dsk"],
  reclamation: ["réclamation", "reclamation"],
  newsletter: ["newsletter"],
};

export const SUBMISSION_SOURCE: Record<SubmissionType, LeadSource> = {
  candidature: "site_candidature",
  contact: "site_contact",
  entreprise: "site_entreprise",
  accompagnement: "site_accompagnement",
  partenariat: "site_partenariat",
  digital_starter_kit: "digital_starter_kit",
  reclamation: "site_contact",
  newsletter: "newsletter",
};
