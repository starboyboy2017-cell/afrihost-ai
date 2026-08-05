/**
 * Module 24 — IA : priorisation automatique des tâches.
 * POST /api/ai/prioritization (ai.automation)
 * Corps : { tasks: [{ id, title, severity, dueInMinutes }] }
 */
import { NextResponse } from "next/server";
import { aiService } from "@/lib/di";
import { errorResponse, requireAuthAndPermission } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthAndPermission("ai.automation");
    const body = (await req.json()) as Record<string, unknown>;
    const tasks = body.tasks as Array<{ id: string; title: string; severity: string; dueInMinutes?: number; category?: string }>;
    const prioritized = aiService.prioritize(ctx.hotelId, tasks, { organisationId: ctx.organisationId, hotelId: ctx.hotelId, actorUserId: ctx.userId });
    return NextResponse.json({ prioritized });
  } catch (err) { return errorResponse(err); }
}
