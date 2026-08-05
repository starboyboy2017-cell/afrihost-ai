/**
 * Module 9 — Housekeeping : transitions de statut (cycle).
 * POST /api/housekeeping/:id/status  body: { action: "start"|"complete"|"verify" }  (housekeeping.update)
 */
import { NextResponse } from "next/server";
import { housekeepingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { taskId: string } };

const ACTIONS = { start: "start", complete: "complete", verify: "verify" } as const;

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("housekeeping.update");
    const body = (await req.json()) as { action?: string };
    const actor = { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId };

    let task;
    switch (body.action) {
      case ACTIONS.start:
        task = await housekeepingService.start(ctx.hotelId, params.taskId, actor);
        break;
      case ACTIONS.complete:
        task = await housekeepingService.complete(ctx.hotelId, params.taskId, actor);
        break;
      case ACTIONS.verify:
        task = await housekeepingService.verify(ctx.hotelId, params.taskId, actor);
        break;
      default:
        return NextResponse.json({ error: "Action inconnue (start|complete|verify)" }, { status: 400 });
    }
    return NextResponse.json({ task });
  } catch (err) {
    return errorResponse(err);
  }
}
