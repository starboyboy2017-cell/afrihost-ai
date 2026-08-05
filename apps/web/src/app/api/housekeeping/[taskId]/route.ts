/**
 * Module 9 — Housekeeping : API une tâche.
 * PATCH /api/housekeeping/:id  → modifier (priorité, notes)  (housekeeping.update)
 */
import { NextResponse } from "next/server";
import { housekeepingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { taskId: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("housekeeping.update");
    const body = (await req.json()) as Record<string, unknown>;
    const task = await housekeepingService.updateTask(
      ctx.hotelId,
      params.taskId,
      {
        priority: body.priority as never,
        scheduledAt: body.scheduledAt as string | undefined,
        notes: body.notes as string | undefined,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json({ task });
  } catch (err) {
    return errorResponse(err);
  }
}
