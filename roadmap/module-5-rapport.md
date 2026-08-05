# Rapport — Module 5 : Types de chambres & tarifs flexibles ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 8 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration en place.**

## 1. Objectif du module
Gérer les **catégories de chambres** et un modèle de **tarification flexible** (pour éviter une refonte
ultérieure) : plusieurs types par hôtel, plusieurs tarifs selon la **saison**, tarifs par **devise**
(multi-pays), et **restrictions/promotions** futures.

## 2. Ce qui a été fait

### A. Schéma (extension — nouvelle migration `20260804020000_room_types_rates`)
Ajout d'un modèle de tarification évolutif :
| Modèle | Rôle |
|--------|------|
| `RatePlan` | Plan tarifaire (`BASE` / `SEASONAL` / `WEEKEND` / `PROMOTIONAL`), avec période (`startDate`/`endDate`) — plusieurs plans par type de chambre |
| `RatePlanPrice` | **Prix par DEVISE** (ISO 4217) en minor units / nuit — multi-pays |
| `RatePlanRestriction` | Restrictions réservables (séjour min/max, réservation à l'avance, capacité) |

Chaque table porte `hotelId` (isolation) + RLS. Les tarifs sont **par hôtel et par type de chambre**.

### B. Domaine (`modules/roomTypes`)
- `roomTypes.types.ts`, `.validation.ts`, `.repository.ts`, `.service.ts`, `.error.ts`.
- **Service métier** : créer/modifier/activer types de chambres ; créer/modifier/activer plans tarifaires ;
  **résolution de prix** (priorité aux plans actifs couvrant la date et la devise demandée, sinon `baseRate`).
- **Isolation** : rejet des accès inter-hôtels + un plan ne peut référencer un type d'un autre hôtel.
- **Audit** + RBAC `roomTypes.*`.

### C. Application (`apps/web`)
- Adapter Prisma (résolution de prix par saison/devise).
- **API** : `GET/POST /api/room-types`, `GET/PATCH /api/room-types/:id`,
  `GET/POST /api/rate-plans`, `GET /api/rate-plans?currency&date` (résolution de prix).
- Écran `/room-types`.

### D. RLS & base réelle
- Migration appliquée : 3 tables créées + **RLS activé** (12 policies) sur les 3.
- **Test d'isolation RLS** (`05-rls-test-roomtypes.sql`) exécuté sur la base réelle : utilisateur A (Cotonou)
  voit 3 types / 0 de Dakar ; utilisateur B (Dakar) voit 3 / 0 de Cotonou. ✅
- **Jeu de démonstration** (`05-demo-roomtypes.sql`) : 2 hôtels (Cotonou, Dakar), 6 types, 6 plans,
  10 prix multi-devises, 2 restrictions — prouve la flexibilité (BASE, SEASONAL, PROMOTIONAL).

## 3. Vérifications
- ✅ **86 tests verts** (core 27 + domaine 59).
- ✅ Typecheck web propre, schéma Prisma valide.
- ✅ SQL des migrations/seed/tests validé par parseur PostgreSQL.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS).
- ✅ Jeu de démo intact après le test (nettoyage automatique des données de test).

## 4. Rien n'est cassé
- Aucune régression : modules 1–4 + Guests + tarifs fonctionnels. La base de démo reste en place.

## ➡️ Module suivant (après votre validation) : **Module 6 — Chambres** (inventaire physique lié aux types + états)
