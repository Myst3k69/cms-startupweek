"use client";

import * as React from "react";
import { z } from "zod";
import { recordPayment } from "@/lib/domain/actions";
import { invoiceBalance } from "@/lib/domain/selectors";
import { PAYMENT_METHODS } from "@/lib/domain/constants";
import type { Invoice, PaymentMethod } from "@/lib/domain/types";
import { money } from "@/lib/format";
import { Button, FormField, Input, Modal, Select, useToast } from "@/components/ui";
import { centsToInput, dateInputToIso, isoDateInput, parseAmountToCents } from "../lib";

const schema = z.object({
  amount: z.number({ message: "Montant invalide" }).int().positive("Le montant doit être positif"),
  method: z.enum(["stripe", "virement", "opco", "cb_terminal", "cheque"]),
  reference: z.string().trim().min(2, "Référence obligatoire (pi_…, id Qonto, n° d'accord OPCO…)"),
  date: z.string().min(10, "Date obligatoire"),
});

const REF_PLACEHOLDER: Record<PaymentMethod, string> = {
  stripe: "pi_3Q…",
  virement: "Id transaction Qonto",
  opco: "N° d'accord de prise en charge",
  cb_terminal: "N° de ticket",
  cheque: "N° de chèque",
};

function PaymentForm({ invoice, now, onDone }: { invoice: Invoice; now: number; onDone: () => void }) {
  const toast = useToast();
  const balance = Math.max(0, invoiceBalance(invoice));
  const [amount, setAmount] = React.useState(centsToInput(balance));
  const [method, setMethod] = React.useState<PaymentMethod>(invoice.preferredMethod);
  const [reference, setReference] = React.useState("");
  const [day, setDay] = React.useState(isoDateInput(new Date(now).toISOString()));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const cents = parseAmountToCents(amount);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ amount: cents ?? Number.NaN, method, reference, date: day });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    const receivedAt = dateInputToIso(day);
    recordPayment(invoice.id, parsed.data.amount, parsed.data.method, parsed.data.reference.trim(), { receivedAt });
    toast({ title: "Paiement enregistré", description: `${money(parsed.data.amount, true)} sur ${invoice.number}${parsed.data.amount >= balance ? " — facture soldée" : ""}` });
    onDone();
  };

  return (
    <form id="record-payment" onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Montant (€ TTC)" htmlFor="pay-amount" error={errors.amount} hint={cents !== null && cents > balance ? `Trop-perçu de ${money(cents - balance, true)}` : `Reste dû : ${money(balance, true)}`}>
          <Input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </FormField>
        <FormField label="Date de réception" htmlFor="pay-date" error={errors.date}>
          <Input id="pay-date" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </FormField>
        <FormField label="Moyen de paiement" htmlFor="pay-method">
          <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={PAYMENT_METHODS} />
        </FormField>
        <FormField label="Référence" htmlFor="pay-ref" error={errors.reference} hint={method === "stripe" ? "Frais Stripe estimés : 1,5 % + 0,25 €" : undefined}>
          <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={REF_PLACEHOLDER[method]} />
        </FormField>
      </div>
    </form>
  );
}

export function RecordPaymentModal({ invoice, now, open, onClose }: { invoice: Invoice; now: number; open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enregistrer un paiement"
      description={`${invoice.number} · reste dû ${money(Math.max(0, invoiceBalance(invoice)), true)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form="record-payment">
            Enregistrer le paiement
          </Button>
        </>
      }
    >
      {open ? <PaymentForm invoice={invoice} now={now} onDone={onClose} /> : null}
    </Modal>
  );
}
