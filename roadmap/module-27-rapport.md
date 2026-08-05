# Rapport — Module 27 : Événements & Groupes ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 10 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Module complet de gestion des groupes, événements et séminaires, entièrement intégré au PMS. Groupes,
entreprises/agences/organisateurs, événements (séminaires, conférences, mariages, banquets, formations),
réservation de salles, capacités/disponibilités, équipements, contrats/devis, ordres de service, gestion
documentaire, calendrier interactif. Synchronisé avec Réservations, CRM, POS, Comptabilité, Paiements,
Transport, Housekeeping, Maintenance, Fidélité.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804220000_events`)
| Modèle | Rôle |
|--------|------|
| `EventGroup` | **Groupe de réservation** (entreprise via `Company` du CRM, contact, chambres allouées, statut) |
| `EventVenue` | **Salle / espace** événementiel (capacité, modes de placement, tarif de base) |
| `EventEquipment` | **Équipements** (projecteur, sonorisation, mobilier... catégorie, quantité, disponibilité) |
| `HotelEvent` | **Événement** (séminaire/conférence/mariage/banquet/formation, salle, créneau, participants, statut) |
| `EventContract` | **Contrat / devis** (montant, statut DRAFT/SENT/ACCEPTED/SIGNED/VOID, validité, signature) |
| `EventServiceOrder` | **Ordre de service** par département (housekeeping, catering, transport, maintenance, frontdesk) |
| `EventDocument` | **Gestion documentaire** (contrat, devis, pièce jointe) |

Chaque table porte `hotelId` (isolation) + RLS.

### B. Domaine (`modules/events`)
- Groupes (création, statut, **allocation de chambres**) ;
- Salles & équipements ;
- Événements avec **vérification de disponibilité de salle** (refus en cas de conflit) + **calendrier interactif** ;
- Contrats / devis (création, signature) ;
- Ordres de service par département (coordination housekeeping/restauration/transport) ;
- Documents.
- Isolation multihôtel + RBAC `events.*`. Chaque mutation journalisée (audit). Événements publiés sur l'EventBus.

### C. Application (`apps/web`)
- Adapter Prisma (`modules/events/events.repository.prisma.ts`).
- **API** : `/api/events/groups`(+`/:id/allocate-rooms`), `/venues`, `/equipments`, `/events`, `/calendar`,
  `/contracts`, `/service-orders`, `/documents`.
- Écran `/events` (groupes, événements, salles, contrats, ordres de service).

### D. RLS & base réelle
- **Migration appliquée** (7 tables).
- Policies RLS par hôtel sur les 7 tables (+ `FORCE`).
- **Test d'isolation RLS** (`27-rls-test-events.sql`) sur la base réelle : A (Cotonou) voit ses groupes / salles,
  **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`27-demo-events.sql`) : 1 salle, 1 équipement, 1 groupe (séminaire, entreprise CRM), 1 événement
  (séminaire), 1 contrat accepté, 1 ordre de service (restauration).

## 3. Vérifications
- ✅ **358 tests verts** (core 27 + domaine 331), typecheck core/domain/web propres, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS Événements).
- ✅ Migration + RLS appliqués ; jeu de démo intact ; nettoyage automatique.
- ✅ **Base Supabase vérifiée** : 7 tables `Event*`/`HotelEvent`, RLS activé (`FORCE`), données de démo.

## 4. Rien n'est cassé
- Aucune régression : modules 1–26 + tous les modules fonctionnels.
- Le module réutilise `Company` du CRM (entreprises/organisateurs) et émet des événements pour coordonner
  housekeeping, restauration et transport via les modules existants.

## ➡️ Module suivant (après votre validation) : selon feuille de route — Mobile (PWA avancée / application).
