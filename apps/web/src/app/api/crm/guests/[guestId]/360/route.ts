/**
 * Module 21 — CRM : vue 360 d'un client.
 * GET /api/crm/guests/:id/360 (crm.view)
 */
import { NextResponse } from "next/server";
import { crmService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { guestId: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("crm.view");
    const guest = await crmService.guest360(ctx.hotelId, params.guestId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ guest });
  } catch (err) { return errorResponse(err); }
}
