/** Libellés propres au module Marketing (campagnes publicitaires, A/B tests, promotion des sessions). */
import type { Option } from "@/lib/domain/constants";
import type {
  AdCreative,
  AdPlatform,
  CampaignObjective,
  CampaignStatus,
  ExperimentChannel,
  ExperimentMetric,
  ExperimentStatus,
} from "@/lib/domain/types";

export const AD_PLATFORMS: Option<AdPlatform>[] = [
  { value: "meta", label: "Meta (Facebook / Instagram)", tone: "info" },
  { value: "linkedin", label: "LinkedIn Ads", tone: "violet" },
];

/** Libellé court (tableaux, badges). */
export const PLATFORM_SHORT: Record<AdPlatform, string> = { meta: "Meta", linkedin: "LinkedIn" };

export const CAMPAIGN_OBJECTIVES: Option<CampaignObjective>[] = [
  { value: "notoriete", label: "Notoriété" },
  { value: "trafic", label: "Trafic vers le site" },
  { value: "leads", label: "Génération de leads" },
  { value: "conversions", label: "Conversions (candidatures)" },
  { value: "retargeting", label: "Retargeting" },
];

export const CAMPAIGN_STATUSES: Option<CampaignStatus>[] = [
  { value: "brouillon", label: "Brouillon", tone: "neutral" },
  { value: "active", label: "Active", tone: "success" },
  { value: "en_pause", label: "En pause", tone: "warning" },
  { value: "terminee", label: "Terminée", tone: "info" },
];

export const CREATIVE_FORMATS: Option<AdCreative["format"]>[] = [
  { value: "image", label: "Image" },
  { value: "video", label: "Vidéo" },
  { value: "carrousel", label: "Carrousel" },
  { value: "texte", label: "Texte" },
];

export const EXPERIMENT_CHANNELS: Option<ExperimentChannel>[] = [
  { value: "publicite", label: "Créas publicitaires", tone: "info" },
  { value: "site", label: "Page du site", tone: "accent" },
  { value: "email", label: "Email", tone: "violet" },
];

export const EXPERIMENT_STATUSES: Option<ExperimentStatus>[] = [
  { value: "brouillon", label: "Brouillon", tone: "neutral" },
  { value: "en_cours", label: "En cours", tone: "success" },
  { value: "termine", label: "Terminé", tone: "info" },
  { value: "abandonne", label: "Abandonné", tone: "danger" },
];

/** Métrique = conversions / expositions ; libellés du numérateur et du dénominateur. */
export const EXPERIMENT_METRICS: Record<ExperimentMetric, { label: string; exposures: string; conversions: string; channels: ExperimentChannel[] }> = {
  ctr: { label: "Taux de clic (CTR)", exposures: "Impressions", conversions: "Clics", channels: ["publicite"] },
  taux_lead: { label: "Taux de lead par clic", exposures: "Clics", conversions: "Leads", channels: ["publicite"] },
  conversion: { label: "Taux de conversion", exposures: "Visiteurs exposés", conversions: "Conversions", channels: ["site"] },
  ouverture: { label: "Taux d'ouverture", exposures: "Envois", conversions: "Ouvertures", channels: ["email"] },
  clic: { label: "Taux de clic email", exposures: "Envois", conversions: "Clics", channels: ["email"] },
};

export const metricOptions = (channel: ExperimentChannel): Option<ExperimentMetric>[] =>
  (Object.keys(EXPERIMENT_METRICS) as ExperimentMetric[])
    .filter((m) => EXPERIMENT_METRICS[m].channels.includes(channel))
    .map((m) => ({ value: m, label: EXPERIMENT_METRICS[m].label }));

export const CONFIDENCE_OPTIONS = [
  { value: "90", label: "90 %" },
  { value: "95", label: "95 % (recommandé)" },
  { value: "99", label: "99 %" },
];

/** Conventions UTM : une seule façon de nommer, pour que l'attribution du CRM fonctionne. */
export const UTM_SOURCES: { value: string; label: string; medium: string }[] = [
  { value: "meta_ads", label: "Meta Ads (Facebook / Instagram)", medium: "paid_social" },
  { value: "linkedin_ads", label: "LinkedIn Ads", medium: "paid_social" },
  { value: "linkedin", label: "LinkedIn (organique)", medium: "social" },
  { value: "instagram", label: "Instagram (organique)", medium: "social" },
  { value: "newsletter", label: "Newsletter", medium: "email" },
  { value: "partenaire", label: "Partenaire / école", medium: "referral" },
  { value: "podcast", label: "Podcast", medium: "audio" },
];

export const UTM_MEDIUMS = ["paid_social", "social", "email", "referral", "cpc", "audio", "display"].map((m) => ({ value: m, label: m }));

/** Source UTM par régie (liens générés depuis une campagne). */
export const PLATFORM_UTM_SOURCE: Record<AdPlatform, string> = { meta: "meta_ads", linkedin: "linkedin_ads" };
