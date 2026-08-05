/**
 * Module 18 — Stock : fournisseurs.
 * GET  /api/inventory/suppliers → liste (inventory.view)
 * POST /api/inventory/suppliers → créer (inventory.manage)
 */
import { NextResponse } from "next/server";
import { inventoryService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("inventory.view");
    const suppliers = await inventoryService.listSuppliers(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ suppliers });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("inventory.manage");
    const body = (await req.json()) as { name?: string; phone?: string; email?: string };
    const supplier = await inventoryService.createSupplier(ctx.hotelId, { name: body.name ?? "", phone: body.phone, email: body.email }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
