/**
 * Module 18 — Stock : validation (zod).
 */

import { z } from "zod";
import type { CreatePurchaseOrderInput, CreateReceiptInput, CreateStockCountInput, StockMovementInput } from "./inventory.types.js";

const movementTypeEnum = ["RECEIPT", "ISSUE", "TRANSFER", "ADJUSTMENT", "RETURN", "LOSS", "BREAKAGE", "PRODUCTION"] as const;
const dateCoerce = z.coerce.date({ message: "Date invalide" });

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  expectedDate: dateCoerce.optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  lines: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().int().min(0),
  })).min(1, "Commande vide"),
}).strict();

export const createReceiptSchema = z.object({
  purchaseOrderId: z.string().min(1).optional().nullable(),
  supplierId: z.string().min(1).optional().nullable(),
  lines: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().int().min(0),
    warehouseId: z.string().min(1).optional().nullable(),
  })).min(1, "Réception vide"),
  note: z.string().trim().optional().nullable(),
}).strict();

export const stockMovementSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(movementTypeEnum),
  quantity: z.number().positive(),
  warehouseId: z.string().min(1).optional().nullable(),
  unitCost: z.number().int().min(0).optional().nullable(),
  reference: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
}).strict();

export const createStockCountSchema = z.object({
  warehouseId: z.string().min(1).optional().nullable(),
  lines: z.array(z.object({
    productId: z.string().min(1),
    countedQty: z.number().min(0),
  })).min(1, "Inventaire vide"),
}).strict();

export function validateCreatePurchaseOrder(input: CreatePurchaseOrderInput): CreatePurchaseOrderInput {
  return createPurchaseOrderSchema.parse(input) as CreatePurchaseOrderInput;
}
export function validateCreateReceipt(input: CreateReceiptInput): CreateReceiptInput {
  return createReceiptSchema.parse(input) as CreateReceiptInput;
}
export function validateStockMovement(input: StockMovementInput): StockMovementInput {
  return stockMovementSchema.parse(input) as StockMovementInput;
}
export function validateCreateStockCount(input: CreateStockCountInput): CreateStockCountInput {
  return createStockCountSchema.parse(input) as CreateStockCountInput;
}
