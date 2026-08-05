/**
 * Module 33 — Super Admin : action sur un hôtel.
 * POST /api/saasadmin/hotels/:id/action { action: activate|suspend|delete|restore }
 */
import { NextResponse } from "next/server";
import { saasAdminService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { hotelId: string } }) {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.hotels");
    const body = (await req.json()) as Record<string, unknown>;
    await saasAdminService.hotelAction({ hotelId: params.hotelId, action: body.action as never, detail: body.detail as string | undefined | null }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
