# Migrations Prisma — Versionnage & Restauration

> Chaque migration est **versionnée** dans `database/migrations/`. Elles sont appliquées en ordre croissant
> par Prisma Migrate. L'ordre d'application est enregistré dans la table `_prisma_migrations` de la base.

## Comment appliquer les migrations

Depuis votre machine (avec accès réseau à la base) :

```bash
# 1. Configurez la connexion (une seule fois) :
#    copier .env.example → .env  puis renseigner DATABASE_URL
export DATABASE_URL="postgresql://postgres:VOTRE_MDP@db.<ref>.supabase.co:5432/postgres"

# 2. Appliquer toutes les migrations en attente :
npx prisma migrate deploy --schema database/schema.prisma
```

> La chaîne de connexion est le **DATABASE_URL** fourni (utilisateur `postgres`). N'utilisez **jamais** la
> service role key. L'utilisateur `postgres` est requis pour les migrations (l'utilisateur `anon` ne peut pas
> créer les tables).

## Migration courante

| Migration | Description | Statut |
|-----------|-------------|--------|
| `20260804000000_init_schema` | Création complète du schéma (tous les modèles multitenant) **+ RLS activé sur les 24 tables dès la création** + 81 policies multi-tenant/RBAC + 7 helpers (`auth_*`). | ✅ Appliquée & vérifiée |
| `20260804010000_seed_permissions_roles` | **Seed des 69 permissions globales** + fonction `afrihost_seed_org_roles` + **trigger** créant les **11 rôles système par organisation** (versionné, idempotent, multi-hôtels). | ✅ Appliquée & vérifiée |

## 🔒 RLS intégré dès la création
La migration crée chaque table **avec RLS activé** (`ENABLE` + `FORCE ROW LEVEL SECURITY`) et les **policies
multi-tenant** correspondantes dans le même script. Il n'est **pas nécessaire** d'exécuter un script RLS
séparé : tout est inclus.

- **Isolation** : un utilisateur ne voit/écrit que les données des hôtels dont il est membre (`Membership`).
- **RBAC** : les écritures sont restreintes par permission (`module.action`) via la chaîne
  `Membership → Role → RolePermission → Permission`.
- **Append-only** : `AuditLog` n'a que des policies INSERT + SELECT (jamais UPDATE/DELETE).
- Helpers `auth_user_id() / auth_org_id() / auth_has_hotel() / auth_hotel_id() / auth_org_admin() /
  auth_has_role() / auth_has_permission()` en `SECURITY DEFINER` (résolvent le tenant sans récursion RLS).
- Source : `infra/supabase/03-rls-policies.sql` (fusionné dans la migration).

> ⚠️ Les fichiers `infra/supabase/01-rls.sql` et `02-rls-hotels.sql` sont **supersédés** par le fichier
> consolidé `03-rls-policies.sql` (inclus dans la migration). N'exécutez **pas** les trois sur la même base
> (noms de policies en double).

## 🔐 Seed des permissions & rôles (multihôtel, versionné)

La migration `20260804010000_seed_permissions_roles` :
1. **Seede les 69 permissions globales** (table `Permission`, code unique) — une seule fois, indépendantes des hôtels.
2. Crée la fonction `afrihost_seed_org_roles(org_id)` qui insère les **11 rôles système** + leurs
   `RolePermission` pour une organisation donnée.
3. Crée un **trigger `trg_org_seed_roles`** (AFTER INSERT sur `Organisation`) : toute nouvelle organisation
   reçoit automatiquement ses rôles → **chaque hôtel/organisation est isolé** (RLS + rôles propres).
4. **Seed les organisations existantes** (idempotent, `CREATE OR REPLACE` / `WHERE NOT EXISTS`).

**Source unique** : `packages/core/src/rbac/{permissions,roles}.ts` (le seed SQL est généré depuis le code,
il ne peut pas diverger). Si vous ajoutez une permission dans le code, régénérez la migration avec :
```bash
npx tsx packages/core/gen_migration.mjs
```

### Application (SQL Editor Supabase)
Ouvrez https://supabase.com/dashboard/project/enymxomgokpasydfrxzk/sql/new et collez le contenu de
`database/migrations/20260804010000_seed_permissions_roles/migration.sql`.

> ⚠️ Nécessite l'extension `pgcrypto` (`gen_random_uuid()`). Supabase l'active par défaut ; sinon exécutez
> d'abord `create extension if not exists pgcrypto;`.

## 🧪 Script de validation RLS (relançable)
`infra/supabase/04-rls-test.sql` vérifie l'isolation entre hôtels :
- crée 2 hôtels + utilisateurs A (membre H1), B (membre H2), C (aucun rôle) + 1 réservation/hôtel ;
- teste la logique RLS (helpers) **et** un test end-to-end (simulation de session `authenticated`) :
  A ne voit que H1, B que H2, C aucun ; A ne peut pas modifier H2 ;
- **nettoie toutes les données de test** (succès comme échec) → **relançable à volonté**.
Exécution : SQL Editor Supabase. Résultat attendu : `NOTICE '✅ RLS OK ...'`.

## 💥 Restauration (rollback) — si un module pose problème

Prisma Migrate **ne supporte pas un rollback automatique en production**. La stratégie documentée :

### Option 1 — Réinitialiser sur une base de développement
```bash
# Détruit TOUTES les données (uniquement en dev / démo) puis ré-applique tout
npx prisma migrate reset --schema database/schema.prisma
```

### Option 2 — Annuler un seul module (migration manuelle)
1. Identifier la migration à annuler (ex : celle du module fautif).
2. Générer le SQL inverse (down migration) pour **cette** migration :
   ```bash
   # compare le schéma avant (le snapshot de la migration précédente) et après
   npx prisma migrate diff \
     --from-migrations database/migrations --to-schema-datamodel database/schema.prisma --script
   ```
   > En pratique, pour annuler la dernière migration : `prisma migrate diff --from-schema-datamodel
   > <schema_avant> --to-migrations ...`.
3. Exécuter manuellement le SQL inverse dans votre outil SQL (Supabase SQL Editor).
4. Supprimer la ligne correspondante dans la table `_prisma_migrations`.

> ⚠️ **Règle métier** : préférez un **correctif (nouvelle migration)** à un rollback quand les données de
> production doivent être préservées. Le rollback est réservé aux environnements de dev/staging ou aux
> migrations pas encore livrées.

### Option 3 — Sauvegarde / restauration complète (recommandé)
- **Supabase** fait des sauvegardes automatiques (point-in-time recovery, PITR). Vous pouvez **restaurer la
  base à un instant précis** via le dashboard (*Database → Backups → Restore*), ce qui annule de fait toute
  migration non désirée sans perte de données.
- Recommandation : **sauvegarder avant chaque migration** de module en production.

## Bonnes pratiques
- Une migration = un module (cohérence et traçabilité).
- Toujours tester la migration sur staging avant production.
- Le fichier `migration_lock.toml` fixe le provider (`postgresql`).
- Ne jamais modifier une migration **déjà appliquée** (créer une nouvelle migration à la place).
