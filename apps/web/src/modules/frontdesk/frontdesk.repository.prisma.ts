/**
 * Module 8 — Tableau de disponibilité : adapter Prisma (agrégat temps réel).
 *
 * Construit une ligne par chambre de l'hôtel, en joignant :
 *   - le type de chambre (Module 5) ;
 *   - le séjour ACTIVE courant (Module 7) + le client associé ;
 *   - la réservation liée (Module 3) pour la période/bookingRef.
 */
import type { FrontDeskRepository } from "@afrihost/domain";
import type { AvailabilityFilter, AvailabilityRow, RoomStatus } from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaFrontDeskRepository implements FrontDeskRepository {
  async getBoard(hotelId: string, filter: AvailabilityFilter): Promise<{ rows: AvailabilityRow[]; total: number }> {
    const where: Record<string, unknown> = {
      hotelId,
      deletedAt: null,
    };
    if (filter.floor !== undefined) where.floor = filter.floor;
    if (filter.roomTypeId) where.roomTypeId = filter.roomTypeId;
    if (filter.status) where.status = filter.status;

    // Recherche par numéro de chambre (le nom de client est filtré après jointure)
    if (filter.search && /^\d/.test(filter.search)) {
      where.number = { contains: filter.search };
    }

    const rooms = await prisma.room.findMany({
      where,
      include: {
        roomType: { select: { id: true, name: true } },
        stays: {
          where: { status: "ACTIVE" },
          take: 1,
          include: {
            guest: { select: { firstName: true, lastName: true } },
            reservation: { select: { id: true, bookingRef: true, arrivalDate: true, departureDate: true } },
          },
        },
      },
      orderBy: [{ floor: "asc" }, { number: "asc" }],
      skip: filter.offset ?? 0,
      take: filter.limit ?? 500,
    });

    let rows: AvailabilityRow[] = rooms.map((r) => {
      const stay = r.stays[0];
      return {
        roomId: r.id,
        roomNumber: r.number,
        floor: r.floor,
        status: r.status as RoomStatus,
        roomTypeId: r.roomTypeId,
        roomTypeName: r.roomType?.name ?? "",
        guestName: stay?.guest ? `${stay.guest.firstName} ${stay.guest.lastName}` : null,
        reservationId: stay?.reservation?.id ?? null,
        bookingRef: stay?.reservation?.bookingRef ?? null,
        checkInAt: stay?.checkInAt ?? null,
        departureDate: stay?.reservation?.departureDate ?? null,
        arrivalDate: stay?.reservation?.arrivalDate ?? null,
      };
    });

    // Recherche par nom de client (non applicable au niveau chambre)
    if (filter.search && !/^\d/.test(filter.search)) {
      const q = filter.search.toLowerCase();
      rows = rows.filter((r) => (r.guestName ?? "").toLowerCase().includes(q));
    }

    return { rows, total: rows.length };
  }
}
