/**
 * Module 9 — Housekeeping : adapter Prisma.
 */
import type {
  HousekeepingRepository,
  CreateHousekeepingTaskInput,
  HousekeepingFilter,
  HousekeepingStatus,
  HousekeepingTask,
  UpdateHousekeepingTaskInput,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaHousekeepingRepository implements HousekeepingRepository {
  async createTask(hotelId: string, input: CreateHousekeepingTaskInput): Promise<HousekeepingTask> {
    const t = await prisma.housekeepingTask.create({
      data: {
        hotelId,
        roomId: input.roomId,
        status: "PENDING",
        priority: input.priority ?? "MEDIUM",
        assignedTo: input.assignedTo ?? null,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        notes: input.notes ?? null,
      },
      include: { room: { select: { number: true } } },
    });
    return mapTask(t);
  }
  async getTask(hotelId: string, taskId: string): Promise<HousekeepingTask | null> {
    const t = await prisma.housekeepingTask.findFirst({
      where: { id: taskId, hotelId },
      include: { room: { select: { number: true } } },
    });
    return t ? mapTask(t) : null;
  }
  async updateTask(hotelId: string, taskId: string, input: UpdateHousekeepingTaskInput): Promise<HousekeepingTask> {
    const t = await prisma.housekeepingTask.update({
      where: { id: taskId, hotelId },
      data: {
        priority: input.priority,
        scheduledAt: input.scheduledAt === null ? null : input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        notes: input.notes,
      },
      include: { room: { select: { number: true } } },
    });
    return mapTask(t);
  }
  async setStatus(hotelId: string, taskId: string, status: HousekeepingStatus, changedBy?: string): Promise<HousekeepingTask> {
    const t = await prisma.housekeepingTask.update({
      where: { id: taskId, hotelId },
      data: {
        status,
        startedAt: status === "IN_PROGRESS" ? new Date() : undefined,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
        verifiedAt: status === "VERIFIED" ? new Date() : undefined,
      },
      include: { room: { select: { number: true } } },
    });
    return mapTask(t);
  }
  async reassign(hotelId: string, taskId: string, newAssignee: string): Promise<HousekeepingTask> {
    const t = await prisma.housekeepingTask.update({
      where: { id: taskId, hotelId },
      data: { assignedTo: newAssignee, status: "ASSIGNED" },
      include: { room: { select: { number: true } } },
    });
    return mapTask(t);
  }
  async listTasks(filter: HousekeepingFilter): Promise<{ tasks: HousekeepingTask[]; total: number }> {
    const where: Record<string, unknown> = {
      hotelId: filter.hotelId,
      status: filter.status,
      assignedTo: filter.assignedTo,
      roomId: filter.roomId,
      priority: filter.priority,
    };
    const [rows, total] = await prisma.$transaction([
      prisma.housekeepingTask.findMany({
        where,
        include: { room: { select: { number: true } } },
        orderBy: { createdAt: "desc" },
        skip: filter.offset ?? 0,
        take: filter.limit ?? 100,
      }),
      prisma.housekeepingTask.count({ where }),
    ]);
    return { tasks: rows.map(mapTask), total };
  }
  async roomExists(hotelId: string, roomId: string): Promise<boolean> {
    const r = await prisma.room.findFirst({ where: { id: roomId, hotelId } });
    return r !== null;
  }
  async getRoomStatus(hotelId: string, roomId: string): Promise<string | null> {
    const r = await prisma.room.findFirst({ where: { id: roomId, hotelId } });
    return r?.status ?? null;
  }
  async logTaskEvent(d: { taskId: string; action: string; actor?: string | null; detail?: string | null }): Promise<void> {
    await prisma.housekeepingTaskEvent.create({
      data: { taskId: d.taskId, action: d.action, actor: d.actor ?? null, detail: d.detail ?? null },
    });
  }
}

type TaskRow = {
  id: string; hotelId: string; roomId: string; status: string; priority: string;
  assignedTo: string | null; scheduledAt: Date | null; notes: string | null;
  startedAt: Date | null; completedAt: Date | null; verifiedAt: Date | null;
  createdAt: Date; updatedAt: Date;
  room?: { number: string } | null;
};

function mapTask(t: TaskRow): HousekeepingTask {
  return {
    id: t.id, hotelId: t.hotelId, roomId: t.roomId, roomNumber: t.room?.number,
    status: t.status as HousekeepingTask["status"], priority: t.priority as HousekeepingTask["priority"],
    assignedTo: t.assignedTo, scheduledAt: t.scheduledAt, notes: t.notes,
    startedAt: t.startedAt, completedAt: t.completedAt, verifiedAt: t.verifiedAt,
    createdAt: t.createdAt, updatedAt: t.updatedAt,
  };
}
