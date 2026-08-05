/**
 * Module 28 — BI : série temporelle (graphiques).
 * GET /api/bi/timeseries?metric=&from=&to= (bi.view)
 */
import { NextResponse } from "next/server";
import { biService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("bi.view");
    const url = new URL(req.url);
    const points = await biService.timeSeries(ctx.hotelId, url.searchParams.get("metric") ?? "occupancy", {
      from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ points });
  } catch (err) { return errorResponse(err); }
}
