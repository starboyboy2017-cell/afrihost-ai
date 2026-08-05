# DEPLOYMENT.md — AfriHost AI

> **Guide de déploiement — Module 36.**

Ce guide décrit comment déployer AfriHost AI en **production** sur l'infrastructure cible :
**Supabase Production**, **Vercel**, **GitHub Actions**, **Docker**. L'architecture reste
**provider-agnostic** : une migration vers AWS / Azure / GCP ou un serveur privé est possible sans refonte.

---

## 1. Prérequis

- Node.js 20+ , npm.
- Un projet **Supabase** (Production) : PostgreSQL, Auth, Storage.
- Un compte **Vercel** (ou serveur Docker).
- Un dépôt **GitHub**.
- Secrets : `DATABASE_URL`, `BOOTSTRAP_KEY`, clés des fournisseurs (Stripe, Resend, Twilio, OpenAI…),
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, token Supabase Management, token Vercel.

## 2. Environnements

| Environnement | Branche | Notes |
|---|---|---|
| Development | `dev` | base locale / Sandbox |
| Staging | `staging` | pré-validation |
| Production | `main` | mise en production |

## 3. Étapes de déploiement

### 3.1 Base de données (Supabase)
1. Appliquer les migrations dans l'ordre : `database/migrations/*/migration.sql`.
2. Appliquer les politiques RLS : `infra/supabase/03-rls-policies.sql`.
3. Charger les jeux de démo : `database/seed/*.sql`.

```bash
# Exemple (via API Management — le port 5432 peut être bloqué)
# Chaque migration est exécutée via POST /database/query avec un token personnel sbp_...
```

### 3.2 Application (Vercel)
1. `npm ci`
2. `npm run build` (build core + domain)
3. `npm --prefix apps/web run build`
4. Déployer `apps/web` sur Vercel (variables d'environnement).

### 3.3 CI/CD (GitHub Actions)
Workflows présents :
- `.github/workflows/ci.yml` : typecheck + tests + validation Prisma (sur push/PR).
- `.github/workflows/production.yml` : lint + typecheck + tests + validation migrations/RLS + build web
  (sur `main`). Déploiement Vercel/Supabase branchable via secrets. **Rollback automatique** : relance du job
  sur le commit précédent.

## 4. Bootstrap du premier Super Admin
Voir `roadmap/docs-bootstrap-superadmin.md`. Résumé :
```
GET  /api/bootstrap/status          → { initialized: false }
POST /api/bootstrap/init            { email, password, bootstrapKey }
POST /api/bootstrap/login           { email, password }
POST /api/bootstrap/change-password { superAdminId, currentPassword, newPassword }
POST /api/bootstrap/2fa             { action: "generate" | "enable" }
```
Le 2FA est **obligatoire** avant tout accès aux fonctionnalités d'administration.

## 5. Docker (optionnel)
Un `Dockerfile` peut encapsuler l'application Next.js et un `docker-compose.yml` pour l'infra locale
(PostgreSQL, Redis pour les queues). L'image expose le port 3000.

## 6. Sauvegardes & reprise
- Sauvegardes automatiques/manuelles + vérification d'intégrité (Module 34).
- Plan de reprise : voir `RUNBOOK.md`.

## 7. Rollback
- Application : revenir au commit précédent dans GitHub Actions / Vercel.
- Base : appliquer la migration inverse documentée (voir `database/migrations/README-MIGRATIONS.md`).
