"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { useLookup } from "@/lib/hooks";
import { Badge, Button, StatusBadge } from "@/components/ui";
import { ContactLink, OrgLink } from "@/components/shared/entity-links";
import { INVOICE_STATUSES, QUOTE_STATUSES } from "@/lib/domain/constants";
import { effectiveInvoiceStatus } from "@/lib/domain/selectors";
import type { ID, Invoice, Quote } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { CONFIDENCE_LABEL, DAY, effectiveQuoteStatus, type BillingLookups, type Confidence } from "../lib";

export function useBillingLookups(): BillingLookups {
  const contacts = useLookup("contacts");
  const orgs = useLookup("organizations");
  const events = useLookup("events");
  const applications = useLookup("applications");
  return React.useMemo(() => ({ contacts, orgs, events, applications }), [contacts, orgs, events, applications]);
}

/** Client d'une pièce : organisation (B2B) avec contact en second, sinon contact (B2C). */
export function PartyCell({ doc, className }: { doc: { orgId?: ID; contactId?: ID }; className?: string }) {
  if (doc.orgId) {
    return (
      <span className={cn("block min-w-0", className)}>
        <OrgLink id={doc.orgId} className="font-medium" />
        {doc.contactId ? (
          <span className="block truncate text-xs text-muted-foreground">
            <ContactLink id={doc.contactId} className="[&_a]:font-normal [&_a]:text-muted-foreground" />
          </span>
        ) : null}
      </span>
    );
  }
  return <ContactLink id={doc.contactId} className={className} />;
}

export function InvoiceStatusBadge({ inv, now, className }: { inv: Invoice; now: number; className?: string }) {
  if (inv.kind === "avoir" && inv.status === "emise") {
    return (
      <Badge tone="violet" dot className={className}>
        Avoir émis
      </Badge>
    );
  }
  return <StatusBadge options={INVOICE_STATUSES} value={effectiveInvoiceStatus(inv, now)} className={className} />;
}

export function QuoteStatusBadge({ quote, now, className }: { quote: Quote; now: number; className?: string }) {
  return <StatusBadge options={QUOTE_STATUSES} value={effectiveQuoteStatus(quote, now)} className={className} />;
}

/** « dans 5 j » / « échue depuis 12 j » (texte, pas seulement la couleur). */
export function DueHint({ dueAt, now, done }: { dueAt: string; now: number; done?: boolean }) {
  if (done) return null;
  const days = Math.floor((new Date(dueAt).getTime() - now) / DAY);
  if (days < 0) return <span className="block text-xs font-medium text-danger-text">retard {Math.abs(days)} j</span>;
  if (days === 0) return <span className="block text-xs font-medium text-warning-text">aujourd'hui</span>;
  return <span className={cn("block text-xs", days <= 7 ? "text-warning-text" : "text-muted-foreground")}>dans {days} j</span>;
}

export function ConfidenceBadge({ confidence, score }: { confidence: Confidence; score: number }) {
  const c = CONFIDENCE_LABEL[confidence];
  return (
    <Badge tone={c.tone} dot title={`Score ${score}/100`}>
      {c.label} · {score}
    </Badge>
  );
}

export function CopyButton({ value, label = "Copier", size = "sm" }: { value: string; label?: string; size?: "xs" | "sm" }) {
  const [done, setDone] = React.useState(false);
  return (
    <Button
      variant="secondary"
      size={size}
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          window.setTimeout(() => setDone(false), 1600);
        } catch {
          /* presse-papiers indisponible */
        }
      }}
      aria-label={`${label} : ${value}`}
    >
      {done ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {done ? "Copié" : label}
    </Button>
  );
}

/** Encart d'information (note produit, explication d'une automatisation). */
export function InfoNote({ icon: Icon, title, children, className }: { icon?: React.ComponentType<{ className?: string }>; title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-lg border border-border bg-surface-2/60 px-4 py-3 text-sm", className)}>
      {Icon ? <Icon className="mt-0.5 size-4 shrink-0 text-accent-text" /> : null}
      <div className="min-w-0 text-muted-foreground">
        {title ? <p className="font-medium text-foreground">{title}</p> : null}
        <div className={title ? "mt-0.5" : undefined}>{children}</div>
      </div>
    </div>
  );
}
