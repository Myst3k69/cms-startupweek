"use client";

import * as React from "react";
import Link from "next/link";
import { Award, ClipboardList, FileSignature, FileText, Mail, Printer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, StatusBadge } from "@/components/ui";
import { ContactLink } from "@/components/shared/entity-links";
import { APPLICATION_STATUSES } from "@/lib/domain/constants";
import { contactName } from "@/lib/domain/selectors";
import type { EventSession } from "@/lib/domain/types";
import { date } from "@/lib/format";
import { useLookup, useNow } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { SessionData } from "./use-session-data";

function DocButton({ href, icon: Icon, label, state, stateTone }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; state?: string; stateTone?: "ok" | "todo" | "muted" }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="group flex min-w-0 items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors hover:border-border-strong hover:bg-surface-2"
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground group-hover:text-accent-text" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block font-medium text-foreground">{label}</span>
        {state ? <span className={cn("block truncate", stateTone === "ok" ? "text-success-text" : stateTone === "todo" ? "text-warning-text" : "text-muted-foreground")}>{state}</span> : null}
      </span>
    </Link>
  );
}

export function DocumentsTab({ ev, data }: { ev: EventSession; data: SessionData }) {
  const contacts = useLookup("contacts");
  const now = useNow();
  const ended = Date.parse(ev.endAt) < now;
  const people = React.useMemo(
    () =>
      data.apps
        .filter((a) => a.status === "inscrite" || a.status === "acceptee")
        .sort((a, b) => contactName(contacts.get(a.contactId)).localeCompare(contactName(contacts.get(b.contactId)), "fr")),
    [data.apps, contacts],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Documents de la session</CardTitle>
            <CardDescription>Versions imprimables / PDF générées à partir des données à jour.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DocButton href={`/print/programme/${ev.id}`} icon={FileText} label="Programme de formation" state="Fiche programme Qualiopi (objectifs, J1…J7, évaluation, accessibilité)" stateTone="muted" />
          <DocButton href={`/print/emargement/${ev.id}`} icon={ClipboardList} label="Feuille d'émargement" state="Par demi-journée, signatures participants et formateurs" stateTone="muted" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Documents par participant</CardTitle>
            <CardDescription>Convocation (ind. 9), convention ou contrat de formation, certificat de réalisation.</CardDescription>
          </div>
          <Printer className="size-4 text-faint" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          {people.length ? (
            <ul className="divide-y divide-border">
              {people.map((a) => (
                <li key={a.id} className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,1fr))] md:items-center">
                  <div className="min-w-0">
                    <ContactLink id={a.contactId} className="block truncate text-sm" />
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">#{a.number}</span>
                      <StatusBadge options={APPLICATION_STATUSES} value={a.status} className="text-[11px]" />
                    </div>
                  </div>
                  <DocButton
                    href={`/print/convocation/${a.id}`}
                    icon={Mail}
                    label="Convocation"
                    state={a.convocationSentAt ? `Envoyée le ${date(a.convocationSentAt)}` : "Non envoyée"}
                    stateTone={a.convocationSentAt ? "ok" : "todo"}
                  />
                  <DocButton
                    href={`/print/convention/${a.id}`}
                    icon={FileSignature}
                    label={a.funding === "personnel" ? "Contrat de formation" : "Convention"}
                    state={a.agreementSignedAt ? `Signée le ${date(a.agreementSignedAt)}` : "Non signée"}
                    stateTone={a.agreementSignedAt ? "ok" : "todo"}
                  />
                  <DocButton
                    href={`/print/attestation/${a.id}`}
                    icon={Award}
                    label="Certificat de réalisation"
                    state={a.certificateIssuedAt ? `Délivré le ${date(a.certificateIssuedAt)}` : ended ? "À délivrer" : "Après la session"}
                    stateTone={a.certificateIssuedAt ? "ok" : ended ? "todo" : "muted"}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={FileText} title="Aucun participant" description="Les documents individuels apparaissent pour les candidatures acceptées et inscrites." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
