/**
 * Module 9 — Housekeeping : affectation / réaffectation.
 * POST /api/housekeeping/:id/assign  body: { assigneeId }  (housekeeping.assign)
 */
import { NextResponse } from "next/server";
import { housekeepingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { taskId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("housekeeping.assign");
    const body = (await req.json()) as { assigneeId?: string };
    if (!body.assigneeId) return NextResponse.json({ error: "assigneeId requis" }, { status: 400 });
    const task = await housekeepingService.assign(ctx.hotelId, params.taskId, body.assigneeId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ task });
  } catch (err) {
    return errorResponse(err);
  }
}
