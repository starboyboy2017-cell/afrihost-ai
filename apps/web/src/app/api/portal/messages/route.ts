/**
 * Module 26 — Portail client : messagerie sécurisée.
 * GET  /api/portal/messages?guestId= → liste (portal.self_reservation)
 * POST → envoyer (portal.self_reservation)
 */
import { NextResponse } from "next/server";
import { portalService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.self_reservation");
    const guestId = new URL(req.url).searchParams.get("guestId") ?? ctx.userId;
    const messages = await portalService.messages(ctx.hotelId, guestId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ messages });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("portal.self_reservation");
    const body = (await req.json()) as Record<string, unknown>;
    const guestId = (body.guestId as string) ?? ctx.userId;
    const message = await portalService.sendMessage(ctx.hotelId, guestId, { subject: body.subject as string | undefined | null, body: body.body as string }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
