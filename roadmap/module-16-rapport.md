# Rapport — Module 16 : Gestion des pourboires ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 12 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Système complet de **gestion des pourboires** intégré au POS, à la caisse et au PMS : enregistrement lors
des paiements, individuels/collectifs, **règles configurables par hôtel**, validation, distribution, suivi
des montants, historique, multi-moyens, annulations/corrections traçables, RLS/RBAC, migrations, tests, démo.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804110000_tips`)
| Modèle | Rôle |
|--------|------|
| `TipRule` | **Règle de répartition configurable par hôtel** (% serveur/équipe/cuisine/autre) |
| `Tip` | Pourboire (lien POS, type, statut, montant, moyen) |
| `TipAllocation` | Répartition vers les bénéficiaires |
| `TipEvent` | Historique / traçabilité (création, validation, distribution, annulation) |
| Enums | `TipType` (INDIVIDUAL/COLLECTIVE), `TipStatus` (4) |

Chaque table porte `hotelId` (isolation) + RLS (12 policies).

### B. Domaine (`modules/tips`)
- **Règles de répartition** : configurables par hôtel, somme des % = 100 (validée).
- **Enregistrement au paiement** : lien `posPaymentId`/`posOrderId`.
- **Individuel / collectif** : individuel → bénéficiaire direct ; collectif → répartition selon la règle.
- **Multi-moyens** : espèces, carte, mobile money.
- **Validation** : PENDING → VALIDATED (par responsable, `validatedBy`).
- **Distribution** : VALIDATED → DISTRIBUTED + suivi des montants (en attente vs distribués).
- **Annulations / corrections** : → CANCELLED avec traçabilité.
- **Isolation** : rejet des accès inter-hôtels. RBAC `tips.*`.

### C. Application (`apps/web`)
- Adapter Prisma.
- **API** : `GET/POST /api/tips/rules`, `GET/POST /api/tips`, `POST /api/tips/:id/status`.
- Écran `/tips`.

### D. RLS & base réelle
- **Migration appliquée** (4 tables + 2 enums) + **12 policies RLS**.
- **Test d'isolation RLS** (`16-rls-test-tips.sql`) sur la base réelle : A (Cotonou) voit ses pourboires /
  **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`16-demo-tips.sql`) : 1 règle, 2 pourboires (1 distribué), 4 répartitions.

## 3. Vérifications
- ✅ **201 tests verts** (core 27 + domaine 174), typecheck web propre, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS pourboires).
- ✅ Migration + RLS appliqués ; démo intacte ; nettoyage automatique.

## 4. Rien n'est cassé
- Aucune régression : modules 1–15 + Guests + réservations + tarifs + chambres + séjours + front desk +
  housekeeping + maintenance + blanchisserie + transport + POS + cuisine + caisse + pourboires fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 17 — Remises / Promotions** ou selon feuille de route.
