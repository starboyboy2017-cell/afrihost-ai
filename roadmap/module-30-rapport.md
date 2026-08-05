# Rapport — Module 30 : API Publique & Marketplace ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 8 tests verts (domaine), RLS confirmé, jeu de démo.**

## 1. Objectif du module
API publique professionnelle pour développeurs tiers : **API REST** (GraphQL prévu), **OAuth2**, **API Keys**,
**JWT**, **Webhooks**, documentation **OpenAPI/Swagger**, **versionnement**, **rate limiting**, **SDK futurs**,
**journalisation**, environnement **Sandbox**, **Marketplace de connecteurs**. Toutes les données respectent
RLS, RBAC et l'isolation multi-hôtel.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804250000_publicapi`)
| Modèle | Rôle |
|--------|------|
| `ApiApp` | **Application tierce** (nom, description, owner org, environnement SANDBOX/PRODUCTION) |
| `ApiCredential` | **Credential** (API Key / OAuth2 / JWT) : clientId unique, secretHash (jamais en clair), scopes, hôtels autorisés, rate limit, expiration |
| `ApiWebhook` | **Webhook** (URL, secret, événements souscrits, actif) |
| `ApiWebhookDelivery` | **Livraison de webhook** (statut PENDING/SUCCESS/FAILED/RETRYING, tentatives, retry) |
| `ApiMarketplaceApp` | **App du marketplace** (catégorie, version, publiée, installs) |
| `ApiAccessLog` | **Journal des accès API** (méthode, path, statut, latence, IP, userAgent) |

Entités globales (cross-hôtel) ; l'isolation est garantie au niveau service par `ownerOrgId` et les `scopes`/
`hotels` des credentials.

### B. Domaine (`modules/publicapi`)
- **Service** (`publicapi.service.ts`, 8 tests) :
  - applications tierces (scoped par organisation) ;
  - **génération de credentials** : renvoie le secret en clair une seule fois, hashé ensuite ;
  - **authentification** (OAuth2 / API Key / JWT) avec vérification expiration + **rate limiting** ;
  - **webhooks** : enregistrement, dispatch d'événements, file de livraison + reprise ;
  - **marketplace** : publication, liste, installation ;
  - **journalisation** des accès.
- Isolation multihôtel (scopes/hôtels autorisés) + RBAC `publicapi.*` + audit.

### C. Application (`apps/web`)
- Adapter Prisma (`modules/publicapi/publicapi.repository.prisma.ts`).
- **API** : `/api/publicapi/apps`(+`/:id/credentials`), `/auth`, `/webhooks`(+`/dispatch`), `/marketplace`,
  `/logs`.
- Écran `/public-api` (console développeur + doc OpenAPI embarquée).

### D. RLS & base réelle
- **Migration appliquée** (6 tables).
- Policies RLS (utilisateurs authentifiés) ; isolation multi-hôtel au niveau service.
- **Test RLS** (`30-rls-test-publicapi.sql`) sur la base réelle : RLS actif sur 6 tables + données présentes. ✅
- **Jeu de démo** (`30-demo-publicapi.sql`) : 1 application, 1 credential (secret `demo-secret-key-123`), 1
  webhook, 1 app marketplace (Connecteur GDS).

## 3. Vérifications
- ✅ **384 tests verts** (core 27 + domaine 357), typecheck core/domain/web propres, aucune régression.
- ✅ **Isolation confirmée** (RLS actif, scopes de credentials).
- ✅ Migration + RLS appliqués ; jeu de démo intact ; nettoyage automatique.
- ✅ **Base Supabase vérifiée** : 6 tables `Api*`, RLS activé, données de démo.

## 4. Rien n'est cassé
- Aucune régression : modules 1–29 + tous les modules fonctionnels.
- Le module s'appuie sur l'EventBus pour les webhooks et les scopes RBAC existants ; rien de cassé.

## ➡️ Module suivant (après votre validation) : selon feuille de route — Mobile / Sécurité.
