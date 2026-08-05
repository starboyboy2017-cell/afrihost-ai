/**
 * Module 11 — Blanchisserie : port de persistance.
 */
import type {
  CreateBatchInput,
  CreateItemInput,
  CreateItemTypeInput,
  CreateLossInput,
  LaundryBatch,
  LaundryFilter,
  LaundryItem,
  LaundryItemType,
  LaundryLoss,
  LaundryState,
} from "./laundry.types.js";

/** Stock par type (pour les alertes de seuil). */
export interface LaundryStock {
  itemTypeId: string;
  name: string;
  clean: number;
  total: number;
}

export interface LaundryRepository {
  // Types de linge
  createItemType(hotelId: string, input: CreateItemTypeInput): Promise<LaundryItemType>;
  listItemTypes(hotelId: string): Promise<LaundryItemType[]>;
  itemTypeExists(hotelId: string, itemTypeId: string): Promise<boolean>;

  // Pièces de linge
  createItem(hotelId: string, input: CreateItemInput): Promise<LaundryItem>;
  getItem(hotelId: string, itemId: string): Promise<LaundryItem | null>;
  setItemState(hotelId: string, itemId: string, state: LaundryState, roomId?: string | null): Promise<LaundryItem>;
  /** Change l'état de plusieurs pièces à la fois (ex: entrées d'un lot). */
  setItemsState(itemIds: string[], state: LaundryState, roomId?: string | null): Promise<number>;
  listItems(filter: LaundryFilter): Promise<{ items: LaundryItem[]; total: number }>;
  /** Stock par type (comptage des pièces CLEAN vs total). */
  getStock(hotelId: string): Promise<LaundryStock[]>;
  /** Soft-delete une pièce (perte/détérioration). */
  softDeleteItem(hotelId: string, itemId: string): Promise<void>;

  // Lots de lavage
  createBatch(hotelId: string, input: CreateBatchInput): Promise<LaundryBatch>;
  completeBatch(hotelId: string, batchId: string): Promise<LaundryBatch>;
  getBatch(hotelId: string, batchId: string): Promise<LaundryBatch | null>;
  listBatches(hotelId: string): Promise<LaundryBatch[]>;

  // Pertes / détériorations
  createLoss(hotelId: string, input: CreateLossInput): Promise<LaundryLoss>;
  listLosses(hotelId: string): Promise<LaundryLoss[]>;
}
