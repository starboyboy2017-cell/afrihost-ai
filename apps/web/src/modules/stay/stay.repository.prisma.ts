/**
 * Module 7 — Séjours : adapter Prisma.
 */
import type {
  StayRepository,
  RoomAssignment,
  Stay,
  StayDetail,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaStayRepository implements StayRepository {
  async getReservation(hotelId: string, id: string) {
    const r = await prisma.reservation.findUnique({ where: { id, hotelId } });
    if (!r) return null;
    return {
      id: r.id, status: r.status, guestId: r.guestId, roomId: r.roomId,
      bookingRef: r.bookingRef, arrivalDate: r.arrivalDate, departureDate: r.departureDate,
    };
  }
  async setReservationStatus(hotelId: string, id: string, status: string, changedBy?: string) {
    const current = await prisma.reservation.findUnique({ where: { id, hotelId } });
    await prisma.$transaction([
      prisma.reservation.update({ where: { id }, data: { status: status as never } }),
      prisma.reservationStatusHistory.create({
        data: { reservationId: id, from: current?.status as never, to: status as never, changedBy },
      }),
    ]);
  }
  async updateReservationDeparture(hotelId: string, id: string, departureDate: Date) {
    await prisma.reservation.update({ where: { id, hotelId }, data: { departureDate } });
  }
  async updateReservationRoom(hotelId: string, id: string, roomId: string | null) {
    await prisma.reservation.update({ where: { id, hotelId }, data: { roomId } });
  }
  async getRoom(hotelId: string, id: string) {
    const r = await prisma.room.findUnique({ where: { id, hotelId } });
    return r ? { id: r.id, status: r.status, number: r.number, roomTypeId: r.roomTypeId } : null;
  }
  async setRoomStatus(hotelId: string, id: string, status: string, changedBy?: string) {
    const current = await prisma.room.findUnique({ where: { id, hotelId } });
    await prisma.$transaction([
      prisma.room.update({ where: { id }, data: { status: status as never } }),
      prisma.roomStatusHistory.create({
        data: { roomId: id, from: current?.status as never, to: status as never, changedBy },
      }),
    ]);
  }
  async createStay(d: { hotelId: string; reservationId: string; guestId: string | null; roomId: string; departureDate: Date }): Promise<Stay> {
    const s = await prisma.stay.create({
      data: {
        hotelId: d.hotelId,
        reservationId: d.reservationId,
        guestId: d.guestId,
        roomId: d.roomId,
        departureDate: d.departureDate,
      },
    });
    return mapStay(s);
  }
  async getStayByReservation(hotelId: string, reservationId: string): Promise<Stay | null> {
    const s = await prisma.stay.findUnique({ where: { reservationId }, });
    if (!s || s.hotelId !== hotelId) return null;
    return mapStay(s);
  }
  async updateStay(hotelId: string, id: string, d: Partial<Pick<Stay, "roomId" | "status" | "checkOutAt" | "departureDate" | "notes">>): Promise<Stay> {
    const s = await prisma.stay.update({
      where: { id, hotelId },
      data: {
        roomId: d.roomId,
        status: d.status as never,
        checkOutAt: d.checkOutAt,
        departureDate: d.departureDate,
        notes: d.notes,
      },
    });
    return mapStay(s);
  }
  async listActiveStays(hotelId: string): Promise<StayDetail[]> {
    const rows = await prisma.stay.findMany({
      where: { hotelId, status: "ACTIVE" },
      include: {
        reservation: { select: { bookingRef: true, status: true } },
        guest: { select: { firstName: true, lastName: true } },
        room: { select: { number: true, roomType: { select: { name: true } } } },
      },
      orderBy: { checkInAt: "asc" },
    });
    return rows.map((s) => ({
      stay: mapStay(s),
      bookingRef: s.reservation.bookingRef,
      guestName: s.guest ? `${s.guest.firstName} ${s.guest.lastName}` : null,
      roomNumber: s.room?.number ?? null,
      roomTypeName: s.room?.roomType?.name ?? null,
      reservationStatus: s.reservation.status,
    }));
  }
  async listRoomAssignments(hotelId: string, reservationId: string): Promise<RoomAssignment[]> {
    const stay = await prisma.stay.findUnique({ where: { reservationId } });
    if (!stay || stay.hotelId !== hotelId) return [];
    const rows = await prisma.roomAssignment.findMany({ where: { stayId: stay.id }, orderBy: { fromDate: "asc" } });
    return rows.map((a) => ({
      id: a.id, stayId: a.stayId, roomId: a.roomId, fromDate: a.fromDate, toDate: a.toDate,
      reason: a.reason, changedBy: a.changedBy, createdAt: a.createdAt,
    }));
  }
  async addRoomAssignment(d: { stayId: string; roomId: string; reason?: string | null; changedBy?: string }): Promise<void> {
    await prisma.roomAssignment.create({
      data: { stayId: d.stayId, roomId: d.roomId, reason: d.reason ?? null, changedBy: d.changedBy },
    });
  }
}

type StayRow = {
  id: string; hotelId: string; reservationId: string; guestId: string | null; roomId: string | null;
  status: string; checkInAt: Date; checkOutAt: Date | null; departureDate: Date; notes: string | null;
  createdAt: Date; updatedAt: Date;
  reservation?: { bookingRef: string; status: string };
  guest?: { firstName: string; lastName: string } | null;
  room?: { number: string; roomType?: { name: string } } | null;
};

function mapStay(s: StayRow): Stay {
  return {
    id: s.id, hotelId: s.hotelId, reservationId: s.reservationId, guestId: s.guestId, roomId: s.roomId,
    status: s.status as Stay["status"], checkInAt: s.checkInAt, checkOutAt: s.checkOutAt,
    departureDate: s.departureDate, notes: s.notes, createdAt: s.createdAt, updatedAt: s.updatedAt,
  };
}
