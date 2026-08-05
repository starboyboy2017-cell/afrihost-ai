# Rapport — Module Guests (Clients) ✅

> **Statut : LIVRÉ — 9 tests verts (domaine). Total suite : 78 tests (core 27 + domaine 51).**

## 1. Objectif du module
Gérer le **référentiel des clients** (guests) : création, modification, **archivage**, informations
d'identité, **historique des séjours**, **recherche rapide** — en respectant le **RBAC** et
l'**isolation par hôtel**.

## 2. Ce qui a été fait

### A. Domaine (`@afrihost/domain` → `modules/guests`)
| Fichier | Rôle |
|---------|------|
| `guests.types.ts` | Types : `Guest`, saisies, filtre, séjour |
| `guests.repository.ts` | Port de persistance |
| `guests.validation.ts` | Validation (zod) : nom/prénom requis, email, nationalité ISO, dates |
| `guests.service.ts` | Service métier |
| `guests.error.ts` | `GuestError` |

**Fonctionnalités (BusinessRules BR-8) :**
- **Création** : avec **détection de doublon par email** (BR-8.2), audit `guests.create`.
- **Modification** : informations d'identité (nom, email, téléphone, nationalité, pièces d'identité, date de naissance, adresse, tags, notes, VIP), audit `guests.update`.
- **Archivage** : **soft-delete** via `deletedAt` (le client disparaît des recherches par défaut, récupérable avec `includeArchived`), audit `guests.archive`.
- **Recherche rapide** : par nom, email, téléphone, pièce d'identité (insensible à la casse).
- **Historique des séjours** : liste des réservations du client dans l'hôtel.
- **Isolation métier** : chaque opération exige un acteur dont `hotelId` correspond au client ; tout accès inter-hôtel est rejeté (`GuestError`).

### B. Application (`apps/web`)
- Adapter Prisma `PrismaGuestsRepository` (création, recherche insensible à la casse, archivage, séjours).
- **API** (protégées par RBAC) :
  - `GET /api/guests?search&includeArchived&limit&offset` — `guests.view`
  - `POST /api/guests` — `guests.create`
  - `GET/PATCH/DELETE /api/guests/:id` — `view` / `update` / `update` (archivage)
  - `GET /api/guests/:id/stays` — historique des séjours — `guests.view`
- `lib/api.ts` : mapping `GuestError` (403 inter-hôtel, 404, 409 doublon).
- Écran `/guests` (recherche + liste + statut actif/archivé).

### C. RBAC
- Permissions : `guests.create`, `guests.view`, `guests.update`, `guests.merge` (registre déjà présent).

## 3. Vérifications (sandbox)
- ✅ `tsc --noEmit` : domain, web → aucun erreur.
- ✅ Tests : 9 pour Guests ; **78 tests verts** au total. Aucune régression.

## 4. Base de données
- **Aucun changement de schéma** : la table `Guest` existait déjà dans la migration initiale (colonnes
  identité + `deletedAt` pour l'archivage + `loyaltyPoints`/`loyaltyTier`).
- Isolation garantie par le **service** + le **RLS** (policies `guest_select/insert/update`).

## 5. Rien n'est cassé
- 78 tests verts, schéma valide, modules 1–4 intacts.

## ➡️ Module suivant (après votre validation) : selon feuille de route (types de chambres, chambres, états des chambres...)
