/**
 * Module 3 — Réservations : calcul de tarif (BusinessRules BR-5.7).
 *   Prix = nb_nuits × taux − remise + taxes
 * Montants en **minor units** (ADR-007).
 */

export interface PriceResult {
  nights: number;
  baseTotal: number; // nuits × baseRate (minor units)
  discountAmount: number;
  subtotal: number; // baseTotal − discount
  taxAmount: number;
  total: number;
}

/** Calcule le prix d'un séjour. */
export function computePrice(params: {
  arrivalDate: Date;
  departureDate: Date;
  baseRate: number; // minor units / nuit
  discountAmount?: number;
  vatRate?: number; // 0..1
}): PriceResult {
  const nights = Math.max(
    1,
    Math.round((params.departureDate.getTime() - params.arrivalDate.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const baseTotal = nights * params.baseRate;
  const discount = params.discountAmount ?? 0;
  const subtotal = baseTotal - discount;
  const vat = params.vatRate ?? 0;
  const taxAmount = Math.round(subtotal * vat);
  return {
    nights,
    baseTotal,
    discountAmount: discount,
    subtotal,
    taxAmount,
    total: subtotal + taxAmount,
  };
}
