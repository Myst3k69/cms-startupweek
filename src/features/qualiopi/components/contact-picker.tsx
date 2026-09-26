"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useCollection } from "@/lib/hooks";
import { Input, Select } from "@/components/ui";

/** Sélecteur de contact avec recherche (nom, email) — liste limitée aux 80 premiers résultats. */
export function ContactPicker({ id, value, onChange, placeholder = "Aucun contact" }: { id?: string; value: string; onChange: (id: string) => void; placeholder?: string }) {
  const contacts = useCollection("contacts");
  const [q, setQ] = React.useState("");
  const options = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = contacts
      .filter((c) => !needle || `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(needle))
      .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr"))
      .slice(0, 80);
    const current = contacts.find((c) => c.id === value);
    if (current && !list.includes(current)) list.unshift(current);
    return list.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName} — ${c.email}` }));
  }, [contacts, q, value]);
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un contact (nom, email)…" aria-label="Rechercher un contact" className="pl-8" />
      </div>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} options={options} placeholder={placeholder} aria-label="Contact" />
    </div>
  );
}
