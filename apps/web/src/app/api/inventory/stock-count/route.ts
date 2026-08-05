/**
 * Module 18 — Stock : inventaire physique.
 * POST /api/inventory/stock-count  body: { warehouseId?, lines: [{productId, countedQty}] }  (inventory.count)
 */
import { NextResponse } from "next/server";
import { inventoryService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("inventory.count");
    const body = (await req.json()) as Record<string, unknown>;
    const count = await inventoryService.performStockCount(ctx.hotelId, {
      warehouseId: body.warehouseId as string | undefined,
      lines: body.lines as never,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ count }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
