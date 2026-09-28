"use client";

import * as React from "react";
import { BookOpen, Plus, Printer, Wand2, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FormField, Input, LinkButton, Progress, Textarea, useToast } from "@/components/ui";
import type { EventSession, SessionLogistics, Venue } from "@/lib/domain/types";
import { useActions } from "@/lib/hooks";
import { LOGISTICS_FIELDS, logisticsCompleteness } from "../../../lib/logistics";

type Draft = Required<Omit<SessionLogistics, "whatToBring">> & { whatToBring: string[] };

function toDraft(l: SessionLogistics | undefined): Draft {
  const d = Object.fromEntries(LOGISTICS_FIELDS.map((f) => [f.key, l?.[f.key] ?? ""])) as Omit<Draft, "whatToBring">;
  return { ...d, whatToBring: l?.whatToBring ?? [] };
}

export function InfoSection({ ev, venue, canEdit }: { ev: EventSession; venue?: Venue; canEdit: boolean }) {
  const { update } = useActions();
  const toast = useToast();
  const [d, setD] = React.useState<Draft>(() => toDraft(ev.logistics));
  const [item, setItem] = React.useState("");
  const saved = React.useMemo(() => JSON.stringify(toDraft(ev.logistics)), [ev.logistics]);
  const dirty = JSON.stringify(d) !== saved;
  const completeness = logisticsCompleteness(ev.logistics);

  const save = () => {
    const out: SessionLogistics = {};
    for (const f of LOGISTICS_FIELDS) {
      const v = d[f.key].trim();
      if (v) out[f.key] = v;
    }
    const bring = d.whatToBring.map((x) => x.trim()).filter(Boolean);
    if (bring.length) out.whatToBring = bring;
    update("events", ev.id, { logistics: out }, { log: "Infos pratiques mises à jour" });
    toast({ title: "Infos pratiques enregistrées", description: "Le livret d'accueil est à jour." });
  };

  // Pré-remplissage depuis la fiche du lieu retenu (sans écraser ce qui est déjà saisi).
  const prefill = () => {
    if (!venue) return;
    setD((x) => ({
      ...x,
      address: x.address || [venue.name, venue.address ?? `${venue.city}${venue.country ? `, ${venue.country}` : ""}`].join(" — "),
      access: x.access || venue.accessInfo || "",
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-medium text-foreground">
              Livret d'accueil participant{" "}
              <span className="tabular text-sm font-normal text-muted-foreground">
                · {completeness.done}/{completeness.total} rubriques essentielles
              </span>
            </p>
            <Progress value={(completeness.done / completeness.total) * 100} tone={completeness.missing.length ? "warning" : "success"} label={`${completeness.done}/${completeness.total} rubriques essentielles`} />
            {completeness.missing.length ? <p className="text-xs text-muted-foreground">À compléter : {completeness.missing.join(", ")}.</p> : <p className="text-xs text-success-text">Complet : prêt à être envoyé aux participants.</p>}
          </div>
          <LinkButton href={`/print/livret/${ev.id}`} target="_blank" variant="secondary" size="sm">
            <Printer /> Aperçu / PDF
          </LinkButton>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-wrap gap-3">
          <div>
            <CardTitle>Infos pratiques</CardTitle>
            <CardDescription>Ce que les participants doivent savoir avant de partir. Repris dans le livret d'accueil.</CardDescription>
          </div>
          {canEdit && venue ? (
            <Button size="sm" variant="ghost" onClick={prefill}>
              <Wand2 /> Reprendre la fiche du lieu
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <fieldset disabled={!canEdit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {LOGISTICS_FIELDS.map((f) => (
                <FormField key={f.key} label={f.essential ? `${f.label} *` : f.label} htmlFor={`log-${ev.id}-${f.key}`} className={f.long ? "sm:col-span-2" : undefined}>
                  {f.long ? (
                    <Textarea id={`log-${ev.id}-${f.key}`} rows={2} value={d[f.key]} onChange={(e) => setD((x) => ({ ...x, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                  ) : (
                    <Input id={`log-${ev.id}-${f.key}`} value={d[f.key]} onChange={(e) => setD((x) => ({ ...x, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                  )}
                </FormField>
              ))}
              <div className="space-y-2 sm:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Quoi apporter *</p>
                <div className="flex flex-wrap gap-2">
                  {d.whatToBring.map((w) => (
                    <Badge key={w} className="pr-1">
                      {w}
                      {canEdit ? (
                        <button type="button" aria-label={`Retirer « ${w} »`} className="rounded-full p-0.5 hover:bg-surface-3" onClick={() => setD((x) => ({ ...x, whatToBring: x.whatToBring.filter((y) => y !== w) }))}>
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      ) : null}
                    </Badge>
                  ))}
                  {d.whatToBring.length === 0 ? <span className="text-xs text-faint">Rien pour l'instant.</span> : null}
                </div>
                {canEdit ? (
                  <div className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => setItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (item.trim() && !d.whatToBring.includes(item.trim())) setD((x) => ({ ...x, whatToBring: [...x.whatToBring, item.trim()] }));
                          setItem("");
                        }
                      }}
                      placeholder="Ordinateur portable, maillot de bain…"
                      aria-label="Ajouter un élément à apporter"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (item.trim() && !d.whatToBring.includes(item.trim())) setD((x) => ({ ...x, whatToBring: [...x.whatToBring, item.trim()] }));
                        setItem("");
                      }}
                    >
                      <Plus /> Ajouter
                    </Button>
                  </div>
                ) : null}
              </div>
            </fieldset>
            {canEdit ? (
              <div className="mt-5 flex items-center justify-end gap-3">
                {dirty ? <span className="text-xs text-warning-text">Modifications non enregistrées</span> : null}
                <Button type="submit" disabled={!dirty}>
                  Enregistrer
                </Button>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
