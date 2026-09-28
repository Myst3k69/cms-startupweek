/**
 * Logistique des sessions (démo) : répertoire des lieux, sourcing, devis & dépenses fournisseurs,
 * activités, séjours et rétroplanning.
 *
 * - SW-0013 (Split, novembre) : lieu retenu (Villa Adriatica), devis, échéancier, activités,
 *   chambres & arrivées, infos pratiques, rétroplanning en cours.
 * - SW-0011 (Malaga / Alicante, octobre) : sourcing en cours (lieu pas encore retenu).
 * - SW-0015 (Cyclades, décembre) : sourcing démarré (dont une piste trouvée par l'assistant IA).
 * - Sessions passées : rattachées à leur lieu du répertoire (historique, notes).
 */
import type { ExpenseInstallment, SessionActivity, SessionExpense, SessionStay, Task, Venue, VenueOption } from "../../domain/types";
import { LOGISTICS_PLAYBOOK } from "../../domain/constants";
import { contactName } from "../../domain/selectors";
import type { SeedContext } from "./context";
import { stamps } from "./context";
import { evId } from "./events";
import { U } from "./team";

const DAY = 86_400_000;
const HOUR = 3_600_000;

type VenueSpec = Omit<Venue, "id" | "createdAt" | "updatedAt"> & { key: string; since: number };

const VENUES: VenueSpec[] = [
  {
    key: "adriatica", since: -420, name: "Villa Adriatica", kind: "villa", status: "valide", source: "recommandation", region: "Europe", country: "Croatie", city: "Split",
    address: "Put Firula 12, 21000 Split, Croatie", bedrooms: 7, beds: 14, workspaceSeats: 16,
    amenities: ["Wifi fibre", "Salle de travail", "Vidéoprojecteur / écran", "Piscine", "Jardin / terrasse", "Cuisine équipée", "Proche aéroport"],
    pricePerNightCents: 145000, priceNotes: "Haute saison (juin-septembre) : 1 900 €/nuit. Minimum 7 nuits. Ménage final inclus.",
    accessInfo: "Aéroport de Split (SPU) à 25 min en navette. Vieille ville à 15 min à pied.", accessibility: "Rez-de-chaussée de plain-pied, une chambre adaptée ; étage sans ascenseur.",
    website: "https://villa-adriatica.example.com", contactName: "Ivana Perić", contactEmail: "ivana@villa-adriatica.example.com", contactPhone: "+385 91 555 0142",
    rating: 5, notes: "Hôte très réactif. Salle de travail lumineuse pour 16. Prévoir un deuxième routeur 4G en secours (coupure en septembre).",
  },
  {
    key: "dar-amane", since: -400, name: "Riad Dar Amane", kind: "riad", status: "valide", source: "plateforme", region: "Hors Europe", country: "Maroc", city: "Marrakech",
    address: "Derb Sidi Bouloukat, Médina, Marrakech", bedrooms: 8, beds: 16, workspaceSeats: 14,
    amenities: ["Wifi fibre", "Salle de travail", "Jardin / terrasse", "Chef / traiteur sur place", "Accès PMR"],
    pricePerNightCents: 98000, priceNotes: "Pension complète possible (+35 €/pers./jour).", accessInfo: "Aéroport de Marrakech-Ménara à 20 min ; derniers 200 m à pied (médina).",
    accessibility: "Patio et deux chambres de plain-pied.", listingUrl: "https://www.example.com/annonces/riad-dar-amane", contactName: "Youssef Alaoui", contactEmail: "contact@riad-dar-amane.example.com",
    rating: 4, notes: "Très apprécié des participants. Wifi un peu faible sur la terrasse.",
  },
  {
    key: "meleze", since: -380, name: "Chalet Les Mélèzes", kind: "chalet", status: "valide", source: "manuel", region: "France", country: "France", city: "Morzine",
    bedrooms: 6, beds: 13, workspaceSeats: 12, amenities: ["Wifi fibre", "Salle de travail", "Cuisine équipée", "Parking"],
    pricePerNightCents: 120000, priceNotes: "Vacances scolaires : +30 %.", accessInfo: "Gare de Cluses à 35 min ; aéroport de Genève à 1 h 15.",
    accessibility: "Non accessible PMR (escaliers).", contactName: "Agence Alpes Séjours", contactEmail: "resa@alpes-sejours.example.fr", rating: 4, notes: "",
  },
  {
    key: "clos-st-vincent", since: -360, name: "Domaine du Clos Saint-Vincent", kind: "domaine", status: "valide", source: "manuel", region: "France", country: "France", city: "Saint-Émilion",
    bedrooms: 9, beds: 18, workspaceSeats: 20, amenities: ["Wifi fibre", "Salle de travail", "Vidéoprojecteur / écran", "Piscine", "Parking", "Proche gare"],
    pricePerNightCents: 135000, accessInfo: "Gare de Libourne à 12 min.", accessibility: "Salle de travail accessible ; chambres à l'étage.",
    website: "https://clos-saint-vincent.example.fr", contactName: "Sophie Laurent", contactEmail: "evenements@clos-saint-vincent.example.fr", rating: 5, notes: "Dégustation offerte le dernier soir.",
  },
  {
    key: "belle-epoque", since: -300, name: "Villa Belle Époque", kind: "villa", status: "valide", source: "plateforme", region: "France", country: "France", city: "Deauville",
    bedrooms: 7, beds: 14, workspaceSeats: 14, amenities: ["Wifi fibre", "Salle de travail", "Jardin / terrasse", "Parking", "Proche gare"],
    pricePerNightCents: 125000, accessInfo: "Gare de Trouville-Deauville à 8 min.", accessibility: "Rez-de-chaussée accessible, chambres à l'étage.", rating: 4, notes: "",
  },
  {
    key: "baan-talay", since: -330, name: "Villa Baan Talay", kind: "villa", status: "en_contact", source: "plateforme", region: "Hors Europe", country: "Thaïlande", city: "Koh Samui",
    bedrooms: 8, beds: 16, workspaceSeats: 16, amenities: ["Wifi fibre", "Salle de travail", "Piscine", "Chef / traiteur sur place", "Accès PMR"],
    pricePerNightCents: 88000, priceNotes: "Tarif 2027 à reconfirmer.", accessInfo: "Aéroport de Samui (USM) à 20 min.", rating: 5, notes: "Relancer pour les dates de mai 2027.",
  },
  // Sourcing SW-0011 (Costa del Sol / Costa Blanca)
  {
    key: "buganvillas", since: -26, name: "Villa Las Buganvillas", kind: "villa", status: "en_contact", source: "plateforme", region: "Europe", country: "Espagne", city: "Marbella",
    bedrooms: 6, beds: 12, workspaceSeats: 12, amenities: ["Wifi fibre", "Salle de travail", "Piscine", "Jardin / terrasse", "Proche aéroport"],
    pricePerNightCents: 140000, priceNotes: "Caution 3 000 €. Ménage 350 €.", accessInfo: "Aéroport de Malaga (AGP) à 45 min.",
    listingUrl: "https://www.example.com/annonces/villa-las-buganvillas", contactName: "Carmen Ortega", contactEmail: "carmen@buganvillas.example.es", notes: "Salle de travail = grand salon (12 places max).",
  },
  {
    key: "faro", since: -22, name: "Casa del Faro", kind: "villa", status: "en_contact", source: "recommandation", region: "Europe", country: "Espagne", city: "Jávea",
    bedrooms: 7, beds: 14, workspaceSeats: 16, amenities: ["Wifi fibre", "Salle de travail", "Vidéoprojecteur / écran", "Piscine", "Cuisine équipée"],
    pricePerNightCents: 120000, accessInfo: "Aéroport d'Alicante (ALC) à 1 h 10 ; Valence à 1 h 20.", contactName: "Jordi Serra", contactEmail: "jordi@casadelfaro.example.es", notes: "Recommandée par une alumni (SW-0007).",
  },
  {
    key: "olivos", since: -6, name: "Cortijo Los Olivos", kind: "domaine", status: "repere", source: "ia", region: "Europe", country: "Espagne", city: "Ronda",
    bedrooms: 8, beds: 16, workspaceSeats: 18, amenities: ["Wifi fibre", "Salle de travail", "Piscine", "Chef / traiteur sur place"],
    pricePerNightCents: 105000, priceNotes: "Estimation de l'assistant IA — à confirmer auprès du propriétaire.", accessInfo: "Aéroport de Malaga à 1 h 30 (route de montagne).",
    notes: "Trouvé par l'assistant IA (recherche « Costa del Sol, 24-31 octobre, 12 personnes »).",
  },
  {
    key: "mar-azul", since: -24, name: "Villa Mar Azul", kind: "villa", status: "ecarte", source: "plateforme", region: "Europe", country: "Espagne", city: "Altea",
    bedrooms: 5, beds: 10, amenities: ["Wifi fibre", "Piscine"], pricePerNightCents: 90000, accessInfo: "Aéroport d'Alicante à 50 min.", notes: "Pas d'espace de travail commun pour 12.",
  },
  // Sourcing SW-0015 (Paros)
  {
    key: "paros", since: -4, name: "Villa Paros Blue", kind: "villa", status: "repere", source: "ia", region: "Europe", country: "Grèce", city: "Naoussa (Paros)",
    bedrooms: 6, beds: 12, workspaceSeats: 12, amenities: ["Wifi fibre", "Piscine", "Jardin / terrasse"],
    pricePerNightCents: 70000, priceNotes: "Basse saison (décembre) : tarif estimé par l'assistant IA, à confirmer.", accessInfo: "Ferry depuis Le Pirée (3 h) ou vol Athènes → Paros (40 min).",
    notes: "Vérifier le chauffage et l'ouverture en décembre.",
  },
];

/** Lieu du répertoire correspondant au libellé « venue » historique d'une session. */
const VENUE_BY_LABEL: Record<string, string> = {
  "Villa Adriatica": "adriatica",
  "Riad Dar Amane": "dar-amane",
  "Chalet Les Mélèzes": "meleze",
  "Domaine du Clos Saint-Vincent": "clos-st-vincent",
  "Villa Belle Époque": "belle-epoque",
  "Villa Baan Talay": "baan-talay",
};

const vId = (key: string) => `ven_${key.replace(/-/g, "_")}`;

export function buildLogistics(ctx: SeedContext): void {
  const { clock } = ctx;

  ctx.data.venues = VENUES.map(({ key, since, ...v }) => ({ id: vId(key), ...stamps(ctx, clock.rel(since), clock.rel(Math.min(since + 20, -1))), ...v }));

  // Sessions rattachées à leur lieu (passées et à venir déjà réservées).
  ctx.data.events = ctx.data.events.map((e) => {
    const key = e.venue ? VENUE_BY_LABEL[e.venue] : undefined;
    return key ? { ...e, venueId: vId(key) } : e;
  });

  const split = ctx.data.events.find((e) => e.id === evId("SW-0013"));
  const spain = ctx.data.events.find((e) => e.id === evId("SW-0011"));
  const paros = ctx.data.events.find((e) => e.id === evId("SW-0015"));

  /* ── Sourcing ── */
  const options: VenueOption[] = [];
  const opt = (eventId: string, key: string, o: Omit<VenueOption, "id" | "createdAt" | "updatedAt" | "eventId" | "venueId" | "notes"> & { notes?: string }, since: number) =>
    options.push({ id: `vop_${eventId.replace("ev_", "")}_${key.replace(/-/g, "_")}`, ...stamps(ctx, clock.rel(since), clock.rel(Math.min(since + 3, -1))), eventId, venueId: vId(key), notes: "", ...o });
  if (split) opt(split.id, "adriatica", { stage: "retenu", quotedCents: 1_015_000, availability: "Disponible du 13 au 21 novembre", notes: "3e session sur place : conditions identiques à septembre." }, -75);
  if (spain) {
    opt(spain.id, "buganvillas", { stage: "option", quotedCents: 980_000, availability: "Libre du 23 au 31 octobre", optionUntil: clock.iso(clock.rel(5, 18)), notes: "Option gratuite 10 jours. Salle de travail limitée à 12." }, -25);
    opt(spain.id, "faro", { stage: "devis_recu", quotedCents: 840_000, availability: "Libre du 24 au 31 octobre", notes: "Meilleur rapport qualité/prix, mais 1 h 10 de l'aéroport." }, -21);
    opt(spain.id, "olivos", { stage: "identifie", availability: "À vérifier", notes: "Piste de l'assistant IA : demander un devis." }, -6);
    opt(spain.id, "mar-azul", { stage: "ecarte", quotedCents: 630_000, rejectReason: "Pas d'espace de travail commun", notes: "" }, -24);
  }
  if (paros) {
    opt(paros.id, "paros", { stage: "demande", availability: "Demande envoyée, en attente de réponse", notes: "" }, -4);
  }
  ctx.data.venueOptions = options;

  /* ── Activités (SW-0013) ── */
  const outings: SessionActivity[] = [];
  if (split) {
    const base = { eventId: split.id, notes: "" };
    const rows: Omit<SessionActivity, "id" | "createdAt" | "updatedAt" | "eventId" | "notes">[] = [
      { title: "Visite guidée du palais de Dioclétien", kind: "culture", status: "reserve", day: 2, start: "18:00", end: "19:30", location: "Vieille ville de Split", provider: "Split Walking Tours", costCents: 24_000, included: true },
      { title: "Randonnée au lever du soleil — colline de Marjan", kind: "sport", status: "idee", day: 3, start: "07:00", end: "08:30", location: "Parc de Marjan", included: true },
      { title: "Sortie bateau — îles de Šolta et Brač", kind: "team_building", status: "a_reserver", day: 4, start: "13:30", end: "18:30", location: "Port de Split", provider: "Adriatic Sails", contact: "+385 98 555 0190", costCents: 135_000, included: true },
      { title: "Dîner de clôture en konoba", kind: "gastronomie", status: "reserve", day: 7, start: "20:00", end: "23:00", location: "Konoba Varoš", provider: "Konoba Varoš", costCents: 78_000, included: true },
    ];
    rows.forEach((row, i) => outings.push({ id: `out_sw0013_${i + 1}`, ...stamps(ctx, clock.rel(-50 + i * 4), clock.rel(-10 + i)), ...base, ...row }));
  }
  ctx.data.outings = outings;

  /* ── Devis & dépenses fournisseurs ── */
  const expenses: SessionExpense[] = [];
  const inst = (id: string, label: string, amountCents: number, dueTs: number, paidTs?: number, method?: ExpenseInstallment["method"]): ExpenseInstallment => ({
    id,
    label,
    amountCents,
    dueAt: clock.iso(dueTs),
    paidAt: paidTs !== undefined ? clock.iso(clock.past(paidTs)) : undefined,
    method: paidTs !== undefined ? method : undefined,
  });
  if (split) {
    const start = Date.parse(split.startAt);
    const e = (id: string, since: number, x: Omit<SessionExpense, "id" | "createdAt" | "updatedAt" | "eventId">) => expenses.push({ id: `exp_sw0013_${id}`, ...stamps(ctx, clock.rel(since)), eventId: split.id, ...x });
    e("villa", -74, {
      category: "lieu", label: "Location Villa Adriatica — 8 nuits", supplier: "Villa Adriatica (Ivana Perić)", status: "accepte", amountCents: 1_015_000, venueId: vId("adriatica"),
      quoteRef: "VA-2026-118", receivedAt: clock.iso(clock.rel(-76)),
      installments: [inst("i1", "Acompte 30 %", 304_500, clock.rel(-70), clock.rel(-71), "virement"), inst("i2", "Solde", 710_500, start - 30 * DAY)],
      notes: "Caution 2 000 € restituée sous 7 jours après l'état des lieux.",
    });
    e("chef", -40, {
      category: "restauration", label: "Chef à domicile — 6 dîners + petits-déjeuners", supplier: "Chef Marko Babić", status: "accepte", amountCents: 240_000,
      installments: [inst("i1", "Acompte 50 %", 120_000, clock.rel(9)), inst("i2", "Solde sur place", 120_000, start + 6 * DAY)], notes: "Menu végétarien et sans gluten prévus.",
    });
    e("bateau", -12, {
      category: "activite", label: "Sortie bateau Šolta / Brač", supplier: "Adriatic Sails", status: "recu", amountCents: 135_000, activityId: "out_sw0013_3",
      quoteRef: "AS-4471", receivedAt: clock.iso(clock.rel(-11)), validUntil: clock.iso(clock.rel(8)), installments: [], notes: "Skipper inclus, 14 personnes max.",
    });
    e("visite", -30, {
      category: "activite", label: "Visite guidée du palais de Dioclétien", supplier: "Split Walking Tours", status: "accepte", amountCents: 24_000, activityId: "out_sw0013_1",
      installments: [inst("i1", "Paiement en ligne", 24_000, clock.rel(-29), clock.rel(-29), "plateforme")], notes: "",
    });
    e("konoba", -20, {
      category: "restauration", label: "Dîner de clôture (14 couverts)", supplier: "Konoba Varoš", status: "accepte", amountCents: 78_000, activityId: "out_sw0013_4",
      installments: [inst("i1", "Règlement sur place", 78_000, start + 6 * DAY)], notes: "",
    });
    e("navettes", -8, { category: "transport", label: "Navettes aéroport (arrivées et départs)", supplier: "Split Transfers", status: "demande", amountCents: 0, installments: [], notes: "Devis demandé pour 2 allers et 2 retours groupés." });
    const mentor = ctx.data.speakers.find((s) => s.id === (split.speakerIds[1] ?? split.speakerIds[0]));
    if (mentor) {
      e("honoraires", -45, {
        category: "intervenant", label: `Honoraires et déplacement — ${mentor.firstName} ${mentor.lastName}`, supplier: `${mentor.firstName} ${mentor.lastName}`, status: "accepte", amountCents: 150_000, speakerId: mentor.id,
        installments: [inst("i1", "Billets d'avion (remboursement)", 30_000, clock.rel(-20), clock.rel(-19), "virement"), inst("i2", "Honoraires (facture après la session)", 120_000, start + 21 * DAY)],
        notes: "",
      });
    }
  }
  if (spain) {
    expenses.push({
      id: "exp_sw0011_buganvillas", ...stamps(ctx, clock.rel(-18)), eventId: spain.id, category: "lieu", label: "Location Villa Las Buganvillas — 8 nuits", supplier: "Villa Las Buganvillas",
      status: "recu", amountCents: 980_000, venueId: vId("buganvillas"), receivedAt: clock.iso(clock.rel(-18)), validUntil: clock.iso(clock.rel(5, 18)), installments: [], notes: "Option posée jusqu'à la date de validité.",
    });
    expenses.push({
      id: "exp_sw0011_faro", ...stamps(ctx, clock.rel(-15)), eventId: spain.id, category: "lieu", label: "Location Casa del Faro — 8 nuits", supplier: "Casa del Faro",
      status: "recu", amountCents: 840_000, venueId: vId("faro"), receivedAt: clock.iso(clock.rel(-15)), validUntil: clock.iso(clock.rel(12)), installments: [], notes: "",
    });
  }
  ctx.data.expenses = expenses;

  /* ── Infos pratiques + séjours (SW-0013) ── */
  const stays: SessionStay[] = [];
  if (split) {
    const start = Date.parse(split.startAt);
    ctx.data.events = ctx.data.events.map((e) =>
      e.id !== split.id
        ? e
        : {
            ...e,
            logistics: {
              address: "Villa Adriatica — Put Firula 12, 21000 Split, Croatie",
              mapsUrl: "https://maps.example.com/?q=Put+Firula+12+Split",
              access: "Vol direct Paris → Split (2 h 15). Navettes groupées depuis l'aéroport le vendredi à 15 h et 19 h. En taxi : 25 min (environ 40 €).",
              nearestHub: "Aéroport de Split (SPU)",
              checkIn: "Vendredi 13 novembre à partir de 16 h (arrivée la veille du démarrage)",
              checkOut: "Samedi 21 novembre avant 11 h",
              meetingPoint: "Hall des arrivées, sortie B — panneau « StartupWeek »",
              shuttle: "Navettes aéroport : vendredi 15 h et 19 h ; retour samedi 8 h et 11 h.",
              onsiteContact: "Aurélien — +33 6 00 00 00 00",
              emergency: "Urgences européennes : 112. Hôpital KBC Split (Firule) à 5 min.",
              wifi: "Réseau « Adriatica-Work » — mot de passe communiqué sur place",
              meals: "Petits-déjeuners et dîners préparés par le chef ; déjeuners en ville (inclus). Signalez tout régime alimentaire avant le 1er novembre.",
              houseRules: "Calme à partir de 23 h. Piscine non surveillée.",
              whatToBring: ["Ordinateur portable et chargeur", "Adaptateur non nécessaire (prises européennes)", "Maillot de bain et coupe-vent", "Carte européenne d'assurance maladie", "Pièce d'identité valide"],
            },
          },
    );

    const apps = ctx.data.applications.filter((a) => a.eventId === split.id && a.status === "inscrite");
    const contacts = new Map(ctx.data.contacts.map((c) => [c.id, c]));
    const flights = ["Vol TO 4812 · Paris-Orly", "Vol U2 4527 · Lyon", "Vol EJU 3301 · Paris-CDG", "Vol TO 4812 · Paris-Orly", "Vol LX 1784 · Genève", "Vol VY 1830 · Nantes"];
    const diets = ["Végétarien", undefined, "Sans gluten", undefined, undefined, "Sans lactose"];
    // Tous les inscrits sauf le dernier (montre une ligne « à compléter »).
    apps.slice(0, Math.max(0, apps.length - 1)).forEach((a, i) => {
      const c = contacts.get(a.contactId);
      const arrival = start - DAY + (15 + (i % 3) * 2) * HOUR - 9.5 * HOUR;
      stays.push({
        id: `sty_sw0013_c${i + 1}`,
        ...stamps(ctx, clock.rel(-20 + i), clock.rel(-5 + (i % 4))),
        eventId: split.id,
        role: "participant",
        contactId: a.contactId,
        name: c ? contactName(c) : "Participant",
        confirmed: i % 4 !== 3,
        room: `Chambre ${Math.floor(i / 2) + 1}${i % 2 ? " (lit 2)" : " (lit 1)"}`,
        arrivalAt: clock.iso(arrival),
        arrivalMode: i === 4 ? "train" : "avion",
        arrivalRef: i === 4 ? "Ferry depuis Ancône (arrivée 7 h)" : flights[i % flights.length],
        departureAt: clock.iso(Date.parse(split.endAt) - 1 * HOUR),
        departureMode: "avion",
        shuttle: i !== 4,
        diet: diets[i % diets.length],
      });
    });
    // Intervenants du programme : tous logés sauf le dernier (ligne « à compléter »). L'équipe fixe dort
    // aux chambres 6-7, les intervenants de passage partagent la chambre 5 selon leurs jours.
    const programSpeakers = Array.from(new Set([...split.speakerIds, ...split.program.map((p) => p.speakerId).filter((x): x is string => Boolean(x))]));
    programSpeakers.slice(0, Math.max(0, programSpeakers.length - 1)).forEach((sid, i) => {
      const s = ctx.data.speakers.find((x) => x.id === sid);
      if (!s) return;
      const days = split.program.filter((p) => p.speakerId === sid).map((p) => p.day);
      const first = days.length ? Math.min(...days) : 1;
      const last = days.length ? Math.max(...days) : 7;
      const resident = i < 2;
      const arrival = resident ? start - DAY + 18 * HOUR - 9.5 * HOUR : start + (first - 2) * DAY + 19 * HOUR - 9.5 * HOUR;
      const departure = resident ? Date.parse(split.endAt) - HOUR : start + last * DAY + 8 * HOUR - 9.5 * HOUR;
      stays.push({
        id: `sty_sw0013_s${i + 1}`,
        ...stamps(ctx, clock.rel(-30), clock.rel(-6)),
        eventId: split.id,
        role: "intervenant",
        speakerId: sid,
        name: `${s.firstName} ${s.lastName}`,
        confirmed: i !== 3,
        room: resident ? (i === 0 ? "Chambre 6" : "Chambre 7 (lit 1)") : `Chambre 5 (J${first}-J${last})`,
        arrivalAt: clock.iso(arrival),
        arrivalMode: "avion",
        arrivalRef: resident ? "Vol TO 4812 · Paris-Orly" : "Vol à confirmer",
        departureAt: clock.iso(Math.max(arrival + 12 * HOUR, departure)),
        departureMode: "avion",
        shuttle: resident,
        notes: resident ? undefined : `Intervient J${first}${last !== first ? ` à J${last}` : ""}`,
      });
    });
  }
  ctx.data.stays = stays;

  /* ── Rétroplanning (tâches rattachées à SW-0013) ── */
  if (split) {
    const start = Date.parse(split.startAt);
    const tasks: Task[] = LOGISTICS_PLAYBOOK.map((p, i) => {
      const due = start + p.days * DAY;
      const done = due < clock.now - 2 * DAY ? due - DAY : undefined;
      return {
        id: `tsk_log_sw0013_${i + 1}`,
        ...stamps(ctx, clock.rel(-80), done ?? clock.rel(-80)),
        title: `${p.title} — ${split.code}`,
        kind: "admin",
        priority: p.priority,
        dueAt: clock.iso(due),
        doneAt: done ? clock.iso(clock.past(done)) : undefined,
        assigneeId: U.aurelien,
        related: { entity: "events", id: split.id },
        automated: true,
        notes: `Rétroplanning logistique · ${p.key}`,
      };
    });
    ctx.data.tasks = [...ctx.data.tasks, ...tasks];
  }
}
