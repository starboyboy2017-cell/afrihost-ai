# Rapport — Module 17 : Remises, promotions & coupons ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 14 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Moteur de règles **flexible** de remises/promotions/coupons compatible PMS, POS, caisse et facturation :
plafonds par rôle, conditions (dates, canaux, types de clients, types de chambres, montants), génération et
validation des coupons, intégration folios clients (scope BILLING), RLS/RBAC, migrations, tests, démo.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804120000_discounts`)
| Modèle | Rôle |
|--------|------|
| `DiscountRule` | Règle de remise (type %, fixe ; portée POS/RESERVATION/BILLING ; **plafond par rôle** ; **conditions JSON**) |
| `Coupon` | Coupon (code unique, statut, mono-usage, expiration, émission client) |
| Enums | `DiscountType` (2), `DiscountScope` (3), `CouponStatus` (4) |

Chaque table porte `hotelId` (isolation) + RLS (8 policies).

### B. Domaine (`modules/discounts`)
- **Moteur de règles** : création (%, fixe), application selon les **conditions** (dates, canaux, guestTypes, roomTypeIds, min/max montant).
- **Plafond par rôle** (`roleCap`) : plafonne la remise selon le rôle.
- **Génération de coupons** : code unique (`PROMO10-XXXXXX`), mono-usage, expiration.
- **Validation de coupons** : vérifie code, statut, expiration, conditions ; marque USED si mono-usage.
- **Répartition** entre POS/RESERVATION/BILLING (intégration folio via scope BILLING).
- **Isolation** : rejet des accès inter-hôtels. RBAC `discounts.*` + `coupons.*`.

### C. Application (`apps/web`)
- Adapter Prisma.
- **API** : `GET/POST /api/discounts/rules`, `POST /api/discounts/coupons`,
  `POST /api/discounts/coupons/validate`, `POST /api/discounts/apply`.
- Écran `/discounts`.

### D. RLS & base réelle
- **Migration appliquée** (2 tables + 3 enums) + **8 policies RLS**.
- **Test d'isolation RLS** (`17-rls-test-discounts.sql`) sur la base réelle : A (Cotonou) voit ses 2 règles /
  **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`17-demo-discounts.sql`) : 2 règles (10% POS, fixe 2000 BILLING) + 1 coupon.

## 3. Vérifications
- ✅ **215 tests verts** (core 27 + domaine 188), typecheck web propre, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS remises).
- ✅ Migration + RLS appliqués ; démo intacte ; nettoyage automatique.

## 4. Rien n'est cassé
- Aucune régression : modules 1–16 + Guests + réservations + tarifs + chambres + séjours + front desk +
  housekeeping + maintenance + blanchisserie + transport + POS + cuisine + caisse + pourboires + remises
  fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 18 — Stocks / Inventaire** ou selon feuille de route.
