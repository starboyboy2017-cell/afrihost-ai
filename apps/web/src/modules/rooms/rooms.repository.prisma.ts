/**
 * Module 6 — Chambres : adapter Prisma.
 */
import type {
  RoomsRepository,
  CreateRoomInput,
  Room,
  RoomFilter,
  RoomStatus,
  RoomStatusEvent,
  UpdateRoomInput,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaRoomsRepository implements RoomsRepository {
  async createRoom(hotelId: string, input: CreateRoomInput): Promise<Room> {
    const r = await prisma.room.create({
      data: {
        hotelId,
        roomTypeId: input.roomTypeId,
        number: input.number,
        floor: input.floor ?? null,
        status: (input.initialStatus ?? "AVAILABLE") as never,
        keyCardEnabled: input.keyCardEnabled ?? false,
        photos: input.photos ?? [],
      },
    });
    return mapRoom(r);
  }
  async updateRoom(hotelId: string, id: string, input: UpdateRoomInput): Promise<Room> {
    const r = await prisma.room.update({
      where: { id, hotelId },
      data: {
        roomTypeId: input.roomTypeId,
        floor: input.floor === null ? null : input.floor,
        keyCardEnabled: input.keyCardEnabled,
        photos: input.photos,
      },
    });
    return mapRoom(r);
  }
  async setRoomStatus(hotelId: string, id: string, status: RoomStatus, changedBy?: string): Promise<Room> {
    const current = await prisma.room.findUnique({ where: { id, hotelId } });
    const r = await prisma.$transaction(async (tx) => {
      const updated = await tx.room.update({ where: { id }, data: { status: status as never } });
      await tx.roomStatusHistory.create({
        data: { roomId: id, from: current?.status as never, to: status as never, changedBy },
      });
      return updated;
    });
    return mapRoom(r);
  }
  async getRoom(hotelId: string, id: string): Promise<Room | null> {
    const r = await prisma.room.findUnique({ where: { id, hotelId } });
    return r ? mapRoom(r) : null;
  }
  async getRoomByNumber(hotelId: string, number: string): Promise<Room | null> {
    const r = await prisma.room.findUnique({ where: { hotelId_number: { hotelId, number } } });
    return r ? mapRoom(r) : null;
  }
  async listRooms(filter: RoomFilter): Promise<{ rooms: Room[]; total: number }> {
    const where: Record<string, unknown> = {
      hotelId: filter.hotelId,
      roomTypeId: filter.roomTypeId,
      status: filter.status as never,
      floor: filter.floor,
      ...(filter.search ? { number: { contains: filter.search } } : {}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.room.findMany({ where, orderBy: { number: "asc" }, skip: filter.offset ?? 0, take: filter.limit ?? 100 }),
      prisma.room.count({ where }),
    ]);
    return { rooms: rows.map(mapRoom), total };
  }
  async listRoomStatusHistory(hotelId: string, roomId: string): Promise<RoomStatusEvent[]> {
    const rows = await prisma.roomStatusHistory.findMany({
      where: { roomId, room: { hotelId } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((h) => ({
      id: h.id,
      roomId: h.roomId,
      from: h.from as never,
      to: h.to as never,
      reason: h.reason,
      changedBy: h.changedBy,
      createdAt: h.createdAt,
    }));
  }
  async roomTypeExists(hotelId: string, roomTypeId: string): Promise<boolean> {
    const rt = await prisma.roomType.findFirst({ where: { id: roomTypeId, hotelId } });
    return rt !== null;
  }
}

type RoomRow = {
  id: string;
  hotelId: string;
  roomTypeId: string;
  number: string;
  floor: number | null;
  status: string;
  isOutOfOrder: boolean;
  isOutOfService: boolean;
  keyCardEnabled: boolean;
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
};

function mapRoom(r: RoomRow): Room {
  return {
    id: r.id,
    hotelId: r.hotelId,
    roomTypeId: r.roomTypeId,
    number: r.number,
    floor: r.floor,
    status: r.status as Room["status"],
    isOutOfOrder: r.isOutOfOrder,
    isOutOfService: r.isOutOfService,
    keyCardEnabled: r.keyCardEnabled,
    photos: r.photos,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
