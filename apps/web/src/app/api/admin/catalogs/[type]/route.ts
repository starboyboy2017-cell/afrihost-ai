/**
 * Module 29 — Administration : catalogues de référence (devises, langues, fuseaux).
 * GET /api/admin/catalogs/:type (currencies | languages | timezones)
 */
import { NextResponse } from "next/server";
import { adminService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { type: string } }) {
  try {
    await requireAuthAndPermission("admin.view");
    let data: unknown;
    switch (params.type) {
      case "currencies": data = adminService.currencies(); break;
      case "languages": data = adminService.languages(); break;
      case "timezones": data = adminService.timezones(); break;
      default: return NextResponse.json({ error: "Type de catalogue inconnu" }, { status: 400 });
    }
    return NextResponse.json({ data });
  } catch (err) { return errorResponse(err); }
}
