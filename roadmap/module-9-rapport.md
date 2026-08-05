# Rapport — Module 9 : Housekeeping ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 10 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Gérer les **tâches de ménage** : génération automatique après chaque **check-out** (chambre → DIRTY),
affectation au personnel avec priorités, cycle de statut `PENDING → ASSIGNED → IN_PROGRESS → COMPLETED →
VERIFIED`, **réaffectation** si l'agent est indisponible, **horodatage de chaque étape** (mesure des temps
de nettoyage), isolation par hôtel (RLS + RBAC), journal d'audit, notifications temps réel.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804040000_housekeeping`)
- **Horodatages** sur `HousekeepingTask` : `startedAt`, `completedAt`, `verifiedAt`, `updatedAt` → mesure des temps de nettoyage.
- Index sur `assignedTo` (affectation/réaffectation).
- FK `HousekeepingTask.hotelId → Hotel` (RLS multihôtel).
- Nouvelle table **`HousekeepingTaskEvent`** (historique des événements : création, affectation, réaffectation, début, fin, validation).

### B. Domaine (`modules/housekeeping`)
- **Génération automatique** d'une tâche quand la chambre passe `DIRTY` (post check-out) — le service exige une chambre DIRTY pour la génération auto.
- **Affectation** au personnel avec **priorité** (`assign`).
- **Cycle de statut** via machine à états (BR-7.2).
- **Réaffectation** : `ASSIGNED → ASSIGNED` vers un autre agent (si le premier n'est pas disponible).
- **Horodatage** automatique à chaque étape (début, fin, validation).
- **Journal d'audit** + **événements temps réel** (`housekeeping.task_created`, `housekeeping.completed`).
- **Isolation** : rejet des accès inter-hôtels.

### C. Application (`apps/web`)
- Adapter Prisma (horodatages automatiques, événements).
- **API** : `GET/POST /api/housekeeping`, `PATCH /api/housekeeping/:id`, `POST .../assign` (affectation/réaffectation), `POST .../status` (start|complete|verify).

### D. RLS & base réelle
- **Migration appliquée** + policies RLS pour `HousekeepingTaskEvent`.
- **Test d'isolation RLS** (`09-rls-test-housekeeping.sql`) sur la base réelle : A (Cotonou) voit sa tâche /
  **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`09-demo-housekeeping.sql`) : chambre 202 → DIRTY, tâche COMPLETED haute priorité avec
  4 événements horodatés (création, affectation, début, fin).

## 3. Vérifications
- ✅ **129 tests verts** (core 27 + domaine 102), typecheck web propre, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS housekeeping).
- ✅ Migration + RLS appliqués ; démo intacte ; nettoyage automatique des données de test.

## 4. Rien n'est cassé
- Aucune régression : modules 1–8 + Guests + réservations + tarifs + chambres + séjours + front desk + housekeeping fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 10 — Maintenance** (interventions, mises hors service, suivi) ou selon feuille de route.
