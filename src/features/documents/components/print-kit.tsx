"use client";

/**
 * Briques réutilisables des documents imprimables (convention, convocation, attestation,
 * émargement, programme, facture, devis…). À utiliser sous `src/app/print/layout.tsx`.
 *
 *   <PrintPage>
 *     <DocHeader title="Facture" reference="F-2026-0042" date={inv.issuedAt} />
 *     …contenu…
 *     <SignatureBlock parties={[…]} />
 *     <DocFooter />
 *   </PrintPage>
 */
import * as React from "react";
import Image from "next/image";
import { FileWarning, Info } from "lucide-react";
import { useSettings } from "@/lib/hooks";
import { date } from "@/lib/format";
import type { Settings } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/* ───────────── Feuille A4 ───────────── */

/**
 * Feuille A4 (portrait par défaut). Sur écran : feuille centrée avec ombre ; à l'impression :
 * pleine largeur, marges gérées par `@page`. Plusieurs PrintPage successifs = sauts de page.
 */
export function PrintPage({
  children,
  orientation = "portrait",
  className,
}: {
  children: React.ReactNode;
  orientation?: "portrait" | "landscape";
  className?: string;
}) {
  const landscape = orientation === "landscape";
  return (
    <>
      {landscape ? <style>{`@page { size: A4 landscape; margin: 10mm; }`}</style> : null}
      <article
        className={cn(
          "doc-sheet mx-auto mb-6 flex w-full flex-col bg-surface text-[12.5px] leading-relaxed text-foreground shadow-md ring-1 ring-border",
          landscape ? "max-w-[297mm] sm:min-h-[210mm]" : "max-w-[210mm] sm:min-h-[297mm]",
          "p-5 sm:p-[14mm]",
          "print:mb-0 print:min-h-0 print:max-w-none print:p-0 print:text-[10pt] print:shadow-none print:ring-0",
          "break-after-page last:break-after-auto",
          className,
        )}
      >
        {children}
      </article>
    </>
  );
}

/* ───────────── En-tête & pied ───────────── */

export function legalLines(s: Settings) {
  return {
    identity: `${s.legalName} — ${s.brand}`,
    address: s.address,
    ids: `SIRET ${s.siret} · Déclaration d'activité (NDA) : ${s.nda}`,
    contact: [s.email, s.phone, s.website.replace(/^https?:\/\//, "")].filter(Boolean).join(" · "),
  };
}

/** En-tête : logo + coordonnées légales de l'organisme (depuis les paramètres) + bloc titre/référence. */
export function DocHeader({ title, reference, date: docDate, subtitle, compact }: { title?: string; reference?: string; date?: string; subtitle?: string; compact?: boolean }) {
  const s = useSettings();
  const l = legalLines(s);
  return (
    <header className={cn("flex flex-col gap-4 border-b border-border-strong sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between", compact ? "pb-3" : "pb-5")}>
      <div className="flex items-start gap-3">
        <Image src="/logo-sw-v4.webp" alt="" width={compact ? 32 : 40} height={compact ? 32 : 40} className="shrink-0 rounded-md ring-1 ring-border" priority />
        <div className="min-w-0 text-[11px] leading-snug text-muted-foreground print:text-[8.5pt]">
          <p className="font-display text-[14px] font-semibold text-foreground print:text-[11pt]">{s.legalName}</p>
          <p>Marque {s.brand}</p>
          <p>{l.address}</p>
          <p>{l.ids}</p>
          <p>{l.contact}</p>
        </div>
      </div>
      {title ? (
        <div className="text-left sm:text-right print:text-right">
          <p className="font-display text-lg font-semibold uppercase tracking-wide text-foreground print:text-[13pt]">{title}</p>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
          {reference ? <p className="mt-1 font-mono text-xs text-foreground">Réf. {reference}</p> : null}
          {docDate ? <p className="text-xs text-muted-foreground">Établi le {date(docDate, "d MMMM yyyy")}</p> : null}
        </div>
      ) : null}
    </header>
  );
}

/** Pied de page : mentions légales + mention « modèle à faire valider juridiquement ». */
export function DocFooter({ note, validationNotice = true }: { note?: React.ReactNode; validationNotice?: boolean }) {
  const s = useSettings();
  const l = legalLines(s);
  return (
    <footer className="mt-auto border-t border-border pt-3 text-center text-[10px] leading-snug text-muted-foreground print:text-[7.5pt]">
      {note ? <p className="mb-1">{note}</p> : null}
      <p>
        {s.legalName} · {l.address} · SIRET {s.siret} · NDA {s.nda} — cet enregistrement ne vaut pas agrément de l'État.
      </p>
      <p>{l.contact}</p>
      {validationNotice ? <p className="mt-1 italic text-faint">Modèle généré par StartupWeek OS — à faire valider juridiquement avant usage.</p> : null}
    </footer>
  );
}

/* ───────────── Titres, sections, faits ───────────── */

export function DocTitle({ title, subtitle, children }: { title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="my-6 text-center print:my-5">
      <h1 className="font-display text-xl font-semibold uppercase tracking-wide text-foreground print:text-[15pt]">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground print:text-[9.5pt]">{subtitle}</p> : null}
      {children}
    </div>
  );
}

export function DocSection({ title, children, className }: { title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("mb-4 break-inside-avoid-page", className)}>
      {title ? <h2 className="mb-1.5 border-b border-border pb-1 text-[13px] font-semibold text-foreground print:text-[10.5pt]">{title}</h2> : null}
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

/** Article numéroté (conventions, contrats). */
export function Article({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <DocSection title={`Article ${n} — ${title}`}>
      {children}
    </DocSection>
  );
}

/** Tableau libellé / valeur. */
export function Facts({ items, className }: { items: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <table className={cn("w-full border-collapse text-left", className)}>
      <tbody>
        {items.map((it) => (
          <tr key={it.label} className="border-b border-border align-top last:border-0">
            <th scope="row" className="w-[34%] py-1.5 pr-3 text-[11.5px] font-medium text-muted-foreground print:text-[9pt]">
              {it.label}
            </th>
            <td className="py-1.5 text-foreground">{it.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Checkline({ checked, children }: { checked: boolean; children: React.ReactNode }) {
  return (
    <span className="mr-4 inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden="true" className="font-mono">{checked ? "☒" : "☐"}</span>
      <span className={checked ? "font-medium text-foreground" : "text-muted-foreground"}>{children}</span>
      <span className="sr-only">{checked ? "(coché)" : "(non coché)"}</span>
    </span>
  );
}

/* ───────────── Signatures ───────────── */

export interface SignatureParty {
  label: string; // « Pour l'organisme de formation »
  name?: string;
  role?: string;
  mention?: string; // « Signature précédée de la mention « Lu et approuvé » »
  stamp?: boolean; // cachet
}

export function SignatureBlock({ parties, place = "Paris", signedAt, className }: { parties: SignatureParty[]; place?: string; signedAt?: string; className?: string }) {
  return (
    <section className={cn("mt-6 break-inside-avoid-page", className)}>
      <p className="mb-3 text-foreground">
        Fait à {place}, le {signedAt ? date(signedAt, "d MMMM yyyy") : "……………………………"}
        {parties.length > 1 ? `, en ${parties.length} exemplaires originaux.` : "."}
      </p>
      <div className={cn("grid gap-4", parties.length > 1 ? "sm:grid-cols-2 print:grid-cols-2" : "sm:max-w-[50%] sm:ml-auto print:ml-auto print:max-w-[50%]")}>
        {parties.map((p) => (
          <div key={p.label} className="rounded-md border border-border-strong p-3">
            <p className="text-[11.5px] font-semibold text-foreground print:text-[9pt]">{p.label}</p>
            {p.name ? <p className="text-foreground">{p.name}</p> : <p className="text-muted-foreground">Nom : ……………………………</p>}
            {p.role ? <p className="text-xs text-muted-foreground">{p.role}</p> : null}
            {p.mention ? <p className="mt-1 text-[10.5px] italic text-muted-foreground print:text-[8pt]">{p.mention}</p> : null}
            <div className="mt-2 h-20 rounded border border-dashed border-border-strong print:h-[22mm]" aria-label="Zone de signature" />
            {p.stamp ? <p className="mt-1 text-[10px] text-faint">Cachet de l'organisation</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Écran uniquement ───────────── */

/** Encadré visible à l'écran seulement (points à valider, données manquantes, actions). */
export function ScreenNotes({ notes, actions, className }: { notes: React.ReactNode[]; actions?: React.ReactNode; className?: string }) {
  if (!notes.length && !actions) return null;
  return (
    <aside className={cn("no-print mx-auto mb-4 w-full max-w-[210mm] rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-foreground", className)} aria-label="Points à vérifier avant impression">
      {notes.length ? (
        <>
          <p className="mb-1 flex items-center gap-1.5 font-medium">
            <Info className="size-4 text-warning-text" aria-hidden="true" /> À vérifier avant envoi
          </p>
          <ul className="list-disc space-y-0.5 pl-6 text-[13px]">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </>
      ) : null}
      {actions ? <div className="mt-2 flex flex-wrap gap-2">{actions}</div> : null}
    </aside>
  );
}

export function DocNotFound({ what }: { what: string }) {
  return (
    <PrintPage>
      <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <FileWarning className="mb-3 size-8 text-faint" aria-hidden="true" />
        <p className="text-base font-medium text-foreground">{what} introuvable</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Le lien est peut-être invalide ou l'élément a été supprimé. Revenez à la fiche et relancez la génération du document.</p>
      </div>
    </PrintPage>
  );
}
