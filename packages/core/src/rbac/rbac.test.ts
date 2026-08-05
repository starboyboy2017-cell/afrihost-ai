import { describe, it, expect } from "vitest";
import {
  AuthorizationService,
  UnauthorizedError,
  ForbiddenError,
  requirePermission,
  type AccessContext,
} from "./rbac.js";
import { SYSTEM_ROLES, findSystemRole } from "./roles.js";
import { allPermissions } from "./permissions.js";

const ctx: AccessContext = {
  userId: "u1",
  organisationId: "o1",
  hotelId: "h1",
  roleCodes: ["FRONT_DESK"],
  permissions: findSystemRole("FRONT_DESK")!.permissions,
};

describe("AuthorizationService", () => {
  const auth = new AuthorizationService();

  it("autorise une permission détenue", () => {
    expect(auth.can(ctx, "reservations.create")).toBe(true);
    expect(auth.can(ctx, "reservations.checkin")).toBe(true);
  });

  it("refuse une permission non détenue (ex: gestion comptable)", () => {
    expect(auth.can(ctx, "caisse.close")).toBe(false);
    expect(auth.can(ctx, "users.manage")).toBe(false);
  });

  it("exige TOUTES les permissions pour can()", () => {
    expect(auth.can(ctx, "reservations.create", "reservations.view")).toBe(true);
    expect(auth.can(ctx, "reservations.create", "caisse.close")).toBe(false);
  });

  it("requiert au moins une permission pour canAny()", () => {
    expect(auth.canAny(ctx, "caisse.close", "reservations.create")).toBe(true);
    expect(auth.canAny(ctx, "caisse.close", "users.manage")).toBe(false);
  });

  it("le super admin a accès à tout", () => {
    const admin = { ...ctx, isPlatformAdmin: true };
    expect(auth.can(admin, "users.manage", "caisse.close", "invoices.refund")).toBe(true);
  });

  it("requirePermission lève si non authentifié", () => {
    expect(() => requirePermission(auth, null, "reservations.view")).toThrow(UnauthorizedError);
  });

  it("requirePermission lève si permission refusée", () => {
    expect(() => requirePermission(auth, ctx, "caisse.close")).toThrow(ForbiddenError);
  });

  it("requirePermission passe si autorisé", () => {
    expect(() => requirePermission(auth, ctx, "reservations.view")).not.toThrow();
  });
});

describe("Rôles système (BusinessRules BR-1)", () => {
  const auth = new AuthorizationService();
  const EXPECTED_CODES = [
    "PLATFORM_ADMIN",
    "HOTEL_OWNER",
    "FRONT_DESK",
    "HOUSEKEEPING",
    "CASHIER",
    "WAITER",
    "KITCHEN",
    "STOCK_MANAGER",
    "ACCOUNTANT",
    "MAINTENANCE",
    "GUEST",
  ];

  it("contient les 11 rôles clés demandés", () => {
    const codes = SYSTEM_ROLES.map((r) => r.code);
    for (const c of EXPECTED_CODES) {
      expect(codes, `rôle manquant : ${c}`).toContain(c);
    }
  });

  it("les rôles sont uniques", () => {
    const codes = SYSTEM_ROLES.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("PLATFORM_ADMIN et HOTEL_OWNER ont toutes les permissions", () => {
    expect(findSystemRole("PLATFORM_ADMIN")!.permissions).toEqual(allPermissions());
    expect(findSystemRole("HOTEL_OWNER")!.permissions).toEqual(allPermissions());
  });

  it("les rôles métier ont des permissions ciblées et non toutes", () => {
    for (const code of EXPECTED_CODES.slice(2)) {
      const role = findSystemRole(code)!;
      // un rôle métier n'a jamais toutes les permissions
      expect(role.permissions.length, `${code} ne doit pas avoir toutes les perms`).toBeLessThan(
        allPermissions().length,
      );
    }
  });

  it("HOUSEKEEPING ne peut pas gérer les paiements/finances", () => {
    const hk = findSystemRole("HOUSEKEEPING")!;
    expect(hk.permissions).not.toContain("payments.create");
    expect(hk.permissions).not.toContain("invoices.refund");
    expect(hk.permissions).not.toContain("caisse.close");
  });

  it("GUEST n'a que des permissions portail", () => {
    const guest = findSystemRole("GUEST")!;
    for (const p of guest.permissions) {
      expect(p.startsWith("portal."), `${p} n'est pas une permission portail`).toBe(true);
    }
  });

  it("toutes les permissions référencées existent dans le registre", () => {
    const valid = new Set(allPermissions());
    for (const role of SYSTEM_ROLES) {
      for (const p of role.permissions) {
        expect(valid.has(p), `permission inconnue ${p} dans ${role.code}`).toBe(true);
      }
    }
  });

  it("le registre est extensible : un rôle personnalisé en base ne dépend pas du code", () => {
    // Représente un rôle créé via l'admin (stocker en DB), pas dans SYSTEM_ROLES.
    // Le moteur RBAC fonctionne sur les permissions du contexte, quel que soit le rôle.
    const customRole = { code: "MY_CUSTOM_ROLE", permissions: ["reservations.view", "rooms.view"] as const };
    const customCtx: AccessContext = { ...ctx, roleCodes: [customRole.code], permissions: [...customRole.permissions] };
    expect(auth.can(customCtx, "reservations.view")).toBe(true);
    expect(auth.can(customCtx, "reservations.create")).toBe(false);
  });
});
