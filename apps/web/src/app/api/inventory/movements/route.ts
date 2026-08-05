/**
 * Module 18 — Stock : mouvement de stock (décrémentation auto depuis POS/cuisine/etc.).
 * POST /api/inventory/movements  body: { productId, type, quantity, warehouseId?, unitCost?, reference?, note? }  (inventory.adjust)
 */
import { NextResponse } from "next/server";
import { inventoryService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("inventory.adjust");
    const body = (await req.json()) as Record<string, unknown>;
    await inventoryService.applyMovement(ctx.hotelId, {
      productId: body.productId as string,
      type: body.type as never,
      quantity: body.quantity as number,
      warehouseId: body.warehouseId as string | undefined,
      unitCost: body.unitCost as number | undefined,
      reference: body.reference as string | undefined,
      note: body.note as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
