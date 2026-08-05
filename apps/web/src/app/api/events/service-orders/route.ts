/**
 * Module 27 — Événements & Groupes : ordres de service par département.
 * GET  /api/events/service-orders?department= → liste (events.view)
 * POST → créer (events.service_orders)
 */
import { NextResponse } from "next/server";
import { eventsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("events.view");
    const department = new URL(req.url).searchParams.get("department") ?? undefined;
    const orders = await eventsService.listServiceOrders(ctx.hotelId, department, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ orders });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("events.service_orders");
    const body = (await req.json()) as Record<string, unknown>;
    const order = await eventsService.createServiceOrder(ctx.hotelId, {
      groupId: body.groupId as string | undefined | null, eventId: body.eventId as string | undefined | null,
      department: body.department as string, title: body.title as string, detail: body.detail as string | undefined | null,
      dueAt: body.dueAt as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
