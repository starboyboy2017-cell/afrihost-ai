# Rapport — Module 20 : Paiements & facturation (folios clients) ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 12 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Système de **paiement et facturation** intégré au PMS, POS, caisse, réservations, folios clients,
comptabilité, remises, pourboires et stocks : encaissements multimoyens, paiements partiels/acomptes/
cautions/remboursements/différés, **folio client** centralisant tous les frais, transfert/fusion/division,
facturation consolidée, règles fiscales configurables, sync comptabilité (SYSCOHADA compatible), passerelles
configurables.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804150000_billing`)
| Modèle | Rôle |
|--------|------|
| `Folio` | **Folio client** (centralise tous les frais, regroupement individuel/groupe/entreprise) |
| `FolioLine` | Lignes de frais (hébergement, restauration, room service, blanchisserie, transport, maintenance, minibar, autres) |
| `PaymentGateway` | **Passerelles configurables** (Stripe, Flutterwave, Paystack, Mobile Money...) |
| Enrichis | `Payment` (folioId, kind PARTIAL/DEPOSIT/CAUTION/FULL/DEFERRED, gatewayId/Ref), `Invoice` (folioId) |
| Enums | `FolioChargeType` (8), `FolioStatus` (2) |

Chaque table porte `hotelId` (isolation) + RLS.

### B. Domaine (`modules/billing`)
- **Folios** : création, lignes de frais (tous types), transfert de lignes, **fusion**.
- **Paiements multimoyens** : espèces, carte, Mobile Money, virement, chèque ; partiels/acomptes/cautions/différés ; remboursements.
- **Validation du solde** (paiement plein au-delà du solde refusé ; dépôts/cautions exemptés).
- **Facturation consolidée** : regroupe toutes les consommations, génère facture (avec règles fiscales configurables via taxRate).
- **Passerelles configurables** : `PaymentGateway` (architecture sans dépendance fournisseur).
- **Sync comptabilité** : écritures générées à partir des paiements/factures (compatible SYSCOHADA).
- **Isolation** : rejet des accès inter-hôtels. RBAC `billing.*` + `payments.*`.

### C. Application (`apps/web`)
- Adapter Prisma.
- **API** : `GET/POST /api/billing/folios`, `/folios/:id/lines`, `/folios/:id/payments`,
  `/folios/:id/consolidate`, `/folios/transfer`, `/folios/merge`, `/gateways`.
- Écran `/billing`.

### D. RLS & base réelle
- **Migration appliquée** (3 tables + 2 enums + enrichissements) + RLS.
- **Test d'isolation RLS** (`20-rls-test-billing.sql`) sur la base réelle : A (Cotonou) voit son folio /
  **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`20-demo-billing.sql`) : 1 folio (2 lignes), 1 paiement Mobile Money, 1 passerelle.

## 3. Vérifications
- ✅ **249 tests verts** (core 27 + domaine 222), typecheck web propre, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS billing).
- ✅ Migration + RLS appliqués ; démo intacte ; nettoyage automatique.

## 4. Rien n'est cassé
- Aucune régression : modules 1–19 + Guests + réservations + tarifs + chambres + séjours + front desk +
  housekeeping + maintenance + blanchisserie + transport + POS + cuisine + caisse + pourboires + remises +
  stock + comptabilité + billing fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 21 — CRM** selon feuille de route.
