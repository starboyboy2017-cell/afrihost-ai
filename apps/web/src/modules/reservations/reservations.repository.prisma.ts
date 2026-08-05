/**
 * Module 3 — Réservations : adapter Prisma du port `ReservationsRepository`.
 */
import type {
  ReservationsRepository,
  ReservationFilter,
  CreateReservationInput,
  Reservation,
  ReservationStatusEvent,
  UpdateReservationInput,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

type ReservationRow = {
  id: string;
  hotelId: string;
  guestId: string | null;
  roomId: string | null;
  roomTypeId: string | null;
  bookingRef: string;
  source: string;
  channel: string | null;
  status: string;
  arrivalDate: Date;
  departureDate: Date;
  adults: number;
  children: number;
  amount: number;
  taxAmount: number;
  discountAmount: number;
  currency: string;
  notes: string | null;
  confirmationNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapRow(h: ReservationRow): Reservation {
  return {
    id: h.id,
    hotelId: h.hotelId,
    guestId: h.guestId,
    roomId: h.roomId,
    roomTypeId: h.roomTypeId,
    bookingRef: h.bookingRef,
    source: h.source as Reservation["source"],
    channel: h.channel,
    status: h.status as Reservation["status"],
    arrivalDate: h.arrivalDate,
    departureDate: h.departureDate,
    adults: h.adults,
    children: h.children,
    amount: h.amount,
    taxAmount: h.taxAmount,
    discountAmount: h.discountAmount,
    currency: h.currency,
    notes: h.notes,
    confirmationNumber: h.confirmationNumber,
    createdAt: h.createdAt,
    updatedAt: h.updatedAt,
  };
}

export class PrismaReservationsRepository implements ReservationsRepository {
  async createReservation(
    hotelId: string,
    input: CreateReservationInput & {
      bookingRef: string;
      status: Reservation["status"];
      amount: number;
      taxAmount: number;
      discountAmount: number;
      currency: string;
    },
  ): Promise<Reservation> {
    const r = await prisma.reservation.create({
      data: {
        hotelId,
        guestId: input.guestId ?? null,
        roomId: input.roomId ?? null,
        roomTypeId: input.roomTypeId ?? null,
        bookingRef: input.bookingRef,
        source: input.source,
        channel: input.channel,
        status: input.status,
        arrivalDate: new Date(input.arrivalDate),
        departureDate: new Date(input.departureDate),
        adults: input.adults ?? 1,
        children: input.children ?? 0,
        amount: input.amount,
        taxAmount: input.taxAmount,
        discountAmount: input.discountAmount,
        currency: input.currency,
        notes: input.notes,
        confirmationNumber: input.confirmationNumber,
      },
    });
    return mapRow(r);
  }

  async updateReservation(hotelId: string, reservationId: string, input: UpdateReservationInput): Promise<Reservation> {
    const r = await prisma.reservation.update({
      where: { id: reservationId, hotelId },
      data: {
        guestId: input.guestId === null ? null : input.guestId,
        roomId: input.roomId === null ? null : input.roomId,
        roomTypeId: input.roomTypeId === null ? null : input.roomTypeId,
        arrivalDate: input.arrivalDate ? new Date(input.arrivalDate) : undefined,
        departureDate: input.departureDate ? new Date(input.departureDate) : undefined,
        adults: input.adults,
        children: input.children,
        notes: input.notes === null ? null : input.notes,
        confirmationNumber: input.confirmationNumber === null ? null : input.confirmationNumber,
      },
    });
    return mapRow(r);
  }

  async setStatus(hotelId: string, reservationId: string, status: Reservation["status"], changedBy?: string): Promise<Reservation> {
    const current = await prisma.reservation.findUnique({ where: { id: reservationId, hotelId } });
    const r = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({ where: { id: reservationId }, data: { status } });
      await tx.reservationStatusHistory.create({
        data: {
          reservationId,
          from: current?.status as never,
          to: status as never,
          reason: null,
          changedBy,
        },
      });
      return updated;
    });
    return mapRow(r);
  }

  async getReservation(hotelId: string, reservationId: string): Promise<Reservation | null> {
    const r = await prisma.reservation.findUnique({ where: { id: reservationId, hotelId } });
    return r ? mapRow(r) : null;
  }

  async getReservationByRef(hotelId: string, bookingRef: string): Promise<Reservation | null> {
    const r = await prisma.reservation.findFirst({ where: { hotelId, bookingRef } });
    return r ? mapRow(r) : null;
  }

  async listReservations(filter: ReservationFilter): Promise<Reservation[]> {
    const rows = await prisma.reservation.findMany({
      where: {
        hotelId: filter.hotelId,
        status: filter.status as never,
        guestId: filter.guestId,
        arrivalDate: { gte: filter.from },
      },
      orderBy: { arrivalDate: "asc" },
    });
    return rows.map(mapRow);
  }

  async hasOverlap(hotelId: string, roomId: string, arrival: Date, departure: Date, excludeReservationId?: string): Promise<boolean> {
    const count = await prisma.reservation.count({
      where: {
        hotelId,
        roomId,
        status: { in: ["PROVISIONAL", "CONFIRMED", "CHECKED_IN"] as never },
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        arrivalDate: { lt: departure },
        departureDate: { gt: arrival },
      },
    });
    return count > 0;
  }

  async getRoomTypeBaseRate(hotelId: string, roomTypeId: string): Promise<number | null> {
    const rt = await prisma.roomType.findFirst({ where: { hotelId, id: roomTypeId } });
    return rt ? rt.baseRate : null;
  }

  async getHotelVatRate(hotelId: string): Promise<number> {
    const h = await prisma.hotel.findUnique({ where: { id: hotelId } });
    return h ? Number(h.vatRate) : 0;
  }

  async listStatusHistory(hotelId: string, reservationId: string): Promise<ReservationStatusEvent[]> {
    const rows = await prisma.reservationStatusHistory.findMany({
      where: { reservationId, reservation: { hotelId } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((h) => ({
      id: h.id,
      reservationId: h.reservationId,
      from: h.from as never,
      to: h.to as never,
      reason: h.reason,
      changedBy: h.changedBy,
      createdAt: h.createdAt,
    }));
  }

  async nextBookingRef(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.reservation.findFirst({
      where: { bookingRef: { startsWith: `AH-${year}-` } },
      orderBy: { bookingRef: "desc" },
      select: { bookingRef: true },
    });
    const seq = last ? parseInt(last.bookingRef.split("-")[2] ?? "0", 10) + 1 : 1;
    return `AH-${year}-${String(seq).padStart(5, "0")}`;
  }
}
