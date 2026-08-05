/**
 * Module 28 — BI : planification d'envoi de rapports par email.
 * GET  → liste (bi.view)
 * POST → créer (bi.manage)
 */
import { NextResponse } from "next/server";
import { biService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("bi.view");
    const schedules = await biService.listSchedules(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ schedules });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("bi.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const schedule = await biService.createSchedule(ctx.hotelId, {
      reportId: body.reportId as string | undefined | null, email: body.email as string,
      frequency: body.frequency as never | undefined, format: body.format as never | undefined,
      time: body.time as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
