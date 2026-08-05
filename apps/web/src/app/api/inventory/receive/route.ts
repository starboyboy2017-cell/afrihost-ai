/**
 * Module 18 — Stock : réception de livraison.
 * POST /api/inventory/receive  body: { purchaseOrderId?, supplierId?, lines: [{productId, quantity, unitPrice, warehouseId?}], note? }  (inventory.receive)
 */
import { NextResponse } from "next/server";
import { inventoryService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("inventory.receive");
    const body = (await req.json()) as Record<string, unknown>;
    const receipt = await inventoryService.receive(ctx.hotelId, {
      purchaseOrderId: body.purchaseOrderId as string | undefined,
      supplierId: body.supplierId as string | undefined,
      lines: body.lines as never,
      note: body.note as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ receipt }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
