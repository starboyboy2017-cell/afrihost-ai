# Rapport — Module 14 : Cuisine (Kitchen Display System) ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 10 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Système d'**ordres de préparation** intégré au POS restaurant : réception des commandes, répartition par
poste, priorités, cycle `NEW → SERVED`, mises à jour temps réel, modifications/annulations, intégration
réservations/chambres/front desk/room service, RLS/RBAC, migrations, tests, démo.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804090000_kitchen`)
| Modèle | Rôle |
|--------|------|
| `KitchenStation` | Poste de cuisine (grillard, plats, desserts, room service) |
| `KitchenOrder` | Ordre de préparation (lien POS, poste, priorité, statut, horodatages) |
| `KitchenOrderLine` | Lignes de l'ordre (produit, quantité) |
| `KitchenOrderEvent` | **Traçabilité / temps réel** |
| Enums | `KitchenOrderStatus` (6), `KitchenLineStatus` (5) |

Chaque table porte `hotelId` (isolation) + RLS (12 policies).

### B. Domaine (`modules/kitchen`)
- **Réception des commandes POS** : création d'un ordre + reprise des lignes de la commande.
- **Répartition par poste** (chaque ordre lié à un poste de l'hôtel).
- **Priorités** (LOW/MEDIUM/HIGH/URGENT).
- **Cycle** : `NEW → PREPARING → READY → SERVED` (machine à états).
- **Modifications / annulations** : `MODIFIED` / `CANCELLED` avec traçabilité.
- **Temps réel** : événements `KitchenOrderEvent`.
- Intégration réservations, chambres, front desk, room service (posPointId/reservationId/roomId).
- **Isolation** : rejet des accès inter-hôtels. RBAC `kitchen.*`.

### C. Application (`apps/web`)
- Adapter Prisma (reprise des lignes POS).
- **API** : `GET/POST /api/kitchen/stations`, `GET/POST /api/kitchen/orders`, `POST .../orders/:id/status`.
- Écran `/kitchen`.

### D. RLS & base réelle
- **Migration appliquée** (4 tables + 2 enums) + **12 policies RLS**.
- **Test d'isolation RLS** (`14-rls-test-kitchen.sql`) sur la base réelle : A (Cotonou) voit son ordre /
  **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`14-demo-kitchen.sql`) : 3 postes, 1 ordre PREPARING (reçu depuis la commande POS de démo).

## 3. Vérifications
- ✅ **180 tests verts** (core 27 + domaine 153), typecheck web propre, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS cuisine).
- ✅ Migration + RLS appliqués ; démo intacte ; nettoyage automatique.

## 4. Rien n'est cassé
- Aucune régression : modules 1–13 + Guests + réservations + tarifs + chambres + séjours + front desk +
  housekeeping + maintenance + blanchisserie + transport + POS + cuisine fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 15 — Caisse** (fonds de caisse, sessions, rapprochement) selon feuille de route.
