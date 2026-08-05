/**
 * Module 22 — Fidélité : adhésions.
 * GET  /api/loyalty/members?programId= → liste (loyalty.view)
 * POST /api/loyalty/members → enrôler un client (loyalty.manage)
 */
import { NextResponse } from "next/server";
import { loyaltyService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.view");
    const programId = new URL(req.url).searchParams.get("programId") ?? undefined;
    const members = await loyaltyService.listMembers(ctx.hotelId, programId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ members });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const member = await loyaltyService.enroll(ctx.hotelId, { guestId: body.guestId as string, programId: body.programId as string }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
