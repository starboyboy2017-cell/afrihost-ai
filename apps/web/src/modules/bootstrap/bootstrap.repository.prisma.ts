/**
 * Sous-module 33.1 — Bootstrap : adapter Prisma.
 */
import type {
  BootstrapRepository,
  SuperAdminAccount,
} from "@afrihost/domain";
import { prisma } from "@/lib/prisma";

export class PrismaBootstrapRepository implements BootstrapRepository {
  async hasSuperAdmin(): Promise<boolean> {
    const c = await prisma.user.count({ where: { isSuperAdmin: true } });
    return c > 0;
  }
  async findByEmail(email: string) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) return null;
    return { id: u.id, email: u.email, mustChangePassword: u.mustChangePassword, twoFactorEnabled: u.twoFactorEnabled, passwordHash: u.passwordHash, twoFactorSecret: u.twoFactorSecret };
  }
  async findById(id: string): Promise<SuperAdminAccount | null> {
    const u = await prisma.user.findUnique({ where: { id } });
    return u ? { id: u.id, email: u.email, mustChangePassword: u.mustChangePassword, twoFactorEnabled: u.twoFactorEnabled } : null;
  }
  async createFirstSuperAdmin(input: { email: string; passwordHash: string; firstName?: string; lastName?: string }): Promise<SuperAdminAccount> {
    // L'organisation "platform" doit exister pour la clé étrangère.
    // NB : on récupère son id réel (UUID) — pas la chaîne littérale "platform".
    const org = await prisma.organisation.upsert({
      where: { slug: "platform" },
      update: {},
      create: { name: "AfriHost AI Platform", slug: "platform", legalName: "AfriHost AI" },
    });
    const u = await prisma.user.create({
      data: { organisationId: org.id, email: input.email, passwordHash: input.passwordHash, firstName: input.firstName ?? "Super", lastName: input.lastName ?? "Admin", isSuperAdmin: true, mustChangePassword: true },
    });
    return { id: u.id, email: u.email, mustChangePassword: u.mustChangePassword, twoFactorEnabled: u.twoFactorEnabled };
  }
  async setPassword(id: string, passwordHash: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  }
  async clearMustChangePassword(id: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { mustChangePassword: false } });
  }
  async enable2FA(id: string, secret: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { twoFactorSecret: secret } });
  }
  async set2FA(id: string, enabled: boolean): Promise<void> {
    await prisma.user.update({ where: { id }, data: { twoFactorEnabled: enabled } });
  }
}
