"use client";

import * as React from "react";
import Link from "next/link";
import { Archive, Ban, Briefcase, CheckCircle2, ExternalLink, FileText, Link2, Mail, MoreHorizontal, RotateCcw, ShieldCheck, ShieldX, TriangleAlert, UserPlus, UserRoundCheck } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useNow, useSession } from "@/lib/hooks";
import { convertSubmission, ensureContactFromSubmission } from "@/lib/domain/actions";
import { labelOf, LIFECYCLES, SUBMISSION_STATUSES, SUBMISSION_TYPES } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { ID, Submission, SubmissionStatus } from "@/lib/domain/types";
import { date, dateTime } from "@/lib/format";
import { normalizeEmail } from "@/lib/utils";
import { Badge, Button, DescriptionList, Drawer, LinkButton, Menu, Select, StatusBadge, useToast } from "@/components/ui";
import { ActivityTimeline } from "@/components/shared/timeline";
import { ContactLink, OrgLink } from "@/components/shared/entity-links";
import { StatusSelect } from "@/components/shared/status-select";
import { EmailComposer } from "../shared/email-composer";
import { useUserOptions } from "../shared/hooks";
import { ACK_KEYWORDS, fieldLabel, fieldValue, orderedFields, SUBMISSION_SOURCE } from "../../lib/submission-fields";
import { normText, slaBadge } from "../../lib/format";

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-2.5 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="eyebrow text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function ConsentLine({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  const Icon = ok ? ShieldCheck : ShieldX;
  return (
    <li className="flex items-start gap-2.5">
      <Icon className={ok ? "mt-0.5 size-4 shrink-0 text-success-text" : "mt-0.5 size-4 shrink-0 text-faint"} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm text-foreground">
          {label} : <span className={ok ? "font-medium text-success-text" : "font-medium text-muted-foreground"}>{ok ? "accepté" : "non consenti"}</span>
        </p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}

/** Drawer de triage d'une demande entrante. */
export function SubmissionDrawer({ id, onClose }: { id: ID | undefined; onClose: () => void }) {
  const sub = useCrm((s) => (id ? s.submissions.find((x) => x.id === id) : undefined));
  if (!id || !sub) return null;
  return <DrawerBody key={sub.id} sub={sub} onClose={onClose} />;
}

function DrawerBody({ sub, onClose }: { sub: Submission; onClose: () => void }) {
  const now = useNow();
  const { canEdit, user } = useSession();
  const editable = canEdit("demandes");
  const toast = useToast();
  const update = useCrm((s) => s.update);
  const contacts = useCrm((s) => s.contacts);
  const deals = useCrm((s) => s.deals);
  const organizations = useCrm((s) => s.organizations);
  const templates = useCrm((s) => s.emailTemplates);
  const events = useCrm((s) => s.events);
  const complaints = useCrm((s) => s.complaints);
  const userOptions = useUserOptions();
  const [composing, setComposing] = React.useState(false);

  const contact = sub.contactId ? contacts.find((c) => c.id === sub.contactId) : undefined;
  const sameEmail = React.useMemo(() => (sub.contactId ? undefined : contacts.find((c) => normalizeEmail(c.email) === normalizeEmail(sub.email))), [contacts, sub.contactId, sub.email]);
  const deal = sub.dealId ? deals.find((d) => d.id === sub.dealId) : undefined;
  const sla = slaBadge(sub, now);
  const fields = orderedFields(sub.fields ?? {});
  const closed = sub.status === "archivee" || sub.status === "spam";

  const ackTemplate = React.useMemo(() => {
    const keys = ACK_KEYWORDS[sub.type].map(normText);
    const pool = templates.filter((t) => t.category === "accuse_reception");
    return pool.find((t) => keys.some((k) => normText(`${t.name} ${t.subject} ${t.replacesN8n ?? ""}`).includes(k)));
  }, [templates, sub.type]);

  const [firstName, ...rest] = sub.name.trim().split(/\s+/);
  const sessionCode = sub.fields?.session ?? sub.fields?.eventCode ?? sub.fields?.sessionCode;
  const ev = sessionCode ? events.find((e) => e.code === sessionCode) : undefined;
  const complaint = sub.complaintId ? complaints.find((c) => c.id === sub.complaintId) : undefined;
  const vars = {
    prenom: contact?.firstName ?? firstName,
    nom: contact?.lastName ?? rest.join(" "),
    entreprise: sub.company,
    organisation: sub.company,
    sujet: sub.subject,
    offre: sub.fields?.serviceName ?? sub.fields?.format,
    service: sub.fields?.serviceName,
    session: ev?.name ?? sub.fields?.sessionName ?? sessionCode,
    code_session: ev?.code ?? sessionCode,
    date_debut: ev ? date(ev.startAt, "d MMMM yyyy") : undefined,
    date_fin: ev ? date(ev.endAt, "d MMMM yyyy") : undefined,
    lieu: ev?.city,
    numero_reclamation: complaint?.number,
    lien_kit: sub.type === "digital_starter_kit" ? "https://storage.startupweek.tech/public/digital-starter-kit.zip" : undefined,
    delai: "48 h",
  };

  const setStatus = (status: SubmissionStatus, msg?: string) => {
    update("submissions", sub.id, { status }, { log: `Statut : ${labelOf(SUBMISSION_STATUSES, sub.status)} → ${labelOf(SUBMISSION_STATUSES, status)}`, kind: "statut" });
    toast({ title: msg ?? `Demande « ${labelOf(SUBMISSION_STATUSES, status)} »`, description: sub.name });
  };

  const assign = (assigneeId: string) => {
    const u = userOptions.find((o) => o.value === assigneeId);
    update("submissions", sub.id, { assigneeId: assigneeId || undefined }, { log: u ? `Assignée à ${u.label}` : "Désassignée" });
    toast({ title: u ? `Assignée à ${u.label}` : "Demande désassignée" });
  };

  const qualify = () => {
    convertSubmission(sub.id, "contact");
    const fresh = useCrm.getState().submissions.find((x) => x.id === sub.id);
    const c = fresh?.contactId ? useCrm.getState().contacts.find((x) => x.id === fresh.contactId) : undefined;
    if (c && c.lifecycle === "lead") update("contacts", c.id, { lifecycle: "prospect" }, { log: "Cycle de vie : Lead → Prospect (demande qualifiée)", kind: "statut" });
    toast({ title: "Demande qualifiée en contact", description: c ? `${contactName(c)} — fiche à jour` : undefined });
  };

  const createDeal = () => {
    convertSubmission(sub.id, "deal");
    const st = useCrm.getState();
    const fresh = st.submissions.find((x) => x.id === sub.id);
    const d = fresh?.dealId ? st.deals.find((x) => x.id === fresh.dealId) : undefined;
    if (d) {
      const c = st.contacts.find((x) => x.id === fresh?.contactId);
      const company = normText(sub.company);
      const orgId = sub.orgId ?? c?.orgId ?? (company ? organizations.find((o) => normText(o.name) === company)?.id : undefined);
      update("deals", d.id, { orgId: d.orgId ?? orgId, source: SUBMISSION_SOURCE[sub.type], ownerId: sub.assigneeId ?? d.ownerId });
    }
    toast({ title: "Opportunité créée", description: "Étape « Qualification » du pipeline — montant à estimer." });
  };

  const createContact = () => {
    const contactId = ensureContactFromSubmission(sub);
    update("submissions", sub.id, { contactId }, { log: "Contact rattaché à la demande" });
    toast({ title: "Contact créé et rattaché", description: sub.email });
  };

  const attach = (cid: ID) => {
    update("submissions", sub.id, { contactId: cid }, { log: "Rattachée au contact existant" });
    toast({ title: "Demande rattachée au contact" });
  };

  const onSent = (_: unknown, scheduled: boolean) => {
    if (scheduled) return;
    update(
      "submissions",
      sub.id,
      { answeredAt: sub.answeredAt ?? new Date().toISOString(), status: sub.status === "nouvelle" ? "en_cours" : sub.status, assigneeId: sub.assigneeId ?? user?.id },
      { log: sub.answeredAt ? "Nouvelle réponse envoyée" : "Première réponse envoyée", kind: "email" },
    );
  };

  const moreItems = [
    ...(closed
      ? [{ label: "Rouvrir la demande", icon: RotateCcw, onSelect: () => setStatus("en_cours", "Demande rouverte") }]
      : [
          { label: "Archiver", icon: Archive, onSelect: () => setStatus("archivee", "Demande archivée") },
          { label: "Marquer comme spam", icon: Ban, onSelect: () => setStatus("spam", "Marquée comme spam"), danger: true },
        ]),
  ];

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        width="lg"
        title={
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate">{sub.name}</span>
            <StatusBadge options={SUBMISSION_TYPES} value={sub.type} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge options={SUBMISSION_STATUSES} value={sub.status} />
            <span>Reçue le {dateTime(sub.receivedAt)}</span>
            {sla ? (
              <Badge tone={sla.tone} title={sla.title}>
                {sla.label}
              </Badge>
            ) : null}
          </span>
        }
        footer={
          editable ? (
            <>
              <Menu
                trigger={(p) => (
                  <Button variant="ghost" size="sm" {...p} aria-label="Plus d'actions">
                    <MoreHorizontal /> Plus
                  </Button>
                )}
                items={moreItems}
                align="start"
              />
              <Button variant="primary" size="sm" onClick={() => setComposing(true)} disabled={sub.status === "spam"}>
                <Mail /> Répondre
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="space-y-5">
          {sla?.tone === "danger" ? (
            <div className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger-text">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Promesse « réponse sous 48 h » non tenue : {sla.label}. {sla.title}.
              </span>
            </div>
          ) : null}

          {editable ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="sub-assignee" className="text-xs font-medium text-muted-foreground">
                  Assignée à
                </label>
                <Select id="sub-assignee" value={sub.assigneeId ?? ""} onChange={(e) => assign(e.target.value)} options={userOptions} placeholder="Non assignée" />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Statut</span>
                <StatusSelect options={SUBMISSION_STATUSES} value={sub.status} onChange={(v) => setStatus(v)} className="h-9 w-full" label="Statut de la demande" />
              </div>
            </div>
          ) : null}

          {editable ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setComposing(true)} disabled={sub.status === "spam"}>
                <Mail /> Répondre
              </Button>
              <Button size="sm" variant="secondary" onClick={qualify} disabled={sub.status === "convertie" && Boolean(sub.contactId)}>
                <UserRoundCheck /> Qualifier en contact
              </Button>
              {sub.type !== "candidature" && sub.type !== "newsletter" && sub.type !== "reclamation" ? (
                deal ? (
                  <LinkButton size="sm" variant="secondary" href={`/pipeline?deal=${deal.id}`}>
                    <Briefcase /> Voir l'opportunité
                  </LinkButton>
                ) : (
                  <Button size="sm" variant="secondary" onClick={createDeal}>
                    <Briefcase /> Créer une opportunité
                  </Button>
                )
              ) : null}
              {sub.applicationId ? (
                <LinkButton size="sm" variant="secondary" href={`/candidatures/${sub.applicationId}`}>
                  <FileText /> Ouvrir la candidature
                </LinkButton>
              ) : null}
              {sub.complaintId ? (
                <LinkButton size="sm" variant="secondary" href={`/qualiopi/reclamations?id=${sub.complaintId}`}>
                  <ExternalLink /> Ouvrir la réclamation
                </LinkButton>
              ) : null}
            </div>
          ) : null}

          <Section title="Message">
            <div className="rounded-md border border-border bg-surface-2/60 px-4 py-3">
              {sub.subject ? <p className="mb-1.5 text-sm font-semibold text-foreground">{sub.subject}</p> : null}
              {sub.message ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{sub.message}</p> : <p className="text-sm text-muted-foreground">Aucun message libre.</p>}
            </div>
          </Section>

          <Section title="Coordonnées">
            <DescriptionList
              columns={2}
              items={[
                {
                  label: "Email",
                  value: (
                    <a href={`mailto:${sub.email}`} className="break-all text-foreground hover:text-accent-text hover:underline">
                      {sub.email}
                    </a>
                  ),
                },
                { label: "Téléphone", value: sub.phone ? <a href={`tel:${sub.phone.replace(/\s/g, "")}`} className="hover:text-accent-text hover:underline">{sub.phone}</a> : "—" },
                { label: "Organisation", value: sub.orgId ? <OrgLink id={sub.orgId} /> : sub.company || "—" },
                { label: "Échéance de réponse", value: sub.slaDueAt ? dateTime(sub.slaDueAt) : "—" },
                { label: "Première réponse", value: sub.answeredAt ? dateTime(sub.answeredAt) : <span className="text-muted-foreground">Pas encore</span> },
                { label: "Assignée à", value: userOptions.find((u) => u.value === sub.assigneeId)?.label ?? "Non assignée" },
              ]}
            />
          </Section>

          <Section title={`Formulaire « ${labelOf(SUBMISSION_TYPES, sub.type)} »`}>
            {fields.length ? (
              <DescriptionList columns={2} items={fields.map(([k, v]) => ({ label: fieldLabel(k), value: fieldValue(k, v) }))} />
            ) : (
              <p className="text-sm text-muted-foreground">Aucun champ spécifique pour ce formulaire.</p>
            )}
            {sub.idempotencyKey || sub.fields?.leadId ? (
              <p className="font-mono text-[11px] text-faint">Lead ID tunnel : {sub.idempotencyKey ?? sub.fields.leadId}</p>
            ) : null}
          </Section>

          <Section title="Consentements">
            <ul className="space-y-2.5">
              <ConsentLine ok={sub.consent.gdpr} label="Traitement des données (RGPD)" detail={sub.consent.gdpr ? `Case cochée le ${dateTime(sub.receivedAt)}${sub.consent.source ? ` — ${sub.consent.source}` : ""}` : "Aucune preuve de consentement : ne pas réutiliser ces données hors traitement de la demande."} />
              <ConsentLine
                ok={sub.consent.marketing}
                label="Communications marketing"
                detail={sub.consent.marketing ? `Opt-in horodaté le ${dateTime(sub.consent.marketingAt ?? sub.receivedAt)}` : sub.consent.unsubscribedAt ? `Désinscrit le ${date(sub.consent.unsubscribedAt)}` : "Pas d'inscription newsletter / nurturing possible."}
              />
            </ul>
          </Section>

          <Section title="Provenance (UTM)">
            {sub.utm && (sub.utm.source || sub.utm.medium || sub.utm.campaign || sub.utm.referrer) ? (
              <DescriptionList
                columns={2}
                items={[
                  { label: "Source", value: sub.utm.source ?? "—" },
                  { label: "Support (medium)", value: sub.utm.medium ?? "—" },
                  { label: "Campagne", value: sub.utm.campaign ?? "—" },
                  { label: "Page de provenance", value: sub.utm.referrer ? <span className="break-all">{sub.utm.referrer}</span> : "—" },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Accès direct — aucun paramètre UTM transmis.</p>
            )}
          </Section>

          <Section title="Contact rattaché">
            {contact ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <ContactLink id={contact.id} withEmail />
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge options={LIFECYCLES} value={contact.lifecycle} />
                  <LinkButton href={`/contacts/${contact.id}`} size="xs" variant="ghost">
                    Fiche
                  </LinkButton>
                </div>
              </div>
            ) : sameEmail ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border-strong px-3 py-2.5">
                <p className="text-sm text-foreground">
                  Un contact existe déjà avec cet email : <ContactLink id={sameEmail.id} /> ({labelOf(LIFECYCLES, sameEmail.lifecycle)})
                </p>
                {editable ? (
                  <Button size="xs" variant="secondary" onClick={() => attach(sameEmail.id)}>
                    <Link2 /> Rattacher
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border-strong px-3 py-2.5">
                <p className="text-sm text-muted-foreground">Aucun contact pour {sub.email}.</p>
                {editable ? (
                  <Button size="xs" variant="secondary" onClick={createContact}>
                    <UserPlus /> Créer le contact
                  </Button>
                ) : null}
              </div>
            )}
            {deal ? (
              <p className="flex items-center gap-1.5 text-sm text-foreground">
                <CheckCircle2 className="size-4 text-success-text" aria-hidden="true" />
                Opportunité :{" "}
                <Link href={`/pipeline?deal=${deal.id}`} className="font-medium hover:text-accent-text hover:underline">
                  {deal.title}
                </Link>
              </p>
            ) : null}
          </Section>

          <Section title="Historique">
            <ActivityTimeline entity="submissions" id={sub.id} limit={20} />
          </Section>
        </div>
      </Drawer>
      <EmailComposer
        open={composing}
        onClose={() => setComposing(false)}
        title={`Répondre à ${sub.name}`}
        description={ackTemplate ? `Template « ${ackTemplate.name} » pré-rempli — modifiable avant envoi.` : "Aucun template d'accusé pour ce formulaire : message libre."}
        to={sub.email}
        contactId={sub.contactId}
        related={{ entity: "submissions", id: sub.id }}
        templateId={ackTemplate?.id}
        defaultSubject={sub.subject ? `Re : ${sub.subject}` : "Votre demande auprès de StartupWeek"}
        defaultBody={"Bonjour {{prenom}},\n\nMerci pour votre message, nous l'avons bien reçu.\n\n\n\nBelle journée,\nL'équipe StartupWeek"}
        vars={vars}
        onSent={onSent}
      />
    </>
  );
}
