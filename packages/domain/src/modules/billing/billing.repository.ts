/**
 * Module 20 — Paiements & facturation : port de persistance.
 */
import type {
  AddFolioLineInput,
  BillingPaymentInput,
  ConsolidatedInvoice,
  CreateFolioInput,
  CreateGatewayInput,
  Folio,
  FolioChargeType,
  FolioLine,
  PaymentGateway,
} from "./billing.types.js";

export interface BillingRepository {
  // Folios
  createFolio(hotelId: string, input: CreateFolioInput & { folioRef: string }): Promise<Folio>;
  getFolio(hotelId: string, folioId: string): Promise<Folio | null>;
  listFolios(hotelId: string, groupRef?: string): Promise<Folio[]>;
  setFolioStatus(hotelId: string, folioId: string, status: Folio["status"]): Promise<Folio>;
  nextFolioRef(): Promise<string>;

  // Lignes de frais
  addLine(hotelId: string, input: AddFolioLineInput): Promise<FolioLine>;
  getLines(hotelId: string, folioId: string): Promise<FolioLine[]>;
  /** Déplace une ligne vers un autre folio (transfert de lignes). */
  moveLine(lineId: string, targetFolioId: string): Promise<void>;
  voidLine(hotelId: string, lineId: string): Promise<void>;

  // Passerelles
  createGateway(hotelId: string, input: CreateGatewayInput): Promise<PaymentGateway>;
  listGateways(hotelId: string): Promise<PaymentGateway[]>;

  // Paiements
  recordPayment(hotelId: string, input: BillingPaymentInput, receivedBy?: string): Promise<void>;
  listPayments(hotelId: string, folioId: string): Promise<{ id: string; amount: number; method: string; kind: string | null }[]>;
  getFolioPaidTotal(hotelId: string, folioId: string): Promise<number>;

  // Facturation consolidée
  generateInvoice(folioId: string, data: { number: string; subtotal: number; taxAmount: number; total: number }): Promise<{ id: string }>;
  nextInvoiceNumber(): Promise<string>;
  /** Calcule le total des lignes non voidées d'un folio. */
  getFolioLinesTotal(hotelId: string, folioId: string): Promise<{ subtotal: number; taxAmount: number }>;
}
