/**
 * Module Guests — Clients : adapter Prisma.
 */
import type {
  GuestsRepository,
  CreateGuestInput,
  Guest,
  GuestFilter,
  GuestPage,
  GuestStay,
  UpdateGuestInput,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

function mapGuest(r: {
  id: string;
  organisationId: string;
  hotelId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  idDocument: string | null;
  idDocumentType: string | null;
  birthDate: Date | null;
  address: string | null;
  tags: string[];
  notes: string | null;
  isVip: boolean;
  loyaltyPoints: number;
  loyaltyTier: string | null;
  preferredLanguage: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): Guest {
  return {
    id: r.id,
    organisationId: r.organisationId,
    hotelId: r.hotelId,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email,
    phone: r.phone,
    nationality: r.nationality,
    idDocument: r.idDocument,
    idDocumentType: r.idDocumentType,
    birthDate: r.birthDate,
    address: r.address,
    tags: r.tags,
    notes: r.notes,
    isVip: r.isVip,
    loyaltyPoints: r.loyaltyPoints,
    loyaltyTier: r.loyaltyTier,
    preferredLanguage: r.preferredLanguage,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    archivedAt: r.deletedAt,
  };
}

export class PrismaGuestsRepository implements GuestsRepository {
  async createGuest(organisationId: string, hotelId: string, input: CreateGuestInput): Promise<Guest> {
    const r = await prisma.guest.create({
      data: {
        organisationId,
        hotelId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        nationality: input.nationality ?? null,
        idDocument: input.idDocument ?? null,
        idDocumentType: input.idDocumentType ?? null,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        address: input.address ?? null,
        tags: input.tags ?? [],
        notes: input.notes ?? null,
        isVip: input.isVip ?? false,
        preferredLanguage: input.preferredLanguage ?? null,
      },
    });
    return mapGuest(r);
  }

  async updateGuest(hotelId: string, guestId: string, input: UpdateGuestInput): Promise<Guest> {
    const r = await prisma.guest.update({
      where: { id: guestId, hotelId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email === null ? null : input.email,
        phone: input.phone === null ? null : input.phone,
        nationality: input.nationality === null ? null : input.nationality,
        idDocument: input.idDocument === null ? null : input.idDocument,
        idDocumentType: input.idDocumentType === null ? null : input.idDocumentType,
        birthDate: input.birthDate === null ? null : input.birthDate ? new Date(input.birthDate) : undefined,
        address: input.address === null ? null : input.address,
        tags: input.tags,
        notes: input.notes === null ? null : input.notes,
        isVip: input.isVip,
        preferredLanguage: input.preferredLanguage === null ? null : input.preferredLanguage,
      },
    });
    return mapGuest(r);
  }

  async archiveGuest(hotelId: string, guestId: string, archivedAt?: Date): Promise<Guest> {
    const r = await prisma.guest.update({
      where: { id: guestId, hotelId },
      data: { deletedAt: archivedAt ?? new Date() },
    });
    return mapGuest(r);
  }

  async getGuest(hotelId: string, guestId: string): Promise<Guest | null> {
    const r = await prisma.guest.findFirst({ where: { id: guestId, hotelId } });
    return r ? mapGuest(r) : null;
  }

  async searchGuests(filter: GuestFilter): Promise<GuestPage> {
    const where: Record<string, unknown> = {
      hotelId: filter.hotelId,
      deletedAt: filter.includeArchived ? undefined : null,
    };
    if (filter.search) {
      const q = filter.search;
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { idDocument: { contains: q } },
      ];
    }
    const [rows, total] = await prisma.$transaction([
      prisma.guest.findMany({
        where,
        orderBy: { lastName: "asc" },
        skip: filter.offset ?? 0,
        take: filter.limit ?? 50,
      }),
      prisma.guest.count({ where }),
    ]);
    return { guests: rows.map(mapGuest), total };
  }

  async listGuestStays(hotelId: string, guestId: string): Promise<GuestStay[]> {
    const rows = await prisma.reservation.findMany({
      where: { hotelId, guestId },
      orderBy: { arrivalDate: "asc" },
      select: {
        id: true,
        bookingRef: true,
        arrivalDate: true,
        departureDate: true,
        status: true,
        roomId: true,
      },
    });
    return rows.map((r) => ({
      reservationId: r.id,
      bookingRef: r.bookingRef,
      arrivalDate: r.arrivalDate,
      departureDate: r.departureDate,
      status: r.status,
      roomId: r.roomId,
    }));
  }

  async findByEmail(organisationId: string, email: string): Promise<Guest | null> {
    const r = await prisma.guest.findFirst({
      where: { organisationId, email, deletedAt: null },
    });
    return r ? mapGuest(r) : null;
  }
}
