/**
 * Module 12 — Transport : cycle de vie d'un transfert.
 * POST /api/transport/transfers/:id/status  body: { status }  (transport.update)
 */
import { NextResponse } from "next/server";
import { transportService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { transferId: string } };
const STATUSES = ["REQUESTED", "CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("transport.update");
    const body = (await req.json()) as { status?: string };
    if (!body.status || !(STATUSES as readonly string[]).includes(body.status)) return NextResponse.json({ error: "status invalide" }, { status: 400 });
    const transfer = await transportService.transition(ctx.hotelId, params.transferId, body.status as never, {
      organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId,
    });
    return NextResponse.json({ transfer });
  } catch (err) { return errorResponse(err); }
}
