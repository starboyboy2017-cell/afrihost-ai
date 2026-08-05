/**
 * Module Guests — Clients : API.
 * GET  /api/guests?search&includeArchived&limit&offset → recherche/liste (guests.view)
 * POST /api/guests                                      → créer (guests.create)
 */
import { NextResponse } from "next/server";
import { guestsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("guests.view");
    const url = new URL(req.url);
    const page = await guestsService.search(
      ctx.hotelId,
      {
        search: url.searchParams.get("search") ?? undefined,
        includeArchived: url.searchParams.get("includeArchived") === "true",
        limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 50,
        offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json(page);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("guests.create");
    const body = (await req.json()) as Record<string, unknown>;
    const guest = await guestsService.createGuest(
      ctx.hotelId,
      {
        firstName: body.firstName as string,
        lastName: body.lastName as string,
        email: body.email as string | undefined,
        phone: body.phone as string | undefined,
        nationality: body.nationality as string | undefined,
        idDocument: body.idDocument as string | undefined,
        idDocumentType: body.idDocumentType as string | undefined,
        birthDate: body.birthDate as string | undefined,
        address: body.address as string | undefined,
        tags: body.tags as string[] | undefined,
        notes: body.notes as string | undefined,
        isVip: body.isVip as boolean | undefined,
        preferredLanguage: body.preferredLanguage as string | undefined,
      },
      { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId },
    );
    return NextResponse.json({ guest }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
