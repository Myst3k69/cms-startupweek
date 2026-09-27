import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  FileText,
  FolderKanban,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Library,
  Mail,
  Megaphone,
  Mic2,
  Building2,
  Receipt,
  Rocket,
  Settings,
  Target,
  ShieldCheck,
  Users,
  Workflow,
  BellRing,
  type LucideIcon,
} from "lucide-react";
import type { Section } from "@/lib/auth/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section: Section;
  /** Mots-clés pour la palette de commandes. */
  keywords?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Pilotage",
    items: [
      { href: "/", label: "Tableau de bord", icon: LayoutDashboard, section: "dashboard", keywords: "accueil home cockpit" },
      { href: "/analytics", label: "Analytics", icon: BarChart3, section: "analytics", keywords: "statistiques kpi funnel trafic" },
    ],
  },
  {
    label: "Commercial",
    items: [
      { href: "/demandes", label: "Demandes entrantes", icon: Inbox, section: "demandes", keywords: "formulaires leads inbox" },
      { href: "/contacts", label: "Contacts", icon: Users, section: "contacts", keywords: "personnes crm" },
      { href: "/organisations", label: "Organisations", icon: Building2, section: "organisations", keywords: "écoles entreprises partenaires" },
      { href: "/pipeline", label: "Pipeline", icon: KanbanSquare, section: "pipeline", keywords: "opportunités deals ventes" },
      { href: "/relances", label: "Relances & tâches", icon: BellRing, section: "relances", keywords: "tâches séquences follow-up" },
      { href: "/emails", label: "Emails", icon: Mail, section: "emails", keywords: "templates envois" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/marketing", label: "Campagnes & A/B tests", icon: Target, section: "marketing", keywords: "publicité ads meta facebook instagram linkedin ab test utm audience promotion roas" },
    ],
  },
  {
    label: "Programmes",
    items: [
      { href: "/candidatures", label: "Candidatures", icon: FileText, section: "candidatures", keywords: "candidats admissions" },
      { href: "/sessions", label: "Sessions & événements", icon: CalendarDays, section: "sessions", keywords: "events bootcamp startup week émargement" },
      { href: "/projets", label: "Projets candidats", icon: Rocket, section: "projets", keywords: "startups mvp" },
      { href: "/intervenants", label: "Intervenants", icon: Mic2, section: "intervenants", keywords: "formateurs mentors jury" },
      { href: "/ressources", label: "Ressources", icon: Library, section: "ressources", keywords: "pdf documents templates" },
    ],
  },
  {
    label: "Qualité & finance",
    items: [
      { href: "/qualiopi", label: "Qualiopi", icon: ShieldCheck, section: "qualiopi", keywords: "qualité indicateurs audit réclamations satisfaction" },
      { href: "/facturation", label: "Facturation", icon: Receipt, section: "facturation", keywords: "factures devis paiements stripe qonto" },
    ],
  },
  {
    label: "Site & système",
    items: [
      { href: "/contenus", label: "Contenus du site", icon: Megaphone, section: "contenus", keywords: "blog articles cms calendrier éditorial" },
      { href: "/automatisations", label: "Automatisations", icon: Workflow, section: "automatisations", keywords: "n8n workflows règles webhooks" },
      { href: "/parametres", label: "Paramètres", icon: Settings, section: "parametres", keywords: "équipe rôles réglages" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);

/** Icônes réutilisées ailleurs. */
export { BookOpenCheck, FolderKanban };
