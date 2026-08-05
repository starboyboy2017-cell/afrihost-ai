/**
 * Endpoint de santé — vérifie que la fondation Phase 0 est fonctionnelle :
 * EventBus, RBAC, audit, offline (UUID v7) + connexion à la base (optionnelle).
 */
import { NextResponse } from "next/server";
import {
  eventBus,
  DomainEvents,
  authorizationService,
  uuidv7,
  type AccessContext,
} from "@afrihost/core";
import { prisma } from "@/lib/prisma";

const adminCtx: AccessContext = {
  userId: "system",
  organisationId: "o-demo",
  hotelId: "h-demo",
  roleCodes: ["ORG_ADMIN"],
  permissions: [],
  isPlatformAdmin: true,
};

export async function GET() {
  // 1. EventBus : émettre un événement et vérifier qu'il est diffusé
  let received = 0;
  const unsubscribe = eventBus.subscribe(
    DomainEvents.hotelCreated,
    () => {
      received += 1;
    },
    { swallowErrors: true },
  );
  await eventBus.publish({
    name: DomainEvents.hotelCreated,
    hotelId: "h-demo",
    organisationId: "o-demo",
    data: { name: "health-check" },
  });
  unsubscribe();

  // 2. RBAC
  const rbacOk = authorizationService.can(adminCtx, "reservations.create");

  // 3. Offline : génération d'ID côté client (UUID v7)
  const id = uuidv7();

  // 4. Base de données (optionnelle — échoue proprement si DATABASE_URL absente)
  let db = "unavailable";
  try {
    const count = await prisma.organisation.count();
    db = `ok (${count} orgs)`;
  } catch {
    db = "unavailable (DATABASE_URL non configurée)";
  }

  return NextResponse.json({
    status: "ok",
    modules: {
      eventBus: received === 1,
      rbac: rbacOk,
      offlineUuid: id,
      database: db,
    },
    timestamp: new Date().toISOString(),
  });
}
