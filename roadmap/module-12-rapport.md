# Rapport — Module 12 : Transport, navettes & transferts ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 12 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Système complet de **transport** intégré : véhicules (internes/prestataires), chauffeurs, réservations de
transferts, trajets, affectation (auto/manuelle), cycle de statut, synchro réservations/check-in-out/clients,
facturation au folio, journal d'audit, RLS/RBAC, migrations versionnées, tests, démo.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804070000_transport`)
| Modèle | Rôle |
|--------|------|
| `Vehicle` | Véhicule (capacité, plaque, état, **disponibilité**, **ownership INTERNAL/EXTERNAL** + prestataire) |
| `Driver` | Chauffeur (affectation, disponibilité, planning) |
| `Transfer` | Réservation de transfert (trajet, type, statut, **facturation au folio**) |
| `TransferAssignment` | Affectation véhicule + chauffeur |
| Enums | `VehicleOwnership`, `VehicleStatus`, `TransferStatus` (6), `TransferType` (6 dont ROUND_TRIP/MULTI_STOP) |

Chaque table porte `hotelId` (isolation) + RLS (15 policies).

### B. Domaine (`modules/transport`)
- **Véhicules** : création (interne/externe), statut, disponibilité.
- **Chauffeurs** : création, disponibilité.
- **Transferts** : création (aéroport, gare, ville, personnalisé, aller-retour, multi-destination).
- **Cycle de statut** : `REQUESTED → CONFIRMED → ASSIGNED → IN_PROGRESS → COMPLETED` (machine à états), annulation.
- **Affectation manuelle** (assign) ou **automatique** (auto-assign : 1er véhicule disponible capacité suffisante + 1er chauffeur actif).
- **Synchro** : `guestId`/`reservationId` (profil client + réservation check-in/out).
- **Facturation au folio** : `markInvoiced` (exige une réservation liée).
- **Isolation** : rejet des accès inter-hôtels. RBAC `transport.*`.

### C. Application (`apps/web`)
- Adapter Prisma.
- **API** : `GET/POST /api/transport/vehicles`, `GET/POST /api/transport/drivers`,
  `GET/POST /api/transport/transfers`, `POST .../status`, `POST .../assign`, `POST .../auto-assign`, `POST .../invoice`.
- Écran `/transport`.

### D. RLS & base réelle
- **Migration appliquée** + **15 policies RLS**.
- **Test d'isolation RLS** (`12-rls-test-transport.sql`) sur la base réelle : A (Cotonou) voit ses 2
  transferts / **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`12-demo-transport.sql`) : 2 véhicules (interne+externe), 2 chauffeurs, 2 transferts.

## 3. Vérifications
- ✅ **159 tests verts** (core 27 + domaine 132), typecheck web propre, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS transport).
- ✅ Migration + RLS appliqués ; démo intacte ; nettoyage automatique.

## 4. Rien n'est cassé
- Aucune régression : modules 1–11 + Guests + réservations + tarifs + chambres + séjours + front desk +
  housekeeping + maintenance + blanchisserie + transport fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 13 — POS Restaurant** selon feuille de route.
