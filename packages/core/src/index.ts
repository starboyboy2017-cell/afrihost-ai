/**
 * @afrihost/core — Infrastructure cœur d'AfriHost AI (Phase 0).
 *
 * Export public du package. Chaque sous-système a une frontière claire :
 *   - events   : EventBus + catalogue d'événements de domaine (découplage inter-modules)
 *   - rbac     : permissions, rôles système, moteur d'autorisation (RBAC complet)
 *   - audit    : journal d'audit append-only (ADR-012)
 *   - tenant   : contexte multihôtel (ADR-005)
 *   - offline  : outbox + moteur de sync offline-first (ADR-011/013)
 */

// Events
export * from "./events/event-bus.js";
export * from "./events/event-catalog.js";

// RBAC
export * from "./rbac/permissions.js";
export * from "./rbac/roles.js";
export * from "./rbac/rbac.js";

// Audit
export * from "./audit/audit.js";

// Tenant
export * from "./tenant/tenant.js";

// Offline
export * from "./offline/idgen.js";
export * from "./offline/outbox.js";
export * from "./offline/sync-engine.js";
