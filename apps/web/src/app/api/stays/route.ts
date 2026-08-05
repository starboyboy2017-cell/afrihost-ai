/**
 * Module 7 — Séjours : API.
 * GET  /api/stays  → séjours actifs (alimente le tableau de disponibilité) — reservations.view
 */
import { NextResponse } from "next/server";
import { stayService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("reservations.view");
    const stays = await stayService.listActive(ctx.hotelId, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ stays });
  } catch (err) {
    return errorResponse(err);
  }
}
