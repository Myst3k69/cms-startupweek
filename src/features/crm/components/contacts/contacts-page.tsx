"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, GitMerge, MailCheck, Plus, Search, Tag, UserPlus, Users, X } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useNow, useSession } from "@/lib/hooks";
import { labelOf, LEAD_SOURCES, LIFECYCLES } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { Contact } from "@/lib/domain/types";
import { date, percent, relative } from "@/lib/format";
import { Avatar, Button, Card, DataTable, Input, Modal, PageHeader, Progress, Select, StatCard, StatusBadge, useToast, type Column } from "@/components/ui";
import { ContactLink, OrgLink, UserChip } from "@/components/shared/entity-links";
import { ContactFormModal } from "../shared/contact-form-modal";
import { useUserOptions } from "../shared/hooks";
import { TagEditor, TagList } from "../shared/tags";
import { DAY, normText } from "../../lib/format";
import { downloadCsv } from "../../lib/csv";
import { duplicateCount, findDuplicateGroups } from "../../lib/duplicates";
import { DuplicatesModal } from "./duplicates-modal";

export interface ContactsFilters {
  cycle?: string;
  source?: string;
  tag?: string;
  proprietaire?: string;
}

export function ContactsPage({ initial }: { initial: ContactsFilters }) {
  const contacts = useCrm((s) => s.contacts);
  const organizations = useCrm((s) => s.organizations);
  const users = useCrm((s) => s.users);
  const update = useCrm((s) => s.update);
  const now = useNow();
  const router = useRouter();
  const toast = useToast();
  const { canEdit } = useSession();
  const editable = canEdit("contacts");
  const userOptions = useUserOptions();

  const [q, setQ] = React.useState("");
  const [cycle, setCycle] = React.useState(initial.cycle ?? "");
  const [source, setSource] = React.useState(initial.source ?? "");
  const [tag, setTag] = React.useState(initial.tag ?? "");
  const [owner, setOwner] = React.useState(initial.proprietaire ?? "");
  const [creating, setCreating] = React.useState(false);
  const [dupOpen, setDupOpen] = React.useState(false);
  const [tagTarget, setTagTarget] = React.useState<{ ids: string[]; clear: () => void } | null>(null);

  const orgById = React.useMemo(() => new Map(organizations.map((o) => [o.id, o])), [organizations]);
  const userById = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const allTags = React.useMemo(() => Array.from(new Set(contacts.flatMap((c) => c.tags))).sort((a, b) => a.localeCompare(b, "fr")), [contacts]);
  const dupGroups = React.useMemo(() => findDuplicateGroups(contacts), [contacts]);
  const dupCount = duplicateCount(dupGroups);

  const rows = React.useMemo(() => {
    const needle = normText(q);
    return contacts.filter((c) => {
      if (cycle && c.lifecycle !== cycle) return false;
      if (source && c.source !== source) return false;
      if (tag && !c.tags.includes(tag)) return false;
      if (owner === "none" ? Boolean(c.ownerId) : owner && c.ownerId !== owner) return false;
      if (needle) {
        const org = c.orgId ? orgById.get(c.orgId)?.name : "";
        if (!normText(`${c.firstName} ${c.lastName} ${c.email} ${c.city ?? ""} ${org ?? ""} ${c.phone ?? ""}`).includes(needle)) return false;
      }
      return true;
    });
  }, [contacts, q, cycle, source, tag, owner, orgById]);

  const stats = React.useMemo(() => {
    const recent = contacts.filter((c) => now - new Date(c.createdAt).getTime() < 30 * DAY).length;
    const toQualify = contacts.filter((c) => c.lifecycle === "lead" || c.lifecycle === "prospect").length;
    const optIn = contacts.filter((c) => c.consent.marketing && !c.consent.unsubscribedAt).length;
    const community = contacts.filter((c) => c.lifecycle === "participant" || c.lifecycle === "alumni").length;
    return { total: contacts.length, recent, toQualify, optIn, community };
  }, [contacts, now]);

  const columns = React.useMemo<Column<Contact>[]>(
    () => [
      {
        key: "name",
        header: "Contact",
        sort: (c) => `${c.lastName} ${c.firstName}`.toLowerCase(),
        render: (c) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={contactName(c)} size="sm" />
            <ContactLink id={c.id} withEmail className="min-w-0 max-w-56" />
          </div>
        ),
      },
      { key: "lifecycle", header: "Cycle", sort: (c) => labelOf(LIFECYCLES, c.lifecycle), render: (c) => <StatusBadge options={LIFECYCLES} value={c.lifecycle} /> },
      { key: "org", header: "Organisation", hideBelow: "md", sort: (c) => (c.orgId ? orgById.get(c.orgId)?.name ?? "" : ""), render: (c) => <OrgLink id={c.orgId} className="text-sm" /> },
      { key: "source", header: "Source", hideBelow: "lg", sort: (c) => labelOf(LEAD_SOURCES, c.source), render: (c) => <span className="text-xs text-muted-foreground">{labelOf(LEAD_SOURCES, c.source)}</span> },
      {
        key: "score",
        header: "Score",
        sort: (c) => c.score,
        render: (c) => (
          <div className="flex w-20 items-center gap-2" title={`Score d'engagement : ${c.score}/100`}>
            <Progress value={c.score} tone={c.score >= 70 ? "success" : c.score >= 40 ? "accent" : "warning"} className="w-12" label={`Score ${c.score} sur 100`} />
            <span className="tabular text-xs text-muted-foreground">{c.score}</span>
          </div>
        ),
      },
      { key: "tags", header: "Tags", hideBelow: "xl", render: (c) => <TagList tags={c.tags} /> },
      { key: "owner", header: "Propriétaire", hideBelow: "md", sort: (c) => (c.ownerId ? userById.get(c.ownerId)?.name ?? "" : "~"), render: (c) => <UserChip id={c.ownerId} /> },
      {
        key: "last",
        header: "Dernier contact",
        hideBelow: "sm",
        sort: (c) => (c.lastContactAt ? new Date(c.lastContactAt).getTime() : 0),
        render: (c) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground" title={c.lastContactAt ? date(c.lastContactAt) : undefined}>
            {c.lastContactAt ? relative(c.lastContactAt, now) : "Jamais"}
          </span>
        ),
      },
    ],
    [orgById, userById, now],
  );

  const exportCsv = () => {
    downloadCsv(
      `contacts-startupweek-${date(new Date(now).toISOString(), "yyyy-MM-dd")}`,
      ["Prénom", "Nom", "Email", "Téléphone", "Ville", "Fonction", "Organisation", "Cycle de vie", "Source", "Score", "Tags", "Propriétaire", "Consentement RGPD", "Opt-in marketing", "Date opt-in", "Dernier contact", "Créé le"],
      rows.map((c) => [
        c.firstName,
        c.lastName,
        c.email,
        c.phone,
        c.city,
        c.jobTitle,
        c.orgId ? orgById.get(c.orgId)?.name : "",
        labelOf(LIFECYCLES, c.lifecycle),
        labelOf(LEAD_SOURCES, c.source),
        c.score,
        c.tags.join(", "),
        c.ownerId ? userById.get(c.ownerId)?.name : "",
        c.consent.gdpr ? "oui" : "non",
        c.consent.marketing && !c.consent.unsubscribedAt ? "oui" : "non",
        c.consent.marketingAt ? date(c.consent.marketingAt, "yyyy-MM-dd HH:mm") : "",
        c.lastContactAt ? date(c.lastContactAt, "yyyy-MM-dd") : "",
        date(c.createdAt, "yyyy-MM-dd"),
      ]),
    );
    toast({ title: "Export CSV prêt", description: `${rows.length} contact${rows.length > 1 ? "s" : ""} exporté${rows.length > 1 ? "s" : ""}` });
  };

  const bulkOwner = (ids: string[], ownerId: string, clear: () => void) => {
    const u = userById.get(ownerId);
    ids.forEach((id) => update("contacts", id, { ownerId: ownerId || undefined }, { log: u ? `Propriétaire : ${u.name}` : "Propriétaire retiré" }));
    toast({ title: `${ids.length} contact${ids.length > 1 ? "s" : ""} réassigné${ids.length > 1 ? "s" : ""}`, description: u ? `Propriétaire : ${u.name}` : "Sans propriétaire" });
    clear();
  };

  const hasFilters = Boolean(q || cycle || source || tag || owner);

  return (
    <div>
      <PageHeader
        eyebrow="Commercial"
        title="Contacts"
        description="Candidats, participants, alumni, clients et partenaires — une fiche unique par personne (email normalisé), avec historique complet."
        actions={
          editable ? (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Nouveau contact
            </Button>
          ) : null
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contacts" value={stats.total.toLocaleString("fr-FR")} icon={Users} hint={`+${stats.recent} ces 30 derniers jours`} />
        <StatCard label="Leads & prospects" value={stats.toQualify} icon={UserPlus} hint="À qualifier ou convertir" />
        <StatCard label="Opt-in marketing" value={percent(stats.total ? (stats.optIn / stats.total) * 100 : 0)} icon={MailCheck} hint={`${stats.optIn} consentements horodatés`} />
        <StatCard label="Participants & alumni" value={stats.community} icon={Users} hint="Communauté StartupWeek" />
      </div>

      {dupCount > 0 ? (
        <Card className="mb-4 flex flex-col gap-3 border-warning/40 bg-warning-soft p-3 sm:flex-row sm:items-center">
          <GitMerge className="size-5 shrink-0 text-warning-text" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {dupCount} doublon{dupCount > 1 ? "s" : ""} potentiel{dupCount > 1 ? "s" : ""} dans {dupGroups.length} groupe{dupGroups.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">Même email normalisé ou même prénom + nom — héritage de l'upsert « email exact » de n8n.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setDupOpen(true)}>
            Examiner et fusionner
          </Button>
        </Card>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, email, ville, organisation…" aria-label="Rechercher un contact" className="pl-8" />
        </div>
        <Select aria-label="Cycle de vie" value={cycle} onChange={(e) => setCycle(e.target.value)} options={LIFECYCLES} placeholder="Tous les cycles" className="w-[calc(50%-4px)] sm:w-40" />
        <Select aria-label="Source" value={source} onChange={(e) => setSource(e.target.value)} options={LEAD_SOURCES} placeholder="Toutes sources" className="w-[calc(50%-4px)] sm:w-44" />
        <Select aria-label="Tag" value={tag} onChange={(e) => setTag(e.target.value)} options={allTags.map((t) => ({ value: t, label: t }))} placeholder="Tous les tags" className="w-[calc(50%-4px)] sm:w-40" />
        <Select aria-label="Propriétaire" value={owner} onChange={(e) => setOwner(e.target.value)} options={[...userOptions, { value: "none", label: "Sans propriétaire" }]} placeholder="Tous propriétaires" className="w-[calc(50%-4px)] sm:w-44" />
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setCycle("");
              setSource("");
              setTag("");
              setOwner("");
            }}
          >
            <X /> Réinitialiser
          </Button>
        ) : null}
        <Button variant="secondary" size="sm" className="ml-auto" onClick={exportCsv} disabled={!rows.length}>
          <Download /> Export CSV
        </Button>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(c) => c.id}
        onRowClick={(c) => router.push(`/contacts/${c.id}`)}
        initialSort={{ key: "last", dir: "desc" }}
        emptyTitle={hasFilters ? "Aucun contact ne correspond" : "Aucun contact"}
        emptyDescription={hasFilters ? "Modifiez les filtres ou la recherche." : "Créez un contact ou attendez les premières demandes du site."}
        bulkActions={
          editable
            ? (selected, clear) => (
                <>
                  <Button size="xs" variant="secondary" onClick={() => setTagTarget({ ids: selected.map((c) => c.id), clear })}>
                    <Tag /> Ajouter un tag
                  </Button>
                  <Select
                    aria-label="Changer de propriétaire"
                    value=""
                    onChange={(e) => e.target.value && bulkOwner(selected.map((c) => c.id), e.target.value === "__none" ? "" : e.target.value, clear)}
                    options={[...userOptions, { value: "__none", label: "Aucun" }]}
                    placeholder="Changer de propriétaire…"
                    className="w-52"
                  />
                </>
              )
            : undefined
        }
      />

      <ContactFormModal open={creating} onClose={() => setCreating(false)} onSaved={(c) => router.push(`/contacts/${c.id}`)} />
      <DuplicatesModal open={dupOpen} onClose={() => setDupOpen(false)} groups={dupGroups} editable={editable} />
      <BulkTagModal target={tagTarget} onClose={() => setTagTarget(null)} suggestions={allTags} />
    </div>
  );
}

function BulkTagModal({ target, onClose, suggestions }: { target: { ids: string[]; clear: () => void } | null; onClose: () => void; suggestions: string[] }) {
  if (!target) return null;
  return <BulkTagInner target={target} onClose={onClose} suggestions={suggestions} />;
}

function BulkTagInner({ target, onClose, suggestions }: { target: { ids: string[]; clear: () => void }; onClose: () => void; suggestions: string[] }) {
  const [tags, setTags] = React.useState<string[]>([]);
  const update = useCrm((s) => s.update);
  const toast = useToast();
  const apply = () => {
    if (!tags.length) return;
    const st = useCrm.getState();
    target.ids.forEach((id) => {
      const c = st.contacts.find((x) => x.id === id);
      if (c) update("contacts", id, { tags: Array.from(new Set([...c.tags, ...tags])) }, { log: `Tag${tags.length > 1 ? "s" : ""} ajouté${tags.length > 1 ? "s" : ""} : ${tags.join(", ")}` });
    });
    toast({ title: `Tags ajoutés à ${target.ids.length} contact${target.ids.length > 1 ? "s" : ""}`, description: tags.join(", ") });
    target.clear();
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Ajouter un tag"
      description={`${target.ids.length} contact${target.ids.length > 1 ? "s" : ""} sélectionné${target.ids.length > 1 ? "s" : ""} — les tags existants sont conservés.`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={apply} disabled={!tags.length}>
            Ajouter
          </Button>
        </>
      }
    >
      <TagEditor value={tags} onChange={setTags} suggestions={suggestions} />
    </Modal>
  );
}
