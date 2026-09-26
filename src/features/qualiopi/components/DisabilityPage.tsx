"use client";

import * as React from "react";
import Link from "next/link";
import { Accessibility, CheckCircle2, CircleAlert, ExternalLink, HandHeart, Mail, Radar, Users } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useActions, useCollection, useLookup, useNow, useSession, useSettings } from "@/lib/hooks";
import { APPLICATION_STATUSES, EVENT_MODES, labelOf } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { Application } from "@/lib/domain/types";
import { date } from "@/lib/format";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  FormField,
  Modal,
  PageHeader,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
  useToast,
  type Column,
  type FilterDef,
} from "@/components/ui";
import { ContactLink, SessionLink } from "@/components/shared/entity-links";
import { printHref } from "@/features/documents/links";
import { DAY, isTrainingSession } from "../metrics";
import { userOptions } from "../form-utils";
import { QualiopiNav } from "./qualiopi-nav";

const NETWORK = [
  {
    name: "Agefiph — Ressource Handicap Formation (RHF)",
    scope: "Secteur privé",
    text: "Appui aux organismes de formation pour construire les aménagements (pédagogiques, techniques, organisationnels) d'un stagiaire en situation de handicap. Aides financières mobilisables (compensation, aides techniques).",
    url: "https://www.agefiph.fr",
  },
  {
    name: "FIPHFP",
    scope: "Fonction publique",
    text: "Fonds pour l'insertion des personnes handicapées dans la fonction publique : financement des aménagements pour les agents publics en formation.",
    url: "https://www.fiphfp.fr",
  },
  {
    name: "MDPH",
    scope: "Reconnaissance & orientation",
    text: "Maison départementale des personnes handicapées : reconnaissance de la qualité de travailleur handicapé (RQTH), prestation de compensation, orientation professionnelle.",
    url: "https://www.monparcourshandicap.gouv.fr",
  },
  {
    name: "Cap emploi",
    scope: "Emploi & maintien",
    text: "Accompagnement des personnes en situation de handicap vers l'emploi et dans leur parcours de formation, conseil aux employeurs. Réseau intégré à France Travail.",
    url: "https://www.francetravail.fr",
  },
];

const PROCEDURE = [
  { title: "Informer", text: "Mention de l'accessibilité et des coordonnées du référent handicap sur chaque fiche programme, le site et la convocation (ind. 1 et 26)." },
  { title: "Recueillir le besoin", text: "Question dédiée dans le formulaire de candidature, reprise lors de l'entretien de qualification — déclaration facultative et confidentielle." },
  { title: "Analyser avec la personne", text: "Entretien individuel avec le référent sous 5 jours ouvrés : situation, besoins de compensation, contraintes du lieu (villa, en ligne)." },
  { title: "Mettre en place les aménagements", text: "Supports adaptés, rythme et pauses, binôme, accessibilité du lieu ou bascule en ligne ; mobilisation du réseau (RHF Agefiph, MDPH, Cap emploi) si nécessaire." },
  { title: "Informer l'équipe pédagogique", text: "Transmission aux formateurs des seuls aménagements nécessaires (jamais du diagnostic), avec l'accord de la personne." },
  { title: "Suivre et évaluer", text: "Point pendant la session, retour dans l'évaluation à chaud, trace dans ce registre ; les difficultés alimentent le plan d'amélioration (ind. 32)." },
];

export function DisabilityPage() {
  const applications = useCollection("applications");
  const events = useCollection("events");
  const users = useCollection("users");
  const watch = useCollection("watchItems");
  const contacts = useLookup("contacts");
  const eventsById = useLookup("events");
  const settings = useSettings();
  const updateSettings = useCrm((s) => s.updateSettings);
  const now = useNow();
  const { canEdit } = useSession();
  const { log } = useActions();
  const toast = useToast();
  const canEditQualiopi = canEdit("qualiopi");
  const canEditRegister = canEditQualiopi || canEdit("candidatures");
  const [editing, setEditing] = React.useState<Application | null>(null);

  const lead = users.find((u) => u.id === settings.disabilityLeadId);
  const rows = React.useMemo(
    () => applications.filter((a) => a.accessibilityNeeds?.trim()).sort((a, b) => (eventsById.get(b.eventId)?.startAt ?? "").localeCompare(eventsById.get(a.eventId)?.startAt ?? "")),
    [applications, eventsById],
  );
  const treated = rows.filter((a) => a.accommodations?.trim());
  const upcomingRows = rows.filter((a) => {
    const ev = eventsById.get(a.eventId);
    return ev && Date.parse(ev.startAt) > now;
  });
  const watchYear = watch.filter((w) => w.kind === "handicap" && now - Date.parse(w.publishedAt) <= 365 * DAY).length;
  const upcomingSessions = React.useMemo(
    () => events.filter((e) => isTrainingSession(e) && Date.parse(e.startAt) > now).sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 6),
    [events, now],
  );

  const columns: Column<Application>[] = [
    { key: "contact", header: "Candidat·e", render: (a) => <ContactLink id={a.contactId} />, sort: (a) => contactName(contacts.get(a.contactId)), csv: (a) => contactName(contacts.get(a.contactId)) },
    {
      key: "session",
      header: "Session",
      render: (a) => (
        <span className="whitespace-nowrap">
          <SessionLink id={a.eventId} short />
          <span className="block text-xs text-muted-foreground">{date(eventsById.get(a.eventId)?.startAt)}</span>
        </span>
      ),
      sort: (a) => eventsById.get(a.eventId)?.startAt ?? "",
      csv: (a) => eventsById.get(a.eventId)?.code ?? "",
    },
    { key: "status", header: "Candidature", render: (a) => <StatusBadge options={APPLICATION_STATUSES} value={a.status} />, csv: (a) => labelOf(APPLICATION_STATUSES, a.status), hideBelow: "lg" },
    { key: "need", header: "Besoin déclaré", render: (a) => <span className="line-clamp-2 max-w-72 text-sm">{a.accessibilityNeeds}</span>, csv: (a) => a.accessibilityNeeds ?? "" },
    { key: "acc", header: "Aménagements", render: (a) => <span className="line-clamp-2 max-w-72 text-sm text-muted-foreground">{a.accommodations || "—"}</span>, csv: (a) => a.accommodations ?? "", hideBelow: "md" },
    {
      key: "treated",
      header: "Traitement",
      render: (a) =>
        a.accommodations?.trim() ? (
          <Badge tone="success" dot>
            Traité
          </Badge>
        ) : (
          <Badge tone="danger" dot>
            Non traité
          </Badge>
        ),
      sort: (a) => (a.accommodations?.trim() ? 1 : 0),
      csv: (a) => (a.accommodations?.trim() ? "Traité" : "Non traité"),
    },
  ];

  const filters: FilterDef<Application>[] = [
    { key: "treated", label: "Tous les traitements", options: [{ value: "non", label: "Non traités" }, { value: "oui", label: "Traités" }], predicate: (a, v) => (v === "oui" ? !!a.accommodations?.trim() : !a.accommodations?.trim()) },
    {
      key: "when",
      label: "Toutes les sessions",
      options: [{ value: "avenir", label: "Sessions à venir" }, { value: "passees", label: "Sessions passées" }],
      predicate: (a, v) => {
        const ev = eventsById.get(a.eventId);
        const future = ev ? Date.parse(ev.startAt) > now : false;
        return v === "avenir" ? future : !future;
      },
    },
  ];

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Qualiopi · indicateur 26"
        title="Accueil des personnes en situation de handicap"
        description="Registre des besoins déclarés et des aménagements, référent handicap, réseau de partenaires mobilisables et procédure d'accueil."
        breadcrumbs={[{ label: "Qualiopi", href: "/qualiopi" }, { label: "Handicap" }]}
      />
      <QualiopiNav />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Référent handicap</CardTitle>
              <CardDescription>Interlocuteur unique des stagiaires et de l'équipe pour les adaptations.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead ? (
              <div className="flex items-center gap-3">
                <Avatar name={lead.name} color={lead.color} size="lg" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.title}</p>
                  <a href={`mailto:${lead.email}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-accent-text hover:underline">
                    <Mail className="size-3" aria-hidden="true" /> {lead.email}
                  </a>
                </div>
              </div>
            ) : (
              <p className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm text-danger-text">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Aucun référent handicap désigné : exigence de l'indicateur 26.
              </p>
            )}
            {canEditQualiopi ? (
              <FormField label="Changer de référent" htmlFor="dl-select">
                <Select
                  id="dl-select"
                  value={settings.disabilityLeadId ?? ""}
                  onChange={(e) => {
                    updateSettings({ disabilityLeadId: e.target.value || undefined });
                    const u = users.find((x) => x.id === e.target.value);
                    toast({ title: u ? `Référent handicap : ${u.name}` : "Référent handicap retiré" });
                  }}
                  options={userOptions(users)}
                  placeholder="À désigner"
                />
              </FormField>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Coordonnées publiques : {settings.email} · {settings.phone}
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard label="Besoins déclarés" value={rows.length} hint={`${upcomingRows.length} pour une session à venir`} icon={Accessibility} />
          <StatCard label="Traités" value={`${treated.length}/${rows.length}`} hint="Aménagements définis et tracés" icon={CheckCircle2} />
          <StatCard label="Non traités" value={rows.length - treated.length} hint={rows.length - treated.length ? "À analyser avec la personne" : "Tous les besoins sont traités"} icon={CircleAlert} />
          <StatCard label="Veille handicap (12 mois)" value={watchYear} hint="Indicateur 26 — voir la veille" icon={Radar} />
        </div>
      </div>

      <section className="mb-8" aria-labelledby="reg-title">
        <h2 id="reg-title" className="mb-3 text-sm font-semibold text-foreground">
          Registre des besoins et aménagements
        </h2>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(a) => a.id}
          filters={filters}
          searchable={(a) => `${contactName(contacts.get(a.contactId))} ${a.accessibilityNeeds} ${a.accommodations ?? ""}`}
          onRowClick={(a) => setEditing(a)}
          exportName="registre-handicap"
          rowClassName={(a) => (!a.accommodations?.trim() ? "bg-danger-soft/40" : undefined)}
          emptyTitle="Aucun besoin déclaré"
          emptyDescription="Les besoins déclarés dans le formulaire de candidature apparaîtront ici (donnée confidentielle, accès restreint)."
        />
        <p className="mt-2 text-xs text-muted-foreground">Données de santé : ne consigner que le besoin d'adaptation, jamais le diagnostic. Accès limité aux personnes habilitées.</p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Procédure d'accueil</CardTitle>
              <CardDescription>Du premier contact au bilan — à présenter lors de l'audit.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {PROCEDURE.map((p, i) => (
                <li key={p.title} className="flex gap-3">
                  <span className="tabular inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-text">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.title}</p>
                    <p className="text-sm text-muted-foreground">{p.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-1.5">
                  <HandHeart className="size-4 text-accent-text" aria-hidden="true" /> Réseau d'orientation et de compensation
                </CardTitle>
                <CardDescription>Partenaires à mobiliser selon la situation de la personne.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {NETWORK.map((n) => (
                  <li key={n.name} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <a href={n.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-accent-text hover:underline">
                        {n.name} <ExternalLink className="size-3 text-faint" aria-hidden="true" />
                      </a>
                      <Badge tone="neutral">{n.scope}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{n.text}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-1.5">
                  <Users className="size-4 text-accent-text" aria-hidden="true" /> Accessibilité des prochaines sessions
                </CardTitle>
                <CardDescription>Mention publiée sur chaque fiche programme (ind. 1).</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune session de formation à venir.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {upcomingSessions.map((s) => (
                    <li key={s.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <SessionLink id={s.id} />
                        <span className="text-xs text-muted-foreground">
                          {labelOf(EVENT_MODES, s.mode)} · {date(s.startAt)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.accessibility || "Mention d'accessibilité manquante."}</p>
                      <Link href={printHref.programme(s.id)} target="_blank" className="mt-1 inline-block text-xs text-accent-text hover:underline">
                        Fiche programme →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AccommodationModal
        application={editing}
        readOnly={!canEditRegister}
        onClose={() => setEditing(null)}
        onSaved={(a, value) => log({ kind: "modification", entity: "applications", entityId: a.id, summary: value ? "Aménagements handicap définis" : "Aménagements handicap retirés" })}
      />
    </div>
  );
}

function AccommodationModal({ application, readOnly, onClose, onSaved }: { application: Application | null; readOnly: boolean; onClose: () => void; onSaved: (a: Application, value: string) => void }) {
  const contact = useLookup("contacts").get(application?.contactId ?? "");
  return (
    <Modal open={!!application} onClose={onClose} title={`Aménagements — ${contactName(contact)}`} description="Indicateur 26 · donnée confidentielle" size="lg">
      {application ? <AccommodationForm key={application.id} application={application} readOnly={readOnly} onClose={onClose} onSaved={onSaved} /> : null}
    </Modal>
  );
}

function AccommodationForm({ application, readOnly, onClose, onSaved }: { application: Application; readOnly: boolean; onClose: () => void; onSaved: (a: Application, value: string) => void }) {
  const { update } = useActions();
  const toast = useToast();
  const [value, setValue] = React.useState(application.accommodations ?? "");
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Besoin déclaré</p>
        <p className="mt-1 rounded-md bg-surface-2 px-3 py-2 text-sm text-foreground">{application.accessibilityNeeds}</p>
      </div>
      <FormField label="Aménagements convenus avec la personne" htmlFor="acc-value" hint="Laisser vide = besoin non traité. Décrire uniquement les adaptations (pas le diagnostic).">
        <Textarea
          id="acc-value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={readOnly}
          placeholder="Ex. Supports en police agrandie, pauses de 10 min toutes les heures, chambre de plain-pied, binôme pour les ateliers de prototypage…"
        />
      </FormField>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <Link href={printHref.convocation(application.id)} target="_blank" className="text-xs text-accent-text hover:underline">
          Voir la convocation (mention du référent) →
        </Link>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            {readOnly ? "Fermer" : "Annuler"}
          </Button>
          {!readOnly ? (
            <Button
              onClick={() => {
                update("applications", application.id, { accommodations: value.trim() || undefined });
                onSaved(application, value.trim());
                toast({ title: value.trim() ? "Besoin marqué comme traité" : "Aménagements retirés", description: value.trim() ? "Aménagements enregistrés au registre." : undefined });
                onClose();
              }}
            >
              <CheckCircle2 /> {value.trim() ? "Enregistrer · traité" : "Enregistrer"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
