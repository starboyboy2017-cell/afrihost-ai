/**
 * Module 33 — Super Admin : sauvegardes.
 * GET  → liste (saasadmin.backups)
 * POST → créer (saasadmin.backups)
 */
import { NextResponse } from "next/server";
import { saasAdminService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.backups");
    const backups = await saasAdminService.listBackups({ organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ backups });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("saasadmin.backups");
    const body = (await req.json()) as Record<string, unknown>;
    const backup = await saasAdminService.createBackup({ name: body.name as string, type: body.type as never | undefined }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ backup }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
