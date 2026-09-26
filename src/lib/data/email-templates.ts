/**
 * Modèles d'emails de production (source unique) : repris des emails n8n du site
 * (vouvoiement, sauf le Digital Starter Kit), sans pièce jointe annoncée — les
 * documents passent par un lien personnel {{lien_document}} complété à l'envoi.
 *
 * Utilisés par le jeu de démo et par la migration `…_crm_email_delivery.sql`
 * (générée depuis ce fichier : `npx tsx scripts/email-templates-sql.ts`).
 * Une fois en base, les modèles se modifient dans Emails → Modèles.
 *
 * Les noms comptent : le code retrouve un modèle par catégorie + mot-clé
 * (« présentiel », « distanciel », « refus », « entretien », « convocation »,
 * « réclamation », « chaud », « acompte », « Envoi de facture », « J+3 »…).
 */
import type { TemplateCategory } from "../domain/types";

export interface TemplateDef {
  id: string;
  name: string;
  category: TemplateCategory;
  subject: string;
  body: string;
  /** Workflow n8n dont le modèle reprend l'email. */
  replacesN8n?: string;
}

const SIGNATURE = "\n\nBien cordialement,\nL'équipe StartupWeek";

export const EMAIL_TEMPLATES: TemplateDef[] = [
  /* ─────────────── Accusés de réception des formulaires du site ─────────────── */
  {
    id: "tpl_ack_candidature",
    name: "Accusé — candidature",
    category: "accuse_reception",
    subject: "Candidature reçue - StartupWeek",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Merci pour votre candidature ! Nous l'avons bien reçue et notre équipe va examiner attentivement votre profil et votre projet.\n\n" +
      "Session demandée : {{session}}\nDates : {{dates_session}}\nLieu : {{lieu}}\n\n" +
      "Prochaines étapes :\n" +
      "- Examen de votre dossier (2 à 3 jours ouvrés)\n" +
      "- Entretien de sélection si votre profil correspond : nous vous contactons pour convenir d'un échange\n" +
      "- Réponse définitive par email, avec toutes les informations pratiques\n\n" +
      "En attendant, découvrez notre programme et les témoignages de nos anciens participants : https://www.startupweek.tech\n\n" +
      "Une question ? Répondez simplement à cet email." +
      SIGNATURE,
    replacesN8n: "Candidature event",
  },
  {
    id: "tpl_ack_contact",
    name: "Accusé — contact",
    category: "accuse_reception",
    subject: "Réponse à votre demande - StartupWeek",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Merci de nous avoir contactés. Nous avons bien reçu votre message et vous répondrons sous 24 à 48 heures (jours ouvrés).\n\n" +
      "Objet : {{objet}}\n\n" +
      "En attendant, vous trouverez peut-être la réponse à votre question dans notre FAQ : https://www.startupweek.tech/faq\n\n" +
      "Besoin d'une réponse plus rapide ? Écrivez-nous à contact@startupweek.tech ou appelez le 07 71 80 02 78." +
      SIGNATURE,
    replacesN8n: "Contact",
  },
  {
    id: "tpl_ack_entreprise",
    name: "Accusé — demande entreprise",
    category: "accuse_reception",
    subject: "Demande entreprise reçue - StartupWeek",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Merci pour votre demande concernant notre offre Entreprise : nous sommes ravis de l'intérêt que vous portez à StartupWeek.\n\n" +
      "Entreprise : {{entreprise}}\n\n" +
      "Prochaines étapes :\n" +
      "- Analyse de votre demande : notre équipe étudie vos besoins et vos objectifs\n" +
      "- Appel de découverte sous 24 à 48 heures (jours ouvrés)\n" +
      "- Proposition personnalisée : un devis détaillé et sur mesure\n" +
      "- Organisation de votre session, une fois la proposition validée\n\n" +
      "Nos formules pour les entreprises : https://www.startupweek.tech/offre-entreprise\n" +
      "Besoin de nous joindre rapidement ? entreprise@startupweek.tech ou 07 71 80 02 78." +
      SIGNATURE,
    replacesN8n: "Entreprise",
  },
  {
    id: "tpl_ack_accompagnement",
    name: "Accusé — accompagnement",
    category: "accuse_reception",
    subject: "Demande d'accompagnement reçue - StartupWeek",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Merci pour votre demande d'accompagnement ! Nous sommes ravis de pouvoir vous aider à faire avancer votre projet.\n\n" +
      "Offre choisie : {{offre}}\n\n" +
      "Prochaines étapes :\n" +
      "- Analyse de votre demande et de votre projet\n" +
      "- Prise de contact sous 24 à 48 heures (jours ouvrés) pour un échange personnalisé\n" +
      "- Proposition d'un plan d'accompagnement adapté à vos objectifs\n\n" +
      "Nos accompagnements : https://www.startupweek.tech/accompagnements\n" +
      "Une question ? accompagnement@startupweek.tech ou 07 71 80 02 78." +
      SIGNATURE,
    replacesN8n: "Accompagnements",
  },
  {
    id: "tpl_ack_partenariat",
    name: "Accusé — partenariat",
    category: "accuse_reception",
    subject: "Demande de partenariat reçue - StartupWeek",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Nous avons bien reçu votre demande de partenariat et vous remercions de votre intérêt pour StartupWeek.\n\n" +
      "Organisation : {{entreprise}}\n\n" +
      "Prochaines étapes :\n" +
      "- Examen de votre proposition par notre équipe\n" +
      "- Appel sous 24 à 48 heures (jours ouvrés) pour échanger sur les synergies possibles\n" +
      "- Co-construction d'un partenariat sur mesure\n\n" +
      "En savoir plus : https://www.startupweek.tech/partenaires\n" +
      "Une question ? partenariats@startupweek.tech ou 07 71 80 02 78." +
      SIGNATURE,
    replacesN8n: "Partenariats",
  },
  {
    id: "tpl_ack_reclamation",
    name: "Accusé — réclamation (formulaire)",
    category: "accuse_reception",
    subject: "Réclamation reçue - StartupWeek",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Nous avons bien reçu votre réclamation, enregistrée sous la référence {{numero_reclamation}}. Elle est transmise à notre responsable qualité, qui l'analysera et vous répondra sous 48 heures ouvrées." +
      SIGNATURE,
    replacesN8n: "Reclamation",
  },
  {
    id: "tpl_dsk",
    name: "Digital Starter Kit — envoi",
    category: "accuse_reception",
    subject: "🎁 Ton Digital Starter Kit StartupWeek est prêt",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Merci pour ta demande ! Voici ton Digital Starter Kit : une acculturation gratuite pour poser les bases du digital, de l'IA et du MVP avant d'intégrer un programme StartupWeek.\n\n" +
      "Accéder au kit : https://www.startupweek.tech/digital-starter-kit\n\n" +
      "Ce que tu vas y trouver :\n" +
      "- Comprendre ce qu'est un MVP et comment le cadrer\n" +
      "- Les bases du produit digital (site, app, SaaS, no-code, IA)\n" +
      "- Le vocabulaire essentiel : front, back, API, authentification, hébergement\n" +
      "- Comment prioriser un périmètre de MVP réaliste\n" +
      "- Les erreurs fréquentes des porteurs de projet non-tech\n\n" +
      "Prochaine étape : quand tu te sens prêt(e), découvre nos programmes ou candidate directement sur https://www.startupweek.tech/candidature\n\n" +
      "À très vite,\nL'équipe StartupWeek",
    replacesN8n: "Digital Starter Kit",
  },
  {
    id: "tpl_dsk_j3",
    name: "Digital Starter Kit — suite (J+3)",
    category: "nurturing",
    subject: "Ton Digital Starter Kit : et maintenant ?",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Il y a quelques jours, tu as reçu ton Digital Starter Kit. Tu as pu y jeter un œil ?\n\n" +
      "Pour passer de l'idée au MVP, deux options :\n" +
      "- Découvrir les prochaines sessions StartupWeek : https://www.startupweek.tech/events\n" +
      "- Faire le point sur ton projet avec notre équipe : réponds simplement à cet email\n\n" +
      "Et si tu n'as pas encore ouvert le kit, il t'attend ici : https://www.startupweek.tech/digital-starter-kit\n\n" +
      "À très vite,\nL'équipe StartupWeek",
  },

  /* ─────────────── Candidatures ─────────────── */
  {
    id: "tpl_entretien",
    name: "Invitation à l'entretien",
    category: "candidature",
    subject: "Votre entretien StartupWeek — {{date_entretien}}",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Merci pour votre candidature à la session {{session}} ({{code_session}}). Nous vous proposons un entretien de sélection d'environ 30 minutes le {{date_entretien}}.\n\n" +
      "L'échange se fait en visio ; le lien vous sera communiqué avant le rendez-vous. Si ce créneau ne vous convient pas, répondez simplement à cet email pour en convenir d'un autre.\n\n" +
      "À très bientôt,\nL'équipe StartupWeek",
  },
  {
    id: "tpl_accept_presentiel",
    name: "Acceptation — présentiel",
    category: "candidature",
    subject: "🎉 Votre candidature est acceptée — {{session}}",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Excellente nouvelle : votre candidature pour la session {{session}} ({{code_session}}) est acceptée. Félicitations !\n\n" +
      "Dates : du {{date_debut}} au {{date_fin}}\nLieu : {{lieu}}\n\n" +
      "Pour confirmer votre place, merci de régler l'acompte de {{montant_acompte}} : {{lien_paiement}}\n\n" +
      "Le solde sera à régler avant le début de la session, conformément à nos conditions générales de vente. Les informations pratiques (adresse exacte, horaires, matériel) vous seront envoyées avec votre convocation.\n\n" +
      "Bienvenue dans l'aventure,\nL'équipe StartupWeek",
  },
  {
    id: "tpl_accept_distanciel",
    name: "Acceptation — distanciel",
    category: "candidature",
    subject: "🎉 Votre candidature est acceptée — {{session}} (en ligne)",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Excellente nouvelle : votre candidature pour la session en ligne {{session}} ({{code_session}}) est acceptée. Félicitations !\n\n" +
      "Dates : du {{date_debut}} au {{date_fin}}\nFormat : en ligne (distanciel)\n\n" +
      "Pour confirmer votre place, merci de régler l'acompte de {{montant_acompte}} : {{lien_paiement}}\n\n" +
      "Le solde sera à régler avant le début de la session, conformément à nos conditions générales de vente. Toutes les informations pour préparer votre session vous seront envoyées avec votre convocation.\n\n" +
      "Bienvenue dans l'aventure,\nL'équipe StartupWeek",
  },
  {
    id: "tpl_refus",
    name: "Refus de candidature",
    category: "candidature",
    subject: "Votre candidature StartupWeek",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Merci pour votre candidature et pour le temps que vous nous avez consacré. Après une étude attentive, nous ne sommes pas en mesure de la retenir pour la session {{session}}.\n\n" +
      "Ce n'est pas un jugement sur votre projet : nous pensons qu'il gagnera à mûrir avant une StartupWeek. Notre Digital Starter Kit, gratuit, est un bon point de départ : https://www.startupweek.tech/digital-starter-kit\n\n" +
      "Nous serons heureux d'étudier une nouvelle candidature de votre part pour une prochaine session." +
      SIGNATURE,
  },

  /* ─────────────── Qualiopi ─────────────── */
  {
    id: "tpl_convocation",
    name: "Convocation",
    category: "qualiopi",
    subject: "Convocation — {{session}} ({{date_debut}})",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Nous avons le plaisir de vous convoquer à la formation {{session}} ({{code_session}}).\n\n" +
      "Dates : du {{date_debut}} au {{date_fin}}\nDurée : {{duree}}\nLieu : {{lieu}}\n\n" +
      "Le programme détaillé, le livret d'accueil et le règlement intérieur vous sont transmis sur simple demande en réponse à cet email.\n\n" +
      "Besoin d'un aménagement (situation de handicap, contrainte particulière) ? Répondez à cet email : notre référent handicap vous recontactera.\n\n" +
      "À très bientôt,\nL'équipe StartupWeek",
  },
  {
    id: "tpl_reclamation_accuse",
    name: "Accusé de réception — réclamation",
    category: "qualiopi",
    subject: "Votre réclamation {{numero_reclamation}} : accusé de réception",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Nous accusons réception de votre réclamation {{numero_reclamation}} du {{date_reception}}. Elle a été transmise à notre responsable qualité, qui l'analyse et vous apportera une réponse détaillée dans les meilleurs délais." +
      SIGNATURE,
  },
  {
    id: "tpl_eval_chaud",
    name: "Questionnaire à chaud",
    category: "qualiopi",
    subject: "Votre avis sur la session {{session}} (2 minutes)",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Merci d'avoir participé à la session {{session}} ({{code_session}}) ! Votre avis nous aide à améliorer chaque édition : pouvez-vous répondre à notre questionnaire de satisfaction (2 minutes) ?\n\n" +
      "{{lien_questionnaire}}\n\n" +
      "Merci d'avance,\nL'équipe StartupWeek",
  },

  /* ─────────────── Facturation ─────────────── */
  {
    id: "tpl_facture_envoi",
    name: "Envoi de facture",
    category: "facturation",
    subject: "Facture {{numero}} — StartupWeek",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Veuillez trouver votre facture {{numero}} d'un montant de {{montant}}, à régler avant le {{echeance}} : {{lien_document}}\n\n" +
      "Règlement : {{lien_paiement}}\n\n" +
      "Merci pour votre confiance,\nL'équipe StartupWeek",
  },
  {
    id: "tpl_facture_acompte",
    name: "Facture d'acompte",
    category: "facturation",
    subject: "Votre acompte pour {{session}} — facture {{numero}}",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Voici la facture d'acompte {{numero}} ({{montant}}) pour la session {{session}} : {{lien_document}}\n\n" +
      "Règlement : {{lien_paiement}}\n\n" +
      "Le règlement de l'acompte confirme votre inscription.\n\n" +
      "Merci pour votre confiance,\nL'équipe StartupWeek",
  },
  {
    id: "tpl_avoir_envoi",
    name: "Envoi d'avoir",
    category: "facturation",
    subject: "Avoir {{numero}} — StartupWeek",
    body: "Bonjour {{prenom}},\n\nVeuillez trouver l'avoir {{numero}} d'un montant de {{montant}} : {{lien_document}}" + SIGNATURE,
  },
  {
    id: "tpl_facture_rappel",
    name: "Rappel avant échéance",
    category: "facturation",
    subject: "Rappel : facture {{numero}} à régler avant le {{echeance}}",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Petit rappel : la facture {{numero}} ({{montant}}) arrive à échéance le {{echeance}}.\n\n" +
      "Facture : {{lien_document}}\nRèglement : {{lien_paiement}}\n\n" +
      "Si vous avez déjà effectué le règlement, merci de ne pas tenir compte de ce message." +
      SIGNATURE,
  },
  {
    id: "tpl_relance_facture_j3",
    name: "Relance facture J+3",
    category: "facturation",
    subject: "Rappel : facture {{numero}} en attente de règlement",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Sauf erreur de notre part, la facture {{numero}} d'un montant de {{montant}}, arrivée à échéance le {{echeance}}, reste à régler.\n\n" +
      "Facture : {{lien_document}}\nRèglement : {{lien_paiement}}\n\n" +
      "Si vous avez déjà effectué le règlement, merci de ne pas tenir compte de ce message." +
      SIGNATURE,
  },
  {
    id: "tpl_relance_facture_j10",
    name: "Relance facture J+10",
    category: "facturation",
    subject: "Relance : facture {{numero}} impayée",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Malgré notre précédent rappel, la facture {{numero}} d'un montant de {{montant}}, échue le {{echeance}}, reste impayée.\n\n" +
      "Facture : {{lien_document}}\nRèglement : {{lien_paiement}}\n\n" +
      "Merci de procéder au règlement dans les meilleurs délais. Conformément à nos conditions générales de vente, une place en session peut être libérée si le solde n'est pas réglé à temps. En cas de difficulté, répondez à cet email : nous trouverons une solution ensemble." +
      SIGNATURE,
  },
  {
    id: "tpl_mise_en_demeure",
    name: "Mise en demeure",
    category: "facturation",
    subject: "Mise en demeure — facture {{numero}} impayée",
    body:
      "Bonjour,\n\n" +
      "Malgré nos relances, la facture {{numero}} d'un montant de {{montant}}, échue le {{echeance}}, reste impayée.\n\n" +
      "Nous vous mettons en demeure de la régler sous 8 jours : {{lien_paiement}}\nFacture : {{lien_document}}\n\n" +
      "À défaut, des pénalités de retard seront appliquées conformément à nos conditions générales de vente et à l'article L441-10 du Code de commerce." +
      SIGNATURE,
  },
  {
    id: "tpl_devis_envoi",
    name: "Envoi de devis",
    category: "facturation",
    subject: "Votre devis StartupWeek {{numero}}",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Comme convenu, voici notre proposition {{numero}} d'un montant de {{montant}} HT, valable jusqu'au {{validite}} : {{lien_document}}\n\n" +
      "Un simple « bon pour accord » en réponse à cet email suffit pour lancer l'organisation. Nous restons à votre disposition pour l'ajuster à vos contraintes." +
      SIGNATURE,
  },

  /* ─────────────── Relances (envoi manuel depuis la fiche) ─────────────── */
  {
    id: "tpl_relance_devis",
    name: "Relance devis",
    category: "relance",
    subject: "Votre proposition StartupWeek",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Avez-vous pu prendre connaissance de notre proposition ? Nous restons disponibles pour en discuter et l'ajuster à vos contraintes (dates, format, nombre de participants).\n\n" +
      "Il suffit de répondre à cet email." +
      SIGNATURE,
  },
  {
    id: "tpl_relance_contact",
    name: "Relance après échange",
    category: "relance",
    subject: "Suite à notre échange — StartupWeek",
    body:
      "Bonjour {{prenom}},\n\n" +
      "Je reviens vers vous suite à notre échange. Avez-vous pu avancer dans votre réflexion ? Nous restons à votre disposition pour répondre à vos questions.\n\n" +
      "Il suffit de répondre à cet email." +
      SIGNATURE,
  },
];

/** Séquence du Digital Starter Kit (déclenchée par le formulaire du site). */
export const DSK_SEQUENCE = {
  id: "seq_dsk",
  name: "Digital Starter Kit",
  description: "Envoi du kit à la demande, puis email de suite à J+3 (contacts ayant accepté les communications).",
  trigger: "digital_starter_kit" as const,
  steps: [
    { id: "seq_dsk_s1", delayDays: 0, channel: "email" as const, label: "Envoi du kit", templateId: "tpl_dsk" },
    { id: "seq_dsk_s2", delayDays: 3, channel: "email" as const, label: "Suite à J+3", templateId: "tpl_dsk_j3" },
  ],
};

/** Variables {{…}} d'un texte (ordre d'apparition, sans doublon). */
export function templateVariables(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g), (m) => m[1])));
}
