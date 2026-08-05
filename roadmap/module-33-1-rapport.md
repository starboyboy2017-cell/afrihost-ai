# Rapport — Sous-module 33.1 : Bootstrap & Initialisation du SaaS ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 7 tests verts (domaine), migration appliquée.**

## 1. Objectif du sous-module
Mécanisme sécurisé d'initialisation permettant de créer **automatiquement le premier compte SUPER_ADMIN**
lors du premier déploiement, **une seule fois**, via un script/commande sécurisée protégée par une `bootstrapKey`.

## 2. Règles de sécurité implémentées
| Exigence | Implémentation |
|---|---|
| **Création unique** | `bootstrapFirstSuperAdmin` échoue si un Super Admin existe déjà (`isInitialized`). |
| **Aucune inscription publique** ne crée un Super Admin | `isSuperAdmin` n'est positionné que par le bootstrap ; l'inscription ne met jamais ce flag. |
| **Seul un Super Admin gère les autres Super Admins** | Gestion des comptes via le Module 33 (saasadmin) réservé au Super Admin. |
| **1er mot de passe changé à la 1re connexion** | `mustChangePassword=true` à la création ; le login renvoie ce flag ; `changePassword` le lève. |
| **2FA avant accès admin** | `generate2FASecret` + `enable2FA` (code de confirmation) ; le login exige le code TOTP si 2FA activé. |
| **Toutes les actions journalisées** | Chaque action est écrite dans l'audit log. |

## 3. Ce qui a été fait

### A. Schéma (migration `20260804281000_bootstrap`) — additif
Ajoute sur `User` (sans breaking change) : `isSuperAdmin`, `mustChangePassword`, `twoFactorEnabled`,
`twoFactorSecret`.

### B. Domaine (`modules/bootstrap`)
- **Service** (`bootstrap.service.ts`, 7 tests) :
  - `isInitialized()` — état du SaaS ;
  - `bootstrapFirstSuperAdmin(email, password, bootstrapKey)` — création unique (vérifie la clé, hash du
    mot de passe, `mustChangePassword=true`) ;
  - `login(email, password, otp?)` — vérifie le hash + code 2FA si activé ;
  - `changePassword` — première connexion (vérifie l'ancien, lève le flag) ;
  - `generate2FASecret` / `enable2FA` (confirmation par code TOTP) / `disable2FA` ;
  - **TOTP (RFC 6238)** implémenté de façon pure (aucune dépendance externe).
- Sécurité : comparaison constante (`secureCompare`) pour éviter les attaques temporelles.

### C. Application (`apps/web`)
- Adapter Prisma (`modules/bootstrap/bootstrap.repository.prisma.ts`) — crée l'org `platform` si absente.
- **API `/api/bootstrap/...`** : `/status`, `/init`, `/login`, `/change-password`, `/2fa`.
- DI : la `bootstrapKey` provient de l'environnement (`BOOTSTRAP_KEY`), jamais exposée publiquement.

### D. Base réelle
- **Migration appliquée** sur Supabase (4 colonnes ajoutées à `User`).

## 4. Documentation d'initialisation
Voir `roadmap/docs-bootstrap-superadmin.md` (guide pas-à-pas pour un nouveau déploiement).

## 5. Vérifications
- ✅ **413 tests verts** (core 27 + domaine 386), typecheck core/domain/web propres.
- ✅ Migration appliquée sur Supabase ; colonnes de sécurité présentes.
- ✅ Aucun breaking change (ajout de colonnes + de modules, rien de supprimé).
