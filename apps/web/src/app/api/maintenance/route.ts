/**
 * Module 10 — Maintenance : API.
 * GET  /api/maintenance?status&priority&roomId → liste (maintenance.update pour vue technique)
 * POST /api/maintenance                          → créer (maintenance.create)
 */
import { NextResponse } from "next/server";
import { maintenanceService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("maintenance.update");
    const url = new URL(req.url);
    const result = await maintenanceService.listRequests(
      ctx.hotelId,
      {
        status: (url.searchParams.get("status") ?? undefined) as never,
        roomId: url.searchParams.get("roomId") ?? undefined,
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
    const ctx = await requireAuthAndPermission("maintenance.create");
    const body = (await req.json()) as Record<string, unknown>;
    const request = await maintenanceService.createRequest(
      ctx.hotelId,
      {
        roomId: body.roomId as string | undefined,
        title: body.title as string,
        description: body.description as string | undefined,
        priority: body.priority as never,
        putRoomOutOfOrder: body.putRoomOutOfOrder as boolean | undefined,
        assignedTo: body.assignedTo as string | undefined,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
