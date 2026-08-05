# Rapport — Module 3 : Gestion des réservations ✅

> **Statut : LIVRÉ — 34 tests verts (domaine), +27 core = 61 tests au total, typecheck web propre,
> schéma Prisma valide.**

## 1. Objectif du module
Gérer le cycle de vie d'une réservation hôtelière (création → confirmation → check-in → check-out), avec
annulation, no-show et liste d'attente, **en conservant la sécurité et l'isolation entre hôtels**.

## 2. Ce qui a été fait

### A. Domaine (`@afrihost/domain` → `modules/reservations`)
| Fichier | Rôle |
|---------|------|
| `reservations.types.ts` | Types : `Reservation`, statuts, sources |
| `reservations.state.ts` | **Machine à états** (BR-5.3) : `PROVISIONAL → CONFIRMED → CHECKED_IN → CHECKED_OUT`, `CANCELLED`, `NO_SHOW`, `WAITLIST` |
| `reservations.pricing.ts` | **Tarification** (BR-5.7) : `nuits × taux − remise + taxes`, minor units |
| `reservations.validation.ts` | Validation (zod) : dates, capacité, montants |
| `reservations.repository.ts` | Port de persistance (découplé de Prisma) |
| `reservations.service.ts` | Service métier : créer, confirmer, check-in/out, annuler, no-show, modifier, lister, historique |
| `reservations.error.ts` | `ReservationError` |

**Fonctionnalités & règles métier implémentées :**
- **Création** : validation, **calcul de prix automatique** (démo : 3 nuits × 5000 + 18% TVA = 17 700), vérification de **disponibilité / double-réservation** (BR-5.5), `bookingRef` unique (`AH-2026-00001`), statut initial `PROVISIONAL`, audit + événement `reservation.created`.
- **Transitions via machine à états** : `confirm`, `checkIn`, `checkOut`, `cancel`, `markNoShow` — **toute transition illégale est rejetée** (BR-5.3), audit + événements de domaine (`reservation.confirmed`, `guest.checked_in/out`, `reservation.cancelled`, `reservation.no_show`).
- **Modification** avec re-vérification de disponibilité si changement de chambre.
- **Historique** des changements de statut (`ReservationStatusHistory`).
- **Isolation multitenant** : chaque opération exige un acteur dont `hotelId` = hôtel de la réservation ; tout accès inter-hôtel est rejeté (`ReservationError`).

### B. Application (`apps/web`)
- `modules/reservations/reservations.repository.prisma.ts` : adapter Prisma (transaction pour statut+historique, vérification d'overlap, `nextBookingRef`, TVA, baseRate).
- `lib/di.ts` : enregistrement de `ReservationsService`.
- **API** (protégées par RBAC) :
  - `GET /api/reservations` (liste + filtres status/from/to/guestId) — `reservations.view`
  - `POST /api/reservations` (création) — `reservations.create`
  - `GET/PATCH/DELETE /api/reservations/:id` — `view/update/cancel`
  - `POST/GET /api/reservations/:id/status` — transitions (confirm/checkin/checkout/cancel) + historique
- `lib/api.ts` : mapping `ReservationError` (403 inter-hôtel, 404 introuvable, 409 illégale/doublon).
- Écran `/reservations` (liste + statuts).

### C. RBAC
- Permissions ajoutées : `reservations.confirm`, `reservations.no_show`.
- Rôles `HOTEL_OWNER`, `HOTEL_MANAGER`, `FRONT_DESK` disposent des transitions de statut.

## 3. Vérifications (sandbox)
- ✅ `tsc --noEmit` : core, domain, web → aucun erreur.
- ✅ Tests : core **27** + domaine **34** = **61 tests verts** (modules 1 & 2 toujours verts : aucune régression).
- ✅ `prisma validate` → schéma valide.

## 4. Base de données
- **Aucun changement de schéma** pour ce module (les tables `Reservation`, `ReservationStatusHistory`
  existaient déjà dans la migration initiale).
- Les nouvelles permissions (`reservations.confirm`, `reservations.no_show`) sont du **seed** (registre
  `@afrihost/core`), appliqué lors du seed initial (Module 3 IAM) — pas de migration nécessaire.
- L'isolation entre hôtels est garantie par le **RLS** (policies `reservation_select` / `reservation_insert` /
  `reservation_update` déjà créées) **+ l'isolation métier dans le service**.

## 5. Rien n'est cassé
- 61 tests verts, schéma valide, modules 1–3 opérationnels. Les modules validés sont intacts.

## ➡️ Module suivant (après votre validation) : Module 4 — Journal d'audit (visualisation) ou Client (Guests)
