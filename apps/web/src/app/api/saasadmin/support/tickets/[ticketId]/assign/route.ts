/**
 * Module 33 — Super Admin : assignation d'un ticket de support.
 * POST /api/saasadmin/support/tickets/:id/assign { assignedTo }
 */
import { NextResponse } from "next/server";
import { saasAdminService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { ticketId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.support");
    const body = (await req.json()) as Record<string, unknown>;
    await saasAdminService.assignTicket({ ticketId: params.ticketId, assignedTo: body.assignedTo as string }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
