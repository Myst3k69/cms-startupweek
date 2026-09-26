"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Euro, Handshake, Plus, School } from "lucide-react";
import { useCrm } from "@/lib/store";
import { useNow, useSession } from "@/lib/hooks";
import { labelOf, ORG_STATUSES, ORG_TYPES } from "@/lib/domain/constants";
import { invoiceTotal } from "@/lib/domain/selectors";
import type { Organization } from "@/lib/domain/types";
import { money, moneyCompact } from "@/lib/format";
import { Button, DataTable, PageHeader, Select, StatCard, StatusBadge, type Column } from "@/components/ui";
import { UserChip } from "@/components/shared/entity-links";
import { OrgFormModal } from "../shared/org-form-modal";

interface OrgRow {
  org: Organization;
  contacts: number;
  openDeals: number;
  openAmount: number;
  billed: number;
}

export function OrganisationsPage({ initial }: { initial: { type?: string; statut?: string } }) {
  const organizations = useCrm((s) => s.organizations);
  const contacts = useCrm((s) => s.contacts);
  const deals = useCrm((s) => s.deals);
  const invoices = useCrm((s) => s.invoices);
  const now = useNow();
  const router = useRouter();
  const { canEdit } = useSession();
  const editable = canEdit("organisations");
  const [creating, setCreating] = React.useState(false);
  const [type, setType] = React.useState(initial.type ?? "");
  const [status, setStatus] = React.useState(initial.statut ?? "");

  const rows = React.useMemo<OrgRow[]>(() => {
    const cCount = new Map<string, number>();
    contacts.forEach((c) => c.orgId && cCount.set(c.orgId, (cCount.get(c.orgId) ?? 0) + 1));
    const dAgg = new Map<string, { n: number; amount: number }>();
    deals.forEach((d) => {
      if (!d.orgId || d.stage === "gagne" || d.stage === "perdu") return;
      const a = dAgg.get(d.orgId) ?? { n: 0, amount: 0 };
      dAgg.set(d.orgId, { n: a.n + 1, amount: a.amount + d.amountCents });
    });
    const billed = new Map<string, number>();
    invoices.forEach((i) => {
      if (!i.orgId || i.status === "annulee" || i.status === "brouillon") return;
      billed.set(i.orgId, (billed.get(i.orgId) ?? 0) + invoiceTotal(i).ttc);
    });
    return organizations
      .filter((o) => (!type || o.type === type) && (!status || o.status === status))
      .map((o) => ({ org: o, contacts: cCount.get(o.id) ?? 0, openDeals: dAgg.get(o.id)?.n ?? 0, openAmount: dAgg.get(o.id)?.amount ?? 0, billed: billed.get(o.id) ?? 0 }));
  }, [organizations, contacts, deals, invoices, type, status]);

  const stats = React.useMemo(() => {
    const clients = organizations.filter((o) => o.status === "client").length;
    const partners = organizations.filter((o) => o.status === "partenaire").length;
    const schools = organizations.filter((o) => o.type === "ecole").length;
    const yearStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
    const billedYear = invoices
      .filter((i) => i.orgId && i.status !== "annulee" && i.status !== "brouillon" && new Date(i.issuedAt).getTime() >= yearStart)
      .reduce((s, i) => s + invoiceTotal(i).ttc, 0);
    return { total: organizations.length, clients, partners, schools, billedYear };
  }, [organizations, invoices, now]);

  const columns = React.useMemo<Column<OrgRow>[]>(
    () => [
      {
        key: "name",
        header: "Organisation",
        sort: (r) => r.org.name.toLowerCase(),
        csv: (r) => r.org.name,
        render: (r) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{r.org.name}</p>
            {r.org.sector ? <p className="truncate text-xs text-muted-foreground">{r.org.sector}</p> : null}
          </div>
        ),
      },
      { key: "type", header: "Type", hideBelow: "md", sort: (r) => labelOf(ORG_TYPES, r.org.type), render: (r) => <span className="text-xs text-muted-foreground">{labelOf(ORG_TYPES, r.org.type)}</span> },
      { key: "status", header: "Statut", sort: (r) => labelOf(ORG_STATUSES, r.org.status), render: (r) => <StatusBadge options={ORG_STATUSES} value={r.org.status} /> },
      { key: "city", header: "Ville", hideBelow: "lg", sort: (r) => r.org.city ?? "", render: (r) => <span className="text-sm text-muted-foreground">{r.org.city ?? "—"}</span> },
      { key: "contacts", header: "Contacts", align: "right", hideBelow: "sm", sort: (r) => r.contacts, render: (r) => r.contacts || <span className="text-faint">0</span> },
      {
        key: "deals",
        header: "Opp. ouvertes",
        align: "right",
        sort: (r) => r.openAmount,
        csv: (r) => `${r.openDeals} (${money(r.openAmount)})`,
        render: (r) =>
          r.openDeals ? (
            <span className="whitespace-nowrap">
              {r.openDeals} <span className="text-xs text-muted-foreground">· {moneyCompact(r.openAmount)}</span>
            </span>
          ) : (
            <span className="text-faint">—</span>
          ),
      },
      { key: "billed", header: "CA facturé", align: "right", sort: (r) => r.billed, csv: (r) => (r.billed / 100).toFixed(2).replace(".", ","), render: (r) => (r.billed ? money(r.billed) : <span className="text-faint">—</span>) },
      { key: "owner", header: "Compte", hideBelow: "xl", render: (r) => <UserChip id={r.org.ownerId} /> },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Commercial"
        title="Organisations"
        description="Écoles, entreprises, incubateurs, financeurs et lieux partenaires — comptes B2B, sessions dédiées et facturation."
        actions={
          editable ? (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Nouvelle organisation
            </Button>
          ) : null
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Organisations" value={stats.total} icon={Building2} hint={`${stats.schools} écoles / universités`} />
        <StatCard label="Clients" value={stats.clients} icon={Euro} hint="Au moins une vente conclue" />
        <StatCard label="Partenaires" value={stats.partners} icon={Handshake} hint="Lieux, médias, financeurs, écoles" />
        <StatCard label={`CA B2B facturé ${new Date(now).getFullYear()}`} value={moneyCompact(stats.billedYear)} icon={School} hint="Factures émises aux organisations (TTC)" />
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.org.id}
        searchable={(r) => `${r.org.name} ${r.org.city ?? ""} ${r.org.sector ?? ""} ${r.org.siret ?? ""}`}
        searchPlaceholder="Nom, ville, secteur, SIRET…"
        toolbar={
          <>
            <Select aria-label="Type d'organisation" value={type} onChange={(e) => setType(e.target.value)} options={ORG_TYPES} placeholder="Tous les types" className="w-36 sm:w-48" />
            <Select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)} options={ORG_STATUSES} placeholder="Tous les statuts" className="w-32 sm:w-40" />
          </>
        }
        exportName="organisations-startupweek"
        onRowClick={(r) => router.push(`/organisations/${r.org.id}`)}
        initialSort={{ key: "billed", dir: "desc" }}
        emptyTitle="Aucune organisation"
        emptyDescription="Ajoutez une école, une entreprise ou un partenaire."
      />
      <OrgFormModal open={creating} onClose={() => setCreating(false)} onSaved={(o) => router.push(`/organisations/${o.id}`)} />
    </div>
  );
}
