/**
 * Seed de la base — hôtel de démonstration + rôles système + permissions.
 * Exécution : `npm run db:seed`.
 *
 * Rôles et permissions proviennent de @afrihost/core (source unique) pour garantir que
 * le seed et le code ne divergent jamais.
 */

import { PrismaClient } from "@prisma/client";
import { SYSTEM_ROLES, allPermissions } from "@afrihost/core";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed AfriHost AI...");

  // ---- Organisation & hôtel de démo ----
  const org = await prisma.organisation.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: {
      name: "Organisation Démo",
      slug: "demo-org",
      legalName: "AfriHost Démo SARL",
    },
  });

  const hotel = await prisma.hotel.upsert({
    where: { code: "DEMO-01" },
    update: {},
    create: {
      organisationId: org.id,
      name: "Hôtel Démo Cotonou",
      slug: "demo-cotonou",
      code: "DEMO-01",
      city: "Cotonou",
      country: "BJ",
      currency: "XOF",
      locale: "fr",
      timezone: "Africa/Porto-Novo",
    },
  });

  // ---- Permissions (source : @afrihost/core) ----
  for (const code of allPermissions()) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        module: code.split(".")[0]!,
        label: code,
      },
    });
  }

  // ---- Rôles système (source : @afrihost/core) ----
  for (const role of SYSTEM_ROLES) {
    const r = await prisma.role.upsert({
      where: { organisationId_name: { organisationId: org.id, name: role.code } },
      update: {},
      create: {
        organisationId: org.id,
        name: role.code,
        description: role.description,
        isSystem: true,
      },
    });

    // Lier les permissions au rôle
    for (const perm of role.permissions) {
      const permission = await prisma.permission.findUnique({ where: { code: perm } });
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: r.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: r.id, permissionId: permission.id },
      });
    }
  }

  console.log("✅ Seed terminé : org=%s, hotel=%s (%s)", org.id, hotel.id, hotel.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
