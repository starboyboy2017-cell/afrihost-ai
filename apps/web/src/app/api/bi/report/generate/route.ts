/**
 * Module 28 — BI : génération de rapport (données prêtes à exporter).
 * POST /api/bi/report/generate { type, from, to } (bi.view)
 */
import { NextResponse } from "next/server";
import { biService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("bi.view");
    const body = (await req.json()) as Record<string, unknown>;
    const report = await biService.generateReport(ctx.hotelId, body.type as string, {
      from: body.from as string | undefined, to: body.to as string | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ report });
  } catch (err) { return errorResponse(err); }
}
