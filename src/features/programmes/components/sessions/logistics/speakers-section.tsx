"use client";

import * as React from "react";
import Link from "next/link";
import { Mic2, Receipt } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { SPEAKER_KINDS, labelOf } from "@/lib/domain/constants";
import type { EventSession } from "@/lib/domain/types";
import { date, money } from "@/lib/format";
import { useCollection } from "@/lib/hooks";
import { expensePaid } from "../../../lib/logistics";
import type { ExpensePreset } from "./expenses-section";
import { StayModal, useStayRows } from "./stays-section";

export function SpeakersSection({ ev, canEdit, onBudget }: { ev: EventSession; canEdit: boolean; onBudget: (preset: ExpensePreset) => void }) {
  const speakers = useCollection("speakers");
  const expenses = useCollection("expenses");
  const rows = useStayRows(ev);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);

  const list = React.useMemo(() => {
    const byId = new Map(speakers.map((s) => [s.id, s]));
    return rows
      .filter((r) => r.role === "intervenant" && r.speakerId && byId.has(r.speakerId))
      .map((r) => {
        const s = byId.get(r.speakerId!)!;
        const slots = ev.program.filter((p) => p.speakerId === s.id);
        const days = new Set(slots.map((p) => p.day)).size;
        const fees = expenses.filter((e) => e.eventId === ev.id && e.speakerId === s.id && e.status !== "refuse");
        const feeTotal = fees.reduce((sum, e) => sum + e.amountCents, 0);
        const paid = fees.reduce((sum, e) => sum + expensePaid(e), 0);
        return { row: r, s, slots: slots.length, days, fees, feeTotal, paid };
      });
  }, [rows, speakers, expenses, ev.program, ev.id]);

  const editing = rows.find((r) => r.key === editingKey);

  return (
    <Card>
      <CardHeader className="flex-wrap gap-3">
        <div>
          <CardTitle>Intervenants de la session</CardTitle>
          <CardDescription>Présence, déplacements, hébergement et honoraires. Le contenu pédagogique se gère dans l'onglet « Programme ».</CardDescription>
        </div>
        <Link href="/intervenants" className="text-sm font-medium text-accent-text hover:underline">
          Annuaire des intervenants
        </Link>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <EmptyState icon={Mic2} title="Aucun intervenant" description="Affectez des intervenants aux créneaux dans l'onglet « Programme » : ils apparaîtront ici." />
        ) : (
          <ul className="divide-y divide-border">
            {list.map(({ row, s, slots, days, fees, feeTotal, paid }) => {
              const st = row.stay;
              const suggested = s.dailyRateCents && days ? s.dailyRateCents * days : undefined;
              return (
                <li key={s.id} className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {labelOf(SPEAKER_KINDS, s.kind)} · {slots} créneau{slots > 1 ? "x" : ""} sur {days} jour{days > 1 ? "s" : ""} · {s.contractType === "benevole" ? "Bénévole" : s.contractType === "salarie" ? "Salarié" : "Freelance"}
                      {s.city ? ` · ${s.city}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {st?.confirmed ? <Badge tone="success" dot>Présence confirmée</Badge> : <Badge dot>À confirmer</Badge>}
                    {st?.arrivalAt ? <Badge tone="info">Arrivée {date(st.arrivalAt, "EEE d · HH:mm")}</Badge> : <Badge tone="warning">Arrivée à renseigner</Badge>}
                    {st?.room ? <Badge>{st.room}</Badge> : null}
                    {fees.length ? (
                      <Badge tone={paid >= feeTotal ? "success" : "neutral"}>
                        <Receipt className="size-3" aria-hidden="true" /> {money(feeTotal)} · payé {money(paid)}
                      </Badge>
                    ) : s.contractType === "benevole" || s.contractType === "salarie" ? null : (
                      <Badge tone="warning">Honoraires non budgétés</Badge>
                    )}
                  </div>
                  {canEdit ? (
                    <div className="flex gap-2">
                      <Button size="xs" variant="secondary" onClick={() => setEditingKey(row.key)}>
                        Séjour
                      </Button>
                      {!fees.length && s.contractType === "freelance" ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() =>
                            onBudget({ category: "intervenant", label: `Honoraires ${s.firstName} ${s.lastName}`, supplier: `${s.firstName} ${s.lastName}`, amountCents: suggested, speakerId: s.id, status: "accepte" })
                          }
                          title={suggested ? `Tarif jour ${money(s.dailyRateCents)} × ${days} j` : undefined}
                        >
                          <Receipt /> Honoraires
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      {editing ? <StayModal ev={ev} row={editing} onClose={() => setEditingKey(null)} /> : null}
    </Card>
  );
}
