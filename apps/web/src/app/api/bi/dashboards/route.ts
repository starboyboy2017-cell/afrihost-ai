/**
 * Module 28 — BI : tableaux de bord.
 * GET  /api/bi/dashboards?role= → liste (bi.view)
 * POST → créer (bi.manage)
 */
import { NextResponse } from "next/server";
import { biService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("bi.view");
    const role = new URL(req.url).searchParams.get("role") ?? undefined;
    const dashboards = await biService.listDashboards(ctx.hotelId, role, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ dashboards });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("bi.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const dashboard = await biService.createDashboard(ctx.hotelId, {
      name: body.name as string, role: body.role as string | undefined | null,
      scope: body.scope as string | undefined, layout: body.layout as Record<string, unknown> | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ dashboard }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
