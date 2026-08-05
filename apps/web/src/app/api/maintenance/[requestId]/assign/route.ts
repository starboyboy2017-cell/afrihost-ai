/**
 * Module 10 — Maintenance : affectation / réaffectation.
 * POST /api/maintenance/:id/assign  body: { assigneeId }  (maintenance.update)
 */
import { NextResponse } from "next/server";
import { maintenanceService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { requestId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("maintenance.update");
    const body = (await req.json()) as { assigneeId?: string };
    if (!body.assigneeId) return NextResponse.json({ error: "assigneeId requis" }, { status: 400 });
    const request = await maintenanceService.assign(ctx.hotelId, params.requestId, body.assigneeId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ request });
  } catch (err) {
    return errorResponse(err);
  }
}
