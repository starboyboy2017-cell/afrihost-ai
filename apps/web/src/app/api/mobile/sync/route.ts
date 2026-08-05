/**
 * Module 31 — Mobile : synchronisation offline.
 * GET  → opérations en attente (mobile.view)
 * POST → pousser une opération (mobile.manage)
 */
import { NextResponse } from "next/server";
import { mobileService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("mobile.view");
    const pending = await mobileService.listPendingSync(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ pending });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("mobile.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const log = await mobileService.pushSync(ctx.hotelId, {
      entityType: body.entityType as string, entityId: body.entityId as string,
      operation: body.operation as never, payload: (body.payload as Record<string, unknown>) ?? {},
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ log }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
