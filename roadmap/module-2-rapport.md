# Rapport — Module 2 : Gestion multihôtels ✅

> **Statut : LIVRÉ — 19 tests verts (domaine), +27 core = 46 tests au total, typecheck web propre,
> schéma Prisma valide, migration versionnée.**

## 1. Objectif du module
Permettre la **gestion de plusieurs hôtels** au sein d'une organisation : création, modification,
désactivation, sélection, paramètres par établissement, **isolation complète des données** entre hôtels,
et **gestion des rôles & permissions par hôtel**.

## 2. Ce qui a été fait

### A. Domaine (`@afrihost/domain` → `modules/hotels`)
| Fichier | Rôle |
|---------|------|
| `hotels.types.ts` | Types : `Hotel`, `CreateHotelInput`, `HotelSummary`, `MembershipAssignment` |
| `hotels.validation.ts` | Validation (zod) : nom, slug `[a-z0-9-]`, code, devise ISO, locale BCP-47, fuseau IANA, TVA |
| `hotels.repository.ts` | Port de persistance (interface, découplé de Prisma) |
| `hotels.service.ts` | Service métier : créer, modifier, désactiver/réactiver, lister, sélecteur, affecter rôle |
| `hotels.error.ts` | `HotelsError` (accès inter-hôtel, introuvable, doublon, rôle inconnu) |

**Fonctionnalités du service :**
- **Création d'hôtel** : validation, unicité slug/code, **le créateur devient propriétaire (HOTEL_OWNER)**
  de l'hôtel, audit + événement `hotel.created`.
- **Modification** : avec isolation multitenant (rejette tout accès inter-hôtel), audit + `hotel.updated`.
- **Désactivation / réactivation** : `isActive` à bascule, audit.
- **Liste** : hôtels d'une organisation (gestion) + hôtels d'un utilisateur (**sélecteur**).
- **Rôles & permissions PAR HÔTEL** : `assignRoleToUser` (utilisateur → hôtel → rôle via `Membership`),
  audit `hotels.assign_role`.

### B. Application (`apps/web`)
- `modules/hotels/hotels.repository.prisma.ts` : adapter Prisma (dont `listHotelsForUser` pour le sélecteur,
  résolution du rôle dans l'organisation de l'hôtel).
- `lib/di.ts` : enregistrement de `HotelsService`.
- **API** :
  - `GET /api/hotels` (liste org), `POST /api/hotels` (création)
  - `GET /api/hotels/me` (sélecteur : hôtels de l'utilisateur)
  - `GET/PATCH/DELETE /api/hotels/:hotelId` (détail, modification, désactivation)
  - `POST /api/hotels/:hotelId/memberships` (affectation de rôle par hôtel)
- Toutes les routes sont **protégées par RBAC** (`requirePermission` : `hotels.create/update/disable/assign_role`).
- `lib/api.ts` : mapping des `HotelsError` (403 inter-hôtel, 404 introuvable, 409 doublon/rôle inconnu).
- Écran `/hotels` (liste + statut).

### C. Base de données & RLS
- Schéma : ajout d'un **index sur `Membership.userId`** (sélecteur rapide) — modification non-cassante.
- **Migration versionnée** : `database/migrations/20260804000000_init_schema/migration.sql` (création complète).
- **RLS multitenant** : `infra/supabase/02-rls-hotels.sql` (isolation Hotel, Membership, Role, RolePermission).
- **Documentation de restauration** : `database/migrations/README-MIGRATIONS.md` (options : reset dev,
  migration inverse, restore PITR Supabase).

## 3. Vérifications (sandbox)
- ✅ `tsc --noEmit` : core, domain, web → aucun erreur.
- ✅ Tests : core **27** + domaine **19** = **46 tests verts** (module 1 toujours vert : aucune régression).
- ✅ `prisma validate` → schéma valide.
- ✅ Migration générée + contient l'index `Membership_userId_idx`.

## 4. ⚠️ Connexion à la base Supabase
**Impossible depuis ce sandbox** : le port 5432 est bloqué (accès réseau restreint), pas de client `psql`.
Les migrations doivent être **appliquées depuis votre machine** :

```bash
export DATABASE_URL="postgresql://postgres:VOTRE_MDP@db.enymxomgokpasydfrxzk.supabase.co:5432/postgres"
npx prisma migrate deploy --schema database/schema.prisma
```

> L'utilisateur `postgres` (dans le DATABASE_URL que vous avez fourni) est requis pour les migrations.
> L'anon key seule ne peut pas créer les tables. **Jamais de service role key.**
> Voir `database/migrations/README-MIGRATIONS.md` pour le rollback.

## 5. Rien n'est cassé
- 46 tests verts, schéma valide, modules 1 et 2 opérationnels. Les modules déjà validés sont intacts.

## ➡️ Module suivant (après votre validation) : Module 3 — Utilisateurs / Rôles / Permissions (IAM)
