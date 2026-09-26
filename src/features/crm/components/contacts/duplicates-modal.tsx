"use client";

import * as React from "react";
import Link from "next/link";
import { GitMerge, Mail, UserRound } from "lucide-react";
import { useCrm } from "@/lib/store";
import { LIFECYCLES } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import { date } from "@/lib/format";
import { Badge, Button, EmptyState, Modal, StatusBadge, useToast } from "@/components/ui";
import { mergeContacts, type DuplicateGroup } from "../../lib/duplicates";

/** Revue et fusion des doublons potentiels (la fiche la plus ancienne est conservée). */
export function DuplicatesModal({ open, onClose, groups, editable }: { open: boolean; onClose: () => void; groups: DuplicateGroup[]; editable: boolean }) {
  const applications = useCrm((s) => s.applications);
  const invoices = useCrm((s) => s.invoices);
  const submissions = useCrm((s) => s.submissions);
  const toast = useToast();

  const usage = React.useMemo(() => {
    const m = new Map<string, number>();
    const inc = (id?: string) => id && m.set(id, (m.get(id) ?? 0) + 1);
    applications.forEach((a) => inc(a.contactId));
    invoices.forEach((i) => inc(i.contactId));
    submissions.forEach((s) => inc(s.contactId));
    return m;
  }, [applications, invoices, submissions]);

  const merge = (g: DuplicateGroup) => {
    const [keep, ...others] = g.contacts;
    let moved = 0;
    others.forEach((o) => {
      moved += mergeContacts(keep.id, o.id)?.moved ?? 0;
    });
    toast({ title: `Fusion effectuée — ${contactName(keep)}`, description: `${others.length} doublon${others.length > 1 ? "s" : ""} supprimé${others.length > 1 ? "s" : ""}, ${moved} élément${moved > 1 ? "s" : ""} réaffecté${moved > 1 ? "s" : ""}.` });
  };

  return (
    <Modal open={open} onClose={onClose} title="Doublons potentiels" description="Même email normalisé ou même prénom + nom. La fiche la plus ancienne est conservée ; candidatures, demandes, opportunités, factures, tâches et historique lui sont réaffectés, les tags sont fusionnés." size="xl">
      {groups.length === 0 ? (
        <EmptyState icon={GitMerge} title="Aucun doublon" description="La base contacts est propre." />
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => (
            <li key={g.key} className="rounded-lg border border-border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2/60 px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {g.reason === "email" ? <Mail className="size-3.5" /> : <UserRound className="size-3.5" />}
                  {g.reason === "email" ? "Même email (casse / espaces différents)" : "Même prénom et nom"}
                </span>
                {editable ? (
                  <Button size="xs" onClick={() => merge(g)}>
                    <GitMerge /> Fusionner {g.contacts.length} fiches
                  </Button>
                ) : null}
              </div>
              <ul className="divide-y divide-border">
                {g.contacts.map((c, i) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                    <Link href={`/contacts/${c.id}`} className="font-medium text-foreground hover:text-accent-text hover:underline" onClick={onClose}>
                      {contactName(c)}
                    </Link>
                    <span className="break-all text-xs text-muted-foreground">{c.email}</span>
                    <StatusBadge options={LIFECYCLES} value={c.lifecycle} />
                    <span className="text-xs text-muted-foreground">créé le {date(c.createdAt)}</span>
                    <span className="text-xs text-muted-foreground">
                      {usage.get(c.id) ?? 0} élément{(usage.get(c.id) ?? 0) > 1 ? "s" : ""} lié{(usage.get(c.id) ?? 0) > 1 ? "s" : ""}
                    </span>
                    {i === 0 ? (
                      <Badge tone="success" dot className="ml-auto">
                        Conservé
                      </Badge>
                    ) : (
                      <Badge tone="danger" dot className="ml-auto">
                        Fusionné puis supprimé
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
