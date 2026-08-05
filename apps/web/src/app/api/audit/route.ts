/**
 * Module 4 — Journal d'audit : consultation.
 * GET /api/audit?action&entityType&entityId&actorUserId&from&to&limit&offset
 * GET /api/audit?export=csv  → export CSV des entrées filtrées
 * Permission : audit.view / audit.export
 */
import { NextResponse } from "next/server";
import { auditService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const exportCsv = url.searchParams.get("export") === "csv";

    const ctx = await requireAuthAndPermission(exportCsv ? "audit.export" : "audit.view");
    const filter = {
      action: url.searchParams.get("action") ?? undefined,
      entityType: url.searchParams.get("entityType") ?? undefined,
      entityId: url.searchParams.get("entityId") ?? undefined,
      actorUserId: url.searchParams.get("actorUserId") ?? undefined,
      from: url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : undefined,
      to: url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : undefined,
      limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 100,
      offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0,
    };
    const actor = {
      organisationId: ctx.organisationId,
      hotelId: ctx.hotelId,
      actorUserId: ctx.userId,
      isOrgAdmin: false,
    };

    if (exportCsv) {
      const csv = await auditService.exportCsv(filter, actor);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const page = await auditService.query(filter, actor);
    return NextResponse.json(page);
  } catch (err) {
    return errorResponse(err);
  }
}
