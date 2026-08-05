# Rapport — Module 15 : Caisse ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 9 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Système de **gestion de caisse** intégré au PMS et au POS : ouvertures/fermetures, mouvements de caisse,
paiements multi-moyens, remboursements/annulations traçables, **clôture avec réconciliation**, **rapports
financiers**, plusieurs caisses et caissiers par hôtel, RLS/RBAC, migrations, tests, démo.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804100000_cash`)
| Modèle | Rôle |
|--------|------|
| `CashRegister` | Caisse (tiroir), liée optionnellement à un point de vente — plusieurs par hôtel |
| `CashSession` | Ouverture/fermeture, fonds d'ouverture, clôture, réconciliation |
| `CashMovement` | Mouvements (multi-moyens, remboursements, annulations, dépenses) |
| Enums | `CashSessionStatus` (2), `CashMovementType` (8) |

Chaque table porte `hotelId` (isolation) + RLS (12 policies).

### B. Domaine (`modules/cash`)
- **Caisses** : plusieurs par hôtel (réception, restaurant...), liées à un POS.
- **Ouverture** : fonds d'ouverture + mouvement `OPENING` ; interdit de rouvrir une caisse déjà ouverte.
- **Mouvements** : `SALE`, `PAYMENT`, `REFUND`, `VOID`, `EXPENSE`, multi-moyens ; refus sur session fermée.
- **Clôture + réconciliation** : compare le **total compté** au **total théorique**, calcule l'**écart**,
  enregistre `CLOSING` (+ `RECONCILIATION` si écart).
- **Rapports financiers** : totalIn, totalRefund, totalExpense, expectedClosing, **ventilation par moyen**.
- **Isolation** : rejet des accès inter-hôtels. RBAC `caisse.*`.

### C. Application (`apps/web`)
- Adapter Prisma (agrégation par type/méthode).
- **API** : `GET/POST /api/cash/registers`, `GET/POST /api/cash/sessions`,
  `POST .../sessions/:id/movement`, `POST .../sessions/:id/close`, `GET .../sessions/:id/report`.
- Écran `/cash`.

### D. RLS & base réelle
- **Migration appliquée** (3 tables + 2 enums) + **12 policies RLS**.
- **Test d'isolation RLS** (`15-rls-test-cash.sql`) sur la base réelle : A (Cotonou) voit sa session /
  **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`15-demo-cash.sql`) : 1 caisse, 1 session ouverte, 3 mouvements.

## 3. Vérifications
- ✅ **189 tests verts** (core 27 + domaine 162), typecheck web propre, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS caisse).
- ✅ Migration + RLS appliqués ; démo intacte ; nettoyage automatique.

## 4. Rien n'est cassé
- Aucune régression : modules 1–14 + Guests + réservations + tarifs + chambres + séjours + front desk +
  housekeeping + maintenance + blanchisserie + transport + POS + cuisine + caisse fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 16 — Pourboires** ou selon feuille de route.
