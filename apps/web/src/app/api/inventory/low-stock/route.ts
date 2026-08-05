/**
 * Module 18 — Stock : alertes de réapprovisionnement.
 * GET /api/inventory/low-stock → articles sous le seuil (inventory.view)
 */
import { NextResponse } from "next/server";
import { inventoryService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("inventory.view");
    const lowStock = await inventoryService.listLowStock(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ lowStock });
  } catch (err) { return errorResponse(err); }
}
