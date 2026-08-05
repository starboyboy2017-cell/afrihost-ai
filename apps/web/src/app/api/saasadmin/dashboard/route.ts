/**
 * Module 33 — Super Admin : tableau de bord SaaS.
 * GET /api/saasadmin/dashboard (saasadmin.dashboard)
 */
import { NextResponse } from "next/server";
import { saasAdminService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.dashboard");
    const dashboard = await saasAdminService.dashboard({ organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ dashboard });
  } catch (err) { return errorResponse(err); }
}
