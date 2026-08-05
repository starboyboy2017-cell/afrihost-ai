/**
 * Module 26 — Portail client : demandes de services.
 * GET  /api/portal/service-requests?guestId= → liste
 * POST → créer (room_service, transport, maintenance, laundry, concierge...)
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.self_reservation");
    const guestId = new URL(req.url).searchParams.get("guestId") ?? ctx.userId;
    const requests = await portalService.serviceRequests(ctx.hotelId, guestId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ requests });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.self_reservation");
    const body = (await req.json()) as Record<string, unknown>;
    const guestId = (body.guestId as string) ?? ctx.userId;
    const request = await portalService.createServiceRequest(ctx.hotelId, guestId, { kind: body.kind as never, title: body.title as string, detail: body.detail as string | undefined | null }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ request }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
