/**
 * Module 18 — Stock : entrepôts.
 * GET  /api/inventory/warehouses → liste (inventory.view)
 * POST /api/inventory/warehouses → créer (inventory.manage)
 */
import { NextResponse } from "next/server";
import { inventoryService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("inventory.view");
    const warehouses = await inventoryService.listWarehouses(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ warehouses });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("inventory.manage");
    const body = (await req.json()) as { name?: string };
    const warehouse = await inventoryService.createWarehouse(ctx.hotelId, body.name ?? "", { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ warehouse }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
