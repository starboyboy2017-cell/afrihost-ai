# Rapport — Module 21 : CRM ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 12 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Module CRM complet, intégré au PMS, réservations, front desk, POS, facturation, paiements, housekeeping,
blanchisserie, transport et tous les modules : vue 360 client, segmentation dynamique, campagnes multicanal,
préférences, notes/tâches/rappels, opportunités, entreprises/agences, historique des interactions. Architecture
extensible pour un futur programme de fidélité (sans logique en dur).

## 2. Ce qui a été fait

### A. Schéma (migration `20260804160000_crm`)
| Modèle | Rôle |
|--------|------|
| `Company` | Entreprises / agences partenaires |
| `GuestPreference` | **Préférences client** (langue, chambre, étage, vue, lit, régime, allergies, paiement, anniversaire, communication, custom extensible) |
| `CustomerSegment` | **Segments dynamiques** (critères configurables) |
| `Campaign` / `CampaignSend` | **Campagnes multicanal** + envois avec suivi ouvertures/clics |
| `CustomerInteraction` | **Vue 360 / historique des interactions** |
| `CustomerTask` | Notes / tâches / rappels |
| `Opportunity` | Opportunités de vente |
| Enums | `CampaignChannel` (5), `CampaignStatus` (5) |

Chaque table porte `hotelId` (isolation) + RLS.

### B. Domaine (`modules/crm`)
- **Vue 360** : totalSpent, stayCount, avgStayDays, fidélité, entreprise.
- **Segmentation dynamique** (critères configurables).
- **Moteur de campagnes** : planification, ciblage, envoi, suivi ouvertures/clics.
- **Préférences** extensibles (`custom` JSON).
- **Notes / tâches / rappels / opportunités / entreprises & agences**.
- **Architecture fidélité** : Guest a déjà loyaltyPoints/loyaltyTier + LoyaltyTransaction, extensible sans refonte.
- **Isolation** : rejet des accès inter-hôtels. RBAC `crm.*`.

### C. Application (`apps/web`)
- Adapter Prisma (y compris vue 360 agrégée).
- **API** : `/api/crm/guests/:id/360`, `/companies`, `/preferences`, `/segments`, `/campaigns`,
  `/interactions`, `/tasks`, `/opportunities`.
- Écran `/crm`.

### D. RLS & base réelle
- **Migration appliquée** (8 tables + 2 enums) + RLS.
- **Test d'isolation RLS** (`21-rls-test-crm.sql`) sur la base réelle : A (Cotonou) voit sa campagne /
  **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`21-demo-crm.sql`) : 1 entreprise, 1 segment, 1 campagne, 1 préférence, 1 interaction.

## 3. Vérifications
- ✅ **261 tests verts** (core 27 + domaine 234), typecheck web propre, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS CRM).
- ✅ Migration + RLS appliqués ; démo intacte ; nettoyage automatique.

## 4. Rien n'est cassé
- Aucune régression : modules 1–20 + Guests + réservations + tarifs + chambres + séjours + front desk +
  housekeeping + maintenance + blanchisserie + transport + POS + cuisine + caisse + pourboires + remises +
  stock + comptabilité + billing + CRM fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 22 — Programme de fidélité** selon feuille de route.
