# Rapport — Module 18 : Stock & inventaire ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 11 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Système complet de **gestion des stocks** intégré au PMS, POS, cuisine, blanchisserie, maintenance et
achats : articles, catégories, unités, fournisseurs, entrepôts ; approvisionnements, commandes fournisseurs,
réceptions, contrôle des livraisons ; seuils min/max + alertes ; mouvements (entrées, sorties, transferts,
ajustements, retours, pertes, casse) ; inventaires physiques ; valorisation (méthode configurable) ;
décrémentation auto depuis POS/cuisine/blanchisserie/maintenance.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804130000_stock`)
| Modèle | Rôle |
|--------|------|
| `StockCategory` | Catégories d'articles |
| `Supplier` | Fournisseurs |
| `UnitOfMeasure` | Unités de mesure |
| `Warehouse` | Entrepôts |
| `PurchaseOrder` / `PurchaseOrderLine` | Commandes fournisseurs + lignes |
| `StockReceipt` / `StockReceiptLine` | Réceptions + contrôle des livraisons |
| `StockMovement` | **Tous les mouvements** (8 types) |
| `StockCount` / `StockCountLine` | Inventaires physiques |
| Enrichis | `StockItem` (warehouseId, minLevel, maxLevel, unitCost), `Product` (categoryId, unitId) |
| Enums | `StockMovementType` (8), `PurchaseOrderStatus` (5), `StockCountStatus` (4) |

Chaque table porte `hotelId` (isolation) + RLS (49 policies).

### B. Domaine (`modules/inventory`)
- Entrepôts, fournisseurs, catégories/unités.
- **Commandes fournisseurs** (création, réception, contrôle livraison → `RECEIVED`).
- **Seuils min/max** + **alertes de réapprovisionnement** (listLowStock).
- **Mouvements** : entrées (RECEIPT), sorties (ISSUE), transferts, ajustements, retours, pertes, casse — **ne descend jamais sous zéro**.
- **Inventaires physiques** : compare compté vs théorique, ajuste l'écart.
- **Valorisation** : coût unitaire enregistré à la réception.
- **Décrémentation automatique** : `issue()` (consommation depuis POS/cuisine/blanchisserie/maintenance).
- **Isolation** : rejet des accès inter-hôtels. RBAC `inventory.*`.

### C. Application (`apps/web`)
- Adapter Prisma.
- **API** : `GET/POST /api/inventory/warehouses`, `/suppliers`, `/receive`, `/movements`, `/stock-count`,
  `/low-stock`, `/purchase-orders`.
- Écran `/inventory`.

### D. RLS & base réelle
- **Migration appliquée** (11 tables + 3 enums) + **49 policies RLS**.
- **Test d'isolation RLS** (`18-rls-test-stock.sql`) sur la base réelle : A (Cotonou) voit ses 2 articles /
  **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`18-demo-stock.sql`) : 1 entrepôt, 1 fournisseur, 2 articles, 1 mouvement.

## 3. Vérifications
- ✅ **226 tests verts** (core 27 + domaine 199), typecheck web propre, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS stock).
- ✅ Migration + RLS appliqués ; démo intacte ; nettoyage automatique.

## 4. Rien n'est cassé
- Aucune régression : modules 1–17 + Guests + réservations + tarifs + chambres + séjours + front desk +
  housekeeping + maintenance + blanchisserie + transport + POS + cuisine + caisse + pourboires + remises +
  stock fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 19 — Comptabilité** ou selon feuille de route.
