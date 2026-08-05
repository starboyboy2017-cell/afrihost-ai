# Rapport — Module 19 : Comptabilité générale ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 11 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration SYSCOHADA.**

## 1. Objectif du module
Module de **comptabilité générale** intégré au PMS, POS, caisse, folios, paiements, stocks et achats :
plan comptable configurable, journaux, écritures automatiques, périodes, rapprochements bancaires, comptes
clients/fournisseurs, centres de coûts, ajustements, balance, grand livre. **Compatibilité native
SYSCOHADA révisé (OHADA / UEMOA)** par configuration, extensible à d'autres normes sans développement.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804140000_accounting`)
| Modèle | Rôle |
|--------|------|
| `Account` | **Plan comptable configurable par hôtel** (code, type, nature) — SYSCOHADA classes 1-8 |
| `AccountingJournal` | Journaux (ventes, achats, banque, caisse, OD) |
| `JournalEntry` / `JournalEntryLine` | Écritures + lignes (débit/crédit) |
| `AccountingPeriod` | Périodes comptables (exercice) |
| `CostCenter` | Centres de coûts |
| `AccountBalance` | Soldes par compte/période |
| `BankReconciliation` | Rapprochements bancaires |
| Enums | `AccountType` (6), `AccountNature`, `AccountingJournalType` (5), `JournalEntryStatus` (3) |

Chaque table porte `hotelId` (isolation) + RLS.

### B. Domaine (`modules/accounting`)
- **Plan comptable** configurable (aucune règle codée en dur) : comptes à 6 chiffres SYSCOHADA.
- **Journaux** : ventes, achats, banque, caisse, OD.
- **Écritures automatiques** : création + **validation d'équilibre débit = crédit** (règle universelle).
- **Périodes** : création/fermeture.
- **Rapprochements bancaires** : écart solde comptable vs bancaire.
- **Centres de coûts** + **écritures d'ajustement** (régularisations).
- **Balance** (totaux débit/crédit par compte) et **grand livre**.
- **Règles configurables** : la nature (débit/crédit) des comptes est définie par configuration, adaptée à
  chaque juridiction (SYSCOHADA, SYSCOA, IFRS, PCG...).
- **Isolation** : rejet des accès inter-hôtels. RBAC `accounting.*`.

### C. Application (`apps/web`)
- Adapter Prisma (agrégation balance, grand livre).
- **API** : `GET/POST /api/accounting/accounts`, `/periods`, `/journals`, `/entries`, `/balance`,
  `/ledger`, `/reconcile`, `/cost-centers`.
- Écran `/accounting`.

### D. RLS & base réelle
- **Migration appliquée** (8 tables + 4 enums) + RLS.
- **Seed SYSCOHADA révisé** (`19-demo-syscohada.sql`) : 25 comptes (classes 1-8), 5 journaux, 1 période.
- **Test d'isolation RLS** (`19-rls-test-accounting.sql`) sur la base réelle : A (Cotonou) voit ses 25
  comptes / **0** de Dakar ; B (Dakar) voit **0**. ✅

## 3. Vérifications
- ✅ **237 tests verts** (core 27 + domaine 210), typecheck web propre, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS comptabilité).
- ✅ Migration + RLS + seed SYSCOHADA appliqués ; démo intacte ; nettoyage automatique.

## 4. Rien n'est cassé
- Aucune régression : modules 1–18 + Guests + réservations + tarifs + chambres + séjours + front desk +
  housekeeping + maintenance + blanchisserie + transport + POS + cuisine + caisse + pourboires + remises +
  stock + comptabilité fonctionnels.

## ➡️ Module suivant (après votre validation) : **Module 20 — Paiements / Facturation** selon feuille de route.
