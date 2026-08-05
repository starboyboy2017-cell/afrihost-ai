/**
 * Module 8 — Tableau de disponibilité : API.
 * GET /api/availability?floor&roomTypeId&status&from&to&search&limit&offset
 * Permission : rooms.view
 * Retourne le snapshot consolidé (chambres + occupant + réservation + compteurs).
 */
import { NextResponse } from "next/server";
import { frontDeskService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("rooms.view");
    const url = new URL(req.url);
    const board = await frontDeskService.getBoard(
      ctx.hotelId,
      {
        floor: url.searchParams.get("floor") ? Number(url.searchParams.get("floor")) : undefined,
        roomTypeId: url.searchParams.get("roomTypeId") ?? undefined,
        status: (url.searchParams.get("status") ?? undefined) as never,
        from: url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : undefined,
        to: url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : undefined,
        search: url.searchParams.get("search") ?? undefined,
        limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 500,
        offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json(board);
  } catch (err) {
    return errorResponse(err);
  }
}
