/**
 * Module 29 — Administration & Paramétrage Global : adapter Prisma.
 */
import type {
  AdminRepository,
  AdminConfig,
  ListConfigFilter,
  SetConfigInput,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const json = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

function map(c: {
  id: string; scope: string; hotelId: string | null; category: string; key: string; value: unknown; isActive: boolean;
}): AdminConfig {
  return { id: c.id, scope: c.scope as AdminConfig["scope"], hotelId: c.hotelId, category: c.category, key: c.key, value: c.value, isActive: c.isActive };
}

export class PrismaAdminRepository implements AdminRepository {
  async setConfig(input: SetConfigInput): Promise<AdminConfig> {
    const hotelId = input.scope === "HOTEL" ? (input.hotelId ?? null) : null;
    const scope = input.scope ?? "HOTEL";
    const existing = await prisma.adminConfig.findFirst({
      where: { scope, hotelId, category: input.category, key: input.key },
    });
    if (existing) {
      const u = await prisma.adminConfig.update({ where: { id: existing.id }, data: { value: json(input.value), isActive: true } });
      return map(u);
    }
    const c = await prisma.adminConfig.create({
      data: { scope, hotelId, category: input.category, key: input.key, value: json(input.value) },
    });
    return map(c);
  }
  async listConfigs(filter: ListConfigFilter): Promise<AdminConfig[]> {
    const rows = await prisma.adminConfig.findMany({
      where: { scope: filter.scope ?? "HOTEL", hotelId: filter.hotelId ?? null, ...(filter.category ? { category: filter.category } : {}) },
      orderBy: { category: "asc" },
    });
    return rows.map(map);
  }
  async getConfig(scope: "SAAS" | "HOTEL", hotelId: string | null, category: string, key: string): Promise<AdminConfig | null> {
    const c = await prisma.adminConfig.findFirst({ where: { scope, hotelId, category, key } });
    return c ? map(c) : null;
  }
  async setConfigActive(id: string, isActive: boolean): Promise<void> {
    await prisma.adminConfig.update({ where: { id }, data: { isActive } });
  }
  async deleteConfig(id: string): Promise<void> {
    await prisma.adminConfig.delete({ where: { id } });
  }
}
