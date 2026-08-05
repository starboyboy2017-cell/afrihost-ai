# Rapport — Phase 0 (Fondation) ✅

> **Statut : VALIDÉE (construction) — 23 tests verts, typecheck propre, schéma Prisma valide, client généré.**

## Objectif de la Phase 0
Avant le Module 1, l'application doit supporter : **multihôtel dès le départ**, **RBAC complet**,
**journal d'audit** pour toutes les actions importantes, **mode hors-ligne + synchronisation automatique**,
**architecture modulaire documentée**, et un **Event Bus** évitant les dépendances fortes.

## Ce qui a été construit

### 1. Monorepo + workspace
- `package.json` racine avec workspaces (`apps/*`, `packages/*`).
- `tsconfig.base.json`, `.gitignore`, `.env.example`.

### 2. `@afrihost/core` — infrastructure cœur (codée + testée)
| Sous-système | Fichier(s) | Rôle | Statut |
|--------------|-----------|------|--------|
| **Event Bus** | `src/events/event-bus.ts` | pub/sub de domaine, découplage inter-modules | ✅ testé |
| **Catalogue événements** | `src/events/event-catalog.ts` | noms d'événements centralisés | ✅ |
| **Permissions** | `src/rbac/permissions.ts` | registre `module.action` (source unique) | ✅ |
| **Rôles système** | `src/rbac/roles.ts` | ORG_ADMIN/HOTEL_MANAGER/FRONT_DESK/HOUSEKEEPING/ACCOUNTING | ✅ testé |
| **Moteur RBAC** | `src/rbac/rbac.ts` | `can/canAny/requirePermission` + Forbidden/Unauthorized | ✅ testé |
| **Journal d'audit** | `src/audit/audit.ts` | append-only (write + helpers logCreate/Update/Delete) | ✅ testé |
| **Contexte multihôtel** | `src/tenant/tenant.ts` | TenantContext + assertTenant (isolation) | ✅ |
| **UUID v7** | `src/offline/idgen.ts` | IDs côté client, ordonnables (Web Crypto, navigateur+Node) | ✅ testé |
| **Outbox** | `src/offline/outbox.ts` | file d'écritures locales en attente | ✅ testé |
| **Moteur de sync** | `src/offline/sync-engine.ts` | push/pull + résolution LWW | ✅ testé |

**23 tests unitaires** couvrant : EventBus, RBAC (règles BusinessRules BR-1), audit append-only,
sync offline (push/pull/LWW), UUID v7.

### 3. Base de données (Prisma / PostgreSQL)
- `database/schema.prisma` — **validé** (`prisma validate` ✅, client généré ✅).
- Modèles multihôtel : Organisation, Hotel, User, Membership, Role, Permission, RolePermission,
  AuditLog, Guest, RoomType, Room, RoomStatusHistory, Reservation, ReservationStatusHistory,
  Invoice, InvoiceLine, Payment, Product, StockItem, HousekeepingTask, Notification,
  LoyaltyTransaction, **SyncOutbox**, **Automation**.
- `deletedAt` (soft-delete) + `updatedAt` sur les entités syncables (ADR-013).
- `database/seed.ts` — seed des rôles/permissions depuis `@afrihost/core` (source unique).
- `database/docker-compose.yml` — Postgres local.

### 4. Sécurité multitenant
- `infra/supabase/01-rls.sql` — helpers `auth_org_id()`, `auth_hotel_id()`, `auth_has_hotel()`
  + policies d'exemple (Reservation, AuditLog append-only).

### 5. Application Next.js (scaffold)
- `apps/web/` — config Next 14 + Tailwind + Prisma singleton + résolution de contexte
  (AccessContext/TenantContext) + **endpoint `/api/health`** qui teste EventBus + RBAC + UUID v7 + BD.

### 6. CI/CD
- `.github/workflows/ci.yml` — typecheck + tests core + validation Prisma sur chaque push/PR.

## Vérifications effectuées dans le sandbox
- ✅ `prisma validate` → `schema valid 🚀`
- ✅ `prisma generate` → client généré (schéma cohérent)
- ✅ `tsc --noEmit` (core) → aucun erreur
- ✅ `vitest run` → 23/23 tests verts

## Validation du périmètre Phase 0 (critères du client)
| Exigence | Implémentation | Vérifié |
|----------|----------------|---------|
| Multihôtel dès le départ | `hotelId` partout + RLS + TenantContext | ✅ |
| RBAC complet | registre permissions + rôles + moteur | ✅ testé |
| Journal d'audit (actions importantes) | AuditLogger append-only en Phase 0 | ✅ testé |
| Mode hors-ligne + sync auto | outbox + SyncEngine + UUID v7 + LWW | ✅ testé |
| Architecture modulaire documentée | `Architecture.md` + structure module symétrique | ✅ |
| Event Bus (découplage) | `EventBus` + catalogue d'événements | ✅ testé |

## Ce qui reste avant le Module 1
- [ ] Connexion réelle à une base (docker-compose local ou Supabase) + migration initiale.
- [ ] Branchement de l'authentification (Supabase Auth) → résolution `AccessContext` réelle.
- [ ] Implémentation des écrans de login + layout authentifié + sélecteur d'hôtel (Module 2).

## ➡️ Prochaine étape
**Module 1 — Paramètres généraux** (après validation de ce rapport).
