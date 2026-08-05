/**
 * Module 2 — Gestion multihôtels : adapter Prisma du port `HotelsRepository`.
 */
import type {
  HotelsRepository,
  CreateHotelInput,
  Hotel,
  HotelSummary,
  MembershipAssignment,
  UpdateHotelInput,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

type HotelRow = {
  id: string;
  organisationId: string;
  name: string;
  slug: string;
  code: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  locale: string;
  timezone: string;
  vatRate: import("@prisma/client").Prisma.Decimal;
  features: import("@prisma/client").Prisma.JsonValue;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function mapHotel(h: HotelRow): Hotel {
  return {
    id: h.id,
    organisationId: h.organisationId,
    name: h.name,
    slug: h.slug,
    code: h.code,
    address: h.address,
    city: h.city,
    country: h.country,
    phone: h.phone,
    email: h.email,
    currency: h.currency,
    locale: h.locale,
    timezone: h.timezone,
    vatRate: Number(h.vatRate),
    features: h.features as Record<string, unknown> | null,
    isActive: h.isActive,
    createdAt: h.createdAt,
    updatedAt: h.updatedAt,
  };
}

export class PrismaHotelsRepository implements HotelsRepository {
  async createHotel(organisationId: string, input: CreateHotelInput): Promise<Hotel> {
    const h = await prisma.hotel.create({
      data: {
        organisationId,
        name: input.name,
        slug: input.slug,
        code: input.code,
        address: input.address,
        city: input.city,
        country: input.country,
        phone: input.phone,
        email: input.email,
        currency: input.currency ?? "XOF",
        locale: input.locale ?? "fr",
        timezone: input.timezone ?? "Africa/Porto-Novo",
        vatRate: input.vatRate ?? 0,
        features: input.features as import("@prisma/client").Prisma.InputJsonValue | undefined,
      },
    });
    return mapHotel(h);
  }

  async updateHotel(hotelId: string, input: UpdateHotelInput): Promise<Hotel> {
    const h = await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        name: input.name,
        slug: input.slug,
        code: input.code,
        address: input.address,
        city: input.city,
        country: input.country,
        phone: input.phone,
        email: input.email,
        currency: input.currency,
        locale: input.locale,
        timezone: input.timezone,
        vatRate: input.vatRate,
        features: input.features as import("@prisma/client").Prisma.InputJsonValue | undefined,
      },
    });
    return mapHotel(h);
  }

  async setHotelActive(hotelId: string, isActive: boolean): Promise<Hotel> {
    const h = await prisma.hotel.update({ where: { id: hotelId }, data: { isActive } });
    return mapHotel(h);
  }

  async getHotel(hotelId: string): Promise<Hotel | null> {
    const h = await prisma.hotel.findUnique({ where: { id: hotelId } });
    return h ? mapHotel(h) : null;
  }

  async getHotelBySlug(slug: string): Promise<Hotel | null> {
    const h = await prisma.hotel.findUnique({ where: { slug } });
    return h ? mapHotel(h) : null;
  }

  async getHotelByCode(code: string): Promise<Hotel | null> {
    const h = await prisma.hotel.findUnique({ where: { code } });
    return h ? mapHotel(h) : null;
  }

  async listHotelsForOrganisation(organisationId: string): Promise<Hotel[]> {
    const hotels = await prisma.hotel.findMany({ where: { organisationId } });
    return hotels.map(mapHotel);
  }

  async listHotelsForUser(userId: string): Promise<HotelSummary[]> {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: { hotel: true, role: true },
    });
    return memberships.map((m) => ({
      id: m.hotel.id,
      name: m.hotel.name,
      slug: m.hotel.slug,
      code: m.hotel.code,
      currency: m.hotel.currency,
      isActive: m.hotel.isActive,
      roleCode: m.role.name,
      isDefault: m.isDefault,
    }));
  }

  async findRoleIdByCode(organisationId: string, roleCode: string): Promise<string | null> {
    const role = await prisma.role.findUnique({
      where: { organisationId_name: { organisationId, name: roleCode } },
    });
    return role?.id ?? null;
  }

  async assignMembership(assignment: MembershipAssignment): Promise<void> {
    const hotel = await prisma.hotel.findUnique({ where: { id: assignment.hotelId } });
    if (!hotel) throw new Error("Hôtel introuvable");
    const role = await prisma.role.findUnique({
      where: { organisationId_name: { organisationId: hotel.organisationId, name: assignment.roleCode } },
    });
    if (!role) throw new Error(`Rôle inconnu : ${assignment.roleCode}`);
    await prisma.membership.create({
      data: {
        userId: assignment.userId,
        hotelId: assignment.hotelId,
        roleId: role.id,
        isDefault: assignment.isDefault ?? false,
      },
    });
  }

  async ensureOwnerMembership(userId: string, hotelId: string, roleId: string): Promise<void> {
    await prisma.membership.upsert({
      where: {
        userId_hotelId_roleId: { userId, hotelId, roleId },
      },
      update: {},
      create: { userId, hotelId, roleId, isDefault: true },
    });
  }

}
