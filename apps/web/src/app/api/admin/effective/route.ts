/**
 * Module 29 — Administration : valeur effective (hôtel prioritaire sur SaaS).
 * GET /api/admin/effective?category=&key= (admin.view)
 */
import { NextResponse } from "next/server";
import { adminService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("admin.view");
    const url = new URL(req.url);
    const value = await adminService.getEffective(ctx.hotelId, url.searchParams.get("category") as never, url.searchParams.get("key") ?? "", { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ value });
  } catch (err) { return errorResponse(err); }
}
