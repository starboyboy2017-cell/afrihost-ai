/**
 * Module 12 — Transport : affectation automatique.
 * POST /api/transport/transfers/:id/auto-assign  (transport.assign)
 */
import { NextResponse } from "next/server";
import { transportService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { transferId: string } };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("transport.assign");
    const transfer = await transportService.autoAssign(ctx.hotelId, params.transferId, {
      organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId,
    });
    return NextResponse.json({ transfer });
  } catch (err) { return errorResponse(err); }
}
