/**
 * Module 10 — Maintenance : adapter Prisma.
 */
import type {
  MaintenanceRepository,
  CreateMaintenanceInput,
  MaintenanceFilter,
  MaintenanceRequest,
  MaintenanceStatus,
  UpdateMaintenanceInput,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaMaintenanceRepository implements MaintenanceRepository {
  async createRequest(hotelId: string, input: CreateMaintenanceInput): Promise<MaintenanceRequest> {
    const r = await prisma.maintenanceRequest.create({
      data: {
        hotelId,
        roomId: input.roomId ?? null,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? "MEDIUM",
        assignedTo: input.assignedTo ?? null,
        putRoomOutOfOrder: input.putRoomOutOfOrder ?? false,
      },
      include: { room: { select: { number: true } } },
    });
    return mapRequest(r);
  }
  async getRequest(hotelId: string, id: string): Promise<MaintenanceRequest | null> {
    const r = await prisma.maintenanceRequest.findFirst({
      where: { id, hotelId },
      include: { room: { select: { number: true } } },
    });
    return r ? mapRequest(r) : null;
  }
  async updateRequest(hotelId: string, id: string, input: UpdateMaintenanceInput): Promise<MaintenanceRequest> {
    const r = await prisma.maintenanceRequest.update({
      where: { id, hotelId },
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority,
        assignedTo: input.assignedTo === null ? null : input.assignedTo,
      },
      include: { room: { select: { number: true } } },
    });
    return mapRequest(r);
  }
  async setStatus(hotelId: string, id: string, status: MaintenanceStatus, actor?: string): Promise<MaintenanceRequest> {
    const r = await prisma.maintenanceRequest.update({
      where: { id, hotelId },
      data: {
        status,
        startedAt: status === "IN_PROGRESS" ? new Date() : undefined,
        resolvedAt: status === "RESOLVED" ? new Date() : undefined,
        closedAt: status === "CLOSED" ? new Date() : undefined,
        roomRestored: status === "RESOLVED" || status === "CLOSED" ? true : undefined,
      },
      include: { room: { select: { number: true } } },
    });
    return mapRequest(r);
  }
  async assign(hotelId: string, id: string, assignee: string): Promise<MaintenanceRequest> {
    const r = await prisma.maintenanceRequest.update({
      where: { id, hotelId },
      data: { assignedTo: assignee, status: "ASSIGNED" },
      include: { room: { select: { number: true } } },
    });
    return mapRequest(r);
  }
  async listRequests(filter: MaintenanceFilter): Promise<{ requests: MaintenanceRequest[]; total: number }> {
    const where: Record<string, unknown> = {
      hotelId: filter.hotelId,
      status: filter.status,
      roomId: filter.roomId,
      assignedTo: filter.assignedTo,
      priority: filter.priority,
    };
    const [rows, total] = await prisma.$transaction([
      prisma.maintenanceRequest.findMany({
        where,
        include: { room: { select: { number: true } } },
        orderBy: { createdAt: "desc" },
        skip: filter.offset ?? 0,
        take: filter.limit ?? 100,
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);
    return { requests: rows.map(mapRequest), total };
  }
  async roomExists(hotelId: string, roomId: string): Promise<boolean> {
    const r = await prisma.room.findFirst({ where: { id: roomId, hotelId } });
    return r !== null;
  }
  async setRoomStatus(hotelId: string, roomId: string, status: "OUT_OF_ORDER" | "AVAILABLE"): Promise<void> {
    await prisma.room.update({
      where: { id: roomId, hotelId },
      data: {
        status: status as never,
        isOutOfOrder: status === "OUT_OF_ORDER",
        isOutOfService: status === "OUT_OF_ORDER",
      },
    });
  }
  async logRequestEvent(d: { requestId: string; action: string; actor?: string | null; detail?: string | null }): Promise<void> {
    await prisma.maintenanceEvent.create({
      data: { requestId: d.requestId, action: d.action, actor: d.actor ?? null, detail: d.detail ?? null },
    });
  }
}

type RequestRow = {
  id: string; hotelId: string; roomId: string | null; title: string; description: string | null;
  status: string; priority: string; assignedTo: string | null;
  putRoomOutOfOrder: boolean; roomRestored: boolean;
  startedAt: Date | null; resolvedAt: Date | null; closedAt: Date | null;
  createdAt: Date; updatedAt: Date;
  room?: { number: string } | null;
};

function mapRequest(r: RequestRow): MaintenanceRequest {
  return {
    id: r.id, hotelId: r.hotelId, roomId: r.roomId, roomNumber: r.room?.number,
    title: r.title, description: r.description,
    status: r.status as MaintenanceRequest["status"], priority: r.priority as MaintenanceRequest["priority"],
    assignedTo: r.assignedTo, putRoomOutOfOrder: r.putRoomOutOfOrder, roomRestored: r.roomRestored,
    startedAt: r.startedAt, resolvedAt: r.resolvedAt, closedAt: r.closedAt,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  };
}
