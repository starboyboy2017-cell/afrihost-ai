/**
 * Module 11 — Blanchisserie : types de linge.
 * GET  /api/laundry/item-types → liste (laundry.view)
 * POST /api/laundry/item-types → créer (laundry.manage)
 */
import { NextResponse } from "next/server";
import { laundryService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("laundry.view");
    const types = await laundryService.listItemTypes(ctx.hotelId, {
      organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId,
    });
    return NextResponse.json({ types });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("laundry.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const type = await laundryService.createItemType(ctx.hotelId, {
      name: body.name as string, unit: body.unit as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ type }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
