# Rapport — Module 7 : Check-in / Check-out ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 10 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration du flux complet.**

## 1. Objectif du module
Mettre en place le **flux complet du front office** : check-in, check-out, **prolongation de séjour**,
**changement de chambre**, **mise à jour en temps réel de l'état des chambres**, avec audit, RLS, RBAC,
migrations versionnées, tests automatiques et jeu de démonstration. Ce module **alimente le tableau de
disponibilité** (Module 8) en fournissant les événements de check-in/out et les états des chambres.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804030000_stay_checkin_checkout`)
| Modèle | Rôle |
|--------|------|
| `Stay` | Séjour physique (check-in/out, statut `ACTIVE`/`CHECKED_OUT`, date de départ modifiable) |
| `RoomAssignment` | Historique des **changements de chambre** |
| enum `StayStatus` | `ACTIVE` / `CHECKED_OUT` |

Chaque table porte `hotelId` (isolation) + RLS (8 policies).

### B. Domaine (`modules/stay`)
`StayService` — flux complet (BusinessRules BR-6) :
- **Check-in** : réservation `CONFIRMED → CHECKED_IN`, chambre `RESERVED → OCCUPIED`, création du séjour `ACTIVE`, événement `guest.checked_in`.
- **Check-out** : réservation `CHECKED_IN → CHECKED_OUT`, chambre `OCCUPIED → DIRTY` (libérée pour housekeeping), séjour `CHECKED_OUT`, événement `guest.checked_out`.
- **Prolongation** : repousse `departureDate` (refuse si non postérieure).
- **Changement de chambre** : libère l'ancienne (`→ DIRTY`), occupe la nouvelle (`→ OCCUPIED`), trace dans `RoomAssignment`.
- **Liste des séjours actifs** : alimente le tableau de disponibilité.
- **Isolation** : rejet des accès inter-hôtels.

### C. Application (`apps/web`)
- Adapter Prisma (transactions pour statuts + historique).
- **API** : `GET /api/stays` (séjours actifs), `POST .../checkin`, `POST .../checkout`, `POST .../extend`, `POST/GET .../change-room`.
- Écran `/stays`.

### D. RLS & base réelle
- **Migration appliquée** : tables `Stay`/`RoomAssignment` + RLS (8 policies).
- **Test d'isolation RLS** (`07-rls-test-stays.sql`) sur la base réelle : A (Cotonou) voit son séjour / **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`07-demo-stays.sql`) : client + réservation CONFIRMED → **check-in** (chambre 102 OCCUPIED + séjour ACTIVE) + 2e réservation. Démontre le flux complet.

## 3. Vérifications
- ✅ **110 tests verts** (core 27 + domaine 83).
- ✅ Typecheck web propre, schéma Prisma valide, migrations/seed/test SQL validés.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS des séjours).
- ✅ Jeu de démo intact, nettoyage automatique des données de test.

## 4. Rien n'est cassé
- Aucune régression : modules 1–6 + Guests + réservations + tarifs + chambres + séjours fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 8 — Tableau de disponibilité** (front desk), alimenté directement par les séjours actifs et les états des chambres.
