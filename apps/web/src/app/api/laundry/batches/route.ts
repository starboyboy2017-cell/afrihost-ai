/**
 * Module 11 — Blanchisserie : lots de lavage.
 * GET  /api/laundry/batches → liste (laundry.view)
 * POST /api/laundry/batches → créer (laundry.batch)
 * POST /api/laundry/batches/:id/complete → terminer (laundry.batch)
 */
import { NextResponse } from "next/server";
import { laundryService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("laundry.view");
    const batches = await laundryService.listBatches(ctx.hotelId, {
      organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId,
    });
    return NextResponse.json({ batches });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("laundry.batch");
    const body = (await req.json()) as Record<string, unknown>;
    const batch = await laundryService.createBatch(ctx.hotelId, {
      mode: body.mode as never,
      providerName: body.providerName as string | undefined,
      responsible: body.responsible as string | undefined,
      cost: body.cost as number | undefined,
      currency: body.currency as string | undefined,
      notes: body.notes as string | undefined,
      itemIds: body.itemIds as string[] | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ batch }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
