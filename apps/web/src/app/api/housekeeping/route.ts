/**
 * Module 9 — Housekeeping : API.
 * GET  /api/housekeeping?status&assignedTo&priority → liste (housekeeping.view)
 * POST /api/housekeeping                             → créer/générer (housekeeping.update)
 */
import { NextResponse } from "next/server";
import { housekeepingService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("housekeeping.view");
    const url = new URL(req.url);
    const result = await housekeepingService.listTasks(
      ctx.hotelId,
      {
        status: (url.searchParams.get("status") ?? undefined) as never,
        assignedTo: url.searchParams.get("assignedTo") ?? undefined,
        priority: (url.searchParams.get("priority") ?? undefined) as never,
        limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 100,
        offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("housekeeping.update");
    const body = (await req.json()) as Record<string, unknown>;
    const task = await housekeepingService.createTask(
      ctx.hotelId,
      {
        roomId: body.roomId as string,
        priority: body.priority as never,
        scheduledAt: body.scheduledAt as string | undefined,
        notes: body.notes as string | undefined,
        assignedTo: body.assignedTo as string | undefined,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
