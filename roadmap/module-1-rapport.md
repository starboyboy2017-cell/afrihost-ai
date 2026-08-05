# Rapport — Module 1 : Paramètres généraux ✅

> **Statut : LIVRÉ — 9 tests verts, typecheck propre (domaine + web), RBAC étendu à 11 rôles.**

## 1. Objectif du module
Centraliser la **configuration de l'organisation et de chaque hôtel** : identité, devise, langue, fuseau,
taux de taxe, coordonnées. C'est le "panneau de contrôle" qui conditionne le comportement de toute la
plateforme (tarifs, factures, notifications).

## 2. Ce qui a été fait

### A. RBAC étendu (conformément à la demande)
- **11 rôles système seedés** : `PLATFORM_ADMIN` (super admin), `HOTEL_OWNER` (propriétaire),
  `FRONT_DESK` (réception), `HOUSEKEEPING`, `CASHIER` (caissier), `WAITER` (serveur), `KITCHEN` (cuisinier),
  `STOCK_MANAGER` (gestionnaire de stock), `ACCOUNTANT` (comptable), `MAINTENANCE` (technicien), `GUEST` (client).
- **Permissions étendues** aux modules : settings, hotels, iam, rooms, reservations, housekeeping, guests,
  payments, billing, audit, reports, **pos, caisse, kitchen, inventory/stock, maintenance, portal**.
- **RBAC extensible** : les rôles sont stockés en **base** (`Role`/`RolePermission`/`Membership`). Un
  nouvel utilisateur peut créer des rôles et choisir des permissions **via le panneau d'admin, sans toucher
  au code** (testé dans `rbac.test.ts`). Le registre de permissions n'est modifié que pour ajouter de
  nouvelles permissions lors du développement d'un module.

### B. Package `@afrihost/domain` (modules métier)
- Nouveau workspace pour les **services métier** (découplés de l'infrastructure).
- Module **settings** : types, validation (zod), dépôt (port), service.

### C. Service `SettingsService` (règles métiers implémentées)
- Lire organisation / lister hôtels / lire & modifier réglages d'hôtel.
- **Validation** : devise ISO 4217, locale BCP-47, fuseau IANA, TVA ∈ [0,1], noms non vides.
- **Isolation multihôtel** : rejette tout accès inter-hôtel (tenant ≠ hôtel ciblé).
- **Audit** : chaque mutation journalisée (append-only).
- **Événements** : émet `settings.changed` et `hotel.updated` (découplage inter-modules).

### D. Couche application (apps/web)
- Adapter Prisma (`PrismaSettingsRepository`), audit Prisma (`PrismaAuditWriter`), conteneur DI (`lib/di.ts`).
- API : `GET/PATCH /api/org`, `GET/PATCH /api/hotels/:hotelId/settings` — **RBAC via `requirePermission`**.
- Écran : `/settings` (lecture org + hôtels).
- `.env.local` : URL + anon key Supabase (jamais la service role key).

## 3. Vérifications (sandbox)
- ✅ `tsc --noEmit` (core, domain, web) → aucun erreur.
- ✅ Tests : **core 27** + **domaine 9** = **36 tests verts**.
- ✅ `prisma validate` → schéma valide.
- ✅ RBAC : 11 rôles présents, permissions ciblées, extensibilité vérifiée.

## 4. Notes / prérequis pour la connexion réelle
- Pour **migrer** et exécuter l'API contre Supabase, il faut le **DATABASE_URL** (chaîne de connexion
  PostgreSQL — *Settings → Database → Connection string*). L'anon key seule ne peut pas créer/migrer les tables.
- L'authentification réelle (Supabase Auth) et la résolution du `AccessContext` sont branchées au
  **Module 3 — IAM**. D'ici là, les routes API exigent un contexte (401 si non connecté), ce qui est correct.

## 5. Rien n'est cassé
- Les 36 tests de la fondation + Module 1 passent. Le schéma reste valide. L'architecture et les règles
  BusinessRules sont respectées.

## ➡️ Module suivant (après votre validation) : Module 2 — Gestion multihôtels
