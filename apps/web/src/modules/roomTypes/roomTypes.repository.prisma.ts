/**
 * Module 5 — Types de chambres & tarifs : adapter Prisma.
 */
import type {
  RoomTypesRepository,
  CreateRatePlanInput,
  CreateRoomTypeInput,
  RatePlan,
  RatePlanPrice,
  RatePlanRestrictionInput,
  RoomType,
  UpdateRatePlanInput,
  UpdateRoomTypeInput,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaRoomTypesRepository implements RoomTypesRepository {
  // ---- Types de chambres ----
  async createRoomType(hotelId: string, input: CreateRoomTypeInput): Promise<RoomType> {
    const r = await prisma.roomType.create({
      data: {
        hotelId,
        name: input.name,
        description: input.description ?? null,
        baseRate: input.baseRate,
        maxOccupancy: input.maxOccupancy ?? 2,
        bedCount: input.bedCount ?? 1,
        amenities: input.amenities ?? [],
        features: input.features as import("@prisma/client").Prisma.InputJsonValue | undefined,
      },
    });
    return mapRoomType(r);
  }
  async updateRoomType(hotelId: string, id: string, input: UpdateRoomTypeInput): Promise<RoomType> {
    const r = await prisma.roomType.update({
      where: { id, hotelId },
      data: {
        name: input.name,
        description: input.description === null ? null : input.description,
        baseRate: input.baseRate,
        maxOccupancy: input.maxOccupancy,
        bedCount: input.bedCount,
        amenities: input.amenities,
        features: input.features as import("@prisma/client").Prisma.InputJsonValue | undefined,
        isActive: input.isActive,
      },
    });
    return mapRoomType(r);
  }
  async setRoomTypeActive(hotelId: string, id: string, isActive: boolean): Promise<RoomType> {
    const r = await prisma.roomType.update({ where: { id, hotelId }, data: { isActive } });
    return mapRoomType(r);
  }
  async getRoomType(hotelId: string, id: string): Promise<RoomType | null> {
    const r = await prisma.roomType.findFirst({ where: { id, hotelId } });
    return r ? mapRoomType(r) : null;
  }
  async listRoomTypes(hotelId: string, includeInactive = false): Promise<RoomType[]> {
    const rows = await prisma.roomType.findMany({
      where: { hotelId, deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: "asc" },
    });
    return rows.map(mapRoomType);
  }

  // ---- Plans tarifaires ----
  async createRatePlan(hotelId: string, input: CreateRatePlanInput): Promise<RatePlan> {
    const r = await prisma.ratePlan.create({
      data: {
        hotelId,
        roomTypeId: input.roomTypeId,
        name: input.name,
        type: input.type ?? "BASE",
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      },
    });
    return mapRatePlan(r);
  }
  async updateRatePlan(hotelId: string, id: string, input: UpdateRatePlanInput): Promise<RatePlan> {
    const r = await prisma.ratePlan.update({
      where: { id, hotelId },
      data: {
        name: input.name,
        type: input.type,
        startDate: input.startDate === null ? null : input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate === null ? null : input.endDate ? new Date(input.endDate) : undefined,
        isActive: input.isActive,
      },
    });
    return mapRatePlan(r);
  }
  async setRatePlanActive(hotelId: string, id: string, isActive: boolean): Promise<RatePlan> {
    const r = await prisma.ratePlan.update({ where: { id, hotelId }, data: { isActive } });
    return mapRatePlan(r);
  }
  async getRatePlan(hotelId: string, id: string): Promise<RatePlan | null> {
    const r = await prisma.ratePlan.findFirst({ where: { id, hotelId } });
    return r ? mapRatePlan(r) : null;
  }
  async listRatePlans(hotelId: string, roomTypeId?: string): Promise<RatePlan[]> {
    const rows = await prisma.ratePlan.findMany({
      where: { hotelId, deletedAt: null, ...(roomTypeId ? { roomTypeId } : {}) },
      orderBy: { name: "asc" },
    });
    return rows.map(mapRatePlan);
  }
  async resolvePrice(hotelId: string, roomTypeId: string, currency: string, date: Date): Promise<number> {
    // Plans actifs couvrant la date, ayant un prix dans la devise demandée
    const plan = await prisma.ratePlan.findFirst({
      where: {
        hotelId,
        roomTypeId,
        isActive: true,
        deletedAt: null,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: date }, endDate: { gte: date } },
          { startDate: null, endDate: { gte: date } },
          { startDate: { lte: date }, endDate: null },
        ],
        prices: { some: { currency } },
      },
      include: { prices: true },
      orderBy: { type: "asc" },
    });
    if (plan) {
      const price = plan.prices.find((p) => p.currency === currency);
      if (price) return price.amount;
    }
    // Repli : baseRate du type de chambre
    const rt = await prisma.roomType.findFirst({ where: { id: roomTypeId, hotelId } });
    return rt ? rt.baseRate : 0;
  }
  async setRatePlanPrices(ratePlanId: string, prices: Record<string, number>): Promise<void> {
    await prisma.$transaction([
      prisma.ratePlanPrice.deleteMany({ where: { ratePlanId } }),
      ...Object.entries(prices).map(([currency, amount]) =>
        prisma.ratePlanPrice.create({ data: { ratePlanId, currency, amount } }),
      ),
    ]);
  }
  async getRatePlanPrices(ratePlanId: string): Promise<RatePlanPrice[]> {
    const rows = await prisma.ratePlanPrice.findMany({ where: { ratePlanId } });
    return rows.map((r) => ({ id: r.id, ratePlanId: r.ratePlanId, currency: r.currency, amount: r.amount }));
  }
  async setRatePlanRestrictions(ratePlanId: string, restrictions?: RatePlanRestrictionInput): Promise<void> {
    const existing = await prisma.ratePlanRestriction.findFirst({ where: { ratePlanId } });
    if (!restrictions) {
      if (existing) await prisma.ratePlanRestriction.deleteMany({ where: { ratePlanId } });
      return;
    }
    if (existing) {
      await prisma.ratePlanRestriction.update({
        where: { id: existing.id },
        data: {
          minNights: restrictions.minNights ?? null,
          maxNights: restrictions.maxNights ?? null,
          advanceBookingDays: restrictions.advanceBookingDays ?? null,
          minAdvanceBookingDays: restrictions.minAdvanceBookingDays ?? null,
          maxGuests: restrictions.maxGuests ?? null,
        },
      });
    } else {
      await prisma.ratePlanRestriction.create({
        data: {
          ratePlanId,
          minNights: restrictions.minNights ?? null,
          maxNights: restrictions.maxNights ?? null,
          advanceBookingDays: restrictions.advanceBookingDays ?? null,
          minAdvanceBookingDays: restrictions.minAdvanceBookingDays ?? null,
          maxGuests: restrictions.maxGuests ?? null,
        },
      });
    }
  }
  async getRatePlanRestrictions(ratePlanId: string): Promise<RatePlanRestrictionInput | null> {
    const r = await prisma.ratePlanRestriction.findFirst({ where: { ratePlanId } });
    return r
      ? {
          minNights: r.minNights,
          maxNights: r.maxNights,
          advanceBookingDays: r.advanceBookingDays,
          minAdvanceBookingDays: r.minAdvanceBookingDays,
          maxGuests: r.maxGuests,
        }
      : null;
  }
}

type RoomTypeRow = {
  id: string;
  hotelId: string;
  name: string;
  description: string | null;
  baseRate: number;
  maxOccupancy: number;
  bedCount: number;
  amenities: string[];
  features: import("@prisma/client").Prisma.JsonValue;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function mapRoomType(r: RoomTypeRow): RoomType {
  return {
    id: r.id,
    hotelId: r.hotelId,
    name: r.name,
    description: r.description,
    baseRate: r.baseRate,
    maxOccupancy: r.maxOccupancy,
    bedCount: r.bedCount,
    amenities: r.amenities,
    features: r.features as Record<string, unknown> | null,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

type RatePlanRow = {
  id: string;
  hotelId: string;
  roomTypeId: string;
  name: string;
  type: string;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function mapRatePlan(r: RatePlanRow): RatePlan {
  return {
    id: r.id,
    hotelId: r.hotelId,
    roomTypeId: r.roomTypeId,
    name: r.name,
    type: r.type as RatePlan["type"],
    startDate: r.startDate,
    endDate: r.endDate,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
