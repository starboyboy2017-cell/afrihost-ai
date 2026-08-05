/**
 * Module 5 — Plans tarifaires : API.
 * GET  /api/rate-plans?roomTypeId → liste (rooms.view)
 * POST /api/rate-plans           → créer (roomTypes.update)
 * GET  /api/rate-plans/price?roomTypeId&currency&date → résolution de prix (rooms.view)
 */
import { NextResponse } from "next/server";
import { roomTypesService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("rooms.view");
    const url = new URL(req.url);
    const roomTypeId = url.searchParams.get("roomTypeId") ?? undefined;

    // Résolution de prix pour une devise/date
    const currency = url.searchParams.get("currency");
    const date = url.searchParams.get("date");
    if (roomTypeId && currency && date) {
      const price = await roomTypesService.resolvePrice(ctx.hotelId, roomTypeId, currency, new Date(date), {
        organisationId: ctx.organisationId,
        hotelId: ctx.hotelId,
        actorUserId: ctx.userId,
      });
      return NextResponse.json({ price });
    }

    const ratePlans = await roomTypesService.listRatePlans(ctx.hotelId, roomTypeId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ ratePlans });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("roomTypes.update");
    const body = (await req.json()) as Record<string, unknown>;
    const ratePlan = await roomTypesService.createRatePlan(
      ctx.hotelId,
      {
        roomTypeId: body.roomTypeId as string,
        name: body.name as string,
        type: body.type as never,
        startDate: body.startDate as string | undefined,
        endDate: body.endDate as string | undefined,
        prices: body.prices as Record<string, number> | undefined,
        restrictions: body.restrictions as never,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json({ ratePlan }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
