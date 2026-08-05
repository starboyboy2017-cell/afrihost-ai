/**
 * Module 18 — Stock : commandes fournisseurs.
 * POST /api/inventory/purchase-orders  body: { supplierId, expectedDate?, notes?, lines: [{productId, quantity, unitPrice}] }  (inventory.reorder)
 */
import { NextResponse } from "next/server";
import { inventoryService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("inventory.reorder");
    const body = (await req.json()) as Record<string, unknown>;
    const po = await inventoryService.createPurchaseOrder(ctx.hotelId, {
      supplierId: body.supplierId as string,
      expectedDate: body.expectedDate as string | undefined,
      notes: body.notes as string | undefined,
      lines: body.lines as never,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ po }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
