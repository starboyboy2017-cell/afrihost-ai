/**
 * Module 2 — Sélecteur multihôtel : hôtels accessibles à l'utilisateur connecté.
 * GET /api/hotels/me
 */
import { NextResponse } from "next/server";
import { hotelsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("settings.hotel.view");
    const hotels = await hotelsService.listHotelsForUser(ctx.userId);
    return NextResponse.json({ hotels });
  } catch (err) {
    return errorResponse(err);
  }
}
