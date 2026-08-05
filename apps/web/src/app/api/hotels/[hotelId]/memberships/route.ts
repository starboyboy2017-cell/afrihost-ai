/**
 * Module 2 — Rôles & permissions PAR HÔTEL.
 * POST /api/hotels/:hotelId/memberships  → affecter un utilisateur à un hôtel avec un rôle.
 *   body: { userId, roleCode, isDefault? }
 * Permission requise : hotels.assign_role (propriétaire / admin d'organisation).
 */
import { NextResponse } from "next/server";
import { hotelsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { hotelId: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("hotels.assign_role");
    const body = (await req.json()) as { userId?: string; roleCode?: string; isDefault?: boolean };
    if (!body.userId || !body.roleCode) {
      return NextResponse.json({ error: "userId et roleCode requis" }, { status: 400 });
    }
    await hotelsService.assignRoleToUser(
      body.userId,
      params.hotelId,
      body.roleCode,
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
