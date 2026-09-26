"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCollection, useSettings } from "@/lib/hooks";
import type { LineItem } from "@/lib/domain/types";
import { money, totals } from "@/lib/format";
import { uid } from "@/lib/utils";
import { Button, Input, Select } from "@/components/ui";
import { centsToInput, isB2bOffer, lineFromOffer, parseAmountToCents, vatBreakdown } from "../../lib";

/** Ligne en cours de saisie : champs texte (virgule décimale) convertis à l'enregistrement. */
export interface EditorLine {
  id: string;
  label: string;
  quantity: string;
  ht: string;
  ttc: string;
  vatRate: number;
}

const withVat = (htCents: number, rate: number) => Math.round(htCents * (1 + rate / 100));

export function toEditorLine(l: LineItem): EditorLine {
  return { id: l.id, label: l.label, quantity: String(l.quantity).replace(".", ","), ht: centsToInput(l.unitPriceCents), ttc: centsToInput(withVat(l.unitPriceCents, l.vatRate)), vatRate: l.vatRate };
}

export function toLineItem(l: EditorLine): LineItem {
  const q = Number(l.quantity.replace(",", ".").replace(/\s/g, ""));
  return { id: l.id, label: l.label.trim(), quantity: Number.isFinite(q) ? q : 0, unitPriceCents: parseAmountToCents(l.ht) ?? 0, vatRate: l.vatRate };
}

export function emptyLine(vatRate: number): EditorLine {
  return { id: uid("li"), label: "", quantity: "1", ht: "", ttc: "", vatRate };
}

export function LinesEditor({ lines, onChange, error }: { lines: EditorLine[]; onChange: (lines: EditorLine[]) => void; error?: string }) {
  const offers = useCollection("offers");
  const settings = useSettings();
  const defaultVat = settings.vatExempt ? 0 : 20;
  const active = React.useMemo(() => offers.filter((o) => o.active).sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)), [offers]);

  const patch = (id: string, p: Partial<EditorLine>) => onChange(lines.map((l) => (l.id === id ? { ...l, ...p } : l)));
  const setHt = (l: EditorLine, v: string) => {
    const c = parseAmountToCents(v);
    patch(l.id, { ht: v, ttc: c === null ? l.ttc : centsToInput(withVat(c, l.vatRate)) });
  };
  const setTtc = (l: EditorLine, v: string) => {
    const c = parseAmountToCents(v);
    patch(l.id, { ttc: v, ht: c === null ? l.ht : centsToInput(Math.round(c / (1 + l.vatRate / 100))) });
  };
  const setVat = (l: EditorLine, rate: number) => {
    const c = parseAmountToCents(l.ht);
    patch(l.id, { vatRate: rate, ttc: c === null ? l.ttc : centsToInput(withVat(c, rate)) });
  };

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[minmax(0,1fr)_4.5rem_7rem_7rem_6.5rem_6.5rem_2rem] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
        <span>Désignation</span>
        <span className="text-right">Qté</span>
        <span className="text-right">PU HT (€)</span>
        <span className="text-right">PU TTC (€)</span>
        <span>TVA</span>
        <span className="text-right">Total HT</span>
        <span className="sr-only">Actions</span>
      </div>
      <ul className="space-y-2">
        {lines.map((l, idx) => {
          const item = toLineItem(l);
          const lineHt = Math.round(item.quantity * item.unitPriceCents);
          const n = idx + 1;
          return (
            <li key={l.id} className="grid grid-cols-2 gap-2 rounded-md border border-border p-2 md:grid-cols-[minmax(0,1fr)_4.5rem_7rem_7rem_6.5rem_6.5rem_2rem] md:items-center md:border-0 md:p-0">
              <Input aria-label={`Désignation ligne ${n}`} value={l.label} onChange={(e) => patch(l.id, { label: e.target.value })} placeholder="Ex. StartupWeek Présentiel — SW-0012" className="col-span-2 md:col-span-1" />
              <Input aria-label={`Quantité ligne ${n}`} inputMode="decimal" value={l.quantity} onChange={(e) => patch(l.id, { quantity: e.target.value })} className="text-right tabular" />
              <Input aria-label={`Prix unitaire HT ligne ${n}`} inputMode="decimal" value={l.ht} onChange={(e) => setHt(l, e.target.value)} placeholder="0,00" className="text-right tabular" />
              <Input aria-label={`Prix unitaire TTC ligne ${n}`} inputMode="decimal" value={l.ttc} onChange={(e) => setTtc(l, e.target.value)} placeholder="0,00" className="text-right tabular" />
              <Select
                aria-label={`Taux de TVA ligne ${n}`}
                value={String(l.vatRate)}
                onChange={(e) => setVat(l, Number(e.target.value))}
                options={[
                  { value: "20", label: "20 %" },
                  { value: "0", label: "0 % (exo.)" },
                ]}
              />
              <span className="tabular self-center text-right text-sm font-medium">{money(lineHt, true)}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => onChange(lines.filter((x) => x.id !== l.id))} aria-label={`Supprimer la ligne ${n}`} disabled={lines.length <= 1} className="justify-self-end">
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          aria-label="Ajouter une ligne depuis le catalogue"
          value=""
          onChange={(e) => {
            const offer = active.find((o) => o.id === e.target.value);
            if (!offer) return;
            const line = toEditorLine(lineFromOffer(offer, settings.vatExempt, uid("li")));
            // Remplace la première ligne si elle est vide.
            const blank = lines.length === 1 && !lines[0].label && !lines[0].ht;
            onChange(blank ? [line] : [...lines, line]);
          }}
          placeholder="Ajouter depuis le catalogue…"
          options={active.map((o) => ({ value: o.id, label: `${o.name} — ${o.priceCents ? `${money(o.priceCents)} ${isB2bOffer(o) ? "HT" : "TTC"}` : "gratuit"}` }))}
          className="sm:max-w-sm sm:flex-1"
        />
        <Button variant="secondary" size="sm" onClick={() => onChange([...lines, emptyLine(defaultVat)])}>
          <Plus aria-hidden="true" /> Ligne libre
        </Button>
      </div>
      {error ? <p className="text-xs text-danger-text">{error}</p> : null}
    </div>
  );
}

export function TotalsSummary({ lines, sign = 1, className }: { lines: LineItem[]; sign?: 1 | -1; className?: string }) {
  const t = totals(lines);
  const vat = vatBreakdown(lines);
  return (
    <dl className={className ?? "space-y-1.5 text-sm"}>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Total HT</dt>
        <dd className="tabular">{money(t.ht * sign, true)}</dd>
      </div>
      {vat.map((v) => (
        <div key={v.rate} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">TVA {v.rate} %</dt>
          <dd className="tabular">{money(v.vat * sign, true)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-border pt-1.5 text-base">
        <dt className="font-semibold">Total TTC</dt>
        <dd className="tabular font-semibold">{money(t.ttc * sign, true)}</dd>
      </div>
      {vat.some((v) => v.rate === 0) ? <p className="pt-1 text-xs text-muted-foreground">Mention d'exonération (art. 261-4-4° a du CGI) ajoutée automatiquement au document.</p> : null}
    </dl>
  );
}
