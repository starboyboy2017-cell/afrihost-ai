/**
 * Module 22 — Fidélité : programmes.
 * GET  /api/loyalty/programs → liste (loyalty.view)
 * POST /api/loyalty/programs → créer (loyalty.manage)
 */
import { NextResponse } from "next/server";
import { loyaltyService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("loyalty.view");
    const programs = await loyaltyService.listPrograms(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ programs });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("loyalty.manage");
    const body = (await req.json()) as Record<string, unknown>;
    const program = await loyaltyService.createProgram(ctx.hotelId, {
      name: body.name as string, scope: body.scope as never, hotelIds: body.hotelIds as string[] | undefined,
      description: body.description as string | undefined, currency: body.currency as string | undefined,
      pointsPerSpend: body.pointsPerSpend as number | undefined, pointsPerNight: body.pointsPerNight as number | undefined,
      validityDays: body.validityDays as number | undefined, startDate: body.startDate as string | undefined,
      endDate: body.endDate as string | undefined, config: body.config as Record<string, unknown> | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ program }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
