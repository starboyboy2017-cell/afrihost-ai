/**
 * Module 10 — Maintenance : cycle de vie du ticket.
 * POST /api/maintenance/:id/status  body: { status }  (maintenance.update)
 *   status: OPEN | ASSIGNED | IN_PROGRESS | ON_HOLD | RESOLVED | CLOSED
 */
import { NextResponse } from "next/server";
import { maintenanceService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

type Ctx = { params: { requestId: string } };

const STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"] as const;

export async function POST(req: Request, { params }: Ctx) {
  try {
    const ctx = await requireAuthAndPermission("maintenance.update");
    const body = (await req.json()) as { status?: string };
    if (!body.status || !(STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: "status invalide" }, { status: 400 });
    }
    const request = await maintenanceService.transition(ctx.hotelId, params.requestId, body.status as never, {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
    });
    return NextResponse.json({ request });
  } catch (err) {
    return errorResponse(err);
  }
}
