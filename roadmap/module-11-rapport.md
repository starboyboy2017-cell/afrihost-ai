# Rapport — Module 11 : Blanchisserie ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 8 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Système complet de **gestion du linge** intégré aux modules existants : types de linge, cycle complet,
lots de lavage (interne/externe), pertes/détériorations, seuils de stock, isolation multihôtel (RLS/RBAC),
intégration avec housekeeping, chambres, front desk, réservations, check-in/out, journal d'audit.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804060000_laundry`)
| Modèle | Rôle |
|--------|------|
| `LaundryItemType` | Types de linge par hôtel (Serviette, Drap...) |
| `LaundryItem` | Pièce de linge physique (état, chambre, code) |
| `LaundryBatch` | **Lot de lavage** (dates, responsable, coût, mode INTERNAL/EXTERNAL) |
| `LaundryBatchItem` | Pièces incluses dans un lot |
| `LaundryLoss` | **Perte / détérioration** |
| enum `LaundryState` | Cycle : CLEAN, DISTRIBUTED, USED, DIRTY, WASHING, DRYING, IRONING |

Chaque table porte `hotelId` (isolation) + RLS (18 policies).

### B. Domaine (`modules/laundry`)
- **Cycle complet** via machine à états (CLEAN → DISTRIBUTED → USED → DIRTY → WASHING → DRYING → IRONING → CLEAN).
- **Types de linge** + **pièces** (état initial CLEAN).
- **Lots de lavage** : création (pièces → WASHING), complétion (→ CLEAN), mode interne/externe, coût, responsable.
- **Pertes/détériorations** : enregistrement + retrait de la pièce du stock.
- **Seuils de stock** : comptage par type (CLEAN vs total) → alertes.
- **Isolation** : rejet des accès inter-hôtels. RBAC `laundry.*`.

### C. Application (`apps/web`)
- Adapter Prisma (y compris comptage du stock par type).
- **API** : `GET/POST /api/laundry/item-types`, `GET/POST /api/laundry/items`, `POST .../items/:id/state`,
  `GET/POST /api/laundry/batches`, `GET/POST /api/laundry/losses`.
- Écran `/laundry`.

### D. RLS & base réelle
- **Migration appliquée** + **18 policies RLS**.
- **Test d'isolation RLS** (`11-rls-test-laundry.sql`) sur la base réelle : A (Cotonou) voit ses pièces /
  **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`11-demo-laundry.sql`) : 3 types, 3 pièces (états variés), 1 lot, 1 perte.

## 3. Vérifications
- ✅ **147 tests verts** (core 27 + domaine 120), typecheck web propre, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS blanchisserie).
- ✅ Migration + RLS appliqués ; démo intacte ; nettoyage automatique.

## 4. Rien n'est cassé
- Aucune régression : modules 1–10 + Guests + réservations + tarifs + chambres + séjours + front desk +
  housekeeping + maintenance + blanchisserie fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 12 — Transport** selon feuille de route.
