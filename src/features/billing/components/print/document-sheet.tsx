"use client";

/**
 * Feuille A4 d'une pièce commerciale (facture, acompte, solde, avoir, devis).
 * Même rendu à l'écran (aperçu dans la fiche) et à l'impression (/print/facture, /print/devis).
 * Mentions obligatoires (art. L441-9 et R123-237 C. com., art. 242 nonies A annexe II CGI).
 */
import * as React from "react";
import Image from "next/image";
import type { LineItem, Settings } from "@/lib/domain/types";
import { lineTotal, money, totals } from "@/lib/format";
import { cn } from "@/lib/utils";
import { legalIdentity, vatBreakdown } from "../../lib";

export interface DocParty {
  name: string;
  lines: string[];
}

export interface DocModel {
  /** « Facture », « Facture d'acompte », « Avoir », « Devis »… */
  title: string;
  number: string;
  draft?: boolean;
  meta: { label: string; value: string }[];
  /** « Facturé à », « Client » (avoir), « Destinataire » (devis). */
  clientLabel: string;
  client: DocParty;
  subject: string[];
  lines: LineItem[];
  /** -1 pour un avoir (montants négatifs). */
  sign: 1 | -1;
  paidCents?: number;
  showBalance?: boolean;
  terms: string[];
  payment?: { iban: string; reference: string; link?: string; methods: string[] };
  mentions: string[];
  notes?: string;
  signatureBox?: boolean;
}

function Amount({ cents, className, strong }: { cents: number; className?: string; strong?: boolean }) {
  return <span className={cn("tabular whitespace-nowrap", strong && "font-semibold", className)}>{money(cents, true)}</span>;
}

export function DocumentSheet({ model, settings, className }: { model: DocModel; settings: Settings; className?: string }) {
  const id = legalIdentity(settings);
  const t = totals(model.lines);
  const s = model.sign;
  const vat = vatBreakdown(model.lines);
  const ttc = t.ttc * s;
  const paid = model.paidCents ?? 0;
  return (
    <article className={cn("relative bg-surface text-[12px] leading-relaxed text-foreground", className)} aria-label={`${model.title} ${model.number}`}>
      {model.draft ? (
        <div className="mb-4 rounded-md border border-dashed border-warning bg-warning-soft px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-warning-text">
          Brouillon — document sans valeur comptable (numéro attribué à l'émission)
        </div>
      ) : null}

      {/* En-tête : émetteur + identification de la pièce */}
      <header className="flex flex-col gap-5 border-b-2 border-foreground pb-5 sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between">
        <div className="min-w-0 space-y-0.5">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="inline-flex size-10 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-border">
              <Image src="/logo-sw-v4.webp" alt="" width={36} height={36} />
            </span>
            <div>
              <p className="font-display text-base font-semibold leading-tight tracking-tight">{settings.brand}</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Bootcamp MVP · Formation</p>
            </div>
          </div>
          <p className="font-semibold">{settings.legalName}</p>
          <p className="text-muted-foreground">{settings.address}</p>
          <p className="text-muted-foreground">
            SIRET {settings.siret}
            {id.rcs ? ` · ${id.rcs}` : ""}
          </p>
          {id.vatNumber ? <p className="text-muted-foreground">N° TVA intracommunautaire : {id.vatNumber}</p> : null}
          <p className="text-muted-foreground">
            {settings.email} · {settings.phone}
          </p>
        </div>
        <div className="shrink-0 sm:text-right print:text-right">
          <p className="font-display text-2xl font-semibold uppercase tracking-tight">{model.title}</p>
          <p className="mt-0.5 font-mono text-sm font-medium">N° {model.number}</p>
          <dl className="mt-3 space-y-0.5">
            {model.meta.map((m) => (
              <div key={m.label} className="flex gap-2 sm:justify-end print:justify-end">
                <dt className="text-muted-foreground">{m.label} :</dt>
                <dd className="font-medium">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* Client + objet */}
      <section className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 print:grid-cols-2">
        <div className="min-w-0">
          <p className="eyebrow mb-1.5 text-muted-foreground">Objet</p>
          {model.subject.length ? (
            <ul className="space-y-0.5">
              {model.subject.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Prestations StartupWeek</p>
          )}
        </div>
        <div className="min-w-0 rounded-md border border-border-strong p-3">
          <p className="eyebrow mb-1.5 text-muted-foreground">{model.clientLabel}</p>
          <p className="font-semibold">{model.client.name}</p>
          {model.client.lines.map((l, i) => (
            <p key={i} className="text-muted-foreground">
              {l}
            </p>
          ))}
        </div>
      </section>

      {/* Lignes */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="border-y border-border-strong bg-surface-2 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-2 py-2 font-semibold">Désignation</th>
              <th scope="col" className="w-12 px-2 py-2 text-right font-semibold">Qté</th>
              <th scope="col" className="w-28 px-2 py-2 text-right font-semibold">PU HT</th>
              <th scope="col" className="w-14 px-2 py-2 text-right font-semibold">TVA</th>
              <th scope="col" className="w-28 px-2 py-2 text-right font-semibold">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {model.lines.map((l) => (
              <tr key={l.id} className="border-b border-border align-top">
                <td className="px-2 py-2">{l.label}</td>
                <td className="tabular px-2 py-2 text-right">{l.quantity.toLocaleString("fr-FR")}</td>
                <td className="px-2 py-2 text-right">
                  <Amount cents={l.unitPriceCents * s} />
                </td>
                <td className="tabular px-2 py-2 text-right">{l.vatRate} %</td>
                <td className="px-2 py-2 text-right">
                  <Amount cents={lineTotal(l).ht * s} />
                </td>
              </tr>
            ))}
            {model.lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">
                  Aucune ligne
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Totaux */}
      <section className="mt-4 flex justify-end print:break-inside-avoid">
        <dl className="w-full max-w-xs space-y-1">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Total HT</dt>
            <dd>
              <Amount cents={t.ht * s} />
            </dd>
          </div>
          {vat.map((v) => (
            <div key={v.rate} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                TVA {v.rate} %{vat.length > 1 ? ` (base ${money(v.base * s, true)})` : ""}
              </dt>
              <dd>
                <Amount cents={v.vat * s} />
              </dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t-2 border-foreground pt-1.5 text-sm">
            <dt className="font-semibold">Total TTC</dt>
            <dd>
              <Amount cents={ttc} strong />
            </dd>
          </div>
          {model.showBalance && paid > 0 ? (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Déjà réglé</dt>
                <dd>
                  <Amount cents={-paid} />
                </dd>
              </div>
              <div className="flex justify-between gap-4 rounded-md bg-surface-2 px-2 py-1 text-sm">
                <dt className="font-semibold">Reste à payer</dt>
                <dd>
                  <Amount cents={Math.max(0, ttc - paid)} strong />
                </dd>
              </div>
            </>
          ) : null}
        </dl>
      </section>

      {model.notes ? (
        <section className="mt-5 rounded-md bg-surface-2 px-3 py-2">
          <p className="eyebrow mb-1 text-muted-foreground">Notes</p>
          <p className="whitespace-pre-line">{model.notes}</p>
        </section>
      ) : null}

      {/* Conditions & règlement */}
      <section className="mt-6 grid grid-cols-1 gap-5 border-t border-border pt-4 sm:grid-cols-2 print:grid-cols-2 print:break-inside-avoid">
        <div className="min-w-0">
          <p className="eyebrow mb-1.5 text-muted-foreground">Conditions</p>
          <ul className="space-y-0.5">
            {model.terms.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
        {model.payment ? (
          <div className="min-w-0">
            <p className="eyebrow mb-1.5 text-muted-foreground">Règlement</p>
            <ul className="space-y-0.5">
              {model.payment.methods.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
              <li>
                IBAN : <span className="font-mono text-[11px]">{model.payment.iban}</span>
              </li>
              <li>
                Référence à rappeler : <span className="font-mono text-[11px] font-medium">{model.payment.reference}</span>
              </li>
              {model.payment.link ? (
                <li className="break-all">
                  Paiement en ligne : <span className="font-mono text-[11px] text-accent-text">{model.payment.link}</span>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </section>

      {model.signatureBox ? (
        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:break-inside-avoid">
          <div />
          <div className="rounded-md border border-border-strong p-3">
            <p className="font-medium">Bon pour accord</p>
            <p className="text-[11px] text-muted-foreground">Date, nom, signature et cachet, précédés de la mention manuscrite « Bon pour accord ».</p>
            <div className="h-20" />
          </div>
        </section>
      ) : null}

      {/* Mentions légales */}
      <footer className="mt-6 space-y-1.5 border-t border-border pt-3 text-[10px] leading-snug text-muted-foreground">
        {model.mentions.map((m, i) => (
          <p key={i}>{m}</p>
        ))}
        <p className="pt-1 text-center">
          {settings.legalName} — {settings.brand} · {settings.address} · SIRET {settings.siret}
          {id.vatNumber ? ` · TVA ${id.vatNumber}` : ""}
          {id.nda ? ` · Déclaration d'activité n° ${id.nda}` : ""} · {settings.website.replace(/^https?:\/\//, "")}
        </p>
      </footer>
    </article>
  );
}
