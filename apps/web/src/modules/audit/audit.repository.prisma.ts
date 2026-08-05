/**
 * Module 4 — Journal d'audit : adapters Prisma (écriture append-only + lecture).
 */
import { AuditWriter, type AuditEntry } from "@afrihost/core";
import type { AuditReadRepository } from "@afrihost/domain";
import type { AuditFilter, AuditLogEntry, AuditPage } from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

/** Écriture du journal (append-only, ADR-012). */
export class PrismaAuditWriter implements AuditWriter {
  async write(entry: AuditEntry): Promise<void> {
    await prisma.auditLog.create({
      data: {
        organisationId: entry.organisationId,
        hotelId: entry.hotelId ?? null,
        actorUserId: entry.actorUserId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        before: entry.before !== undefined ? (entry.before as object) : undefined,
        after: entry.after !== undefined ? (entry.after as object) : undefined,
        ip: entry.ip,
        userAgent: entry.userAgent,
      },
    });
  }
}

export class PrismaAuditReadRepository implements AuditReadRepository {
  async query(filter: AuditFilter): Promise<AuditPage> {
    const where: Record<string, unknown> = {
      organisationId: filter.organisationId,
      hotelId: filter.hotelId ?? undefined,
      action: filter.action,
      entityType: filter.entityType,
      entityId: filter.entityId,
      actorUserId: filter.actorUserId,
      createdAt: {
        gte: filter.from,
        lte: filter.to,
      },
    };

    const [rows, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: filter.offset ?? 0,
        take: filter.limit ?? 100,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const entries: AuditLogEntry[] = rows.map((r) => ({
      id: r.id,
      organisationId: r.organisationId,
      hotelId: r.hotelId,
      actorUserId: r.actorUserId,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      before: r.before as unknown,
      after: r.after as unknown,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
    }));
    return { entries, total };
  }
}
