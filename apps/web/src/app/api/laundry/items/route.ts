/**
 * Module 11 — Blanchisserie : pièces de linge.
 * GET  /api/laundry/items?state&itemTypeId → liste (laundry.view)
 * POST /api/laundry/items                  → ajouter (laundry.manage)
 */
import { NextResponse } from "next/server";
import { laundryService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("laundry.view");
    const url = new URL(req.url);
    const result = await laundryService.listItems(ctx.hotelId, {
      state: (url.searchParams.get("state") ?? undefined) as never,
      itemTypeId: url.searchParams.get("itemTypeId") ?? undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json(result);
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("laundry.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const item = await laundryService.addItem(ctx.hotelId, {
      itemTypeId: body.itemTypeId as string, code: body.code as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
