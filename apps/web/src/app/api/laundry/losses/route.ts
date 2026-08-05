/**
 * Module 11 — Blanchisserie : pertes / détériorations.
 * GET  /api/laundry/losses → liste (laundry.view)
 * POST /api/laundry/losses → enregistrer (laundry.loss)
 */
import { NextResponse } from "next/server";
import { laundryService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("laundry.view");
    const losses = await laundryService.listLosses(ctx.hotelId, {
      organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId,
    });
    return NextResponse.json({ losses });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("laundry.loss");
    const body = (await req.json()) as Record<string, unknown>;
    const loss = await laundryService.registerLoss(ctx.hotelId, {
      itemId: body.itemId as string,
      reason: body.reason as never,
      note: body.note as string | undefined,
      costValue: body.costValue as number | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ loss }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
