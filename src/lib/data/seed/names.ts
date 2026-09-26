/**
 * Viviers de noms et de textes fictifs (aucune personne réelle).
 */
import type { Persona } from "../../domain/types";

export const FIRST_F = [
  "Camille", "Léa", "Manon", "Chloé", "Sarah", "Inès", "Emma", "Julie", "Laura", "Marie", "Pauline", "Clara", "Lucie", "Anaïs",
  "Mathilde", "Élodie", "Charlotte", "Margot", "Juliette", "Océane", "Nadia", "Yasmine", "Salomé", "Amandine", "Aurore", "Céline",
  "Sophie", "Nathalie", "Émilie", "Fatou", "Aïcha", "Leïla", "Hélène", "Agathe", "Zoé", "Louise", "Alice", "Jeanne", "Noémie",
  "Morgane", "Estelle", "Sonia", "Lina", "Maëlle", "Justine", "Coralie", "Audrey", "Victoire",
];

export const FIRST_M = [
  "Thomas", "Nicolas", "Julien", "Maxime", "Antoine", "Alexandre", "Hugo", "Lucas", "Mehdi", "Romain", "Kevin", "Florian",
  "Guillaume", "Pierre", "Benjamin", "Adrien", "Quentin", "Baptiste", "Olivier", "Sébastien", "Jérôme", "Vincent", "Yann", "Samir",
  "Moussa", "Ibrahim", "Théo", "Arthur", "Louis", "Paul", "Clément", "Damien", "Fabien", "Grégory", "Loïc", "Rémi", "Cédric",
  "Tristan", "Bilal", "Nathan", "Jonathan", "Axel", "Gaëtan", "Malik", "Hervé", "Franck",
];

export const LAST = [
  "Martin", "Bernard", "Dubois", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre", "Michel",
  "Garcia", "Bertrand", "Roux", "Vincent", "Fournier", "Morel", "Girard", "André", "Mercier", "Dupont", "Lambert", "Bonnet", "François",
  "Legrand", "Faure", "Rousseau", "Blanc", "Guérin", "Muller", "Henry", "Roussel", "Perrin", "Morin", "Gauthier", "Dumont", "Lopez",
  "Chevalier", "Robin", "Masson", "Sanchez", "Nguyen", "Boyer", "Denis", "Lemaire", "Duval", "Joly", "Roche", "Meyer", "Meunier",
  "Perez", "Dufour", "Barbier", "Brun", "Brunet", "Schmitt", "Leroux", "Colin", "Renard", "Arnaud", "Rolland", "Aubert", "Giraud",
  "Leclerc", "Vidal", "Bourgeois", "Renaud", "Lemoine", "Picard", "Gaillard", "Lacroix", "Fabre", "Dupuis", "Hubert", "Rivière",
  "Le Gall", "Adam", "Rey", "Moulin", "Berger", "Lecomte", "Fleury", "Deschamps", "Maillard", "Aubry", "Vasseur", "Le Roux", "Jacquet",
  "Collet", "Prévost", "Poirier", "Royer", "Huet", "Baron", "Dupuy", "Pons", "Carré", "Breton", "Rémy", "Guyot", "Marty", "Cousin",
  "Benali", "Bensaïd", "Traoré", "Koné", "Mbaye", "Ndiaye", "Cherif", "Bouzid", "Amrani", "Diop", "Sow", "Mansour", "Tran", "Pham",
  "Da Silva", "Ferreira", "Kowalski", "Rossi", "Haddad", "Ait Ali",
];

/** Profils internationaux (prénom, nom, ville, pays, indicatif). */
export const INTERNATIONAL: [string, string, string, string][] = [
  ["Sofia", "Rossi", "Milan", "Italie"],
  ["Lukas", "Weber", "Genève", "Suisse"],
  ["Emma", "Johansson", "Stockholm", "Suède"],
  ["Carlos", "Mendes", "Lisbonne", "Portugal"],
  ["Ana", "García", "Barcelone", "Espagne"],
  ["Priya", "Sharma", "Londres", "Royaume-Uni"],
  ["Daniel", "O'Connor", "Dublin", "Irlande"],
  ["Chloé", "Tremblay", "Montréal", "Canada"],
  ["Amara", "Okafor", "Bruxelles", "Belgique"],
  ["Jonas", "Peeters", "Bruxelles", "Belgique"],
  ["Youssef", "El Idrissi", "Casablanca", "Maroc"],
  ["Awa", "Sarr", "Dakar", "Sénégal"],
  ["Luca", "Bianchi", "Lausanne", "Suisse"],
  ["Elena", "Popescu", "Bucarest", "Roumanie"],
];

export const CITIES_FR = [
  "Paris", "Paris", "Paris", "Lyon", "Lyon", "Bordeaux", "Nantes", "Lille", "Marseille", "Toulouse", "Rennes", "Montpellier",
  "Strasbourg", "Nice", "Grenoble", "Annecy", "Tours", "Rouen", "Caen", "Dijon", "Angers", "Brest", "Aix-en-Provence", "Versailles",
  "Boulogne-Billancourt", "La Rochelle", "Biarritz", "Metz",
];

export const JOBS: Record<Persona, string[]> = {
  tech: ["Développeur full-stack", "Data analyst", "Ingénieure DevOps", "CTO freelance", "Product designer", "Développeuse mobile", "Ingénieur logiciel", "Data scientist", "Consultant IT"],
  non_tech: [
    "Responsable commerciale", "Chef de projet marketing", "Consultant RH", "Pharmacienne", "Infirmière libérale", "Architecte d'intérieur",
    "Coach sportif", "Gérant de restaurant", "Juriste", "Kinésithérapeute", "Chargée de communication", "Agent immobilier", "Responsable logistique",
    "Photographe indépendant", "Étudiante en école de commerce",
  ],
  reconversion: ["Ex-conseiller bancaire", "Ex-professeure des écoles", "En reconversion (ex-logistique)", "Ex-cadre commerciale", "Ex-infirmier", "Ex-contrôleur de gestion", "En reconversion (ex-hôtellerie)"],
};

export const MOTIVATIONS: Record<Persona, string[]> = {
  tech: [
    "Je code depuis 8 ans mais je n'ai jamais lancé mon propre produit : je veux une semaine cadrée pour sortir un MVP et le confronter à de vrais utilisateurs.",
    "Développeur back-end, j'ai tendance à sur-ingénierer. J'ai besoin d'un cadre pour prioriser et livrer vite.",
    "Je veux tester l'intégration d'agents IA dans mon SaaS avant de chercher mes premiers clients.",
    "J'ai déjà un prototype mais aucun utilisateur : je veux apprendre à tester et à pitcher.",
    "Data scientist, je veux transformer un side-project en produit et valider qu'il y a un marché.",
    "Je veux aller vite avec le no-code plutôt que tout développer moi-même, et rencontrer d'autres fondateurs.",
    "Freelance tech, je veux lancer mon propre SaaS pour sortir de la vente de jours.",
  ],
  non_tech: [
    "J'ai une idée d'application depuis deux ans mais aucune compétence technique : je veux comprendre le no-code et repartir avec un MVP que je peux montrer.",
    "Commerciale depuis 12 ans, je connais mon marché ; il me manque la méthode pour construire et tester le produit.",
    "Je vis chaque jour un problème de coordination dans mon métier et je veux construire l'outil qui le résout.",
    "Je veux valider mon idée auprès de vrais utilisateurs avant d'investir mes économies.",
    "Je gère un restaurant et je veux digitaliser une partie de mon activité avec un produit que je pourrais revendre à d'autres.",
    "J'ai besoin d'un environnement intensif, loin du quotidien, pour avancer enfin sur mon projet.",
    "Je veux maîtriser les outils IA et no-code pour ne plus dépendre d'une agence.",
    "Mon associé est parti : je dois reprendre le produit seule et avoir un MVP à montrer aux investisseurs.",
  ],
  reconversion: [
    "En reconversion après 15 ans dans la banque, je veux valider mon projet avant d'y consacrer mes indemnités.",
    "Je quitte l'enseignement pour entreprendre ; la StartupWeek est mon test grandeur nature.",
    "Après un licenciement économique, je veux transformer mon expertise métier en produit digital.",
    "Je veux me reconvertir dans l'entrepreneuriat tech et apprendre les bons réflexes produit.",
    "Congé de reconversion en cours : j'ai 3 mois pour prouver que mon idée tient la route.",
  ],
};

export const AVAILABILITY = [
  "Disponible à 100 % sur la semaine",
  "Congés posés pour la session",
  "Freelance, agenda bloqué",
  "En fin de contrat, disponible",
  "Disponible (télétravail possible le soir)",
  "En reconversion, disponible à temps plein",
];

export const HEARD_FROM = ["Instagram", "LinkedIn", "Publicité Meta", "Google", "Bouche-à-oreille", "Podcast Build in Public", "Newsletter", "Ami alumni", "Lyon Start Up", "École"];

/** Idées de projets (nom, secteur, cible, pitch). Les trois premiers s'inspirent des témoignages du site. */
export const PROJECT_IDEAS: { name: string; sector: string; market: string; tagline: string }[] = [
  { name: "Next-Elec", sector: "Greentech / énergie", market: "Particuliers et syndics de copropriété", tagline: "Diagnostic et devis d'installation de bornes de recharge en 3 minutes" },
  { name: "WePilot", sector: "SaaS B2B", market: "PME de services (10-50 salariés)", tagline: "Le copilote de pilotage des PME : trésorerie, charge et marges en un tableau de bord" },
  { name: "DeltaConcept", sector: "Proptech / architecture", market: "Architectes d'intérieur indépendants", tagline: "Plans d'aménagement générés par IA à partir d'une simple photo" },
  { name: "Kidoo Learn", sector: "Edtech", market: "Parents d'enfants de 6 à 11 ans", tagline: "Des mini-défis de lecture personnalisés par IA, 10 minutes par jour" },
  { name: "Pousse Verte", sector: "Agritech urbaine", market: "Restaurants et cantines", tagline: "Micro-pousses cultivées localement, livrées en abonnement" },
  { name: "Soignéo", sector: "Santé", market: "Infirmiers libéraux", tagline: "Coordination des soins à domicile sans appels ni SMS perdus" },
  { name: "Fintrack", sector: "Fintech", market: "Freelances et indépendants", tagline: "Trésorerie prévisionnelle automatique et provision des charges" },
  { name: "TableZen", sector: "Food / restauration", market: "Restaurants indépendants", tagline: "Réservations, no-show et avis clients gérés par un assistant IA" },
  { name: "Artisano", sector: "Marketplace", market: "Artisans du bâtiment", tagline: "La marketplace des chantiers de rénovation de moins de 5 000 €" },
  { name: "RecrutFlow", sector: "RH / HR tech", market: "PME qui recrutent", tagline: "Pré-qualification des candidats par entretien vidéo asynchrone" },
  { name: "Petsy", sector: "Services aux particuliers", market: "Propriétaires d'animaux", tagline: "Garde d'animaux entre voisins vérifiés" },
  { name: "LegalEase", sector: "Legaltech", market: "Créateurs d'entreprise", tagline: "Statuts, pacte et formalités guidés pas à pas" },
  { name: "Fermio", sector: "Agritech", market: "Exploitations maraîchères", tagline: "Planification des cultures et vente directe en un outil" },
  { name: "Stud'Home", sector: "Proptech", market: "Étudiants et propriétaires", tagline: "Colocations étudiantes vérifiées, bail et garant en ligne" },
  { name: "ClimaScore", sector: "Greentech", market: "PME industrielles", tagline: "Bilan carbone simplifié et plan d'action en une semaine" },
  { name: "Budgy", sector: "Fintech", market: "Jeunes actifs", tagline: "Le coach budget qui parle comme un ami" },
  { name: "TutoPro", sector: "Edtech", market: "Artisans et TPE", tagline: "Micro-formations vidéo pour digitaliser son activité" },
  { name: "Voyageo", sector: "Tourisme", market: "Voyageurs solo", tagline: "Itinéraires sur mesure générés par IA et validés par des locaux" },
  { name: "Kapsul", sector: "Cosmétique / e-commerce", market: "Femmes 25-45 ans", tagline: "Routine de soin personnalisée en capsules rechargeables" },
  { name: "NeuroNote", sector: "Santé mentale", market: "Psychologues libéraux", tagline: "Prise de notes et suivi patient sécurisés, conformes HDS" },
  { name: "Bâtisseo", sector: "Construction", market: "Conducteurs de travaux", tagline: "Comptes rendus de chantier dictés et partagés en 2 minutes" },
  { name: "ShopLocal", sector: "Commerce de proximité", market: "Commerçants de centre-ville", tagline: "Click & collect mutualisé pour les commerces d'une même rue" },
  { name: "Assistia", sector: "IA / productivité", market: "Dirigeants de TPE", tagline: "Un assistant IA qui trie les emails et prépare les devis" },
  { name: "DocuFlow", sector: "SaaS B2B", market: "Cabinets comptables", tagline: "Collecte automatique des pièces justificatives clients" },
  { name: "Oasis Coliving", sector: "Immobilier", market: "Télétravailleurs", tagline: "Coliving pour nomades digitaux en ville moyenne" },
  { name: "Cuisto", sector: "Food", market: "Familles actives", tagline: "Menus de la semaine et liste de courses générés en 30 secondes" },
  { name: "Asso+", sector: "Civic tech", market: "Associations locales", tagline: "Adhésions, bénévoles et subventions dans une seule app" },
  { name: "MobiLink", sector: "Mobilité", market: "Zones rurales", tagline: "Covoiturage domicile-travail organisé par les employeurs" },
  { name: "FitMum", sector: "Sport / santé", market: "Jeunes mamans", tagline: "Programmes de remise en forme post-natale encadrés par des kinés" },
  { name: "ReWear", sector: "Mode circulaire", market: "Marques de vêtements", tagline: "Seconde main en marque blanche pour les marques françaises" },
  { name: "EventLoop", sector: "Événementiel", market: "Organisateurs de séminaires", tagline: "Logistique de séminaire automatisée de l'invitation au bilan" },
  { name: "Mediko", sector: "Santé", market: "Pharmacies", tagline: "Rappels de renouvellement d'ordonnance par SMS" },
  { name: "Tribu Sport", sector: "Sport", market: "Clubs amateurs", tagline: "Convocations, covoiturage et cotisations des clubs amateurs" },
  { name: "Vinoteca", sector: "E-commerce", market: "Amateurs de vin", tagline: "Box de vins de vignerons indépendants, accords mets-vins par IA" },
  { name: "Paperless Pro", sector: "SaaS B2B", market: "Artisans", tagline: "Devis, factures et relances en 3 clics depuis le chantier" },
  { name: "CareGiver+", sector: "Silver économie", market: "Aidants familiaux", tagline: "Planning partagé et relais entre aidants d'un proche âgé" },
];
