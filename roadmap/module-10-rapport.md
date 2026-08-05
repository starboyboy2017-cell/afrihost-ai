# Rapport — Module 10 : Maintenance & interventions ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 10 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Créer un système de **tickets de maintenance** liés aux chambres, avec priorité, assignation, cycle de vie
(`OPEN → ASSIGNED → IN_PROGRESS → ON_HOLD → RESOLVED → CLOSED`), **mise hors service automatique** de la
chambre si nécessaire, **remise en service à la clôture**, synchronisation temps réel avec le Front Desk et
les modules voisins, journal d'audit, isolation multihôtel (RLS + RBAC).

## 2. Ce qui a été fait

### A. Schéma (migration `20260804050000_maintenance`)
- `MaintenanceRequest` (ticket) : chambre liée, priorité, assignation, `putRoomOutOfOrder`, `roomRestored`, horodatages.
- `MaintenanceEvent` (historique/audit).
- Enums `MaintenanceStatus` (6) et `MaintenancePriority` (4).

### B. Domaine (`modules/maintenance`)
- **Machine à états** des tickets (cycle complet + réassignation).
- **Création** : lien à une chambre (doit appartenir à l'hôtel), **mise hors service auto** (`OUT_OF_ORDER`) si demandé.
- **Assignation / réassignation**.
- **Cycle de vie** avec horodatages ; **à la clôture** (`RESOLVED`/`CLOSED`), **remise en service** de la chambre (`AVAILABLE`).
- **Journal d'audit** + **événements temps réel** (publication sur `roomStatusChanged` → sync Front Desk / réservations / check-in-out / housekeeping).
- **Isolation** : rejet des accès inter-hôtels.

### C. Application (`apps/web`)
- Adapter Prisma.
- **API** : `GET/POST /api/maintenance`, `POST .../assign`, `POST .../status`.
- Écran `/maintenance`.

### D. RLS & base réelle
- **Migration appliquée** + **6 policies RLS** (MaintenanceRequest/Event).
- **Test d'isolation RLS** (`10-rls-test-maintenance.sql`) sur la base réelle : A (Cotonou) voit ses tickets / **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`10-demo-maintenance.sql`) : ticket OPEN (clim, chambre 201 hors service) + ticket CLOSED (chambre 301 restaurée).

## 3. Vérifications
- ✅ **139 tests verts** (core 27 + domaine 112), typecheck web propre, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS maintenance).
- ✅ Migration + RLS appliqués ; démo intacte ; nettoyage automatique.

## 4. Rien n'est cassé
- Aucune régression : modules 1–9 + Guests + réservations + tarifs + chambres + séjours + front desk + housekeeping + maintenance fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 11 — Blanchisserie** ou **Module 12 — Transport** selon feuille de route.
