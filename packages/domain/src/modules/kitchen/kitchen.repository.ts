/**
 * Module 14 — Cuisine : port de persistance.
 */
import type {
  CreateKitchenOrderInput,
  CreateStationInput,
  KitchenFilter,
  KitchenOrder,
  KitchenOrderLine,
  KitchenOrderStatus,
  KitchenStation,
} from "./kitchen.types.js";

export interface KitchenRepository {
  // Postes
  createStation(hotelId: string, input: CreateStationInput): Promise<KitchenStation>;
  listStations(hotelId: string): Promise<KitchenStation[]>;
  stationExists(hotelId: string, stationId: string): Promise<boolean>;

  // Ordres
  createOrder(hotelId: string, input: CreateKitchenOrderInput & { kitchenRef: string }): Promise<KitchenOrder>;
  getOrder(hotelId: string, orderId: string): Promise<KitchenOrder | null>;
  getOrderLines(orderId: string): Promise<KitchenOrderLine[]>;
  setOrderStatus(hotelId: string, orderId: string, status: KitchenOrderStatus, actor?: string): Promise<KitchenOrder>;
  listOrders(filter: KitchenFilter): Promise<{ orders: KitchenOrder[]; total: number }>;

  // Lignes
  addOrderLines(orderId: string, lines: { productId: string; productName: string; quantity: number; note?: string | null }[]): Promise<void>;
  setLineStatus(orderId: string, lineId: string, status: KitchenOrderLine["status"]): Promise<void>;

  // Événements / temps réel
  logOrderEvent(orderId: string, action: string, actor?: string, detail?: string): Promise<void>;

  // Lignes de la commande POS source
  getPosOrderLines(posOrderId: string): Promise<{ productId: string; productName: string; quantity: number }[]>;

  /** Génère une référence d'ordre unique. */
  nextKitchenRef(): Promise<string>;
}
