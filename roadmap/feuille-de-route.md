# Feuille de route — AfriHost AI

> **Règle d'or :** un module à la fois, **validé** (tests + revue) avant de passer au suivant.
> Le socle (étapes 0–3) est construit en premier car tous les modules en dépendent.

---

## Phase 0 — Fondation (non négociable, livrée avant tout module)

| Étape | Livrable | Critère de validation |
|-------|----------|-----------------------|
| 0.1 | Monorepo + tooling (TS, ESLint, Prettier, Tailwind, shadcn/ui) | `pnpm build` vert, lint clean |
| 0.2 | Supabase projet + Prisma + migrations + seed (hôtel démo) | schéma migré, seed OK |
| 0.3 | Supabase Auth + sessions + layout protégé | login/logout fonctionnel |
| 0.4 | RBAC (Role/Permission/Membership) + guards | permissions vérifiées sur une route |
| 0.5 | RLS multitenant (policies) | test de fuite inter-hôtel **échoue** |
| 0.6 | EventBus + journal d'audit + templates de notifications | événements émis + audit écrit |
| 0.7 | CI/CD (GitHub Actions → Vercel) | déploiement auto en staging |

**Validation de phase 0** par le CTO → on démarre les modules.

## Phase 1 — Modules "cœur du métier" (MVP VALIDÉ)

> **Périmètre MVP confirmé** : le cœur hôtelier, rien d'autre. Le restaurant, la comptabilité avancée, le CRM,
> le channel manager, l'IA et le reste sont ajoutés **après** le MVP (Phases 2+).
> Exigence transversale : **offline-first** (ADR-011).

Ordre recommandé (chaque module dépend du précédent) :

| # | Module | Dépend de | Valeur |
|---|--------|-----------|--------|
| 1 | **Paramètres généraux** (org, hôtel, devise, taxes, langues) | 0 | configurable |
| 2 | **Gestion multihôtels** (hôtels, plan, sélecteur) | 1 | multitenant visible |
| 3 | **Utilisateurs / rôles / permissions** (IAM) | 1 | accès sécurisé |
| 4 | **Types de chambres & tarifs** | 1 | catalogue |
| 5 | **Chambres** | 4 | inventaire |
| 6 | **États des chambres** | 5 | disponibilité |
| 7 | **Réservations** | 4, 5, 6 | cœur du PMS |
| 8 | **Planning / front desk** | 7 | vue opérationnelle |
| 9 | **Check-in / check-out** | 7, 6 | flux arrivée/départ |
| 10 | **Housekeeping** | 6, 9 | ménage |
| 11 | **Clients (guests)** | 1 | référentiel |
| 12 | **Paiements (base)** | 7, 11 | encaissements |
| 13 | **Journal d'audit** (visualisation) | 0.6, 3 | traçabilité |

> Le **journal d'audit** (infrastructure de capture) est déjà actif dès la Phase 0 (ADR-012) ; le module 13
> fournit l'**interface de consultation**. **Clients** est placé en 11 pour être complet avant les paiements,
> mais le référentiel minimal (recherche/création) est requis dès la réservation.

**= MVP.** Validation avec un pilote d'hôtel réel **en conditions réelles incluant les coupures internet**.

## Phase 2 — Modules "commerce & finances"

| # | Module | Dépend de |
|---|--------|-----------|
| 14 | **Maintenance** | 5 |
| 15 | **Blanchisserie** | 10 |
| 16 | **Transport** | 7 |
| 17 | **Produits** | 1 |
| 18 | **Menus** | 17 |
| 19 | **POS restaurant** | 17, 18 |
| 20 | **Cuisine** | 19 |
| 21 | **Caisse** | 19 |
| 22 | **Pourboires** | 19 |
| 23 | **Remises** | 19, 7 |
| 24 | **Stocks** | 17 |
| 25 | **Fournisseurs & achats** | 24 |
| 26 | **Comptabilité (avancée)** | 21, 24, 25, 12 |
| 27 | **Facturation (complète)** | 26, 7 |

## Phase 3 — Relation client & distribution

| # | Module | Dépend de |
|---|--------|-----------|
| 28 | **CRM** | 11 |
| 29 | **Programme de fidélité** | 28 |
| 30 | **Notifications WhatsApp/Email/SMS** (branchement généralisé) | 0.6, 28 |
| 31 | **IA** (assistant, prédictions, tri) | 30, 7 |

## Phase 4 — Distribution & canaux

| # | Module | Dépend de |
|---|--------|-----------|
| 32 | **Channel Manager** (OTA) | 7, 4 |
| 33 | **Portail client** | 32, 27, 29 |
| 34 | **Application mobile / PWA** | 33 |
| 35 | **Événements & groupes** | 7, 27 |

## Phase 5 — Pilotage & ouverture

| # | Module | Dépend de |
|---|--------|-----------|
| 36 | **BI & rapports** | quasi tous |
| 37 | **API publique & webhooks** | tous |
| 38 | **Sécurité transversale** (durcissement, RLS avancée, audits) | tous |
| 39 | **Journal d'audit avancé** (exports, rétention, alerte) | 13 |

---

## Priorisation pour le MVP (VALIDÉ)

> **Périmètre MVP validé :** Phase 0 + Phase 1 (modules 1→13). C'est le cœur du métier hôtelier
> (paramètres → multihôtels → IAM → chambres → réservations → planning → check-in/out → housekeeping →
> clients → paiements → audit). Le restaurant, comptabilité avancée, CRM, channel manager et IA sont
> ajoutés en Phases 2+.

**Valeur ajoutée maximale pour le marché africain dès le MVP :**
- ✅ Multi-devise (XOF, XAF, NGN, GHS, MAD, ZAR...) + multi-langue
- ✅ Paiement **Mobile Money** + espèces (réalité du terrain)
- ✅ WhatsApp comme canal de communication prioritaire
- ✅ Mode **hors-ligne** tolérant (connectivité intermittente) — backlog technique à confirmer
- ✅ Taxes locales & exigences fiscales par pays

## Critère de "done" d'un module
- [ ] Spécification (`docs/modules/XX.md`) remplie
- [ ] Schéma Prisma + migration + index + RLS
- [ ] Services métiers + tests unitaires (Vitest)
- [ ] Route handlers (API REST) + tests
- [ ] Écrans UI (Tailwind/shadcn) + navigation
- [ ] Permissions branchées
- [ ] Événements de domaine émis/écoutés
- [ ] Notifications/templates si concerné
- [ ] Journal d'audit écrit
- [ ] Revue + validation → on passe au module suivant

## Backlog technique transversal (à intégrer)
- **Offline-first** : exigence MVP (ADR-011) — base locale + file de sync (dans Phase 0).
- i18n (fr, en, + langues locales) & multidevise temps réel.
- Gestion des taux de change & historique.
- Conformité fiscale par pays (TVA, timbres, reporting).
- Accessibilité (a11y) et responsive mobile.
- Sécurité : 2FA, clés API, rate limiting, RGPD.
