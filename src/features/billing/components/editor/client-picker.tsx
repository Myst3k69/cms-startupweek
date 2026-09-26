"use client";

import * as React from "react";
import { Building2, Search, User, X } from "lucide-react";
import { useCollection, useEntity } from "@/lib/hooks";
import { Badge, Button, Input, Select } from "@/components/ui";
import type { ID } from "@/lib/domain/types";
import { normalizeText } from "../../lib";

export interface PartyValue {
  orgId?: ID;
  contactId?: ID;
}

/**
 * Sélection du client d'une pièce : un contact (B2C) OU une organisation (B2B, OPCO en subrogation),
 * avec contact « à l'attention de » optionnel pour une organisation.
 */
export function ClientPicker({ value, onChange, error, id = "client-search" }: { value: PartyValue; onChange: (v: PartyValue) => void; error?: string; id?: string }) {
  const contacts = useCollection("contacts");
  const orgs = useCollection("organizations");
  const org = useEntity("organizations", value.orgId);
  const contact = useEntity("contacts", value.contactId);
  const [q, setQ] = React.useState("");
  const listId = `${id}-results`;

  const results = React.useMemo(() => {
    const needle = normalizeText(q);
    if (needle.length < 2) return { contacts: [], orgs: [] };
    return {
      orgs: orgs.filter((o) => normalizeText(`${o.name} ${o.city ?? ""}`).includes(needle)).slice(0, 5),
      contacts: contacts.filter((c) => normalizeText(`${c.firstName} ${c.lastName} ${c.email}`).includes(needle)).slice(0, 6),
    };
  }, [q, orgs, contacts]);

  const orgContacts = React.useMemo(() => (org ? contacts.filter((c) => c.orgId === org.id) : []), [contacts, org]);
  const contactOrg = useEntity("organizations", !org ? contact?.orgId : undefined);

  if (org || contact) {
    return (
      <div className="space-y-3 rounded-md border border-border-strong bg-surface-2/40 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text" aria-hidden="true">
              {org ? <Building2 className="size-4" /> : <User className="size-4" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{org ? org.name : `${contact!.firstName} ${contact!.lastName}`}</p>
              <p className="truncate text-xs text-muted-foreground">
                {org ? org.address || [org.city, org.country].filter(Boolean).join(", ") || "Adresse non renseignée" : contact!.email}
                {org?.siret ? ` · SIRET ${org.siret}` : ""}
              </p>
              <Badge tone={org ? "info" : "accent"} className="mt-1">
                {org ? (org.type === "financeur" ? "Financeur (OPCO)" : "Organisation · B2B") : "Particulier · B2C"}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="xs" onClick={() => onChange({})} aria-label="Changer de client">
            <X aria-hidden="true" /> Changer
          </Button>
        </div>
        {org ? (
          <Select
            aria-label="Contact à l'attention de"
            value={value.contactId ?? ""}
            onChange={(e) => onChange({ orgId: org.id, contactId: e.target.value || undefined })}
            placeholder={orgContacts.length ? "À l'attention de… (facultatif)" : "Aucun contact rattaché à cette organisation"}
            options={orgContacts.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName} — ${c.jobTitle ?? c.email}` }))}
          />
        ) : contactOrg ? (
          <button type="button" className="text-xs font-medium text-accent-text hover:underline" onClick={() => onChange({ orgId: contactOrg.id, contactId: contact!.id })}>
            Facturer plutôt l'organisation « {contactOrg.name} » (à l'attention de {contact!.firstName})
          </button>
        ) : null}
        {org && !org.address ? <p className="text-xs text-warning-text">Adresse de facturation manquante : mention obligatoire sur la facture (à compléter dans la fiche organisation).</p> : null}
      </div>
    );
  }

  const empty = q.trim().length >= 2 && !results.orgs.length && !results.contacts.length;
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
        <Input
          id={id}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un contact ou une organisation (nom, email)…"
          className="pl-8"
          aria-invalid={!!error}
          aria-controls={listId}
          autoComplete="off"
        />
      </div>
      {results.orgs.length || results.contacts.length ? (
        <ul id={listId} className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border bg-surface shadow-sm" role="listbox" aria-label="Résultats">
          {results.orgs.map((o) => (
            <li key={o.id}>
              <button type="button" role="option" aria-selected={false} onClick={() => onChange({ orgId: o.id })} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-2">
                <Building2 className="size-4 shrink-0 text-faint" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm">{o.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{o.type === "financeur" ? "Financeur" : "Organisation"}</span>
              </button>
            </li>
          ))}
          {results.contacts.map((c) => (
            <li key={c.id}>
              <button type="button" role="option" aria-selected={false} onClick={() => onChange({ contactId: c.id })} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-2">
                <User className="size-4 shrink-0 text-faint" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {c.firstName} {c.lastName}
                  <span className="ml-2 text-xs text-muted-foreground">{c.email}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">Contact</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {empty ? <p className="text-xs text-muted-foreground">Aucun résultat. Créez d'abord le contact ou l'organisation dans le CRM.</p> : null}
      {error ? <p className="text-xs text-danger-text">{error}</p> : null}
    </div>
  );
}
