# 6 — Stack technique, outils & décisions documentées

> Objectif : outils **modernes et si possible gratuits**, cohérents, avec chaque choix justifié et documenté.

---

## 6.1 Tableau de la stack

| Domaine | Outil | Version | Gratuit au départ ? | Rôle |
|---------|-------|---------|---------------------|------|
| Framework | Next.js (App Router) | 14+ | ✅ | Frontend + API (BFF) |
| Langage | TypeScript | 5+ | ✅ | Typage fort de bout en bout |
| UI lib | React | 18+ | ✅ | Interface |
| Styling | Tailwind CSS | 3/4 | ✅ | Design system |
| Composants | shadcn/ui | — | ✅ | Composants accessibles personnalisables |
| ORM | Prisma | 5/6 | ✅ | Modèle, migrations, seed |
| Base de données | PostgreSQL | 15+ | ✅ (Supabase) | Données relationnelles |
| Backend BaaS | Supabase | — | ✅ (free tier) | Auth, Storage, Realtime, RLS |
| Déploiement | Vercel | — | ✅ (hobby) | Frontend + API, CDN, previews |
| CI/CD | GitHub Actions | — | ✅ | Lint, tests, migrations, deploy |
| Tests unitaires | Vitest | — | ✅ | Services métiers |
| Tests e2e | Playwright | — | ✅ | Parcours critiques |
| WhatsApp | WhatsApp Business Cloud API | — | coût/msg | Canal prioritaire |
| Email | SendGrid | — | free tier | Confirmations, factures |
| SMS | Twilio | — | payant/msg | Urgences, OTP |
| Paiements | Paystack / Flutterwave / Stripe | — | %/tx | Cartes + mobile money |
| IA | LLM (API compatible) | — | payant | Assistant, prédictions, tri |
| Erreurs | Sentry | — | free tier | Observabilité |
| Observabilité | Vercel Analytics | — | ✅ | Métriques |

## 6.2 Décisions clés & justifications

### ADR-1 — Monolithe modulaire (pas de microservices)
- **Pourquoi :** équipe réduite, coût d'ops minimal, transactions ACID sur une seule base.
- **Frontières de modules strictes** (bounded contexts) → peut évoluer en services plus tard sans refonte de la BD.

### ADR-2 — Supabase plutôt qu'un VPS/self-host Postgres
- **Pourquoi :** RLS multitenant au niveau BD, Auth géré, Storage, Realtime, backups auto, point-in-time recovery.
- **Gratuit au départ**, passage à l'échelle sans migration.

### ADR-3 — Prisma comme ORM
- **Pourquoi :** typage TS natif, migrations versionnées, introspection, seed, DX excellente, gratuit.
- Gère les `enum` natifs Postgres et les `@db.Decimal`.

### ADR-4 — Next.js App Router front **et** API
- **Pourquoi :** une seule app à déployer, SSR/ISR, route handlers, previews Vercel.
- Le BFF évite d'exposer les secrets côté client et agrège les appels.

### ADR-5 — RLS multitenant par hôtel
- **Pourquoi :** filet de sécurité **au niveau base de données**. Même une API compromise ne peut pas lire un autre hôtel.
- `hotel_id` présent sur toutes les tables métier.

### ADR-6 — Module = bounded context symétrique
- **Pourquoi :** consistance, testabilité, extraction future. Structure identique partout (`contracts/services/repositories/handlers/jobs/rbac/ui`).

### ADR-7 — Montants en minor units (int)
- **Pourquoi :** les flottants produisent des erreurs de centimes. En finance hôtelière, c'est critique (factures, taxes, pourboires).

### ADR-8 — WhatsApp Business Cloud API en canal prioritaire
- **Pourquoi :** WhatsApp est **le** canal de communication dominant en Afrique (confirmations, factures, conciergerie, marketing). L'API officielle est gratuite à l'usage côté client (facturation par message entrant/réponse).

### ADR-9 — Paiement Mobile Money en natif
- **Pourquoi :** MTN MoMo, Orange Money, Moov sont centraux en Afrique de l'Ouest. Les intégrer nativement est un avantage concurrentiel majeur face aux PMS occidentaux.

### ADR-10 — Paystack/Flutterwave pour les paiements
- **Pourquoi :** support natif du continent (XOF, NGN, GHS, mobile money, cartes) et conformité locale, contrairement à Stripe (limité sur le continent).

## 6.3 Gestion de configuration & secrets
- `.env` par environnement (local/staging/production) — **jamais versionnés**.
- Vercel env vars pour l'app ; Supabase Dashboard pour les secrets BD.
- Clés API (WhatsApp, paiements, email) dans des variables d'env, rotation documentée.

## 6.4 Workflow Git & livraison
- Branches : `main` (prod) / `staging` / feature branches.
- GitHub Actions : PR → lint + tests + build → preview Vercel → merge → auto-deploy.
- Migrations Prisma appliquées dans la pipeline **avant** le build.

## 6.5 Limitations / risques assumés
| Risque | Mitigation |
|--------|-----------|
| Coût des messages WhatsApp/SMS | Templates optimisés, groupage, canal WhatsApp préféré |
| Dépendance à Vercel/Supabase | Stack 100% open source portable (Next.js, Postgres, Prisma) |
| Multi-fiscalité Afrique | Module comptabilité paramétrable par pays (taxes, reporting) |
| Connectivité intermittente | Backlog : mode hors-ligne + file de sync (à intégrer) |
| PCI / sécurité paiements | Passer par des processeurs conformes (Paystack/Flutterwave), ne jamais stocker de PAN |
