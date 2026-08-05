/**
 * Module 27 — Événements & Groupes : contrats / devis.
 * GET  → liste (events.view)
 * POST → créer (events.manage)
 */
import { NextResponse } from "next/server";
import { eventsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("events.view");
    const contracts = await eventsService.listContracts(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ contracts });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("events.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const contract = await eventsService.createContract(ctx.hotelId, {
      groupId: body.groupId as string | undefined | null, eventId: body.eventId as string | undefined | null,
      title: body.title as string, contractType: body.contractType as string | undefined,
      amount: body.amount as number | undefined, currency: body.currency as string | undefined,
      validUntil: body.validUntil as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ contract }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
