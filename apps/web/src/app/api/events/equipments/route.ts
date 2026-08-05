/**
 * Module 27 — Événements & Groupes : équipements.
 * GET  → liste (events.view)
 * POST → créer (events.manage)
 */
import { NextResponse } from "next/server";
import { eventsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("events.view");
    const equipments = await eventsService.listEquipments(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ equipments });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("events.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const equipment = await eventsService.createEquipment(ctx.hotelId, {
      name: body.name as string, category: body.category as string | undefined, quantity: body.quantity as number | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ equipment }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
