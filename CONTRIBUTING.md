# CONTRIBUTING.md — AfriHost AI

> **Guide développeur — Module 36.**

Guide pour installer le projet, lancer l'environnement de développement et contribuer (nouveaux modules,
fournisseurs, connecteurs, API, rôles). Respect strict de la **Clean Architecture**, de **SOLID** et du
**Multi-Tenant** (RLS + RBAC).

---

## 1. Installation

```bash
git clone <repo> afrihost
cd afrihost
npm install --no-audit --no-fund
npm run build -w @afrihost/core      # construit core (dist utilisé par le domaine)
npx prisma generate --schema database/schema.prisma
```

## 2. Environnement de développement

```bash
npm run dev:web        # lance apps/web (Next.js) sur http://localhost:3000
npm test               # tests core + domain
npm run typecheck      # typecheck core + domain
npx prisma studio --schema database/schema.prisma
```

## 3. Conventions de code

- **TypeScript strict** : tout le code est typé (pas de `any` non justifié).
- **Nommage** : fichiers `module.types.ts`, `module.validation.ts`, `module.repository.ts`,
  `module.service.ts`, `module.error.ts` ; tests `module.service.test.ts`.
- **Exports** : tout module est re-exporté dans `packages/domain/src/index.ts`.
- **JS ESM** : imports avec extension `.js`.

## 4. Créer une migration

1. Ajouter les modèles dans `database/schema.prisma`.
2. `npx prisma format && npx prisma generate`.
3. Créer `database/migrations/YYYYMMDDHHMMSS_nom/migration.sql` (SQL versionné, index + contraintes).
4. Ajouter les policies RLS dans `infra/supabase/03-rls-policies.sql`.
5. Ajouter un seed `database/seed/NN-demo-*.sql` et un test RLS `infra/supabase/NN-rls-test-*.sql`.
6. Valider : `python3 -c "import pglast; pglast.parse_sql(open('...').read())"`.

## 5. Ajouter un nouveau module métier

1. Créer `packages/domain/src/modules/<module>/` (types, validation, repository, service, error, tests).
2. Ajouter les permissions dans `packages/core/src/rbac/permissions.ts` et les assigner aux rôles.
3. Créer l'adaptateur Prisma `apps/web/src/modules/<module>/<module>.repository.prisma.ts`.
4. Enregistrer le service dans `apps/web/src/lib/di.ts`.
5. Créer les routes API `apps/web/src/app/api/<module>/...`.
6. Créer l'écran `apps/web/src/app/<module>/page.tsx`.
7. Ajouter l'événement au catalogue `packages/core/src/events/event-catalog.ts` si nécessaire.

## 6. Ajouter un fournisseur de paiement (provider-agnostic)

1. Implémenter `SaasPaymentGateway` (port) : `charge`, `verify`.
2. Enregistrer dans le registre `saasPaymentGateways` (di.ts) avec la `providerKey`.
3. Le cœur du SaaS n'est jamais modifié (Open/Closed).

## 7. Ajouter un fournisseur IA

1. Implémenter `LlmClient` (port) : `complete`.
2. Enregistrer dans `aiLlmClients` (di.ts) avec la `providerKey`.

## 8. Ajouter un connecteur OTA

1. Implémenter `OtaConnector` (port) : `testConnection`, `pushAvailability`, `pushRates`,
   `pushRestrictions`, `pullBookings`.
2. Enregistrer dans `channelConnectors` (di.ts) avec la `otaKey`.

## 9. Créer une API publique

1. Créer une application + credential via `/api/publicapi/apps` + `/credentials`.
2. Authentifier via `/api/publicapi/auth` (clientId/secret).
3. Respecter les scopes et le rate limiting.

## 10. Créer un rôle

1. Ajouter les permissions dans `permissions.ts`.
2. Définir le rôle dans `roles.ts` (SYSTEM_ROLES) avec `perms(...)`.
3. Le seed charge automatiquement rôles + permissions (source unique `@afrihost/core`).

## 11. Bonnes pratiques
- **Isolation** : tout service vérifie `actor.hotelId === hotelId`.
- **Tests** : écrire des tests unitaires du domaine (repository en mémoire).
- **Audit** : journaliser chaque mutation (`audit.write`).
- **Aucun breaking change** : les migrations sont additives ; les enums s'étendent par `ADD VALUE`.
- **Provider-agnostic** : jamais d'import direct d'un fournisseur dans le cœur.
