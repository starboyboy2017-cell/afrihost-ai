/**
 * Module 28 — BI : rapports.
 * GET  /api/bi/reports?category= → liste (bi.view)
 * POST → créer un rapport personnalisé (bi.manage)
 */
import { NextResponse } from "next/server";
import { biService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("bi.view");
    const category = new URL(req.url).searchParams.get("category") ?? undefined;
    const reports = await biService.listReports(ctx.hotelId, category, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ reports });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("bi.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const report = await biService.createReport(ctx.hotelId, {
      name: body.name as string, category: body.category as string | undefined,
      type: body.type as string, filters: body.filters as Record<string, unknown> | undefined,
      groupBy: (body.groupBy as string | undefined | null) ?? undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ report }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
