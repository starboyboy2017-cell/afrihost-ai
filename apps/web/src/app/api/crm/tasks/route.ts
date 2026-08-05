/**
 * Module 21 — CRM : tâches / notes / rappels.
 * POST /api/crm/tasks  body: { guestId, kind: NOTE|TASK|REMINDER, title, body?, dueAt?, assignedTo? }  (crm.manage)
 */
import { NextResponse } from "next/server";
import { crmService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("crm.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const task = await crmService.createTask(ctx.hotelId, {
      guestId: body.guestId as string, kind: body.kind as never, title: body.title as string,
      body: body.body as string | undefined, dueAt: body.dueAt as string | undefined,
      assignedTo: body.assignedTo as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
