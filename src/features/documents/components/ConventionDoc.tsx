"use client";

import * as React from "react";
import { FileSignature } from "lucide-react";
import { useActions, useCollection, useEntity, useNow, useSession, useSettings } from "@/lib/hooks";
import { FUNDING_SOURCES, labelOf } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { ID } from "@/lib/domain/types";
import { date, dateRange, money } from "@/lib/format";
import { Button, useToast } from "@/components/ui";
import { Article, DocFooter, DocHeader, DocNotFound, DocTitle, Facts, PrintPage, ScreenNotes, SignatureBlock } from "./print-kit";
import {
  audienceOf,
  balanceDueDate,
  docRef,
  hoursLabel,
  includesLodging,
  legalRepresentative,
  methodsOf,
  modeLabel,
  placeOf,
  priceParts,
  programDays,
  trainingDaysCount,
} from "../doc-data";

const COMPANY_FUNDING = ["entreprise", "opco", "ecole"];

/** Convention (entreprise) ou contrat (personne physique) de formation professionnelle. */
export function ConventionDoc({ applicationId }: { applicationId: ID }) {
  const app = useEntity("applications", applicationId);
  const contact = useEntity("contacts", app?.contactId);
  const org = useEntity("organizations", contact?.orgId);
  const ev = useEntity("events", app?.eventId);
  const users = useCollection("users");
  const settings = useSettings();
  const now = useNow();
  const { update } = useActions();
  const { canEdit } = useSession();
  const toast = useToast();

  if (!app || !ev) return <DocNotFound what="Candidature" />;

  const company = COMPANY_FUNDING.includes(app.funding) && !!org;
  const title = company ? "Convention de formation professionnelle" : "Contrat de formation professionnelle";
  const legalBasis = company ? "Articles L.6353-1 et D.6353-1 du Code du travail" : "Articles L.6353-3 à L.6353-7 du Code du travail";
  const rep = legalRepresentative(users);
  const disabilityLead = users.find((u) => u.id === settings.disabilityLeadId);
  const price = priceParts(app.amountDueCents || ev.priceCents, settings);
  const days = programDays(ev);
  const party = company ? "du client" : "du stagiaire";
  const ref = docRef("CF", ev.startAt, app.number);
  const balanceDate = balanceDueDate(ev, settings);

  const notes: React.ReactNode[] = [];
  if (/compl[ée]ter/i.test(settings.nda)) notes.push("Numéro de déclaration d'activité (NDA) non renseigné : à compléter dans les paramètres avant tout envoi.");
  if (!company)
    notes.push(
      "Contrat conclu avec une personne physique à ses frais : l'art. L.6353-6 interdit d'exiger une somme avant la fin du délai de rétractation et limite le premier versement à 30 % du prix, le solde devant être échelonné pendant la formation — à confronter aux CGV (acompte à l'inscription, solde à J-30).",
    );
  if (app.funding === "opco" || app.funding === "france_travail" || app.funding === "region") notes.push(`Financement ${labelOf(FUNDING_SOURCES, app.funding)}${app.funderName ? ` (${app.funderName})` : ""} : joindre l'accord de prise en charge et vérifier la subrogation de paiement.`);
  if (!contact) notes.push("Contact du stagiaire introuvable.");

  return (
    <>
      <ScreenNotes
        notes={notes}
        actions={
          canEdit("candidatures") ? (
            app.agreementSignedAt ? (
              <span className="text-xs text-muted-foreground">Convention signée le {date(app.agreementSignedAt)}.</span>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  update("applications", app.id, { agreementSignedAt: new Date().toISOString() }, { log: `${title} signé(e) (${ref})`, kind: "document" });
                  toast({ title: "Convention marquée comme signée" });
                }}
              >
                <FileSignature /> Marquer comme signée
              </Button>
            )
          ) : undefined
        }
      />
      <PrintPage>
        <DocHeader reference={ref} date={app.agreementSignedAt ?? new Date(now).toISOString()} />
        <DocTitle title={title} subtitle={legalBasis} />

        <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2">
          <div className="rounded-md border border-border p-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Entre l'organisme de formation</p>
            <p className="font-semibold text-foreground">{settings.legalName}</p>
            <p>Exerçant sous la marque {settings.brand}</p>
            <p>{settings.address}</p>
            <p>SIRET {settings.siret}</p>
            <p>Déclaration d'activité n° {settings.nda}</p>
            <p>Représenté par {rep ? `${rep.name}, ${rep.title}` : "……………………"}</p>
            <p className="mt-1 text-xs italic text-muted-foreground">ci-après « l'organisme »</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Et {company ? "l'entreprise" : "le stagiaire"}</p>
            {company && org ? (
              <>
                <p className="font-semibold text-foreground">{org.name}</p>
                <p>{org.address ?? org.city ?? "Adresse : ……………………"}</p>
                <p>SIRET {org.siret ?? "……………………"}</p>
                <p>Représentée par ……………………</p>
                <p className="mt-1">Stagiaire : {contactName(contact)}{contact?.jobTitle ? `, ${contact.jobTitle}` : ""}</p>
                <p className="mt-1 text-xs italic text-muted-foreground">ci-après « le client »</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">{contactName(contact)}</p>
                <p>{contact?.city ? `Domicilié(e) à ${contact.city}` : "Adresse : ……………………"}</p>
                <p>{contact?.email}</p>
                {contact?.phone ? <p>{contact.phone}</p> : null}
                <p className="mt-1 text-xs italic text-muted-foreground">ci-après « le stagiaire »</p>
              </>
            )}
          </div>
        </section>

        <Article n={1} title="Objet">
          <p>
            En exécution {company ? "de la présente convention" : "du présent contrat"}, l'organisme s'engage à organiser l'action de formation intitulée <strong>« {ev.name} »</strong> (réf. {ev.code}) au bénéfice de{" "}
            {contactName(contact)}. Cette action relève de la catégorie des actions de formation prévue à l'article L.6313-1 (1°) du Code du travail. Elle ne prépare à aucune certification professionnelle enregistrée au RNCP ou au répertoire spécifique.
          </p>
        </Article>

        <Article n={2} title="Nature et caractéristiques de l'action">
          <Facts
            items={[
              {
                label: "Objectifs opérationnels",
                value: (
                  <ul className="list-disc space-y-0.5 pl-4">
                    {ev.objectives.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                ),
              },
              { label: "Public et prérequis", value: `${audienceOf(ev)} ${ev.prerequisites}` },
              { label: "Durée", value: `${hoursLabel(ev.durationHours)} réparties sur ${trainingDaysCount(ev)} jour(s)` },
              { label: "Dates", value: `${dateRange(ev.startAt, ev.endAt)}${days[0] ? ` — J1 de ${days[0].start} à ${days[0].end}` : ""}` },
              { label: "Lieu", value: placeOf(ev) },
              { label: "Modalités", value: `${modeLabel(ev)} · effectif de ${ev.minCapacity} à ${ev.capacity} participants` },
              { label: "Méthodes et moyens", value: methodsOf(ev).join(" ") },
              { label: "Modalités d'évaluation", value: ev.evaluationMethods },
              { label: "Sanction", value: "Certificat de réalisation et attestation de fin de formation mentionnant les objectifs, la nature, la durée de l'action et les résultats de l'évaluation des acquis (art. L.6353-1)." },
            ]}
          />
          {days.length ? (
            <div className="mt-2">
              <p className="text-[11.5px] font-medium text-muted-foreground print:text-[9pt]">Programme résumé</p>
              <ul className="mt-1 space-y-0.5">
                {days.map((d) => (
                  <li key={d.day}>
                    <strong>J{d.day}</strong> — {d.slots.map((s) => s.title).join(" · ")}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-muted-foreground">Le programme détaillé (fiche programme) est annexé {company ? "à la présente convention" : "au présent contrat"}.</p>
            </div>
          ) : null}
        </Article>

        <Article n={3} title="Prix de la formation">
          <p>
            Le prix de l'action de formation est fixé à <strong>{money(price.ttc, true)} TTC</strong> pour un stagiaire
            {price.vatRate ? ` (soit ${money(price.ht, true)} HT et ${money(price.vat, true)} de TVA à ${price.vatRate} %)` : " — TVA non applicable, article 261-4-4° a du CGI"}.
            {includesLodging(ev) ? " Il comprend l'hébergement et les repas pendant la durée de la session." : ""}
          </p>
          <p>
            Financement : {labelOf(FUNDING_SOURCES, app.funding)}
            {app.funderName ? ` (${app.funderName})` : ""}.
            {company ? " En cas de prise en charge par un OPCO, le client s'assure de l'accord de financement avant le début de la formation ; à défaut, le coût reste dû par le client." : ""}
          </p>
        </Article>

        <Article n={4} title="Modalités de paiement">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border-strong text-[11px] text-muted-foreground print:text-[8.5pt]">
                <th className="py-1 pr-2 font-medium">Échéance</th>
                <th className="py-1 pr-2 font-medium">Exigibilité</th>
                <th className="py-1 text-right font-medium">Montant TTC</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-1.5 pr-2">Acompte ({settings.depositPercent} %)</td>
                <td className="py-1.5 pr-2">{company ? "À la signature de la convention" : "À l'inscription, à l'issue du délai de rétractation"}</td>
                <td className="tabular py-1.5 text-right">{money(price.deposit, true)}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-1.5 pr-2">Solde ({100 - settings.depositPercent} %)</td>
                <td className="py-1.5 pr-2">
                  Au plus tard le {date(balanceDate, "d MMMM yyyy")} (J-{settings.balanceDaysBefore})
                </td>
                <td className="tabular py-1.5 text-right">{money(price.balance, true)}</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-2 font-semibold" colSpan={2}>
                  Total
                </td>
                <td className="tabular py-1.5 text-right font-semibold">{money(price.ttc, true)}</td>
              </tr>
            </tbody>
          </table>
          <p>Règlement par carte bancaire (lien de paiement sécurisé) ou par virement bancaire (IBAN : {settings.iban}), en rappelant la référence {ref}.</p>
          {company ? <p className="text-xs text-muted-foreground">{settings.latePenaltyText}</p> : null}
        </Article>

        {!company ? (
          <Article n={5} title="Délai de rétractation">
            <p>
              À compter de la date de signature du présent contrat, le stagiaire dispose d'un délai de <strong>10 jours</strong> pour se rétracter, par lettre recommandée avec avis de réception (art. L.6353-5 du Code du travail).
              Lorsque le contrat est conclu à distance ou hors établissement (inscription en ligne), ce délai est porté à <strong>14 jours</strong> (art. L.221-18 du Code de la consommation). En cas de rétractation dans ces délais,
              aucune somme n'est due et les sommes éventuellement versées sont intégralement remboursées.
            </p>
          </Article>
        ) : null}

        <Article n={company ? 5 : 6} title="Annulation, report, abandon">
          <p>
            <strong>Du fait {company ? "du client" : "du stagiaire"}</strong> : toute annulation ou demande de report est notifiée par écrit à {settings.email}. Les conditions de remboursement de l'acompte et du solde sont celles
            des conditions générales de vente en vigueur ({settings.website.replace(/^https?:\/\//, "")}), acceptées lors de l'inscription.
          </p>
          <p>
            <strong>Du fait de l'organisme</strong> : si le nombre minimum de {ev.minCapacity} participants n'est pas atteint à la clôture des inscriptions ({date(ev.registrationDeadline, "d MMMM yyyy")}) ou en cas de force majeure, l'organisme peut reporter ou annuler la session ; les
            sommes versées sont alors intégralement remboursées ou, au choix {party}, reportées sur une session ultérieure.
          </p>
          <p>
            <strong>Abandon et force majeure</strong> : si, par suite de force majeure dûment reconnue, le stagiaire est empêché de suivre la formation, il peut rompre {company ? "la convention" : "le contrat"} ; seules les prestations effectivement
            dispensées sont alors dues au prorata temporis de leur valeur prévue (art. L.6353-7). En cas de cessation anticipée du fait de l'organisme, les sommes indûment perçues sont remboursées (art. L.6354-1).
          </p>
        </Article>

        <Article n={company ? 6 : 7} title="Assiduité, règlement intérieur et évaluations">
          <p>
            Le stagiaire s'engage à respecter le règlement intérieur de l'organisme (art. L.6352-3), remis avec la convocation. La présence est attestée par un émargement par demi-journée (signature numérique horodatée). Le stagiaire
            participe au positionnement d'entrée, aux évaluations des acquis et aux questionnaires de satisfaction à chaud et à froid.
          </p>
        </Article>

        <Article n={company ? 7 : 8} title="Accessibilité et situation de handicap">
          <p>
            {ev.accessibility} Référent handicap : {disabilityLead ? `${disabilityLead.name} (${disabilityLead.email})` : "à désigner"}.
          </p>
        </Article>

        <Article n={company ? 8 : 9} title="Données personnelles et litiges">
          <p>
            Les données personnelles sont traitées par {settings.legalName} pour la gestion administrative et pédagogique de la formation (base légale : exécution {company ? "de la convention" : "du contrat"}) et conservées pendant la durée légale
            de conservation des pièces justificatives. Droits d'accès, de rectification et d'effacement : {settings.email}.
          </p>
          <p>
            En cas de différend, les parties recherchent une solution amiable ; une réclamation peut être adressée à {settings.email} (traitement sous {settings.complaintAckHours} h pour l'accusé de réception).
            {company
              ? " À défaut d'accord, le litige est porté devant le tribunal de commerce de Paris."
              : " Le stagiaire consommateur peut recourir gratuitement à un médiateur de la consommation (coordonnées dans les CGV) ; à défaut d'accord, le litige est porté devant la juridiction compétente."}
          </p>
        </Article>

        <SignatureBlock
          signedAt={app.agreementSignedAt}
          parties={[
            { label: "Pour l'organisme de formation", name: rep?.name, role: rep ? `${rep.title} — ${settings.legalName}` : settings.legalName, stamp: true },
            company
              ? { label: "Pour le client", role: org?.name, mention: "Nom, qualité du signataire et cachet de l'entreprise", stamp: true }
              : { label: "Le stagiaire", name: contactName(contact), mention: "Signature précédée de la mention manuscrite « Lu et approuvé »" },
          ]}
        />
        <DocFooter note={`Réf. ${ref} · ${ev.code} · candidature #${app.number}`} />
      </PrintPage>
    </>
  );
}
