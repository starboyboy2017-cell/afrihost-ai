/**
 * Module 1 — Paramètres généraux : adapter de persistance Prisma.
 * Implémente le port `SettingsRepository` du domaine (@afrihost/domain) sur Prisma.
 */
import {
  SettingsRepository,
  type HotelSettings,
  type HotelSettingsPatch,
  type OrganisationSettings,
  type OrganisationSettingsPatch,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaSettingsRepository implements SettingsRepository {
  async getOrganisation(organisationId: string): Promise<OrganisationSettings | null> {
    const org = await prisma.organisation.findUnique({ where: { id: organisationId } });
    if (!org) return null;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      legalName: org.legalName,
      logoUrl: org.logoUrl,
    };
  }

  async updateOrganisation(
    organisationId: string,
    patch: OrganisationSettingsPatch,
  ): Promise<OrganisationSettings> {
    const org = await prisma.organisation.update({
      where: { id: organisationId },
      data: {
        name: patch.name,
        legalName: patch.legalName,
        logoUrl: patch.logoUrl,
      },
    });
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      legalName: org.legalName,
      logoUrl: org.logoUrl,
    };
  }

  async getHotel(hotelId: string): Promise<HotelSettings | null> {
    const h = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!h) return null;
    return this.toHotelSettings(h);
  }

  async updateHotel(hotelId: string, patch: HotelSettingsPatch): Promise<HotelSettings> {
    const h = await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        name: patch.name,
        slug: patch.slug,
        code: patch.code,
        address: patch.address,
        city: patch.city,
        country: patch.country,
        phone: patch.phone,
        email: patch.email,
        currency: patch.currency,
        locale: patch.locale,
        timezone: patch.timezone,
        vatRate: patch.vatRate,
        features: patch.features as import("@prisma/client").Prisma.InputJsonValue | undefined,
        isActive: patch.isActive,
      },
    });
    return this.toHotelSettings(h);
  }

  async listHotelsForOrganisation(organisationId: string): Promise<HotelSettings[]> {
    const hotels = await prisma.hotel.findMany({ where: { organisationId } });
    return hotels.map((h) => this.toHotelSettings(h));
  }

  private toHotelSettings(h: {
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
    updatedAt: Date;
  }): HotelSettings {
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
      updatedAt: h.updatedAt,
    };
  }
}
