# Module 9 — Réservations (spécification de référence)

> Module **cœur** du PMS. Il orchestre disponibilité, tarifs, chambres, clients, paiements, notifications.
> Données de référence dans `database/schema.prisma` (modèles `Reservation`, `ReservationStatusHistory`).

## 1. Objectif
Créer et gérer des réservations (directes, site web, téléphone, walk-in, OTA) avec vérification de
disponibilité, calcul des tarifs et taxes, gestion des statuts et de l'historique.

## 2. Acteurs & permissions
| Rôle | Accès |
|------|-------|
| `HOTEL_MANAGER` | tout sur les réservations |
| `FRONT_DESK` | créer, modifier, annuler, allouer chambre |
| `SALES_CRM` | créer, voir |
| `GUEST` (portail) | créer/suivre ses propres réservations |

Permissions : `reservations.create`, `.view`, `.update`, `.cancel`, `.checkin`, `.checkout`, `.allocate_room`,
`.discount_apply` (avec plafond).

## 3. Données
Modèles : `Reservation`, `ReservationStatusHistory`. Colonnes clés : `bookingRef` (unique), `arrivalDate`,
`departureDate`, `status`, `source`, `channel`, montants (minor units), `confirmationNumber` OTA.
Relations : → `Hotel`, → `Guest`, → `Room`/`RoomType`. Index : `(hotelId, arrivalDate)`, `(hotelId, status)`, `(guestId)`.
RLS : `hotel_id = current_hotel_id()`.

## 4. Statuts (machine à états)
```
PROVISIONAL ──▶ CONFIRMED ──▶ CHECKED_IN ──▶ CHECKED_OUT
   │               │             │
   └────▶ CANCELLED ◀──┘          └──▶ CANCELLED
CONFIRMED ──▶ NO_SHOW
WAITLIST ──▶ PROVISIONAL
```
Transitions **illégales** rejetées par le service : CHECKED_IN→PROVISIONAL, CANCELLED→CONFIRMED, etc.
Règle : durée minimale 1 nuit ; departure > arrival ; pas de double-réservation sur une chambre aux mêmes dates.

## 5. Automatisations
| Événement | Action |
|-----------|--------|
| `reservation.confirmed` | pré-autorisation paiement, notification WhatsApp/email, housekeeping pré-arrivée |
| J-1 arrivée | pré-assigner chambre si possible |
| Heure d'échéance atteinte (no-show) | → NO_SHOW, facturer pénalité, libérer la chambre, relancer |
| Annulation | remboursement selon politique, libérer chambre, notifier |

## 6. Notifications
- Confirmation (WhatsApp + email) avec numéro de réservation et détails.
- Rappel J-1 (WhatsApp).
- Confirmation annulation / remboursement.
- Template multi-langue/multi-devise.

## 7. Interactions avec les autres modules
- **Émet :** `reservation.created/confirmed/cancelled/no_show`.
- **Écoute :** `room.status_changed`, `channel.reservation_synced`.
- **Consomme :** disponibilité (Room), tarifs (RoomType/RatePlan), Guest, Paiements, Notifications, Channel Manager.
- **Peut être consommé par :** Compta, Facturation, CRM, Fidélité, Housekeeping, BI.

## 8. API (aperçu)
```
GET    /api/reservations?status&from&to&guest   → liste paginée + filtres
POST   /api/reservations                        → créer (vérif dispo + tarif)
GET    /api/reservations/:id
PATCH  /api/reservations/:id                    → modifier (dates, chambre)
POST   /api/reservations/:id/cancel
POST   /api/reservations/:id/allocate-room
POST   /api/reservations/:id/checkin
```
Toutes protégées par permission + RLS.

## 9. Écrans d'interface
1. **Liste des réservations** — filtres (dates, statut, source), recherche par client/numéro.
2. **Nouvelle réservation** — sélection dates → disponibilité → tarif → client → confirmation.
3. **Détail réservation** — timeline statuts, montants, paiements, chambre assignée, actions contextuelles.
4. **Gestion d'annulation** — politique, frais, remboursement.
5. **Lien vers planning** (module 10) et check-in (module 11).

## 10. Critères d'acceptation
- [ ] Vérification de disponibilité = zéro double-réservation sur une même chambre/dates.
- [ ] Tarifs calculés correctement (nuits × taux − remise + taxes) en minor units.
- [ ] Machine à états rejette les transitions illégales.
- [ ] Historique complet dans `ReservationStatusHistory`.
- [ ] Tests unitaires + tests RLS + test e2e (parcours complet).
- [ ] Événements émis et consommés par les modules dépendants.
