/**
 * Contexte partagé par les modules du seed : horloge, PRNG et collections en cours de construction.
 * Les modules sont appelés dans l'ordre des dépendances (équipe → catalogue → CRM → candidatures → facturation…).
 */
import type { BaseEntity, EntityMap, EntityName, FundingSource, ID, PaymentMethod } from "../../domain/types";
import type { SeedData } from "../seed";
import { Clock, Rng } from "./helpers";

/** Échéancier de paiement d'une candidature (calculé avec la chronologie, consommé par la facturation). */
export interface AppPlan {
  priceCents: number; // prix TTC de l'inscription
  method: PaymentMethod; // moyen de paiement préféré
  funding: FundingSource;
  payerOrgId?: ID; // entreprise qui paie (financement employeur)
  funder?: { name: string; orgId: ID; agreementRef: string };
  deposit?: { issuedTs: number; dueTs: number; paidTs?: number }; // acompte 30 %
  balance?: { issuedTs: number; dueTs: number; paidTs?: number; partialCents?: number; reminders: number; lastReminderTs?: number }; // solde 70 %
  single?: { issuedTs: number; dueTs: number; paidTs?: number }; // facture unique (financeur en subrogation)
  refund?: { avoirTs: number; refundTs: number }; // désistement remboursé (avoir)
}

export interface SeedContext {
  clock: Clock;
  rng: Rng;
  data: SeedData;
  /** Données de travail inter-modules (non exportées dans le seed). */
  scratch: {
    appPlans: Map<ID, AppPlan>;
  };
}

/** Champs communs createdAt / updatedAt (updatedAt ≥ createdAt, jamais dans le futur). */
export function stamps(ctx: SeedContext, createdTs: number, updatedTs?: number): Pick<BaseEntity, "createdAt" | "updatedAt"> {
  const c = ctx.clock.past(createdTs);
  const u = ctx.clock.past(Math.max(c, updatedTs ?? createdTs));
  return { createdAt: ctx.clock.iso(c), updatedAt: ctx.clock.iso(u) };
}

/** Recherche stricte par id (lève une erreur si l'id n'existe pas → garantit l'intégrité référentielle du seed). */
export function byId<K extends EntityName>(ctx: SeedContext, collection: K, id: ID): EntityMap[K] {
  const row = (ctx.data[collection] as EntityMap[K][]).find((r) => r.id === id);
  if (!row) throw new Error(`[seed] ${collection}#${id} introuvable`);
  return row;
}

/** Jour relatif (entier) d'un timestamp par rapport à aujourd'hui (0 = aujourd'hui). */
export function dayRel(ctx: SeedContext, ts: number): number {
  return Math.round((Math.floor(ts / 86_400_000) * 86_400_000 - ctx.clock.today0) / 86_400_000);
}
