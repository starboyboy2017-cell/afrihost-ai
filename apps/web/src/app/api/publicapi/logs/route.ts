/**
 * Module 30 — API Publique : journal des accès.
 * GET /api/publicapi/logs?appId= (publicapi.view)
 */
import { NextResponse } from "next/server";
import { publicApiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("publicapi.view");
    const appId = new URL(req.url).searchParams.get("appId") ?? "";
    const logs = await publicApiService.listLogs(appId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ logs });
  } catch (err) { return errorResponse(err); }
}
