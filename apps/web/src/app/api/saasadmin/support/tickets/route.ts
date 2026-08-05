/**
 * Module 33 — Super Admin : tickets de support.
 * GET  → liste (saasadmin.support)
 * POST → créer (saasadmin.support)
 */
import { NextResponse } from "next/server";
import { saasAdminService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.support");
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    const tickets = await saasAdminService.listSupportTickets(status, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ tickets });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.support");
    const body = (await req.json()) as Record<string, unknown>;
    const ticket = await saasAdminService.createSupportTicket({
      organisationId: body.organisationId as string, hotelId: body.hotelId as string | undefined | null,
      subject: body.subject as string, description: body.description as string | undefined | null,
      priority: body.priority as never | undefined,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
