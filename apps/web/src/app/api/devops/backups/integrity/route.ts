/**
 * Module 34 — DevOps : vérification d'intégrité des sauvegardes.
 * GET  → historique (devops.backups)
 * POST → exécuter (devops.backups)
 */
import { NextResponse } from "next/server";
import { devopsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("devops.backups");
    const checks = await devopsService.listIntegrityChecks({ organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ checks });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("devops.backups");
    const body = (await req.json()) as Record<string, unknown>;
    const check = await devopsService.runIntegrityCheck({
      backupId: body.backupId as string | undefined | null, target: body.target as string,
      checksum: body.checksum as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ check }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
