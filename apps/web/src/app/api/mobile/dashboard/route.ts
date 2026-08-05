/**
 * Module 31 — Mobile : tableau de bord par rôle (STAFF | MANAGER | GUEST).
 * GET /api/mobile/dashboard?role= (mobile.view)
 */
import { NextResponse } from "next/server";
import { mobileService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("mobile.view");
    const role = (new URL(req.url).searchParams.get("role") ?? "STAFF") as "STAFF" | "MANAGER" | "GUEST";
    const dashboard = await mobileService.dashboard(ctx.hotelId, role, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ dashboard });
  } catch (err) { return errorResponse(err); }
}
