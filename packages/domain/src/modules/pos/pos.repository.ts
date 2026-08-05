/**
 * Module 13 — POS : port de persistance.
 */
import type {
  CreateMenuLineInput,
  CreatePosOrderInput,
  CreatePosPointInput,
  PosMenuLine,
  PosOrder,
  PosOrderLine,
  PosOrderStatus,
  PosPaymentInput,
  PosPoint,
} from "./pos.types.js";

export interface PosRepository {
  // Points de vente
  createPosPoint(hotelId: string, input: CreatePosPointInput): Promise<PosPoint>;
  listPosPoints(hotelId: string): Promise<PosPoint[]>;
  posPointExists(hotelId: string, posPointId: string): Promise<boolean>;

  // Menus / lignes
  createMenu(hotelId: string, posPointId: string, name: string): Promise<{ id: string }>;
  addMenuLine(hotelId: string, menuId: string, input: CreateMenuLineInput): Promise<PosMenuLine>;
  listMenuLines(hotelId: string, posPointId: string): Promise<(PosMenuLine & { productName?: string })[]>;

  // Produits
  getProduct(hotelId: string, productId: string): Promise<{ id: string; name: string; price: number; taxRate: number; currency: string } | null>;

  // Commandes
  createOrder(hotelId: string, input: CreatePosOrderInput & { orderRef: string; createdBy?: string }): Promise<PosOrder>;
  addOrderLines(orderId: string, lines: { productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number; taxRate: number }[]): Promise<void>;
  setOrderStatus(hotelId: string, orderId: string, status: PosOrderStatus): Promise<PosOrder>;
  getOrder(hotelId: string, orderId: string): Promise<PosOrder | null>;
  getOrderLines(orderId: string): Promise<PosOrderLine[]>;
  listOrders(hotelId: string, status?: PosOrderStatus): Promise<PosOrder[]>;

  // Événements / traçabilité
  logOrderEvent(orderId: string, action: string, actor?: string, detail?: string): Promise<void>;

  // Paiements
  recordPayment(hotelId: string, input: PosPaymentInput, receivedBy?: string): Promise<void>;

  // Chiffre d'affaires
  getRevenue(hotelId: string): Promise<number>;

  /** Génère une référence de commande unique. */
  nextOrderRef(): Promise<string>;
}
