/**
 * Module 12 — Transport : facturation au folio de la réservation.
 * POST /api/transport/transfers/:id/invoice  (transport.update)
 */
import { NextResponse } from "next/server";
import { transportService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { transferId: string } };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("transport.update");
    const transfer = await transportService.markInvoiced(ctx.hotelId, params.transferId, {
      organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId,
    });
    return NextResponse.json({ transfer });
  } catch (err) { return errorResponse(err); }
}
