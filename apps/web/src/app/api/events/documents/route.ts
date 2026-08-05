/**
 * Module 27 — Événements & Groupes : gestion documentaire.
 * GET  → liste (events.view)
 * POST → ajouter (events.documents)
 */
import { NextResponse } from "next/server";
import { eventsService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await requireAuthAndPermission("events.view");
    const documents = await eventsService.listDocuments(ctx.hotelId, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ documents });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("events.documents");
    const body = (await req.json()) as Record<string, unknown>;
    const document = await eventsService.addDocument(ctx.hotelId, {
      groupId: body.groupId as string | undefined | null, eventId: body.eventId as string | undefined | null,
      name: body.name as string, kind: body.kind as string | undefined, url: body.url as string | undefined | null,
    }, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ document }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
