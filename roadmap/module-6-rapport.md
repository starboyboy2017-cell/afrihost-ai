# Rapport — Module 6 : Chambres & inventaire physique ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 14 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration en place.**

## 1. Objectif du module
Gérer l'**inventaire physique des chambres** de chaque hôtel : création, modification, **états de chambre
bien définis** (machine à états), lien avec les **types de chambres du Module 5**, historique des états,
recherche — le tout **isolé par hôtel** et protégé par RBAC.

## 2. Ce qui a été fait

### A. Domaine (`modules/rooms`)
| Fichier | Rôle |
|---------|------|
| `rooms.state.ts` | **Machine à états des chambres** (BR-4.2) : `AVAILABLE → RESERVED → OCCUPIED → DIRTY → CLEANING → INSPECTED → AVAILABLE`, + `OUT_OF_ORDER`/`OUT_OF_SERVICE` |
| `rooms.types.ts` | Types : `Room`, statuts (8), saisies, filtre |
| `rooms.validation.ts` | Validation (numéro requis, étage ≥ 0) |
| `rooms.repository.ts` | Port de persistance |
| `rooms.service.ts` | Service métier |
| `rooms.error.ts` | `RoomError` |

**États de chambre définis** (enum `RoomStatus`, déjà en base) : `AVAILABLE, RESERVED, OCCUPIED, DIRTY, CLEANING, INSPECTED, OUT_OF_ORDER, OUT_OF_SERVICE`.

**Service métier :**
- **Création** : liée à un **type de chambre du Module 5** (le type doit appartenir à l'hôtel), **numéro unique par hôtel**, statut initial.
- **Modification** (type, étage, carte, photos).
- **Changement d'état via la machine à états** (BR-4.2) — transitions illégales rejetées + historique (`RoomStatusHistory`) + audit + événement `room.status_changed`.
- **Liste/recherche** par type, état, étage, numéro.

### B. Application (`apps/web`)
- Adapter Prisma (transaction pour état+historique).
- **API** : `GET/POST /api/rooms`, `GET/PATCH /api/rooms/:id`, `POST/GET /api/rooms/:id/status`.
- Écran `/rooms`.

### C. RLS & base réelle
- **Aucune migration** : les tables `Room`/`RoomStatusHistory` et les 10 policies RLS existaient déjà (créées dans la migration initiale).
- **Test d'isolation RLS** (`06-rls-test-rooms.sql`) exécuté sur la base réelle : A (Cotonou) voit ses 7 chambres / **0** de Dakar ; B (Dakar) voit ses 7 / **0** de Cotonou. ✅
- **Jeu de démonstration** (`06-demo-rooms.sql`) : 2 hôtels × 7 chambres (disponibles, sale, occupée, hors service) — prouve l'inventaire et les états.

## 3. Vérifications
- ✅ **100 tests verts** (core 27 + domaine 73).
- ✅ Typecheck web propre, schéma Prisma valide.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS des chambres).
- ✅ Jeu de démo intact (14 chambres, 2 hors service), nettoyage des données de test automatique.

## 4. Rien n'est cassé
- Aucune régression : modules 1–5 + Guests + réservations + tarifs + chambres fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 7 — États des chambres (vue/tableau de disponibilité)** ou directement **Réservations avancées / Check-in-out** selon la feuille de route.
