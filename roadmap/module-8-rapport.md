# Rapport — Module 8 : Tableau de disponibilité (Front Desk) ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 9 tests verts (domaine), isolation RLS confirmée.**

## 1. Objectif du module
Fournir la **vue du front desk** : tableau de disponibilité par hôtel, **alimenté en temps réel** par les
séjours actifs et les états des chambres (produits par les Modules 6 & 7), avec filtres, indicateurs
visuels, recherche rapide, et actions contextuelles selon les droits.

## 2. Ce qui a été fait

### A. Domaine (`modules/frontdesk`)
| Fichier | Rôle |
|---------|------|
| `frontdesk.types.ts` | `AvailabilityRow` (chambre + occupant + réservation), `AvailabilityFilter`, `AvailabilityBoard` (avec compteurs) |
| `frontdesk.repository.ts` | Port d'agrégation + `deriveStatus` (indicateur visuel) |
| `frontdesk.service.ts` | `FrontDeskService.getBoard` (agrégat + compteurs + **isolation par hôtel**) |

**Fonctionnalités :**
- **Vue par hôtel** avec **isolation complète** (isolation métier + RLS).
- **Filtres** : étage, type de chambre, statut, période.
- **Recherche rapide** par numéro de chambre ou nom de client.
- **Indicateurs visuels** dérivés : disponible / occupée / réservée / en nettoyage / hors service / maintenance.
- **Compteurs** par indicateur (pour les filtres visuels).

### B. Application (`apps/web`)
- Adapter Prisma `PrismaFrontDeskRepository` (jointure Room + RoomType + Stay ACTIVE + Guest + Reservation).
- **API** : `GET /api/availability` (snapshot consolidé + compteurs) — RBAC `rooms.view`.
- **Écran `/frontdesk`** : grille de chambres avec indicateurs colorés, compteurs, filtres, recherche, et
  **actions contextuelles** (ouvrir fiche chambre / réservation / lancer check-in si `reservations.checkin`).
- **Temps réel** : l'écran s'abonne à **Supabase Realtime** (Room / Stay / Reservation) et re-consulte l'API
  à chaque check-in, check-out ou changement d'état.

### C. RLS & base réelle
- **Aucune migration** : le tableau est un **agrégat** des tables existantes (Room, Stay, Reservation) —
  le RLS déjà en place (Room, Stay) assure l'isolation.
- **Test d'isolation RLS** (`08-rls-test-availability.sql`) sur la base réelle : A (Cotonou) voit uniquement
  ses chambres / **0** de Dakar ; B (Dakar) voit les siennes / **0** de Cotonou. ✅

## 3. Vérifications
- ✅ **119 tests verts** (core 27 + domaine 92), typecheck web propre, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS du tableau).
- ✅ Démo intacte (14 chambres, 2 occupées, 1 séjour actif) — tableau bien alimenté.

## 4. Rien n'est cassé
- Aucune régression : modules 1–7 + Guests + réservations + tarifs + chambres + séjours + front desk fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 9 — Housekeeping** (génération automatique des tâches de ménage au check-out, affectation, priorité) — dépend directement du Module 7.
