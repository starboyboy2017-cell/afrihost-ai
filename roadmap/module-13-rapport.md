# Rapport — Module 13 : POS Restaurant ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 11 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Système de **point de vente** intégré au PMS : plusieurs points de vente (restaurant, bar, room service),
menus, produits, taxes, promotions (remises), commandes et encaissements, **divers moyens de paiement**,
intégration réservations/chambres, **chiffre d'affaires automatique**, remboursements/annulations/modifications
avec **traçabilité**, RLS/RBAC, migrations, tests, démo.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804080000_pos`)
| Modèle | Rôle |
|--------|------|
| `PosPoint` | Point de vente (restaurant, bar, room service) |
| `PosMenu` / `PosMenuLine` | Menus et lignes (produit + prix + taxe) |
| `PosOrder` / `PosOrderLine` | Commandes et lignes |
| `PosOrderEvent` | **Traçabilité** (remboursements, annulations, modifications) |
| `PosPayment` | Paiements POS (divers moyens) |
| Enums | `PosKind` (3), `PosOrderStatus` (5) |

Chaque table porte `hotelId` (isolation) + RLS (26 policies).

### B. Domaine (`modules/pos`)
- **Points de vente** : restaurant, bar, room service.
- **Menus** : création + lignes (produit, prix, taxe).
- **Commandes** : création depuis le menu, **calcul automatique** (sous-total, taxes, remise, total), lien réservation/chambre.
- **Paiements** : divers moyens (CASH, CARD, MOBILE_MONEY...) → statut `PAID`.
- **Remboursements** : `PAID → REFUNDED` ; **annulations** : `OPEN → VOID` — via machine à états.
- **Chiffre d'affaires** : `getRevenue` (somme des commandes PAID).
- **Traçabilité** : `PosOrderEvent` (création, paiement, remboursement, annulation).
- **Isolation** : rejet des accès inter-hôtels. RBAC `pos.*`.

### C. Application (`apps/web`)
- Adapter Prisma (y compris agrégation du CA).
- **API** : `GET/POST /api/pos/points`, `GET/POST /api/pos/menu`, `GET/POST /api/pos/orders`,
  `GET /api/pos/orders/revenue`, `POST .../pay`, `POST .../refund`, `POST .../void`.
- Écran `/pos`.

### D. RLS & base réelle
- **Migration appliquée** (7 tables + 2 enums) + **26 policies RLS**.
- **Test d'isolation RLS** (`13-rls-test-pos.sql`) sur la base réelle : A (Cotonou) voit sa commande /
  **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`13-demo-pos.sql`) : 1 point de vente, produits, menu, commande PAID (CA 7670 XOF).

## 3. Vérifications
- ✅ **170 tests verts** (core 27 + domaine 143), typecheck web propre, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS POS).
- ✅ Migration + RLS appliqués ; démo intacte ; nettoyage automatique.

## 4. Rien n'est cassé
- Aucune régression : modules 1–12 + Guests + réservations + tarifs + chambres + séjours + front desk +
  housekeeping + maintenance + blanchisserie + transport + POS fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 14 — Cuisine** ou **Module 15 — Caisse** selon feuille de route.
