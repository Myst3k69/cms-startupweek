/**
 * Démo uniquement : formation « en cours de rédaction » (plan + premières leçons),
 * pour montrer l'outil auteur sur un contenu inachevé.
 */
import { buildCourse, type BuiltCourse } from "./authoring";

export function iterationLabDraft(): BuiltCourse {
  return buildCourse(
    {
      id: "crs_iteration_lab",
      title: "Iteration Lab : faire grandir son MVP",
      slug: "iteration-lab-faire-grandir-son-mvp",
      subtitle: "Les 90 jours après le lancement : mesurer, itérer, trouver ses premiers clients",
      description: "Suite de « Construire son MVP avec l'IA » : piloter son produit par les données, itérer vite et structurer ses premières ventes.",
      status: "brouillon",
      level: "intermediaire",
      personas: [],
      audience: "Alumni StartupWeek et porteurs de projet disposant d'un MVP en ligne.",
      objectives: [
        "Mettre en place un tableau de bord d'indicateurs produit et l'analyser chaque semaine.",
        "Prioriser et livrer des itérations courtes à partir des retours utilisateurs.",
        "Structurer une démarche commerciale pour signer ses premiers clients.",
      ],
      prerequisites: "Avoir un MVP en ligne (ou suivi « Construire son MVP avec l'IA »).",
      durationHours: 20,
      priceCents: 0,
      vatRate: 20,
      inCatalog: false,
      accessDays: 183,
      sequential: true,
      eventIds: [],
      tags: ["Itération", "Growth", "Ventes"],
      authorIds: ["usr_karim"],
      speakerIds: ["spk_karim"],
      isTraining: true,
      evaluationMethods: "Quiz de fin de module et revue des livrables par un mentor.",
      assistance: "Mentor référent joignable depuis Mon espace, réponse sous 48 h ouvrées.",
      accessibility: "Accès en ligne 24 h/24 pendant 6 mois ; adaptations sur demande auprès de la référente handicap.",
      passingScore: 70,
      certificateMinProgress: 80,
    },
    [
      {
        key: "m01",
        title: "Piloter par les données",
        summary: "Choisir ses indicateurs, les suivre chaque semaine et en tirer des décisions.",
        objectives: ["Définir un indicateur principal et 3 indicateurs d'appui.", "Construire un tableau de bord hebdomadaire."],
        lessons: [
          {
            key: "m01-l01",
            title: "Votre indicateur principal",
            summary: "Choisir l'indicateur qui résume la valeur apportée à vos utilisateurs.",
            estimatedMinutes: 45,
            blocks: [
              {
                type: "texte",
                markdown:
                  "## À rédiger\n\nPlan : ce qu'est un indicateur principal, exemples par modèle économique, pièges (indicateurs de vanité), exercice d'application.",
              },
              { type: "checklist", title: "Critères d'un bon indicateur principal", items: ["Reflète la valeur reçue par l'utilisateur", "Mesurable chaque semaine", "Actionnable par l'équipe"] },
            ],
          },
          {
            key: "m01-l02",
            title: "Le tableau de bord hebdomadaire",
            summary: "Un tableau simple, tenu chaque semaine, qui déclenche des décisions.",
            estimatedMinutes: 60,
            blocks: [{ type: "texte", markdown: "## À rédiger\n\nPlan : sources de données, tableau Notion ou Airtable, revue hebdomadaire, décisions." }],
          },
        ],
      },
      {
        key: "m02",
        title: "Itérer vite",
        summary: "Transformer les retours en itérations livrées chaque semaine.",
        objectives: ["Prioriser un backlog d'itérations.", "Livrer et mesurer une itération par semaine."],
        lessons: [
          {
            key: "m02-l01",
            title: "Du retour utilisateur à l'itération",
            summary: "Collecter, trier et prioriser les retours.",
            estimatedMinutes: 50,
            blocks: [{ type: "texte", markdown: "## À rédiger\n\nPlan : canaux de retours, grille de tri, priorisation impact / effort." }],
          },
        ],
      },
      {
        key: "m03",
        title: "Premiers clients",
        summary: "Structurer une démarche commerciale simple et régulière.",
        objectives: ["Construire une liste de prospects qualifiés.", "Mener un entretien de vente."],
        lessons: [],
      },
    ],
  );
}
